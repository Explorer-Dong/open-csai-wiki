---
title: 优化器
---

优化器根据梯度更新模型参数，并通过动量、二阶统计或正则化改善收敛。它沿着一条清晰的演进路径发展：SGD -> Momentum -> Adam -> AdamW，每一步都解决上一步在收敛速度、稳定性或正则化上的一个具体问题。

## 快速开始

大模型微调常从 AdamW 开始：为权重衰减、学习率和参数组写明配置：

```python
opt = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=0.1)
```

先记录梯度范数、更新量与验证损失，不要仅凭训练步数判断成功——同样的步数，更新是否稳定、验证损失是否下降才是收敛证据。

## 原理

SGD 直接沿负梯度更新：

$$w \leftarrow w - \eta \nabla L(w)$$

它实现简单，但在沟谷或陡峭方向上会震荡、收敛慢。动量 (momentum) 引入历史梯度的指数移动平均，让更新沿稳定方向加速：

$$v \leftarrow \beta v + \nabla L(w), \qquad w \leftarrow w - \eta v$$

其中 $\beta$ 是动量系数，$v$ 是累积的速度。

Adam（[论文](https://arxiv.org/abs/1412.6980)）进一步维护梯度的一阶矩 $m$ 与二阶矩 $v$，对每个参数自适应缩放步长：

$$m_t \leftarrow \beta_1 m_{t-1} + (1-\beta_1) g_t, \qquad v_t \leftarrow \beta_2 v_{t-1} + (1-\beta_2) g_t^2$$

其中 $g_t$ 是当前梯度，$\beta_1, \beta_2$ 默认取 0.9 与 0.999。偏差校正与更新为：

$$\hat m_t = \frac{m_t}{1-\beta_1^t}, \qquad \hat v_t = \frac{v_t}{1-\beta_2^t}, \qquad w_t \leftarrow w_{t-1} - \eta \frac{\hat m_t}{\sqrt{\hat v_t} + \epsilon}$$

AdamW（[论文](https://arxiv.org/abs/1711.05101)）指出：传统实现把 L2 正则化混进梯度里，会与 $\hat v_t$ 的缩放纠缠，导致权重衰减被二阶矩「稀释」。它把权重衰减从梯度更新中解耦，直接作用在参数上：

$$w_t \leftarrow w_{t-1} - \eta \frac{\hat m_t}{\sqrt{\hat v_t} + \epsilon} - \eta \lambda w_{t-1}$$

其中 $\lambda$ 是权重衰减系数。解耦后权重衰减的强度与自适应学习率无关，正则化行为更可控，因此 AdamW 成为大模型事实上的默认优化器。不同参数（如 bias、Norm）通常不施加 weight decay，因为它们起平移/缩放作用，衰减它们可能反而伤害表达能力。

## 案例：参数分组

将线性层权重放入有 weight decay 的组，把 bias 与 LayerNorm 放入无衰减组：

```python
decay, no_decay = [], []
for n, p in model.named_parameters():
    (no_decay if p.ndim <= 1 else decay).append(p)
opt = torch.optim.AdamW([
    {"params": decay, "weight_decay": 0.1},
    {"params": no_decay, "weight_decay": 0.0},
], lr=3e-4)
```

用 `p.ndim <= 1` 作为判据覆盖 bias 与 LayerNorm 的权重（它们都是一维或更低维的张量）。训练后比较验证损失与权重范数，确认正则化没有意外作用于不应衰减的参数。

## 排查

若更新不稳定，先降低学习率并检查梯度裁剪、精度和 batch；不要把所有问题归因于「换优化器」——多数「优化器不管用」的案例，根因是学习率、初始化或数据问题，而不是优化器算法本身。

## 相关主题

- [学习率](./learning-rate.md)
- [损失函数](./loss.md)
