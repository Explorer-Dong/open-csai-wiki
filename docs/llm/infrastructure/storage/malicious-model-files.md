---
title: 恶意模型文件
---

恶意模型文件利用不安全反序列化或随仓库分发的代码，在加载阶段执行未受信任指令。它的风险不在推理阶段，而在「加载」这一刻：模型文件被当作可执行内容解析时，攻击者不需要等到推理就能控制进程。这类漏洞对应通用软件里的不安全反序列化（[CWE-502](https://cwe.mitre.org/data/definitions/502.html)），在 ML 生态中主要体现为 pickle 序列化的权重与 `trust_remote_code` 两种路径。

## 快速开始

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

## 风险来源

部分 checkpoint 格式可包含 Python 对象：以 pickle 序列化的权重在反序列化时可触发任意代码执行，攻击者只需让受害者加载一个看似正常的模型文件即可控制其进程。pickle 的 `__reduce__` 协议允许对象在反序列化时调用任意 callable，因此恶意文件可以在 `torch.load` 返回之前就完成代码执行。`trust_remote_code` 则允许从仓库执行自定义代码，等于把代码执行权限交给仓库作者。这两条路径的官方说明与防护建议见 [Hugging Face Hub 安全文档](https://huggingface.co/docs/hub/security)。

模型名称、下载量和文件扩展名都不能代替审查与哈希验证：流行的名字可以被仿冒，下载量可以被刷高，`.bin` 或 `.safetensors` 扩展名也可以被伪造。判断文件是否可信，最终要落在「与发布方哈希一致」和「来源可追溯」上，而非外观特征。

## 案例：隔离转换

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

## 相关主题

- [模型文件格式](./model-file-formats.md)
- [权重来源验证](./index.md#发布案例)
