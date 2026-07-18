---
title: 智能体框架
status: todo
icon: lucide/package
---

> [!quote]
>
> Don't build from scratch — build on a framework.

## 概述

Agent 框架是封装了 Agent 核心循环（推理 → 行动 → 观察）的开发工具，帮助开发者快速构建基于 LLM 的智能应用。选择合适的框架可以显著降低开发成本，但也需要权衡框架的灵活性与学习曲线。

## 主流框架

### LangChain / LangGraph

**LangChain** 是最早也是最流行的 LLM 应用开发框架，提供了丰富的组件抽象（Prompt、LLM、Tool、Memory 等）。随着 Agent 需求的复杂化，其团队推出了 **LangGraph** 来支持基于图的状态机式 Agent 编排。

特点：

- 组件丰富，生态完善；
- LangGraph 支持循环、分支、条件等复杂流程；
- 支持持久化状态和人机交互；
- 学习曲线较陡，抽象层较多。

### LlamaIndex

专注于 RAG 和数据连接的框架，也提供了 Agent 能力。适合需要与大量数据源交互的 Agent 应用。

### OpenAI Agents SDK

OpenAI 官方推出的轻量级 Agent SDK，特点是：

- 原生支持 OpenAI 的 Tool Calling 和 Structured Output；
- 内置 Handoff 机制，支持 Agent 之间的任务移交；
- 轻量简洁，与 OpenAI API 深度集成。

### Anthropic Agent SDK

Anthropic 推出的 Agent 开发方案，核心理念是：

- 让 Claude 自主管理工具使用循环；
- 强调安全性，内置权限控制；
- 支持 MCP 协议集成。

### Vercel AI SDK

面向前端开发者的 Agent SDK，提供 TypeScript/JavaScript 生态下的 Agent 能力，与 Next.js 深度集成。

## 框架选型

| 框架 | 语言 | 适合场景 | 灵活度 |
|---|---|---|---|
| LangGraph | Python/TS | 复杂多步 Agent | ⭐⭐⭐⭐⭐ |
| LlamaIndex | Python | RAG + Agent | ⭐⭐⭐⭐ |
| OpenAI Agents SDK | Python | OpenAI 生态应用 | ⭐⭐⭐ |
| Anthropic Agent SDK | Python | Claude 生态应用 | ⭐⭐⭐ |
| Vercel AI SDK | TS | 前端 + Agent | ⭐⭐⭐ |

> [!note]
>
> 框架生态变化很快，选择时建议关注官方文档的更新频率和社区活跃度。对于简单场景，直接使用原生 API + Function Calling 往往更高效。
