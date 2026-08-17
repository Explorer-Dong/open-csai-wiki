---
title: 模型部署
icon: lucide/globe-check
---

模型部署把推理引擎包装成可访问、可扩展、可观测和可恢复的服务。部署层不改变模型训练目标，但会决定请求如何排队、如何路由、何时扩容，以及故障和权限问题如何被发现与处置。

## 快速开始

一个最小在线服务至少包含以下链路：

```text
客户端 -> API 鉴权 -> 请求校验 -> 调度与批处理
       -> 推理引擎 -> 流式或非流式响应
       -> 指标、日志、追踪与审计
```

先在固定模型和固定并发下验证 [部署基础](./base/index.md)，再配置负载均衡、自动扩缩容和故障恢复。上线前建立 [部署性能](./performance/index.md) 基线，并按 [部署安全](./security/index.md) 检查鉴权、权限、资源滥用和多租户隔离。

## 服务边界

服务端应校验模型名、输入格式、最大上下文、最大输出和流式参数，不应把客户端传入的任意字段直接传给推理引擎。对外 API 需要返回稳定的错误结构和 request ID；内部日志则记录模型版本、Tokenizer 版本、调度配置、资源和耗时。

部署基础包括 [OpenAI-compatible API](./base/openai-compatible-api.md)、[Request Scheduling](./base/request-scheduling.md)、[Load Balancing](./base/load-balancing.md)、[Autoscaling](./base/autoscaling.md)、[Monitoring](./base/monitoring.md) 和 [Fault Tolerance](./base/fault-tolerance.md)。这些组件之间有依赖关系：调度器影响吞吐，负载均衡决定实例利用率，监控和故障转移为扩缩容提供依据。

## 性能与容量

容量规划不能只看 GPU 利用率。至少要在代表性输入输出长度和并发下记录 TTFT、TPOT、吞吐、排队时间、错误率和单位成本。短请求与长上下文混合时，平均值可能掩盖尾延迟，因此还应报告 p50、p95 和 p99，并保留压测配置。

部署性能页按指标展开 [TTFT](./performance/ttft.md)、[TPOT](./performance/tpot.md)、[Throughput](./performance/throughput.md)、[Concurrency](./performance/concurrency.md) 和 [Cost](./performance/cost.md)。如果目标是提升有效完成量，还要把重试、拒答、格式错误和超时纳入 goodput 统计。

## 安全与可靠性

公开服务默认拒绝未认证请求，并对模型、租户、工具和资源设置最小权限。日志应避免记录完整提示词、个人信息和密钥；需要审计时保存脱敏后的摘要、哈希和关联 ID。对拒绝服务、模型窃取、提示词泄露和租户间缓存污染分别设置限流、配额、告警和隔离策略。

故障恢复要区分实例故障、模型加载失败、上游依赖失败、GPU OOM 和请求超时。健康检查不能只确认进程存活，还应验证模型已加载、关键依赖可用以及一个小请求能够完成。恢复动作应可重复，避免重试造成重复计费或状态副作用。

## 发布案例

发布一个新模型时，先以小流量实例验证模型版本、输出格式和核心指标，再逐步扩大流量。每次变更记录镜像、权重、配置和路由版本；当错误率、延迟或质量指标越过阈值时自动停止扩大流量，并保留旧版本作为回滚目标。

## 相关主题

- [部署基础](./base/index.md)
- [部署性能](./performance/index.md)
- [部署安全](./security/index.md)
