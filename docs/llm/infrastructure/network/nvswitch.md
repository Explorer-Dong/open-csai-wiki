---
title: NVSwitch
---

NVSwitch 是连接多块 NVIDIA GPU 的交换芯片。它将多个 NVLink 端口组织为高带宽交换结构，使高密度服务器或机柜中的 GPU 更接近全互联，降低某些 GPU 对必须绕行的拓扑差异。

## 快速开始

在支持 NVSwitch 的系统上运行：

```bash
nvidia-smi topo -m
nvidia-smi nvlink --status
```

观察 GPU 对之间是否呈现均匀 NVLink 路径。随后使用 NCCL Tests 运行不同进程数的 All-Reduce，确认实际 Bus Bandwidth 与拓扑预期一致。

## 为什么需要交换

少量 GPU 可用直连 NVLink 构成网状结构，但 GPU 数量增长后，完全两两直连需要的端口迅速增加。NVSwitch 将每块 GPU 的 NVLink 接入交换平面，让多个 GPU 之间通过交换芯片通信。

交换结构并不消除通信成本，但能提供更均匀的带宽和更少的拓扑限制，特别适合高频全局通信。

## 大模型并行

张量并行与专家并行可能在每层交换激活或 Token。若并行组跨越带宽不均的 GPU 对，最快 GPU 也会等待最慢路径。NVSwitch 系统有利于将大并行组放在同一高带宽域中。

数据并行也受益于高带宽互联，但其通信频率通常低于层内张量并行。选择并行维度时应优先把最通信密集的维度放入 NVSwitch 域。

## 性能案例

在八卡训练中，比较两种进程布局：

- Tensor Parallel 为 8：每层使用八卡集合通信；
- Tensor Parallel 为 4、Data Parallel 为 2：层内通信缩小，梯度同步在两个副本间进行。

哪种更快取决于模型大小、Batch、通信算法和网络。NVSwitch 让第一种布局更可行，但不会自动使其优于第二种。应比较每步时间、通信比例和显存余量。

## 运行与维护

NVSwitch 系统需要对应 Driver、Fabric Manager 或平台服务。设备初始化不完整、固件不匹配或链路降级可能导致拓扑异常。

排查顺序：检查系统服务与错误日志，确认所有 GPU 可见，再测 NCCL 小规模通信，最后运行目标框架。不要直接在大规模训练任务中猜测链路故障。

## 常见问题

- NVSwitch 不是普通以太网交换机，也不连接 CPU、SSD 等任意设备；
- NVSwitch 不会把多卡变成单个逻辑 GPU，软件仍需模型并行；
- 显存依然分布在各卡，跨卡访问仍有延迟与带宽成本；
- 不同机箱、GPU 代际和 NVSwitch 代际的总带宽不能直接比较；
- 跨节点通信仍需要 InfiniBand 或 RoCE。

链路原理见 [NVLink](./nvlink.md)，跨节点扩展见 [InfiniBand](./infiniband.md)，并行策略见 [分布式训练](../../development/training/distributed/index.md)。

