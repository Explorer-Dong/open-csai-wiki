---
title: 蒸馏
---

蒸馏 (Distillation) 用教师模型产生的概率分布、序列或中间表示训练学生模型。经典目标是把大模型能力压缩到更小、更便宜的模型；在大语言模型后训练中，蒸馏也可用于把更强推理策略、上下文知识或多个领域专家的能力整合到一个学生中，教师和学生此时甚至可以具有相同规模。

本篇沿着以下知识链展开：

```text
Knowledge Distillation
    -> Sequence-level KD
    -> On-Policy Distillation
    -> MOPD / Multi-teacher OPD
```

这四层分别改变了监督内容、序列来源与教师数量。理解蒸馏不能只看「是否用了 KL」，还要问：前缀由谁生成、KL 方向是什么、教师输出是否完整、多个教师如何路由。

## 快速开始

一个可靠的蒸馏实验先完成五项定义：

1. 明确教师、学生、Tokenizer 和词表是否兼容；
2. 选择监督粒度：硬序列、完整 token 分布、Top-k 分布或隐藏表示；
3. 说明前缀来源：真实数据、教师生成还是当前学生 rollout；
4. 固定 KL 方向、温度、mask 与 reduction；
5. 同时评测质量差、延迟、吞吐、显存和教师调用成本。

若目标只是压缩一个分类器或固定任务模型，从经典 Knowledge Distillation 开始；若只可调用教师生成文本，使用 Sequence-level KD；若学生部署时容易进入训练数据未覆盖的错误前缀，考虑 On-Policy Distillation；若需要整合多个领域 RL 专家，再考虑 MOPD。

统一形状如下：

| 符号 | 含义 | 形状 |
| :-- | :-- | :-- |
| $B$ | batch 中的输入数 | 标量 |
| $S_x$ | prompt 长度 | 标量 |
| $L$ | padding 后的目标或 rollout 长度 | 标量 |
| $V$ | 共享词表大小 | 标量 |
| $H_T,H_S$ | 教师、学生隐藏维度 | 标量 |
| $X$ | prompt token | $[B,S_x]$ |
| $Y$ | 目标或 rollout token | $[B,L]$ |
| $M$ | 有效目标 token mask | $[B,L]$ |
| $Z_T,Z_S$ | 教师、学生 logits | $[B,L,V]$ |
| $P_T,P_S$ | 教师、学生 token 分布 | $[B,L,V]$ |

若教师和学生词表不同，$Z_T$ 与 $Z_S$ 的最后一维也不同，不能直接逐 token 求 KL。需要共享 Tokenizer、建立词表映射，或退回教师生成序列的硬标签蒸馏。

## 阶段意义

硬标签只告诉学生「正确 token 是什么」，教师分布还告诉学生「其他候选有多接近」。例如教师在某个位置给多个同义表达较高概率，这些相对关系能提供比 one-hot 标签更密集的梯度。蒸馏的价值包括：

- 压缩：把大教师能力迁移到小学生，降低部署成本；
- 专项迁移：让学生吸收教师在推理、代码或领域任务上的策略；
- 平滑监督：使用完整分布减少硬标签方差；
- 能力整合：把多个独立专家的行为合并到统一学生；
- 上下文内化：把教师通过长提示或外部信息表现出的能力写入参数。

学生容量、训练 prompt 覆盖和教师质量共同决定上限。教师答错会被继承；学生过小无法完整拟合多峰分布；数据过窄则只压缩目标分布内能力。

## Knowledge Distillation

### 温度与软标签

[经典知识蒸馏](https://arxiv.org/abs/1503.02531) (Knowledge Distillation, KD) 对教师与学生 logits 使用相同温度 $\tau>0$：

$$
P_{T,b,t,v}^{(\tau)}
=\frac{\exp(Z_{T,b,t,v}/\tau)}
{\sum_{u=1}^{V}\exp(Z_{T,b,t,u}/\tau)},
$$

$$
P_{S,b,t,v}^{(\tau)}
=\frac{\exp(Z_{S,b,t,v}/\tau)}
{\sum_{u=1}^{V}\exp(Z_{S,b,t,u}/\tau)}.
$$

$Z_T,Z_S,P_T^{(\tau)},P_S^{(\tau)}\in\mathbb{R}^{B\times L\times V}$。较大的 $\tau$ 使分布更平滑，暴露教师对非目标 token 的相对偏好；推理时通常恢复 $\tau=1$。

常见的 token 级蒸馏最小化 forward KL：

$$
D_{b,t}^{\text{FKL}}
=D_{\mathrm{KL}}\!\left(
P_{T,b,t,:}^{(\tau)}\|P_{S,b,t,:}^{(\tau)}
\right)
=\sum_{v=1}^{V}
P_{T,b,t,v}^{(\tau)}
\log\frac{P_{T,b,t,v}^{(\tau)}}{P_{S,b,t,v}^{(\tau)}}.
$$

$D^{\text{FKL}}\in\mathbb{R}^{B\times L}$，masked mean 后得到标量：

$$
\mathcal{L}_{\text{soft}}
=\tau^2
\frac{\sum_{b,t}M_{b,t}D_{b,t}^{\text{FKL}}}
{\sum_{b,t}M_{b,t}}.
$$

$\tau^2$ 用于补偿高温 softmax 导致的梯度尺度变化。由于教师固定，最小化 forward KL 与最小化教师软标签到学生的交叉熵只差一个不依赖学生参数的教师熵项。

若真实硬标签 $Y\in\mathbb{N}^{B\times L}$ 可用，可组合：

$$
\mathcal{L}_{\text{KD}}
=\alpha\mathcal{L}_{\text{soft}}
+(1-\alpha)\mathcal{L}_{\text{hard}},
$$

$$
\mathcal{L}_{\text{hard}}
=-\frac{1}{\sum M}
\sum_{b,t}M_{b,t}\log P_{S,b,t,Y_{b,t}}^{(1)}.
$$

两个分量都是标量。$\alpha$ 决定教师软目标和真实标签的权重，不能与温度 $\tau$ 混为一个超参数。

### Forward KL 与 reverse KL

在同一状态 $(x,y_{<t})$ 上，reverse KL 为：

$$
D_{b,t}^{\text{RKL}}
=D_{\mathrm{KL}}(P_{S,b,t,:}\|P_{T,b,t,:})
=\sum_{v=1}^{V}P_{S,b,t,v}
\log\frac{P_{S,b,t,v}}{P_{T,b,t,v}}.
$$

forward KL 以教师概率加权，强迫学生覆盖教师有质量的区域，通常表现为 mean-seeking；reverse KL 以学生概率加权，更强调学生当前会生成的模式，通常表现为 mode-seeking。两者的参数梯度和容量受限时的解不同，不能只交换公式中的字母后仍称作同一种 loss。

### 中间表示蒸馏

除了输出分布，还可以匹配隐藏状态或注意力。若：

$$
H_S\in\mathbb{R}^{B\times L\times d_S},
\qquad
H_T\in\mathbb{R}^{B\times L\times d_T},
$$

用投影矩阵 $W\in\mathbb{R}^{d_S\times d_T}$ 对齐维度后：

$$
\mathcal{L}_{\text{hidden}}
=\frac{
\sum_{b,t}M_{b,t}
\left\|H_{S,b,t,:}W-H_{T,b,t,:}\right\|_2^2
}{
\sum_{b,t}M_{b,t}d_T
}.
$$

注意力图可能为 $[B,A,L,L]$，只有层数、head 数和可见性语义能对齐时才适合直接匹配。[DistilBERT](https://arxiv.org/abs/1910.01108) 与 [TinyBERT](https://arxiv.org/abs/1909.10351) 展示了把输出蒸馏扩展到隐藏状态或注意力对齐的不同方案。中间层 loss 提供更强约束，却增加显存、层映射和教师前向成本；不是层对得越多越好。

## Sequence-level KD

自回归模型最终产生完整序列。逐 token KD 通常在真实数据或固定目标前缀上比较分布，学生推理时却必须跟随自己的历史决策。[序列级知识蒸馏](https://arxiv.org/abs/1606.07947) (Sequence-level Knowledge Distillation, SeqKD) 先让教师生成完整目标，再把教师序列当成 SFT 数据。

教师对序列的分布为：

$$
q_T(y\mid x)=\prod_{t=1}^{|y|}
q_T(y_t\mid x,y_{<t}).
$$

理想的 sequence-level cross-entropy 是：

$$
\mathcal{L}_{\text{SeqKD}}
=-\sum_{y\in\mathcal{Y}}q_T(y\mid x)\log p_S(y\mid x),
$$

但所有可能序列组成的 $\mathcal{Y}$ 指数级大，无法精确求和。经典 SeqKD 用 beam search 近似教师分布的 mode：

$$
\hat y=\operatorname*{arg\,max}_{y}q_T(y\mid x),
$$

然后训练学生最大化 $\hat y$：

$$
\mathcal{L}_{\text{SeqKD-mode}}
=-\frac{
\sum_{b,t}M_{b,t}\log
p_S(\hat Y_{b,t}\mid X_b,\hat Y_{b,<t})
}{
\sum_{b,t}M_{b,t}
}.
$$

$\hat Y,M\in\mathbb{N}^{B\times L}$，学生 logits 为 $[B,L,V]$，逐 token loss 为 $[B,L]$，最后归约为标量。实现与 SFT 相同，区别在于 target 来自教师解码而不是人工答案。

SeqKD 不需要保存教师全词表 logits，适合只能通过 API 获得文本的教师；它还能把多种可接受输出压缩成教师偏好的规范表达。但单个 beam 只保留一个序列，丢失了 token 软分布与其他合理模式；数据生成完成后也保持静态，学生在推理中一旦走到自己的错误前缀，教师没有在那里提供监督。

## On-Policy Distillation

[同策略蒸馏](https://arxiv.org/abs/2306.13649) (On-Policy Distillation, OPD) 让当前学生先生成 $Y\sim p_S(\cdot\mid X)$，再让教师在学生实际访问的每个前缀 $(X,Y_{<t})$ 上给出 token 分布。它把蒸馏视作有交互专家的模仿学习，缓解固定数据造成的 train-inference state mismatch。

### 数据流与形状

```text
prompt [B,Sx]
  -> 学生 rollout Y [B,L]
  -> 教师和学生对相同前缀 prefill
  -> Z_T, Z_S [B,L,V]
  -> token divergence [B,L]
  -> masked reduction -> scalar loss
```

教师不是重新生成另一条答案，而是读取「prompt + 学生回答」并在每个位置评价下一 token 分布。只有这样，$P_T$ 与 $P_S$ 才对应同一组状态。

对任意 token divergence $D$，一条序列的平均差异为：

$$
\mathcal{D}(P_T,P_S;Y\mid X)
=\frac{1}{|Y|}
\sum_{t=1}^{|Y|}
D\!\left(
P_T(\cdot\mid X,Y_{<t}),
P_S(\cdot\mid X,Y_{<t})
\right).
$$

纯 on-policy loss 为：

$$
\mathcal{L}_{\text{OPD}}
=\mathbb{E}_{X}
\mathbb{E}_{Y\sim p_S(\cdot\mid X)}
[\mathcal{D}(P_T,P_S;Y\mid X)].
$$

Generalized Knowledge Distillation (GKD) 还允许混合固定数据 $(X,Y)\sim\mathcal{D}_{\text{fixed}}$ 与学生 rollout：

$$
\mathcal{L}_{\text{GKD}}
=(1-\lambda)
\mathbb{E}_{(X,Y)\sim\mathcal{D}_{\text{fixed}}}[\mathcal{D}]
+\lambda
\mathbb{E}_{X,Y\sim p_S}[\mathcal{D}],
\qquad \lambda\in[0,1].
$$

论文实现不通过离散采样过程反向传播；学生 rollout 被视为当前一批固定 token，梯度来自教师与学生在这些前缀上的分布差异。$D$ 可以是 forward KL、reverse KL 或 generalized JSD，选择会改变学生是倾向覆盖教师分布还是聚焦教师的高概率模式。

### 工程约束

OPD 每轮都需要 rollout 和教师 prefill，主要瓶颈包括：

- 教师吞吐：完整 $[B,L,V]$ logits 的通信和存储很大；
- 版本陈旧：rollout 策略与训练中的学生相差过远；
- 词表一致：不同 Tokenizer 不能直接逐 token 对齐；
- 教师错误：学生会在自己的高频状态上反复继承教师偏差；
- 初始学生：若学生输出完全不可用，教师对这些前缀的监督也可能低效。

常见系统把学生采样、教师 prefill 与学生训练解耦，通过版本号和有界队列控制新鲜度；Top-k logits、分块传输或只返回采样 token log-prob 可以降低通信，但它们对应不同近似 loss，必须明确记录。

## MOPD / Multi-teacher OPD

[多教师同策略蒸馏](https://arxiv.org/abs/2606.30406) (Multi-Teacher On-Policy Distillation, MOPD) 面向多领域能力整合。它先从同一个通用 SFT checkpoint 独立训练多个领域 RL 教师，再让一个学生在多领域 prompt 上自行 rollout，并按 prompt 的领域路由到相应冻结教师。

### 三阶段流程

1. 通用 SFT：得到共享初始 checkpoint；
2. 领域专项 RL：从同一 checkpoint 并行训练数学、指令遵循、软件工程等教师；
3. MOPD：学生从共享 SFT checkpoint 初始化，在混合 prompt 上 rollout，按领域选择教师并最小化 reverse KL。

设教师数为 $K$，每条 prompt 的领域 id 为：

$$
d\in\{1,\ldots,K\}^{B}.
$$

路由不是把 $K$ 个教师概率平均。第 $b$ 条 prompt 只使用教师 $T_{d_b}$，因此路由后的教师 logits 仍为 $Z_T^{\text{route}}\in\mathbb{R}^{B\times L\times V}$，而不是额外保留教师维的 $[B,K,L,V]$。

### Full-vocabulary reverse KL

对学生 rollout $Y\sim\pi_\theta$，MOPD 的逐 token reverse KL 为：

$$
D_{b,t}^{\text{MOPD}}
=\sum_{v=1}^{V}
P_{S,b,t,v}
\log\frac{P_{S,b,t,v}}
{P_{T_{d_b},b,t,v}},
\qquad D^{\text{MOPD}}\in\mathbb{R}^{B\times L}.
$$

按每条序列长度归一化后：

$$
\mathcal{L}_{\text{MOPD-RKL}}
=\frac{1}{B}\sum_{b=1}^{B}
\frac{1}{L_b}\sum_{t=1}^{L}
M_{b,t}D_{b,t}^{\text{MOPD}},
\qquad L_b=\sum_tM_{b,t}.
$$

完整计算需要学生与路由教师的 $[B,L,V]$ 分布。MOPD 延续了 [MiniLLM](https://arxiv.org/abs/2306.08543) 等 reverse-KL 蒸馏工作，并给出一种 policy-gradient 形式，只使用 rollout 中实际采样 token 的教师与学生 log-prob。定义：

$$
\hat A_{b,t}^{\text{MOPD}}
=\operatorname{sg}\!\left[
\log P_{T_{d_b}}(Y_{b,t}\mid X_b,Y_{b,<t})
-\log P_S(Y_{b,t}\mid X_b,Y_{b,<t})
\right],
$$

$\hat A^{\text{MOPD}}\in\mathbb{R}^{B\times L}$，$\operatorname{sg}$ 表示 stop-gradient。双边裁剪为：

$$
\hat A_{b,t}^{\text{clip}}
=\operatorname{clip}(
\hat A_{b,t}^{\text{MOPD}},-A_{\max},A_{\max}).
$$

最终 loss 是：

$$
\mathcal{L}_{\text{MOPD-PG}}
=-\frac{1}{B}\sum_{b=1}^{B}
\frac{1}{L_b}\sum_{t=1}^{L}
M_{b,t}\hat A_{b,t}^{\text{clip}}
\log P_S(Y_{b,t}\mid X_b,Y_{b,<t}).
$$

采样 token log-prob、优势与 mask 均为 $[B,L]$，归约后为标量。它可以复用 PPO/GRPO 基础设施，但这里的「优势」来自教师与学生 log-prob 差，不是任务奖励、价值模型或组内正确率。

### Top-k MOPD

若传输完整词表分布过于昂贵，可令路由教师在每个位置返回 Top-k token：

$$
I_T\in\mathbb{N}^{B\times L\times k},
\qquad
P_T^{(k)},P_S^{(k)}\in\mathbb{R}^{B\times L\times k},
$$

其中 $P_S^{(k)}$ 是按 $I_T$ 从学生分布 gather 的概率。MOPD 使用带截断修正的 loss：

$$
\mathcal{L}_{\text{MOPD-TopK}}
=\frac{1}{B}\sum_b\frac{1}{L_b}
\sum_tM_{b,t}
\sum_{v\in\mathcal{T}_{b,t}^{(k)}}
\left[
P_S(v)\log\frac{P_S(v)}{P_T(v)}
-P_S(v)+P_T(v)
\right].
$$

每个位置内部张量为 $[k]$，逐位置 loss 为 $[B,L]$，最后归约为标量。额外的 $-P_S(v)+P_T(v)$ 修正 Top-k 截断偏差，使保留支持集上的最优点仍是 $P_S=P_T$；它不是把 Top-k 概率简单重新归一化后冒充完整词表 reverse KL。

### MOPD 的边界

MOPD 的核心是「学生采样、静态路由、单个领域教师评分」，不是 ensemble voting、Best-of-N 或按奖励动态挑教师。论文强调同源教师的重要性：教师与学生都从同一 SFT checkpoint 出发，初始策略距离较近；直接换成分布差异很大的外部教师，即使绝对能力更强，也可能让 reverse KL 优化不稳定。

多个领域教师可以并行开发，最终在策略空间整合，避免顺序 RL 的遗忘与权重平均的参数冲突。但它仍依赖准确的领域路由、相容的 Tokenizer、教师服务容量和多领域数据配比。某领域教师不可靠时，MOPD 会稳定地迁移错误，而不会自动发现教师不如学生。

## 数值案例

设 $B=8$、学生 rollout 长度 $L=1024$、词表 $V=151936$、教师数 $K=3$、Top-k 的 $k=64$：

- 学生 token 为 $Y:[8,1024]$，mask 为 $M:[8,1024]$；
- 完整学生与路由教师 logits 均为 $[8,1024,151936]$；
- full-vocabulary KL 先沿 $V$ 求和，得到 $[8,1024]$；
- domain id 为 $d:[8]$，只决定每条样本请求哪个教师；
- policy-gradient 形式只需采样 token 的两组 log-prob $[8,1024]$；
- Top-k 形式传输 token id 与概率 $[8,1024,64]$，学生按 id gather 同形张量；
- mask 后先按各自有效长度归一化，再对 8 条样本平均，得到标量 loss。

完整 logits 若用 BF16，仅一个模型的理论张量大小约为
$8\times1024\times151936\times2$ bytes，约 2.32 GiB；教师和学生同时保存会更高。因此真实系统通常采用在线分块、Top-k 或只返回采样 token log-prob，而不是物化两份完整张量。

## 方法对照

| 方法 | 前缀或目标由谁产生 | 教师信号 | 主要 loss | 关键局限 |
| :-- | :-- | :-- | :-- | :-- |
| Knowledge Distillation | 固定数据前缀 | 完整 token 分布 | 常用 forward KL | train-inference 状态失配 |
| Sequence-level KD | 教师生成序列 | 硬序列 | 学生 NLL / SFT | 丢失软分布，数据静态 |
| On-Policy Distillation | 当前学生 rollout | 教师在学生前缀上的分布 | FKL、RKL 或 JSD | 教师查询与版本成本 |
| MOPD | 当前学生 rollout | 路由后的领域教师 | per-token reverse KL | 路由、同源性与多教师服务 |

Sequence-level KD 和 OPD 都会使用模型生成数据，但前者通常先由教师离线生成固定 target，后者每轮由当前学生生成状态并由教师在线评分。MOPD 又在 OPD 上增加了领域教师集合与路由，不应把三者统称为「教师生成数据」而忽略训练分布差异。

## 评测与故障定位

压缩场景至少比较教师、原始学生与蒸馏学生三者的任务质量、PPL、延迟、吞吐、显存和模型大小。能力整合场景则要分别报告每个领域和通用回归，不能只用平均分掩盖某一领域退化。

| 现象 | 优先检查 |
| :-- | :-- |
| KD loss 下降但任务不升 | prompt 覆盖、教师质量、学生容量 |
| SeqKD 格式稳定但能力窄 | 教师解码多样性、硬序列覆盖 |
| OPD 初期发散 | 学生初始质量、KL 方向、温度、教师距离 |
| KL 数值异常 | 同一前缀对齐、Tokenizer、padding 与精度 |
| Top-k 结果明显变差 | $k$、截断修正、尾部概率质量 |
| 多教师平均分升但单域跌 | 路由、混合比例、教师冲突 |
| 压缩后文件变小但服务没变快 | 后端 Kernel、batch、KV Cache 与实际硬件 |

蒸馏成功的判据不是 loss 足够低，而是学生在目标质量约束内取得可验证的部署或能力整合收益。若模型没有变小、吞吐没有提升，且能力也未整合，蒸馏链路即使收敛也没有完成工程目标。
