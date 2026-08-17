---
title: 模型服务
---

模型服务关注如何把训练完成的权重转换成稳定、低延迟且成本可控的在线服务。其依赖关系是“推理原理 -> 单机优化 -> 模型压缩与分布式推理 -> 服务化 -> 性能与安全”。

## 快速开始

一次自回归请求通常经历以下过程：

```text
请求进入 -> 调度与批处理 -> Prefill -> Decode -> 流式返回 -> 指标与日志记录
```

先区分 Prefill 和 Decode，再理解 KV Cache 与采样策略。随后可阅读 [vLLM](./inference/frameworks/vllm.md)，观察 PagedAttention、连续批处理和 OpenAI-compatible API 如何落到推理框架中。

## 内容地图

| 主题 | 主要内容 | 学习重点 |
| :-- | :-- | :-- |
| [推理原理](./inference/index.md) | 自回归推理、Prefill、Decode、KV Cache 与 Sampling | 延迟和显存消耗来自哪里 |
| [推理优化](./inference/optimization/index.md) | FlashAttention、PagedAttention、连续批处理、Prefix Caching、Chunked Prefill、投机解码与 CUDA Graph | 如何提高吞吐并降低延迟 |
| [模型压缩](./compression/index.md) | 量化、蒸馏与剪枝 | 精度、显存和速度的权衡 |
| [分布式推理](./inference/distributed/index.md) | 张量并行、流水线并行、专家并行、Prefill 与 Decode 分离 | 单机无法容纳模型时如何切分计算 |
| [推理框架](./inference/frameworks/index.md) | vLLM、SGLang、TensorRT-LLM 与 llama.cpp | 框架适用范围与部署方式 |
| [模型服务](./deployment/base/index.md) | OpenAI-compatible API、请求调度、负载均衡、自动扩缩容、监控与容错 | 将推理引擎变成可靠服务 |
| [部署性能](./deployment/performance/index.md) | 首 Token 时间 (Time to First Token, TTFT)、每 Token 输出时间 (Time per Output Token, TPOT)、吞吐、并发与成本 | 使用可比较的指标评估系统 |
| [部署安全](./deployment/security/index.md) | API 鉴权、权限控制、模型窃取、拒绝服务、资源滥用、日志审计与多租户隔离 | 限制访问并保留可追溯性 |
