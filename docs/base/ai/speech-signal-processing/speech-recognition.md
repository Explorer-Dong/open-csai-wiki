---
title: 自动语音识别
---

自动语音识别 (Automatic Speech Recognition, ASR) 把波形或声学特征转换为字符、子词或词序列。现代主流路线不再依赖人工设计的音素状态树，而是使用 Encoder 提取语音表示，并通过 CTC、Transducer 或 Encoder-Decoder 目标完成对齐和解码。

## 快速开始

建立 ASR 基线时按以下顺序进行：

1. 把音频统一到模型采样率，保留原始时长与语言标签。
2. 使用预训练模型原生的特征提取器和 tokenizer，不手工替换归一化参数。
3. 在 10 至 100 条样本上完成前向、计算损失和解码，确认文本规范化一致。
4. 分别统计总体 WER/CER，以及按时长、噪声、口音、语言和说话人的分桶结果。

转写文本的标点、大小写、数字和简繁体规范会直接影响指标。训练标签与评测归一化必须分开保存：前者决定模型输出空间，后者只用于公平比较。

## 路线演进

动态时间规整 (Dynamic Time Warping, DTW) 通过模板对齐识别孤立词，适合极小词表。GMM-HMM 把发音状态转移与声学观测分开建模，长期用于大词汇连续语音识别。DNN-HMM 用神经网络替换 GMM，但仍依赖词典、状态绑定和解码图。

端到端 ASR 把声学建模、对齐和输出学习放进统一网络。常见 Encoder 使用卷积、Transformer 或 [Conformer](https://arxiv.org/abs/2005.08100)；后者结合卷积的局部模式与自注意力的长距离依赖。

## CTC

连接时序分类 (Connectionist Temporal Classification, CTC) 为输出词表增加 blank，并对所有能折叠为目标文本的单调对齐求和。设 Encoder 输出 $H\in\mathbb{R}^{B\times T\times D}$，词表含 blank 后大小为 $V$，logits 为 $Z\in\mathbb{R}^{B\times T\times V}$，目标序列 $Y\in\mathbb{N}^{B\times U}$ 且 $U\le T$：

$$
p(Y\mid X)=\sum_{a\in\mathcal{B}^{-1}(Y)}
\prod_{t=1}^{T}p(a_t\mid X),\qquad
\mathcal{L}_{\text{CTC}}=-\log p(Y\mid X)
$$

$\mathcal{B}$ 删除重复标签和 blank。CTC 可并行训练、结构简单，也便于时间对齐；条件独立假设使它较依赖 Encoder 上下文或外部语言模型。

## Transducer

循环神经网络转导器 (Recurrent Neural Network Transducer, RNN-T) 及其 Transformer/Conformer 变体由音频 Encoder、标签 Predictor 和 Joint Network 组成。Joint logits 的概念形状为 $[B,T,U+1,V]$，模型在时间轴上输出 blank 或在标签轴上发出 token。[RNN-T](https://arxiv.org/abs/1211.3711) 对所有合法二维路径求和，天然适合流式识别，但动态规划和解码实现更复杂。

流式系统要限制 Encoder 的右侧上下文并缓存历史状态。平均 WER 相同时，首字延迟、稳定文本延迟和回改次数可能完全不同，因此必须单独测量。

## Encoder-Decoder

注意力 Encoder-Decoder 直接自回归生成文本：

$$
\mathcal{L}_{\text{AED}}
=-\frac{1}{\sum M_{b,u}}
\sum_{b,u}M_{b,u}\log p(y_{b,u}\mid y_{b,<u},X_b)
$$

文本 logits 形状为 $[B,U,V]$，标签和 mask 为 $[B,U]$。它能把语言建模与转写统一起来，也容易扩展到翻译、语言识别和时间戳。[Whisper](https://arxiv.org/abs/2212.04356) 展示了大规模弱监督、多语言、多任务 Encoder-Decoder 的稳健迁移能力。其缺点是自回归解码较慢，并可能在静音、强噪声或领域外输入上产生语言上合理但音频中不存在的文本。

## 解码与语言模型

贪心解码每步取最高概率，速度快；beam search 保留多条候选，可融合外部语言模型、词典和热词。外部语言模型分数通常写为：

$$
s(Y)=\log p_{\text{ASR}}(Y\mid X)
+\lambda\log p_{\text{LM}}(Y)+\gamma |Y|
$$

$\lambda$ 控制语言模型权重，$\gamma$ 控制长度或插入惩罚。热词能改善专有名词，但过强会把无关片段强行解码成热词，需要单独评估误触发率。

## 评测与错误分析

词错误率 (Word Error Rate, WER) 为：

$$
\mathrm{WER}=\frac{S+D+I}{N}
$$

$S,D,I$ 分别是替换、删除和插入数，$N$ 是参考词数。中文等分词边界不稳定的语言常同时报告字符错误率 (Character Error Rate, CER)。

一个可执行的错误分析案例是抽取每类 50 条错误，按「专有名词、数字、口音、重叠说话、噪声、截断、幻觉」标注。若总体 WER 下降但数字和实体错误上升，产品质量不一定改善；应结合领域词准确率、长音频漂移、实时率和内存占用选择模型。
