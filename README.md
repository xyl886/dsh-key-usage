<div align="center">

# 使用情况 · dsh-key-usage

**DeepSeek Harness 的侧边栏用量面板** —— 按通道看 Token、缓存命中率、成本，以及余额与订阅窗口。

[![npm](https://img.shields.io/npm/v/dsh-key-usage?style=flat-square)](https://www.npmjs.com/package/dsh-key-usage)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![platform](https://img.shields.io/badge/platform-web%20%7C%20desktop-4d9fff?style=flat-square)](#兼容与运行要求)
[![node](https://img.shields.io/badge/node-%3E%3D22-339933?style=flat-square)](#兼容与运行要求)
[![topic](https://img.shields.io/badge/topic-dsh--plugin-0e7490?style=flat-square)](https://github.com/topics/dsh-plugin)
[![Listed on dsh-plugin.org](https://img.shields.io/badge/listed-dsh--plugin.org-4d9fff?style=flat-square)](https://dsh-plugin.org/plugins/xyl886/dsh-key-usage)

[安装](#安装) · [界面预览](#界面预览) · [数据与权限](#数据权限与联网) · [功能](#功能) · [成本与价目](#成本与价目) · [常见问题](#常见问题) · [更新记录](./docs/CHANGELOG.md) · [开发](#开发)

</div>

---

侧边栏「使用情况」：**总览（通道清单 + 活跃热力图）、使用明细、分布（通道 / 项目 / 模型占比 + 提问词云）、会话用量** 4 个页（余额 / 窗口与单价表在总览的通道弹窗里；币种、汇率与价目刷新在页头「设置」里）。数据全部来自你自己的机器，**默认不联网**；界面**中英双语**（跟随宿主语言设置），字号跟随宿主通用设置。

## 安装

```bash
dsh plugin --profile web add dsh-key-usage
dsh plugin --profile desktop add dsh-key-usage
```

## 界面预览

<p align="center">
  <img src="./docs/images/overview.png" alt="总览：通道清单与活跃热力图" width="880" /><br />
  <sub><b>总览</b> —— 每通道一行（今日 / 近 30 天 / 余额或窗口 / 30 天成本），下方是近 9 个月活跃热力图</sub>
</p>

<p align="center">
  <img src="./docs/images/daily.png" alt="使用明细：十张统计卡（含环比角标）、占比条与按天图表" width="880" /><br />
  <sub><b>使用明细</b> —— 十张统计卡（每张带上期值与环比角标）、通道下拉、**自定义范围为日历弹层**、占比条（悬停一个 tip 列全）、按天 / 按小时图表</sub>
</p>

<p align="center">
  <img src="./docs/images/projects.png" alt="项目用量：按工作目录聚合" width="880" /><br />
  <sub><b>项目用量</b> —— 按工作目录聚合，含会话数与归档标记；支持搜索、按通道筛选与排序</sub>
</p>

<p align="center">
  <img src="./docs/images/models.png" alt="按模型：通道 + 模型聚合，成本带来源角标" width="880" /><br />
  <sub><b>按模型</b> —— 按通道 + 模型聚合，成本带「官方价 / 聚合」来源角标</sub>
</p>

<p align="center">
  <img src="./docs/images/sessions.png" alt="会话用量：按会话聚合，可按成本 / 命中率 / 调用数排序" width="880" /><br />
  <sub><b>会话用量</b> —— 按会话聚合、按日期分组，支持搜索与四种排序；没有人类提问的会话不显示</sub>
</p>

<p align="center">
  <img src="./docs/images/session-detail.png" alt="会话详情：首条提问、四类 tokens、逐模型占比与 24 小时分布" width="880" /><br />
  <sub><b>会话详情</b> —— 首条提问全文、四类 tokens 与命中率、逐模型占比、一天里的分布；有子代理时列出子会话</sub>
</p>

<p align="center">
  <img src="./docs/images/quota.png" alt="通道详情弹窗：官方余额、订阅窗口与通道单价表" width="880" /><br />
  <sub><b>通道详情弹窗</b>（总览里点通道行）—— 官方余额或订阅窗口占用、¥ / $ 折算、该通道近 30 天模型单价表</sub>
</p>

## 数据、权限与联网

**读什么**

| 读取对象 | 用途 |
| --- | --- |
| `$DSH_HOME/dsh-usage/usage-ledger.json` | 用量台账（天 × 通道 × 模型，含官方成本） |
| `$DSH_HOME/dsh-usage/provider-snapshots.json` | 余额 / 窗口的**回落值** |
| `$DSH_HOME/profiles/<profile>/cordis.yml` | 通道清单（只做文本提取，**不执行**其中的 `!!js`；取不到回退 `cordis.patch.yml`） |
| 宿主 `sessionPersistence` 服务 | 项目 / 会话 / 单会话详情 / 按小时（只开只读句柄，不自行解压会话文件） |
| 宿主 `credentials` 服务 / 进程环境变量 | 查余额时的 API Key（只用于拼 `Authorization`） |
| 随包 `data/litellm-model-prices.json`、`$DSH_HOME/dsh-key-usage/model-prices.json`、`fx-rate.json`、`plugin.log` | 聚合价目、汇率缓存与系统日志 |

**写什么**（只有四处，都在 `$DSH_HOME/dsh-key-usage/`）：

- `snapshot.json` —— 统一快照：4 个页的数据（含明细），每 5 分钟本地重建一次；**打开页面先用上一份立即渲染，再后台重算（本地段超 10 秒才重算）并替换**，点「刷新」时整体重算；
- `model-prices.json` —— 设置里点「刷新价目」成功后写入的聚合价目副本（校验不过不覆盖旧文件）；
- `fx-rate.json` —— 汇率缓存（成功才写，12 小时内直接复用）；
- `plugin.log` —— 系统日志（JSONL，追加写，超 512 KB 只留后半段）：刷新价目 / 汇率 / 余额查询失败的**原因**、端点请求失败、快照问题都在这里，刷新页面后仍可查。

同目录的 `quota-snapshots.json` 是历史遗留文件：**只读一次当种子，插件不再写它**。这四个文件都不含任何密钥（日志里只有上游 URL、HTTP 状态这类排查信息）；宿主的 `provider-snapshots.json` 与 profile 配置一律只读。**不读凭据文件、不改宿主配置、所有端点仅接受回环请求** —— 完整约束见 [`AGENTS.md`](./AGENTS.md)。

**会联网的三个动作，都要你触发**：

| 动作 | 说明 |
| --- | --- |
| **打开插件页** / 打开总览的通道详情弹窗 | 按通道查官方余额 / 窗口接口：**打开页面时若余额数据超过 60 秒就后台补查一次**（不阻塞首屏，几秒后自动刷新出来），其余时候读缓存；6 秒超时、64 KiB 上限、结果缓存 60 秒（点「刷新」强制重查），失败回落本机快照，原因写进系统日志 |
| 设置里的「刷新价目」 | `POST /dsh-key-usage/pricing/refresh`：先 `raw.githubusercontent.com`、失败再试 jsDelivr 镜像；服务端 20 秒预算、响应上限 12 MiB，校验不过**不覆盖**已有文件；界面最多等 30 秒 |
| **设置弹窗里的「刷新汇率」**（打开页面也会顺带取一次缓存的汇率） | `GET /dsh-key-usage/fx`：主 `open.er-api.com`、备 `api.frankfurter.app`；6 秒超时、64 KiB 上限、12 小时 TTL 内不联网；失败回落缓存，再失败用默认 7.1 并在界面明示 |

**不做开机拉取、不做定时轮询、不在其它端点里隐式联网**。打开页面触发的重算只走本地数据（台账 + 会话），联网的只有上面这三个动作。

**界面语言与字号**：文案全部走词典（中 / 英），语言**只跟宿主设置**（设置 → 通用 → 语言），插件内不加语言开关；字号按宿主注入的 `--dsh-content-font-size` 缩放，**通用设置里改字号，插件整页跟着变**。

## 功能

**总览**

- **通道清单** —— 每通道一行：类型、今日与近 30 天调用量、余额或订阅窗口占用、30 天成本（带来源角标）；
- **点通道行弹出该通道详情**：官方余额（总余额 / 赠送 / 充值）或订阅窗口占用（5 小时 / 本周 / 本月 + 重置时间）、查询时间（不是实时值时只显示一个「快照」小标签）、该通道近 30 天**模型单价表**（含「官方价 / 聚合 / 模型官方价」来源与「· 部分」）；弹窗里可切换 ¥ / $ 显示与刷新汇率、刷新价目（原来的「余额与配额」Tab 已并入这里）；失败原因（含未配置 Key）进系统日志，不占卡片版面；
- **活跃热力图** —— 近 9 个月按日 Tokens，五档深浅递进，格子按可见区间的**活跃日五分位**分档（p20 / p40 / p60 / p80）；横向滚动时星期列固定在左侧。

**使用明细**

- 今日 / 周 / 月 / 总计 / 自定义范围 + **通道下拉**（在「自定义」右侧），全页联动；自定义范围用**日历弹层**选起止（选完自动关闭，可清除）
- **十张统计卡**：调用次数、Tokens、输入、输出、缓存读、缓存命中率、日均 Tokens、通道数、使用天数、成本；
- 每张卡带**上期值（缩小淡化）与环比角标**：命中率按百分点（`pp`）记，成本上升用提示色；没有可比基数或持平时不显示角标，「总计」范围整组不显示；
- **通道占比**：条下方一次列全每段（色块 / 名称 / 占比 / Tokens），悬停条上任意位置弹**一个** tip 列出全部段；
- 按天 / 按小时图表（单日范围自动切 24 小时）：**悬停时浮层钉在图表右上角**，同时高亮该列并画一条竖向指示线，柱子不会被盖住；浮层里是当日调用数、四类 tokens、命中率、成本与模型构成。

**项目用量 · 按模型 · 会话用量**

- 分别按工作目录、通道 + 模型、单个会话聚合，支持搜索、按通道筛选与排序；会话按日期分组，可切换显示已归档会话，**没有人类提问的会话不再显示**；
- **名字与数量对齐侧边栏**：会话名取宿主会话投影（`storages/session_projcache/sessions/<id>.json` 的 `record.rows.title.val`），子代理判定同样以投影的 `subagent.val.identity` 为准（被 seed 续接的会话算独立会话）；项目行以宿主工作区为骨架、名字用工作区名，不在工作区里的历史目录合并成一行「未归入工作区」；
- **会话详情抽屉**：首条真实提问全文、工作区、通道、时长、四类 tokens 与命中率、成本与来源角标、逐模型占比，有结算样本时给 24 小时迷你图；
- 会话列表可按成本 / 命中率 / 调用数排序，可展开看模型构成；首屏 50 条 + 「加载更多」；点行内工作目录跳到「分布」并只看该项目。

**导出**

- 上面四处都能把**当前筛选后**的数据导出为 CSV 或 JSON（CSV 带 UTF-8 BOM）。

**系统日志**

- 页头右侧的日志图标：弹窗列出**时间 / 级别 / 来源 / 内容**，可刷新（重读磁盘）、复制、导出 `.txt`、清空；
- **落盘**：写到 `$DSH_HOME/dsh-key-usage/plugin.log`（JSONL，超 512 KB 只留后半段），刷新页面后还能查上次为什么失败；
- 记录**刷新价目 / 汇率 / 余额查询失败的原因**（含上游地址与 HTTP 状态）、端点请求失败、快照问题与「读取不完整」、导出被浏览器拦截、i18n 缺词；同一问题合并成一条并标 `×N`（点消息展开详情，失败条目可直接点「重试」）；
- 页面本身不再摊开这些原因：失败只留一行**「结论 · 查看系统日志」**，点它直接打开日志窗。

## 成本与价目

**取值优先级（两层）**：`官方账单`（台账记录的厂商账单，不会被覆盖）→ `通道内价目`（插件**内置的厂商官方价目**；本通道没收录时，按 **LiteLLM 聚合价**的**通道别名**命中）→ `同模型官方价目`（本通道没有价目时，聚合价里该模型名**全库唯一**命中的那一条；同一厂商的 `x` 与 `vendor/x` 同价双键算唯一，同名跨多个厂商时用内置价目里该模型的厂商兜底再查一次）；两层都没命中就显示 `—`，**不猜一个数字**。

| 角标 | 含义 |
| --- | --- |
| **官方** | 台账记录的厂商账单金额 |
| **官方价** | 按插件**内置的厂商官方价目**算出（随包发布、自动生效） |
| **聚合** | 按随包的 **LiteLLM 聚合价目**、经该通道的别名命中算出（第三方维护、美元计价） |
| **模型官方价** | 本通道没有价目，但聚合价里这个模型名**全库唯一**（同一厂商的 `x` 与 `vendor/x` 同价双键也算）—— 就用它的价；跨厂商的候选会按内置价目里该模型的厂商兜底再查一次（多半就是该模型厂商自己的官方价） |

> **不再有「估算」**：以前内置价目与聚合价都没收录时，插件会拿台账反推一个均价凑出金额（角标「估算」）—— 那不是账单，2026-10-16 把这层整层删掉了；定不下来就是 `—`（没有角标）。

> 「**· 部分**」是口径提示、不是错误：该条聚合价目缺一档缓存价，缺的那档按**未命中价**代；两档都缺的条目按「不支持缓存计价」处理，不标「部分」。

**内置价目**（19 条；随包发布的 `data/pricing-catalog.yml`，**不要改它**，升级会覆盖）：

| 通道 | 模型 | 币种 | 来源 |
| --- | --- | --- | --- |
| `deepseek-official` | deepseek-flash · deepseek-v4.1-flash · deepseek-v4-flash · deepseek-v4-flash-vision-exp · deepseek-v4-pro | CNY | [api-docs.deepseek.com](https://api-docs.deepseek.com/zh-cn/quick_start/pricing) |
| `moonshotai` | kimi-k3 · kimi-k2.7-code · kimi-k2.7-code-highspeed · kimi-k2.6 | CNY | [platform.kimi.com](https://platform.kimi.com/docs/pricing/chat) |
| `zai` | glm-5.3 · glm-5.3-flash · glm-5.3-flashx · glm-5.2 · glm-5 | USD | [docs.z.ai](https://docs.z.ai/guides/overview/pricing) |
| `openrouter` | deepseek/deepseek-v4.1-flash · anthropic/claude-sonnet-5.5 · anthropic/claude-opus-5.5 · openai/gpt-6.1-sol · openai/gpt-6-astra | USD | [openrouter.ai](https://openrouter.ai/api/v1/models) |

- 币种按各家定价页**原样记录**（CNY / USD 并存，显示时按汇率折算）；文档没写清的档位**留空而不是猜**（例如 Kimi K2 系列未公布缓存写入价 → 该档按 0 计）；
- **错峰**：窗口按**本地时间**判定（`起止相同` = 全天，`from > to` = 跨午夜），可限定每天 / 仅工作日 / 仅周末；只有**单日范围**会用当天的 24 小时分布算错峰占比并加权，跨天按标准价（有意保守）。DeepSeek 按官方口径：**北京时间周一至周五 9:00–12:00 与 14:00–18:00 为高峰，其余（含周末）为空闲半价**；插件没有法定节假日日历，**节假日按高峰价算**（偏高、保守）。

**聚合价目**（[BerriAI/litellm](https://github.com/BerriAI/litellm) 的 [`model_prices_and_context_window.json`](https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json)，MIT，原文随包在 [`data/litellm-LICENSE.txt`](./data/litellm-LICENSE.txt)）：

- 随包快照 2,797,533 B、sha256 `6b5e1ee7…63e403`、upstream commit `30b8db32…`、抓取 2026-10-14（详见 [`data/README.md`](./data/README.md)）；按实现口径 **2697 条可定价条目 / 1546 个模型名**；
- **本地刷新副本优先于随包快照**；两份都读不到时这一层整体失效：**同模型官方价目整层没有了**，通道内价目也只剩内置价目那一档（没有内置价目的模型直接显示 `—`）—— 不抛错，也不影响别的端点；
- 匹配按通道别名表，别名命中多条时取「键 `/` 段数最少 → 键名字典序」的第一条；别名不命中时**只有模型名全库唯一才用**（同一厂商常有 `x` 与 `vendor/x` 两条价格完全一样的键，这种**同厂商同价**也算唯一），否则跳过 —— **不猜通道**；
- 通道别名基本命不中现有通道（别名表只覆盖 10 个厂商），它**真正的价值在「同模型官方价目」那一层**：模型名在聚合价里**全库唯一**时，跨通道借它给出该模型厂商自己的官方价 —— 像 `opencode-go` 这种不在别名表里的通道也能有单价（`deepseek-flash` 就是同厂商双键这一种）。同名候选跨多个厂商时，插件会看**内置价目里这个模型属于哪个厂商**，用该厂商再查一次（`glm-5.3-flash` → zai 自己的价）；只有跨厂商、价不同、内置价目也不认识的模型才整条跳过，**不猜**。

## 常见问题

<details>
<summary><b>装了新版，界面怎么还是旧的</b></summary>

宿主必须**完全退出**再重开（不是关窗口、不是刷新页面），重开后再 `Ctrl + Shift + R` 清一次浏览器缓存。桌面端最容易遇到 —— 重装插件也不会重新导入服务端模块。
</details>

<details>
<summary><b>Windows 上 pnpm 安装报 EPERM（无法创建符号链接）</b></summary>

未开启开发者模式时 Windows 不允许创建符号链接。本插件唯一的宿主 peer 依赖（`@deepseek-ai/cordis`）是 **optional**，pnpm 不会为它建链接，因此不会触发。更早的版本（≤ 0.1.4）遇到时：改用 **Plugin Hub** 安装，或开启开发者模式 / 以管理员身份运行。
</details>

<details>
<summary><b>余额卡片显示「该通道未配置 API Key」</b></summary>

需要宿主 `credentials` 能解析该通道的 `apiKeyEnv`，或该变量存在于宿主进程环境里。解析不到时插件不会去读凭据文件，而是直接回落快照。
</details>

<details>
<summary><b>成本显示为 0 / 「无计费」/ 一直显示 —</b></summary>

免费额度与本地端点没有成本概念；由会话事件补位的日期、以及项目 / 会话 / 按小时视图也没有官方成本。展开通道卡片可以看到每个模型的单价与来源：显示 `—` 说明这个模型**两层价目都没命中**（本通道没收录，模型名在聚合价里跨厂商多候选、内置价目也不认识它）—— 插件不按台账均价猜一个数字，价格文件收录了它才会有金额。
</details>

<details>
<summary><b>点了「刷新价目」，成本数字怎么没变</b></summary>

多数情况下**本来就不会变**：刷新只做一件事 —— 把上游最新价目写到本机（校验不过**不覆盖**旧文件），平时不联网、也不轮询。数字要变，得是这次上游真的改了某个**已经命中**的单价；如果一个模型一直显示 `—`，那是它的名字在聚合价里跨厂商多候选、内置价目也不认识它（按「不猜通道」跳过），刷新也不会给它安一个价。
</details>

<details>
<summary><b>汇率显示「用默认汇率 7.10，未能联网」</b></summary>

说明两个上游都取不到、本机也没有可用缓存。此时跨币种金额仍会按这个兜底值折算，工具条上会显式标出「默认值」这一行（可点开系统日志看上游地址与失败类型）；点「刷新汇率」可重试。
</details>

<details>
<summary><b>会话标题怎么不是我说的第一句话</b></summary>

标题按优先级取：宿主投影缓存 → 会话 header 字段 → **首条人类提问**（跳过 `<system-reminder>`、斜杠命令这类宿主注入文本，压平空白、截 60 字）；确实没有提问时显示「（无提问）· <短 id>」。
</details>

<details>
<summary><b>热力图的颜色深浅怎么定</b></summary>

按可见区间内**活跃日的五分位**分档（p20 / p40 / p60 / p80），不是固定阈值。
</details>

<details>
<summary><b>卸载后侧边栏还有图标</b></summary>

客户端资源需要刷新页面，服务端需要退出重开 DSH。桌面端的卸载同样在 Plugin Hub 里操作。
</details>

## 兼容与运行要求

| 项 | 要求 |
| --- | --- |
| DeepSeek Harness | 桌面端 0.2.x（客户端 slot：`sidebar.panellist` + `main`）；web profile 同样支持 |
| Node.js | ≥ 22（宿主内置） |
| 运行时依赖 | 无。`react` / `react/jsx-runtime` 由宿主注入；服务端只用 Node 内置模块；唯一 peer 是 `@deepseek-ai/cordis`（optional） |
| 可选服务 | `sessionPersistence`（缺失时项目 / 会话 / 按小时为空态）、`credentials`（缺失时余额只读快照） |
| 价目文件 | 内置价目 `data/pricing-catalog.yml` 与聚合价目快照 `data/litellm-model-prices.json` 随包发布、只读；刷新后的副本写在 `$DSH_HOME/dsh-key-usage/` |

## 开发

```bash
pnpm install          # 依赖（CI 用 pnpm，见 .github/workflows/ci.yml）
pnpm run build        # 服务端 → lib/，客户端 → client/client.js（含产物头校验）
pnpm run typecheck    # 客户端 + 服务端类型检查
pnpm run test         # 17 个离线测试
pnpm run check        # lib/*.js 语法检查
pnpm run verify       # 上面全套（CI 跑的就是这条）
pnpm run pack:dry     # 发布清单自检
```

> 本目录的 `node_modules` 是 pnpm 10.32.1 装的；用**不同大版本**的 pnpm 执行 `pnpm run` 会触发「清空 modules 目录」而中止，改用 `npm run <script>` 即可。
>
> 随包体积：`npm pack --dry-run` 实测 **48 个文件**、打包 **1.4 MB**、未压缩 **4.6 MB**（其中聚合价目快照未压缩 2.7 MB、7 张截图约 1 MB）。

**改动生效条件**（最容易踩的坑）：

| 改动 | 生效方式 |
| --- | --- |
| `src/client/**` | `pnpm run build` → **刷新页面** |
| `src/server/**` | `pnpm run build` → **退出重开 DSH**（模块在宿主启动时进入 ESM 缓存，重装插件也不会重新导入） |

**验证安装**（共 **18 个端点 = 15 个只读 `GET` + 3 个写 `POST`**，全部只接受回环请求）：

装好后点侧边栏「使用情况」能出内容即可 —— **不要用 curl / 别的进程去请求桌面端 GUI 的端口**：那个端口带宿主自身的鉴权，外部请求只会拿到 `dsh web authentication required`，看不到插件端点。要直接验端点，只能用宿主自己打开的页面（浏览器里跑 `fetch('/dsh-key-usage/channels')`），或 `dsh web` 打印出来的带 token 的地址。

**CI**：[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) 在 push / PR 上跑 `pnpm run verify`，另加「构建产物必须与源码同步」与「发布包必须含三件套」两道闸；发布由人工触发 [`publish.yml`](./.github/workflows/publish.yml)（带 provenance 签名）。目录结构、产物契约与离线自检见 [`docs/开发与构建.md`](./docs/开发与构建.md)。

## 延伸文档

[架构与数据契约](./docs/架构与数据契约.md) · [开发与构建](./docs/开发与构建.md) · [更新记录](./docs/CHANGELOG.md) · [AGENTS.md](./AGENTS.md)

过程记录按版本分卷：[v0.1.0-0.1.5](./docs/process/v0.1.0-0.1.5.md) · [v0.1.6](./docs/process/v0.1.6.md) · [v0.1.7](./docs/process/v0.1.7.md) · [v0.1.8（未发布）](./docs/process/v0.1.8.md)

## 许可证

[MIT](./LICENSE) © 2026 xyl886

非官方社区插件，与 DeepSeek 无隶属关系。
