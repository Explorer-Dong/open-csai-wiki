---
title: TTFT
---

首 token 时间 (Time To First Token, TTFT) 是请求发出到收到第一个生成 token 的延迟。它是用户感知「服务是否响应」的最直接指标，对交互式应用尤其关键；TTFT 高会让用户以为系统卡住，即使后续流式输出很快也无法挽回体验。

## 快速开始

按输入长度分档（短、中、长上下文）和并发分档报告 p50/p95 TTFT，并把它拆成三部分：排队时间、[Prefill](../../inference/base/prefill.md) 计算时间和网络往返时间。只有拆开才知道延迟花在哪里，也才能对症下药。

TTFT 的构成可以写成：

$$
\text{TTFT}=t_{\text{queue}}+t_{\text{prefill}}+t_{\text{step}}+t_{\text{net}}
$$

其中 $t_{\text{queue}}$ 是请求在调度队列中的等待时间，$t_{\text{prefill}}$ 是处理全部输入 prompt 的 prefill 时间，$t_{\text{step}}$ 是产出首个 token 的第一次 decode 单步时间，$t_{\text{net}}$ 是网络往返。$t_{\text{prefill}}$ 大致随输入 token 数线性增长：

$$
t_{\text{prefill}}\approx\frac{n_{\text{prompt}}}{T_{\text{prefill}}}
$$

$n_{\text{prompt}}$ 是输入 token 数，$T_{\text{prefill}}$ 是 prefill 吞吐（token/s）。这解释了为什么长提示的 TTFT 天然更高。

TTFT 与 TPOT 共同决定一条请求的端到端延迟：

$$
t_{\text{e2e}}=\text{TTFT}+(n_{\text{out}}-1)\times\text{TPOT}
$$

当输出较短时 TTFT 主导；当输出很长时 TPOT 的贡献被放大。优化前先按这个式子判断哪一项值得优先投入，避免「输出只有几十 token 却去优化 decode」。

测量要覆盖冷热两种状态：KV Cache 未命中的「冷请求」需要完整 prefill，TTFT 明显更高；命中前缀缓存的「热请求」可以跳过部分 prefill。只测热缓存会低估线上真实延迟，报告中应分别给出。

验证时要记录输入 token 数，因为 prefill 计算量大致随输入长度增长。长提示下的 p95 TTFT 上升是常见现象，需要判断是排队导致还是 prefill 本身变慢：排队高说明容量不足或调度不公，prefill 高说明输入处理或计算资源是瓶颈。

## 案例

某服务长提示请求的 p95 TTFT 上升，团队先对比了排队时间与 prefill 时间。发现排队占比很高，说明请求在调度队列里等待过久，属于容量或调度问题；于是通过扩容副本、调整调度优先级来缩短排队。

可以用一个最小脚本把 TTFT 拆成可观测的两段，服务端在几个关键时间点打点：

```python
import time

t_arrive = time.monotonic()          # 请求进入服务端
t_dequeue = time.monotonic()         # 调度器选中，开始 prefill
t_first_token = time.monotonic()     # 首个 token 产出

t_queue = t_dequeue - t_arrive
t_prefill = t_first_token - t_dequeue
ttft = t_first_token - t_arrive
assert abs(ttft - (t_queue + t_prefill)) < 1e-6
```

若 `t_queue` 占主导，说明请求在等调度；若 `t_prefill` 占主导，说明是 prompt 处理或计算资源不足。

若对比结果反过来——排队很短但 prefill 很长——则应从输入侧和计算侧入手：减少无效 prompt、启用前缀缓存、优化 prefill 的批处理或降低输入冗余，而不是盲目加机器。前缀缓存命中时，重复的前缀部分无需重算，`t_prefill` 只对新增后缀有效，这正是 [Prefix Caching](../../inference/optimization/prefix-caching.md) 能显著降低 TTFT 的原理。

调整后重新按长提示负载验证，确认 p95 TTFT 回落后再观察总吞吐是否受影响。结论是 TTFT 的排查必须先拆分排队与 prefill，二者对应完全不同的优化路径，混在一起会做出错误决策。

## 相关主题

- [Prefill](../../inference/base/prefill.md)
- [吞吐](./throughput.md)
