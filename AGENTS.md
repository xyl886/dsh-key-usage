# AGENTS.md — dsh-key-usage

本目录是 **dsh-key-usage** 插件仓库（DeepSeek Harness 侧边栏「使用情况」）。本文件是接手本仓库的 agent 的约束与流程；与仓库根目录其它文档冲突时，以本文件 + 当前源码/实测为准。

## 接手顺序（不要跳）

1. [`README.md`](./README.md) —— 定位、安装、权限说明、构建命令与**三个「改了没反应」的坑**。
2. [`docs/01-架构与数据契约.md`](./docs/01-架构与数据契约.md) —— 端点字段与统计口径，改数据前必读。
3. 动手前的差异表：[`docs/02-原型差异与优化清单.md`](./docs/02-原型差异与优化清单.md)。
4. 要动 `KeyUsageSection.tsx` 结构时读 [`docs/03-按Tab拆分重构方案.md`](./docs/03-按Tab拆分重构方案.md)。
5. 基线核对：重新构建（命令见下）后刷新 `http://127.0.0.1:19387` 页面，确认看到的界面与 `src/` 一致，再改。服务端改动要退出重开 DSH 才生效。

## 入口位置（2026-10-13 起）

插件注册为**侧边栏导航项 + 主区域整页**：`sidebar.panellist`（`id` + `label` + 图标）与 `main`（同一标识放在 `key` 上）配对，写法对齐已装的 dsh-context「上下文洞察」。历史方案（`settings.section` 太挤、`sidebar.footer.action` 落到页脚且只能弹浮层）的教训见 [`docs/02-原型差异与优化清单.md`](./docs/02-原型差异与优化清单.md)。页面组件 `UsagePage` 不绑定具体 slot，换容器不用改内容。

## 硬约束

- **默认零外网**：只有「余额与配额」允许请求各通道**官方**接口（`src/server/live-quota.ts`），且必须 6 秒超时、64 KiB 上限、失败回落本机快照；其它任何位置都不许加外部请求，客户端不许加 CDN 字体或图标库。
- **不碰凭据文件**：不读 `.credentials.yaml`、不读 opencode 的 `auth.json`；查余额只许走宿主 `credentials` seam（`resolve(apiKeyEnv)`）或进程环境变量，Key 不落盘、不进日志、不返回给客户端。界面里**不展示** `apiKeyEnv`（只允许服务端内部判定用），禁止出现密钥值、Authorization、cookie。
- **仅回环**：新增端点必须复用 `requireLoopback`，非回环一律 403。
- **会话数据只走官方 read handle**：`sessionPersistence.open(id, "read") → read(0) → close`。**不要**自行解压 `~/.dsh/sessions/**/session.v4.jsonl.zstd`（多帧 zstd，Node 内置 zlib 逐帧解不出来），也不要读写/修复历史日志。服务缺失或读失败一律降级为 `coverage.status = "unavailable" | "partial"`，不许抛错、不许影响台账类端点。
- **两套数据源不许混算**：台账（天 × 通道 × 模型）负责总览 / 使用明细 / 热力图；会话事件负责项目 / 会话 / 单日按小时。界面必须标注来源，页脚口径说明要同步更新。
- **产物契约不能破**：客户端入口固定 `src/client/index.tsx` → 产物 `client/client.js`，必须是单文件 CJS + `window.__ModuleLoader__.load({ id, factory })` 头（`scripts/normalize-client-banner.mjs` 会校验）。不要改 entry、产物名或加载方式。
- **不新增运行时依赖**：`react` / `react/jsx-runtime` 由宿主注入（external），其余依赖会被打进 bundle。要加依赖先说明体积理由。
- **CSS 文件 basename 必须全局唯一**：`tsdown.config.ts` 用 `${插件id}/${basename}` 作为 `<style>` 的 `data-plugin-css` 去重键 —— 两个不同目录下的同名 `*.module.css` 会导致后一个**静默不注入**，样式整块丢失。拆分样式时用 `overview.module.css` / `detail.module.css` 这类唯一名，不要用 `styles/index.module.css` + `tabs/index.module.css`。
- **主题令牌**：颜色一律走宿主 `--dsw-alias-*`（如 `--dsw-alias-label-primary`、`--dsw-alias-bg-layer-2`、`--dsw-alias-state-accent-primary`），不要硬编码明暗两套色。注意 `--dsw-text-2` **不是**宿主令牌前缀（应为 `--dsw-alias-label-secondary`）；历史写法已在 2026-10-13 重构中清理，新增代码不要再引入。
- **中文文案**：界面文案、注释、文档一律简体中文，UTF-8。
- **导入风格**：源码内相对导入带 `.ts` / `.tsx` 后缀（`allowImportingTsExtensions: true`），沿用现有写法。

## 改完必须做的验证（默认允许，不需额外授权）

`pnpm run` / `npx` 在本目录**不可用**：`node_modules` 由 pnpm 10.32.1 建，DSH 自带 pnpm 为 11.7.0，版本不匹配会触发「清空 modules 目录」而中止。一律直接调用本地工具链：

```powershell
$node = 'C:\Users\Lenovo\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'  # 或 PATH 上的 node
& $node node_modules/tsdown/dist/run.mjs && & $node scripts/normalize-client-banner.mjs   # 改了 src/client：重新产出 client/client.js
& $node node_modules/typescript/bin/tsc -p tsconfig.server.json                            # 改了 src/server：重新产出 lib/
& $node node_modules/typescript/bin/tsc -p tsconfig.json --noEmit                          # 客户端 + 服务端类型检查
& $node --check lib/index.js   # 同理逐个 check：lib/{index,ledger,collect,routes,sessions,session-usage}.js
& $node test/ledger.test.mjs ; & $node test/collect.test.mjs ; & $node test/channels.test.mjs
& $node test/session-usage.test.mjs ; & $node test/sessions.test.mjs ; & $node test/routes.test.mjs
```

> ⚠️ 测试 import 的是 **`lib/*.js`**：只跑 `--noEmit` 不会更新产物，改了 `src/server/**` 必须先执行 `tsconfig.server.json` 那次编译再跑测试，否则测试验的还是旧代码。

- 改了 `src/server/**` 的聚合口径或字段：**同步补 `test/*.test.mjs`**，并在 `docs/01-架构与数据契约.md` 更新契约。
- 改了 `collect.ts` 的 cordis.yml 提取规则：必须补样本测试，并说明为什么仍然不需要 YAML 解析器。
- **改了 `src/client/**` 必须重新构建**，否则运行的还是旧 `client/client.js`；构建后刷新 GUI 页面即可生效。
- **改了 `src/server/**` 必须重新编译 `lib/`，并退出重开 DSH**：服务端插件代码在宿主启动时加载，Hub 的 `/restart` 在桌面端返回 `{ok:false, desktop:true}`，无热重载途径。
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

## 事实优先级

判断字段路径、接口行为、运行效果时：**当前源码与实测 > 原型 HTML > 本文档与 README**。原型 `docs/prototype/key-usage-settings-prototype.html` 是设计意图（含演示数据与 5 个 Tab），不是现状；发现原型与源码冲突时先把冲突写进 `docs/02-原型差异与优化清单.md`，不要静默按原型改。

## 汇报要求

结束时说明：改了哪些文件、依据哪份文档/哪条实测、跑了哪些验证命令及结果、哪些验证因未授权未执行、是否存在数据口径变化或运行时风险。
