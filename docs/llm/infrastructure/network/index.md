---
title: 网络与互联
icon: lucide/network
---

网络与互联决定多卡、多机训练时参数和梯度能以多快的速度交换。模型计算越快，通信越容易成为瓶颈。

## 快速开始

先用 `nvidia-smi topo -m` 查看 GPU、CPU 与网卡的拓扑。输出中的 NVLink 表示 GPU 之间存在高速直连；跨节点流量通常经过 InfiniBand 或基于以太网的 RoCE。训练程序一般不直接操作这些链路，而是通过 NCCL 执行 All-Reduce、All-Gather 等集合通信。

## 独立专题

- [PCIe](./pcie.md)：CPU、GPU、NIC 与 NVMe 的通用总线；
- [NVLink](./nvlink.md)：GPU 间点对点高速链路；
- [NVSwitch](./nvswitch.md)：多 GPU 的 NVLink 交换结构；
- [InfiniBand](./infiniband.md)：高性能 RDMA 网络；
- [RoCE](./roce.md)：基于以太网的 RDMA；
- [NCCL](./nccl.md)：GPU 集合通信库。

## 互联层次

| 技术 | 连接范围 | 主要用途 |
| :-- | :-- | :-- |
| PCIe | CPU、GPU、网卡和存储设备 | 通用设备互联 |
| NVLink | 单机或高密度系统内的 GPU | 高带宽 GPU 点对点传输 |
| NVSwitch | 多块 GPU | 通过交换芯片建立高带宽全互联 |
| InfiniBand | 跨服务器 | 低延迟、高吞吐远程直接内存访问 |
| RoCE | 跨服务器 | 在以太网上承载远程直接内存访问 |
| NCCL | 软件通信层 | 为 NVIDIA GPU 提供集合通信原语 |

## 集合通信

数据并行通常使用 All-Reduce 汇总梯度；FSDP 和 ZeRO 会频繁使用 Reduce-Scatter 与 All-Gather；张量并行会在每层产生通信。通信量不仅由参数量决定，还取决于切分策略、并行组大小和计算通信重叠程度。

例如四卡数据并行中，每张卡先独立计算梯度，再用 All-Reduce 得到一致结果。如果链路带宽不足，GPU 会等待通信完成，增加卡数反而无法提高吞吐。

## 排查方法

1. 检查拓扑和链路状态；
2. 使用 NCCL Tests 测量集合通信带宽；
3. 对比理论带宽和实际总线带宽；
4. 检查网卡、NUMA 绑定和容器设备映射；
5. 使用性能分析工具确认计算与通信能否重叠。

排查时不要只看平均带宽。任意一个慢节点、错误路由或丢包都可能拖慢整个同步训练任务。
