---
title: 数据分析库
status: todo
icon: simple/pandas
---

本文记录 [Pandas](https://pandas.pydata.org/) 的用法。

> [!tip]
>
> Pandas is a fast, powerful, flexible and easy to use open source data analysis and manipulation tool, built on top of the Python programming language.

Pandas 的基本数据结构由 DataFrame 和 Series 组成，这也是 Pandas 的核心所在。

## DataFrame

二维表格型数据结构，带行索引和列标签，是 Pandas 的核心对象。

```python
import pandas as pd

df = pd.DataFrame({
    "int_col": [1, 2, 3, 4, 5],
    "text_col": ["alpha", "beta", "gamma", "delta", "epsilon"],
    "float_col": [0.0, 0.25, 0.5, 0.75, 1.0]
})
```

### `df.info()`

查看数据表基本信息（行数、列数、非空值、数据类型）：

```python
import pandas as pd

int_values = [1, 2, 3, 4, 5]
text_values = ['alpha', 'beta', 'gamma', 'delta', 'epsilon']
float_values = [0.0, 0.25, 0.5, 0.75, 1.0]
df = pd.DataFrame({
    "int_col": int_values,
    "text_col": text_values,
    "float_col": float_values
})

df.info()

""" 输出
<class 'pandas.core.frame.DataFrame'>
RangeIndex: 5 entries, 0 to 4
Data columns (total 3 columns):
 #   Column     Non-Null Count  Dtype  
---  ------     --------------  -----  
 0   int_col    5 non-null      int64  
 1   text_col   5 non-null      object 
 2   float_col  5 non-null      float64
dtypes: float64(1), int64(1), object(1)
memory usage: 252.0+ bytes
"""
```

### `df.describe()`

查看数值型与分类型列的统计特征：

```python
import pandas as pd

int_values = [1, 2, 3, 4, 5]
text_values = ['alpha', 'beta', 'gamma', 'delta', 'epsilon']
float_values = [0.0, 0.25, 0.5, 0.75, 1.0]
df = pd.DataFrame({
    "int_col": int_values,
    "text_col": text_values,
    "float_col": float_values
})

df.describe(include='all')

""" 输出
         int_col text_col  float_col
count   5.000000        5   5.000000
unique       NaN        5        NaN
top          NaN    alpha        NaN
freq         NaN        1        NaN
mean    3.000000      NaN   0.500000
std     1.581139      NaN   0.395285
min     1.000000      NaN   0.000000
25%     2.000000      NaN   0.250000
50%     3.000000      NaN   0.500000
75%     4.000000      NaN   0.750000
max     5.000000      NaN   1.000000
"""
```

## Series

一维带标签数组，常用来表示单列。

```python
s = pd.Series([10, 20, 30], index=["a", "b", "c"])
print(s["a"])  # 10
```

### `se.plot()`

绘制直方图：

```python
plt.figure(figsize=(4, 3))
train['label'].value_counts().plot(kind='bar')
plt.show()
```

![绘制结果](https://cdn.dwj601.cn/images/20250911230551454.png)

## 文件操作

读：

```python
train_df = pd.read_table("train.txt", sep="\t", header=None)
dev_df = pd.read_table("dev.txt", sep="\t", header=None)
test_df = pd.read_table("test.txt", sep="\t", header=None)
```

- header 参数：表头所在行。例如 `header=0`。当 `header=None` 时表示没有表头或不加载表头；
- sep 参数：即 separate，表示分隔符。

添加列名：

```python
train_df.columns = ["feature", "label"]
dev_df.columns = ["feature", "label"]
test_df.columns = ["feature"]
```

写：

```python
train_df.to_csv("train.csv", sep="\t", index=False)
dev_df.to_csv("dev.csv", sep="\t", index=False)
test_df.to_csv("test.csv", sep="\t", index=False)
```

- index 参数：即是否携带行号。

## 数据处理

### 索引

分以下四种：

- `loc`：行号、列标签，能切片；
- `iloc`：行号、列号，能切片；
- `at`：单个元素（行号 + 列标签），更快；
- `iat`：单个元素（行号 + 列号），更快。

如下示例：

=== "`loc`"

    ```python
    # 准备数据
    df = pd.DataFrame({
        "name": ["Alice", "Bob", "Charlie"],
        "age": [23, 30, 27],
        "score": [85, 92, 78]
    })
    
    # 单个元素
    print(df.loc[0, "age"])
    
    """
    23
    """
    
    # 多行多列
    print(df.loc[0:1, ["name", "score"]])
    
    """
        name  score
    0  Alice     85
    1    Bob     92
    """
    ```

=== "`iloc`"

    ```python
    # 准备数据
    df = pd.DataFrame({
        "name": ["Alice", "Bob", "Charlie"],
        "age": [23, 30, 27],
        "score": [85, 92, 78]
    })
    
    # 单个元素
    print(df.iloc[0, 1])
    
    """
    23
    """
    
    # 多行多列
    print(df.iloc[0:2, [0, 2]])


    """
        name  score
    0  Alice     85
    1    Bob     92
    """
    ```

=== "`at`"

    ```python
    # 准备数据
    df = pd.DataFrame({
        "name": ["Alice", "Bob", "Charlie"],
        "age": [23, 30, 27],
        "score": [85, 92, 78]
    })
    
    # 单个元素（比 loc 更快）
    print(df.at[0, "age"])
    
    """
    23
    """
    ```

=== "`iat`"

    ```python
    # 准备数据
    df = pd.DataFrame({
        "name": ["Alice", "Bob", "Charlie"],
        "age": [23, 30, 27],
        "score": [85, 92, 78]
    })
    
    # 单个元素（比 iloc 更快）
    print(df.iat[0, 1])
    
    """
    23
    """
    ```

### 拷贝

如下示例：

```python
test_copy = test_df.copy(deep=True)
```

### 添加新列

如下示例：

```python
test_copy["label"] = "unknown"
```

### 布尔索引

如下示例：

```python
# 统计某个条件的数量
unknown_count = (test_copy["label"] == "unknown").sum()

# 筛选数据
filtered_df = test_copy[test_copy["label"] != "unknown"]
```

## 统计转换

### 按行合并

```python
merged_df = pd.concat([train_df, test_copy], axis=0)
```

### 按行遍历

这个问题很有代表性：Pandas 按行遍历是很多人第一直觉，但其实在性能上是“不得已而为之”的手段，因为 Pandas 更推荐向量化运算或 `apply`。完整地说，常见写法有以下几类：

**`iterrows()`，最常见的写法**。逐行返回 `(index, Series)`，使用起来直观，但慢，尤其是大数据量：

```python
for idx, row in df.iterrows():
    print(idx, row["int_col"], row["text_col"])
```

缺点：返回的是 `Series`，数据类型可能被强制转换（int → float）。

**`itertuples()`，更快的方式**。逐行返回 `namedtuple`，访问列时用属性（点操作符），速度比 `iterrows()` 快得多：

```python
for row in df.itertuples(index=True, name="Row"):
    print(row.Index, row.int_col, row.text_col)
```

注意：默认 `index=True`，会把索引当作第一个字段；`name=None` 时返回普通 tuple，更快但可读性差。

**`apply()`，用函数“按行处理”**。`apply(func, axis=1)` 可以让你写一个函数处理每一行，返回新的 `Series` 或 `DataFrame`：

```python
df["new_col"] = df.apply(lambda row: row["a"] + row["b"], axis=1)
```

适合“逐行生成新列”的情况。

**向量化（推荐优先）**。很多场景根本不需要逐行遍历，直接用列运算更高效：

```python
df["new_col"] = df["a"] + df["b"]
```

这其实等价于上面 `apply` 的效果，但性能要好得多。
