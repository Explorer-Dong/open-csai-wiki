---
title: Pipeline Parallel
---

流水线并行 (Pipeline Parallel, PP) 把模型层分到多个 stage，每个 stage 处理不同 micro batch，通过流水线隐藏通信与计算空隙。它主要解决「整个模型放不进单卡」的问题，而不是提升单 step 的延迟。

流水线并行的由来是：张量并行能解决「单层放不下」，但当模型层数多、整体体积远超单卡时，逐层切分、让相邻层驻留在不同设备更自然。这一思想由 GPipe 首次以 micro-batch 流水线形式给出，随后 Megatron-LM 提出 1F1B 调度降低激活驻留，再演化出交错 1F1B 进一步缩小气泡。源头见 [GPipe 论文](https://arxiv.org/abs/1811.06965) 与 [Megatron-LM 论文](https://arxiv.org/abs/1909.08053) 。

## 快速开始

按层数和计算量均衡划分 stage，设置足够 micro batch 降低流水线气泡，并先验证跨 stage 激活传输。建议步骤：

1. 统计每层的参数量和 FLOPs，按「各 stage 总计算量尽量相等」把层分组，而不是简单按层数平分。
2. 确定 stage 数量后，把相邻 stage 放到尽可能近的设备上，减少激活传输开销。
3. 把 mini-batch 切成多个 micro batch，让各 stage 可以并行处理不同的 micro batch。
4. 先验证前向激活能否在 stage 间正确传递、反向梯度能否正确回传，再开启完整训练。

验证成功：各 stage 的每步耗时接近、流水线气泡占比随 micro batch 数增加而下降，且 loss 与小规模基线一致。

## 机制

流水线并行中，前向激活从第一个 stage 逐级向后流动，反向时梯度从最后一个 stage 逐级向前流动。一个 micro batch 只有走完所有 stage 的前向才能开始反向，因此在「启动」和「收尾」阶段，部分设备处于空闲状态，这些空闲时间被称为流水线气泡 (pipeline bubble)。

气泡大小与 stage 数、micro batch 数密切相关。对 $P$ 个 stage、$m$ 个 micro batch 的 GPipe 调度，气泡占调度时长的比例约为：

$$
\text{bubble} = \frac{P-1}{P-1+m}
$$

可以看到，micro batch 越多，气泡相对占比越小，流水线利用率越高；但 micro batch 过多会增加激活缓存的显存压力，因为前向过程中需要保存中间激活供反向使用。

常见的调度策略有 GPipe（先全部前向、再全部反向，气泡最大但实现简单）和 1F1B（one-forward-one-backward，交错执行前向与反向，减少同时驻留的激活）。二者的气泡时间占比相同，区别在于激活驻留：GPipe 需同时保存 $m$ 个 micro batch 的激活，1F1B 只需约 $P$ 个，因此 1F1B 在大模型上显著节省显存。交错 1F1B 则把每个 stage 再切成多个小段交错排布，进一步缩小气泡，代价是实现复杂度上升。

通信上，流水线并行只在 stage 边界做点对点传输：每个 micro batch 前向发送规模为 $b \times s \times h$ 的激活，反向回传同样大小的梯度，总计约 $2(P-1) b s h$，通信量远小于张量并行，且点对点传输可与计算重叠。选择哪种调度，需要在气泡、显存和实现复杂度之间权衡。

## 案例

以 24 层模型分为 4 个 stage 为例，每个 stage 分到 6 层。先看默认调度下的流水线气泡占比，逐步增加 micro batch 数，观察利用率提升和显存增长。若利用率随 micro batch 增加而明显改善，说明瓶颈在气泡；若某个 stage 的单步耗时显著高于其他 stage，说明划分不均衡，应重新按计算量均衡层，而不是一味增加 micro batch。

重新均衡后再次观察：各 stage 耗时接近、气泡占比下降到可接受范围，说明流水线并行配置合理。

## 相关主题

- [Tensor Parallel](./tensor-parallel.md)
- [混合并行](./hybrid-parallel.md)
