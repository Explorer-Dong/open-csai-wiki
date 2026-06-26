---
title: Git 常用命令
icon: octicons/command-palette-16
---

使用 Git 管理代码文件时，最关键的是要理解「区域」的概念。在 Git 的视角下文件有着「工作区、暂存区和仓库区」三个区域：

- 工作区：内容的编辑区域。文件一旦发生变动或者被新添加进项目目录，就会被视为进入了工作区；
- 暂存区：变动的保存区域。文件一旦被开发者显式的 `add` 了，就会被视为从工作区转移到了暂存区；
- 仓库区：版本的生成区域。当开发到一定程度，暂存区积累了不少文件了，就可以 `commit` 一次，将暂存区中所有文件提交到仓库区，作为一次更新的版本。

本文主要从「配置、迭代、回溯、分支、远程」五个方面介绍 Git 的常用命令。

## 配置

使用 Git 之前需要进行基本的配置才能使用。Git 一共有三个配置级别：

- 添加 `--local` 参数表示项目级配置（默认级别）。配置文件存储在 `.git/config` 中；
- 添加 `--global` 参数表示用户级配置。配置文件存储在 `~/.gitconfig` 中；
- 添加 `--system` 参数表示系统级配置。Linux 配置文件存储在 `/etc/gitconfig` 中，Windows 配置文件存储在 `<X:\path\to>\Git\etc\gitconfig` 中。

根据场景选择合适的配置级别。

### 查看当前配置

```bash
git config --list
```

### 配置个人信息

```bash
# 查看：用户名 & 密码 & 邮箱
git config user.name
git config user.password
git config user.email

# 配置/修改：用户名 & 密码 & 邮箱
git config user.name "xxx"
git config user.password "xxx"
git config user.email "xxx@xxx.com"
```

### 配置网络代理

```bash
# 查看代理
git config --get http.proxy
git config --get https.proxy

# 配置代理
git config http.proxy 127.0.0.1:<VpnPort>
git config https.proxy 127.0.0.1:<VpnPort>

# 取消代理
git config --unset http.proxy
git config --unset https.proxy
```

如果走 SSH 协议，先装一个软件：

```bash
sudo apt updata && sudo apt install netcat-openbsd -y
```

然后给 ~/.ssh/config 文件加一个配置：

```text hl_lines="6"
Host github-sub
    HostName github.com
    User git
    IdentityFile ~/.ssh/key_ai_api
    IdentitiesOnly yes
    ProxyCommand nc -x 127.0.0.1:7897 [<-X 5/connect>] %h %p
```

如果是 HTTPS 代理，就填 -X connect，如果是 SOCKS v.5 代理，就填 -X 5。

部分代理软件使用的是混合端口，例如 Mihomo 内核的代理软件就任选一个即可，由于 nc 默认 -X 5，所以不填也行。

![Clash Verge Rec 使用 Mihomo 内核，端口是混合的](https://cdn.dwj601.cn/images/20260614124400088.png)

### 配置中文转义

```bash
# 取消 Git 对中文的转义
git config --global core.quotepath false
```

### 配置默认分支名

```bash
# 查看默认分支名
git config --global --get init.defaultBranch

# 修改默认分支名
git config --global init.defaultBranch <defalut_branch_name>
```

## 迭代

项目开发并非一蹴而就，需要迭代式推进。首先需要一个初始迭代场景，主要有以下两种：

- 本地从零开始（一般是独立开发或者是项目创始人的场景）：

    ```bash
    git init
    ```

- 从远程已有的仓库开始（协作开发最常见的场景）：

    ```bash
    # 克隆默认分支
    git clone <remote_url> [<project_name>]
    
    # 克隆指定分支
    git clone -b <branch_name> <remote_url> [<project_name>]
    
    # 此时远程仓库名称默认为 origin
    ```

### 工作区 $\xrightarrow[]{\text{add}}$ 暂存区

基本命令：

```bash
git add {<file> | <folder> | .}
```

逐代码块 (patch) 加入（适用于同一个文件的改动对应多个版本的情况）：

```bash
git add -p [<file> | <folder> | .]

# 之后会显示参数选项 [y,n,q,a,d,s,e,?]
# y - yes：确认指定段加入暂存区
# n - no：取消指定段加入暂存区
# q - quit：退出交互模式
# a - all：将当前文件的所有变动块都加入暂存区
# d - down：跳过当前文件的所有变动块
# s - split：将当前代码块划分为更小的块
# e - edit：手动选择当前代码块的内容（适用于 s 划分精度不足的场景）
# ?：显示帮助文本
```

### 暂存区 $\xrightarrow[]{\text{commit}}$ 仓库区

```bash
# 暂存区到仓库区
git commit -m '<comment>'

# 添加多个 -m 表示多行 comment
git commit -m '<comment_line_1>' -m '<comment_line_2>'
```

其中 comment 表示对新版本的更新说明。为了帮助其他开发者更好地了解你的改动，comment 需要有一些规范。基本格式如下：

```text
<type>([scope]): <subject>
[body]
[footer]
```

格式中的五类信息基本撰写规范如下：

1. **type**：提交的类型。常见的有：feat（新功能）、fix（修复 Bug）、docs（更新文档）、refactor（重构）、test（测试）、build（构建系统）、ci（CI/CD 配置变更）、chore（杂项）、revert（回滚）；

2. scope：影响范围。常见的有：feat(api) 表示给 API 添加了新功能、fix(auth) 表示给鉴权模块修复了 Bug、docs(readme) 表示更新了 README 文档；

3. **subject**：简短描述。需要注意：时态使用现在时、首字母小写、不加句号、不超过 50 字符；

4. body：正文。主要用来「详细描述本次提交的内容」，以空行与标题分隔，通常用段落形式书写，可以使用列表。例如：

    ```text
    fix(api): fix user login failure
    
    fix an bug where login failed when users used passwords with special characters:
    
    - improve the regular expression for password validation
    - add input character set checks
    - update related error messages
    ```

5. footer：页脚。包含与提交相关的元数据，以空行与正文分隔，通常包括提交者信息等。

### 仓库区 $\xleftarrow[]{\text{pull}}$ 服务器

如果你的仓库已经在服务器（例如 GitHub）上存储了，在多人协作时可能会有更超前的代码还没合并到你的主机上，此时你需要先合并最新的提交。

基本命令：

```shell
# 普通合并
git pull

# 变基合并
git pull --rebase

# 【慎重】压缩合并（压缩远程提交记录）
git pull --squash
# 之后远程的修改已经全部合并并放在了暂存区，此时需要手动 commit 一次，编写压缩后的 comment

# 【常见】压缩合并（压缩本地提交记录）
git pull --rebase=interactive
# 之后首先会跳出一个包含多行 pick 开头的编辑界面，将从第二行开始的所有 pick 改为 squash 或 s 即可
# 然后会跳出一个编辑界面，用于编写合并后的 comment
```

> [!note]
>
> 不同合并方法的差异详见 [分支合并](./branch.md#分支合并) 的介绍。

`git pull` 其实隐藏了中间步骤，其本质上包括两个操作步骤：

```shell
# 拉取最新的提交
git fetch <remote_name> <branch_name>

# 将最新的提交点合并到本地分支
git merge <branch_name>
```

### 仓库区 $\xrightarrow[]{\text{push}}$ 服务器

```bash
# 仓库区到云服务器（常规方法）
git push <remote_name> <branch_name>

# 仓库区到云服务器（首次推送时需要指定上游分支，--set-upstream 可简写为 -u）
git push --set-upstream <remote_name> <branch_name>

# 仓库区到云服务器（已配置默认推送地址后）
git push

# 强制覆盖推送（--force 可简写为 -f）
git push --force <remote_name> <branch_name>

# 一次性推送所有分支
git push --all <remote_name>
```

## 回溯

### 未变动 $\xleftarrow[]{\text{checkout}}$ 工作区

```bash
# 【高危操作】取消修改
git checkout -- <file_name>
```

### 工作区 $\xleftarrow[]{\text{reset}}$ 暂存区

```bash
# 保留工作区的修改，将暂存区的所有内容移动到工作区
git reset {<file> | <folder> | .}
```

### 暂存区 $\xleftarrow[]{\text{reset}}$ 仓库区

```bash
git reset [--mixed] <commit_id>  # 回退到指定版本，并将暂存区和此后的所有版本合并到工作区
git reset --soft <commit_id> # 回退到指定版本，并将此后的所有版本合并到暂存区
git reset --hard <commit_id> # 【高危操作】回退到指定版本，工作区与暂存区被清空
```

## 分支

分支是 Git 的核心功能之一，适用于多人协作、多功能开发等所有「可并行迭代」的场景。

### 创建分支

```bash
# 创建分支
git branch <branch_name>

# 远程同步
git push <remote_name> <branch_name>
```

规范的分支命名可以让开发效率更高，例如：

| 分支类型   | 分支名匹配规则 | 描述                                         |
| :--------- | :------------- | :------------------------------------------- |
| 主干分支   | main           | 与仓库的默认分支保持一致                     |
| 开发分支   | develop        | 平时开发用的核心分支，含有不稳定但最新的特性 |
| 功能分支   | feature/*      | 一般一个事项对应一个功能分支                 |
| 发布分支   | release/*      | 一般一次新版本发布对应一个发布分支           |
| 热修复分支 | hotfix/*       | 从主干分支拉出，用于线上版本的 Bug 修复      |

### 合并分支

内容较多，详见 [Git 分支详解](./branch.md)。

### 追踪远程分支

```bash
# 查看仓库的所有分支
git branch -r

# 查看本地已追踪远程的分支
git branch -v
```

你可能注意到 `git branch -v` 显示的分支数远少于 `git branch -r` 显示的分支数，这是 Git 的安全设计——只有当远程分支在本地被显式追踪时，开发者才能在该分支上进行后续的提交。

本地显式追踪远程分支的方法如下：

```bash
# 显式追踪指定的远程分支（新写法）
git switch <branch_name>

# 显式追踪指定的远程分支（老写法）
git checkout <branch_name>
```

### 修改分支名称

```bash
# 修改名称（本质上是在本地创建了一个新分支，并且删除了老分支）
git branch -m <old_name> <new_name>

# 远程同步新分支
git push <remote_name> <new_name>

# 远程删除老分支
git push <remote_name> --delete <old_name>
```

> [!note]
>
> 如果待改名的分支为远程保护分支，则需要先在远程服务商那里调整保护分支。

### 删除分支

```bash
# 切换到另一个分支（必须）
git switch <another_branch_name>

# 本地删除老分支
git branch -d <branch_name>

# 远程删除老分支
git push <remote_name> --delete <branch_name>
```

## 远程

远程表示代码托管平台，用来对代码进行分布式管理，一般用于多人协作、代码备份等。常见的代码托管平台有 GitHub、GitLab、Gitee 等，这里不做说明都指 GitHub。

### 查看远程仓库

```bash
# 查看远程仓库别名
git remote

# 查看所有远程仓库
git remote -v
```

### 配置远程仓库

```bash
# 添加远程仓库（同时具备 fetch 和 push 权限）
git remote add <remote_name> <remote_url>
```

如果希望代码同步到多个仓库，可以添加 push 源：

```bash
# 添加 push 源
git remote set-url --add <remote_name> <another_remote_url>

# 删除 push 源
git remote set-url --delete <remote_name> <another_remote_url>
```

### 删除远程仓库

```bash
git remote remove <remote_name>
```

### 修改远程仓库

```bash
# 修改远程仓库别名
git remote rename <old_remote_name> <new_remote_name>

# 修改远程仓库地址
git remote set-url <remote_name> <new_url>
```

## 杂项

### 状态查询

```bash
# 查看当前项目的版本管理状态
git status
```

### 日志查询

```bash
# 从当前版本开始查询 commit 日志
git log

# 查看所有 commit 日志
git reflog
```

### 差异比对

```bash
# 查看「工作区」与「暂存区」的差异
git diff {<file_name> | .}

# 查看「暂存区」与「仓库区」的差异：指定文件
git diff --cached {<file_name> | .}
```

### 修改 comment

如果对 `git commit -m` 后编写的 comment 不满意，可以修改：

```bash
# 取消上一次 comment 并进入编辑模式
git commit --amend
```

如果希望修改更早提交的 comment，请使用 [合并分支](#合并分支) 中的交互式变基。

### 取消 Git 管理

有时我们会误将部分文件加入到 Git 管理，为了减小管理的体积或者取消敏感文件的管理，我们有必要将这些文件取消 Git 管理。一般有以下两种场景：

1）取消「当前版本」下某些文件的 Git 管理：

```shell
# 对于文件
git rm --cached <file_name>

# 对于文件夹
git rm --cached -r <folder_name>
```

之后在 `.gitignore` 中增加上述文件或文件夹名称。

2）取消「所有版本」下某些文件的 Git 管理 [^rm-in-all-commits]：

[^rm-in-all-commits]: [Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

```bash
# 过滤所有 commit
git filter-branch \
    --force \
    --index-filter 'git rm --cached --ignore-unmatch <file_path>' \
    --prune-empty \
    --tag-name-filter cat -- --all

# 过滤后强制推送到服务器
git push --force
```

### 临时保存更改

当我们在开发某个分支的过程中，临时想切换到其他分支做些什么时，Git 是不允许此时的工作区有变动的，但我们又不想 commit 工作区的代码，就可以使用 Git 的「临时保存」功能。使用一个类似于栈的数据结构进行维护。

代码入栈：

```bash
# 临时保存更改（入栈）
git stash [push]
# 示例输出：stash@{0}: WIP on exp: 23b0327 fix: typo

# 保存时排除已提交到暂存区的代码
git stash [push] --keep-index

# 包含未跟踪文件
git stash [push] -u

# 【很少用】包含所有文件，包括 .gitignore 忽略的
git stash [push] -a
```

代码出栈：

```bash
# 弹出并使用栈顶代码
git stash pop

# 使用栈顶代码
git stash apply

# 删除栈顶代码
git stash drop

# 使用栈内指定代码
git stash apply stash@{<2>}

# 删除栈内指定代码
git stash drop stash@{<2>}

# 使用栈内代码时，如果保存前代码已经进入暂存区，则保持该模式
# 否则，默认会将所有代码全部应用到工作区
git stash apply --index
```

其他命令：

```bash
# 查看栈内元素
git stash list
```

### tag 功能

tag 用来给某个 commit 起一个稳定的别名，常用于标记发布版本。常见命名方式为 `v<major>.<minor>.<patch>`，例如 `v1.2.0`。

常用命令：

```bash
# 查看所有标签
git tag

# 删除本地标签
git tag -d <tag_name>

# 删除远程标签
git push <remote_name> --delete <tag_name>
```
