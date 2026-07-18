---
title: Python 后端开发导读
icon: material/language-python
---

本章介绍 Python 后端开发相关内容。Python 基础已在 [人工智能基础部分](../../../base/ai/python/index.md) 提及，此处不再赘述。

## 快速开始

建议按照以下顺序阅读：

1. [并发编程库](./concurrent-lib.md) ：理解 CPU 计算型与 I/O 型任务，并在进程、线程和异步之间进行选择。
2. [异步编程库](./async-lib.md) ：掌握事件循环、协程、Task 和异步同步原语。
3. [网络编程库](./network-lib.md) ：使用 FastAPI、Pydantic 等库开发网络服务。
4. [数据管理库](./dbms-lib.md) ：使用 Python 访问关系型数据库、缓存等数据管理系统。

## 学习建议

并发编程是异步编程的概念基础，异步编程又是理解异步 Web 框架的重要前置知识。学习具体库时，应同时关注其同步或异步接口、资源生命周期以及异常处理方式。
