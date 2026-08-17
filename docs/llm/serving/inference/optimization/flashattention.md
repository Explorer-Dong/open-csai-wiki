---
title: FlashAttention
---

FlashAttention 通过分块计算和减少高带宽显存读写，加速注意力并降低中间矩阵显存。它把注意力矩阵的中间结果尽量留在片上缓存中，避免把完整的分数矩阵写回显存。

FlashAttention 出自 [FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](https://arxiv.org/abs/2205.14135)（Dao 等人，2022）。它的由来是标准注意力在长序列下的显存瓶颈：计算分数矩阵 $QK^\top$ 后再 softmax、再乘 $V$，中间需要物化一个 $n\times n$ 的矩阵，其规模随序列长度平方增长，而 GPU 的高带宽显存 (HBM) 读写远比片上 SRAM 慢，导致大量时间花在搬运而非计算上。FlashAttention 把注意力计算切块并融合成单个内核，使中间矩阵始终停留在片上，从而把显存访问量从与序列长度平方相关降为线性。后续 [FlashAttention-2](https://arxiv.org/abs/2307.08691) 改进了并行划分与工作分配、进一步减少非矩阵乘操作，[FlashAttention-3](https://arxiv.org/abs/2407.08608) 则面向 Hopper 架构利用异步执行与 FP8 低精度进一步提升吞吐。

## 快速开始

确认框架与 GPU 支持对应实现，用真实序列长度基准测试并验证数值误差。

1. 确认支持：检查所用框架与 GPU 架构是否支持对应的 FlashAttention 实现，并按文档启用，例如 PyTorch 中的 `torch.nn.functional.scaled_dot_product_attention` 在满足条件时会自动走 FlashAttention 后端。
2. 基准测试：用贴近真实负载的序列长度跑 attention 或整模型前向，比较启用前后的显存峰值与 tokens/s。
3. 验证数值：与非 FlashAttention 路径对比输出，确认误差在可接受范围。

验证成功的关键是显存峰值下降、长序列速度提升，同时输出误差不影响下游任务。若数值差异超出预期，检查精度配置与实现版本。

## 原理

它不显式物化完整注意力矩阵，而是以块方式在线计算 softmax，减少读写和峰值内存。标准实现先算出完整的分数矩阵并做 softmax，再与 V 相乘，中间矩阵规模随序列长度平方增长，长序列下读写量巨大。

FlashAttention 把 Q、K、V 切成块，逐块计算局部分数，并用在线 softmax 在「不完整看到所有分数」的情况下逐步修正归一化因子，最终得到与全局 softmax 等价的结果。在线 softmax 的关键是维护两个统计量：当前最大值 $m$ 与累加和 $\ell$。对第 $i$ 个元素 $x_i$：

$$
m_i=\max(m_{i-1},\ x_i),\qquad
\ell_i=\ell_{i-1}\,e^{\,m_{i-1}-m_i}+e^{\,x_i-m_i}
$$

当处理完一个块、新的块到来时，已累加的输出 $O$ 需要用新旧最大值的差做尺度修正，等价于把之前的归一化因子按新的最大值对齐：

$$
O \leftarrow O\cdot e^{\,m_{\text{old}}-m_{\text{new}}}
$$

最终对所有块做完后，再除以 $\ell$ 得到与一次性 softmax 相同的输出。这样中间大矩阵始终停留在片上，写回显存的只有较小的输出块。

峰值显存因此从与序列长度平方相关降为线性相关，长上下文训练与推理更容易放进显存。原论文给出的 HBM 访问量上界约为 $O(N^2d^2M^{-1})$，其中 $N$ 是序列长度、$d$ 是 head 维度、$M$ 是片上 SRAM 大小；相比标准注意力约 $O(N^2)$ 的访问量，当 $N$ 远大于 $d^2/M$ 时，读写量显著下降。代价是引入少量额外计算与数值重排，结果与标准实现存在极小差异，一般可忽略。

## 案例

长序列训练 OOM 时启用实现后比较显存峰值和 token/s；若短序列无收益，保留适配路径。

以长文档训练为例，标准注意力在长序列下因中间矩阵过大而显存溢出，启用 FlashAttention 后峰值显存显著下降，训练可继续；同时因读写减少，速度通常提升。

若序列很短，分块与在线 softmax 的额外开销可能抵消收益，甚至略慢，此时保留普通注意力路径更合适。因此应按真实序列长度决定是否启用，而不是无条件开启。

常见失败点是实现与 GPU 架构不匹配导致报错或回退到低效路径，排查时确认 CUDA 版本、框架版本与硬件支持矩阵。

## 相关主题

- [Attention](../../../development/architecture/attention.md)
- [长上下文](../../../development/architecture/long-context.md)
