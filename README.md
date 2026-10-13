# dsh-key-usage

**在 DeepSeek Harness 的侧边栏里看用量。** 装上之后，左侧导航会多一项「使用情况」，点开就是整页的用量面板：按通道看 Token、缓存命中率、成本与余额 / 订阅窗口，另外还有年度热力图、项目用量、会话用量。

- **本地为主**：用量、项目、会话数据全部来自本机台账、配置与宿主会话事件；**只有「余额与配额」会请求各通道官方接口**（实时优先，失败回落本机快照）。
- **不碰密钥**：凭据经宿主 `credentials` 服务解析（或进程环境变量），只用于拼 `Authorization` 请求头；不落盘、不进日志、不返回给前端，也从**不打开** `.credentials.yaml`。
- 只读官方会话句柄（`open("read") → read(0) → close`），不改写、不解压历史日志。

## 安装

```bash
# web profile
dsh plugin --profile web add github:xyl886/dsh-key-usage

# tui / headless 等其它 profile 同理，换成对应名字
dsh plugin --profile tui add github:xyl886/dsh-key-usage
```

桌面端（`desktop` profile）由 Electron 应用独占，CLI 会拒绝安装，请在应用内的 **Plugin Hub → 安装插件** 里填 `github:xyl886/dsh-key-usage`。

安装后：客户端改动刷新页面即生效；**服务端插件代码在宿主启动时加载，需要退出并重新打开应用**。

## 它能做什么

| 页面 | 内容 |
| --- | --- |
| 总览 | Key 清单（通道 / 类型 / 今日 / 近 30 天 / 余额或窗口 / 30 天成本）+ 年度活跃热力图（按日 Tokens，悬停看当日各模型占比） |
| 使用明细 | 范围切换（今日 / 周 / 月 / 总计 / 自定义）+ 调用次数·Tokens·成本三卡 + 通道占比条 + 按天（单日按小时）堆叠图 + 每日细目（可展开到模型） |
| 项目用量 | 按工作目录聚合：调用 / Tokens / 占比 / 成本 / 最近活跃，可搜索、筛选通道、排序 |
| 会话用量 | 按会话列出时间 / 时长 / Tokens / 命中率 / 成本，按日分组，可搜索、筛选、排序 |
| 余额与配额 | 各通道余额与订阅窗口占用（实时查询官方接口，失败回落快照并标明来源） |

## 界面预览

> 以下为演示数据（由设计稿原型渲染，界面元素与实现一致）。

**总览** —— Key 清单 + 年度热力图

![总览](./docs/images/usage-overview.png)

**使用明细** —— 统计卡、通道占比、按天/按小时图表与每日细目

![使用明细](./docs/images/usage-daily.png)

**余额与配额** —— 官方余额与订阅窗口

![余额与配额](./docs/images/usage-quota.png)

## 数据来源与权限

| 读取对象 | 用途 | 说明 |
| --- | --- | --- |
| `$DSH_HOME/dsh-usage/usage-ledger.json` | 用量台账 | 按天 × 通道 × 模型；台账没有记录的日期会回退到会话事件补齐 |
| `$DSH_HOME/dsh-usage/provider-snapshots.json` | 余额 / 订阅窗口**回落值** | 实时查询失败时才用，界面会标出「显示本机快照」 |
| `$DSH_HOME/profiles/<profile>/cordis.yml`（取不到时回退 `cordis.patch.yml`） | 通道清单 | 只做文本提取，**不执行** 文件里的 `!!js` 表达式 |
| 宿主 `sessionPersistence` 服务 | 项目 / 会话 / 按小时 | 只开只读句柄；服务缺失或读取失败时降级为「数据不可用」，不影响其它页面 |
| 宿主 `credentials` 服务 / 进程环境变量 | 查余额时的 API Key | 只拼 `Authorization` 请求头；不落盘、不进日志、不返回给前端 |

**会联网的唯一路径**：打开「余额与配额」时，服务端按通道请求官方接口，结果缓存 60 秒（点「刷新」则强制重查）：

| 通道 | 接口 | 用途 |
| --- | --- | --- |
| `opencode-go` | `GET https://opencode.ai/zen/go/v1/usage` | 订阅窗口占用（rolling / weekly / monthly）与重置时间 |
| `deepseek-official` | `GET {baseURL}/user/balance` | 余额（总余额 / 赠送 / 充值） |
| `openrouter` / `moonshotai` / `zai` | 各自的官方余额接口 | 余额 |

请求 6 秒超时、响应上限 64 KiB、只发 `Authorization` 与 `Accept` 两个头；任何失败（未配置 Key、网络不可达、401/403、非 JSON）都会**回落本机快照**并在卡片上标明原因。

- **凭据**：不读取任何凭据文件、不展示、不上传；界面只显示 `apiKeyEnv` 这类**变量名**做溯源提示。
- **写入**：不写任何文件，不改宿主配置。
- **端口**：服务端 7 个端点全部只读 GET，且只接受 `127.0.0.1` / `::1` 回环请求，其它来源一律 403。

## 兼容与运行要求

- DeepSeek Harness 桌面端 0.2.x（客户端 slot：`sidebar.panellist` + `main`）；web profile 亦可。
- 无需额外运行时依赖：`react` / `react/jsx-runtime` 由宿主注入，服务端只用 Node 内置模块（含内置 `fetch`）。
- 依赖宿主 `sessionPersistence` 服务提供项目 / 会话 / 按小时数据；该服务缺失时自动降级，其余功能正常。
- 余额 / 配额需要该通道的 API Key 能被宿主 `credentials` 解析（或存在于进程环境变量）；解析不到就只显示快照。
- 成本：台账里带官方成本；由会话事件补齐的日期没有官方成本，界面会标注来源。

**能力分类**：界面与体验 ｜ **许可证**：MIT（见 [LICENSE](./LICENSE)）

---

# 开发

## 构建与测试

```bash
# 在仓库根目录执行
node node_modules/tsdown/dist/run.mjs && node scripts/normalize-client-banner.mjs   # 构建客户端 → client/client.js
node node_modules/typescript/bin/tsc -p tsconfig.server.json                        # 构建服务端 → lib/
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit                      # 类型检查
node test/ledger.test.mjs   # 其余：collect / channels / session-usage / sessions / merge / live-quota / routes
```

`package.json` 的 `check` / `test` 脚本已覆盖全部 8 个 lib 文件与 8 个测试。

> 这类插件的 `node_modules` 常由较旧的 pnpm 装出，而宿主自带 pnpm 版本更新，
> 直接 `pnpm run` / `npx` 会因版本不匹配触发「清空 modules 目录」而中止 —— 所以上面用 `node` 直接调本地工具链。

## 目录结构

```
dsh-key-usage/
├── src/
│   ├── client/                      # 客户端 bundle 源码（entry: index.tsx）
│   │   ├── index.tsx                # cordis 接线：注册 sidebar.panellist + main
│   │   ├── UsagePage.tsx            # 主区域整页容器（含滚动）
│   │   ├── UsageIcon.tsx            # 侧边栏导航图标（currentColor）
│   │   ├── KeyUsageSection.tsx      # 页面内容：Tab 路由 + 取数 + 范围/筛选状态
│   │   ├── api.ts                   # 端点取数封装
│   │   ├── format.ts                # 数字 / 时间 / 时长格式化
│   │   ├── channels.ts              # 通道颜色、状态、计费模式文案
│   │   ├── tooltip.tsx              # 共享浮层
│   │   ├── types.ts                 # 宿主 slot 契约 + 端点响应类型
│   │   ├── tabs/                    # 每个 Tab 一个组件（Overview / Detail / Projects / Sessions / Quota）
│   │   ├── components/              # StatCard / ShareBar / Heatmap / TokenBars / DailyDetailTable
│   │   └── styles/                  # shared / overview / detail / lists / quota / page（basename 全局唯一）
│   └── server/                      # 服务端源码（编译到 lib/）
│       ├── index.ts                 # cordis apply：注入 webServer / 会话数据源 / 实时余额
│       ├── routes.ts                # 7 个只读 GET 端点 + loopback 校验
│       ├── ledger.ts                # 台账解析、范围聚合、均价表、成本估算
│       ├── collect.ts               # cordis.yml 提取 + 快照归一化 + 状态/计费模式判定
│       ├── merge.ts                 # 台账 × 会话事件的按天合并
│       ├── live-quota.ts            # 官方余额 / 订阅窗口实时查询（含缓存与错误分档）
│       ├── session-usage.ts         # 会话事件 → 按天/小时/模型折叠（纯函数）
│       └── sessions.ts              # sessionPersistence 适配 + revision 缓存 + 项目/会话聚合
├── lib/                             # 服务端构建产物（package.json main，需提交）
├── client/client.js                 # 客户端构建产物（单文件，需提交）
├── test/                            # 8 个离线测试（直接 import lib/*.js）
├── docs/                            # 架构契约 / 差异清单 / 重构方案 / 设计稿原型
├── tsdown.config.ts                 # 客户端打包 + CSS Modules 内联插件
└── tsconfig*.json                   # 类型检查与服务端编译
```

## 插件入口与 slot

注册为 **侧边栏导航项 + 主区域整页**，与已装的 dsh-context「上下文洞察」同一套写法：

```tsx
const PANEL_ID = 'dsh-key-usage'
ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID }, UsagePage))
ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
  name: 'sidebar.panellist', id: PANEL_ID, order: 30, label: () => '使用情况',
}, (props) => h(UsageIcon, { size: props.size })))
```

- `sidebar.panellist` 由宿主自持整行（标签、hover/active 配色），插件只提供**图标**与 `label`；`main` 用**同一个值放在 `key`** 上，宿主据此在主内容区渲染整页。
- 条目顺序由 `order` 控制；图标用 `currentColor`，跟随宿主的行状态。
- 页面组件 `UsagePage` 不绑定具体 slot，换容器只需改 `index.tsx`。

## 三个坑（改动不生效时先看这里）

| 改动位置 | 生效方式 |
| --- | --- |
| `src/client/**` | 重新构建 → `client/client.js` → **刷新页面** |
| `src/server/**` | 重新编译 → `lib/*.js` → **退出并重开应用**（无热重载） |

1. **只跑 `tsc --noEmit` 不会更新 `lib/`**：测试 import 的是 `lib/*.js`，改完必须执行 `tsconfig.server.json` 那次编译再跑测试。
2. **服务端没有热重载**：插件代码在挂载时进入 Node 的 ESM 缓存，重新安装不会重新导入；Hub 的 `/restart` 在桌面端返回 `{ok:false, desktop:true}`。
3. **`cordis.yml` 是应用重写的组合产物**：插件集变化期间会被短暂重写成空模板，因此通道提取先读它、取不到再回退 `cordis.patch.yml`；其中 `local` 通道不写 `apiKeyEnv`，判定顺序必须**先判本地端点、再判未配置**。

## HTTP 端点（全部只读、仅回环）

非 `127.0.0.1` / `::1` 请求一律返回 `403 {"error":"loopback only"}`。

| 端点 | 查询参数 | 响应 |
| --- | --- | --- |
| `/dsh-key-usage/channels` | — | `{ channels: Channel[] }`，含 `status` / `costMode` / `costLabel` / `quota*` / `balanceText` |
| `/dsh-key-usage/usage` | `from`、`to`、`provider` | `{ totals, days, sessionDates, availableFrom, availableTo, hours }`，`hours` 仅在单日范围非空 |
| `/dsh-key-usage/heatmap` | — | `{ days: [{ date, totalTokens, models[] }], sessionDates }` |
| `/dsh-key-usage/quota` | `fresh=1` 强制重查 | `{ providers: [{ provider, source, fetchedAt, error, balance, plan }] }` |
| `/dsh-key-usage/summary` | — | `{ channels, range, todaySource, sessionDates }`（总览「今日 / 近 30 天」） |
| `/dsh-key-usage/sessions` | `limit` | `{ rows, coverage, priced }` |
| `/dsh-key-usage/projects` | `limit` | `{ rows, coverage, priced }` |

字段级契约、判定规则与统计口径见 [`docs/01-架构与数据契约.md`](./docs/01-架构与数据契约.md)。

## 文档索引

| 文档 | 内容 |
| --- | --- |
| [`docs/01-架构与数据契约.md`](./docs/01-架构与数据契约.md) | 模块职责、端点字段级契约、会话服务契约、统计口径、判定规则 |
| [`docs/02-原型差异与优化清单.md`](./docs/02-原型差异与优化清单.md) | 截图 × 原型 × 源码差异对比与逐条落实情况 |
| [`docs/03-按Tab拆分重构方案.md`](./docs/03-按Tab拆分重构方案.md) | 拆分方案与实施记录 |
| [`docs/prototype/`](./docs/prototype/) | 设计稿原型（演示数据，界面预览图由它渲染） |
| [`AGENTS.md`](./AGENTS.md) | 接手本仓库的 agent 的必读清单、硬约束与汇报要求 |
