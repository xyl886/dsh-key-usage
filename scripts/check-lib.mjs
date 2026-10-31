/**
 * 语法检查：自动枚举 lib/ 下所有 .js，逐个 node --check。
 * 不再手写文件清单 —— 新增服务端文件不会被漏检。
 */
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = new URL('../lib/', import.meta.url).pathname.replace(/^\/(\w):/, '$1:')
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (name.endsWith('.js')) out.push(full)
  }
  return out
}
const files = walk(root).sort()
let failed = 0
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' })
  if (result.status !== 0) { failed += 1; console.error('语法检查失败：' + relative(root, file)) }
}
if (failed > 0) process.exit(1)
console.log('语法检查通过（' + files.length + ' 个文件）')
