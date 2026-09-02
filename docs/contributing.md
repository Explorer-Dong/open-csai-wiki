---
title: 参与贡献
---

本文介绍如何参与到项目的贡献中。

## 方法一：发表评论

在你想说点什么的网页底部发表一个友善的评论。例如：

1）在首页底部点击「使用 GitHub 登录」：

![在首页底部点击「使用 GitHub 登录」](https://cdn.dwj601.cn/images/20251020212913124.png)

2）输入文本后点击「评论」即可（评论支持 Markdown 格式及其预览）：

![输入文本后点击「评论」](https://cdn.dwj601.cn/images/20251020213110204.png)

## 方法二：在线编辑

如果你想直接编辑网页中的内容，请按照下面的流程进行：

1）进入项目的 [GitHub](https://github.com/Explorer-Dong/open-csai-wiki) 地址，点击右上角的 `Fork` 按钮并确认：

![进入项目的 GitHub 地址，点击右上角的 Fork 按钮并确认](https://cdn.dwj601.cn/images/20251020215405589.png)

2）回到对应的网页，点击右上角的「铅笔按钮」跳转到编辑页面：

![点击右上角的「铅笔按钮」跳转到编辑页面](https://cdn.dwj601.cn/images/20251020215005418.png)

3）编辑内容后点击「Create pull request」发起合并请求：

![编辑内容后点击「Create pull request」发起合并请求](https://cdn.dwj601.cn/images/20251020215103475.png)

等维护者检查没问题后即可更新内容。

## 方法三：本地部署

该方法适合本地预览你的修改。请确保本地已经安装好 [Git](./develop/operation/git/index.md#安装-git) 和 [Python](./base/ai/python/engineering.md#解释器管理)，具体操作如下：

1）进入项目的 [GitHub](https://github.com/Explorer-Dong/open-csai-wiki) 地址，点击右上角的 `Fork` 按钮并确认：

![进入项目的 GitHub 地址，点击右上角的 Fork 按钮并确认](https://cdn.dwj601.cn/images/20251020215405589.png)

2）克隆仓库到本地：

```bash
git clone https://github.com/<username>/open-csai-wiki.git
cd open-csai-wiki
```

3）配置 Python 环境：

项目使用 uv 进行管理，请先安装 [uv](./base/ai/python/engineering.md#uv)。接下来同步环境即可：

=== "Windows"

    ```powershell
    # 同步环境
    uv sync

    # 激活虚拟环境
    .venv\Script\activate
    ```

=== "macOS/Linux"

    ```bash
    # 同步环境
    uv sync

    # 激活虚拟环境
    source .venv/bin/activate
    ```

4）编辑内容：

现在你就可以进行修改或新增文件，具体规范见 [行文规范](#行文规范)。之后请启动本地预览服务，来查看自己的内容是否可以被正常渲染：

```bash
zensical serve -o
```

5）推送仓库：

最后请将你的代码 [推送](./develop/operation/git/commands.md#迭代) 到仓库，然后点击右上角的 Contribute 按钮发起 Pull Request：

![推送到你的仓库后点击右上角的 Contribute 按钮发起 Pull Request](https://cdn.dwj601.cn/images/20251020220221619.png)

## 行文规范

为了统一内容编排逻辑和文章写作风格，便于读者阅读，请严格遵循以下规范。

新增文件规范：

- 文件名：全部小写，适当缩写，使用 `-` 符号连接各单词，例如 `ds-and-algo`。
- 文件位置：请将需要补充的文件放置在 `docs` 文件夹下的合适位置，例如 `templates-py.md` 放在 `ds-and-algo/` 下。目录的嵌套结构应当和文件的嵌套结构一致。例如目录索引逻辑为 a/b/c，那么文件应当设置为 a/b/c.md。
- 文件路径配置：将新增的文件路径添加到 `zensical.toml` 中。

文章写作规范：

- 标题：文章标题为 H2 至 H3，低于 H3 等级的标题不应再出现，可以采用段首加粗的形式。metadata 中的标题内容尽可能使用中文。文章中的二级标题不应该只有一个，如果确实只有一个，就把所有的三级标题升级为二级标题。
- 链接：所有内链请采用相对引用的格式，例如 `[基础知识](./base/index.md)`，所有链接都用 markdown 格式而不是 <> 包裹。
- 强调：不要整行加粗，特殊名词可以使用「」符号包裹，减少加粗符号 ** 的使用。
- 符号：不要在标题中使用 emojis，大幅减少正文中的 emojis。
- 手法：大幅减少比喻、类比的写作手法，这是给技术人员看的，简明扼要、一针见血是最重要的。
- 括号：如果括号中全是英文，使用英文括号 () 包裹，否则使用中文括号（）包裹。
- 空格：md 的加粗和斜体内容两侧各需要一个空格，英文括号两侧各需要一个空格，链接两侧各需要一个空格。
- 缩进：对于嵌套的列表缩进，统一使用 4 个空格。
- 箭头：不要用单一箭头符号，要用 -> <- 或必要时使用 latex。
- 提示框：可以极少量添加合适的 callout 框来突出内容，可用的有：note, tip, important, warning。提示框可以不写标题，如果要加标题，可以写在 > [!<callout_name>] 后一个空格的位置，注意。
- 英文补充：对于一些特殊名词、专业名词才需要使用英文补充在后面，如果有缩写也要一并加上，例如：检索增强生成 (Retrieval-Augmented Generation, RAG)。否则不允许补充。
- 措辞：禁止使用“不是 xxx 而是 xxx”的句式。

文章内容安排：

- 对于介绍工具如何使用的文章，需要前置一个快速开始章节，然后再详细展开。
- 考虑到易读易懂性，文章不仅需要介绍最基本的知识，还需搭配简单案例（包括但不限于：代码、解释、公式、mermaid 图、表）。
- 知识的展开要符合 DAG，确保知识环环相扣、层层递进。

图片存储规范：

- 位置：请将图片存储在 `docs/assets/images/` 文件夹下。
- 大小：请尽可能减小图片的存储占用。
- 命名：请尽可能提升图片标题的可读性，或者使用时间戳。

更多行文规范可参考 [OI Wiki 格式手册](https://oi-wiki.org/intro/format/)，这里不做严格约束。
