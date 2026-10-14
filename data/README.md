# data/ —— 随包的第三方价目快照

本目录只有一份**原样快照**，用于「LiteLLM 聚合价」这一层成本口径；插件运行时**不会**自动联网，
只有用户在「计费」面板点「刷新价目」时才发起一次请求（`POST /dsh-key-usage/pricing/refresh`）。

## litellm-model-prices.json

| 项 | 值 |
| --- | --- |
| 来源 | <https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json> |
| 下载地址 | <https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json> |
| 备用镜像 | <https://cdn.jsdelivr.net/gh/BerriAI/litellm@main/model_prices_and_context_window.json>（面板刷新时 raw 失败会退回它） |
| upstream commit | `30b8db325e85740eb86901d08597da845b206504`（`gh api repos/BerriAI/litellm/commits/main --jq .sha`，记录于抓取当天） |
| 抓取日期 | 2026-10-14 |
| 字节数 | 2797533（字节原样，未格式化、未裁剪） |
| sha256 | `6b5e1ee7e77f02c7afd4a130099d48174aabb157389de3a7512c5e1d1063e403` |
| 币种 | USD（`*_cost_per_token`，展示时 ×1e6 成「每百万 tokens」；**不做任何汇率换算**） |
| 许可 | MIT（见 [`litellm-LICENSE.txt`](./litellm-LICENSE.txt)，Copyright (c) 2023 Berri AI） |

字段：`input_cost_per_token` / `output_cost_per_token` / `cache_read_input_token_cost` /
`cache_creation_input_token_cost`（USD / token）、`litellm_provider`、`mode`、`max_input_tokens`、
`max_output_tokens`、`source`（多数条目自带厂商文档 URL）。顶层 `sample_spec` 是文档条目，不是模型，加载时排除。

## 运行时怎么用

1. **本地优先**：`$DSH_HOME/dsh-key-usage/model-prices.json`（面板刷新后的最新价目）>
   本目录的随包快照。两者都读不到时该层整体失效（界面显示「聚合价不可用」），**不影响**其它口径。
2. **改价**：点面板的「刷新价目」按钮，或在本目录重跑一次抓取并更新上表的 sha256 / commit / 日期。
   本地文件坏了（JSON 解析失败）会自动降级回本快照并报 issue，不会抛错。
3. 匹配与折算规则（通道别名、多候选的确定性选择、缺档缓存价按未命中价代）见
   `src/server/model-prices.ts` 的模块注释；口径说明见 `docs/01-架构与数据契约.md`。

## 重新抓取

```powershell
$url = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json'
Invoke-WebRequest -Uri $url -OutFile data/litellm-model-prices.json
Get-FileHash -Algorithm SHA256 data/litellm-model-prices.json   # 更新上表的 sha256
gh api repos/BerriAI/litellm/commits/main --jq .sha             # 更新上表的 commit
```

抓完必须核对 sha256、更新本文件的「upstream commit / 抓取日期 / 字节数 / sha256」四行，
并跑一次 `node test/model-prices.test.mjs`（该测试按真实文件算条目数与模型数）。
