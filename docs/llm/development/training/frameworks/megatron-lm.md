---
title: Megatron-LM
---

Megatron-LM 是英伟达开源的大规模 Transformer 训练框架，面向超大规模预训练场景，强调张量并行、流水线并行与数据并行的组合。它起源于 Shoeybi 等人 2019 年提出的模型并行方法 [Megatron-LM](https://arxiv.org/abs/1909.08053)，后续演进出序列并行与更完整的 Megatron-Core 内核库，代码见 [GitHub 仓库](https://github.com/NVIDIA/Megatron-LM)，API 文档见 [Megatron Core 文档](https://docs.nvidia.com/megatron-core/)。

## 快速开始

从官方示例脚本和固定数据集开始，先跑通正确性再扩大规模。第一步用小模型和固定数据跑通数据预处理、tokenizer、并行配置与 checkpoint 保存恢复，确认能在指定 TP、PP、DP 组合下正确运行并可从 checkpoint 续训。典型启动方式是在 `pretrain_gpt.py` 上指定并行与 batch 参数：

```bash
python pretrain_gpt.py \
  --tensor-model-parallel-size 2 \
  --pipeline-model-parallel-size 2 \
  --micro-batch-size 1 \
  --global-batch-size 32 \
  --sequence-parallel \
  --num-layers 8 --hidden-size 1024 --num-attention-heads 16
```

验证成功的标准是：进程网格正确建立、每步 loss 可复现、checkpoint 可保存与续训。

第二步再逐步增加 TP、PP 和节点数。每次改动只调整一个维度并记录进程网格：总 GPU 数等于 TP × PP × DP 的乘积，进程网格与节点拓扑的映射直接影响通信效率。第三步在目标规模上做短时基准，记录每步耗时、通信时间和显存占用，确认训练能够稳定收敛后再投入完整训练。Megatron-LM 的配置项较多，建议从官方预训练脚本的默认值开始，逐项理解后再改动。

## 特点

Megatron-LM 对多维并行、Transformer 内核和数据流水线做了深度集成。张量并行把单个 Transformer 层内的权重切分到多卡，通信频繁但不引入流水线气泡；流水线并行把层切分到不同设备形成执行流水线，会引入气泡时间；数据并行在每卡上保存完整副本，通信量相对可控。三者组合即通常所说的 3D 并行，核心约束是：

$$\text{total\_gpus} = TP \times PP \times DP$$

张量并行的由来是把单层矩阵乘法按行/列切分，例如把 MLP 的两个大矩阵分别做列并行与行并行，中间只需一次 all-reduce，避免一次性放不下整层权重的问题；注意力头也可按头切分。序列并行则是张量并行的配套手段，把 LayerNorm 与 Dropout 区域的激活按序列维切分，进一步降低激活显存，论文见 [Reducing Activation Recomputation](https://arxiv.org/abs/2205.05198)。

流水线并行按层切分会带来气泡：阶段间必须等待上游，理想计算时间被等待占据的比例可近似为：

$$\text{bubble} \approx \frac{PP - 1}{m + PP - 1}$$

其中 $m$ 是每次迭代的 micro-batch 数。micro-batch 越多、气泡占比越低，但会占用更多激活显存；具体数值还取决于调度方式（如 1F1B 与 interleaved 调度），以官方文档为准。

它内置了针对 Transformer 的高效融合内核，并通过序列并行分散层归一化与 Dropout 的激活显存。数据侧也提供序列打包、数据重排与高效加载的流水线，减少数据成为瓶颈的可能。

这些深度集成使其适合大规模预训练，但配置与运维门槛较高：并行拓扑、通信域、checkpoint 的跨规模转换、故障恢复都需要专门处理，团队需要具备较强的分布式训练运维能力。

## 案例

在 16 卡上比较 TP=2/PP=2 与 TP=4/PP=1 两种配置，目标是找到更适合当前拓扑的并行方案。记录每种配置的单步耗时、通信时间占比、流水线气泡和峰值显存。

TP 的通信最频繁，应放在高速互联域内；PP 会引入气泡，气泡占比随层数划分不均衡而增大。若节点内带宽充足、节点间带宽有限，可优先增大 TP 减小 PP；反之若显存不足需要更多层划分，再考虑提高 PP。最终选择应由实测的瓶颈决定，而不是只满足乘积关系。例如 16 卡既可写成 2×2×4 也可写成 4×1×4，前者把气泡引入但降低单层通信压力，后者通信更重但无气泡，取舍只能靠同数据、同全局 batch 下的短时基准来判定。

## 相关主题

- [混合并行](../distributed/hybrid-parallel.md)
- [DeepSpeed](./deepspeed.md)
