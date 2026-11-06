/**
 * 移动端约束自检（静态）：
 * 1. 任何 <table> 所在组件必须同时出现 tableScroll（宽表统一横滚）；
 * 2. 断点只允许 1180 / 820 / 720 / 480 / 360 与 min-width: 0；不允许随意新断点；
 * 3. 触控放大规则必须存在（>=5 处 min-height: 40px），防止新增页面忘记触控目标。
 * 只读源码，不依赖浏览器。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = new URL('../src/client/', import.meta.url).pathname.replace(/^\/(\w):/, '$1:')
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}
const files = walk(root)
const problems = []

// 1) 宽表必须包 tableScroll
for (const file of files) {
  if (!file.endsWith('.tsx')) continue
  const text = readFileSync(file, 'utf8')
  if (!text.includes('<table')) continue
  if (!text.includes('tableScroll')) problems.push(relative(root, file) + '：有 <table> 但没有 tableScroll 横滚容器')
}

// 2) 断点白名单
const allowed = new Set([1180, 820, 720, 480, 360])
for (const file of files.filter((item) => item.endsWith('.css'))) {
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(/@media\s*\(([^)]*max-width[^)]*)\)/g)) {
    for (const value of match[1].matchAll(/(\d+)px/g)) {
      if (!allowed.has(Number(value[1]))) problems.push(relative(root, file) + '：未登记断点 ' + value[1] + 'px')
    }
  }
}

// 3) 触控目标规则数量
const cssText = files.filter((item) => item.endsWith('.css')).map((item) => readFileSync(item, 'utf8')).join('\n')
const touchRules = [...cssText.matchAll(/min-height:\s*40px/g)].length
if (touchRules < 5) problems.push('触控目标规则不足（min-height: 40px 只有 ' + String(touchRules) + ' 处）')

if (problems.length > 0) {
  console.error('移动端约束问题 ' + String(problems.length) + ' 处：')
  for (const problem of problems) console.error('  ✗ ' + problem)
  process.exit(1)
}
console.log('移动端约束检查通过（宽表横滚 / 断点白名单 / 触控目标）')
