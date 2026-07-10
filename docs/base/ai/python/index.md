---
title: Python 导读
icon: material/language-python
---

本文记录 [Python](https://www.python.org/) 的基本概念。

## 快速开始

如果是第一次学习 Python，可以按照下面的顺序阅读：

1. 先阅读 [工程实践](./engineering.md)，完成解释器、虚拟环境和依赖管理配置。
2. 再阅读 [语法基础](./grammar.md)，学习数据类型、流程控制、函数、类、异常、迭代器和生成器。
3. 然后阅读 [常用标准库](./std-lib.md)，掌握路径、日志、拷贝、命令行参数等基础能力。
4. 如果对开发感兴趣，学完 Python 基础后，可以移步 [软件开发的 Python 专栏](../../../develop/backend/python/index.md) 作进一步阅读。

## 机制

Python 的运行机制主要包括源码执行、对象模型、导入机制、内存管理和并发约束等内容。

### 解释器执行

Python 是一门解释型语言。以 CPython 为例，解释器会先把 `.py` 源码编译为字节码对象 (code object)，然后由 C 逐条执行字节码指令。`.pyc` 是字节码缓存文件，用于加快后续加载。

根据场景的不同，字节码执行方式也不同，目前主流的有以下几种实现：

| 实现 | 开发语言 | 字节码执行方式 | 特点 | 典型应用场景 |
| --- | --- | --- | --- | --- |
| CPython | C | 逐条解释 | 官方标准实现，生态最全，速度中等 | 默认实现、科研计算、Web 后端等 |
| PyPy | RPython | 逐条解释，但会在运行时将热点字节码即时 (Just In Time, JIT) 编译为机器码，直接在 CPU 上执行 | 执行速度快，适合长时间运行的计算任务；但兼容性稍差 | 高性能计算、高并发等 |
| Jython | Java | 将 Python 源码直接编译成 Java 字节码，然后由 JVM（Java 虚拟机）执行 | 能与 Java 无缝集成；但性能依赖 JVM 优化，启动速度稍慢 | 需要在 Java 环境中使用 Python 脚本 |

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

例如下面的程序。三个变量的内存地址完全一样，说明它们指向同一个列表对象：

```python
a = [1, 2, 3]
b = a
c = a
print(id(a))  # 1542586187072
print(id(b))  # 1542586187072
print(id(c))  # 1542586187072
```

如果修改其中一个变量指向的可变对象，其他变量也会观察到同一份对象的变化：

```python
a = [1, 2, 3]
b = a
b.append(4)
print(a)  # [1, 2, 3, 4]
```

Python 如果确实需要拷贝变量，需要使用 [copy](./std-lib.md#copy) 标准库。

### 内存管理

CPython 主要通过引用计数回收对象：当对象的引用计数归零时，对象占用的内存会被释放。对于循环引用，解释器会配合垃圾回收器 (Garbage Collection, GC) 定期检测和清理。开发者通常不需要手动释放普通对象，但需要主动关闭文件、网络连接等外部资源。

### 全局解释器锁

CPython 有全局解释器锁 (Global Interpreter Lock, GIL)，同一解释器进程内通常只有一个线程能执行 Python 字节码。它简化了 CPython 的内存管理，但也限制了多线程在 CPU 密集任务上的并行能力。I/O 密集任务可以使用多线程或异步编程；CPU 密集任务通常更适合多进程、原生扩展或其他解释器实现。
