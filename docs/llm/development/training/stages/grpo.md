---
title: GRPO
---

组相对策略优化 (Group Relative Policy Optimization, GRPO) 对同一提示采样一组回答，并以组内相对奖励构造更新信号，是 [PPO](./ppo.md) 的一种简化变体。它的由来是 [PPO](./ppo.md) 中 critic（价值模型）带来的额外负担：价值模型与策略模型体量相当，训练它意味着额外的显存、同步与调参；[GRPO](https://arxiv.org/abs/2402.03300) 提出用「同一 prompt 的一组回答的相对好坏」直接估计优势，从而省去 critic。该方法由 [DeepSeekMath](https://arxiv.org/abs/2402.03300) 提出，并被 [DeepSeek-R1](https://arxiv.org/abs/2501.12948) 用于大规模推理强化学习。

## 快速开始

为每个 prompt 采样多个候选（组大小 `G`，常见取 4 到 16，具体以训练框架建议为准），使用可靠验证器评分。验证器必须能对每条回答给出确定性或规则化的奖励，例如数学题答案对错、代码是否通过测试，而不是依赖另一个容易作弊的模型。

记录三个关键量：组大小、奖励方差和成功率。奖励方差反映组内样本的区分度——方差过小说明这组回答几乎同质，优势信号很弱；成功率反映任务本身的可解程度，全组全对或全错时都学不到有用的相对信号。

先用小规模任务验证「采样 -> 验证器评分 -> 组内归一化 -> 更新」整条链路正确，再扩大规模。GRPO 不需要单独的 critic，实现比 PPO 简单，但采样成本是它的主要开销。开源实现可参考 [TRL 的 GRPOTrainer](https://huggingface.co/docs/trl/grpo_trainer) 与 [veRL](https://github.com/volcengine/verl)。

## 机制

GRPO 的核心是用组内相对奖励替代价值模型估计的优势。对同一 prompt 采样的 $G$ 条回答，先用验证器得到奖励 $r_i$，再做组内标准化：

$$
\hat A_i = \frac{r_i - \operatorname{mean}(r_1,\ldots,r_G)}{\operatorname{std}(r_1,\ldots,r_G)}
$$

其中 $\operatorname{mean}(r)$ 与 $\operatorname{std}(r)$ 是该组内奖励的均值与标准差。这个标准化后的值就是优势估计，替代了 PPO 中由 critic + GAE 计算的优势。完整的 GRPO 目标沿用 PPO 的裁剪思想，并叠加相对参考模型的 KL 惩罚：

$$
J_{\text{GRPO}}(\theta) = \mathbb{E}_{q\sim P(Q),\ \{o_i\}_{i=1}^{G}\sim\pi_{\theta_\text{old}}(\cdot\mid q)}\left[\frac{1}{G}\sum_{i=1}^{G}\min\left(\frac{\pi_\theta(o_i\mid q)}{\pi_{\theta_\text{old}}(o_i\mid q)}\hat A_i,\ \operatorname{clip}\left(\frac{\pi_\theta(o_i\mid q)}{\pi_{\theta_\text{old}}(o_i\mid q)}, 1-\varepsilon, 1+\varepsilon\right)\hat A_i\right) - \beta\, D_{\mathrm{KL}}\left(\pi_\theta \| \pi_{\text{ref}}\right)\right]
$$

其中 $\varepsilon$ 是裁剪阈值，$\beta$ 是 KL 惩罚系数，$\pi_{\text{ref}}$ 是参考策略。由于优势来自组内比较，GRPO 减少了对单独价值模型的依赖，省去了 critic 的训练与调参。

代价是采样成本与奖励稀疏。每个 prompt 要采样多条回答，且组内比较在「全组都对」或「全组都错」时没有区分度，此时标准化项退化、信号噪声大。格式解析也是关键瓶颈：验证器若因解析失败而统一打低分，会把「格式错误」与「内容错误」混为一谈。

## 案例

对一道数学题采样 8 条推理，按最终答案正确性给分（正确 1 分、错误 0 分），组内标准化后得到每条回答的优势，再按裁剪目标更新策略。观察组内奖励方差：方差大说明有的回答对、有的错，学习信号清晰。

当全组都错时，标准化后优势全部接近 0，此时不应只放大更新步长，而应增加数据或增加探索——例如提高采样温度、扩大动作空间覆盖、或引入更易解的子任务，让组内出现可区分的正确回答。反之，全组都对说明任务太简单，需要换更难的题目。

另一个常见问题是验证器的解析失败被误当成内容错误。应在评分前把「能否解析出最终答案」与「答案是否正确」分开统计，若解析失败率高，先修格式约束或验证器，再谈策略优化。

## 相关主题

- [PPO](./ppo.md)
- [Agentic RL](./agentic-rl.md)
