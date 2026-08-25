---
title: LLaMA-Factory
---

LLaMA-Factory 面向常见开源模型的微调、数据处理和评测工作流，通过统一配置与命令行/Web 界面，降低 LoRA、QLoRA 与偏好训练的上手成本。它由 hiyouga 团队维护，定位为「统一高效微调 100+ 大模型与多模态模型」的一体化框架，配套论文发表于 ACL 2024 Demo Track，代码与文档见 [GitHub 仓库](https://github.com/hiyouga/LLaMA-Factory)。

## 快速开始

先跑通默认流程，再替换为自己的数据。第一步用官方支持的模型和样例数据集执行一次 SFT，确认模型加载、聊天模板渲染、数据加载与 checkpoint 保存都能正常工作；LLaMA-Factory 提供 `llamafactory-cli` 和 Web 界面，可用 YAML 配置或命令行参数驱动训练：

```bash
# 用 YAML 配置启动训练（配置文件位于仓库 examples/ 目录下）
llamafactory-cli train examples/train_lora/llama3_lora_sft.yaml

# 或启动 Web 界面，在浏览器中完成配置与训练
llamafactory-cli webui
```

验证成功的标准是：训练日志正常输出 loss、adapter 权重被保存、评测命令能加载该 adapter 并给出结果。

第二步替换为版本化的私有数据：固定数据集的版本、基座模型的 revision，并把训练配置、数据集定义和最终保存的 adapter 一起归档。adapter 与基座模型的 revision 是强绑定关系，换基座版本后旧 adapter 不应直接复用。第三步保存完整的实验记录，包括模板选择、序列长度截断策略、损失掩码范围和评测脚本，保证之后能够复现或回退。

## 适用范围

LLaMA-Factory 的价值在于把 SFT、LoRA/QLoRA、偏好优化等常见后训练流程收敛到同一套配置体系，显著降低接入成本。它内置了大量开源模型的模板映射和数据集注册机制，覆盖 SFT、DPO、ORPO、SimPO、KTO、PPO 以及 GRPO 等方法，并支持 full、freeze、LoRA、QLoRA 与 DoRA 等微调方式，适合单机或中小规模集群上的微调实验。

LoRA 与 QLoRA 是它最常用的省显存手段，其原理是用低秩增量近似权重更新。给定预训练权重矩阵 $W_0 \in \mathbb{R}^{d \times k}$，LoRA 冻结 $W_0$，只训练两个低秩矩阵 $B \in \mathbb{R}^{d \times r}$ 与 $A \in \mathbb{R}^{r \times k}$（$r \ll \min(d, k)$），前向为：

$$W = W_0 + \frac{\alpha}{r} BA$$

其中 $\alpha$ 是缩放系数、$r$ 是秩。可训练参数量从 $d \times k$ 降到 $r \times (d + k)$，这就是 LoRA 显存与通信开销大幅下降的来源，论文见 [LoRA](https://arxiv.org/abs/2106.09685)。QLoRA 在此基础上把基座模型量化到 4-bit NF4 (4-bit NormalFloat) 数据类型，并对量化常数做二次量化、配合分页优化器避免显存尖峰，从而让 4-bit 基座也能训练，论文见 [QLoRA](https://arxiv.org/abs/2305.14314)。

但它不能替代对底层知识的理解：数据模板是否正确、显存是否够用、结果评估是否可信，仍然需要使用者自己判断。对于超大规模预训练、数百卡的多维并行训练，LLaMA-Factory 不是合适的选择，应改用 Megatron-LM、DeepSpeed 等面向大规模训练的框架。选择时应先明确训练阶段与规模：领域 SFT 和偏好微调用它很合适；一旦进入大规模预训练或需要精细控制并行拓扑的场景，就要切换到更底层的框架。

## 案例

对 7B 模型使用 QLoRA 做领域 SFT，目标输出为 JSON。第一步准备少量高质量领域样本并检查模板渲染；第二步配置 4-bit 基座与 LoRA，固定 rank、alpha 和 dropout 参数；第三步在未见样本上验证 JSON 可解析率和内容正确性。

对应的 YAML 核心片段如下，`quantization_bit: 4` 开启 NF4 量化，`lora_rank` 与 `lora_alpha` 分别对应公式中的 $r$ 与 $\alpha$：

```yaml
model_name_or_path: meta-llama/Llama-3-8B
stage: sft
finetuning_type: lora
quantization_bit: 4
lora_rank: 16
lora_alpha: 32
template: llama3
dataset: my_domain_sft
```

若质量不佳，先审查样本与模板，而不是只调大 rank：样本是否覆盖目标分布、系统提示是否一致、JSON 是否被模板正确包裹，通常比 LoRA 参数更影响结果。只有当样本和模板都确认无误后，再考虑调整 rank、学习率或训练步数。

## 相关主题

- [有监督微调](../stages/sft.md)
- [参数高效微调](../peft.md)
