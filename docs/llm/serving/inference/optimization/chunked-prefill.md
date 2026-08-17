---
title: Chunked Prefill
---

分块预填充把很长提示切成块，与 decode 请求交错调度，降低长请求对交互请求的阻塞。它在「长文档预处理」与「短交互持续生成」之间做时间切片，避免一次性 prefill 占用整块 GPU 调度窗口。

这一思想来自 [SARATHI](https://arxiv.org/abs/2308.16369) 论文提出的 chunked prefill 与 decode-maximal batching。它的由来是一对计算特征差异：prefill 需要处理整个输入序列，属于计算密集（compute-bound），一次长 prefill 会在 GPU 上停留很久；而 decode 每个请求每步只算一个 token，属于访存密集（memory-bound），单步时间短但需要持续调度。若让长 prefill 独占整块调度窗口，后面等待的 decode 请求会被明显拖慢，因此把 prefill 切成若干 chunk，在相邻 chunk 之间插入 decode 步，就同时兼顾了吞吐与交互延迟。vLLM 通过 `--enable-chunked-prefill` 启用，SGLang 亦默认启用分块 prefill，参数语义以 [vLLM 文档](https://docs.vllm.ai/) 与 [SGLang 文档](https://docs.sglang.io/) 对应版本为准。

## 快速开始

选择 chunk token 上限，在长文档和短交互混合负载中测 TTFT、TPOT 与公平性。

1. 设置分块参数：为 prefill 设置每次最多处理的 token 数（chunk 大小），例如 vLLM 中的 `--max-num-batched-tokens` 可同时约束单步参与计算的 token 总量。
2. 构造混合负载：同时发送若干长文档请求与大量短问答请求。
3. 观测指标：分别记录长请求的完成时间、短请求的 TTFT 与 TPOT，以及整体吞吐。

验证成功的关键是短请求延迟不被长请求明显拖长，且整体吞吐没有显著下降。可多取几个 chunk 值对照，找出兼顾两者的区间。

## 取舍

chunk 太大仍会阻塞 decode：单个 chunk 的 prefill 计算量过大时，等待调度的 decode 请求仍要排队，交互延迟上升。chunk 太小则增加调度与 Kernel 开销：每个 chunk 都要重新调度、加载状态并启动内核，固定成本被摊薄。

这个权衡可以用算术强度来理解。prefill 的注意力部分是「矩阵乘矩阵」，对每个 chunk 的计算量随其 token 数的平方增长，吞吐高但单块耗时大；decode 的注意力部分是「矩阵乘向量」，每步只产生一个新 token 的 KV，计算量小、访存占比高。设 chunk 大小为 $c$，一个 chunk 的 prefill 计算量约为 $O(c^2)$，而等长 decode 的累计计算量约为 $O(c)$，因此 chunk 越大，它与 decode 之间的「时间粒度差」越悬殊，越不利于在中间插入交互请求。

最佳值依赖模型、硬件和请求分布，没有普适常数。通常做法是让单个 chunk 的执行时间接近一个可接受的调度周期，使短请求在相邻 chunk 之间获得响应机会。

此外，分块本身改变了 prefill 的顺序性：中间需要保存注意力相关的部分状态，在实现上要处理跨 chunk 的 KV 与位置信息，避免结果与一次性 prefill 不一致。

## 案例

一个 100K token 请求进入队列时，分块处理让短问答仍能持续生成；报告长请求完成时间的增加以呈现代价。

以「大批量文档摘要 + 在线问答」为例，压测中持续注入一个超长请求，观察启用分块前后短请求 TPOT 的变化。预期是短请求延迟明显改善，而长请求完成时间因被切片而增加，这部分代价应如实报告。

常见失败点是 chunk 过小导致整体吞吐下滑，或实现未正确维护跨 chunk 状态导致输出异常。排查时先确认分块后输出与不分块一致，再逐步调大 chunk 观察延迟与吞吐的拐点。

## 相关主题

- [Prefill](../base/prefill.md)
- [Continuous Batching](./continuous-batching.md)
