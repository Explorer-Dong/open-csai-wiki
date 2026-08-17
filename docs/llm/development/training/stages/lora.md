---
title: LoRA
---

LoRA 通过训练低秩增量矩阵来适配冻结的基座权重，降低显存与可训练参数量，是大模型参数高效微调 (Parameter-Efficient Fine-Tuning, PEFT) 的代表方法。它的由来是全参微调的代价：模型规模增大后，为每个下游任务保存一份完整权重并维护全部优化器状态变得昂贵，于是出现了 Adapter、Prefix Tuning 等只改一小部分参数的方案；[LoRA](https://arxiv.org/abs/2106.09685) 则进一步利用「权重更新通常是低秩的」这一假设，把更新量压缩成两个小矩阵的乘积。

## 快速开始

先选择目标模块（常为 attention 与 MLP 线性层）、rank（`r`）和 alpha（`α`）。`r` 决定低秩矩阵的秩，`α` 是缩放系数，实际更新量受 `α/r` 缩放，因此调 `r` 与 `α` 要成对考虑。对 7B 级模型，`r` 常从 8 或 16 起步，`α` 与 `r` 同量级。用 [Hugging Face PEFT](https://huggingface.co/docs/peft/) 配置时，`LoraConfig` 的 `r`、`lora_alpha`、`target_modules` 三项基本决定了注入结构与更新尺度。

再确定训练配置：基座权重全部冻结，只训练 LoRA 参数；优化器只保存 LoRA 参数的梯度与状态，显存开销显著下降。训练脚本要保存三样东西：adapter 权重、基座模型版本（如模型名或 commit hash）、以及聊天模板——这三者缺一，后续推理都可能对不上。

推理时有两种方式：把 adapter 合并进基座（`W' = W + BA`）后直接部署，或保持基座冻结、动态加载 adapter。合并推理没有额外开销但每个任务要存一份完整权重，动态加载则一份基座可配多个 adapter，按需切换。

## 原理

LoRA 假设权重更新是低秩的：对原权重矩阵 $W_0 \in \mathbb{R}^{d\times k}$，更新量写为两个小矩阵的乘积：

$$
\Delta W = BA,\quad B \in \mathbb{R}^{d\times r},\quad A \in \mathbb{R}^{r\times k},\quad r \ll \min(d, k)
$$

前向时输出为 $h = W_0 x + \frac{\alpha}{r} B A x$，其中 $A$ 以随机高斯初始化、$B$ 初始化为零，因此在训练开始时刻 $\Delta W = 0$，模型行为与基座完全一致，训练只更新 $A$ 与 $B$，$W_0$ 冻结。可训练参数量从 $d\times k$ 降到 $r\times(d+k)$，在 $r$ 很小时可减少几个数量级。

训练完成后把 $\frac{\alpha}{r}BA$ 合并回 $W_0$，推理计算量与原始模型完全一致，没有额外延迟，这是 LoRA 相比一些在线适配方法的重要优势。秩 $r$ 控制表达能力上限，$\alpha$ 控制更新幅度，实践中常固定 $\alpha$ 与 $r$ 的比值来让不同 $r$ 下的学习率迁移更稳定。

LoRA 的局限在于：它只近似了参数更新的低秩部分，对需要大幅改变权重结构或引入全新能力的任务，可能不如全参微调充分；同时对目标模块的选择敏感，漏掉关键层会限制效果。它也催生了后续 [QLoRA](./qlora.md)（量化基座以进一步省显存）、DoRA、AdaLoRA 等一系列变体。

## 案例

在 7B 基座上对领域问答训练 LoRA，分别比较 rank 8 与 32 的验证质量和显存。记录每个配置的可训练参数量、峰值显存与验证集指标：通常 rank 32 可训练参数更多、表达力更强，但验证质量未必显著优于 rank 8，反而可能更容易过拟合小数据集。

因此 rank 更大不必然更好。小数据集下低 rank 往往已够用且更稳；数据量大、任务难时才考虑提高 rank。调参时应固定 `α/r` 比值，单独改变 `r` 观察验证集，避免把 rank 与学习率的作用混在一起。一个最小配置示例如下：

```python
from peft import LoraConfig, get_peft_model

config = LoraConfig(
    r=16,
    lora_alpha=32,          # 有效缩放为 α/r = 2
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
)
model = get_peft_model(base_model, config)
model.print_trainable_parameters()
```

评估时还要确认 adapter 与基座版本的绑定：换用不同版本基座或不同聊天模板加载同一 adapter，可能导致输出错乱。把基座 commit hash 与模板写入保存配置，是复现实验与上线部署的基本要求。

## 相关主题

- [QLoRA](./qlora.md)
- [SFT](./sft.md)
