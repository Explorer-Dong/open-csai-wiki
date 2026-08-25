---
title: VERL
---

veRL 是面向大语言模型强化学习的开源框架，提供策略训练与高吞吐 rollout 的混合执行能力，支持 RLHF、GRPO 等在线算法。它由字节跳动 Seed 团队开源，全称 Volcano Engine Reinforcement Learning for LLMs，采用「单一控制器 + 多个可调度 worker」的混合编程模型，把 actor、critic、reward 与 rollout 统一编排，代码见 [GitHub 仓库](https://github.com/volcengine/verl)，文档见 [veRL 文档](https://verl.readthedocs.io/)。

## 快速开始

先在可验证任务上跑通最小闭环，再扩大规模。闭环包括策略、奖励函数与 rollout：策略产生回答，奖励函数给出评分，训练端消费轨迹更新策略。第一步用可验证任务（如答案可判定的数学题）验证奖励函数正确、rollout 可复现、更新后策略确实变化。veRL 以 recipe 形式组织训练入口，例如用 `verl.trainer.main_ppo` 启动 PPO 或 GRPO，并通过 YAML 配置 actor、rollout 与 reward 各自的计算资源。

第二步记录权重同步机制与环境版本，固定奖励函数、随机种子和依赖版本，保证实验可复现。第三步再扩大 worker 与模型服务规模，逐步增加并发 rollout 与训练资源，观察吞吐与训练指标是否随规模健康变化。

## 重点

RL 系统同时包含生成、评分、更新与调度四个环节，任一环节成为瓶颈都会拖累整体。吞吐高不代表训练有效：如果生成的大量回答奖励稀疏、格式错误或不能产生有效梯度，系统只是在空转。veRL 的混合架构正是为这四类异构负载而设计：actor/critic 训练、reward 打分与 rollout 推理往往需要不同的并行策略与硬件，混合执行把它们放在同一调度域内统一管理。

GRPO 是 veRL 中最常用的在线算法之一，它去掉 critic、对同一 prompt 采样一组回答，用组内相对优势做更新，目标为：

$$L_{\text{GRPO}} = \frac{1}{G}\sum_{i=1}^{G}\left[\min\left(\rho_i \hat{A}_i,\ \operatorname{clip}\left(\rho_i, 1-\epsilon, 1+\epsilon\right)\hat{A}_i\right)\right] - \beta\,\mathbb{D}_{\text{KL}}\left[\pi_\theta \,\|\, \pi_{\text{ref}}\right]$$

其中 $G$ 是每个 prompt 采样的回答数，$\rho_i = \pi_\theta(o_i \mid q) / \pi_{\text{old}}(o_i \mid q)$，组内标准化优势 $\hat{A}_i = (r_i - \bar{r}) / \sigma_r$，$\beta$ 是 KL 惩罚系数。相比 PPO，它不再维护 critic 价值网络，省去了一半模型状态与显存，这是它能支撑更大规模 RL 训练的关键，公式细节见 [强化学习](../stages/rl.md#grpo)，原始定义见 [DeepSeekMath 论文](https://arxiv.org/abs/2402.03300)。

必须监控奖励均值与方差、KL 散度、成功率和失败轨迹的分布。奖励上升但 KL 偏离过大可能意味着策略在奖励函数上过拟合；成功率不升反降通常说明奖励信号或数据有问题。失败轨迹与成功轨迹同样需要被记录和分析。调度与权重同步的延迟会影响有效样本率：rollout 使用的策略版本与训练端最新权重的滞后，在线算法下需要纳入评估，必要时调整同步频率或采用异步策略。

## 案例

数学任务使用答案校验器作为奖励函数：最终答案正确给正奖励，错误给负奖励或零奖励。先在小规模上检查每个 rollout 可复现、奖励无误——固定种子和权重后，同样的 prompt 应得到一致的奖励，否则先修奖励函数，不要急着扩 worker。

确认奖励无误后再启用分布式 worker，逐步提高并发。若出现奖励上升但实际成功率不升，检查奖励函数是否被模型利用（如通过格式投机得分）或数据是否泄漏。数学任务中答案校验器相对可靠，但仍需抽查推理过程与最终答案的一致性。

## 相关主题

- [强化学习](../stages/rl.md)
