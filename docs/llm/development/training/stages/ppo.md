---
title: PPO
---

近端策略优化 (Proximal Policy Optimization, PPO) 用裁剪目标限制策略每次更新幅度，是 [RLHF](./rlhf.md) 中最常见的策略优化方法。它的由来是策略梯度方法的稳定性难题：朴素策略梯度（如 REINFORCE）对学习率敏感，一次步子过大就可能让策略崩溃；[TRPO](https://arxiv.org/abs/1502.05477) 用 KL 散度约束提出信任域解法，但实现复杂、计算贵；[PPO](https://arxiv.org/abs/1707.06347) 则用概率比裁剪近似同一目标，用第一阶优化器即可实现，成为此后语言模型 RL 的默认策略优化器。

## 快速开始

先搭好监控体系，记录奖励、KL、熵、优势值和裁剪比例。这些量在每一轮 rollout 与更新后都要可观测，否则训练发散时无法定位原因。奖励来自奖励模型或可验证器，KL 衡量策略相对参考模型的偏离，熵反映策略探索程度，优势值衡量一条动作比平均水平好多少。

再在可验证的小环境确认 rollout 与奖励正确。用结果可自动判定的任务（如数学题答案对错）跑通「采样 -> 打分 -> 计算优势 -> 更新」的完整链路，确认奖励尺度合理、优势计算符号正确，再扩展到大规模训练。

PPO 的更新依赖价值模型估计状态价值，需同时训练 critic。首次实践建议先用成熟框架（如 [TRL](https://huggingface.co/docs/trl/index)、[veRL](https://github.com/volcengine/verl)）的默认超参：裁剪参数 `ε` 常用 0.2，GAE 参数 `λ` 常用 0.95 附近，具体以框架文档为准，把链路跑通后再调参。

## 机制

PPO 的核心是限制新旧策略的概率比。记概率比 $r_t(\theta) = \pi_\theta(a_t \mid s_t) / \pi_{\theta_\text{old}}(a_t \mid s_t)$，裁剪目标为：

$$
L^{\text{CLIP}}(\theta) = \hat{\mathbb{E}}_t\left[\min\left(r_t(\theta)\hat A_t,\ \operatorname{clip}\left(r_t(\theta), 1-\varepsilon, 1+\varepsilon\right)\hat A_t\right)\right]
$$

其中 $\hat A_t$ 是优势估计，$\varepsilon$ 是裁剪阈值（通常 0.2）。取 min 的含义是：当优势为正时，比例超过 $1+\varepsilon$ 的部分不增加目标；当优势为负时，比例低于 $1-\varepsilon$ 的部分不减少目标。这把每次更新的步子限制在可信区间内，降低了单次更新过大导致的策略崩溃风险。

优势估计通常由 critic 与 GAE（广义优势估计）给出，后者把多步时序差分误差加权求和以权衡偏差与方差。设 $\delta_t = r_t + \gamma V(s_{t+1}) - V(s_t)$，GAE 定义为：

$$
\hat A_t = \sum_{l=0}^{\infty}(\gamma\lambda)^l\,\delta_{t+l}
$$

其中 $\gamma$ 是折扣因子，$\lambda$ 控制偏差-方差权衡（$\lambda=1$ 退化为蒙特卡洛回报、$\lambda=0$ 退化为单步 TD）。GAE 出自 [High-Dimensional Continuous Control Using Generalized Advantage Estimation](https://arxiv.org/abs/1506.02438)。在语言模型场景，PPO 还常叠加一个 KL 惩罚项，约束策略不偏离参考策略。这些额外项让 PPO 的实现与调参都较复杂，也催生了 [GRPO](./grpo.md) 等更简化的变体。

PPO 仍依赖奖励质量、采样效率与价值估计。奖励有偏或尺度不当会直接污染更新方向；critic 估计不准会让优势噪声变大；采样成本高则让每次更新样本有限。

## 案例

以数学答案验证为奖励的任务为例：模型对每题采样多条回答，验证器按答案正确性给奖励（例如正确给 1、错误给 0），critic 估计每个 token 的价值，GAE 计算优势，PPO 按裁剪目标更新策略与 critic。

训练中若成功率不升而 KL 激增，说明策略在偏离参考模型却未换来真实收益，应降低更新强度（减小学习率或增大 KL 惩罚系数）或检查奖励尺度。若成功率与 KL 都不动而熵持续下降，说明策略过早收敛到确定性输出，可增大熵正则或采样温度。

若奖励持续上升但人工质量下降，则属于奖励投机，问题在奖励模型而非 PPO 本身，需回到 [RLHF](./rlhf.md) 的奖励验证环节排查。

## 相关主题

- [RLHF](./rlhf.md)
- [GRPO](./grpo.md)
