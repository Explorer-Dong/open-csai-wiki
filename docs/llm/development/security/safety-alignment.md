---
title: 安全对齐
---

安全对齐使模型在有害请求、边界场景和工具操作中遵守预期安全行为，同时保持良性任务可用。它起源于 Anthropic 提出的「有益、无害、诚实」(Helpful, Harmless, Honest, HHH) 目标，并在 [InstructGPT](https://arxiv.org/abs/2203.02155) 中首次被工程化为「人类偏好 + 强化学习」的完整管线：先用人类标注训练奖励模型，再用强化学习把奖励信号转化为可训练目标。这一管线后续被 [Constitutional AI](https://arxiv.org/abs/2212.08073) 用 AI 反馈替代部分人类反馈，又被 [DPO](https://arxiv.org/abs/2305.18290) 简化掉显式奖励模型，形成今天「监督微调 -> 偏好优化 -> 运行时防护」的多层对齐体系。

## 快速开始

先定义可接受与不可接受行为：明确模型应拒绝什么、应提供什么形式的安全替代方案、在工具调用和权限边界上应如何行动。没有清晰的行为规范，后续评测就无从下手。可把规范写成可执行的分级策略，例如：

```text
- 直接危险请求（制作爆炸物、窃取数据）：拒绝并说明原因
- 边界请求（讨论漏洞原理）：给出受限、教育性的安全回答
- 良性请求（正常编程、写作）：正常回答，不引入无谓拒绝
```

再用独立红队集评测拒答、帮助性和越权风险：测试集需覆盖危险请求、良性相邻请求与模糊请求三类，避免只统计「拒绝了多少危险请求」。不要仅优化拒答率，否则模型会退化为「一刀切」地拒绝所有请求，误伤正常使用。下面是最小评测脚本，同时产出三项指标：

```python
def evaluate(model, dangerous, benign_near, ambiguous):
    refuse_dangerous = refusal_rate(model, dangerous)      # 安全拒绝率，越高越好
    refuse_benign = refusal_rate(model, benign_near)       # 误拒绝率，越低越好
    alt_quality = alternative_score(model, ambiguous)      # 安全替代方案质量
    return refuse_dangerous, refuse_benign, alt_quality
```

验证方式是同时看三项指标：安全拒绝率、误拒绝率、安全替代方案质量。

## 方法

监督微调 (Supervised Fine-Tuning, SFT)、偏好数据、规则奖励和运行时防护都可参与对齐：SFT 提供安全的示范回答，偏好数据让模型学会拒绝与替代方案之间的取舍，规则奖励把安全约束编码进训练目标，运行时防护则在推理阶段兜底拦截越界行为。RLHF 的训练目标是在保持接近 SFT 策略的同时最大化奖励模型打分

$$
\max_{\phi} \; \mathbb{E}_{(x,y)\sim D_{\pi_\phi^{RL}}}\big[r_\theta(x,y)\big]
- \beta\, \mathrm{KL}\big(\pi_\phi^{RL}(\cdot|x) \,\|\, \pi^{SFT}(\cdot|x)\big)
$$

其中 $\pi_\phi^{RL}$ 是正在优化的策略，$r_\theta$ 是奖励模型，$\pi^{SFT}$ 是参考策略，$\beta$ 控制偏离幅度。优化这一步通常用近端策略优化 (Proximal Policy Optimization, PPO)，其裁剪代理目标由 [Schulman 等人提出](https://arxiv.org/abs/1707.06347)

$$
L^{CLIP}(\theta) = \hat{\mathbb{E}}_t\Big[\min\big(r_t(\theta)\hat{A}_t,\ \mathrm{clip}(r_t(\theta), 1-\epsilon, 1+\epsilon)\hat{A}_t\big)\Big]
$$

其中 $r_t(\theta)=\frac{\pi_\theta(a_t|s_t)}{\pi_{\theta_{old}}(a_t|s_t)}$ 是新旧策略的概率比，$\hat{A}_t$ 是优势估计，$\epsilon$ 是裁剪范围。PPO 需要一个显式奖励模型，而 [DPO](https://arxiv.org/abs/2305.18290) 直接以偏好对为监督，省去奖励模型：

$$
\mathcal{L}_{DPO}(\pi_\theta;\pi_{ref}) = -\mathbb{E}_{(x,y_w,y_l)\sim\mathcal{D}}\Big[\log\sigma\Big(\beta\log\frac{\pi_\theta(y_w|x)}{\pi_{ref}(y_w|x)} - \beta\log\frac{\pi_\theta(y_l|x)}{\pi_{ref}(y_l|x)}\Big)\Big]
$$

其中 $y_w$ 是更受偏好的回答，$y_l$ 是较不受偏好的回答，$\sigma$ 是 sigmoid 函数。这些算法在 [TRL](https://huggingface.co/docs/trl/) 中都有现成的 `PPOTrainer` 与 `DPOTrainer`，各参数的精确语义以官方文档为准。

训练信号只覆盖已知情境，未见过的攻击方式在训练阶段无法被直接消除。因此发布后仍需持续监控与更新：收集线上新出现的绕过案例，回流到评测集与训练数据，形成「评测 -> 训练 -> 监控 -> 再评测」的闭环。对齐不是一次性任务，而是随攻击手段演进的持续过程。

## 案例

用同一套评测脚本同时跑危险请求、良性相邻请求和模糊请求：危险请求检验模型是否拒绝，良性相邻请求检验是否误拒，模糊请求检验模型在边界上能否给出可操作的安全替代方案。

统计三类结果：安全拒绝率、误拒绝率、安全替代方案质量。若安全拒绝率很高但误拒绝率同样很高，说明模型「一刀切」，需要回炉调整偏好数据而非继续堆拒绝样本。对比不同对齐配置下的三项指标，选择在安全与可用之间取得平衡的版本。常见失败点是只优化单点指标，导致发布后出现大量误拒或可被简单绕过。

## 相关主题

- [偏好优化](../training/stages/preference-optimization.md)
- [应用安全与治理](../../application/security/index.md)
