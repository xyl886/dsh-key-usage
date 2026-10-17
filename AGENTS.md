# AGENTS.md — dsh-key-usage

本目录是 **dsh-key-usage** 插件仓库（DeepSeek Harness 侧边栏「使用情况」）。本文件是接手本仓库的 agent 的约束与流程；与仓库根目录其它文档冲突时，以本文件 + 当前源码/实测为准。

## 接手顺序（不要跳）

1. [`README.md`](./README.md) —— 定位、安装、权限说明与常见问题（**构建命令与「改了没反应」的坑已移到 `docs/开发与构建.md`**）。
2. [`docs/架构与数据契约.md`](./docs/架构与数据契约.md) —— 端点字段与统计口径，改数据前必读。
3. 想知道**历史怎么走到今天的**（原型差异、Tab 拆分、各批取舍）读 [`docs/process/`](./docs/process/) —— 按版本分文件，只作历史参考。

4. **接下来要做什么**读 [`docs/process/`](./docs/process/) 里最新一卷（当前是 `v0.1.8.md`）的「待办」一节。
5. 要改代码时：常用命令与「改了没反应」的坑在 README 的**开发**一节；目录结构、产物契约、CI 与发布、离线自检读 [`docs/开发与构建.md`](./docs/开发与构建.md)。
6. 基线核对：重新构建（命令见下）后刷新 DSH 界面（桌面端建议 `Ctrl+Shift+R`），确认看到的界面与 `src/` 一致，再改。服务端改动要退出重开 DSH 才生效。**不要用 curl / 别的进程去请求桌面端 GUI 的端口**：那个端口带宿主鉴权，外部请求只会拿到 `dsh web authentication required`，看不到插件端点。

## 入口位置（2026-10-13 起）

插件注册为**侧边栏导航项 + 主区域整页**：`sidebar.panellist`（`id` + `label` + 图标）与 `main`（同一标识放在 `key` 上）配对，写法对齐已装的 dsh-context「上下文洞察」。历史方案（`settings.section` 太挤、`sidebar.footer.action` 落到页脚且只能弹浮层）的教训见 [`docs/process/v0.1.0-0.1.5.md`](./docs/process/v0.1.0-0.1.5.md)。页面组件 `UsagePage` 不绑定具体 slot，换容器不用改内容。

## 硬约束

- **默认零外网（三个显式例外，都要用户触发）**：`live-quota.ts` 查各通道官方余额 / 窗口（§3.5）、`model-prices.ts` 的 `refreshModelPrices()` 拉 LiteLLM 上游（§3.15）、`fx-rate.ts` 的 `resolveFxRate()` 拉汇率上游（§3.16）。除这三处外不许加任何外部请求：不开机拉取、不定时轮询、不在别的端点里隐式联网，客户端不许加 CDN 字体或图标库。
- **价目是两层，谁也不许猜价格**：`通道内价目`（内置官方价目 `pricing-catalog.yml`，19 条，按 provider + model 命中 → `costSource: 'catalog'`；否则 LiteLLM 聚合价按**通道别名**命中 → `'aggregate'`）→ `同模型官方价目`（本通道没有价目时，聚合价里该模型名**全库唯一**命中 → `'model'`，多半就是模型厂商自己的官方价；**同一厂商同价的 `x` 与 `vendor/x` 双键算唯一**；同名候选跨多个厂商时，先看**内置价目里该模型厂商自己那条**（`zai|glm-5.3-flash`、`deepseek-official|deepseek-v4.1-flash`），没有再用该厂商当通道查一次聚合价 —— 拿到的都是厂商自己的价）；两层都不命中即 `'none'`（界面显示 `—`）。**台账反推均价那一层已整层删除**：不再有 `'estimate'`，`rowCostsOf` / `summarizeCoverage` 不再接受均价回调，`ledger.ts` 的 `buildPriceTable` / `estimateCost` / `PriceEntry` 与 `AveragePrice` / `AveragePriceLookup` 类型一并移除 —— 宁可显示 `—`，也不许猜一个数字。强弱序 `SOURCE_RANK = { official: 0, catalog: 1, aggregate: 2, model: 3, none: 4 }`，整天 / 整行取**最弱**的那一格。聚合价装载优先级是 `$DSH_HOME/dsh-key-usage/model-prices.json` > 随包快照，两份都读不到时**整层失效**（成本只剩内置价目那一档，没有内置价目的通道直接显示 `—`），**绝不抛错**；匹配按通道别名表，别名不命中且模型名跨厂商不唯一、厂商兜底也查不到时**跳过并记 `match-ambiguous`**（记 issue 的是匹配入口 `matchPricedRule`，纯匹配器 `aggregateRuleFor` 不记，否则会出现「报了已跳过却又有金额」）；只收录一档缓存价时缺的那档按**未命中价**代并标 `partial`（界面「· 部分」）。
- **不碰凭据文件**：不读 `.credentials.yaml`、不读 opencode 的 `auth.json`；查余额只许走宿主 `credentials` seam（`resolve(apiKeyEnv)`）或进程环境变量，Key 不落盘、不进日志、不返回给客户端。界面里**不展示** `apiKeyEnv`，禁止出现密钥值、Authorization、cookie。
- **只写 `$DSH_HOME/dsh-key-usage/` 这个目录**（目录里只有五个文件，其中**允许写四个**）：`snapshot.json`（5 个 Tab 的统一数据来源）、`model-prices.json`、`fx-rate.json`、`plugin.log`（系统日志，见下一条）；第五个 `quota-snapshots.json` 是历史遗留（`writeQuotaSnapshots` 已无人调用），**只读一次当种子**，不许再写。四个写目标都是文件名 + 绝对路径双重校验、同目录临时文件 + rename 原子写（日志是追加写 + 超 512 KB 保留后半段）。**不要**写宿主的 `provider-snapshots.json`、不要改 profile 的 `cordis.yml` / `cordis.patch.yml`、不要写其它任何数据文件；快照写失败静默，刷新写失败必须回 `{ok:false,error}` 并让界面显示原因，**失败时不许覆盖已有文件**。
- **内置价目是随包只读 YAML**（`data/pricing-catalog.yml`，改价 = 改它并同步 `test/fixtures/pricing-catalog.golden.json`），解析走 `yaml-lite.ts` 的受限子集：不支持的写法带行号报 issue 并跳过该条，**绝不静默按 0 算**；该解析器**不用于** `cordis.yml`（那里有 `!!js` 表达式，只做文本提取）。它只是「通道内价目」的来源之一、**不是必需项**（缺了聚合价照样能给同名模型定价），不要把它写成「没有它就定价失效」。
- **统一快照是唯一数据来源**：`$DSH_HOME/dsh-key-usage/snapshot.json` 存 5 个 Tab 的数据段（含明细），本地段每 5 分钟重建（不联网）、**打开页面（`GET /snapshot?fresh=1`）时本地段超 10 秒就阻塞重算一次、配额段超 60 秒就后台补查一次**、手动刷新（`POST /refresh`）与 `/quota?fresh=1` 也联网查配额；**不许出现快照之外的独立数据源 / 独立缓存 / 另算一份**（参数化端点必须调用同一批构建器函数，见 `snapshot.ts`）；**一次构建只读一遍会话**（`builders.local` 先 `collect()` 一次，再喂给 models / projects / sessions 三段，不许各段自己再读）；构建中打开页面**不干等**（`view()` 直接返回手上这份并标 `building: true`）；每次本地重建的会话读取明细（`stats()` 的 sessions / cached / read / listMs / readMs / totalMs）以 `info` 追加进 `plugin.log`（消息「本地重建：会话读取明细」），**不进 `issues`**（否则界面会弹无意义的警告）；构建失败**不覆盖**上一份好快照；查不到的通道要带 `capturedAt` / `stale` / `error`，界面标「数据时间 X · 本机快照 · 实时查询未成功」并可点开系统日志看原因（`LogHint`），**不许静默陈旧**；失败原因不许摊在页面上，只进系统日志。
- **系统日志落盘 + 原因不进版面**：`$DSH_HOME/dsh-key-usage/plugin.log`（JSONL，`data/log-file.ts`）只记排查信息（上游 URL、HTTP 状态、错误类型），刷新页面后仍可查；页面上的失败一律收成一行「结论 · 查看系统日志」（`components/LogHint.tsx` + `requestOpenLog()`），**禁止**把上游错误、堆栈、长清单直接摊到界面上。日志写失败必须静默（不影响主流程），不许把日志写失败再记一条日志。
- **仅回环**：新增端点必须复用 `requireLoopback`，非回环一律 403。当前共 **17 个端点 = 14 个只读 `GET` + 3 个写 `POST`**（`POST /dsh-key-usage/refresh` 手动刷新快照、`POST /dsh-key-usage/pricing/refresh` 刷新价目、`GET|POST /dsh-key-usage/log` 读回 / 追加 / 清空系统日志）。
- **会话名与子代理判定只认宿主投影**：名字取 `storages/session_projcache/sessions/<sessionId>.json` 的 `record.rows.title.val`（= 侧边栏显示名），子代理只有 `record.rows.subagent.val.identity` 存在时才算 —— 被 seed 续接的会话也带父会话链接，但侧边栏当它是独立会话，插件也必须当独立会话（`origin` / `parentSessionId` 都清空）。**不许**只凭「父会话链接」推断子代理，**不许**把首条提问当默认标题（那只是最后的兜底）。旧聚合文件 `session_projcache.json` 只作兜底；投影按 id 惰性读 + mtime 缓存（首次全量解析约 300 ms，之后每次只 stat），不要每次请求全量重读。
- **项目 = 宿主工作区**：项目页的行以 `storages/workspace.json` 的 `tables.workspaces`（或宿主 `workspaceRegistry`）为骨架，名字用工作区 `title`；不在工作区表里的历史目录**合并成一行**「未归入工作区」（`workspace: ''` + `paths` 列全），不许让它们各占一行 —— 那正是「项目数量与侧边栏对不上」的来源。
- **归档只标注、不剔除**：宿主归档只是往 `workspace.json` 的 `global.archivedSessionIds` 追加 id（不移动 / 不删除会话文件），`sessionPersistence.list()` 不读归档集合 —— 归档会话**仍全额计入**用量、项目聚合与热力图，插件只做行标记与筛选（把它剔除会让归档当天总量凭空缩水，且归档可取消、数字来回抖）。归档集合里 `session-<uuid>` 与裸 `<uuid>` 混用，比对前先归一。运维上保持第三方归档插件的 `autoDeleteEnabled = false`：**只有物理删除会让历史总量不可逆下降**。取证结论见 [`docs/架构与数据契约.md`](./docs/架构与数据契约.md) §3.11。
- **同一件事不许说两遍**：界面上的重复表达一律删（「实时」+「实时查询于」、通道名 + 通道 id、总余额 = 充值 + 赠送、行币种 = 显示币种、「时长」已表达就别再标「跨 N 天」）。页面只留结论，原因进系统日志。
- **会话数据只走官方 read handle**：`sessionPersistence.open(id, "read") → read(0) → close`。**不要**自行解压 `~/.dsh/sessions/**/session.v4.jsonl.zstd`（多帧 zstd，Node 内置 zlib 逐帧解不出来），也不要读写/修复历史日志。服务缺失或读失败一律降级为 `coverage.status = "unavailable" | "partial"`，不许抛错、不许影响台账类端点。
- **两套数据源不许混算**：台账（天 × 通道 × 模型）负责总览 / 使用明细 / 热力图；会话事件负责项目 / 会话 / 单日按小时。界面必须标注来源，页脚口径说明要同步更新。
- **产物契约不能破**：客户端入口固定 `src/client/index.tsx` → 产物 `client/client.js`，必须是单文件 CJS + `window.__ModuleLoader__.load({ id, factory })` 头（`scripts/normalize-client-banner.mjs` 会校验）。不要改 entry、产物名或加载方式。
- **不新增运行时依赖**：`react` / `react/jsx-runtime` 由宿主注入（external），其余依赖会被打进 bundle。要加依赖先说明体积理由。**YAML 也不例外**：内置价目用自带的受限子集解析器（`yaml-lite.ts`），不要引入 `js-yaml` / `yaml` 之类的包，也不要依赖宿主运行时的解析器。
- **CSS 文件 basename 必须全局唯一**：`tsdown.config.ts` 用 `${插件id}/${basename}` 作为 `<style>` 的 `data-plugin-css` 去重键 —— 两个不同目录下的同名 `*.module.css` 会导致后一个**静默不注入**，样式整块丢失。拆分样式时用 `overview.module.css` / `detail.module.css` 这类唯一名，不要用 `styles/index.module.css` + `tabs/index.module.css`。
- **主题令牌**：颜色一律走宿主 `--dsw-alias-*`（如 `--dsw-alias-label-primary`、`--dsw-alias-bg-layer-2`、`--dsw-alias-state-business-primary`；**`state-accent-primary` 在宿主里不存在**，写了只会吃兜底色），不要硬编码明暗两套色。注意 `--dsw-text-2` **不是**宿主令牌前缀（应为 `--dsw-alias-label-secondary`）；历史写法已在 2026-10-13 重构中清理，新增代码不要再引入。**写完务必核对令牌是否真实存在**：跑 `npm run check:tokens`（`scripts/check-design-tokens.mjs` 扫 `src/client/styles/*.css` **与** `src/client/**/*.ts(x)` 的内联 style，逐个在宿主归档里核对；宿主共 120 个 `--dsw-alias-*`）。2026-10-16 修掉过 5 个「只被 `var()` 引用、从未声明」的令牌（`bg-mask` → `bg-mask-1`、`fill-l1` → `interactive-bg-hover`、`fill-l2` → `interactive-bg-active`、`state-danger-primary` → `state-error-primary`、`state-warning-primary` → `state-warn-primary`），组件内联 style 里另有 3 处（含 `state-business-secondary` → `state-business-tertiary`，宿主没有 secondary 这一档）—— 一共 8 处。
- **中文文案**：注释与文档一律简体中文，UTF-8。**界面文案一律走 i18n 词典**（`src/client/core/copy.ts`，中英成对，值只放词典键；界面标签 ≤6 字、提示 ≤8 字），禁止在组件里写死可见中文 —— 手写文案一律走 `t()`。
- **导入风格**：客户端相对导入带 `.ts` / `.tsx` 后缀（`allowImportingTsExtensions: true`）；**服务端相对导入必须带 `.js` 后缀**（NodeNext 编译），两者不要混。

## 改完必须做的验证（默认允许，不需额外授权）

本目录的 `node_modules` 由 pnpm 10.32.1 装；用**不同大版本**的 pnpm 跑 `pnpm run` 会触发「清空 modules 目录」而中止 —— 改用 `npm run <script>`。CI 跑的是 `npm run verify`（typecheck + build + check + check:tokens + test），发布清单自检是 `npm run pack:dry`。

> ⚠️ 测试 import 的是 **`lib/**/*.js`**（服务端按域分目录：`lib/data`、`lib/pricing`、`lib/quota`、`lib/snapshot`）：改了 `src/server/**` 必须先跑 `npm run build:server` 再跑测试，否则验的还是旧代码。

- 改了 `src/server/**` 的口径或字段：**同步补 `test/*.test.mjs`**，并更新 `docs/架构与数据契约.md` 的契约。
- 改了 `collect.ts` 的 cordis.yml 提取规则：必须补样本测试（该文件含 `!!js`，只做文本提取，不能换通用 YAML 解析器）。
- 改了计费口径 / 价目：跑 `test/pricing.test.mjs`、`test/yaml-lite.test.mjs`、`test/model-prices.test.mjs`、`test/routes.test.mjs`；改 `data/pricing-catalog.yml` 还要同步 `test/fixtures/pricing-catalog.golden.json`；改随包聚合价目快照要同步 `data/README.md` 的字节数 / sha256 / commit / 抓取日期四行。
- **改了颜色令牌：跑 `npm run check:tokens`**（`scripts/check-design-tokens.mjs`，已挂进 `verify`，但改令牌时单独跑一次更快）：逐个核对插件用到的 `--dsw-*`（CSS 与组件内联 style）在宿主归档里真实声明过；找不到宿主归档时只提示并退出 0（CI 与别的机器上不会误报失败）。
- **改了 `src/client/**` 必须重新构建**（否则运行的还是旧 `client/client.js`），构建后刷新页面生效。
- **改了 `src/server/**` 必须重新编译 `lib/` 并退出重开 DSH**：服务端模块在宿主启动时进入 ESM 缓存，Hub `/restart` 在桌面端不可用，无热重载途径。
- **改完默认只跑 `npm run verify`**（2026-10-15 用户明确）：**不要**自动起浏览器 / 无头浏览器做自检，**不要**重截 `docs/images/` 的图 —— 太耗时；浏览器实测、截图、重启宿主都要用户明说再做。`docs/images/` 里的图由用户自己截、自己更新，不要代劳。

## 插件安装方式

**`desktop` profile 的插件来源有两种模式，动手前先确认当前是哪种**（`node_modules/dsh-key-usage` 是 Junction = `link:` 模式，是真目录 = registry 版）：

- **`link:D:/EasyJob/.plugin/dsh-key-usage`**（本地开发 / 验收）：改本仓库即时可见、不用重装；服务端改动要退出重开 DSH 才生效；
- **`dsh-key-usage@<版本>`**（registry 版）：界面跑的就是 npm 上那一份，**改本仓库不再影响它**。

两种模式互切都先 `pnpm remove dsh-key-usage` 再 `add` 目标：`pnpm remove dsh-key-usage` → `pnpm add "link:D:/EasyJob/.plugin/dsh-key-usage"` 或 `pnpm add dsh-key-usage@<版本>`。从 `link:` 直接 `add` registry 版会报 `ERR_PNPM_EPERM`（pnpm 去旧 junction 内部导入 peer 依赖），这时先把 `node_modules/dsh-key-usage` **改名让开**再装（详见 [`docs/开发与构建.md`](./docs/开发与构建.md) 的安装一节）。

- `dsh plugin --profile desktop …` 被 CLI 硬编码拦截，不要用；Plugin Hub 不支持本地路径。
- 需要重装/换协议时，用 DSH 自带 pnpm 在 profile 目录直接操作：

```powershell
$pnpm = 'C:\Users\Lenovo\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\pnpm\bin\pnpm.mjs'
& $node $pnpm --dir "$env:USERPROFILE\.dsh\profiles\desktop" add "link:D:/EasyJob/.plugin/dsh-key-usage"
```

- 确认 `~/.dsh/profiles/desktop/package.json` 里 `dependencies.dsh-key-usage` 与 `dsh.profile.bundles` **两处都在**；pnpm 不维护 `bundles`。

## 发版与推送

### 开发流程（2026-10-15 用户重新定义，优先级最高）

1. **本地提交随意**：每批改动跑完 `npm run verify`（绿）即可直接本地 commit，不需要先征求同意；不要把半成品提交进去。
2. **改完就装本地最新版**：本地开发期间把 `desktop` profile 换回 `link:D:/EasyJob/.plugin/dsh-key-usage` 指向本仓库（命令见「插件安装方式」），构建产物（`lib/`、`client/client.js`）就是用户界面上的东西 —— 改完 build 完即可让用户验收，**不必等推送**；服务端改动仍需用户退出重开 DSH。**profile 的默认状态是 registry 版**，动手前先确认当前是不是 link 模式，否则用户看到的还是发布出去的旧包。
3. **推送 GitHub、CI 发布必须经用户明确授意 + 二次确认**：`git push`、`gh workflow run`（含 `publish.yml` 的 `dry_run`）都要先问一次、得到确认后再执行；「已验证 / 已验收」不等于授权。
4. **版本号仍只由用户的发布指令推动**（见本节的版本号规则），CI 发布同样要单独确认。

- **不要自动 push / npm publish**：远端动作只在你明确说「推送」「发版」时才做。本地 commit 可以自行做（见下一条）。
- **本地 vs 远端（2026-10-13 用户明确）**：
  - **本地 commit 可以自行做**（用于留可回退基线），但仍要选在**验证通过、没有并行写入者**的时点，不要把半成品提交进去。
  - **任何远端动作都必须先获得用户明确授权**：`git push`、`npm publish`、以及会触发远端工作流的操作（`gh workflow run`，包括 `publish.yml` 的 dry_run）。授权要具体到「推送 / 发版」这类指令，不能由「已验证 / 已验收」推断出来。
- **版本号只由用户的发布指令推动**：1.0 之前一律走 `patch`；**发版时读 npm 上最新已发布的版本号（`npm view dsh-key-usage version`），往后推一个 `.1`**（如 `0.1.7` → `0.1.8`），本地攒了多少提交都不改变这一步 —— 不要按提交数或自己的判断升版；未得到发布指令前**禁止自行升版、禁止自行发布**。某一版是否已发布，看 CHANGELOG 该节标题：没发时写「未发布」，发布后改成发布当天的日期。
- 本机发布：`npm version patch --no-git-tag-version` → `npm publish`；发布前跑完 `verify` / `pack:dry`。CI 发布成功后，把 CHANGELOG 该节标题的「未发布」改成发布当天的日期。
- **CI 发布（长期做法）**：`.github/workflows/publish.yml` 手动触发，默认 `dry_run=true` 只校验打包；改成 false 才真正 `pnpm publish --provenance --no-git-checks`。**token 只放仓库 Secret `NPM_TOKEN`，本机不再放**。
- 已发布的版本号**永久占用**（撤回了也不能复用），所以改版本号前先确认。
- **撤回的坑**：`npm unpublish` 属于破坏性操作，**「Bypass 2FA」的 granular token 会被 npm 拒绝**（`E403 … may not perform this action`）。真要撤回需要：新建一个**不勾 Bypass2FA** 的 token + 命令带 `--otp=<验证码>`。另外**单版本撤回只有 CLI 支持**，官网「Delete package」是删整包（还会锁 24 小时）。
- 发布步骤细则（含 npm token 怎么建、怎么轮换、撤回的坑）见 [`docs/开发与构建.md`](./docs/开发与构建.md) 与 EasyJob 仓库的 [`docs/03-开发/插件发布/发布到npm.md`](../../docs/03-开发/插件发布/发布到npm.md)。

## 事实优先级

判断字段路径、接口行为、运行效果时：**当前源码与实测 > 本文档与 README**。早期手写的设置页设计稿（`docs/prototype/key-usage-settings-prototype.html`）已于 2026-10-16 删除，需要时从 git 历史取（引入提交 `749b3ef`）；历史设计取舍见 [`docs/process/v0.1.0-0.1.5.md`](./docs/process/v0.1.0-0.1.5.md)。

汇报时说明：改了哪些文件、依据哪条实测、跑了哪些命令及结果、哪些没验证、有无口径变化或运行时风险。