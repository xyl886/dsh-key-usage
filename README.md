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

它和同类插件的两个区别：

- **台账 × 会话事件双源合并** —— 宿主台账停更时（很常见），台账没有记录的日期会自动回退到本地会话事件折叠补齐，**按天取舍、不相加**，并在界面上标明来源；
- **余额与订阅窗口是真·实时** —— 直接查各通道官方接口（opencode-go 的 rolling / weekly / monthly、DeepSeek 的 `/user/balance`），查不到才回落本机快照，并把失败原因写在卡片上。

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

7 个端点全部只读 GET，且只接受 `127.0.0.1` / `::1` 回环请求，非回环一律 403。

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

**会话用量**

- 按会话列出时间、时长、Tokens、命中率与成本，按日期分组，同样支持搜索 / 筛选 / 排序。

**余额与配额**

- 每个通道一张卡片：官方余额（DeepSeek 的总余额 / 赠送 / 充值）或订阅窗口占用（opencode-go 的 5 小时 / 本周 / 本月窗口 + 重置时间）；
- 实时查询成功的卡片带绿色「实时」标签与查询时间；失败的写明原因（未配置 Key / 网络不可达 / 401 / 超时）并回落快照。

## 界面预览

> 演示数据，由设计稿原型渲染（[`docs/prototype/`](./docs/prototype/)）。

<p align="center">
  <img src="./docs/images/usage-overview.png" alt="总览：Key 清单与活跃热力图" width="820" />
</p>

<p align="center">
  <img src="./docs/images/usage-daily.png" alt="使用明细：统计卡、通道占比、按天图表与每日细目" width="820" />
</p>

<p align="center">
  <img src="./docs/images/usage-quota.png" alt="余额与配额：官方余额与订阅窗口" width="820" />
</p>

## 权限与数据来源

| 读取对象 | 用途 | 说明 |
| --- | --- | --- |
| `$DSH_HOME/dsh-usage/usage-ledger.json` | 用量台账 | 按天 × 通道 × 模型，含官方成本 |
| `$DSH_HOME/dsh-usage/provider-snapshots.json` | 余额 / 窗口**回落值** | 仅在实时查询失败时使用 |
| `$DSH_HOME/profiles/<profile>/cordis.yml` | 通道清单 | 只做文本提取，**不执行**其中的 `!!js` 表达式；取不到时回退 `cordis.patch.yml` |
| 宿主 `sessionPersistence` 服务 | 项目 / 会话 / 按小时 | 只开只读句柄（`open("read") → read(0) → close`），不自行解压会话文件 |
| 宿主 `credentials` 服务 / 进程环境变量 | 查余额时的 API Key | 只用于拼 `Authorization` 请求头 |

**会联网的唯一路径**：打开「余额与配额」时按通道请求官方接口，结果缓存 60 秒（点「刷新」强制重查）：

| 通道 | 接口 |
| --- | --- |
| `opencode-go` | `GET https://opencode.ai/zen/go/v1/usage`（rolling / weekly / monthly） |
| `deepseek-official` | `GET {baseURL}/user/balance` |
| `openrouter` / `moonshotai` / `zai` | 各自的官方余额接口 |

请求 6 秒超时、响应上限 64 KiB、只发 `Authorization` 与 `Accept` 两个头；任何失败都回落本机快照并在卡片上说明原因。

- **不读凭据文件**：从不打开 `.credentials.yaml`；密钥不落盘、不进日志、不返回给前端；界面只显示 `apiKeyEnv` 这类**变量名**。
- **不写文件**：不改宿主配置，不写任何数据文件。
- **仅回环**：所有端点只监听本机回环，非回环 403。

## 兼容与运行要求

| 项 | 要求 |
| --- | --- |
| DeepSeek Harness | 桌面端 0.2.x（客户端 slot：`sidebar.panellist` + `main`）；web profile 同样支持 |
| Node.js | ≥ 22（宿主内置） |
| 运行时依赖 | 无。`react` / `react/jsx-runtime` 由宿主注入，服务端只用 Node 内置模块 |
| 必需服务 | 无 |
| 可选服务 | `sessionPersistence`（缺失时项目 / 会话 / 按小时降级为空态）、`credentials`（缺失时余额只能读快照） |

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
</details>

<details>
<summary><b>卸载后侧边栏还有图标</b></summary>

客户端资源需要刷新页面，服务端需要退出重开 DSH。桌面端的卸载同样在 Plugin Hub 里操作。
</details>

## 开发

```bash
node node_modules/tsdown/dist/run.mjs && node scripts/normalize-client-banner.mjs   # 构建客户端 → client/client.js
node node_modules/typescript/bin/tsc -p tsconfig.server.json                        # 构建服务端 → lib/
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit                      # 类型检查
node test/ledger.test.mjs    # 其余：collect / channels / session-usage / sessions / merge / live-quota / routes
```

**改动生效条件**（最容易踩的坑）：

| 改动 | 生效方式 |
| --- | --- |
| `src/client/**` | 重新构建 → **刷新页面** |
| `src/server/**` | 重新编译 `lib/` → **退出重开 DSH**（无热重载） |

另外两个坑：`tsc --noEmit` **不会**更新 `lib/`，而测试读的是 `lib/*.js`；`cordis.yml` 是应用重写的组合产物，插件集变化期间会短暂变成空模板，因此通道提取会回退到 `cordis.patch.yml`。

**目录结构**

```
src/client/   index.tsx（slot 注册）· UsagePage / UsageIcon · KeyUsageSection（Tab 外壳）
              tabs/（5 个页面）· components/ · styles/（CSS Module，basename 全局唯一）
src/server/   index.ts（cordis apply）· routes.ts（7 个只读端点）
              ledger.ts（台账）· collect.ts（通道判定）· merge.ts（台账 × 会话按天合并）
              live-quota.ts（官方余额实时查询 + 缓存）· sessions.ts / session-usage.ts（会话折叠）
lib/ client/  构建产物（发布必须带，git 与 npm 都提交）
```

客户端注册的是 `sidebar.panellist`（导航项）+ `main`（主区域整页），与官方 `dsh-context`「上下文洞察」同一套写法。

**延伸文档**：[架构与数据契约](./docs/01-架构与数据契约.md) · [原型差异清单](./docs/02-原型差异与优化清单.md) · [按 Tab 重构方案](./docs/03-按Tab拆分重构方案.md) · [会话归档的影响](./docs/04-归档会话的影响与对策.md) · [AGENTS.md](./AGENTS.md)

## 许可证

[MIT](./LICENSE) © 2026 xyl886

非官方社区插件，与 DeepSeek 无隶属关系。
