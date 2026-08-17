---
title: Prefill
---

Prefill 对完整输入提示执行前向计算，并建立后续生成所需的 KV Cache。它决定首 token 延迟 (Time To First Token, TTFT)，是长提示场景的主要瓶颈。Prefill 与 decode 的分界来自 [Transformer](https://arxiv.org/abs/1706.03762) 的因果注意力结构：输入 token 之间没有串行依赖，可以在一次前向中并行处理，因此 prefill 的算力利用形态接近训练，而 decode 更接近逐 token 的访存受限循环。

## 快速开始

分别测量输入 token 与输出 token 延迟，把 prefill 与 decode 分开观察。长提示场景优先优化 prefill 吞吐和排队策略，短提示则更多关注 decode。

用 TTFT 和 prefill 吞吐两个指标，在不同输入长度下采样，确认瓶颈在计算还是排队。记录结果时区分冷启动与热启动，避免权重加载时间混入延迟。验证成功的标准是：TTFT 与输入 token 数基本呈可预测的线性关系，且去除权重加载时间后，同长度输入在不同并发下的 TTFT 变化可归因到排队而非计算本身。

## 特点

Prefill 可在大量输入 token 上并行计算，充分利用矩阵乘法的算力，因此通常更受计算吞吐限制，而非内存带宽。输入越长，prefill 耗时越接近线性增长。因果注意力在 prefill 阶段的计算量约为 $O(S^2)$，其中 $S$ 是提示长度，这也解释了为什么超长提示的 prefill 成本增长快于 token 数本身；[FlashAttention](https://arxiv.org/abs/2205.14135) 通过 IO 感知优化降低了这一过程的显存与访存开销。

它还会按上下文长度分配 KV Cache，长输入直接抬高显存占用。若多条长请求同时到达，排队和显存竞争会进一步恶化 TTFT。

## 案例

两条请求输出都为 20 token，但一条输入 200、另一条 20K token。比较 TTFT 可发现后者主要受 prefill 而非 decode 限制：处理 20K token 的 prefill 耗时远大于后续 20 步 decode。

优化方向包括拆分长 prefill、提升 prefill 吞吐或调整排队策略，避免单个超长请求阻塞整个队列。可先用 chunked prefill 把长 prefill 切成多块交错调度，或对 prefill 与 decode 做分离式部署，让长 prefill 不再抢占 decode 所需的带宽；验证标准是超长请求到来时，短请求的 TTFT 与 TPOT 不再被显著拖慢。

## 相关主题

- [Decode](./decode.md)
- [Chunked Prefill](../optimization/chunked-prefill.md)
