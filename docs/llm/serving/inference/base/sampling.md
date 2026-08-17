---
title: Sampling
---

Sampling 将 logits 转换为下一个 token，控制输出的随机性、多样性和稳定性。选对采样参数往往比盲目加大模型更能改善特定任务的表现。采样策略的演进源于一个具体痛点：单纯取最大概率 token 的贪心解码容易陷入重复与退化，于是人们先后引入 [top-k](https://arxiv.org/abs/1805.04833) 截断和 [nucleus sampling (top-p)](https://arxiv.org/abs/1904.09751) 来在多样性与质量之间取得平衡。

## 快速开始

从 temperature 0 的确定性基线开始，确认模型在无随机性下能稳定输出，再调整 temperature、top-p、top-k 和随机种子。每次只改一个参数，并记录完整参数组合以便复现。

对比不同参数在目标任务上的指标（解析成功率、重复率等），而不是只靠主观感觉。随机种子也应固定，避免评测结果不可复现。验证成功的标准是：在固定种子与参数组合下输出逐 token 完全可复现，且各参数对多样性的影响方向与理论一致（temperature 越高越随机、top-p 越小候选越集中）。

## 常用策略

temperature 缩放分布；top-k 限制候选数；top-p 保留累计概率质量。贪心解码稳定但可能缺少多样性。

具体而言，temperature 对 logits 做缩放，给定 logits $z$，缩放后的概率为：

$$
p_i=\frac{\exp(z_i/T)}{\sum_j\exp(z_j/T)}
$$

$T$ 小于 1 时分布更集中、更确定，大于 1 时分布更平坦、更随机；$T$ 趋于 0 时退化为贪心解码。top-k 只保留概率最高的 $k$ 个候选，其余置零后重新归一化；top-p 则从高到低累加概率，只保留累计到阈值 $p$ 的候选集。top-p 由 [Holtzman 等人](https://arxiv.org/abs/1904.09751) 提出，其定义可写为选择最小的候选集 $V^{(p)}$ 使得：

$$
\sum_{x\in V^{(p)}}p(x\mid x_{<t})\ge p
$$

其中 $p(x\mid x_{<t})$ 是当前条件分布。与 top-k 相比，top-p 的候选数随分布形态自适应变化：分布集中时保留更少候选，分布平坦时保留更多，避免了固定 $k$ 的截断过死或过松。

贪心解码等价于 temperature 极低且只取最高概率 token，稳定但容易陷入重复。实践中常把 temperature 与 top-p 或 top-k 组合使用，而非单独依赖某一项。一个最小采样实现如下：

```python
import torch
import torch.nn.functional as F

def sample_next(logits, temperature=1.0, top_k=0, top_p=1.0, seed=None):
    if seed is not None:
        torch.manual_seed(seed)
    logits = logits / temperature
    if top_k > 0:
        v, _ = torch.topk(logits, top_k)
        logits[logits < v[:, -1:]] = float("-inf")
    if top_p < 1.0:
        probs = F.softmax(logits, dim=-1)
        sorted_probs, _ = torch.sort(probs, descending=True)
        cum = torch.cumsum(sorted_probs, dim=-1)
        cutoff = sorted_probs[cum > top_p][:1]
        logits[probs < cutoff] = float("-inf")
    probs = F.softmax(logits, dim=-1)
    return torch.multinomial(probs, 1)
```

这段代码演示了 temperature、top-k、top-p 的叠加顺序，验证标准是固定种子后输出可复现，且不同参数组合产生符合预期的多样性差异。

## 案例

对结构化 JSON 任务使用低 temperature，并统计解析成功率；对创意任务提高 temperature，比较重复率和人工偏好。

若 JSON 解析失败率升高，先检查采样是否引入了过多随机性，或配合格式约束解码；若创意任务重复严重，可提高 temperature 或调整 top-p 扩大候选空间。判断时要把「采样随机性」与「格式约束」分开处理：前者影响候选分布，后者通过限制合法 token 集合直接约束输出结构，二者可以叠加但不能互相替代。

## 相关主题

- [自回归推理](./autoregressive-inference.md)
- [部署性能](../../deployment/performance/index.md)
