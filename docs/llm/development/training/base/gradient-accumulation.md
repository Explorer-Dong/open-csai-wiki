---
title: 梯度累积
---

梯度累积在多个 micro batch 上累加梯度，再执行一次优化器更新，以较小显存模拟较大 batch。它与数据并行正交：数据并行把 batch 拆到多张卡上同时算，梯度累积把 batch 拆到时间上依次算，二者服务于同一个目标——在显存受限时得到更大的全局 batch。

## 快速开始

每个 micro batch 反向传播前将 loss 除以累积步数；达到步数后执行 `optimizer.step()` 与清零梯度：

```python
opt.zero_grad()
for step, (xb, yb) in enumerate(loader):
    loss = loss_fn(model(xb), yb) / acc_steps   # 关键：按累积步数缩放
    loss.backward()
    if (step + 1) % acc_steps == 0:
        opt.step()
        opt.zero_grad()
```

缩放的意义在于：当损失按样本数求均值时，把 $G_{\text{acc}}$ 个 micro-batch 的梯度相加再除以 $G_{\text{acc}}$，得到的才是全局 batch 的梯度。日志和学习率调度应按更新步（`optimizer.step()` 的次数）而非 micro step 对齐，否则调度器会错误地提前前进。

## 原理

全局 batch 与各分量之间的换算关系是：

$$\text{global\_batch} = \text{micro\_batch} \times N_{\text{DP}} \times G_{\text{acc}}$$

其中 micro batch 是每张卡单次前向/反向处理的样本数，$N_{\text{DP}}$ 是数据并行卡数，$G_{\text{acc}}$ 是累积步数。累积后执行的等效更新是：

$$g_{\text{global}} = \frac{1}{G_{\text{acc}}}\sum_{k=1}^{G_{\text{acc}}} g_k$$

其中 $g_k$ 是第 $k$ 个 micro-batch 的梯度。若模型处于相同状态、且各 micro-batch 之间没有影响统计量的随机差异，累积梯度严格近似一次大 batch 的梯度，这正是「小显存模拟大 batch」成立的前提。

但 Dropout、BatchNorm、序列长度与分布式同步策略会使它并非完全等价：Dropout 每步采样的掩码不同，累积梯度其实是多个不同子网络梯度的平均；BatchNorm 在每个 micro-batch 上单独估计均值与方差，等价性只在 micro-batch 足够大时近似成立，跨卡时还需用 SyncBatchNorm 聚合全局统计（[PyTorch 文档](https://pytorch.org/docs/stable/generated/torch.nn.SyncBatchNorm.html)）。

## 案例：显存受限微调

单卡只能放入 micro batch 1，设累积 16 次后更新，即全局 batch 为 16。通过记录全局 token 数、梯度范数和更新次数，确保调度器没有在每个 micro step 错误前进：

```python
acc_steps, total_tokens, updates = 16, 0, 0
opt.zero_grad()
for step, batch in enumerate(loader):
    loss = loss_fn(model(batch), batch["labels"]) / acc_steps
    loss.backward()
    total_tokens += batch["input_ids"].numel()
    if (step + 1) % acc_steps == 0:
        opt.step(); opt.zero_grad(); updates += 1
        sched.step()          # 调度器只在这里前进
        print(f"update {updates}: tokens={total_tokens}")
```

验证标准是：学习率曲线按 update 数（而非 step 数）绘制，且 `updates == 数据量 / (micro_batch × acc_steps)` 与预期一致。

## 注意事项

累积减少 OOM，但不能减少总计算；通信与更新频率变化也会影响训练时间，因为梯度同步若放在每次 micro step 后，会把同步开销放大 $G_{\text{acc}}$ 倍。遇到 NaN 仍应从数据、精度和学习率排查，梯度累积本身不会产生 NaN，只会把它原样保留到更新时刻。

## 相关主题

- [Batch](./batch.md)
- [反向传播](./backpropagation.md)
