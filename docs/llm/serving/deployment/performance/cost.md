---
title: Cost
---

部署成本包括 GPU、CPU、存储、网络、空闲容量与运维成本，应与质量和 SLO 一同决策。只算「每 token 单价」会漏掉大量真实开销，正确的成本口径应落到「每个成功完成的任务」或「每个满足 SLO 的请求」上，并纳入空闲、重试和缓存命中带来的摊销差异。

## 快速开始

先明确成本的计算对象：按有效输入 token、有效输出 token、请求数以及最终成功任务分别统计，而不是混用。有效 token 指真正参与推理并产生价值的 token，重试产生的重复 token、被丢弃的格式错误输出都应单独归类，避免被摊进正常单价。

按 token 计价的标准模型可以写成输入与输出两部分的线性组合：

$$
C = n_{\text{in}}\cdot p_{\text{in}} + n_{\text{out}}\cdot p_{\text{out}}
$$

其中 $n_{\text{in}}$、$n_{\text{out}}$ 是计入计费的输入、输出 token 数，$p_{\text{in}}$、$p_{\text{out}}$ 是各自的单价。前缀缓存命中时，输入 token 常按更低价格计费，因此同一个请求的输入成本会随缓存命中率变化，这是「同模型、同请求，成本却不同」的常见来源。

把隐性成本也纳入同一张表：GPU 空闲时段的租用费、失败重试消耗的算力、KV Cache 命中率带来的减免、网络出流量、以及模型加载与扩缩容带来的额外时间成本。只有把这些项都计进去，才能比较「换更便宜的量化模型」和「保持原模型但提高利用率」这两种方案的真实收益。其中「有效成本」应除以成功任务数而非总请求数：

$$
C_{\text{task}}=\frac{C_{\text{total}}}{N_{\text{success}}}
$$

$C_{\text{total}}$ 是所有算力、带宽与运维成本之和，$N_{\text{success}}$ 是满足质量要求并成功交付的任务数。重试与失败会同时抬高分子、压低分母，因此对 $C_{\text{task}}$ 的冲击远大于对每 token 单价的影响。

建议先建立一个基线：固定一个基准模型与基准并发，记录每个成功任务的总成本；之后任何优化（量化、批处理调参、缓存、扩缩容策略）都以「每个成功任务成本的变化」为准，而不是只看每 token 成本是否下降。可以用下面这类最小脚本持续记录两个口径，避免优化过程中「每 token 更便宜、每任务更贵」的错觉：

```python
def record(metrics):
    total_cost = metrics["gpu_cost"] + metrics["network_cost"]
    per_token = total_cost / max(metrics["effective_tokens"], 1)
    per_task = total_cost / max(metrics["successful_tasks"], 1)
    return {"per_token": per_token, "per_task": per_task}
```

## 案例

某团队把模型换成量化版本后，单卡能承载的并发更高，单 token 成本看起来下降明显。但上线后输出格式错误率上升，客户端重试增多，导致有效任务的成功率下降、重复算力消耗增加。

重新按「每个成功任务成本」核算后，发现量化带来的单 token 节省被重试和失败率抵消，整体成本反而接近甚至超过原模型。这说明成本评估必须和质量指标绑定：格式错误、拒答、超长输出都会把「便宜」变成「贵」。可以参考 [kubernetes-sigs/inference-perf 的 goodput 讨论](https://github.com/kubernetes-sigs/inference-perf/blob/main/docs/goodput.md)，它把「有效完成的请求」与「总请求」区分开，正是任务口径成本所需的分子。

最终方案是保留量化模型，但在请求侧加强输出约束与后处理校验，降低格式失败率后再对比。结论是：成本决策的最终单位是「成功交付的任务」，不是 token；任何降本手段都要同时观察成功率和重试率这两个质量信号。

## 相关主题

- [量化](../../compression/quantization.md)
- [吞吐](./throughput.md)
