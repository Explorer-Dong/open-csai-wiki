---
title: Python 导读
icon: material/language-python
---

本文记录 [Python](https://www.python.org/) 的基本概念。

## 机制

Python 的运行机制主要包括源码执行、对象模型、导入机制、内存管理和并发约束等内容。

### 解释器执行

Python 是一门解释型语言。以 CPython 为例，解释器会先把 `.py` 源码编译为字节码对象 (code object)，然后由 C 逐条执行字节码指令。`.pyc` 是字节码缓存文件，用于加快后续加载。

根据场景的不同，字节码执行方式也不同，目前主流的有以下几种实现：

| 实现    | 开发语言 | 字节码执行方式                                    | 特点                                  | 典型应用场景                        |
| ------- | -------- | ---------------------------------------------- | ----------------------------------------- | ----------------------------------- |
| CPython | C        | 逐条解释  | 官方标准实现，生态最全，速度中等      | 默认实现、科研计算、Web 后端等     |
| PyPy    | RPython | 逐条解释，但会在运行时将热点字节码即时 (Just In Time, JIT) 编译为机器码，直接在 CPU 上执行 | 执行速度快，适合长时间运行的计算任务；但兼容性稍差 | 高性能计算、高并发等                 |
| Jython  | Java     | 将 Python 源码直接编译成 Java 字节码，然后由 JVM（Java 虚拟机）执行 | 能与 Java 无缝集成；但性能依赖 JVM 优化，启动速度稍慢 | 需要在 Java 环境中使用 Python 脚本 |

### 变量模型

在 C++ 和 Python 中，赋值语句的语义是完全不同的。C++ 变量像「盒子」，赋值就是再拿一个盒子装一份拷贝的数据；而 Python 变量像「标签」，赋值就是多贴几个标签在同一个盒子上。下图生动的展示了 Python 变量的意义：

![C++ 盒子模型 vs Python 标签模型](https://cdn.dwj601.cn/images/202407031133477.png)

**C++：赋值会产生拷贝**。给变量赋值时，会重新申请内存空间，把数据复制过去。

例如下面的程序。输出的内存地址不同，说明 `a` 和 `b` 是两份独立的数据。：

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> a = {1, 2, 3};
    std::vector<int> b = a;

    std::cout << &a << std::endl;  // 0x8b5a3ffa40
    std::cout << &b << std::endl;  // 0x8b5a3ffa20
    return 0;
}
```

**Python：赋值仅仅是增加引用**。所有变量其实都是「标签」，指向同一块数据。

例如下面的程序。三个变量的内存地址完全一样，说明它们指向同一份数据：

```python
a = [1, 2, 3]
b = a
c = a
print(id(a))  # 1542586187072
print(id(b))  # 1542586187072
print(id(c))  # 1542586187072
```

Python 如果确实需要拷贝变量，需要使用 [copy](./std-lib.md#copy) 标准库。

### 内存管理

CPython 主要通过引用计数回收对象：当对象的引用计数归零时，对象占用的内存会被释放。对于循环引用，解释器会配合垃圾回收器 (Garbage Collection, GC) 定期检测和清理。开发者通常不需要手动释放普通对象，但需要主动关闭文件、网络连接等外部资源。

### 全局解释器锁

CPython 有全局解释器锁 (Global Interpreter Lock, GIL)，同一解释器进程内通常只有一个线程能执行 Python 字节码。它简化了 CPython 的内存管理，但也限制了多线程在 CPU 密集任务上的并行能力。I/O 密集任务可以使用多线程或异步编程；CPU 密集任务通常更适合多进程、原生扩展或其他解释器实现。

## 工具

工欲善其事，必先利其器。好的工具可以让 Python 开发事半功倍。

### 工具安装

=== "Python Manager"

    小白推荐使用 Python [官方管理器](https://www.python.org/downloads/) 安装和管理 Python。

    安装好之后就可以使用 Python 自带的包管理工具 [pip](https://github.com/pypa/pip) 管理第三方包。pip 的特点是轻量、传统、兼容性好，但速度较慢。

    如果没有 pip，可以手动安装：

    ```bash
    python -m ensurepip --upgrade
    ```

=== "conda"

    数据科学任务推荐使用 [`conda`](https://github.com/conda/conda) 安装和管理 Python。

    conda 是 Anaconda 和 Miniconda 的包与环境管理工具，其中 Miniconda 是 Anaconda 的精简版，推荐使用 Miniconda。与 `pip` 不同的是，`conda` 不仅可以以虚拟环境的形式管理 Python 包，还能很方便地管理 Python 版本。这对于很多对 Python 版本有要求的项目来说很方便。特点：强大、跨语言、数据科学常用，但相对臃肿。

    以在 Linux 系统安装 Miniconda 为例，其他系统上的安装方法见 [Anaconda](https://www.anaconda.com/docs/getting-started/miniconda/install) 官网：

    ```bash
    # 创建安装目录（自定义）
    mkdir -p ~/software/miniconda3

    # 下载安装脚本
    wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O ~/software/miniconda3/miniconda.sh

    # 下载并安装
    bash ~/software/miniconda3/miniconda.sh -b -u -p ~/software/miniconda3

    # 删除安装脚本（可选）
    rm ~/software/miniconda3/miniconda.sh
    ```

=== "uv"

    现代工程软件开发推荐使用 [`uv`](https://github.com/astral-sh/uv) 安装和管理 Python。

    uv 是一个超高速的 Python 包与环境管理工具。它的设计目标是成为 `pip` + `venv` + `virtualenv` + `pip-tools` + `pipx` 的统一替代品，同时兼具 Rust 语言的高性能和 Python 工具的灵活性。特点：新一代工具，统一包管理与环境管理，速度极快，未来有望成为主流。

    === "macOS/Linux"

        ```bash
        curl -LsSf https://astral.sh/uv/install.sh | sh
        ```

    === "Windows"

        ```bash
        powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
        ```

### 工具更新

=== "pip"

    ```bash
    pip install --upgrade pip
    ```

=== "conda"

    ```bash
    conda update -n base conda
    ```

=== "uv"

    ```bash
    # 使用原生 shell 安装可以直接使用以下命令
    uv self update

    # 使用 pip 安装可以使用以下命令
    pip install --upgrade uv
    ```

### 工具配置

基本配置方法：

=== "pip"

    ```bash
    # 查看 pip 的配置（添加 -v 参数显示配置文件路径）
    pip config list
    
    # 设置配置
    pip config set <level>.<key> <value>
    
    # 取消配置
    pip config unset <level>.<key>
    ```

=== "conda"

    ```bash
    # 查看所有的配置文件及其配置
    conda config --show-sources
    ```

=== "uv"

    uv 没有 config 子命令一说，各种配置都被拆解为对应的子命令了，建议使用 `uv --help` 查看各种命令的用法。关于配置的查询顺序和优先级，详见 [uv | Configuration files](https://docs.astral.sh/uv/concepts/configuration-files/) 官方文档。

配置下载源：

=== "pip"

    ```bash
    # 临时换源
    pip install <package_name> -i https://pypi.tuna.tsinghua.edu.cn/simple/
    
    # 永久换源
    pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple/
    
    # 查看当前源设置
    pip config list
    
    # 恢复默认源
    pip config unset global.index-url
    ```

=== "conda"

    ```bash
    # 临时换源
    conda install <pkg> -c https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main/
    
    # 永久换源
    conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main/
    conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/free/
    conda config --set show_channel_urls yes
    
    # 查看当前源设置
    conda config --show
    
    # 恢复默认源
    conda config --remove-key channels
    ```

=== "uv"

    ```bash
    # 临时换源
    uv add requests --index https://pypi.tuna.tsinghua.edu.cn/simple/
    
    # 项目级换源
    # 编辑项目目录下的 pyproject.toml 文件
    [[tool.uv.index]]
    url = "https://pypi.tuna.tsinghua.edu.cn/simple/"
    default = true
    
    # 用户级换源
    # 根据 https://docs.astral.sh/uv/concepts/configuration-files/ 的指引找到当前系统存储的 uv.toml 并编辑
    [[index]]
    url = "https://pypi.tuna.tsinghua.edu.cn/simple/"
    default = true
    
    # 系统级换源
    # 编辑环境变量 UV_DEFAULT_INDEX=https://pypi.tuna.tsinghua.edu.cn/simple/
    ```

管理缓存：

=== "pip"

    ```bash
    # 显示缓存路径
    pip cache dir
    
    # 显示缓存信息（包括路径、大小、数量等）
    pip cache info
    
    # 清空缓存
    pip cache purge
    
    # 配置缓存路径
    pip config set global.cache-dir <path/to/cache/folder>
    ```

=== "conda"

    ```bash
    # 清空缓存
    conda clean --all
    ```

=== "uv"

    ```bash
    # 显示缓存路径
    uv cache dir
    
    # 显示缓存大小（-H 表示符合人类习惯）
    uv cache size -H
    
    # 清空缓存
    uv cache clean
    
    # 配置缓存路径
    # 在环境变量中设置 UV_CACHE_DIR
    ```

## 管理

### 解释器管理

=== "Python Manager"

    目前 Python 官方已经研发出了多版本解释器管理工具 Python Manager，直接下载即可。

=== "conda"

    可以在创建虚拟环境的时候指定 Python 解释器版本。

=== "uv"

    ```bash
    # 查询可下载的 Python 解释器版本
    uv python list
    
    # 下载指定版本的 Python
    uv python install <python_version>
    
    # 固定项目使用的 Python 版本，之后会在项目目录下生成一个 .python-version 的文本文件
    uv python pin <python_version>
    
    # 将 Python 二进制程序加入用户环境变量
    uv python update-shell
    
    # 激活虚拟环境后即可使用对应 Python 了
    uv run python --version
    ...
    
    # 删除指定版本的 Python
    uv python uninstall <python_version>
    ```

### 虚拟环境管理

不同的项目往往依赖不同的包，为了避免出现包的版本冲突，一般推荐按照项目进行包的隔离，隔离出来的环境被称作虚拟环境。所谓虚拟环境，本质上就是拷贝（或链接）一个 Python 解释器，然后将各种包安装在指定目录下，从而起到了隔离的效果。

> [!note]
>
> 虚拟环境并不代表根解释器的完全拷贝，有些项目无关的文件并不会拷贝，所以不能删除根解释器。

基本操作：

=== "pip"

    无法管理，但是可以借助 Python 自带的 `venv` 库。
    
    ```bash
    # 创建环境
    python -m venv <venv_folder_name>
    
    # 激活环境 (Windows)
    .\<venv_folder_name>\Scripts\activate
    
    # 激活环境 (Linux)
    source ./<venv_folder_name>/bin/activate
    
    # 退出环境
    deactivate
    ```

=== "conda"

    ```bash
    # 查看环境
    conda env list
    
    # 创建环境
    conda create -n <env_name> python=<python_version>
    
    # 激活 base 环境（方法一）
    source ~/software/miniconda3/bin/activate
    
    # 激活 base 环境（方法二）
    source activate base
    
    # 激活自定义的环境
    conda activate <env_name>
    
    # 退出环境
    conda deactivate
    
    # 删除环境
    conda remove -n <env_name> --all
    ```

=== "uv"

    使用 uv 初始化项目会自动生成一个虚拟环境目录：
    
    ```bash
    uv init
    ```
    
    当然也可以用下面的方法来更定制化的管理：
    
    ```bash
    # 创建环境
    uv venv <env_folder>
    
    # 激活环境
    source <env_folder>/bin/activate   # Linux / macOS
    .\<env_folder>\Scripts\activate    # Windows
    
    # 删除环境
    rm -rf <env_folder>
    ```

环境同步：

=== "pip"

    ```bash
    # 导出环境
    pip freeze > requirements.txt
    
    # 复现环境
    pip install -r requirements.txt
    ```

=== "conda"

    ```bash
    # 导出环境
    conda env export > environment.yml
    
    # 复现环境
    conda env create -f environment.yml
    ```

=== "uv"

    用 `uv add`、`uv remove` 命令管理包时，`uv` 会自动维护两个文件：
    
    - `pyproject.toml`：记录你手动添加的顶层依赖（即你显式安装的包）；
    - `uv.lock`：记录完整的锁定依赖树（所有版本、所有子依赖、哈希等）。
    
    ```bash
    # 复现环境
    uv sync
    ```

### 包管理

如果使用了 [虚拟环境](#虚拟环境管理)，请在管理包之前提前激活虚拟环境。

查看包：

=== "pip"
    
    ```bash
    # 查看已安装的包
    pip list
    
    # 查看包信息
    pip show <pkg>
    
    # 查看包文件
    pip show -f <pkg>
    ```

=== "conda"

    ```bash
    conda list
    ```

=== "uv"

    ```bash
    uv pip list
    ```

安装与卸载包：

=== "pip"
    
    ```bash
    # 安装包
    pip install [options] <pkg>
    
    # 安装包（安装指定版本）
    pip install <pkg>==<version>
    
    # 安装包（从文件中读取包列表）
    pip install -r <file_name>
    
    # 安装包（同时安装扩展）
    pip install <pkg>[<plugin>]  # 例如 pip install "imageio[ffmpeg]"
    
    # 安装包（从 Git 项目下载，可指定分支或提交）
    pip install git+https://github.com/<username>/<repo>.git[@<branch>]
    pip install git+https://github.com/<username>/<repo>.git[@<commit_id>]
    
    # 安装包（强制安装最新版，--upgrade 可简写为 -U）
    pip install --upgrade <pkg>
    
    # 安装包（强制重新安装）
    pip install --force-reinstall <pkg>
    
    # 安装包（禁用构建隔离，适用于构建过程依赖当前环境中已有包的场景）
    pip install --no-build-isolation <pkg>
    
    # 卸载包
    pip uninstall <pkg>
    ```

=== "conda"

    ```bash
    # 安装包
    conda install <pkg>
    
    # 安装包（安装指定版本，注意只有一个等号）
    conda install <pkg>=<version>
    
    # 卸载包（方法一）
    conda uninstall <pkg>
    
    # 卸载包（方法二）
    conda remove <pkg>
    ```

=== "uv"
    
    ```bash
    # 安装包
    uv add [options] <pkg>
    
    # 安装包（安装指定版本）
    uv add <pkg>==<version>
    
    # 安装包（从文件中读取包列表）
    uv add -r <filename>
    
    # 安装包（从 git 源码安装）
    # 前提是项目包含构建配置文件：setup.py 或 pyproject.toml 或 setup.cfg
    uv add git+https://github.com/thu-ml/SLA.git
    
    # 卸载包
    uv remove <pkg>
    ```
    
    对于有前置依赖的包，可以在 `pyproject.toml` 中添加以下内容，这样 uv 就会先安装前置依赖，然后再安装对应的包：
    
    ```toml hl_lines="9-10"
    [project]
    name = "project"
    version = "0.1.0"
    description = "..."
    readme = "README.md"
    requires-python = ">=3.12"
    dependencies = ["cchardet", "cython", "setuptools"]
    
    [tool.uv]
    no-build-isolation-package = ["cchardet"]
    ```

更新包：

=== "pip"

    ```bash
    # 查看可更新的包
    pip list --outdated

    # 更新指定包
    pip install --upgrade <pkg>

    # 更新指定包到指定版本
    pip install --upgrade <pkg>==<version>

    # 按文件升级依赖
    pip install --upgrade -r requirements.txt
    ```

=== "conda"

    ```bash
    # 更新当前环境中的全部包
    conda update --all

    # 更新指定包
    conda update <pkg>

    # 更新指定包到指定版本
    conda install <pkg>=<version>

    # 根据 environment.yml 同步环境
    conda env update -f environment.yml --prune
    ```

=== "uv"

    ```bash
    # 更新锁文件中的全部依赖版本
    uv lock --upgrade
    # 同步环境
    uv sync
    
    # 更新锁文件中的指定依赖版本
    uv lock --upgrade-package <pkg>[=<version>]
    # 同步环境
    uv sync
    ```

### 代码管理

环境配置好后，就开始编写代码了。但是在开始 coding 之前，需要提前做好代码的规范化配置，这有助于更高效地编写出更健壮的代码。

代码格式化：即 formatter，推荐 ruff。

代码检查：即 linter，推荐 ruff。

类型检查：即 type checker，推荐 ty。

代码测试：推荐 pytest。

代码注释：VSCode 插件推荐 autoDocstring，PyCharm 有自动 docstring 模板。

## 规范

Python 增强提案 (Python Enhancement Proposal, PEP) 是 Python 社区用来规范 Python 语言的。下面罗列一些比较常用的规则。

### PEP 503: Simple Repository API

2015 年 Python 社区提出了 [包名标准化](https://peps.python.org/pep-0503/) 制度：

- 所有单个或连续的 `- . _` 字符都会被替换为单个 `-` 字符；
- 所有字母都会被转化为小写字母。

例如 `FLASH-atTn`、`flash_attn`、`flash___attn` 等都会被解释为 `flash-attn`。
