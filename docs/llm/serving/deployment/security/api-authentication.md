---
title: API 鉴权
---

API 鉴权 (Authentication) 确认调用方身份，是限额、审计和权限控制的前提。鉴权回答「你是谁」，权限控制回答「你能做什么」，没有可靠的身份标识，后续的配额、审计和隔离策略都无从锚定。

早期的 LLM 服务大多只提供一个长期静态 API Key：请求携带密钥，服务端比对后放行。这种方式部署简单，但密钥一旦泄露就难以撤销，也无法在单个密钥下细分租户与应用。随着多租户 API 平台发展，鉴权逐步演进为两条主线：一是短期、可撤销的签名 token（如 JWT），二是标准化授权协议（如 OAuth 2.0）配合云厂商受管密钥。两者共同解决「凭证可轮换、身份可细分、权限可撤销」的问题。OWASP 将「失效的身份认证」列为 API 安全十大风险之一（API2:2023），其根源正是凭证泄露、弱凭证与校验缺失，参见 [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/)。

## 快速开始

生产环境建议使用短期 token 或云厂商受管密钥 (Managed Key) 作为主要凭证，而不是在请求中直接携带长期静态密码。服务端每次收到请求时，需在鉴权中间件中完成三件事：解析凭证、验证签名或密钥有效性、检查过期时间与撤销状态。

**JWT 的结构**。JWT 由三段 base64url 编码串以 `.` 连接而成：头部 (header) 声明算法，载荷 (payload) 承载声明，签名 (signature) 把前两段绑定到服务端密钥。以 HMAC-SHA256 为例：

```text
JWT       = base64url(header) + "." + base64url(payload) + "." + base64url(signature)
signature = HMAC-SHA256( base64url(header) + "." + base64url(payload), secret )
```

其中 `secret` 是仅服务端持有的密钥，任何对 header 或 payload 的篡改都会改变签名输入、导致校验失败。JWT 的字段语义由 [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519) 定义：`exp` 表示过期时间，`jti` 是唯一标识、可用于吊销。一个最小校验实现是重算 HMAC、用恒定时间比较防时序侧信道，再解析载荷并检查 `exp`：

```python
import base64, hashlib, hmac, json, time

def verify_jwt(token: str, secret: bytes) -> dict:
    header_b64, payload_b64, sig_b64 = token.split(".")
    signing_input = f"{header_b64}.{payload_b64}".encode()
    expected = base64.urlsafe_b64encode(
        hmac.new(secret, signing_input, hashlib.sha256).digest()
    ).rstrip(b"=")
    if not hmac.compare_digest(expected, sig_b64.encode()):
        raise ValueError("signature mismatch")
    payload = json.loads(base64.urlsafe_b64decode(payload_b64 + "=="))
    if payload.get("exp", 0) < time.time():
        raise ValueError("token expired")
    return payload  # 返回 tenant id、token id、scope，供后续授权与配额使用
```

以短期 token 为例，一个最小实现是：签发时把 tenant id、token id 和过期时间写入载荷，并用服务端密钥签名；网关校验签名后再解析载荷，把请求映射到租户和配额。这样即使 token 被截获，也能通过过期时间限制其危害窗口，并通过撤销列表立即失效。

**API Key 与 OAuth 2.0 的取舍**。对机器到机器的调用，OAuth 2.0 的客户端凭证授权 (Client Credentials Grant) 让应用用 `client_id` 加 `client_secret` 换取短期访问 token，密钥本身不必随每个请求反复传输，授权流程见 [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)。云厂商受管密钥通常带前缀并绑定受限作用域（如只允许调用某模型、属于某项目），便于在日志与告警中按前缀识别而无需暴露完整密钥。

关键原则是把凭证当作机密对待：密钥只存放在密钥管理服务 (Key Management Service, KMS) 或通过环境变量注入，不写入客户端代码、仓库或日志。日志中间件应对 Authorization 头、API key 等字段脱敏或直接丢弃，避免凭证经日志外泄。

验证方式：用一个有效 token 请求应返回 200；用过期、篡改或已吊销的 token 请求应返回 401，且响应不泄露该身份是否存在。

## 案例

某服务为每个应用签发独立 token。请求到达网关后，网关校验签名并把 token 映射到对应的租户和配额额度，再转发给推理层；配额扣减和审计日志都以该租户标识为准。

具体地，签发侧把 `tenant_id`、`token_id`（即 `jti`）与 `exp` 写入载荷后签名；验证侧按上面的流程重算签名，再核对 `exp` 与撤销列表。撤销列表只存 `jti` 标识而非密钥本身，命中即返回 401。这样一次泄露只需吊销单个 token，而配额与审计锚定的 `tenant_id` 保持稳定，无需迁移历史数据。

当某个 token 疑似泄露（例如在公共仓库或日志中被发现）时，管理员在网关侧吊销该 token。之后该 token 的所有请求立即返回 401，而同一租户下其他应用的 token 不受影响，无需轮换全量密钥。

常见失败点：密钥硬编码在前端或移动端导致泄露；签名校验被跳过；过期时间设置过长。排查方向是先在网关日志确认请求是否进入鉴权中间件，再核对凭证是否命中撤销列表。

## 相关主题

- [权限控制](./authorization.md)
- [日志与审计](./logging-audit.md)
