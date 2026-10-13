<div align="center">

# 使用情况 · dsh-key-usage

**DeepSeek Harness 的侧边栏用量面板** —— 按通道看 Token、缓存命中率、成本，以及余额与订阅窗口。

[![npm](https://img.shields.io/npm/v/dsh-key-usage?style=flat-square)](https://www.npmjs.com/package/dsh-key-usage)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![platform](https://img.shields.io/badge/platform-web%20%7C%20desktop-4d9fff?style=flat-square)](#兼容与运行要求)
[![node](https://img.shields.io/badge/node-%3E%3D22-339933?style=flat-square)](#兼容与运行要求)
[![topic](https://img.shields.io/badge/topic-dsh--plugin-0e7490?style=flat-square)](https://github.com/topics/dsh-plugin)

[安装](#安装) · [功能](#功能) · [界面预览](#界面预览) · [权限与数据来源](#权限与数据来源) · [常见问题](#常见问题) · [开发](#开发)

</div>

---

装上之后，左侧边栏会多一项「使用情况」，点开就是整页的用量面板：**Key 清单 + 活跃热力图、使用明细、项目用量、会话用量、余额与配额**。全部数据来自你自己的机器，默认不联网。

它和同类插件的三个区别：

- **台账 × 会话事件双源合并** —— 宿主台账停更时（很常见），台账没有记录的日期会自动回退到本地会话事件折叠补齐，**按天取舍、不相加**，并在界面上标明来源；
- **余额与订阅窗口是真·实时** —— 直接查各通道官方接口（opencode-go 的 rolling / weekly / monthly、DeepSeek 的 `/user/balance`），查不到才回落本机快照，并把失败原因写在卡片上；
- **成本有据可依** —— 插件**内置了一批厂商官方价目**（DeepSeek / Kimi / Z.ai / OpenRouter，按官方文档抓取并注明抓取日期），开箱即自动生效；你也可以维护自己的计费规则去覆盖它。四处成本按「官方账单 > 你的规则 > 内置官方价目 > 台账均价」取值，并标出来源角标（**官方 / 自定 / 官方价 / 估算**），还能看到「缓存命中省了多少钱」。

## 安装

```bash
dsh plugin --profile web add dsh-key-usage
```

装完三步：

1. **退出并重新打开 DSH** —— 插件树在宿主启动时组合，服务端代码没有热重载；
2. 刷新页面（客户端改动只需刷新）；
3. 左侧边栏出现「使用情况」图标（在「上下文洞察」下方）。

> **桌面端**：`--profile desktop` 由 Electron 应用独占，CLI 会拒绝，请在应用内的 **Plugin Hub → 安装插件** 里填 `dsh-key-usage`。

<details>
<summary>其他安装方式</summary>

```bash
# 从 GitHub 装（等价，包内含构建产物，不需要本地编译）
dsh plugin --profile web add github:xyl886/dsh-key-usage

# 本地开发：软链到本仓库，改文件即时生效
dsh plugin --profile web add link:/path/to/dsh-key-usage

# 卸载
dsh plugin --profile web remove dsh-key-usage
```

</details>

### 验证安装

```bash
curl -s http://127.0.0.1:19387/dsh-key-usage/channels   # 返回 { channels: [...] } 即已挂载
```

9 个端点全部只读 GET，且只接受 `127.0.0.1` / `::1` 回环请求，非回环一律 403。
## 功能

**总览**

- **Key 清单** —— 每个通道一行：类型（按量计费 / 免费额度 / 本地端点 / 订阅制）、今日与近 30 天的调用量、余额或订阅窗口占用、30 天成本；
- **活跃热力图** —— 近 9 个月的按日 Tokens 热力图，格子按可见区间的**活跃日三分位**分档（少 / 中 / 高），悬停看当日各模型的 Token 与占比。

**使用明细**

- **范围与筛选** —— 今日 / 周 / 月 / 总计 / 自定义，按通道筛选，全页联动；
- **三张统计卡** —— 调用次数、Tokens（含缓存命中率）、成本；
- **通道占比条** —— 一个横条看各通道占比，悬停出明细；
- **按天 / 按小时图表** —— 堆叠柱状图，横轴铺满所选范围；单日范围自动切成 24 小时视图；
- **每日细目** —— 每天一行，可展开到模型级别（调用 / 输入 / 输出 / 缓存读 / 命中率 / 成本）。

**项目用量**

- 按工作目录聚合的调用数、Tokens、占比、成本与最近活跃时间，支持搜索、按通道筛选、按列排序。

**按模型**

- 按 `通道 + 模型` 聚合的调用数、Tokens、占比、缓存命中率、成本与会话数，支持搜索、按通道筛选、按列排序。

**会话用量**

- 按会话列出时间、时长、Tokens、命中率与成本，按日期分组，同样支持搜索 / 筛选 / 排序。

**导出**

- 使用明细 / 按模型 / 项目用量 / 会话用量四处都能把**当前筛选后的数据**导出成 CSV 或 JSON；CSV 带 UTF-8 BOM，Excel 打开中文不乱码。

**余额与配额**

- 每个通道一张卡片：官方余额（DeepSeek 的总余额 / 赠送 / 充值）或订阅窗口占用（opencode-go 的 5 小时 / 本周 / 本月窗口 + 重置时间）；
- 实时查询成功的卡片带绿色「实时」标签与查询时间；失败的写明原因（未配置 Key / 网络不可达 / 401 / 超时）并回落快照。

**计费规则**（在「余额与配额」页下半部分，同一个面板也出现在插件页）

- **内置官方价目（自动生效，不用你填）** —— 已收录 DeepSeek / Kimi / Z.ai / OpenRouter 共 18 条官方价（含四档单价、错峰窗口、来源 URL 与抓取日期），启动即参与成本计算；
- **规则列表** —— 通道 · 模型 · 单位（每百万 / 每千 tokens / 每次调用）· 输入 / 缓存读 / 缓存写 / 输出四档单价 · 币种 · 错峰时段（可限定**每天 / 仅工作日 / 仅周末**）· 备注；你的规则**优先于**内置价目；
- **一键套用厂商模板** —— 把内置价目转成可编辑的用户规则（DeepSeek 错峰 = 高峰半价、Kimi K3、GLM-5.3 / Flash），套用后数值可改；
- **成本来源角标** —— 四处成本都标 `官方`（台账账单金额）/ `自定`（你的规则）/ `官方价`（插件内置的官方价目）/ `估算`（台账反推均价），没有依据时显示 `—`；
- **缓存命中省了多少钱** —— `命中 tokens × (未命中价 − 命中价)`，按币种与模型列出；
- **导入 / 导出 JSON**、**清空规则**（回到内置价目 + 台账反推均价）。

## 界面预览

> 真实界面截图（**演示数据**，截图中的项目路径与部分金额已打码）。

<p align="center">
  <img src="./docs/images/usage-overview.png" alt="总览：Key 清单（含余额 / 窗口与成本来源）与活跃热力图" width="820" />
</p>

<p align="center">
  <img src="./docs/images/usage-daily.png" alt="使用明细：六张统计卡、环比对比、通道占比、按天图表与每日细目" width="820" />
</p>

<p align="center">
  <img src="./docs/images/按模型.png" alt="按模型：按通道 + 模型聚合的调用数、Tokens、占比、命中率与成本（带来源角标）" width="820" />
</p>

<p align="center">
  <img src="./docs/images/项目总量.png" alt="项目用量：按工作目录聚合的调用数、Tokens、占比、成本与最近活跃" width="820" />
</p>

<p align="center">
  <img src="./docs/images/usage-quota.png" alt="余额与配额：官方余额、订阅窗口与计费规则" width="820" />
</p>

> 设计意图与原型见 [`docs/prototype/`](./docs/prototype/)（早期设计稿，不代表当前界面）。

## 权限与数据来源

| 读取对象 | 用途 | 说明 |
| --- | --- | --- |
| `$DSH_HOME/dsh-usage/usage-ledger.json` | 用量台账 | 按天 × 通道 × 模型，含官方成本 |
| `$DSH_HOME/dsh-usage/provider-snapshots.json` | 余额 / 窗口**回落值** | 仅在实时查询失败时使用 |
| `$DSH_HOME/profiles/<profile>/cordis.yml` | 通道清单 | 只做文本提取，**不执行**其中的 `!!js` 表达式；取不到时回退 `cordis.patch.yml` |
| 宿主 `sessionPersistence` 服务 | 项目 / 会话 / 按小时 | 只开只读句柄（`open("read") → read(0) → close`），不自行解压会话文件 |
| 宿主 `credentials` 服务 / 进程环境变量 | 查余额时的 API Key | 只用于拼 `Authorization` 请求头 |
| 宿主 `settings` 服务（读） | 计费规则 | 只读 `dsh-key-usage` 命名空间里的规则；**写盘不归插件做**（见下） |
| 宿主 `configForms` 服务（客户端） | 计费规则的编辑界面 | 复用宿主设置服务：写入由宿主的 config-editor 落到当前 profile 的 cordis patch |

**唯一写入的对象**：

| 写入对象 | 用途 | 说明 |
| --- | --- | --- |
| `$DSH_HOME/dsh-key-usage/quota-snapshots.json` | 余额 / 订阅窗口**快照** | 每次实时查询成功即落盘（原子写：临时文件 + 改名，只保留每个通道最新一份）；失败回落时与宿主那份**取更新的**。不含任何密钥，内容就是 `/quota` 返回的余额与窗口 |

> **计费规则不写文件**：规则通过宿主的设置服务保存（命名空间就是本插件在 profile 里的条目 id `dsh-key-usage`，
> 由宿主的 config-editor 原子写当前 profile 的 `cordis.patch.yml`，并保留文件里的注释）。
> 插件自己既不写也不改这个文件，仍然只写上面那一个 `quota-snapshots.json`。

**会联网的唯一路径**：打开「余额与配额」时按通道请求官方接口，结果缓存 60 秒（点「刷新」强制重查）：

| 通道 | 接口 |
| --- | --- |
| `opencode-go` | `GET https://opencode.ai/zen/go/v1/usage`（rolling / weekly / monthly） |
| `deepseek-official` | `GET {baseURL}/user/balance` |
| `openrouter` / `moonshotai` / `zai` | 各自的官方余额接口 |

请求 6 秒超时、响应上限 64 KiB、只发 `Authorization` 与 `Accept` 两个头；任何失败都回落本机快照并在卡片上说明原因。

- **不读凭据文件**：从不打开 `.credentials.yaml`；密钥不落盘、不进日志、不返回给前端；界面只显示 `apiKeyEnv` 这类**变量名**。
- **只写一个自己的文件**：`$DSH_HOME/dsh-key-usage/quota-snapshots.json` —— **每次余额/窗口实时查询成功**后落一份快照，下次查询失败时回落到「最近一次成功」而不是宿主那份可能很旧的快照（本机实测宿主那份已 13 天未更新）。不改宿主配置，不碰宿主的 `provider-snapshots.json`、不写其它任何数据文件。计费规则的保存由宿主的配置服务负责，插件不参与写盘。
- **仅回环**：所有端点只监听本机回环，非回环 403。

## 兼容与运行要求

| 项 | 要求 |
| --- | --- |
| DeepSeek Harness | 桌面端 0.2.x（客户端 slot：`sidebar.panellist` + `main`，配置服务 `configForms`）；web profile 同样支持 |
| Node.js | ≥ 22（宿主内置） |
| 运行时依赖 | 无。`react` / `react/jsx-runtime` 由宿主注入，服务端只用 Node 内置模块；`@deepseek-ai/schemastery`（服务端声明计费规则 Config 用）与 `@deepseek-ai/dsh-client-ui-settings`（客户端规则表单用）由宿主提供 —— 前者按 `peerDependencies` 走宿主的 runtime resolution 解析，缺失时计费规则面板降级为只读 + 导入导出 |
| 必需服务 | 无 |
| 可选服务 | `sessionPersistence`（缺失时项目 / 会话 / 按小时降级为空态）、`credentials`（缺失时余额只能读快照）、`settings` / `configForms`（缺失时计费规则只能导入导出、成本按台账均价估算） |

## 常见问题

<details>
<summary><b>「今日」列是空的 / 数据比官方少</b></summary>

数据优先取宿主用量台账；台账长期不更新时，没有记录的日期会回退到本地会话事件折叠补齐（页脚口径说明会显示当前有多少天是会话补位的）。两套来源**按天取舍、不相加**，所以不会重复计数，但会话补位的那几天没有官方成本。
</details>

<details>
<summary><b>余额卡片显示「该通道未配置 API Key」</b></summary>

需要宿主 `credentials` 能解析该通道的 `apiKeyEnv`（如 `OPENCODE_GO_API_KEY`），或该变量存在于宿主进程环境里。解析不到时插件不会去读凭据文件，而是直接回落快照。
</details>

<details>
<summary><b>热力图的颜色深浅怎么定</b></summary>

按可见区间内**活跃日的三分位**分档（p33 / p67），不是固定阈值 —— 这样低用量和高用量都能看出层次。
</details>

<details>
<summary><b>成本显示为 0 / 「无计费」</b></summary>

免费额度、本地端点没有成本概念；由会话事件补位的日期也没有官方成本。项目 / 会话 / 按小时视图统一不计成本（页脚口径里有说明）。
想让它有数字，先确认这个模型是否在插件**内置官方价目**的覆盖范围内（覆盖清单见 `docs/05-后续版本计划.md` 附录 A.5）；没覆盖就去「余额与配额」页下半部分的**计费规则**里手填单价。
</details>

<details>
<summary><b>成本旁边的「官方 / 自定 / 官方价 / 估算」是什么意思</b></summary>

- **官方**：台账记录的厂商账单金额（最可信，不会被规则覆盖）；
- **自定**：按你填的计费规则算出（优先级高于内置价目）；
- **官方价**：按插件**内置的厂商官方价目**算出（从官方文档抓取，自动生效，来源与抓取日期在计费面板可查）；
- **估算**：内置价目也没收录时，按台账反推的均价推算；
- 没有角标、显示 `—`：既没有官方数字，也没有规则、内置价目和均价。
</details>

<details>
<summary><b>内置价目里的价格是哪里来的 / 怎么更新</b></summary>

来自各厂商**官方文档**（DeepSeek / Moonshot·Kimi / Z.ai / OpenRouter），逐条记录精确来源 URL 与抓取日期，写在 `src/server/pricing-catalog.ts` 里，**运行时不联网抓价**。
厂商调价后需要人工更新该文件；文档没写清楚的档位（例如 Kimi K2 系列未公布缓存写入价）**留空而不是猜**，此时该档按 0 计。
</details>

<details>
<summary><b>填了规则但成本没变</b></summary>

规则按 `通道 id + 模型 id` 匹配，先精确、再 `通道+*`、`*+模型`、`*+*`。先确认规则里的**通道 id 与模型 id 跟页面上显示的一致**（模型 id 可能带尾随空格，从「使用明细」里复制最稳）。另外台账已经记录了官方成本的那些天**不会**被规则覆盖 —— 这是有意的。
</details>

<details>
<summary><b>错峰价格什么时候生效</b></summary>

窗口按**本地时间**判定（`起止相同` = 全天，`from > to` = 跨午夜，`24:00` = 当天末尾），每个窗口还能限定**生效的星期**（每天 / 仅工作日 / 仅周末；不选即每天）。单日范围会用当天的 24 小时用量分布算错峰占比并加权；跨天、会话、项目、按模型这些没有小时分布的地方按标准价计算，属有意保守。

内置的 DeepSeek 价目按官方口径配置：**北京时间周一至周五 9:00–12:00 与 14:00–18:00 是高峰，其余时段（含周末全天）是空闲（半价）**。插件没有中国法定节假日日历，**节假日会按高峰价算** —— 这会让金额偏高（保守），是已知近似。
</details>

<details>
<summary><b>卸载后侧边栏还有图标</b></summary>

客户端资源需要刷新页面，服务端需要退出重开 DSH。桌面端的卸载同样在 Plugin Hub 里操作。
</details>

## 开发

```bash
pnpm install          # 依赖（CI 用 pnpm，见 .github/workflows/ci.yml）
pnpm run build        # 服务端 → lib/，客户端 → client/client.js（含产物头校验）
pnpm run typecheck    # 客户端 + 服务端类型检查
pnpm run test         # 11 个离线测试
pnpm run check        # lib/*.js 语法检查
pnpm run verify       # 上面全套（CI 跑的就是这条）
pnpm run pack:dry     # 发布清单自检
```

> 本目录的 `node_modules` 目前是 pnpm 10.32.1 装的；用**不同大版本**的 pnpm 执行 `pnpm run` 会触发「清空 modules 目录」而中止。此时改用 `npm run <script>`（等价），或先按 `packageManager` 字段对齐 pnpm 版本再重装依赖。

**改动生效条件**（最容易踩的坑）：

| 改动 | 生效方式 |
| --- | --- |
| `src/client/**` | `pnpm run build` → **刷新页面** |
| `src/server/**` | `pnpm run build` → **退出重开 DSH**（模块在宿主启动时进入 ESM 缓存，重装插件也不会重新导入） |

另外两个坑：`tsc --noEmit` **不会**更新 `lib/`，而测试读的是 `lib/*.js`；`cordis.yml` 是应用重写的组合产物，插件集变化期间会短暂变成空模板，因此通道提取会回退到 `cordis.patch.yml`。

**CI**：[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) 在 push / PR 上跑 `pnpm run verify`，另加两道闸：**构建产物必须与源码同步**（`lib/`、`client/` 是要提交的）与**发布包必须含三件套**（`lib/index.js`、`client/client.js`、`cordis.patch.yml`）。发布仍是人工动作。

**目录结构**

```
src/client/   index.tsx（slot 注册 + configForms 接线）· UsagePage / UsageIcon · KeyUsageSection（Tab 外壳）
              tabs/（6 个页面）· components/（含 PricingRulesPanel / PricingCard / CostSourceChip）
              export.ts · pricing.ts + pricingSettings.ts（计费规则视图模型与读写通道）
              styles/（CSS Module，basename 全局唯一）
src/server/   index.ts（cordis apply + 计费规则的 Config）· routes.ts（9 个只读端点）
              pricing.ts（计费规则：匹配 / 错峰 / 单位换算 / 缓存省钱）
              pricing-catalog.ts（内置官方价目：纯静态数据 + 保守匹配，零外网）
              ledger.ts（台账）· collect.ts（通道判定）· merge.ts（台账 × 会话按天合并）
              live-quota.ts（官方余额实时查询 + 缓存）· quota-snapshots.ts（成功即落盘，失败回落）
              sessions.ts / session-usage.ts / session-meta.ts（会话折叠 / 标题 / 归档）
lib/ client/  构建产物（发布必须带，git 与 npm 都提交）
```

客户端注册的是 `sidebar.panellist`（导航项）+ `main`（主区域整页），与官方 `dsh-context`「上下文洞察」同一套写法；
计费规则另外挂一个 `plugins.bundle.config`（插件页配置卡片），用的是宿主 `configForms` 服务。

**验证计费规则的离线自检**（读宿主实现，不联网、不改任何文件）：

```bash
node test/probe/asar_extract_schemastery.mjs    # 把宿主自带的 schemastery 抽到 test/out/
node test/probe/dsh_settings_schema_probe.mjs   # 校验 volatile 表单 / 值投影 / 写入路径 / 客户端回放
```

**延伸文档**：[架构与数据契约](./docs/01-架构与数据契约.md) · [原型差异清单](./docs/02-原型差异与优化清单.md) · [按 Tab 重构方案](./docs/03-按Tab拆分重构方案.md) · [会话归档的影响](./docs/04-归档会话的影响与对策.md) · [后续版本计划](./docs/05-后续版本计划.md) · [AGENTS.md](./AGENTS.md)

## 许可证

[MIT](./LICENSE) © 2026 xyl886

非官方社区插件，与 DeepSeek 无隶属关系。
