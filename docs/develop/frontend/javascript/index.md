---
title: JavaScript 导读
icon: simple/javascript
---

本文记录 [JavaScript](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript) 的基本概念。

JavaScript 是一种基于原型、多范式、动态类型的编程语言。它最早用于浏览器页面交互，现在也可以通过 [Node.js](https://nodejs.org/zh-cn) 运行在服务端、命令行工具、桌面应用和构建工具中。

## 快速开始

如果是第一次学习 JavaScript，可以按照下面的顺序阅读：

1. 先阅读 [工程实践](./engineering.md)，完成 Node.js、npm、项目结构和依赖管理配置。
2. 再阅读 [语法基础](./grammar.md)，学习数据类型、流程控制、函数、对象、类、异常、迭代器和异步语法。
3. 然后根据开发方向学习浏览器提供的 DOM、事件、网络请求等 Web API，或者 Node.js 提供的文件系统、进程和网络能力。
4. 最后结合前端框架、构建工具、测试工具和发布流程，把 JavaScript 用到实际工程中。

## 机制

JavaScript 的运行机制主要包括源码执行、对象模型、作用域、事件循环、模块加载和宿主环境等内容。

### 引擎执行

JavaScript 源码需要交给 JavaScript 引擎执行。浏览器和 Node.js 都内置了引擎，其中 Chrome 和 Node.js 使用的是 [V8](https://v8.dev/)。

现代 JavaScript 引擎通常不会只做简单的逐行解释。以 V8 为例，源码会先被解析为抽象语法树，然后生成字节码执行；运行过程中，热点代码可能会被即时 (Just In Time, JIT) 编译为机器码以提升性能。

不同宿主环境可能会选择不同 JavaScript 引擎，因此同一段 JavaScript 代码虽然遵循同一套语言标准，但底层的解析、编译、优化和运行机制可能由不同引擎实现。常见 JavaScript 引擎及其宿主环境如下：

| 引擎 | 常见宿主环境 | 特点 |
| --- | --- | --- |
| V8 | Chrome、Node.js、Deno | 生态覆盖最广，服务端和浏览器都大量使用 |
| SpiderMonkey | Firefox | JavaScript 的早期实现之一 |
| JavaScriptCore | Safari、Bun | WebKit 体系中的 JavaScript 引擎 |

### 运行环境

JavaScript 语言本身只定义语法、类型、对象、模块、异步语义等核心能力。真正运行程序时，还需要宿主环境提供额外 API。

**浏览器环境**。浏览器中的 JavaScript 主要负责页面交互。除了语言本身，浏览器还提供 DOM、事件、`fetch`、`localStorage` 等 Web API。例如：

```js
document.querySelector("button").addEventListener("click", () => {
    console.log("clicked");
});
```

**Node.js 环境**。Node.js 让 JavaScript 可以脱离浏览器运行。它提供文件系统、进程、网络等服务端能力，常用于后端服务、命令行工具和前端工程化。例如：

```js
import { readFile } from "node:fs/promises";

const content = await readFile("package.json", "utf-8");
console.log(content);
```

浏览器和 Node.js 都能运行 JavaScript，但可用 API 不完全相同，写代码时需要先确认目标运行环境。

### 变量模型

对于基础类型，JavaScript 的变量直接保存对应的值；对于对象类型，JavaScript 的变量保存的是对象引用。

基础类型的赋值不会让两个变量共享可变状态：

```js
let a = 1;
let b = a;

b += 1;

console.log(a);  // 1
console.log(b);  // 2
```

对象类型的赋值会复制引用，因此多个变量可能指向同一个对象：

```js
const a = [1, 2, 3];
const b = a;

b.push(4);

console.log(a);  // [1, 2, 3, 4]
console.log(b);  // [1, 2, 3, 4]
```

如果需要复制对象或数组，应该明确使用展开语法、`structuredClone()` 或对应库函数。

### 事件循环

JavaScript 的主线程一次只能执行一段同步代码。异步任务不会直接打断当前代码，而是由宿主环境在合适的时机把回调或后续任务放入队列，再由事件循环调度执行。

常见的异步来源包括定时器、用户事件、网络请求、文件 I/O 和 Promise。Promise 的后续逻辑通常会比普通定时器更早进入下一轮可执行阶段。例如：

```js
console.log("start");

setTimeout(() => {
    console.log("timer");
}, 0);

Promise.resolve().then(() => {
    console.log("promise");
});

console.log("end");

// start
// end
// promise
// timer
```

理解事件循环可以帮助判断异步代码的执行顺序，避免把耗时计算放在主线程上阻塞页面交互或服务响应。

### 浏览器加载

浏览器解析 HTML 时，如果遇到普通 `<script>`，通常会暂停 HTML 解析，等待脚本下载和执行完成。因此，把脚本放在 `<body>` 末尾曾经是一种常见做法，可以避免脚本阻塞页面主体内容。

现代页面更常使用 `defer`、`async` 或 `type="module"` 控制脚本加载：

```html
<script defer src="./main.js"></script>
<script async src="./analytics.js"></script>
<script type="module" src="./app.js"></script>
```

三者区别如下：

- `defer`：脚本下载不阻塞 HTML 解析，等文档解析完成后按顺序执行。
- `async`：脚本下载不阻塞 HTML 解析，下载完成后尽快执行，不保证执行顺序。
- `type="module"`：按 ES Module 加载，默认具有类似 `defer` 的行为，并支持 `import` 和 `export`。

因此，现代项目不必一律把脚本放到 `<body>` 末尾。业务脚本通常使用 `defer` 或 `type="module"`，统计脚本等相对独立的脚本才更适合使用 `async`。
