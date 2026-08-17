---
title: Concurrency
---

并发度是服务同时处理的活跃请求数或 token 预算，直接影响排队、显存和吞吐。它既可以按「正在运行与正在等待的请求数」统计，也可以按「调度器当前占用的总 token 预算」统计；后者更能反映 GPU 的真实负载，因为不同请求的长度差异可能达到几个数量级，仅数请求个数会掩盖长上下文请求对资源的占用。

## 快速开始

先把并发度当作需要逐级探索的变量，而不是一次性压到最大。建议按固定步长（例如 1、4、8、16、32）逐级提高，每一级都记录成功率、TTFT、TPOT、队列长度、GPU 显存占用和 GPU 利用率，形成一条「并发度-延迟-吞吐」曲线。

两种口径可以形式化为同一组量的两种求和方式。按请求数统计时，并发度等于「已受理但尚未完成」的请求数；按 token 预算统计时，并发度等于所有活跃请求当前占用的 token 数之和：

$$
B_{\text{active}}=\sum_{r\in\mathcal{R}}\left(n^{\text{prompt}}_{r}+n^{\text{generated}}_{r}\right)
$$

其中 $\mathcal{R}$ 是活跃请求集合，$n^{\text{prompt}}_{r}$ 是请求 $r$ 的输入 token 数，$n^{\text{generated}}_{r}$ 是它已生成的 token 数。生成过程中每步输出都会让 $B_{\text{active}}$ 递增，因此同一批请求的 token 口径并发是随时间增长的，而请求数口径基本不变，这正是两者不能混用的原因。

这两种口径通过 [Little's Law](https://en.wikipedia.org/wiki/Little%27s_law) 与延迟和吞吐绑定：

$$
L=\lambda\times W
$$

其中 $L$ 是系统中平均并发请求数，$\lambda$ 是平均到达速率（请求/s），$W$ 是平均驻留时间（排队 + 处理）。它说明一个直接但常被忽视的结论：在相同到达速率下，延迟越高，系统中的并发就越高；压测中「并发上不去」往往不是能力上限，而是延迟劣化后系统自动进入的平衡点。

判断容量的标准是 SLO 而不是 OOM 前的极限：当 p95 TTFT 或 p95 TPOT 开始超出目标、错误率上升、队列持续增长时，说明当前并发已经接近容量边界，应停止加并发并回落到上一个满足 SLO 的档位。以「GPU 跑满」定义的容量往往已经让延迟和队列严重劣化，不能作为对外承诺。

压测时不要只跑单一长度的请求。混合短请求（几十 token）与长上下文请求（几千到上万 token）能暴露 token 预算口径下的短板：长请求会瞬间占用大量 [KV Cache](../../inference/base/kv-cache.md) 与调度预算，导致名义并发不高、实际已经排队。因此容量结论应同时说明「请求数口径」和「token 口径」两种含义。

## 案例

某服务在压测中把并发从 8 逐步升到 32，此时 p95 TTFT 突然恶化，而 GPU 利用率仍未打满。排查后发现调度器配置的「单次可调度 token 上限」过低，长上下文请求被切碎后反复排队，GPU 虽然有空闲算力却无 token 可调度。

可以用一个最小脚本观察「请求数口径不变、token 口径暴涨」的现象。压测中在请求接入、每个 token 生成、请求完成三个时机分别累计两个计数器：

```python
inflight_requests = 0
active_tokens = 0

def on_admitted(prompt_tokens):
    global inflight_requests, active_tokens
    inflight_requests += 1
    active_tokens += prompt_tokens

def on_generated(tokens):
    global active_tokens
    active_tokens += tokens

def on_completed(prompt_tokens, generated_tokens):
    global inflight_requests, active_tokens
    inflight_requests -= 1
    active_tokens -= prompt_tokens + generated_tokens
```

当 `inflight_requests` 稳定而 `active_tokens` 持续攀升时，说明长请求正在悄悄吃掉 token 预算，队列积压的根因不在请求数、而在 token 预算。

调整方向是把调度 token 限额与单个请求的长度限制解耦：在显存允许范围内提高单次可容纳的总 token 数，同时保留对单条请求的最大长度限制，防止一条超长请求占满 KV Cache 造成 OOM。主流引擎通常把这两个维度拆成独立参数，例如 vLLM 用 `max_num_seqs` 限制并发序列数、用 `max_num_batched_tokens` 限制每轮进入批次的总 token 数，二者分别对应请求数口径与 token 口径，具体默认值以 [vLLM 官方文档](https://docs.vllm.ai/en/latest/) 对应版本为准。

调整后重新跑同一负载，确认 p95 TTFT 回到 SLO 内且 GPU 利用率上升，再观察一段时间确认没有 OOM 或输出质量波动。结论是：并发容量应定义为「满足 SLO 的最大并发」，而不是「GPU 跑满时的并发」，容量测试必须同时盯住延迟分位数与错误率。

## 相关主题

- [KV Cache](../../inference/base/kv-cache.md)
- [吞吐](./throughput.md)
