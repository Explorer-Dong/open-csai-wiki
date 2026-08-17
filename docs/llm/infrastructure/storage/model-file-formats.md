---
title: 模型文件格式
---

模型格式决定权重、元数据和计算图如何保存，也影响兼容性、加载性能和安全边界。理解这些格式，本质是理解三件事：数据如何被序列化、谁能在加载时执行代码、以及权重如何被高效映射到内存。选择格式因此取决于分发场景、加载方信任边界与推理运行时。

## 快速开始

在 Transformers 生态优先使用 Safetensors；训练恢复才保存受控环境中的 checkpoint；本地量化推理选择 GGUF；跨运行时部署再考虑 ONNX。下载后校验哈希与配置是否匹配。Safetensors 的保存与加载：

```python
from safetensors.torch import save_file, load_file

save_file(model.state_dict(), "model.safetensors")
state = load_file("model.safetensors", device="cuda")
```

验证成功的标准是 `load_file` 返回的字典键名、形状与原始 `state_dict` 一致，且加载全程不执行任何 Python 字节码。

## 常见格式

Safetensors 仅表达张量，适合安全分发。它由 Hugging Face 主导设计，针对 PyTorch `torch.save` 基于 pickle 的任意代码执行风险而来：pickle 在反序列化时会执行 `__reduce__` 等魔术方法，恶意模型文件可借此在加载时运行任意代码，相关分析见 [Pickle Scanning](https://huggingface.co/docs/hub/security-pickle) 。Safetensors 用「8 字节头部长度 + JSON 头部（张量名、dtype、shape、偏移）+ 连续二进制数据块」组织权重，加载时按偏移零拷贝 mmap，不执行代码、支持惰性加载与分片，详见 [safetensors 文档](https://huggingface.co/docs/safetensors/) 。它已作为中立标准加入 PyTorch 基金会。

PyTorch checkpoint（`.pt`/`.bin`，经 `torch.save`）可携带任意 Python 对象，不能从不可信来源直接加载；但它仍是训练中途恢复的合理选择，因为要保存优化器状态、学习率调度器与 RNG 等完整对象图。GGUF 面向 llama.cpp 的量化与本地推理：单一文件内嵌权重、量化参数、词汇表与元数据，配合 mmap 按需加载，使大模型可在内存受限的消费级设备上推理，规范见 [GGUF 文档](https://github.com/ggml-org/llama.cpp/blob/master/docs/gguf.md) 。ONNX 保存计算图与算子，不绑定训练框架，便于跨运行时优化与部署，规范见 [ONNX](https://onnx.ai/onnx/) 。

量化格式涉及从浮点权重到低比特表示的映射。以线性量化为例，浮点 $x$ 与量化整数 $x_q$（位宽 $b$、scale $s$、零点 $z$）满足：

$$ x_q = \mathrm{clamp}\left(\mathrm{round}\left(\frac{x}{s}\right) + z,\; 0,\; 2^b - 1\right), \quad x \approx s\,(x_q - z) $$

GGUF 的 K-quant（如 Q4_K、Q5_K）在此基础上分块混合量化，并为每块额外保存 scale，兼顾精度与体积。

## 案例：安全转换

在无密钥、无外网的隔离容器加载可信旧 checkpoint，提取 `state_dict` 后写成 Safetensors。转换脚本检查张量名、形状和数值范围，并发布哈希清单；使用方只加载转换后的产物。

```python
import torch
from safetensors.torch import save_file

ckpt = torch.load("old.pt", map_location="cpu", weights_only=True)
sd = ckpt["state_dict"] if "state_dict" in ckpt else ckpt
for k, t in sd.items():
    assert t.is_floating_point() or t.dtype in (torch.int64, torch.bool), k
    assert torch.isfinite(t.float()).all(), f"non-finite in {k}"
save_file({k: v.contiguous() for k, v in sd.items()}, "model.safetensors")
```

`weights_only=True` 是较新 PyTorch 的受限加载模式，反序列化时拒绝实例化非张量类，进一步降低风险，但旧版 checkpoint 仍需在隔离环境处理。转换后计算 `sha256sum model.safetensors` 写入清单，使用方只加载该产物并比对哈希。

## 常见问题

权重、config、Tokenizer 和聊天模板必须作为一组版本化：它们彼此耦合，任一不一致都会静默出错。格式可加载不代表语义匹配；遗漏 RoPE 配置（旋转位置编码的 theta、维度）或量化元数据会导致输出质量异常。因此发布与引用模型时，应把「权重文件哈希 + config 提交 + tokenizer 提交 + 聊天模板」绑定为一个不可变版本，而非只保存权重文件。

## 恶意模型文件

恶意模型文件利用不安全反序列化或随仓库分发的代码，在加载阶段执行未受信任指令。它的风险不在推理阶段，而在「加载」这一刻：模型文件被当作可执行内容解析时，攻击者不需要等到推理就能控制进程。这类漏洞对应通用软件里的不安全反序列化（[CWE-502](https://cwe.mitre.org/data/definitions/502.html)），在 ML 生态中主要体现为 pickle 序列化的权重与 `trust_remote_code` 两种路径。

### 快速开始

对不可信来源优先使用 Safetensors 格式：它只存储原始张量数据，不包含可执行对象，加载时不做任意反序列化。禁止直接加载可执行对象序列化（如 pickle 打包的旧 checkpoint），除非来源已完全可信。Safetensors 的文件头是一个纯 JSON 元数据段，记录各张量的名称、dtype 与字节偏移，正文则是连续的原始张量字节，加载器据此直接映射内存而不执行任何代码，其设计见 [safetensors 官方仓库](https://github.com/huggingface/safetensors)。加载前的最小检查清单如下：

```text
- 格式：优先 .safetensors，拒绝直接加载 pickle 类对象序列化
- 哈希：与发布方清单逐文件核对
- 来源：固定仓库 revision，不使用浮动分支
- 代码执行：默认关闭 trust_remote_code
```

安全加载的最小组件调用如下；PyTorch 侧的 `weights_only=True` 会拒绝还原自定义对象，是旧格式下的降级保护：

```python
from safetensors.torch import load_file

tensors = load_file("model.safetensors")        # 只映射张量，不执行代码
```

```python
import torch

state_dict = torch.load("model.bin", weights_only=True)  # 禁止自定义对象还原
```

确需转换旧格式时，在无密钥、无外网、只读数据挂载的隔离环境中完成：转换容器不注入云凭证，网络仅保留必要的白名单，数据目录以只读方式挂载。这样即使文件恶意，攻击者也只能在隔离环境内执行，无法接触生产凭据或外发数据。验证方式是在转换容器内检查环境变量与网络出口，确认无凭证、外网访问被阻断。

### 风险来源

部分 checkpoint 格式可包含 Python 对象：以 pickle 序列化的权重在反序列化时可触发任意代码执行，攻击者只需让受害者加载一个看似正常的模型文件即可控制其进程。pickle 的 `__reduce__` 协议允许对象在反序列化时调用任意 callable，因此恶意文件可以在 `torch.load` 返回之前就完成代码执行。`trust_remote_code` 则允许从仓库执行自定义代码，等于把代码执行权限交给仓库作者。这两条路径的官方说明与防护建议见 [Hugging Face Hub 安全文档](https://huggingface.co/docs/hub/security)。

模型名称、下载量和文件扩展名都不能代替审查与哈希验证：流行的名字可以被仿冒，下载量可以被刷高，`.bin` 或 `.safetensors` 扩展名也可以被伪造。判断文件是否可信，最终要落在「与发布方哈希一致」和「来源可追溯」上，而非外观特征。

### 案例：隔离转换

转换任务在临时容器中加载受控 checkpoint，导出张量并验证形状与数值范围（检查是否存在 NaN/Inf、异常量级），随后写出 Safetensors 文件与哈希清单。转换完成后核对哈希，再销毁临时容器。最小转换脚本如下：

```python
from safetensors.torch import save_file
import torch

raw = torch.load("legacy.bin", weights_only=True)  # 仅在隔离环境执行
clean = {k: v for k, v in raw.items()
         if torch.isfinite(v.float()).all()}        # 剔除 NaN/Inf
save_file(clean, "model.safetensors")
```

转换容器没有云凭证和生产网络，数据以只读方式挂载，即使文件在加载阶段执行恶意代码，其影响也被限制在容器内，且无法外传或横向访问生产环境。这一流程把「必须加载不可信格式」的风险降到可控范围，并产出了后续可验证的干净产物。常见失败点是转换环境复用了生产镜像或挂载了可写的生产数据卷，导致隔离形同虚设。
