---
title: QLoRA
---

QLoRA 在量化冻结基座上训练 [LoRA](./lora.md) adapter，以进一步降低微调显存占用，使大模型能在单卡上完成参数高效微调。它是 [LoRA](./lora.md) 的显存优化延伸：LoRA 省下了优化器状态与梯度，但基座权重仍需以全精度常驻显存；[QLoRA](https://arxiv.org/abs/2305.14314) 把冻结基座量化到 4-bit，再配合分页优化器与双重量化，让原本放不下的模型在消费级显卡上也能微调。

## 快速开始

先验证量化加载、计算 dtype 和 adapter 保存流程。QLoRA 把基座以低比特（如 4-bit）表示加载，计算时反量化到较高精度（如 bf16）参与前向与反向；adapter 与部分归一化层保持较高精度。先跑通「加载量化基座 -> 前向 -> 反传 -> 保存 adapter」整条链路，确认无精度异常与内核报错。bitsandbytes 提供 4-bit 加载入口，PEFT 在其上叠加 LoRA。

再用小数据集对比全精度 LoRA 的质量和稳定性。同一份数据分别用全精度 LoRA 与 QLoRA 训练，比较验证指标与损失曲线：QLoRA 应与全精度 LoRA 接近，若明显变差，先查量化配置与计算 dtype 是否匹配，而非怀疑方法本身。论文在多个任务上报告 4-bit QLoRA 可达到与 16-bit 微调相当的水平，但具体数值以官方实现与所用内核为准。

保存时把 adapter 与量化配置、基座版本、聊天模板绑定记录，避免部署时误用。量化模型的加载依赖具体量化方案，换一个库或版本可能无法直接复用。

## 机制

QLoRA 的三个关键技术是 NF4 量化、双重量化与分页优化器。基座权重以低比特表示存储（NF4 是 4-bit 的一种非均匀量化格式，对正态分布权重拟合更好），显著压缩存储；计算时按配置反量化到 bf16 参与矩阵运算，从而在低显存下仍保持可接受的数值精度。NF4 全称 4-bit NormalFloat，其量化点按「零均值、单位方差」的正态分布分位数设计，信息论上更贴合预训练权重常见的近似正态分布。

可训练部分（LoRA 矩阵与若干低秩层）保持较高精度，不参与量化，因此梯度的更新方向不被量化噪声主导。双重量化对量化用的缩放因子再做一次量化，进一步压缩这些量化常数；分页优化器在显存紧张时把优化器状态换出到 CPU 内存，用时间换空间，避免训练中出现显存尖峰导致 OOM。量化与反量化本质上是一次仿射映射，对块内数值 $x$ 可写为：

$$
x_q = \operatorname{round}\left(\frac{x}{s}\right),\quad \hat{x} = s \cdot x_q
$$

其中 $s$ 是该块的缩放因子，反量化结果 $\hat{x}$ 是对原值的近似，量化误差即 $x - \hat{x}$。NF4 的特殊之处在于量化点非均匀、且按正态分布构造；双重量化则把多个块的 $s$ 再量化一次，进一步省显存。

实际效果取决于量化误差与内核支持。量化必然引入误差，但经验上 4-bit 量化基座配合高精度 adapter 的微调质量通常接近全精度 LoRA；内核支持（如特定 GPU 对 NF4 反量化的算子优化）决定训练速度与稳定性。对数值敏感的层（如嵌入或输出头）是否量化，需按任务实测。更完整的量化背景见 [量化](../../../serving/compression/quantization.md)。

## 案例

单卡无法加载全精度模型时，使用 4-bit 基座训练 adapter。流程是：以 NF4 量化加载基座 -> 冻结并接入 LoRA -> 用 bf16 做计算 -> 训练并保存 adapter。记录峰值显存，与全精度 LoRA 对比，通常能降数倍显存。一个最小配置示例如下：

```python
from transformers import BitsAndBytesConfig
from peft import LoraConfig, get_peft_model

quant_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype="bfloat16",
)
model = AutoModelForCausalLM.from_pretrained(
    base_model_id, quantization_config=quant_config
)
model = get_peft_model(model, LoraConfig(r=16, lora_alpha=32))
```

训练后验证输出与完整配置绑定，避免部署时误用另一基座版本。量化模型的加载依赖特定的量化格式与库版本，若保存 adapter 时没记录量化配置，换环境后可能加载失败或数值不一致。

若 QLoRA 结果明显劣于全精度 LoRA，排查顺序为：计算 dtype 与量化格式是否匹配（例如 NF4 与 bf16 的组合）、是否误把关键层量化、学习率是否因有效更新尺度不同而需要重调。必要时对 [量化](../../../serving/compression/quantization.md) 方案做小规模消融。

## 相关主题

- [LoRA](./lora.md)
- [量化](../../../serving/compression/quantization.md)
