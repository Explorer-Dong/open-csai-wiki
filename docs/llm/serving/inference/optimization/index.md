---
title: 推理优化
---

## 独立专题

- [FlashAttention](./flashattention.md)
- [PagedAttention](./pagedattention.md)
- [Continuous Batching](./continuous-batching.md)
- [Prefix Caching](./prefix-caching.md)
- [Chunked Prefill](./chunked-prefill.md)
- [Speculative Decoding](./speculative-decoding.md)
- [CUDA Graph](./cuda-graph.md)

推理优化分别处理 Attention Kernel、KV Cache 管理、请求批处理、重复前缀和解码串行性。

## 快速开始

先用真实请求分布测量 TTFT、TPOT、吞吐和显存，再定位瓶颈。长 Prompt 优先关注 FlashAttention 与 Chunked Prefill；高并发关注 PagedAttention 和 Continuous Batching；重复系统提示关注 Prefix Caching；Decode 受限时评估 Speculative Decoding。

## 核心方法

| 方法 | 解决的问题 | 代价或约束 |
| :-- | :-- | :-- |
| FlashAttention | 减少 Attention 中间数据的显存读写 | 依赖适配的 Kernel 与形状 |
| PagedAttention | 降低 KV Cache 碎片和预留浪费 | 引入分页元数据管理 |
| Continuous Batching | 请求结束后立即补入新请求 | 调度更复杂 |
| Prefix Caching | 复用相同前缀的 KV Cache | 需要命中相同 Token 序列 |
| Chunked Prefill | 将超长 Prefill 切片调度 | 可能增加单请求完成时间 |
| Speculative Decoding | 一次验证多个候选 Token | 需要草稿模型或并行候选机制 |
| CUDA Graph | 减少重复 Kernel Launch 开销 | 图形状和内存地址需相对稳定 |

## 调度案例

一个长 Prompt 的 Prefill 若独占 GPU，会阻塞其他请求的 Decode，导致 TPOT 抖动。Chunked Prefill 把它切成多个片段，与已有请求的 Decode 交错执行，从而改善尾延迟，但该长请求自身需要更多调度轮次。

## 优化顺序

1. 固定模型、精度、输入输出长度和并发分布；
2. 确认算子与硬件利用率；
3. 优化缓存分配和批处理；
4. 再评估前缀复用、投机解码等依赖工作负载的方法；
5. 用准确率回归与压力测试验证结果。

优化不能只报告峰值吞吐，还应报告 P50、P95、P99 延迟、失败率和资源利用率。
