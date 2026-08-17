---
title: NCCL
---

NVIDIA Collective Communications Library (NCCL) 是 NVIDIA GPU 的集合通信库。PyTorch DDP、FSDP、Megatron-LM 和多种推理框架通过 NCCL 执行 All-Reduce、All-Gather、Reduce-Scatter、Broadcast 与点对点通信。

## 快速开始

使用 NCCL Tests 在目标拓扑上测量：

```bash
./build/all_reduce_perf -b 8M -e 1G -f 2 -g 8
```

所有进程必须使用相同 NCCL 版本、可见 GPU 与网络条件。先从单机小规模开始，再扩展到多机；记录 `algbw` 与 `busbw`，并与实际训练每步通信时间交叉验证。

## 集合通信原语

| 原语 | 行为 | 大模型中的常见用途 |
| :-- | :-- | :-- |
| All-Reduce | 汇总后向所有 Rank 分发结果 | DDP 梯度同步 |
| All-Gather | 收集所有 Rank 的分片 | FSDP 参数重建 |
| Reduce-Scatter | 汇总并分发不同分片 | FSDP 梯度切分 |
| Broadcast | 一份数据发送到全部 Rank | 初始化和参数同步 |
| Send / Recv | 点对点传输 | Pipeline Parallel |

通信量由张量大小、并行组和算法决定。NCCL 负责选择适合拓扑的 Ring、Tree 或其他实现，但不理解模型语义，也无法自动修复错误的并行划分。

## 通信器与 Rank

每个 GPU 进程属于一个或多个 Process Group。数据并行、张量并行、流水线并行和专家并行通常使用不同通信器。Rank 的设备映射、网卡选择和可见 GPU 必须在所有节点一致。

初始化后通信调用顺序必须一致。若某个 Rank 因异常、条件分支或数据不一致没有进入同一操作，其余 Rank 会等待并最终超时。

## DDP 案例

DDP 中每个 Rank 计算不同样本的梯度，反向传播期间对梯度 Bucket 执行 All-Reduce。Bucket 足够早就绪时，NCCL 通信可与后续反向计算重叠。

若 Batch 太小或网络慢，通信无法隐藏。此时可调整 Bucket、梯度累积、并行度或网络布局，但应同时检查收敛和全局 Batch 变化。

## 性能诊断

设置调试日志并限定网卡后进行对照：

```bash
NCCL_DEBUG=INFO NCCL_DEBUG_SUBSYS=NET,GRAPH \
NCCL_IB_HCA=<hca-name> torchrun --nproc_per_node=8 train.py
```

日志可能包含网络接口、拓扑路径和算法选择。生产环境应谨慎保存，避免泄漏主机信息或产生大量日志。

排查顺序：确认进程和 GPU 映射，确认单机通信，确认跨节点网卡与 RDMA，再检查交换机和训练通信重叠。

## 常见故障

| 现象 | 常见原因 |
| :-- | :-- |
| 初始化卡住 | Rank 地址、端口、网卡或防火墙错误 |
| 运行中超时 | Rank 异常、调用顺序不一致、慢节点或网络故障 |
| 带宽很低 | 错误拓扑、NUMA 跨域、PCIe 降速、RDMA 回退 |
| 只有多机失败 | NIC、交换机、RoCE / IB 或环境变量不一致 |
| 间歇性失败 | 线缆、固件、拥塞、温度或资源争用 |

## 常见问题

- NCCL 不是网络协议，而是使用 NVLink、PCIe、InfiniBand 或 RoCE 的通信库；
- All-Reduce 快不代表 All-Gather 或小消息同样快；
- 设置环境变量前应有基准与变更记录，盲目调参会掩盖真实故障；
- 通信成功不代表训练正确，还要验证数据划分、梯度缩放和检查点；
- 多机任务应对每个节点独立运行健康检查，平均带宽可能隐藏慢节点。

硬件路径见 [PCIe](./pcie.md)、[NVLink](./nvlink.md)、[InfiniBand](./infiniband.md) 和 [RoCE](./roce.md)，训练用法见 [DDP](../../development/training/distributed/index.md)。

