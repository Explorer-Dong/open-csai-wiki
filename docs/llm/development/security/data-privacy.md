---
title: 数据隐私
---

训练数据隐私关注个人信息、机密信息和模型记忆泄露风险，是模型发布前必须评估的合规与技术问题。它的独特之处在于风险并不只在数据侧：模型会把训练数据编码进权重，训练结束后仍可能通过输出逐字复现，因此隐私控制必须同时覆盖「训练前」与「训练后」两个阶段。形式上，这类控制通常建立在差分隐私 (Differential Privacy, DP) 之上，其标准定义为：若对任意相邻数据集 $D$ 与 $D'$（只差一条记录）及任意输出集合 $S$ 有

$$
\Pr[\mathcal{M}(D) \in S] \le e^{\varepsilon}\,\Pr[\mathcal{M}(D') \in S] + \delta
$$

则称机制 $\mathcal{M}$ 满足 $(\varepsilon, \delta)$-DP；$\varepsilon$ 越小隐私越强，$\delta$ 是允许失效的概率上限。该定义最早由 [Dwork 等人提出](https://privacytools.seas.harvard.edu/files/privacytools/files/differential_privacy.pdf)，而将其落到深度学习训练的 [DP-SGD 由 Abadi 等人给出](https://arxiv.org/abs/1607.00133)。

## 快速开始

在训练前落实数据最小化、分级访问、脱敏和保留期：只收集训练真正需要的数据，按敏感级别限制访问，对姓名、证件号、密钥、内部代码等敏感片段做脱敏或替换，并明确数据何时删除。脱敏规则应提前定义，例如对邮箱、手机号、API 密钥分别套用正则替换或占位符：

```text
- 邮箱：user@example.com -> [EMAIL]
- 手机号：+86 138xxxx -> [PHONE]
- API 密钥：sk-... -> [SECRET]
- 内网地址：10.x.x.x -> [INTERNAL_IP]
```

脱敏只能降低直接暴露，不能阻止模型通过统计规律重建敏感信息。若训练数据本身涉及个人记录，应在训练阶段叠加 DP-SGD：对每个样本的梯度做范数裁剪，再注入高斯噪声，从而限制单条记录对最终模型的影响。DP-SGD 的第 $t$ 步梯度更新为

$$
\tilde{g}_t = \frac{1}{L}\Big(\sum_{i=1}^{L} \mathrm{clip}\big(\nabla_\theta \ell(x_i;\theta_{t-1}), C\big) + \mathcal{N}\big(0, \sigma^2 C^2 I\big)\Big)
$$

其中 $L$ 是 batch 大小，$C$ 是裁剪阈值，$\sigma$ 是噪声倍率，$\mathrm{clip}$ 把每个样本梯度范数压到 $C$ 以内。实用中可直接使用 [Opacus](https://opacus.ai/)（PyTorch）或 [TensorFlow Privacy](https://github.com/tensorflow/privacy)：

```python
from opacus import PrivacyEngine

privacy_engine = PrivacyEngine()
model, optimizer, data_loader = privacy_engine.make_private(
    module=model,
    optimizer=optimizer,
    data_loader=data_loader,
    noise_multiplier=1.1,
    max_grad_norm=1.0,
)
```

噪声越强，隐私预算消耗越小，但模型质量下降越明显，需要在 $(\varepsilon, \delta)$ 与可用性之间取舍。训练后执行记忆与泄露测试：用成员推断 (Membership Inference) 判断某条记录是否进入过训练集，用提示复现测试检查模型是否能在诱导下输出训练原文。两项结果都应纳入发布门禁，而不是等到泄露事故后再补救。验证方式是在保留的敏感样本上跑复现测试，确认复现率低于设定阈值后再允许发布。

## 风险

公开数据也可能含敏感片段：代码仓库中的 API 密钥、论坛里的联系方式、文档里的内部术语都可能被误抓入训练集。「已公开」只说明来源可访问，不说明其中内容可以无约束地复现或再分发。

模型可能在特定提示下复现训练内容，尤其是重复出现或高价值的记录：重复样本被记忆的概率更高，密钥、令牌这类低熵短串则几乎可以被逐字恢复。[Carlini 等人的训练数据抽取研究](https://arxiv.org/abs/2012.07805) 证明 GPT-2 规模的语言模型即可被诱导逐字输出训练原文，包括姓名、联系方式等。成员推断攻击的强度常用「优势」(advantage) 度量，其定义最早由 [Shokri 等人提出](https://arxiv.org/abs/1610.05820)，可简写为

$$
\mathrm{Adv} = \Pr[\mathcal{A}(x)=1 \mid x \in D] - \Pr[\mathcal{A}(x)=1 \mid x \notin D]
$$

其中 $\mathcal{A}$ 是攻击者，$x \in D$ 表示记录在训练集中。$\mathrm{Adv}$ 越接近 1，说明攻击者越能可靠区分成员与非成员。这些泄露无法靠单一的「隐私过滤」彻底解决，需要结合去重、采样控制和发布前的针对性测试来降低风险。单条敏感记录被复现一次就可能造成实际危害，因此门槛不能只按「复现率」粗粒度判断，还要看「被复现的内容是否高价值」。

## 案例

对候选敏感样本做 membership 与提示复现测试：从训练集中抽取疑似敏感的记录，构造提示尝试诱导模型续写，并统计逐字或近似复现的比例。若某些记录能稳定复现，说明模型已将其记忆。

将这些发现纳入发布门禁：复现率超过阈值时，通过重采样、降低重复样本权重或从数据中剔除来修正，必要时重新训练。不能只依赖数据「已公开」的假设来免除评估，因为公开与「可被模型复现并造成危害」是两回事。常见的失败点是只在合成数据上测试、忽略了真实训练集中的高重复片段，导致漏报。

## 相关主题

- [数据版权](./data-copyright.md)
- [安全对齐](./safety-alignment.md)
