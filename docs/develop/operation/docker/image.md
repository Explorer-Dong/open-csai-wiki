---
title: 镜像管理
icon: material/human
---

镜像包含了应用程序及其运行环境。

## 拉取镜像

从远程镜像仓库拉取镜像到本地：

```bash
# 拉取最新版本
docker pull <镜像名>

# 拉取指定版本的镜像
docker pull <镜像名>:<标签>

# 示例（著名的开源备忘录系统）
docker pull neosmemo/memos:0.25.3
```

## 查看镜像

```bash
# 查看所有本地镜像
docker images

# 查看特定镜像
docker images <镜像名>

# 显示完整镜像 ID
docker images --no-trunc

# 查看镜像的详细配置
docker inspect <镜像名或ID>

# 查看镜像的构建历史
docker history <镜像名或ID>
```

## 删除镜像

```bash
# 删除单个镜像
docker rmi <镜像 ID 或镜像名>

# 强制删除（即使有容器在使用）
docker rmi -f <镜像 ID>

# 删除所有未使用的镜像
docker image prune

# 删除所有镜像
docker rmi $(docker images -q)
```

## 自定义镜像

主要包括构建和分发两个逻辑。

### 构建镜像

首先需要在项目根目录创建 `Dockerfile` 定义镜像的构建逻辑。例如一个简单的前后端项目：

```dockerfile
# build web frontend
FROM node:24-alpine AS web
WORKDIR /proj/web
COPY web/ ./
RUN npm i
RUN npm run build

# run api backend
FROM python:3.13-alpine
WORKDIR /proj/api
ENV PYTHONUNBUFFERED=1
ENV FRONTEND_DIST=/proj/web/dist
COPY --from=web /proj/web/dist ../web/dist
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY api/ ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-dev --no-install-project --no-editable --locked
EXPOSE 5201
CMD ["uv", "run", "fastapi", "run", "app/main.py", "--port", "5201"]
```

`FROM` 表示基础镜像，`CMD` 表示容器启动后默认执行的命令，`WORKDIR` 表示命令执行路径，`COPY` 表示把内容从本地复制到容器，`RUN` 表示执行命令，`EXPOSE` 用来声明端口。

同时建议创建 `.dockerignore` 文件，排除不需要进入构建上下文的文件，以减小构建后包的体积，格式与 `.gitignore` 一致，支持正则表达式。例如：

```gitignore
.git
node_modules
__pycache__
.env
```

构建上下文就是 `docker [image] build` 命令最后指定的路径。常见的 `.` 表示当前目录，Docker 会把上下文中的文件发送给构建器，因此应避免把无关文件放入上下文中。

接下来就可以构建镜像了。基本命令格式如下：

```bash
docker [image] build -t <app>:v0.1.0 .
```

`-t` 或 `--tag` 用来设置镜像名和标签，格式通常为 `<image_name>:<tag>`。如果不指定标签，Docker 会默认使用 `latest`。一般情况下会同时分发最新版本号和 `latest` 版本号，确保用户能一直使用 `latest` 标签下载最新镜像：

```bash
docker [image] build \
    -t <app>:v0.1.0 \
    -t <app>:latest \
    .
```

### 分发镜像

如果希望别人也能下载你的镜像，可以把镜像分发到公共镜像库。分为三步：登录 Docker Hub、给镜像打上符合 Docker Hub 仓库格式的标签、推送镜像。

登录 Docker Hub：

```bash
# 默认登录 Docker Hub
docker login

# 使用指定用户名登录
docker login -u <username>
```

给标签新增用户名前缀，以匹配 Docker Hub 的仓库标签要求：

```bash
docker tag <app>:v0.1.0 <username>/<app>:v0.1.0
```

推送镜像：

```bash
# 按标签推送
docker [image] push <username>/<app>:v0.1.0

# 一次性推送所有标签
docker [image] push <username>/<app> --all-tags
```

推送完成后，可以在 Docker Hub 的仓库页面查看镜像，也可以在其他机器上拉取并运行。
