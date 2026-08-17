---
title: KV Cache
---

KV Cache 保存注意力层中已处理 token 的 Key 与 Value，避免生成时重复计算历史上下文。没有它，每一步 decode 都要重新计算整个序列，计算量会随长度平方增长。这一机制本质上是把「重复计算历史 Key/Value」换成「用显存缓存它们」，属于典型的以空间换时间；其显存压力在长上下文、大并发场景下会迅速凸显，也成为 [GQA](https://arxiv.org/abs/2305.13245)、MLA 等结构优化的直接动因。

## 快速开始

按层数、头数、维度、精度和最大上下文估算显存，设置每请求上限并监控 cache 使用率。估算公式为：层数 × 头数 × 每头维度 × 2（K 与 V）× 精度字节数 × token 数，实际还受分页、碎片和并发影响，应以实测为准。

更严格地写，给定层数 $L$、KV 头数 $H_{kv}$、每头维度 $d_h$、每元素字节数 $b$ 和序列长度 $S$，KV Cache 占用为：

$$
\text{KV bytes}=2\times L\times H_{kv}\times d_h\times b\times S
$$

其中系数 $2$ 对应 Key 与 Value 各一份，$b$ 由精度决定（FP16/BF16 为 2 字节，INT8 为 1 字节）。需要特别指出，这里的「头数」是 KV 头数而非 Query 头数，MQA、GQA 通过减少 $H_{kv}$ 来缩小缓存，这也是它们能显著降低长上下文显存的原因。下面这段代码可以快速估算单请求的缓存占用：

```python
def kv_cache_bytes(layers, kv_heads, head_dim, bytes_per_elem, seq_len):
    return 2 * layers * kv_heads * head_dim * bytes_per_elem * seq_len

# 例如某模型 32 层、8 个 KV 头、每头 128 维、FP16、4K token
print(kv_cache_bytes(32, 8, 128, 2, 4096) / 1024**3, "GiB")
```

先确定单请求的最大上下文长度，再据此计算并发上限，避免长会话挤占全部显存。运行中持续观察 cache 使用率，发现接近上限时及时调整配额或启用降本手段。

## 取舍

KV Cache 用显存换取计算：它消除了历史上下文的重复计算，但占用随序列长度线性增长，长上下文场景下可能成为显存瓶颈，挤压可服务的并发数。

常见的降本手段包括 KV Cache 量化、分页和前缀复用。量化降低每个 token 的字节数，分页减少碎片，前缀复用共享相同前缀的 cache。这些手段需注意质量损失、隔离与一致性。三者在不同层次上起作用：量化压缩单个 cache 单元的字节数，分页优化 cache 的物理布局以减少碎片，前缀复用则通过共享已有 cache 消除冗余存储，可以叠加使用但需分别验证副作用。

## 案例

同一模型把最大上下文从 4K 提升到 32K 后并发骤降。通过 KV Cache 预算计算发现显存被长会话占满，可用 slot 所剩无几。

解决思路是设置长度与并发配额，按业务区分短请求和长请求，必要时对 KV Cache 量化或启用前缀复用，而不是无限制地放开上下文窗口。可先用上面的公式计算 4K 与 32K 下的单请求缓存差，得到每提升一档上下文所消耗的显存，再据此倒推在给定显存预算下能容纳的并发数，从而把「并发骤降」从现象还原成可量化的预算缺口。

## 相关主题

- [PagedAttention](../optimization/pagedattention.md)
- [Prefix Caching](../optimization/prefix-caching.md)
