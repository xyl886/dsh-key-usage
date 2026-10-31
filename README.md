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

侧边栏「使用情况」共 **7 个页面**：**额度、概览、明细、分布、会话、工具、提问**。顶部工具栏是**全局筛选**（范围 / 日期 + 通道 / 项目 / 模型），七个页面的数字都由它驱动；默认「分页」一次看一个页面，可切「滚动」整页铺开。数据全部来自你自己的机器，**默认不联网**；界面**中英双语**（跟随宿主语言设置），字号跟随宿主通用设置。

## 安装

```bash
dsh plugin --profile web add dsh-key-usage
dsh plugin --profile desktop add dsh-key-usage
```

## 界面预览

当前界面与 7 个页面如下（截图由作者维护，落后时以实际界面为准）：

| 页面 | 内容 |
| --- | --- |
| 额度 | 每通道一张卡：订阅窗口占用或余额、重置时间、单价表入口；跟随顶部「通道」筛选 |
| 概览 | 十张 KPI 卡（含上期与环比）；使用趋势（今天按小时、7 天按 6 小时、其余按天、「全部」为年热力图）；项目 / 模型排行；按时段热力（长期画像） |
| 明细 | 分时 / 每日成本柱状图（费用 · Token · 输出 Token · 会话）；逐日明细表（按天 / 通道 / 模型，可排序、可展开模型） |
| 分布 | 项目 × 模型 Mekko、缓存节省、Token 构成、通道成本 |
| 会话 | 最耗会话 / 会话形态 / 最近会话；会话详情抽屉 |
| 工具 | 工具与技能调用排行、MCP server、近期趋势（不区分通道） |
| 提问 | 提问词云（Top 60）、提问数 / 字数 / 词数 KPI 与环比 |

## 数据、权限与联网

**读什么**

| 读取对象 | 用途 |
| --- | --- |
| `$DSH_HOME/dsh-usage/usage-ledger.json` | 用量台账（天 × 通道 × 模型，含官方成本） |
| `$DSH_HOME/dsh-usage/provider-snapshots.json` | 余额 / 窗口的**回落值** |
| `$DSH_HOME/profiles/<profile>/cordis.yml` | 通道清单（只做文本提取，**不执行**其中的 `!!js`；取不到回退 `cordis.patch.yml`） |
| 宿主 `sessionPersistence` 服务 | 项目 / 会话 / 单会话详情 / 按小时（只开只读句柄，不自行解压会话文件） |
| 宿主 `credentials` 服务 / 进程环境变量 | 查余额时的 API Key（只用于拼 `Authorization`） |
| 随包 `data/litellm-model-prices.json` | 聚合价目快照（只读） |

**写什么**（只有一个数据文件：`$DSH_HOME/dsh-key-usage/usage.db`，SQLite）：

| 表 | 内容 |
| --- | --- |
| `snapshot_section` | 快照分段（各页面共用一份，本地段 5 分钟重建；打开页面先渲染上一份，再后台重算） |
| `litellm_price` | 聚合价目行级表（刷新价目成功后写入，校验不过不覆盖） |
| `app_meta` | 运行期元信息（schema 版本、快照文档版本、价目快照的 count / bytes / sha256 / fetchedAt / upstream） |
| `fx_rate` | 汇率缓存（成功才写，12 小时内复用） |
| `log_entry` | 系统日志（保留 7 天）：刷新价目 / 汇率 / 余额失败原因、端点失败、快照问题 |
| `quota_seed` | 历史配额种子（只读） |

旧版按文件存的 `snapshot.json` / `model-prices.json` / `fx-rate.json` / `plugin.log` / `quota-snapshots.json` 只在首次启动时导入一次并移入 `.trash`，之后不再读写。**不读凭据文件、不改宿主配置、所有端点仅接受回环请求** —— 完整约束见 [AGENTS.md](./AGENTS.md)。

**会联网的四个动作，都要你触发**：

**会联网的三个动作，都要你触发**：

| 动作 | 说明 |
| --- | --- |
| **打开插件页** / 打开总览的通道详情弹窗 | 按通道查官方余额 / 窗口接口：**打开页面时若余额数据超过 60 秒就后台补查一次**（不阻塞首屏，几秒后自动刷新出来），其余时候读缓存；6 秒超时、64 KiB 上限、结果缓存 60 秒（点「刷新」强制重查），失败回落本机快照，原因写进系统日志 |
| 设置里的「刷新价目」 | `POST /dsh-key-usage/pricing/refresh`：先 `raw.githubusercontent.com`、失败再试 jsDelivr 镜像；服务端 20 秒预算、响应上限 12 MiB，校验不过**不覆盖**已有文件；界面最多等 30 秒 |
| **打开插件页时的更新检查** | `GET /dsh-key-usage/update`：打开页面后台查一次 npm 的 `latest` 版本（24 小时节流、5 秒超时）；有新版本时只在「设置 → 版本」行显示 `0.2.4 → 0.2.5` 与页头一个小圆点，点击复制升级命令，**不会自动下载或安装** |
| **设置弹窗里的「刷新汇率」**（打开页面也会顺带取一次缓存的汇率） | `GET /dsh-key-usage/fx`：主 `open.er-api.com`、备 `api.frankfurter.app`；6 秒超时、64 KiB 上限、12 小时 TTL 内不联网；失败回落缓存，再失败用默认 7.1 并在界面明示 |

**不做开机拉取、不做定时轮询、不在其它端点里隐式联网**。打开页面触发的重算只走本地数据（台账 + 会话），联网的只有上面这三个动作。

**界面语言与字号**：文案全部走词典（中 / 英），语言**只跟宿主设置**（设置 → 通用 → 语言），插件内不加语言开关；字号按宿主注入的 `--dsh-content-font-size` 缩放，**通用设置里改字号，插件整页跟着变**。

## 功能

**全局工具栏**

- 范围：今天 / 7 天 / 30 天 / 90 天 / 全部 + 日历区间选择（可自定义起止）；
- 三个维度筛选：通道 / 项目 / 模型（支持搜索、全选、清空、多选，选项按 Token 用量降序）；
- 每一行的数字都由这四组条件驱动：额度只跟通道；工具跟范围 + 项目 + 模型（事件没有通道维度）；提问四维全跟；其余页面跟范围 + 通道 + 模型（台账没有项目维度）。

**额度**

- 每通道一张卡：订阅制显示各窗口占用（5 小时 / 本周 / 本月 + 重置时间），按量计费显示余额构成；
- 点卡片标题打开该通道的**模型单价表弹窗**（含官方价 / 聚合 / 模型官方价来源与「· 部分」标记），可切换 ¥ / $ 与刷新汇率、价目；失败原因进系统日志，不占版面。

**概览**

- **十张 KPI 卡**：成本、Tokens、输入、输出、缓存读、缓存命中率、日均 Tokens、日均成本、调用次数、会话数；每张卡带**上期值与环比**（上期 = 上一等长窗口，套用同一组通道 / 模型筛选；成本类上涨用提示色、下降用安全色，命中率按百分点 `pp`）；
- **使用趋势**：范围=今天按小时（24 根）、7 天按 6 小时（28 根）、其余按天；「全部」是年热力图；指标可切活跃度 / Token / 输出 Token / 缓存读 / 会话 / 费用；
- **项目 / 模型排行**：指标可切，末尾「还有 N 个」可点开完整排行；
- **按时段**：一周 × 24 小时热力，四档指标（调用 / Token / 会话 / 费用），费用按该小时逐模型价目计算、**错峰按星期几 + 小时判定**；这是长期画像，不随范围切片。

**明细**

- **分时 / 每日成本**：范围=今天画 24 根小时柱、7 天画 28 根 6 小时柱、其余按天；四档指标（费用 / Token / 输出 Token / 会话）都来自同一份数据；
- **逐日明细表**：按天 / 通道 / 模型三种维度，列可排序、行可展开模型构成，成本列带来源角标，支持 CSV 导出。

**分布**

- 项目 × 模型 **Mekko**（块宽 = 成本占比）、缓存节省、Token 构成、通道成本；通道筛选会收窄模型行的成本与占比，项目块受项目筛选驱动。

**会话**

- 最耗会话 / 会话形态 / 最近会话三个视角；子代理不单独占行（父行标子会话数，详情抽屉里可展开）；
- 会话详情抽屉：首条真实提问、工作区、通道、四类 tokens 与命中率、成本来源、逐模型占比、24 小时分布；
- 列表首屏 50 条 + 「加载更多」，支持搜索与排序。

**工具**

- 工具调用排行（Top 7 + 其它）、技能与 MCP server 排行、窗口内按天趋势；只跟范围 + 项目 + 模型，**不区分通道**。

**提问**

- 提问词云（Top 60，悬停看次数与占比）、四张 KPI（提问数 / 字数 / 词数 / 平均长度）带上期环比；
- 分词走 `jieba-wasm`（中文）+ 标识符正则（英文），注入文本与虚词已清洗。

**设置与日志**

- 页头「设置」弹窗三个 tab：设置（显示币种与汇率、价目刷新、关于）、日志（平铺列表，可筛选 / 搜索 / 导出 / 清空）、口径（数据来源与统计口径说明）；
- 页面上的失败只留一行「结论 · 查看系统日志」。

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
- **错峰**：窗口按**本地时间**判定（`起止相同` = 全天，`from > to` = 跨午夜），可限定每天 / 仅工作日 / 仅周末；**按天成本**用当天 24 小时分布算错峰占比并加权；**按时段 / 分时图表**的每小时金额直接用该小时的模型桶计价（错峰按星期几 + 小时判定）。DeepSeek 按官方口径：**北京时间周一至周五 9:00–12:00 与 14:00–18:00 为高峰，其余（含周末）为空闲半价**；插件没有法定节假日日历，**节假日按高峰价算**（偏高、保守）。

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
| 运行时依赖 | 服务端两个 wasm 包：`node-sqlite3-wasm`（本地库读写）与 `jieba-wasm`（提问分词，仅服务端、懒加载）；`react` / `react/jsx-runtime` 由宿主注入；唯一 peer 是 `@deepseek-ai/cordis`（optional） |
| 可选服务 | `sessionPersistence`（缺失时项目 / 会话 / 按小时为空态）、`credentials`（缺失时余额只读快照） |
| 价目文件 | 内置价目 `data/pricing-catalog.yml` 与聚合价目快照 `data/litellm-model-prices.json` 随包发布、只读；刷新后的副本写进 `usage.db` |

## 开发

```bash
pnpm install          # 依赖（CI 用 pnpm，见 .github/workflows/ci.yml）
pnpm run build        # 服务端 → lib/，客户端 → client/client.js（含产物头校验）
pnpm run typecheck    # 客户端 + 服务端类型检查
pnpm run test         # 全部离线测试（自动枚举 test/*.test.mjs）
pnpm run check        # lib/**/*.js 语法检查（自动枚举）
pnpm run check:tokens # 颜色令牌必须在宿主里真实声明过
pnpm run check:ui     # 间距 / 圆角 / 字号 / 控件高必须在 UI 刻度内
pnpm run check:css    # 组件引用的 CSS Module 类名必须真实存在
pnpm run check:eol    # 源码必须 LF（避免 sourcemap 与 CI 不一致）
pnpm run check:i18n   # 中英词典键必须一致
pnpm run verify       # 上面全套（CI 跑的就是这条）
pnpm run pack:dry     # 发布清单自检
```

> 本目录的 `node_modules` 是 pnpm 10.32.1 装的；用**不同大版本**的 pnpm 执行 `pnpm run` 会触发「清空 modules 目录」而中止，改用 `npm run <script>` 即可。
>
> 随包体积：`npm pack --dry-run` 实测 **50 个文件**、打包约 **1.5 MB**（其中聚合价目快照未压缩 2.7 MB）。

**改动生效条件**（最容易踩的坑）：

| 改动 | 生效方式 |
| --- | --- |
| `src/client/**` | `pnpm run build` → **刷新页面** |
| `src/server/**` | `pnpm run build` → **退出重开 DSH**（模块在宿主启动时进入 ESM 缓存，重装插件也不会重新导入） |

**验证安装**（共 **21 个端点 = 17 个只读 `GET` + 4 个写 `POST`**，全部只接受回环请求）：

装好后点侧边栏「使用情况」能出内容即可 —— **不要用 curl / 别的进程去请求桌面端 GUI 的端口**：那个端口带宿主自身的鉴权，外部请求只会拿到 `dsh web authentication required`，看不到插件端点。要直接验端点，只能用宿主自己打开的页面（浏览器里跑 `fetch('/dsh-key-usage/channels')`），或 `dsh web` 打印出来的带 token 的地址。

**CI**：[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) 在 push / PR 上跑 `pnpm run verify`，另加「构建产物必须与源码同步」与「发布包必须含三件套」两道闸；发布由人工触发 [`publish.yml`](./.github/workflows/publish.yml)（带 provenance 签名）。目录结构、产物契约与离线自检见 [`docs/开发与构建.md`](./docs/开发与构建.md)。

## 延伸文档

[架构与数据契约](./docs/架构与数据契约.md) · [开发与构建](./docs/开发与构建.md) · [更新记录](./docs/CHANGELOG.md) · [AGENTS.md](./AGENTS.md)

界面刻度与对齐规则见 [UI规范](./docs/UI规范.md)。过程记录按版本分卷：[v0.1.0-0.1.5](./docs/process/v0.1.0-0.1.5.md) · [v0.1.6](./docs/process/v0.1.6.md) · [v0.1.7](./docs/process/v0.1.7.md) · [v0.1.8](./docs/process/v0.1.8.md) · [v0.1.9](./docs/process/v0.1.9.md) · [v0.2.0-0.2.3](./docs/process/v0.2.0-0.2.3.md)

## 许可证

[MIT](./LICENSE) © 2026 xyl886

非官方社区插件，与 DeepSeek 无隶属关系。
