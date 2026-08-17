---
title: Throughput
---

吞吐量表示单位时间完成的请求、输入 token 或输出 token 数，必须说明统计口径。常见口径有「请求/s」「输入 token/s」「输出 token/s」「总 token/s」四种，它们衡量的是不同阶段的负载，直接对比不同口径的数字没有意义，因此每次报告都必须注明统计区间与对象。

## 快速开始

同时报告输入 token/s、输出 token/s 和总 token/s，并给出对应时间段内的并发度、延迟分位数（p50/p95）和请求长度分布。因为 prefill 阶段与 decode 阶段的算力特征不同，输入 token/s 与输出 token/s 通常差异很大，只报总 token/s 会掩盖这种差异。

三种 token 吞吐可以这样定义：

$$
T_{\text{in}}=\frac{N_{\text{prompt}}}{\Delta t_{\text{prefill}}},\qquad
T_{\text{out}}=\frac{N_{\text{output}}}{\Delta t_{\text{decode}}},\qquad
T_{\text{total}}=\frac{N_{\text{prompt}}+N_{\text{output}}}{\Delta t_{\text{total}}}
$$

其中 $N_{\text{prompt}}$、$N_{\text{output}}$ 是统计区间内的输入、输出 token 总数，$\Delta t_{\text{prefill}}$、$\Delta t_{\text{decode}}$ 是 prefill 与 decode 各自占用的时间。由于 prefill 是计算密集型、decode 是内存带宽密集型，二者由不同的硬件瓶颈决定，混在一起只会让瓶颈定位失真。这一区分与 [AI on EKS 的基准指标](https://awslabs.github.io/ai-on-eks/docs/guidance/benchmarking/key-metrics-for-benchmarking-llms) 保持一致。

吞吐不能脱离延迟单独承诺。提高批处理规模可以让总 token/s 上升，但往往以更高的 TTFT 或 TPOT 为代价。二者的关系可以由 [Little's Law](https://en.wikipedia.org/wiki/Little%27s_law) 直观看出：

$$
\lambda=\frac{L}{W}
$$

其中 $\lambda$ 是完成速率（吞吐），$L$ 是平均并发请求数，$W$ 是平均驻留延迟。要提高 $\lambda$，要么提高 $L$（更大的并发、更大的批次），要么压低 $W$（更快的 prefill 与 decode）。当 $L$ 已到显存或调度上限时，吞吐的提升只能来自延迟的下降，这正是「吞吐-延迟」成对讨论的原因。正确做法是给出「在某并发、某 p95 延迟约束下」的吞吐，形成一条「吞吐-延迟」曲线，让使用者按自己的 SLO 选取工作点。

压测请求的构造要与线上负载一致：如果线上以长上下文为主，压测却用短请求，得到的吞吐会明显偏高。应记录请求长度分布（均值、p90、最大值），并在报告中注明压测环境（GPU 型号、batch 策略、KV Cache 配置），否则数值无法复现。可以参照 [kubernetes-sigs/inference-perf 的指标定义](https://github.com/kubernetes-sigs/inference-perf/blob/main/docs/metrics.md) 统一单位与统计区间，避免与同行的数字直接对比时口径错位。

## 案例

某团队把「最大 batch token」调高后，总 token/s 明显上升，但 p95 TTFT 随之变差，交互用户感知到明显卡顿。原因是一次性容纳更多 token 让队列里的短请求等待更久，decode 阶段的批也更大，单步计算时间变长。

这一现象可以用 decode 吞吐与 TPOT 的耦合解释。批大小为 $B$、单步耗时 $\bar{t}_{\text{step}}$ 时，decode 吞吐约为：

$$
T_{\text{decode}}\approx\frac{B}{\bar{t}_{\text{step}}}
$$

而 $\bar{t}_{\text{step}}$ 随 $B$ 增长（更大的 KV Cache 读取量、更多访存），因此每个请求感受到的 TPOT 也随批次变大而变长。用更大批次换吞吐，本质是用单个请求的单步延迟去换整体 token/s。

解决思路是按业务目标拆分配置：交互式流量追求低 TTFT，应使用较小的 batch 与更积极的抢占；离线批处理任务追求总吞吐，可以使用更大的 batch 与更长的排队容忍。两者不应共用同一套调度参数。可参考 [vLLM 官方文档](https://docs.vllm.ai/en/latest/) 中关于 batch 与 token 上限的说明，交互与批处理分别调参。

调整后分别验证：交互路径确认 p95 TTFT 回到 SLO 内，批处理路径确认总 token/s 没有明显回退。结论是吞吐必须和延迟分位数成对报告，任何「吞吐提升」都要说明它牺牲了哪部分延迟。

## 相关主题

- [Concurrency](./concurrency.md)
- [请求调度](../base/request-scheduling.md)
