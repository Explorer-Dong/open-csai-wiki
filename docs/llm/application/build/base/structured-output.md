---
title: Structured Output
---

结构化输出要求模型生成可解析的 JSON 或受模式约束的数据。它的发展脉络是：最初只能靠提示词要求「输出 JSON」，模型仍可能加注释、加省略号或改变键名；2023 年 11 月 OpenAI 推出 JSON mode，用 `response_format: {"type": "json_object"}` 保证输出是合法 JSON，但不约束具体结构；2024 年 8 月又推出 Structured Outputs，通过约束解码 (Constrained Decoding) 在采样阶段直接屏蔽不符合 schema 的 token，从而保证输出符合给定 schema。相比自由文本，结构化输出便于下游代码直接消费，但模型仍然可能产出字段缺失、类型不符或值越界的结果——尤其在非 strict 模式下——因此解析与校验不能省略。细节见 [Structured Outputs 指南](https://platform.openai.com/docs/guides/structured-outputs) 与 [官方介绍](https://openai.com/index/introducing-structured-outputs-in-the-api/)。

## 快速开始

定义 JSON Schema，服务端二次校验并为失败设计有限重试；不能把模型输出直接当作可信参数。步骤如下：

1. 用 JSON Schema 描述目标结构：字段名、类型、是否必填、枚举取值和约束。把这份 schema 传给支持结构化输出的接口，作为约束而不是仅靠提示词要求「输出 JSON」。
2. 解析响应前先做二次校验：尝试解析 JSON，再逐字段核对 schema。接口层可能已做约束，但服务端仍需独立校验，防止模型绕过或接口实现差异导致非法值流入业务。
3. 为校验失败设计有限重试：把错误定位信息回传模型，让它修复；重试次数设上限，超过即降级，避免无限循环放大成本。

一个简单的 JSON Schema 示例如下：

```json
{
  "type": "object",
  "properties": {
    "category": { "type": "string", "enum": ["bug", "feature", "question"] },
    "due_date": { "type": "string", "format": "date" },
    "summary": { "type": "string" }
  },
  "required": ["category", "summary"]
}
```

在 OpenAI 兼容接口上启用结构化输出，需通过 `response_format` 传入 schema 并开启 `strict`：

```python
resp = client.chat.completions.create(
    model="gpt-4o-2024-08-06",
    messages=[{"role": "user", "content": "抽取工单：'登录页点了没反应，希望本周五前修好'"}],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "ticket",
            "strict": True,
            "schema": ticket_schema,
        },
    },
)
ticket = json.loads(resp.choices[0].message.content)
```

strict 模式下，模型用约束解码保证输出符合 schema，但对 schema 有一组限制：`additionalProperties` 必须为 `false`、所有字段必须列在 `required` 中、不支持 `anyOf`/`oneOf`/`$ref` 等复合构造。不满足这些限制时应关闭 strict 或改写 schema。JSON mode 与 Structured Outputs 的区别在于：前者只保证「合法 JSON」，后者保证「符合给定 schema」。

校验代码应把「缺字段、类型错、枚举越界」等错误翻译成明确提示再反馈，例如「due_date 不是合法日期，请用 YYYY-MM-DD 格式」，而不是笼统地说「格式错误」。

## 案例

抽取工单字段后用 schema 验证日期、枚举与必填项；验证失败返回修复提示，超过次数则转人工。例如从用户描述里抽取工单分类、期望完成日期和摘要，约束 `category` 只能在三个枚举值中选择。

模型第一次可能返回日期写成「下周三」这类相对表达，或漏掉必填的 `summary`。校验失败后，把具体错误回传，模型改成标准日期并补全字段，完成第二次尝试。若重试超过上限仍不合法，则把请求转给人工处理，而不是强行写入。

下面是一段最小重试循环的伪代码：

```python
for attempt in range(MAX_RETRIES):
    raw = generate(messages, response_format=fmt)
    try:
        data = json.loads(raw)
        validate(data, ticket_schema)  # 失败抛出具体错误
        break
    except ValidationError as e:
        messages.append({"role": "user", "content": f"上一条输出不合法：{e}，请修复后重试。"})
else:
    escalate_to_human()
```

该流程把「生成」与「校验」分离：模型负责生成，服务端负责把关。通过记录每次重试的错误类型与成功率，可以评估模型在结构化任务上的稳定性。结构化输出常用于给 [Function Calling](./function-calling.md) 提供可靠的参数 JSON，二者常一起出现；返回内容若用于对外展示，还需叠加 [内容安全](../../security/content-safety.md) 的过滤。

## 相关主题

- [Function Calling](./function-calling.md)
- [内容安全](../../security/content-safety.md)
