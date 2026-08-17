---
title: TPOT
---

每输出 token 时间 (Time Per Output Token, TPOT) 衡量流式生成阶段的速度。它关注的是第一个 token 之后、逐 token 生成阶段的节奏，也就是用户看到内容「持续往外冒」的快慢；单位通常是 ms/token，数值越小表示流式输出越流畅。

## 快速开始

在固定输入长度和不同并发档位下测量 TPOT，并明确排除首 token 之前的时间，避免把 TTFT 混入。TPOT 只统计第一个生成 token 之后到最后一个生成 token 之间的时间除以输出 token 数，prefill、排队和网络建连都不应计入。

TPOT 的严格定义是：

$$
\text{TPOT}=\frac{t_{\text{last}}-t_{\text{first}}}{n_{\text{out}}-1}
$$

其中 $t_{\text{first}}$ 是收到第一个生成 token 的时刻，$t_{\text{last}}$ 是收到最后一个生成 token 的时刻，$n_{\text{out}}$ 是输出 token 总数。分母用 $n_{\text{out}}-1$ 是因为「$n_{\text{out}}$ 个 token 之间有 $n_{\text{out}}-1$ 个生成间隔」。它与 inter-token latency (ITL) 描述的是同一段区间，只差在 ITL 常按相邻 token 逐对计算再取平均；两者单位都是 s/token 或 ms/token，可参考 [kubernetes-sigs/inference-perf 的指标定义](https://github.com/kubernetes-sigs/inference-perf/blob/main/docs/metrics.md)。

测量时按 p50 和 p95 分别报告，因为尾延迟往往由 decode 批处理的不均匀性造成。同一批里不同请求的输出长度不同，先结束的请求会「空出」槽位，导致仍在生成的请求感受到的每步计算时间波动，p95 TPOT 能捕捉这种抖动。

单条流的 TPOT 与它的 decode 吞吐互为倒数：

$$
T_{\text{out}}=\frac{1}{\text{TPOT}}
$$

其中 TPOT 以 s/token 计。这个关系只对单条流成立；引擎整体 decode 吞吐还要再乘上批次大小，因此「TPOT 变差」与「整体吞吐上升」可以同时发生，二者不是一回事。

排查 TPOT 恶化时，先确认是否把 TTFT 或 prefill 时间算进去了。流式接口下客户端按 token 到达间隔统计最容易引入这类误差，服务端应以「decode 阶段每个 token 的调度与计算间隔」为准口径，两端要对齐定义再下结论。可以参考 [ClickHouse 对 LLM 推理延迟指标的讨论](https://clickhouse.com/resources/engineering/llm-inference-latency) 确认各指标边界。

## 案例

某服务并发升高后 TPOT 明显恶化，但 TTFT 变化不大。检查发现 decode batch 变大导致单步矩阵计算时间上升，同时 [KV Cache](../../inference/base/kv-cache.md) 接近上限引发频繁的显存回收与重算，多卡部署下还叠加了通信开销。

decode 每生成一个 token 就要完整走一遍模型前向，因此在权重规模固定时，单步时间主要由「读取权重 + 读取 KV Cache + 张量并行通信」的访存与通信决定，而非算力是否打满。可以用下面这段伪代码区分瓶颈来源：

```python
def decode_step_cost(batch_size, kv_bytes, comm):
    weight_time = weight_bytes / memory_bw          # 读权重，随 batch 增加而摊薄
    kv_time = batch_size * kv_bytes / memory_bw     # 读 KV，随 batch 线性增长
    return max(weight_time, kv_time) + comm         # 二者取瓶颈者，再加通信
```

当 `kv_time` 主导时，说明是 KV Cache 读取代价或显存压力在拖慢单步，而不是计算不足。

定位到瓶颈在 decode 阶段后，团队只优化 prefill（例如降低输入长度、加快 prompt 处理）并没能解决问题，因为 decode 的每步计算并未改变。正确方向是控制 decode batch 上限、优化 KV Cache 管理（例如 [PagedAttention](../../inference/optimization/pagedattention.md) 减少显存碎片与重算）或检查张量并行下的通信。

调整后重新测量，确认 p95 TPOT 回到目标区间，同时观察总吞吐是否下降。结论是 TPOT 和 TTFT 是相互独立的指标，各自对应不同的计算阶段与优化手段，定位性能问题前必须先分清是哪个阶段在拖慢。

## 相关主题

- [Decode](../../inference/base/decode.md)
- [TTFT](./ttft.md)
