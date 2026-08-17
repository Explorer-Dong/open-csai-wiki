---
title: 自回归推理
---

自回归推理每次根据已有上下文预测一个 token，并将其追加到序列中，作为下一步的输入。模型反复执行这一过程，直到输出停止 token 或达到长度上限。这一范式直接继承自 [GPT](https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf) 提出的生成式预训练路线，其概率基础是链式法则：把整段文本的联合概率分解为逐 token 的条件概率之积，因此「生成」与「训练时预测下一个 token」天然一致。

## 快速开始

先固定模型、聊天模板和采样参数，用一条短提示验证端到端输出正常，再分别测试长提示和并发场景。记录输入 token 数、输出 token 数和停止原因，便于后续定位性能与行为问题。

确定基线后，再逐个改动采样参数或调度配置，避免多变量同时变化导致无法归因。对延迟敏感的请求，还要单独测量首 token 延迟和整体生成时间。验证成功的标准是：相同输入和采样参数下输出可复现（temperature 为 0 或固定随机种子时），且停止原因被正确返回，而不是把所有提前结束都当作异常。

## 过程

自回归生成的概率模型可以写成链式法则：

$$
p(x_1,\ldots,x_n)=\prod_{t=1}^{n}p(x_t\mid x_{<t})
$$

其中 $x_{<t}$ 表示第 $t$ 个 token 之前的全部上下文。推理时每一步都从这个条件分布中采样或取最大概率的 token。

首次前向计算处理完整提示，生成第一个 token 并建立 KV Cache；之后每一步只基于新增 token 计算，输出下一个 token。前者对应 prefill，后者对应 decode，两者瓶颈不同。

由于每个 token 都依赖前一个 token 的输出，自回归过程存在串行依赖，单请求的输出延迟主要由 decode 速度决定。并发和批处理可以提升吞吐，但无法缩短单个请求的串行时间。最小生成循环可写成：

```python
def generate(model, tokenizer, prompt, max_new_tokens, eos_id):
    ids = tokenizer.encode(prompt)
    for _ in range(max_new_tokens):
        logits = model(ids)[:, -1, :]        # 只取最后一个位置的 logits
        next_id = logits.argmax(dim=-1).item()
        ids.append(next_id)
        if next_id == eos_id:
            break
    return tokenizer.decode(ids)
```

这段代码展示了「追加 -> 前向 -> 取最后一个 token」的串行结构，验证标准是生成的每个 token 都只依赖其前缀，输出在相同输入与确定性解码下可复现。

## 案例

设置 `max_tokens=100` 并记录实际生成数量。若模型因命中 stop token 而提前结束，生成数小于 100 属于正常现象，服务应返回明确的停止原因，而不是把提前结束误判为故障。

反之，若生成数始终顶到上限且没有 stop token，可能说明采样参数过保守或任务本身需要更长输出，应检查配置或调整上限。排查时还应区分「停止原因」与「完成原因」：前者来自模型输出 stop token，后者来自达到长度上限或服务端超时，两类原因对应的优化方向不同。

## 相关主题

- [Prefill](./prefill.md)
- [Sampling](./sampling.md)
