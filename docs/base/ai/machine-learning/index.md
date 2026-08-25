---
title: 机器学习导读
icon: material/chart-line
---

> 科学发展范式：实验科学 $\to$ 理论科学 $\to$ 计算科学 $\to$ 数据科学。

本文记录机器学习相关内容。主要参考内容：

- 教材：周志华老师的 [西瓜书](https://github.com/jingyuexing/Ebook/blob/master/Machine_Learning/机器学习_周志华.pdf)（配套的公式详解 [南瓜书](https://github.com/datawhalechina/pumpkin-book)），邱锡鹏老师的 [神经网络与深度学习](https://nndl.github.io/)。
- 代码：[mlxtend](https://rasbt.github.io/mlxtend/)、[scikit-learn](https://scikit-learn.org/stable/api/index.html)、[scikit-learn 中文](https://scikit-learn.org.cn/)。

机器学习是一种通过学习数据规律，实现预测任务的研究范式。由于机器学习领域十分宏大，衍生出的子分支也极具研究价值，考虑到文章定位以及篇幅问题，本文仅仅针对传统机器学习展开。[深度学习](../deep-learning.md)、[强化学习](../reinforcement-learning.md) 等子领域不在本文的讨论范围内。

机器学习的常见术语：

- 计算学习理论：概率近似正确 (Probably Approximately Correct, PAC) 理论。即以很高的概率得到很好的模型 $P(f(x)- y \le \epsilon) \ge 1 - \delta$。
- P 问题：在多项式时间内计算出答案的解。
- NP 问题：在多项式时间内检验解的正确性。
- 学习任务：监督学习、无监督学习、半监督学习、强化学习。
- 泛化能力：应对未见样本的平均拟合能力。
- 假设空间：所有可能的样本组合构成的集合空间。
- 独立同分布假设：历史和未来的数据来自相同的分布。
- No Free Launch 理论：没有绝对好的算法，只有最适合的算法。好的算法来自于对数据的好假设、好偏执。在实际应用时，我们需要大胆假设，小心求证。

机器学习的一般范式：

1. 数据处理。数据 $\mathcal D$ 决定上限，我们需要仔细分析数据特点并进行细致的预处理工作，例如：数据分析、数据清洗、特征工程等。
2. 模型构建。数据处理完后，我们需要根据数据特点和任务场景确定机器学习模型 $y=f(x;\theta,\lambda)$，将物理场景建模为数学公式。例如：线性模型、非线性模型等。
3. 参数学习。每一个模型都有一个待优化的目标 $\mathcal L(\theta;\mathcal D,\lambda)$，一般称为学习准则/目标函数/损失函数，其中包含可学习的参数 $\theta$ 和不可学习的超参数 $\lambda$。我们可以利用 [优化理论](../../math/optimization-method/index.md) 中的各种数值优化方法来迭代式地求解/学习出最佳参数 $\theta^*(\lambda)=\arg \min_{\theta}\mathcal L(\theta;\mathcal D_{\text{train}},\lambda)$，例如：梯度下降法、牛顿法等。
4. 超参调优。超参数 $\lambda$ 无法学习，只能手动调整。在将数据集划分为训练集 $\mathcal D_{\text{train}}$、验证集 $\mathcal D_{\text{val}}$ 和测试集 $\mathcal D_{\text{test}}$ 的情况下，一般使用训练集学习 $\theta$，使用验证集来度量不同超参数下的模型性能，最终选择验证集上表现最好的模型的超参数作为最佳超参数 $\lambda^*=\arg \min_{\lambda}\mathcal L(\theta^*(\lambda);\mathcal D_\text{val},\lambda)$。常见的 [超参调优方法](https://zhuanlan.zhihu.com/p/234509605) 有：网格搜索、随机搜索、贝叶斯优化。
5. 模型评估。对于训练好的模型，我们需要有对应的量化指标对其进行评价。不同的任务有不同的评价指标，例如：回归任务可以使用均方误差、分类任务可以使用 AUC 等。

本系列文章围绕 [数据处理](./data-processing.md)、[算法设计](./algo/index.md)（每个算法均包含模型构建、参数学习和超参调优）和 [模型评估](./evaluation.md) 三个部分展开。
