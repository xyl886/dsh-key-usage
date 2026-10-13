# dsh-key-usage

**在 DeepSeek Harness 的侧边栏里看用量。** 装上之后，左侧导航会多一项「使用情况」，点开就是整页的用量面板：按通道看 Token、缓存命中率、成本与余额 / 订阅窗口，另外还有年度热力图、项目用量、会话用量。

- **纯本地只读**：数据来自本机台账、配置与宿主会话事件，**不发任何网络请求**。
- **不碰密钥**：从不打开 `.credentials.yaml`；界面不显示密钥名。
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
| 余额与配额 | 各通道官方余额快照与订阅窗口占用（原样展示，含快照时间与过期提示） |

## 数据来源与权限

| 读取对象 | 用途 | 说明 |
| --- | --- | --- |
| `$DSH_HOME/dsh-usage/usage-ledger.json` | 用量台账 | 按天 × 通道 × 模型；台账没有记录的日期会回退到会话事件补齐 |
| `$DSH_HOME/dsh-usage/provider-snapshots.json` | 余额 / 订阅窗口 | 原样展示，不做换算 |
| `$DSH_HOME/profiles/<profile>/cordis.yml`（取不到时回退 `cordis.patch.yml`） | 通道清单 | 只做文本提取，**不执行** 文件里的 `!!js` 表达式 |
| 宿主 `sessionPersistence` 服务 | 项目 / 会话 / 按小时 | 只开只读句柄；服务缺失或读取失败时降级为「数据不可用」，不影响其它页面 |

- **网络**：无。全部数据来自本机文件与宿主进程内的只读服务。
- **凭据**：不读取、不展示、不上传。通道识别只用配置里的 `apiKeyEnv`（环境变量名）做内部判定，界面不显示。
- **写入**：不写任何文件，不改宿主配置。
- **端口**：服务端 7 个端点全部只读 GET，且只接受 `127.0.0.1` / `::1` 回环请求，其它来源一律 403。

## 兼容与运行要求

- DeepSeek Harness 桌面端 0.2.x（客户端 slot：`sidebar.panellist` + `main`）；web profile 亦可。
- 无需额外运行时依赖：`react` / `react/jsx-runtime` 由宿主注入，服务端只用 Node 内置模块。
- 依赖宿主 `sessionPersistence` 服务提供项目 / 会话 / 按小时数据；该服务缺失时自动降级，其余功能正常。
- 成本：台账里带官方成本；由会话事件补齐的日期没有官方成本，界面会标注来源。

**能力分类**：界面与体验 ｜ **许可证**：MIT（见 [LICENSE](./LICENSE)）

---

以下为开发与维护文档（架构、契约、构建、发布注意事项）。

## 状态

| 项 | 值 |
| --- | --- |
| 状态 | 待验收（5 个 Tab + 侧边栏导航整页已落地；7 个端点真机验证通过，等待页面实测确认） |
| 最后验证日期 | 2026-10-13 |
| 验证样本 | `~/.dsh/dsh-usage/usage-ledger.json`（21 天，2026-09-07 ~ 2026-09-30）、`~/.dsh/dsh-usage/provider-snapshots.json`（10 个 provider）、`~/.dsh/profiles/desktop/cordis.yml`（4 个通道）、122 个本机会话（143 MB） |
| 本次已执行 | ①6 个离线测试文件全绿（ledger / collect / channels / session-usage / sessions / routes）②`tsc -p tsconfig.json --noEmit` 通过 ③客户端重新构建（116.03 kB）且 banner 校验通过；产物内 `sidebar.panellist` + `main` 就位，`settings.section` / `sidebar.footer.action` 已归零 ④**真机端点验证**：7 个端点全部返回真实数据 ⑤6 个 CSS module 注入键 basename 唯一 ⑥中间版页脚入口曾在真机渲染成功（说明客户端热更新链路可用） |
| 本次未执行 | 导航项与整页的实测（需刷新页面后确认）；最新 lib（会话上限 200 + patch 回退）的重启后回归 |

**真机验证结果（2026-10-13 16:1x，运行中的宿主）**

| 端点 | 结果 |
| --- | --- |
| `/channels` | 4 个通道：`deepseek-official`(perToken/warn/CNY 1.50)、`sensenova`(free/ok)、`local`(none/ok)、`opencode-go`(sub/warn/76%) —— 判定规则与预期完全一致 |
| `/summary` | 4 行，`today=2026-10-13`、`monthFrom=2026-09-14` |
| `/sessions` | 80 行、`coverage=complete`、`priced=true`；工作区 / 通道 / 命中率 / 计费模式均正确，`title` 为空（会话头不带标题） |
| `/projects` | 3 个工作目录（示例：主仓库 51 会话 / 1.55B tokens、另一个项目 28 / 2.43B、第三个 1 / 8.5M） |
| `/usage`（单日） | 返回 24 小时槽，今日 8 个非零槽 / 218M tokens（会话事件） |
| `/quota` `/heatmap` | 正常 |

> **宿主会话服务契约（`list` / `open` / `read` / `close` / `inheritedEventCount`）已在真机跑通**，不必再怀疑这一层。运行中的宿主仍是 15:50 那次编译的 lib（会话上限 80、无 patch 回退），**重启后才会加载 16:1x 的最新版本**。

## ⚠️ 接手前先看这三条

### 1. 改 `src/` 不会自动生效

| 改动位置 | 生效方式 |
| --- | --- |
| `src/client/**` | 重新构建 → `client/client.js` → 刷新 GUI 页面 |
| `src/server/**` | 重新编译 → `lib/*.js` → **退出并重开 DSH** |

> ⚠️ **不要用 `pnpm run build:client`**：本目录 `node_modules` 由 pnpm 10.32.1 创建，而 DSH 运行时自带 pnpm 11.7.0，版本不匹配会触发「清空 modules 目录」而中止（`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`）。直接调用本地工具链：

```powershell
$node = 'C:\Users\Lenovo\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'  # 或 PATH 上的 node
& $node node_modules/tsdown/dist/run.mjs              # 客户端打包
& $node scripts/normalize-client-banner.mjs           # loader 头归一化（必须执行）
& $node node_modules/typescript/bin/tsc -p tsconfig.server.json   # 服务端编译到 lib/
```

**只跑了 `tsc -p tsconfig.json --noEmit` 不会更新 `lib/`** —— 测试读的是 `lib/*.js`，改动后务必执行 `tsconfig.server.json` 那次编译。

### 2. 服务端改动必须退出重开应用

实测结论（2026-10-13）：

- 插件代码在**挂载时**加载进 Node 的 ESM 模块缓存；重新安装（remove + add）**不会**重新导入 `lib/index.js`，`/sessions` 的行数上限仍是旧值即为此现象。
- Hub 的 `/dsh-plugin-hub/restart` 在桌面端直接返回 `{ok:false, desktop:true}`，没有热重载途径。
- 所以：**改完 `src/server/**` → 编译 `lib/` → 从菜单 / 托盘退出 DSH 再打开**。当前会话就跑在这个宿主里，重启会中断会话，需要你来操作。

### 3. `cordis.yml` 是应用重写的组合产物

卸载 / 安装插件期间，应用会把 `~/.dsh/profiles/desktop/cordis.yml` 短暂重写成空模板（`[]`），随后再写回完整组合树；实测 15:55 卸载后变成 223 B，15:58 安装后恢复为 47,753 B。

- 因此 `routes.ts` 的通道提取**先读 `cordis.yml`，取不到再回退 `cordis.patch.yml`**（用户 patch 层，结构兼容）。
- 不要在插件集变化期间断言「通道配置丢了」；先等几秒再读，或看 `cordis.patch.yml`。
- `cordis.patch.yml` 里的 `local` 通道不写 `apiKeyEnv`，所以判定顺序是**先判本地端点、再判未配置**，否则会被误标成「未配置」。

### 4. 会话相关的三个数据面可能降级

项目用量、会话用量、单日「按小时」都依赖宿主 `sessionPersistence` 服务：

- 服务缺失 → 端点返回 `coverage.status = "unavailable"`，界面显示「会话数据不可用」，其余 Tab 不受影响。
- 个别会话读取失败 → `partial`，界面显示「N 个会话读取失败，未计入统计」。
- 契约（`list` / `open` / `read` / `close` / `inheritedEventCount`）目前是按参考实现与离线夹具写的，**真机首次重启后要重点确认这三处**。

## 入口位置与 slot 选择（2026-10-13 迁移）

当前注册为 **侧边栏导航项 + 主区域整页**（与已装的 dsh-context「上下文洞察」同一套写法）：

```tsx
const PANEL_ID = 'dsh-key-usage'
ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID }, UsagePage))
ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
  name: 'sidebar.panellist', id: PANEL_ID, order: 30, label: () => '使用情况',
}, (props) => h(UsageIcon, { size: props.size })))
```

- `sidebar.panellist`：宿主自持整行（标签、hover/active 配色），插件只提供**图标**；`label` 由宿主渲染。
- `main`：同一标识放在 **`key`** 上，宿主在主内容区按它渲染**整页** —— 所以是内联页面，不是弹窗、也不占设置页。
- 条目顺序由 `order`（当前 30）决定；想挪到「上下文洞察」上面就调小。
- 图标用 `currentColor` 上色，跟随宿主的行状态。

**历史与回退**（都试过，留作参照）：

| 版本 | slot | 结果 |
| --- | --- | --- |
| 最初 | `settings.section` | 设置页内嵌；页面太挤，已弃用 |
| 中间版 | `sidebar.footer.action` | 入口出现在页脚（头像上方），点击弹浮层；**位置与交互都不符合要求，已弃用** |
| **当前** | `sidebar.panellist` + `main` | 导航列表条目 + 主区域整页 |

回退办法：任一处 slot 失效时，改 `index.tsx` 的注册即可（页面组件 `UsagePage` 不依赖具体 slot，可直接塞进设置页或弹层容器）。

## 目录结构

```
dsh-key-usage/
├── src/
│   ├── client/                      # 客户端 bundle 源码（entry: index.tsx）
│   │   ├── index.tsx                # cordis 接线：向 sidebar.footer.action 注册入口
│   │   ├── KeyUsageSection.tsx      # 外壳：Tab 路由 + 取数 + 范围/筛选状态
│   │   ├── api.ts                   # 7 个只读端点的取数封装
│   │   ├── format.ts                # 数字 / 时间 / 时长格式化
│   │   ├── channels.ts              # 通道颜色、状态、计费模式文案
│   │   ├── tooltip.tsx              # 共享浮层（React 渲染，替代 innerHTML 拼接）
│   │   ├── types.ts                 # 宿主 slot 契约 + 端点响应类型
│   │   ├── UsagePage.tsx            # 主区域整页（main slot 的内容）
│   │   ├── UsageIcon.tsx            # 侧边栏导航图标（currentColor，跟随宿主行状态）
│   │   ├── tabs/                    # 每个 Tab 一个组件
│   │   │   ├── OverviewTab.tsx      # 总览：Key 清单 + 热力图
│   │   │   ├── DetailTab.tsx        # 使用明细：范围 + 三卡 + 占比条 + 图表 + 细目
│   │   │   ├── ProjectsTab.tsx      # 项目用量
│   │   │   ├── SessionsTab.tsx      # 会话用量
│   │   │   └── QuotaTab.tsx         # 余额与配额
│   │   ├── components/              # StatCard / ShareBar / Heatmap / TokenBars / DailyDetailTable
│   │   └── styles/                  # shared / overview / detail / lists / quota / page（basename 全局唯一）
│   └── server/                      # 服务端源码（编译到 lib/）
│       ├── index.ts                 # cordis apply：注入 webServer + 会话数据源
│       ├── routes.ts                # 7 个只读 GET 端点 + loopback 校验
│       ├── ledger.ts                # 台账解析、范围聚合、均价表、成本估算
│       ├── collect.ts               # cordis.yml 提取 + 快照归一化 + 状态/计费模式判定
│       ├── session-usage.ts         # 会话事件 → 按天/小时/模型折叠（纯函数）
│       └── sessions.ts              # sessionPersistence 适配 + revision 缓存 + 项目/会话聚合
├── lib/                             # 服务端构建产物（package.json main）
├── client/client.js                 # 客户端构建产物（单文件，宿主 ModuleLoader 加载）
├── test/                            # 6 个离线测试（直接 import lib/*.js）
├── scripts/normalize-client-banner.mjs
├── tsdown.config.ts                 # 客户端打包 + CSS Modules 内联插件
├── tsconfig.json                    # 客户端/服务端类型检查（noEmit）
└── tsconfig.server.json             # 服务端编译到 lib/
```

## 常用命令

```bash
# 在仓库根目录执行
node node_modules/tsdown/dist/run.mjs && node scripts/normalize-client-banner.mjs   # 构建客户端 → client/client.js
node node_modules/typescript/bin/tsc -p tsconfig.server.json                        # 构建服务端 → lib/
node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit                      # 类型检查
node test/ledger.test.mjs   # 其余：collect / channels / session-usage / sessions / merge / routes
```

`package.json` 的 `check` / `test` 脚本已覆盖全部 7 个 lib 文件与 7 个测试。

> 本机踩坑记录：这类插件的 `node_modules` 常由较旧的 pnpm 装出，而宿主自带 pnpm 版本更新，
> 直接 `pnpm run` / `npx` 会因版本不匹配触发「清空 modules 目录」而中止 —— 所以上面用 `node` 直接调本地工具链。

## 数据来源

| 来源 | 读取方 | 用途 |
| --- | --- | --- |
| `$DSH_HOME/dsh-usage/usage-ledger.json` | `ledger.ts` | 用量台账（按天 × 通道 × 模型）：总览、使用明细、热力图、成本 |
| `$DSH_HOME/dsh-usage/provider-snapshots.json` | `collect.ts` | 余额 / 订阅窗口快照（原样透传）与通道状态判定 |
| `$DSH_HOME/profiles/desktop/cordis.yml` | `collect.ts` | 通道清单（displayName / apiKeyEnv / baseURL / models） |
| 宿主 `sessionPersistence` 服务 | `sessions.ts` | 会话事件 → 项目用量、会话用量、单日按小时 |

`cordis.yml` 含 `!!js` 表达式，**不能用通用 YAML 解析器**（会执行表达式），`collect.ts` 只做结构化文本提取。

## HTTP 端点（全部只读、仅回环）

非 `127.0.0.1` / `::1` 请求一律返回 `403 {"error":"loopback only"}`。

| 端点 | 查询参数 | 响应 |
| --- | --- | --- |
| `/dsh-key-usage/channels` | — | `{ channels: Channel[] }`，含 `status` / `costMode` / `costLabel` / `quota*` / `balanceText` |
| `/dsh-key-usage/usage` | `from`、`to`、`provider` | `{ totals, days, availableFrom, availableTo, hours }`，`hours` 仅在单日范围非空 |
| `/dsh-key-usage/heatmap` | — | `{ days: [{ date, totalTokens, models[] }] }` |
| `/dsh-key-usage/quota` | — | `{ providers: QuotaProvider[] }` |
| `/dsh-key-usage/summary` | — | 总览表用的「今日 / 近 30 天」按通道汇总 |
| `/dsh-key-usage/sessions` | `limit` | `{ rows, coverage, priced }` |
| `/dsh-key-usage/projects` | `limit` | `{ rows, coverage, priced }` |

字段级契约、判定规则与口径见 [`docs/01-架构与数据契约.md`](./docs/01-架构与数据契约.md)。

## 文档索引

| 文档 | 内容 |
| --- | --- |
| [`docs/01-架构与数据契约.md`](./docs/01-架构与数据契约.md) | 模块职责、端点字段级契约、会话服务契约、统计口径、判定规则 |
| [`docs/02-原型差异与优化清单.md`](./docs/02-原型差异与优化清单.md) | 截图 × 原型 × 源码差异对比与逐条落实情况 |
| [`docs/03-按Tab拆分重构方案.md`](./docs/03-按Tab拆分重构方案.md) | 拆分方案与实施记录 |
| [`AGENTS.md`](./AGENTS.md) | 下一次接手的 agent 的必读清单、硬约束与汇报要求 |
