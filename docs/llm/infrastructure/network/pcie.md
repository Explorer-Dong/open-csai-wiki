---
title: PCIe
---

PCI Express (PCIe) 是 CPU、GPU、网卡和 NVMe SSD 之间常用的高速串行互联。大模型系统中，PCIe 影响模型加载、CPU 与 GPU 数据传输、网卡直连、GPU 间点对点通信以及显存卸载性能。

## 快速开始

查看 GPU、网卡与 PCIe 拓扑：

```bash
nvidia-smi topo -m
lspci -tv
```

`nvidia-smi topo -m` 中的 `PIX`、`PXB`、`PHB`、`SYS` 表示设备间经过的 PCIe Bridge、Host Bridge 或 CPU Socket 路径。路径更长通常意味着更高延迟或更低可用带宽。

## 链路与 Lane

PCIe 由多条 Lane 组成，常见设备使用 x16、x8 或 x4 链路。每代 PCIe 提高单 Lane 传输率，但实际吞吐还受协商代际、Lane 数、编码、主板布线、交换芯片和竞争设备影响。

GPU 插在物理 x16 插槽中不保证以 x16 高代际运行。BIOS 配置、CPU Lane 数、转接卡或故障都可能让链路降级。

## 大模型数据路径

典型路径包括：

- CPU DRAM -> GPU HBM：数据加载、Tokenization 后的输入复制；
- NVMe -> CPU DRAM -> GPU HBM：模型加载与数据预取；
- GPU -> GPU：无 NVLink 时可能经 PCIe P2P；
- NIC -> GPU：GPUDirect RDMA 条件满足时可减少 CPU 中转。

频繁的小拷贝会产生同步与启动开销。应使用 Pin Memory、异步复制和适当 Batch 将传输与计算重叠。

## 传输案例

PyTorch DataLoader 可使用固定页内存：

```python
loader = torch.utils.data.DataLoader(dataset, pin_memory=True, num_workers=4)
for batch in loader:
    batch = batch.to("cuda", non_blocking=True)
```

`pin_memory=True` 让主机内存可被 DMA 高效传输，`non_blocking=True` 允许复制与计算重叠。二者并非总能加速：数据很小、Worker 不足或主机内存紧张时收益有限。

## PCIe 与 GPU 互联

PCIe 是通用互联，支持 GPU、SSD、网卡等多类设备；NVLink 面向 GPU 高带宽点对点通信。张量并行每层都需要通信，通常更偏好 NVLink 或 NVSwitch；数据并行的跨节点同步则主要依赖网卡和网络。

无 NVLink 的多 GPU 主机仍可训练或推理，但必须用目标并行策略和输入规模测量通信占比。

## 排查方法

1. 查看链路实际 Speed 与 Width，而非只看插槽规格；
2. 检查 GPU 与网卡是否位于同一 NUMA 节点；
3. 用带宽测试区分 H2D、D2H 和 P2P；
4. 检查是否发生 CPU 回退或 P2P 禁用；
5. 在 Profiling 中确认传输是否与计算重叠。

PCIe 降速可能由 BIOS、省电策略、转接结构、设备过热或插槽共享 Lane 引起。

## 常见问题

- PCIe Gen 代际速度不能直接等同于应用吞吐；
- x16 物理插槽可能只电气连接 x8 或 x4；
- P2P 可用不代表性能最好，仍要看拓扑；
- 显存不足时 CPU Offload 会占用 PCIe，可能显著降低 Decode 性能；
- GPUDirect RDMA 需要硬件、Driver、IOMMU 和网络配置共同支持。

GPU 本地互联见 [NVLink](./nvlink.md)，主机内存与调度见 [CPU](../accelerator/cpu.md)，跨节点网络见 [InfiniBand](./infiniband.md)。
