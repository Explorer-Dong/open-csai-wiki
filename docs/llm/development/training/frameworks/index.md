---
title: 训练框架
---

训练框架从不同层次解决模型定义、分布式切分、微调与强化学习问题。选型前应先确定训练阶段与规模。

## 独立专题

- [PyTorch](./pytorch.md)
- [DeepSpeed](./deepspeed.md)
- [Megatron-LM](./megatron-lm.md)
- [LLaMA-Factory](./llama-factory.md)
- [VERL](./verl.md)
- [SLIME](./slime.md)
- [TRL](./trl.md)

## 快速开始

单机实验优先使用 PyTorch；需要 FSDP 或 ZeRO 时选择 PyTorch 原生能力或 DeepSpeed；训练超大 Transformer 时使用 Megatron-LM；常规模型微调可用 LLaMA-Factory；偏好优化和语言模型强化学习可选择 TRL、verl 或 slime。

## 框架定位

| 框架 | 主要定位 | 适合场景 |
| :-- | :-- | :-- |
| PyTorch | 张量、自动微分与分布式基础 | 自定义研究与通用训练 |
| DeepSpeed | ZeRO、流水线和训练系统优化 | 大模型分布式训练 |
| Megatron-LM | Transformer 多维并行 | 大规模预训练 |
| LLaMA-Factory | 统一微调配置与数据流程 | SFT、LoRA、偏好优化 |
| TRL | Transformers 生态的后训练算法 | SFT、DPO、PPO、GRPO |
| verl | 面向大模型 RL 的混合执行引擎 | 大规模在线 rollout 与策略训练 |
| slime | 连接 Megatron 训练与 SGLang rollout | 大规模 RL、OPD 与 Agent 轨迹生成 |

## 选型案例

在两张消费级 GPU 上对 7B 模型做领域适配时，目标通常是降低上手成本和显存占用，可选择 LLaMA-Factory 配合 QLoRA。若目标变为数百张 GPU 上预训练 MoE 模型，就需要 Megatron-LM 一类多维并行能力，并配合集群存储、通信基准和容错体系。

verl 与 slime 都面向大模型强化学习，但系统边界不同。verl 提供可组合的分布式 RL 工作流；slime 深度连接 Megatron 与 SGLang，并让自定义数据生成、验证器和环境交互进入同一 rollout 数据流。选择时应验证目标模型、算法、异步策略、权重同步和故障恢复，不应只比较空载吞吐。

## 评估标准

- 是否支持目标模型、精度与训练算法；
- 并行策略是否适配现有 GPU 拓扑；
- 检查点能否跨并行规模恢复或转换；
- 数据格式、日志和评测是否可扩展；
- 自定义模型或奖励函数是否容易接入；
- 项目版本是否活跃，故障是否便于定位。

框架封装不会消除底层约束。遇到性能或正确性问题时，仍需回到张量形状、数据采样、进程组、通信和优化器状态进行检查。

参考资料：[slime](https://github.com/THUDM/slime)、[verl](https://github.com/volcengine/verl)、[TRL](https://github.com/huggingface/trl)。
