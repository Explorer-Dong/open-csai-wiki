---
title: 模型开发
---

模型开发覆盖从模型结构设计到训练、评测和安全对齐的完整过程。导航按「模型架构 -> 训练基础 -> 训练阶段 -> 分布式训练 -> 训练框架 -> 模型能力评测 -> 安全问题」组织，避免把评测与安全错误归入训练阶段。

## 快速开始

建议按下面的顺序阅读：

1. 阅读 [模型架构](./architecture/index.md)，理解 Tokenizer、Embedding、Transformer、Attention、位置编码与 Decoder-only 等基础结构；
2. 阅读 [训练基础](./training/base/index.md)，掌握损失函数、反向传播、优化器、学习率、Batch 和梯度累积；
3. 阅读 [预训练](./training/stages/pre-training.md) 和 [后训练](./training/stages/post-training.md)，理解模型能力如何形成并完成对齐；
4. 根据规模进入 [分布式训练](./training/distributed/index.md)、[训练框架](./training/frameworks/index.md)、[模型能力评测](./evaluation/index.md) 和 [安全问题](./security/index.md)。

## 内容地图

| 主题 | 主要内容 | 已有文章 |
| :-- | :-- | :-- |
| 模型架构 | Tokenizer、Embedding、Transformer、Attention、位置编码、Decoder-only、Encoder、MoE、长上下文、多模态、Diffusion | [模型架构](./architecture/index.md)、[Transformer 模型](./architecture/transformer.md)、[MoE](./architecture/moe.md)、[多模态模型](./architecture/multimodal.md)、[扩散模型](./architecture/diffusion.md) |
| 训练基础 | 损失函数、反向传播、优化器、学习率、批处理与梯度累积 | [训练基础](./training/base/index.md) |
| 训练阶段 | 预训练、持续预训练、SFT、OPD、LoRA、QLoRA、偏好优化、RLHF、DPO、PPO、GRPO 与 Agentic RL | [预训练](./training/stages/pre-training.md)、[后训练](./training/stages/post-training.md) |
| 分布式训练 | DDP、ZeRO、FSDP、张量并行、流水线并行、专家并行与混合并行 | [分布式训练](./training/distributed/index.md) |
| 训练框架 | PyTorch、DeepSpeed、Megatron-LM、LLaMA-Factory、TRL、verl 与 slime | [训练框架](./training/frameworks/index.md)、[PyTorch](./training/frameworks/pytorch.md) |
| 模型能力评测 | 通用知识、STEM、数学、代码、推理、长上下文、多模态与 Agent 能力 | [模型能力评测](./evaluation/index.md) |
| 安全问题 | 数据隐私、数据投毒、模型后门、数据版权、安全对齐与灾难性遗忘 | [训练与对齐安全](./security/index.md) |

> [!note]
>
> 表格同时承担本板块的内容规划。尚未形成独立文章的主题会先收录在相应概览页中，后续再按依赖关系拆分。
