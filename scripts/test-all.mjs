/**
 * 跑全部离线测试：自动枚举 test/*.test.mjs（按文件名排序），任一失败即停。
 * 不再手写测试清单 —— 新增测试不会被漏跑。
 */
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const testDir = new URL('../test/', import.meta.url).pathname.replace(/^\/(\w):/, '$1:')
const files = readdirSync(testDir).filter((name) => name.endsWith('.test.mjs')).sort()
for (const name of files) {
  console.log('\n— ' + name)
  const result = spawnSync(process.execPath, [join(testDir, name)], { stdio: 'inherit' })
  if (result.status !== 0) {
    console.error('测试失败：' + name)
    process.exit(result.status ?? 1)
  }
}
console.log('\n全部离线测试通过（' + files.length + ' 个）')
