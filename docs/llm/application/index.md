---
title: 下游应用
---

随着模型能力的演进，仅仅在网页上对话已经无法发挥出其全部实力了，需要结合一些工程策略来彻底释放 AI 的能力。目前已经演化出了以下几种工程策略：

**提示词工程 (Prompt Engineering)**。人们需要手动优化输入的提示词。例如：

- 思维链推理 (Chain of Thought, [CoT](https://arxiv.org/abs/2201.11903)) 提示词：Let's think step by step。
- 角色扮演 ([Role-Play](https://arxiv.org/abs/2305.16367)) 提示词：You are a XXX Master。

**上下文工程 (Context Engineering)**。人们希望简化上述流程，一句“帮我修一下现在的 bug”，整个系统就会把所有必要的信息聚合起来，和这句提示词一起输入模型。例如：

- 检索增强生成 (Retrieval-Augmented Generation, [RAG](https://arxiv.org/abs/2005.11401))。
- 模型上下文协议 (Model Context Protocol, [MCP](./agent/mcp.md))。

**约束工程 (Harness Engineering)**。一个 AI 系统不止需要丰富的输入，还需要稳定地运行，在长上下文场景下，模型很容易出现信息漂移、幻觉增加等负面效应。为此，自我约束、自我验证的 AI 系统范式 Harness Engineering 应运而生。例如：

- Anthropic 推出的智能体 [Claude Code](./product/claude-code.md)。
- OpenAI 推出的智能体 [Codex](https://chatgpt.com/codex)。
