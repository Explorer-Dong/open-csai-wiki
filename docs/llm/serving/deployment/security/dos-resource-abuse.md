---
title: DoS 与资源滥用
---

拒绝服务 (Denial of Service, DoS) 与资源滥用通过超长请求、高并发或昂贵参数耗尽服务资源。与传统流量洪泛不同，针对 LLM 服务的滥用往往用合法请求放大计算成本，例如超长上下文、高频重复生成或频繁调用昂贵工具。

这类攻击之所以有效，源于推理的成本不对称：prefill 阶段的自注意力计算量随序列长度平方增长，decode 阶段每生成一个 token 都要读整段 KV Cache，长上下文还会线性占用显存。攻击者只需提交一个超长输入，就能让单个请求消耗远超普通请求的算力与显存，相当于用合法请求实现放大。OWASP 将这种「缺少对资源消耗的上限约束」列为 [API4:2023 不受限制的资源消耗](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/)。

## 快速开始

在网关与推理层都实施限额，形成多层防护：网关层限制请求速率、并发连接数和单请求体大小；推理层限制输入与输出 token 数、max_tokens 上限、工具调用次数与耗时，以及单请求预算。

**令牌桶是速率限制的基础算法**，它允许短时突发、同时约束长期平均速率。桶以速率 $r$ 补充令牌、以容量 $b$ 封顶：

$$
c_{i+1}=\min\bigl(b,\ c_i + r\cdot\Delta t\bigr)
$$

其中 $c$ 为当前令牌数、$\Delta t$ 为距上次请求的间隔。每个请求按成本消耗令牌，令牌不足即拒绝或排队。一个按成本计费的实现如下：

```python
import time

class TokenBucket:
    def __init__(self, rate: float, capacity: float):
        self.rate = rate          # 每秒补充令牌数
        self.capacity = capacity  # 桶容量，决定允许的突发
        self.tokens = capacity
        self.last = time.monotonic()

    def allow(self, cost: float = 1.0) -> bool:
        now = time.monotonic()
        self.tokens = min(self.capacity, self.tokens + self.rate * (now - self.last))
        self.last = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False  # 触发限流：返回 429 或入队等待
```

其中 `cost` 不是固定为 1，而应按请求的实际代价计费（如 token 数、工具调用次数），否则攻击者可用「少次但昂贵」的请求绕过按次限流。

对「昂贵参数」要单独设限：长上下文、高 beam、多次采样、开启推理链都会放大显存与算力消耗。可以按租户设置 token 配额和预算，超过阈值时拒绝或排队，而不是让单个请求独占资源。

同时区分软限制与硬限制：软限制用于保护系统，触发后降级或排队；硬限制用于隔离恶意流量，触发后直接拒绝并告警。限额应可观测，把触发次数与被拒请求占比纳入监控。

验证：构造超长上下文或高并发请求，确认服务按配额拒绝且不拖垮其他租户；观察延迟与错误率是否保持在 SLO 内。

## 案例

一个租户发送超长上下文，把 KV Cache 打到接近上限，导致其他请求排队或失败。服务在推理层按 token 配额识别该请求超限，直接拒绝并返回明确的限流错误，同时为该租户保留容量、不影响其他租户的 KV Cache 分配。

KV Cache 是显存中的关键共享资源，超长请求会线性占用显存。方案通过预分配每租户的 KV Cache 上限和 token 预算，让单个租户的突发流量最多耗尽自己的份额，而非整块显存。

具体做法是双层预算：令牌桶约束请求速率，token 预算约束单请求与累计消耗。前者用上面的公式每请求求值，后者在 prefill 前估算 `input_tokens + max_tokens` 并检查是否超过租户余额。这样「高并发短请求」被令牌桶拦截，「低频超长请求」被 token 预算拦截，两者都不能放大为资源耗尽。

常见失败点：只在网关限流、推理层无预算控制；未限制 max_tokens 导致单请求生成无限长；工具调用时长无上限。排查方向是观察显存占用与每请求 token 数，定位是哪一类参数导致放大。

## 相关主题

- [Concurrency](../performance/concurrency.md)
- [Fault Tolerance](../base/fault-tolerance.md)
