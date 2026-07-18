---
title: Hugging Face
icon: simple/huggingface
---

本文介绍 [Hugging Face](https://huggingface.co/) 的一些概念与用法。

## HF 的定位

Hugging Face (HF) 是一个类似于 GitHub 的在线存储库，其主要提供以下三种服务：

- Models：存储模型的预训练权重；
- Datasets：存储数据集；
- Spaces：托管在线 demo。

本质上就是一个 Large File Storage (LFS)。

## HF CLI

既然 HF 主要做的是存储服务，那么就和 Git 一样好理解了。HF 官方开发了一个 CLI 名为 `hf`，主要用来做上传、下载和鉴权等工作。虽然很多时候可以用 Git LFS、Python SDK 来完成一些操作，但我还是更喜欢用 CLI，因为所有的一切都是可控的。完整内容详见 [hf cli docs](https://huggingface.co/docs/huggingface_hub/en/guides/cli)，下面只罗列一些常用命令。

> [!note]
>
> 你也许会在一些老项目上看到诸如 `huggingface-cli <command>` 的命令，这是老版 CLI 的语法，HF 团队在 25 年 7 月对 CLI 进行了大更新并将其更名为了 `hf`。更新详情见 [hf blog](https://huggingface.co/blog/hf-cli)。

### 安装 `hf`

一步安装：

=== "macOS/Linux"

    ```bash
    curl -LsSf https://hf.co/cli/install.sh | bash
    ```

=== "Windows"

    ```powershell
    powershell -ExecutionPolicy ByPass -c "irm https://hf.co/cli/install.ps1 | iex"
    ```

基于 pip 安装：

```bash
pip install huggingface_hub
```

### 身份鉴权

HF 上大多数 Model 和 Dataset 可以直接下载，但有些敏感内容需要鉴权才能下载，有时如果不鉴权还可能被限速。我们可以借助 `hf` 进行鉴权：

首先需要在 HF 官网 [创建一个 token](https://huggingface.co/settings/tokens)，注意只能选择读或写权限的，原因见 [GitHub Issue](https://github.com/huggingface/diffusers/issues/6223#issuecomment-2141411382)：

![创建一个 token](https://cdn.dwj601.cn/images/20250910144637890.png)

接下来我们进入终端进行鉴权即可：

```bash
hf auth login
```

之后输入刚才创建的 token 即可正常下载模型。

### 下载

下载 Model：

```bash
hf download <model_name>

# 例如：
hf download HiDream-ai/HiDream-I1-Full
```

下载 Dataset：

```bash
hf download <dataset_name> --repo-type dataset

# 例如：
hf download HuggingFaceH4/ultrachat_200k --repo-type dataset
```

下载 Space：

```bash
hf download <space_name> --repo-type space

# 例如：
hf download HuggingFaceH4/zephyr-chat --repo-type space
```

下载部分文件：

```bash
# 单文件
hf download <model_or_dataset_or_space_name> <path/to/file>

# 例如：
hf download HiDream-ai/HiDream-I1-Full text_encoder/model.safetensors

# 包含部分文件（--include 参数支持 glob 模式匹配）
hf download <model_or_dataset_or_space_name> --include <glob_path>

# 例如：
hf download Wan-AI/Wan2.1-T2V-1.3B --include "google/**" --include "*.pth"

# 排除部分文件（--exclude 参数支持 glob 模式匹配）
hf download <model_or_dataset_or_space_name> --exclude <glob_path>

# 例如：
hf download Wan-AI/Wan2.1-T2V-1.3B --exclude "*.pth"
```

持久化路径：

```bash
# 默认为 HF_HOME 环境变量
# HF_HOME="~/.cache/huggingface"

# 也可以通过 --local-dir 参数指定每次下载的路径
hf download <anything> --local-dir <path/to/download>
```

## 网络问题

由于 HF 的服务器不在大陆，并且会刻意封禁大陆 IP，所以如果你的算力平台无法访问 HF，就不得不采用别的方法进行下载。

### hf-mirrow

[hf-mirrow](https://hf-mirror.com/) 是国人发起的一个公益项目，旨在完全镜像 HF，加速大陆的访问。使用上，仍然基于 HF 的 CLI，更换下载源即可。

临时更换：

=== "Windows (CMD)"

    ```bash
    set HF_ENDPOINT=https://hf-mirror.com
    ```

=== "Windows (PowerShell)"

    ```bash
    $env:HF_ENDPOINT = "https://hf-mirror.com"
    ```

=== "Linux/macOS"

    ```bash
    export HF_ENDPOINT=https://hf-mirror.com
    ```

永久更换：

=== "Windows (CMD)"

    ```bash
    # 直接编辑环境变量或者输入以下命令编辑环境变量，然后重启终端
    setx HF_ENDPOINT https://hf-mirror.com
    ```

=== "Linux/macOS"

    ```bash
    # zsh 用户将下列 .bashrc 改成 .zshrc 即可
    
    # 编辑 .bash 文件
    vim ~/.bashrc
    
    # 在末尾添加
    export HF_ENDPOINT=https://hf-mirror.com
    
    # 重启终端或使用以下命令刷新终端
    source ~/.bashrc
    ```

之后就可以使用 HF 的 CLI 畅通无阻地下载模型和数据集了。

### ModelScope

[魔搭社区](https://modelscope.cn/) (ModelScope) 是阿里的一个产品，和 Hugging Face 的定位完全一致，使用逻辑基本一样。与 HF 相比，ModelScope 的好处是服务器在大陆，不会有网络上的约束了，坏处是有些模型的开发者不一定会把模型上传到 ModelScope，对应的社区也就不如 HF 丰富了。
