---
title: 数据管理库
icon: lucide/database
status: todo
---

本文介绍 Python 操作各 DBMS 的 SDK。

## MySQL

MySQL 官网：<https://www.mysql.com/cn/>。

### MySQL 基本概念

MySQL 是一个关系型数据库管理系统，由瑞典 MySQL AB 公司开发，目前属于 Oracle 公司。所谓的「关系型」可以理解为「表格」的概念，一个关系型数据库由一个或数个表格组成。

### MySQL 安装

```bash
apt update && apt install mysql-server -y
```

### MySQL 管理

基本命令：

```bash
# 启动
systemctl start mysql

# 停止
systemctl stop mysql

# 重启
systemctl restart mysql

# 开机自启动
systemctl enable mysql

# 禁止开机自启动
systemctl disable mysql

# 检查服务状态
systemctl status mysql
```

### MySQL 配置

登录 MySQL：

```bash
mysql -u root -p
```

允许远程登录：

```mysql
update user set host = '%' where user = 'root';
```

重置密码：

```mysql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'password';
```

允许外网访问：编辑 `/etc/mysql/mysql.conf.d/mysqld.cnf` 文件，将 `bind-address` 字段的值改为 `0.0.0.0` 即可：

```bash
bind-address=0.0.0.0
```

刷新配置：

```mysql
FLUSH PRIVILEGES;
```

### MySQL 连接

> [!note]
>
> 在远程连接以前，有必要先在 MySQL 服务端允许远程登录。

MySQL 一般跑在服务器上，我们可以在本地客户端使用一些连接工具来操作和管理远程的 MySQL 数据库。

常见的主要有 MySQL 官方支持的 [MySQL Workbench](https://dev.mysql.com/downloads/workbench/)，以及其他的一些通用的服务器连接工具，比如 Jetbrains 的 [DataGrip](https://www.jetbrains.com/datagrip/) 等。

### MySQL Python SDK

ToDo

## Redis

Redis 官网：<https://redis.io>。

### Redis 基本概念

Redis (Remote Dictionary Server) 是一个开源的、基于内存的键值对存储系统。

核心定义：

- 存储介质：全内存操作，读写性能极高（10W+ TPS）；
- 数据模型：Key 是字符串，Value 支持多种抽象数据结构；
- 执行模型：单线程异步模型。通过 I/O 多路复用技术监听客户端连接，命令执行是原子的，避免了多线程环境下的锁竞争与上下文切换开销；

> [!note]
>
> Redis 6.0+ 引入了多线程来处理网络 I/O 读写，但核心命令执行依然保持单线程。

核心数据结构与底层实现：

| 数据类型 | 应用场景 | 底层实现 |
| :-: | --- | --- |
| String | 缓存、计数器、分布式锁 | SDS（简单动态字符串） |
| Hash | 对象存储、购物车 | ziplist（压缩列表）, hashtable |
| List | 消息队列、最新动态 | quicklist（双向链表 + 压缩列表） |
| Set | 去重、交集/并集 (共同好友) | intset, hashtable |
| ZSet | 排行榜、限流 | SkipList, ziplist |
| Stream | 消息流、持久化队列 | Radix Tree |

**高性能**。Redis 的高性能由存储介质、线程模型和网络模型共同决定的。

1. 纯内存操作：规避了磁盘 I/O 的物理限制，寻址速度极快；
2. 高效的数据结构：如跳表 $O(\log N)$ 复杂度、压缩列表（节省空间且缓存友好）；
3. I/O 多路复用：使用 `epoll` 非阻塞 I/O，单个线程即可高效处理成千上万个文件描述符。

**高并发**。在高并发场景下，Redis 常作为缓存屏障保护后端数据库，但需解决以下三大经典问题：

- 缓存穿透：查询不存在的数据。方案：布隆过滤器 (Bloom Filter)、缓存空对象；
- 缓存击穿：热点 Key 失效瞬间，大量请求直达 DB。方案：热点数据永不过期、使用分布式锁；
- 缓存雪崩：大量 Key 集中失效或 Redis 宕机。方案：过期时间加随机扰动 (Jitter)、多级缓存、哨兵/集群高可用。

> [!note]
>
> 关于其中的分布式锁：我们可以利用 `SET NX PX` 实现分布式锁，确保跨进程的互斥性。但要注意，锁必须设置过期时间防止死锁，且释放锁时需校验身份（防止误删他人的锁）。

**高可用**。为了保证服务不中断、数据不丢失，Redis 提供了完善的持久化与集群方案。

- 持久化机制。主要有 RDB、AOF 及其混合三种：
  1. RDB (Snapshotting)：二进制快照。恢复快，适合备份；但间隔期数据易丢失；
  2. AOF (Append Only File)：命令追加日志。丢数据少；但文件大、恢复慢；
  3. 混合持久化 (RDB + AOF)：Redis 4.0+ 默认开启。前端 RDB 保证速度，后端 AOF 记录增量。

- 集群方案。主要有以下三种：

  - 主从复制 (Replication)：

    - 作用：读写分离（从节点承担读压力），数据冗余；

    - 缺点：无法自动故障转移。

    - 哨兵模式 (Sentinel)：

      - 作用：监控、提醒、自动故障迁移；

      - 原理：哨兵集群通过 Quorum 机制投票选举新的 Master，并通知客户端。


  - 分片集群 (Redis Cluster)：

    - 数据分片：采用虚拟哈希槽 (Hash Slot)，共 16384 个槽；
      - 去中心化：节点间通过 Gossip 协议交换状态，支持水平扩容至上千节点；
    
      - 优势：解决单机内存上限及单点写性能瓶颈。
    

### Redis Python SDK

ToDo
