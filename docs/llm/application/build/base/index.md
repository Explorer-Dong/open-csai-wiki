---
title: 应用基础
---

模型应用的最小闭环是“组织请求 -> 调用模型 -> 校验响应 -> 执行业务逻辑”。本页以通用接口为例，介绍模型 API、Messages、结构化输出与函数调用。

## 独立专题

- [模型 API](./model-api.md)
- [Messages](./messages.md)
- [Structured Output](./structured-output.md)
- [Function Calling](./function-calling.md)

## 快速开始

```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:8000/v1", api_key="local")
response = client.chat.completions.create(
    model="demo-model",
    messages=[
        {"role": "system", "content": "回答必须简明。"},
        {"role": "user", "content": "解释什么是 KV Cache。"},
    ],
    temperature=0,
)
print(response.choices[0].message.content)
```

生产代码还需设置超时、有限重试、并发限制，并记录请求 ID、耗时和 token 用量。密钥应从环境变量或密钥管理系统读取。

## 模型 API

常见接口包括一次性生成、流式生成、Embedding 和多模态输入。OpenAI-compatible API 统一了许多服务的请求形状，但不同实现支持的参数、错误码和工具调用细节并不完全相同，迁移前必须进行兼容性测试。

请求失败可分为三类：参数或鉴权错误不应重试；限流和临时服务错误可采用指数退避；超时是否重试取决于请求是否幂等。流式接口还要处理客户端中断和不完整响应。

## Messages

Messages 通常由 `system`、`user`、`assistant` 和 `tool` 等角色组成。系统消息定义长期规则，用户消息表达当前目标，助手消息保存历史输出，工具消息携带外部执行结果。应用不应仅靠字符串拼接构造对话，而应保留角色和内容类型。

上下文窗口有限，应优先保留当前目标、关键约束和可信证据。过期对话可以摘要，工具的大段原始输出应先筛选，再送入模型。

## 结构化输出

结构化输出使用 JSON Schema 等约束响应，适合表单抽取、分类、路由和工作流参数生成。模型输出即使语法合法，也可能不满足业务语义，因此仍需校验字段范围、枚举值和跨字段关系。

```json
{
  "type": "object",
  "properties": {
    "priority": {"type": "string", "enum": ["low", "high"]},
    "summary": {"type": "string"}
  },
  "required": ["priority", "summary"],
  "additionalProperties": false
}
```

## 函数调用

函数调用让模型选择工具并生成参数，程序负责实际执行。安全边界必须由宿主程序实现：工具采用最小权限，参数经过类型和业务校验，高风险操作需要确认，执行结果应限制长度并标注来源。

```text
用户目标 -> 模型选择工具 -> 程序校验参数 -> 执行工具 -> 返回结果 -> 模型生成答复
```

函数调用不是远程代码执行协议。不要把模型生成的命令直接交给 Shell，也不要把数据库管理权限暴露给通用查询工具。更完整的 Agent 用法见 [工具使用](../agent/tool-use.md)。
