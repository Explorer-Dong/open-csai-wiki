---
title: TRL
---

TRL 是 Hugging Face 生态下的后训练库，为 Transformers 模型提供 SFT、偏好优化与强化学习训练器。它起源于 Hugging Face 社区的 Transformer Reinforcement Learning 项目，现已成为覆盖 SFT 与各类对齐算法的统一库，代码见 [GitHub 仓库](https://github.com/huggingface/trl)，文档见 [TRL 文档](https://huggingface.co/docs/trl/index)。

## 快速开始

先用官方样例跑通流程，再替换为自己的模型和数据。第一步从官方示例脚本开始，验证数据格式与聊天模板：SFT 使用 SFTTrainer，偏好优化使用 DPOTrainer，强化学习使用 PPOTrainer 或 GRPOTrainer，各自的数据字段和模板要求不同，先用最小样例确认渲染正确。最小可用骨架如下：

```python
from trl import SFTTrainer
from transformers import AutoModelForCausalLM, AutoTokenizer

model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.2-1B")
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3.2-1B")
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,          # 含 "text" 字段的数据集
    processing_class=tokenizer,     # 旧版本参数名为 tokenizer
)
trainer.train()
```

验证成功的标准是：数据能通过 tokenizer 与模板渲染、训练循环跑通、checkpoint 可保存加载。

第二步替换为自己的模型和数据，同时为每种算法保留独立的验证集，确保算法之间可以公平比较。固定参考模型、采样参数和评估脚本，避免因设置漂移导致结果不可比。第三步用短训练验证完整流程：确认损失下降、评估能跑通、checkpoint 可加载，再投入完整实验。

## 能力

TRL 覆盖 SFT、DPO、PPO、GRPO 以及 KTO、ORPO 等常见后训练流程，与 Transformers、PEFT、Accelerate 深度集成，适合快速实验和中小规模的后训练。它把训练循环、数据处理和评估封装成训练器，让研究者专注于算法与数据。

这些算法的演进脉络是：先有基于奖励模型的 PPO，再由 DPO 用偏好对直接优化策略以省去奖励模型与在线采样，GRPO 进一步去掉 critic 价值函数、用组内相对优势代替。DPO 的损失直接对比 chosen 与 rejected 在策略与参考模型下的对数概率差：

$$L_{\text{DPO}} = -\log\sigma\left(\beta\log\frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta\log\frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)}\right)$$

其中 $\beta$ 控制偏离参考模型 $\pi_{\text{ref}}$ 的强度，$y_w$、$y_l$ 分别是 chosen 与 rejected 回答，$\sigma$ 是 sigmoid 函数，公式与推导见 [DPO 论文](https://arxiv.org/abs/2305.18290)。PPO 的裁剪代理目标与 GRPO 的组内相对优势见 [强化学习](../stages/rl.md)。

但大规模训练仍需配合分布式与服务基础设施：在线算法（如 PPO、GRPO）需要高效的 rollout 服务，通常配合 vLLM 等推理引擎；超大规模训练则要考虑并行策略与集群调度。TRL 定位是后训练算法库，不是大规模预训练框架。选择时应明确目标：快速验证偏好优化思路用 TRL 很合适；一旦进入大规模在线强化学习，可能需要切换到 verl、SLIME 一类面向 RL 的混合执行框架。

## 案例

在同一份偏好数据上分别训练 SFT 与 DPO，比较两者的效果差异。固定参考模型（DPO 中相对参考策略计算对数概率差）和采样参数，用同一套评估脚本在未见偏好集上比较胜率与格式错误率。

SFT 只学习 chosen 回答，DPO 同时利用 chosen 与 rejected 的对比信号。记录训练目标之外的指标：chosen 的条件概率是否上升、rejected 是否下降、输出格式是否保持稳定。若 DPO 出现格式退化或过度偏好，检查参考模型是否固定、偏好数据中 chosen/rejected 是否颠倒、以及 beta 等超参数是否合适。

## 相关主题

- [强化学习](../stages/rl.md)
