---
title: OpenAI-compatible API
---

OpenAI 兼容 API 用相近的请求和响应结构降低客户端迁移成本，但具体能力仍以服务实现为准。「兼容」不等于「完全一致」：请求路径、字段名和错误格式相似，可以让现有 OpenAI SDK 以较小改动接入，但参数支持范围、流式事件细节和限额语义都需要逐一确认。

## 快速开始

先固定三个关键变量：base URL、模型名和 API 版本。不同的兼容服务对 `/v1/chat/completions` 等路径的挂载位置、模型命名规则和版本前缀可能不同，先锁定这三项才能保证后续验证有意义。

用一个最小聊天请求验证端到端链路：带上 `messages`、`model` 和认证头，确认能返回 `choices`。非流式请求的最小形式如下，字段语义以 [OpenAI Chat Completions API 参考](https://platform.openai.com/docs/api-reference/chat/create) 为准：

```bash
curl https://api.example.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "model": "my-model",
    "messages": [{"role": "user", "content": "你好"}]
  }'
```

成功时返回以 `choices` 为主体的 JSON，关键字段是 `choices[].message.content`、`finish_reason` 与 `usage`：

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "model": "my-model",
  "choices": [
    {
      "index": 0,
      "message": {"role": "assistant", "content": "你好"},
      "finish_reason": "stop"
    }
  ],
  "usage": {"prompt_tokens": 9, "completion_tokens": 2, "total_tokens": 11}
}
```

再验证流式：开启 `stream: true`，确认事件按 `data:` 分块返回且以结束标记收尾，客户端能正确解析增量 token。流式响应基于 Server-Sent Events (SSE)，每个事件是一行 `data: {json}`，增量内容放在 `choices[].delta`，最后以 `data: [DONE]` 结束，规范见 [OpenAI 流式事件参考](https://developers.openai.com/api/reference/resources/chat/subresources/completions/streaming-events)：

```
data: {"id":"chatcmpl-123","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","choices":[{"index":0,"delta":{"content":"你"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","choices":[{"index":0,"delta":{"content":"好"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

最后验证错误语义：故意传不存在的模型、无效的认证、超限的请求，确认返回的错误码与错误结构可被机器处理，而不是只有一行不可解析的文本。OpenAI 的错误响应统一用 `error` 对象，字段为 `message`、`type`、`param`、`code`：

```json
{
  "error": {
    "message": "The model `foo` does not exist.",
    "type": "invalid_request_error",
    "param": null,
    "code": "model_not_found"
  }
}
```

这三步通过后，才具备真正接入的条件。

## 设计要点

兼容接口应明确暴露模型列表，提供查询可用模型的端点，让客户端在调用前就能校验模型名，而不是靠试错。消息格式要明确支持哪些角色（system/user/assistant）与内容类型（文本、多模态），并说明不支持的部分如何返回。

工具调用与流式事件是兼容性最容易出错的地方。要明确工具调用参数的传递方式、增量流式时工具参数如何拼接，以及流式结束时是否发送最终完成事件。客户端依赖这些细节做状态机，任何偏差都会导致解析失败或状态错乱。流式下工具调用参数会分散在多个 `delta.tool_calls` 片段中，客户端必须按 `index` 累积拼接，而不是每个 chunk 单独解析。

限额与错误码也要显式化：速率限制、token 上限、模型不可用各自的返回格式应稳定且可机器识别。明确「不假定所有参数或行为与原服务完全相同」——例如某些采样参数可能被忽略，文档中应如实标注哪些参数生效、哪些是空实现。可参考 [vLLM 的 OpenAI 兼容服务器](https://docs.vllm.ai/en/latest/) 或 [SGLang 的 OpenAI 兼容接口](https://docs.sglang.ai/) 了解参数支持差异的常见处理方式。

## 案例

某客户端发送固定 `messages` 和 `temperature` 参数，服务返回 request ID，便于后续对账与排障。请求超限或模型不存在时，服务返回结构化的错误对象，包含明确的错误码和可读信息，客户端据此决定重试、告警还是直接失败。

为验证兼容性，客户端把同一套调用同时发给 OpenAI 官方端点和兼容端点，对比请求字段、流式事件序列和错误码的差异，整理成一份差异清单，据此调整适配层而不是盲目信任「兼容」宣称。可以写一个最小的流式解析器做两端对比：

```python
def parse_sse(chunk_lines):
    for line in chunk_lines:
        if not line.startswith("data:"):
            continue
        payload = line[len("data:"):].strip()
        if payload == "[DONE]":
            return DONE
        yield json.loads(payload)
```

验证通过后，团队把模型名、参数支持范围和错误码映射固化到客户端配置中。结论是接入兼容 API 的正确姿势是「先验证认证、流式与错误语义，再固化差异」，而不是只改一个 base URL 就上线。

## 相关主题

- [API 鉴权](../security/api-authentication.md)
- [模型 API](../../../application/build/base/model-api.md)
