---
title: Triton
---

Triton 是面向 GPU Kernel 的编程语言与编译器，常用于实现张量计算的融合 Kernel。它由 OpenAI 于 2021 年开源，目标是在手写 CUDA 与框架算子之间提供一个中间层：用类似 Python 的语法描述 block 级计算，由编译器负责把 Triton IR 翻译为 LLVM IR 再到 PTX，最终运行在 NVIDIA GPU 上；PyTorch 2.0 起，`torch.compile` 的 Inductor 后端也默认生成 Triton 代码。参考 [Triton 官方文档](https://triton-lang.org/)。

## 快速开始

只优化 profiler 已证实的热点。先用框架参考实现建立正确性测试，再覆盖真实 batch、数据类型和边界形状比较性能：

```python
import torch

x = torch.randn(1024, 4096, device="cuda", dtype=torch.float16)
ref = torch.nn.functional.layer_norm(x, (4096,), None, None)
print(ref.shape)
```

验证标准是参考实现结果与自定义 Kernel 在允许误差内一致。不要在没有基准的情况下直接替换框架算子。

## 融合的价值

逐元素操作若分别启动 Kernel，会产生中间张量、增加显存访问与启动开销。将「读取 -> 归一化 -> 激活 -> 写回」融合为一次 Kernel 可减少往返，但寄存器占用过高时也会变慢。相比手写 CUDA，Triton 用 block 级编程把共享内存分配、warp 调度等细节交给编译器，让开发者以较少的代码表达分块与向量化逻辑。

## 案例：融合 RMSNorm

RMSNorm 沿最后一个维度归一化，可写为：

$$
y = \frac{x}{\sqrt{\frac{1}{N}\sum_{i=1}^{N}x_i^2 + \epsilon}} \cdot g
$$

其中 $x$ 为输入、$g$ 为可学习缩放权重、$\epsilon$ 防止除零。一个按行处理的 Triton Kernel 如下：

```python
import torch
import triton
import triton.language as tl


@triton.jit
def rmsnorm_kernel(x_ptr, w_ptr, y_ptr, eps, N, BLOCK: tl.constexpr):
    row = tl.program_id(0)
    offs = tl.arange(0, BLOCK)
    mask = offs < N
    x = tl.load(x_ptr + row * N + offs, mask=mask, other=0.0)
    w = tl.load(w_ptr + offs, mask=mask, other=0.0)
    x_f32 = x.to(tl.float32)
    mean_sq = tl.sum(x_f32 * x_f32, axis=0) / N
    y = x_f32 * (1.0 / tl.sqrt(mean_sq + eps)) * w.to(tl.float32)
    tl.store(y_ptr + row * N + offs, y.to(x.dtype), mask=mask)


def rmsnorm(x, weight, eps=1e-5):
    M, N = x.shape
    y = torch.empty_like(x)
    rmsnorm_kernel[(M,)](x, weight, y, eps, N, BLOCK=triton.next_power_of_2(N))
    return y
```

测试非整除长度和 FP16/BF16 误差，并与框架实现比对；若小尺寸变慢，保留框架实现作为回退。

## 工程取舍

自定义 Kernel 需要维护形状约束、回退路径与版本测试。升级编译器或 GPU 后必须重新验证，因为 Triton 生成的 PTX 会随版本变化，性能甚至正确性都可能受影响。对非热点或已有高质量库算子，保持框架默认实现通常更划算。

## 相关主题

- [CUDA](./cuda.md)
- [GPU 微架构](../accelerator/index.md#gpu-微架构)
- [AI 软件栈导读](./index.md)
