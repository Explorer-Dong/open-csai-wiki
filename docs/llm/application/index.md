---
title: 模型应用
---

随着模型能力的演进，仅仅在网页上对话已经无法发挥出其全部实力了，需要结合一些工程策略来彻底释放 AI 的能力。目前已经演化出了以下几种工程策略：

## 快速开始

一个最小应用从模型 API 开始：发送 Messages，接收文本或结构化输出。随后加入 Function Calling 连接外部能力，再按任务需要引入提示词工程、上下文管理、RAG 或 Agent。最后使用任务成功率、延迟与成本评测系统，并针对提示词注入、越权调用和隐私泄露设置防护。

建议依次阅读 [应用基础](./build/base/index.md)、[提示词工程](./build/paradigm/prompt-engineering.md)、[上下文工程](./build/paradigm/context-engineering.md) 和 [检索增强生成](./build/rag/index.md)，再进入 [智能体](./build/agent/index.md) 与具体产品形态。

## 内容地图

| 主题 | 主要内容 | 已有文章 |
| :-- | :-- | :-- |
| 应用基础 | 模型 API、Messages、Structured Output 与 Function Calling | [应用基础](./build/base/index.md)、[API 服务商](./build/base/api-provider.md) |
| 提示词工程 | Zero-shot、Few-shot、CoT 与 Prompt Template | [提示词工程](./build/paradigm/prompt-engineering.md) |
| 上下文工程 | 上下文管理、压缩与选择 | [上下文工程](./build/paradigm/context-engineering.md)、[记忆系统](./build/agent/memory.md) |
| RAG | Embedding、Chunking、向量检索、混合检索、Reranker 与 Graph RAG | [检索增强生成](./build/rag/index.md) |
| Agent | ReAct、工具使用、规划、记忆、MCP、多 Agent 与 Agent Harness | [智能体](./build/agent/index.md)、[Agent Harness](./build/paradigm/harness-engineering.md) |
| 应用形态 | Chatbot、AI Search、Copilot、Coding Agent 与 General Agent | [应用形态](./forms/index.md)、[Code Agent 产品](./forms/code-agent/index.md) |
| 应用评测 | RAG、Agent、Coding Agent、任务成功率、延迟与成本 | [模型能力评测](../development/evaluation/index.md) |
| 应用安全与治理 | 幻觉、越狱、提示词注入、RAG 投毒、工具滥用、权限与沙箱、隐私、公平、内容安全、伦理与合规 | [应用安全与治理](./security/index.md) |

## 工程方法

**提示词工程 (Prompt Engineering)**。人们需要手动优化输入的提示词。例如：

- 思维链推理 (Chain of Thought, [CoT](https://arxiv.org/abs/2201.11903)) 提示词：Let's think step by step。
- 角色扮演 ([Role-Play](https://arxiv.org/abs/2305.16367)) 提示词：You are a XXX Master。

**上下文工程 (Context Engineering)**。人们希望简化上述流程，一句“帮我修一下现在的 bug”，整个系统就会把所有必要的信息聚合起来，和这句提示词一起输入模型。例如：

- 检索增强生成 (Retrieval-Augmented Generation, [RAG](https://arxiv.org/abs/2005.11401))。
- 模型上下文协议 (Model Context Protocol, [MCP](./build/agent/mcp.md))。

**约束工程 (Harness Engineering)**。一个 AI 系统不止需要丰富的输入，还需要稳定地运行，在长上下文场景下，模型很容易出现信息漂移、幻觉增加等负面效应。为此，自我约束、自我验证的 AI 系统范式 Harness Engineering 应运而生。例如：

- Anthropic 推出的智能体 [Claude Code](./forms/code-agent/claude-code.md)。
- OpenAI 推出的智能体 [Codex](https://chatgpt.com/codex)。

工程方法只是系统的一部分。上线前还需建立端到端 [模型能力评测](../development/evaluation/index.md)，并按 [应用安全与治理](./security/index.md) 实施权限、数据和审计控制。
