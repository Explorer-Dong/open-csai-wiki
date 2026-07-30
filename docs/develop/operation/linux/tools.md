---
title: 常用工具
icon: material/tools
---

## 软件管理器 apt

apt (advanced package tool) 是 Ubuntu/Debian 自带的软件管理工具。

基本命令：

```bash
# 更新软件的版本索引
apt update

# 更新软件（需先更新软件的版本索引）
apt upgrade <package_name>

# 安装软件
apt install <package_name>:<version>

# 卸载软件
apt remove <package_name>
```

更换 apt 下载源：

```bash
# 编辑 apt 源文件
vim /etc/apt/sources.list.d/ubuntu.sources

# 将 URIs: http://archive.ubuntu.com/ubuntu/ 修改为
URIs: https://mirrors.tuna.tsinghua.edu.cn/ubuntu

# 将 URIs: http://security.ubuntu.com/ubuntu 也改为
URIs: https://mirrors.tuna.tsinghua.edu.cn/ubuntu

# 退出编辑后刷新配置
apt update
```

## 汉化 language-pack-zh-hans

language-pack-zh-hans 是一个终端汉化软件包。Shell 的运行结果通过 Terminal 呈现，如果遇到都是英文的输出结果，可以进行以下操作将其转换为中文。

1）软件安装：

```bash
apt update
apt install language-pack-zh-hans
```

2）添加中文语言支持：

```bash
locale-gen zh_CN.UTF-8
```

3）编辑 `/etc/default/locale` 文件：

```bash
LANG="zh_CN.UTF-8"
LANGUAGE="zh_CN:zh:en_US:en"
LC_NUMERIC="zh_CN.UTF-8"
LC_TIME="zh_CN.UTF-8"
LC_MONETARY="zh_CN.UTF-8"
LC_PAPER="zh_CN.UTF-8"
LC_IDENTIFICATION="zh_CN.UTF-8"
LC_NAME="zh_CN.UTF-8"
LC_ADDRESS="zh_CN.UTF-8"
LC_TELEPHONE="zh_CN.UTF-8"
LC_MEASUREMENT="zh_CN.UTF-8"
LC_ALL=zh_CN.UTF-8
```

4）重启机器：

```bash
reboot
```

## 目录可视化 tree

tree 是一个目录可视化工具，适合展示或查看指定目录下的文件结构。

软件安装：

=== "Linux"

    ```bash
    apt update
    apt install tree
    ```

=== "Windows"

    手动下载 tree 的二进制程序 [Tree for Windows](https://gnuwin32.sourceforge.net/packages/tree.htm)，下载后将二进制程序的路径加入环境变量即可使用。

命令格式：

```bash
tree [-option] [dir]
```

基本命令：

```bash
# 显示中文（防止中文名在某些电脑上出现乱码）
tree -N

# 选择展示的层级
tree -L <level_number>

# 只显示文件夹
tree -d

# 区分文件夹、普通文件、可执行文件（C 是加上颜色）
tree -FC

# 起别名（将常用组合简化为一个命令，可写入 ~/.bashrc 或 ~/.zshrc）
alias tree='tree -FCN'

# 排除特定文件或目录，并输出目录结构到文件
tree -L 2 -I '*.js|node_modules|*.md|*.json|*.css|*.ht' > tree.txt

# 按文件最后修改时间排序
tree -t

# 反向排序（按字母倒序，或者与 -t 连用表示按时间倒序）
tree -r

# 自然排序（按版本号/数字大小自然排序，例如区分 1, 2, 10 的顺序）
tree -v

# 文件夹优先
tree --dirsfirst
```

## 多路复用器 tmux

[tmux](https://github.com/tmux/tmux) 是一个终端多路复用工具，支持一个终端多路复用。不同的路以会话 (session) 的形式存在，特别适合后台运行长时间任务。

软件安装：

```bash
apt update
apt install tmux
```

终端命令：

```bash
# 新建并进入会话
tmux new -s <session_name>

# 进入会话
tmux attach -t <session_name>

# 列出所有会话
tmux ls

# 删除会话
tmux kill-session -t <session_name>

# 重命名会话
tmux rename-session -t <old_session_name> <new_session_name>
```

会话中快捷键：

```bash
# 退出会话
Ctrl+b d

# 罗列所有会话
Ctrl+b s
# ↑ ↓ 选择会话
# Enter 进入会话
# x + y 删除会话
# Esc 退出界面

# 重命名会话
Ctrl+b $
```

软件配置：

=== "方法一：编辑 `~/.tmux.conf` 文件"

    ```toml
    # 启用鼠标
    set -g mouse on

    # 增加历史滚动行数
    set -g history-limit 100000
    ```

    之后重新加载 tmux 配置文件让旧对话也能用上这些特性：

    ```bash
    tmux source-file ~/.tmux.conf
    ```

=== "方法二：会话中临时设置"

    ```bash
    # 以启用滚轮为例
    # 1. 进入 tmux 会话
    # 2. 输入 `Ctrl + b + :`
    # 3. 输入 `set -g mouse on`
    # 4. 回车后即可使用滚轮
    ```

## 下载器 wget

wget 是 Linux 系统中自带的命令行下载工具，支持 HTTP/HTTPS、FTP 等协议，功能丰富且使用简单。适合用于单文件的下载，支持断点续传、递归下载。

> [!note]
>
> Windows 上可以下载 [Windows binaries of GNU Wget](https://eternallybored.org/misc/wget/) 二进制程序来使用。

命令格式：

```bash
wget [<param>] <url>
```

基本命令：

```bash
# 指定保存的文件名
wget -O <filename> <url>

# 指定保存路径
wget -P </path/to/dir> <url>

# 下载指定文件中所有 url 对应的内容
wget -i <urls.txt>

# 后台下载（下载的日志会被保存到 wget.log 文件中）
wget -b <url>

# 断点续传
wget -c <url>

# 断点续传（最多 5 次）
wget -c -t 5 <url>

# 递归下载
wget -r <url>

# 递归下载一个网站中的所有以 .pdf 为后缀的文件
wget -r -A.pdf [url]
```

## 高性能下载器 aria2

[aria2](https://github.com/aria2/aria2) 是一款轻量级、高性能的命令行下载工具，支持 HTTP/HTTPS、FTP、SFTP 等常见协议，和 [wget](#下载器-wget) 相比最大的优势在于可以多线程下载，适用于单线程跑不满下行带宽的场景。

> [!warning]
>
> 线程数需要适当设置，开多了容易被误判为爬虫从而被封禁 IP。

安装 aria2：

=== "Ubuntu"

    ```bash
    apt update && apt install aria2
    ```

=== "CentOS"

    ```bash
    yum update && yum install aria2
    ```

=== "macOS"

    ```bash
    brew install aria2
    ```

=== "Windows"

    在 aria2 的 [GitHub Release](https://github.com/aria2/aria2/releases) 界面下载对应的版本即可。

命令格式：

```bash
aria2c <url>
```

基本命令：

```bash
# 多线程下载（aria2 会将文件分成多个部分并通过不同的连接进行下载）
aria2c -x 4 <url>

# 断点续传
aria2c -c <url>

# 下载指定文件中所有 url 对应的内容
aria2c -i <urls.txt>
```

> [!note] wget vs. aria2
>
> 以服务器下载 HuggingFace [某个 9GB 单文件](https://huggingface.co/datasets/jingyaogong/minimind_dataset/blob/main/sft_2048.jsonl) 为例：
>
> | 工具  | 线程数 | 时间开销（秒） | 平均下行带宽（MB/s） |
> | :---: | :----: | :------------: | :------------------: |
> | wget  |   1    |      604       |         21.3         |
> | aria2 |   1    |      266       |          32          |
> | aria2 |   2    |      141       |          60          |
> | aria2 |   4    |       87       |          98          |
> | aria2 |   8    |       71       |         121          |
>
> 实验结果如上表所示，可以得到以下两个结论：
>
> - 当达到平均下行带宽峰值（约 125MB/s）后，提升线程数就无法再提速了。
> - aria2 的单线程下载性能明显高于 wget。

## 文件传输工具 scp

在计算机网络应用层中，我们介绍了安全复制协议 [SCP](../../../base/cs/computer-network/application-layer.md#scp-协议)，基于该协议，工程师开发了安全复制程序 `scp` 作为点对点的数据加密传输工具。

命令格式：

```bash
scp [param] <source> <target>
```

基本命令：

```bash
# 从服务器拉取数据到本地
scp <user@xxx.xxx.xxx.xxx:/path/to/source> </path/to/target>

# 把本地的数据推送到服务器
scp </path/to/source> <user@xxx.xxx.xxx.xxx:/path/to/target>

# 指定端口
scp [-P <port>] <source> <target>

# 指定私钥
scp [-i <path/to/private_key>] <source> <target>

# 递归传输（适用于文件夹）
scp [-r] <source> <target>
```

## 数据传输工具 cURL

[cURL](https://github.com/curl/curl) (Client URL) 是一款支持 URL 语法的命令行数据传输工具，支持 HTTP/HTTPS、FTP、SFTP 等多种协议。与 [wget](#下载器-wget) 和 [aria2](#高性能下载器-aria2) 不同，cURL 默认将内容输出到标准输出，适合用于 API 测试和调试。

命令格式：

```bash
curl [<param>] <url>
```

基本命令：

```bash
# 发送 GET 请求
curl <url>

# 指定请求方法
curl -X POST <url>

# 发送 JSON 数据
curl -X POST -H "Content-Type: application/json" -d '{"key":"value"}' <url>

# 显示响应头（与响应体一同显示）
curl -i <url>

# 只显示响应头
curl -I <url>

# 下载文件（使用 -O 保持远程文件名）
curl -O <url>

# 下载文件并指定保存的文件名
curl -o <filename> <url>

# 静默模式（不显示进度条和错误信息以外的内容）
curl -s <url>

# 跟随重定向
curl -L <url>

# 失败时不输出错误 HTML 页面，只输出错误码
curl -f <url>

# 发送带自定义请求头的请求
curl -H "Authorization: Bearer <token>" <url>
```
