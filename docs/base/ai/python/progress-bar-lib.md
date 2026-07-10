---
title: 进度显示库
icon: lucide/battery-medium
---

在以 AI 为代表的场景中，很多时候某个环节都需要分很多步骤完成，且每个步骤都需要花费不少时间，譬如训练模型时需要分很多个 batch，再譬如某些实验需要大量调用 LLM API，如果无法把握每一步的时间花费，就会对整个场景失去全局把握，让人心有不安。

[tqdm](https://github.com/tqdm/tqdm) 是一个基于 Python 的进度条显示库，可以很好的解决上述问题。其可以显示迭代进度、总迭代时间、剩余迭代时间和迭代速度。

例如下面这个例子：

<video controls src="https://cdn.dwj601.cn/videos/tqdm.mp4"></video>

tqdm 主要有两种用法：

1. 根据已有迭代器自动更新进度。
2. 手动更新进度。

下面分别讲解。

## 自动更新进度

如果已经存在一个长度已知的迭代器，我们可以直接用 tqdm 函数包裹这个迭代器：

```python
from tqdm import tqdm

for data_batch in tqdm(data):
    train_batch(data_batch)
```

如果有复用的场景，例如已经处理过一部分数据了，我们可以给 tqdm 设置初始值，确保进度条的处理速度是准确的：

```python
from tqdm import tqdm

for data_batch in tqdm(not_processed_data, initial=10):
    train_batch(data_batch)
```

另外我们也可以给进度条的前面加一个简短的描述：

```python
from tqdm import tqdm

for data_batch in tqdm(not_processed_data, initial=10, desc="Resume training"):
    train_batch(data_batch)
```

## 手动更新进度

如果我们没有可迭代的对象，比如我们要从一万条数据中筛选 100 条有效数据，我们可以初始化一个进度条然后手动更新进度：

```python
from tqdm import tqdm

pbar = tqdm(total=100)
for data in raw_data:
    if not check_valid(data):
        continue
    pbar.update(n=1)
    if pbar.n >= 100:
        break
pbar.close()  # 确保输出不混乱
```

细心的读者已经发现了，我们也可以使用上下文管理器更优雅地编码：

```python
from tqdm import tqdm

with tqdm(total=100) as pbar:
    for data in raw_data:
        if not check_valid(data):
            continue
        pbar.update(n=1)
        if pbar.n >= 100:
            break
```

同理，我们也可以加初始值和简短描述：

```python
from tqdm import tqdm

with tqdm(total=100, initial=10, desc="Resume filtering") as pbar:
    for data in raw_data:
        if not check_valid(data):
            continue
        pbar.update(n=1)
        if pbar.n >= 100:
            break
```
