---
title: DeepSpeed
---

DeepSpeed 是微软开源的深度学习训练优化框架，提供 ZeRO 冗余消除、流水线并行、CPU/NVMe 卸载与通信-计算重叠等能力，用于在有限显存与互联条件下训练更大规模的语言模型。它源自微软 ZeRO 系列工作，核心论文为 Rajbhandari 等人于 2019 年提出的 [ZeRO](https://arxiv.org/abs/1910.02054)，此后演进为覆盖 ZeRO-1/2/3、ZeRO-Offload、ZeRO-Infinity 与混合并行的完整训练系统，官方文档见 [DeepSpeed 文档](https://www.deepspeed.ai/) 与 [GitHub 仓库](https://github.com/deepspeedai/DeepSpeed)。

## 快速开始

快速上手应遵循「先单机跑通、再扩展规模」的顺序。第一步从官方或与目标模型兼容的 ZeRO 配置模板开始，固定 JSON 配置、DeepSpeed 版本与模型代码的 revision，避免配置和代码漂移导致无法复现。通常只需在训练脚本外层加上 `deepspeed` 启动器，并把优化器、学习率调度和混合精度交给框架管理：

```json
{
  "train_batch_size": 32,
  "gradient_accumulation_steps": 4,
  "fp16": {"enabled": true},
  "optimizer": {"type": "AdamW", "params": {"lr": 3e-5}},
  "scheduler": {"type": "WarmupLR", "params": {"warmup_min_lr": 0, "warmup_max_lr": 3e-5, "warmup_num_steps": 100}},
  "zero_optimization": {"stage": 2}
}
```

上面的 `train_batch_size` 是全局 batch，`gradient_accumulation_steps` 是梯度累积步数，二者与数据并行 GPU 数共同决定每卡 micro batch，换算关系见 [深度学习](../../../../base/ai/deep-learning.md#batch-与梯度累积)。用下列命令启动即可让 DeepSpeed 接管优化器、调度与混合精度：

```bash
deepspeed --num_gpus=1 train.py --deepspeed ds_config.json
```

验证成功的标准是：单步前向/反向能完成、日志中 loss 可正常下降、checkpoint 能被保存并再次加载续训。

第二步在单节点上验证 checkpoint 的保存与恢复：分别测试从最新 checkpoint 续训，确认优化器状态、学习率调度和随机状态都能正确恢复，再进行多节点任务。ZeRO 阶段的 checkpoint 会按并行度分片，阶段或并行度变化后需要框架提供的一致性加载或转换路径，不能直接跨配置复用。第三步扩大到多节点时，先核对 hostfile 与节点间网络，用小规模数据跑若干步验证吞吐和显存，确认无异常后再投入完整训练。

## 能力

DeepSpeed 的核心是把训练状态分片、通信与内存管理封装成可配置项，其动机是纯数据并行下每张卡都保存一份完整模型状态，导致显存被冗余状态占满、无法容纳更大的模型。ZeRO 的三个阶段分别切分优化器状态、梯度和参数：阶段越高单卡显存越省，但会引入更多参数聚合通信。

以混合精度 Adam 训练为例，每个参数在参与更新前需要驻留的状态为 16 字节，构成如下：

$$M_{\text{states}} = (2 + 2 + 12) \times N_{\text{params}}\ \text{bytes} = 16 \times N_{\text{params}}\ \text{bytes}$$

其中 fp16 权重占 2 字节、fp16 梯度占 2 字节，优化器状态占 12 字节（fp32 主权重 4 字节 + 动量 4 字节 + 方差 4 字节）。ZeRO-1 把 12 字节优化器状态按数据并行度 $N_d$ 切分，ZeRO-2 继续切分 2 字节梯度，ZeRO-3 再切分 2 字节权重，最终每卡模型状态降为约 $16/N_d$ 字节/参数。切分越彻底，省下的显存越多，但 ZeRO-3 在前向/反向时需要按需 all-gather 参数，通信量也越高，这是阶段之间最本质的取舍。

CPU 或 NVMe 卸载进一步把状态或参数放到更便宜的存储上，代价是额外的数据搬运延迟。ZeRO-Offload 把优化器状态与更新卸载到 CPU，ZeRO-Infinity 进一步把参数、梯度与优化器状态卸载到 CPU/NVMe，以吞吐为代价换取单卡可训练规模的继续放大，详见 [ZeRO 教程](https://www.deepspeed.ai/tutorials/zero/) 与 [ZeRO-3 文档](https://deepspeed.readthedocs.io/en/latest/zero3.html)。

通信重叠和流水线并行是另两类优化：前者把反向传播中的梯度通信与计算重叠以隐藏通信时间，后者把模型按层切分到不同设备形成流水线执行。DeepSpeed 还能与 Megatron-LM 的混合并行结合，形成 ZeRO 加张量并行、流水线并行的组合方案，即通常所说的 3D 并行。

框架封装不消除底层约束。全局 batch 的构成（每卡 micro batch、设备数与梯度累积步数的乘积）、GPU 拓扑与通信域、checkpoint 的分片与恢复语义仍需使用者自己理解，否则在扩大规模或恢复训练时容易出错。

## 案例

常见场景是模型在纯 DDP 下因显存不足而 OOM。此时可启用 ZeRO 阶段 2 或阶段 3，对比改造前后的峰值显存与有效吞吐 (token/s)：

```bash
deepspeed --num_gpus=8 train.py --deepspeed ds_config.json
```

若吞吐明显回退，不要只归因于「ZeRO 变慢」，而应拆解开销：阶段 3 会带来频繁的参数 all-gather 与 reduce-scatter 通信，检查通信时间占比和网络带宽；开启 offload 后还要看 CPU 与 GPU 之间的搬运是否成为瓶颈。必要时降低阶段、关闭卸载或调整梯度累积步数，在显存与吞吐之间取平衡。一个可操作的对比基线是：同一批数据与相同全局 batch 下，分别记录阶段 2 与阶段 3 的峰值显存、每步耗时与 token/s，再判断多省下的显存是否值得付出的通信代价。

## 相关主题

- [ZeRO](../distributed/zero.md)
- [PyTorch](./pytorch.md)
