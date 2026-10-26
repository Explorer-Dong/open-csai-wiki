---
title: VSCode
icon: material/microsoft-visual-studio-code
---

[VSCode](https://code.visualstudio.com/) 是微软开发并开源的编辑器，比较适合作为轻量项目的开发工具。

## VSCode 安装

进入 [官网](https://code.visualstudio.com/) 后选择适合自己电脑架构的安装包安装即可。

## VSCode 配置

VSCode 有「基于文件」和「基于可视化」两种配置方法：

- 基于文件配置：编写 JSON 文件。
- 基于可视化配置（本质就是在操作配置文件）：点击左下角 ⚙ 按钮，点击「设置」，然后选择「用户」或「工作区」进行配置即可。

VSCode 支持不同的配置级别：

![按下 `Ctrl+Shift+P` 调出命令面板，查看 VSCode 不同的配置级别](https://cdn.dwj601.cn/images/20260211163911217.png)

其优先级从高到低依次为：

1. 工作区级：仅对当前项目奏效，适合团队使用 VSCode 开发时协作使用。该级别的配置会持久化在项目根目录的 `.vscode/settings.json` 文件中。
2. 用户级：该用户的所有项目均使用该配置，适合个人开发时使用。
3. 默认级：系统默认配置，无法修改。

如果登陆了 VSCode，配置好后 VSCode 会自动将配置内容同步到云，后续切换环境时只需要登陆 VSCode 就可以自动同步所有配置。

## VSCode 插件

VSCode 最强悍的地方之一就在于插件系统。通过插件系统，VSCode 能完成很多意想不到的任务。

### 安装插件

如果网络条件允许，可以直接在线安装。

也支持离线安装：

1）获取 VSIX 格式的插件安装包：推荐通过 [官网](https://marketplace.visualstudio.com/vscode) 获取；也可以在插件列表选中并右键插件，选择下载 VSIX。

2）在本地执行安装：

```bash
code --install-extension </path/to/xxx.vsix>
```

### Remote SSH

Remote SSH 插件允许 VSCode 通过 SSH 协议操作远程服务器，同时提供了 VSCode 的全部功能。

其原理时在远程服务器上安装并启动 VSCode Server 程序。对于小内存服务器，可以在结束连接时主动关闭 Server 端进程，减少内存占用。Ctrl + Shift + P 调起控制面板，然后输入 `Remote-SSH: Kill VS Code Server on Host...`，之后选择对应的 SSH 主机即可：

![Kill VSCode Server 命令](https://cdn.dwj601.cn/images/2026-1026-230021-1c24f7ed.png)

### LaTeX

以 Ubuntu 为例。首先安装 Tex 编译器：

```bash
sudo apt install texlive-full -y
```

然后安装 VSCode 的 LaTeX 插件：[LaTeX Workshop](https://github.com/James-Yu/LaTeX-Workshop.git)。

之后就可以按照 LaTeX 工程，在本地编写 tex 并编译预览了。

## 代码跳转

在阅读较大的工程代码库时，我们不可避免地需要在各个函数、文件之间跳转，合理使用跳转快捷键可以保持思维的连贯性，从而加快我们对陌生代码的理解。

以 Windows 为例：

- 进入 (enter)：Ctrl + 鼠标左键。
- 光标后退 (navigate back)：Alt + $\leftarrow$ 或鼠标侧边后退键。
- 光标前进 (navigate forward)：Alt + $\rightarrow$ 或鼠标侧边前进键。
