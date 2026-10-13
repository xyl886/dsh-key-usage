# 03 · 按 Tab 拆分重构方案（已实施）

> 针对「`KeyUsageSection.tsx` 太长了，拆成每个 Tab 一个 tsx 怎么样？」的回答与执行方案。
> 状态：**已实施（2026-10-13）** ｜ 最后验证日期：2026-10-13 ｜ 依据：`tsdown.config.ts` 构建机制 + 本次重构实测

## 实施记录

| 项 | 结果 |
| --- | --- |
| 外壳 | `KeyUsageSection.tsx` 由 728 行 / 39.3 kB 降到 ~210 行 / 7.3 kB（只留 Tab 路由、取数、范围与筛选状态、页脚） |
| 拆分粒度 | 按方案执行：外层按 Tab，内层抽 5 个组件（StatCard / ShareCard / Heatmap / TokenBars / DailyDetailTable），另加 `format.ts` / `channels.ts` / `api.ts` / `tooltip.tsx` |
| 样式 | 拆成 `styles/{shared,overview,detail,lists,quota}.module.css`，basename 全局唯一（旧 `section.module.css` 已移入 `.trash`） |
| 顺手修的问题 | 折叠行与分组列表的 React key（§5.1）、重复请求（§5.2）、tooltip 的 `innerHTML`（§5.3）、死代码与 `--dsw-text-2` 笔误（§5.4）全部完成 |
| 验收 | `tsc -p tsconfig.json --noEmit` 通过；客户端构建 112.39 kB 且 banner 校验通过；6 个离线测试全绿 |
| 未做 | 浏览器实测（需要用户重启宿主后回归） |

## 1. 结论

**可以，也应该拆，但不能只按 Tab 拆。**

Tab 不是这个文件里最大的块。按 Tab 拆成 3 个文件后，`DetailTab` 仍有 ~350 行（它自己就包含统计卡 + 占比卡 + 图表 + 每日细目表 + 排序 + 聚合），单文件仍超 300 行，收益有限。真正该抽的是**热力图**、**每日细目表**、**tooltip**这三块，Tab 拆分只是外面那一层。

推荐组合：**按 Tab 拆外层 + 抽 5 个内部组件 + 外移 3 组纯函数 + 样式跟着组件走**。

## 2. 现状行数账（728 行）

| 区间 | 内容 | 行数 |
| --- | --- | --- |
| 1–46 | import、`CHANNEL_COLORS`、`isoDate` / `fmtTokens` / `fmtCost` / `fmtCalls` / `fetchJson` | 46 |
| 48–71 | `showTip` / `hideTip`（`document` 单例 + `innerHTML` 字符串） | 24 |
| 73–175 | `KeyUsageSection` 壳：状态、取数、Tab 路由 | 103 |
| 177–340 | `OverviewTab`（Key 清单表 + 年度热力图 + `levelOf`/`heatColor`） | 164 |
| 342–412 | `ShareCard`（占比卡） | 71 |
| 414–429 | `sumProviderUsage`（总览用汇总） | 16 |
| 431–664 | `DetailTab`（范围条 + 统计卡 + 图表 + 细目表 + 排序 + 聚合） | 234 |
| 666–728 | `QuotaTab` + 字段/窗口中文映射 | 63 |

`DetailTab` 的 234 行里，约 21 行是内联 tooltip HTML 拼接、约 60 行是纯聚合/排序计算（每次 render 重算，未 memo）。

## 3. 目标结构

```
src/client/
├── index.tsx                   # 不变：cordis 接线
├── types.ts                    # 不变：slot 契约 + 端点响应类型
├── KeyUsageSection.tsx         # 壳：Tab 状态 + 取数 + 路由（目标 ≤120 行）
├── format.ts                   # 新增：isoDate / fmtTokens / fmtCost / fmtCalls
├── channels.ts                 # 新增：CHANNEL_COLORS + channelColorOf 工厂 + displayNameOf
├── tooltip.tsx                 # 新增：颗粒化 Tooltip 组件，替换 document 单例 + innerHTML
├── useUsageData.ts             # 新增（可选）：channels/usage/heatmap/quota 取数 + loading/error
├── tabs/
│   ├── OverviewTab.tsx
│   ├── DetailTab.tsx
│   └── QuotaTab.tsx
├── components/
│   ├── StatCard.tsx
│   ├── ShareCard.tsx
│   ├── Heatmap.tsx
│   ├── TokenBars.tsx
│   └── DailyDetailTable.tsx
└── styles/
    ├── shared.module.css       # 卡片 / 表 / 按钮 / 空态（basename 全局唯一）
    ├── overview.module.css
    ├── detail.module.css
    └── quota.module.css
```

拆分**不改变构建契约**：entry 仍是 `src/client/index.tsx`，产物仍是单文件 `client/client.js`，tsdown 会把所有新文件打进同一个 bundle。

### 3.1 样式拆分注意（会静默丢样式）

`tsdown.config.ts` 的 CSS 去重键是 `插件id/文件basename`：

```js
tagId = `${id}/${basename(fileId)}`   // → "dsh-key-usage/section.module.css"
if (document.querySelector('style[data-plugin-css="…同一 tagId…"]') === null) { …append… }
```

⇒ **不同目录下的同名 `*.module.css`，后一个不会注入**。所以：

- ✅ `styles/overview.module.css`、`styles/detail.module.css`、`styles/quota.module.css`
- ❌ `styles/index.module.css` + `tabs/index.module.css`（第二个整块失效）

另外：CSS Modules 类名带哈希前缀（`[hash]_[local]`），**样式不能跨文件复用类名**；共享样式放 `shared.module.css` 并在各组件里分别 `import styles from …`。

## 4. 拆分步骤（每步独立可验证，零行为变化优先）

### Step 0 · 基线（必做）

```powershell
$node = 'C:\Users\Lenovo\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
& $node node_modules/tsdown/dist/run.mjs ; & $node scripts/normalize-client-banner.mjs
```

（`pnpm run build:client` 在本目录会因 pnpm 版本不匹配中止，原因见 [`README.md`](../README.md) §1。）

刷新 `http://127.0.0.1:19387` 的设置页，截图存档当前三个 Tab。**注意**：15:16 那次构建已经改变过界面基线（去掉热力图标题里的区间说明、加上「未使用」行与「天数」卡），当前仓库 = 当前产物；若页面仍是旧界面，先重启宿主确认基线再往下走。

### Step 1 · 外移纯函数与工具（零行为变化）

- `format.ts`：`isoDate` / `fmtTokens` / `fmtCost` / `fmtCalls`
- `channels.ts`：`CHANNEL_COLORS`、`channelColorOf`、`displayNameOf`（现在同一个查找逻辑在 3 处重复）
- `tooltip.tsx`：把 `showTip`/`hideTip` 换成 React 组件（见 §5.3）

验收：`tsc -p tsconfig.json --noEmit` 通过（用本地 `node_modules/typescript/bin/tsc`）；重新构建后对比截图无变化。

### Step 2 · 抽内部组件（纯搬运 + 局部修）

| 组件 | 从哪来 | 备注 |
| --- | --- | --- |
| `Heatmap.tsx` | `OverviewTab` L190–224、282–322 + `levelOf`/`heatColor` | 最值得抽：自带列对齐、月份标签、tooltip 三套逻辑 |
| `DailyDetailTable.tsx` | `DetailTab` L457–504、599–661 | 聚合/排序一并搬进去，顺手加 `useMemo` |
| `TokenBars.tsx` | `DetailTab` L545–597 | 顺手补 x 轴标签（清单 D8） |
| `ShareCard.tsx` | 现成 `ShareCard` | 几乎原样搬 |
| `StatCard.tsx` | `DetailTab` L524–529 | 为清单 D1 的布局调整留接口 |

验收：同上；建议每抽一块就构建一次并回归对应 Tab。

### Step 3 · 抽 Tab，壳变薄

`KeyUsageSection.tsx` 只保留：`activeTab` / `range` / `customFrom` / `customTo` / `channelFilter` / `expandedPeriods` / `detailSort` 这些**跨 Tab 或需保留的状态**，其余全下沉。目标 ≤120 行。

跨组件通信沿用 **props 下发**（当前只有一层），不要引入 context —— 状态少、层级浅，context 反而增加理解成本。

### Step 4 · 样式按组件拆分

按 §3.1 命名。`Table` / `Card` / `chip` / `rangeTabs` 这类被多处使用的留在 `shared.module.css`。

### Step 5（可选）· 取数收敛

抽 `useUsageData.ts`：合并 `reload()` 与 `usageUrl` effect 的重复请求（清单 D21），并区分「加载中 / 读取失败 / 空范围」三种空态（清单 D16）。

## 5. 拆分时必须顺手修的问题

| 编号 | 问题 | 位置 | 修法 |
| --- | --- | --- | --- |
| 5.1 | 折叠行裸 `<>` fragment 只给第一个 `tr` 加 `key` ⇒ React key 警告，排序时可能复用错行 | L620–647 | `<Fragment key={period.period}>` |
| 5.2 | 首屏并发两次 `/usage` | L96–129 | 取数收敛到一处 |
| 5.3 | tooltip 用 `innerHTML` 拼接（模型/通道名来自 `cordis.yml` 文本提取） | L49–71、291–305、561–581 | 换 React 组件渲染；浮层仍可 `position:fixed` 跟鼠标，但用 state 驱动，不再手写 `document.createElement` |
| 5.4 | 死代码与令牌笔误 | L599 `styles.blockLabel`（CSS 里不存在）、`section.module.css:62` `.table tr.subRow`（未使用）、`var(--dsw-text-2, …)` 不是宿主令牌 | 一并清理；宿主令牌见 `01-架构与数据契约.md` §2.3 |

## 6. 先拆还是先按原型改？

推荐 **先拆壳（Step 1–3，零行为变化）→ 再按 [`02-原型差异与优化清单.md`](./02-原型差异与优化清单.md) 改**。

理由：批 3 的改动（总览表重排、状态点、计费模式）会横跨总览与明细两处；如果先改再拆，diff 会混成一片，回归时无法区分「拆分引入的问题」和「改版引入的问题」。先拆的价值只在于**让后续每一条改动都落在一个小文件里**。

例外：若 D1（是否补「项目用量 / 会话用量」Tab）确定要做，**先定 Tab 清单再拆** —— 否则拆完还要再加两个文件并改外层路由，白做一次。

## 7. 风险与验收

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| 样式静默丢失 | CSS basename 冲突（§3.1） | 命名唯一 + 每步构建后目视检查对应区域 |
| 状态下沉过度 | 把 `expandedPeriods`/`detailSort` 放进 `DetailTab` 内部会导致切 Tab 后状态丢失 | 保留在这两层都需要的父级 |
| 拆分引入行为差异 | 纯搬运也容易改错三元判断 | 每步只做一类改动，构建后逐 Tab 回归 |
| 与批 1 改动冲突 | 批 1 的 D1/D4/D8 也在同几个文件 | 批 1 与 Step 2/3 合并到同一次改造里做，别分两次碰同一段代码 |

**验收标准**

1. `tsc -p tsconfig.json --noEmit` 无错误；客户端构建成功且 banner 校验通过（命令见 Step 0）。
2. 三个 Tab 的渲染结果与拆分前逐项一致（除有意改动的项），无 React 控制台警告。
3. 最大的单文件 ≤ 250 行；`KeyUsageSection.tsx` ≤ 120 行。
4. 折叠行展开/收起、排序、通道筛选、范围切换、刷新后状态保持均正常。
