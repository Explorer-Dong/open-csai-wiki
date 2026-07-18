---
title: 异步编程库
icon: arrows-spin
status: todo
---

本文讨论如何使用 Python 进行异步编程。异步编程属于并发方案之一；如果还不清楚进程、线程和异步的选择条件，请先阅读 [并发编程库](./concurrent-lib.md) 。

## 快速开始

`asyncio` 主要用于组织 I/O 密集型并发程序。下面用 `asyncio.sleep()` 模拟三个耗时不同的 I/O 操作，并通过 `TaskGroup` 让它们并发执行：

```python
import asyncio
import time


async def load_data(name: str, delay: float) -> str:
    print(f"{name} 开始")
    await asyncio.sleep(delay)
    print(f"{name} 完成")
    return name


async def main() -> None:
    start = time.perf_counter()

    async with asyncio.TaskGroup() as task_group:
        first = task_group.create_task(load_data("a", 0.3))
        second = task_group.create_task(load_data("b", 0.2))
        third = task_group.create_task(load_data("c", 0.1))

    print([first.result(), second.result(), third.result()])
    print(f"耗时约 {time.perf_counter() - start:.1f} 秒")


asyncio.run(main())
```

一次可能的输出如下：

```text
a 开始
b 开始
c 开始
c 完成
b 完成
a 完成
['a', 'b', 'c']
耗时约 0.3 秒
```

如果依次等待三个操作，总等待时间约为 0.6 秒；并发执行时，总时间接近最慢操作的 0.3 秒。`TaskGroup` 在 Python 3.11 中加入标准库，离开 `async with` 作用域前会等待组内任务结束，并统一管理异常和取消。

## 何为异步

所谓异步，字面意思就是相异的步伐。同步调用通常需要等待当前操作完成后才能继续；异步调用则允许当前任务在等待外部事件时暂停，让其他任务继续运行。

异步程序中，任务的完成顺序可能和启动顺序不同，但这不等于没有顺序。同一个协程中的普通语句仍按控制流执行，`await`、锁和队列等机制也会建立明确的依赖关系。因此，异步的核心是操作的发起与完成可以分离，而不是无序执行代码。

## 为何异步

### 隐藏 I/O 等待

在编程中，主要有两大耗时任务，一是 CPU 计算型，二是 I/O 型。其中计算任务需要 CPU 连续执行大量指令，异步编程不能减少计算本身的工作量；I/O 任务则经常等待网络、磁盘和其他设备，这就是可以优化的地方。

程序可以把发起 I/O 的任务暂停，让执行线程继续处理其他已经就绪的任务。当 I/O 完成后，事件循环再恢复原任务。这样既不会让执行线程白白等待，也不需要为每个连接都创建一个线程。

异步不会自动提高单个 I/O 操作的速度，它优化的是等待期间的任务调度与资源使用。因此，并发量越大、单个任务等待时间占比越高，异步的收益通常越明显。

### I/O 多路复用

操作系统提供 I/O 就绪或完成通知，事件循环接收这些事件，并恢复正在等待相应结果的任务。Linux 中常用 `epoll` 监听大量文件描述符；BSD 和 macOS 常用 `kqueue`；Windows 则有 I/O 完成端口 (I/O Completion Port, IOCP) 等机制。`asyncio` 在这些平台能力之上提供统一的事件循环接口。

OS 的这些机制只需要极少的线程就可以管理大量 I/O 连接，相较于为每个连接直接创建线程，通常能减少线程栈和内核调度开销。

并非所有 I/O 库都提供可与事件循环集成的非阻塞接口。将普通阻塞函数写进 `async def` 不会让它自动变成异步调用；这类函数需要改用对应的异步库，或者通过线程与事件循环隔离。

> [!note]
>
> `asyncio` 在 Python 3.4 加入标准库，`async` 和 `await` 语法在 Python 3.5 引入，并在 Python 3.6 结束临时 API 阶段。

## 执行模型

### 事件循环

事件循环是 `asyncio` 的调度核心。它维护待运行的任务，等待 I/O、定时器等事件，并在事件就绪后继续执行对应任务。`asyncio.run()` 会创建事件循环、运行入口协程，并在退出时完成必要的清理：

```python
import asyncio


async def main() -> None:
    print("事件循环正在运行")


asyncio.run(main())
```

通常一个线程运行一个事件循环。同一事件循环中的任务采用协作式调度，不会在任意一条普通 Python 语句之间抢占；任务执行到尚未完成的可等待对象时，才会暂停并把控制权交还事件循环。

### 协程、Task 与 Future

调用使用 `async def` 定义的函数会得到协程对象，但函数体此时还没有开始执行。协程对象需要被 `await`，或者被包装成 Task 后交给事件循环调度。

Task 是对协程执行过程的封装。`asyncio.create_task()` 和 `TaskGroup.create_task()` 都会创建 Task，并安排协程在当前事件循环中运行。

Future 表示一个稍后才会得到结果的低层可等待对象。Task 继承自 Future，应用代码通常直接使用协程和 Task；编写框架或桥接回调式接口时，才更常直接操作 Future。

## 核心语法

### `async def`

协程 (Coroutine) 是一种用户态的可暂停执行单元，由事件循环负责调度，因此整个系统可以在单线程中管理大量主要处于等待状态的任务，而无需承担线程切换的内核成本。在 Python 中，协程通过 `async`、`await` 语法实现，并在等待尚未完成的可等待对象时通过 `await` 主动让出执行权，从而获得较高的 I/O 并发效率。其价值在于以接近同步的写法组织异步流程，同时保持高吞吐和较低的资源消耗。

调用协程函数只会创建协程对象：

```python
async def answer() -> int:
    return 42


coroutine = answer()
print(type(coroutine))  # <class 'coroutine'>
coroutine.close()
```

示例最后主动关闭了未执行的协程对象，以免解释器发出“协程从未被等待”的警告。正常业务代码应通过 `await` 或 Task 执行协程，而不是创建后将其丢弃。

### `await`

`await` 一个协程表示当前协程需要等待这个协程完成。它会在当前 Task 中执行被调用协程，并不等于把它注册成一个可以独立推进的并发任务。

下面两个操作会顺序执行，总耗时约为 0.4 秒：

```python
import asyncio


async def operation(name: str) -> str:
    await asyncio.sleep(0.2)
    return name


async def main() -> None:
    first = await operation("first")
    second = await operation("second")
    print(first, second)


asyncio.run(main())
```

如果两个操作之间没有依赖关系，可以先创建 Task，再统一等待。Task 一旦被创建就会被安排到事件循环，但调用方仍需要管理它的结果、异常和生命周期：

```python
import asyncio


async def operation(name: str) -> str:
    await asyncio.sleep(0.2)
    return name


async def main() -> None:
    async with asyncio.TaskGroup() as task_group:
        first = task_group.create_task(operation("first"))
        second = task_group.create_task(operation("second"))

    print(first.result(), second.result())


asyncio.run(main())
```

## 任务管理

### 结构化并发

`TaskGroup` 把相关任务限制在明确的作用域中。正常退出 `async with` 时，它会等待组内所有任务完成；如果某个任务以非取消异常失败，任务组会取消其他未完成任务，完成清理后再抛出异常组。

当任务具有共同生命周期时，优先使用 `TaskGroup`。`asyncio.gather()` 适合等待一组已经确定的可等待对象并按传入顺序收集结果，但其异常和取消语义与 `TaskGroup` 不同，不能只根据返回值形式替换。

### 后台任务

`asyncio.create_task()` 适合任务生命周期不能直接用 `TaskGroup` 表达的情况。即使不需要返回值，也应保留 Task 引用并在作用域结束前等待、取消或检查异常：

```python
import asyncio


async def heartbeat() -> None:
    try:
        while True:
            print("heartbeat")
            await asyncio.sleep(1)
    finally:
        print("heartbeat stopped")


async def main() -> None:
    task = asyncio.create_task(heartbeat())
    await asyncio.sleep(0.1)
    task.cancel()

    try:
        await task
    except asyncio.CancelledError:
        pass


asyncio.run(main())
```

不要创建 Task 后立即丢弃引用。否则任务可能在程序退出时仍未完成，任务中的异常也可能无人处理。

### 超时与取消

`asyncio.timeout()` 可以限制一段异步操作的等待时间：

```python
import asyncio


async def main() -> None:
    try:
        async with asyncio.timeout(0.1):
            await asyncio.sleep(1)
    except TimeoutError:
        print("操作超时")


asyncio.run(main())
```

取消会在协程的下一个暂停点抛出 `asyncio.CancelledError`。协程可以使用 `try/finally` 释放连接、文件和锁等资源；除非确实要完成清理后继续传播取消，否则不要吞掉 `CancelledError`。

## 异步同步原语

`asyncio` 提供的锁、事件、条件变量、信号量和队列用于协调同一事件循环中的任务，通常不是线程安全的。线程和进程之间应分别使用 `threading`、`multiprocessing` 提供的同步机制。

这些原语只能确保遵循同一同步协议的任务不出现 [并发冒险](../../../base/cs/operating-system/concurrent.md#并发冒险) 问题，不能自动保护在协议之外访问的共享状态。

`asyncio.Semaphore` 常用于限制同时访问外部服务的任务数量：

```python
import asyncio


async def request(name: str, semaphore: asyncio.Semaphore) -> None:
    async with semaphore:
        print(f"{name} 开始")
        await asyncio.sleep(0.1)
        print(f"{name} 完成")


async def main() -> None:
    semaphore = asyncio.Semaphore(2)
    async with asyncio.TaskGroup() as task_group:
        for index in range(5):
            task_group.create_task(request(str(index), semaphore))


asyncio.run(main())
```

限制并发量可以避免耗尽文件描述符、连接池或远端服务容量。`asyncio.Lock` 适合保护共享状态，`Event` 适合通知状态变化，`Queue` 适合生产者和消费者之间传递数据；应根据协调关系选择原语，而不是为所有问题都加锁。

## 接入阻塞代码

对于 I/O 型任务，兼容异步的库优先使用 `asyncio`，不兼容异步的阻塞式库可以通过线程执行。Python 3.9 起可以使用 `asyncio.to_thread()` 将阻塞函数移出事件循环线程：

```python
import asyncio
import time


def blocking_operation() -> str:
    time.sleep(1)
    return "done"


async def main() -> None:
    result = await asyncio.to_thread(blocking_operation)
    print(result)


asyncio.run(main())
```

`to_thread()` 主要用于阻塞式 I/O。它不会在默认带 GIL 的 CPython 中让纯 Python CPU 密集代码自动并行；这类任务通常应使用 [并发编程库](./concurrent-lib.md#多进程) 中介绍的进程池。需要指定自定义线程池或进程池时，可以使用事件循环的 `run_in_executor()`。

将 `time.sleep()`、同步 HTTP 请求或同步数据库查询直接放进协程，会阻塞事件循环并影响其他任务。选择库时应确认它提供真正的异步接口，而不只是函数名称带有 `async`。

## 适用场景

异步编程适合以下场景：

- 高并发网络服务；
- WebSocket、长轮询和其他长连接；
- 大量相互独立的网络请求；
- 提供异步驱动的数据库、消息队列和 HTTP 客户端；
- 需要用较少线程管理大量等待任务，并统一处理超时与取消。

以下场景通常不应直接依赖 `asyncio` 解决：

- 主要执行纯 Python 字节码的 CPU 密集计算；
- 依赖只有同步阻塞接口，并且无法通过线程隔离；
- 任务数量很少，同步代码已经足够清晰；
- 需要线程级共享状态保护或进程级故障隔离。

异步要求调用链上的库共同配合。只要其中一个关键调用长时间阻塞，整个事件循环中的其他任务都可能受到影响。并发量不高、同步生态更成熟时，多线程往往更直接；并发连接很多且依赖提供异步接口时，`asyncio` 通常能以较低资源开销获得更高吞吐。

理解这些概念后，可以继续阅读 [网络编程库](./network-lib.md) ，了解 FastAPI 如何使用同步和异步路由函数。

## 参考

- Hucci 写代码：[asyncio](https://www.bilibili.com/video/BV157mFYEEkH/) [多进程](https://www.bilibili.com/video/BV1eTy7BmEs7/) [多线程](https://www.bilibili.com/video/BV1tVsyzUEtX/)
- 码农高天：[多进程（上）](https://www.bilibili.com/video/BV11i4y1S75B/) [多进程（下）](https://www.bilibili.com/video/BV1fi4y1S7TJ/) [GIL](https://www.bilibili.com/video/BV1za411t7dR/) [asyncio（上）](https://www.bilibili.com/video/BV1oa411b7c9/) [asyncio（下）](https://www.bilibili.com/video/BV1ST4y1m7No/)
- 深入理解 Python 异步编程：[上篇](https://mp.weixin.qq.com/s/H-0pd3NcAJDbUckNi0-IEw) [中篇](https://mp.weixin.qq.com/s/cc_yM0waqSOqq8xfg1G79Q) [代码](https://github.com/denglj/aiotutorial)
- Python 官方文档：[asyncio](https://docs.python.org/zh-cn/3.14/library/asyncio.html#module-asyncio) [并发执行](https://docs.python.org/zh-cn/3.14/library/concurrency.html)
- Python 官方文档：[协程与 Task](https://docs.python.org/zh-cn/3.14/library/asyncio-task.html) [同步原语](https://docs.python.org/zh-cn/3.14/library/asyncio-sync.html) [事件循环](https://docs.python.org/zh-cn/3.14/library/asyncio-eventloop.html)
