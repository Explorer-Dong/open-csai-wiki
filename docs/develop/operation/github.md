---
title: GitHub
icon: material/github
---

本文介绍 [GitHub](https://github.com) 的常见用法，更详细的内容见官方文档 [GitHub Docs](https://docs.github.com/zh)。

> [!tip]
>
> [Git](./git/index.md) 是一款版本管理软件，适用目前绝大多数操作系统；GitHub 是一个代码托管平台，于 2018 年被微软收购，与 Git 没有任何关系。但使用 Git 管理的项目可以基于 GitHub 进行分布式存储，非常适合协作开发。因此往往需要结合二者来达到相对良好的 Teamwork 效果。

## 身份鉴权

分布式代码管理意味着需要代码托管平台，这就不可避免的要解决客户端与平台的身份鉴权问题。

常见的鉴权方式有两种：

- 【不推荐】密码鉴权。即通过用户名和账户密码来和平台交互。[GitHub 在 2021 年禁用了该鉴权方式](https://github.blog/changelog/2021-08-12-git-password-authentication-is-shutting-down/) 来确保安全性，其他平台可能还可以使用（例如 CODING）。这种方法在每次交互时都需要输入用户名和密码。
- 【推荐】token-based 鉴权。这是目前身份鉴权的最佳实践，可以针对场景或开发人员定制不同权限的 token，确保了资源的安全性和操作的可控性。GitHub 目前支持：personal access token、ssh、OAuth、GitHub App installation token 等鉴权方式。针对个人开发者，这里讨论 personal access token 和 ssh 两种 token-based 鉴权方式。

### personal access token

首先创建 personal access token：

1. 进入 [GitHub Settings](https://github.com/settings/apps) 界面后选择 Fine-grained tokens 或 Tokens (classic) 中的一种（Fine-grained tokens 可以针对仓库做更细粒度的权限控制）；
2. 配置好 token 的权限（Add permissions >> 勾选 Contents >> 设置 Access  为 Read and write）与名称；
3. 保存生成的 token（只会出现一次）。

接着配置 personal access token 的存储行为：

```bash
git config credential.helper <mode>
```

主要有以下几种存储 mode：

- 【可选】不存储。参数为空字符串即可，此后每次和云平台交互都需要手动输入用户名和 token 或密码；
- 【可选】cache 模式。让 token 保存在内存中一段时间，不写入磁盘；
- 【Windows/macOS/Linux 可选】manager 模式。在额外安装 [GCM](https://github.com/git-ecosystem/git-credential-manager) 后才能启用（可以额外安装，也可以在安装 Git 时勾上 GCM 选项一起安装）。在 Windows 中该模式会将 token 存储在「凭据管理器」中；
- 【Windows 默认】wincred 模式。Windows 上的默认加密存储方式，也是存储在「凭据管理器」中，和 manager 的区别是 wincred 不会加密用户名；
- 【不推荐】store 模式。将 token 以明文的方式存储在磁盘 `~/.git-credentials` 文件中，这很危险，不推荐这种用法；
- 【macOS 可选】osxkeychain 模式。macOS 上的加密存储方式。

> [!note]
>
> token 或密码的存储属于 Git 的行为，准确地说是 [Git 凭证管理器 (Git Credential Manager, GCM)](https://git-scm.com/book/zh/v2/Git-工具-凭证存储) 的行为，与 GitHub 无关。

### ssh

[创建密钥对](../operation/ssh.md#第一步客户端生成密钥对) 后把公钥上传到 [GitHub SSH keys](https://github.com/settings/keys)，然后本地 [配置 ssh config](../operation/ssh.md#ssh-config) 让对应的私钥指向 `github.com` 即可。

## 与代码托管平台的连接方式

基于 GitHub 等代码托管平台进行分布式开发时，通常涉及到连接协议的选择问题，主要有 HTTPS 和 SSH 两个选项。

使用 HTTPS 协议克隆远程仓库，例如：

```bash
git clone https://github.com/Explorer-Dong/open-csai-wiki.git
```

使用 SSH 协议连接远程仓库，例如：

```bash
git clone git@github.com:Explorer-Dong/open-csai-wiki.git
```

具体用哪一种取决于你的开发场景，主要就以下两种：

- 本地开发。怎么方便怎么来，token 大概率不会泄露。
- 远程开发。不建议用 ssh，因为你得把私钥传到服务器，这很危险。我更推荐用 personal access token，并且不要持久化 token，每次交互就老老实实输入用户名和 token。

## 贡献代码

对于一个特定的 git 仓库，不是每个人都有权限直接修改仓库中的内容，为了高效协作，GitHub 设计了 Pull Request (PR) 功能。仓库贡献者可以修改内容，仓库所有者可以决定是否将这些改动合并进来。

PR 的基本工作逻辑如下图所示：

![Pull Request 工作逻辑图例](https://cdn.dwj601.cn/images/202406091607490.svg)

具体地：

1. 先在 GitHub 平台将目标仓库 "openai/openai-cookbook" `fork` 到自己的账号下，得到 "小明/openai-cookbook" 这个仓库；
2. 接着将 "小明/openai-cookbook" `clone` 到本地并进行开发；
3. 开发结束后通过 `add`、`commit` 、`push` 等常规操作保存并提交改动；
4. 最后在 GitHub 平台向 "openai/openai-cookbook" 发起 `pull request` 等到管理员审核即可。

本质上还是 [分支合并](./git/branch.md#分支合并)，只不过源分支（归属原始的仓库）和新分支（归属 fork 的仓库）不属于同一个仓库而已。

### 1. fork 目标仓库

进入目标仓库，点击右上角的 fork 按钮进行 fork。如下图所示：

![fork 目标仓库](https://cdn.dwj601.cn/images/202406091618430.png)

### 2. 克隆 fork 后的仓库

进入自己的仓库，找到对应的项目并复制克隆链接。如下图所示：

![clone 仓库至本地](https://cdn.dwj601.cn/images/202406091620622.png)

### 3. 编辑内容并版本管理

我们将需要修改的内容完善后，就按照常规的 Git 用法进行 add、commit 和 push 操作即可。

### (Optional) 同步 fork 后的仓库

当我们基于 fork 后的仓库的某个分支进行开发时，源仓库的该分支很有可能也更新了。此时我们有两种方法同步 fork 后的仓库（底层是将源仓库新产生的提交 push 到我们的仓库中）：

方法一：直接在 GitHub 网页上使用 `Update branch` 同步分支。但这会产生一个新的提交点（默认使用 [普通合并](./git/branch.md#普通合并) 选项，我没找到可以调整合并方式的选项，如果有欢迎评论指出），而 `Discard <x> commits` 会删除部分提交，不太安全就不用了：

![网页版 GitHub 同步 fork 的操作界面](https://cdn.dwj601.cn/images/20260120220424952.png)

方法二：在本地手动使用「变基合并」的方式同步 fork 后的仓库。为了避免新增节点，我们可以使用 [变基合并](./git/branch.md#变基合并) 同步 fork [^sync-forked-repo-1] [^sync-forked-repo-2] 后的仓库。由于 GitHub 网页版不支持该操作，只能本地进行：

[^sync-forked-repo-1]: [sync forked repository without creating a new commit](https://stackoverflow.com/questions/44583721/how-to-sync-forked-repository-without-creating-a-new-commit)

[^sync-forked-repo-2]: [How to avoid merge commits when syncing a fork](https://www.everythingdevops.dev/blog/how-to-avoid-merge-commits-when-syncing-a-fork)

```bash
# 添加远程仓库地址
git add remote upstream https://github.com/<username>/<repo_name>.git

# 变基合并源分支的提交
git pull --rebase upstream <sourcec_branch_name>

# 强制推送到 fork 后的仓库
git push origin <target_branch_name> --force
```

> [!note]
>
> 一旦在本地使用变基合并的方法合并源分支的提交后，后续再在 GitHub 网页端使用 Sync fork 也会基于变基合并的模式更新源分支了。

### 4. 发起 PR 请求

在选择合适的分支后，点击 `Contribute` 按钮即可看到 `Open pull request` 选项，点击即可发起 PR 请求。如下图所示：

![发起 PR 请求](https://cdn.dwj601.cn/images/202406091634960.png)

之后等待项目管理者 review 完你的改动后确定：合并到仓库、和你反馈继续修改、拒绝合并等。

## 审核代码

上一节讲解了如何给别人的项目贡献代码，现在身份交换一下。当别人给自己的项目提交 PR 以后，我们的应对之策。

### 方法一：给别人提意见

GitHub 提供了非常便利的评论功能，仓库拥有者可以直接给 PR 的每一个地方添加评论，仓库贡献者可以根据评论继续修改并迭代，直到满足要求。

这需要仓库拥有者有极强的代码审核能力，或者是一些比较明显的问题。

### 方法二：直接在网页修改

如果是少量的小问题，仓库拥有者也可以直接在 GitHub 网页端修改并提交内容。但这是很不靠谱的，很多时候需要在自己的本地验证修改。因此更推荐把 PR 的内容拉到本地审核。

### 方法三：拉取到本地审核

由于 PR 的本质是贡献者 fork 仓库的某个分支 merge 到主仓库的某个分支，所以我们需要先拉取 PR 分支的内容：

```bash
git fetch origin pull/<pr_number>/head:pr-<pr_number>
```

切换到 PR 分支：

```bash
git switch pr-<pr_number>
```

接下来进行常规的修改与提交操作：

```bash
git commit -am 'xxx'
```

接着将修改推送到 PR 的源分支：

```bash
git push https://github.com/<pr_owner><pr_repo>.git HEAD:<pr_branch>
```

最后在对应 PR 的信息列表里就可以看到自己的提交了。后续就是正常的 [分支合并](./git/branch.md#分支合并) 操作，也可以 [删除本地的 PR 分支](./git/commands.md#删除分支)，这里都不再赘述。

## GitHub Actions

[GitHub Actions](https://docs.github.com/zh/actions) 是 GitHub 原生提供的 CI/CD 平台，可用于自动化执行软件构建、测试和部署操作。整个过程是声明式的，配置即行为。

> [!note]
>
> 在实际软件开发的过程中，代码会很频繁地变动，而代码变动就意味着需要重新「构建、测试和部署」，这是一个人力成本比较高、容易出错并且反馈周期较长的过程。
>
> CI/CD 应运而生，它通过自动化流水线来解决上述问题。当代码提交到仓库后，系统自动触发构建、测试和部署，把「提交代码 $\to$ 可运行服务」的过程标准化、可重复化。其中：
>
> - 持续集成 (Continuous Integration, CI) 侧重于尽早发现问题。通过频繁合并和自动测试，保证代码始终处于可工作的状态；
>
> - 持续交付/部署 (Continuous Delivery / Deployment, CD) 侧重于尽快交付产品。让通过验证的代码可以随时、安全地发布到目标环境。

为了理解它的组成，可以把 GitHub Actions 拆解为以下几个关键概念。

### 工作流 / workflow

工作流是自动化的最外层单位，本质是一个 YAML 文件，放在仓库的 `.github/workflows/` 目录下。一个仓库可以有多个工作流，每个工作流关注一类事情，例如 `ci.yml` 负责测试，`release.yml` 负责发布。

### 事件 / event

事件定义了“什么时候运行这个工作流”。常见事件包括代码推送 `push`、PR 创建 `pull_request`、包发布 `release` 等。事件只负责触发，不关心具体做什么。

### 任务 / job

一个工作流可以包含多个 job，job 之间默认并行执行，也可以通过依赖关系形成拓扑结构。每个 job 都会在一个独立的运行环境中执行。

### 步骤 / step

step 是 job 内的最小执行单元，可以直接执行命令，也可以调用一个已有的 action。step 按顺序执行，共享同一个文件系统上下文。

### 动作 / action

action 是可复用的步骤封装，可以理解为“流水线里的函数”。既可以使用 [官方或社区提供的 action](https://github.com/marketplace?type=actions)（通过 `uses` 使用）；也可以在仓库中自定义（通过 `run` 进行）。注意 `uses` 和 `run` 这两个动作是原子操作，不能出现在同一个 `step` 中。

### 外部变量

工作流中难免会遇到容易变化的参数，或者需要隐私保护的变量，此时就可以使用 GitHub Actions 提供的引用外部变量的功能。基本语法为：

```text
${{ <type>.<key> }}
```

变量分用户和仓库两个级别，每个级别均有两类变量：

- [私有变量](https://docs.github.com/zh/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)。作为密文保存，可通过 `${{ secrets.<private_var_name> }}` 的方式引用（同仓库的 Collaborator 可以看到，注意安全哟）；
- [公开变量](https://docs.github.com/zh/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables)。作为明文保存，可通过 `${{ vars.<public_var_name> }}` 的方式引用。

在仓库的 Settings 中的 Secrets and variables 中的 actions 中配置变量：

![Settings >> Secrets and variables >> actions](https://cdn.dwj601.cn/images/20251213221831478.png)

### 快速上手

> [!note]
>
> 利用 GitHub Actions 将静态网站部署到 Aliyun OSS 上（这也是本网站目前的 [部署方法](https://github.com/Explorer-Dong/open-csai-wiki/blob/main/.github/workflows/deploy_document.yml) 哟 😉）。
>
> 如果你用的是 VSCode 编写工作流，可以安装 GitHub 自己开发的 [Actions 插件](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-github-actions) 获得更好的编辑体验。

直接看具体的工作流：

```yaml title=".github/workflows/deploy_document.yml"
--8<-- ".github/workflows/deploy_document.yml"
```

工作流中的部分参考内容如下：

- [Aliyun CLI GitHub 仓库](https://github.com/aliyun/aliyun-cli)
- [Aliyun CLI 官方文档](https://help.aliyun.com/zh/cli/)
- [ossutil 复制命令 cp 的参数选项](https://help.aliyun.com/zh/oss/developer-reference/cp-upload-file)
- [GitHub Actions 最大并发量](https://docs.github.com/en/actions/reference/limits#job-concurrency-limits-for-github-hosted-runners)
- [GitHub Cache Action](https://github.com/actions/cache)
- [Material for Mkdocs CI 中的 cache 示例](https://github.com/squidfunk/mkdocs-material/blob/master/.github/workflows/documentation.yml)

## GitHub Pages

[GitHub Pages](https://docs.github.com/zh/pages) 是 GitHub 提供的静态站点托管平台，适合部署文档、博客、项目主页等静态网页。

常见访问形式如下：

- 项目站点：`https://<username/orgname>.github.io/<project>/`。
- 个人站点：`https://<username>.github.io/`。
- 组织站点：`https://<orgname>.github.io/`。

GitHub Pages 主要有两种部署来源。

### 从分支部署

适合仓库某个分支的根目录或 docs 目录已经存放了静态文件的情况。该方式配置简单，但不适合需要安装依赖、运行构建命令后再发布的项目。

具体操作步骤：

1. 进入仓库的 `Settings` >> `Pages`。
2. 在 `Build and deployment` 中选择 `Deploy from a branch`。
3. 选择需要发布的分支，例如 `main`。
4. 选择发布目录，例如 `/ (root)` 或 `/docs`。
5. 保存后等待 GitHub 完成部署。

部署成功后，GitHub 会在 Pages 设置页面展示站点地址。后续只要对应分支和目录中的文件发生变化，GitHub Pages 就会自动重新部署。

### 通过 [GitHub Actions](#github-actions) 部署

适合 Vite、MkDocs、Zensical 等需要先构建再发布的项目。

首先需要在仓库的 `Settings` >> `Pages` 中把部署来源切换为 `GitHub Actions`。

GitHub Actions 的大致流程：拉取代码 $\to$ 安装依赖 $\to$ 构建网页 $\to$ 上传构建产物 $\to$ 发布到 GitHub Pages。

下面是一个最小化的工作流示例：

```yaml title=".github/workflows/pages.yml"
name: pages

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # 拉取代码
      - name: Checkout
        uses: actions/checkout@v4
      # 安装依赖
      - name: Install
        run: npm ci
      # 构建网页
      - name: Build
        run: npm run build
      # 上传构建产物
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      # 部署到 GitHub Pages
      - name: Deploy
        uses: actions/deploy-pages@v4
```

如果项目使用的是 Python 文档工具，就把 `Build` 步骤替换为对应命令即可。例如本项目使用 uv 管理环境，可以改成：

```yaml
# 安装依赖
- name: Build
  run: uv sync
# 构建网页
- name: Build
  run: uv run zensical build
# 上传构建产物
- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: site
```

### 自定义域名

GitHub Pages 默认使用 `github.io` 域名。如果希望绑定自己的域名，需要完成两步：

1. 在 `Settings` >> `Pages` 的 `Custom domain` 中填写域名。
2. 在域名服务商处配置 DNS 解析，让域名指向 GitHub Pages。

如果使用自定义域名，建议勾选 `Enforce HTTPS`。GitHub 会自动为 Pages 站点签发证书，但证书生效可能需要等待一段时间。

### 注意事项

- GitHub Pages 只适合托管静态内容，不能直接运行数据库、后端 API 或常驻进程。
- 项目站点通常部署在子路径下，例如 `/open-csai-wiki/`，构建工具里的 `base`、`site_url` 等配置需要同步调整。
- 私有仓库是否支持 Pages 取决于账号和组织的 GitHub 计划。
- 不要把密钥、token、配置文件等敏感信息放进静态产物中，Pages 发布后的内容对访问者可见。
