/**
 * 换行符守卫：src / scripts / test 下的文本文件必须是 LF。
 * 原因：客户端 sourcemap 会内嵌源码内容，本地 CRLF 构建出的 client.js.map
 * 与 CI（Linux，LF）不一致，会让「产物必须与源码同步」这道闸失败。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = new URL('../', import.meta.url).pathname.replace(/^\/(\w):/, '$1:')
const targets = ['src', 'scripts', 'test']
const bad = []
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) { walk(full); continue }
    if (!/\.(ts|tsx|css|mjs|js)$/.test(name)) continue
    if (readFileSync(full, 'utf8').includes('\r\n')) bad.push(relative(root, full))
  }
}
for (const target of targets) walk(join(root, target))
if (bad.length > 0) {
  console.error('以下文件是 CRLF，请转成 LF（否则 sourcemap 与 CI 不一致）：')
  for (const file of bad) console.error('  ✗ ' + file)
  process.exit(1)
}
console.log('换行符检查通过（LF）')
