/**
 * CSS Module 自检：组件里引用了但样式文件里不存在的类名直接失败。
 * 这类问题不会报类型错误，只会让控件退回浏览器默认样式（历史上就出过「全部」按钮带方框）。
 * 定义但没引用的类只提示，不失败（有些类由运行时拼接）。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

const clientDir = new URL('../src/client/', import.meta.url).pathname.replace(/^\/(\w):/, '$1:')
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(name)) out.push(full)
  }
  return out
}
const files = walk(clientDir)
const cssCache = new Map()
function classesOf(cssPath) {
  if (!cssCache.has(cssPath)) {
    const text = readFileSync(cssPath, 'utf8')
    const set = new Set()
    for (const match of text.matchAll(/\.([A-Za-z_][\w-]*)/g)) set.add(match[1])
    cssCache.set(cssPath, set)
  }
  return cssCache.get(cssPath)
}

const missing = []
let unusedCount = 0
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  // 去掉 import 行：import 路径里的 "shared.module.css" 会被误当成类名引用
  const code = text.split('\n').filter((line) => !/^\s*import\b/.test(line)).join('\n')
  for (const [, varName, spec] of text.matchAll(/import\s+(\w+)\s+from\s+'([^']+\.module\.css)'/g)) {
    const cssPath = join(dirname(file), spec)
    const classes = classesOf(cssPath)
    const used = new Set([...code.matchAll(new RegExp('\\b' + varName + '\\.([A-Za-z_][\\w-]*)', 'g'))].map((match) => match[1]))
    for (const name of used) {
      if (!classes.has(name)) missing.push(relative(clientDir, file) + ' -> ' + varName + '.' + name + '（' + relative(clientDir, cssPath) + ' 里没有）')
    }
    for (const name of classes) if (!used.has(name)) unusedCount += 1
  }
}
if (missing.length > 0) {
  console.error('引用了不存在的 CSS 类名 ' + missing.length + ' 处：')
  for (const item of missing) console.error('  ✗ ' + item)
  process.exit(1)
}
console.log('CSS Module 检查通过（未引用类名提示：' + unusedCount + ' 个）')
