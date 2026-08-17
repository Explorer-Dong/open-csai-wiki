---
title: 模型 API
---

模型 API 将模型能力作为稳定的请求、响应和错误契约提供给应用。它的由来是：大模型最初以「权重 + 推理脚本」的形式交付，使用方要自己处理部署、显存、采样与并发；OpenAI 在 2020 年推出 GPT-3 API，把「发送一段文本、拿回补全」抽象成 HTTP 接口，Chat Completions 出现后又把输入升级为 messages 列表。如今这套接口成为事实标准，vLLM、SGLang 等推理框架普遍提供 OpenAI 兼容服务。应用通过标准化的 HTTP 接口提交输入、接收生成结果，并依赖该契约处理认证、限流与错误，而不是直接和模型权重或推理引擎打交道。接口契约见 [Chat Completions 参考](https://platform.openai.com/docs/api-reference/chat/create)。

## 快速开始

固定模型版本、超时、重试与请求 ID；先用最小请求验证认证、流式和错误处理。起步可这样做：

1. 固定模型标识：明确使用哪个模型名和版本，避免上游静默升级导致行为漂移。模型名是计费、配额和参数校验的依据，不要用「最新版」这类模糊引用。
2. 设置超时与重试：首 token 与总时长分别设限，重试只对幂等请求生效。超时后是否已产生计费、是否已部分执行，需要结合接口语义判断，不能盲目重发。
3. 为每个请求生成 request ID 并贯穿日志：客户端、网关、推理服务各段都用同一 ID，出错时能对齐时间线。

先用最小请求打通全链路：发一条短 `messages`，验证认证头、流式事件格式、以及 4xx/5xx 错误如何返回。确认能稳定收到首个 token、能正确结束流、能在超时和限流时给出明确错误后，再扩大请求规模。

一个最小请求与响应示意如下，字段以 OpenAI 兼容接口为准：

```python
import openai

client = openai.OpenAI(api_key="sk-...", base_url="https://api.openai.com/v1")
resp = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "用一句话解释什么是 API。"}],
    max_tokens=64,
    stream=False,
)
print(resp.choices[0].message.content)
print(resp.usage)  # prompt_tokens / completion_tokens / total_tokens
```

验证成功的标准是：能拿到 `choices[0].message.content`、`usage` 中有非零 token 数、错误响应能通过 HTTP 状态码与 `error.code` 区分。

## 案例

应用发送 messages 和预算，记录模型名、参数、延迟与用量。超时只对幂等请求重试，并保留 request ID 排障。例如一次生成任务里，应用提交 `messages`、`max_tokens` 与采样参数，同时在本地记录模型名、请求 ID、发送时间。

收到响应后记录首 token 延迟、总耗时、输入与输出 token 数，用于计费和成本分析。成本可由用量直接算出：

$$
\text{cost} = P_{\text{in}} \cdot T_{\text{in}} + P_{\text{out}} \cdot T_{\text{out}}
$$

其中 $P_{\text{in}}$、$P_{\text{out}}$ 分别是输入、输出 token 单价，$T_{\text{in}}$、$T_{\text{out}}$ 是本次请求的输入、输出 token 数。流式场景下，总延迟可拆成首 token 延迟与后续生成时间：

$$
T_{\text{total}} = \text{TTFT} + T_{\text{decode}}
$$

其中 TTFT 是「首 token 时间 (Time To First Token, TTFT)」，$T_{\text{decode}}$ 是首个 token 之后逐 token 生成的累计耗时。若发生超时，先判断请求是否幂等：只读的补全请求通常可安全重试，而已触发外部副作用的请求不应盲目重发，否则可能重复执行。

排障时以 request ID 为主线，把客户端日志、网关访问日志和服务端 trace 串起来，定位是网络、限流还是推理慢。对于流式输出，还要记录「首 token 时间 (Time To First Token, TTFT)」与「单 token 延迟」，这些指标决定交互体感。API 形态可参考 [OpenAI-compatible API](../../../serving/deployment/base/openai-compatible-api.md)，消息结构见 [Messages](./messages.md)。

## 相关主题

- [Messages](./messages.md)
- [OpenAI-compatible API](../../../serving/deployment/base/openai-compatible-api.md)
