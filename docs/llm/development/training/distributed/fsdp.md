---
title: FSDP
---

完全分片数据并行 (Fully Sharded Data Parallel, FSDP) 是 PyTorch 的参数、梯度和优化器状态分片方案，等价于 ZeRO 第三阶段的实现。它在数据并行的基础上把训练状态切分到各 rank，显著降低每卡显存占用。

FSDP 的由来是 ZeRO 论文给出了「分片训练状态」的完整理论，但工程落地需要与框架的执行图、自动微分和 checkpoint 机制深度结合。PyTorch 因此在框架内原生实现了这套机制，先推出 `FullyShardedDataParallel`，随后演进出按参数分片、API 更简洁的 FSDP2（`torch.distributed.fsdp.fully_shard`），语义与参数说明见 [FSDP 官方文档](https://pytorch.org/docs/stable/fsdp.html) 与 [进阶教程](https://pytorch.org/tutorials/intermediate/FSDP_tutorial.html) 。

## 快速开始

先选择合理自动 wrap 策略与 mixed precision，使用小模型验证 state dict 的保存与加载。建议步骤：

1. 用 `torch.distributed.fsdp.FullyShardedDataParallel` 包裹模型，先以整个模型为一个分片单元跑通流程。
2. 选择合适的 `auto_wrap_policy`，通常按 Transformer block 或子模块粒度包裹，控制「一次 all-gather 的参数规模」。
3. 配置 mixed precision（如 bf16），并确认分片策略与所需的分片程度一致。
4. 用一个小模型完整跑一遍 state dict 的保存与加载：分别验证完整态 (FULL_STATE_DICT) 与分片态 (SHARDED_STATE_DICT)，再恢复并核对 loss 是否接续。

按 Transformer block 包裹的最小骨架如下：

```python
from functools import partial
import torch
from torch.distributed.fsdp import (
    FullyShardedDataParallel as FSDP,
    ShardingStrategy,
    MixedPrecision,
)
from torch.distributed.fsdp.wrap import transformer_auto_wrap_policy

auto_wrap = partial(
    transformer_auto_wrap_policy,
    transformer_layer_cls={TransformerBlock},
)

model = FSDP(
    build_model(),
    sharding_strategy=ShardingStrategy.FULL_SHARD,
    auto_wrap_policy=auto_wrap,
    mixed_precision=MixedPrecision(param_dtype=torch.bfloat16),
)
```

其中 `ShardingStrategy` 的三种取值对应不同切分程度：`FULL_SHARD` 切分参数、梯度与优化器状态（等价 ZeRO-3），`SHARD_GRAD_OP` 只切梯度与优化器状态（等价 ZeRO-2），`NO_SHARD` 不切分（退化为 DDP）。

验证成功：恢复后 loss 曲线连续、每卡显存显著低于同规模 DDP，且没有因分片导致的参数缺失。

## 机制

FSDP 的核心思想是：每个 rank 不常驻完整参数，而是把参数、梯度和优化器状态都分片，每个 rank 只保存属于自己的那一部分。前向计算时，当前层需要的参数通过 all-gather 从各 rank 汇集到完整副本，计算完成后释放该副本；反向时同样按层 all-gather 所需参数，求出梯度后再把梯度重新分片并释放。

这种「按需聚合、用完即弃」的方式，让每卡常驻显存从「完整模型」降到约「完整模型的 1/N」，代价是前向和反向过程中增加了多次 all-gather 通信，以及在 forward/backward 中插入钩子带来的实现复杂度。通信量上，一个分片单元在前向 all-gather 一次参数、反向 reduce-scatter 一次梯度，每步总通信约为该单元大小的两倍；对 FULL_SHARD 整体而言，每步通信约为 2 倍模型大小。

包裹粒度直接影响权衡：包裹单元越小，任一瞬间常驻的参数越少，但通信次数越多、每次通信的利用率越低；包裹单元越大，通信次数少，但峰值显存上升。因此需要根据模型结构选择 wrap 策略，在显存与通信之间取舍。

## 案例

以按 Transformer block 包裹 FSDP 训练为例：观察每个 block 前向和反向的 all-gather 时间，统计总通信开销占单步时间的比例。若显存仍有富余但通信占比过高，说明包裹过细，可改为按多个 block 或更大子模块包裹；若显存紧张，说明包裹过粗，应进一步细分。

最终目标是在「显存不 OOM」的前提下让通信开销尽量小。可在固定 batch 下对比不同 wrap 粒度，找到显存与吞吐的平衡点。

## 相关主题

- [ZeRO](./zero.md)
- [混合并行](./hybrid-parallel.md)
