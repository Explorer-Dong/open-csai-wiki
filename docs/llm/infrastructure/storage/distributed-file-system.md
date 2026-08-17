---
title: 分布式文件系统
---

分布式文件系统把多台服务器的存储以共享目录形式提供给集群，用于共享训练集、检查点和实验产物。它把分散磁盘聚合为统一命名空间，使依赖 POSIX 路径的程序无需改写即可并行读写，代价是需要元数据服务与网络来维持一致性。

## 快速开始

先用小规模读写测试验证所有节点都能看到同一路径，再进行训练：

```bash
echo test > /shared/dataset/write-test-$(hostname)
ls -l /shared/dataset/
```

验证标准是每个节点都能读到其他节点写入的文件且内容一致。数据应以分片组织；每个训练 rank 按确定规则读取不同分片，避免元数据服务被大量目录遍历压垮。

## 基本机制

系统通常把文件数据分块存放于数据节点，并由元数据服务维护路径、权限和块位置。客户端可并行访问不同文件或不同块，但目录扫描、创建小文件和频繁 `stat` 往往集中消耗元数据能力。主流实现各有分工：Lustre 用元数据服务器 (Metadata Server, MDS) 管目录与属性、对象存储服务器 (Object Storage Server, OSS) 管数据块，可参考 [Lustre 文档](https://doc.lustre.org/)；IBM 的 GPFS/Spectrum Scale 以对称集群与分布式锁实现 POSIX 语义；JuiceFS 则把数据写入对象存储、把元数据放入独立数据库，用数据与元数据分离换取云上弹性，见 [JuiceFS 文档](https://juicefs.com/docs/community/introduction/)。

## 检查点发布

分布式训练可让各 rank 写入自己的状态分片，完成后由 rank 0 写入版本清单。清单应最后原子发布，并列出文件大小和校验值；恢复时只接受存在完整清单的版本。原子发布通常依赖「写临时目录 -> `fsync` -> 重命名」：重命名在 POSIX 语义下是原子的，能避免把半写入状态暴露为最新检查点。

## 案例：共享检查点

8 个 rank 将 `model-rank-*.safetensors` 和优化器分片写入临时目录：

```bash
mkdir -p ckpt-v7.tmp
# 各 rank 写入 ckpt-v7.tmp/model-rank-<rank>.safetensors
printf '{"version": 7, "files": [...]}' > ckpt-v7.tmp/manifest.json
sync
mv ckpt-v7.tmp ckpt-v7   # 原子发布
```

所有写入成功后，训练脚本写入 `manifest.json`，再把目录标记为可恢复版本。下一次启动读取清单并验证文件，避免把半写入状态当作最新检查点。

## 工程取舍

共享文件系统简化 POSIX 程序，但跨地域和归档场景成本较高。热数据可先缓存到 [NVMe](./nvme.md)，原始数据和长期归档通常放入 [对象存储](./index.md#三类存储)。

## 相关主题

- [存储系统导读](./index.md)
- [数据集存储](./dataset-storage.md)
