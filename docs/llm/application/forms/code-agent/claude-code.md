---
title: Claude Code
---

本文介绍 [Claude Code (CLI)](https://code.claude.com/docs/en/overview) 的具体使用方法。

## 快速开始

安装后在一个可丢弃的测试仓库运行 `claude`，先查看其读取、编辑和命令权限，再完成一个带测试的微小修改。使用自定义端点时先验证 Messages、工具调用、流式事件和上下文限制；共享项目不要提交用户级令牌或配置。

## 安装

推荐使用 [npm](../../../../develop/frontend/javascript/engineering.md#工具安装) 安装，便于灵活调整版本，同时也能避免被阻止下载：

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

在实际使用场景中，Claude Code CLI 的配置级别主要分「用户级」和「项目级」两种。

对于用户级配置，例如整个机器都属于你（个人 PC 或个人服务器等），直接编辑 `~/.claude/settings.json` 即可：

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
    "CLAUDE_CODE_MAX_CONTEXT_TOKENS": "262144",
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "90",
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

对于项目级配置，例如很多人共享一台服务器。需要在项目根目录编辑 `.claude/settings.json`，配置内容和上述几乎一致，唯一的区别是不要写 `ANTHROPIC_AUTH_TOKEN` 字段，因为明文存储 API 密钥是非常危险的，建议每次启动 Claude Code CLI 之前都将 `ANTHROPIC_AUTH_TOKEN` 作为环境变量输入终端。虽然麻烦了一点，但是可以确保 API 密钥绝对安全：

```bash
# 启动方法一
export ANTHROPIC_AUTH_TOKEN="sk-xxx"
claude

# 启动方法二
ANTHROPIC_AUTH_TOKEN="sk-xxx" claude
```

## 使用

进入仓库并启动 Claude Code：

```bash
cd <project>
claude
```

先让 Agent 阅读项目说明和相关代码，再提出边界明确的任务。对于修改任务，应在提示中说明允许修改的范围、需要运行的检查和验收条件。执行过程中逐项检查工具调用，完成后查看 Git 差异并独立运行测试。

项目可通过 `CLAUDE.md` 保存稳定的构建命令、目录约定和代码规范。内容应短而具体，易变的任务状态不应长期写入该文件。长会话中需要保留目标、关键决定和失败原因，减少无关历史对上下文的干扰。

第三方端点与官方模型的兼容性并无保证，尤其需要验证工具调用、长上下文、图片输入和错误重试。共享仓库中不要把令牌写入配置文件，也不要授予通用 Shell 或目录的无限制权限。完整命令以 [Claude Code 官方文档](https://code.claude.com/docs/en/overview) 为准。
