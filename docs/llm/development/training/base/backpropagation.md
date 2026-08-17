---
title: 反向传播
---

反向传播利用链式法则计算损失对各参数的梯度，是神经网络训练的核心机制。它最早由 Rumelhart、Hinton 与 Williams 在 1986 年系统阐述（[论文](https://www.nature.com/articles/323533a0)），如今几乎所有深度学习框架都以「反向自动微分」的方式实现它：训练时只需写前向计算，框架自动给出梯度。

## 快速开始

一次训练步依次执行前向计算、损失计算、`backward()`、优化器更新和清零梯度：

```python
opt.zero_grad(set_to_none=True)
logits = model(x)
loss = loss_fn(logits, y)
loss.backward()
opt.step()
```

`set_to_none=True` 用置空代替写零，可减少一次内存读写。先在单个 batch 上过拟合：固定输入与标签、关闭随机增强，训练到损失趋近 0，以此验证计算图、标签对齐与梯度路径正确，再开始真实训练。

## 原理

设损失 $L$ 是各层输出 $a_1, a_2, \dots, a_L$ 的复合函数，反向传播按「从输出到输入」的顺序逐层应用链式法则：

$$\frac{\partial L}{\partial w_i} = \frac{\partial L}{\partial a_i} \cdot \frac{\partial a_i}{\partial w_i}$$

其中 $\partial L / \partial a_i$ 是从更上层传回的梯度，$\partial a_i / \partial w_i$ 是本层输出对参数 $w_i$ 的局部导数。前向阶段必须保存计算所需的中间结果（激活值与部分输入），反向阶段才能把上游梯度与局部 Jacobian 相乘并继续向前传。损失对每个参数的完整梯度是多条计算路径贡献之和，链式法则保证这些贡献可被逐层累加。

自动微分 (autograd) 在框架层面用计算图记录每一步运算，反向时沿着图做一次拓扑排序的逆向遍历，自动完成上述求导（[PyTorch 文档](https://pytorch.org/docs/stable/autograd.html)）。但它不会替你修正三类错误：断开的计算图、错误的 `detach`、以及未参与优化的参数（如 `requires_grad=False` 或没被加进优化器的参数）。

## 案例：单批过拟合

固定一个很小 batch（例如 8 条样本），关闭随机增强与 dropout，训练数百步。若损失仍不能明显下降，按顺序排查标签对齐、参数 `requires_grad`、优化器参数组及梯度范数：

```python
for step in range(500):
    opt.zero_grad(set_to_none=True)
    loss = loss_fn(model(x_batch), y_batch)
    loss.backward()
    print(loss.item(), sum(p.grad.norm().item()
                           for p in model.parameters() if p.grad is not None))
    opt.step()
```

验证标准是：单个 batch 的损失在数百步内明显下降并趋近 0，且每一步各参数的梯度都不为 None。若某参数组没有梯度，先确认它真的参与了前向；若损失下降但梯度范数异常大，再检查标签是否错位（例如 prompt 与 label 差了一位）。

## 工程取舍

激活值通常比参数更占显存：前向保存的中间结果在长序列、大 batch 下会远超权重本身。梯度检查点 (gradient checkpointing) 在反向需要时重算激活而非保存，用额外的计算换显存，能把激活显存从 $\mathcal O(L)$ 降到 $\mathcal O(\sqrt{L})$（[论文](https://arxiv.org/abs/1604.06174)）。混合精度与 loss scaling 则以数值管理换吞吐：用 FP16/BF16 加速计算，再放大损失避免小梯度下溢（[PyTorch AMP 文档](https://pytorch.org/docs/stable/amp.html)）。

## 相关主题

- [损失函数](./loss.md)
- [梯度累积](./gradient-accumulation.md)
