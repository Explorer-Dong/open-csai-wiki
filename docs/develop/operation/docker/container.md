---
title: 容器管理
icon: material/run
---

容器是镜像的运行实例，可额外配置数据持久化和网络映射。

## 容器的基本操作

### 运行容器

基本命令

```bash
docker run [OPTIONS] <image> [COMMAND] [ARGS]

# COMMAND 表示启动 <image> 容器后该容器内部执行的命令
# ARGS 表示容器内部的命令执行时接收的参数
```

常见用于运行容器的命令：

```bash
# 后台运行容器
docker run -d <image>

# 指定容器名称
docker run --name <容器名> <image>

# 自动重启
docker run --restart always <image>

# 容器停止后自动删除
docker run --rm <image>

# 交互式运行（-i 保持 STDIN 打开，-t 分配伪终端）
docker run -it <image>

# 交互结束后自动删除容器
docker run --rm -it <image>

# 设置容器用户名
docker run --user <user_name or UID> <image>

# 设置容器用户名和用户组名
docker run --user <user_name or UID>:<group_name or GID> <image>

# 设置环境变量
docker run -e MYSQL_ROOT_PASSWORD=<password> <image>

# 挂载目录或数据卷
docker run -v ~/.cache:/data/.cache <image>
docker run -v <db_volume>:/data <image>

# 挂载网络
docker run --network <net> <image>

# 将容器端口与宿主机端口进行映射
docker run -p [host]<host_port>:<container_port> <image>
```

> [!note] 普通用户删除 root 用户产生的数据
>
> 当我们使用 root 权限进行 Docker 容器开发时，产生的数据权限也都是 root 级别的，此时如果我们退出了容器就恢复到普通用户了，此时我们就没有权限删除容器开发时产生的文件。解决方案就是临时启动一个容器并以 root 身份进入删除对应的文件：
>
> ```bash
> docker run --rm -it \
>   --user 0:0 \
>   -v  /path/to/folder:/data \
>   ubuntu:24.04 \
>   bash
> ```

### 监控容器

打印容器列表：

```bash
# 查看正在运行的容器
docker ps

# 查看所有容器（包括已停止的）
docker ps -a

# 只查看已停止的容器
docker ps -a -f status=exited

# 显示容器大小
docker ps -s

# 只输出容器 ID
docker ps -q
```

> [!note] 停止所有运行中的容器
>
> ```bash
> docker ps -q | xargs -r docker stop
> ```
>
> 其中 `| xargs` 表示把前面命令输出的结果直接传递给后面的命令，`-r` 表示如果管道前面的命令没有输出结果，则不执行其后面的命令。

打印容器日志：

```bash
# 查看容器的日志
docker logs <container_name or container_id>

# 实时查看日志
docker logs -f <container_name or container_id>

# 查看最近 100 行日志
docker logs --tail 100 <container_name or container_id>

# 查看带时间戳的日志
docker logs -t <container_name or container_id>

# 查看指定时间后的日志
docker logs --since 2024-01-01T10:00:00 <container_name or container_id>

# 参数可叠加，例如当历史日志较多时，可以从最近的 100 条日志开始实时查看
docker logs --tail 100 -f <container_name or container_id>
```

打印容器信息：

```bash
# 查看容器详细配置
docker inspect <container_name or container_id>

# 查看特定信息（使用 --format）
docker inspect --format='{{.NetworkSettings.IPAddress}}' <container_name or container_id>

# 查看容器内进程
docker top <container_name or container_id>

# 实时监控容器的系统资源占用情况
docker stats [<container_name or container_id>]
```

### 启停容器

```bash
# 停止运行中的容器
docker stop <container_name or container_id>

# 强制停止容器
docker kill <container_name or container_id>

# 启动已停止的容器
docker start <container_name or container_id>

# 重启容器
docker restart <container_name or container_id>

# 暂停容器
docker pause <container_name or container_id>

# 恢复暂停的容器
docker unpause <container_name or container_id>
```

> [!note]
>
> 重新运行容器不需要重新添加 `docker run` 时设置的参数，因为这些配置都被持久化在对应的容器元数据中了，Linux 中容器元数据的持久化路径为 `/var/lib/docker/containers/<CONTAINER_ID>/`。

### 进入容器 

```bash
# 进入正在运行的容器（推荐方式）
docker exec -it <容器名或ID> /bin/bash

# 如果容器中没有 bash，可以使用 sh
docker exec -it <容器名或ID> /bin/sh

# 以 root 用户进入
docker exec -it -u root <容器名或ID> /bin/bash

# 执行单条命令
docker exec <容器名或ID> ls -la /app
```

### 容器与宿主机文件传输

```bash
# 从容器复制文件到宿主机
docker cp <container_name or container_id>:<容器路径> <宿主机路径>

# 从宿主机复制文件到容器
docker cp <宿主机路径> <container_name or container_id>:<容器路径>

# 示例
docker cp mycontainer:/app/log.txt ./log.txt
docker cp ./config.yaml mycontainer:/app/config.yaml
```

### 删除容器

```bash
# 删除已停止的容器
docker rm <容器名或ID>

# 强制删除运行中的容器
docker rm -f <容器名或ID>

# 删除所有已停止的容器
docker container prune
```

## 配置数据持久化

Docker 容器的文件系统是临时的，容器删除后数据会丢失，所以有必要进行数据持久化。可将容器数据持久化在数据卷 (Volume) 中，也可以持久化在本地指定路径。两者的区别主要体现在：

|   特性   |     数据卷      |      本地路径      |
| :------: | :-------------: | :----------------: |
| 管理方式 |   Docker 管理   |    用户手动管理    |
| 存储位置 | Docker 专用目录 |   任意宿主机路径   |
|   性能   |      较好       |   取决于文件系统   |
| 适用场景 |    生产环境     | 开发环境、配置文件 |
| 可移植性 |       高        |         低         |

### 挂载到数据卷

管理数据卷：

```bash
# 创建数据卷
docker volume create <volume>

# 查看所有数据卷
docker volume ls

# 查看数据卷详细信息
docker volume inspect <volume>

# 删除数据卷
docker volume rm <volume>

# 删除所有未使用的数据卷
docker volume prune
```

挂载数据卷：

```bash
# 运行容器时挂载到数据卷
docker run -v <volume>:</container/path/to/app> <image>

# 示例：MySQL 数据持久化
docker volume create mysql-data
docker run -d \
  --name mysql \
  -v mysql-data:/var/lib/mysql \
  -e MYSQL_ROOT_PASSWORD=password \
  mysql:latest
```

### 挂载到本地路径

```bash
# 运行容器时挂载到本地路径
docker run -v </host/path>:</container/path/to/app> <image>

# 只读挂载（防止容器修改宿主机文件）
docker run -v </host/path>:</container/path/to/app>:ro <image>

# 示例：挂载目录（开发环境）
docker run -d \
  --name web-dev \
  -v /home/user/project:/app \
  -p 8080:80 \
  nginx:latest

# 示例：挂载单个文件
docker run -d \
  -v /host/config.yaml:/app/config.yaml
  -p 8080:80 \
  nginx:latest
```

## 配置网络

Docker 的网络功能允许容器之间以及容器与外部进行通信。Docker 支持多种网络模式：

1. bridge（桥接网络）：默认模式，容器通过虚拟网桥连接，可访问外部网络；
2. host（主机网络）：容器直接使用宿主机网络栈，性能最好但隔离性差；
3. none（无网络）：容器没有网络连接；
4. container：与其他容器共享网络命名空间；
5. 自定义网络：用户创建的网络，支持容器名称解析。

### 查看网络

```bash
# 查看所有网络
docker network ls

# 查看网络详细信息
docker network inspect <net>
```

### 管理网络

```bash
# 创建自定义桥接网络
docker network create <net>

# 创建指定子网的网络
docker network create \
  --driver bridge \
  --subnet 172.20.0.0/16 \
  --gateway 172.20.0.1 \
  my-network

# 删除网络
docker network rm <net>

# 删除所有未使用的网络
docker network prune
```

### 容器加入网络

```bash
# 创建容器时指定网络
docker run --network <net> <image>

# 将已存在的容器连接到网络
docker network connect <net> <continer>

# 断开容器与网络的连接
docker network disconnect <net> <continer>
```

### 容器间通信

在同一自定义网络中的容器可以通过容器名相互访问：

```bash
# 创建自定义网络
docker network create app-network

# 启动数据库容器
docker run -d \
  --name mysql-db \
  --network app-network \
  -e MYSQL_ROOT_PASSWORD=password \
  mysql:latest

# 启动应用容器
docker run -d \
  --name web-app \
  --network app-network \
  -e DB_HOST=mysql-db \
  myapp:latest

# 在 web-app 容器中可以直接通过 mysql-db 访问数据库
# 例如：mysql -h mysql-db -u root -p
```

测试容器间连通性：

```bash
# 进入容器 A
docker exec -it <容器A> /bin/bash

# 通过容器名 ping 容器 B
ping <容器B>

# 或者直接执行
docker exec <容器A> ping -c 3 <容器B>
```

### 端口映射

将容器端口映射到宿主机，使外部可以访问容器服务。

基本端口映射：

```bash
docker run -d -p <宿主机端口>:<容器端口> <镜像名>
```

默认情况下容器的端口会以「通配模式」映射到宿主机，即 `0.0.0.0:<host_port>:<container_port>`，此时所有能通过 IP 连接到宿主机的设备都可以访问该端口。安全起见，建议仅以「回环模式」将容器服务映射到宿主机。如果确实需要其他设备通过 IP 访问该服务，仍然建议使用回环模式映射出容器的服务，然后通过 [Nginx](../nginx/index.md) 把宿主机上的服务反向代理到 443 端口。

```bash hl_lines="4"
# 示例
docker run -d \
  --name memos \
  -p 127.0.0.1:5230:5230 \
  -v ~/.memos:/var/opt/memos \
  neosmemo/memos:stable
```

查看端口映射：

```bash
docker port <contrainer>
```

### 使用 host 网络模式

```bash
# 容器直接使用宿主机网络
docker run -d --network host nginx:latest

# 注意：host 模式下不需要 -p 参数，容器端口直接暴露在宿主机
```

### 容器 DNS 配置

```bash
# 自定义 DNS 服务器
docker run -d \
  --dns 8.8.8.8 \
  --dns 8.8.4.4 \
  nginx:latest

# 添加 hosts 记录
docker run -d \
  --add-host myhost:192.168.1.100 \
  nginx:latest
```

## 多容器编排

一个服务往往需要多个服务进行协作，例如一个后端服务，一个数据库服务，一个 GPU 推理服务等，如果用 Docker 一个一个管理明显不够优雅，Docker Compose 就派上用场了。

Docker Compose 是用于定义和运行多容器的工具，使用 [YAML](../../others/data-serialization-format.md) 配置。正常安装 Docker 以后，默认会一起安装 Docker Compose。可以输入以下命令检查安装状态：

```bash
docker compose version
```

如果可以正常输出版本号就可以开始使用了。

### Docker Compose 常用命令

启动服务：

```bash
# 构建镜像
docker compose build

# 重启服务
docker compose restart

# 启动所有服务
docker compose up

# 启动指定服务
docker compose up <service_name_1> <service_name_2>

# 后台启动所有服务
docker compose up -d
```

停止服务：

```bash
# 停止所有服务
docker compose stop

# 停止指定服务
docker compose stop <service_name>

# 停止所有服务并删除容器（无法指定 service）
docker compose down

# 停止所有容器并删除容器、删除网络、删除数据卷（挂载到本地路径的数据不会被删除）
docker compose down -v
```

监控服务：

```bash
# 查看服务状态
docker compose ps

# 查看服务日志
docker compose logs --tail <100> -f [<service_name>]
```

### Docker Compose 示例配置

假设目前要写一个推理接口业务，只需要使用 FastAPI 暴露接口，数据库、推理服务等就没必要暴露接口，全部使用内部网络即可。示例 `docker-compose.yml` 文件如下：

```yaml
# 服务配置
services:
  web:
    container_name: fastapi-web
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/app
      REDIS_URL: redis://redis:6379/0
      INFERENCE_URL: http://inference:8080
    depends_on:
      - postgres
      - redis
      - inference
    networks:
      - app-network

  postgres:
    container_name: postgres
    image: postgres:17
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - app-network

  redis:
    container_name: redis
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    networks:
      - app-network

  inference:
    container_name: gpu-inference
    image: rocm/pytorch-training:v25.6
    devices:
      - /dev/kfd:/dev/kfd
      - /dev/dri:/dev/dri
    volumes:
      - ./models:/workspace/models
      - ./data:/workspace/data
    working_dir: /workspace
    tty: true
    shm_size: 16g
    networks:
      - app-network

# 网络配置
networks:
  app-network:
    driver: bridge

# 数据卷配置
volumes:
  postgres-data:
  redis-data:
```

Docker Compose 默认使用 `docker-compose.yml` 和 `docker-compose.yaml` 文件，也可以在运行时指定配置文件。例如：

```bash
docker compose -f </path/to/your_compose.yaml> [commands]
```
