---
title: Tool Abuse
---

工具滥用指模型或攻击者以超权限、错误参数或高频方式调用外部系统。工具调用把模型的能力从「生成文本」扩展到「执行操作」，因此必须把安全边界从提示层下沉到工具执行层，模型生成的参数一律视为不可信输入。 [OWASP Top 10 for LLM Applications](https://genai.owasp.org/2024/11/17/owasp-reveals-2025-top-10-risks-for-llms-new-sponsorship-program/) 把它对应到 LLM06「Excessive Agency（过度授权）」：当工具被授予过多功能、权限或自主性时，模型的一次错误推理就会被放大成一次真实的外部副作用。早期插件时代的 LLM07「Insecure Plugin Design（不安全插件设计）」也是同一问题的前身表述，说明这条风险线随着 Agent 能力增强而持续存在。

## 快速开始

**最小权限与参数校验。** 每个工具只授予完成任务所需的最小权限，参数在服务端校验（类型、范围、白名单），不信任模型传来的任意参数。权限与校验放在工具层，模型只能「提议」不能「决定」。用 schema 约束参数是最常见的落地方式：

```python
from pydantic import BaseModel, EmailStr, Field

class SendEmail(BaseModel):
    to: list[EmailStr] = Field(max_length=10)      # 收件人白名单上限
    subject: str = Field(max_length=200)
    body: str = Field(max_length=10_000)
    idempotency_key: str
```

验证标准：模型生成的越界参数（超长正文、非白名单收件人、缺失幂等键）在进入工具前即被拒绝。

**速率、幂等与确认。** 对工具设置速率限制与配额，对非幂等操作（发信、扣款、删除）设计幂等键与重试保护；高风险操作加入人工确认点，避免一次错误推理造成不可逆后果。令牌桶 (Token Bucket) 是最常用的限流模型：

$$
B(t)=B(t_0)+(t-t_0)\cdot r
$$

其中 $r$ 是令牌补充速率，$B$ 是桶内令牌数并受容量上限约束；每个请求消耗一个令牌，令牌耗尽即拒绝。它把「平均速率」与「突发容忍」分开控制，比固定窗口更平滑。

**验证方式。** 尝试让模型生成超权限或越界参数，确认工具层拦截；对高频调用确认限流生效。把工具层校验的覆盖情况作为安全评测的固定检查项。

## 案例

场景：邮件发送工具。

- 输入：模型尝试调用发信工具，收件人与正文由模型生成。
- 关键步骤：工具要求收件人白名单与用户确认；服务端校验收件人、频率与权限，模型生成的参数不能绕过规则。
- 预期结果：越界收件人或未确认发送被拒绝，只有白名单内且经确认的邮件发出。
- 常见失败点与排查：把校验写在提示词里，模型被注入后绕过；或缺少幂等与限流导致重复/高频发送。排查时确认校验发生在工具执行层而非模型推理层。

## 相关主题

- [Function Calling](../build/base/function-calling.md)
- [API 鉴权](../../serving/deployment/security/api-authentication.md)
