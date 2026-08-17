---
title: vLLM
---

vLLM 是面向大语言模型的推理与服务框架，核心能力包括 KV Cache 分页管理、连续批处理、分布式推理和 OpenAI-compatible API。

常见通用推理框架包括 [vLLM](https://github.com/vllm-project/vllm) 与 [SGLang](https://github.com/sgl-project/sglang)。原文基于兼容性与社区规模重点介绍 vLLM；实际选型仍应使用相同模型与负载比较，完整定位见 [推理框架](./index.md)。

## 快速开始

安装与具体参数会随版本变化，以下命令展示基本流程：

```bash
pip install vllm
vllm serve <model-path-or-repo> --host 127.0.0.1 --port 8000
```

启动后可发送一个聊天请求：

```bash
curl http://127.0.0.1:8000/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "<model-name>",
    "messages": [{"role": "user", "content": "解释 KV Cache"}],
    "max_tokens": 128
  }'
```

模型名称、聊天模板、精度和 GPU 数应根据所用版本与权重配置确认。

## PagedAttention

传统服务若为每个请求预留连续 KV Cache，容易产生内部和外部碎片。vLLM 将 Cache 切成固定大小的 Block，通过逻辑到物理块映射按需分配，使不同长度请求可以更灵活地共享显存池。

PagedAttention 解决的是缓存管理问题，不改变 Attention 的数学目标。它通常与连续批处理一起使用：序列结束后释放 Block，调度器立即加入其他请求。

## 容量配置

最大上下文、并发和精度共同决定 KV Cache 压力。配置时先保留模型权重和运行时开销，再把剩余显存用于 Cache。若频繁出现抢占或排队，应降低最大并发、上下文长度，或使用 GQA、量化和更多设备。

## 分布式推理

单卡无法容纳模型时可使用 Tensor Parallel；多节点部署还要配置进程启动、网络和共享模型访问。Tensor Parallel 大小不是越大越好：它会增加层内通信，应优先放在高速互联设备之间。

## 生产检查

- 固定 vLLM、模型和 Tokenizer 版本；
- 用业务聊天模板验证输出格式；
- 测试流式输出、取消、超时和错误码；
- 对工具调用和 Structured Output 做协议回归；
- 使用真实长度分布测量 TTFT、TPOT、吞吐与显存；
- 在网关层补充鉴权、限流和审计。

vLLM 的参数与支持矩阵更新较快，部署时应以 [官方文档](https://docs.vllm.ai/) 对应版本为准。
