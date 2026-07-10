---
title: OpenCode
status: todo
icon: opencode
---

本文介绍 [OpenCode](https://opencode.ai/) 的具体使用方法。

## 安装

推荐 npm 安装，便于灵活调整版本：

```bash
npm install -g opencode-ai
```

## 配置

根据官方文档中的 [配置方法](https://opencode.ai/docs/zh-cn/config/)，我们只需要编辑文件 `~/.config/opencode/opencode.jsonc` 并按需填写以下内容：

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "myprovider": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "your-provider",
      "options": {
        "baseURL": "https://api.example.com/v1",
        "apiKey": "sk-xxx"
      },
      "models": {
        "gpt-5.5": {
          "name": "gpt-5.5",
          "reasoning": true,
          "temperature": true,
          "tool_call": true,
          "attachment": true,
          "interleaved": true,
          "modalities": {
            "input": ["text", "image"],
            "output": ["text"]
          },
          "limit": {
            "context": 200000,
            "output": 65536
          }
        },
        "gemini-3.1-pro-preview": {
          "name": "gemini-3.1-pro-preview",
          "reasoning": true,
          "temperature": true,
          "tool_call": true,
          "attachment": true,
          "interleaved": true,
          "modalities": {
            "input": ["text", "image"],
            "output": ["text"]
          },
          "limit": {
            "context": 200000,
            "output": 65536
          }
        }
      }
    }
  },
  "attachment": {
    "image": {
      "auto_resize": true,
      "max_width": 4096,
      "max_height": 4096,
      "max_base64_bytes": 20000000
    }
  }
}
```

## 使用

TODO
