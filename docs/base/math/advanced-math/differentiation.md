---
title: 微分学
---

微分的核心目的是：当自变量变化时，用「便于计算的因变量的线性近似值」代替「难以计算的因变量的实际变化值」。

## 导数

当自变量 $x$ 增加了 $\Delta x$ 后，因变量 $f$ 随之变化了 $\Delta f$，就有平均变化率：

$$
\dfrac{\Delta f}{\Delta x} = \dfrac{f(x+\Delta x) - f{(x)}}{(x + \Delta x) - x}
$$

当 $\Delta x$ 趋近于 $0$ 时，平均变化率就可以称作瞬时变化率，数学上我们将其称作导（函）数并记作 $f'(x)$：

$$
f'(x) = \lim_{\Delta x \to 0} \dfrac{\Delta f}{\Delta x}
$$

记作：

$$
f'(x) = \dfrac{\mathrm d f}{\mathrm d x}
$$

多元场景下，我们会固定某个变量 $x_i$ 并将其他变量看作常数，从而计算 $f$ 关于 $x_i$ 的偏导（函）数：

$$
\dfrac{\partial f}{\partial x_i} = \lim_{\Delta x_i \to 0} \dfrac{f(x_1, x_2, \cdots, x_i + \Delta x_i, \cdots, x_n) - f(x_1,x_2,\cdots,x_i,\cdots,x_n)}{\Delta x_i}
$$

我们将多元函数关于每个变量的偏导数组织成向量，就得到了梯度，记作 $\nabla f$ 或 $g$：

$$
\nabla f = (\dfrac{\partial f}{\partial x_1}, \dfrac{\partial f}{\partial x_2}, \cdots, \dfrac{\partial f}{\partial x_i}, \cdots,  \dfrac{\partial f}{\partial x_n})
$$

梯度描述了函数任意位置处的最大变化速度。

## 微分

导数决定了函数的变化方向和变化速度。微分则决定了函数的变化量。

![微分是函数真实变化量的线性近似（主部）](https://cdn.dwj601.cn/images/2026-1112-201523-d93d80fb.png)

如上图所示，当自变量 $x$ 变化了 $\Delta x$ 后，我们将微分 $\mathrm d f$ 记作函数真实变化量 $\Delta f$ 的线性近似（主部）：

$$
\mathrm d f = f'(x)\, \mathrm d x
$$

对于可微的多元函数 $f(\mathbf x)$，其中 $\mathbf x=(x_1,x_2,\cdots,x_n)$ 或者记作 $\mathbf x \in \mathbb R^n$，其微分 $\mathrm d f$ 为：

$$
\mathrm d f = \sum_{i=1}^n \dfrac{\partial f}{\partial x_i} \mathrm d x_i = \nabla f \cdot \mathrm d \mathbf x
$$
