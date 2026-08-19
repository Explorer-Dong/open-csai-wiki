---
title: Git 大文件存储
icon: simple/gitlfs
---

GitHub 官方规定仓库中的文件大小不超过 100 MB [^size-limit]，此时我们可以使用 Git LFS 管理大文件。

[^size-limit]: [关于 GitHub 上的大文件 | GitHub - (docs.github.com)](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github?platform=windows#file-size-limits)

## Git LFS 安装

首先需要 [安装 Git LFS](https://github.com/git-lfs/git-lfs#installing) 软件：

=== "Linux"

    ```bash
    sudo apt update && sudo apt install git-lfs -y
    ```

=== "Windows"

    默认已经安装，跳到 [Git LFS 使用](#git-lfs-使用) 一章继续阅读。

检验安装是否成功：

```bash
git lfs version
```

## Git LFS 使用

首先需要在本机初始化 git lfs（本机执行一次即可）：

```bash
git lfs install

# 如果输出以下内容表示初始化成功
# Updated Git hooks.
# Git LFS initialized.
```

### 追踪大文件 `git lfs track`

与 `.gitignore` 类似，为了版本管理大文件，只需将大文件的路径保存到 `.gitattributes` 文件中。

示例：托管 data 文件夹下的所有文件：

```bash
git lfs track data/*
```

此时在项目根目录会自动生成一个 `.gitattributes` 文件，其中应当出现类似以下内容的文本：

```text
data/<file1> filter=lfs diff=lfs merge=lfs -text
data/<file2> filter=lfs diff=lfs merge=lfs -text
```

接着和往常一样 `add`、`commit`、`push` 即可将大文件推送到远程。

### 拉取大文件 `git lfs pull`

如果目标仓库使用了 git lfs 管理大文件，需要手动拉取：

```bash
git lfs pull
```

## Git LFS 原理

与传统 Git 会「在 `.git` 文件夹中存储文件的所有版本」不同，Git LFS 的核心原理是「远程同样保存大文件的所有版本，但本地只保存大文件的某一个版本以及其他版本的地址」，从而降低本地存储开销以及网络传输压力。

该方法设计出来的核心目的，个人认为主要是：

- 降低本地存储开销，用户一般不关心历史版本，小文件稍微占点空间和传输压力就算了，大文件没必要也存下来；
- 大文件一般不进行 diff 操作，所以保存一版就够了。

当然该方法的劣势就是，如果没有网络，那么就没法获取其他版本的大文件了。
