---
title: 量化
---

量化以较低位宽表示权重或激活，降低模型存储、显存和带宽开销。常见位宽从 FP16/BF16 到 INT8、INT4，位宽越低压缩越大，但量化误差也越大。量化的历史可以追溯到早期的定点神经网络压缩，近年面向大模型的进展主要集中在后训练量化，代表性方法包括 [GPTQ](https://arxiv.org/abs/2210.17323)、[AWQ](https://arxiv.org/abs/2306.00978) 以及 QLoRA 使用的 [NF4](https://arxiv.org/abs/2305.14314) 数据类型。

## 快速开始

优先选择已被社区验证的 8-bit 或 4-bit 推理方案，而不是从零实现量化。先确定模型和任务，在相同输入上比较量化前后的质量、延迟、显存占用与框架兼容性。

量化完成后不要只看单一指标：结构化输出是否仍可解析、长文本是否退化、精度敏感层是否受损，都需要在目标任务上验证。若质量不达标，再考虑更换量化方法或保留关键层精度。可优先用 [bitsandbytes](https://github.com/bitsandbytes-foundation/bitsandbytes)、[AutoGPTQ](https://github.com/AutoGPTQ/AutoGPTQ) 或 [llama.cpp](https://github.com/ggml-org/llama.cpp) 等实现做对照，验证成功的标准是显存占用按位宽比例下降，同时核心评测指标退化在可接受范围内。

## 方法

训练后量化 (Post-Training Quantization, PTQ) 不需要重训，用少量校准数据统计数值范围即可完成，成本低但误差相对较大。量化感知训练 (Quantization-Aware Training, QAT) 在训练过程中模拟量化，让模型适应低位宽表示，质量更好但成本更高。

量化的数学形式是仿射映射，把浮点实数 $r$ 映射为整数 $q$：

$$
r = s \cdot (q - z)
$$

其中 $s$ 是量化步长 (scale)，$z$ 是零点 (zero point)，$q$ 是量化后的整数。反量化时用 $\hat{r}=s(q-z)$ 近似原始值，量化误差即 $|r-\hat{r}|$。根据 $z$ 是否为零，可分为对称量化 ($z=0$) 与非对称量化 ($z\neq0$)：对称量化实现简单，但只适合数值分布大致关于零对称的张量；非对称量化能更好地覆盖有偏分布，代价是额外存储零点。根据 scale 的作用范围，又可分为 per-tensor（整个张量一个 scale）与 per-channel（每个通道或分组一个 scale）：per-channel 精度更高，适合权重各通道数值范围差异大的情况，这也是 PTQ 常采用 per-channel 的原因。

GPTQ 按层逐列量化权重，并用二阶信息近似 Hessian 来补偿已量化列带来的误差，把精度损失摊到未量化的权重上。AWQ 观察到权重的重要性与其对应的激活幅值相关，于是先按激活幅值识别「显著权重」，在量化前对它们做等价缩放以降低相对误差，量化后再通过吸收 scale 到上一层来保持数学等价。NF4 则是 QLoRA 提出的 4-bit NormalFloat 数据类型，其量化区间按标准正态分布的分位数设计，使每个量化桶在正态权重下被近似等概率使用，从而减少信息损失；QLoRA 还叠加了分块量化和 double quantization，把量化常数的存储也压缩掉。

量化对象可独立选择：权重量化最直接地降低存储和显存；激活量化进一步降低计算量；KV Cache 量化则专门缓解长上下文下的显存压力。不同对象对精度的敏感度不同，需要分开评估。

此外还有权重分组、异常值保留等技巧，用于缓解极低位宽下的精度损失。具体数值表现与模型和任务强相关，最终以官方文档和实测为准。

一个对称 INT8 量化的最小示例：

```python
import torch

def symmetric_int8_quantize(x):
    scale = x.abs().max() / 127.0
    q = torch.round(x / scale).clamp(-128, 127).to(torch.int8)
    dq = q.float() * scale  # 反量化
    return q, scale, dq
```

这段代码展示了 scale 的计算与反量化过程，验证标准是反量化结果与原始张量的相对误差足够小。

## 案例

将某 7B 模型从 FP16 量化到 4-bit 后，显存占用明显下降，但基准分也出现退化。此时记录各项指标，并重点检查结构化输出的格式错误是否增加。

若格式错误增多，可改为 8-bit、使用分组量化，或对输出层等敏感层保留更高精度。核心是在显存收益与质量损失之间找到可接受的平衡点。可以按「位宽 -> 分组大小 -> 敏感层回退」的顺序逐级试错：先把 4-bit 换成 8-bit 确认是否位宽过低，再调整分组大小观察 per-channel 粒度的影响，最后对 lm_head 或嵌入层等敏感层保留更高精度，直到找到质量与显存的最佳折中。

## 相关主题

- [QLoRA](../../development/training/stages/qlora.md)
- [部署成本](../deployment/performance/cost.md)
