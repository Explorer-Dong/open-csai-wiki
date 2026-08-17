---
title: General Agent
---

通用 Agent 在多工具、多步骤环境中完成开放式任务，需要规划、记忆和权限控制。它把一个大目标拆成可执行的步骤，在多个工具之间反复尝试，直到产出结果或触发终止条件。其理论基础可追溯到 2022 年的 ReAct——把「推理 (Reasoning) 与行动 (Acting)」交错进行，让模型边思考边调用外部工具，从而摆脱纯推理或纯检索的局限。此后 Agent 又被进一步扩展出规划、记忆、反思等模块。论文见 [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)。

## 快速开始

从边界清晰、可验证的任务开始，定义可用工具、预算、终止条件和人工升级路径。起步要点如下：

1. 缩小任务边界：先选目标明确、结果可验证的任务，避免「帮我做一件大事」这类开放式目标。边界清晰才能衡量成败，也便于设置停止条件。
2. 定义工具与预算：列出 Agent 可用的工具及各自权限，设置最大步数、时长与 token 预算，防止无限循环。预算既是成本控制，也是失控的兜底。
3. 预设终止与升级：定义何时算完成、何时算失败、何时转人工。达到步数上限或连续多次无进展时，应停止并把现状与上下文交给人工，而不是继续尝试。

在运行前先把这些约束写进配置与提示，运行中记录每一步的工具调用、输入输出与决策依据，便于事后审计与复现。规划方法可参考 [Planning](../build/agent/planning.md)，多 Agent 协作见 [Multi-Agent](../build/agent/multi-agent.md)。

ReAct 式循环的骨架如下：

```python
while steps < MAX_STEPS:
    thought, action = model.next_thought_and_action(history)
    history.append(f"思考：{thought}")
    if action is None:
        break  # 认为已完成
    result = run_tool(action.tool, action.args)  # 受权限与预算约束
    history.append(f"观察：{result}")
```

每一步的「思考、行动、观察」都进入历史，既让模型能基于反馈修正，也形成可回放的审计轨迹。

## 案例

旅行规划 Agent 只生成方案和报价比较，实际预订需用户确认；工具调用与引用来源均写入审计记录。例如用户要求规划三天的行程，Agent 先查航班、酒店与景点信息，再组合成若干方案。

Agent 调用搜索与比价工具获得候选数据，生成带来源的方案，并标出各选项的差异。涉及真实预订时，Agent 不直接下单，而是生成待确认的预订请求，由用户确认后才执行，避免替用户做花钱的决定。

整个过程中，每一步工具调用、参数、返回结果与引用来源都写入审计记录，用户可以回溯「这个报价从哪来、为什么选这个方案」。这既便于信任，也便于在出错时定位是哪一步引入了偏差。

## 相关主题

- [Planning](../build/agent/planning.md)
- [Multi-Agent](../build/agent/multi-agent.md)
