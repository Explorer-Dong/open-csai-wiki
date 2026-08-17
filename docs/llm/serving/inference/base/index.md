---
title: 推理基础
---

## 独立专题

- [自回归推理](./autoregressive-inference.md)
- [Prefill](./prefill.md)
- [Decode](./decode.md)
- [KV Cache](./kv-cache.md)
- [Sampling](./sampling.md)

大语言模型推理按自回归方式逐 Token 生成。理解 Prefill、Decode、KV Cache 和 Sampling，是分析延迟、显存与吞吐的基础。

## 快速开始

一次请求分为两个阶段：Prefill 并行处理全部输入 Token，产生首个输出和各层 KV Cache；Decode 每轮读取 Cache 并生成一个新 Token，直到停止条件触发。

```text
Prompt -> Prefill -> KV Cache -> Decode -> 新 Token -> Decode -> ... -> EOS
```

## Prefill 与 Decode

Prefill 需要计算整段输入的 Attention，通常计算密集；Decode 每步只输入最新 Token，但要读取所有历史 KV Cache，通常更受显存带宽限制。长输入主要增加首 Token 时间，长输出则持续增加逐 Token 延迟和缓存占用。

## KV Cache

自注意力每层都会产生 Key 与 Value。若每轮重新计算全部历史，成本会快速增长。KV Cache 保存历史结果，让 Decode 只计算新 Token。简化的缓存容量与层数、序列长度、KV Head 数、Head Dim、数据类型字节数和批量大小成正比。

例如同时增加上下文长度和并发数，会成倍增加缓存占用。分组查询注意力 (Grouped-Query Attention, GQA) 和多查询注意力通过减少 KV Head 数降低容量。

## Sampling

模型输出 Logits 后，解码器可使用 Greedy、Temperature、Top-k、Top-p 等策略选择下一个 Token。Temperature 越低，分布越集中；Top-p 只保留累计概率达到阈值的候选。固定随机种子也不一定保证跨硬件和框架完全复现。

## 停止条件

生成在 EOS、Stop Sequence、最大输出长度或外部取消时终止。服务端应限制最大上下文与输出长度，并在客户端断开后及时取消计算，避免无效资源消耗。
