---
title: 隐私泄露
---

应用隐私泄露发生在提示、日志、检索内容、工具输出或模型回答暴露敏感数据时。泄露可能来自训练数据记忆、检索越权、日志留存过度或跨租户隔离失效，需要在这些环节分别设防，而不是只处理其中一个。 [OWASP Top 10 for LLM Applications](https://genai.owasp.org/2024/11/17/owasp-reveals-2025-top-10-risks-for-llms-new-sponsorship-program/) 将其拆成两类：LLM02「Sensitive Information Disclosure（敏感信息泄露）」指模型在输出中暴露训练数据或上下文里的秘密，LLM07「System Prompt Leakage（系统提示泄露）」指系统提示中不应公开的配置、角色设定或过滤规则被诱导输出。二者共同的根因是「模型无法可靠区分哪些内容可公开」，因此防线要落到数据最小化、访问控制与脱敏上，而不是依赖模型自觉。

## 快速开始

**数据最小化与访问控制。** 只收集和处理必要数据，对检索与工具访问做权限过滤，确保用户只能触达自己有权查看的内容；跨租户与跨用户隔离在服务端强制执行，不依赖提示词保证。检索层必须携带并强制权限约束，而不是应用层事后过滤：

```python
results = vector_search(query, top_k=50, tenant=user.tenant)
results = [r for r in results if r.owner == user.id or r.shared]
```

验证标准：把权限条件放在查询或索引过滤里，使越权文档在召回阶段就被排除，而不是先召回再拼进上下文。

**脱敏与保留期。** 对日志中的敏感字段（身份证号、手机号、密钥、地址等）做遮蔽或加密，并设定保留期与删除策略，避免敏感数据长期留存。脱敏要覆盖提示、工具返回与模型输出等所有可能落盘的内容。最小可用的正则脱敏示例：

```python
import re

def mask(text):
    text = re.sub(r"\b\d{18}\b", "[ID]", text)          # 身份证号
    text = re.sub(r"1[3-9]\d{9}", "[PHONE]", text)      # 手机号
    text = re.sub(r"(?i)(api[_-]?key|secret)\s*[:=]\s*\S+", r"\1=[REDACTED]", text)
    return text
```

**上线前测试。** 用安全测试验证用户无法通过构造提示取得他人记录，并对训练数据记忆做对抗测试。验证方式：模拟跨用户/跨租户查询，确认返回为空或拒绝，且日志中没有明文敏感字段。

## 案例

场景：客服与 RAG 系统。

- 输入：客服日志与用户查询。
- 关键步骤：日志默认遮蔽身份证号等敏感字段；RAG 索引按用户权限过滤检索结果；安全测试尝试让系统返回他人记录。
- 预期结果：遮蔽生效，越权检索返回空，测试无法借提示取得他人数据。
- 常见失败点与排查：只遮蔽日志却未过滤检索；或权限过滤在应用层而非检索层，导致拼接上下文时泄露。排查时检查检索查询是否携带并强制了权限约束。

## 相关主题

- [多租户隔离](../../serving/deployment/security/multi-tenant-isolation.md)
- [数据隐私](../../development/security/data-privacy.md)
