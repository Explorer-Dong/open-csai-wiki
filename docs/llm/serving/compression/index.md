---
title: 模型压缩
icon: lucide/shrink
---

## 独立专题

- [Quantization](./quantization.md)
- [Distillation](./distillation.md)
- [Pruning](./pruning.md)

模型压缩通过降低数值精度、迁移能力或移除冗余参数，减少显存、计算和部署成本。

## 快速开始

显存不足时先尝试权重量化，并在目标任务上评测质量；延迟仍不满足要求时考虑更小模型或蒸馏；剪枝只有在推理后端能利用相应稀疏结构时才可能带来真实加速。

## 量化

量化 (Quantization) 把 FP32、BF16 或 FP16 的权重和激活映射到 INT8、INT4 或 FP8 等低精度表示。仅权重量化便于部署；权重和激活同时量化通常更快，但校准与精度控制更困难。

以对称量化为例：

$$
q=\operatorname{clip}\left(\operatorname{round}(x/s),q_{\min},q_{\max}\right),\qquad \hat{x}=s q
$$

尺度 $s$ 决定可表示范围和误差。按通道或按组设置尺度通常比整个张量共享尺度更准确，但元数据与 Kernel 更复杂。

## 蒸馏

知识蒸馏 (Knowledge Distillation) 让较小的 Student 模型学习 Teacher 的输出分布、生成轨迹或中间表示。它可以针对特定任务压缩能力，但 Student 不会自动继承 Teacher 在所有分布外任务上的表现。

## 剪枝

剪枝 (Pruning) 分为非结构化与结构化方法。非结构化剪枝产生稀疏权重，压缩率高但通用硬件未必加速；结构化剪枝移除 Head、Channel、Layer 或 Expert，更容易获得实际收益，但能力损失可能更明显。

## 评测案例

量化前后使用同一批 Prompt，分别测量任务正确率、困惑度、TTFT、TPOT、吞吐、显存和模型加载时间。只比较文件大小无法证明部署收益；如果后端在运行时反量化，计算速度可能没有同步提升。
