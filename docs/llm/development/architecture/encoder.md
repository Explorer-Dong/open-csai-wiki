---
title: Encoder
---

Encoder 使用双向注意力为整段输入生成上下文化表示，常用于理解、分类与检索。它与 [Decoder-only](./decoder-only.md) 的关键区别在于注意力方向：每个位置都能看到左右两侧的全部上下文。

Encoder 的双向建模路线以 [BERT](https://arxiv.org/abs/1810.04805) 为标志性节点：它沿用 [Transformer](./transformer.md) 的 encoder 堆叠，通过掩码语言模型让每个 token 的表示吸收整句上下文，从而在理解类任务上大幅超越单向模型。此后 RoBERTa、DeBERTa 等在此基础上优化训练策略与注意力结构，而随着 decoder-only 在生成任务上占据主导，encoder 的定位逐渐收敛到「高效表征与检索」，与 [Embedding](./embedding.md) 和语义检索紧密绑定。

## 快速开始

对检索任务使用统一的 query/document 编码策略：query 与 document 用同一个模型（或对称的双塔）编码，并采用相同的归一化方式，才能保证两者向量处于可比的空间。编码后把文本转成向量并做归一化，用内积或余弦相似度作为排序分数。最小检索打分如下：

```python
q = F.normalize(query_emb, dim=-1)
d = F.normalize(doc_emb, dim=-1)      # (num_docs, dim)
scores = q @ d.T                      # (1, num_docs)
top_k = scores.topk(k).indices        # 召回前 k 个文档下标
```

在验证集上比较余弦相似度与召回率，而不要只信单一分数。标注一批「问题 -> 正确文档」对，计算 top-k 召回率 Recall@k，看正确文档是否落在前 k 个候选中，这比只看某个相似度阈值更有意义。Recall@k 定义为：

$$
\text{Recall@}k=\frac{\text{前 }k\text{ 个候选中正确文档的数量}}{\text{该查询的正确文档总数}}
$$

不要把生成模型的最后 token 向量直接当作通用检索向量。生成模型（尤其 decoder-only）的最后一个 token 向量偏重「预测下一个 token」，没有经过对比学习或句向量目标训练，直接用作检索通常效果差；检索应使用专门的编码器或经过句向量微调的模型。

## 特点

双向注意力可同时利用左右上下文，适合表征学习：在分类、命名实体识别、句子对相似度等任务中，一个词的表示可以吸收整句信息，而不只依赖左侧前缀。这让 encoder 在「理解整段输入」的任务上比单向模型更自然。

它通常不直接以自回归方式生成长文本。BERT 类 encoder 通过掩码语言模型 (Masked Language Model, MLM) 训练：随机遮住部分 token 让模型根据上下文还原，天然适合双向建模，但无法直接逐 token 生成，因此多用于理解而非生成。MLM 只对被掩码的位置计算交叉熵，训练目标可写为：

$$
\mathcal{L}=-\sum_{t\in\mathcal{M}}\log p_\theta(x_t\mid x_{\setminus\mathcal{M}})
$$

其中 $\mathcal{M}$ 是被掩码位置的集合，$x_{\setminus\mathcal{M}}$ 表示去掉这些位置后的上下文。

Encoder-decoder 则把输入理解和输出生成分开：encoder 用双向注意力编码输入，decoder 用因果注意力生成输出，二者通过交叉注意力连接。这种结构适合翻译、摘要等「输入一段、输出一段」的任务，但比纯 decoder-only 需要维护两套模块。它在 [T5](https://arxiv.org/abs/1910.10683) 中被统一为 text-to-text 范式，但生成侧仍需自回归解码，无法像纯 encoder 那样一次编码即可用于检索。

## 案例：语义检索

将问题和文档分别编码并归一化，使用内积召回候选，再用标注问题评估 Recall@k。步骤如下：把所有文档离线编码为向量存入索引；查询时把问题编码成向量，在索引中做最近邻检索得到候选；最后用标注评估正确文档是否进入前 k 名。

训练、索引和查询必须使用同一 embedding 模型版本。模型一旦重新微调或升级，向量空间随之改变，旧索引与旧向量不再可比，必须整体重建索引并重新编码文档，否则检索质量会明显下降。

常见失败点包括：训练用余弦相似度而查询用内积（未归一化时二者不等价）、query 与 document 用了不同的编码策略导致空间不对齐、以及文档切分粒度过粗导致正确段落被埋没。排查时先用同一模型重新编码全部文档，再逐项比对相似度分数与 Recall@k。

## 相关主题

- [Embedding](./embedding.md)
- [Decoder-only](./decoder-only.md)
