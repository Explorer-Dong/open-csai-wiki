---
title: CUDA
---

CUDA（Compute Unified Device Architecture）是 NVIDIA 的并行计算平台和编程模型，涵盖运行时、驱动 API、编译工具及其算子生态。它把 GPU 从早期仅面向图形的固定管线，发展为可由通用代码编程的并行处理器，是现代深度学习训练与推理软件栈的底座。执行模型见 [CUDA C++ 编程指南](https://docs.nvidia.com/cuda/cuda-c-programming-guide/)。

## 快速开始

先让框架执行一次 GPU 矩阵乘法，再在需要编译扩展时检查 `nvcc --version`：

```python
import torch

x = torch.randn(512, 512, device="cuda")
y = x @ x
print(y.device)
```

验证标准是输出 `device(type='cuda')` 且结果正确。预编译 PyTorch 能使用自带 CUDA Runtime，因此没有 NVCC 不一定是故障；只有编译自定义 `.cu` 扩展时才通常需要本地 Toolkit。

## 执行模型

主机端代码负责分配内存和发射 Kernel；设备端 Kernel 由大量线程并行执行。线程按 block 和 grid 组织，硬件再以 32 个线程为一个 warp 作为调度单位。一维情况下，线程在 grid 中的全局编号可写为：

$$
\mathrm{global\_id} = \mathrm{blockIdx.x} \times \mathrm{blockDim.x} + \mathrm{threadIdx.x}
$$

内存从近到远分为寄存器、共享内存和全局显存等层级：寄存器是线程私有且最快，共享内存位于芯片上、可供 block 内线程协作并需配合同步原语使用，全局内存容量最大但延迟最高。高性能实现需要同时关注并行度、访存与同步——block 划分决定并行规模，共享内存与合并访存决定有效带宽，同步原语则保证 block 内数据可见。

## 案例：最小验证

在 PyTorch 中创建 CUDA 张量并执行矩阵乘法，确认输出位于 GPU：

```python
import torch

a = torch.randn(1024, 1024, device="cuda")
b = torch.randn(1024, 1024, device="cuda")
c = torch.mm(a, b)
assert c.is_cuda
```

若失败，先验证 [驱动](./driver.md)，再确认框架构建支持对应运行时；只有自定义 `.cu` 扩展编译失败时，才重点检查 Toolkit 与编译器。这样把「设备可用 -> 运行时可用 -> 编译工具可用」逐层区分，避免误判。

## 常见问题

CUDA out of memory 常来自模型、激活值、KV Cache 或碎片，而非 CUDA 本身「失效」。不要仅靠频繁清空缓存；应先用显存统计找出增长对象，例如逐层记录峰值、检查 KV Cache 随序列长度增长的速度，或确认是否存在被缓存的中间张量。

## 相关主题

- [GPU 驱动](./driver.md)
- [cuBLAS](./cublas.md)
- [Triton](./triton.md)
