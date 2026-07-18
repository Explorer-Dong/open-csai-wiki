---
title: Claude Code
status: todo
icon: claude-code
---

本文介绍 [Claude Code (CLI)](https://code.claude.com/docs/en/overview) 的具体使用方法。

## 安装

推荐使用 [npm](../../../develop/frontend/javascript/engineering.md#工具安装) 安装，便于灵活调整版本，同时也能避免被阻止下载：

```bash
npm install -g @anthropic-ai/claude-code@2.1.185
```

当然如果你的 IP 不在受限区域，可以直接运行官方下载脚本：

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

## 配置

### 跳过初始登录

编辑 `~/.claude.json` 文件，新增以下字段来跳过初始登录：

```json
{
    "hasCompletedOnboarding": true
}
```

### 配置个人端点

配置级别分两种：

- 用户级配置，例如整个机器都属于你，直接编辑 `~/.claude/settings.json` 即可。
- 项目级配置，例如很多人共享一台服务器，我更推荐使用项目级配置，即直接在项目根目录编辑 `.claude/settings.json`。

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "sk-xxx",
    "ANTHROPIC_BASE_URL": "https://api.example.com/",
    "ANTHROPIC_MODEL": "gpt-5.5",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "gpt-5.5",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "gemini-3.1-pro-preview",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-v4-pro",
    "CLAUDE_CODE_SUBAGENT_MODEL": "gpt-5.5",
    "DISABLE_AUTOUPDATER": "1"
  },
  "permissions": {
    "allow": [
      "Bash(npm install *)",
      "Bash(node *)",
      "Bash(npm *)",
      "Bash(git *)",
      "Bash(python -)",
      "Bash(rg *)",
      "Bash(timeout 30 bash *)",
      "Read(//tmp/**)"
    ],
    "defaultMode": "auto"
  },
  "model": "gpt-5.5",
  "effortLevel": "xhigh",
  "theme": "auto",
  "editorMode": "normal",
  "verbose": true,
  "skipAutoPermissionPrompt": true,
  "useAutoModeDuringPlan": true
}
```

## 使用

TODO
