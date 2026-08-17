---
title: Prefill 与 Decode 分离
---

Prefill/Decode 分离 (Prefill-Decode Disaggregation, PD) 让不同 GPU 池分别处理输入计算与逐 token 生成。两者对算力和显存的需求特征不同：prefill 是计算密集、随 prompt 长度变化大，decode 是访存密集、对显存带宽敏感，分离后可分别扩缩容和调优。

这一思想由 Splitwise 首次系统提出，把推理的 prefill 与 decode 两个阶段拆到不同硬件资源上运行，随后 DistServe 进一步把它与服务水平目标 (Service Level Objective, SLO) 结合，从「goodput」角度论证分离的价值，见 [Splitwise 论文](https://arxiv.org/abs/2311.18677) 与 [DistServe 论文](https://arxiv.org/abs/2401.09670) 。拆分的根本原因是两者的计算特征相反：prefill 一次处理整个 prompt、矩阵运算密集、算术强度高，decode 逐 token 生成、每次只处理一个 token、以 KV Cache 访存为主，两者混在同一批请求里会互相干扰延迟。

## 快速开始

先量化两阶段负载，设计 KV Cache 传输、重试和版本一致性，再小规模灰度。建议步骤：

1. 统计真实流量中 prefill 与 decode 的 token 比例、并发峰值和时延分布，量化两阶段负载。
2. 设计 prefill 完成后把 KV Cache 传给 decode 的路径，包括传输格式、目标和一致性校验。
3. 规划失败重试：KV 传输失败或 decode 节点故障时如何回退，请求如何重新调度。
4. 保证两套 worker 的模型权重、分词器、采样参数版本一致，避免行为漂移。
5. 在小规模流量上灰度，对比分离前后的 TTFT、TPOT 和整体吞吐。

验证成功：两阶段负载清晰、KV 传输可靠、版本一致，灰度期间关键指标没有劣化。

## 案例

长文档请求突然增多，压垮了 prefill 池，导致 prefill 排队、TTFT 升高。此时独立扩容 prefill worker 即可吸收突发输入计算，decode 池保持低 TPOT，因为逐 token 生成的负载没有变化。

但 KV 传输开销必须计入收益：prefill 算出的 KV Cache 需要搬到 decode 节点，若 prompt 很长，KV 体积大，传输会消耗网络并可能成为新的瓶颈。评估时要用「分离后的总收益 = 独立扩缩容收益 - KV 传输与调度开销」来判断是否值得，必要时对 KV Cache 做压缩或就近调度。

## 相关主题

- [Prefill](../base/prefill.md)
- [Decode](../base/decode.md)
