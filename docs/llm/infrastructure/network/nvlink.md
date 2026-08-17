---
title: NVLink
---

NVLink 是 NVIDIA 面向 GPU 间高带宽、低延迟点对点通信设计的互联技术。它常用于单机多 GPU 的张量并行、流水线并行和大规模训练通信，具体带宽、拓扑与支持方式随 GPU 和系统形态变化。

## 快速开始

先检查拓扑：

```bash
nvidia-smi topo -m
nvidia-smi nvlink --status
```

若 GPU 间显示 `NV#`，通常表示存在 NVLink 连接；若显示 `PHB`、`SYS` 等，则通信主要经过 PCIe 和 CPU 互联。实际可用带宽仍要用 NCCL Tests 或目标训练任务测量。

## 工作方式

NVLink 为 GPU 提供多条专用高速链路，使设备可直接读写彼此内存或高效交换数据。它不是自动共享显存的开关：每张 GPU 仍有自己的 HBM，框架必须显式进行通信、切分模型或管理内存。

NVLink 的优势在于高频通信。张量并行的线性层通常在每层执行 All-Reduce、Reduce-Scatter 或 All-Gather，PCIe 延迟和带宽可能成为瓶颈，NVLink 能显著改善这一路径。

## 拓扑

少量 GPU 可通过直连形成网状或部分网状连接。GPU 数更多时，不同 GPU 对的链路数量可能不同；通信库会选择适合的 Ring 或 Tree。

若需要让大量 GPU 获得更均匀的互联，通常使用 [NVSwitch](./nvswitch.md)。检查拓扑时不要只确认“有 NVLink”，还要确认并行组中的 GPU 是否处于同一高带宽域。

## 张量并行案例

两张 GPU 将线性层权重按输出维度切分，各自计算局部结果后合并。若每层都需要 All-Reduce，通信会发生数十次甚至数百次。将这两张 GPU 放在直连 NVLink 上通常比跨 Socket PCIe 拓扑更稳定。

模型可装入单卡时，盲目开启张量并行可能反而变慢，因为额外通信超过了计算收益。

## 验证方法

1. 查看 NVLink 链路是否全部 UP；
2. 运行 `all_reduce_perf`、`all_gather_perf` 等 NCCL Tests；
3. 分别比较 NVLink 组与 PCIe 组的 Bus Bandwidth；
4. 在训练 Profiling 中查看通信占每步时间的比例；
5. 调整 Tensor Parallel 大小后重新测量端到端 Token/s。

NCCL 的算法、消息大小和进程绑定都会影响测量结果，单一带宽数字不能代表所有通信模式。

## 常见问题

- NVLink 不是 NVSwitch，前者是链路，后者是交换结构；
- 支持 NVLink 的 GPU 不代表任意服务器都安装了桥接或交换硬件；
- 设备间有 NVLink 不表示所有 GPU 对带宽相同；
- 显存容量不会因为 NVLink 自动相加，模型并行仍需软件切分；
- 链路状态正常但性能异常时，要检查 GPU 时钟、NUMA、NCCL 版本和进程拓扑。

交换结构见 [NVSwitch](./nvswitch.md)，集合通信见 [NCCL](./nccl.md)，通用总线见 [PCIe](./pcie.md)。

