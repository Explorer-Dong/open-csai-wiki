---
title: 训练基础
---

## 独立专题

- [损失函数](./loss.md)
- [反向传播](./backpropagation.md)
- [优化器](./optimizer.md)
- [学习率](./learning-rate.md)
- [Batch](./batch.md)
- [梯度累积](./gradient-accumulation.md)

训练基础描述一次参数更新为何成立，以及 Loss、梯度、Optimizer、Learning Rate 和 Batch 如何共同影响收敛。

## 快速开始

以下代码展示最小训练步：

```python
optimizer.zero_grad()
logits = model(input_ids)
loss = criterion(logits, labels)
loss.backward()
optimizer.step()
```

前向计算得到 Loss，反向传播把 Loss 对参数的导数写入梯度，Optimizer 再更新参数。真实训练还需要学习率调度、混合精度、梯度裁剪、日志、验证和检查点。

## Loss 与反向传播

自回归语言模型常使用交叉熵损失：

$$
\mathcal{L}=-\frac{1}{N}\sum_{i=1}^{N}\log p_\theta(y_i\mid x_i)
$$

反向传播应用链式法则计算 $\nabla_\theta\mathcal{L}$。Loss 下降只说明训练目标得到优化，不等于模型在独立任务、安全性或事实性上同步提升。

## Optimizer 与 Learning Rate

随机梯度下降按梯度反方向更新参数；AdamW 使用一阶、二阶动量并把权重衰减与梯度更新解耦。Learning Rate 太大会导致发散，太小则训练缓慢。常见方案先 Warmup，再使用余弦或线性衰减。

## Batch 与梯度累积

Micro Batch 是单次前后向处理的样本数。梯度累积 (Gradient Accumulation) 在多个 Micro Batch 上累积梯度后才执行一次更新，可在显存有限时增大有效 Batch：

$$
B_\text{global}=B_\text{micro}\times N_\text{accum}\times N_\text{data-parallel}
$$

使用梯度累积时，应按累积步数缩放 Loss，并确认学习率调度器按参数更新次数而不是 Micro Batch 次数推进。

## 稳定性检查

训练开始前先让模型过拟合一个极小批次，以验证标签、Mask 和梯度链路。正式运行时监控 Loss、梯度范数、学习率、吞吐、显存和非有限数值。出现 NaN 时依次检查数据、数值精度、Loss 缩放、学习率与异常样本。
