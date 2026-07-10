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

### 用户级配置

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

## 项目级配置

官方不支持项目级配置，可以使用以下方法实现。

在项目根目录下新建 `codex.sh` 文件：

```bash
#!/usr/bin/env bash
set -euo pipefail

export CODEX_BASE_URL=https://api.example.com/v1
export OPENAI_API_KEY=sk-xxx

codex \
  --config 'model="gpt-5.5"' \
  --config 'model_provider="custom"' \
  --config 'model_reasoning_effort="xhigh"' \
  --config 'model_providers.custom.name="custom"' \
  --config "model_providers.custom.base_url=\"$CODEX_BASE_URL\"" \
  --config 'model_providers.custom.env_key="OPENAI_API_KEY"' \
  --config 'model_providers.custom.wire_api="responses"'
```

使用 `chmod +x codex.sh` 命令赋权后使用 `./codex.sh` 命令启动即可。

## 使用

TODO
