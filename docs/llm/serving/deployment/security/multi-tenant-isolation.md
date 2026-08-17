---
title: 多租户隔离
---

多租户隔离防止一个租户访问、影响或推断另一个租户的数据、缓存和资源。多租户共用推理集群时，隔离的难点不仅在于数据，缓存、显存与调度资源也要隔离，否则会出现跨租户信息泄露或资源抢占。

隔离之所以难，是因为推理引擎为追求吞吐共享了大量状态：权重只读、全员复用，KV Cache 按序列块池化，前缀缓存按内容跨请求命中。这些共享一旦没有租户边界，就会同时带来两类问题：一是信息泄露，例如前缀缓存把租户 A 的系统提示命中给租户 B；二是资源抢占，一个租户的长上下文挤占整块显存。推理框架已在处理这类问题，例如 vLLM 通过缓存加盐 (cache salting) 防止基于哈希碰撞的跨用户侧信道，见 [vLLM prefix caching 设计文档](https://docs.vllm.ai/en/latest/design/prefix_caching/) 与 [cache salting 提交](https://github.com/vllm-project/vllm/commit/77073c77bc2006eb80ea6d5128f076f5e6c6f54f)；Mooncake 也提供了 [KV Cache 的共享与隔离机制](https://kvcache-ai.github.io/Mooncake/deployment/kv-cache-sharing-and-isolation.html)。

## 快速开始

按租户隔离身份、配额、日志和缓存命名空间：身份与配额以 tenant id 为维度划分；日志与缓存按 tenant id 分区存储，避免查询时跨租户串数据。缓存键应包含 tenant id，防止一个租户命中另一个租户的缓存内容。

缓存键的最小安全形态是把租户标识与内容摘要一起参与键计算，例如：

```text
cache_key = hash( tenant_id + ":" + model_version + ":" + token_ids )
```

其中 `tenant_id` 保证跨租户永不相撞，`model_version` 保证权重或分词变化后旧缓存失效，`token_ids` 保证只有逐 token 一致的前缀才命中。缺少 `tenant_id` 时，两个租户的相同前缀会命中同一份 KV，构成信息泄露。

共享前缀缓存前必须证明其内容可共享：只有当缓存内容不含租户私有信息（如系统提示词、上下文、生成结果）时，才允许跨租户复用。更稳妥的做法是缓存只存公开前缀，或对含租户信息的缓存强制按 tenant id 隔离。

资源维度也要隔离：为每个租户设置独立的 token 上限、并发数和 KV Cache 份额，使单个租户的突发流量只消耗自己的预算，不挤占关键租户的 SLO。隔离边界应在网关与推理层都落实，并保持一致的 tenant 标识。

**KV Cache 的显存占用可以量化**，它是长上下文抢占资源的直接来源：

$$
\text{KV}_{\text{bytes}} = 2 \cdot L \cdot H_{\text{kv}} \cdot d_{\text{head}} \cdot b \cdot s
$$

其中 $L$ 为层数、$H_{\text{kv}}$ 为 KV 头数（使用 GQA/MQA 后通常小于注意力头数）、$d_{\text{head}}$ 为每头维度、$b$ 为每个元素字节数（bf16 为 2）、$s$ 为序列长度，系数 2 来自 K 与 V 各一份。按该式把每租户允许的 $s$ 与并发数换算成显存份额，即可让突发流量最多耗尽自己的那一份。

验证：用租户 A 的请求确认无法读到租户 B 的缓存与日志；压测租户 A 的突发流量，确认租户 B 的延迟和错误率仍在 SLO 内；检查缓存键是否都携带 tenant id。

## 案例

服务将 KV Cache 和请求日志按 tenant id 分区，并对每个租户设置独立 token 上限。压测一个租户的突发流量时，其请求最多占用自己的 KV Cache 份额和预算，不会挤占关键租户 SLO。

KV Cache 按 tenant id 分区意味着显存被切分为租户维度的块，租户 A 的长上下文不会覆盖租户 B 的缓存。请求日志同样按 tenant id 隔离，审计查询只能看到自己租户的记录，避免信息推断。

以一次压测为例：设租户 A 的 KV 份额按上面的公式换算为 $s$ 上限，当 A 的请求把 $s$ 用满后，新的长上下文请求被拒绝或排队，而租户 B 的 KV 块不受影响。验证 B 的延迟与错误率不变，即可确认显存层面的隔离生效。缓存加盐进一步保证：即使 A 与 B 的公开前缀逐 token 相同，两者的缓存键也因租户盐值不同而相异，杜绝侧信道。

常见失败点：共享前缀缓存未做可共享性证明就跨租户复用，泄露系统提示词；日志与缓存键未带 tenant id 导致串数据；资源限额只在网关做、推理层无隔离。排查方向是检查缓存键与日志分区的 tenant 字段，以及压测时是否出现跨租户延迟波动。

## 相关主题

- [权限控制](./authorization.md)
- [Prefix Caching](../../inference/optimization/prefix-caching.md)
