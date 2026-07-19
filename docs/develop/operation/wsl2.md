---
title: WSL2
icon: material/penguin
---

本文介绍 WSL 的基本使用方法，详情见 [WSL 官方文档](https://learn.microsoft.com/zh-cn/windows/wsl/)。

> [!note]
>
> 由于 WSL2 相对于 WSL1 在性能上有了质的飞跃，所以现代 WSL 一般都指 WSL2。下文的 WSL 不特别声明均指 WSL2。

## 基本概念

WSL (Windows Subsystem for Linux) 是微软开发的一个兼容层，允许在 Windows 上运行 Linux 并使用其大部分功能。它为开发者提供了一个完整的 Linux 环境，而无需安装虚拟机或双系统。

WSL1 vs WSL2：

- WSL1：使用转换层将 Linux 系统调用转换为 Windows 系统调用，性能较低，I/O 速度慢；
- WSL2：使用真实的 Linux 内核，运行在轻量级虚拟机中，提供完整的系统调用和更快的 I/O。

WSL2 的主要特性：

- 真实的 Linux 内核：运行完整的 Linux 内核，提供 100% 的系统调用兼容性；
- 快速的文件系统性能：Linux 文件系统操作速度显著提升；
- 完整的系统调用兼容：可以运行 Docker、Kubernetes 等需要完整内核支持的应用；
- 快速启动：秒级启动 Linux 环境；
- 轻量级资源占用：动态内存分配，按需使用系统资源。

## WSL 管理

### 安装 WSL

> [!note]
>
> 安装 WSL 需要 Windows 10 2004 及更高版本（内部版本 19041 及更高版本），同时需要有支持虚拟化的 CPU（需要在 BIOS 中启用虚拟化，默认开启，可在任务管理器的「性能」选项中查看）。

1）配置「启用或关闭 Windows 功能」选项，启用「Virtual Machine Platform（有些主机会显示为中文——虚拟机平台）」和「适用于 Linux 的 Windows 子系统」两个选项，然后重启电脑。如下图所示：

![启用功能](https://cdn.dwj601.cn/images/20250907214237225.png)

2）终端输入以下命令下载 WSL：

```bash
wsl --install
```

系统会自动安装 WSL 和默认的 Linux 发行版 Ubuntu。下载安装过程如下所示：

|                   首先会下载安装最新的 WSL                   |           然后回下载安装默认的 Linux 发行版 Ubuntu           |
| :----------------------------------------------------------: | :----------------------------------------------------------: |
| ![正在下载 WSL](https://cdn.dwj601.cn/images/20250907220459381.png) | ![正在下载 Ubuntu](https://cdn.dwj601.cn/images/20250907220506204.png) |

查看 WSL 安装情况：

```bash
wsl --version
```

3）设置好用户名和密码后，就可以使用以下命令进入 Linux 环境：

```bash
wsl -d Ubuntu  # Ubuntu 可以替换为你指定的 Linux 发行版名称
```

![专属于 Linux 的命令](https://cdn.dwj601.cn/images/20250907221157099.png)

### 更新 WSL

```bash
wsl --update
```

### 配置 WSL

有以下两种方法来对 WSL 进行全局配置：

- 创建 `C:\Users\<用户名>\.wslconfig` 文本文件来配置 WSL；
- 运行 `WSL Settings` GUI 程序可视化配置 WSL（也会自动创建上述文件）。

示例配置：

```ini
[wsl2]
memory=8GB
swap=16GB
processors=12
defaultVhdSize=32GB
```

配置前需要关闭所有实例，重启后生效。

> [!tip] 关于硬盘大小
>
> 安装在 WSL 中的所有 Linux 实例共享除了硬盘大小以外的所有配置。硬盘大小可以后续单独扩容，例如，从 32 GB 扩容到 64 GB：
>
> ```bash
> # 关闭 wsl
> wsl --shutdown
> 
> # 扩容 wsl
> wsl --manage <distri_name> --resize 64GB
> 
> # 重启发行版
> wsl -d <distri_name>
> 
> # 查看硬盘大小是否变化
> df -h
> ```

### 卸载 WSL

```bash
wsl --uninstall
```

## 发行版管理

> [!note]
>
> 使用 `wsl` 命令会在后台启动一个 WSL 守护进程，该进程无法自动关闭，但占用的资源可以忽略不计。

### 查看发行版

```bash
# 查看所有已安装的发行版
wsl --list

# 查看所有已安装的发行版的详细信息
wsl --list --verbose

# 查看可在线安装的发行版
wsl --list --online
```

### 安装发行版

```bash
wsl --install <distri_name>
```

### 卸载发行版

```bash
wsl --unregister <distri_name>
```

### 启动发行版

```bash
# 启动默认的发行版
wsl

# 设置默认的发行版
wsl --set-default <distri_name>

# 启动指定的发行版
wsl --distribution <distri_name>
```

### 停止发行版

```bash
# 停止所有的发行版
wsl --shutdown

# 停止指定的发行版
wsl --terminate <distri_name>
```

### 移动发行版

发行版默认安装在系统盘，我们可以手动调整安装位置缓解存储压力。

首先需要关闭 WSL：

```bash
wsl --shutdown
```

具体移动方法有两种：

- 方法一：基于 WSL [2.3.11](https://github.com/microsoft/WSL/releases/tag/2.3.11) 新特性 `--move` 一步移动：

    ```bash
    # 基本命令
    wsl --manage <distri_name> --move <path\to\target>

    # 示例命令
    wsl --manage Ubuntu-24.04 --move D:\WSL\Ubuntu-24.04
    ```

- 方法二：基于导入导出机制：

    ```bash
    # 导出发行版
    wsl --export <distri_name> <path/to/source.tar>

    # 导入发行版
    wsl --import <distri_name> <path/to/target> <path/to/source.tar>
    ```

### 配置发行版

在发行版文件系统内创建 `/etc/wsl.conf` 文本文件来配置对应的发行版。

示例配置：

```ini
[boot]
# 启动时执行的命令
# command = service docker start

[network]
# 生成 /etc/resolv.conf
generateResolvConf = true

# 生成 /etc/hosts
generateHosts = true

[interop]
# 启用 Windows 互操作
enabled = true

# 将 Windows PATH 添加到 Linux PATH
appendWindowsPath = true

[user]
# 设置默认用户
# default = <用户名>
```

配置时区：

```bash
# 查看时区
timedatectl

# 配置时区为美国太平洋时间
sudo timedatectl set-timezone America/Los_Angeles
```

### 重置发行版密码

如果忘记了 Linux 用户密码：

```bash
# 以 root 身份启动
wsl -u root

# 重置用户密码
passwd <用户名>
```

## 文件管理

跨文件系统操作会较慢，在 WSL 中操作时，建议将项目文件放在 Linux 文件系统中以获得最佳性能。数据会默认存放在 `%LOCALAPPDATA%\wsl` 对应包的 vhdx 硬盘映像文件中。

### Windows 访问 Linux 文件

直接从「文件资源管理器的侧边栏」访问 Linux 文件：

![直接从「文件资源管理器的侧边栏」访问 Linux 文件](https://cdn.dwj601.cn/images/20260309190349151.png)

也可以在「文件资源管理器的地址栏」输入：

```bash
\\wsl.localhost\<distri_name>

# 示例
\\wsl.localhost\Ubuntu-22.04
```

### Linux 访问 Windows 文件

Windows 硬盘被挂载在 `/mnt` 目录下：

```bash
# 访问 C 盘
cd /mnt/c

# 访问 D 盘
cd /mnt/d

# 示例：访问 Windows 用户目录
cd /mnt/c/Users/<user_name>
```

## 网络管理

### 网络模式

WSL 默认使用 [NAT](../../base/cs/computer-network/network-layer.md#ipv4-的-nat-技术) 网络模式，该模式允许 Windows 通过本地回环地址访问 WSL 中运行的服务：

```bash
# 在 WSL 中启动 Web 服务器
python3 -m http.server 8000

# 在 Windows 浏览器中访问
http://localhost:8000
```

但如果 Windows 开启了代理，会在每次启动 WSL 时出现以下提示（恼）：

![如果 Windows 开启了代理，会在每次启动 WSL 时出现提示](https://cdn.dwj601.cn/images/20260310222408171.png)

将 WSL 的网络模式 [配置](#配置-wsl) 为 mirrored 即可解决上述问题：

```toml
[wsl2]
networkingMode=mirrored
```

但在重新启动 WSL 后可能会出现以下警告：

![修改为镜像网络模式后出现的新问题](https://cdn.dwj601.cn/images/20260310222632407.png)

多重启几次 WSL 即可：

```bash
# 关闭 WSL
wsl --shutdown

# 等待至少 8 秒

# 启动 WSL
wsl
```

之后就可以解决问题了。

### 科学上网

方法一：启用代理软件的 TUN 模式，直接把流量转到虚拟网卡上。

![启用代理软件的 TUN 模式](https://cdn.dwj601.cn/images/20260330191942773.png)

方法二：使用 Windows 的代理服务。

```bash
# 编辑环境变量配置文件
vim ~/.bashrc

# 添加以下两个环境变量
export http_proxy=127.0.0.1:<port>
export https_proxy=127.0.0.1:<port>
```

## 使用案例：WSL + VSCode

WSL 的最大用处就是在 Windows 进行 Linux 开发，我们一般借助 VSCode 连接本地 WSL 进行开发。连接方法有两种：

方法一：在 VSCode 插件市场中搜索 `WSL` 并安装，调起命令面板后输入 `WSL: Connect to WSL` 即可连接本地 WSL 实例：

![调起命令面板后输入 WSL: Connect to WSL 即可连接本地 WSL 实例](https://cdn.dwj601.cn/images/20260309190717160.png)

方法二：在「远程资源管理器」中选择「WSL 目标」来连接本地 WSL 实例：

![在「远程资源管理器」中选择「WSL 目标」来连接本地 WSL 实例](https://cdn.dwj601.cn/images/20260309190922658.png)

之后就可以调起终端使用各种 Linux 命令了。这在当今 AI Coding 年代是非常方便的，因为 PowerShell 的生态远不如 Bash/Zsh，AI 更擅长后者。
