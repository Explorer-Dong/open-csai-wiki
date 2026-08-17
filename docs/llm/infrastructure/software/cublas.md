---
title: cuBLAS
---

cuBLAS 是 CUDA 平台的高性能线性代数库，实现经典 BLAS（Basic Linear Algebra Subprograms）接口的 GPU 版本。深度学习的矩阵乘法常通过它或同类库实现，因此其数据布局、精度与内核选择会直接影响线性层的吞吐。参考 [cuBLAS 官方文档](https://docs.nvidia.com/cuda/cublas/)。

## 快速开始

先用框架的矩阵乘法建立基线，再使用 profiler 确认热点是否为 GEMM：

```python
import torch

a = torch.randn(2048, 4096, device="cuda", dtype=torch.bfloat16)
b = torch.randn(4096, 2048, device="cuda", dtype=torch.bfloat16)
c = a @ b
```

验证标准是 `c` 形状为 `(2048, 2048)` 且计算正确。只有热点明确、形状稳定且已有算子无法满足需求时，才考虑直接调用 cuBLAS 或替换实现；对多数深度学习用户，经由框架间接使用通常更省事也更稳。

## 核心能力

库提供矩阵乘法、批量矩阵运算和向量操作，并会依据数据类型、尺寸与硬件选择内核。其核心接口是通用矩阵乘法 (General Matrix Multiply, GEMM)：

$$
C = \alpha\,\mathrm{op}(A)\,\mathrm{op}(B) + \beta\,C
$$

其中 $\alpha$、$\beta$ 是标量，$\mathrm{op}(\cdot)$ 表示可选转置；当 $A\in\mathbb{R}^{M\times K}$、$B\in\mathbb{R}^{K\times N}$ 时，一次 GEMM 约含 $2MNK$ 次浮点运算。

cuBLAS 沿用 BLAS 传统，按列主序 (column-major) 存储矩阵；而 PyTorch 张量默认按行主序 (row-major) 存储。二者互为转置关系，因此框架调用 cuBLAS 时通过转置标志把行主序数据「解释」为列主序，再执行对应 GEMM。张量布局、对齐和维度是否适合 Tensor Core，会进一步决定实际性能，转置或非连续张量可能触发额外拷贝。

## 案例：定位线性层瓶颈

一个推理服务大部分时间花在 $M\times K$ 与 $K\times N$ 的乘法。先检查 batch、hidden size 和数据类型是否让 GEMM 充分利用 GPU：M、N 过小会使每次 Kernel 的算术量不足以摊平启动与读权重开销。若小矩阵调用过多，优先考虑批处理（合并多个小 GEMM）或融合周边算子，而不是单独优化每次乘法。

## 注意事项

数值精度、累积类型和确定性选项会改变结果与速度。例如混合精度 GEMM 常用 FP16/BF16 输入、FP32 累积，以获得吞吐与精度的平衡；确定性算法往往牺牲部分性能换取可复现结果。性能测试应覆盖真实输入形状、并发和 warm-up，不能只报告峰值 FLOPS。

## 相关主题

- [Tensor Core](../accelerator/index.md#tensor-core)
- [CUDA](./cuda.md)
- [cuDNN](./cudnn.md)
