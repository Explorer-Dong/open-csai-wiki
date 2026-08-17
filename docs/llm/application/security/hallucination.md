---
title: Hallucination
---

幻觉是模型生成看似可信但缺乏事实依据、与证据矛盾或虚构的信息。幻觉不是模型的「恶意」，而是生成式模型在概率上拼合文本时把流畅性与事实性混淆的自然倾向；在检索、引用、代码等对准确性敏感的场景中需要显式控制。 [Huang 等人 2023 年的综述](https://arxiv.org/abs/2309.01219) 将幻觉细分为「事实性幻觉 (Factuality Hallucination)」与「忠实性幻觉 (Faithfulness Hallucination)」：前者与外部事实不符，后者与给定的上下文或指令不一致。这一区分决定了评测方向——事实性幻觉靠外部知识核验，忠实性幻觉靠「输出是否遵循上下文」核验。 [OWASP Top 10 for LLM Applications](https://genai.owasp.org/2024/11/17/owasp-reveals-2025-top-10-risks-for-llms-new-sponsorship-program/) 也把「Misinformation（错误信息，LLM09）」列为单独风险，与注入、泄露并列。

## 快速开始

**高风险回答要求可核验来源。** 对事实性、引用、数字、代码 API 等高风险回答，要求模型给出可核验来源；检索增强生成 (Retrieval-Augmented Generation, RAG) 场景要求逐项引用检索片段。没有来源支撑的断言应被视为低置信，而非默认接受。RAG 之所以能抑制幻觉，源于 [Lewis 等人 2020 年的工作](https://arxiv.org/abs/2005.11401)：让生成过程显式依赖检索到的外部片段，把「凭参数记忆」变成「依据证据作答」，从而把不可知的开放生成约束到给定证据上。

**无法确认时表达不确定性。** 明确允许模型表达「不知道」或给出置信度，并设定转人工的阈值。把「不确定」当作合法输出，而不是让模型硬凑答案，是降低幻觉率的关键策略之一，也直接影响用户信任。

**建立验证闭环。** 用含已知答案的评测集检验：是否每项断言都有证据、引用是否真实对应来源、是否引入了评测集中不存在的信息。对生成内容做事实核查或一致性校验，把幻觉率纳入上线门槛。忠实性可量化为「有支撑的原子断言占比」，即回答级幻觉率的补集：

$$
\text{Faithfulness}=\frac{\text{有检索片段支撑的原子断言数}}{\text{总原子断言数}},\qquad
\text{Hallucination Rate}=1-\text{Faithfulness}
$$

评测时先把回答拆成原子断言，再逐条判断是否被证据支撑，而不是看整段是否流畅。

## 案例

场景：RAG 问答系统评测。

- 输入：一组问题，对应检索结果已知。
- 关键步骤：要求回答逐项引用检索片段，评测对「引用是否真实」「断言是否有证据支撑」进行判定；无证据的断言记为失败，即使语言流畅也不给高分。
- 预期结果：模型回答被证据约束，幻觉率下降；评测能区分「答对」与「说得像对」。
- 常见失败点与排查：用流畅度或表面相似度打分会把幻觉当正确答案；检索片段与断言脱节未检出。排查时把「引用是否支撑断言」拆成独立评分项，并用人工抽样校准自动评分。

按原子断言计算忠实度的最小实现如下：

```python
def faithfulness(answer, evidence):
    claims = split_into_claims(answer)      # 拆成原子断言
    supported = sum(1 for c in claims if entails(c, evidence))
    return supported / len(claims)
```

其中 `entails` 判断一条断言是否被证据片段蕴含。验证标准是：对含已知答案的样本，忠实度显著高于不接入检索的基线，且未支撑断言能被定位到具体句子。

## 相关主题

- [模型能力评测](../../development/evaluation/index.md)
- [AI Search](../forms/ai-search.md)
