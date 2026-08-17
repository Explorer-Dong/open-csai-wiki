---
title: Agent 权限与沙箱
---

Agent 权限与沙箱把工具、文件、网络与执行环境限制在完成任务所需的最小范围，是 [OWASP Top 10 for LLM Applications](https://genai.owasp.org/2024/11/17/owasp-reveals-2025-top-10-risks-for-llms-new-sponsorship-program/) 中「Excessive Agency（过度授权，LLM06）」问题的直接应对。它的核心是「最小权限」与「默认拒绝」：Agent 只获得完成当前任务所必需的能力，任何超出范围的访问都要经过显式授权。这一原则最早可追溯到 Saltzer 与 Schroeder 在 1975 年提出的系统安全设计原则；之所以对 Agent 格外关键，是因为 Agent 把模型能力从「生成文本」扩展到了「执行操作」——模型一旦出错或被注入，破坏面就不再局限于回答内容，而是扩散到它能触达的文件、网络与服务。

## 快速开始

**默认拒绝与显式授权。** Agent 启动时不授予任何权限。对高风险命令（删除、外发、写入宿主机凭证路径）、外发网络请求与敏感读取，一律要求用户确认或策略审批。不要依赖模型自觉遵守规则，权限判定必须放在确定性的服务端层，模型输出只是「请求」而非「授权」。这与 [OWASP LLM06:2025 Excessive Agency](https://github.com/owasp/www-project-top-10-for-large-language-model-applications) 的结论一致：权限、功能与自主性三者要同时限制，缺一不可。

**为每次执行设置边界。** 用沙箱为进程设定工作目录、网络白名单、CPU/内存/时间配额与文件读写范围。例如代码 Agent 只挂载一个临时仓库副本为可写，宿主凭证目录只读或完全不可见，公网访问默认关闭、只开放测试依赖源域名。边界越窄，注入或误操作能造成的损失越小。一个同时满足「只读根文件系统 + 关闭网络 + 资源配额 + 丢弃特权 + 非 root 运行」的最小容器示例：

```bash
docker run --rm --read-only \
  --network none --memory 1g --cpus 1 --pids-limit 128 \
  --cap-drop ALL --security-opt no-new-privileges \
  --user 1000:1000 \
  -v /tmp/repo-copy:/workspace \
  sandbox-image
```

验证标准：容器内 `curl` 外发失败、无法写入 `/etc`、内存与 CPU 配额确实生效。

**审计与销毁。** 每次执行记录命令、参数、触达的资源与授权来源；任务结束后销毁沙箱环境与临时凭证，防止残留。验证方式：尝试让 Agent 读取宿主机凭证或外发数据，确认请求被拦截并进入确认流程，而不是直接成功。最小权限可形式化为对授权能力集合的约束：

$$
C_{\text{required}}\subseteq C_{\text{granted}},\qquad \lvert C_{\text{granted}}\setminus C_{\text{required}}\rvert\to 0
$$

即授予的能力集合必须覆盖完成任务所需，但超出部分要尽可能小。服务端可以用一个确定性决策函数统一落实，而不是把它写进提示词：

```text
decide(action, params, caller):
    if action not in GRANTED[role]:          return DENY
    if not validate(params, SCHEMA[action]): return DENY
    if action in HIGH_RISK:                  return ASK_CONFIRM
    audit(action, params, caller)
    return ALLOW
```

## 案例

场景：一个代码 Agent 需要运行测试并修复失败用例。

- 输入：用户提交代码变更，要求「运行全部测试并修复失败用例」。
- 关键步骤：Agent 被放入一次性容器，工作目录为仓库副本，网络仅允许测试依赖源；宿主凭证与公网不可达。运行与修复都在容器内完成。
- 预期结果：测试可执行，Agent 无法读取宿主机 `.ssh`、`.env` 或任意外发。任务结束后容器销毁，命令与文件变更写入审计日志。
- 常见失败点与排查：若把宿主机配置目录整体挂载进容器，Agent 可能读到密钥，属于边界过宽；若未设时间与内存配额，循环测试会耗尽资源。排查时检查挂载列表、网络策略与配额是否真正生效，而非只看提示词里写了「不要访问」。

## 相关主题

- [Tool Abuse](./tool-abuse.md)
- [Coding Agent](../forms/code-agent/index.md)
