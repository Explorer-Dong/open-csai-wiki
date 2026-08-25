---
title: 语音表征
---

语音表征把高频率、长序列的波形压缩为模型更容易使用的连续向量或离散 token。当前主要有三类表示：Log-Mel/MFCC 等声学特征、自监督 Encoder 的连续隐藏状态、神经音频编解码器的离散码。选择哪一类取决于任务需要保留语义、说话人、韵律还是波形细节。

## 快速开始

对同一段音频提取三种表示并比较：

1. Log-Mel：检查帧数、频带数和语谱结构。
2. 自监督 Encoder 隐藏状态：冻结 Encoder，训练一个轻量分类头或 CTC 头。
3. 神经编解码器 token：编码后立即解码，比较重建听感、码率和说话人相似度。

如果任务是 ASR 或分类，优先从连续表示开始；如果任务要由语言模型生成高保真语音，通常需要离散 codec token 或连续生成潜变量。不要仅因 token 可以输入 Transformer 就假设它同时保留了完整语义与声学信息。

## 手工声学特征

MFCC、滤波器组能量、基频和过零率由固定算法计算，参数少且可解释。它们曾与 VQ、GMM-HMM、SVM 等模型配合使用，也仍适合小数据基线和信号质量检测。局限是表示目标由人工指定，同一组特征很难同时覆盖识别、说话人和情感。

设 Log-Mel 输入为 $X\in\mathbb{R}^{B\times F\times M}$，常见模型把它投影为隐藏状态 $H\in\mathbb{R}^{B\times T\times D}$。卷积下采样会使 $T<F$，因此任何帧级标签都要跟随相同时间缩放。

## 自监督连续表示

自监督学习利用大量无转写语音构造预训练目标，再用少量标注适配下游任务。[wav2vec 2.0](https://arxiv.org/abs/2006.11477) 在潜在空间遮盖片段，并通过对比学习从量化候选中识别正确目标；[HuBERT](https://arxiv.org/abs/2106.07447) 先对声学特征聚类，把聚类编号作为遮盖预测的伪标签；[WavLM](https://arxiv.org/abs/2110.13900) 把遮盖预测与去噪结合，以覆盖识别、说话人和副语言任务。

以 HuBERT 类目标为例，Encoder 输出 $H\in\mathbb{R}^{B\times T\times D}$，聚类标签为 $C\in\{1,\dots,K\}^{B\times T}$，遮盖位置为 $M\in\{0,1\}^{B\times T}$，分类 logits 为 $Z\in\mathbb{R}^{B\times T\times K}$。损失为：

$$
\mathcal{L}_{\text{mask}}
=-\frac{1}{\sum_{b,t}M_{b,t}}
\sum_{b,t}M_{b,t}\log p(C_{b,t}\mid H_{b,t})
$$

预训练后的不同层保留的信息不完全相同：较浅层更偏局部声学，较深层通常更偏内容与上下文。下游任务可以使用最后一层、学习各层加权和，或微调整个 Encoder。说话人识别不一定适合直接使用最深层，因为过强的内容不变性可能同时削弱身份线索。

## 神经音频编解码器

神经音频编解码器由 Encoder、量化器和 Decoder 组成：

$$
x\in\mathbb{R}^{B\times C\times N}
\xrightarrow{E}
z\in\mathbb{R}^{B\times T\times D}
\xrightarrow{Q}
c\in\{1,\dots,K\}^{B\times T\times Q}
\xrightarrow{D}
\hat{x}\in\mathbb{R}^{B\times C\times N}
$$

$Q$ 表示残差量化器的码本层数。每个时间步产生多个 codebook id，因此 50 Hz 帧率、8 个码本并不等于每秒只有 50 个 token，而是每秒 400 个离散索引。[SoundStream](https://arxiv.org/abs/2107.03312) 和 [EnCodec](https://arxiv.org/abs/2210.13438) 展示了端到端神经压缩与残差向量量化路线，后续 codec language model 直接预测这些索引。

编解码器训练通常组合波形、频谱、对抗和特征匹配损失：

$$
\mathcal{L}_{\text{codec}}
=\lambda_t\lVert x-\hat{x}\rVert_1
+\lambda_f\mathcal{L}_{\text{multi-STFT}}
+\lambda_a\mathcal{L}_{\text{adv}}
+\lambda_m\mathcal{L}_{\text{feat}}
$$

不同损失优化的感知属性不同，只看波形均方误差通常会得到过度平滑的音频。

## 语义 token 与声学 token

离散 token 可以粗分为两类：

- 语义 token 主要保留音素和语言内容，帧率较低，适合语言建模，但可能丢失音色和背景声。
- 声学 token 保留音色、韵律和波形细节，通常需要多级码本，序列更长、生成成本更高。

一些系统先生成语义层，再条件生成声学层；另一些系统把文本 token 与多层音频 token 交错预测。设计时要明确 token rate、codebook 数、词表大小和因果性，因为它们直接决定上下文长度与流式延迟。

## 表征选择

| 目标 | 推荐起点 | 关键验证 |
| --- | --- | --- |
| 低资源 ASR | 自监督连续表示 + CTC | WER、标注量、冻结与微调差异 |
| 说话人或情感 | WavLM 类表示 + pooling | 跨说话人切分、类别偏差 |
| 高保真生成 | codec token 或连续声学潜变量 | 重建质量、码率、token rate |
| 实时语音交互 | 因果 Encoder 或流式 codec | 首包延迟、块边界、状态缓存 |
| 小数据可解释基线 | MFCC、基频、能量 | 特征归一化和跨设备鲁棒性 |

表征本身的离线指标不能代替下游评测。编解码器重建听感好，不代表 token 容易被语言模型预测；ASR 表征 WER 低，也不代表它保留了合成所需的音色和韵律。
