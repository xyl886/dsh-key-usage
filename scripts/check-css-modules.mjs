/**
 * CSS Module 自检：
 * 1. 组件引用了但样式文件里不存在的类名 → 失败（这类问题不报类型错误，只会退回浏览器默认样式）；
 * 2. 全局没被任何组件引用的类名 → 只提示（模块内有 styles[...] 动态拼接时整模块跳过）。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

const root = new URL('../src/client/', import.meta.url).pathname.replace(/^\/(\w):/, '$1:')
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(full)
  }
  return out
}

/** 去掉 CSS 注释再提取类名，避免把注释里的 "*.tsx" 当成类名。 */
function classesOf(cssPath) {
  const text = readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  return new Set([...text.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((match) => match[1]))
}

const files = walk(root)
const moduleUsage = new Map()
const missing = []
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const code = text.split('\n').filter((line) => !/^\s*import\b/.test(line)).join('\n')
  for (const [, varName, spec] of text.matchAll(/import\s+(\w+)\s+from\s+'([^']+\.module\.css)'/g)) {
    const cssPath = join(dirname(file), spec)
    if (!moduleUsage.has(cssPath)) moduleUsage.set(cssPath, { used: new Set(), dynamic: false })
    const entry = moduleUsage.get(cssPath)
    const used = new Set([...code.matchAll(new RegExp('\\b' + varName + '\\.([A-Za-z_][\\w-]*)', 'g'))].map((match) => match[1]))
    for (const name of used) entry.used.add(name)
    const classes = classesOf(cssPath)
    for (const name of used) if (!classes.has(name)) missing.push(relative(root, file) + ' -> ' + varName + '.' + name)
    // 动态拼接（styles[...] / styles['a' + x]）无法静态判定，整模块跳过未引用提示
    if (new RegExp('\\b' + varName + '\\s*\\[').test(code)) entry.dynamic = true
  }
}

const unused = []
for (const [cssPath, entry] of moduleUsage) {
  if (entry.dynamic) continue
  for (const name of classesOf(cssPath)) if (!entry.used.has(name)) unused.push(relative(root, cssPath) + ' .' + name)
}

if (missing.length > 0) {
  console.error('引用了不存在的 CSS 类名 ' + missing.length + ' 处：')
  for (const item of missing) console.error('  ✗ ' + item)
  process.exit(1)
}
console.log('CSS Module 检查通过' + (unused.length === 0 ? '' : '；未引用类名 ' + unused.length + ' 个（可选清理）'))
if (process.argv.includes('--list-unused')) for (const item of unused) console.log('  · ' + item)
