---
title: RoCE
---

基于融合以太网的 RDMA (RDMA over Converged Ethernet, RoCE) 在以太网承载 RDMA 语义，使 AI 集群可以复用以太网生态获得低 CPU 开销和较低延迟。它对网络无损性、拥塞控制和配置一致性要求很高。

## 快速开始

先确认 RDMA 设备和网络映射：

```bash
rdma link
ibdev2netdev
```

再用跨节点 NCCL Tests 测量实际集合通信。若 TCP 通信正常但 NCCL 异常，优先检查 PFC、ECN、拥塞控制、GID、MTU 和网卡固件，而不是仅检查 IP 连通性。

## RoCE 版本

RoCEv1 在二层以太网帧中传输，通常受同一二层域限制；RoCEv2 将 RDMA 封装为 UDP/IP，可跨三层路由。具体部署使用哪种版本取决于网卡、交换机和网络设计。

RoCE 提供的是 RDMA 传输能力，不意味着网络天然无损或零拥塞。大规模 AI 通信常形成同步突发流量，需要网络侧配合控制。

## 无损与拥塞控制

RoCE 常结合优先级流控 (Priority Flow Control, PFC) 避免关键 RDMA 队列丢包，并结合显式拥塞通知 (Explicit Congestion Notification, ECN) 与拥塞控制算法限制速率。

PFC 配置不当可能引发 Pause Storm 或死锁；只启用无损而缺少端到端拥塞控制，也可能在热点交换机形成长队列。因此需按优先级、队列、阈值和流量模式联合设计。

## 集群案例

在 64 节点训练集群中，All-Reduce 会让多节点同时向同一组链路发送大流量。若网络存在 Oversubscription，短时间突发会积累队列，导致尾延迟上升，进而让所有 GPU 等待。

验证时先跑单对节点带宽，再增加并发对数与真实 NCCL Group Size。若低并发正常、高并发抖动，通常要检查交换机缓冲、ECN 标记、PFC 计数和路由哈希。

## 配置检查

| 层次 | 检查内容 |
| :-- | :-- |
| 物理层 | 光模块、线缆、端口速率和错误计数 |
| 二层 / 三层 | VLAN、MTU、路由和多路径 |
| 无损队列 | PFC 优先级、阈值和 Pause 计数 |
| 拥塞控制 | ECN、发送端算法和交换机策略 |
| 主机 | 网卡固件、Driver、GID、NUMA 与 IRQ |
| 应用 | NCCL 网卡选择、进程绑定与消息大小 |

## 常见问题

- RoCE 不是“插上以太网即可 RDMA”，交换机配置是系统的一部分；
- PFC 不是越多越好，错误配置会扩大故障范围；
- 只测单流带宽无法发现多对多集合通信拥塞；
- IP 可达不代表 RDMA Queue Pair 可用；
- 不同厂商设备的默认拥塞控制策略可能不兼容。

原生高性能网络见 [InfiniBand](./infiniband.md)，集合通信行为见 [NCCL](./nccl.md)，生产监控见 [模型服务](../../serving/deployment/index.md)。
