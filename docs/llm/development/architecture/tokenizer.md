---
title: Tokenizer
---

Tokenizer 把原始文本转换为模型可处理的 token ID 序列，同时决定上下文长度、计算成本与部分语言能力。它由「词表与合并规则」和「编码/解码流程」两部分组成：词表决定能表示哪些符号，编码流程决定一段文本如何被切成这些符号。因为每个 ID 只对应词表里固定的一行 embedding 与输出权重，Tokenizer 与模型权重必须成套使用，替换或重训 Tokenizer 都意味着重新对齐整个词表。

## 快速开始

始终使用模型随附的 Tokenizer 及对应版本，而不是按模型名随手挑一个。加载后先验证三件事：特殊 token（BOS/EOS/pad）是否齐全、聊天模板是否正确、截断方向（left/right）是否与训练时一致：

```python
from transformers import AutoTokenizer

tok = AutoTokenizer.from_pretrained("meta-llama/Llama-3.1-8B-Instruct")
text = "你好，world!"
ids = tok.encode(text)                     # 含 BOS/EOS 的完整编码
print(len(ids), ids[:3], tok.decode(ids))  # 长度、前缀、可逆性
```

验证成功的标准是 `decode(encode(text))` 往返后语义与空格不丢，且统计出的 token 数与真实推理服务一致。训练或部署前用同一套 Tokenizer 对真实提示统计 token 数，再决定上下文预算与截断策略。

## 工作方式

子词分词要解决的核心矛盾是：按字符切分序列过长、按整词切分又无法覆盖开放词表里的生僻词。BPE、WordPiece 与 Unigram 三种算法都在「词表大小」与「平均序列长度」之间折中，把高频的常见片段留作整块、低频的罕见片段拆成更小的子词或字符。

字节对编码 (Byte Pair Encoding, BPE) 起源于数据压缩，Sennrich 等人在 2016 年将其引入神经机器翻译以处理罕见词（[论文](https://arxiv.org/abs/1508.07909)）。它从字符或字节出发，反复合并语料中相邻共现频率最高的符号对 (a, b)：

$$\text{pair}(a, b) = \arg\max_{(x,y)} \text{freq}(x, y)$$

每次合并都往词表里加入一个新符号 ab，直到达到目标词表大小；编码时再贪心地应用学到的合并顺序。这种「先高频合并」的策略让常见子词占据更短、更整块的表示。

WordPiece 由 Schuster 与 Nakajima 在 2012 年提出，用于日语/韩语语音搜索（[论文](https://www.semanticscholar.org/paper/Japanese-and-Korean-voice-search-Schuster-Nakajima/ed6262b569c0a62c51d941228c54f34e563af022)），BERT 的 Tokenizer 即基于它。与 BPE 不同，WordPiece 不选「共现频率最高」的对，而选「组成后增益最大」的对：

$$\text{score}(a, b) = \frac{\text{freq}(a, b)}{\text{freq}(a)\,\text{freq}(b)}$$

分母惩罚那些「单独也常出现」的片段，使合并优先发生在更紧密结合的符号对之间。编码时采用最长匹配：从当前位置向右取词表里存在的最长子串作为 token。

Unigram 由 Kudo 在 2018 年提出（[论文](https://arxiv.org/abs/1804.10959)），与前述两种自底向上的合并相反，它自顶向下做剪枝：先从一个过大的初始词表出发，在语料上训练子词语言模型，逐轮计算「去掉某个子词后损失增加多少」，删去损失增量最小的一批，直到词表缩到目标大小。编码时用 Viterbi 算法在所有可能切分中选择概率最高者，因此对同一文本可能给出多种合法切分，天然支持采样式正则化。

SentencePiece（[论文](https://arxiv.org/abs/1808.06226)）与 Hugging Face 的 tokenizers 库（[文档](https://huggingface.co/docs/tokenizers/main/en/api/models)）把上述算法工程化。SentencePiece 直接把整段文本当作 Unicode 序列处理，用特殊符号 ▁ 标记词首的空格，因此不依赖语言相关的空格切分、也能无损还原原文；GPT-2 系列则使用 byte-level BPE（[论文](https://d4mucfpksywv.cloudfront.net/better-language-models/language_models_are_unsupervised_multitask_learners.pdf)），以 256 个字节为初始词表，从根本上消除了未知 token（[字节级 BPE 论文](https://arxiv.org/abs/1909.03341)）。无论哪种实现，模型只看 ID；不同 Tokenizer 对同一句话的切分不同，因此 ID 与权重必须成套使用。

## 案例：长度预算

将同一段中英文混合提示分别编码并比较 token 数，而不是数字符：对英文一个单词常是 1 个 token，中文一个汉字常是 1 个或多个 token，二者无法用字符数直接换算。下面的代码先算 token 数，再判断是否超出上下文窗口：

```python
prompt = "请总结以下英文段落：" + " " * 2000 + "The quick brown fox jumps."
ids = tok.encode(prompt, add_special_tokens=False)
budget = 4096 - len(ids)          # 留给输出与 BOS/EOS 的余量
print(f"prompt tokens={len(ids)}, budget={budget}")
assert len(ids) + 256 <= 4096     # 预留至少 256 个生成 token
```

若总 token 加预留输出超过上下文窗口，应先压缩或分块，而不是让服务端静默截断——静默截断可能切掉中间的指令或结尾的关键信息，且不同框架的截断方向不同，行为不一致。

## 常见问题

遗漏 BOS、EOS 或聊天模板会改变模型行为：无 BOS 的序列缺少起始信号，无 EOS 的生成可能停不下来，而聊天模板里的特殊分隔符（如 `<|im_start|>`、`<|end_of_text|>`）一旦错位，多轮对话的角色边界就会串。这些问题都表现为「模型突然变傻」而非报错，因此要以 `apply_chat_template` 为准，不要手工拼 prompt：

```python
msgs = [{"role": "user", "content": "你好"}]
print(tok.apply_chat_template(msgs, tokenize=False))
```

训练时 tokenizer 变化（换算法、改词表、改特殊 token）必须同步调整词表与 embedding，并把数据重新按新规则编码；只换权重不换 Tokenizer，或只换 Tokenizer 不重训 embedding，都会让输入 ID 与权重语义错位。

## 相关主题

- [Embedding](./embedding.md)
- [长上下文](./long-context.md)
