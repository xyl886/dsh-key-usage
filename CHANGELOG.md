# 更新记录

版本号规则：1.0 之前一律走 `patch`；**未发布期间 `package.json` 的 `version` 保持 `0.1.6`**，各批改动都合并记在这一节里 —— 只有作者的发布指令才推动版本号。

> 0.1.0 ～ 0.1.2 是发布当日的快速迭代，此处只记要点；逐条改动见仓库提交历史。发布时间取自 npm registry。

## [0.1.6] —— 2026-10-14（未发布）

### 新增

- **内置官方价目**：18 条厂商官方价目从 TS 硬编码迁到随包发布的 `pricing-catalog.yml`（逐条回归基线 `test/fixtures/pricing-catalog.golden.json`），自动生效、不用手填；解析用自带的受限 YAML 子集（`yaml-lite.ts`，零第三方依赖，不支持的写法带行号报 issue 并跳过该条）；
- **LiteLLM 聚合价目层（第三方、USD）**：随包快照 `data/litellm-model-prices.json`（MIT，来源 / commit / 日期 / sha256 见 `data/README.md`），本地刷新副本优先；匹配按通道别名表，别名不命中且模型名不唯一时跳过，只收录一档缓存价时缺档按未命中价代并标「· 部分」；
- **实时汇率与 ¥ / $ 折算**：`GET /dsh-key-usage/fx`（主 `open.er-api.com`、备 `api.frankfurter.app`，6 秒超时 / 64 KiB 上限 / 12 小时 TTL，失败回落缓存、再失败用默认 7.1 并在界面明示）；全页金额收口到 `moneyTextOf`，折算值带 `≈`，**汇总改用 `costsByCurrency` 逐币种折算后相加**，修掉「人民币行与美元行直接相加」的老隐患；单价小值改用 4 位小数（避免缓存读价显示成 0.00）；
- **每通道单价表**：`GET /dsh-key-usage/rates` 给出该通道近 30 天模型的四档单价与来源（官方价 / 聚合 / 估算 / 无依据），含「· 部分」与「错峰中」；
- **「刷新价目」按钮与 `POST /dsh-key-usage/pricing/refresh`**：先 GitHub raw 再 jsDelivr 镜像，服务端 20 秒预算 / 12 MiB 上限，校验不过不覆盖旧文件。

### 变更

- **价目固定为四层**：`官方账单 > 内置官方价目（CNY） > LiteLLM 聚合价（USD） > 台账反推均价`；
- **「余额与配额」页改版**：每张通道卡片可点击展开查看该通道单价表；工具条放 ¥ RMB / $ USD 切换、刷新汇率、刷新价目与成本口径 ⓘ；
- 端点 **13 个 = 12 个只读 GET + 1 个写 POST**；写盘目录固定为 `quota-snapshots.json` / `model-prices.json` / `fx-rate.json` 三个文件；随包体积 +2.7 MB（未压缩快照 2,797,533 B）。

### 移除

- **「你的规则」整层删除**：`pricing-rules.yml` 的读写、`POST /dsh-key-usage/pricing/rules`、`pricing-store.ts`、规则编辑器 / 模板 / 片段 / 「让 DSH 帮我配」提示词，以及宿主设置服务链路（schemastery `Config`、`configForms`、`PricingCard.tsx`、`pricingSettings.ts`）全部删除 —— **用户不再需要填任何价格**；
- **预算与告警整块移除**：`/budget` 端点、客户端横幅与阈值配置、`src/server/budget.ts`、`src/client/budget.ts`、`test/budget.test.mjs` 一起删除。

### 文档

- README、`AGENTS.md`、`data/README.md` 与 `docs/**` 按本节的现状同步并做了一轮精简。

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
