---
title: 模型推理
icon: lucide/fast-forward
---

模型推理是把固定的模型参数转换为逐 token 输出的过程。它既包括自回归计算本身，也包括 KV Cache、采样、批处理和显存管理等运行时机制。理解这些机制后，才能判断一次请求的延迟来自排队、Prefill、Decode 还是网络返回。

## 快速开始

一次文本生成请求可以抽象为：

```text
输入 token
    -> Prefill（计算完整输入的隐藏状态）
    -> KV Cache（保存历史键值）
    -> Decode（逐步生成新 token）
    -> Sampling（选择下一个 token）
    -> 流式返回
```

先用单请求、固定输入和固定随机种子验证输出，再逐步加入连续批处理、Prefix Caching 和多卡并行。排查性能时同时记录输入长度、输出长度、并发数、TTFT 和 TPOT，不要只比较总耗时。

## 推理过程

模型先通过 [自回归推理](./base/autoregressive-inference.md) 处理输入。输入阶段通常称为 Prefill，适合并行计算但会产生较大的瞬时算力和显存压力；生成阶段称为 Decode，每次只追加一个或少量 token，通常更容易受到显存访问、调度和通信影响。具体的 [Prefill](./base/prefill.md) 与 [Decode](./base/decode.md) 行为应分别测量。

历史 token 的 Key 和 Value 保存在 [KV Cache](./base/kv-cache.md) 中，避免每一步重新计算整个前缀。缓存大小与层数、KV 头数、头维度、序列长度和数据类型有关，因此长上下文和高并发会直接消耗显存。缓存管理还要处理分页、复用、淘汰和租户隔离。

## Sampling 与可复现性

Greedy、Temperature、Top-k、Top-p 和重复惩罚会改变生成分布。调试时固定模型版本、Tokenizer、采样参数和随机种子；线上则记录这些配置以及请求 ID。需要确定性输出时不要只设置 temperature，还要确认服务端是否启用了随机采样、并行归约或其他非确定性算子。完整参数见 [Sampling](./base/sampling.md)。

## 性能拆解

| 阶段 | 主要成本 | 常见指标或优化 |
| :-- | :-- | :-- |
| 排队 | 调度器等待和批处理策略 | 并发、队列长度、请求调度 |
| Prefill | 输入 token 的注意力与前馈计算 | Chunked Prefill、FlashAttention |
| Decode | 每步生成、KV Cache 读写和通信 | PagedAttention、投机解码 |
| 返回 | 网络、序列化和流式刷新 | 输出缓冲、连接复用 |

推理侧的优化专题见 [推理优化](./optimization/index.md)。当模型无法放入单卡时，再根据模型结构和负载选择 [分布式推理](./distributed/index.md)；框架选型可从 [推理框架](./frameworks/index.md) 开始。

## 案例：定位首 token 延迟

如果用户感觉“开始回答很慢”，先分别记录请求进入时间、调度开始时间、Prefill 完成时间和首 token 返回时间。排队时间过长说明并发或批处理策略有问题；Prefill 占比过高说明输入过长或前缀缓存未命中；计算已完成但首 token 仍晚到，则应检查序列化、网络和流式刷新。

## 相关主题

- [推理优化](./optimization/index.md)
- [分布式推理](./distributed/index.md)
- [推理框架](./frameworks/index.md)
