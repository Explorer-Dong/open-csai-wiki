---
title: 文本生成（机器翻译）
---

现代文本生成任务包括翻译、摘要、问答、对话等，而机器翻译 (Machine Translation
, MT) 是最典型的序列到序列建模场景。本文以机器翻译为切入点，从传统统计方法过渡到神经网络方法，并系统介绍序列到序列 (Sequence to Sequence, Seq2Seq) 与注意力 (Attention) 机制，为后续理解 [Transformer](../../../llm/development/architecture/transformer.md) 奠定基础。

## 基本概念

### 任务定义

机器翻译的目标是：给定源语言序列，将其映射为目标语言序列，是一个条件生成问题：

$$
\hat{y} = \arg\max_y p(y \mid x)
$$

### 数据集

常用数据集包括 WMT 系列。以 [WMT19 ZH-EN](https://huggingface.co/datasets/wmt/wmt19/viewer/zh-en) 为例，其中训练集约 26M、验证集约 4K，示例：

```json
{ "en": "1929 or 1989?", "zh": "1929年还是1989年?" }
{ "en": "One Hundred Years of Ineptitude", "zh": "百年愚顽" }
{ "en": "What Failed in 2008?", "zh": "2008年败在何处？" }
```

### 评价方法

机器翻译的输出不是唯一答案，同一句话可以有多种正确译法，因此评价指标通常不直接判断“是否完全一致”，而是比较模型输出与参考译文之间的重叠程度或语义接近程度。

**BLEU**：基于 n-gram 精确度的经典翻译指标，核心思想是“模型译文中的片段有多少也出现在参考译文中”。设 $p_n$ 表示模型译文与参考译文在 $n$-gram 上的修正精确率，$w_n$ 是不同阶数的权重，则：

$$
\mathrm{BLEU}=\mathrm{BP}\cdot \exp\left(\sum_{n=1}^{N}w_n\log p_n\right)
$$

其中 $\mathrm{BP}$ 是长度惩罚项：

$$
\mathrm{BP}=\begin{cases}
1,& c>r \\
\exp(1-r/c),& c\le r
\end{cases}
$$

$c$ 表示模型译文长度，$r$ 表示参考译文长度。长度惩罚的设计是为了避免模型只输出少量高置信词，例如只把 “I love machine translation” 翻译成 “我 爱”，虽然局部词语正确，但不能算作好翻译。

从感性上看，BLEU 同时关注两件事：

1. 译文片段是否足够像参考答案，例如 unigram 关注词是否对，bigram 和 trigram 进一步关注局部顺序是否合理；
2. 译文长度是否接近参考答案，避免过短输出通过精确率“钻空子”。

BLEU 的优点是简单、稳定、便于跨论文比较；缺点是它主要依赖表面字符串重叠，对同义改写不敏感，也难以判断事实是否正确。因此 BLEU 更适合做语料级别的总体比较，不适合单独用来判断某一句翻译是否好。

**ROUGE**：更偏向召回的指标，常用于摘要，也可辅助观察翻译是否遗漏关键信息。以 ROUGE-N 为例：

$$
\mathrm{ROUGE\text{-}N}=\frac{\sum_{g\in \mathrm{Ref}} \min(\mathrm{Count}_{\mathrm{cand}}(g),\mathrm{Count}_{\mathrm{ref}}(g))}{\sum_{g\in \mathrm{Ref}}\mathrm{Count}_{\mathrm{ref}}(g)}
$$

其中 $g$ 表示参考译文中的 $N$-gram。与 BLEU 更关注“模型输出的内容有多少是对的”不同，ROUGE 更关注“参考答案中的内容有多少被模型覆盖”。因此，如果译文遗漏了重要实体、事件或限定条件，ROUGE 往往会下降。

**chrF**：基于字符级 n-gram 的 F 分数，常用于形态变化丰富的语言，因为它不完全依赖分词结果。设 $P_{\mathrm{chr}}$ 和 $R_{\mathrm{chr}}$ 分别为字符 n-gram 精确率和召回率，则：

$$
\mathrm{chrF}_{\beta}=\frac{(1+\beta^2)P_{\mathrm{chr}}R_{\mathrm{chr}}}{\beta^2P_{\mathrm{chr}}+R_{\mathrm{chr}}}
$$

当词形变化、子词切分或中文分词会明显影响词级指标时，chrF 可以提供更平滑的参考。

**语义型指标**：BERTScore、COMET 等指标不再只比较表面 n-gram，而是利用预训练模型表示来衡量语义相似度。它们更容易识别“表达不同但意思接近”的译文，也更贴近人工评价，但代价是计算更重、实现更复杂，并且会受到底层预训练模型质量的影响。

实际评估时通常不会只看一个指标：BLEU 适合观察整体翻译质量趋势，ROUGE 和 chrF 可补充遗漏与字符级变化，语义型指标可帮助判断同义改写。最终仍需要抽样人工检查，特别是实体、数字、否定词、时态和专业术语等容易造成严重错误的位置。

## 传统方法——统计机器翻译

统计机器翻译 (SMT) 将翻译分解为：

$$
p(y \mid x) \propto p(x \mid y) \cdot p(y)
$$

其中 $p(x\mid y)$ 表示反向翻译模型，$p(y)$ 表示语言模型。

缺点在于组件繁多、规则繁重、难以扩展。

## Seq2Seq 架构

Seq2Seq 通过 Encoder-Decoder 模型直接建模 $p(y \mid x)$。使用 RNN (LSTM/GRU) 实现。

参考论文：[Effective Approaches to Attention-based Neural Machine Translation](https://aclanthology.org/D15-1166.pdf)

![基于 RNN 的 seq2seq 模型架构](https://cdn.dwj601.cn/images/20250428083440132.png)

### Encoder

将输入序列逐步编码为隐藏状态序列，早期模型仅使用最终状态作为整体语义压缩。

### Decoder 与自回归生成

Decoder 在每个时间步预测：

$$
p(y_t\mid y_{<t}, x)
$$

训练与推理不同：

- **训练 (Teacher Forcing)**：使用真实 token；
- **测试**：使用上一步模型预测，完全自回归。

为了避免贪心选择的局限，使用 **beam search** 扩展搜索空间。

## Attention 机制

在 RNN seq2seq 中加入 Attention 后结构如下：

![基于 RNN 的 seq2seq 模型架构（引入了 Attention 机制）](https://cdn.dwj601.cn/images/20250428101226957.png)

### 机制说明

步骤：

1. 将 Encoder 所有隐藏状态作为 values（亦作为 keys）；
2. Decoder 当前隐藏状态作为 query；
3. 计算注意力权重（缩放点积注意力）；
4. 对 values 加权求和，得到上下文向量。

Attention 的意义：

- 缓解信息瓶颈
- 模型可解释，通过注意力矩阵建立“软对齐”

如果输入序列很长，需改进注意力的计算方式以适配大规模场景。

## 总结与展望

基于 RNN 的优缺点：

- 缺点：长依赖困难、可解释性弱、难并行、曝光偏差
- 优点：自回归模式自然与训练接口一致

Attention 提升了 RNN 的训练效率与表达能力，但 RNN 本身的串行结构仍然无法并行。

完全并行化的 Transformer 由 Attention 推广而来，感兴趣的读者可移步 [Transformer](../../../llm/development/architecture/transformer.md) 作进一步阅读。
