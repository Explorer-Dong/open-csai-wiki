---
title: Driver
---

GPU 驱动由内核模块与用户态运行库共同组成，负责操作系统与 GPU 设备之间的通信，并向 CUDA 等上层运行时提供设备 API。它位于整个软件栈的最底层：框架和算子库的每一次 Kernel 提交、显存分配与同步，最终都要经过它落到硬件，因此驱动是否正常决定了上层所有组件能否工作。

## 快速开始

用 `nvidia-smi` 确认驱动能识别 GPU、显存和进程：

```bash
nvidia-smi
```

再运行框架的最小张量程序，验证驱动之上的运行链路是否完整：

```python
import torch

x = torch.randn(8, 8, device="cuda")
y = x @ x
assert y.device.type == "cuda"
```

验证成功的标准是：`nvidia-smi` 显示设备型号、驱动版本与 CUDA 版本，且张量程序能正常完成计算。注意驱动正常只代表设备可用，不代表框架、CUDA 运行时和自定义扩展完全兼容，后两者需要单独核对。

## 职责边界

驱动管理设备初始化、内存映射、Kernel 提交和版本兼容。在 Linux 上它通常由内核模块（如 `nvidia.ko`、`nvidia-uvm.ko`）与用户态库（如 `libcuda.so`）两部分组成：内核模块负责硬件访问与中断处理，用户态库则把驱动 API 暴露给 CUDA 运行时和应用，两者版本必须匹配才能正常工作。

由此引出一个常见的「三层混淆」：CUDA Toolkit 提供 `nvcc` 编译器等开发工具，CUDA Runtime 是程序运行期链接的库，Driver 是运行时之下的设备访问层；Python 框架包（如 PyTorch）通常又携带自身依赖的运行时。因此系统里 Toolkit 的版本并不等于框架实际链接的运行时版本。驱动通常向后兼容更早的 CUDA 运行时，并自 CUDA 11 起在同主版本内支持「minor version compatibility」；具体支持矩阵以 [NVIDIA CUDA 兼容性文档](https://docs.nvidia.com/deploy/cuda-compatibility/) 为准。

## 案例：定位不可用 GPU

若 `nvidia-smi` 失败，优先检查内核模块是否加载、容器是否完成设备透传以及宿主机驱动是否正常：

```bash
lsmod | grep nvidia
ls -l /dev/nvidia*
```

若 `nvidia-smi` 成功而 PyTorch 报 CUDA 不可用，再把问题缩小到容器内的 NVIDIA runtime、框架构建版本和 `CUDA_VISIBLE_DEVICES`：

```bash
docker run --rm --gpus all pytorch/pytorch:latest \
  python -c "import torch; print(torch.cuda.is_available())"
```

容器访问 GPU 依赖 [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/) 提供的运行时钩子或 CDI（Container Device Interface）设备注入。按「宿主机驱动 -> 容器运行时 -> 框架运行时」的层级顺序排查，比盲目重装更安全。

## 运维要点

升级驱动前记录框架、CUDA 运行时和关键扩展版本，并在一台节点做回归测试；升级可能要求卸载旧模块或重启，且应确认新驱动仍兼容现有 CUDA 运行时。集群还要监控 Xid 错误、温度、ECC 和显存异常进程，其中 Xid 是驱动上报的软硬件错误码，可用于定位 GPU 掉卡等故障（码表以 [NVIDIA Xid 错误文档](https://docs.nvidia.com/deploy/xid-errors/) 为准）。

## 相关主题

- [CUDA](./cuda.md)
- [AI 软件栈导读](./index.md)
