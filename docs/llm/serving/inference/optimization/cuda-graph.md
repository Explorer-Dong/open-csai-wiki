---
title: CUDA Graph
---

CUDA Graph 记录一组重复 GPU 操作并重复提交，减少 CPU 发射开销。它把多个内核启动与内存操作打包成一张图，后续以单次调用整体提交，省去逐内核的 CPU 侧调度成本。

CUDA Graph 是 CUDA 提供的一等机制，定义见 [CUDA C++ Programming Guide 的 CUDA Graphs 章节](https://docs.nvidia.com/cuda/cuda-c-programming-guide/index.html#cuda-graphs)。它的由来是：现代 GPU 单次内核执行很快，而 CPU 每提交一个内核都要经过驱动层的排队、校验与启动，当一次前向由几十上百个细粒度内核组成时，CPU 发射开销可能与 GPU 实际计算相当。对 decode 这种「单步计算量小、内核数量多且高度重复」的场景，这一开销尤其突出，因此把整段内核序列预先捕获成图、运行时一次提交，就能把这部分固定成本大幅摊薄。vLLM 默认对 decode 使用 CUDA Graph，详见 [官方文档](https://docs.vllm.ai/)。

## 快速开始

为常见固定形状预热并捕获图，动态形状使用回退路径；验证输出与非图执行一致。

1. 确定形状：固定 batch 大小、序列长度与显存地址，确保图内操作参数稳定。
2. 预热并捕获：先执行若干次普通运行完成显存分配与初始化，再进入图捕获阶段记录内核序列。
3. 回放：用相同形状重复提交图，比较与非图执行的速度。
4. 回退：对未覆盖的形状走普通执行路径。

最小流程对应 CUDA 的三段式 API：

```cpp
cudaStreamBeginCapture(stream, cudaStreamCaptureModeThreadLocal);
// ... 在 stream 上提交要捕获的若干内核 ...
cudaStreamEndCapture(stream, &graph);          // 得到 cudaGraph_t

cudaGraphInstantiate(&exec, graph, 0);          // 实例化为可执行的图
cudaGraphLaunch(exec, stream);                  // 单次调用整体回放
```

验证成功的标准是图回放结果与非图执行一致，且延迟下降明显。若输出出现差异，通常是图内存在未捕获或地址变化的操作，应缩小捕获范围。

## 约束

图捕获依赖稳定的内存地址和执行结构。捕获期间不能改变分配、不能执行 CPU-GPU 同步或条件分支等破坏图的动作，否则捕获失败或图失效。

变长 batch、动态分配或未捕获算子会限制覆盖率。请求长度多变时，每个形状组合都可能需要独立图，图数量会膨胀；若使用统一 buffer 并固定最大形状，则需要处理未用部分的填充与掩码。

因此常见做法是只对 decode 这类形状相对固定的短步使用图，prefill 或形状变化大的路径保留普通执行。图的收益在「单步计算量小、内核多」时最明显，因为省下的主要是 CPU 发射开销；对 compute-bound 的大计算，内核耗时占主导，省下的发射时间占比很小。

## 案例

固定 decode batch 的短步执行 CPU 开销高，捕获后 TPOT 改善；请求形状变化时回退普通执行。

以固定 batch 的生成服务为例，每个 decode 步涉及多次内核启动，CPU 发射与调度时间可能接近甚至超过内核执行时间。捕获为图后，单次提交整段计算，每 token 时间下降，TPOT 改善。

代价是形状一旦变化就得回退，且显存地址需保持稳定，通常配合固定尺寸的 KV 缓冲与 padding 使用。请求形状变化时回退普通执行，用少量普通路径的开销换取图对主流形状的稳定收益。

常见失败点是捕获失败或回放结果不一致，排查时检查捕获期间是否有动态分配、随机数或同步操作，必要时把这些操作移出捕获区。

## 相关主题

- [CUDA](../../../infrastructure/software/cuda.md)
- [Decode](../base/decode.md)
