---
title: InfiniBand
---

InfiniBand 是高性能计算和 AI 集群常用的低延迟、高吞吐网络技术。它支持远程直接内存访问 (Remote Direct Memory Access, RDMA)，让跨节点训练和推理可高效执行集合通信与数据传输。

## 快速开始

确认网卡、端口和链路状态：

```bash
ibstat
ibdev2netdev
```

在全部节点运行相同版本的 NCCL Tests，测量 All-Reduce，而不仅是单向 `iperf`。集合通信才能反映训练实际使用的 Ring、Tree 和 GPU Direct 路径。

## RDMA

传统 TCP 通信通常经过内核协议栈并复制数据。RDMA 允许网卡在权限受控的内存区域间直接读写，减少 CPU 参与、复制和延迟。

GPU Direct RDMA 进一步让网卡直接访问 GPU 显存，避免 GPU -> CPU -> NIC 的中转。它需要兼容的 GPU、NIC、PCIe 拓扑、Driver、IOMMU 和通信库配置。

## 组网组件

InfiniBand 网络通常包括主机通道适配器、交换机、线缆、Subnet Manager 和监控组件。Subnet Manager 负责发现拓扑、分配本地标识并配置路由；它不可用或配置错误时，端口可能显示正常却无法稳定通信。

网络设计还要考虑 Oversubscription、路径冗余、故障域和机架布线。只看网卡的标称速率无法说明集群全双向集合通信能力。

## 训练案例

假设 32 个节点执行数据并行，每步需同步梯度。若单节点计算时间小于 All-Reduce 时间，增加节点会产生明显扩展效率下降。

排查时先分别测：GPU 间 NVLink、同节点 NIC 到 GPU、跨节点 NCCL。若只有跨节点慢，检查网卡速率、交换机拥塞、NUMA 绑定和 RDMA 是否真正启用。

## 关键指标

| 指标 | 含义 |
| :-- | :-- |
| Link Rate | 单端口理论物理速率 |
| Latency | 小消息与同步操作的响应时间 |
| Bus Bandwidth | 集合通信算法估算的有效总线带宽 |
| Message Rate | 小消息处理能力 |
| 丢包与重传 | 拥塞、错误和稳定性信号 |
| GPU Direct 使用率 | 是否避免 CPU 中转 |

## 调优与排查

1. 确保固件、Driver、OFED 或系统 RDMA 栈兼容；
2. 将 GPU、NIC 和 CPU 绑定到同一 NUMA 节点；
3. 检查端口速率、错误计数与交换机拥塞；
4. 固定 NCCL 网卡和 HCA 配置后做 A/B 测试；
5. 检查 MTU、队列深度和多轨网络配置；
6. 将慢节点单独跑基准，避免平均值掩盖尾部问题。

## 常见问题

- 端口 UP 不代表 RDMA 与 GPU Direct 正常；
- `iperf` 的 TCP 吞吐不能代表 NCCL All-Reduce；
- 一个慢网卡、错绑 NUMA 或交换机拥塞会拖慢整个同步组；
- 更高网卡速率不一定改善计算受限任务；
- InfiniBand 配置与运维复杂，需要持续监控错误和拓扑变化。

以太网 RDMA 方案见 [RoCE](./roce.md)，集合通信见 [NCCL](./nccl.md)，主机设备路径见 [PCIe](./pcie.md)。

