---
title: Request Scheduling
---

请求调度决定哪些请求何时进入 GPU 批次，直接影响 TTFT、吞吐与公平性。调度器在一个有限资源（GPU 算力、显存、KV Cache）上排布多个长短不一的请求，其核心矛盾是：一次处理更多请求能提高吞吐，却会拉长每个请求的等待与单步时间。

## 快速开始

先为请求设置三类上限：单个请求的 token 上限、可同时调度的并发上限、以及队列等待上限。没有上限的调度会被一条超长请求拖垮，也会让排队请求无限积压，因此这些参数是调度的安全边界。

现代引擎的调度大多建立在连续批处理 (continuous batching) 之上：不同于静态 batching 要等一批请求全部结束才能换入下一批，连续批处理在每个 decode 步都能让已完成的请求退出、新请求进入，因此请求无需等「整批结束」，这来自 [Orca 论文](https://www.usenix.org/conference/osdi22/presentation/yu) 提出的思想。vLLM 在此基础上结合 [PagedAttention](../../inference/optimization/pagedattention.md) 进一步把调度粒度细化到 token 预算，可参考 [vLLM 官方文档](https://docs.vllm.ai/en/latest/) 与 [Anyscale 对连续批处理的介绍](https://www.anyscale.com/blog/continuous-batching-llm-inference)。常用的两个调度旋钮是 `max_num_seqs`（并发序列上限）与 `max_num_batched_tokens`（每轮批次总 token 上限），分别对应「请求数口径」与「token 口径」。

压测要用短长混合负载：同时发送短交互请求和长上下文请求，分别查看两者的 p50/p95 延迟。只有混合负载才能暴露「长请求阻塞短请求」的问题，单一长度负载看不出调度策略的优劣。

调参时以「短请求 p95 TTFT 达标、长请求完成时间可接受」为目标逐步调整，并记录不同配置下的吞吐变化，避免优化某类请求时过度牺牲另一类。

## 策略

FIFO 最简单，但长请求会阻塞排在后面的短请求，导致交互体验抖动。按 token 预算、优先级或多队列调度可以改善体验：让短请求或高优先级请求插队，长请求或批任务使用剩余算力。

多队列与优先级需要防止低优先级饥饿：如果高优先级请求持续涌入，低优先级请求可能永远得不到处理。应设置配额或加权公平，保证每类请求都有一个最低处理比例。加权公平排队 (Weighted Fair Queuing, WFQ) 用「虚拟完成时间」决定出队顺序：

$$
V_i=S_i+\frac{l_i}{w_i}
$$

其中 $V_i$ 是请求 $i$ 的虚拟完成时间，$S_i$ 是它的虚拟开始时间，$l_i$ 是预估长度（成本），$w_i$ 是权重。调度器每次选 $V_i$ 最小的请求，权重高、长度短的请求更早被选中，从而在「公平」与「优先」之间取得可量化平衡。

抢占（preemption）是更激进的优化：在长请求生成中途暂停、让出资源给短请求，之后再恢复。它能显著降低短请求延迟，但代价是实现复杂、可能产生碎片与额外开销，需要结合具体引擎能力评估。常见的两种抢占是「换出」（swap，把 KV Cache 移到 CPU 内存）与「重算」（recompute，丢弃并重跑 prefill），前者省算力但需要额外内存带宽，后者省内存但重复计算，vLLM 两者都支持。

## 案例

某服务把交互请求与离线批任务分成两个队列：交互队列优先使用 GPU，批任务队列只使用剩余预算。这样交互请求的 TTFT 得到保障，批任务则在算力空闲时填满批次。

代价是批任务的完成时间变长、总吞吐的波动增大。团队观察交互 TTFT 的改善与批任务完成时间的代价，用一组指标对比确认这次拆分整体是划算的。可以用「队列 + 权重」的最小描述来落地这个双队列策略：

```python
def pick_next(queues):
    # 交互队列权重大，批任务队列权重小；按虚拟完成时间最小者出队
    candidate = None
    for q in queues:
        if q and (candidate is None or q.head().virtual_finish < candidate.virtual_finish):
            candidate = q.head()
    return candidate
```

验证时分别统计两类请求的延迟分位数和完成率，确认交互请求 p95 TTFT 达标、批任务没有出现长时间饿死。结论是请求调度本质是在吞吐、延迟与公平之间做权衡，分队列加配额是平衡这三者的常用手段。

## 相关主题

- [Continuous Batching](../../inference/optimization/continuous-batching.md)
- [负载均衡](./load-balancing.md)
