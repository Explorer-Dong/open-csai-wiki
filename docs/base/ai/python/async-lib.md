---
title: 异步编程库
status: todo
icon: lucide/recycle
---

本文讨论如何使用 Python 进行异步编程，狠狠压榨偷偷摸鱼的 CPU 😡。

> [!tip]
>
> 让合适的人做该做的事。

## 何为异步

所谓异步，字面意思就是相异的步伐。代码里就是：程序的执行并非按照顺序进行（比如还没等上一段代码执行完毕，下一段代码也开始执行了）。所以和传统的同步编程相比，异步的本质就是 **无序**。

## 为何异步

存在即合理，那么异步存在的合理性是什么呢？在 Python 3.6 中，asyncio 被正式引入标准库，注意看，是 async **io**，也就是说这个异步库是用来支持 I/O 操作的，这也是异步的最大特征——优化 I/O 操作。

在编程中，主要有两大耗时任务，一是 CPU 计算型，二是 I/O 型。其中计算任务需要 CPU 连续执行大量指令，这意味着 CPU 不会空闲，那就没有优化的空间；而 I/O 任务需要 CPU 等待设备输入或输出，在等待的过程中 CPU 不会进行任何操作，这就是可以优化的地方。

我们完全可以把 CPU 因为 I/O 阻塞的时间节约下来，让 CPU 继续处理其他的任务，当等待的任务完成后，通知 CPU 一声，让它再来处理不就好了？没错，这就是 asyncio 的核心方案。那么谁能代替 CPU 进行等待，还能在任务完成的时候通知 CPU 呢？答案是操作系统。

在 OS 中，存在一个 epoll 机制，它可以接收程序等待 I/O 的任务，并且当这些任务结束后立刻通知程序，这样就不会让 CPU 白白等待。同时，OS 的这种机制只需要极少的线程就可以完成大量的 I/O 连接，相较于直接依赖编程语言的多线程技术，性能开销少了很多。

## 技术选型

理解了异步的基本原理和程序的主要时间开销来源后，我们再来聊聊代码的实现方案。

### 针对 CPU 计算型任务

由于 CPU 无法空闲，为了不让程序被阻塞，我们能做的只有让别的 CPU 核心来接管当前 CPU 正在处理的计算任务。

理论上我们可以用多进程或者多线程。但是 Python 存在全局解释器锁 (Global Interpreter Lock, GIL) 机制，使得在同一时刻只能有一个线程在执行 Python 字节码，多核都不行，所以只能用多进程。

### 针对 I/O 型任务

显然我们可以和针对 CPU 计算型任务的优化方案一样，用多进程来把任务分摊给别的 CPU 核心来完成。但 I/O 任务往往数量庞大，核心数量一般是不够的，并且多进程对于内存的开销也很大。所以怎么办？

其实可以多线程，因为线程在等待 I/O 时会释放 GIL。

当然最优方案其实是异步。不需要别人来帮忙，直接用上 OS 的 epoll 机制不就好了！不过遗憾的是，由于 epoll 机制出现较晚，很多 I/O 库没有针对 epoll 机制进行封装，所以都无法异步，只能阻塞。但理论上可以自己实现和 OS 的 epoll 交互，感兴趣的读者可以进一步探索，笔者水平有限，这里就不展开了。

> [!note]
>
> Python 3.14 正式推出了 no-GIL 版本，那么理论上上述不得不用多进程的场景就可以用多线程来完成了。

## asyncio🤨

下面讲讲 asyncio 的一些基本概念和语法机制。

### `async def`

协程 (Coroutine) 是一种用户态的可暂停执行单元，由事件循环负责调度，因此整个系统可以在单线程中管理大量任务而无需承担线程切换的内核成本。在 Python 中，协程通过 `async/await` 语法实现，并在遇到 I/O 时通过 `await` 主动让出执行权，从而获得极高的并发效率。其价值在于以接近同步的写法组织异步流程，同时保持高吞吐和低资源消耗。

### `await`

await 一个 Coroutine 是为了把这个协程注册到事件循环并等待其执行结束；而 Task 一旦被创建（create_task）就会自动被注册到事件循环，无需显示 await，除非需要获得其返回结果。

### 原语

注意：所有的原语都只是协程安全，只能确保事件循环中的任务不出现 [并发冒险](../../../base/cs/operating-system/concurrent.md#并发冒险) 问题。

## 代码示例🤨

- CPU 计算型：ProcessPoolExecutor
- I/O 型：兼容异步用 asyncio、不兼容异步用 ThreadPoolExecutor

## 参考

- Hucci 写代码：[asyncio](https://www.bilibili.com/video/BV157mFYEEkH/) [多进程](https://www.bilibili.com/video/BV1eTy7BmEs7/) [多线程](https://www.bilibili.com/video/BV1tVsyzUEtX/)
- 码农高天：[多进程（上）](https://www.bilibili.com/video/BV11i4y1S75B/) [多进程（下）](https://www.bilibili.com/video/BV1fi4y1S7TJ/) [GIL](https://www.bilibili.com/video/BV1za411t7dR/) [asyncio（上）](https://www.bilibili.com/video/BV1oa411b7c9/) [asyncio（下）](https://www.bilibili.com/video/BV1ST4y1m7No/)
- 深入理解 Python 异步编程：[上篇](https://mp.weixin.qq.com/s/H-0pd3NcAJDbUckNi0-IEw) [中篇](https://mp.weixin.qq.com/s/cc_yM0waqSOqq8xfg1G79Q) [代码](https://github.com/denglj/aiotutorial)
- Python 官方文档：[asyncio](https://docs.python.org/zh-cn/3.14/library/asyncio.html#module-asyncio) [并发执行](https://docs.python.org/zh-cn/3.14/library/concurrency.html)
