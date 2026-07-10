---
title: 常用标准库
status: todo
icon: material/shield-bug
---

## I/O 库

主要介绍以下四种：

- 标准输入输出：`std::cin`、`std::cout`；
- 文件输入输出：`std::ifstream`、`std::ofstream`、`std::fstream`；
- 格式控制：`std::setprecision`；
- 字符输入输出：`get`、`put`、`getline`；

### 标准输入输出

TODO

### 文件输入输出

ifstream 只读：

```cpp
#include <iostream>
#include <fstream>
#include <string>

int main() {
    std::ifstream fin;

    // 在写入前，确保 test.txt 文件存在且有内容
    // 例如，可以手动创建一个 test.txt 并写入 "Hello World"
    fin.open("test.txt", std::ios::in);

    if (!fin.is_open()) {
        std::cerr << "Error opening file for reading!" << std::endl;
        return 1;
    }

    std::string word;
    while (fin >> word) {
        std::cout << word << " ";
    }

    fin.close();

    return 0;
}
```

ofstream 只写：

```cpp
#include <iostream>
#include <fstream>

int main() {
    std::ofstream fout;
    
    fout.open("test.txt", std::ios::out);

    if (!fout.is_open()) {
        std::cerr << "Error opening file for writing!" << std::endl;
        return 1;
    }
    
    for (int i = 1; i <= 10; i++) {
        fout << i << " ";
    }
    
    fout.close();
    
    return 0;
}
```

fstream 读写：

```cpp
#include <iostream>
#include <fstream>
#include <string>
#include <vector>

int main() {
    std::fstream fs;
    
    // 1. 写入内容到文件
    fs.open("test.txt", std::ios::out);
    if (!fs.is_open()) {
        std::cerr << "Error opening file for writing!" << std::endl;
        return 1;
    }
    fs << "Line 1" << std::endl;
    fs << "Line 2" << std::endl;
    fs.close();

    // 2. 从文件读取内容并打印
    fs.open("test.txt", std::ios::in);
    if (!fs.is_open()) {
        std::cerr << "Error opening file for reading!" << std::endl;
        return 1;
    }
    std::string line;
    std::cout << "Reading from file:" << std::endl;
    while (std::getline(fs, line)) {
        std::cout << line << std::endl;
    }
    fs.close();

    return 0;
}
```

## 标准模板库

标准模板库 (Standard Template Library, STL) 是 C++ 标准库中，专注于数据结构和算法的部分。主要由以下几个核心组件构成：

- 容器 (Containers)：用来管理和存储数据的类模板
    - 序列容器：`std::vector`、`std::list`、`std::deque`；
    - 关联容器：`std::map`、`std::set`、`std::multimap`、`std::multiset`（基于键值，通常有序）；
    - 无序关联容器：`std::unordered_map`、`std::unordered_set`（基于哈希，无序但查找快)。
- 算法 (Algorithms)：用来操作容器中数据的函数模板
    - 例如 `<algorithm>` 中的 `std::sort`（排序）、`std::find`（查找）、`std::copy`（复制）、`std::for_each`（遍历）。
- 迭代器 (Iterators)：扮演着连接容器和算法的「胶水」角色。它提供了一种统一的方式来访问容器中的元素，使得算法可以不关心容器的具体内部实现，直接通过迭代器进行操作。
- 函数对象 (Function Objects / Functors)：行为像函数的对象，可以作为参数传递给算法，用于自定义算法的行为。例如 `std::greater<int>()`。

STL 最初是由 Alexander Stepanov 和 Meng Lee 在惠普实验室开发的，是一个独立的库。因为它设计得非常出色，后来在1994年被 C++ 标准委员会采纳，并整合进了 C++ 标准库中。

由于这段历史，以及 STL 本身就是一个庞大且自成体系的“库中库”，所以人们习惯上仍然会用 STL 这个名字来特指标准库中源自于它的那部分（容器、算法、迭代器等）。

### 容器

顺序容器

`std::vector<T>`：动态数组

`std::list<T>`：双向链表

`std::array<T, N>`：定长数组

`std::deque<T>`：双端队列

关联容器

`std::set`, `std::map`：有序红黑树容器，O(logN)

`std::unordered_set`, `std::unordered_map`：哈希容器，O(1) 平均查找时间

`std::multiset`, `std::multimap`：允许重复键

### 算法

> 排序：`std::sort`, `std::stable_sort`, `std::partial_sort`
>
> 查找：`std::find`, `std::binary_search`, `std::find_if`
>
> 修改：`std::reverse`, `std::rotate`, `std::replace`
>
> 统计：`std::count`, `std::accumulate`（需 `<numeric>`）
>
> 拷贝/移动：`std::copy`, `std::move`, `std::swap`

reverse：想要翻转一个容器，大约有以下三种方法，以 string 为例。

1）方法一：使用 `std::reverse()` 原地翻转

```c++
#include <algorithm>
#include <iostream>

using namespace std;

int main() {
    string s = "hello world!";
    cout << s << "\n";

    reverse(s.begin(), s.end());
    cout << s << "\n";

    return 0;
}
```

2）方法二：使用 `std::reverse_copy` 拷贝翻转

```c++
#include <algorithm>
#include <iostream>

using namespace std;

int main() {
    string s = "hello world!";
    cout << s << "\n";

    string t(s.size(), ' ');  // 需要提前申请好内存空间
    reverse_copy(s.begin(), s.end(), t.begin());
    cout << t << "\n";

    return 0;
}
```

3）方法三：重新构造

```c++
#include <algorithm>
#include <iostream>

using namespace std;

int main() {
    string s = "hello world!";
    cout << s << "\n";

    string t = string(s.rbegin(), s.rend());
    cout << t << "\n";

    return 0;
}
```

上述均输出：

```c++
hello world!
!dlrow olleh
```

### 迭代器

迭代器是一种行为类似指针的对象，它是连接容器和算法的桥梁。通过迭代器，算法可以统一地遍历和操作不同类型的容器，而无需关心容器的内部实现细节。

每种容器都有自己的迭代器类型，例如 `std::vector<int>::iterator`。常用的操作有：`begin()` 获取指向第一个元素的迭代器，`end()` 获取指向末尾（最后一个元素的下一个位置）的迭代器，`++` 移动到下一个元素，`*` 解引用获取元素值。

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {10, 20, 30, 40, 50};

    // 使用迭代器遍历 vector
    for (std::vector<int>::iterator it = v.begin(); it != v.end(); ++it) {
        std::cout << *it << " "; // 输出: 10 20 30 40 50
    }
    std::cout << std::endl;

    return 0;
}
```

### 函数对象

函数对象（Functor）是一个重载了 `operator()` 的类的对象。它的行为像一个函数，可以被调用，但同时又可以拥有自己的状态。在 STL 中，函数对象常被用作算法的参数，以实现自定义的逻辑，例如自定义排序规则。

```cpp
#include <iostream>
#include <vector>
#include <algorithm>

// 定义一个函数对象，用于比较整数（降序）
struct GreaterThan {
    bool operator()(int a, int b) const {
        return a > b;
    }
};

int main() {
    std::vector<int> v = {5, 2, 8, 1, 9};
    
    // 使用函数对象作为 sort 的第三个参数
    std::sort(v.begin(), v.end(), GreaterThan()); 
    
    for (int i : v) {
        std::cout << i << " "; // 输出: 9 8 5 2 1
    }
    std::cout << std::endl;

    return 0;
}
```

## 并发库

创建线程：`std::thread`

等待线程结束：`.join()`, `.detach()`

同步机制：`std::mutex`, `std::lock_guard`, `std::unique_lock`

原子变量：`std::atomic<T>`

任务异步：`std::async`, `std::future`, `std::promise`

下面是一个创建线程和使用互斥锁 `std::mutex` 保护共享数据的简单示例。

```cpp
#include <iostream>
#include <thread>
#include <vector>
#include <mutex>

std::mutex mtx; // 互斥锁
int shared_counter = 0;

// 一个简单的函数，会被多个线程执行
void increment_counter() {
    for (int i = 0; i < 10000; ++i) {
        std::lock_guard<std::mutex> lock(mtx); // 加锁，函数结束时自动解锁
        shared_counter++;
    }
}

int main() {
    // 创建两个线程
    std::thread t1(increment_counter);
    std::thread t2(increment_counter);

    // 等待两个线程执行完毕
    t1.join();
    t2.join();

    std::cout << "Final counter value: " << shared_counter << std::endl; // 期望输出 20000

    return 0;
}
```
