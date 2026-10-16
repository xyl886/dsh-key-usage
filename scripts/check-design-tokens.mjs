/**
 * 宿主设计令牌自检：插件 CSS 里用到的每个 `var(--dsw-*)` 必须在宿主里**真实声明过**。
 *
 * 为什么要有它：2026-10-16 发现插件引用的 5 个令牌（`bg-mask`、`fill-l1`、`fill-l2`、
 * `state-danger-primary`、`state-warning-primary`）在宿主 CSS 里只被 `var()` 引用、从未声明 ——
 * 真机上这几处颜色会取到空值（悬停底色、遮罩、危险 / 警示色），肉眼很难发现。
 *
 * 用法：
 *   node scripts/check-design-tokens.mjs                       # 用默认宿主路径（Windows 桌面端）
 *   node scripts/check-design-tokens.mjs --asar <app.asar>     # 指定宿主归档
 * 找不到宿主归档时只提示并退出 0（CI / 别的机器上没有宿主，不该因此失败）。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_ASAR = 'D:\\soft\\DeepSeek Harness\\resources\\app.asar'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const argumentIndex = process.argv.indexOf('--asar')
const asarPath = argumentIndex >= 0 ? process.argv[argumentIndex + 1] : DEFAULT_ASAR

/** 插件里用到的令牌（去重，按名字排序）：CSS 与组件内联 `style` 都要扫 ——
 *  只扫 CSS 会漏掉 `channels.ts` / `Heatmap.tsx` 这类内联写法（2026-10-16 就是这样漏了 3 个文件）。 */
function usedTokens() {
  const names = new Set()
  const collect = (path) => {
    const text = readFileSync(path, 'utf8')
    for (const match of text.matchAll(/--dsw-[a-z0-9]+(?:-[a-z0-9]+)+(?![\w*-])/g)) names.add(match[0])
  }
  const stylesDirectory = join(root, 'src', 'client', 'styles')
  for (const file of readdirSync(stylesDirectory)) {
    if (file.endsWith('.css')) collect(join(stylesDirectory, file))
  }
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) collect(path)
    }
  }
  walk(join(root, 'src', 'client'))
  return [...names].sort()
}

let archive
try {
  archive = readFileSync(asarPath).toString('latin1')
} catch {
  console.log('跳过：找不到宿主归档 ' + asarPath + '（用 --asar 指定，或换台有 DSH 的机器跑）')
  process.exit(0)
}

const tokens = usedTokens()
const missing = tokens.filter((name) => !new RegExp(name + '\\s*:').test(archive))
console.log('插件用到 ' + String(tokens.length) + ' 个 --dsw-* 令牌（CSS + 组件内联 style）；宿主归档 ' + asarPath)
if (missing.length === 0) {
  console.log('全部在宿主里声明过 ✓')
  process.exit(0)
}
console.error('以下 ' + String(missing.length) + ' 个令牌在宿主里**没有声明**（真机会取空值）：')
for (const name of missing) console.error('  ' + name)
process.exit(1)
