---
title: 损失函数
---

损失函数把模型输出与训练目标的差异变为可优化的标量，是连接「网络输出」与「训练信号」的接口。语言模型几乎都采用 token 级交叉熵，它等价于最大化目标 token 的对数似然，即自回归的下一 token 预测 (next-token prediction, NTP) 目标。

## 快速开始

语言模型通常使用 token 级交叉熵：将 logits 与右移后的标签对齐，忽略 padding：

```python
import torch.nn.functional as F
# logits: (B, T, vocab_size)，labels 是右移后的目标，padding 处填 -100
loss = F.cross_entropy(
    logits.view(-1, vocab_size), labels.view(-1), ignore_index=-100)
```

先在很小数据集上确认损失能下降，再扩大训练：验证标准是几百步内训练损失单调下降，并明显低于「随机猜测」基线（均匀分布下的期望损失约为 $\ln V$，$V$ 为词表大小）。

## 原理

对单个位置，模型输出 logits $z$ 经 softmax 变成概率分布，交叉熵惩罚目标 token 的低概率：

$$L = -\sum_{v=1}^{V} y_v \log \hat p_v, \qquad \hat p_v = \frac{e^{z_v}}{\sum_{j=1}^{V} e^{z_j}}$$

其中 $V$ 是词表大小，$y_v$ 是 one-hot 目标（目标 token 处为 1，其余为 0），$\hat p_v$ 是 softmax 概率。训练目标是最小化所有有效位置的平均损失，也就是最大化所有目标 token 的对数似然：

$$L_{\text{NTP}} = -\frac{1}{N}\sum_{t=1}^{N} \log \hat p(y_t \mid y_{<t})$$

label smoothing 把 one-hot 目标软化，给非目标 token 也分一点概率（[论文](https://arxiv.org/abs/1512.00567)）：

$$y' = (1-\epsilon)\,y + \frac{\epsilon}{V}$$

其中 $\epsilon$ 是平滑系数。它可降低模型过度自信、提升校准，但大语言模型预训练中较少使用，因为它会略微损害「精确复现」能力。训练损失下降不等于模型在未见任务上更好，因此还要有独立验证集。

## 案例：掩码标签

指令微调中，把用户提示位置的标签设为 ignore index（PyTorch 里是 -100），只计算助手回复的损失：

```python
# prompt 部分与 padding 都填 -100，只有 assistant 回复位置保留真实 token id
labels = prompt_ids.clone()
labels[:, :len(prompt_tokens)] = -100
loss = F.cross_entropy(
    logits.view(-1, vocab_size), labels.view(-1), ignore_index=-100)
```

验证标准是：把 prompt 位置的标签替换成随机 token，损失应几乎不变（因为这些位置被忽略）。若错误地计算提示部分，模型会把容量用于复述输入，且指标难以解释。

## 排查

损失为 NaN 时检查学习率、混合精度溢出、标签范围和 attention mask；损失不下降时先验证数据、目标移位与梯度是否存在——最常见的问题是标签与 logits 没对齐（差一位）、或 `ignore_index` 把几乎所有位置都屏蔽了，导致有效损失只剩极少样本。

## 相关主题

- [反向传播](./backpropagation.md)
- [优化器](./optimizer.md)
