---
title: 计算硬件
icon: lucide/gpu
---

大模型计算硬件负责执行矩阵乘法、归一化、激活函数和通信等工作。选型不能只比较峰值算力，还要同时考虑显存容量、内存带宽、互联、数值精度和软件生态。

## 快速开始

先根据工作负载判断主要约束：

| 场景 | 常见约束 | 优先关注 |
| :-- | :-- | :-- |
| 数据预处理与调度 | 分支、串行逻辑、内存容量 | CPU 核数、内存与 I/O |
| 大模型训练 | 矩阵计算、显存、跨卡通信 | 低精度算力、HBM、互联 |
| 在线推理 Prefill | 计算与显存带宽 | Tensor Core、HBM |
| 在线推理 Decode | KV Cache 读取与并发 | 显存容量、带宽、调度 |
| 边缘推理 | 功耗、成本与算子支持 | NPU 可用精度、编译器生态 |

例如，一个权重为 70 GB 的模型不能直接装入 48 GB 显存。量化可减少权重体积，多卡并行可切分权重，但还会引入通信和 KV Cache 等额外开销。

## 独立专题

- [CPU](./cpu.md)：数据处理、调度、NUMA 与 CPU 推理；
- [GPU](./gpu.md)：训练、推理与设备选型；
- [TPU](./tpu.md)：XLA 编译与 TPU Pod；
- [NPU](./npu.md)：端侧与数据中心专用加速器；
- [GPU 微架构](./index.md#gpu-微架构)：SM、Warp、缓存与 Occupancy；
- [Tensor Core](./index.md#tensor-core)：低精度矩阵乘加；
- [HBM](./hbm.md)：显存容量、带宽与 KV Cache。

## CPU、GPU、TPU 与 NPU

**CPU** 擅长复杂控制流、串行任务和通用计算。它通常负责数据加载、Tokenization、请求调度和 GPU Kernel 发射。CPU 推理部署简单、内存容量较大，但大规模稠密矩阵计算的吞吐通常低于专用加速器。

**GPU** 通过大量并行执行单元和高带宽显存处理规则的数值计算。训练框架、算子库和分布式通信生态成熟，是大模型训练与服务的常见选择。其性能依赖足够大的并行工作量，频繁的小 Kernel、CPU 与 GPU 同步或跨设备复制都会降低利用率。

**TPU** 是 Google 面向机器学习工作负载设计的专用加速器，核心路径围绕矩阵计算和高速互联构建，通常通过 XLA 等编译栈使用。它适合能够被编译器有效表达的大规模训练与推理任务，但硬件获取方式和软件生态与 GPU 不同。

**NPU** 泛指面向神经网络的专用处理器。数据中心、PC 和移动设备中的 NPU 定位并不相同，常通过矩阵或张量计算单元、片上存储和低精度数据类型提高能效。选型时必须验证模型所需算子、动态形状、量化方式和编译工具是否完整支持。

这些名称描述的是设计取向，不直接代表实际速度。同一模型在不同硬件上的性能还取决于实现、批大小、精度、内存和通信。

## GPU 型号案例

下表保留原文列举的典型型号，用于观察不同代际和产品线在核心数量与显存容量上的差异。硬件规格、可售版本和出口限制会变化，采购时应以厂商对应型号的数据表为准。

| 指标 | H200 | H100 | H800 | A100 | A800 | RTX 5090 | RTX 4090 | V100 |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: |
| CUDA 核心数 | 16,896 | 14,592 | 14,592 | 6,912 | 6,912 | 21,760 | 16,384 | 5,120 |
| 显存容量 (GB) | 141 | 80 | 80 | 80 | 80 | 32 | 24 | 32 |

其中，CUDA 核心数描述 GPU 的通用标量计算资源，但不能脱离频率、Tensor Core、精度和内存带宽直接比较训练速度；显存容量影响可容纳的模型状态、Batch 和 KV Cache，容量不足时需要量化、卸载或分布式切分。

- H200：Hopper 架构的数据中心 GPU，在 H100 基础上采用 HBM3e；原文记录的容量和带宽为 141 GB、4.8 TB/s，适合超大模型推理与长上下文任务；
- H100：Hopper 架构的数据中心 GPU，支持 FP8 和 Transformer Engine，面向 GPT-4 等超大模型的训练与推理工作负载；
- H800：与 H100 同代、针对特定市场提供的型号；原文记录其 NVLink 带宽为 400 GB/s，具体能力取决于 SKU；
- A100：Ampere 架构的数据中心 GPU，支持 TF32、BF16 和混合精度，是大模型训练的常见基线；
- A800：与 A100 同代、针对特定市场提供的型号；原文记录其 NVLink 带宽为 400 GB/s，具体能力取决于 SKU；
- RTX 5090：Blackwell 架构的消费级 GPU，原文将其定位为个人开发者训练与推理的高性价比候选；它支持低精度 AI 计算，但数据中心功能、可靠性和多卡互联与专业卡不同；
- RTX 4090：Ada 架构的消费级旗舰 GPU，适合游戏和中小规模训练、推理实验，但显存容量较小且没有 NVLink；
- V100：Volta 架构的数据中心 GPU，是首批配备 Tensor Core 的 NVIDIA 产品，推动了深度学习矩阵计算加速。

原文把 NVIDIA GPU 简称为「N 卡」，并指出 GPU 也广泛用于个人电脑、工作站、游戏机和移动设备。需要注意，显卡是以 GPU 为核心的设备，GPU 则是处理器本身；AI 加速并不限于 NVIDIA 产品。

## GPU 微架构

GPU 将线程按层级组织。以 CUDA 术语为例，线程组成 Thread Block，多个 Block 形成 Grid；硬件将线程按 Warp 调度到流式多处理器 (Streaming Multiprocessor, SM) 上执行。

一个 SM 通常包含以下资源：

- 标量或向量计算单元，执行 FP32、整数等指令；
- Tensor Core，执行小块矩阵乘加；
- Register File，保存线程私有的高频数据；
- Shared Memory 与 L1 Cache，供线程块内复用数据；
- Warp Scheduler，选择已就绪的 Warp 发射指令；
- Load/Store 单元，连接缓存和显存。

当一个 Warp 中的线程走不同分支时，分支路径可能串行执行；当 Register 或 Shared Memory 用量过高时，一个 SM 能同时驻留的 Warp 数量会下降。提高 Occupancy 有助于隐藏访存延迟，但 Occupancy 最高不等于程序一定最快，仍需结合实际指令和数据复用分析。

```text
Host CPU -> GPU Grid -> SM -> Warp -> Thread
                         |-> Register / Shared Memory / Cache -> HBM
```

## Tensor Core

Tensor Core 面向矩阵乘加运算：

$$
D=A\times B+C
$$

大模型中的线性层和 Attention 包含大量此类计算。与逐元素计算单元相比，Tensor Core 一次处理矩阵 Tile，可在 FP16、BF16、TF32、FP8 或整数等受支持精度下提供更高吞吐。具体数据类型随硬件代际而异。

使用 Tensor Core 需要满足数据类型、形状、对齐和布局等条件。矩阵维度太小、形状不规则、频繁转换数据类型或算子融合不足，都可能使实际性能远低于峰值。框架通常通过 cuBLAS、cuDNN、编译器或自定义 Kernel 调用这些能力，详见 [AI 软件栈](../software/index.md)。

低精度会减少计算和存储成本，但也缩小数值范围或有效精度。训练时常采用混合精度、Loss Scaling 和高精度状态；推理量化则需要单独评测输出质量。

## HBM 与内存层级

高带宽内存 (High Bandwidth Memory, HBM) 通过宽接口提供较高带宽，是数据中心加速器常用的显存。它保存模型权重、激活、梯度、优化器状态和 KV Cache。容量决定单卡能放入多少状态，带宽决定这些数据能以多快的速度送到计算单元。

GPU 内存从近到远大致包括 Register、Shared Memory / L1、L2 和 HBM。越靠近计算单元，容量通常越小、延迟越低。高效 Kernel 会分块读取 HBM，并尽可能在 Register 或 Shared Memory 中复用数据。

如果一次操作执行的浮点运算量为 $F$，从显存传输的数据量为 $B$，其算术强度为：

$$
I=\frac{F}{B}
$$

可达到的性能受计算峰值与内存带宽共同限制：

$$
P\leq\min(P_\text{compute}, I\times BW_\text{memory})
$$

这就是 Roofline 模型的基本判断。大 Batch 的矩阵乘法通常具有较高的数据复用，更可能受计算限制；逐 Token Decode 需要反复读取权重，常更容易受内存带宽限制。因此，峰值 FLOPS 更高的设备不一定在所有推理场景中更快。

## 容量估算案例

只计算权重时，参数量为 $N$、每个参数占 $b$ 字节，权重显存约为：

$$
M_\text{weight}=N\times b
$$

一个 7B 模型使用 FP16 权重约需 $7\times 10^9\times 2\approx 14$ GB。实际推理还需 KV Cache、临时 Workspace 和框架开销；训练还要保存梯度、优化器状态与激活，因此不能用权重大小直接判断设备是否足够。

KV Cache 随 Batch、序列长度和层数增长。长上下文服务应同时评估单请求峰值与并发总量，预留安全空间，并通过真实负载验证是否发生显存不足。

## 性能分析

硬件利用率低时按依赖链排查：

1. 确认模型与数据确实位于目标设备，避免隐式 CPU 回退；
2. 检查 Batch、序列长度和矩阵形状能否形成足够并行度；
3. 分析 Kernel 时间、空隙、同步和主机到设备复制；
4. 判断瓶颈属于计算、显存容量、显存带宽还是设备互联；
5. 修改精度、融合、批处理或并行策略后重新测量端到端指标。

常用工具包括设备监控、PyTorch Profiler 和 NVIDIA Nsight Systems。多卡任务还需结合 [网络与互联](../network/index.md) 检查通信等待。选型最终应使用目标模型、输入分布、并发与精度进行基准测试，而不是只比较厂商峰值指标。

[Nsight Systems](https://docs.nvidia.com/nsight-systems/index.html) 可分析 CPU、CUDA Kernel、内存复制和通信的时间线。希望练习 CUDA C/C++ 时，可参考 [CUDA 入门教程](https://developer.nvidia.com/zh-cn/blog/even-easier-introduction-cuda-2/) 与 [LeetGPU](https://leetgpu.com/)；CUDA、NVCC 和算子库的分层关系见 [AI 软件栈](../software/index.md)。
