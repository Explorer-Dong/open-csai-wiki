---
title: Codex
status: todo
icon: codex
---

本文介绍 [Codex (CLI)](https://developers.openai.com/codex/cli) 的具体使用方法。

## 安装

推荐使用 npm 安装，便于灵活调整版本：

```bash
npm install -g @openai/codex@0.142.5
```

如果 IP 没问题，也可以直接运行官方下载脚本：

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

## 配置

> [!note]
>
> 需要上游支持 [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses)。

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

## 使用

TODO
