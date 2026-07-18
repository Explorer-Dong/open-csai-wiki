---
title: 并发编程库
icon: arrows-to-circle
status: todo
---

本文介绍 Python 中常用的并发编程库，并根据任务特点选择进程、线程或异步编程。

## 快速开始

在编程中，主要有两大耗时任务，一是 CPU 计算型，二是 I/O 型。开始编写并发代码前，应先判断程序的主要时间消耗在哪里：

| 任务特点 | 优先考虑 | 典型场景 |
| --- | --- | --- |
| 主要执行纯 Python 计算 | `ProcessPoolExecutor` | 数据转换、搜索、压缩和复杂计算 |
| 主要等待阻塞式 I/O，依赖没有异步接口 | `ThreadPoolExecutor` | 文件读写、同步 HTTP 客户端和同步数据库驱动 |
| 主要等待 I/O，依赖提供异步接口且并发量较大 | `asyncio` | 网络服务、长连接和大量并发请求 |
| 主要计算由释放 GIL 的原生库完成 | 线程或库自身的并行机制 | NumPy、图像处理和科学计算 |

`concurrent.futures` 为线程池和进程池提供了统一的 `Executor` 接口。CPU 计算型任务可以从 `ProcessPoolExecutor` 开始：

```python
from concurrent.futures import ProcessPoolExecutor


def sum_squares(limit: int) -> int:
    return sum(number * number for number in range(limit))


def main() -> None:
    limits = [100_000, 200_000, 300_000]
    with ProcessPoolExecutor() as executor:
        results = list(executor.map(sum_squares, limits))
    print(results)


if __name__ == "__main__":
    main()
```

I/O 型任务如果只能调用阻塞式接口，可以从 `ThreadPoolExecutor` 开始。下面用 `time.sleep()` 模拟等待外部 I/O：

```python
import time
from concurrent.futures import ThreadPoolExecutor


def load_data(name: str) -> str:
    time.sleep(1)
    return f"{name} 加载完成"


with ThreadPoolExecutor(max_workers=3) as executor:
    results = list(executor.map(load_data, ["a", "b", "c"]))

print(results)
# ['a 加载完成', 'b 加载完成', 'c 加载完成']
```

这两个执行器的接口相似，但运行模型和适用场景不同，不能只根据代码长短选择。

## 基本概念

### 并发与并行

并发指程序在一段时间内共同推进多个任务，这些任务可以在单个 CPU 核心上交替执行。并行则要求多个任务在同一时刻由多个 CPU 核心或其他执行单元同时执行。更完整的操作系统原理见 [并发与并行](../../../base/cs/operating-system/concurrent.md#并发) 。

同步、异步描述的是任务之间如何等待和衔接，并发、并行描述的是多个任务如何推进和执行。因此，异步是组织并发流程的一种方式，但异步不等于并行，也不等于无序。

### CPU 计算型与 I/O 型

其中计算任务需要 CPU 连续执行大量指令，主要时间消耗在计算本身。异步编程通常不能缩短纯计算的耗时，这类任务需要从算法优化、原生扩展或并行计算等方向入手。

I/O 任务则经常需要等待文件、网络和数据库等外部资源。发起阻塞 I/O 的线程在等待期间不能继续执行后续代码，但程序可以让其他线程或任务继续工作，从而提高资源利用率和吞吐量。

实际程序通常同时包含计算和 I/O。选型时应先测量瓶颈，再拆分主要阶段，不能只根据函数名称判断任务类型。

## 全局解释器锁

CPython 有全局解释器锁 (Global Interpreter Lock, GIL)，同一解释器进程内通常只有一个线程能执行 Python 字节码。它简化了 CPython 的内存管理，但也限制了多线程在 CPU 密集任务上的并行能力。I/O 密集任务可以使用多线程或异步编程；CPU 密集任务通常更适合多进程、原生扩展或其他解释器实现。

理论上我们可以用多进程或者多线程。但是在默认带 GIL 的 CPython 中，如果 CPU 密集任务主要执行 Python 字节码，多线程通常不能让这些代码在多个核心上并行执行，因此常使用多进程。释放 GIL 的 C、C++、Rust 扩展和部分科学计算库则可能通过线程实现并行。

> [!note]
>
> CPython 3.13 起提供可选的自由线程 (free-threaded) 构建，允许关闭 GIL；Python 3.14 继续完善这一模式。它并非所有 Python 安装的默认模式，使用前还需要确认依赖库兼容性，并测量线程安全成本和实际性能。

## 多进程

### 适用场景

由于 CPU 无法空闲，为了不让程序被一个计算任务长期占用，可以让别的 CPU 核心来接管一部分计算任务。多进程拥有独立的解释器和地址空间，在默认 CPython 中可以绕开单进程 GIL 对 Python 字节码并行执行的限制。

多进程适合满足以下特点的任务：

- 主要时间消耗在纯 Python 计算上；
- 工作可以拆成相对独立的子任务；
- 输入和结果可以序列化；
- 单个任务足够大，收益能够覆盖进程启动与通信成本。

多进程对于内存的开销也很大，并且在进程之间传递参数和结果通常需要序列化。因此，极短小任务、频繁共享大量可变状态的任务，以及主要用于等待 I/O 的大量轻量任务通常不适合直接使用进程池。

### `ProcessPoolExecutor`

`ProcessPoolExecutor` 管理一组工作进程，并通过 `submit()` 或 `map()` 分发任务。`submit()` 会立即返回 `Future`，调用 `result()` 可以等待并获取结果；工作进程中的异常也会在获取结果时重新抛出：

```python
from concurrent.futures import ProcessPoolExecutor


def divide(value: int) -> float:
    return 100 / value


def main() -> None:
    with ProcessPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(divide, value) for value in [5, 4]]
        for future in futures:
            print(future.result())


if __name__ == "__main__":
    main()

# 20.0
# 25.0
```

进程池要执行的函数应定义在模块顶层，参数、返回值和异常需要能够被进程间通信机制传递。入口处的 `if __name__ == "__main__":` 还能避免使用 `spawn` 启动方式时，工作进程重复执行主程序。

直接控制进程、进程间队列和共享内存时，可以使用 `multiprocessing`。如果只是把一批独立计算分发到进程中，优先使用接口更统一的 `ProcessPoolExecutor`。

## 多线程

### 适用场景

I/O 任务往往数量庞大，CPU 核心数量一般是不够的，并且多进程对于内存的开销也很大。CPython 的许多阻塞 I/O 操作会在等待系统调用完成时释放 GIL，因此多个线程可以在 I/O 密集任务中交替推进。

多线程适合满足以下特点的任务：

- 使用文件、网络或数据库的阻塞式接口；
- 第三方库没有提供异步接口；
- 并发规模有限，不需要为大量长连接创建线程；
- 多个任务需要共享同一进程中的对象，同时能够正确保护共享状态。

线程共享同一进程的内存，创建和切换开销通常小于进程，但一个线程对共享对象的错误修改可能影响其他线程。线程池也不会自动消除竞态、死锁和异常处理问题。

### `ThreadPoolExecutor`

`ThreadPoolExecutor` 复用固定数量的工作线程，避免为每个任务手动创建线程。使用 `as_completed()` 可以按任务完成顺序处理结果：

```python
import time
from concurrent.futures import ThreadPoolExecutor, as_completed


def query(name: str, delay: float) -> str:
    time.sleep(delay)
    return f"{name}: ok"


tasks = [("database", 0.3), ("cache", 0.1), ("service", 0.2)]

with ThreadPoolExecutor(max_workers=3) as executor:
    futures = [executor.submit(query, name, delay) for name, delay in tasks]
    for future in as_completed(futures):
        print(future.result())

# cache: ok
# service: ok
# database: ok
```

`max_workers` 应根据外部服务容量、连接池大小和资源限制设置，而不是越大越好。使用 `with` 语句可以在退出作用域时关闭执行器并等待已提交任务完成。

## 同步与通信

多个执行单元共同访问可变状态时，可能出现 [并发冒险](../../../base/cs/operating-system/concurrent.md#并发冒险) 。同步原语只有在所有相关访问都遵循同一协议时，才能保护共享状态。

线程使用 `threading` 中的 `Lock`、`RLock`、`Semaphore`、`Condition` 和 `Event` 等原语。下面使用锁保护共享计数器：

```python
from concurrent.futures import ThreadPoolExecutor
from threading import Lock

counter = 0
lock = Lock()


def increment() -> None:
    global counter
    with lock:
        counter += 1


with ThreadPoolExecutor(max_workers=4) as executor:
    list(executor.map(lambda _: increment(), range(1_000)))

print(counter)  # 1000
```

进程之间不直接共享普通 Python 对象。需要通信时，可以使用 `multiprocessing.Queue`、`Pipe` 和共享内存；需要同步时，应使用 `multiprocessing` 提供的锁、事件和信号量。不要混用作用域不同的同步原语。

## 技术选型

理解了并发的基本原理和程序的主要时间开销来源后，可以按照以下顺序选择方案：

1. 先测量主要瓶颈是 CPU 计算还是 I/O 等待。
2. 对 CPU 计算型任务，先优化算法；需要并行执行纯 Python 字节码时，通常使用多进程。
3. 如果计算主要在会释放 GIL 的原生库中，优先使用该库提供的并行能力，或根据测量结果使用线程。
4. 对 I/O 型任务，先判断依赖是否提供真正的异步接口。
5. 依赖只有阻塞接口且并发规模有限时，使用线程池通常更直接。
6. 依赖支持异步、任务大部分时间都在等待且并发量较大时，使用异步可以用较少线程管理大量任务。

线程和异步都能改善 I/O 密集程序，但没有脱离场景的最优方案。线程适合复用同步库和渐进改造；异步适合从调用链到驱动都支持非阻塞接口的高并发程序。下一篇 [异步编程库](./async-lib.md) 将继续介绍 `asyncio` 的执行模型和基本用法。

## 参考

- Hucci 写代码：[asyncio](https://www.bilibili.com/video/BV157mFYEEkH/) [多进程](https://www.bilibili.com/video/BV1eTy7BmEs7/) [多线程](https://www.bilibili.com/video/BV1tVsyzUEtX/)
- 码农高天：[多进程（上）](https://www.bilibili.com/video/BV11i4y1S75B/) [多进程（下）](https://www.bilibili.com/video/BV1fi4y1S7TJ/) [GIL](https://www.bilibili.com/video/BV1za411t7dR/) [asyncio（上）](https://www.bilibili.com/video/BV1oa411b7c9/) [asyncio（下）](https://www.bilibili.com/video/BV1ST4y1m7No/)
- Python 官方文档：[concurrent.futures](https://docs.python.org/zh-cn/3.14/library/concurrent.futures.html) [threading](https://docs.python.org/zh-cn/3.14/library/threading.html) [multiprocessing](https://docs.python.org/zh-cn/3.14/library/multiprocessing.html)
- Python 官方文档：[自由线程 Python 使用说明](https://docs.python.org/zh-cn/3.14/howto/free-threading-python.html)
