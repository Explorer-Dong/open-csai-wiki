---
title: 科学计算库
status: todo
icon: simple/numpy
---

本文介绍 [NumPy](https://numpy.org/) 的用法。

> [!tip]
>
> NumPy: The fundamental package for scientific computing with Python.

NumPy 提供：

1. 包含任意同构元素的数组对象；
2. 对数组进行快速数学运算；
3. 线性代数、傅里叶变换、随机数生成。

## `np.array()`

使用 `np.array()` 方法可以使用列表或元组用来初始化一个 numpy 数组，数据类型为 `np.ndarray`，当然可以通过 `dtype` 指定元素类型。对于数据类型为 `ndarray` 的对象 `arr`，常用的方法包括但不限于以下几种：

### 创建和初始化

- `np.array(object, dtype=None)`：从列表、元组等对象创建一个 `ndarray`。
- `np.zeros(shape, dtype=float)`：创建一个全零的数组。
- `np.ones(shape, dtype=float)`：创建一个全一的数组。
- `np.empty(shape, dtype=float)`：创建一个未初始化的数组。
- `np.random.rand(shape)`：返回一个 $[0,1)$ 取值范围的数组。
- `np.arange(start, stop, step, dtype=None)`：创建一个等差数列的数组。
- `np.linspace(start, stop, num=50, dtype=None)`：创建一个等间隔的数组。

### 形状操作

- `arr.shape`：返回数组的形状维度。
- `arr.reshape(newshape)`：返回改变形状后的数组（注：新形状的元素个数与原来的元素个数必须相等）。
- `arr.flatten()`：返回将原数组展平后的一维数组。
- `arr.transpose()` 或 `arr.T`：返回转置后的数组。

### 索引和切片

- `arr[index]`：通过索引访问数组元素。
- `arr[start:stop:step]`：通过切片访问数组元素。
- `arr[x, y]`：高维元素可以用逗号分隔符访问（注：其中的 x 可以是数字、切片或数组）。

### 数学运算

`axis` 是轴的意思，numpy 中 `axis=0` 表示按列，`axis=1` 表示按行。

- `arr.sum(axis=None)`：计算数组元素的和。
- `arr.mean(axis=None)`：计算数组元素的平均值。
- `arr.std(axis=None)`：计算数组元素的标准差。
- `arr.var(axis=None)`：计算数组元素的方差。
- `arr.max(axis=None)`：返回数组的最大值。
- `arr.min(axis=None)`：返回数组的最小值。
- `arr.cumsum(axis=None)`：返回数组的前缀和。
- `arr.cumprod(axis=None)`：返回数组的前缀积。

### 逻辑运算

- `arr.all()`：检查数组中所有元素是否为真。
- `arr.any()`：检查数组中是否有任何元素为真。

### 排序和搜索

- `np.sort(arr)`：返回对数组进行排序的新数组。
- `np.argsort(arr)`：返回排序后每个位置在原数组中的位置索引。
- `np.argmax(arr)`：返回数组中最大值的索引。
- `np.argmin(arr)`：返回数组中最小值的索引。

### 其他常用方法

- `arr.astype(dtype)`：将数组转换为指定数据类型。
- `arr.copy()`：创建数组的副本。
- `arr.tolist()`：将数组转换为列表。

## 矩阵运算

numpy 的矩阵运算没有 matlab 来的那么显然，因为有一些隐式的规则。需要注意的是所有的容器类型全都是 `np.ndarray`。共分为以下几种数据结构：

- 标量 (Scalar)：一个单独的数字，没有维度；
- 向量 (Vector)：一维数组；
- 矩阵 (Matrix)：二维数组；
- 张量 (Tensor)：三维或更多维度的数组。

### 元素级运算

`+, -, *, /, ^, sqrt` 等和 **标量** 进行运算时都是元素级运算。和 **形状相同** 的数组进行运算时也都是元素级运算。例如：

```python
# 输入
a = np.array([[1, 2, 3],
              [4, 5, 6]])
b = np.array([[7, 8, 9],
              [10, 11, 12]])

print(a + 1)
print(a - 2)
print(a * b)
print(a / b)

""" 输出
[[2 3 4]
 [5 6 7]]
[[-1  0  1]
 [ 2  3  4]]
[[ 7 16 27]
 [40 55 72]]
[[0.14285714 0.25       0.33333333]
 [0.4        0.45454545 0.5       ]]
"""
```

若形状不同，则会报错：

```bash
ValueError: operands could not be broadcast together with shapes (2,3) (3,3)
```

### 向量级运算

分为两类：内积（点积）和外积（叉积）

- 内积相当于 $A_{1\times n}\times B_{n\times 1}=x$
- 外积相当于 $A_{n\times 1} \times B_{1\times m}=C_{n\times m}$

**内积（点积）**。常用 `@` 运算符、`np.dot(a, b)` 和 `a.dot(b)` 方法。运算结果为标量。此时可以理解为矩阵运算，但是由于 numpy 的广播机制，我们并不需要保证对齐为 $1\times n,n\times 1$ 即可自动进行正确运算。例如：

```python
# 输入
a = np.array([1, 2, 3])
b = np.array([7, 8, 9])

c1 = a @ b
c2 = np.dot(a, b)
c3 = a.dot(b)

print(c1, type(c1))
print(c2, type(c2))
print(c3, type(c3))

""" 输出
50 <class 'numpy.int64'>
50 <class 'numpy.int64'>
50 <class 'numpy.int64'>
"""
```

注：两向量长度必须完全一致，否则报「矩阵没有对齐」的错误：

```makefile
ValueError: matmul: Input operand 1 has a mismatch in its core dimension 0, with gufunc signature (n?,k),(k,m?)->(n?,m?) (size 3 is different from 4)
```

**外积（叉积）**。常用 `np.outer(a, b)` 方法。运算结果为矩阵。例如：

```python
# 输入
a = np.array([1, 2, 3, 3])
b = np.array([7, 8, 9])

c = np.outer(a, b)

print(type(c))
print(c)

""" 输出
<class 'numpy.ndarray'>
[[ 7  8  9]
 [14 16 18]
 [21 24 27]
 [21 24 27]]
"""
```

**进阶**。如果参与运算的不是向量，而是二维矩阵甚至高维张量，该方法会将非向量数据「展开成向量」进行运算。例如：

```python
# 输入
a = np.array([[[[[1, 2]]], [[[3, 4]]], [[[5, 6]]]], [[[[7, 8]]], [[[9, 1]]], [[[2, 3]]]]])
b = np.array([[3, 4, 5], [1, 1, 1]])

c = np.outer(a, b)

print(type(c))
print(a.shape)
print(b.shape)
print(c.shape)
print(c)

"""输出
<class 'numpy.ndarray'>
(2, 3, 1, 1, 2)
(2, 3)
(12, 6)
[[ 3  4  5  1  1  1]
 [ 6  8 10  2  2  2]
 [ 9 12 15  3  3  3]
 [12 16 20  4  4  4]
 [15 20 25  5  5  5]
 [18 24 30  6  6  6]
 [21 28 35  7  7  7]
 [24 32 40  8  8  8]
 [27 36 45  9  9  9]
 [ 3  4  5  1  1  1]
 [ 6  8 10  2  2  2]
 [ 9 12 15  3  3  3]]
"""
```

### 矩阵级运算

常用 `@` 运算符、`np.dot(a, b)` 和 `a.dot(b)` 方法。运算结果为矩阵。

```python
# 输入
a = np.array([[1, 2, 3],
              [4, 5, 6]])

b = np.array([[7, 8, 9],
              [10, 11, 12]])

c1 = a @ b.T
c2 = np.dot(a, b.T)

print(a.shape, b.shape, c1.shape, c2.shape)
print(c1)
print(c2)

"""输出
(2, 3) (2, 3) (2, 2) (2, 2)
[[ 50  68]
 [122 167]]
[[ 50  68]
 [122 167]]
"""
```

解析：

1. 全都是矩阵。此时与向量自动对齐不同，矩阵运算需要我们手动进行对齐，否则报「矩阵没有对齐」的错误；
2. 既有矩阵也有向量。此时同样需要我们手动对齐，否则报「矩阵没有对齐」的错误。

### 矩阵运算小结

我们可以将上述总结为「元素级」运算和「矩阵级」运算。向量和矩阵统称为矩阵。张量运算机制暂时不予讨论

- 对于元素级运算。如果矩阵直接和标量运算就没有约束；如果和另外一个矩阵进行标量运算就需要保证两个矩阵的 **形状完全一致**；
- 对于矩阵级运算。如果 **只有向量** 参与运算则无需对齐；如果 **存在矩阵** 参与运算则必须手动对齐。并且此时 `@` 运算符和 `np.dot(a, b)` 以及 `a.dot(b)` 完全相同。
