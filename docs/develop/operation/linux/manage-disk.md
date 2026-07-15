---
title: 硬盘管理
icon: material/harddisk
---

## 硬盘挂载 mount

查看硬盘接口：

```bash
fdisk -l
```

![1 TB 的硬盘已经被系统识别到了，硬盘接口为 /dev/vdc](https://cdn.dwj601.cn/images/20251024210643811.png)

格式化硬盘（设置硬盘的文件系统）：

```bash
mkfs -t ext4 /dev/vdc
```

![格式化结果](https://cdn.dwj601.cn/images/20251024211157415.png)

挂载硬盘：

```bash
cd / && mkdir zzz
mount /dev/vdc /zzz
```

![此时 zzz 文件夹被挂载到了 /dev/vdc 硬盘中](https://cdn.dwj601.cn/images/20251024211402168.png)

卸载硬盘：

```bash
umount /zzz
```

![此时 zzz 文件夹恢复到了 /dev/vda2 硬盘中](https://cdn.dwj601.cn/images/20251025100850672.png)

挂载前，数据存储在原来的设备中，挂载后，原来的数据会被遮蔽，新数据持久化保存在新挂载的设备中，取消挂载后，原来的数据会重新显现。可以使用 `df -h <filepath>` 来查看数据所在的设备。

有关自动挂载参见 [知乎](https://zhuanlan.zhihu.com/p/691951675)。

## 查看磁盘可用空间 df

查看所有可用空间：

```bash
df
```

添加单位便于阅读：

```bash
df -h
```

只查看部分列：

```bash
df -h --output=target,size,used,avail,pcent
```

查看指定文件或文件夹所在空间：

```bash
df <file/folder>
```

## 查看文件占用的磁盘空间 du

基本命令格式：

```bash
du <file/folder>
```

当目标为文件夹时，会递归查询，可以限制递归最大深度：

```bash
du --max-depth=1 <folder>
```

查看占用空间之和：

```bash
du -s
```

添加单位便于阅读：

```bash
du -h
```

文件从大到小排序：

```bash
du -sh * | sort -rh
```
