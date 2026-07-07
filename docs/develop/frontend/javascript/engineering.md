---
title: 工程实践
icon: material/tools
---

本文介绍 JavaScript 项目工程化的基本方法。

## 快速开始

现代 JavaScript 工程通常使用 [Node.js](https://nodejs.org/zh-cn) 作为运行环境，并使用 npm 管理项目脚本和依赖。下面是一个最小项目流程。

### 安装 Node.js

Node.js 会同时安装 `node`、`npm` 和 `npx` 等工具。

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.5/install.sh | bash
source ~/.bashrc
```

安装并使用最新 LTS 版本的 Node.js：

```bash
nvm install --lts
nvm use --lts
nvm alias default 'lts/*'
```

### 创建项目

```bash
mkdir js-demo
cd js-demo

# 初始化 package.json
npm init -y

# 当前项目使用 ES Module
npm pkg set type=module
```

创建 `index.js`：

```js
const name = "JavaScript";

console.log(`Hello, ${name}`);
```

### 添加依赖

```bash
# 添加运行依赖
npm install dayjs

# 添加开发依赖
npm install --save-dev prettier
```

在代码中使用运行依赖：

```js
import dayjs from "dayjs";

console.log(dayjs().format("YYYY-MM-DD"));
```

### 运行和检查

```bash
# 直接运行脚本
node index.js

# 添加项目脚本
npm pkg set scripts.start="node index.js"
npm run start

# 语法检查
node --check index.js

# 执行本地依赖中的格式化检查命令
npm exec -- prettier . --check
```

> [!tip]
>
> 开发中优先使用 `npm run <script>` 或 `npm exec -- <command>` 执行项目命令，这样可以优先使用当前项目安装的工具版本。

## 工具

工欲善其事，必先利其器。好的工具可以让 JavaScript 开发更稳定。

### 工具安装

Node.js 会同时安装 `node`、`npm` 和 `npx` 等工具。

小白可以使用 [Node.js 官网](https://nodejs.org/zh-cn) 提供的安装包安装 Node.js。这种方式简单直接，但不方便在多个项目之间切换 Node.js 版本。如果后续遇到全局包权限或版本切换问题，建议改用 Node.js 版本管理工具 nvm。

不同系统使用的 nvm 工具略有区别：

=== "macOS/Linux"

    安装 nvm：

    ```bash
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.5/install.sh | bash
    ```

    安装完成后，重新打开终端，或手动加载 Shell 配置文件：

    ```bash
    source ~/.bashrc
    ```

    安装并使用最新 LTS 版本的 Node.js：

    ```bash
    nvm install --lts
    nvm use --lts
    nvm alias default 'lts/*'
    ```

    常用 nvm 命令：

    ```bash
    nvm ls                  # 查看本机已安装的 Node.js 版本
    nvm ls-remote --lts     # 查看可安装的 LTS 版本
    nvm install <version>   # 安装指定版本
    nvm use <version>       # 切换到指定版本
    nvm uninstall <version> # 卸载指定版本
    nvm current             # 查看当前正在使用的版本
    ```

=== "Windows"

    Windows 可以使用 [nvm-windows](https://github.com/coreybutler/nvm-windows/releases) 管理 Node.js 版本。

    查看可安装版本，并安装最新 LTS 版本：

    ```bash
    nvm list available
    nvm install lts
    nvm use lts
    ```

    安装并切换到指定版本：

    ```bash
    nvm install <version>
    nvm use <version>
    ```

    常用 nvm-windows 命令：

    ```bash
    nvm list                # 查看本机已安装的 Node.js 版本
    nvm list available      # 查看可安装的 Node.js 版本
    nvm install <version>   # 安装指定版本
    nvm use <version>       # 切换到指定版本
    nvm uninstall <version> # 卸载指定版本
    nvm current             # 查看当前正在使用的版本
    nvm version             # 查看 nvm-windows 版本
    ```

安装后可以检查版本：

```bash
node -v
npm -v
npx -v
```

### 工具配置

npm 的配置会按项目级、用户级、全局级等顺序合并。常用配置命令如下：

```bash
# 查看 npm 配置
npm config list

# 查看 npm 配置及来源
npm config list --json

# 设置配置
npm config set <key> <value>

# 取消配置
npm config delete <key>
```

配置下载源：

```bash
# 查看当前 registry
npm config get registry

# 临时指定 registry
npm install <package> --registry https://registry.npmjs.org/

# 永久切换到 npm 官方 registry
npm config set registry https://registry.npmjs.org/
```

如果需要频繁切换 registry，可以使用 Node Registry Manager (nrm)：

```bash
npm install --global nrm
nrm ls
nrm use npm
```

管理缓存：

```bash
# 显示缓存路径
npm config get cache

# 校验缓存
npm cache verify

# 强制清空缓存
npm cache clean --force

# 配置缓存路径
npm config set cache <path/to/cache/folder>
```

## 管理

### 运行时管理

工程项目应明确 Node.js 版本，避免因为本地运行时不同导致语法支持、依赖安装或运行行为不一致。

=== "nvm"

    可以在项目根目录添加 `.nvmrc` 文件：

    ```text
    lts/*
    ```

    进入项目后执行：

    ```bash
    nvm use
    node -v
    ```

=== "package.json"

    可以在 `package.json` 中声明支持的 Node.js 版本：

    ```json
    {
        "engines": {
            "node": ">=20"
        }
    }
    ```

`.nvmrc` 主要帮助本地切换版本，`engines` 主要向协作者、部署平台和包管理工具表达版本要求。两者可以同时使用。

### 项目依赖隔离

JavaScript 项目通常通过项目根目录下的 `node_modules` 隔离依赖。每个项目都有自己的依赖目录，因此一个项目安装或升级包时，不会直接修改另一个项目的依赖目录。

依赖隔离通常由以下文件共同完成：

| 文件或目录 | 作用 | 是否建议提交 |
| --- | --- | --- |
| `package.json` | 记录项目元数据、脚本和顶层依赖 | 是 |
| `package-lock.json` | 锁定完整依赖树 | 应用项目建议提交 |
| `node_modules/` | 存放实际安装的依赖 | 否 |
| `.npmrc` | npm 配置，可以放项目级 registry 等信息 | 视情况 |

### 依赖管理

依赖管理需要区分「顶层依赖」和「完整依赖树」。顶层依赖是项目直接声明需要的包，完整依赖树则包含这些包的子依赖及其精确版本。

查看依赖：

```bash
# 查看已安装的顶层依赖
npm list --depth=0

# 查看依赖信息
npm view <package>

# 查看过期依赖
npm outdated
```

安装与卸载依赖：

```bash
# 安装运行依赖
npm install <package>

# 安装指定版本
npm install <package>@<version>

# 安装开发依赖
npm install --save-dev <package>

# 从 package.json 和 package-lock.json 复现依赖
npm ci  # 等价于 npm clean-install

# 卸载依赖
npm uninstall <package>
```

更新依赖：

```bash
# 更新 package-lock.json 允许范围内的依赖
npm update

# 更新指定依赖
npm update <package>

# 安装指定依赖的最新版
npm install <package>@latest
```

在持续集成或部署环境中，更推荐使用 `npm ci`。它会严格按照 `package-lock.json` 安装依赖，如果锁文件和 `package.json` 不匹配会直接失败。

## 项目结构

项目结构应服务于运行、测试和发布。小脚本可以简单组织；长期维护或需要发布的项目，建议拆分源码、测试和构建产物。

### 简单脚本结构

简单脚本结构适合学习代码、小工具和一次性脚本：

```text
demo/
├── index.js
├── package.json
└── package-lock.json
```

运行方式：

```bash
node index.js
```

### src 结构

`src` 结构适合可测试、可发布的项目：

```text
demo/
├── README.md
├── package.json
├── package-lock.json
├── src/
│   ├── index.js
│   └── math.js
├── test/
│   └── math.test.js
└── dist/
    └── index.js
```

其中：

- `src/` 存放源码。
- `test/` 存放测试代码。
- `dist/` 存放构建产物。
- `package.json` 存放项目元数据、脚本、依赖和发布配置。
- `package-lock.json` 固定完整依赖树。

### package.json

`package.json` 是 JavaScript 项目的核心配置文件。一个最小示例：

```json
{
    "name": "demo",
    "version": "0.1.0",
    "type": "module",
    "scripts": {
        "start": "node src/index.js",
        "test": "node --test"
    },
    "dependencies": {
        "dayjs": "^1.11.0"
    },
    "devDependencies": {
        "prettier": "^3.0.0"
    }
}
```

常见字段如下：

| 字段 | 作用 |
| --- | --- |
| `name` | 包名。发布到 npm 时必须唯一，作用域包通常形如 `@scope/name` |
| `version` | 版本号。通常遵循语义化版本规范 |
| `type` | 模块类型。设置为 `module` 时，`.js` 默认按 ES Module 解析 |
| `scripts` | 项目脚本，例如 `dev`、`build`、`test` |
| `dependencies` | 运行时依赖 |
| `devDependencies` | 只在开发、构建、测试时需要的依赖 |
| `bin` | 命令行工具入口 |
| `exports` | 包对外暴露的模块入口 |
| `files` | 发布到 npm 时包含的文件范围 |
| `engines` | 声明支持的 Node.js 或 npm 版本 |

## 模块

### 模块与包

模块 (Module) 是一个可以被导入和导出的 JavaScript 文件。包 (Package) 则是带有 `package.json` 的项目目录，可以包含多个模块、资源文件和发布配置。

现代 JavaScript 推荐优先使用 ES Module。导出内容使用 `export`，导入内容使用 `import`。

```js title="src/math.js"
export function add(a, b) {
    return a + b;
}
```

```js title="src/index.js"
import { add } from "./math.js";

console.log(add(1, 2));
```

在 Node.js 中使用 ES Module 时，可以在 `package.json` 中设置：

```json
{
    "type": "module"
}
```

### 导入方式

JavaScript 的导入路径常见有三类。

**相对路径导入**。用于导入项目内的模块：

```js
import { add } from "./math.js";
import { readConfig } from "../config/read-config.js";
```

**包名导入**。用于导入第三方包或当前包通过 `exports` 暴露的入口：

```js
import dayjs from "dayjs";
```

**内置模块导入**。Node.js 内置模块推荐使用 `node:` 前缀，避免和第三方包重名：

```js
import { readFile } from "node:fs/promises";
```

### 导出方式

ES Module 有命名导出和默认导出两种方式。

=== "命名导出"

    ```js title="math.js"
    export function add(a, b) {
        return a + b;
    }

    export function sub(a, b) {
        return a - b;
    }
    ```

    ```js title="index.js"
    import { add, sub } from "./math.js";

    console.log(add(1, 2));
    console.log(sub(2, 1));
    ```

=== "默认导出"

    ```js title="logger.js"
    export default function log(message) {
        console.log(message);
    }
    ```

    ```js title="index.js"
    import log from "./logger.js";

    log("hello");
    ```

命名导出更适合公共工具模块，因为导入和重构时更明确；默认导出更适合一个文件只暴露一个主要对象的场景。

### CommonJS

CommonJS 是 Node.js 早期常用的模块系统，使用 `require()` 导入，使用 `module.exports` 导出。

```js title="math.cjs"
function add(a, b) {
    return a + b;
}

module.exports = { add };
```

```js title="index.cjs"
const { add } = require("./math.cjs");

console.log(add(1, 2));
```

新项目通常优先使用 ES Module。维护老项目时，需要先确认项目是 ES Module 还是 CommonJS，避免混用导致加载失败。

## 运行方式

JavaScript 主要有三种运行方式：Node.js 脚本、项目脚本和浏览器脚本。

### Node.js 脚本

直接用 `node` 运行文件：

```bash
node src/index.js
```

这种方式适合运行单个入口文件、调试脚本和验证语法。

### 项目脚本

项目中更常见的是把命令写入 `package.json` 的 `scripts` 字段：

```json
{
    "scripts": {
        "start": "node src/index.js",
        "test": "node --test",
        "format": "prettier . --write"
    }
}
```

之后通过 npm 执行：

```bash
npm run start
npm run test
npm run format
```

`npm run` 会自动把 `node_modules/.bin` 加入命令搜索路径，所以脚本中可以直接使用项目内安装的命令行工具。

### 浏览器脚本

浏览器可以通过 `<script>` 加载 JavaScript 文件：

```html
<script type="module" src="./src/index.js"></script>
```

如果使用 ES Module，浏览器中的相对导入路径通常需要写完整文件后缀：

```js
import { add } from "./math.js";
```

浏览器不能直接使用 Node.js 的内置模块，例如 `node:fs/promises`。如果代码需要同时运行在浏览器和 Node.js 中，应明确区分运行环境。

## 分发包

本地开发时，包往往被理解为带有 `package.json` 的项目目录；而在试图开发可分发包的场景，包一般会被理解为一个可被安装与导入的模块集合。

| 概念 | 视角 | 示例 |
| --- | --- | --- |
| 模块 | `import` 视角的代码组织单位 | `import { add } from "./math.js"` |
| 分发包 | 包管理工具安装和发布的产物 | `npm install dayjs` |

### 开发包

一个可发布的包通常至少需要包含：

- `package.json`：包元数据和入口配置。
- `README.md`：安装、使用和配置说明。
- `LICENSE`：开源许可证文件，如果项目需要对外授权。
- 构建产物：例如 `dist/`、`lib/` 或其他运行时入口文件。
- 类型声明：如果是 TypeScript 包，通常需要包含 `.d.ts` 文件。
- 命令行入口：如果是 CLI 包，需要包含 `bin` 字段指向的脚本。
- 运行时资源：如果包运行时依赖模板、默认配置、静态资源或示例文档，也要确认它们被包含。

如果包需要提供命令行入口，可以在 `package.json` 中声明：

```json
{
    "bin": {
        "demo": "./bin/demo.js"
    }
}
```

命令行入口文件通常需要添加 shebang：

```js title="bin/demo.js"
#!/usr/bin/env node

console.log("hello");
```

### 打包检查

正式发布前一定要检查将被打包的内容：

```bash
npm pack --dry-run
```

`npm pack --dry-run` 只展示 npm 将会打包的文件，不会真正生成 tarball。包内容会受到 `package.json` 中 `files` 字段、`.npmignore`、`.gitignore` 和 npm 默认规则影响。不要只根据仓库中有哪些文件判断发布结果。

不应该发布的内容包括本地环境文件、密钥、缓存、测试报告和无关的大体积产物。可以用 `files` 字段白名单控制发布范围：

```json
{
    "files": [
        "dist",
        "bin",
        "README.md",
        "LICENSE"
    ]
}
```

### 发布包

发布前先确认登录状态：

```bash
npm whoami
```

如果没有登录，先执行：

```bash
npm login
```

npm 包通常使用语义化版本：

- `npm version patch`：修复问题，例如 `1.0.0` 到 `1.0.1`。
- `npm version minor`：新增兼容功能，例如 `1.0.0` 到 `1.1.0`。
- `npm version major`：破坏性更新，例如 `1.0.0` 到 `2.0.0`。

`npm version` 会更新 `package.json`，如果存在锁文件也会同步更新。默认情况下，它还会创建 Git 提交和标签，并依次触发 `preversion`、`version`、`postversion` 脚本。

如果只想修改版本号文件，不希望自动创建 Git 提交和标签，可以执行：

```bash
npm version patch --no-git-tag-version
```

通用的正式发版流程如下：

1. 确认测试、构建和文档都已通过。
2. 执行 `npm pack --dry-run`，确认包内容正确。
3. 根据变更类型执行 `npm version patch`、`npm version minor` 或 `npm version major`。
4. 推送代码和版本标签。
5. 在代码托管平台创建新的 Release。
6. Release 发布后，由 CI/CD 自动执行打包检查和 `npm publish`。

如果需要本地手动发布，可以执行：

```bash
npm publish --access public
```

同一个 `name` 和 `version` 组合发布后不能再次发布。发现问题时，通常需要发布新版本；只有在 npm 规则允许的有限场景下，才考虑 `npm deprecate` 或 `npm unpublish`。

### 自动发布

发布到 npm 可以通过 GitHub Actions、GitLab CI/CD 等持续交付系统完成。npm 推荐在支持的平台使用可信发布 (trusted publishing) 或 OpenID Connect (OIDC)，这样不需要长期保存发布 token。

如果使用 GitHub Actions，工作流文件通常放在：

```text
.github/workflows/publish-npm.yml
```

一个通用的发布工作流可以在 GitHub Release 发布后触发：

```yaml
name: Publish to npm

on:
  release:
    types: [published]

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          registry-url: https://registry.npmjs.org/
      - run: npm ci
      - run: npm pack --dry-run
      - run: npm publish --access public --provenance
```

其中：

- `id-token: write` 用于 OIDC 可信发布或生成来源证明。
- `npm pack --dry-run` 用于在发布前检查包内容。
- `npm publish --access public` 用于公开发布作用域包；普通公开包通常可以省略 `--access public`。
- `--provenance` 会在支持的 CI/CD 环境中为包附加公开的构建来源证明。

如果暂时不能使用可信发布，也可以在 CI/CD 中使用 npm access token。首次使用前，需要在代码托管平台的 Secrets 配置中添加类似 `NPM_TOKEN` 的环境变量，并在项目级 `.npmrc` 中引用它：

```text
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

发布 token 应该使用最小权限、较短有效期，并且不能提交到版本控制系统。
