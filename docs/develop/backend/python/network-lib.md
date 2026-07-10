---
title: 网络编程库
status: todo
icon: simple/fastapi
---

本文介绍 Python 网络编程相关内容。

## FastAPI

FastAPI 是一个高性能 Python Web 异步开发框架。一些资源如下：

- [FastAPI 官方文档（中文文档经常抽风）](https://fastapi.tiangolo.com)
- [FastAPI 中文文档（社区维护）](https://fastapi.org.cn/)
- [FastAPI 最佳实践](https://github.com/zhanymkanov/fastapi-best-practices/blob/master/README_ZH.md)

在开始学习 FastAPI 之前，有必要先理解 [异步编程](../../../base/ai/python/async-lib.md) 这个概念。

### 路由函数

如果函数中有 `await` 项，那么路由函数必须使用 `async def` 定义；如果没有，可以使用 `def` 定义，FastAPI 会 [创建线程池](https://fastapi.tiangolo.com/async/#path-operation-functions) 来运行该函数。

路由函数示例：

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def root():
    return {"status": "ok"}
```

### 返回值数据验证

在装饰器最后添加 `response_model` 字段，可以做到：

- 校验返回值是否符合该数据模型；
- 自动移除多余字段；
- 保证响应 JSON 结构稳定。

数据模型：

```python
from pydantic import BaseModel
from fastapi import FastAPI

app = FastAPI()

class InternalData(BaseModel):
    task_id: str
    status: str
    internal_log: str

class ResponseData(BaseModel):
    task_id: str
    status: str
```

使用场景：

```python
@app.get("/query", response_model=ResponseData)
def query():
    data = InternalData(
        task_id="123",
        status="success",
        internal_log="debug info",
    )
    return data
```

实际返回：

```json
{
  "task_id": "123",
  "status": "success"
}
```

其中的 `internal_log` 被自动裁剪。

### 自定义返回状态码

可以在路由装饰器里通过 `status_code` 参数指定返回状态码：

```python
from fastapi import FastAPI, status
from pydantic import BaseModel

app = FastAPI()

class Item(BaseModel):
    name: str

@app.post("/items", status_code=201)
async def create_item(item: Item):
    return {"item": item}
```

或者在返回时使用 `JSONResponse` 来完全控制：

```python
from fastapi.responses import JSONResponse

@app.post("/items/custom")
async def create_item_custom(item: Item):
    data = {"message": "created"}
    return JSONResponse(content=data, status_code=202)
```

其中状态码也可以使用 `fastapi.status` 里的宏：

```python
from fastapi import status

@app.post("/items", status_code=status.HTTP_201_CREATED)
async def create_item(item: Item):
    return {"item": item}
```

### 自定义异常

```python
from fastapi import HTTPException

@app.get("/items/{item_id}")
async def read_item(item_id: int):
    if item_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid item_id")
    return {"item_id": item_id}
```

上述程序在 HTTP 400 时返回的请求体如下：

```json
{
  "detail": "Invalid item_id"
}
```

## Pydantic

[Pydantic](https://docs.pydantic.dev/latest/) 是 Python 中一个比较流行的数据验证库，FastAPI 也 [基于](https://fastapi.tiangolo.com/features/#pydantic-features) Pydantic 开发。

### 数据模型

一般来说，数据模型都继承自 Pydantic 的 `BaseModel` 类，从而获得其数据验证等全部功能。

```python
from pydantic import BaseModel


class MetaData(BaseModel):
    task_id: str  # 必填字段
    status: str | None  # 选填字段
    video_url: str | None = None  # 选填字段，默认为 None


class SmallData(BaseModel):
    task_id: str
    status: str
    image_url: str


small = SmallData(
    task_id=b"1",  # 会自动从 bytes 转化为 str
    status="created",
    image_url="xxx.xxx.xxx",
)

print(type(small.task_id), small.task_id)  # <class 'str'> 1
print(small.status)  # created
print(small.image_url)  # xxx.xxx.xxx
```

### 数据导出

使用 `BaseModel` 的：

- `model_dump()` 方法导出为 `object`；
- `model_dump_json()` 方法导出为 `json str`：

```python hl_lines="1 5"
x_obj = small.model_dump()
print(type(x_obj), x_obj)
# <class 'dict'> {'task_id': '1', 'status': 'created', 'image_url': 'xxx.xxx.xxx'}

x_str = small.model_dump_json()
print(type(x_str), x_str)
# <class 'str'> {"task_id":"1","status":"created","image_url":"xxx.xxx.xxx"}
```

### 数据导入

使用 `BaseModel` 的：

- `model_validate()` 方法从 `object` 导入；
- `model_validate_json()` 方法从 `json str` 导入：

```python hl_lines="1 5"
y_from_obj = MetaData.model_validate(x_obj)
print(y_from_obj)
# task_id='1' status='created' video_url=None

y_from_str = MetaData.model_validate_json(x_str)
print(y_from_str)
# task_id='1' status='created' video_url=None
```

### 数据更新

当只需要更新数据模型中的部分字段时，可以使用 `model_copy` 方法：

```python hl_lines="4"
meta = MetaData(task_id="2", status="failed")
print(meta)  # task_id='2' status='failed' video_url=None

new_meta = meta.model_copy(update={"status": "success"})
print(new_meta)  # task_id='1' status='success' video_url=None
```

