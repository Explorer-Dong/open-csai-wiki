---
title: ZeRO
---

ZeRO (Zero Redundancy Optimizer) 通过在数据并行组内切分优化器状态、梯度和参数，减少每卡训练显存。它由 DeepSpeed 提出，核心思想是消除数据并行中「每张卡都保存一份完整训练状态」带来的冗余。

ZeRO 的由来是数据并行里一个容易被忽视的事实：各 rank 保存的优化器状态、梯度和参数是完全相同的副本，这些「模型状态」占据了显存的大头，且与 batch 大小无关、无法靠减小 batch 缓解。ZeRO 把这些状态在数据并行组内切分，让显存随 GPU 数近似线性下降，从而把「能训练的模型规模」从单卡显存提升到整个集群显存之和。其定义与三阶段划分见 [原论文](https://arxiv.org/abs/1910.02054) 与 [DeepSpeed 官方文档](https://www.deepspeed.ai/tutorials/zero/) 。

## 快速开始

从仅切分优化器状态开始，逐步增加切分级别；先确认 checkpoint 保存和恢复，再扩大规模。建议步骤：

1. 先用 Stage 1 切分优化器状态，确认能正常训练且显存下降。
2. 视显存需要升级到 Stage 2（进一步切分梯度）或 Stage 3（连参数也分片）。
3. 在启用新阶段后，先完整跑一遍 checkpoint 保存与恢复，确认各 rank 能正确聚合与还原完整状态。
4. 扩大规模前监控通信时间，确认显存下降带来的收益没有被通信吃掉。

一个 Stage 3 的最小配置片段如下：

```json
{
  "train_batch_size": 32,
  "fp16": { "enabled": true },
  "zero_optimization": {
    "stage": 3,
    "offload_optimizer": { "device": "none" },
    "offload_param": { "device": "none" }
  }
}
```

若显存仍不足，可把 `offload_optimizer` / `offload_param` 的 `device` 改为 `cpu` 或 `nvme`，对应 ZeRO-Offload 与 ZeRO-Infinity 的卸载路径，但会引入主机内存与 PCIe 带宽的约束。

验证成功：每卡显存随阶段提升而下降，checkpoint 恢复后 loss 接续，吞吐在可接受范围内。

## 机制

数据并行训练中，各 rank 都保存完整的优化器状态、梯度和参数，其中优化器状态（如 Adam 的一阶、二阶动量）往往比参数本身还大，是显存冗余的主要来源。ZeRO 按阶段逐步消除这些冗余：Stage 1 把优化器状态切分到各 rank，Stage 2 进一步切分梯度，Stage 3 连参数也分片。

原论文以 $\Psi$ 表示参数个数，并记 Adam（fp32 动量）下优化器状态每参数 $K=12$ 字节（fp32 主参数、一阶动量、二阶动量各 4 字节）。若参数与梯度都用 fp16（各 2 字节），则数据并行基准下每卡模型状态内存为：

$$
(2 + 2 + K)\Psi = 16\Psi
$$

三个阶段的显存分别为：

$$
\begin{aligned}
\text{Stage 1 (P}_\text{os}\text{)} &: 2\Psi + 2\Psi + \frac{12\Psi}{N} = \left(4 + \frac{12}{N}\right)\Psi \\
\text{Stage 2 (P}_\text{os+g}\text{)} &: 2\Psi + \frac{2\Psi}{N} + \frac{12\Psi}{N} = \left(2 + \frac{14}{N}\right)\Psi \\
\text{Stage 3 (P}_\text{os+g+p}\text{)} &: \frac{2\Psi}{N} + \frac{2\Psi}{N} + \frac{12\Psi}{N} = \frac{16\Psi}{N}
\end{aligned}
$$

其中 $N$ 是数据并行组内的 GPU 数。可以看到：Stage 1 与 Stage 2 的显存随 $N$ 下降较慢，Stage 3 才实现「约 $1/N$」的线性下降。

计算时，各 rank 仍需要完整参数，因此在 Stage 3 中，前向和反向会在需要时通过 all-gather 聚合参数，计算后再重新分片释放。这样每卡显存可随 GPU 数近似线性下降，代价是引入了额外的参数聚合通信，以及更复杂的实现。

因此 ZeRO 的收益来自「用通信换显存」：显存下降通常伴随更多通信和实现复杂度。具体来说，Stage 3 每步的通信约为 3 倍模型大小（前向与反向各一次 all-gather 参数、反向一次 reduce-scatter 梯度），而纯数据并行的梯度 all-reduce 约为 2 倍模型大小，即 ZeRO-3 的通信量约为数据并行的 1.5 倍。在实际部署中，通信能否被计算重叠、网络拓扑是否匹配，决定了最终的吞吐表现。

## 案例

某模型在 DDP 下直接 OOM，无法训练。启用 ZeRO Stage 3 参数分片后显存下降到可训练水平，此时应同时监控显存和通信时间：若吞吐骤降，检查网络拓扑是否满足 all-gather 的带宽需求、通信是否与计算重叠、分片粒度是否过细。

若通信成为瓶颈，可回退到 Stage 2（只切优化器状态和梯度），在显存够用的前提下减少通信，找到显存与吞吐的平衡点。

## 相关主题

- [FSDP](./fsdp.md)
- [DDP](./ddp.md)
