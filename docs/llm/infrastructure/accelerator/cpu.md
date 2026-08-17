---
title: CPU
---

中央处理器 (Central Processing Unit, CPU) 是大模型系统的通用控制与数据处理核心。它通常不承担大规模训练的主要矩阵计算，却决定数据能否及时送入加速器、请求能否高效调度，以及不受 GPU 支持的算子能否正确执行。

## 快速开始

在 Linux 中先查看处理器、内存与非一致性内存访问 (Non-Uniform Memory Access, NUMA) 拓扑：

```bash
lscpu
numactl --hardware
free -h
```

运行训练或推理前，同时观察 CPU 利用率、上下文切换、内存和磁盘等待。GPU 利用率低不一定是 GPU 性能不足：Tokenizer、数据解压、Python 调度或主机到设备复制都可能让 GPU 等待。

## 执行模型

CPU 核心通过取指、译码、执行和提交完成指令。现代 CPU 使用乱序执行、分支预测、流水线和多级缓存提高单线程性能，并通过多核心与同步多线程扩大并发。

大模型工作负载同时包含两类路径：

- 控制密集路径：请求解析、动态分支、任务调度和操作系统服务；
- 数值计算路径：矩阵乘法、量化算子、Embedding 查找和采样。

CPU 擅长前者。借助 SIMD 指令、BLAS 与量化 Kernel，CPU 也能执行后者，但吞吐和能效取决于数据类型、向量宽度、内存带宽及实现。

## 核心、线程与缓存

物理核心拥有执行单元与私有缓存，逻辑线程共享核心中的部分资源。增加线程数只在存在空闲执行资源或访存等待时有效，不能把单核心算力直接翻倍。

常见内存层次是 Register -> L1 -> L2 -> L3 -> DRAM。越靠近核心，容量越小、延迟越低。Tokenizer 和数据预处理若频繁访问分散的小对象，容易受缓存未命中与内存延迟限制；规则矩阵乘法则更容易通过分块复用缓存。

## NUMA

多路服务器中，每个 CPU Socket 通常连接自己的本地内存。线程访问远端 Socket 的内存会经过互联，延迟更高、可用带宽更低。GPU 和网卡也挂接在特定 CPU 或 PCIe Root Complex 下。

多 GPU 任务应让数据加载进程、内存和 GPU 尽量位于同一 NUMA 节点。可使用以下命令绑定：

```bash
numactl --cpunodebind=0 --membind=0 python train.py
```

盲目绑定也可能造成单节点内存不足，因此必须结合 `nvidia-smi topo -m` 和实际进程布局验证。

## 大模型系统中的职责

CPU 常承担以下工作：

- 文本解析、Tokenizer 与数据清洗；
- Dataset 读取、解压、打乱与 Batch 组装；
- GPU Kernel 发射和分布式进程管理；
- API 网关、请求调度与流式响应；
- Sampling、约束解码及少量不支持的算子；
- 模型权重卸载和本地 CPU 推理。

训练中 `DataLoader` Worker 太少会供数不足，太多则可能争用核心、内存和文件系统。在线服务中，模型副本之外还应为网络、Tokenization 和监控预留 CPU。

## CPU 推理案例

本地使用 llama.cpp 运行 GGUF 模型时，可设置线程数：

```bash
llama-cli -m model.gguf -t 8 -p "解释 KV Cache"
```

线程数应从物理核心附近开始压测。若继续增加线程但 Token/s 下降，通常是内存带宽、缓存或线程调度已经饱和。还应分别记录 Prompt Processing 与 Token Generation 的速度，因为两阶段瓶颈不同。

## 选型指标

| 指标 | 影响 |
| :-- | :-- |
| 物理核心数 | 数据加载、请求处理和并发任务上限 |
| 单线程性能 | Python 控制流、串行预处理和调度延迟 |
| 内存通道与带宽 | CPU 推理、权重卸载与大规模预处理 |
| 内存容量 | 数据缓存、模型卸载和进程副本 |
| PCIe Lane | GPU、网卡与 NVMe 的连接能力 |
| NUMA 拓扑 | 多路服务器中的本地性和跨 Socket 开销 |
| 指令集 | BF16、INT8 等向量计算能力 |

## 性能排查

1. 用 `top`、`pidstat` 检查是否有单线程满载；
2. 用 `iostat` 区分 CPU 忙与 I/O 等待；
3. 检查 DataLoader 队列是否经常为空；
4. 检查 NUMA 绑定、CPU 亲和性与 GPU 拓扑；
5. 使用 `perf` 定位缓存未命中、分支和热点函数；
6. 调整 Worker、线程、Batch 后重新测量端到端吞吐。

不要只看总体 CPU 利用率。一个关键线程满载时，总利用率可能仍然很低。

## 常见问题

- 核心越多不一定越快：串行路径、内存带宽和锁竞争会限制扩展；
- vCPU 不一定等同于独占物理核心：云环境还要考虑超售和邻居干扰；
- CPU 内存足够不代表 GPU 能直接使用：权重传输会受 PCIe 限制；
- 为深度学习安装 CUDA 不会让 CPU 代码自动在 GPU 上运行。

CPU 与 GPU 的数据交换见 [PCIe](../network/pcie.md)，加速器结构见 [GPU](./gpu.md)，软件调用关系见 [AI 软件栈](../software/index.md)。
