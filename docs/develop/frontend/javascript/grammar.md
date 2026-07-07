---
title: 语法基础
icon: material/stairs-up
---

本文介绍 JavaScript 的语法基础，即不 `import` 任何包的情况下涉及的内容。

## 数据类型

JavaScript 是动态类型语言，定义变量时不需要声明类型，赋值时会自动确定。实际工程中如果需要类型约束，通常使用 TypeScript 或 JSDoc 配合类型检查工具。

JavaScript 的数据类型可以分为基础类型和对象类型。基础类型不可变，对象类型通常可以被原地修改。

### 基础类型

**`boolean`**。布尔型，表示二元逻辑。示例用法：

```js
const isActive = true;
```

**`number`**。数值型，统一表示整数和浮点数。示例用法：

```js
const count = 10;
const price = 3.14;
```

**`bigint`**。大整数型，适合表达超过安全整数范围的整数。示例用法：

```js
const id = 9007199254740993n;
```

**`string`**。字符串，表示由字符组成的数据。示例用法：

```js
// 基本用法
const name = "Alice";

// 字符转义
const text = "hello\tworld";

// 字符模板
const age = 18;
const info = `My age is ${age}`;

// 字符串拼接
const parts = ["2026", "07", "07"];
const date = parts.join("-");  // 2026-07-07
```

**`undefined`**。表示变量已经声明但还没有被赋值。示例用法：

```js
let value;
console.log(value);  // undefined
```

**`null`**。表示主动设置为空值。示例用法：

```js
const selectedUser = null;
```

**`symbol`**。表示唯一标识，常用于对象属性键。示例用法：

```js
const key = Symbol("id");
const user = {
    [key]: 1,
    name: "Alice",
};
```

### 对象类型

**`object`**。对象是一组键值对，常用于表达结构化数据。示例用法：

```js
const person = {
    name: "Alice",
    age: 25,
};

person.age = 26;
person.city = "New York";

console.log(person.name);
console.log(person["age"]);
```

**`array`**。数组是一组有序元素。示例用法：

```js
// 初始化
const fruits = ["apple", "banana", "cherry"];

// 初始化（数组推导的常见替代写法）
const squares = Array.from({ length: 5 }, (_, index) => index ** 2);

// 尾插入
fruits.push("orange");

// 尾删除
fruits.pop();

// 按值删除
const nextFruits = fruits.filter((fruit) => fruit !== "banana");

// 索引
console.log(fruits[0]);

// 切片
console.log(fruits.slice(1, 3));
```

**`function`**。函数也是对象，可以赋值给变量、作为参数传递，也可以作为返回值。示例用法：

```js
const add = (a, b) => a + b;

console.log(add(1, 2));  // 3
```

### 不同类型数据的内存机制

JavaScript 中基础类型和对象类型的赋值逻辑不同。

对于基础类型，赋值会复制值本身，之后修改其中一个变量不会影响另一个变量。例如：

```js
let s = "hello";
let t = s;

t += " world";

console.log(s);  // hello
console.log(t);  // hello world
```

对于对象类型，赋值会复制对象引用，之后通过任意引用修改对象，其他引用也会观察到变化。例如：

```js
const a = [1, 2, 3];
const b = a;
const c = b;

c[0] = -1;

console.log(a);  // [-1, 2, 3]
console.log(b);  // [-1, 2, 3]
console.log(c);  // [-1, 2, 3]
```

如果只需要浅拷贝数组或对象，可以使用展开语法：

```js
const oldList = [1, 2, 3];
const newList = [...oldList];

const oldUser = { name: "Alice", age: 25 };
const newUser = { ...oldUser, age: 26 };
```

## 运算符

JavaScript 有以下常见运算符：

```bash
+       -       *       **      /       %       ++      --
=       +=      -=      *=      /=      %=      **=
==      !=      ===     !==     >       <       >=      <=
&&      ||      !       ??      ?.      ?:
&       |       ^       ~       <<      >>      >>>
```

JavaScript 的 [运算符优先级](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Operator_precedence)（越往下等级越低）：

| 运算符 | 描述 |
| --- | --- |
| `()`、`[]`、`.`、`?.`、`new` | 分组、访问、调用和实例化 |
| `x++`、`x--` | 后置自增和自减 |
| `!x`、`~x`、`+x`、`-x`、`++x`、`--x`、`typeof`、`void`、`delete`、`await` | 一元运算 |
| `**` | 幂运算 |
| `*`、`/`、`%` | 乘、除、取余 |
| `+`、`-` | 加和减 |
| `<<`、`>>`、`>>>` | 位移 |
| `<`、`<=`、`>`、`>=`、`in`、`instanceof` | 比较和成员检测 |
| `==`、`!=`、`===`、`!==` | 相等性比较 |
| `&` | 按位与 AND |
| `^` | 按位异或 XOR |
| `|` | 按位或 OR |
| `&&` | 逻辑与 AND |
| `||`、`??` | 逻辑或 OR 和空值合并 |
| `? :` | 条件表达式 |
| `=`、`+=`、`-=`、`*=`、`/=`、`%=` | 赋值 |

实际项目中，优先使用 `===` 和 `!==` 做相等性判断，避免 `==` 的隐式类型转换造成误解。

## 流程控制

条件语句 `if`、`else if`、`else` 用于分支控制。例如：

```js
const age = 20;

if (age >= 18) {
    console.log("成人");
} else {
    console.log("未成年");
}
```

`switch` 适合处理多个离散分支。例如：

```js
const role = "admin";

switch (role) {
    case "admin":
        console.log("管理员");
        break;
    case "user":
        console.log("普通用户");
        break;
    default:
        console.log("访客");
}
```

循环语句 `for`、`for...of` 和 `while` 用于重复控制。例如：

```js
// for 循环
for (let i = 0; i < 5; i += 1) {
    console.log(i);
}

// for...of 循环
for (const item of ["a", "b", "c"]) {
    console.log(item);
}

// while 循环
let count = 0;
while (count < 3) {
    console.log("count:", count);
    count += 1;
}
```

## 函数

JavaScript 可以使用 `function` 关键字定义函数，也可以使用箭头函数定义函数表达式。例如：

```js
function greet(name, school = "MIT") {
    return `Hello ${name}, welcome to ${school}!`;
}

const message = greet("Alice");
console.log(message);  // Hello Alice, welcome to MIT!
```

### 箭头函数

箭头函数适合编写短函数，也常用于数组方法和回调函数。例如：

```js
const square = (x) => x ** 2;

console.log(square(5));  // 25
```

在数组处理中，箭头函数经常作为参数直接传入：

```js
const nums = [1, 2, 3];
const result = nums.map((x) => x * 2);

console.log(result);  // [2, 4, 6]
```

箭头函数没有自己的 `this`，它会捕获外层作用域中的 `this`。因此，对象方法通常更适合使用方法简写或普通函数。

### 参数的收集与解包

JavaScript 函数的参数收集与解包机制让参数传递更灵活。

函数定义处可以使用剩余参数 `...args` 收集多余的位置参数：

```js
function addAll(...args) {
    let total = 0;
    for (const value of args) {
        total += value;
    }
    return total;
}

console.log(addAll(1, 2, 3));  // 6
```

函数调用处可以使用展开语法 `...` 展开数组：

```js
const nums = [1, 2, 3];

console.log(addAll(...nums));  // 6
```

对象参数可以使用解构语法读取指定字段：

```js
function describe({ name, city = "Unknown" }) {
    return `${name} lives in ${city}`;
}

const info = { name: "Bob", city: "Singapore" };

console.log(describe(info));  // Bob lives in Singapore
```

## 对象与类

JavaScript 的对象可以直接用对象字面量创建，也可以通过类创建。

```js
const user = {
    name: "Alice",
    age: 25,
    greet() {
        return `Hello, ${this.name}`;
    },
};

console.log(user.greet());  // Hello, Alice
```

### 类

JavaScript 使用 `class` 关键字定义类，用于面向对象编程。

```js
class Dog {
    #age;

    constructor(name, age) {
        this.name = name;
        this.#age = age;
    }

    #calculateDogYears() {
        return this.#age * 7;
    }

    getHumanAge() {
        const humanAge = this.#calculateDogYears();
        return `${this.name} is ${humanAge} years old in human years.`;
    }
}

const dog = new Dog("Buddy", 3);

console.log(dog.getHumanAge());  // Buddy is 21 years old in human years.
// dog.#calculateDogYears();  // SyntaxError
```

`#` 开头的字段和方法是私有成员，只能在类内部访问。

### 原型

JavaScript 的对象通过原型链复用属性和方法。使用 `class` 定义类时，本质上仍然会把方法放到构造函数的 `prototype` 上。

```js
class Counter {
    constructor(value) {
        this.value = value;
    }

    inc() {
        this.value += 1;
    }
}

const counter = new Counter(0);

console.log(Object.getPrototypeOf(counter) === Counter.prototype);  // true
```

理解原型链可以帮助分析属性查找、方法复用和继承行为。

## 作用域

JavaScript 查找变量时，会先查找当前作用域，再沿着外层词法作用域逐层向外查找，直到全局作用域。

`let` 和 `const` 是块级作用域，`var` 是函数作用域。现代代码优先使用 `const`，只有需要重新赋值时才使用 `let`，不建议在新代码中使用 `var`。

```js
const globalCount = 0;

function outer() {
    let localCount = 10;

    function inner() {
        localCount += 1;
        console.log(localCount);
    }

    inner();
}

outer();  // 11
console.log(globalCount);  // 0
```

函数可以访问定义于外层作用域中的变量，这种机制称为闭包。例如：

```js
function createCounter() {
    let count = 0;

    return function inc() {
        count += 1;
        return count;
    };
}

const inc = createCounter();

console.log(inc());  // 1
console.log(inc());  // 2
```

## 异常

现实场景下，程序的输入或运行几乎不可能始终正确。为了避免程序在出现异常时直接宕机，开发人员需要主动编写代码，应对可能的异常。

基本异常处理逻辑主要分两步：

1. 抛出异常：JavaScript 使用 `throw` 关键字抛出异常。
2. 捕获和处理异常：JavaScript 使用 `try`、`catch` 和 `finally` 关键字捕获和处理异常。

### 抛出异常

基本语法：

```js
throw new Error("something error");
```

常见异常：

```js
// 类型错误
throw new TypeError("expected number");

// 范围错误
throw new RangeError("value out of range");

// 普通错误
throw new Error("unexpected error");
```

### 捕获和处理异常

> [!note] 原则
>
> 能在当前层级处理的异常就立刻处理，无法处理的异常就抛出让上层处理。

实际编码过程中，通常需要配合日志和明确的错误响应：

```js
try {
    // 正常业务逻辑
    doSomething();
} catch (error) {
    if (error instanceof TypeError) {
        // 可预见的、可解决的异常，直接处理
        recover(error);
    } else {
        // 不可预见的异常，先记录，再抛出
        console.error("unexpected error", error);
        throw error;
    }
} finally {
    // 无论上述结果如何，都会执行这段逻辑，例如释放资源等
    cleanup();
}
```

## 断言

JavaScript 语言本身没有专门的 `assert` 语句。开发中可以使用显式条件判断抛出异常：

```js
if (count < 0) {
    throw new RangeError("count must be non-negative");
}
```

Node.js 中可以使用内置的 `node:assert` 模块做测试断言；浏览器中也有 `console.assert()`，但它更偏向调试输出，不适合作为生产代码的业务校验。

## 迭代器

迭代器 (Iterator) 是一种支持逐元素取出的对象。它的核心接口是 `next()`，每次调用都会返回形如 `{ value, done }` 的对象。

迭代器的特点是惰性计算，即不提前生成全部结果，而是在调用 `next()` 时才计算下一个元素。

### 可迭代对象

可迭代对象 (Iterable Object) 需要实现 `[Symbol.iterator]()` 方法。常见的可迭代对象有 `Array`、`Map`、`Set`、`String` 等。

```js
const nums = [1, 2, 3];

const iterator = nums[Symbol.iterator]();

console.log(iterator.next());  // { value: 1, done: false }
console.log(iterator.next());  // { value: 2, done: false }
console.log(iterator.next());  // { value: 3, done: false }
console.log(iterator.next());  // { value: undefined, done: true }
```

`for...of` 循环本质上就是在帮我们自动调用迭代器。例如：

```js
const nums = [1, 2, 3];

for (const num of nums) {
    console.log(num);
}
```

### 迭代器方法

数组常见的迭代方法有 `map()`、`filter()`、`reduce()`、`some()` 和 `every()`。

`map()` 用于把一个函数依次应用到数组的每个元素上，返回新数组。例如：

```js
const nums = [1, 2, 3];
const result = nums.map((x) => x * 2);

console.log(result);  // [2, 4, 6]
```

`filter()` 用于按条件过滤元素，返回条件为 `true` 的元素组成的新数组。例如：

```js
const nums = [1, 2, 3, 4, 5];
const result = nums.filter((x) => x % 2 === 0);

console.log(result);  // [2, 4]
```

`reduce()` 用于把数组折叠为一个结果。例如：

```js
const nums = [1, 2, 3];
const total = nums.reduce((sum, x) => sum + x, 0);

console.log(total);  // 6
```

> [!note] 迭代器只能被消费一次
>
> 如果一个迭代器已经被 `for...of` 或 `next()` 消费过，再次遍历就不会得到已经取出的元素。

## 生成器

生成器 (Generator) 是一种特殊的迭代器，主要用于编写惰性计算逻辑。生成器不会一次性返回所有结果，而是每次执行到 `yield` 时返回一个值，并暂停函数状态；下一次调用 `next()` 时，再从暂停的位置继续执行。

### 生成器基本用法

手动调用 `next()`：

```js
function* countUpTo(limit) {
    let count = 1;
    while (count <= limit) {
        yield count;
        count += 1;
    }
}

const nums = countUpTo(3);

console.log(nums.next());  // { value: 1, done: false }
console.log(nums.next());  // { value: 2, done: false }
console.log(nums.next());  // { value: 3, done: false }
console.log(nums.next());  // { value: undefined, done: true }
```

配合 `for...of` 循环：

```js
function* countUpTo(limit) {
    let count = 1;
    while (count <= limit) {
        yield count;
        count += 1;
    }
}

for (const num of countUpTo(3)) {
    console.log(num);
}

// 1
// 2
// 3
```

## 异步语法

`Promise` 用于表示一个未来才会完成的异步结果，`async` 和 `await` 可以把 Promise 链写成更接近同步代码的形式。例如：

```js
async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
}
```

在 Node.js 或现代浏览器的 ES Module 中，可以使用顶层 `await`：

```js
const data = await fetchJson("https://example.com/data.json");

console.log(data);
```

`await` 只能等待 Promise 变成成功或失败状态，不会让 CPU 密集计算自动变成并行任务。耗时计算仍然需要拆分任务，或者交给 Web Worker、子进程等机制处理。
