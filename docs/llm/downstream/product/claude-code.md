---
title: Claude Code
status: todo
icon: claude-code
---

本文介绍 [Claude Code (CLI)](https://code.claude.com/docs/en/overview) 的具体使用方法。

## 安装

推荐使用 npm 安装，便于灵活调整版本，同时也能避免被阻止下载：

```bash
npm install -g @anthropic-ai/claude-code
```

## 配置

编辑 `~/.claude/settings.json`：

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
