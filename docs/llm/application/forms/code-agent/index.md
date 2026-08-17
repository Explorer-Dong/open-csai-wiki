---
title: Code Agent
---

Code Agent 能阅读代码、编辑文件、运行工具并根据结果迭代完成软件任务。它把代码仓库、终端和测试工具作为可调用环境，围绕「读代码 -> 改代码 -> 跑验证 -> 看结果再改」的循环工作。这一形态的兴起与可评测性密切相关：SWE-bench（2023 年）把真实 GitHub issue 与对应补丁整理成基准，SWE-agent（2024 年）又提出 Agent-Computer Interface (ACI)，把「浏览仓库、编辑文件」设计成对模型友好的工具集，二者共同把「自动修 bug」从演示推向可量化。基准见 [SWE-bench](https://www.swebench.com/)，方法见 [SWE-agent 论文](https://arxiv.org/abs/2405.15793)。

## 快速开始

在隔离仓库和受限命令环境中启动，要求先运行测试和展示 diff；任何发布或删除操作都保留人工确认。起步要点如下：

1. 隔离与受限：在可丢弃的副本或容器中运行，命令白名单化，限制网络与文件系统写范围。Agent 一旦能执行任意命令，权限失控的风险远高于纯文本问答。
2. 强制验证闭环：要求 Agent 修改前先运行相关测试复现问题，修改后必须再次运行测试并展示 diff，不能只声称「已修复」。
3. 高风险操作人工确认：发布、推送、删除文件、修改依赖或访问密钥等动作默认拦截，由人工显式批准后才执行。

这样把 Agent 的能力约束在「能改、能测、不能上线」的范围内，既能获得自动修复的收益，又保留人工把关。运行环境与权限细节可参考 [Agent 权限与沙箱](../../security/agent-permissions-sandbox.md)。

其核心循环可写成如下伪代码：

```python
context = read_issue()
while steps < MAX_STEPS:
    action = model.next_action(context, tools)  # 可能调用 read / edit / run_test
    if action.tool == "edit":
        apply_patch(action.diff)
    elif action.tool == "run_test":
        result = run(action.command)
        context.append(result)
        if result.all_pass:
            break
    else:
        raise PermissionError("不允许的操作，转人工确认")
```

## 案例

Agent 修复单元测试失败，先阅读失败信息、修改最小文件、运行测试，再提交 diff。评测记录成功率、命令数和安全违规。例如 CI 报告某个测试失败，Agent 收到任务后先读取失败日志和对应源码，而不是凭猜测直接改。

随后 Agent 定位根因，只修改最小范围的代码，重新运行该测试确认通过，再跑相关测试集防止回归，最后把改动整理成 diff 供人审查。若中途遇到权限外的操作（如安装依赖、执行发布脚本），应停下来请求人工确认。

评测时记录任务成功率、平均命令数（是否反复无效尝试）与安全违规次数（是否尝试越权命令）。成功率衡量能力，命令数衡量效率，安全违规衡量边界控制，三者要分开看。更系统的评测方法可参考 [代码能力评测](../../../development/evaluation/coding.md)。
