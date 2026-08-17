---
title: AI 软件栈
icon: lucide/layers
---

AI 软件栈把框架中的张量运算逐层转换为 GPU 指令。理解各层边界有助于处理版本不兼容、算子缺失和性能退化。

## 快速开始

一条典型调用链如下：

```text
PyTorch -> ATen / 编译器 -> cuBLAS 或 cuDNN / 自定义 Kernel -> CUDA Runtime -> Driver -> GPU
```

先确认 Driver 能识别设备，再确认框架安装包支持相应 CUDA 运行时，最后通过小型矩阵乘法验证计算。系统安装的 CUDA Toolkit 主要提供编译器与开发工具，不等于 Python 框架实际链接的 CUDA 运行时版本。

## 组件职责

| 组件 | 职责 |
| :-- | :-- |
| NVIDIA Driver | 管理设备，并向上提供驱动 API |
| CUDA Toolkit | 提供 NVCC、头文件、调试与性能工具 |
| cuBLAS | 提供矩阵乘法等线性代数算子 |
| cuDNN | 提供深度学习常用算子 |
| Triton | 使用 Python 风格语言编写自定义 GPU Kernel |

## CUDA 与 NVCC

[CUDA](https://docs.nvidia.com/cuda/index.html) 是 NVIDIA 提供的并行计算平台与编程模型，运行时、驱动 API、编译工具和算子库共同组成其软件生态。原文曾将 CUDA 类比为操作系统内核、将 CUDA Toolkit 类比为 GNU 工具链；该类比有助于入门，但两者并非一一对应：Driver 负责设备访问，CUDA Runtime 提供运行接口，Toolkit 则包含编译器、头文件和开发工具。

NVIDIA CUDA 编译器 (NVIDIA CUDA Compiler, NVCC) 用于编译 `.cu` 文件。CUDA C/C++ 在普通 C/C++ 上增加 Kernel、线程层级和设备内存等语法。源文件中的普通代码是主机端代码 (host code)，在 GPU 上运行的 Kernel 是设备端代码 (device code)。NVCC 会分离两类代码，将主机端部分交给受支持的 C/C++ 编译器，将设备端部分编译为 GPU 代码，最后参与链接。原文曾把普通 C/C++ 误写为 device code，此处按实际含义更正。

一个最小检查案例是分别运行 `nvidia-smi` 与 `nvcc --version`：前者证明 Driver 能识别设备，后者证明 Toolkit 中的编译器可用。即使 `nvcc` 不存在，预编译的 PyTorch 仍可能通过自带 CUDA Runtime 使用 GPU；只有编译自定义 CUDA 扩展时才通常需要本地 Toolkit。

## Triton 案例

当现有算子无法高效融合“读取 -> 归一化 -> 激活 -> 写回”等操作时，可用 Triton 编写融合 Kernel，减少中间张量和显存往返。优化前应先建立正确性测试与基准，比较不同输入尺寸和数据类型，而不是只测一个理想形状。

## 版本排查

出现 `CUDA unavailable` 或未定义符号时，应依次核对硬件、Driver、框架构建版本、动态库搜索路径和扩展编译参数。Driver 通常需要向后兼容应用使用的 CUDA 运行时；第三方扩展还必须与框架 ABI、编译器和 GPU 架构匹配。

## 独立专题

- [GPU 驱动](./driver.md)
- [CUDA](./cuda.md)
- [cuBLAS](./cublas.md)
- [cuDNN](./cudnn.md)
- [Triton](./triton.md)
