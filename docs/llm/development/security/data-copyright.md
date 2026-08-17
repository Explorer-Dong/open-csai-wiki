---
title: 数据版权
---

数据版权关注训练数据和模型使用是否符合许可、合同与适用法律要求，覆盖数据获取、混合、再分发到模型发布的完整生命周期。它回答的不是「这份数据能不能被看到」，而是「能否被合法地用于训练、商用与再分发」这三个相互独立的问题；后两者在公开抓取场景下尤其容易与「可访问」混淆。

## 快速开始

第一步是建立数据清单（Data Inventory），为每个来源登记许可证、获取方式、允许用途、署名要求和删除约束等字段。许可证决定的是「能否用于训练」「能否商用」「能否再分发」三个独立问题，需要分别判断，不能因为来源公开就默认三者全部允许。Creative Commons 系列许可证把这三者显式拆开：`BY` 要求署名，`NC` 禁止商用，`SA` 要求派生作品沿用相同许可，`ND` 禁止改编，`CC0` 则放弃权利；`CC-BY-NC-4.0` 这类组合的含义可参考 [Creative Commons 许可说明](https://creativecommons.org/share-your-work/cclicenses/)。清单至少包含以下字段：

```yaml
- shard: commoncrawl-2024-01
  source_url: https://example.org/corpus
  license: CC-BY-NC-4.0
  acquired_by: crawl
  allowed_use: research-only
  attribution: required
  deletion_constraint: on-request
  inherited_by: []
```

第二步是把限制传播到下游。派生数据集（清洗、混合、蒸馏产物）应继承源数据中最严格的约束，模型的发布声明也应标注所依赖数据的许可范围。建议在数据管道中把许可字段作为一等公民处理，使下游任务能自动过滤不兼容的 shard，而不是靠人工在事后补救。下面的最小过滤脚本演示这一思路：读取清单、丢弃禁止商用或禁止再分发的 shard，并输出剩余集合的许可汇总：

```python
ALLOWED_COMMERCIAL = {"CC0", "CC-BY", "MIT", "Apache-2.0", "ODC-BY"}

def keep(shard):
    return shard["license"] in ALLOWED_COMMERCIAL and \
           shard["allowed_use"] not in ("research-only", "non-commercial")

kept = [s for s in inventory if keep(s)]
print({license: sum(1 for s in kept if s["license"] == license)
       for license in {s["license"] for s in kept}})
```

验证方式是在构建日志中确认「因许可被排除的 shard 数量」与预期一致，且派生数据集带上了许可汇总报告。

## 关键问题

「可访问」不等于「可训练或可商用」：网页能抓取的内容仍可能受服务条款、数据库权利或版权法约束。爬取数据时需核对 robots 协议与目标站点的使用条款——robots 协议的现代规范见 [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309)，它本身只是抓取约定而非法律许可。商用场景还应评估当地对文本与数据挖掘 (Text and Data Mining, TDM) 的例外规定是否适用。欧盟在 [Directive (EU) 2019/790](https://eur-lex.europa.eu/eli/dir/2019/790/oj) 中确立了双层 TDM 例外：第 3 条允许科研机构的科学研究挖掘，第 4 条允许一般性 TDM，但权利人可通过机器可读方式声明「选择退出」(opt-out)；配套的 [TDM Reservation Protocol](https://www.edrlab.org/open-standards/tdmrep/) 把这种退出声明标准化进 robots.txt 等位置。美国则主要依靠判例中的合理使用 (fair use) 与相关诉讼逐步划定边界，两大法域至今仍无统一结论，因此具体做法必须落到「以当地法律与最新判例为准」。

数据混合会叠加风险：多个来源的许可证可能互相冲突，例如「仅非商用」与「允许商用」混合后，整体可能只能按最严格的条款发布。模型输出对训练内容的记忆也会带来新的版权问题，即生成结果是否构成对源作品的复制或衍生。不同地域对训练豁免、署名和赔偿的认定存在差异，跨境部署时需按目标司法辖区分别评估。这也解释了为何清单要记录 `acquired_by` 与 `source_url`：当某一 shard 的合法性被质疑时，能否回溯到抓取方式与原始出处，直接决定后续能否自证与整改。

## 案例

某团队在构建商用训练集时，先在数据清单中为每个 shard 标注许可证与来源 URL。构建脚本读取这些字段，自动排除标记为「非商用」「仅研究」「禁止再分发」的 shard，并对混合后的数据集生成许可汇总报告。

该报告随数据集版本一起保存，形成审计记录：任何一次数据变更都能回溯到具体 shard 及其许可依据。当法务或客户质疑某一数据的可用性时，团队可直接给出来源、许可证文本和处理决策，无需重新排查整个数据集。常见的失败点是字段缺失或填写随意，导致过滤规则漏判，因此清单的必填项应在入库时就做校验。

## 相关主题

- [数据隐私](./data-privacy.md)
- [数据集存储](../../infrastructure/storage/dataset-storage.md)
