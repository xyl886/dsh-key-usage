/**
 * 真机自检（手动跑，不进 CI）：用**编译产物** `lib/**` 直接读本机 `$DSH_HOME` 数据，核对
 * 「界面上的数字是不是真的来自宿主」——浏览器自检被用户明确禁掉（太耗时），这个脚本是替代品。
 *
 * 用法：`node scripts/self-check.mjs`（数据缺失时只提示并退出 0，方便在别的机器上跑）
 *
 * 覆盖三件事：
 * 1. 会话投影：文件数、标题命中率、真子代理数、被父会话链接误判的数量（历史 bug 的哨兵）；
 * 2. 宿主工作区：工作区数与名字（项目页的行骨架）；
 * 3. 快照：段是否齐全、体积分布（sessions 段一直是最大的一块）。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = join(import.meta.dirname, '..')
const home = process.env.DSH_HOME ?? join(homedir(), '.dsh')
const failures = []
const report = (label, detail) => console.log('  ' + label + (detail === undefined ? '' : '：' + detail))
const check = (label, ok, detail) => {
  if (ok) report('✓ ' + label, detail)
  else { failures.push(label + (detail === undefined ? '' : '：' + detail)); report('✗ ' + label, detail) }
}

const projectionDir = join(home, 'storages', 'session_projcache', 'sessions')
if (!existsSync(projectionDir)) {
  console.log('跳过：本机没有会话投影目录 ' + projectionDir)
  process.exit(0)
}

console.log('== 会话投影（宿主侧边栏显示名的唯一来源）==')
const { createSessionProjectionSource } = await import(pathToFileURL(join(root, 'lib', 'data', 'session-meta.js')).href)
const files = readdirSync(projectionDir).filter((name) => name.endsWith('.json'))
const ids = files.map((name) => name.replace(/\.json$/, ''))
const source = createSessionProjectionSource(projectionDir)
const started = performance.now()
const facts = source.facts(ids)
const coldMs = Math.round(performance.now() - started)
let titled = 0
let subagents = 0
let mainSessions = 0
for (const fact of facts.values()) {
  if (fact.title !== null) titled += 1
  if (fact.subagent === true) subagents += 1
  else if (fact.subagent === false) mainSessions += 1
}
check('投影文件都能解析', facts.size === files.length, files.length + ' 个文件 / ' + facts.size + ' 条事实')
check('标题命中率 > 90%', titled / Math.max(1, facts.size) > 0.9, titled + '/' + facts.size)
check('子代理与主会话都判得出来', subagents > 0 && mainSessions > 0, '子代理 ' + subagents + ' / 主会话 ' + mainSessions)
check('冷读耗时在 3 s 以内', coldMs < 3000, coldMs + ' ms（之后靠 mtime 缓存，每次只 stat）')

console.log('== 宿主工作区（项目页的行骨架）==')
const workspacePath = join(home, 'storages', 'workspace.json')
if (existsSync(workspacePath)) {
  const document = JSON.parse(readFileSync(workspacePath, 'utf8'))
  const workspaces = document?.tables?.workspaces
  const count = workspaces !== null && typeof workspaces === 'object' ? Object.keys(workspaces).length : 0
  check('工作区表能读出条目', count > 0, count + ' 个工作区')
} else {
  report('跳过：没有 ' + workspacePath)
}

console.log('== 快照（5 个 Tab 的唯一数据来源）==')
const snapshotPath = join(home, 'dsh-key-usage', 'snapshot.json')
if (existsSync(snapshotPath)) {
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'))
  const sections = Object.entries(snapshot.sections ?? {})
  const empty = sections.filter(([, value]) => value === null).map(([name]) => name)
  check('段都非空', empty.length === 0, empty.length === 0 ? sections.length + ' 段' : '空段：' + empty.join(', '))
  const sizes = sections
    .map(([name, value]) => [name, value === null ? 0 : JSON.stringify(value).length])
    .sort((first, second) => second[1] - first[1])
  report('体积', sizes.slice(0, 4).map(([name, bytes]) => name + ' ' + Math.round(bytes / 1024) + ' KB').join(' · '))
  const sessions = snapshot.sections?.sessions
  if (sessions !== null && sessions !== undefined) {
    const rows = Array.isArray(sessions.rows) ? sessions.rows.length : 0
    // 不设上限之后：快照里的会话行数应当等于投影能覆盖的会话数（宿主 list() 返回多少就多少）
    check('会话行数与投影规模相当', rows >= files.length * 0.5, rows + ' 行 / 投影 ' + files.length + ' 个')
    const snippets = sessions.rows.filter((row) => typeof row.title === 'string' && row.title.includes('…')).length
    check('标题不是「提问片段」为主', snippets < rows * 0.2, snippets + '/' + rows + ' 行看起来是片段标题')
  }
  report('文件', Math.round(statSync(snapshotPath).size / 1024) + ' KB（磁盘上带缩进）')
} else {
  report('跳过：还没有 ' + snapshotPath + '（宿主没跑过插件）')
}

console.log('')
console.log(failures.length === 0 ? '全部通过' : '失败 ' + failures.length + ' 项：\n- ' + failures.join('\n- '))
process.exitCode = failures.length === 0 ? 0 : 1
