---
title: RL
---

大语言模型强化学习 (Reinforcement Learning, RL) 让当前策略生成回答或与环境交互，再根据奖励更新参数。它弥补 [有监督微调](./sft.md) 只能模仿既有答案的局限：当目标是「答案是否正确」「回答 A 是否优于回答 B」或「多步工具任务是否完成」时，奖励可以直接表达结果质量，并通过信用分配改变产生结果的 token 与动作概率。

本篇把偏好优化、RLHF、DPO、PPO、GRPO、DAPO、GSPO、可验证奖励和 Agentic RL 放在同一套记号下。需要先明确：RLHF 描述反馈来源，RLVR 描述奖励性质，PPO、GRPO、DAPO 与 GSPO 描述策略更新方法；DPO 使用固定偏好数据直接优化，通常不属于在线策略梯度 RL。

## 训练循环与符号约定

先在一个能可靠自动评分的小任务上跑通基本循环：

```text
当前策略 rollout -> 奖励/验证器评分 -> 优势估计
                 -> 策略 loss -> 参数更新 -> 新策略 rollout
```

上线大规模训练前，必须验证：

1. rollout 文本、token 与记录的旧策略 log-prob 对齐；
2. 奖励方向、范围、解析失败与截断处理正确；
3. response mask 不包含 prompt、padding 或环境 observation；
4. 正优势提高对应动作概率，负优势降低对应动作概率；
5. 奖励、KL、熵、长度、裁剪比例和任务指标都可监控；
6. 同一 rollout 与模型版本可以重放并复算 loss。

以每个 prompt 采样 $G$ 个回答的训练为例，统一形状如下：

| 张量 | 含义 | 形状 |
| :-- | :-- | :-- |
| $X$ | prompt token | $[B,S_x]$ |
| $Y$ | response token | $[B,G,L]$ |
| $M$ | response 有效 token mask | $[B,G,L]$ |
| $Z$ | 策略 response logits | $[B,G,L,V]$ |
| $\log P_\theta$ | 采样 token 的新策略 log-prob | $[B,G,L]$ |
| $\log P_{\text{old}}$ | rollout 策略 log-prob | $[B,G,L]$ |
| $R$ | 回答级奖励 | $[B,G]$ |
| $A$ | token 级优势 | $[B,G,L]$，或由 $[B,G]$ 广播 |
| $V_\psi$ | critic 对每个状态的价值 | $[B,G,L]$ |

$V$ 是词表大小，不应与价值函数 $V_\psi$ 淆。实现可能先把前两维展平为 $N=BG$，得到 $Y:[N,L]$ 和 $Z:[N,L,V]$；只要 reshape 前后索引和 mask 一致，数学含义不变。

## 阶段意义

### 从语言模型到策略

给定 prompt $x$ 与已生成前缀 $y_{<t}$，语言模型本身就是策略：

$$
\pi_\theta(y_t\mid x,y_{<t})
=\operatorname{softmax}(Z_{t,:})_{y_t}.
$$

在单轮生成中，状态是 $(x,y_{<t})$，动作是下一个 token，完整回答是轨迹。多步 Agent 还会执行工具动作并接收环境观察：

$$
\tau=(s_0,a_0,o_1,s_1,a_1,o_2,\ldots,s_T).
$$

SFT 问「专家在这个状态做了什么」，RL 问「这个动作最终带来了多大回报」。因此 RL 可以在没有唯一标准文本的情况下优化数学正确率、代码测试、安全偏好或完整任务成功率。

### 策略梯度

最基本的策略梯度把优势 $A_{b,g,t}$ 作为采样 token log-prob 的权重：

$$
\mathcal{L}_{\text{PG}}
=-
\frac{
\sum_{b,g,t}M_{b,g,t}A_{b,g,t}
\log\pi_\theta(Y_{b,g,t}\mid X_b,Y_{b,g,<t})
}{
\sum_{b,g,t}M_{b,g,t}
}.
$$

$\log P_\theta,A,M\in\mathbb{R}^{B\times G\times L}$，逐元素相乘后归约为标量。$A>0$ 时，最小化 loss 会提高采样动作的概率；$A<0$ 时会降低概率。奖励决定「结果多好」，优势估计减去基线并完成信用分配，策略目标再决定单次更新允许走多远。

## 奖励与偏好

### 标量奖励

奖励可以来自：

- 人类或 AI 偏好模型：适合有用性、风格和安全等主观目标；
- 规则验证器：适合数学答案、格式、编译和测试；
- 环境结果：适合搜索、代码修复、网页操作等多步任务；
- 过程监督：在中间步骤提供局部信号；
- 多目标组合：正确性、成本、安全和长度的加权和。

若原始奖励分量为 $R^{(k)}\in\mathbb{R}^{B\times G}$，组合奖励可写为：

$$
R=\sum_{k=1}^{K}w_k R^{(k)}\in\mathbb{R}^{B\times G}.
$$

权重会改变训练目标本身。奖励尺度过大、解析器有漏洞或不同分量相互冲突，都会直接污染优势，因此必须分别记录原始分量，不能只保存最终总分。

### 奖励模型与 RLHF

基于人类反馈的强化学习 (Reinforcement Learning from Human Feedback, RLHF) 源于[用人类偏好学习奖励](https://arxiv.org/abs/1706.03741)的路线，并由 [InstructGPT](https://arxiv.org/abs/2203.02155) 规模化到语言模型。经典流程是：

```text
SFT -> 同一 prompt 的回答比较 -> 奖励模型 -> 在线策略优化
```

对 batch 中的 chosen 与 rejected 回答，奖励模型输出：

$$
S=r_\phi(X,Y)\in\mathbb{R}^{B\times 2},
$$

其中 $S[:,0]=s_w\in\mathbb{R}^{B}$，$S[:,1]=s_l\in\mathbb{R}^{B}$。Bradley–Terry 偏好概率与 loss 为：

$$
p(y_w\succ y_l\mid x)=\sigma(s_w-s_l)\in\mathbb{R}^{B},
$$

$$
\mathcal{L}_{\text{RM}}
=-\frac{1}{B}\sum_{b=1}^{B}
\log\sigma(s_{w,b}-s_{l,b}).
$$

奖励模型把稀缺比较转成可重复调用的标量，但它只是偏好数据的近似。策略可能利用长度、措辞或评分漏洞获得高分，因此在线阶段还要用固定参考策略 $\pi_{\text{ref}}$ 限制漂移：

$$
\max_\pi \;
\mathbb{E}_{y\sim\pi(\cdot\mid x)}[r_\phi(x,y)]
-\beta D_{\mathrm{KL}}\!\left(
\pi(\cdot\mid x)\|\pi_{\text{ref}}(\cdot\mid x)
\right).
$$

基于 AI 反馈的强化学习 (Reinforcement Learning from AI Feedback, RLAIF) 用 AI 按原则产生偏好或奖励，改变的是反馈提供者，不限定优化器。[Constitutional AI](https://arxiv.org/abs/2212.08073) 的监督式批评与修订仍是 SFT；用 AI 偏好训练奖励并更新策略时才进入 RLAIF。

Constitutional AI 的典型流程分为两段：监督阶段让模型依据书面原则批评并修订可能有害的回答，再用修订结果做 SFT；强化学习阶段对同一 prompt 生成多份回答，由 AI 依据原则给出偏好，用这些偏好训练奖励模型并优化策略。原则使判断标准可以批量复用，却不会自动消除反馈模型的偏差，最终仍需人工评估和红队测试。

## 偏好优化与 DPO

偏好优化用 $(x,y_w,y_l)$ 表达「回答 $y_w$ 优于 $y_l$」。它既包括奖励模型加 RL，也包括不在线采样的直接方法。[直接偏好优化](https://arxiv.org/abs/2305.18290) (Direct Preference Optimization, DPO) 从带 KL 约束的奖励目标推导出固定偏好对上的分类损失。

先计算每条回答的序列 log-prob。策略对每个 token 的 log-prob 形状为 $[B,L_w]$ 与 $[B,L_l]$，经过 response mask 求和后得到：

$$
\ell_{\theta,w},\ell_{\theta,l},
\ell_{\text{ref},w},\ell_{\text{ref},l}\in\mathbb{R}^{B}.
$$

定义相对参考模型的 margin：

$$
\Delta_b
=\beta\left[
(\ell_{\theta,w,b}-\ell_{\text{ref},w,b})
-(\ell_{\theta,l,b}-\ell_{\text{ref},l,b})
\right]\in\mathbb{R},
$$

DPO loss 为：

$$
\mathcal{L}_{\text{DPO}}
=-\frac{1}{B}\sum_{b=1}^{B}\log\sigma(\Delta_b).
$$

该标量 loss 提高 chosen 相对 rejected 的隐式奖励差。标准 DPO 不需要在每轮更新时让当前策略生成新回答，因而是离线直接偏好优化，不是 PPO 一类在线策略梯度算法。它实现简单、训练稳定，但无法探索固定偏好集没有覆盖的行为，并对标签噪声、模板与长度偏差敏感。

## PPO

[近端策略优化](https://arxiv.org/abs/1707.06347) (Proximal Policy Optimization, PPO) 同时训练 actor 与 critic，并用新旧策略概率比的裁剪限制单次更新。

### 优势与价值 loss

critic 输出 $V_\psi\in\mathbb{R}^{B\times G\times L}$。时序差分误差与广义优势估计 (Generalized Advantage Estimation, GAE) 为：

$$
\delta_t=r_t+\gamma V_\psi(s_{t+1})-V_\psi(s_t),
$$

$$
\hat A_t=\sum_{l\ge 0}(\gamma\lambda)^l\delta_{t+l}.
$$

将所有 batch 与 group 维保留后，$r,\delta,\hat A,V_\psi$ 都可表示为 $[B,G,L]$；序列级奖励通常放在终止 token，其余位置为 0，再通过 GAE 向前传播。回报目标 $\hat V\in\mathbb{R}^{B\times G\times L}$，critic loss 为：

$$
\mathcal{L}_{V}
=\frac{\sum_{b,g,t}M_{b,g,t}
(V_{\psi,b,g,t}-\hat V_{b,g,t})^2}
{\sum_{b,g,t}M_{b,g,t}}.
$$

### 裁剪策略 loss

采样 token 的重要性比为：

$$
\rho_{b,g,t}(\theta)
=\exp\left(
\log P_{\theta,b,g,t}-\log P_{\text{old},b,g,t}
\right),
\qquad \rho\in\mathbb{R}^{B\times G\times L}.
$$

PPO 要最大化：

$$
J_{\text{PPO}}
=\frac{1}{\sum M}
\sum_{b,g,t}M_{b,g,t}
\min\left(
\rho_{b,g,t}\hat A_{b,g,t},
\operatorname{clip}(\rho_{b,g,t},1-\varepsilon,1+\varepsilon)
\hat A_{b,g,t}
\right).
$$

训练最小化 $\mathcal{L}_{\text{actor}}=-J_{\text{PPO}}$，并可组合 $\mathcal{L}_{V}$、熵奖励和参考模型 KL。PPO clipping 约束当前策略相对 rollout 策略的更新，参考模型 KL 约束当前策略相对 SFT 锚点的漂移，两者不是同一项。

PPO 的主要成本是 actor、参考模型、奖励模型与体量相近的 critic 同时参与流水线；critic 不准时，优势方差也会增大。

## GRPO

[DeepSeekMath](https://arxiv.org/abs/2402.03300) 提出的组相对策略优化 (Group Relative Policy Optimization, GRPO) 对每个 prompt 采样 $G$ 条回答，用组内奖励统计量替代 critic。回答级奖励 $R\in\mathbb{R}^{B\times G}$ 经过标准化：

$$
\hat A_{b,g}
=\frac{
R_{b,g}-\operatorname{mean}_{j=1}^{G}R_{b,j}
}{
\operatorname{std}_{j=1}^{G}R_{b,j}+\epsilon
},
\qquad
\hat A\in\mathbb{R}^{B\times G}.
$$

同一回答中的 token 共享 $\hat A_{b,g}$。常见的 sample-level GRPO 目标为：

$$
J_{\text{GRPO}}
=\frac{1}{B}\sum_{b=1}^{B}\frac{1}{G}\sum_{g=1}^{G}
\frac{1}{L_{b,g}}
\sum_{t=1}^{L}
M_{b,g,t}
\min\left(
\rho_{b,g,t}\hat A_{b,g},
\operatorname{clip}(\rho_{b,g,t},1-\varepsilon,1+\varepsilon)
\hat A_{b,g}
\right).
$$

其中 $L_{b,g}=\sum_t M_{b,g,t}$，内层先按每条回答长度归一化，因此每条回答权重相同。实际配方还可加入参考模型 KL。GRPO 省去 critic，却需要每个 prompt 生成多条回答；全组奖励相同，尤其全对或全错时，组内优势接近 0，该 prompt 几乎不产生学习信号。

GRPO 与可验证奖励强化学习 (Reinforcement Learning with Verifiable Rewards, RLVR) 不是同义词：GRPO 是更新方法，RLVR 表示奖励来自答案校验、代码执行或形式验证。两者经常组合，但 GRPO 也可使用模型奖励，RLVR 也可使用 PPO 或其他优化器。

### DeepSeek-R1 的多阶段路线

[DeepSeek-R1](https://arxiv.org/abs/2501.12948) 展示了 RLVR 与 GRPO 在推理训练中的组合，但 R1-Zero 与正式 R1 的训练路线不同：

1. R1-Zero 从基础模型直接进行大规模 RL，用于观察规则奖励能否诱发更长推理、反思和自校验；
2. 正式 R1 先加入少量冷启动长推理数据，改善可读性和输出格式；
3. 随后对数学、代码和逻辑任务进行推理 RL；
4. 通过拒绝采样筛选推理样本，并与通用任务数据一起再次 SFT；
5. 最后用覆盖有用性和无害性的综合 RL 完成对齐。

因此「推理模型完全不需要 SFT」不是从正式 R1 流程能够得到的结论。结果奖励也不天然保证过程正确：只验最终答案时，错误推理可能碰巧命中；代码只跑公开测试时，也可能利用覆盖不足。

## DAPO

[DAPO](https://arxiv.org/abs/2503.14476) 的全称是解耦裁剪与动态采样策略优化 (Decoupled Clip and Dynamic sAmpling Policy Optimization)。它针对长推理 GRPO 的熵坍缩、无效 prompt、长度权重和截断奖励噪声，引入四项相互配合的修改。

### DAPO loss 与形状

DAPO 仍使用 token 级概率比 $\rho\in\mathbb{R}^{B\times G\times L}$ 和组相对优势 $\hat A\in\mathbb{R}^{B\times G}$，但将上下裁剪范围拆成 $\varepsilon_{\text{low}}$ 与 $\varepsilon_{\text{high}}$，并按全 batch 的有效 token 归一化：

$$
J_{\text{DAPO}}
=\frac{
\sum_{b,g,t}M_{b,g,t}
\min\left(
\rho_{b,g,t}\hat A_{b,g},
\operatorname{clip}\left(
\rho_{b,g,t},
1-\varepsilon_{\text{low}},
1+\varepsilon_{\text{high}}
\right)\hat A_{b,g}
\right)
}{
\sum_{b,g,t}M_{b,g,t}
}.
$$

分子中每项形状为 $[B,G,L]$，mask 后归约为标量；训练 loss 为 $-J_{\text{DAPO}}$。这与上一节「每条回答先除以 $L_{b,g}$」不同：DAPO 的 token-level reduction 让每个有效 token 权重相同，长回答因此贡献更多 token 项。

### Clip-Higher

令 $\varepsilon_{\text{high}}>\varepsilon_{\text{low}}$，给低概率但正优势的探索 token 更大的上升空间，同时保留较严格的下界，避免动作概率快速被压到接近 0。它有意区分降低概率与提高概率两个方向，而非简单地把对称 $\varepsilon$ 整体调大。

### Dynamic Sampling

对于二值正确性奖励，若一个 prompt 的 $G$ 条回答全对或全错，则 $\operatorname{std}(R_{b,:})=0$，组相对优势没有区分度。DAPO 持续过采样 prompt，只把满足

$$
0<\sum_{g=1}^{G}\mathbb{1}[R_{b,g}=1]<G
$$

的组装入训练 batch，直到有效组数达到目标。这样减少零梯度组，但采样量变成动态值；它也会改变实际训练 prompt 分布，因此必须记录过滤率与难度分布。

### Token-Level Policy Gradient Loss

sample-level reduction 让每条回答总权重相同，于是长回答的单个 token 权重更小。DAPO 改用全局有效 token 分母 $\sum M$，使相同模式在长短回答中获得相同 token 权重。这对长思维链训练重要，但也意味着长回答总贡献更大，需要同时监控长度分布和冗余模式。

### Overlong Reward Shaping

粗暴地给所有截断回答相同负奖励，会把「推理合理但刚好超长」与「无意义重复」混为一谈。设最大长度为 $L_{\max}$，缓冲区间为 $L_{\text{cache}}$，DAPO 的软长度惩罚可写为：

$$
R_{\text{length}}(y)=
\begin{cases}
0, & |y|\le L_{\max}-L_{\text{cache}},\\
\dfrac{L_{\max}-L_{\text{cache}}-|y|}{L_{\text{cache}}},
& L_{\max}-L_{\text{cache}}<|y|\le L_{\max},\\
-1, & |y|>L_{\max}.
\end{cases}
$$

$R_{\text{length}}\in\mathbb{R}^{B\times G}$ 与正确性奖励相加后，再形成组内优势。另一种稳定化方式是直接屏蔽截断样本的策略 loss。无论采用哪种方式，都应单独统计截断率，避免模型通过缩短但不完成回答来规避惩罚。

## GSPO

[组序列策略优化](https://arxiv.org/abs/2507.18071) (Group Sequence Policy Optimization, GSPO) 认为「奖励施加在整条回答上，off-policy 校正与裁剪也应以整条回答为单位」。它不使用 GRPO/DAPO 的逐 token 重要性比来分别裁剪，而是先构造长度归一化的序列重要性比。

对回答 $(b,g)$，令有效长度 $L_{b,g}=\sum_tM_{b,g,t}$，则：

$$
s_{b,g}(\theta)
=\left(
\frac{\pi_\theta(Y_{b,g}\mid X_b)}
{\pi_{\text{old}}(Y_{b,g}\mid X_b)}
\right)^{1/L_{b,g}}
$$

$$
=\exp\left[
\frac{1}{L_{b,g}}
\sum_{t=1}^{L}M_{b,g,t}
\left(
\log P_{\theta,b,g,t}
-\log P_{\text{old},b,g,t}
\right)
\right].
$$

token log-prob 差为 $[B,G,L]$，沿 $L$ 维 masked mean 后得到 $s\in\mathbb{R}^{B\times G}$。长度归一化避免原始序列概率随长度指数变小，也让不同长度回答使用同一量级的裁剪范围。

GSPO 目标为：

$$
J_{\text{GSPO}}
=\frac{1}{BG}\sum_{b=1}^{B}\sum_{g=1}^{G}
\min\left(
s_{b,g}\hat A_{b,g},
\operatorname{clip}(s_{b,g},1-\varepsilon,1+\varepsilon)
\hat A_{b,g}
\right).
$$

$s,\hat A\in\mathbb{R}^{B\times G}$，逐元素计算后归约为标量。只要一条回答被裁剪，该回答整体被裁剪；未裁剪时，$\nabla\log s$ 会把同一个序列级权重均匀分配到该回答的有效 token。GSPO 论文据此强调优化单位与序列奖励单位对齐，并报告其对长回答与 MoE RL 的稳定性收益。

GSPO 的裁剪阈值不能直接照搬 token 级 GRPO，因为 $s$ 的定义和数值范围不同。它解决的是 off-policy 权重与裁剪粒度问题，不会自动修复奖励错误、无效验证器或全组同奖。

## 方法对照

| 方法 | 数据是否在线 | 优势/监督 | 重要性比与裁剪单位 | 是否需要 critic |
| :-- | :--: | :-- | :-- | :--: |
| DPO | 否 | chosen / rejected margin | 无 PPO 式 ratio | 否 |
| PPO | 是 | critic + GAE | token | 是 |
| GRPO | 是 | 组内相对奖励 | token，sample-level reduction | 否 |
| DAPO | 是 | 组内相对奖励 | token，非对称 clip，token-level reduction | 否 |
| GSPO | 是 | 组内相对奖励 | 长度归一化 sequence ratio | 否 |

算法名称不能替代配置。实际系统还需说明 KL 实现、reward normalization、loss reduction、rollout 与训练策略版本差、每条 prompt 的采样数，以及截断样本如何处理。

## Agentic RL

当模型需要搜索、执行代码、调用 API 或操作浏览器时，工具返回会改变后续状态，奖励也常延迟到几十步之后。Agentic RL 描述这种多步环境交互上的参数更新，不是某一个固定优化器。

| RL 要素 | 代码修复 Agent 中的含义 |
| :-- | :-- |
| 状态 | 问题、仓库、当前修改和测试历史 |
| 动作 | 读文件、编辑、执行命令、提交答案 |
| 观察 | 文件内容、编译错误、测试输出 |
| 结果奖励 | 隐藏测试通过率、功能正确性 |
| 过程约束 | 越权、超时、工具成本、安全违规 |

轨迹回报可写为 $R(\tau)=\sum_t\gamma^t r_t$。如果只有最终隐藏测试分数，早期搜索与编辑共享一个稀疏奖励，信用分配很难；过程奖励可评价非法调用或中间测试，但过度塑形也可能把代理目标变成刷步骤分。

训练环境必须可隔离、重置和回放。若允许修改测试，Agent 可能删除断言来骗取成功；若环境不重置，上一条轨迹的文件会污染下一条。完整记录应包含初始快照、工具输入输出、模型版本、采样参数、每步 log-prob 与奖励分量。

只有奖励经过信用分配并实际更新策略参数时，才属于这里的 Agentic RL。相关方法的边界如下：

| 方法 | 核心机制 | 是否更新参数 | 是否为参数更新型 RL |
| :-- | :-- | :--: | :--: |
| [Toolformer](https://arxiv.org/abs/2302.04761) | 自监督构造 API 调用数据并学习调用格式 | 是 | 否 |
| [ReAct](https://arxiv.org/abs/2210.03629) | 通过提示交替生成 Thought、Action 与 Observation | 否 | 否 |
| [Reflexion](https://arxiv.org/abs/2303.11366) | 把语言反馈写入情景记忆指导下一次尝试 | 否 | 通常否 |
| [WebGPT](https://arxiv.org/abs/2112.09332) | 浏览示范、偏好奖励、拒绝采样与 RL 实验 | 是 | 部分训练阶段是 |
| [Agent Lightning](https://arxiv.org/abs/2508.03680) | 把既有 Agent 事件经信用分配转成 RL 训练单元 | 是 | 是 |

WebGPT 把浏览动作、证据引用和人类偏好放入同一任务，但论文摘要中的最佳结果来自行为克隆模型结合奖励模型拒绝采样，不能把全部收益直接归因于在线 RL。Agent Lightning 解决的是 Agent 执行与 RL 训练的解耦和信用分配接口，不会自动修复环境或奖励设计。

## 数值案例

设 $B=2$、$G=4$、最大回答长度 $L=512$、词表大小 $V=151936$：

- rollout token 为 $Y:[2,4,512]$，response mask 为 $M:[2,4,512]$；
- 策略原始 logits 为 $Z:[2,4,512,151936]$，通常不会长期全部保存；
- gather 采样 token 后得到新旧 log-prob $[2,4,512]$；
- 验证器输出奖励 $R:[2,4]$，GRPO/DAPO 优势为 $[2,4]$ 并广播到 $[2,4,512]$；
- PPO critic 输出 $V_\psi:[2,4,512]$，GAE 也为 $[2,4,512]$；
- GSPO 把 token log-ratio 沿长度 masked mean，得到 sequence ratio $s:[2,4]$；
- 任一策略目标最终都归约成标量 loss，才能调用 `backward()`。

这个形状检查能直接发现三类高频错误：把 prompt token 算进策略 loss；对 padding 求平均；把 $[B,G]$ 优势沿错误维广播。

## 评测与失败模式

训练不能只看 reward 曲线。至少同时报告任务成功率、独立人工或隐藏验证、KL、熵、回答长度、采样通过率、格式解析率、每步 token 与 wall-clock 成本。

| 失败模式 | 表现 | 对策 |
| :-- | :-- | :-- |
| reward hacking | 奖励升、真实质量跌 | 隐藏评测、反例与人工审查 |
| verifier hacking | 利用解析器或测试漏洞 | 隔离验证器、扩大测试覆盖 |
| entropy collapse | 输出快速同质化 | 检查 clip、温度、奖励和探索 |
| zero-variance group | 全组全对或全错 | 调整难度、探索或动态采样 |
| stale rollout | 新旧策略差距过大 | 缩短版本延迟、监控 ratio |
| length drift | 回答越来越长或过短 | 分离质量与长度奖励 |
| catastrophic forgetting | 专项提升、通用回退 | KL、混合数据与回归评测 |
| unsafe exploration | 产生真实副作用 | 沙箱、权限和预算上限 |
