---
title: DPO
---

直接偏好优化 (Direct Preference Optimization, DPO) 直接利用胜负回答对优化策略，无需显式在线奖励模型训练循环，是 [偏好优化](./preference-optimization.md) 中最常用的离线方法。它的由来是 [RLHF](./rlhf.md) 流水线的繁琐：先训奖励模型、再做在线强化学习，链路长、不稳定、开销大；[DPO](https://arxiv.org/abs/2305.18290) 证明「训练奖励模型 + 强化学习」两步在带 KL 约束的目标下可被合并成单个损失函数，直接从偏好对上优化策略。

## 快速开始

先固定参考模型与偏好数据模板。参考模型通常取 [SFT](./sft.md) 后的策略并冻结，作为约束策略偏离的锚点；偏好数据按统一模板把同一 prompt 的 chosen 与 rejected 两个回答编码进序列，模板不一致会导致模型在错误位置计算对数概率。

再在小规模上检查 chosen/rejected 是否颠倒。训练前用参考模型分别计算 chosen 与 rejected 的对数概率，若参考模型本身更偏好 rejected（例如 chosen 明显更长或风格与训练分布不符），说明数据或模板有问题，先修正再训练，否则目标方向是错的。

训练时常用 `β` 控制对参考模型的偏离程度（见「原理」），从一个小规模实验开始，观测训练损失下降与 chosen 相对概率的变化，再扩大数据。使用 [TRL 的 DPOTrainer](https://huggingface.co/docs/trl/dpo_trainer) 时，输入格式、参考模型的加载与 `β` 配置已封装，但仍应核对自有数据的 chosen/rejected 顺序。

## 原理

DPO 从带 KL 约束的强化学习目标出发：RLHF 优化 $\max_\pi\ \mathbb{E}_{y\sim\pi}[r(x,y)] - \beta D_{\mathrm{KL}}(\pi \| \pi_{\text{ref}})$，其闭式最优策略满足 $\pi^*(y \mid x) \propto \pi_{\text{ref}}(y \mid x)\exp(r(x,y)/\beta)$。把该式对 $r$ 反解，得到奖励由策略和参考策略共同决定的「隐式奖励」：

$$
r(x, y) = \beta \log\frac{\pi_\theta(y \mid x)}{\pi_{\text{ref}}(y \mid x)} + \beta \log Z(x)
$$

其中 $Z(x)$ 是只依赖 $x$ 的配分函数。把这个奖励代入 Bradley-Terry 偏好模型 $\sigma(r(x,y_w) - r(x,y_l))$，两项中的 $\beta \log Z(x)$ 相互抵消，就得到只含策略与参考策略对数概率比的 DPO 目标：

$$
\mathcal{L}_{\text{DPO}}(\pi_\theta; \pi_{\text{ref}}) = -\mathbb{E}_{(x, y_w, y_l)\sim\mathcal{D}}\left[\log\sigma\left(\beta\log\frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta\log\frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)}\right)\right]
$$

其中 $y_w$ 是获胜回答、$y_l$ 是落败回答，$\sigma$ 是 sigmoid，$\beta$ 控制偏离参考策略 $\pi_{\text{ref}}$ 的强度。这个目标把偏好目标写为相对参考策略的对数概率差，使获胜回答概率提高、落败回答概率降低；而 DPO 的隐式奖励可写为：

$$
\hat r_\theta(x, y) = \beta \log\frac{\pi_\theta(y \mid x)}{\pi_{\text{ref}}(y \mid x)}
$$

即策略相对参考模型的对数概率比乘以 $\beta$ 就是它隐式学到的奖励。因此 DPO 不需要显式奖励模型，也不需要在线采样，只需一批固定的偏好对，训练更稳定、成本更低。

代价是 DPO 缺少在线探索，性能上限受偏好数据分布约束，对分布外回答的泛化依赖数据覆盖；此外它对偏好噪声和 chosen/rejected 长度差异较敏感。针对这些问题，后续又出现了 IPO、KTO、ORPO 等变体，以及「先离线 DPO、再在线强化学习」的混合路线。

## 案例

对同一 prompt 的两份答案构建偏好对，训练后检查模型对 chosen 的条件概率是否上升。若训练损失下降但未见偏好集上胜率不升，常见原因是过拟合训练偏好或 `β` 过大导致模型几乎没有移动。一个最小 DPO 损失的伪代码如下：

```text
输入: prompt x, chosen y_w, rejected y_l, policy π, reference π_ref
logp_w = log π(y_w | x);  logp_l = log π(y_l | x)
ref_w  = log π_ref(y_w | x);  ref_l = log π_ref(y_l | x)
margin = β * ((logp_w - ref_w) - (logp_l - ref_l))
loss = -log_sigmoid(margin)
更新 policy 参数
```

为排除长度偏置，可在数据构造时尽量让 chosen 与 rejected 长度可比，或在评估时做长度归一化。评估还应在未见偏好集上验证，而不是只看训练目标：训练目标下降只能说明模型在拟合这批标签，胜率与下游能力（拒答、格式、真实性）才是真正要看的信号。

若发现模型开始一味输出长文或讨好式回答，通常是偏好标签本身偏向长文，需回到 [偏好优化](./preference-optimization.md) 的数据审查环节修正，而不是靠调 `β` 掩盖。

## 相关主题

- [偏好优化](./preference-optimization.md)
- [SFT](./sft.md)
