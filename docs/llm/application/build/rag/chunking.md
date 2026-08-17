---
title: Chunking
---

Chunking 将文档分为可检索片段，决定召回粒度、上下文完整性和成本。片段太大则召回后上下文冗长且稀释相关性，太小则截断语义，导致答案缺少必要限定条件，因此切分是 RAG 里直接影响效果的第一步。它先于 embedding 与检索发生，切错了后面所有环节都无法挽回，所以被视为 RAG 流水线的「源头」环节。

## 快速开始

优先按语义边界切分：章节标题、段落、列表、表格与代码块各自构成自然边界，比按固定字符数切更不容易截断语义。给每个 chunk 保留元数据——所属标题路径、来源文档、版本号和时间戳，便于后续过滤与溯源。

切分策略大体分三类，从粗到细对应不同复杂度：固定长度切分按字符或 token 数等分，实现最简单但最容易截断语义；递归切分（如 [LangChain 的递归字符切分器](https://python.langchain.com/docs/how_to/recursive_text_splitter/)）先按段落、句子等由大到小的分隔符逐级尝试，尽量落在自然边界；语义切分（如 [LlamaIndex 的语义切分](https://docs.llamaindex.ai/en/stable/module_guides/loading/node_parsers/modules/)）用 embedding 相似度判断相邻句子是否属于同一主题，成本最高但对语义边界最敏感。三者演进的方向就是「从按长度切，到按结构切，再到按语义切」。

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,          # 每块目标字符数
    chunk_overlap=50,        # 相邻块重叠字符数
    separators=["\n\n", "\n", "。", " ", ""],
)
chunks = splitter.split_text(document)
```

相邻 chunk 之间保留一定重叠，缓解句子被边界切断的问题；重叠大小按句子而非固定字符来定。切完后不是数「切了多少块」，而是用一组真实问题去评估：标准答案所需的证据是否完整落在单个或少数 chunk 内，Recall@k 是否达标。

先小批量切分、跑问题集验证，再全量切分并冻结版本。改动切分策略（如调整 chunk 大小或边界规则）时，必须重建索引并在同一问题集上复测，否则新旧结果不可比——chunk 是 embedding 的输入，chunk 一变，下游向量全部变化。

## 案例

一份产品手册包含章节、段落和多张参数表。按章节和段落切分，并保证每张表格与它的前后说明文字留在同一块里——表格单独成块会丢失「表头含义」和「单位」等限定条件，导致回答错误。这是「语义边界优先于长度边界」的直接体现：表格与其说明文字构成一个语义整体，不能因为字符数达标就从中间切开。

若发现答案缺少限定条件（例如只答了「退款 7 天」，漏了「特定品类除外」），先检查证据是否被切到了别的 chunk，而不是盲目扩大 top-k：把更多无关 chunk 塞进上下文只会增加噪声和成本。这里的关键判断是「证据在不在被召回的那块里」，而不是「召回了几块」。

正确的修法是增加结构化上下文：把「章节标题 + 表格标题 + 段落」一起编码进 chunk，或让每个 chunk 携带其父标题路径。修好后回到问题集复测，确认限定条件能被完整召回——限定条件完整了，回答才会完整，这比单纯提高 Recall@k 数字更能反映真实收益。

## 相关主题

- [Vector Search](./vector-search.md)
- [Reranker](./reranker.md)
