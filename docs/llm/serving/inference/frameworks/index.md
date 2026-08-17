---
title: 推理框架
---

## 独立专题

- [vLLM](./vllm.md)
- [SGLang](./sglang.md)
- [TensorRT-LLM](./tensorrt-llm.md)
- [llama.cpp](./llama-cpp.md)

推理框架负责加载权重、执行高效 Kernel、管理 KV Cache、调度请求并暴露服务接口。

## 快速开始

服务器 GPU 上的通用 API 服务可先评估 vLLM 或 SGLang；NVIDIA 平台追求特定模型的深度优化时评估 TensorRT-LLM；个人设备、CPU 或 GGUF 量化模型使用 llama.cpp。

## 框架定位

| 框架 | 主要特点 | 常见场景 |
| :-- | :-- | :-- |
| [vLLM](./vllm.md) | PagedAttention、连续批处理、通用服务接口 | 数据中心 GPU 在线服务 |
| SGLang | 推理运行时与结构化生成、Agent 工作负载 | 复杂生成程序与服务 |
| TensorRT-LLM | NVIDIA Kernel、量化和图优化 | NVIDIA 平台高性能部署 |
| llama.cpp | C/C++ 运行时、GGUF、跨平台 | 本地与边缘推理 |

## 选型案例

部署一个需要 OpenAI-compatible API 的 70B 模型时，先确认多卡切分、量化格式、最大上下文和并发需求，再分别压测候选框架。若业务大量复用系统提示，Prefix Cache 命中率可能比空载单请求延迟更有判断价值。

## 验证清单

- 模型架构、Tokenizer 和聊天模板兼容；
- 目标量化、并行与最大上下文可用；
- 结构化输出和工具调用符合客户端协议；
- 流式取消、超时和错误码行为明确；
- 真实请求分布下的质量、延迟、吞吐和显存达标。

框架接口和支持矩阵变化较快，具体命令应以对应版本的官方文档为准，并在升级时运行回归测试。
