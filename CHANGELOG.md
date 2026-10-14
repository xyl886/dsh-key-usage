# 更新记录

版本号规则：**1.0 之前一律走 `patch`**（0.1.x 一路走），新功能也只升 patch —— 攒够一批再由作者决定是否跳 0.2.0 / 1.0.0。

> **版本号只由作者的发布指令推动**：npm 上最新是 `0.1.5`，因此**未发布期间不管做多少批改动，`package.json` 的 `version` 都保持 `0.1.6`**，本文档把所有批次合并记在 `0.1.6` 一节里；只有作者明确说「发版 / 发布」时才升版并发布。

> 0.1.0 ～ 0.1.2 是发布当日的快速迭代，此处只记要点；逐条改动见仓库提交历史。发布时间取自 npm registry。

## [0.1.6] —— 2026-10-14（未发布 · 第三批：移除用户规则层 + 实时汇率 + 折算）

> 三批改动合并到同一个待发布版本；本节为第三批。

### 新增

- **实时汇率**：`GET /dsh-key-usage/fx`（主 `open.er-api.com`、备 `api.frankfurter.app`，6 秒超时 / 64 KiB 上限，成功即原子写 `$DSH_HOME/dsh-key-usage/fx-rate.json`，12 小时 TTL 内走缓存不联网，失败回落缓存、再失败用默认 7.1 并在界面明示「未能联网」）。这是本项目**第三个、也是最后一个**显式外网动作；
- **人民币 / 美元切换（显示折算）**：客户端新增 `src/client/currency.ts`，全页金额收口到 `moneyTextOf`，折算值带 `≈`；**汇总改用新增的 `costsByCurrency` 逐币种折算后相加**，修掉「人民币行与美元行直接相加」的老隐患；单价小值改用 4 位小数（避免缓存读价被显示成 0.00）；
- **每通道计费规则表**：`GET /dsh-key-usage/rates` 给出该通道近 30 天模型的四档单价与来源（官方价 / 聚合 / 估算 / 无依据），含「· 部分」与「错峰中」标记。

### 变更

- **价目固定为四层**：`官方账单 > 内置官方价目（CNY，18 条） > LiteLLM 聚合价（USD） > 台账反推均价`；
- **「配置规则」整块移除，改为通道卡片展开**：「余额与配额」页每张通道卡片头部即按钮，展开查看该通道的计费规则；币种切换、「刷新价目」、「刷新汇率」都在该页工具条；
- 端点 **13 个 = 12 个只读 GET + 1 个写 POST**；写盘目录由 `pricing-rules.yml` 换成 `fx-rate.json`（仍是三个文件）。

### 移除

- **「你的规则」这一层整条删除**：`pricing-rules.yml` 的读写、`POST /dsh-key-usage/pricing/rules`、`src/server/pricing-store.ts`、规则编辑器、模板 / 片段下载、「让 DSH 帮我配」提示词与五字段表单全部删除（文件移入 `.trash`）——**用户不再需要填任何价格**。

## [0.1.6] —— 2026-10-14（未发布 · 第二批：LiteLLM 聚合价目层）

> 本节对应的提交已推送到 GitHub 供验收，**尚未发布到 npm**；发布时与另两批一起构成 0.1.6 的正式记录。

### 新增

- **LiteLLM 聚合价目层（第三方、USD）**：随包内置上游 `model_prices_and_context_window.json` 的**字节原样快照** `data/litellm-model-prices.json`（2,797,533 B、sha256 `6b5e1ee7e77f02c7afd4a130099d48174aabb157389de3a7512c5e1d1063e403`、upstream commit `30b8db325e85740eb86901d08597da845b206504`、抓取 2026-10-14；许可 MIT，原文见 `data/litellm-LICENSE.txt`，来源说明见 `data/README.md`）。按实现口径是 **2697 条可定价条目 / 1546 个模型名**（`mode ∈ {chat, completion}` 且 input、output 都 > 0，已排除 `sample_spec`）；`src/server/model-prices.ts` 只在内存里建索引，两份文件都读不到时整层失效、**绝不抛错**；
- **面板「刷新价目」按钮 + `POST /dsh-key-usage/pricing/refresh`**（第二个写端点，仅回环、无请求体、先 GitHub raw 再 jsDelivr 镜像、服务端下载预算 20 秒、响应上限 12 MiB、校验 JSON 与最少条目数后**原子写** `$DSH_HOME/dsh-key-usage/model-prices.json`，**失败不覆盖旧文件**）—— 这是本项目除余额/配额查询之外的**第二个、也是唯一的显式外网动作**：只在用户点按钮时联网，不开机拉取、不定时轮询；
- **`GET /dsh-key-usage/pricing` 新增 `aggregate` 块**（`loaded` / `path` / `shippedPath` / `localPath` / `entries` / `models` / `usd` / `fetchedAt` / `bytes` / `sha256` / `source` / `license` / `upstreamCommit` / `issues`）与 `coverage.aggregateModels` / `coverage.partialModels`；
- 客户端新增 **「聚合」角标**与 **「· 部分」** 标记（该条目缺一档缓存价、按未命中价代），并显示装载来源（本地刷新文件 / 随包快照 / 未装载）、条目数与上游 commit。

### 变更

- **成本来源排序由四层变五层**：`官方账单 > 你的规则 > 内置官方价目（CNY） > LiteLLM 聚合价（USD） > 台账反推均价`；`CostSource` 新增 `aggregate`，整行/整天的「取最弱一格」排序（`weakestSource`）同步加档；
- **客户端刷新超时改为 30 秒**（`MODEL_PRICE_REFRESH_TIMEOUT_MS`）—— **必须比服务端自己的 20 秒下载预算更长**：两边同为 20 秒时，客户端会在服务端正准备写盘的那一刻 abort，界面报「超时」而文件其实已经写成功。现在点刷新最多等 30 秒；服务端 20 秒内没下完会自己返回失败原因；
- `.gitattributes` 新增 `data/litellm-model-prices.json -text`：快照按二进制处理、不做换行转换，保证 `data/README.md` 记录的 sha256 在**原样字节**上稳定；
- **随包体积增加约 2.7 MB**（未压缩快照 2,797,533 B）：`npm pack --dry-run` 由上一批的 27 个文件升到 **31 个文件**（新增 `data/README.md`、`data/litellm-LICENSE.txt`、`data/litellm-model-prices.json`、`lib/model-prices.js`），打包 909.3 kB、未压缩 4.4 MB；
- `package.json` 的 `check` 列表新增 `lib/model-prices.js`。

### 移除

- 无移除。

### 文档

- README、`AGENTS.md` 与 `docs/01`/`05`/`06` 同步到五层价目与刷新按钮后的现状：端点总数改为 **10 个只读 GET + 2 个写 POST（共 12 个）**、离线测试 **14 个**、写盘目录变**三个文件**；
- 如实记入两条口径限制：① 聚合价是 **USD 原样并列、不做汇率换算**，而 `/usage`、`/summary`、`/sessions` 等处的合计仍是**按行直接相加**（同一格里理论上可能把人民币与美元加到一起）—— 这是本批**之前就存在**的问题、本批没有让它变差，正确修法是「按币种分列小计」，已记为后续；② 聚合价层对**当前**通道几乎不产生新数字（能命中的条目都被优先级更高的内置人民币官方价目覆盖，其余在 LiteLLM 里是多候选、按「不猜通道」跳过），它的作用是给**以后**新增的通道/模型兜底。

## [0.1.6] —— 2026-10-14（未发布 · 第一批：YAML 价目与预算移除）

> 发布时与另两批一起构成 0.1.6 的正式记录。

### 新增

- **计费规则改以 YAML 为唯一事实来源**：内置官方价目从 `src/server/pricing-catalog.ts` 的硬编码数组迁到**随包发布的仓库根 `pricing-catalog.yml`**（仍是 18 条，逐条回归基线见 `test/fixtures/pricing-catalog.golden.json`）；你的覆盖写在 `$DSH_HOME/dsh-key-usage/pricing-rules.yml`，**面板保存与手改是同一个文件**，改完**刷新页面即生效、不需要重启宿主**（每请求读 + `mtimeMs:ctimeMs:size` 缓存）；优先级 `官方账单 > 你的规则 > 内置官方价目 > 台账反推均价`；
- **受限 YAML 子集解析器**（`src/server/yaml-lite.ts`）：只认注释、2 空格缩进映射、`- ` 块序列、单行标量、行内 `[a, b]`；tab 缩进、块标量 `|` / `>`、锚点 `&` / 别名 `*`、多文档 `---`、flow 映射 `{…}` 一律**带行号报 issue 并跳过该条**，不静默错解。**没有引入任何第三方 YAML 库**（也不依赖宿主运行时解析器），内置价目与用户规则共用这一个解析器；
- **`POST /dsh-key-usage/pricing/rules`**（唯一写端点，仅回环、body 上限 256 KiB、请求先校验再原子写）；`GET /dsh-key-usage/pricing` 新增 `files`（两个价目文件的路径 / 是否存在 / 条数）、`issues`（带行号）与 `rulesOrigin`（`file` / `legacy` / `none`），面板据此显示文件位置与「第几行写了什么」；
- **「让 DSH 帮我配」提示词按钮**：自动带上目标文件绝对路径与近 30 天没有价格依据的模型清单（按 tokens 降序、带占比），并要求核对厂商**官方定价页**、查不到就如实说、**不许用 0 占位**；可复制或下载 `.txt`；
- **「套用模板」改为「下载规则模板」**：客户端直接生成 YAML —— 预填**内置价目 ∩ 你实际用到的模型**（模型清单来自 `/models`），并把**还没有价格依据**的模型列成注释占位（填好四档单价后删掉行首 `# ` 即可，不用 0 占位）；顶部注释给出字段说明与**完整的错峰写法**（含 `days`）；
- **「为它新增规则」改为「下载片段 / 复制片段」**：缺口模型每行给出单条规则的 YAML（缩进已按 `rules:` 下排好），规则表每行也能复制这一条的 YAML（含 `unit` / `offPeak` / `note`）。

### 变更

- **计费规则表单只留五个字段**（通道 · 模型 · 币种 · 四档单价）：`unit`（计价单位）、`offPeak`（错峰窗口）、`note`（备注）**只在 YAML 里维护**；已有含这些字段的规则会在列表里标出「含错峰窗口 … · 含单位设置：… —— 只在 YAML 里编辑」，表单里也写明保存不会清掉它们，**面板保存按原值写回**（客户端只提交七个字段，服务端按 `provider|model` 从文件旧值继承，冻结契约见 `pricing-store.ts: mergeRulesForWrite`，`test/client-pricing.test.mjs` 覆盖）。⚠️ 面板保存是**整份重写**文件：条目字段会继承，但**你在 YAML 里手写的注释不保留**（插件会写自己的头部注释），想留出处请写进 `note` 字段；
- **规则列表与内置价目来源默认只显示你的通道**（`cordis.yml` 里配置过的 provider，`*` 通配规则始终显示），提供「显示全部」重置；**过滤只是显示层** —— 成本计算照旧用完整规则与价目，属于未配置通道的规则点一下即可看到；
- `/pricing` 的 `catalog` 增加逐条规则 `rules`（长 `note` 不下发）供客户端生成模板；同时移除已无消费方的 `templates` 字段（内置价目早已取代那批硬编码模板）；
- **客户端不再注入 `@deepseek-ai/dsh-client-ui-settings`**（`dsh.client.inject` 只剩 locale 与 ui-slots）；`peerDependencies` 只剩 `@deepseek-ai/cordis`（optional）。

### 移除

- **预算与告警整块移除**（2026-10-14 用户决定）：`/budget` 端点、客户端 `role="status"` 横幅与总览预算进度、阈值配置段与相关 CSS，连同 `src/server/budget.ts`、`src/client/budget.ts`、`test/budget.test.mjs` 一起删除；
- **宿主设置服务链路整条退役**：schemastery `Config` / volatile 字段、`ctx.configForms` 读写、插件页 `plugins.bundle.config` 计费卡片（`PricingCard.tsx`）与 `pricingSettings.ts`、`schemastery.d.ts` 全部删除；旧版 entry config 里的规则只作**只读回退**（面板会显示来源是「旧设置服务里的历史值」），老用户的规则不丢；
- **计费规则的「导入 / 导出 JSON」与「厂商定价模板」下发**随 YAML 化一起删除：规则本体就是文件，直接改它或让 agent 改。

### 文档

- README、`AGENTS.md` 与 `docs/01`/`05`/`06` 同步到 YAML 事实来源与预算移除后的现状（含端点总数：**10 个只读 GET + 1 个规则写入 POST**）。

## [0.1.5] —— 2026-10-14

### 改进

- `@deepseek-ai/schemastery` 改为 **optional peer**：pnpm 安装时不再尝试为它创建符号链接，**Windows 未开启开发者模式时不会再报 `ERR_PNPM_EPERM`**（改由宿主运行时解析提供）；
- **页面外层内边距对齐宿主页面**：根容器补 `padding: 16px 20px 32px`（与「上下文洞察」同值），右侧栏或浮层打开时收窄为 `12px`；此前页面内容贴着容器边缘，与「插件」「上下文洞察」两页留白不一致；
- **客户端可访问性**：可排序表头改为真正的按钮（可 Tab、可 Enter/Space 触发）并带 `aria-sort`；交互控件补 `:focus-visible` 焦点环；图标按钮补 `aria-label`；计费抽屉补 `aria-expanded` / `aria-controls` 且抽屉 id 逐实例唯一；热力图与柱状图补整图 `role="img"` 与替代文本。

### 修复

- 排序表头的箭头此前会被读屏念进按钮名（现加 `aria-hidden`）；当前排序列悬停时不再丢失主色；表头文字与箭头间距与改造前一致。

### 文档

- README 重写为「看图 → 安装 → 数据与权限 → 功能 → 成本 → 常见问题 → 开发」的顺序，去重并补齐内置价目覆盖表；新增 `docs/06-开发与构建.md` 与本文件。

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

- 会话标题此前全为 `null`（改读 `user/message` 的 `data.content`）；
- 修正早期模板里的错误价目：`deepseek-v4.1-flash` 实为 OpenRouter 中转价（官方在售是 `deepseek-flash`）、Kimi K2 系列文档未公布缓存写入价（不再按输入价猜填）、去掉无依据的 `provider: '*'` 通配兜底；
- `list()` 不返回 `eventCount`：会话缓存实际只由 `revision` 把关，文档同步修正。

## [0.1.3] —— 2026-10-13

### 变更

- 补齐**按模型维度**、**导出**与**余额快照自持久化**；
- 加入 GitHub Actions：CI 跑 `verify` + 产物同步闸 + 打包检查；发布工作流手工触发、带 provenance；
- `lib/` 与 `client/` 明确为**必须提交**的构建产物（CI 会校验）。

## [0.1.2] —— 2026-10-13

### 修复

- 修正误用的版本号：以 **0.1.2** 重新发布（0.1.x 序列），并把误发的 **0.2.0** 标记为 `deprecated`，提示改用 0.1.2。

## [0.1.1] —— 2026-10-13

### 变更

- 「余额与配额」改为**实时查询官方接口**（opencode-go 的 rolling / weekly / monthly、DeepSeek 的 `/user/balance` …），失败回落本机快照并在卡片上写明原因；
- 热力图改为近 9 个月的大格子、支持横向滚动，并修掉格子尺寸不一致；
- 合并同一天同模型的会话行，修掉热力图与每日细目的重复行。

## [0.1.0] —— 2026-10-13

### 新增

- 首次发布：侧边栏导航项「使用情况」+ 主区域整页，含**总览**（Key 清单 / 活跃热力图）、**使用明细**、**项目用量**、**会话用量**、**余额与配额**；
- 台账（天 × 通道 × 模型）与会话事件**双源合并**：台账没有记录的日期回退到本地会话事件折叠补齐，按天取舍、不相加，界面标明来源。

> `0.0.0-stage`（同日更早）是占位版本，仅用于验证发布流程，无实际功能。

[0.1.5]: https://www.npmjs.com/package/dsh-key-usage/v/0.1.5
[0.1.4]: https://www.npmjs.com/package/dsh-key-usage/v/0.1.4
[0.1.3]: https://www.npmjs.com/package/dsh-key-usage/v/0.1.3
[0.1.2]: https://www.npmjs.com/package/dsh-key-usage/v/0.1.2
[0.1.1]: https://www.npmjs.com/package/dsh-key-usage/v/0.1.1
[0.1.0]: https://www.npmjs.com/package/dsh-key-usage/v/0.1.0
