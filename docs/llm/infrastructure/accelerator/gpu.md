---
title: GPU
---

图形处理器 (Graphics Processing Unit, GPU) 通过大量并行执行单元、高带宽显存和专用矩阵单元加速大模型训练与推理。GPU 的实际性能由计算、显存、互联、算子实现和工作负载共同决定，不能用单一 FLOPS 指标概括。

## 快速开始

先确认设备、Driver 和拓扑：

```bash
nvidia-smi
nvidia-smi topo -m
```

再用框架运行矩阵乘法并同步计时：

```python
import time
import torch

x = torch.randn(8192, 8192, device="cuda", dtype=torch.float16)
torch.cuda.synchronize()
t0 = time.perf_counter()
y = x @ x
torch.cuda.synchronize()
print(time.perf_counter() - t0, y.shape)
```

首次调用包含上下文初始化与 Kernel 编译，正式基准应预热、多次重复，并固定形状与精度。

## 并行执行

GPU 将大量线程组织为 Grid、Thread Block 和 Warp。硬件把 Warp 调度到流式多处理器 (Streaming Multiprocessor, SM) 上。当一个 Warp 等待显存时，调度器可切换到其他 Warp 隐藏延迟。

这种设计适合形状规则、计算量大且数据并行度高的任务，例如线性层、Attention 和卷积。动态分支、小张量、频繁同步与大量短 Kernel 会降低利用率。

更详细的线程、缓存和 Occupancy 关系见 [GPU 微架构](./index.md#gpu-微架构)。

## 计算资源

GPU 中常见资源包括：

- 标量或向量计算单元，处理 FP32、整数和控制相关指令；
- Tensor Core，执行低精度矩阵乘加；
- Register 与 Shared Memory，保存高频复用数据；
- L1 / L2 Cache，降低对显存的访问；
- HBM 或 GDDR，保存权重、激活和 KV Cache；
- DMA 与互联引擎，执行主机及 GPU 间传输。

厂商标注的峰值算力通常依赖特定精度、稀疏条件与矩阵形状。目标模型若不能使用对应 Kernel，实际吞吐会显著低于峰值。

## 训练与推理

训练需要保存权重、激活、梯度和优化器状态，并执行前向与反向传播。显存容量、低精度稳定性和多卡互联非常关键。

推理分为 Prefill 与 Decode。Prefill 可形成较大的矩阵乘法，通常更计算密集；Decode 每步处理少量 Token，却要读取大量权重和 KV Cache，常受显存带宽限制。

因此，同一 GPU 在训练、批量推理和低并发在线推理中的相对表现可能完全不同。

## 显存容量估算

参数量为 $N$、每个参数占 $b$ 字节时，权重容量约为：

$$
M_\text{weight}=N\times b
$$

7B 模型的 FP16 权重约为 14 GB。实际推理还需要 KV Cache、临时 Workspace 和运行时开销；训练还需要梯度、优化器状态和激活。

显存不足时可以使用量化、梯度检查点、CPU Offload、ZeRO / FSDP 或模型并行，但这些方法会增加计算、通信或实现复杂度。

## 型号案例

| 型号 | 产品线 | 显存示例 | 典型定位 |
| :-- | :-- | :-- | :-- |
| H200 | 数据中心 | 141 GB HBM3e | 大模型训练、长上下文推理 |
| H100 | 数据中心 | 80 GB 等 | FP8 训练与高吞吐推理 |
| A100 | 数据中心 | 40 / 80 GB | 通用训练与推理基线 |
| RTX 5090 | 消费级 | 32 GB | 本地研究和中小模型推理 |
| RTX 4090 | 消费级 | 24 GB | 单机实验与量化推理 |

型号内部仍可能存在 PCIe、SXM、显存和互联差异。采购时应核对完整 SKU，而不是只看产品名称。

## 性能指标

| 指标 | 意义 |
| :-- | :-- |
| 峰值 FLOPS | 特定精度下的理论计算上限 |
| 显存容量 | 可容纳的模型状态与并发 KV Cache |
| 显存带宽 | Decode、Embedding 等访存密集任务的上限 |
| Tensor Core 数据类型 | FP16、BF16、FP8、INT8 等加速能力 |
| GPU 互联 | 张量并行和分布式训练通信能力 |
| 功耗与散热 | 持续频率、机架密度和运行成本 |
| 软件支持 | 框架、算子、编译器和调试工具成熟度 |

## 基准测试案例

评估在线推理 GPU 时，至少固定模型版本、精度、最大上下文、输入输出长度分布和并发。记录：

- 首 Token 时间与每 Token 输出时间；
- 输入、输出 Token 吞吐；
- 显存峰值与 KV Cache 使用率；
- GPU 功耗、温度和时钟；
- 质量回归与错误率。

空载单请求延迟不能代表生产容量；合成短 Prompt 的峰值吞吐也不能代表长上下文业务。

## 性能排查

使用 PyTorch Profiler 或 Nsight Systems 检查时间线：

1. 是否存在 CPU 与 GPU 之间的长空隙；
2. 是否频繁执行小 Kernel 或同步；
3. 矩阵形状能否使用 Tensor Core；
4. HBM 带宽是否接近饱和；
5. 多卡任务是否等待通信；
6. 是否因温度、功耗或共享资源降频。

## 常见问题

- CUDA 核心数不能跨架构直接比较实际速度；
- 显存能装下权重不代表能满足目标并发；
- 消费卡计算强不等于具备 ECC、NVLink 和数据中心支持；
- GPU 利用率高不代表有效吞吐高，忙等待和低效 Kernel 也会占用设备；
- 增加 GPU 数量可能因通信开销导致收益递减。

矩阵单元见 [Tensor Core](./index.md#tensor-core)，显存见 [HBM](./hbm.md)，设备互联见 [NVLink](../network/nvlink.md)。

## GPU 微架构

GPU 微架构决定线程如何进入流式多处理器 (Streaming Multiprocessor, SM)、数据如何从 HBM 进入计算单元，以及哪些资源会限制并发。理解它是分析 CUDA Kernel、训练吞吐和推理解码性能的基础。

### 快速开始

先用 NVIDIA Nsight Compute 或 PyTorch Profiler 观察一个热点 Kernel 的执行时间、Tensor Core 利用率、显存吞吐和 Occupancy。分析时按以下顺序提问：计算是否足够大、访存是否连续、Warp 是否分歧、Register 或 Shared Memory 是否限制驻留 Warp。

### 执行层次

CUDA 程序把线程组织为 Grid、Thread Block 和 Thread。硬件通常以 32 个线程组成的 Warp 为调度单位，将多个 Warp 分派到 SM 执行。Block 中的线程可以通过 Shared Memory 和同步原语协作；不同 Block 通常独立执行。

```text
Grid -> Thread Block -> Warp -> Thread
                         -> SM -> Compute / Cache / HBM
```

同一个 Warp 遇到条件分支时，会依次执行不同分支路径，称为 Warp Divergence。对每个元素采用不同复杂控制流的 Kernel 往往因此变慢。

### SM 资源

一个 SM 通常包含 Warp Scheduler、标量计算单元、Tensor Core、Load / Store 单元、Register File、Shared Memory 与 L1 Cache。每种资源都有限：一个 Kernel 若为每线程分配过多 Register，或为每个 Block 分配过多 Shared Memory，SM 同时容纳的 Block 和 Warp 会减少。

Occupancy 指实际驻留 Warp 相对硬件可容纳 Warp 的比例。它有助于隐藏访存延迟，但并非越高越好：为提高 Occupancy 而压缩 Register 可能引入 Spill，反而把数据写入慢速局部内存。

### 内存访问

GPU 内存从近到远通常为 Register、Shared Memory / L1、L2、HBM。Warp 中相邻线程访问连续地址时，硬件可合并为较少内存事务；随机访问、重复读写和未对齐访问会降低有效带宽。

高效矩阵 Kernel 会把 HBM 数据按 Tile 读到 Shared Memory 或 Register，在多个乘加中复用。FlashAttention 的核心思想也是分块计算，避免把完整 Attention 矩阵写回 HBM。

### Kernel 案例

以下向量加法正确但可能受显存带宽限制：

```python
import torch

x = torch.randn(1 << 26, device="cuda")
y = torch.randn_like(x)
z = x + y
```

它每个元素计算极少，却要读取两个张量、写入一个张量。若将多个逐元素步骤融合为一个 Kernel，可减少中间张量和 HBM 往返。相反，矩阵乘法每次读入数据可复用多次，通常更接近计算受限。

### 调优方法

1. 先建立正确性测试和固定输入基准；
2. 检查 Kernel 是否过小、调用是否过于频繁；
3. 检查 Warp 分歧和全局内存访问是否合并；
4. 检查 Register、Shared Memory 与 Occupancy；
5. 使用融合、Tile、数据布局或 Tensor Core 后重测端到端性能。

不要仅以 Occupancy 判断优化是否成功，应同时比较 Kernel 时间、有效带宽和应用吞吐。

### 常见问题

- 一个 CUDA Core 不等于一个 CPU Core，不能按核心数换算性能；
- Shared Memory 不是自动更快，错误分块会产生 Bank Conflict 或降低并发；
- GPU 代际不同，SM 数、缓存、Tensor Core 与调度细节不可直接套用；
- Nsight 中高利用率也可能表示在执行低价值的访存或同步。

矩阵阵列见 [Tensor Core](./index.md#tensor-core)，显存系统见 [HBM](./hbm.md)，自定义 Kernel 见 [Triton](../software/triton.md)。

## Tensor Core

Tensor Core 是 NVIDIA GPU 中面向小块矩阵乘加的专用计算单元。它让 Transformer 的线性层和 Attention 在 FP16、BF16、TF32、FP8 或整数等支持精度下获得远高于通用标量单元的吞吐。

### 快速开始

用 BF16 或 FP16 矩阵乘法作为基线，并在 Profiling 中确认使用了 Tensor Core Kernel：

```python
import torch
x = torch.randn(4096, 4096, device="cuda", dtype=torch.bfloat16)
y = x @ x
```

若改成 FP32、非对齐维度或极小矩阵后速度明显下降，原因可能是未使用 Tensor Core、工作量太小或被 Kernel 启动开销主导。

### 矩阵乘加

Tensor Core 的基本操作可写为：

$$
D=A\times B+C
$$

硬件按固定 Tile 执行乘加，软件库负责把大矩阵切块、安排布局和累加精度。实际支持的 Tile 形状与数据类型随 GPU 架构变化，因此不应在应用代码中假设某个固定尺寸。

### 精度与累加

低精度输入减少内存流量并提高计算吞吐，但有效精度和可表示范围会下降。训练通常使用 BF16 或 FP16 前向、混合精度累加和 FP32 优化器状态；FP16 还常需 Loss Scaling 防止梯度下溢。

TF32 保留 FP32 的指数范围但缩短尾数，常用于保持 FP32 接口兼容的矩阵计算。FP8 能进一步提高吞吐与降低显存，但对缩放、格式选择和数值监控要求更高。

### 使用条件

能否触发高效 Tensor Core Kernel 通常取决于：

- 数据类型是否受硬件与库支持；
- 矩阵维度、Stride 和对齐是否适合 Tile；
- Batch 和序列长度能否提供足够工作量；
- 框架是否选择了合适的 cuBLAS、cuDNN 或编译器 Kernel；
- 是否被数据类型转换、转置或小 Kernel 分割抵消收益。

这意味着“使用 FP16”本身并不能保证高吞吐。

### Transformer 案例

Transformer 的投影层主要计算 $XW_Q$、$XW_K$、$XW_V$ 和 FFN 矩阵。将 hidden size、FFN size 与 Batch / Sequence 组织为适配的 GEMM 形状时，Tensor Core 能高效执行这些计算。

若线上 Decode 的 Batch 很小，每次只处理少量新 Token，矩阵规模缩小且读取权重的成本上升。此时即使 Tensor Core 可用，整体仍可能受 HBM 带宽限制。

### 性能案例

评估混合精度时使用同一模型、同一输入和同一随机种子，比较：

| 指标 | 目的 |
| :-- | :-- |
| 每步时间与 Token/s | 判断端到端加速 |
| Tensor Core 利用率 | 确认矩阵路径是否命中 |
| 显存与通信量 | 判断是否释放容量或带宽 |
| Loss、梯度范数与 NaN | 判断数值稳定性 |
| 下游评测 | 判断精度变化是否可接受 |

只测单个 GEMM 可能高估真实训练收益，因为数据加载、通信和非矩阵算子不会同比加速。

### 常见问题

- Tensor Core 不是所有 GPU 或所有精度都支持；
- 峰值 Tensor FLOPS 常依赖稀疏或特定 FP8 条件；
- 强制低精度可能导致溢出、NaN 或能力下降；
- 小 Batch Decode 的首要瓶颈常是显存带宽，而非矩阵算力；
- 禁用确定性算法或改变 Kernel 可能影响数值复现。

底层线程与数据复用见 [GPU 微架构](./index.md#gpu-微架构)，库接口见 [cuBLAS / cuDNN](../software/index.md)，数值训练见 [训练基础](../../development/training/base/index.md)。
