# AGENTS.md — dsh-key-usage

本目录是 **dsh-key-usage** 插件仓库（DeepSeek Harness 侧边栏「使用情况」）。本文件是接手本仓库的 agent 的约束与流程；与仓库根目录其它文档冲突时，以本文件 + 当前源码/实测为准。

## 接手顺序（不要跳）

1. [`README.md`](./README.md) —— 定位、安装、权限说明与常见问题（**构建命令与「改了没反应」的坑已移到 `docs/06`**）。
2. [`docs/01-架构与数据契约.md`](./docs/01-架构与数据契约.md) —— 端点字段与统计口径，改数据前必读。
3. 动手前的差异表：[`docs/02-原型差异与优化清单.md`](./docs/02-原型差异与优化清单.md)。
4. 要动 `KeyUsageSection.tsx` 结构时读 [`docs/03-按Tab拆分重构方案.md`](./docs/03-按Tab拆分重构方案.md)。
5. 想知道**接下来要做什么**（提供商契约、计费 Tab、补充建议与批次）读 [`docs/05-后续版本计划.md`](./docs/05-后续版本计划.md)。
6. 要改代码时：常用命令与「改了没反应」的坑在 README 的**开发**一节；目录结构、产物契约、CI 与发布、离线自检读 [`docs/06-开发与构建.md`](./docs/06-开发与构建.md)。
7. 基线核对：重新构建（命令见下）后刷新 `http://127.0.0.1:19387` 页面，确认看到的界面与 `src/` 一致，再改。服务端改动要退出重开 DSH 才生效。

## 入口位置（2026-10-13 起）

插件注册为**侧边栏导航项 + 主区域整页**：`sidebar.panellist`（`id` + `label` + 图标）与 `main`（同一标识放在 `key` 上）配对，写法对齐已装的 dsh-context「上下文洞察」。历史方案（`settings.section` 太挤、`sidebar.footer.action` 落到页脚且只能弹浮层）的教训见 [`docs/02-原型差异与优化清单.md`](./docs/02-原型差异与优化清单.md)。页面组件 `UsagePage` 不绑定具体 slot，换容器不用改内容。

## 硬约束

- **默认零外网（三个显式例外，都要用户触发）**：`live-quota.ts` 查各通道官方余额 / 窗口（§3.5）、`model-prices.ts` 的 `refreshModelPrices()` 拉 LiteLLM 上游（§3.15）、`fx-rate.ts` 的 `resolveFxRate()` 拉汇率上游（§3.16）。除这三处外不许加任何外部请求：不开机拉取、不定时轮询、不在别的端点里隐式联网，客户端不许加 CDN 字体或图标库。
- **价目是四层，谁也不许猜价格**：`官方账单 > 内置官方价目（pricing-catalog.yml，CNY，18 条）> LiteLLM 聚合价（随包快照或本机刷新副本，USD）> 台账反推均价`。聚合价装载优先级是 `$DSH_HOME/dsh-key-usage/model-prices.json` > 随包快照，两份都读不到时**整层失效**、继续回落台账均价，**绝不抛错**；匹配按通道别名表，别名不命中且模型名不唯一时**跳过并记 `match-ambiguous`**；只收录一档缓存价时缺的那档按**未命中价**代并标 `partial`（界面「· 部分」）。
- **不碰凭据文件**：不读 `.credentials.yaml`、不读 opencode 的 `auth.json`；查余额只许走宿主 `credentials` seam（`resolve(apiKeyEnv)`）或进程环境变量，Key 不落盘、不进日志、不返回给客户端。界面里**不展示** `apiKeyEnv`，禁止出现密钥值、Authorization、cookie。
- **只写 `$DSH_HOME/dsh-key-usage/` 这个目录**（目录里只有三个文件）：`quota-snapshots.json`、`model-prices.json`、`fx-rate.json`。三者都是写目标按文件名 + 绝对路径双重校验、同目录临时文件 + rename 原子写。**不要**写宿主的 `provider-snapshots.json`、不要改 profile 的 `cordis.yml` / `cordis.patch.yml`、不要写其它任何数据文件；快照写失败静默，刷新写失败必须回 `{ok:false,error}` 并让界面显示原因，**失败时不许覆盖已有文件**。
- **内置价目是随包只读 YAML**（`pricing-catalog.yml`，改价 = 改它并同步 `test/fixtures/pricing-catalog.golden.json`），解析走 `yaml-lite.ts` 的受限子集：不支持的写法带行号报 issue 并跳过该条，**绝不静默按 0 算**；该解析器**不用于** `cordis.yml`（那里有 `!!js` 表达式，只做文本提取）。
- **仅回环**：新增端点必须复用 `requireLoopback`，非回环一律 403。当前共 **13 个端点 = 12 个只读 `GET` + 1 个写 `POST`**（只有 `POST /dsh-key-usage/pricing/refresh` 是写端点）。
- **会话数据只走官方 read handle**：`sessionPersistence.open(id, "read") → read(0) → close`。**不要**自行解压 `~/.dsh/sessions/**/session.v4.jsonl.zstd`（多帧 zstd，Node 内置 zlib 逐帧解不出来），也不要读写/修复历史日志。服务缺失或读失败一律降级为 `coverage.status = "unavailable" | "partial"`，不许抛错、不许影响台账类端点。
- **两套数据源不许混算**：台账（天 × 通道 × 模型）负责总览 / 使用明细 / 热力图；会话事件负责项目 / 会话 / 单日按小时。界面必须标注来源，页脚口径说明要同步更新。
- **产物契约不能破**：客户端入口固定 `src/client/index.tsx` → 产物 `client/client.js`，必须是单文件 CJS + `window.__ModuleLoader__.load({ id, factory })` 头（`scripts/normalize-client-banner.mjs` 会校验）。不要改 entry、产物名或加载方式。
- **不新增运行时依赖**：`react` / `react/jsx-runtime` 由宿主注入（external），其余依赖会被打进 bundle。要加依赖先说明体积理由。**YAML 也不例外**：内置价目用自带的受限子集解析器（`yaml-lite.ts`），不要引入 `js-yaml` / `yaml` 之类的包，也不要依赖宿主运行时的解析器。
- **CSS 文件 basename 必须全局唯一**：`tsdown.config.ts` 用 `${插件id}/${basename}` 作为 `<style>` 的 `data-plugin-css` 去重键 —— 两个不同目录下的同名 `*.module.css` 会导致后一个**静默不注入**，样式整块丢失。拆分样式时用 `overview.module.css` / `detail.module.css` 这类唯一名，不要用 `styles/index.module.css` + `tabs/index.module.css`。
- **主题令牌**：颜色一律走宿主 `--dsw-alias-*`（如 `--dsw-alias-label-primary`、`--dsw-alias-bg-layer-2`、`--dsw-alias-state-accent-primary`），不要硬编码明暗两套色。注意 `--dsw-text-2` **不是**宿主令牌前缀（应为 `--dsw-alias-label-secondary`）；历史写法已在 2026-10-13 重构中清理，新增代码不要再引入。
- **中文文案**：界面文案、注释、文档一律简体中文，UTF-8。
- **导入风格**：源码内相对导入带 `.ts` / `.tsx` 后缀（`allowImportingTsExtensions: true`），沿用现有写法。

## 改完必须做的验证（默认允许，不需额外授权）

本目录的 `node_modules` 由 pnpm 10.32.1 装；用**不同大版本**的 pnpm 跑 `pnpm run` 会触发「清空 modules 目录」而中止 —— 改用 `npm run <script>`。CI 跑的是 `npm run verify`（typecheck + build + check + test），发布清单自检是 `npm run pack:dry`。

> ⚠️ 测试 import 的是 **`lib/*.js`**：改了 `src/server/**` 必须先跑 `npm run build:server` 再跑测试，否则验的还是旧代码。

- 改了 `src/server/**` 的口径或字段：**同步补 `test/*.test.mjs`**，并更新 `docs/01-架构与数据契约.md` 的契约。
- 改了 `collect.ts` 的 cordis.yml 提取规则：必须补样本测试（该文件含 `!!js`，只做文本提取，不能换通用 YAML 解析器）。
- 改了计费口径 / 价目：跑 `test/pricing.test.mjs`、`test/yaml-lite.test.mjs`、`test/model-prices.test.mjs`、`test/routes.test.mjs`；改 `pricing-catalog.yml` 还要同步 `test/fixtures/pricing-catalog.golden.json`；改随包聚合价目快照要同步 `data/README.md` 的字节数 / sha256 / commit / 抓取日期四行。
- **改了 `src/client/**` 必须重新构建**（否则运行的还是旧 `client/client.js`），构建后刷新页面生效。
- **改了 `src/server/**` 必须重新编译 `lib/` 并退出重开 DSH**：服务端模块在宿主启动时进入 ESM 缓存，Hub `/restart` 在桌面端不可用，无热重载途径。
- 需要真实网络、浏览器实测、重启宿主、批量导出时：先向用户确认，不要自行执行（重启宿主会中断当前会话）。

## 插件安装方式

本插件以 **`link:` 协议**挂在 `desktop` profile 上（`node_modules/dsh-key-usage` 是指向本仓库的 Junction），因此改文件即时可见、不需要重装。

- `dsh plugin --profile desktop …` 被 CLI 硬编码拦截，不要用；Plugin Hub 不支持本地路径。
- 需要重装/换协议时，用 DSH 自带 pnpm 在 profile 目录直接操作：

```powershell
$pnpm = 'C:\Users\Lenovo\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\pnpm\bin\pnpm.mjs'
& $node $pnpm --dir "$env:USERPROFILE\.dsh\profiles\desktop" add "link:D:/EasyJob/.plugin/dsh-key-usage"
```

- 确认 `~/.dsh/profiles/desktop/package.json` 里 `dependencies.dsh-key-usage` 与 `dsh.profile.bundles` **两处都在**；pnpm 不维护 `bundles`。

## 发版与推送（2026-10-13 用户明确要求）

- **不要自动 push / npm publish**：远端动作只在你明确说「推送」「发版」时才做。本地 commit 可以自行做（见下一条）。
- **本地 vs 远端（2026-10-13 用户明确）**：
  - **本地 commit 可以自行做**（用于留可回退基线），但仍要选在**验证通过、没有并行写入者**的时点，不要把半成品提交进去。
  - **任何远端动作都必须先获得用户明确授权**：`git push`、`npm publish`、以及会触发远端工作流的操作（`gh workflow run`，包括 `publish.yml` 的 dry_run）。授权要具体到「推送 / 发版」这类指令，不能由「已验证 / 已验收」推断出来。
- **版本号只由用户的发布指令推动**：1.0 之前一律走 `patch`；npm 上最新是 `0.1.5`，所以**待发布版本就是 `0.1.6`** —— 未发布期间无论做多少批改动都保持 `0.1.6`，**禁止自行升版**，各批改动合并记在 CHANGELOG 的同一节里。
- 本机发布：`npm version patch --no-git-tag-version` → `npm publish`；发布前跑完 `verify` / `pack:dry`。
- **CI 发布（长期做法）**：`.github/workflows/publish.yml` 手动触发，默认 `dry_run=true` 只校验打包；改成 false 才真正 `pnpm publish --provenance --no-git-checks`。**token 只放仓库 Secret `NPM_TOKEN`，本机不再放**。
- 已发布的版本号**永久占用**（撤回了也不能复用），所以改版本号前先确认。
- **撤回的坑**：`npm unpublish` 属于破坏性操作，**「Bypass 2FA」的 granular token 会被 npm 拒绝**（`E403 … may not perform this action`）。真要撤回需要：新建一个**不勾 Bypass2FA** 的 token + 命令带 `--otp=<验证码>`。另外**单版本撤回只有 CLI 支持**，官网「Delete package」是删整包（还会锁 24 小时）。
- 发布步骤细则（含 npm token 怎么建、怎么轮换、撤回的坑）见 [`docs/06-开发与构建.md`](./docs/06-开发与构建.md) 与 EasyJob 仓库的 [`docs/03-开发/插件发布/发布到npm.md`](../../docs/03-开发/插件发布/发布到npm.md)。

## 事实优先级

判断字段路径、接口行为、运行效果时：**当前源码与实测 > 原型 HTML > 本文档与 README**。原型 `docs/prototype/key-usage-settings-prototype.html` 是设计意图（含演示数据与 5 个 Tab），不是现状；发现原型与源码冲突时先把冲突写进 `docs/02-原型差异与优化清单.md`，不要静默按原型改。

汇报时说明：改了哪些文件、依据哪条实测、跑了哪些命令及结果、哪些没验证、有无口径变化或运行时风险。
