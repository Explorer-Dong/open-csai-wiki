---
title: Codex
---

本文介绍 [Codex (CLI)](https://developers.openai.com/codex/cli) 的具体使用方法。

## 快速开始

安装后在一个可丢弃的测试仓库运行 `codex`，先核对沙箱、审批和工作目录，再要求它完成一个带测试的小修改。配置自定义端点时先验证 Responses API、工具调用和流式事件是否兼容，并将 API Key 保存在用户级凭据文件或环境变量中。

## 安装

推荐使用 npm 安装，便于更新版本：

```bash
npm install -g @openai/codex
```

需要固定旧版行为时可以显式指定版本。原文使用的历史示例为：

```bash
npm install -g @openai/codex@0.142.5
```

固定版本便于复现，但不会自动获得安全修复和新功能；应在回归测试后主动升级。

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

进入目标仓库后启动交互会话：

```bash
cd <project>
codex
```

第一次启动时按提示登录。任务描述应包含目标、范围和验收方式，例如“修复用户列表的分页错误，只修改后端代码，并运行相关测试”。Codex 会读取仓库、提出或执行修改并运行本地工具；用户应检查命令、差异和测试结果，再决定是否提交。

常用工作流如下：

- 使用 `codex resume` 恢复近期会话；
- 使用 `codex exec "<task>"` 执行非交互任务，适合脚本和持续集成环境；
- 在交互会话中使用 `/permissions` 检查沙箱和授权边界；
- 在项目中编写 `AGENTS.md`，提供构建命令、代码规范和验证要求；
- 任务开始前检查 `git status`，结束后检查差异和测试，不要让 Agent 覆盖已有改动。

自动化场景应提供明确的工作目录、超时和失败条件，不应通过关闭沙箱或跳过审批来处理权限问题。命令和功能可能随版本变化，具体以 [Codex CLI 官方文档](https://learn.chatgpt.com/docs/codex/cli) 为准。
