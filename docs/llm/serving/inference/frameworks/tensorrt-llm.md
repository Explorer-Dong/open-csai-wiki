---
title: TensorRT-LLM
---

TensorRT-LLM 使用 NVIDIA TensorRT 的编译与内核优化能力部署语言模型。它在构建期把模型图编译为针对目标 GPU 与精度优化的 engine，运行时通过融合算子、KV Cache 管理与动态批处理提升吞吐与延迟。

TensorRT-LLM 由 NVIDIA 开源，其定位是把 TensorRT 面向 DNN 的图优化与内核生成能力延伸到 LLM：构建阶段将 Hugging Face、NeMo 等来源的模型转换为可复用的 engine，运行阶段则提供 in-flight batching（连续批处理）、paged KV Cache、量化与分布式并行等能力。它继承了 TensorRT「构建期静态编译、运行期高效执行」的范式，因此与 vLLM 这类偏运行时的框架在工程取舍上不同。官方文档见 [TensorRT-LLM 文档](https://nvidia.github.io/TensorRT-LLM/)，仓库见 [NVIDIA/TensorRT-LLM](https://github.com/NVIDIA/TensorRT-LLM)。

## 快速开始

先为目标 GPU、精度和模型构建 engine，并验证输出与原框架基线；engine 与硬件和版本应一并版本化。

1. 准备模型：将模型转为 TensorRT-LLM 支持的格式，按需选择 FP16、FP8 或 INT8/INT4 等精度。
2. 构建 engine：使用 `trtllm-build` 指定目标 GPU、精度、最大 batch、最大输入输出长度与并行策略，生成 engine，例如：

```bash
trtllm-build \
  --checkpoint_dir ./llama-3-8b-trt-ckpt \
  --output_dir ./llama-3-8b-engine \
  --gemm_plugin auto \
  --max_batch_size 64 \
  --max_input_len 4096 \
  --max_seq_len 8192
```

其中 `--max_batch_size`、`--max_input_len`、`--max_seq_len` 共同决定 engine 覆盖的形状区间；超出区间的请求需截断或走回退路径。

3. 运行与验证：通过 `trtllm-serve` 或 Triton 后端加载 engine，用固定提示比对与原框架基线的输出质量与速度。

验证成功的关键是输出在可接受误差内一致，且 TTFT 与吞吐达到预期。engine 与硬件、CUDA、TensorRT 版本强相关，升级任一环节都应重新构建并保存对应版本信息。

## 取舍

编译优化可带来高性能：融合多层算子、针对性分配显存、优化 KV Cache 布局与 attention 内核，通常能在目标配置上取得优于通用运行时的吞吐与延迟。运行期的 in-flight batching 把「每轮迭代参与计算的请求集合」作为调度单位，让生成中的请求按步推进、结束即让位，避免静态 batch 中短请求等待长请求，原理见 [Continuous Batching](../optimization/continuous-batching.md)。

代价是构建时间、动态形状与模型兼容性的工程投入。engine 面向固定的并行度与形状区间，超出范围的输入长度或 batch 需要重编译或回退；新模型架构、新算子可能暂不支持，需要等待适配或自行扩展。量化方面，FP8 依赖支持该精度的硬件，INT4 通常配合 AWQ、SmoothQuant 等方法以减少精度损失，这些都有额外的校准与验证成本，见 [官方量化文档](https://nvidia.github.io/TensorRT-LLM/quantization.html)。

因此它更适合形状相对确定、模型较主流的生产负载；若需求变化频繁或模型冷门，需评估编译与维护成本是否划算。

## 案例

为常用 batch 和上下文长度构建 FP16 engine，分别测 engine 构建时间、TTFT 和吞吐，并保留未命中形状的回退路径。

以「客服问答」场景为例，固定最大输入与输出长度构建 engine，用真实流量压测，记录构建耗时、首 token 延迟、稳态吞吐与显存占用，并与同模型在通用框架下的基线对比。

预期是稳态吞吐提升、TTFT 更稳定，但首次构建时间较长。若线上出现超长请求或异常 batch，应回退到通用路径或触发按需重编译，避免 engine 无法处理导致失败。

常见失败点是形状超出 engine 上限时报错，排查时确认最大长度与 batch 配置是否覆盖线上分布，并为超出部分准备截断或回退策略。

## 相关主题

- [量化](../../compression/quantization.md)
- [CUDA Graph](../optimization/cuda-graph.md)
