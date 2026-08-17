---
title: 权限控制
---

权限控制 (Authorization) 决定已认证主体能调用哪些模型、工具、数据和管理操作。它承接鉴权结果，把「这个身份能做什么」落成可执行策略，并在每次请求时统一执行。

权限模型经历了从自主访问控制 (Discretionary Access Control, DAC) 到强制访问控制 (Mandatory Access Control, MAC)，再到基于角色的访问控制 (Role-Based Access Control, RBAC) 与基于属性的访问控制 (Attribute-Based Access Control, ABAC) 的演进。RBAC 把权限绑定到角色、再分配给主体，便于批量管理，模型定义见 [NIST RBAC](https://csrc.nist.gov/projects/role-based-access-control)；ABAC 则用主体、资源、动作与环境属性组合求值，表达力更强、适合多租户与细粒度场景，定义见 [NIST SP 800-162](https://csrc.nist.gov/pubs/sp/800/162/final)。对 LLM 平台而言，越权调用管理接口或昂贵模型是高频风险，OWASP 将其列为 [API5:2023 失效的功能级授权](https://owasp.org/API-Security/editions/2023/en/0xa5-broken-function-level-authorization/)，本质是「认证了身份、却没限制其能调用哪些功能」。

## 快速开始

按租户、角色和资源三个维度定义最小权限，并默认拒绝：只有显式允许的操作才能执行。策略可表示为「主体 + 操作 + 资源 + 条件」的规则集合，例如允许 tenant A 的 app 角色调用生产模型，但拒绝其调用管理接口。

默认拒绝可以用授权函数表达：对一组策略 $P$，仅当存在一条策略允许、且没有更高优先级策略显式拒绝时，请求才被放行：

$$
\text{decision}=\text{permit}\quad\Longleftrightarrow\quad \exists\,p\in P:\ \text{eval}(p)=\text{permit}\ \wedge\ \nexists\,p'\in P:\ \text{eval}(p')=\text{deny}
$$

其中 `eval` 按主体、操作、资源与上下文属性求值；「拒绝优先」(deny-overrides) 保证显式拒绝覆盖允许，避免规则冲突时误放行。一条 ABAC 风格策略可写成：

```json
{
  "effect": "allow",
  "subject": { "tenant": "tenant-a", "role": "app" },
  "action": "invoke_model",
  "resource": { "model": "production-*" },
  "condition": { "source_ip_in": "10.0.0.0/8" }
}
```

高风险模型（成本高、能力强的旗舰模型）和管理接口（配额变更、密钥管理、审计查询）应使用独立策略，并叠加额外条件，如多因素认证、来源网络白名单或审批流，避免普通应用凭据越权。

实现上可在网关或中间件统一执行策略决策点 (Policy Decision Point, PDP)，把决策结果和命中规则写入日志。PDP 与业务解耦后，策略可在不重启推理服务的情况下热更新；每次授权决策记录允许或拒绝的原因，便于事后审计和策略回归。

验证：普通应用 token 调用管理接口应返回 403；运维角色调用同一接口应成功；修改策略后新决策立即生效，无需重启推理服务。

## 案例

某平台划分两类角色：普通应用只能调用生产模型完成推理；运维角色才能变更配额、查看审计日志和管理模型配置。两类角色使用不同策略，管理接口默认对普通角色拒绝。

具体实现把模型资源按 `production-*` 与管理接口两类命名，普通角色只匹配前者的允许规则；对管理接口既不匹配任何允许规则、又命中默认拒绝，因此即使凭证有效也会被 PDP 判为 deny 并返回 403。当某个普通应用被误授予运维角色时，管理员只需改回其角色绑定，新决策立即生效，无需改动推理服务。

每次授权决策都把主体、资源、动作、结果和命中的策略规则写入审计日志。发生越权尝试时，运维可从日志定位到具体规则，判断是策略配置错误还是凭证被滥用。

常见失败点：策略默认允许而非默认拒绝；角色继承导致权限扩散；条件（如 IP 白名单）在网关与推理层不一致。排查方向是先复现请求，再逐条核对命中的策略规则。

## 相关主题

- [API 鉴权](./api-authentication.md)
- [多租户隔离](./multi-tenant-isolation.md)
