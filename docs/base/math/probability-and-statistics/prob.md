---
title: 概率论
---

本文介绍概率论相关知识。

## 基本概念

### 随机事件与样本空间

随机事件定义为某件事情的发生情况，比起这些情况都是取决于观察的结果，没有外物干预。

样本空间定义为随机事件发生的总集合 $\Omega$。

随机事件之间的关系与运算一般可以转化为离散数学中的集合论进行分析，常见的有如下几种：

1. 包含：$A \subset B$ or $B \subset A$；
2. 相等：$A=B$；
3. 并/和：$A \cup B$；
4. 交/积：$A \cap B \quad (AB)$；
5. 互斥/互不相容：$AB=\Phi$；
6. 对立事件/余事件：$A \cap B=\Phi \land A \cup B=\Omega$；
7. 差：$A-B=A \cap \overline{B} = A \overline B$；
8. 德摩根律。

### 概率的定义及其性质

有如下三种定义方式：

1. 统计定义：认为概率 = 频率；
2. 古典定义：认为样本空间是有限集，其中每个随机事件发生的概率是等可能的。例如：分房问题、生日问题等排列组合问题；
3. 几何定义：认为样本空间是不可列的（无法表示为离散的形式），其中每个随机事件发生的概率同样是等可能的。例如：公交车乘车（一维）、蒲丰 (Buffon) 投针（二维）等几何概率问题。

### 随机事件的概率模型

**条件概率**。以 $A,B$ 两个随机事件为例，在 $A$ 发生的情况下 $B$ 发生的概率模型如下：

$$
P(B \mid A) = \frac{P(AB)}{P(A)}
$$

**联合概率**。计算方法上使用了乘法原理，其一般式如下：

$$
\begin{aligned}
P(A_1 A_2 \cdots A_n) &= P(A_1) \prod_{k=2}^n P(A_k \mid A_1 A_2 \cdots A_{k-1})\\
\text{s.t.} &\quad  (A_1A_2...A_n)>0
\end{aligned}
$$

特别地，当 $n=2$ 时，就是我们很熟悉的计算公式：

$$
\begin{aligned}
P(AB) &= P(A)\cdot P(B\mid A)\\
\text{s.t.}&\quad P(A)>0
\end{aligned}
$$

**全概模型**。我们将样本空间 $\Omega$ 完全划分为 $n$ 个互斥的区域，即 $\Omega = \sum_{i=1}^{n} A_i$ ，则在样本空间中事件 $B$ 发生的概率 $P(B)$ 就是在各子样本空间中的概率之和：

$$
\begin{aligned}
P(B) &= P(B \Omega) \\
&= P(BA_1) + P(BA_2) + \cdots + P(BA_n) \\
&= P(A_1)\cdot P(B\mid A_1) + P(A_2)\cdot P(B\mid A_2) + \cdots + P(A_n)\cdot P(B\mid A_n) \\
&= \sum_{i=1}^n P(A_i)\cdot P(B\mid A_i)
\end{aligned}
$$

**贝叶斯模型**。在上述全概模型的基础之上，现在想要求第 $j$ 个子样本空间对于事件 $B$ 的发生贡献的概率占所有子空间贡献的概率的比，那么就是一个条件概率：

$$
P(A_j\mid B) = \frac{P(A_j)\cdot P(B\mid A_j)}{\sum_{i=1}^n P(A_i)\cdot P(B\mid A_i)}
$$

可以发现全概模型是将「求解当前事件的发生概率」拆分为了「求解所有子样本空间对当前事件的发生概率之和」，而贝叶斯模型则是追溯各个子样本空间对于当前事件发生概率的贡献占比。前者是正向思维，后者是逆向思维。

### 随机事件的独立性

**独立性定义**。若 $A_1,A_2,...,A_n$ 相互独立，则有：

$$
P(A_1 A_2 \cdots A_n) = P(A_1)\cdot P(A_2)\cdots P(A_n)
$$

且 $\hat{A_1},\hat{A_2},...,\hat{A_n}$ 也相互独立，其中 $\hat{A_i} = A_i \ or \ \overline{A_i}\ (1\le i \le n)$。

注意：相互独立与两两独立不是一个意思。对于 $n$ 个事件，两两独立不考虑三个及以上的独立关系，而相互独立需要考虑 $2 \to n$ 个事件的独立关系。也就是说两两独立需要满足 $C_n^2$ 个等式关系，对于相互独立需要满足 $2^n-(n+1)$ 个等式关系，因此，两两独立 $\subset$ 相互独立。

**伯努利概型**。顺序发生 $n$ 个随机事件，随机事件之间相互独立并且只有两种可能的结果（假设为发生和不发生），利用上述的独立性定义，就有下面两个概率计算公式：

1）$n$ 个随机事件发生 $k$ 次的概率（二项概率）：

$$
C_n^k \cdot p^k \cdot (1-p)^{n-k}
$$

2）第 $n$ 个随机事件首次发生的概率（几何概率）：

$$
(1-p)^{n-1}\cdot p
$$

## 随机变量

本节我们讨论只含有一个变量的随机事件，这里的变量就可以称作随机变量，比如人类的年龄、人类的身高、抛一枚骰子的情况等。我们主要研究三个内容：

1. 随机变量的密度函数（比如人类的身高为一米八的概率）；
2. 随机变量的分布函数（比如人类身高在一米六到两米之间的概率）；
3. 随机变量函数（比如已知体重是身高的 $0.8$ 倍，我想知道人类体重的密度与分布）。

上述三点将会按「离散型」和「连续型」分别展开。

### 随机变量的定义与性质

**随机变量**。随机变量默认用大写字母 $X$ 来表示，定义域就是样本空间 $\Omega=\{ \omega \}$。

**密度函数**。一般用小写的 $p$ 来表示，例如 $p(x)$ 就表示随机变量 $X=x$ 发生的概率，等价于 $P(X=x)$。

**分布函数**。一般用大写的 $F$ 来表示，例如 $F(x)$ 就表示随机变量 $X\le x$ 发生的概率，等价于 $P(X\le x)$。形式上定义为：

$$
\forall x \in R,F(x) = \int_{-\infty}^{x} p(t)dt
$$

**一些性质**。密度函数和分布函数均有下面的性质，其实都比较显然，简单理解一下就懂了：

|   性质   | 表达式                                                       |
| :------: | :----------------------------------------------------------- |
|  非负性  | $p(x) \ge 0$                                                 |
|  正规性  | $\int_{-\infty}^{+\infty} p(x)dx = 1$                        |
|  可积性  | $\forall x_1 \le x_2,P(x_1 \le X \le x_2) = F(x_2) - F(x_1) = \int_{x_1}^{x_2}p(x)dx$ |
|  可导性  | 若 $p(x)$ 在点 $x$ 处连续，则 $F'(x) = p(x)$                 |
|  有界性  | $0 \le F(x) \le 1$，即 $\displaystyle F(-\infty) = \lim_{x \to -\infty} F(x) = 0$，$\displaystyle F(+\infty) = \lim_{x \to +\infty} F(x) = 1$ |
|  单调性  | 若 $x_1 < x_2$，则 $F(x_1) \le F(x_2)$                       |
| 右连续性 | $\displaystyle \lim_{x\to x_0^+}F(x) = F(x_0)\quad(-\infty < x_0 < +\infty)$ |

注：离散型随机变量可以通过枚举随机变量 $X$ 的取值来计算概率，但连续型随机变量这么做是无意义的。因为对于连续型随机变量：

$$
\begin{aligned}
P(X=x) &= F(x) - F(x) = 0\\
P(x_1 < X < X_2)=P(x_1 < X \le X_2)&=P(x_1 \le X < X_2)=P(x_1 \le X \le X_2)\\
\text{s.t.}\quad &\forall x \in R
\end{aligned}
$$

因此在连续型随机变量的情况下，$P(A) = 0$ 不能推出 $A$ 是不可能事件，同理 $P(A)=1$ 也不能推出 $A$ 是必然事件。事实上，连续型随机变量中，利用分布函数计算密度函数取值是借助了微分的思想：

$$
p(x)\Delta x \approx \int_{x}^{x+\Delta x} p(t)dt = F(x+\Delta x) - F(x) = P(x \le X \le x+\Delta x)
$$

### 密度函数和分布函数（离散型）

> [!note]
>
> 其实离散型随机变量的密度函数应该叫做「分布列」的，但是本质就是密度函数，我们统一成一个说法。

离散型随机变量的取值是可列的，有以下三种表示方法：

|  名称  |                            表达式                            |
| :----: | :----------------------------------------------------------: |
| 公式法 |            $p_k = P(X=x_k),\quad k = 1,2,\cdots$             |
| 服从法 | $X \sim \begin{pmatrix}x_1 & x_2 & x_3 & \cdots \\ p_1 & p_2 & p_3 & \cdots \end{pmatrix}$ |
| 表格法 | $\begin{array}{c:cccc} X & x_1 & x_2 & x_3 & \cdots \\ \hline P & p_1 & p_2 & p_3 & \cdots \end{array}$ |

知道了离散型随机变量的表示方法后，我们介绍几个常用的离散型随机变量及其密度函数，分布函数累加就行了，这里不展开。

**0-1 分布（两点分布）**：随机变量只有两种可能的取值。

- 密度函数：$P(X=0)=1-p,P(X=1)=p$，其中 $0\le p\le 1$；
- 记作：$X \sim \begin{pmatrix} 0 & 1 \\ 1-p & p \end{pmatrix}$。

**二项分布（n 重伯努利试验）**：$P(X=k)$ 表示 $n$ 次相互独立的 0-1 分布事件中，有 $k$ 次事件发生的概率。

- 密度函数：$P(X=k) = C_n^k \cdot p^k \cdot (1-p)^{n-k}$，其中 $k\in \{0,1,\cdots,n\}$；
- 记作：$X \sim B(n,p)$。

**泊松分布**：当二项分布的 $n$ 趋近于无穷时，就近似成了泊松分布。

- 密度函数：$\displaystyle P(X=k)=C_n^k \cdot p^k \cdot (1-p)^{n-k} \to \frac{\lambda^k}{k!}\cdot e^{-\lambda}$，其中常数 $\lambda > 0$；
- 记作：$X \sim P(\lambda)$。

泊松分布正规性证明：

$$
\begin{aligned}
\sum_{k=0}^{\infty} P(X=k)
&= \sum_{k=0}^{\infty}\frac{\lambda^k}{k!}\cdot e^{-\lambda} \\
&= e^{-\lambda} \cdot \left( \frac{\lambda^0}{0!} + \frac{\lambda^1}{1!} + \frac{\lambda^2}{2!} + \cdots \right) \\
&= e^{-\lambda} \cdot e^\lambda \\
&= 1
\end{aligned}
$$

证毕。其中倒数第三行用到了 $e^x$ 的泰勒展开公式：

$$
e^x = 1+x+\frac{x^2}{2!}+\cdots
$$

**几何分布**：$P(X=k)$ 表示 $n$ 次相互独立的 0-1 分布事件中，第 $k$ 次事件首次发生的概率。

- 密度函数：$P(X=k)=(1-p)^{k-1}p$，其中 $k\in \{0,1,\cdots,n\}$；
- 记作：$X \sim G(p)$。

**超几何分布**：$P(X=k)$ 表示在 $N$ 件含有 $M$ 个次品的样品总体中无放回的抽取 $n$ 件，其中含有 $k$ 件次品的概率。

- 密度函数：$\displaystyle P(X=k)=\frac{C_M^k C_{N-M}^{n-k}}{C_N^n}$，其中 $k\in \{0,1,2,\cdots,\min{(n, M)}\}$；
- 记作：$X \sim \text{超几何分布}(n,N,M)$。

### 密度函数和分布函数（连续型）

介绍几个常用的连续型随机变量及其密度函数和分布函数：

|   名称   |           记法           |                        密度函数表达式                        |                        分布函数表达式                        |
| :------: | :----------------------: | :----------------------------------------------------------: | :----------------------------------------------------------: |
| 均匀分布 |     $X \sim U[a,b]$      | $p(x) = \begin{cases} \frac{1}{b-a}, & a \le x \le b, \\ 0, & \text{其他} \end{cases}$ | $F(x) = \begin{cases} 0, & x < a \\ \frac{x - a}{b - a}, & a \le x < b \\ 1, & x \ge b \end{cases}$ |
| 指数分布 |   $X \sim e (\lambda)$   | $p(x) = \begin{cases} 0, & x < 0 \\ \lambda e^{-\lambda x} , & x \ge 0 \end{cases},\quad\lambda >0$ | $F(x) = \begin{cases} 0, & x < 0 \\ 1- e^{-\lambda x}, & x \ge 0 \end{cases}$ |
| 正态分布 | $X \sim N(\mu,\sigma^2)$ | $p(x) = \frac{1}{\sqrt{2 \pi} \sigma } e^{- \frac{(x - \mu)^2}{2 \sigma ^2}} , \quad -\infty < x < + \infty$ | $F(x) = \frac{1}{\sqrt{2 \pi} \sigma } \int_{- \infty}^x e^{- \frac{(y - \mu)^2}{2 \sigma ^2}} dy$ |

注：为了手算方便，在计算一般正态分布函数 $F(x)$ 的具体函数值时，可以先将其转化为标准正态分布函数 $\Phi(x)$，然后直接查表就可以得到具体函数值，转换公式如下：

$$
P(X \le x) = F(x) = \Phi (\frac{x - \mu}{\sigma})
$$

### 随机变量函数

所谓随机变量函数，就是将一个随机变量 $X$ 通过某种映射关系 $g(\cdot)$ 转换为一个新的随机变量 $Y$，即 $y=g(x)$，然后通过 $p_X(x)$ 求出 $p_Y(y)$ 和 $F_Y(y)$ 的一个过程。应用场景也挺常见的，比如已知身高和体重存在某种关系，然后还知道身高的密度函数，就可以直接算出来体重的密度函数和分布函数了。

**对于离散型随机变量**。直接根据映射关系 $g(\cdot)$ 枚举 $X$ 就可以得到 $Y$ 的密度函数和分布函数了，没什么学问在里面。

**对于连续型随机变量**。有两种方法：

1）先求 $Y$ 的分布函数 $F_Y(y)$，再通过对其求导得到密度函数 $p_Y(y)$。具体地：

$$
\begin{aligned}
F_Y(y) &= P(Y \le y) \\&= P(g(X) \le y) \\&= P(X \le f(y)) \\&= F_X(f(y)) &(1)\\
p_Y(y) &= \frac{d}{dy} F_Y(y) \\&= \frac{d}{dy} F_X(f(y)) \\&= F_X'(f(y)) \cdot f'(y) \\&= p_X(f(y)) \cdot f'(y) &(2)
\end{aligned}
$$

2）如果关系式 $y=g(x)$ 单调且反函数 $x=h(y)$ 连续可导，则可以直接得出随机变量 $Y$ 的密度函数 $p_Y(y)$：

$$
p_Y(y) =
\begin{cases}
p_X(h(y)) \cdot |h'(y)|, & \alpha < y < \beta \\
0, & \text{其他}
\end{cases}
$$

公式不予证明。其中 $\alpha$ 和 $\beta$ 为 $Y=g(X)$ 的取值范围（$x$ 应该怎么取值，$h(y)$ 就应该怎么取值，从而计算出 $y$ 的取值范围）。

## 随机向量

实际生活中，只采用一个随机变量描述事件往往是不够的，因为一个事件可能包含多个随机变量，比如对于人类这个群体而言，随机变量有身高、体重、年龄等等，所有的随机变量组合起来就称作随机向量。本章重点介绍二维随机向量，即只有两个随机变量的情况，$n$ 维随机向量正常扩展即可。

> [!tip]
>
> 教材中关于二维随机向量有很多变种，例如：联合分布、边缘分布、条件分布，这里将其统一在一起。

### 随机向量的定义与性质

密度函数和分布函数都是多元的了，以二元连续型为例，离散型算连续型的子集，就不在此处赘述。随机向量的密度函数和分布函数满足的一些性质：

|    性质    | 表达式                                                       |
| :--------: | :----------------------------------------------------------- |
|   非负性   | $\forall x,y \in R,\ p(x,y) \ge 0$                           |
|   正规性   | $\int_{-\infty}^{+\infty} \int_{-\infty}^{+\infty} p(x,y)dxdy = 1$ |
|   独立性   | 若随机变量 $X$ 和 $Y$ 相互独立，则 $F(x,y)=F_X(x)\cdot F_Y(y)=P_X(X\le x) \cdot P_Y(Y\le y)$ |
| 函数独立性 | 若随机变量 $X$ 和 $Y$ 相互独立，且 $h(\cdot)$ 和 $g(\cdot)$ 连续，则 $h(X),g(Y)$ 也相互独立 |

### 密度函数和分布函数（离散型）

**联合密度函数**。若二维随机向量 $(X,Y)$ 的所有可能取值是「可列」的，则称 $(X,Y)$ 为二维离散型随机向量。即：

$$
p_{ij} = P(X=x_i,Y = y_i), \quad i,j=1,2,\cdots
$$

**边缘密度函数**。固定一个随机变量，另外的随机变量取遍，可以理解为此时就是随机变量的情况。即：

$$
\begin{aligned}
p_{i\cdot} = P(X=x_i) = \sum_{j=1}^{+\infty} p_{ij}, \quad i=1,2,\cdots \\
p_{\cdot j} = P(Y=y_j) = \sum_{i=1}^{+\infty} p_{ij}, \quad j=1,2,\cdots
\end{aligned}
$$

我们称：

- $P(X=x_i)$ 为随机向量 $(X,Y)$ 关于 $X$ 的边缘密度函数；

- $P(Y=y_j)$ 为随机向量 $(X,Y)$ 关于 $Y$ 的边缘密度函数。

**条件密度函数**。将变量的样本空间从二维变成了一维。即：

$$
\begin{aligned}
p_{i\mid j} = \frac{p_{ij}}{p_{\cdot j}} = P(X=x_i\mid Y=y_j) = \frac{P(X=x_i,Y=y_i)}{P(Y=y_i)}, \quad i=1,2,\cdots \\
p_{j\mid i} = \frac{p_{ij}}{p_{i\cdot }} = P(Y=y_j\mid X=x_i) = \frac{P(X=x_i,Y=y_i)}{P(X=x_i)}, \quad j=1,2,\cdots
\end{aligned}
$$

我们称：

- $p_{i\mid j}$ 为在给定 $Y=y_j$ 的条件下 $X$ 的条件分布函数；

- $p_{j\mid i}$ 为在给定 $X=x_i$ 的条件下 $Y$ 的条件分布函数。

分布函数就是累加一下，这里不再赘述。

### 密度函数和分布函数（连续型）

**联合分布函数**。定义式如下：

$$
F(x,y) = P(X \le x, Y \le y) = \int_{-\infty}^x \int_{-\infty}^y p(u,v)dudv
$$

可以数形结合来理解，联合分布函数的几何意义就是联合密度函数在左下方无界矩形的定义域取值下积分的结果：

![联合分布函数的几何意义](https://cdn.dwj601.cn/images/20250427125012050.png)

显然，若概率密度曲面在 $xOy$ 平面的投影为点集或线集，则对应的概率为零。常见的连续型二元联合分布如下：

1）二维均匀分布：假设该曲面与 $xOy$ 面的投影面积为 $S$，则分布函数其实就是一个高为定值 $\frac{1}{S}$ 的柱体，密度函数为：

$$
p(x,y) =
\begin{cases}
\frac{1}{S}, &(x,y) \in G \\
0, &\text{其他}
\end{cases}
$$

2）二元正态分布：不要求掌握密度函数，可以感受一下密度函数的图像：

![二元正态分布的密度函数图像](https://cdn.dwj601.cn/images/20250427125448186.png)

**边缘密度函数**。与离散型类似：

$$
\begin{aligned}
P(X=x) &= p_X(x) \\
&= \frac{d}{dx} F_X(x) \\
&= \frac{d}{dx} F(x,+\infty) \\
&= \frac{d}{dx} \int_{-\infty}^{x} \left [ \int_{-\infty}^{+\infty} p(u,v) dv \right ] du \\
&= \int_{-\infty}^{+\infty} p(x,y) dy &(1)\\
P(Y=y) &= p_Y(y) \\
&= \frac{d}{dy} F_Y(y) \\
&= \frac{d}{dy} F(+\infty,y) \\
&= \frac{d}{dy} \int_{-\infty}^{+\infty} \left [ \int_{-\infty}^{y} p(u,v) dv \right ] du \\
&= \frac{d}{dy} \int_{-\infty}^{y} \left [ \int_{-\infty}^{+\infty} p(u,v) du \right ] dv \\
&= \int_{-\infty}^{+\infty} p(x,y) dx &(2)
\end{aligned}
$$

我们称：

- $P(X=x)$ 为随机向量 $(X,Y)$ 关于 $X$ 的边缘密度函数；

- $P(Y=y)$ 为随机向量 $(X,Y)$ 关于 $Y$ 的边缘密度函数。

**边缘分布函数**。我们称 $F_X(x),F_Y(y$) 分别为 $(X,Y)$ 关于 $X,Y$ 的边缘分布函数，定义式为：

$$
\begin{aligned}
F_X(x) = P(X \le x) = P(X \le x,Y < +\infty) = \lim_{y \to +\infty} F(x,y) = F(x,+\infty) \\
F_Y(y) = P(Y \le y) = P(X < +\infty, Y \le y) = \lim_{x \to +\infty} F(x,y) = F(+\infty,y)
\end{aligned}
$$

**条件密度函数**。与离散型类似，是一条曲线：

$$
\begin{aligned}
p(x\mid y) = \frac{p(x,y)}{p_Y(y)}, \quad -\infty < x < +\infty \\
p(y\mid x) = \frac{p(x,y)}{p_X(x)}, \quad -\infty < y < +\infty
\end{aligned}
$$

我们称：

- $p(x\mid y)$ 为在给定 $Y=y$ 的条件下 $X$ 的条件密度函数；
- $p(y\mid x)$ 为在给定 $X=x$ 的条件下 $Y$ 的条件密度函数。

**条件分布函数**。即上述曲线的积分结果：

$$
\begin{aligned}
F(x\mid y) = P(X \le x \mid Y=y) = \int_{-\infty}^x \frac{p(u,y)}{p_Y(y)} du,\quad -\infty < x < +\infty \\
F(y\mid x) = P(Y \le y \mid X=x) = \int_{-\infty}^y \frac{p(x,v)}{p_X(x)} dv, \quad -\infty < y < +\infty
\end{aligned}
$$

我们称：

- $F(x\mid y)$ 为在给定 $Y=y$ 的条件下 $X$ 的条件分布函数；
- $F(y\mid x)$ 为在给定 $X=x$ 的条件下 $Y$ 的条件分布函数。

### 随机向量函数

假设我们已经知道了一个人群的身高 X、体重 Y 分布情况，同时还知道血糖 Z 与身高体重两个变量之间的映射关系 $g(\cdot, \cdot)$，现在想要求解血糖的密度函数和分布函数，怎么办呢？这就涉及到了随机向量函数的转换关系。

**对于离散型随机向量**。同样按照转换规则枚举即可。

**对于连续型随机向量**。与连续型随机变量函数的分布类似，这类题目一般也是：给定随机向量 $(X,Y)$ 的密度函数 $p(x,y)$ 和 映射函数 $g(x,y)$，现在需要求解 $Z=g(X,Y)$ 的分布函数（若 $g(x,y)$ 二元连续，则 $Z$ 也是连续型随机变量）。方法同理，先求解 $Z$ 的分布函数，再对 $z$ 求导得到密度函数 $p_Z(z)$。接介绍两种常见的随机向量函数。

1）和的分布

先求分布函数 $F_Z(z)$：

$$
\begin{aligned}
F_Z(z) &= P(X+Y \le z) \\
&= \iint\limits_{x+y \le z} p(x,y) dxdy \\
&= \int _{-\infty}^z \left [ \int_{-\infty}^{+\infty} p(x,t-x)dx \right ] dt &(1) \\
&= \int _{-\infty}^z \left [ \int_{-\infty}^{+\infty} p(t-y,y)dy \right ] dt &(2)
\end{aligned}
$$

由分布函数定义：

$$
F_X(x) = \int_{-\infty}^xp(u)du
$$


所以可得 $Z=X+Y$ 的密度函数 $p_Z(z)$ 为：

$$
\begin{aligned}
p_Z(z) &= \int_{-\infty}^{+\infty} p(x,z-x)dx &(1) \\
p_Z(z) &= \int_{-\infty}^{+\infty} p(z-y,y)dy &(2) \\
\end{aligned}
$$

若 X 和 Y 相互独立，还可得卷积式：

$$
\begin{aligned}
p_Z(z) &= \int_{-\infty}^{+\infty} p(x,z-x)dx \\
&= \int_{-\infty}^{+\infty} p_X(x)\cdot p_Y(z-x) dx &(1) \\
p_Z(z) &= \int_{-\infty}^{+\infty} p(z-y,y)dy \\
&= \int_{-\infty}^{+\infty} p_X(z-y)\cdot p_Y(y) dy &(2)
\end{aligned}
$$

2）次序统计量的分布（随机变量 X 和 Y 相互独立）

对于 $M=\max{(X,Y)}$ 的分布函数，有：

$$
\begin{aligned}
F_M(z) &= P(M \le z) \\
&= P(\max{(X,Y)} \le z) \\
&= P(X \le z, Y \le z) \\
&= P(X \le z) \cdot P(Y \le z) \\
&= F_X(z) \cdot F_Y(z)
\end{aligned}
$$

对于 $N=\min{(X,Y)}$ 的分布函数，有：

$$
\begin{aligned}
F_N(z) &= P(N \le z) \\
&= P(\min{(X,Y)} \le z) \\
&= 1 - P(\min{(X+Y)} \ge z) \\
&= 1 - P(X \ge z,Y \ge z) \\
&= 1 - P(X \ge z) \cdot P(Y \ge z) \\
&= 1 - [1 - F_X(z)] \cdot [1 - F_Y(z)]
\end{aligned}
$$

若拓展到 $n$ 个相互独立且同分布的随机变量，则有：

$$
\begin{aligned}
F_M(z) &= [F(z)]^n \\
p_M(z) &= np(z)[F(z)]^{n-1}
\end{aligned}
$$

$$
\begin{aligned}
F_N(z) &= 1 - [1-F(z)]^n \\
p_N(z) &= np(z)[1-F(z)]^{n-1}
\end{aligned}
$$

## 数字特征

有时人们并不关心事件的分布，只关心其中的一些特征，比如比较两地的收入水平，看均值即可；同时，前文中一些概率分布中含有一些参数，其实也就是这些分布的某个特征。概率论中称这些特征为「数字特征」，本章将会重点介绍随机变量的四种数字特征：期望、方差、协方差、相关系数，随机向量不展开。

### 期望

期望即试验中每一个可能的结果乘以该结果概率的总和，表示该试验“期望”发生的事件，是试验中随机事件输出值的加权平均，连续型事件就用积分计算，离散型事件就用累加计算。

期望的符号表示为 $E(X)$ 或 $EX$，定义与性质如下：

| 期望对象 | 期望定义 |
| :--- | --- |
| 随机变量 | $EX = \int_{-\infty}^{+\infty} x\cdot p(x)dx$ |
| 随机变量函数 | $Eg(X) = \int_{-\infty}^{+\infty}g(x)\cdot p(x)dx$ |
| 随机向量 [^vector-feature] | $E(X,Y) = (EX, EY)$ |
| 随机向量函数 | $Eg(X,Y) = \int_{-\infty}^{+\infty}\int_{-\infty}^{+\infty}g(x_i,y_i)\cdot p(x,y)dxdy$ |

[^vector-feature]: 这个知识点教材没有提到，此处参考了 [随机向量的数字特征 | lian164998 - (www.doc88.com)](https://www.doc88.com/p-2738409867283.html) 中的内容。

| 期望性质 | 表达式 |
| :--- | :--- |
| 常量的期望等于常量 | $EC=C$ |
| 常量与变量乘积的期望等于常量乘以变量的期望 | $E(CX)=CEX$ |
| 和的期望等于期望的和 | $E(X+Y)=EX+EY$ |
| 若事件相互独立，则积的期望等于期望的积 | 若 $X$ 和 $Y$ 相互独立，则 $E(XY)=EXEY$ |

### 方差

方差是用于描述随机变量 **离散程度** 的统计量。

我们定义随机变量 $X$ 的方差 $D(X)$ 为：

$$
\begin{aligned}
D(X) &= E(X-EX)^2 \\
&= E X^2 - (EX)^2
\end{aligned}
$$

上述结果可以用期望的性质推导而来。下面罗列的几个方差性质同样也可以用期望的性质推导而来：

|      名称      | 表达式                                                       |
| :------------: | ------------------------------------------------------------ |
|    提取系数    | $D(aX+b) = a^2D(X)$                                          |
|     独立性     | 若 $X_1,X_2,\cdots$ 相互独立，则 $D(aX_1 \pm bX_2 \pm \cdots) = a^2D(X_1) + b^2D(X_2) + \cdots$ |
|     不等性     | $E\left[ (X-EX)^2 \right] \le E \left [ (X-C)^2 \right ]$    |
| 切比雪夫不等式 | $\forall \epsilon >0, P(\lvert X - EX\rvert < \epsilon) \ge 1 - \frac{DX}{\epsilon^2}$ |

### 常见分布的期望与方差

|  类型  |    分布    |                          记法                           |              $E(X)$               |               $D(X)$                |
| :----: | :--------: | :-----------------------------------------------------: | :-------------------------------: | :---------------------------------: |
| 离散型 |  0-1 分布  | $X \sim \begin{pmatrix} 0 & 1 \\ 1-p & p \end{pmatrix}$ |                $p$                |              $p(1-p)$               |
|   /    | *二项分布  |                     $X \sim B(n,p)$                     |               $np$                |              $np(1-p)$              |
|   /    |  几何分布  |                      $X \sim G(p)$                      |    $\displaystyle \frac{1}{p}$    |   $\displaystyle \frac{1-p}{p^2}$   |
|   /    | * 泊松分布 |                   $X \sim P(\lambda)$                   |             $\lambda$             |              $\lambda$              |
| 连续型 |  均匀分布  |                     $X \sim U[a,b]$                     |   $\displaystyle \frac{a+b}{2}$   | $\displaystyle \frac{(b-a)^2}{12}$  |
|   /    |  指数分布  |                   $X \sim e(\lambda)$                   | $\displaystyle \frac{1}{\lambda}$ | $\displaystyle \frac{1}{\lambda^2}$ |
|   /    | * 正态分布 |                $X \sim N(\mu,\sigma^2)$                 |               $\mu$               |             $\sigma^2$              |

注：打星表示在两个随机变量 $X,Y$ 相互独立时，具备可加性。具体地：

$$
\begin{aligned}
&X \sim N(\mu_1,\sigma_1^2), Y \sim N(\mu_2,\sigma_2^2) \to X\pm Y\sim N(\mu_1\pm\mu_2,\sigma_1^2+\sigma_2^2)\\
&X \sim B(n_1,p), Y \sim B(n_2,p) \to X+Y\sim B(n_1+n_2,p)\\
&X \sim P(\lambda_1),Y\sim P(\lambda_2) \to X+Y \sim P(\lambda_1+\lambda_2)
\end{aligned}
$$

> [!note]- 推导
>
> 推导的根本方式还是从定义出发。当然为了省事也可以从性质出发。
> 
> === "0-1 分布"
>     ![0-1 分布](https://cdn.dwj601.cn/images/202404202313030.jpg)
> 
> === "二项分布"
>     ![二项分布](https://cdn.dwj601.cn/images/202404202313503.jpg)
> 
> === "几何分布"
>     ![几何分布](https://cdn.dwj601.cn/images/202404202313329.jpg)
>
> === "泊松分布"
>     ![泊松分布](https://cdn.dwj601.cn/images/202404202313316.jpg)
>
> === "均匀分布"
>     ![均匀分布](https://cdn.dwj601.cn/images/202404202313239.jpg)
> 
> === "指数分布"
>     ![指数分布](https://cdn.dwj601.cn/images/202404202313832.jpg)

### 协方差

随机变量 $X$ 与 $Y$ 的协方差 $Cov(X,Y)$ 定义为：

$$
\begin{aligned}
Cov(X,Y)&= E[(X-EX)(Y-EY)] \\
&= E(XY) - EXEY
\end{aligned}
$$

特别地：

$$
Cov(X,X) = DX
$$

协方差的性质：

|  名称  | 表达式                                                  |
| :----: | ------------------------------------------------------- |
| 交换律 | $Cov(X,Y)=Cov(Y,X)$                                     |
| 提取率 | $Cov(aX,bY)=a\cdot b\cdot Cov(X,Y)$                     |
| 分配率 | $Cov(X_1+X_2,Y) = Cov(X_1,Y)+Cov(X_2,Y)$                |
| 独立性 | 若 $X$ 与 $Y$ 相互独立，则 $Cov(X,Y)=0$，反之不一定成立 |
| 放缩性 | $\left[Cov(X,Y)\right]^2 \le DX \cdot DY$               |

### 相关系数

相关系数定义为：

$$
\rho_{X,Y} = \frac{Cov(X,Y)}{\sqrt{DX}\sqrt{DY}}
$$

相关系数 $\rho$ 是用来刻画两个随机变量之间「线性相关关系强弱」的一个数字特征。$|\rho|$ 越接近 $0$，说明两个随机变量越不线性相关；$|\rho|$ 越接近 $1$，说明两个随机变量越线性相关。特别地：

1. 若 $0 < \rho < 1$，则称 $X$ 与 $Y$ 正相关；
2. 若 $-1<\rho<0$，则称 $X$ 与 $Y$ 负相关。

相关系数的性质（其中大部分都可以通过协方差的性质推导而来）：

|          名称          | 表达式                                                       |
| :--------------------: | ------------------------------------------------------------ |
|         放缩性         | $\lvert \rho \rvert \le 1$                                   |
|         独立性         | 若 $X$ 与 $Y$ 相互独立，则 $p=0$；反之不一定成立             |
| 线性相关性（不予证明） | $\lvert \rho \rvert = 1$ 的充分必要条件是存在常数 $a\ (a\ne 0),b$ 使得 $P(Y=aX+b)=1$ |

关于独立性和线性相关性有一些注意点。一般地，对于两个随机变量 $X$ 和 $Y$，有以下结论：

- $X$ 和 $Y$ 相互独立 $\rightarrow$ $X$ 和 $Y$ 线性无关（可以用线性相关的定义式结合协方差计算公式导出）
- $X$ 和 $Y$ 相互独立 $\nleftarrow$ $X$ 和 $Y$ 线性无关（因为有可能出现 $X$ 和 $Y$ 非线性相关）

但是当 $(X,Y) \sim (\mu_1,\mu_2,\sigma_1^2,\sigma_2^2,\rho)$ 时，相互独立就与线性无关等价了。

> [!note]- 证明 [^alone-nolinear]：满足二维正态分布的两个随机变量，相互独立 $\iff$ 线性无关
>
> ![二维正态分布的两个随机变量：相互独立 等价于 线性无关](https://cdn.dwj601.cn/images/202404261112302.jpg)

[^alone-nolinear]: [如何去直观地理解不相关不一定是独立，而独立必然不相关 | 光波 - (www.zhihu.com)](https://www.zhihu.com/question/29641138/answer/3162080728)
