---
title: HBM
---

高带宽内存 (High Bandwidth Memory, HBM) 是数据中心 GPU 常用的堆叠显存技术。它通过宽数据接口提供很高带宽，保存模型权重、激活、梯度、优化器状态和 KV Cache；容量与带宽共同决定大模型能否装入及实际运行速度。

## 快速开始

先观察显存容量和实时使用：

```bash
nvidia-smi --query-gpu=memory.total,memory.used,utilization.memory --format=csv
```

再用真实上下文长度与并发压测。模型权重刚好装入显存不表示服务可用，仍需给 KV Cache、临时 Workspace、CUDA Graph 与框架开销预留空间。

## 容量与带宽

容量回答“能放多少数据”，带宽回答“每秒能搬多少数据”。训练通常同时消耗两者：权重、梯度、优化器状态和激活占用容量；前向与反向反复读取写入数据，受带宽影响。

推理中，Prefill 的 Attention 和矩阵乘法具有较高数据复用；逐 Token Decode 必须反复读取权重并访问历史 KV Cache，常更接近带宽受限。

## 内存层次

GPU 内存从近到远大致为 Register、Shared Memory / L1、L2 和 HBM。高效 Kernel 尽量将 HBM 中的数据分块搬到更近的层次复用，减少总传输量。

若操作执行浮点运算量为 $F$、从 HBM 传输字节数为 $B$，算术强度为：

$$
I=\frac{F}{B}
$$

Roofline 模型给出性能上界：

$$
P\leq\min(P_\text{compute}, I\times BW_\text{HBM})
$$

算术强度低的任务即使拥有更多 FLOPS，也可能受 HBM 带宽限制。

## KV Cache 案例

KV Cache 的容量近似与层数 $L$、序列长度 $S$、并发 Batch $B$、KV Head 数 $H_{kv}$、Head Dim $D$ 和数据类型字节数 $b$ 成正比：

$$
M_\text{KV}\approx 2\times L\times S\times B\times H_{kv}\times D\times b
$$

前面的 2 表示 Key 和 Value。长上下文与并发同时增长时，Cache 会快速占满 HBM。GQA / MQA、KV 量化、PagedAttention、Prefix Cache 和请求限额都可缓解压力，但各自有质量、复杂度或隔离取舍。

## 训练容量案例

一个 7B 参数模型仅 FP16 权重约占 14 GB。全参数 AdamW 训练还需梯度、两个优化器状态以及激活，实际需求远大于权重大小。可通过混合精度、激活重计算、ZeRO / FSDP 分片和 CPU Offload 降低单卡容量，但会增加计算或通信。

## 带宽诊断

当 Decode 的每 Token 延迟高、GPU 算力利用率低但显存读写接近饱和时，优先怀疑带宽。可尝试：

1. 提高连续批处理并发，增加权重复用；
2. 使用 GQA、MQA 或 MLA 减少 KV 数据；
3. 量化权重或 KV Cache；
4. 减少不必要的类型转换和中间张量；
5. 使用针对目标 GPU 的高效 Kernel。

不能只提高 Batch；显存不足、TTFT 变差或尾延迟上升时需重新平衡。

## 常见问题

- HBM 容量大不意味着带宽一定更高，必须查看具体 GPU；
- `nvidia-smi` 空闲显存不等于框架能得到连续可用空间；
- 显存碎片常来自变长请求与动态分配，PagedAttention 可改善但不能创造容量；
- PCIe 显存卸载比 HBM 慢得多，适合容量折中而非免费扩展；
- 文件中模型大小与运行时显存不同，因为还存在解压、Workspace 和 Cache。

计算单元见 [Tensor Core](./index.md#tensor-core)，推理缓存管理见 [PagedAttention](../../serving/inference/optimization/pagedattention.md)，显卡总览见 [GPU](./gpu.md)。
