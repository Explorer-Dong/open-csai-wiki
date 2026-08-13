---
title: Shell
icon: material/bash
---

本文记录 Shell 的学习笔记。

## 基本概念

Shell 是一个用 C 语言编写的用户程序，是用户与操作系统之间的接口，负责将用户输入的命令解析、展开，并通过系统调用交给内核执行，不需要编译。

它既是一种命令语言，交互式解释和执行用户输入的命令；又是一种程序设计语言，定义了各种变量和参数，并提供了许多在高级语言中才具有的控制结构。Terminal 提供了一个 GUI 界面，让用户直接和操作系统进行交互。

在 Linux 中，常见的 Shell 解释器是 Bash，当然也有 Fish、Zsh 等。不同 Shell 在交互功能和扩展语法上存在差异，但基础语法高度相似，本文以 Bash 为默认讨论对象。

在实际工程中，简单逻辑用 Shell 脚本，复杂逻辑交给 Python / Go 等高级编程语言。

## 运行方式

将一系列 Shell 命令写入文件并顺序执行，即构成 Shell 脚本，通常以 `.sh` 作为扩展名。

编写好 Shell 代码后，可以使用以下命令检查代码语法是否正确：

```bash
bash -n script.sh
# -n 即 no execution
```

脚本的常见运行方式包括以下两种：

```bash
# 1. 直接指定解释器
bash script.sh

# 2. 作为可执行文件运行
chmod +x script.sh
./script.sh
```

方法 2 依赖脚本首行的 [Shebang](https://zh.wikipedia.org/wiki/Shebang)，用于声明解释器路径，例如：

```bash
#!/bin/bash
```

## 语法基础

### 变量与引用

Shell 中的变量是弱类型，以字符串为主。例如：

```bash
# 定义变量（等号两侧不能有空格，不然就被识别为空格了）
name="shell"

# 引用变量
echo $name  # shell

# 引用变量（推荐加花括号来避免歧义）
echo ${name}  # shell

# 引用变量（单引号无效，双引号有效）
echo 'hello $name'  # hello $name
echo "hello $name"  # hello shell
```

### 导出变量 `export`

使用 `export` 将 Shell 变量导出为环境变量，使其能够被当前 Shell 启动的子进程继承：

```bash
# 将 CUDA_VISIBLE_DEVICES=0,1 添加到当前会话的环境变量
export CUDA_VISIBLE_DEVICES="0,1"

# 将 /custom/bin 添加到系统路径
export PATH="$PATH:/custom/bin"
```

> [!note]
>
> `export` 只会影响当前 Shell 及其后续启动的子进程，不会反向影响父进程，也不会自动写入配置文件。若希望每次打开终端都生效，需要将 `export` 语句写入 `~/.bashrc` 等启动配置文件中。并执行：
>
> ```bash
> source ~/.bashrc
> ```
>
> 上述命令的作用是在当前 Shell 中重新执行 `~/.bashrc` 文件中的所有命令。注意，该命令不会自动清理已经存在但配置文件中不再出现的变量，如果发现导出的值有误，可以重新 `export` 一遍进行覆盖，如果希望取消变量，可以使用 [`unset`](./shell.md#取消变量-unset) 命令。

### 取消变量 `unset`

使用 `unset` 可以删除当前 Shell 中已经存在的变量：

```bash
unset http_proxy
unset https_proxy
```

### 命令别名定义 `alias` 

`alias` 用于给命令定义别名，常用与给长命令定义简写别名。

定义别名：

```bash
alias ll='ls -alF'
alias gs='git status'
```

取消别名：

```bash
unalias ll
```

`alias` 只在当前 Shell 会话中生效，可以写入 `~/.bashrc` 来持久化。

### 分支

```bash
if [ "$a" -gt 10 ]; then
    echo "large"
elif [ "$a" -gt 5 ]; then
    echo "medium"
else
    echo "small"
fi
```

注意：

- `[ ... ]` 两侧必须有空格
- 字符串比较与数字比较使用不同运算符

### 循环

```bash
for file in *.sh; do
    echo $file
done
```

```bash
while read line; do
    echo $line
done < file.txt
```

### 函数

Shell 支持函数，用于封装逻辑、提升复用性，例如：

```bash
# 定义函数
run() {
    echo "You are running $1 with $2 parameter."
}

# 调用函数
run train.py use_fsdp  # You are running train.py with use_fsdp parameter.
```

函数形参通过位置 `$1`、`$2` 的方式引用。

## 脚本示例

```bash
#!/bin/bash

# 在脚本运行的过程中一旦遇到错误，就直接中断执行
set -e

log() {
    echo "[$(date '+%F %T')] $1"
}

for file in "$@"; do
    if [ -f "$file" ]; then
        log "processing $file"
    else
        log "skip $file"
    fi
done
```
