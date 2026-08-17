---
title: 学习率
---

学习率控制每次参数更新的尺度，是训练稳定性和收敛速度最敏感的超参数之一。它很少作为单一常数使用，而是配合 warm-up 与衰减调度在整个训练过程中变化：warm-up 解决训练初期的稳定性，衰减解决后期在最优解附近的收敛精度。

## 快速开始

从已验证配方开始，使用 warm-up 加衰减调度，并记录实际每步学习率。先做短跑实验比较少量候选值（如峰值学习率相差一个数量级的几个点），再进行完整训练：

```python
sched = torch.optim.lr_scheduler.LambdaLR(
    opt, lr_lambda=lambda t: lr(t, warmup, total_steps))
for step in range(total_steps):
    opt.step(); sched.step()
    print(step, sched.get_last_lr()[0])   # 记录真实学习率
```

验证标准是：学习率曲线符合预期形状，且每一步记录的是调度器实际给出的值，而不是配置里写的名义值。

## 调度

warm-up 让初始更新逐渐增大，降低随机初始化或恢复训练初期的不稳定。它在 Transformer 时代随 [Attention is All You Need](https://arxiv.org/abs/1706.03762) 的 Noam 调度普及，原始形式是「先线性上升、再按步数平方根衰减」，后来简化为「线性 warm-up + 余弦/线性衰减」的组合。

余弦衰减来自 [SGDR](https://arxiv.org/abs/1608.03983)，把学习率从峰值平滑降到最小值：

$$lr(t) = lr_{\min} + \frac{1}{2}\left(lr_{\max} - lr_{\min}\right)\left(1 + \cos\frac{\pi t}{T}\right)$$

其中 $t$ 是当前步，$T$ 是总步数，$lr_{\max}$ 与 $lr_{\min}$ 是峰值与终值学习率。GPT-3（[论文](https://arxiv.org/abs/2005.14165)）采用「375M token 线性 warm-up，随后余弦衰减到峰值 10%，全程约 260B token」的调度，成为大模型训练的常用参考。

调度应按优化器更新步而非数据加载次数定义，特别是在梯度累积时：$G_{\text{acc}}$ 个 micro step 才对应一次更新，若调度器跟着 micro step 前进，学习率会提前 $G_{\text{acc}}$ 倍衰减。

## 案例：warm-up

设置前 3% 更新步线性 warm-up，之后余弦衰减：

```python
def lr(t, warmup, total, peak=3e-4, min_lr=3e-5):
    if t < warmup:
        return min_lr + (peak - min_lr) * t / warmup
    p = (t - warmup) / max(1, total - warmup)
    return min_lr + 0.5 * (peak - min_lr) * (1 + math.cos(math.pi * p))
```

验证标准是画出学习率曲线，确认前 3% 单调上升、后续平滑下降且无跳变。若开始即出现 loss spike，先延长 warm-up 或降低峰值学习率；若长期不学习，再排查数据和梯度而非无限提高学习率。

## 常见问题

恢复训练必须一并恢复优化器和调度器状态（`opt.state_dict()` 与 `sched.state_dict()`），否则实际学习率会从峰值重新开始，引起跳变。多卡 global batch 改变后也需重新审视学习率：batch 增大后梯度更稳定，可考虑按经验适当上调峰值学习率，但要通过短实验验证，而非盲套线性缩放。

## 相关主题

- [优化器](./optimizer.md)
- [Batch](./batch.md)
