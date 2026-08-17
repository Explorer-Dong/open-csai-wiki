---
title: cuDNN
---

cuDNN（CUDA Deep Neural Network library）为深度学习常用算子提供经过 GPU 优化的实现，例如卷积、池化、归一化和部分注意力原语。它把反复调优的卷积实现沉淀为库，使框架不必为每种硬件组合重写 Kernel。参考 [cuDNN 官方文档](https://docs.nvidia.com/deeplearning/cudnn/)。

## 快速开始

优先从 PyTorch 等框架使用 cuDNN。性能异常时，用 profiler 确认实际后端，并记录输入形状、布局、数据类型和确定性设置：

```python
import torch

print(torch.backends.cudnn.version())
print(torch.backends.cudnn.benchmark)
```

验证标准是版本号可打印、卷积结果正确。`benchmark` 开关控制是否在运行时自动搜索最快卷积算法，属于性能与启动开销的权衡，见下节。

## 算法选择

同一算子常有多个实现：某些实现用更多工作空间换取速度，某些实现保证确定性但较慢。cuDNN 通过启发式 (heuristic) 或基准测试 (benchmark) 选择算法：启发式根据形状快速给出估计，基准测试则对候选算法实测后择优，前者快但可能次优，后者更准但首次调用有搜索开销。二维卷积（实际为互相关）可写为：

$$
y[n,c_o,i,j] = \sum_{c_i}\sum_{k_h}\sum_{k_w} x[n,c_i,\,i\cdot s_h+k_h-p_h,\,j\cdot s_w+k_w-p_w]\cdot w[c_o,c_i,k_h,k_w]
$$

其中 $s$ 为步长、$p$ 为填充。动态形状和频繁布局转换会降低算法缓存命中，因为缓存以形状等属性为键，键一变就要重新选择。

## 案例：卷积性能波动

视觉模型输入分辨率经常变化时，后端会反复搜索算法。把常用分辨率分桶、预热并减少布局转换，可让延迟更稳定；PyTorch 中可先 `torch.backends.cudnn.benchmark = True` 开启自动搜索，并固定输入形状避免重复搜索。需要严格可复现时显式启用确定性配置（如 `torch.use_deterministic_algorithms(True)`），代价是可能放弃更快的非确定性算法。

## 排查

报错也可能来自更早发生的异步 Kernel 错误或 ABI 冲突。先缩小到最小输入，再检查框架、[驱动](./driver.md) 与运行时版本；异步错误常在后续同步点才暴露，因此报错位置未必是根因位置。

## 相关主题

- [CUDA](./cuda.md)
- [cuBLAS](./cublas.md)
- [AI 软件栈导读](./index.md)
