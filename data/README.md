# data/ —— 随包的第三方价目快照

「LiteLLM 聚合价」这一层的随包快照，装载优先级与匹配规则见 [`../docs/架构与数据契约.md`](../docs/架构与数据契约.md) §3.15。

## litellm-model-prices.json

| 项 | 值 |
| --- | --- |
| 来源 | <https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json> |
| 刷新地址 | raw.githubusercontent.com（首选）→ cdn.jsdelivr.net（失败回落） |
| upstream commit | `30b8db325e85740eb86901d08597da845b206504` |
| 抓取日期 | 2026-10-14 |
| 字节数 | 2797533（字节原样，未格式化、未裁剪） |
| sha256 | `6b5e1ee7e77f02c7afd4a130099d48174aabb157389de3a7512c5e1d1063e403` |
| 币种 | USD（`*_cost_per_token`，展示时 ×1e6 成「每百万 tokens」） |
| 许可 | MIT（见 [`litellm-LICENSE.txt`](./litellm-LICENSE.txt)，Copyright (c) 2023 Berri AI） |

## 重新抓取

```powershell
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json' -OutFile data/litellm-model-prices.json
Get-FileHash -Algorithm SHA256 data/litellm-model-prices.json   # 更新上表的 sha256
gh api repos/BerriAI/litellm/commits/main --jq .sha             # 更新上表的 commit
```

抓完更新上表的 commit / 日期 / 字节数 / sha256 四行，并跑 `node test/model-prices.test.mjs`（它按真实文件复算条目数与模型数，且把 sha256 当硬编码锚点）。
