---
title: Pre-training
---

预训练 (Pre-training) 用大规模、跨领域语料训练统一的语言建模目标，使模型先获得语言规律、知识表示、代码模式与上下文学习能力，再进入 [有监督微调](./sft.md)、[强化学习](./rl.md) 或 [蒸馏](./distillation.md)。它决定模型「会什么」，后续阶段主要决定模型「怎样稳定地把能力表现出来」。

预训练不是简单地把文本送入模型。数据配方、Tokenizer、训练目标、模型结构、优化策略和评测共同决定最终能力；其中任何一项失配，都可能让更大的计算预算变成重复记忆、数据污染或不稳定更新。

## 训练闭环与符号约定

以 Decoder-only 模型为例，一次完整训练的数据流是：

```text
原始语料 -> 清洗与去重 -> Tokenize -> 拼接与切块
        -> Next-token Loss -> 反向传播 -> 参数更新 -> 验证与保存
```

第一次实现时应先用小模型和少量数据验证四件事：相邻 token 的 label shift 正确；padding 不进入 loss；训练 loss 能下降；保存的检查点可以恢复。确认数据与损失后，再引入混合精度、梯度累积和分布式并行。

下表的符号约定贯穿全文：

| 符号 | 含义 | 典型形状 |
| :-- | :-- | :-- |
| $B$ | micro-batch 中的序列数 | 标量 |
| $S$ | 每条输入的统一序列长度 | 标量 |
| $V$ | Tokenizer 词表大小 | 标量 |
| $H$ | 模型隐藏维度 | 标量 |
| $X$ | token id | $[B,S]$ |
| $M$ | 有效 token 掩码，取值为 0 或 1 | $[B,S]$ |
| $E$ | token embedding | $[B,S,H]$ |
| $Z$ | 模型输出 logits | $[B,S,V]$ |

这里的 $S$ 是 padding 后的长度，每条样本的真实长度可以不同。形状相同不代表所有位置都应参与训练，最终必须由 $M$ 排除 padding、跨文档边界等无效位置。

## 阶段意义

传统自然语言处理通常为每个任务设计特征、数据和输出头。预训练把任务适配问题改写为「先学习通用条件分布，再用少量数据改变使用方式」：

- 语言与知识：从连续文本中学习语法、语义、事实共现和篇章结构；
- 迁移：同一组参数可以通过提示或微调服务多种任务；
- 生成接口：对话、代码补全、工具调用都能表示为条件 token 生成；
- 规模化：统一目标便于把数据、模型和计算同时扩大。

ELMo 证明上下文相关表示可以迁移，[BERT](https://arxiv.org/abs/1810.04805)、[RoBERTa](https://arxiv.org/abs/1907.11692) 与 [GPT](https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf) 把这一路线推进到 Transformer。[T5](https://arxiv.org/abs/1910.10683) 与 [BART](https://arxiv.org/abs/1910.13461) 则展示了 Encoder-Decoder、文本到文本和去噪目标的另一条路径。现代通用生成模型多采用 Decoder-only 自回归目标，因为训练与推理使用同一条件分解，数据构造也相对直接。

## 自回归语言建模

### 从 logits 到 token loss

对输入 $X\in\mathbb{N}^{B\times S}$，模型输出 $Z=f_\theta(X)\in\mathbb{R}^{B\times S\times V}$。位置 $(b,t)$ 的词表分布为：

$$
P_{b,t,v}
=\operatorname{softmax}(Z_{b,t,:})_v
=\frac{\exp Z_{b,t,v}}{\sum_{u=1}^{V}\exp Z_{b,t,u}},
\qquad P\in\mathbb{R}^{B\times S\times V}.
$$

自回归训练用位置 $t$ 的输出预测位置 $t+1$ 的真实 token。实际参与 loss 的张量是：

$$
Z^{\text{pred}}=Z[:,0:S-1,:]\in\mathbb{R}^{B\times(S-1)\times V},
$$

$$
Y=X[:,1:S]\in\mathbb{N}^{B\times(S-1)},
\qquad
M^{\text{loss}}\in\{0,1\}^{B\times(S-1)}.
$$

单个位置的负对数似然为：

$$
\ell_{b,t}
=-\log P_{b,t,Y_{b,t}}
=-Z^{\text{pred}}_{b,t,Y_{b,t}}
+\log\sum_{v=1}^{V}\exp Z^{\text{pred}}_{b,t,v},
$$

其中 $\ell\in\mathbb{R}^{B\times(S-1)}$。带掩码的平均交叉熵是：

$$
\mathcal{L}_{\text{CLM}}
=\frac{\sum_{b=1}^{B}\sum_{t=1}^{S-1}M^{\text{loss}}_{b,t}\ell_{b,t}}
{\sum_{b=1}^{B}\sum_{t=1}^{S-1}M^{\text{loss}}_{b,t}}.
$$

分母必须是有效 token 数，而不是固定的 $B(S-1)$。否则不同 padding 比例或序列长度会改变梯度尺度。代码中的 `cross_entropy` 通常把 $Z^{\text{pred}}$ 展平为 $[N,V]$，把 $Y$ 展平为 $[N]$，其中 $N=B(S-1)$；`ignore_index` 或显式掩码负责去掉无效位置。

```python
import torch.nn.functional as F


def causal_lm_loss(model, input_ids, labels):
    # input_ids, labels: [B, S]；labels 的无效位置为 -100
    logits = model(input_ids).logits              # [B, S, V]
    shift_logits = logits[:, :-1, :].contiguous() # [B, S-1, V]
    shift_labels = labels[:, 1:].contiguous()     # [B, S-1]
    return F.cross_entropy(
        shift_logits.view(-1, shift_logits.size(-1)),  # [B(S-1), V]
        shift_labels.view(-1),                         # [B(S-1)]
        ignore_index=-100,
    )
```

常见的 off-by-one 错误是让 $Z[:,t,:]$ 预测 $X[:,t]$，模型便可直接看到目标 token；另一类错误是文档拼接后没有屏蔽边界，让前一文档末尾预测后一文档开头。两者都可能产生好看的 loss，却没有对应的可用能力。

### 困惑度与可比性

若交叉熵按自然对数计算，困惑度为：

$$
\operatorname{PPL}=\exp(\mathcal{L}_{\text{CLM}}).
$$

PPL 只有在 Tokenizer、验证集、切块方式和掩码口径相同时才可直接比较。不同词表会把同一文本切成不同 token 数，因此不能仅凭 PPL 判断两个任意模型谁更强。

## 其他预训练目标

不同目标对应不同的信息可见范围与模型接口。

| 目标 | 常见架构 | 输入与输出形状 | 计算位置 | 主要用途 |
| :-- | :-- | :-- | :-- | :-- |
| Causal Language Modeling (CLM) | Decoder-only | $X:[B,S]$，$Z:[B,S,V]$ | 所有有效 next-token 位置 | 生成、对话、代码 |
| Masked Language Modeling (MLM) | Encoder-only | $X:[B,S]$，$Z:[B,S,V]$ | 被 mask 的位置 | 表示、分类、抽取 |
| Span Corruption | Encoder-Decoder | 输入 $[B,S_x]$，输出 logits $[B,S_y,V]$ | 目标片段 token | 文本到文本迁移 |
| Denoising Autoencoding | Encoder-Decoder | 破坏输入 $[B,S_x]$，恢复目标 $[B,S_y]$ | 目标序列 token | 摘要、改写、生成 |

MLM 设被遮盖位置的掩码为 $M^{\text{MLM}}\in\{0,1\}^{B\times S}$，其损失为：

$$
\mathcal{L}_{\text{MLM}}
=-\frac{1}{\sum_{b,t}M^{\text{MLM}}_{b,t}}
\sum_{b,t}M^{\text{MLM}}_{b,t}
\log P_{b,t,X^{\text{original}}_{b,t}}.
$$

Encoder-Decoder 的目标 logits 为 $Z^{\text{dec}}\in\mathbb{R}^{B\times S_y\times V}$，labels 为 $Y\in\mathbb{N}^{B\times S_y}$；Decoder 同样通过右移后的目标前缀预测下一个目标 token。目标不同不是只换一个 loss 名字，还会改变注意力可见性、输入构造与推理方式。

## 数据配方

预训练数据决定模型能够学习什么，也决定模型会继承哪些偏差。

| 数据类型 | 主要作用 | 主要风险 |
| :-- | :-- | :-- |
| 网页 | 通用语言、知识与风格覆盖 | 噪声、重复、广告、隐私信息 |
| 书籍 | 长文本结构与高密度知识 | 版权、年代与文化偏差 |
| 论文 | 科学写作与专业知识 | 领域失衡、公式解析噪声 |
| 代码 | 程序生成与符号模式 | 许可证、仓库重复、密钥泄漏 |
| 数学 | 形式推理与解题表达 | 数据稀缺、答案污染 |
| 多语种 | 跨语言与低资源语言能力 | 质量不均、token 压缩率差异 |
| 对话 | 交互格式与问答模式 | 低质量回答、安全风险 |

一条可审计的数据管线通常包含：来源登记、解析规范化、语言与质量过滤、精确及近似去重、隐私与安全过滤、评测污染检查、数据配比、Tokenize、packing、分片与不可变版本发布。完整工程流程见 [数据管线](../../data-pipeline/index.md)。

混合数据时，先为每个来源定义采样权重 $w_k$，满足 $w_k\ge 0$ 且 $\sum_k w_k=1$。训练分布可写为：

$$
p_{\text{train}}(x)=\sum_{k=1}^{K}w_k p_k(x).
$$

这里的权重通常控制抽样概率，不等于源数据的原始字节占比。某类数据被重复采样会提高它对梯度的贡献，也会增加过拟合和记忆风险；配方必须和分领域验证集一起调整。

## Tokenizer 与 packing

Tokenizer 决定文本如何变成 token，也决定词表维 $V$、训练 token 预算和有效上下文密度。BPE、SentencePiece、Unigram 与 byte-level 方法各有取舍。需要重点评估多语种压缩率、代码和数学符号、特殊 token、无效字符处理以及训练和推理版本一致性。

packing 把多篇短文档装入固定长度 $S$ 的序列以减少 padding。若使用普通因果注意力，后一文档可能看到前一文档；这在把数据视作连续语料时可以接受，但若文档必须隔离，就要构造分块因果注意力掩码 $A\in\{0,1\}^{B\times S\times S}$。无论采用哪种语义，文档结束标记和跨边界 label 都必须明确，不能由数据加载器偶然决定。

## 模型路线

| 路线 | 信息可见性 | 优势 | 局限 |
| :-- | :-- | :-- | :-- |
| Encoder-only | 每个位置可看双向上下文 | 表示和理解任务强 | 不适合自然自回归生成 |
| Decoder-only | 每个位置只看左侧前缀 | 训练与生成统一，易扩展 | 逐 token 生成有顺序延迟 |
| Encoder-Decoder | Encoder 双向，Decoder 自回归并交叉注意 | 输入到输出任务表达自然 | 训练与服务链路更复杂 |

[LLaMA](https://arxiv.org/abs/2302.13971) 等开放权重模型的 Decoder-only 主线又结合了 RoPE、RMSNorm、SwiGLU、GQA、滑动窗口、MoE 等结构。架构选择决定 $Z:[B,S,V]$ 之前的计算方式，却不改变 CLM 的基本监督信号；具体见 [模型架构](../../architecture/index.md)。

## 优化与规模化

常用训练配方包括 AdamW、学习率 warmup 与衰减、梯度裁剪、权重衰减、混合精度、激活检查点和周期性 checkpoint。有效 batch 中的有效 token 数近似为：

$$
N_{\text{token}}
=N_{\text{DP}}\times B_{\text{micro}}\times N_{\text{acc}}
\times \overline{S}_{\text{valid}},
$$

其中 $N_{\text{DP}}$ 是数据并行副本数，$N_{\text{acc}}$ 是梯度累积次数。`backward()` 在 micro-batch 间累积梯度，只有 `optimizer.step()` 才更新一次参数；改变任一因子都可能改变梯度噪声和学习率需求。

大规模作业还要记录数据位置、随机数状态、优化器和调度器状态，使中断后能从相同 token 边界恢复。模型放不下或吞吐不足时，再选择数据、张量、流水线、序列或专家并行，具体见 [分布式训练](../distributed/index.md)。

## 持续预训练

持续预训练 (Continued Pre-training) 在已有基座上继续使用领域、语言或更长上下文数据，目标仍通常是 CLM。[持续预训练策略研究](https://arxiv.org/abs/2403.08763) 系统讨论了学习率重启、数据混合和计算规模对旧能力保留的影响。它适用于医学、法律、金融、代码、数学、低资源语言和长上下文适配；与 [有监督微调](./sft.md) 相比，它使用无须人工回答的连续语料，更适合吸收大量领域分布和术语。

设领域语料分布为 $p_d$，通用重放分布为 $p_g$，混合比例为 $\alpha$，持续预训练目标为：

$$
\mathcal{L}_{\text{CPT}}
=\alpha\,\mathbb{E}_{x\sim p_d}[\mathcal{L}_{\text{CLM}}(x)]
+(1-\alpha)\,\mathbb{E}_{x\sim p_g}[\mathcal{L}_{\text{CLM}}(x)].
$$

两个期望最终都产生标量 loss；每个 batch 内仍经过 $[B,S,V]$ logits 与 $[B,S]$ labels 的 token 交叉熵。$\alpha$ 越大不代表领域效果必然越好，它同时提高灾难性遗忘、风格漂移和领域语料过拟合风险。

实践流程是：先记录领域与通用基线；扫描领域/通用配比、学习率和 token 数；按固定 token 间隔评测；保存可回滚 checkpoint。学习率通常低于从头预训练，并可重新 warmup 后衰减，但数值必须通过当前模型和数据的小规模实验确定。

### 案例：法律领域持续预训练

固定总训练 token 数，比较仅领域、领域与通用 3:1、1:1 三种配方。每个 checkpoint 同时评测法律问答、法律语言建模 loss 和通用基准。若法律验证 loss 下降而法律问答不升，可能只是更会续写法律文本；若领域提升但通用指标明显回退，则提高通用重放比例、缩短训练或降低学习率。

判断是否上线应基于领域收益与通用回退的共同约束，不能只看训练 loss。持续预训练改变的是数据分布，不自动提供指令遵循、引用规范或安全拒答，这些行为仍需 SFT 与后续训练塑造。

## 评测与故障定位

| 现象 | 优先检查 |
| :-- | :-- |
| loss 很快接近 0 | label 是否与输入同位、数据是否大量重复 |
| loss 不降 | label shift、学习率、梯度、Tokenizer 与数据解码 |
| loss 正常但生成乱码 | Tokenizer/特殊 token 版本、数值溢出、保存加载 |
| PPL 下降但任务不升 | 数据是否覆盖目标能力、评测是否需要后训练格式 |
| 领域能力升而通用回退 | 数据混合比例、训练步数、学习率与重放策略 |
| 多卡结果偏离单卡 | loss 归一化、有效 batch、重复采样、梯度同步 |

预训练评测至少分为语言建模、知识理解、代码、数学、长上下文、多语种、安全与数据污染。训练 loss 是优化是否工作的直接信号，却不是完整能力证明；同样，单个 benchmark 上升也不能证明没有记忆或污染。

## 常见误区

| 误区 | 更准确的理解 |
| :-- | :-- |
| 数据越多越好 | 质量、配比、去重和污染控制同样决定收益 |
| Tokenizer 只是预处理 | 它决定序列长度、词表维、成本和模型接口 |
| loss 下降等于所有能力提升 | 能力还受数据覆盖、后训练和评测口径影响 |
| 持续预训练总能增强模型 | 它可能造成遗忘、风格漂移与安全回退 |
| 最后一个 logits 也有标签 | 长度为 $S$ 的片段通常只有 $S-1$ 个片内 next-token 监督位置 |

## 演化路线

| 时间 | 工作 | 架构 | 关键贡献 |
| :-- | :-- | :-- | :-- |
| 2018 | ELMo | BiLSTM | 上下文相关词表示 |
| 2018 | GPT | Decoder-only | 生成式预训练 |
| 2018 | BERT | Encoder-only | 双向掩码语言建模 |
| 2019 | RoBERTa | Encoder-only | 改进 BERT 训练策略 |
| 2019 | T5 | Encoder-Decoder | Text-to-Text 统一范式 |
| 2019 | BART | Encoder-Decoder | 去噪自编码生成 |
| 2020 | GPT-3 | Decoder-only | 大规模上下文学习 |
| 2023 | LLaMA | Decoder-only | 高效开放权重基座 |
