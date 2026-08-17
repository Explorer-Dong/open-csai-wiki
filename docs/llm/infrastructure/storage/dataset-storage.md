---
title: 数据集存储
---

数据集存储关注数据版本、分片、访问权限与可复现性，而不只是选择一个存放位置。它要回答的问题是：训练读到的是哪份数据、能否在任意时间重放、以及数据如何随规模增长而不拖慢训练。这些问题的答案落在「对象存储为底、本地高速盘为缓存」的分层结构与版本化清单上。

## 快速开始

保存原始数据的不可变版本，再把清洗、去重和分词结果写为新版本。每个版本记录来源、许可证、哈希、分片清单与处理代码提交。最小落地：原始数据进入对象存储后立即计算对象级哈希与总大小，处理流水线产出新目录并附清单，训练配置只引用版本号而不引用可变路径。

```text
s3://bucket/raw/v1/            # 原始，只读
s3://bucket/processed/v4/      # 清洗 + 分词产物
s3://bucket/processed/v4/manifest.json
```

验证成功的标准是：同一版本号重跑校验，哈希与样本数一致；不同版本互不影响。

## 分片与访问

将大量样本组织成可顺序读取的 shard，避免海量小文件带来的元数据与随机读开销。分片本质是把样本打包成较大的连续块：样本总数 $N$、每分片样本数 $s$，则分片数

$$ S = \lceil N / s \rceil $$

$s$ 的取值要在顺序读取效率与重分片灵活性之间折中，实践中常在几百 MB 到数 GB 之间。WebDataset 是这类约定的常用实现：把样本及其元数据按 `{00000..00999}.tar` 命名放入 tar 分片，训练时按序流式读取，直接配合 DataLoader 使用，见 [WebDataset 文档](https://github.com/webdataset/webdataset) 。

训练时确定性地给不同 worker 分配 shard，避免重复读取。做法是基于 worker 数 $W$ 与全局 rank 做取模分片：rank $r$ 读取编号满足 $\text{shard\_id} \bmod W = r$ 的分片，或用索引区间均分。Hugging Face `datasets` 默认把数据缓存为 Arrow 文件并通过内存映射加载，可用 `HF_DATASETS_CACHE` 或 `HF_HOME` 指定缓存位置，`load_dataset(..., streaming=True)` 则跳过落盘、边下边读，适合超大数据集，详见 [datasets 缓存文档](https://huggingface.co/docs/datasets/cache) 。热数据缓存到 [NVMe](../storage/nvme.md)，冷数据留在对象存储，形成分层读取。

## 案例：可复现训练集

`dataset-v4/manifest.json` 列出 1,000 个 shard 的哈希、语言过滤规则与分词器版本。训练配置引用清单的版本号；重新训练时先验证清单，确保读取的是同一数据而非「最新目录」。最小清单：

```json
{
  "version": "dataset-v4",
  "num_shards": 1000,
  "shard_pattern": "data/{00000..00999}.tar",
  "tokenizer": "tok-commit-9f3a",
  "filter": "lang=zh,en",
  "shards": [
    { "name": "00000.tar", "sha256": "ab12...", "samples": 1000 }
  ]
}
```

训练入口先校验：对每个 shard 计算 SHA-256 并与清单比对，同时核对 `num_shards` 与 tokenizer 版本。这样重新训练读到的是同一份数据，而非被后续写入污染的「最新目录」。

## 治理要点

数据集可能含个人信息、版权限制或删除请求。访问控制、保留期与删除流程必须覆盖缓存和派生版本：一份原始数据的删除请求，往往还要处理它的清洗、分词与缓存副本。落地时以对象存储的版本控制与生命周期策略为底，对含敏感信息的数据单独隔离并记录保留期，派生数据集在清单中回链上游版本，使删除与审计能沿依赖链追溯。

## 相关主题

- [分布式文件系统](../storage/distributed-file-system.md)
- [对象存储](./index.md#三类存储)
- [模型与数据基础设施导读](./index.md)
