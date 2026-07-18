---
title: 计算硬件
icon: lucide/gpu
status: todo
---

本文介绍计算硬件的相关知识。

## 基本概念

### GPU

图形处理器 (Graphics Processing Unit, GPU) 是一种专门在个人电脑、工作站、游戏机和一些移动设备上执行绘图运算工作的微处理器。以图形处理器为核心的主板扩展卡一般称之为显卡。传统的 CPU 专为通用计算而设计，内核数量较少；相反，GPU 是一种特殊类型的处理器，具有数百或数千个内核，可并行运行大量计算。虽然 GPU 在游戏中以 3D 渲染而闻名，但它们对深度学习算法尤其有用。一般来说，以 GPU 为核心的显卡都代指 NVIDIA 系列，简称 N 卡。

各型号的 GPU 在 AI 相关核心指标上的对比：

|     指标      |  H200  |  H100  |  H800  | A100  | A800  | RTX 5090 | RTX 4090 | V100  |
| :-----------: | :----: | :----: | :----: | :---: | :---: | :------: | :------: | :---: |
|  CUDA 核心数  | 16,896 | 14,592 | 14,592 | 6,912 | 6,912 |  21,760  |  16,384  | 5,120 |
| 显存容量 (GB) |  141   |   80   |   80   |  80   |  80   |    32    |    24    |  32   |

指标解释：

- **CUDA 核心数**：GPU 的通用计算单元数量，类似 CPU 的核心数，用于执行基本浮点或整数运算；
- **显存容量**：影响能容纳的模型大小与 batch size，显存不足需要分布式切分。

显卡型号解释：

- **H200（Hopper 架构强化版）**：在 H100 基础上升级为 HBM3e 内存（141GB, 4.8TB/s），主要针对超大模型推理与长上下文训练。它能在推理任务中显著减少显存溢出，是当前效率最高的单卡推理 GPU。
- **H100（Hopper 架构）**：支持 FP8 和 Transformer Engine，是目前全球顶级 AI 训练 GPU，用于 GPT-4 等超大模型。
- **H800（中国特供版）**：H100 的限带宽版本，NVLink 降至 400 GB/s，为中国市场的合法替代方案。
- **A100（Ampere 架构）**：AI 训练标准卡，支持 TF32/BF16 混合精度，兼具高通用性与高算力。
- **A800（中国特供版）**：A100 的限带宽版本，NVLink 降至 400 GB/s，以符合出口管制政策。
- **RTX 5090（Blackwell 架构）**：下一代消费级 GPU，预计支持 FP8，能效和显存带宽大幅提升，或成为个人开发者训练/推理的高性价比卡。
- **RTX 4090（Ada 架构）**：消费级旗舰 GPU，主要用于游戏和中小型 AI 训练/推理实验，算力强但显存较小、无多卡互联。
- **V100（Volta 架构）**：首款具备 Tensor Core 的数据中心 GPU，开启了深度学习硬件加速时代。

### CUDA

文档：[CUDA Toolkit Documentation](https://docs.nvidia.com/cuda/index.html)

统一计算架构 (Compute Unified Devices Architectured, CUDA) 是 NVIDIA 推出的一种软硬件集成技术。通过该技术，用户可利用 NVIDIA 的 GPU 进行图像处理之外的运算。

相较于传统计算架构（比如 CPU 和 GNU/Linux），我们可以将 CUDA 简单地类比为操作系统内核（比如 Linux），将 CUDA Toolkit 简单地类比为 GNU 工具链。

### NVCC

NVIDIA 为适配其 CUDA 架构，在 C/C++ 的基础上设计了 CUDA C/C++ 编程语言及其适配的编译器——NVIDIA CUDA 编译器 (NVIDIA CUDA Compiler, NVCC)。

CUDA C++ 就是普通 C/C++ 加上了适配 GPU 特性的语法。其中的普通 C/C++ 代码被称为主机端代码 (device code)，其中适配 GPU 的代码被称为设备端代码 (device code)。

在编译时，NVCC 首先会将代码文件 `.cu` 中的 host code 和 device code 分开，然后将 host code 交给当前操作系统支持的编译器（GCC、MSVC 等）进行编译，将 device code 自行编译，最后将两者编译的结果链接为最终的可执行文件。

## CUDA C/C++ 教程

[CUDA 入门博客](https://developer.nvidia.com/zh-cn/blog/even-easier-introduction-cuda-2/)

[LeetGPU - 一个练习 GPU 编程的 OJ 平台](https://leetgpu.com/)

## 性能分析工具 nsys

[Nsight Systems](https://docs.nvidia.com/nsight-systems/index.html)
