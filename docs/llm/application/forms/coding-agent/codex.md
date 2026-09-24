---
title: Codex
---

Codex 是 OpenAI 基于 ChatGPT 模型构建的 Coding Agent。可通过 [ChatGPT desktop app](https://learn.chatgpt.com/docs/app)、[Codex CLI](https://learn.chatgpt.com/docs/codex/cli) 和 [Codex IDE extension](https://learn.chatgpt.com/docs/codex/ide) 等途径使用。

安装配置这里不再赘述，自行查阅官网即可。本文主要介绍 Codex 的使用范式。

## 连接项目

### 对于本地项目

- [ChatGPT desktop app](https://learn.chatgpt.com/docs/app)【推荐】：选择本地项目对应的目录即可开始对话工作。
- [Codex CLI](https://learn.chatgpt.com/docs/codex/cli)：在对应的目录使用对应的命令即可，偏极客风。
- [Codex IDE extension](https://learn.chatgpt.com/docs/codex/ide)：在你熟悉的 IDE 中安装 Codex 插件即可开始使用。

> [!note] 对于 Windows 用户
>
> 我更推荐在 [WSL](../../../../develop/operation/wsl2.md) 环境下使用 Codex，更加稳定和安全。
>
> 我目前尝试的最佳实践是在 WSL 启动一个 sshd 服务，然后在 ChatGPT desktop app 中通过 ssh 的方式连接。这样的好处是可以直接依赖 WSL 中的 Codex CLI 显示 WSL 中存在的所有对话。

### 对于远程项目

这里特指远程服务器中的项目。ChatGPT desktop app 在 SSH 连接远程服务器的项目时，需要远程服务器安装并登陆了 Codex CLI，考虑到有些服务器无法正常登录账号，以及往往不会只有一个人使用，最佳方案就是在本地新建一个目录，并在其中的 AGENTS.md 上写好 SSH 连接信息。AGENTS.md 示例：

```md
以下是项目记忆，除非特殊说明，否则默认基于远程服务器的指定路径进行回答。

连接方式：

Host super-gpu
    HostName xxx.xxx.xxx.xxx
    User root
    Port 2222
    IdentityFile ~/.ssh/god

工作路径：`/path/to/project`
```

之后无论是 ChatGPT desktop app、Codex CLI 还是 Codex IDE extension 都可以正常使用了，同时还不需要在服务器登录 ChatGPT 账号。原理就是让 Codex 借助本地电脑将命令传输到服务器并执行。

## 接入第三方 API

这适用于希望使用 Codex 的 Harness 但是不使用 ChatGPT 官方模型的群体。

> [!note] 接入第三方 API 的前提
>
> 需要上游模型供应商支持 [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)。

编辑 `~/.codex/config.toml` 文件：

```toml
model = "gpt-5.5"
model_provider = "custom"
model_reasoning_effort = "medium"
disable_response_storage = true

[model_providers.custom]
name = "custom"
base_url = "https://api.example.com/v1"
wire_api = "responses"
```

编辑 `~/.codex/auth.json` 文件：

```json
{
  "OPENAI_API_KEY": "sk-xxx"
}
```
