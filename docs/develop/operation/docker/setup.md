---
title: 软件配置
icon: octicons/gear-24
---

## Docker 安装

Docker 分 Docker Engine (Docker CE) 和 Docker Desktop 两种，前者为 CLI，支持 Linux 系统，后者为 GUI，支持 Windows、maxOS 和 Linux 系统。各平台的 Docker 安装方法详见 [Install Docker Engine](https://docs.docker.com/engine/install/)。

### Docker for Windows

> [!note]
>
> Windows 只能安装图形化 Docker，即 Docker Desktop，本质还是跑在 Linux 上，所以需要预先安装 WSL。

安装步骤：

1. 安装 [WSL](../wsl2.md#安装-wsl)；
2. 进入 [Docker](https://www.docker.com/) 官网，下载 Docker Desktop for Windows；
3. 运行安装程序，过程中会提示启用 WSL2 功能，确保勾选该选项。

注意事项：

- 建议为安装盘预留 50GB 以上的空间；
- 首次启动可能需要重启计算机；
- 确保 Windows 10 版本在 2004 及以上，或 Windows 11；
- 如果希望迁移 Docker 的 WSL 系统镜像，可以进入：设置 >> 资源 >> 高级，修改镜像的存储位置。

安装成功后启动 Docker Desktop 就可以使用 Docker CLI 执行所有的 Docker 命令了，当然也可以利用 Docker Desktop 进行可视化操作。

> [!note] 在 WSL 中使用 Windows 的 Docker
>
> 只需要在 Settings >> Resources >> WSL integration 中勾选对应的 Linux 发行版即可：
>
> ![在 Settings >> Resources >> WSL integration 中勾选对应的 Linux 发行版](https://cdn.dwj601.cn/images/20260408113001728.png)

### Docker for Ubuntu

```bash
# Add Docker's official GPG key
sudo apt update
sudo apt install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update

# 安装
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 验证安装

```bash
# 检查 docker
docker version

# 检查 docker compose
docker compose version

# 检查运行状态
sudo systemctl status docker
# 如果没有运行，启动 docker
sudo systemctl start docker

# 运行一个最简 docker 容器
sudo docker run hello-world
```

## Docker 配置

更多内容详见 [Docker Docs](https://docs.docker.com/) 官方文档。

### 常见配置

```json
{
  "registry-mirrors": [
    "https://docker.1panel.live",
    "https://docker.m.daocloud.io"
  ],
  "dns": ["8.8.8.8"],
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 5
}
```

其中比较重要的就是镜像源地址，最新可用的 Docker 镜像源参考这个 [民间仓库](https://github.com/dongyubin/DockerHub)。多配置几个镜像源的好处是：某些镜像源挂掉后，Docker 可以自动尝试其他镜像源，直到全部不可用，回退到官方镜像源。

### 配置方法

=== "Docker Engine"

    ```bash
    # 1. 编辑指定文件
    vim /etc/docker/daemon.json
    
    # 2. 填入上述配置
    
    # 3. 重启 Docker
    sudo systemctl daemon-reload
    sudo systemctl restart docker
    ```

=== "Docker Desktop"

    1. 打开 Docker Desktop；
    2. 点击右上角设置图标；
    3. 选择 Docker Engine；
    4. 将上述配置填入输入框；
    5. 点击 "Apply & Restart" 应用配置。

## Docker 管理

### 磁盘管理

```bash
# 清理未使用的镜像、容器、网络
docker system prune -a

# 查看磁盘使用情况
docker system df
```

### 进程管理

```bash
docker stats
```

示例输出：

![docker stats 示例输出](https://cdn.dwj601.cn/images/2026-0813-114438-c192364e.png)

### 对象管理

获取 Docker 对象（容器、镜像、数据卷、网络等）的详细信息：

```bash
docker inspect [OPTIONS] {name | id}
```
