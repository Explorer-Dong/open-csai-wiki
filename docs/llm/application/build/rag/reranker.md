---
title: Reranker
---

重排序器对初步召回的 query-document 对进行更精细评分，提高最终上下文相关性。初步检索（向量或关键词）用轻量打分保证召回广度，Reranker 用更强的模型在较少的候选中重排，把最相关的片段放到前面，属于「先广后精」的两阶段结构。这种「召回 + 精排」的 cascade 由来已久：单阶段要么为精度牺牲广度（候选太少会漏），要么为广度牺牲精度（候选太多会噪声），两阶段正是用分工来同时拿到两者。

## 快速开始

第一阶段召回足量候选（例如 top-20 或 top-50），保证真正的相关片段有机会进入候选集；召回太少，Reranker 再强也救不回来。第二阶段只对这批候选做精排，把数量限制在可控范围，以平衡效果与延迟。

交叉编码器（cross-encoder）是重排的主流实现，与 [双编码器](./embedding.md)（bi-encoder）的区别在于输入方式：双编码器把 query 与文档分别编码成向量再算相似度；交叉编码器把「query 与文档拼接」整体送入 Transformer，让两者在每一层充分交互，输出一个标量相关性分数：

$$
s=\sigma(W\,h_{\text{CLS}}+b)
$$

其中 $h_{\text{CLS}}$ 是拼接序列的 [CLS] 位置表示，$W$ 与 $b$ 是分类头的参数，$\sigma$ 通常取 sigmoid。交互更充分带来更高精度，但代价是每个 query-document 对都要单独前向一次、无法像双编码器那样预计算文档向量，因此只能用在候选较少的精排阶段。[sentence-transformers 的 CrossEncoder](https://www.sbert.net/docs/cross_encoder/usage/usage.html)、[BGE reranker](https://huggingface.co/BAAI/bge-reranker-v2-m3) 与 [Cohere Rerank](https://docs.cohere.com/docs/rerank-overview) 都是这一路线的代表。

```python
from sentence_transformers import CrossEncoder

model = CrossEncoder("BAAI/bge-reranker-v2-m3")
pairs = [("如何申请退款", d) for d in candidate_docs]
scores = model.predict(pairs)          # 每对输出一个相关性分数
ranked = sorted(zip(candidate_docs, scores), key=lambda x: -x[1])
```

用标注集比较排序质量：看重排后标准片段是否进入前 k，报告 Recall@k 与平均倒数排名等指标。同时测量精排带来的延迟增量，把它计入端到端延迟，而不是只看排序提升。

交叉编码器式的 Reranker 精度更高但逐个 pair 打分更慢，适合候选较少的场景；对比两阶段与单阶段（只召回不重排）在验证集上的差异，确认精排收益是否值得额外延迟。

## 案例

向量检索的 top-20 里混入了多个相似章节（如不同版本的同名接口说明），初排分数彼此接近，很难靠向量相似度区分。Reranker 对每个 query-document 对做精细打分，把「与当前版本精确匹配的说明」排到最前，答案引用因此更可靠——因为交叉编码器能感知「版本号」这类出现在 query 与文档之间的精确对应关系，而双编码器把两侧分别压缩成向量后这种细粒度匹配信息会被稀释。

具体做法：向量召回 top-20 -> Reranker 重排 -> 取前 5 个片段进上下文。相比直接取 top-5，重排后标准片段进前 5 的比例明显上升，回答里引用到的段落也更准确。量化为 Recall@5 的提升：重排前标准片段常常落在 6 到 20 名之间被截掉，重排后被提到前 5。

需要注意候选不足与延迟两个失败点：召回阶段若标准片段不在 top-20，重排无济于事；重排数量过大又会让端到端延迟不可接受。应先用验证集确定召回数量与精排数量的合理组合，再固定下来——两个数量是相互制约的调参目标，召回太窄重排救不回来，重排太多延迟吃不消。

## 相关主题

- [Hybrid Search](./hybrid-search.md)
- [Context Selection](../paradigm/context-engineering.md#上下文选择)
