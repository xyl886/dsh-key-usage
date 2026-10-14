# 03 · 按 Tab 拆分重构（已实施）

> 状态：已实施（2026-10-13）｜ 起因：「`KeyUsageSection.tsx` 太长，按 Tab 拆成每 Tab 一个 tsx？」

## 结论与结果

**要拆，但不能只按 Tab 拆**：Tab 不是最大的块 —— 只按 Tab 拆完，`DetailTab` 仍有 ~350 行。真正该抽的是**热力图、每日细目表、tooltip** 三块，Tab 拆分只是外层。

| 项 | 结果 |
| --- | --- |
| 外壳 | `KeyUsageSection.tsx` 由 728 行 / 39.3 kB 降到 ~210 行 / 7.3 kB（只留 Tab 路由、取数、范围与筛选状态、页脚） |
| 拆分 | 外层按 Tab；内层抽 StatCard / ShareCard / Heatmap / TokenBars / DailyDetailTable，另加 `format.ts` / `channels.ts` / `api.ts` / `tooltip.tsx` |
| 样式 | `styles/{shared,overview,detail,lists,quota}.module.css`，basename 全局唯一 |
| 顺手修 | 折叠行 React key、首屏重复 `/usage`、tooltip 的 `innerHTML`、死代码与 `--dsw-text-2` 笔误 |
| 验收 | `tsc --noEmit` 通过；客户端构建 112.39 kB 且 banner 校验通过；离线测试全绿 |
| 未做 | 浏览器实测（需重启宿主后回归） |

## 两个必须记住的约束

- **CSS basename 全局唯一**：`tsdown.config.ts` 的样式去重键是 `插件id/文件basename`，不同目录下的同名 `*.module.css` 会让后一个**静默不注入**（`styles/overview.module.css` ✅ / `styles/index.module.css` + `tabs/index.module.css` ❌）；CSS Modules 类名带哈希前缀，**类名不能跨文件复用**，共享样式放 `shared.module.css` 并各自 import。
- **构建契约不变**：entry 仍是 `src/client/index.tsx`，产物仍是单文件 `client/client.js`，所有新文件都打进同一个 bundle。

## 有意的取舍

- 跨组件通信沿用 **props 下发**（层级只有一层，不引入 context）；
- 需要跨 Tab 保留的状态（范围、筛选、展开、排序）留在外壳，不下沉；
- 执行顺序：外移纯函数 → 抽内部组件 → 抽 Tab → 拆样式，每步只做一类改动，构建后逐 Tab 回归（纯搬运也容易改错三元判断）。
