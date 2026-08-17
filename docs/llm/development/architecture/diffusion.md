---
title: Diffusion
---

扩散模型通过学习逆转逐步加噪过程来生成数据，常用于图像、音频和视频生成。它属于生成模型，核心思想是先定义一条把数据破坏成噪声的前向过程，再训练网络逐步反向去噪。

这一思想的源头是 [Sohl-Dickstein 等人](https://arxiv.org/abs/1503.03585) 用热力学视角描述「逐步加噪 -> 学习逆转」的非平衡过程，但当时受限于模型能力并未成为主流。[Ho 等人](https://arxiv.org/abs/2006.11239) 的 DDPM 把它与深度网络结合并给出简洁的训练目标，才让扩散模型进入可用阶段；随后 [Song 等人](https://arxiv.org/abs/2010.02502) 的 DDIM 把随机采样推广为确定性过程，大幅减少采样步数，扩散模型由此成为图像生成的代表性方法，并被扩展到音频、视频乃至文本生成。

## 快速开始

先使用成熟 checkpoint 和固定随机种子复现一个样例，确认 pipeline 能端到端跑通：加载模型与调度器 (scheduler)、设置 `generator` 与 `num_inference_steps`、把输出保存并目视检查。复现成功后，再单独改变采样步数、引导尺度 (guidance scale) 和分辨率，逐一观察对结果的影响。

记录每次实验的耗时、显存占用与输出质量，做对照而不是只看单张图。相同的 prompt 与种子，改变采样参数会得到不同结果，因此比较时必须控制变量，否则无法判断质量差异来自参数还是随机性。最小复现可参考 [Hugging Face Diffusers](https://huggingface.co/docs/diffusers/index) 的 `DiffusionPipeline`：固定 `generator` 后，只改变 `num_inference_steps` 与 `guidance_scale`，其余参数保持不变。

排错时优先检查设备与精度设置：模型、调度器与 VAE 是否放在同一设备，权重是否使用正确的 dtype，以及 prompt 是否经过与训练一致的分词与空 prompt 处理。多数「结果全黑或全噪」的问题来自调度器时间步、beta schedule 或精度不匹配，而非模型本身。

## 原理

前向过程逐步向数据加入高斯噪声。给定干净数据 $x_0$ 和噪声系数 $\beta_t$，前向转移常写为：

$$
q(x_t\mid x_{t-1})=\mathcal{N}\left(x_t;\sqrt{1-\beta_t}\,x_{t-1},\beta_t\mathbf{I}\right)
$$

定义 $\alpha_t=1-\beta_t$ 与累积乘积 $\bar\alpha_t=\prod_{s=1}^{t}\alpha_s$，则从 $x_0$ 一步得到 $x_t$ 的闭式形式为：

$$
q(x_t\mid x_0)=\mathcal{N}\left(x_t;\sqrt{\bar\alpha_t}\,x_0,(1-\bar\alpha_t)\mathbf{I}\right)
$$

即 $x_t=\sqrt{\bar\alpha_t}\,x_0+\sqrt{1-\bar\alpha_t}\,\epsilon$。这个闭式形式让训练时无需逐步迭代，只需采样一个时间步 $t$ 和噪声 $\epsilon$ 即可构造加噪样本。随着 $t$ 增大，$x_t$ 越来越接近标准高斯分布。模型学习逆转该过程，训练目标通常是预测所加噪声 $\epsilon$：

$$
\mathcal{L}=\mathbb{E}_{x_0,\epsilon,t}\left[\lVert\epsilon-\epsilon_\theta(x_t,t)\rVert^2\right]
$$

其中 $\epsilon_\theta$ 是参数化网络，$x_t$ 由 $x_0$、噪声和噪声调度共同构造。除了预测噪声，模型也可以参数化为预测速度 $v$ 或原始数据 $x_0$，它们通过线性关系互相转换。构造加噪样本的最小实现如下：

```python
def add_noise(x0, noise, t, alphas_cumprod):
    a = alphas_cumprod[t][:, None, None, None]   # 广播到 (batch, 1, 1, 1)
    return a.sqrt() * x0 + (1 - a).sqrt() * noise
```

采样时从纯噪声 $x_T$ 出发，按学习到的反向转移逐步去噪直到 $x_0$。确定性采样器（如 DDIM）在少量步数下仍能保持质量；条件信息由文本编码器等提供，文本条件通过交叉注意力注入去噪网络。分类器无关引导 (Classifier-Free Guidance, CFG) 用「有条件的预测」与「无条件的预测」的线性组合放大条件影响，由 [Ho 与 Salimans](https://arxiv.org/abs/2207.12598) 提出：

$$
\hat\epsilon=\epsilon_\theta(x_t,t,\emptyset)+w\left(\epsilon_\theta(x_t,t,c)-\epsilon_\theta(x_t,t,\emptyset)\right)
$$

$w$ 即引导尺度，增大 $w$ 通常让输出更贴合文本，但过高会产生过饱和与伪影。公式的含义是：把「条件方向」与「无条件方向」的差沿条件方向外推，$w=1$ 退化为普通条件模型，$w>1$ 放大条件强度。

## 案例：采样参数

固定 prompt 与种子，分别使用 20、50、100 步采样并记录耗时和图像质量。用同一确定性调度器比较，观察步数增加带来的质量变化：对 DDIM 等采样器，质量在步数超过某个阈值后趋于饱和，继续增加步数只增加耗时。

若提高步数没有收益，应优先检查调度器与模型是否匹配。不同调度器（DDPM、DDIM、Euler、DPM-Solver 等）对步数、$\beta$ 调度和 sigma 的处理不同，用错调度器或直接替换会破坏时间步语义，导致结果反而变差。例如 DDIM 通过非马尔可夫的前向过程定义，允许用比 DDPM 少得多的步数得到相近质量，但它的步数取值仍须落在训练时的噪声调度范围内。

同时记录显存与延迟随步数的线性关系：采样步数翻倍，去噪网络前向次数翻倍，耗时近似翻倍。若延迟是瓶颈，优先考虑更少步数的调度器或蒸馏加速，而非无上限增加计算。评估时用多张图、多个种子的平均质量作结论，单张图不足以支撑「步数越多越好」的判断。

## 相关主题

- [多模态](./multimodal.md)
- [模型服务](../../serving/index.md)
