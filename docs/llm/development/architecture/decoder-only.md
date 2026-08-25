---
title: Decoder-only
---

Decoder-only 架构使用因果注意力按从左到右方式预测下一个 token，是多数生成式大模型的主流结构。它以自回归 (autoregressive) 的方式建模文本，把任意生成任务统一为「给定前缀预测下一个 token」。

这一结构的历史源头可以追溯到 [Transformer](./transformer.md) 论文中的 decoder 组件，但把它独立成完整生成模型的是 OpenAI 的 GPT 系列：从 GPT 的生成式预训练、到 GPT-2 展示的零样本多任务能力、再到 GPT-3 验证的少样本学习与规模化收益，decoder-only 逐步取代了早期的 encoder-decoder 方案。它的流行不是设计偏好，而是「统一 next-token 目标 + 因果注意力 + 规模化」三者叠加后涌现的结果。

## 快速开始

训练时把输入序列右移一位作为标签：模型在位置 $t$ 只能看到 $x_1,\dots,x_t$，预测目标是 $x_{t+1}$。自回归语言模型的概率分解与交叉熵损失如下：

$$
p(x_1,\dots,x_n)=\prod_{t=1}^{n}p(x_t\mid x_{<t})
$$

$$
\mathcal{L}=-\frac{1}{n}\sum_{t=1}^{n}\log p_\theta(x_t\mid x_{<t})
$$

右移操作对应「labels = input_ids 的下一 token」，并通过 [因果 mask](./attention.md) 禁止模型访问未来 token。推理时把已生成 token 追加到上下文，再对最后一个位置的 logits 采样得到下一个 token，循环直到结束符。最小训练循环的核心如下：

```python
shift_inputs = input_ids[..., :-1]      # 位置 t 的输入是 x_{<t}
shift_labels = input_ids[..., 1:]       # 位置 t 的标签是 x_t

logits = model(shift_inputs).logits     # (batch, seq, vocab)
loss = F.cross_entropy(
    logits.view(-1, vocab_size),
    shift_labels.view(-1),
    ignore_index=-100,                  # 屏蔽不参与计算的位置
)
```

动手时先做最小验证：对短序列前向，检查输入长度与标签长度一致、mask 为上三角、最后一个位置的 logits 确实用于预测后续 token。若右移方向或 mask 出错，训练 loss 可能下降但生成会退化，因此应在训练早期就核对这两处。验证成功的标准是：`shift_labels` 恰好等于 `input_ids` 去掉首 token，且 `ignore_index` 覆盖的位置不产生梯度。

## 特点

统一的 next-token 目标让同一模型可以处理续写、对话、代码生成等多种任务，不需要为每类任务设计单独的损失或输出头。GPT-2 已经展示出这种无监督多任务学习的迹象，GPT-3 进一步表明随着规模增大，模型可以在只给少量示例的情况下完成任务。配合 [有监督微调](../training/stages/sft.md) 中的 Chat Template，模型可以稳定地扮演助手角色，这是 decoder-only 成为主流生成架构的主要原因。

自回归生成的缺点是逐 token 进行，每个新 token 都要重新读取整个前缀。若不缓存历史 token 的键值对，推理复杂度会随输出长度二次增长。[KV Cache](../../serving/inference/base/kv-cache.md) 把已计算过的 K、V 缓存下来，新 token 只需对新位置计算注意力，把每步计算降到与当前长度成线性关系。配合 [多查询/分组查询注意力](./attention.md) 可以进一步压缩缓存规模。

Decoder-only 与 [Encoder](./encoder.md) 的区别在于注意力方向：前者用因果注意力，每个位置只看左侧；后者用双向注意力，每个位置看整段输入。因此 encoder 更擅长理解与表征，decoder-only 更擅长从左到右生成，二者不可直接互换。这也是为什么预训练时 decoder-only 用下一 token 预测，而 encoder 用掩码语言模型——两种目标分别匹配两种注意力方向。

## 案例：聊天微调

聊天微调把一段多轮对话映射为 token 序列：将 system、user 与 assistant 消息按固定模板串接，并在训练时只对 assistant 片段计算损失，user 与 system 部分用 label 置为 $-100$ 的方式跳过。这样模型只学习「该说什么」，而不学习「用户会输入什么」。

模板必须与部署时逐字一致。特殊标记（如 `<|im_start|>`、`<|im_end|>` 或 `<|assistant|>`）的位置、换行与角色名都属于模板的一部分；训练时学到的边界若在推理时不再出现，模型会输出串位或错误的角色内容。构建标签时，可以按角色掩码：

```python
labels = input_ids.clone()
# 非 assistant 片段一律置 -100，只对 assistant 内容算损失
labels[mask_non_assistant] = -100
```

验证时用同一模板构造一轮对话并 greedy 解码，检查模型是否在正确位置停止、回复是否只包含 assistant 内容。验证成功的标准是：`<|im_end|>` 出现在回复末尾且其后无多余 token，user 段 token 未参与梯度。常见失败点包括：训练与推理模板不一致、label 右移错位导致漏掉第一个 assistant token、以及把特殊标记也纳入损失。这些都会让微调后的模型出现格式异常。

## 相关主题

- [Encoder](./encoder.md)
- [Transformer](./transformer.md)
