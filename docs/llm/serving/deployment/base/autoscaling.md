---
title: Autoscaling
---

自动扩缩容根据负载调整推理副本数量，以平衡成本和延迟。与无状态 Web 服务不同，推理副本的启动与就绪代价很高，因此扩缩容策略必须显式处理「滞后」与「抖动」，否则会在需要扩容时来不及、不需要时又白白多跑副本。

## 快速开始

选对扩缩容信号是关键。常用信号包括队列中的 token 数、p95 TTFT、GPU 利用率、以及「副本从启动到就绪」的耗时。单一信号容易误判：只看 GPU 利用率，可能在请求已大量排队、延迟恶化时仍不触发扩容，因为 GPU 利用率高不等于队列已经排空。

Kubernetes 的原生水平扩缩容 (Horizontal Pod Autoscaler, HPA) 按「当前指标值与目标值的比值」计算期望副本数，可参考 [Kubernetes HPA 官方文档](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)：

$$
\text{desiredReplicas}=\left\lceil \text{currentReplicas}\times\frac{\text{currentMetricValue}}{\text{desiredMetricValue}}\right\rceil
$$

这个比值式算法天然存在滞后：只有当指标越过目标一段时间后副本数才追上负载。对推理服务而言，更重要的是把「副本就绪耗时」计入触发时机，否则公式算出的副本数是「未来才可用」的，无法在 SLO 破掉前接住流量。

先在压测环境验证扩缩容抖动：模拟负载缓慢爬升，观察扩容阈值、触发频率、副本就绪时间与缩容冷却时间是否匹配。目标是在延迟 SLO 被打破之前把新副本就绪，而不是等 SLO 破了才启动副本。HPA 的 `behavior` 字段可以为扩容/缩容分别设置稳定窗口与步长策略，例如：

```yaml
behavior:
  scaleUp:
    stabilizationWindowSeconds: 60
    policies:
      - type: Pods
        value: 2
        periodSeconds: 60
  scaleDown:
    stabilizationWindowSeconds: 300
    policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

为缩容设置冷却窗口和最小副本数，避免负载抖动导致频繁「扩容-缩容-再扩容」。推理副本频繁重启的代价很高：每次都要重新加载权重、重建 KV Cache 分配，这段「冷启动」期间副本无法服务流量。

## 难点

模型加载慢、权重文件大，使扩容存在明显滞后。一个新副本从拉取镜像、加载权重到显存就绪可能耗时数分钟，这段时间里负载可能已经回落，扩出来的副本反而闲置；反过来，负载陡增时副本迟迟不就绪，队列持续积压。

KV Cache 不可直接迁移是另一大难点。无状态服务的流量可以随时重新分配，但推理请求的 KV Cache 通常绑定在正在处理的副本上，直接把它搬到新副本成本很高甚至不可行。因此扩缩容更适合「按新请求分流」，而不是「迁移进行中的请求」。这也是为何缩容时通常先摘流、等请求自然结束，再真正回收副本。

只看 GPU 利用率作为信号往往不可靠：当利用率已经接近 100% 时，队列可能早已严重恶化。更稳的做法是以「队列长度或排队延迟」为主信号，GPU 利用率作为辅助参考，并在扩容后验证新副本是否真正接住了流量。对于需要自定义指标的场景，可以用 [KEDA](https://keda.sh/docs/) 的 `ScaledObject` 直接消费 Prometheus 指标作为触发器，例如用「排队 token 数」驱动扩缩：

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: llm-scaler
spec:
  scaleTargetRef:
    name: llm-deployment
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus.monitoring.svc:9090
        metricName: queue_tokens
        query: sum(llm_queue_tokens)
        threshold: "1000"
```

其中 `threshold` 即期望副本数公式里的目标值，`query` 是触发信号，参数细节以 [KEDA Prometheus 触发器文档](https://keda.sh/docs/2.9/scalers/prometheus/) 为准。

## 案例

某服务以队列 token 长度为信号：当队列长度持续超过阈值一段时间后，触发预热新副本，新副本加载权重并完成健康检查、真正就绪后，才由负载均衡器把新流量切过去，避免把请求打到尚未就绪的实例上。

低峰期则延迟缩容并保留一个最小暖池：缩容不是立即下线，而是先停止分配新请求，等正在处理的请求自然完成后才回收，同时保留少量常驻副本承接突发流量，减少冷启动次数。

验证时对比扩容前后的 p95 TTFT 与队列长度，确认扩容确实在 SLO 被打破前生效。可以用「扩容触发到就绪」的时间是否小于「负载爬升到 SLO 临界」的时间作为验收标准。结论是推理服务扩缩容的核心是「让副本在延迟恶化前就绪」，为此必须把模型加载时间纳入触发时机，而不是把它当作可以忽略的细节。

## 相关主题

- [Kubernetes](../../../infrastructure/index.md)
- [负载均衡](./load-balancing.md)
