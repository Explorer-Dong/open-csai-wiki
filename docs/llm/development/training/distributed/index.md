---
title: 分布式训练
---
分布式训练通过切分数据、参数、激活值或专家，让单机无法完成的训练在多卡、多机上运行。

## 独立专题

- [DDP](./ddp.md)
- [ZeRO](./zero.md)
- [FSDP](./fsdp.md)
- [Tensor Parallel](./tensor-parallel.md)
- [Pipeline Parallel](./pipeline-parallel.md)
- [Expert Parallel](./expert-parallel.md)
- [混合并行](./hybrid-parallel.md)

## 快速开始

如果模型能放入单卡，先使用分布式数据并行 (Distributed Data Parallel, DDP) 扩大吞吐；显存不足时使用 FSDP 或 ZeRO 切分训练状态；单层仍放不下时加入 Tensor Parallel；流水线过深或设备更多时再考虑 Pipeline Parallel。

## 并行方式

| 方法              | 切分对象               | 主要收益           | 主要代价             |
| :---------------- | :--------------------- | :----------------- | :------------------- |
| DDP               | 数据                   | 实现简单、吞吐扩展 | 每卡保留完整训练状态 |
| ZeRO / FSDP       | 参数、梯度、优化器状态 | 显著减少单卡显存   | 增加参数通信         |
| Tensor Parallel   | 单层张量计算           | 单层可跨卡运行     | 每层产生通信         |
| Pipeline Parallel | 模型层                 | 降低每卡层数       | 产生流水线气泡       |
| Expert Parallel   | MoE 专家               | 分散专家参数与计算 | All-to-All 通信敏感  |

## DDP 案例

```bash
torchrun --standalone --nproc-per-node=4 train.py
```

每个进程绑定一张 GPU，读取不同数据分片，并在反向传播期间同步梯度。代码还应设置 `DistributedSampler`，只让 rank 0 写普通日志，并为所有 rank 正确保存或汇总状态。

## 混合并行

超大规模训练会同时使用数据、张量、流水线和专家并行。若总 GPU 数为 $N$，各并行维度通常满足：

$$
N=N_\text{DP}\times N_\text{TP}\times N_\text{PP}\times N_\text{EP}
$$

这只是进程网格关系，并不保证性能。并行方案需要结合拓扑设计，让通信密集的 Tensor Parallel 尽量位于高速互联域内。

## 正确性与性能

先对比单卡与多卡的小规模 Loss 和梯度，再测试吞吐。注意全局 Batch、随机种子、归一化、梯度裁剪和检查点语义。扩展效率低时，应分别测量数据等待、计算、集合通信和流水线空闲，而不是盲目增加 GPU。
