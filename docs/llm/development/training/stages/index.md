---
title: 模型训练
---

模型训练把数据、模型结构和优化算法组合为可复现的参数更新过程。训练前应先理解 [模型架构](../../architecture/index.md) 与 [PyTorch](../frameworks/pytorch.md)，再按预训练、后训练和分布式扩展的顺序学习。

## 快速开始

以 Decoder-only 语言模型为例，最小训练闭环如下：

```text
准备数据 -> Tokenize -> 前向计算 Loss -> Backpropagation -> Optimizer Step -> 评测与保存
```

Loss 衡量预测误差，反向传播计算梯度，Optimizer 根据梯度更新参数。Learning Rate 控制单步更新幅度，Batch 与 Gradient Accumulation 共同决定一次参数更新覆盖的样本量。先通过 [训练基础](../base/index.md) 在单卡小数据集上验证闭环，再扩展到多卡和多机环境。

## 训练阶段

| 阶段 | 目标 | 常见方法 |
| :-- | :-- | :-- |
| 预训练 | 从大规模语料学习通用表示与生成能力 | Pre-training、Continued Pre-training |
| 监督适配 | 学习任务格式、领域知识和指令遵循 | SFT、LoRA、QLoRA |
| 蒸馏与偏好 | 迁移教师分布或比较回答优劣 | OPD、Preference Optimization、DPO |
| 强化学习 | 通过奖励提升推理和工具使用能力 | RLHF、PPO、GRPO、Agentic RL |

具体原理与案例见 [预训练](./pre-training.md) 和 [后训练](./post-training.md)。

## 分布式训练

数据并行将不同样本分给多个设备，DDP 在反向传播期间同步梯度；ZeRO 和 FSDP 进一步切分参数、梯度和优化器状态。单个模型层无法装入一张卡时，可使用 Tensor Parallel；层数较多时可使用 Pipeline Parallel；MoE 模型还会使用 Expert Parallel。实际大规模训练通常组合多种并行方式，具体见 [分布式训练](../distributed/index.md)。

## 训练框架

- [PyTorch](../frameworks/pytorch.md) 提供张量、自动微分、优化器和分布式原语；
- DeepSpeed 与 FSDP 侧重显存切分和分布式训练；
- Megatron-LM 侧重大规模 Transformer 并行；
- LLaMA-Factory 侧重统一微调工作流；
- TRL、verl 与 slime 侧重偏好优化、在线 rollout 和强化学习训练。

框架定位与选型见 [训练框架](../frameworks/index.md)，环境配置和容器示例见 [工程实践](../frameworks/index.md)。

## 评测与安全

训练过程中应分别评测通用知识、STEM、数学、代码、推理、长上下文、多模态和 Agent 能力，并保留训练前基线，识别灾难性遗忘。数据进入训练管线前还需检查隐私、版权、投毒和后门风险；对齐完成后应独立进行安全评测，避免只用训练奖励证明模型安全。具体流程见 [模型能力评测](../../evaluation/index.md) 与 [训练和对齐安全](../../security/index.md)。

进一步阅读：[大模型训练入门手册](https://docs.volcengine.com/docs/82379/2545605?lang=zh)。
