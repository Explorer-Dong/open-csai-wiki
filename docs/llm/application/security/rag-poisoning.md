---
title: RAG Poisoning
---

RAG 投毒通过污染索引、文档或元数据，使检索和生成系统引用错误或恶意内容。攻击者不直接攻击模型，而是操纵知识库，让系统在回答时「有据可依」地输出错误结论或夹带指令。 [OWASP Top 10 for LLM Applications](https://genai.owasp.org/2024/11/17/owasp-reveals-2025-top-10-risks-for-llms-new-sponsorship-program/) 把它映射到 LLM04「Data and Model Poisoning（数据与模型投毒）」与 LLM08「Vector and Embedding Weaknesses（向量与嵌入弱点）」：前者关注训练、微调或嵌入数据被操纵，后者关注 RAG 流水线中向量化与检索环节的弱点。RAG 系统之所以脆弱，是因为检索本质是「最近邻召回」——攻击者只要让恶意文档在语义空间中贴近高频查询，就能稳定挤进上下文窗口。

## 快速开始

**控制入库权限。** 只允许可信来源入库，记录每篇文档的来源、版本与责任方；对抓取内容做来源信誉评估，限制低信誉内容的入库权重。入库环节是最重要的防线，投毒一旦进入索引，后续每个回答都可能被污染。

**扫描与去重。** 对入库文档扫描异常重复、关键词堆砌与隐藏指令文本；用去重和相似度检测降低重复投毒的影响，用 rerank 在检索后按权威性与相关性重排，压缩堆砌文档的排名空间。向量检索的召回由相似度决定：

$$
\mathrm{sim}(q,d)=\frac{q\cdot d}{\lVert q\rVert\,\lVert d\rVert}
$$

攻击者堆砌关键词，本质是在拉高恶意文档 $d$ 与查询 $q$ 的余弦相似度。为压制这种操纵，rerank 阶段可以引入来源信誉作为第二排序信号：

$$
\mathrm{score}(d)=w_1\cdot\mathrm{sim}(q,d)+w_2\cdot\mathrm{trust}(d)
$$

其中 $\mathrm{trust}(d)$ 是文档来源信誉，$w_1$、$w_2$ 为权重；信誉低的内容即便相似度高也会被压低。入库前的异常检测可以写成最小规则：

```python
def suspicious(doc):
    dup = 1 - len(set(doc.tokens)) / len(doc.tokens)  # 重复度
    return dup > 0.6 or doc.source_trust < 0.3
```

**显示引用与支持撤销。** 回答必须显示引用来源，便于定位投毒文档；建立撤销索引的机制，发现污染后能下线对应文档。验证方式：注入投毒样本，确认其召回权重下降、被下线，且回答不采用其内容。

## 案例

场景：攻击文档通过关键词堆砌被频繁召回。

- 输入：一篇堆砌高频关键词、夹带错误结论的文档进入索引。
- 关键步骤：来源信誉评估降低其权重，去重与相似度检测发现异常重复，rerank 后其排名下降；确认后下线该文档。
- 预期结果：投毒文档召回率下降并被移除，生成回答不再引用其内容。
- 常见失败点与排查：无来源信誉、无去重，导致堆砌文档长期霸榜；或只下线文档但未重新生成已缓存回答。排查时检查检索排序、去重策略与下线后的索引一致性。

## 相关主题

- [模型能力评测](../../development/evaluation/index.md)
- [Vector Search](../build/rag/vector-search.md)
