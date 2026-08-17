---
title: 日志与审计
---

日志与审计记录谁在何时以何种权限执行了什么操作，用于排障、合规与事件响应。完整的审计链路需要贯穿网关、推理引擎与工具调用，使每次请求都能以唯一标识关联起来。

日志管理有成熟的标准框架。NIST 将日志管理划分为生成、传输、存储、分析与处置的完整生命周期，并强调日志作为证据需要独立保护与保留，参见 [NIST SP 800-92](https://csrc.nist.gov/pubs/sp/800/92/final)；OWASP 的 [Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) 则给出「该记什么、不该记什么、如何防篡改」的可操作清单。对 LLM 服务而言，审计的价值不止合规，更在于出事后能还原调用链：只有 request ID 全链路一致，才能把网关的鉴权决策、推理层的 token 用量与工具层的外部调用拼成一条完整证据链。

## 快速开始

每条日志至少记录 request ID、主体（tenant/用户）、模型、策略决策结果、延迟和错误码。request ID 由网关生成并透传到推理层与工具层，是关联调用链的主键，应保证全链路一致。

request ID 应随请求上下文透传而非各层各自生成，否则同一请求在不同层会得到不同标识、无法关联。一条结构化日志的最小形状如下：

```json
{
  "request_id": "req_01J2X8K4T9",
  "tenant_id": "tenant-a",
  "model": "llm-70b",
  "decision": "allow",
  "policy_rule": "tenant-a.invoke-model",
  "latency_ms": 812,
  "status": 200
}
```

敏感提示与输出默认最小化：不记录完整提示词和生成内容，或先脱敏再落盘。对必须保留的字段（如错误片段）做哈希或截断，并设置保留期，到期自动删除，减少合规与泄露风险。

日志本身需要保护：审计存储使用访问控制和防篡改策略，如只追加 (append-only)、写入后哈希链或对象存储的版本锁定，防止攻击者或内部人员篡改证据。访问审计日志的操作也应被记录。

哈希链让任何一处篡改都会破坏后续所有校验值，从而暴露改动。设 $H$ 为密码学哈希、$r_i$ 为第 $i$ 条记录、`||` 为拼接，则第 $i$ 条记录之后写入的链头为：

$$
H_i = H\bigl(H_{i-1} \,\|\, r_i\bigr)
$$

验证时只需重算各层哈希并与链尾比对，任一条被改都会导致哈希不匹配。最小实现：

```python
import hashlib

def append(chain_tip: str, record: bytes) -> str:
    return hashlib.sha256(chain_tip.encode() + record).hexdigest()

def verify(records: list[bytes], tip: str) -> bool:
    state = ""
    for r in records:
        state = append(state, r)
    return state == tip
```

验证：发起一次请求，确认网关、模型、工具三处日志都能用同一 request ID 关联；检查日志中不含完整密钥和原始提示；确认审计日志无法被普通角色修改或删除。

## 案例

发生安全事件后，运维以 request ID 为线索，在网关日志找到鉴权与策略决策，在推理日志找到 token 用量与延迟，在工具日志找到外部调用记录，重建完整调用链，定位是越权、数据泄露还是资源滥用。

以一次越权为例：网关日志记录了该请求的决策结果与命中规则，推理日志记录了模型与实际用量，工具日志记录了外部调用。三者用同一 request ID 关联后，运维能看到「身份是谁 -> 通过了哪条规则 -> 实际调用了什么」，从而区分是策略配置错误还是凭证被滥用。

审计存储采用独立访问控制和防篡改策略：仅审计角色可读，写入后不可修改，删除需要额外审批。这样即使生产环境被入侵，审计记录仍然可信。哈希链只保证「改动可被发现」，仍须配合只追加的访问控制，否则攻击者可直接重写整个链并重新计算链尾。

常见失败点：request ID 在网关与推理层不一致导致无法关联；日志记录了完整提示词和密钥；审计日志与业务日志混存且权限过宽。排查方向是检查日志 schema 是否统一、脱敏是否生效、审计存储的写入策略是否落地。

## 相关主题

- [API 鉴权](./api-authentication.md)
- [Monitoring](../base/monitoring.md)
