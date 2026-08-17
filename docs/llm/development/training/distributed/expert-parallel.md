---
title: Expert Parallel
---

专家并行 (Expert Parallel, EP) 把 MoE 的不同专家放到不同设备，并路由 token 到对应设备计算。它专门解决稀疏混合专家模型 (Mixture of Experts, MoE) 中专家参数过多、单卡放不下的问题，通常与数据并行、张量并行组合使用。

专家并行的由来是：MoE 用「稀疏激活」换模型容量，但专家总数往往远超单卡能容纳的规模。GShard 首先把专家按设备切分并用 all-to-all 交换 token，Switch Transformer 用 Top-1 路由与容量因子简化了负载管理，DeepSpeed-MoE 则系统化地结合了专家并行与 ZeRO。源头见 [GShard](https://arxiv.org/abs/2006.16668) 、 [Switch Transformer](https://arxiv.org/abs/2101.03961) 与 [DeepSpeed-MoE](https://arxiv.org/abs/2201.05596) 。

## 快速开始

监控专家负载、token 丢弃和 all-to-all 时间；先在小规模验证路由正确与负载均衡。可操作的起点：

1. 先用一个较小的 MoE 模型跑通前向与反向，确认每个 token 被路由到的 top-k 专家编号正确。
2. 记录每步各专家的 token 数量分布，以及路由到各设备的 all-to-all 通信耗时。
3. 观察负载均衡辅助损失和容量因子 (capacity factor) 的取值，确认没有大量 token 因超过容量被丢弃。
4. 用不同 batch 大小压测，观察通信时间是否随 token 数线性增长。

验证成功的标准：路由结果正确、各专家负载接近均匀、all-to-all 时间占单步耗时的比例可控，且 token 丢弃率稳定在低水平。

## 机制

MoE 层中每个 token 经过路由后只激活少数几个专家。专家并行把不同专家分散到不同设备，让每个设备只保存自己那部分专家的参数。一个 token 完成路由后，需要从它所在设备发送到目标专家所在设备，这一步通过 all-to-all 集合通信完成；专家计算结束后，输出再通过一次 all-to-all 送回原设备，继续后续层的前向。

因此，专家并行的通信量取决于被路由 token 的数量和跨设备分布，而不是固定的权重大小。若一个 batch 有 $T$ 个 token、隐藏维度为 $h$、Top-k 路由，则每个 token 被发往 $k$ 个专家，dispatch 与 combine 两个方向的通信量各约 $T h k$，一个 MoE 层合计约 $2 T h k$。当 token 在专家间分布不均时，会出现「热门专家」被大量 token 同时请求，导致该设备计算等待变长、其他设备闲置；同时 all-to-all 的两个方向都可能成为瓶颈。

负载均衡通常通过给路由损失加一个「均衡辅助项」来鼓励 token 均匀分布。Switch Transformer 的形式为：

$$
\mathcal{L} = \alpha \cdot E \sum_{i=1}^{E} f_i P_i
$$

其中 $E$ 是专家数，$f_i$ 是实际路由到专家 $i$ 的 token 比例，$P_i$ 是 router 分配给专家 $i$ 的平均概率，$\alpha$ 是权重系数。这一项在「所有专家等分 token」时取到最小值，从而抑制少数专家垄断。

同时用容量因子限制单个专家可接收的 token 上限：每个专家的容量约为

$$
\text{capacity} = \text{capacity factor} \times \frac{k T}{E}
$$

超出容量部分的 token 直接丢弃。容量因子越大越少丢弃、但各设备预留的 buffer 越多、显存与通信也越大。这些手段在吞吐和模型质量之间做取舍，需要结合具体任务调节。

## 案例

假设某 MoE 模型在训练中观察到某专家收到大多数 token，其所在设备的通信和等待时间明显上升。此时可按以下思路处理：

1. 先确认是路由本身偏向还是数据分布导致，再决定是否加强均衡辅助损失的权重。
2. 适当提高容量因子，减少因容量不足导致的 token 丢弃。
3. 观察吞吐和最终 loss 是否共同改善：若吞吐上升但 loss 变差，说明均衡过度、损害了专家的分工，应回退部分调整。

网络与负载不均是专家并行性能的主要决定因素，调整时应同时监控通信时间和模型质量，避免只优化吞吐。

## 相关主题

- [MoE](../../architecture/moe.md)
- [InfiniBand](../../../infrastructure/network/infiniband.md)
