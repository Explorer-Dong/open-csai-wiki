---
title: llama.cpp
---

llama.cpp 是面向本地 CPU、GPU 与边缘设备的高效推理项目，常使用 GGUF 模型。它起源于 GGML 生态，以轻量依赖和跨平台支持为主要特点，适合在消费级硬件上运行量化后的语言模型。

项目由 Georgi Gerganov 于 2023 年初发起，最初的目标是让 LLaMA 系列权重能在没有高端 GPU 的普通机器上运行，由此确立了「纯 C/C++ 推理内核 + 权重量化」的路线。它早期使用 GGML 格式，2023 年 8 月起切换到 GGUF 单文件格式，把超参数、分词器、量化方案与权重统一放进一个文件，解决了旧格式可扩展性差、元数据不完整的问题，如今已成为本地推理事实上的标准载体。项目仓库与格式规范见 [llama.cpp](https://github.com/ggml-org/llama.cpp) 与 [GGUF 规范](https://github.com/ggml-org/ggml/blob/master/docs/gguf.md)。

## 快速开始

准备一个与设备内存匹配的 GGUF 量化模型，固定上下文长度与线程数后，先用单请求验证质量与速度。

1. 下载模型：从 Hugging Face 等源选择 GGUF 格式模型，量化等级应与可用内存匹配，内存紧张的设备优先考虑 4-bit 级别（如 `Q4_K_M`）。
2. 启动服务：使用 `llama-server` 并固定关键参数，例如：

```bash
./llama-server \
  -m ./models/Meta-Llama-3-8B-Instruct.Q4_K_M.gguf \
  -c 8192 \
  -t 8 \
  -ngl 32 \
  --port 8080
```

其中 `-m` 指定模型路径，`-c` 指定上下文长度，`-t` 指定 CPU 线程数，`-ngl` 指定 offload 到 GPU 的层数；`-ngl` 设为较大值（如 999）表示尽量把全部层放到 GPU。

3. 验证：通过 OpenAI 兼容接口发送一个固定提示：

```bash
curl http://127.0.0.1:8080/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"local","messages":[{"role":"user","content":"用一句话介绍 llama.cpp"}],"max_tokens":64}'
```

验证成功的标准是输出语义正确且速度稳定；若显存不足则降低 `-ngl` 或换用更高量化的等级，避免触发系统 swap 导致速度骤降。参数语义随版本演进，以 [项目 README](https://github.com/ggml-org/llama.cpp) 对应版本为准。

## 特点

llama.cpp 强调轻量部署和多平台支持，运行时只需少量外部依赖，能在服务器、桌面甚至树莓派类设备上运行。核心是把模型权重与推理内核组织得足够精简，降低部署摩擦。

量化等级、部分 GPU offload 与线程配置共同决定实际体验。GGUF 内嵌多种量化方案，低 bit 等级显著减少内存与带宽占用，但会损失精度；`-ngl` 可把一部分层放到 GPU、其余层留在 CPU，在显存不足时兼顾速度与可行性；`-t` 控制 CPU 推理线程，线程数并非越多越好，超过物理核心或引发调度竞争时反而变慢。

GGUF 的 `K` 系列量化（k-quants）是体积与精度之间的主流折中：它以块为单位保存权重，并为每个块单独保存缩放因子，从而在 2-6 bit 位宽下保留更多信息。以块内原始权重 $w_i$ 与块缩放因子 $\alpha$ 为例，量化整数由 $q_i=\operatorname{round}(w_i/\alpha)$ 得到，反量化近似为 $\hat w_i=\alpha q_i$；位宽越低，$q_i$ 可表示的级别越少，$\hat w_i$ 与 $w_i$ 的偏差越大。因此选择量化等级时应在体积、速度与质量之间权衡，而不是默认取最低位宽。

不同后端差异明显：Apple Silicon 走 Metal，NVIDIA 走 CUDA，还有面向更广硬件的 Vulkan 等路径。选择后端时应在目标设备上实测，而不是只看理论吞吐。

## 案例

在笔记本上比较不同量化等级对内存占用、tokens/s 和问答质量的影响。以同一模型为例，分别加载 8-bit 与 4-bit 版本，用相同的提示和上下文长度各跑若干次，记录峰值内存、平均生成速度与主观质量评分。

预期结果是低 bit 版本内存占用明显下降，在带宽受限的设备上速度可能提升，但复杂问答或长上下文下的质量损失更明显。不要只因模型能加载就选择最低位宽，应把质量下降控制在可接受范围内。

常见失败点包括上下文长度超出内存导致崩溃，以及线程数与核心数不匹配造成速度反而下降。排查时先降低上下文长度和 `-ngl`，再逐项恢复，定位瓶颈。

## 相关主题

- [模型文件格式](../../../infrastructure/storage/model-file-formats.md)
- [量化](../../compression/quantization.md)
