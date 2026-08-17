---
title: 分布式推理
---

## 独立专题

- [Tensor Parallel](./tensor-parallel.md)
- [Pipeline Parallel](./pipeline-parallel.md)
- [Expert Parallel](./expert-parallel.md)
- [Prefill 与 Decode 分离](./prefill-decode-disaggregation.md)

分布式推理在模型无法放入单卡或单机吞吐不足时，把权重、层、专家或推理阶段切分到多个设备。

## 快速开始

模型层能放入单卡但整体权重过大时，优先考虑 Tensor Parallel；设备跨越慢速链路时应谨慎扩大并行组。MoE 模型需要 Expert Parallel。大规模在线服务可将 Prefill 与 Decode 分离，并分别按输入和输出负载扩缩容。

## 并行方式

| 方法 | 切分方式 | 关键瓶颈 |
| :-- | :-- | :-- |
| Tensor Parallel | 切分层内矩阵 | 高频集合通信 |
| Pipeline Parallel | 将不同层放到不同设备 | 流水线气泡与阶段不均衡 |
| Expert Parallel | 将 MoE 专家分布到设备 | Token 路由与 All-to-All |
| Prefill / Decode 分离 | 两阶段使用独立实例 | KV Cache 传输与路由 |

## Tensor Parallel 案例

两张 GPU 可分别保存线性层权重的一部分，各自计算局部结果后通过 All-Reduce 或 All-Gather 合并。它减少单卡权重，但每层都会通信，因此同机 NVLink 环境与跨机以太网环境的收益可能完全不同。

## Prefill / Decode 分离

Prefill 偏计算密集，Decode 偏显存带宽且持续时间长。分离后可使用不同实例类型和扩缩容策略，但必须把新请求路由到 Prefill 节点，再将 KV Cache 和请求状态交给 Decode 节点。缓存传输成本和故障恢复是核心约束。

## 容错

并行组中任一 rank 失败通常会使整个副本失效。服务层应按副本隔离并行组，设置健康检查和请求重试；有状态流式请求重试时要防止重复输出或重复计费。
