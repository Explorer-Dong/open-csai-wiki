---
title: Decode
---

Decode 在已有 KV Cache 基础上逐 token 生成输出，是自回归生成的主体阶段。它决定单请求的生成速度，通常用每个输出 token 的时间 (Time Per Output Token, TPOT) 衡量。Decode 与 prefill 的分野源于 [Transformer](https://arxiv.org/abs/1706.03762) 的自回归解码方式：历史 token 的 Key 与 Value 被缓存后，每步只需计算一个新 token 的注意力，因此单步计算量很小，却要读取不断变长的缓存。

## 快速开始

用 TPOT 衡量 decode 速度时，先固定输入长度和采样参数，再分别测试不同并发与输出长度。不要只报告空载的单请求结果，因为批处理下的表现更能反映真实服务的吞吐。

记录不同上下文长度下的 TPOT 变化，观察 KV Cache 增长对 decode 的影响。多轮测试应覆盖短输出和长输出两类场景。验证成功的标准是：在相同并发与上下文长度下 TPOT 基本稳定，且随着并发提升，单请求 TPOT 与整体吞吐的变化符合预期，而不是出现无规律的抖动。

## 特点

每步计算量较小却需要读取不断增长的 KV Cache，因此 decode 常常受内存带宽而非计算吞吐限制，kernel 启动开销在短输出场景下也很明显。可以从算术强度理解这一点：decode 每步的注意力计算量约为 $O(L\cdot H\cdot S)$，而读取的 KV Cache 字节数也约为 $O(L\cdot H\cdot S)$，二者同阶，意味着单位访存对应的浮点计算很少，GPU 的算力被访存时间掩盖。提升 decode 效率的关键是减少访存和启动开销。

批处理可以在一次 kernel 调用中服务多个请求，提高设备利用率，但也会放大长请求对短请求的干扰。合理的调度需要平衡吞吐与单请求延迟。现代推理框架通过 continuous batching、CUDA Graph 和更细粒度的调度降低 decode 的启动与访存开销，具体机制见 [Continuous Batching](../optimization/continuous-batching.md)。

## 案例

固定 512 输入 token，分别生成 32 和 512 token，比较两者的 TPOT。若 TPOT 随上下文增长明显变差，优先检查 KV Cache 占用和批调度，而不是怀疑模型本身。

例如 KV Cache 接近上限导致频繁换入换出，或长请求占满批处理槽位，都会拖慢 decode。定位到具体瓶颈后再决定是否引入 KV Cache 量化或更细粒度的调度。排查时可以先把 batch size 设为 1 隔离并发干扰，再逐步增加并发观察 TPOT 拐点；若 TPOT 在某个上下文长度后线性恶化，基本可以定位为 KV Cache 读取成为主导因素。

## 相关主题

- [KV Cache](./kv-cache.md)
- [Continuous Batching](../optimization/continuous-batching.md)
