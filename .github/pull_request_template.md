# 改动说明

<!-- 一句话说清这个 PR 做了什么 -->

## 类型

- [ ] 修复（fix）
- [ ] 新功能（feat）
- [ ] 文档 / 构建 / CI（docs / chore）

## 自查（提交前请逐条确认）

- [ ] `npm run verify` 通过（typecheck + build + check + 全部离线测试）
- [ ] **如果改了 `src/**`**：已重新构建并提交产物 —— `lib/` 与 `client/` 是随包发布的，CI 会重新构建后要求 `git diff --exit-code`
- [ ] **如果改了 `src/client/**`**：`client/client.js` 已重建（否则运行的是旧界面）
- [ ] **如果改了 `src/server/**` 的口径或字段**：已同步补 `test/*.test.mjs` 并在 `docs/01-架构与数据契约.md` 更新契约
- [ ] **如果改了统计口径**：README / `docs/05` 里的说明同步更新，并说明是**有意变更**还是**修复**
- [ ] **如果新增了端点**：复用了 `requireLoopback`（非回环 403），并且 README 里的端点数量已更新
- [ ] **如果动了依赖**：`pnpm-lock.yaml` 已同步（CI 用 `--frozen-lockfile`），且没有新增运行时依赖
- [ ] 没有把任何密钥、token、`Authorization`、cookie 或凭据文件内容写进代码 / 文档 / 日志
- [ ] 界面文案与注释为简体中文，颜色只用 `--dsw-alias-*` 令牌，CSS 文件名没有重复（basename 全局唯一）

## 兼容性 / 口径影响

<!-- 有没有改变统计口径、成本来源、数据源取舍？没有就写「无」 -->

## 验证记录

<!-- 跑了哪些命令、结果如何；无法验证的部分写清原因 -->