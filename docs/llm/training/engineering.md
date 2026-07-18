---
title: 工程实践
icon: material/tools
---

拉取镜像：

```bash
docker pull verlai/verl:vllm023.aarch64.dev1
```

启动镜像：

```bash
docker run -d \
  --name verl-dev \
  --gpus all \
  --ipc=host \
  -v /cpfs01/dwj/mergekit:/workspace/mergekit \
  -v /cpfs01/chwang/models/origin_model:/data/models \
  verlai/verl:vllm023.aarch64.dev1 \
  sleep infinity
```

进入容器：

```bash
docker exec -it verl-dev bash
```

退出容器：

```bash
exit
```
