---
title: DDP
---

分布式数据并行 (Distributed Data Parallel, DDP) 让每张 GPU 处理不同数据，并在反向传播阶段通过 all-reduce 同步梯度。它是 PyTorch 中以模块包裹形式提供的进程级数据并行实现，每张卡都保存一份完整模型副本，适合「模型放得下、但数据量大或吞吐吃紧」的训练场景。

DDP 的直接前身是 `torch.nn.DataParallel` (DP)：DP 把 mini-batch 切分后分散到多卡前向，再把梯度拉回主卡统一更新。这种「单进程多线程 + 主卡聚合」的做法存在两个瓶颈：主卡既是通信热点又受 Python 全局解释器锁 (Global Interpreter Lock, GIL) 与线程调度拖累。DDP 改为「每卡一个进程」，用进程组内的集合通信取代主卡聚合，消除了这一单点瓶颈，因此成为当前 PyTorch 多卡训练的事实标准，相关语义可参考 [官方文档](https://pytorch.org/docs/stable/generated/torch.nn.parallel.DistributedDataParallel.html) 。

## 快速开始

用 `torchrun` 启动每卡一个进程，配置 `DistributedSampler`，只让 rank 0 写公共日志与检查点。具体步骤如下：

1. 用 `torchrun --nproc_per_node=N` 启动，框架会自动注入 `RANK`、`WORLD_SIZE`、`LOCAL_RANK`、`MASTER_ADDR`、`MASTER_PORT` 等环境变量。
2. 调用 `torch.distributed.init_process_group(backend="nccl")` 初始化进程组。
3. 把模型搬到对应 GPU 后，用 `torch.nn.parallel.DistributedDataParallel(model, device_ids=[local_rank])` 包裹。
4. 用 `DistributedSampler` 给每个 rank 分配互不重叠的数据分片，并在每个 epoch 前调用 `set_epoch` 改变切分顺序。
5. 只在 `rank == 0` 时写日志与保存检查点，避免多进程重复写文件。

最小可运行骨架如下：

```python
import os
import torch
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP
from torch.utils.data import DataLoader, DistributedSampler

dist.init_process_group(backend="nccl")
local_rank = int(os.environ["LOCAL_RANK"])
torch.cuda.set_device(local_rank)

model = build_model().to(local_rank)
model = DDP(model, device_ids=[local_rank])

dataset = build_dataset()
sampler = DistributedSampler(dataset)
loader = DataLoader(dataset, sampler=sampler, batch_size=batch_size)

for epoch in range(num_epochs):
    sampler.set_epoch(epoch)
    for batch in loader:
        batch = {k: v.to(local_rank) for k, v in batch.items()}
        loss = model(**batch).loss
        loss.backward()
        optimizer.step()
        optimizer.zero_grad()
        if dist.get_rank() == 0:
            log(loss.item())
```

验证是否成功：先跑少量 step，比较单卡 loss 与多卡前几步 loss 是否在同一量级、是否随 step 下降；再确认每张卡显存占用大致相同、通信集合被正常调用。

## 机制

DDP 的每个 rank 都持有完整的模型参数和优化器状态，数据只是被平均切分。一次迭代中，各 rank 用不同的 mini-batch 前向计算并各自反向求出局部梯度 $g_i$，随后梯度通过 all-reduce 在进程组内求平均，使每个 rank 得到完全相同的平均梯度：

$$
\bar g = \frac{1}{N}\sum_{i=1}^{N} g_i
$$

其中 $N$ 是进程组大小，$g_i$ 是第 $i$ 个 rank 的局部梯度。各 rank 再用 $\bar g$ 更新本地参数。因为更新前的梯度一致、初始参数一致，各 rank 的参数在整个训练过程中保持同步。

实现上，DDP 用「梯度分桶」优化通信：它把参数按反向传播完成的先后划分到不同 bucket（默认 `bucket_cap_mb=25` MB），某 bucket 内所有参数的梯度就绪后即触发该 bucket 的 all-reduce，从而与后续层的反向计算重叠，隐藏一部分通信延迟。默认的 NCCL 后端对 all-reduce 采用 ring 算法：对 $N$ 个 rank、总数据量 $S$ 的梯度，每个 rank 传输约 $2(N-1)/N \cdot S$ 字节，$N$ 较大时约为 $2S$，即「通信量约为单次梯度的两倍」。这一重叠机制与可选压缩钩子的细节见 [DDP Communication Hooks 文档](https://pytorch.org/docs/stable/ddp_comm_hooks.html) 。

需要强调的是，DDP 只能加速「数据吞吐」，并不能解决单卡放不下模型的问题，因为每张卡都要保存完整副本。当模型大到单卡无法容纳时，需要结合 ZeRO、张量并行或流水线并行。

## 案例

以 4 卡训练一个中等规模模型为例：把数据集按 rank 切分，保证每个 rank 只看到自己的分片，比较单卡和 4 卡在相同全局 batch 下的 loss 曲线。若 4 卡的 loss 与单卡明显不同，按以下顺序排查：

- 检查 `DistributedSampler` 是否生效，以及每个 epoch 是否调用了 `set_epoch`，避免各 rank 反复看到相同数据。
- 检查随机种子是否在 rank 间正确同步，以及 dropout 等随机层是否受干扰。
- 确认「全局 batch」是否等于「单卡 batch × 卡数」，学习率是否按全局 batch 做了相应缩放。

若 loss 曲线一致且显存未被单卡打满，说明 DDP 配置正确，此时可以继续放大 batch 或数据规模来提升吞吐。

## 相关主题

- [ZeRO](./zero.md)
- [NCCL](../../../infrastructure/network/nccl.md)
