---
title: 智能体
---

智能体 (Agent) 是以大语言模型为核心推理引擎，具备自主感知、决策和行动能力的智能系统。相较于固定流程的工作流 (Workflow)，智能体具有更高的自主性，能根据任务目标自行规划和执行。

## 快速开始

从一个只读、参数明确的工具开始，让模型按“判断是否调用 -> 程序校验并执行 -> 返回观察 -> 继续决策”的闭环完成可验证任务。为循环设置最大步数、成本和终止条件；写操作由 Harness 检查权限并在高风险动作前确认。

例如天气 Agent 只需要 `get_weather(city)`：模型生成结构化参数，程序查询后返回结果，模型再组织回答。只有任务确实需要动态选择多步动作时，才逐步加入规划、记忆或多 Agent。

## 核心概念

- [ReAct 范式](./react.md)：将推理与行动交替进行的 Agent 范式。
- [工具使用](./tool-use.md)：Function Calling 等工具调用机制。
- [规划策略](./planning.md)：任务分解与执行计划的制定。
- [记忆系统](./memory.md)：短期、长期与工作记忆的设计。

## 进阶主题

- [多智能体](./multi-agent.md)：多 Agent 协作与通信机制。
- [Agent Harness](../paradigm/harness-engineering.md)：Agent 的执行循环、权限、状态恢复和观测层。
- [框架与工具](./frameworks.md)：主流 Agent 开发框架。
- [MCP 协议](./mcp.md)：Model Context Protocol 工具交互协议。

## 专题

- [面试专题](./interview.md)
