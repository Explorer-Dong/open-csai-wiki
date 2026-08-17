---
title: OpenCode
---

本文介绍 [OpenCode](https://opencode.ai/) 的具体使用方法。

## 快速开始

安装后在测试仓库运行 `opencode`，选择一个已配置模型，先完成只读问答，再尝试可回滚的小型编辑。自定义 Provider 需要验证模型 ID、上下文、工具调用、图片输入和错误码；配置文件中不要提交真实 API Key。

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

进入目标仓库后启动 OpenCode：

```bash
cd <project>
opencode
```

启动后选择已配置的 Provider 和模型，再提交具体任务。一次可靠的代码修改通常按“理解项目 -> 定位相关文件 -> 制定修改方案 -> 编辑 -> 运行检查 -> 审查差异”的顺序进行。模型配置中的能力声明必须与上游接口一致，否则可能出现工具调用解析失败、上下文超限或附件无法处理。

团队项目应将不含密钥的项目配置纳入版本管理，个人令牌通过环境变量或密钥管理工具注入。执行命令前确认工作目录与权限，完成后使用 Git 检查是否产生无关修改。配置项和交互命令以 [OpenCode 官方文档](https://opencode.ai/docs/zh-cn/) 为准。
