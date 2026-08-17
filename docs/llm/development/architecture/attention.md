---
title: Attention
---

Attention 让每个 token 根据相关性聚合其他 token 的信息，是 Transformer 的关键计算。它是序列建模中处理长距离依赖的主要机制，也是自回归生成模型能够并行训练、按位置动态加权上下文的基础。

注意力最早出现在机器翻译的编码器-解码器结构中：[Bahdanau 等人](https://arxiv.org/abs/1409.0473) 提出的加法注意力让解码器在生成每个词时动态对齐源句的相关位置，替代了把整句压成单一向量的做法。随后 [Luong 等人](https://arxiv.org/abs/1508.04025) 引入点积注意力，[Vaswani 等人](https://arxiv.org/abs/1706.03762) 在 [Transformer](./transformer.md) 中把它标准化为缩放点积注意力并彻底去掉循环结构，注意力自此成为大模型的核心算子。理解这条「加法对齐 -> 点积 -> 缩放点积 -> 多头 -> 高效实现」的演进，有助于区分各方法解决的到底是什么问题。

## 快速开始

注意力机制的核心输入是三个矩阵：查询 (Query, Q)、键 (Key, K) 与值 (Value, V)。对输入的每个位置，模型用「查询」去和所有位置的「键」计算相关性分数，再用分数对「值」做加权求和，得到该位置的新表示。标准实现是缩放点积注意力 (Scaled Dot-Product Attention)，来自 [Attention Is All You Need](https://arxiv.org/abs/1706.03762)：

$$
\operatorname{Attention}(Q,K,V)=\operatorname{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right)V
$$

其中 $d_k$ 是键向量的维度。除以 $\sqrt{d_k}$ 是为了防止点积随维度增大而方差变大，避免 softmax 输入落入饱和区导致梯度消失。softmax 将分数归一化为和为 1 的权重，再作用到 $V$ 上。

动手验证时，先用小矩阵打印注意力分数和 mask。构造 batch、序列长度、头数与 head dim 都很小的输入，检查 $QK^\top$ 的形状是否为 `(batch, heads, seq, seq)`，以及 mask 是否让被屏蔽位置在 softmax 之前被置为 $-\infty$。一个常见错误是忘记把 mask 加到 softmax 之前，导致模型仍能看到未来 token。最小验证代码如下：

```python
import torch
import torch.nn.functional as F

batch, heads, seq, dim = 1, 1, 4, 8
q = torch.randn(batch, heads, seq, dim)
k = torch.randn(batch, heads, seq, dim)

scores = q @ k.transpose(-2, -1) / (dim ** 0.5)      # (1, 1, 4, 4)
mask = torch.triu(torch.ones(seq, seq, dtype=torch.bool), diagonal=1)
scores = scores.masked_fill(mask, float("-inf"))
weights = F.softmax(scores, dim=-1)
print(weights[0, 0])   # 验证：每行非零权重只落在对角及其左侧
```

验证成功的标准是：`weights` 每一行的非零项只出现在下三角（含对角线），且逐行求和等于 1。若在 `masked_fill` 之前就 softmax，屏蔽位置会残留非零权重，说明 mask 应用顺序有误。

因果 (causal) mask 是一个上三角屏蔽矩阵，保证第 $i$ 个位置只能注意到 $j\le i$ 的位置。验证时观察每个位置的权重是否都落在其左侧（含自身），这是后续 [Decoder-only](./decoder-only.md) 与 [长上下文](./long-context.md) 优化的前提。

## 原理

单头注意力只能学习一种「相关性」模式，多头注意力 (Multi-Head Attention, MHA) 把 hidden dimension 切成 $h$ 个头，每个头在较低维度上独立计算注意力。设模型维度为 $d_{\text{model}}$，每个头维度为 $d_k=d_v=d_{\text{model}}/h$，第 $i$ 个头的投影矩阵分别为 $W_i^Q\in\mathbb{R}^{d_{\text{model}}\times d_k}$、$W_i^K\in\mathbb{R}^{d_{\text{model}}\times d_k}$、$W_i^V\in\mathbb{R}^{d_{\text{model}}\times d_v}$：

$$
\operatorname{head}_i=\operatorname{Attention}(QW_i^Q,KW_i^K,VW_i^V)
$$

$$
\operatorname{MultiHead}(Q,K,V)=\operatorname{Concat}(\operatorname{head}_1,\dots,\operatorname{head}_h)W^O
$$

其中 $W^O\in\mathbb{R}^{hd_v\times d_{\text{model}}}$ 把拼接结果投影回模型维度。不同头可以关注句法、指代、位置等不同关系，拼接后经 $W^O$ 融合。多头让模型在多个子空间并行捕捉信息，是 Transformer 表达力的重要来源，也是后续多查询注意力 (Multi-Query Attention, MQA) 与分组查询注意力 (Grouped-Query Attention, GQA) 的出发点——后两者通过共享部分 K、V 投影来压缩 KV 缓存。

全注意力 (dense attention) 的时间和显存通常随序列长度平方增长：注意力权重矩阵大小为 $n\times n$，计算量为 $O(n^2 d)$，其中 $n$ 是序列长度，$d$ 是 hidden size。当 $n$ 达到数万甚至更长时，注意力矩阵会占据大量显存并拖慢训练与推理。更准确地说，瓶颈不在算力而在显存读写：朴素实现需要反复把中间矩阵写回高带宽显存，因此 [FlashAttention](https://arxiv.org/abs/2205.14135) 通过分块与算子融合减少读写，在数学结果完全不变的前提下换取显著加速与省显存，属于精确注意力的高效实现；滑动窗口、稀疏模式、线性注意力等方法则通过限制注意力范围或改变计算形式来降低复杂度。这些方法不改动注意力的数学定义，但会影响模型能捕捉到的依赖范围。推理侧还有 [PagedAttention](https://arxiv.org/abs/2309.06180) 把 KV 缓存按页管理以缓解显存碎片，相关细节见 [KV Cache](../../serving/inference/base/kv-cache.md)。

## 案例：因果掩码

对长度为 4 的序列，因果掩码矩阵满足位置 $i$ 对位置 $j$ 的注意力只有在 $j\le i$ 时才被允许。用数值表示，mask 中允许的位置填 $0$，禁止的位置填 $-\infty$：

```
[[ 0, -inf, -inf, -inf],
 [ 0,   0,  -inf, -inf],
 [ 0,   0,    0,  -inf],
 [ 0,   0,    0,    0 ]]
```

检查第 2 个位置（下标 1）的注意力权重：它只能把概率分配给位置 0 和位置 1，位置 2、3 的权重必须为 0。可以把权重矩阵第 2 行打印出来确认两件事：非零权重只出现在前两列，且各行权重之和为 1。上文代码中 `weights[0, 0][1]` 即该行，`weights[0, 0][1].sum()` 应约等于 1。

若 mask 方向颠倒（把下三角写成上三角，或把 $-\infty$ 与 $0$ 的位置填反），训练时模型会提前看到答案 token，损失虽然能降得很低，但学到的是一种「抄答案」的捷径。推理阶段因为无法再看到未来 token，输出质量会崩溃，表现为生成不通顺或任务失败。排查时先冻结其余模块，单独前向一帧并打印权重分布，通常能快速定位 mask 的问题。

## 相关主题

- [Transformer](./transformer.md)
- [长上下文](./long-context.md)
