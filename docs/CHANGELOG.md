# 更新记录

版本号规则：1.0 之前一律走 `patch`；**只有作者的发布指令才推动版本号**，未发布期间 `package.json` 的 `version` 保持不变，各批改动合并记在下一节里。

> 0.1.0 ～ 0.1.2 是发布当日的快速迭代，此处只记要点；逐条改动见仓库提交历史。发布时间取自 npm registry。

## [0.1.8] —— 2026-10-16

> 与 npm 上 `0.1.7` 的差距就是本节内容；版本号仍保持 `0.1.7`，等作者的发布指令再升。

### 新增

- **本地重建的会话读取明细**：`createSessionSource` 新增 `stats()`，给出 `{ sessions, cached, read, listMs, readMs, totalMs }`；每次本地重建把这组明细以 `info` 追加进 `plugin.log`（消息「本地重建：会话读取明细」），**不进 `issues`**（界面不会因它弹警告）；
- **归档筛选记忆与「未归入工作区」目录清单**：会话页的归档三档筛选记住上次选择（localStorage，键 `dsh-key-usage-archive-filter`，隐私模式下读写失败按默认档）；项目页「未归入工作区」那行可以展开 / 收起合并进来的目录清单（新词典键 `p.pathsOpen` / `p.pathsClose`）；
- **系统日志落盘 + 失败原因只进日志**：日志写入 `$DSH_HOME/dsh-key-usage/plugin.log`（JSONL，追加写，超 512 KB 只留后半段；`GET|POST /dsh-key-usage/log`，端点 15 → **17**），刷新页面后仍能查上次为什么失败；刷新价目 / 汇率 / 余额查询失败、端点请求失败、快照问题与「读取不完整」、导出被拦截统一进日志，页面只留一行**「结论 · 查看系统日志」**（点击直接打开日志窗）；条目按「来源 + 消息 + 级别」去重累加 `×N`，可展开详情、失败条目可直接「重试」；

### 变更

- **「同模型官方价目」优先用内置价目里厂商自己那条**：跨厂商同名候选定不下来时，先看内置价目里该模型的厂商条目（`zai|glm-5.3-flash`、`deepseek-official|deepseek-v4.1-flash`），没有再退到「以厂商为通道查聚合价」。效果：任何通道只要用到内置价目认识的型号名，就能拿到厂商官方价 —— 例如 `opencsg` + `deepseek-v4.1-flash` 现在有价（DeepSeek 官方 CNY 2 / 0.04 / 8，错峰半价），不再是 `—`；
- **内置价目补 `deepseek-official | deepseek-v4.1-flash`（19 条）**：第三方通道（如 opencsg）用这个 id 调的就是 DeepSeek-V4.1-Flash，官方文档注明与 `deepseek-flash` 同价，故照 `deepseek-flash` 记价并同步 `test/fixtures/pricing-catalog.golden.json`；

- **计价口径改两层，台账反推均价整层删除**：`通道内价目`（内置官方价目命中 → `costSource: 'catalog'`；否则 LiteLLM 聚合价按**通道别名**命中 → `'aggregate'`）→ `同模型官方价目`（本通道没有价目时，聚合价里该模型名**全库唯一**命中 → 新增 `'model'`），两层都不命中即 `'none'`（界面显示 `—`）。强弱序 `SOURCE_RANK = { official: 0, catalog: 1, aggregate: 2, model: 3, none: 4 }`，整天 / 整行仍取最弱的一格。内置价目因此只是「通道内价目」的来源之一、不再是必需项；
- **打开页面即最新（汇率与 LiteLLM 除外）**：页面打开走 `GET /snapshot?fresh=1` —— 本地段距上次重建 ≥ **10 秒**（`SNAPSHOT_OPEN_MIN_MS`）就**阻塞**重算一次（只算本地、不联网，热缓存下几百毫秒），配额段距上次查询 ≥ **60 秒**（`SNAPSHOT_QUOTA_TTL_MS`）就**后台**补查一次（不阻塞首屏；返回体标 `quotaRefreshing: true`，客户端 1.5 秒后追取、最多 6 次）。补查用 `force: false`，由 `live-quota` 自身的 60 秒缓存做第二道闸门，同一分钟内反复打开不会重复打上游。新增构建来源 `open`（`buildSource`）。**修复**：原来「页面打开超 10 分钟 TTL 后台补查」的开关（`view({ backgroundQuota: true })`）从未被任何调用点传过，打开页面既不重算本地段也不查配额，余额可能是几小时前的值 —— 现在真的接线了。汇率（12 小时 TTL）与 LiteLLM 价目（只手动刷新）维持原样；
- **一次构建只读一遍会话**：`routes.ts` 的 `builders.local` 先 `collect()` 一次，再喂给 `modelsPayload` / `projectsPayload` / `sessionsPayload`（此前三个段各自 `collect()`，同一次构建把宿主会话列表与变更会话读三遍，实测 p50 3.3 s、最高 13.8 s）；
- **首开不再等构建**：`snapshot.ts` 的 `view()` 在构建进行中不再 `await waitForIdle()`，直接把手上一份（标 `building: true`）返回 —— 以前首开要干等整轮构建，实测 1～14 s；
- **快照构建耗时阈值 2000 → 4000 ms**（`SNAPSHOT_SLOW_BUILD_MS`）：实测 54 次采样里 42 次超 2000 ms，日志被这条刷满；会话读取明细已经每次落盘，阈值只留给「真的慢」；
- **客户端 `CostSource` 与词典同步**：客户端类型改为 `'official' | 'catalog' | 'aggregate' | 'model' | 'none'`，词典键 `cso.model` / `csh.model` / `source.model`（值「模型官方价」/「Model official」）取代原来的 `cso.estimate` / `csh.estimate` / `source.estimate`（`srv.ratesAverage` 删除）；`/pricing` 覆盖度字段 `averagedModels` → `modelModels`；
- **自定义范围改日历弹层**（新增 `components/ui/DateRangePicker.tsx`）：起止日期在弹层里点选，不再用两个原生日期输入；
- **占比条不再单列明细**：改回「悬停柱子外侧弹一个 tip 一次列全」，浮层不再盖住柱子；
- README 界面预览换成 **7 张英文命名截图**（`overview` / `daily` / `projects` / `models` / `sessions` / `session-detail` / `quota`）并纳入发布包；引用核查、安装与预览顺序调整。

### 移除

- **移除会话数上限 `MAX_SESSIONS = 200`**：以前只折最近 200 个会话，超出的静默退出会话 / 项目 / 模型统计，表现为「数字凭空变小」；现在宿主 `list()` 返回多少就折多少；
- **移除台账反推均价整层**：`AveragePrice` / `AveragePriceLookup` 类型、`ledger.ts` 的 `buildPriceTable` / `estimateCost` / `PriceEntry`、`rowCostsOf` / `summarizeCoverage` 的均价回调与 `'estimate'` 档一起删除 —— 价目定不下来就是 `'none'`、界面显示 `—`，不再用反推的均价兜底；
- 通道详情里的重复表达：悬空的「N 个模型单价 ·」、写死的「区间 2026-09-16 ~ …」（改「近 30 天」）、每行的「币种 CNY」（与显示币种一致时不写）、每行的「错峰中」（提到表头「当前空闲价」）、通道头重复的通道 id（挪到 hover）、「总余额 = 充值 + 赠送」的派生卡片（降级成一行「合计 x CNY」）、表头重复的「显示币种」与工具条的「显示币种」标签、错位的「最近活跃」（实际是 tokens，改「用量」）与重复的「模型」表头（备注列删除、长口径进 hover）；
- 会话列表的「另有 N 个子代理会话未显示：…」与「另有 N 个已归档会话未显示」两行，以及「时长」旁重复的「跨 N 天」（`crossDays` 只留在导出里）；
- 原型页相关文件与早期手写设计稿：`src/prototype/`、`docs/prototype/`、`tsdown.prototype.config.ts`、`scripts/sync-prototype-plugin.mjs`、`.github/workflows/pages.yml` 与 `key-usage-settings-prototype.html`（不做 GitHub Pages 展示）。

### 修复

- **没有余额接口的通道不再写「实时查询未成功」**：配额段 `supported: false` 的通道（如 opencsg）插件根本没查过它，却会在系统日志里记一条「实时查询未成功 · opencsg」——卡片上已经写了「无余额接口」，这条只会淹没真正的失败，现已跳过；

- **会话名与侧边栏对不上**：宿主已把会话投影拆成「一会话一文件」（`storages/session_projcache/sessions/<id>.json` → `record.rows.title.val` 就是侧边栏显示名），插件此前只读旧的聚合文件 `session_projcache.json`（只剩少量历史条目），绝大多数会话退化成「首条提问的截断文本」—— 现在按 id 惰性读新投影、按文件 mtime 缓存（首次全量 331 ms，之后每次只 stat 约 16 ms），旧文件降级为兜底；
- **被 seed 续接的会话被误判成子代理**：宿主也给续接会话写了父会话链接，插件据此推断成子代理并在默认视图里隐藏，而侧边栏把它当独立会话显示 —— 改以投影的 `record.rows.subagent.val.identity` 为准（存在才是真子代理），续接会话的 `origin` / `parentSessionId` 清空；
- **项目数量与名字对不上**：项目页改以宿主工作区为骨架（名字用工作区 `title`），不在工作区表里的历史目录合并成一行「未归入工作区」，不再各占一行（本机实测 9 行 → 5 行，与侧边栏的 4 个工作区对齐）；
- **英文模式下仍有中文（第二批，实测逐 Tab 扫描）**：服务端下发的 `costLabel` / `quotaWindowLabel` 是中文字符串，切英文不跟着变 —— 总览「类型」列与窗口百分比改用词典键（`COST_MODE_TAG_KEYS` / `WINDOW_TAG_KEYS`）；项目 / 模型 / 会话三页的「N 个会话」「N 个模型」「N 个子会话」「时长」「跨 N 天」「加载更多」「已显示 x / y 个会话」、会话抽屉的返回与「N 次」、通道详情的「币种」「数据时间」、口径弹窗的两条长句全部入词典；补 `nav.quota` / `sh.shareAll` 两个缺失的英文键并删掉孤儿键 `p.hintHint` 之外的孤儿键 `p.hitHint`（此前 `zh` 452 键 / `en` 451 键且 4 条英文值是中文）。
- **「同模型官方价目」的两处误判**：同一厂商常有 `x` 与 `vendor/x` 两条价格完全一样的键（`deepseek-flash` 与 `deepseek/deepseek-flash`），此前被判成「多候选」而借不到价 → 现在**同厂商 + 四档价完全一致**算唯一；跨厂商的同名候选再用**内置价目里该模型的厂商**兜底查一次（`glm-5.3-flash` → `zai`）；`match-ambiguous` 改由匹配入口 `matchPricedRule` 在**最终确实定不下来**时记（纯匹配器 `aggregateRuleFor` 不再记），避免面板出现「报了已跳过却又有金额」。实测（百万输入 tokens）：`opencode-go` + `deepseek-flash` → `model` / USD 0.3，`opencode-go` + `glm-5.3-flash` → `model` / USD 0.15，`deepseek` + `gpt-5.4-mini`（跨厂商、价不同、内置价目也不认识）仍是 `none`；
- **日志被同一个已知问题刷满**：客户端 `core/log.ts` 的同一条目**只落盘一次**，重复出现只在内存里累加 `×N`（以前每次重复都往 `plugin.log` 写一条一模一样的记录）；
- **8 处未声明设计令牌**：`--dsw-alias-bg-mask` → `bg-mask-1`、`fill-l1` → `interactive-bg-hover`、`fill-l2` → `interactive-bg-active`、`state-danger-primary` → `state-error-primary`、`state-warning-primary` → `state-warn-primary`、`state-business-secondary` → `state-business-tertiary`（宿主没有 secondary 这一档）；其中 5 处在 CSS、3 处在组件内联 style（`channels.ts`、`Heatmap.tsx`、`OverviewTab.tsx`）—— 这些令牌在宿主里只被 `var()` 引用、从未声明，真机上取到空值；
- **发布包不含更新记录**：`package.json` 的 `files` 里 `CHANGELOG.md` 改成 `docs/CHANGELOG.md`（原来指向仓库里不存在的路径）。

### 工程

- **新增 `npm run check:tokens`**（`scripts/check-design-tokens.mjs`，已挂进 `verify`）：插件用到的每个 `--dsw-*`（`src/client/styles/*.css` **与** `src/client/**/*.ts(x)` 的内联 style）必须在宿主归档里**真实声明过**（实测当前 18 个全部命中）；找不到宿主归档时只提示并退出 0，CI 与别的机器上安全；
- **实测后决定不做：快照瘦身**：`snapshot.json` 实测 226 KB，其中 sessions 段 168 KB，但每行平均 1.0 KB、逐模型明细已被 `SESSION_MODEL_ROWS = 5` 合并（164 行只有 201 条模型行，平均 1.3 条/行）—— 上限再降没有收益；把 `models` 从快照里摘掉改成按需拉会破坏「统一快照是唯一数据来源」、并让展开多一次请求，不值得。结论与数字见 [`process/v0.1.8.md`](./process/v0.1.8.md)；
- 修掉 publish 工作流的「假成功」：`dry_run` 传字符串时两个分支都不执行却报 success，改为先归一化成 `'true'` / `'false'` 再判条件，并加兜底断言；
- 新增 `test/log-file.test.mjs`（10 项）与 `test/client-log.test.mjs`（9 项）；端点契约补 `/log` 的追加 / 回读 / 清空 / 非回环 403，`session-meta` 补投影源与会话行断言；测试文件 15 → 17；
- 文档整理：`docs/` 根目录**去掉序号编排**（`01-架构与数据契约.md` → `架构与数据契约.md`、`06-开发与构建.md` → `开发与构建.md`）；`04-归档会话的影响与对策.md` 的取证结论并入契约 §3.11 与 AGENTS 硬约束（「归档只标注、不剔除」）后移除该文；顺手修掉 `44b6230` 文档归并留下的两条失效链接（原本指向已删除的 02/03/05 三份文档）；
- 文档按本批口径同步：`AGENTS.md`（两层价目 + `model` 档 + 绝不回落台账均价、移除会话数上限、版本号「读 npm 最新版本 +0.1」、`check:tokens`）、契约（§3.13 改两层、`costSource` 五档、`modelModels`、§3.18 首开不等构建与阈值 4000 ms、§3.19 日志只落盘一次）、`docs/开发与构建.md`（`scripts/` 目录与令牌自检说明）、README（「成本与价目」两层、离线测试 17 个），并修掉契约里「最多 80 个会话」「指向已删的 `docs/05-后续版本计划.md`」这类旧说法。

## [0.1.7] —— 2026-10-15

### 新增

- **中英双语（跟随宿主语言设置）**：界面文案全部收进词典（`core/copy.ts` + `core/i18n.ts`，零依赖），按宿主 `locale` 服务注册并订阅切换，插件内不加语言开关；口径说明、价目说明、汇率说明、会话服务降级原因等下发的文案改由客户端按语言渲染（服务端发 `noteCode` / `noteEn`，旧服务端无 code 时回落原文）；
- **系统日志**：页头图标按钮 + 弹窗（时间 / 级别 / 来源 / 内容，可刷新 / 复制 / 导出 `.txt` / 清空），自动记录 **i18n 缺词**与**请求失败**；
- **系统日志落盘 + 失败原因只进日志**：日志写入 `$DSH_HOME/dsh-key-usage/plugin.log`（JSONL，追加写，超 512 KB 只留后半段；`GET|POST /dsh-key-usage/log`，端点 15 → **17**），刷新页面后仍能查上次为什么失败；刷新价目 / 汇率 / 余额查询失败、端点请求失败、快照问题与「读取不完整」、导出被拦截统一进日志，页面只留一行**「结论 · 查看系统日志」**（点击直接打开日志窗）；条目按「来源 + 消息 + 级别」去重累加 `×N`，可展开详情、失败条目可直接「重试」；
- **统计卡 6 → 10 张**：拆出「输入」「输出」「通道数」「使用天数」，每张卡带**上期值（缩小淡化）与环比角标**（命中率按百分点记 `pp`，成本上升用提示色，无金额或持平时不显示角标）；一次上期 `/usage` 请求算完全部指标；
- **卡片小图标**与**占比明细一次列全**：通道占比条下方直接列出每段（色块 / 名称 / 占比 / Tokens），悬停条上任意位置弹**一个** tip 列出全部段，小占比段不用再逐段悬停；
- **通道筛选改下拉**：从独立 chip 行移到「今日 / 周 / 月 / 总计 / 自定义」右侧；
- 口径弹窗顶部显示**插件版本号**（构建期由 `scripts/normalize-client-banner.mjs` 注入，客户端不读 `package.json`）；
- **字号跟随宿主通用设置**：全部字号改为按 body 上的 `--dsh-content-font-size` 缩放（宿主改字号，插件整页跟着变）；
- 内置价目每条补**英文口径说明**（`noteEn`，按价目事实生成：模型 / 四档价 / 缓存写口径 / 错峰 / 来源与日期）。

### 变更

- **「同模型官方价目」优先用内置价目里厂商自己那条**：跨厂商同名候选定不下来时，先看内置价目里该模型的厂商条目（`zai|glm-5.3-flash`、`deepseek-official|deepseek-v4.1-flash`），没有再退到「以厂商为通道查聚合价」。效果：任何通道只要用到内置价目认识的型号名，就能拿到厂商官方价 —— 例如 `opencsg` + `deepseek-v4.1-flash` 现在有价（DeepSeek 官方 CNY 2 / 0.04 / 8，错峰半价），不再是 `—`；
- **内置价目补 `deepseek-official | deepseek-v4.1-flash`（19 条）**：第三方通道（如 opencsg）用这个 id 调的就是 DeepSeek-V4.1-Flash，官方文档注明与 `deepseek-flash` 同价，故照 `deepseek-flash` 记价并同步 `test/fixtures/pricing-catalog.golden.json`；

- **目录按域重排**：`src/server/{data,pricing,quota,snapshot}`、`src/client/core`；随包数据统一进 `data/`（`pricing-catalog.yml` 与 LiteLLM 快照同处），`CHANGELOG` 进 `docs/`；过程文档按版本分卷到 `docs/process/`（v0.1.0-0.1.5 / v0.1.6 / v0.1.7），不再堆单文件；
- **移除「每日细目」表**：其中的信息并入图表按天 tip（调用数 / Tokens / 输入 / 输出 / 缓存读 / 命中率 / 成本 / 当日模型构成）；
- **移除「环比对比」整块**：涨跌改到统计卡角标，上期值放到数值上方；
- 会话列表不再显示**没有人类提问**的会话；子会话列表里的系统提示标题显示为「系统会话」；
- 模型长尾合并行不再由服务端下发中文，改由客户端按词典显示「其它 / Others」；
- 界面文案精简：标签中文 ≤6 字、提示 ≤8 字，解释性内容进弹窗或 tooltip。

### 移除

- 冗余文案与死键：占 Tokens 比例、与上方 Tokens 同口径、环比对比标题、持平 / 不可比 / 个百分点等占位词；词典 424 键**零死键**（`d.sameCaliber`、`d.shareOfTokensPrefix`、`t.flat`、`t.incomparable`、`t.pp`、`d.hitRateFormula`、`d.rangeAggregate` 等已清理）；
- 通道详情里的重复表达：悬空的「N 个模型单价 ·」、写死的「区间 2026-09-16 ~ …」（改「近 30 天」）、每行的「币种 CNY」（与显示币种一致时不写）、每行的「错峰中」（提到表头「当前空闲价」）、通道头重复的通道 id（挪到 hover）、「总余额 = 充值 + 赠送」的派生卡片（降级成一行「合计 x CNY」）、表头重复的「显示币种」与工具条的「显示币种」标签、错位的「最近活跃」（实际是 tokens，改「用量」）与重复的「模型」表头（备注列删除、长口径进 hover）；
- 会话列表的「另有 N 个子代理会话未显示：…」与「另有 N 个已归档会话未显示」两行，以及「时长」旁重复的「跨 N 天」（`crossDays` 只留在导出里）。

### 修复

- **没有余额接口的通道不再写「实时查询未成功」**：配额段 `supported: false` 的通道（如 opencsg）插件根本没查过它，却会在系统日志里记一条「实时查询未成功 · opencsg」——卡片上已经写了「无余额接口」，这条只会淹没真正的失败，现已跳过；

- **会话名与侧边栏对不上**：宿主已把会话投影拆成「一会话一文件」（`storages/session_projcache/sessions/<id>.json` → `record.rows.title.val` 就是侧边栏显示名），插件此前只读旧的聚合文件 `session_projcache.json`（只剩少量历史条目），绝大多数会话退化成「首条提问的截断文本」—— 现在按 id 惰性读新投影、按文件 mtime 缓存（首次全量 331 ms，之后每次只 stat 约 16 ms），旧文件降级为兜底；
- **被 seed 续接的会话被误判成子代理**：宿主也给续接会话写了父会话链接，插件据此推断成子代理并在默认视图里隐藏，而侧边栏把它当独立会话显示 —— 改以投影的 `record.rows.subagent.val.identity` 为准（存在才是真子代理），续接会话的 `origin` / `parentSessionId` 清空；
- **项目数量与名字对不上**：项目页改以宿主工作区为骨架（名字用工作区 `title`），不在工作区表里的历史目录合并成一行「未归入工作区」，不再各占一行（本机实测 9 行 → 5 行，与侧边栏的 4 个工作区对齐）；
- **热力图后三档同色**：色阶此前直接写 `var(--dsw-alias-state-business-primary, rgba(...))`，令牌取到的是实心色、兜底 alpha 永不生效，五档看不出层次 —— 改用 `color-mix` 按 18 / 36 / 56 / 76 / 100% 递进；星期列改 `position: sticky`，横向滚动后仍可见；修掉活跃日数被拼接两遍；
- **会话详情弹窗字段每行只剩一个**：`DetailItem` 的 `wide` 三元表达式两个分支返回同一个类名，所有字段都占满整行 —— 修正后字段按多列排布，弹窗加宽到 880px；
- **统计卡数值折行与角标位置漂移**：数值加 `white-space: nowrap`，角标改为数值右上角绝对定位（数值右侧预留位），不再出现「角标有时在右、有时掉到第二行」；
- **英文模式下仍显示中文**：135 处 JSX 裸文本（`>调用<` 这类，此前扫描只覆盖字符串字面量）全部入词典；范围按钮显示原始键 `r.today`（渲染处漏 `t()`）；补 5 个缺失键（`d.first` / `d.last` / `d.duration` / `quota.entriesSuffix` / `quota.ratesEmpty`）；
- **英文模式下仍有中文（第二批，实测无头浏览器逐 Tab 扫描）**：服务端下发的 `costLabel` / `quotaWindowLabel` 是中文字符串，切英文不跟着变 —— 总览「类型」列与窗口百分比改用词典键（`COST_MODE_TAG_KEYS` / `WINDOW_TAG_KEYS`）；项目 / 模型 / 会话三页的「N 个会话」「N 个模型」「N 个子会话」「时长」「跨 N 天」「加载更多」「已显示 x / y 个会话」、会话抽屉的返回与「N 次」、通道详情的「币种」「数据时间」、口径弹窗的两条长句全部入词典；补 `nav.quota` / `sh.shareAll` 两个缺失的英文键并删掉孤儿键 `p.hitHint`（此前 `zh` 452 键 / `en` 451 键且 4 条英文值是中文）；
- 配额卡片失败原因不再直接显示机器码（`no-snapshot` 等翻成可读文案）；
- 跨天会话时长由 `243h 56m` 改为「10 天 3h」；
- 契约测试同步：价目基线只冻结价目事实（`note` / `noteEn` 属文案不参与对比）、`/fx` 字段断言改为「基础十项 + `noteCode` / `noteParams`」、长尾行断言改为 `model === ''`。

### 文档

- `AGENTS.md` 增补硬约束：服务端相对导入必须带 `.js` 后缀、界面文案一律走词典、宿主令牌必须真实存在（`state-accent-primary` 并不存在）；目录与产物路径同步；
- 新增 `docs/process/` 分卷过程记录，README / `docs/架构与数据契约.md` / `docs/开发与构建.md` 按新目录同步。

## [0.1.6] —— 2026-10-14

### 新增

- **内置官方价目**：18 条厂商官方价目从 TS 硬编码迁到随包发布的 `pricing-catalog.yml`（逐条回归基线 `test/fixtures/pricing-catalog.golden.json`），自动生效、不用手填；解析用自带的受限 YAML 子集（`yaml-lite.ts`，零第三方依赖，不支持的写法带行号报 issue 并跳过该条）；
- **LiteLLM 聚合价目层（第三方、USD）**：随包快照 `data/litellm-model-prices.json`（MIT，来源 / commit / 日期 / sha256 见 `data/README.md`），本地刷新副本优先；匹配按通道别名表，别名不命中且模型名不唯一时跳过，只收录一档缓存价时缺档按未命中价代并标「· 部分」；
- **实时汇率与 ¥ / $ 折算**：`GET /dsh-key-usage/fx`（主 `open.er-api.com`、备 `api.frankfurter.app`，6 秒超时 / 64 KiB 上限 / 12 小时 TTL，失败回落缓存、再失败用默认 7.1 并在界面明示）；全页金额收口到 `moneyTextOf`，折算值带 `≈`，**汇总改用 `costsByCurrency` 逐币种折算后相加**，修掉「人民币行与美元行直接相加」的老隐患；单价小值改用 4 位小数（避免缓存读价显示成 0.00）；
- **每通道单价表**：`GET /dsh-key-usage/rates` 给出该通道近 30 天模型的四档单价与来源（官方价 / 聚合 / 估算 / 无依据），含「· 部分」与「错峰中」；
- **「刷新价目」按钮与 `POST /dsh-key-usage/pricing/refresh`**：先 GitHub raw 再 jsDelivr 镜像，服务端 20 秒预算 / 12 MiB 上限，校验不过不覆盖旧文件；
- **统一快照 `$DSH_HOME/dsh-key-usage/snapshot.json`**：6 个 Tab（总览 / 使用明细 / 热力图 / 按模型 / 项目 / 会话 / 余额与配额）共用一份、含明细；本地段每 5 分钟重建（不联网），配额段只在页面打开（超 10 分钟 TTL 后台补查）与手动刷新时联网。配套 `GET /dsh-key-usage/snapshot`（构建中返回上一份完整内容）与 `POST /dsh-key-usage/refresh`（手动刷新，串行化，撞上重建最多等 10 秒）。参数化端点保留但调用同一批构建器函数，**不存在快照之外的独立数据源**；
- 每个通道带 `quotaCapturedAt` / `quotaStale` / `quotaError`，查不到时界面标「数据时间 X · 本机快照 · 本次失败：原因」。

### 变更

- **「同模型官方价目」优先用内置价目里厂商自己那条**：跨厂商同名候选定不下来时，先看内置价目里该模型的厂商条目（`zai|glm-5.3-flash`、`deepseek-official|deepseek-v4.1-flash`），没有再退到「以厂商为通道查聚合价」。效果：任何通道只要用到内置价目认识的型号名，就能拿到厂商官方价 —— 例如 `opencsg` + `deepseek-v4.1-flash` 现在有价（DeepSeek 官方 CNY 2 / 0.04 / 8，错峰半价），不再是 `—`；
- **内置价目补 `deepseek-official | deepseek-v4.1-flash`（19 条）**：第三方通道（如 opencsg）用这个 id 调的就是 DeepSeek-V4.1-Flash，官方文档注明与 `deepseek-flash` 同价，故照 `deepseek-flash` 记价并同步 `test/fixtures/pricing-catalog.golden.json`；

- **价目固定为四层**：`官方账单 > 内置官方价目（CNY） > LiteLLM 聚合价（USD） > 台账反推均价`；
- **「余额与配额」页改版**：每张通道卡片可点击展开查看该通道单价表；工具条放 ¥ RMB / $ USD 切换、刷新汇率、刷新价目与成本口径 ⓘ；
- 端点 **15 个 = 13 个只读 GET + 2 个写 POST**；写盘目录固定为 `snapshot.json` / `model-prices.json` / `fx-rate.json` 三个文件（`quota-snapshots.json` 不再写入）；离线测试 **15 个**；随包体积 +2.7 MB（未压缩快照 2,797,533 B）。

### 移除

- **「你的规则」整层删除**：`pricing-rules.yml` 的读写、`POST /dsh-key-usage/pricing/rules`、`pricing-store.ts`、规则编辑器 / 模板 / 片段 / 「让 DSH 帮我配」提示词，以及宿主设置服务链路（schemastery `Config`、`configForms`、`PricingCard.tsx`、`pricingSettings.ts`）全部删除 —— **用户不再需要填任何价格**；
- **预算与告警整块移除**：`/budget` 端点、客户端横幅与阈值配置、`src/server/budget.ts`、`src/client/budget.ts`、`test/budget.test.mjs` 一起删除。

### 修复

- **没有余额接口的通道不再写「实时查询未成功」**：配额段 `supported: false` 的通道（如 opencsg）插件根本没查过它，却会在系统日志里记一条「实时查询未成功 · opencsg」——卡片上已经写了「无余额接口」，这条只会淹没真正的失败，现已跳过；

- **总览「余额或窗口」显示很久以前的旧值**：该列此前读**宿主**的 `dsh-usage/provider-snapshots.json`（本机那份是 14 天前的 `opencode-go = month 76%`）+ 60 秒内存缓存，从不读插件自己的快照 —— 两个页面数字不同，且旧值没有任何时间标注。现在统一走插件自己的快照，失败时回落**上一份自己的快照**并标出数据时间与失败原因；
- **手动刷新后「只有一个通道更新」**：`opencode-go` 与 `opencode` 是两个通道、两把 Key、同一个上游 URL，一把 Key 失败时该通道静默沿用旧值。现在失败通道带 `error` 与 `capturedAt`，界面明示；
- 顺手清掉「会话用量」搜索框右侧与 placeholder 重复的提示文字。

### 文档

- README、`AGENTS.md`、`data/README.md` 与 `docs/**` 按本节的现状同步并做了一轮精简。

## [0.1.5] —— 2026-10-14

### 改进

- `@deepseek-ai/schemastery` 改为 **optional peer**：pnpm 安装时不再尝试为它创建符号链接，**Windows 未开启开发者模式时不会再报 `ERR_PNPM_EPERM`**（改由宿主运行时解析提供）；
- **页面外层内边距对齐宿主页面**：根容器补 `padding: 16px 20px 32px`（与「上下文洞察」同值），右侧栏或浮层打开时收窄为 `12px`；此前页面内容贴着容器边缘，与「插件」「上下文洞察」两页留白不一致；
- **客户端可访问性**：可排序表头改为真正的按钮（可 Tab、可 Enter/Space 触发）并带 `aria-sort`；交互控件补 `:focus-visible` 焦点环；图标按钮补 `aria-label`；计费抽屉补 `aria-expanded` / `aria-controls` 且抽屉 id 逐实例唯一；热力图与柱状图补整图 `role="img"` 与替代文本。

### 修复

- **没有余额接口的通道不再写「实时查询未成功」**：配额段 `supported: false` 的通道（如 opencsg）插件根本没查过它，却会在系统日志里记一条「实时查询未成功 · opencsg」——卡片上已经写了「无余额接口」，这条只会淹没真正的失败，现已跳过；

- 排序表头的箭头此前会被读屏念进按钮名（现加 `aria-hidden`）；当前排序列悬停时不再丢失主色；表头文字与箭头间距与改造前一致。

### 文档

- README 重写为「看图 → 安装 → 数据与权限 → 功能 → 成本 → 常见问题 → 开发」的顺序，去重并补齐内置价目覆盖表；新增 `docs/开发与构建.md` 与本文件。

## [0.1.4] —— 2026-10-13

### 新增

- **内置厂商官方价目（18 条，自动生效、不用手填）**：DeepSeek / Kimi / Z.ai / OpenRouter，逐条记录来源 URL 与抓取日期（`src/server/pricing-catalog.ts`，运行时不联网抓价）；
- **成本取值优先级**：`官方账单 > 你的规则 > 内置官方价目 > 台账反推均价`，并新增 **「官方价」** 角标（四处成本都有）；
- **错峰窗口支持「仅工作日」**：每个窗口可限定 每天 / 仅工作日 / 仅周末（缺省＝每天，对已有规则零影响）；DeepSeek 按官方口径 —— 北京时间周一至周五 9:00–12:00、14:00–18:00 为高峰，其余（含周末全天）空闲、半价；
- **计费面板重做**：默认只显示一行摘要（覆盖度 + 缓存命中已省 + ⓘ），点「配置规则」展开抽屉；新增**「最值得补规则的模型」**（按 Tokens 占比列出只有估算的模型，一键新增规则）；
- **环比趋势对比**：使用明细新增「与上一段等长范围」的对比（调用 / Tokens / 成本 / 命中率，命中率按百分点计）；
- **按模型视图**：第 6 个 Tab，按 `通道 + 模型` 聚合调用数 / Tokens / 占比 / 命中率 / 成本与会话数；
- **CSV / JSON 导出**：使用明细、按模型、项目用量、会话用量四处都能导出当前筛选结果（CSV 带 UTF-8 BOM）。

### 改进

- **首次加载性能**：插件侧折叠热路径优化 −28%；会话读取改为有界并发（= 2，>1 MiB 会话仍串行）—— 冷启动中位 **6878 ms → 6174 ms（−10.2%）**，8/8 配对轮均更快；
- **使用明细统计卡 3 → 6 张**：拆出「缓存读」（含占 Tokens 比例）与「缓存命中率」，新增「日均 Tokens」（分母为有用量的天数）；
- **表格列宽**：会话 / 按模型 / 项目三张表改为固定布局，修掉首列长标题把「通道」列挤成逐字竖排的问题；
- **余额与窗口快照自持久化**：实时查询成功即原子写入 `$DSH_HOME/dsh-key-usage/quota-snapshots.json`，失败时回落「最近一次成功」；
- **构建**：客户端产物改为与机器无关且字节确定；CI 增加「产物必须与源码同步」与「发布包必须含三件套」两道闸。

### 修复

- **没有余额接口的通道不再写「实时查询未成功」**：配额段 `supported: false` 的通道（如 opencsg）插件根本没查过它，却会在系统日志里记一条「实时查询未成功 · opencsg」——卡片上已经写了「无余额接口」，这条只会淹没真正的失败，现已跳过；

- 会话标题此前全为 `null`（改读 `user/message` 的 `data.content`）；
- 修正早期模板里的错误价目：`deepseek-v4.1-flash` 实为 OpenRouter 中转价（官方在售是 `deepseek-flash`）、Kimi K2 系列文档未公布缓存写入价（不再按输入价猜填）、去掉无依据的 `provider: '*'` 通配兜底；
- `list()` 不返回 `eventCount`：会话缓存实际只由 `revision` 把关，文档同步修正。

## [0.1.3] —— 2026-10-13

### 变更

- **「同模型官方价目」优先用内置价目里厂商自己那条**：跨厂商同名候选定不下来时，先看内置价目里该模型的厂商条目（`zai|glm-5.3-flash`、`deepseek-official|deepseek-v4.1-flash`），没有再退到「以厂商为通道查聚合价」。效果：任何通道只要用到内置价目认识的型号名，就能拿到厂商官方价 —— 例如 `opencsg` + `deepseek-v4.1-flash` 现在有价（DeepSeek 官方 CNY 2 / 0.04 / 8，错峰半价），不再是 `—`；
- **内置价目补 `deepseek-official | deepseek-v4.1-flash`（19 条）**：第三方通道（如 opencsg）用这个 id 调的就是 DeepSeek-V4.1-Flash，官方文档注明与 `deepseek-flash` 同价，故照 `deepseek-flash` 记价并同步 `test/fixtures/pricing-catalog.golden.json`；

- 补齐**按模型维度**、**导出**与**余额快照自持久化**；
- 加入 GitHub Actions：CI 跑 `verify` + 产物同步闸 + 打包检查；发布工作流手工触发、带 provenance；
- `lib/` 与 `client/` 明确为**必须提交**的构建产物（CI 会校验）。

## [0.1.2] —— 2026-10-13

### 修复

- **没有余额接口的通道不再写「实时查询未成功」**：配额段 `supported: false` 的通道（如 opencsg）插件根本没查过它，却会在系统日志里记一条「实时查询未成功 · opencsg」——卡片上已经写了「无余额接口」，这条只会淹没真正的失败，现已跳过；

- 修正误用的版本号：以 **0.1.2** 重新发布（0.1.x 序列），并把误发的 **0.2.0** 标记为 `deprecated`，提示改用 0.1.2。

## [0.1.1] —— 2026-10-13

### 变更

- **「同模型官方价目」优先用内置价目里厂商自己那条**：跨厂商同名候选定不下来时，先看内置价目里该模型的厂商条目（`zai|glm-5.3-flash`、`deepseek-official|deepseek-v4.1-flash`），没有再退到「以厂商为通道查聚合价」。效果：任何通道只要用到内置价目认识的型号名，就能拿到厂商官方价 —— 例如 `opencsg` + `deepseek-v4.1-flash` 现在有价（DeepSeek 官方 CNY 2 / 0.04 / 8，错峰半价），不再是 `—`；
- **内置价目补 `deepseek-official | deepseek-v4.1-flash`（19 条）**：第三方通道（如 opencsg）用这个 id 调的就是 DeepSeek-V4.1-Flash，官方文档注明与 `deepseek-flash` 同价，故照 `deepseek-flash` 记价并同步 `test/fixtures/pricing-catalog.golden.json`；

- 「余额与配额」改为**实时查询官方接口**（opencode-go 的 rolling / weekly / monthly、DeepSeek 的 `/user/balance` …），失败回落本机快照并在卡片上写明原因；
- 热力图改为近 9 个月的大格子、支持横向滚动，并修掉格子尺寸不一致；
- 合并同一天同模型的会话行，修掉热力图与每日细目的重复行。

## [0.1.0] —— 2026-10-13

### 新增

- 首次发布：侧边栏导航项「使用情况」+ 主区域整页，含**总览**（Key 清单 / 活跃热力图）、**使用明细**、**项目用量**、**会话用量**、**余额与配额**；
- 台账（天 × 通道 × 模型）与会话事件**双源合并**：台账没有记录的日期回退到本地会话事件折叠补齐，按天取舍、不相加，界面标明来源。

> `0.0.0-stage`（同日更早）是占位版本，仅用于验证发布流程，无实际功能。

[0.1.7]: https://www.npmjs.com/package/dsh-key-usage/v/0.1.7
[0.1.6]: https://www.npmjs.com/package/dsh-key-usage/v/0.1.6
[0.1.5]: https://www.npmjs.com/package/dsh-key-usage/v/0.1.5
[0.1.4]: https://www.npmjs.com/package/dsh-key-usage/v/0.1.4
[0.1.3]: https://www.npmjs.com/package/dsh-key-usage/v/0.1.3
[0.1.2]: https://www.npmjs.com/package/dsh-key-usage/v/0.1.2
[0.1.1]: https://www.npmjs.com/package/dsh-key-usage/v/0.1.1
[0.1.0]: https://www.npmjs.com/package/dsh-key-usage/v/0.1.0
