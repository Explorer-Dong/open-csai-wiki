---
title: Embedding
---

Embedding 将离散 token、位置或其他特征映射为连续向量，使神经网络能够处理符号输入。它是符号世界与连续向量空间之间的桥梁，几乎每个 Transformer 模块的输入都从这里开始。

词向量并非 Transformer 的发明：[Mikolov 等人](https://arxiv.org/abs/1301.3781) 的 Word2Vec 基于「相似上下文中的词语义相近」这一分布式假设，把词映射为低维稠密向量并展示了向量的语义运算性质。之后的发展沿两条线推进：一是从词级向量走向 [子词 token](./tokenizer.md) 向量以解决未登录词问题；二是从静态向量走向上下文相关向量，即 [Encoder](./encoder.md) 类模型输出的动态表示。理解这条「静态词向量 -> 上下文表示 -> 文本级向量」的脉络，能帮助区分「词嵌入」与「语义检索向量」两件事。

## 快速开始

检查输入 ID 是否落在词表范围：任何 `token_id` 都必须小于词表大小，否则查表会越界。同时确认 embedding 维度与 Transformer 的 hidden size 一致，因为后续残差连接与各层投影都要求同一维度；不一致时应通过投影层对齐，而不是直接拼接。

对预训练模型做微调时，先冻结大部分参数，只训练任务相关部分。若需新增 token，则扩展 embedding 表：把新 token 的初始向量设为已有 token 向量的均值或某个特殊 token 的向量，并让相应参数参与训练，其余部分保持冻结。扩展的最小流程如下：

```python
old_vocab = len(model.get_input_embeddings().weight)
model.resize_token_embeddings(len(tokenizer))   # 同步扩展输入与输出表

with torch.no_grad():
    emb = model.get_input_embeddings().weight
    emb[old_vocab:] = emb[:old_vocab].mean(dim=0)   # 用已有向量均值初始化新行
```

验证时打印输入 ID 到向量的映射形状、检查梯度是否只流向新行，并确认输出 logits 与 embedding 表的维度关系。验证成功的标准是：新行梯度范数非零、旧行梯度接近零（冻结后）、前向不越界。一个常见错误是只改了 tokenizer 而没扩展模型表，或扩展了表却把新行排除了梯度。

## 原理

词嵌入表相当于可训练查表：模型维护一个大小为 `(vocab_size, hidden_size)` 的矩阵 $E$，token ID $i$ 对应第 $i$ 行向量 $E[i]$。查表本身没有可学习参数参与非线性变换，但行向量会在训练中随梯度更新，因此语义相近的 token 往往被推到相近的位置。这与 Word2Vec 的初衷一致，只是现代大模型把词向量作为端到端训练的一部分，而不是单独预训练的产物。

输入和输出词表有时共享权重（tied weights）：输出层的 logits 用同一矩阵 $E$ 计算 $xE^\top$。[Press 与 Wolf](https://arxiv.org/abs/1608.05859) 较早论证了共享输入输出嵌入的收益。共享权重能显著减少参数量，也把输入与输出空间绑定到同一语义空间，但要求输入输出词表一致，新增 token 时两侧需要同步处理。

语义检索中的 embedding 则是另一回事：它把一段文本（而非单个 token）映射为一个固定维度向量，常见于 [Encoder](./encoder.md) 或双塔检索模型。代表性做法是 [Sentence-BERT](https://arxiv.org/abs/1908.10084)：用孪生或三塔结构对句子编码，再以余弦相似度为目标训练，使相似句子的向量更近。使用时必须明确是否做了归一化，以及相似度度量是余弦相似度还是内积：

$$
\cos(u,v)=\frac{u\cdot v}{\lVert u\rVert\lVert v\rVert}
$$

归一化后余弦相似度退化为内积，因此实现上常先归一化再点积：

```python
import torch.nn.functional as F
u = F.normalize(u, dim=-1)
v = F.normalize(v, dim=-1)
score = (u * v).sum(dim=-1)   # 归一化后内积 == 余弦相似度
```

若模型在归一化后训练，查询时也应归一化后再算内积，否则分数尺度不一致，阈值与排序都会失真。

## 案例：新增领域标记

为对话格式加入特殊标记（如 `<|tool|>`、`<|im_start|>`）时，需要同时改两处：用 tokenizer 的 `add_tokens` 之类接口注册新 token，并调用模型的 `resize_token_embeddings` 扩展输入 embedding 表（以及可能的输出层）。

扩展后，把新行的初始向量设为现有词表向量的均值，或直接复制某个相近特殊 token 的向量，避免随机初始化带来大幅扰动。训练数据中必须包含这些标记，且标记两侧的边界要与部署模板一致，否则模型学不到它们的语义。

只改 tokenizer 而不扩展模型表，前向时新 ID 会越界报错；只扩展模型表而不把新行加入优化器，则新 token 的向量永远不更新，等同于废标记。验证方法是：构造一个含新标记的短序列前向一次，确认不报越界，再打印新行的梯度范数确认其参与训练。

## 相关主题

- [Tokenizer](./tokenizer.md)
- [位置编码](./positional-embedding.md)
