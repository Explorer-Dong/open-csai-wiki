---
title: LoRA
---

低秩适配 (Low-Rank Adaptation, LoRA) 是一种参数高效微调 (Parameter-Efficient Fine-Tuning, PEFT) 方法。它不改变预训练、监督微调或偏好优化的训练目标，而是改变线性层的参数化方式：冻结基座权重，只学习低秩增量。[LoRA 论文](https://arxiv.org/abs/2106.09685) 的核心假设是，下游任务所需的权重更新通常具有较低的内在秩，因此不必为每个任务更新并保存一份完整模型。

## 快速开始

使用 LoRA 时，先完成以下四步：

1. 确定训练目标与数据。LoRA 只决定「更新哪些参数」，监督微调 (Supervised Fine-Tuning, SFT)、直接偏好优化 (Direct Preference Optimization, DPO) 和知识蒸馏仍使用各自的损失函数。
2. 选择目标模块。通常先覆盖注意力层的 `q_proj`、`k_proj`、`v_proj`、`o_proj`；任务变化较大时，再覆盖 MLP 的 `gate_proj`、`up_proj`、`down_proj`。实际模块名必须以模型代码为准。
3. 设置秩 `r`、缩放系数 `lora_alpha` 和 dropout。可从 `r=8` 或 `r=16` 起步，并通过验证集比较不同配置，不要仅凭训练损失选择更大的秩。
4. 保存 adapter、基座模型的精确版本、分词器与聊天模板。只保存 adapter 而不记录其依赖，无法保证后续复现。

[Hugging Face PEFT](https://huggingface.co/docs/peft/) 提供了常用实现。一个最小配置如下：

```python
from peft import LoraConfig, get_peft_model

config = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    bias="none",
    task_type="CAUSAL_LM",
)
model = get_peft_model(base_model, config)
model.print_trainable_parameters()
```

开始完整训练前，应先用一个小批次验证：损失能够下降、只有预期参数存在梯度、adapter 能够保存并重新加载。数据拼接、标签掩码与损失计算应按具体训练阶段检查，不能由 LoRA 配置代替。

## 方法定位

全参数微调需要为全部参数保存梯度和优化器状态，并为每个任务保存完整权重。LoRA 将任务相关变化限制在小矩阵中，主要减少三类开销：

- 可训练参数：只更新低秩矩阵，而不是完整线性层。
- 梯度与优化器状态：冻结参数不需要对应的梯度、动量与方差。
- 任务存储：每个任务只需保存 adapter，一份基座可以配合多个 adapter 使用。

LoRA 不会自动减少序列激活、注意力矩阵或基座权重占用，也不会改变数据质量与训练目标。长上下文训练中，激活仍可能是主要显存开销；基座权重若仍以 bf16 保存，也仍需常驻显存。需要进一步压缩基座权重时，可以使用后文的 [QLoRA](#qlora)。

## 低秩参数化

设某个线性层的冻结权重为：

$$
W_0 \in \mathbb{R}^{d_{\text{out}} \times d_{\text{in}}}
$$

一个批次的输入激活为 $X \in \mathbb{R}^{B \times S \times d_{\text{in}}}$，其中 $B$ 是批大小，$S$ 是序列长度。原线性层输出的形状为 $[B,S,d_{\text{out}}]$。LoRA 用两个可训练矩阵表示权重增量：

$$
A \in \mathbb{R}^{r \times d_{\text{in}}},\qquad
B_{\text{LoRA}} \in \mathbb{R}^{d_{\text{out}} \times r},\qquad
r \ll \min(d_{\text{in}},d_{\text{out}})
$$

为避免将批大小 $B$ 与 LoRA 矩阵混淆，这里把后一个矩阵记作 $B_{\text{LoRA}}$。权重增量和前向计算为：

$$
\Delta W = \frac{\alpha}{r} B_{\text{LoRA}}A
\in \mathbb{R}^{d_{\text{out}} \times d_{\text{in}}}
$$

$$
Y = XW_0^\top
+ \frac{\alpha}{r}(XA^\top)B_{\text{LoRA}}^\top
\in \mathbb{R}^{B \times S \times d_{\text{out}}}
$$

各步的矩阵形状为：

| 计算 | 输入形状 | 输出形状 |
| --- | --- | --- |
| $XA^\top$ | $[B,S,d_{\text{in}}] \times [d_{\text{in}},r]$ | $[B,S,r]$ |
| $(XA^\top)B_{\text{LoRA}}^\top$ | $[B,S,r] \times [r,d_{\text{out}}]$ | $[B,S,d_{\text{out}}]$ |
| $XW_0^\top$ | $[B,S,d_{\text{in}}] \times [d_{\text{in}},d_{\text{out}}]$ | $[B,S,d_{\text{out}}]$ |

完整权重包含 $d_{\text{out}}d_{\text{in}}$ 个参数，LoRA 分支只包含 $r(d_{\text{in}}+d_{\text{out}})$ 个参数。例如 $d_{\text{in}}=d_{\text{out}}=4096$、$r=16$ 时，单层完整权重有 $16{,}777{,}216$ 个参数，而 LoRA 分支有 $131{,}072$ 个参数，约为前者的 $0.78\%$。

常见初始化方式是随机初始化 $A$、将 $B_{\text{LoRA}}$ 初始化为零，使训练开始时 $\Delta W=0$，模型初始行为与基座一致。具体初始化策略可能随实现变化，应把它视为需要记录的实验配置。

## 损失、梯度与显存

LoRA 不定义新的损失。以 SFT 为例，若词表大小为 $V$，模型输出 logits $Z \in \mathbb{R}^{B \times S \times V}$，标签为 $T \in \mathbb{N}^{B \times S}$，仍然计算带掩码的下一个 token 交叉熵：

$$
\mathcal{L}_{\text{SFT}}
= -\frac{1}{\sum_{b,t}M_{b,t}}
\sum_{b=1}^{B}\sum_{t=1}^{S}
M_{b,t}\log p_\theta(T_{b,t}\mid T_{b,<t})
$$

其中掩码 $M \in \{0,1\}^{B \times S}$。损失对输出的梯度沿 LoRA 分支反向传播，产生：

$$
\nabla_A\mathcal{L} \in \mathbb{R}^{r \times d_{\text{in}}},\qquad
\nabla_{B_{\text{LoRA}}}\mathcal{L} \in \mathbb{R}^{d_{\text{out}} \times r}
$$

冻结权重满足 `W0.requires_grad = False`，优化器只更新 $A$ 与 $B_{\text{LoRA}}$。因此 LoRA 显著减少梯度和优化器状态，但以下开销仍然存在：

- 前向计算仍要经过基座模型，LoRA 不是跳层或剪枝。
- 反向传播仍需保存或重算必要激活，序列长度增大时显存仍会快速上升。
- 基座权重仍要加载到设备；仅使用 LoRA 不会把 bf16 权重自动变成 4-bit。
- 若训练目标需要参考模型，例如某些偏好优化方法，还要额外考虑参考模型的权重与前向开销。

因此，不能用「可训练参数比例」直接推算总显存比例。峰值显存应在真实序列长度、批大小和训练目标下测量。

## 目标模块与超参数

目标模块决定 LoRA 能改变哪些线性变换。仅适配 `q_proj` 和 `v_proj` 的成本较低，但可能限制表达能力；覆盖全部注意力投影和 MLP 通常有更高容量，也会增加训练参数与计算量。不同架构的模块名不同，应先打印 `named_modules()` 或查看模型定义，避免配置命中零个模块或误匹配无关层。

主要超参数的作用如下：

| 参数 | 作用 | 调整原则 |
| --- | --- | --- |
| `r` | 控制低秩分支容量 | 从较小值开始，通过验证集判断容量是否不足 |
| `lora_alpha` | 通过 $\alpha/r$ 缩放增量 | 比较不同 `r` 时可先保持 $\alpha/r$ 一致 |
| `lora_dropout` | 对 LoRA 分支输入做正则化 | 小数据集可使用较小 dropout，大规模训练需实测 |
| `target_modules` | 指定注入层 | 先覆盖注意力层，再按任务增加 MLP |
| `bias` | 决定是否训练偏置 | 训练偏置会增加任务专属参数，通常从 `none` 开始 |

更大的 `r` 只提高容量上限，不保证验证质量更好。它可能在小数据集上过拟合，也可能因为训练步数、学习率和目标模块不合适而无法发挥作用。对比实验应固定数据顺序、有效批大小和训练步数，并同时记录可训练参数、峰值显存和验证指标。

## QLoRA

[QLoRA](https://arxiv.org/abs/2305.14314) 在 4-bit 量化的冻结基座上训练 LoRA adapter。LoRA 解决梯度、优化器状态和任务权重的存储问题；QLoRA 进一步压缩基座权重，主要由 NormalFloat 4-bit (NF4)、双重量化和分页优化器组成。[PEFT 量化训练指南](https://huggingface.co/docs/peft/developer_guides/quantization) 给出的 QLoRA 风格配置会向所有线性层注入 adapter，即使用 `target_modules="all-linear"`；只覆盖注意力投影也是可行的低成本配置，但容量与论文设置不同。

**存储精度与计算精度。** 基座权重以 4-bit 格式存储，但矩阵运算前会按块反量化到 bf16 或 fp16。LoRA 参数和梯度保持较高精度。以简化的均匀量化表示为：

$$
q = \operatorname{round}\left(\frac{w}{s}\right),\qquad
\hat{w}=sq
$$

其中原始块权重 $w \in \mathbb{R}^{n}$、量化编码 $q \in \mathbb{Z}^{n}$、块缩放因子 $s \in \mathbb{R}$，反量化结果 $\hat{w} \in \mathbb{R}^{n}$。NF4 使用适配正态分布权重的非均匀量化点，而不是上述均匀整数间隔；该公式只用于说明「编码 -> 反量化」的数据流。

**双重量化。** 普通块量化要为每个块保存缩放常数。双重量化继续量化这些常数，减少量化元数据的平均存储成本。

**分页优化器。** 分页优化器利用统一内存，在显存峰值出现时换出部分优化器状态。它缓解偶发的显存尖峰，但可能引入主机与设备之间的数据传输，不能替代合理的批大小、序列长度和梯度检查点配置。

一个最小的 4-bit 加载与 LoRA 注入示例如下：

```python
import torch
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

quant_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
)
model = AutoModelForCausalLM.from_pretrained(
    base_model_id,
    quantization_config=quant_config,
    dtype=torch.bfloat16,
)
model = prepare_model_for_kbit_training(model)
model = get_peft_model(
    model,
    LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules="all-linear",
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    ),
)
```

QLoRA 会引入量化误差，并依赖 GPU、量化内核和软件版本。若质量明显低于全精度 LoRA，应先核对计算 dtype、目标模块、关键层是否被意外量化以及学习率，而不是假设 4-bit 配置在所有环境中等价。量化的通用原理见 [模型量化](../../../serving/compression/quantization.md)。

## 保存与部署

训练产物至少应记录：

- adapter 权重与配置，包括 `r`、`lora_alpha`、目标模块和初始化方式。
- 基座模型标识与精确 revision，避免同名模型更新后无法复现。
- 分词器、特殊 token、聊天模板与最大序列长度。
- QLoRA 使用的量化格式、计算 dtype、依赖版本和设备要求。

部署时可以动态加载 adapter，也可以把增量合并到基座权重：

$$
W_{\text{merged}}
= W_0 + \frac{\alpha}{r}B_{\text{LoRA}}A
\in \mathbb{R}^{d_{\text{out}} \times d_{\text{in}}}
$$

合并后不再执行独立 LoRA 分支，适合固定任务的常规推理，但每个任务都要保存一份完整合并权重。动态加载能让多个任务共享同一基座并切换 adapter，但推理框架必须支持对应的 adapter 管理，且并发场景要验证切换与批处理行为。量化基座的合并还涉及反量化、重新量化与数值误差，不能把全精度合并流程直接视为等价操作。

## 案例：7B 模型领域微调

假设要在 7B 基座上训练领域问答模型，可以进行一个最小对照实验：

1. 固定训练集、验证集、随机种子、有效批大小与训练 token 数。
2. 分别训练 `r=8` 和 `r=32` 的 LoRA，并尽量保持 $\alpha/r$ 一致。
3. 在同一 `r` 下比较 bf16 LoRA 与 4-bit QLoRA。
4. 记录训练损失、验证指标、可训练参数、峰值显存、吞吐量和重新加载后的输出。

若 `r=32` 训练损失更低但验证指标没有提升，说明额外容量可能没有带来泛化收益。若 QLoRA 与 bf16 LoRA 差距明显，应使用相同 adapter 配置做小规模消融，逐项检查量化格式、计算 dtype 和被量化的模块。只有在数据与训练预算一致时，显存和质量对比才有解释力。

## 故障定位

| 现象 | 优先检查 | 原因 |
| --- | --- | --- |
| 可训练参数为零 | `target_modules` 是否匹配真实模块名 | 不同模型的投影层命名并不统一 |
| 训练损失不变 | 标签掩码、学习率、梯度是否到达 LoRA 参数 | LoRA 不会修复错误的数据或损失配置 |
| adapter 加载后输出异常 | 基座 revision、分词器和聊天模板 | adapter 与训练时基座强绑定 |
| 显存下降不明显 | 激活、序列长度、批大小和参考模型 | LoRA 主要减少参数梯度与优化器状态 |
| QLoRA 报内核或 dtype 错误 | GPU 支持、bitsandbytes 版本和计算 dtype | 4-bit 训练依赖特定量化内核 |
| QLoRA 质量明显下降 | NF4 配置、目标模块、学习率和关键层精度 | 量化误差与配置错误都可能影响结果 |
| 合并后结果不一致 | 缩放系数、合并 dtype 和是否重复加载 adapter | 重复叠加或低精度合并会改变权重 |
