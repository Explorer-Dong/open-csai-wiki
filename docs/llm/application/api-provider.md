---
title: API 供应商
icon: material/api
---

随着大模型基模团队越来越多，各种强势模型不断涌现，对应的推理服务供应商也越来越多。在权衡模型能力和模型价格的情况下，我们需要根据自己的情况选购对应的 AI 推理 API 服务。

关于模型能力，我们可以参考一个比较权威的大模型榜单：[Artificial Analysis](https://artificialanalysis.ai/)。

关于模型价格，除了直接去对应的开发者平台查看，也可以查看开源社区维护的 [Models.dev](https://models.dev/)。

## API 平台

官方平台稳定可靠，但国外模型有支付门槛。

### 官方

国外御三家：

- ChatGPT: [https://developers.openai.com/](https://developers.openai.com/)
- Gemini: [https://aistudio.google.com](https://aistudio.google.com)
- Claude: [https://platform.claude.com/dashboard](https://platform.claude.com/dashboard)

> [!note]
>
> 就个人体感，Claude 适合做架构，ChatGPT 适合写后端，Gemini 适合写前端。

国内第一梯队：

- DeepSeek: [https://platform.deepseek.com/usage](https://platform.deepseek.com/usage)
- Qwen: [https://bailian.console.aliyun.com/cn-beijing/#/home](https://bailian.console.aliyun.com/cn-beijing/#/home)
- GLM: [https://bigmodel.cn/](https://bigmodel.cn/)
- Minimax: [https://platform.minimaxi.com/docs/guides/models-intro](https://platform.minimaxi.com/docs/guides/models-intro)

### 中转站

目前只推荐 [OpenRouter](https://openrouter.ai/docs/quickstart)。

优点：

- 合法的第三方代理商，可开发票，适用于正规场所调用（一般不会充水）。
- 充值方便，支持微信和支付宝。
- 模型比较全，甚至部分官模会在这里预发布（比如 GLM5）。
- 有部分免费模型，适合较低限度的白嫖，每日重置白嫖额度。

缺点：

- 模型价格和官方一致，没有优惠。
- 部分官方免费的模型，OpenRouter 还收费。
- 有充值服务费，例如 `10$` 实际需要支付 `10.5$` 。

白嫖：

- 根据 [官方文档](https://openrouter.ai/docs/api/reference/limits)，累计充值满 `10$`，每天可调用 1000 次免费模型，RPM 峰值为 20。

### 各种羊毛

很多平台都有自己的活动，但是就我使用下来，感觉文档、价格、并发性等都不如上面两家，这里罗列出来，供羊毛党发掘：

- [硅基流动](https://siliconflow.cn/zh-cn/models)：只支持部分模型，文档写得比较差。
- [七牛云](https://s.qiniu.com/IJNj2u)：虽然支持 [国外模型](https://sufy.com/zh-CN/services/ai-inference/models)，但整体价格偏高。
- [魔搭社区](https://www.modelscope.cn/docs/model-service/API-Inference/intro)：模型过少。
- [PlanetZero](https://api.planetzero.live/register?aff=hWda)：并发性很好，也支持部分国外模型，可惜支持的模型种类不多。

除了平台，也可以走 xy、tb 等反代平台，但是容易跑路，新手不建议。

当然，各大厂商为了争夺 C 端用户，会自己开发 AI 编辑器，并送一些免费额度，比如 Codex、Antigravity、Copilot、Cowork 等。但是官方改政策很频繁，相较于直接调 API 来说，不够稳定。

另外简单任务也可以直接使用 Web 服务，但由于不涉及 API，这里就不再展开。

> [!note]
>
> 如果有其他更好的 API 中转平台，欢迎交流！

## API 选购

就我个人目前的使用经验来看，API 的选购主要取决于「并发、模型、价格」三点因素。

我目前对于推理 API，主要有「科研实验、代码编写」两个作用。前者代表光明正大、批量推理，后者代表自己使用、可以容忍不稳定。我想这两种情况已经可以代表大部分使用场景了，下面分别分析。

### 科研实验

由于学校可以报销，所以只需要高并发和指定模型。那么选购 API 时就需要：

- 可以开发票。
- 有高并发能力。
- 模型能力有保障，不会偷摸更换。

这里我推荐优先走官方 API 平台；如果涉及到国外模型，推荐走正规 API 中转平台，比如 OpenRouter。

### 代码编写

自己编程用，并发要求不高，模型差不多就行，价格一定要低，最好可以白嫖，那么选购 API 时就只需要考虑一点：足够便宜。

不同场景方案选型：

- 对于简单任务，推荐走免费模型。
- 对于中等任务，推荐开启多 Agent 模式，规划交给国外付费模型，探索、编程、审阅交给免费模型。
- 对于复杂任务，推荐开启多 Agent 模式，规划、编程、审阅交给国外付费模型，探索交给免费模型。

## API 管理

除非特殊情况，否则不推荐只在一家消费，容易造成“学习偏差”，但多方注册往往意味着有很多 API Key 需要管理，这里我推荐一个开源工具 [Octopus](https://github.com/bestruirui/octopus) 来管理 API Key。

一键部署：

```bash
docker volume octopus
docker run -d \
  --name octopus \
  -v octopus:/app/data \
  -p 8080:8080 \
  bestrui/octopus
```

> [!note]
>
> 部署方案：更推荐本地部署使用，因为当并发请求比较大时，对服务器的性能要求比较高，读者可根据自己的服务器情况自行选择，因为这个工具理论上可以作为中转站给第三方使用的，只要你有足够的低价 token。

服务启动后，把各 API 按照要求填到「渠道」中即可。一个比较好用的方法就是「分组」：在渠道添加好供应商后，可以把相同的模型设置到一个分组（池子）里，后续通过自定义的池子名称（这里是 ds-chat），就可以一个接口按照某种规则（这里是轮询）访问池子里的接口了：

![池子里有 DeepSeek 官方的 API，也有第三方供应商提供的 API](https://cdn.dwj601.cn/images/20260312100944505.png)

在设置里创建一个 API Key 后，就可以一个接口访问池子里的所有接口了：

![一个接口访问池子里的所有接口](https://cdn.dwj601.cn/images/20260312103919929.png)

至于如何划分 API，取决于你自己的用法和钱包。基本就可以按以下几种：

- 是否付费：比如免费池、付费池。
- 指定模型：比如 deepseek-chat 池子、GLM5 池子。
