---
title: Function Calling
---

Function Calling 让模型以结构化形式声明「调用哪个工具、传什么参数」，应用负责校验并实际执行。它要解决的痛点是：模型只能生成文本，无法直接访问数据库、接口或文件系统。与其让模型把动作意图写成自然语言、再由应用靠正则或提示去猜测，不如约定一套 JSON 结构，让模型输出可被程序直接消费的动作意图。OpenAI 于 2023 年 6 月随 GPT-3.5/GPT-4 首次推出该能力，随后在 2023 年 DevDay 用更通用的 `tools`/`tool_calls` 取代早期的 `functions`/`function_call`，并加入并行调用与 strict 模式。演进过程中边界始终不变：模型只输出调用意图，不接触工具实现或副作用，因此「谁来执行、执行前做什么校验」由应用决定。机制细节见 [OpenAI 函数调用指南](https://platform.openai.com/docs/guides/function-calling)。

## 快速开始

为每个工具定义 schema、权限、超时和副作用说明；服务端验证参数后再调用。具体步骤如下：

1. 为每个工具声明名称、描述和参数 JSON Schema。描述要写清工具做什么、何时该用、参数含义与约束，模型主要依据描述做选择，描述含糊会显著降低选择准确率。
2. 明确工具的执行属性：是否只读、有无副作用、超时上限、调用方是否需要额外权限。这些属性既用于服务端拦截，也用于提示模型避开高风险调用。
3. 服务端在真正调用前重新校验参数：类型、取值范围、必填项、与当前用户权限的匹配。不要相信模型输出的参数一定合法，也不要把模型输出直接当作可信输入。

以下是一个查询订单工具的最小定义示例：

```json
{
  "name": "get_order",
  "description": "按订单号查询当前用户订单详情，只读操作。",
  "parameters": {
    "type": "object",
    "properties": {
      "order_id": { "type": "string", "description": "订单号" }
    },
    "required": ["order_id"]
  }
}
```

模型随后以结构化形式返回调用请求，例如 `get_order` 与参数 `{"order_id": "123"}`。在 OpenAI 兼容接口中，这个调用请求不是普通文本，而是 assistant 消息里的一条 `tool_calls` 字段：

```json
{
  "role": "assistant",
  "content": null,
  "tool_calls": [
    {
      "id": "call_abc123",
      "type": "function",
      "function": { "name": "get_order", "arguments": "{\"order_id\": \"123\"}" }
    }
  ]
}
```

有两点需要特别注意：`arguments` 是 JSON 字符串而非对象，应用要先做 `JSON.parse` 才能取值；应用执行完工具后，必须为每个 `tool_call_id` 回一条 `tool` 角色消息，再把这条 assistant 消息与对应的 tool 消息一起重新发给模型，否则会因「缺少对应 tool 消息」报错。

```json
{
  "role": "tool",
  "tool_call_id": "call_abc123",
  "content": "{\"order_id\": \"123\", \"status\": \"shipped\", \"total\": 199.0}"
}
```

当一次请求可能涉及多个相互独立的工具时，模型可以在一条回复里并行返回多条 `tool_calls`，由应用决定串行还是并行执行，也可用 `parallel_tool_calls: false` 关闭。若希望参数被强制约束在 schema 内，可开启 strict 模式，但要求 `additionalProperties: false` 且所有参数必填。

## 案例

模型请求查询订单，系统校验当前用户对订单的权限再执行，而不因模型输出了 ID 就放行。例如客服场景中，用户说「查一下我 123 号订单」，模型选择 `get_order` 并输出参数 `{"order_id": "123"}`。

应用收到调用请求后不应直接执行，而应先做两层校验：订单号格式是否合法，以及当前登录用户是否拥有该订单。权限校验失败时，可以拒绝调用并向模型返回「无权访问」，由模型向用户解释，而不是返回订单内容。

执行完成后，应用把结果结构化为 tool 消息回传，并记录「谁在何时调用了哪个工具、参数和结果」的审计日志。这样既能防止 [工具滥用](../../security/tool-abuse.md)，也便于事后排查。整体上，模型只负责「选择」，执行与授权始终由应用掌控，这也是 [Tool Use](../agent/tool-use.md) 的基本边界。

## 相关主题

- [Tool Use](../agent/tool-use.md)
- [工具滥用](../../security/tool-abuse.md)
