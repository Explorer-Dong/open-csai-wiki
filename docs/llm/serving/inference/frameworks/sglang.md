---
title: SGLang
---

SGLang 是面向结构化生成、程序化提示与高性能推理的运行时和框架。它提供一种前端语言用于表达多步调用、分支与并行，同时在服务端通过 RadixAttention 等机制复用 KV Cache 以降低延迟。

SGLang 由论文 [SGLang: Efficient Execution of Structured Language Model Programs](https://arxiv.org/abs/2312.07104) 提出，其动机是把原本需要在客户端多次往返的多步 LLM 调用（如 agent、多轮工具调用、并行采样）下推到服务端一次执行，从而减少网络开销与调度等待。随后它把 RadixAttention、chunked prefill、量化与结构化输出等优化逐步并入运行时，成为与 vLLM 并列的通用服务框架。官方文档见 [docs.sglang.io](https://docs.sglang.io/)。

## 快速开始

先用一个固定提示验证模型加载、结构化输出与流式接口，再在真实并发下测试缓存与调度。

1. 启动服务：使用 `python -m sglang.launch_server`，指定模型路径与并发相关参数，例如：

```bash
python -m sglang.launch_server \
  --model-path meta-llama/Llama-3.1-8B-Instruct \
  --host 127.0.0.1 --port 30000
```

2. 验证加载：向 `/v1/chat/completions` 或 SGLang 原生接口发送固定提示，确认能正常返回。
3. 验证结构化输出：为请求附加 JSON Schema 或正则约束，检查返回内容始终满足约束。
4. 验证流式：开启 stream，确认 token 增量有序到达。
5. 并发测试：用共享前缀的多个请求压测，观察命中缓存后 TTFT 是否下降。

验证成功的标准是约束始终满足、流式顺序正确、并发下延迟与吞吐符合预期。若约束未被遵守，优先检查约束语法与服务端版本是否支持该约束类型，具体语法以 [Structured Outputs 文档](https://docs.sglang.io/docs/advanced_features/structured_outputs) 为准。

## 特点

SGLang 可表达多步骤生成和约束输出。前端语言支持在单次请求里定义多次生成、条件分支、并行调用和结果拼接，把原本需要客户端多次往返的逻辑收敛到服务端，减少网络开销与协议复杂度。

约束输出方面，它支持通过正则表达式、JSON Schema 等方式做受限解码，在采样时屏蔽不满足约束的 token，适合工具调用、结构化抽取等对格式有硬要求的场景。以下是用 SGLang 前端语言声明一次带 JSON 约束的生成：

```python
import sglang as sgl

@sgl.function
def extract(s, prompt: str):
    s += prompt
    s += sgl.gen(
        "answer",
        max_tokens=128,
        json_schema={
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "integer"},
            },
            "required": ["name", "age"],
        },
    )

state = extract.run(prompt="请提取用户信息")
print(state["answer"])
```

这段代码把约束参数传给解码器，采样时会屏蔽所有使 JSON 无法继续合法的 token；运行成功的标准是 `state["answer"]` 能直接 `json.loads` 解析且字段类型正确。

服务端优化仍需依据模型、版本和负载验证。RadixAttention 维护一棵前缀树（radix tree）缓存 KV Cache：以 token 序列为从根到叶的路径，相同前缀的请求共享树上的中间节点，命中后可跳过重复 prefill；当缓存写满时按 LRU 逐出最少使用的叶节点。命中率取决于请求的前缀相似度，调度与缓存策略也会随版本演进，升级前后应重新基准测试，相关细节见 [论文](https://arxiv.org/abs/2312.07104)，参数与调度策略以 [官方文档](https://docs.sglang.io/) 对应版本为准。

## 案例

为工具调用任务声明 JSON 输出约束，统计解析率与延迟。以「提取并返回结构化参数」为例，给模型一个函数调用的 JSON Schema，批量发送多种措辞的请求，记录输出能直接 JSON 解析的比例、平均 TTFT 与 token 吞吐。

预期结果是约束下解析率接近 100%，而延迟相比无约束略有变化。约束失败时应返回可观测错误而非静默重试，便于排查是 schema 定义过严、模型能力不足还是服务端约束实现问题。

排查方向：先确认 schema 语法合法、目标模型是否对工具调用做过对齐，再检查请求是否带上了约束参数；必要时降低约束复杂度或改用更宽松的 schema。

## 相关主题

- [Structured Output](../../../application/build/base/structured-output.md)
- [Continuous Batching](../optimization/continuous-batching.md)
