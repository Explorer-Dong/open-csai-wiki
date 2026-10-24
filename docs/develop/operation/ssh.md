---
title: ssh
icon: lucide/key-round
---

一旦开发场景涉及到更多的主机，必然需要加密连接，这里简单介绍加密连接的基本概念和常见配置。

## 基本概念

诞生背景。在计算机网络应用层中，我们介绍了安全外壳协议 [SSH](../../base/cs/computer-network/application-layer.md#ssh-协议)。基于该协议，工程师开发了加密传输程序 [ssh](https://www.openssh.org/manual.html) 作为客户端和服务端之间的加密连接工具。

鉴权方式。ssh 支持「密码」和「密钥」两种连接鉴权方式。其中密码鉴权不怎么安全，所以大多数场景下我们会选择密钥鉴权，不过密钥鉴权也可以设置额外的密码，一般被称为 Passphrase。

## 快速开始

考虑到密钥连接鉴权的场景更多，这里我们重点介绍密钥连接的方式。

> [!tip]
>
> 密钥对即一个公钥和一个私钥，可以类别为，公钥就是锁，私钥就是钥匙，远程服务器就是一座房子。我们拥有这座房子，就可以用公钥上锁，之后随时使用私钥进入。

### 第一步：客户端生成密钥对

```bash
ssh-keygen ~/.ssh/<key_file_name>
# 之后设置 Passphrase，这一步是可选的，直接回车表示不设置
# 之后需要重复一次 Passphrase，同理，直接回车表示不设置
```

![生成默认配置且不带 Passphrase 的密钥对](https://cdn.dwj601.cn/images/202404071758590.png)

之后 `~/.ssh` 文件夹下应当会出现一个 `<key_file_name>` 私钥文本文件和一个 `<key_file_name>.pub` 公钥文本文件。其中公钥文件的数据组成为：

```text
<your_public_key> <user_name>@<computer_name>
```

### 第二步：将公钥上传至服务端

在服务器新建文本文件：

```bash
touch ~/.ssh/authorized_keys
```

将公钥 `<key_file_name>.pub` 中的内容复制进去并保存：

> [!note]
>
> `authorized_keys` 可以存放多个公钥，以供多人连接使用。公钥末尾的 `<user_name>@<computer_name>` 可自定义。

修改文件和文件夹的权限与属主：

```bash
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chown -R <user_name>:<group_name> ~/.ssh
```

### 第三步：客户端测试 ssh 连接

```bash
ssh -i </path/to/private_key> -p <port> <user_name>@<ip_address>
# -i 表示指定私钥路径
# -p 表示指定服务器的 SSH 协议端口，默认 22
```

## 常见配置

ssh 有客户端和服务端两处配置：

- 客户端配置在 `~/.ssh/config` 文本文件中（Linux 也可以全局配置在 `/etc/ssh/sshd_config` 文本文件中）。
- 服务端 (daemon) 配置在 `/etc/ssh/sshd_config` 文本文件中。

### ssh config

连接时显式指定 IP、端口、私钥地址等信息是很麻烦的，需要记住很多东西，为了简化连接，我们可以把这些信息写到一处并取一个别名来表示。例如：

```bash
Host MyServer                          # 远程名称（自定义）
    HostName xxx.xxx.xxx.xxx           # 远程服务器的域名或 IP
    Port 7788                          # 连接端口（默认 22，修改方法见下方 sshd config）
    User root                          # 登录用户名
    ServerAliveInterval 30             # 每 30 秒向服务器发送一次 SSH 保活请求（默认 0）
    ServerAliveCountMax 6              # 连续 6 次未收到响应才主动断开（默认 3）
    IdentityFile ~/.ssh/<private_key>  # 本地私钥路径
```

之后只需输入 `ssh MyServer` 即可 ssh 连接。

### sshd config

`/etc/ssh/sshd_config` 可以用来配置服务端的 ssh 逻辑，例如：

```bash
# 禁用密码登录
PasswordAuthentication no

# 指定 SSH 端口（默认 22）
Port 7788
```

修改配置后需要重启服务端的 ssh 守护进程：

```bash
systemctl daemon-reload
systemctl restart ssh.socket
```

## FAQ

### private key are too open

如果你的私钥不是通过 `ssh-gen` 工具生成的，请确保私钥文件的权限为 400 或 600，否则 ssh 会因为私钥权限过高而主动忽略它，警告如下：

```bash
Permissions 0644 for '<your_private_key>' are too open,
It is required that your private key files are not accessible by others.
This private key will be ignored,
load key "<your_private_key>": bad permisions
Permission denied (publickey)
```

解决方案是调整私钥的权限：

=== "Linux"

    ```bash
    chmod 600 </path/to/your_private_key>
    ```

=== "Windows"

    ```powershell
    # 变量定义你的私钥路径
    $path = "C:\Users\<username>\.ssh\<private_key>"

    # 将所有者改为当前用户
    icacls $path /setowner $env:username

    # 禁用继承并删除其他所有人的权限
    icacls $path /inheritance:r

    # 仅赋予当前用户完全控制权限
    icacls $path /grant "${env:username}:(F)"
    ```

> [!note]
>
> 该方案对 ssh config 文件同样奏效。
