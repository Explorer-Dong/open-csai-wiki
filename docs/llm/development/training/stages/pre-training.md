---
title: 预训练
---

本文介绍大语言模型从表示学习走向基础模型的预训练范式。

## 独立专题

- [预训练](./pre-training.md)
- [持续预训练](./continued-pre-training.md)

## 快速开始

预训练 (Pre-training) 的核心思想是：先用大规模通用语料训练模型获得通用语言能力，再通过微调、提示词或后训练适配具体任务。

这条路线把自然语言处理从“每个任务单独训练一个模型”推进到“一个基础模型适配多个任务”。BERT、GPT、T5、BART 分别代表了不同架构和训练目标的探索，现代大语言模型主流则集中在 Decoder-only 自回归路线。

专业地看，预训练不是“把数据喂给模型”这么简单，而是数据配方、tokenizer、训练目标、优化策略、模型结构和评测体系的组合工程。能力的形成通常来自规模、数据分布和训练目标的共同作用。

## 从特征工程到预训练

传统自然语言处理依赖人工特征和任务专用模型。词向量出现后，模型可以复用通用语义表示，但词向量仍然是静态的。

ELMo 使用双向语言模型生成上下文相关表示，说明语言模型本身可以作为通用表示学习器。之后的 BERT 和 GPT 进一步把这种思路推进到 Transformer 架构上。

预训练范式带来的关键变化是：任务不再直接决定模型结构，而是被转化为统一训练目标下的适配问题。

## 预训练目标

不同预训练目标对应不同架构和能力偏向。

| 目标 | 常见架构 | 训练方式 | 适合能力 |
| --- | --- | --- | --- |
| Causal Language Modeling (CLM) | Decoder-only | 预测下一个 token | 生成、对话、代码、上下文学习 |
| Masked Language Modeling (MLM) | Encoder-only | 预测被 mask 的 token | 理解、分类、抽取 |
| Span Corruption | Encoder-Decoder | 预测被替换的文本片段 | 文本到文本迁移 |
| Denoising Autoencoding | Encoder-Decoder | 从破坏文本恢复原文 | 摘要、改写、生成 |
| Prefix LM | Decoder 或 Encoder-Decoder | 部分双向、部分自回归 | 兼顾理解和生成 |

现代通用助手多采用 CLM，因为训练目标、推理过程和后训练数据格式高度一致。对话、代码补全、工具调用都可以写成条件 token 生成。

几类目标可以写成：

$$
\mathcal{L}_\text{CLM}=-\sum_t\log p_\theta(x_t\mid x_{<t})
$$

$$
\mathcal{L}_\text{MLM}=-\sum_{i\in M}\log p_\theta(x_i\mid x_{\setminus M})
$$

$$
\mathcal{L}_\text{denoise}=-\sum_t\log p_\theta(y_t\mid y_{<t},\tilde{x})
$$

其中 $M$ 是被 mask 的位置集合，$\tilde{x}$ 是被破坏后的输入，$y$ 是需要恢复的目标文本。

## Encoder-only 路线

BERT 使用 Transformer Encoder，通过掩码语言模型 (Masked Language Modeling, MLM) 训练：随机遮住部分 token，让模型根据双向上下文预测被遮住的词。

BERT 的特点是：

- 能同时利用左侧和右侧上下文；
- 适合理解类任务，例如分类、匹配、抽取；
- 生成能力不如自回归模型自然。

RoBERTa 说明 BERT 的效果很大程度上受训练策略影响，例如更大数据、更长训练、更合理的动态 masking。

## Decoder-only 路线

GPT 系列使用 Transformer Decoder，通过“预训练目标”一节中的自回归语言建模目标训练。训练时根据历史 token 预测下一个 token，推理时也按同样方式逐步生成。

现代大语言模型大量采用 Decoder-only 架构，原因包括：

- 自回归目标简单，数据构造成本低；
- 生成、续写、对话、代码补全都可以统一为 next token prediction；
- 推理时可以使用 KV Cache 复用历史计算；
- 模型规模扩大后涌现出较强的上下文学习能力；
- 后训练数据可以自然拼接成多轮对话序列。

## Encoder-Decoder 路线

T5 将所有自然语言处理任务统一为 Text-to-Text 格式。例如分类任务也写成输入文本到输出文本的映射。

BART 使用去噪自编码目标：先破坏输入文本，再让模型恢复原文。它结合了 Encoder 的理解能力和 Decoder 的生成能力，适合摘要、翻译等序列到序列任务。

Encoder-Decoder 架构表达能力强，但训练和推理链路比 Decoder-only 更复杂。在通用聊天和代码模型中，Decoder-only 路线更容易规模化。

## 数据配方

预训练数据决定模型能学习到什么能力，也决定模型会继承什么偏差。

| 数据类型 | 作用 | 风险 |
| --- | --- | --- |
| 网页文本 | 覆盖面广，提供通用语言和知识 | 噪声、重复、广告、低质量内容 |
| 书籍 | 长文本结构、叙事和知识密度 | 版权和领域偏差 |
| 论文 | 科学写作和专业知识 | 格式噪声、领域不均衡 |
| 代码 | 代码生成、工具使用、符号模式 | 许可证、重复仓库、低质量代码 |
| 数学 | 形式推理和问题求解 | 数据稀缺、答案污染 |
| 多语种 | 跨语言能力 | token 压缩率不均、低资源语言质量差 |
| 对话 | 交互格式和问答模式 | 可能混入低质量或不安全回答 |

数据工程常包括去重、质量过滤、语言识别、毒性过滤、PII 过滤、评测集污染检测和数据配比控制。对于大模型，数据质量常常比单纯 token 数更关键。

```mermaid
flowchart LR
    A[Raw Corpus] --> B[Language ID]
    B --> C[Quality Filter]
    C --> D[Dedup]
    D --> E[Safety / PII Filter]
    E --> F[Contamination Check]
    F --> G[Mixture Sampling]
    G --> H[Tokenization]
    H --> I[Packed Batches]
```

这条管线的关键不是过滤越多越好，而是让训练分布、能力目标和评测口径保持一致。

## Tokenizer

Tokenizer 决定文本如何被切分成 token。常见方法包括 BPE、SentencePiece、Unigram 和 byte-level tokenizer。

词表大小和分词策略会影响：

- 多语种压缩率；
- 代码和数学符号表示；
- 长上下文中的有效信息密度；
- 推理速度和 KV Cache 成本；
- 特殊 token 对对话格式、工具调用和安全策略的表达能力。

一个专业判断是：tokenizer 不是预处理细节，而是模型接口的一部分。相同文本在不同 tokenizer 下会变成不同长度的序列，直接影响训练预算和上下文容量。

BPE 的核心过程可以写成伪代码：

```text
输入: 语料 corpus，目标词表大小 V
初始化: 把文本拆成字符或 byte 序列
while vocab_size < V:
    pair = 统计出现频率最高的相邻 token pair
    merge(pair)
    更新语料中的 token 序列
输出: merge rules 和 vocabulary
```

这个过程会优先把高频片段合并成更长 token，因此常见词和常见代码片段会被更短地表示。

## 训练配方

大规模预训练需要稳定的优化策略。常见要素包括：

- optimizer：AdamW 或其变体；
- learning rate schedule：warmup 后 cosine decay 或类似策略；
- batch size：影响梯度噪声、吞吐和训练稳定性；
- gradient clipping：抑制异常梯度；
- weight decay：控制过拟合和参数规模；
- mixed precision：降低显存和提升吞吐；
- activation checkpointing：用重复计算换显存；
- checkpoint：定期保存模型，支持恢复和评测。

训练配方的核心目标是让 loss 按预期下降，同时避免数值不稳定、数据污染和训练中断。对于超大训练，工程可靠性本身就是模型能力的一部分。

下面是一个简化的 Decoder-only 预训练循环：

```python
import torch
import torch.nn.functional as F


def train_step(model, batch, optimizer, scheduler, max_grad_norm=1.0):
    # batch: [B, S]，每一行是连续 token ids
    input_ids = batch[:, :-1]
    labels = batch[:, 1:]

    logits = model(input_ids)  # [B, S-1, V]
    loss = F.cross_entropy(
        logits.reshape(-1, logits.size(-1)),
        labels.reshape(-1),
    )

    optimizer.zero_grad(set_to_none=True)
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), max_grad_norm)
    optimizer.step()
    scheduler.step()
    return loss.item()
```

真实训练还需要混合精度、分布式并行、梯度累积、checkpoint、数据重启和异常恢复。这个例子只展示 label shift 和交叉熵的核心逻辑。

## 继续预训练

继续预训练 (Continued Pre-training) 指在已有基座模型上继续用特定数据训练。常见场景包括：

- 领域适配：医学、法律、金融、科研；
- 代码专门化：提升代码生成和仓库理解；
- 数学专门化：提升形式推理和解题能力；
- 长上下文扩展：用更长序列继续训练，让模型适配长距离依赖；
- 多语种增强：补足低资源语言能力。

继续预训练的风险是遗忘原有能力或改变模型行为分布，因此通常需要混合通用数据，并做回归评测。

## 预训练评测

预训练阶段常看 loss 和 PPL，但这不足以评估完整能力。更专业的评测应区分：

- 语言建模能力：验证集 loss、PPL；
- 知识和理解：QA、阅读理解、专业领域 benchmark；
- 代码能力：HumanEval、MBPP、LiveCodeBench 等；
- 数学推理：GSM8K、MATH、AIME 类任务；
- 长上下文：needle-in-a-haystack、长文问答、仓库级任务；
- 数据污染：训练数据是否包含评测样本。

预训练 loss 的下降通常是能力提升的基础，但某些能力可能需要特定数据、后训练或测试时计算才会显著表现出来。

## 开放权重模型路线

LLaMA、Mistral、Qwen、DeepSeek 等开放权重模型延续了 Decoder-only 主线，并在数据质量、分词器、位置编码、注意力变体、MoE、后训练上持续改进。

这类模型的意义不只是模型权重开放，还包括推动训练配方、评测、微调、部署工具链的快速发展。

| 路线 | 关键关注点 | 代表性影响 |
| --- | --- | --- |
| LLaMA 类 | 高质量数据、RoPE、RMSNorm、SwiGLU | 奠定开放权重 Decoder-only 配方 |
| Mistral 类 | GQA、滑动窗口、MoE | 推动效率和稀疏扩展 |
| Qwen 类 | 多语种、代码、工具、多模态生态 | 强化中文和工程生态覆盖 |
| DeepSeek 类 | MoE、MLA、强化推理 | 强化低成本训练和 reasoning model 路线 |

## 演化路线

| 时间 | 模型 | 架构 | 核心贡献 |
| --- | --- | --- | --- |
| 2018 | ELMo | BiLSTM | 上下文相关词表示 |
| 2018 | GPT | Decoder-only | 生成式预训练 |
| 2018 | BERT | Encoder-only | 双向掩码语言建模 |
| 2019 | RoBERTa | Encoder-only | 改进 BERT 训练策略 |
| 2019 | T5 | Encoder-Decoder | Text-to-Text 统一范式 |
| 2019 | BART | Encoder-Decoder | 去噪自编码生成 |
| 2020 | GPT-3 | Decoder-only | 大规模上下文学习 |
| 2023 | LLaMA | Decoder-only | 高质量开放权重基座 |

## 局限与后续发展

预训练模型获得的是通用语言能力，但不天然等于可靠助手。它可能不会遵循指令，也可能输出不符合人类偏好的内容。因此，预训练之后通常还需要 [后训练](./post-training.md)。

同时，预训练成本随着模型规模快速增长，需要依赖 [扩展定律](../../architecture/scaling-law.md)、[MoE](../../architecture/moe.md) 和 [高效架构](../../architecture/transformer.md#efficient-transformer) 控制成本。

## 常见误区

| 误区 | 更准确的理解 |
| --- | --- |
| 预训练数据越多越好 | 数据质量、去重、配比和污染控制同样关键 |
| tokenizer 是无关细节 | tokenizer 影响序列长度、成本、多语种和代码能力 |
| loss 下降等于所有能力提升 | 推理、工具、安全和对话能力还依赖数据分布和后训练 |
| 继续预训练总能增强能力 | 可能带来遗忘、风格漂移和安全回退 |

## 参考资料

- [Improving Language Understanding by Generative Pre-Training](https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf)
- [BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding](https://arxiv.org/abs/1810.04805)
- [RoBERTa: A Robustly Optimized BERT Pretraining Approach](https://arxiv.org/abs/1907.11692)
- [Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer](https://arxiv.org/abs/1910.10683)
- [BART: Denoising Sequence-to-Sequence Pre-training for Natural Language Generation, Translation, and Comprehension](https://arxiv.org/abs/1910.13461)
- [LLaMA: Open and Efficient Foundation Language Models](https://arxiv.org/abs/2302.13971)
