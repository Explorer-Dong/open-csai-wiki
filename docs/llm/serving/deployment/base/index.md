---
title: 部署基础
---

## 独立专题

- [OpenAI-compatible API](./openai-compatible-api.md)
- [Request Scheduling](./request-scheduling.md)
- [Load Balancing](./load-balancing.md)
- [Autoscaling](./autoscaling.md)
- [Monitoring](./monitoring.md)
- [Fault Tolerance](./fault-tolerance.md)

模型服务把推理引擎包装成可鉴权、可调度、可扩缩、可观测且能容错的在线系统。

## 快速开始

最小服务需要 OpenAI-compatible API、请求校验、并发限制、超时、健康检查和指标。生产环境再加入负载均衡、自动扩缩容、灰度发布与故障转移。

## 请求链路

```text
客户端 -> API 网关 -> 鉴权与限流 -> 路由/调度 -> 推理副本 -> 流式响应
                                      -> 指标、日志与追踪
```

API 兼容不能只比较路径名称，还要验证 Messages、流式事件、工具调用、错误码、Token 统计和取消语义。

## 调度与负载均衡

请求调度 (Request Scheduling) 与负载均衡 (Load Balancing) 分别解决副本内部的计算编排和副本之间的流量分配。轮询无法感知请求长度和 KV Cache 占用。更合理的路由会结合排队长度、预计 Token 数、缓存命中和副本健康状态。请求进入单个副本后，推理调度器再通过连续批处理组合不同阶段的序列。

## 自动扩缩容

自动扩缩容 (Autoscaling) 根据负载增减可用副本。仅以 GPU 利用率扩缩容可能过慢或误判。应同时关注排队时间、运行序列数、KV Cache 使用率、TTFT 与请求到达率。模型加载耗时很长时，需要预热副本并保留合理冗余。

## 监控与容错案例

监控 (Monitoring) 负责暴露服务状态，容错 (Fault Tolerance) 负责在组件失败时隔离故障并恢复服务。若 P95 TTFT 上升但 TPOT 稳定，问题更可能出在排队或 Prefill；若 TPOT 和显存带宽同时恶化，应检查批处理、缓存或硬件。系统应记录请求 ID、模型版本、Token 数、延迟和错误分类，但对 Prompt 与输出进行脱敏或默认不记录正文。

发布新模型时先用少量流量灰度，比较质量、错误率和延迟；指标异常则将新请求切回旧版本，而不是让正在流式输出的请求跨版本迁移。
