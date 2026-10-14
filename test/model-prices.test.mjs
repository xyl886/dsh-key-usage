/**
 * LiteLLM 聚合价目离线测试：随包快照装载与自检、别名 / 唯一匹配的确定性、缓存档四种形态与 partial、
 * 本地刷新文件优先与坏文件降级、刷新端点的下载校验与写入守卫。
 *
 * 全部离线：刷新用**注入的 fetch**（夹具 Response），不打任何真实网络请求。
 * 运行：node test/model-prices.test.mjs（依赖 lib/model-prices.js，改 src 后要先 tsc -p tsconfig.server.json）
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  AGGREGATE_LICENSE,
  AGGREGATE_MIRROR_URL,
  AGGREGATE_PROVIDER_ALIASES,
  AGGREGATE_SNAPSHOT_URL,
  AGGREGATE_UPSTREAM_COMMIT,
  aggregateLocalPath,
  aggregateLookupIssues,
  aggregateRuleFor,
  aggregateStatus,
  invalidateAggregateCache,
  refreshModelPrices,
  writeModelPricesFile,
} from '../lib/model-prices.js'
import { rowCostsOf } from '../lib/pricing.js'

const home = mkdtempSync(join(tmpdir(), 'dsh-key-usage-prices-'))
// DSH_HOME 一定要在第一次匹配前设好：本地刷新文件路径是按请求现算的
process.env.DSH_HOME = home
mkdirSync(join(home, 'dsh-key-usage'), { recursive: true })

const localPath = aggregateLocalPath()
assert.equal(localPath, join(home, 'dsh-key-usage', 'model-prices.json'), '本地刷新文件只允许落在 $DSH_HOME/dsh-key-usage/')

/** 独立复算（不引用被测实现）：可定价的 chat/completion 条目数与去重模型名数。 */
function countPricedChat(raw) {
  const names = new Set()
  let entries = 0
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'sample_spec') continue
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue
    if (value.mode !== 'chat' && value.mode !== 'completion') continue
    const input = value.input_cost_per_token
    const output = value.output_cost_per_token
    if (!(typeof input === 'number' && input > 0) || !(typeof output === 'number' && output > 0)) continue
    entries += 1
    names.add(key.split('/').pop().toLowerCase())
  }
  return { entries, models: names.size }
}

/** 造一份「刷新能接受」的上游文本：`entries` 条可定价 chat 条目 + 文档条目 sample_spec。 */
function buildPayload(entries) {
  const raw = { sample_spec: { mode: 'chat', input_cost_per_token: 1, output_cost_per_token: 1 } }
  for (let index = 0; index < entries; index += 1) {
    raw['zai/synthetic-' + String(index)] = {
      mode: 'chat',
      input_cost_per_token: 1e-6,
      output_cost_per_token: 2e-6,
      litellm_provider: 'zai',
    }
  }
  return JSON.stringify(raw)
}

/** 注入用的 fetch：按 URL 给夹具 Response，并记录调用顺序（测试里不带任何真实请求）。 */
function fakeFetch(handlers) {
  const calls = []
  const impl = async (url, init) => {
    calls.push({ url, init })
    const handler = handlers[url]
    return handler === undefined ? new Response('no fixture', { status: 404 }) : handler()
  }
  impl.calls = calls
  return impl
}

/** 超过 12 MiB 上限的响应流（不带 content-length，逼出「边读边掐」的分支）。 */
function overLimitStream() {
  const chunk = new Uint8Array(5 * 1024 * 1024)
  return new ReadableStream({
    start(controller) {
      controller.enqueue(chunk)
      controller.enqueue(chunk)
      controller.enqueue(chunk)
      controller.close()
    },
  })
}

// ===== 1. 随包快照：装载状态 + 与文件本体一致的 sha256 / 字节数 =====
const status = aggregateStatus()
{
  assert.equal(status.loaded, 'shipped', '没有本地刷新文件时读随包快照')
  assert.equal(status.path, status.shippedPath)
  assert.ok(status.shippedPath.endsWith(join('data', 'litellm-model-prices.json')), status.shippedPath)
  assert.equal(status.localPath, localPath)
  assert.equal(status.usd, true, '上游只有 USD，原样并列、不做汇率换算')
  assert.equal(status.license, AGGREGATE_LICENSE)
  assert.equal(status.upstreamCommit, AGGREGATE_UPSTREAM_COMMIT)
  assert.ok(status.source.startsWith('https://github.com/BerriAI/litellm'), status.source)
  assert.deepEqual(status.issues, [], '随包快照必须干净：没有装载问题')

  const shippedText = readFileSync(status.shippedPath, 'utf8')
  assert.equal(status.bytes, Buffer.byteLength(shippedText, 'utf8'), '字节数按文件原样算')
  assert.equal(
    status.sha256,
    createHash('sha256').update(shippedText, 'utf8').digest('hex'),
    '装载的 sha256 必须就是文件本体的 sha256',
  )
  assert.equal(
    status.sha256,
    '6b5e1ee7e77f02c7afd4a130099d48174aabb157389de3a7512c5e1d1063e403',
    '随包快照换过就要同步更新 data/README.md 与本断言（sha256 是可复现性的锚点）',
  )
  assert.ok(Number.isFinite(Date.parse(status.fetchedAt)), 'fetchedAt = 文件 mtime（ISO）：' + String(status.fetchedAt))

  // 条目数与模型数：用独立实现复算，避免「实现和断言一起写错」
  const rawShipped = JSON.parse(shippedText)
  assert.deepEqual(
    { entries: status.entries, models: status.models },
    countPricedChat(rawShipped),
    '可定价条目数与去重模型名数必须与独立复算一致',
  )
  assert.ok(status.entries > 2600 && status.models > 1500, '实测规模：' + String(status.entries) + ' 条 / ' + String(status.models) + ' 个模型')

  // 来源说明与许可是随包交付的一部分，缺了就不该发版
  const dataDir = dirname(status.shippedPath)
  const readme = readFileSync(join(dataDir, 'README.md'), 'utf8')
  assert.ok(readme.includes(status.sha256), 'data/README.md 必须记着当前快照的 sha256')
  assert.ok(readme.includes(AGGREGATE_UPSTREAM_COMMIT), 'data/README.md 必须记着上游 commit')
  const licenseText = readFileSync(join(dataDir, 'litellm-LICENSE.txt'), 'utf8')
  assert.ok(licenseText.includes('MIT License') && licenseText.includes('Berri AI'), 'MIT 许可证原文要随包')
}

// ===== 2. 顶层 sample_spec 是文档条目，不是模型 =====
{
  const rawShipped = JSON.parse(readFileSync(status.shippedPath, 'utf8'))
  assert.equal('sample_spec' in rawShipped, true, '上游文件里确实有这个文档条目')
  const lookup = aggregateRuleFor('openai', 'sample_spec')
  assert.equal(lookup.ok, false, 'sample_spec 绝不能参与定价')
  assert.equal(lookup.reason, 'no-model')
  // 名字本身对不上任何模型：换成别的通道也一样
  assert.equal(aggregateRuleFor('zai', 'sample_spec').ok, false)
}

// ===== 3. 通道别名命中：deepseek-official → deepseek 那条 0.3 / 1.2 USD =====
{
  const hit = aggregateRuleFor('deepseek-official', 'deepseek-v4-flash')
  assert.equal(hit.ok, true)
  assert.equal(hit.hit.source, 'alias')
  assert.equal(hit.hit.key, 'deepseek-v4-flash', '同名多条时取键里 `/` 段数最少的那条（DeepSeek 直连价）')
  assert.equal(hit.hit.rule.currency, 'USD')
  assert.equal(hit.hit.rule.unit, 'perMillionTokens')
  assert.equal(hit.hit.rule.input, 0.3, '3e-7 USD/token → 0.3 USD / 百万 tokens')
  assert.equal(hit.hit.rule.output, 1.2, '1.2e-6 USD/token → 1.2 USD / 百万 tokens')
  assert.equal(hit.hit.rule.cacheRead, 0.006)
  assert.equal(hit.hit.rule.cacheWrite, 0, '上游明确给了 0 = 免费，不是「缺档」')
  assert.equal(hit.hit.partial, false, '两档缓存价都收录了 → 不标「部分」')
  assert.equal(hit.hit.rule.offPeak, null, '聚合价目没有错峰口径')
  assert.ok(hit.hit.rule.note.includes('LiteLLM'), hit.hit.rule.note)

  // 查询里的 vendor/ 前缀同样剥掉；事件里的 provider 可能是路由名（pi-ai/deepseek-official）
  const prefixed = aggregateRuleFor('deepseek-official', 'deepseek/deepseek-v4-flash')
  assert.deepEqual(prefixed.hit, hit.hit, 'vendor 前缀不影响匹配结果')
  const routed = aggregateRuleFor('pi-ai/deepseek-official', 'DeepSeek-V4-Flash')
  assert.deepEqual(routed.hit, hit.hit, '通道取末段 + 忽略大小写')

  // 别名表本身是冻结口径（导出给测试与文档用）
  assert.deepEqual(AGGREGATE_PROVIDER_ALIASES['deepseek-official'], ['deepseek'])
  assert.deepEqual(AGGREGATE_PROVIDER_ALIASES.google, ['gemini', 'vertex_ai'])
  assert.deepEqual(Object.keys(AGGREGATE_PROVIDER_ALIASES).sort(), [
    'anthropic', 'azure', 'dashscope', 'deepseek-official', 'google', 'moonshotai', 'openai', 'openrouter', 'volcengine', 'zai',
  ])
}

// ===== 4. 同名多价的确定性选择：段数最少 → 键名字典序；重复查询结果稳定 =====
{
  const flash = aggregateRuleFor('deepseek-official', 'deepseek-flash')
  assert.equal(flash.ok, true)
  assert.equal(flash.hit.key, 'deepseek-flash', '两条候选（裸名 1 段 / deepseek/… 2 段）→ 取段数最少的')
  assert.deepEqual(
    aggregateRuleFor('deepseek-official', 'deepseek-flash').hit,
    flash.hit,
    '同一查询永远给同一条（不随对象顺序漂移）',
  )

  // 同段数（都是 2 段）时按键名字典序：gemini/… < vertex_ai/…
  const gemini = aggregateRuleFor('google', 'gemini-2.5-pro')
  assert.equal(gemini.ok, true)
  assert.equal(gemini.hit.key, 'gemini/gemini-2.5-pro', '段数相同 → 键名字典序取第一条')
  assert.equal(gemini.hit.partial, true, '只收录了缓存命中价 → 缓存写入按未命中价代并标「部分」')
  assert.equal(gemini.hit.rule.cacheWrite, gemini.hit.rule.input)
}

// ===== 5. 别名不命中：唯一才用（unique），否则跳过并记 issue（不猜通道） =====
{
  const unique = aggregateRuleFor('opencode-go', 'moonshot-v1-8k')
  assert.equal(unique.ok, true, '别名表里没有 opencode-go，但该模型名全库唯一 → 可用')
  assert.equal(unique.hit.source, 'unique')
  assert.equal(unique.hit.key, 'moonshot/moonshot-v1-8k')

  const ambiguous = aggregateRuleFor('opencode-go', 'glm-5.3-flash')
  assert.equal(ambiguous.ok, false, '9 条同名候选、通道定不下来 → 跳过，不许猜')
  assert.equal(ambiguous.reason, 'ambiguous')
  assert.equal(ambiguous.candidates, 9)

  const twoCandidates = aggregateRuleFor('opencode-go', 'deepseek-flash')
  assert.equal(twoCandidates.ok, false, '只要有 2 条候选就不算「唯一」')
  assert.equal(twoCandidates.candidates, 2)

  // 无法确定的匹配必须留下可读的 issue，并随装载状态一起下发给面板
  const issue = aggregateLookupIssues().find((entry) => entry.message.includes('glm-5.3-flash'))
  assert.notEqual(issue, undefined, '跳过的匹配要记 issue')
  assert.equal(issue.kind, 'match-ambiguous')
  assert.ok(issue.message.includes('9 条候选'), issue.message)
  assert.ok(issue.message.includes('opencode-go|glm-5.3-flash'), issue.message)
  assert.ok(
    aggregateStatus().issues.some((entry) => entry.kind === 'match-ambiguous' && entry.message.includes('glm-5.3-flash')),
    'issue 要出现在装载状态里（面板据此解释「为什么这个模型没价」）',
  )
  // 同键只记一条，不会随请求次数增长
  aggregateRuleFor('opencode-go', 'glm-5.3-flash')
  assert.equal(aggregateLookupIssues().filter((entry) => entry.message.includes('glm-5.3-flash')).length, 1)
  // 全库没有这个模型名时不算「问题」：正常回落均价
  const missing = aggregateRuleFor('opencode-go', 'zzz-not-in-litellm')
  assert.equal(missing.ok, false)
  assert.equal(missing.reason, 'no-model')
  assert.equal(missing.candidates, 0)
}

// ===== 6. 缓存档四种形态 → 四档价与 partial（都取真实上游条目） =====
{
  const both = aggregateRuleFor('bedrock', 'anthropic.claude-3-5-haiku-20241022-v1:0')
  assert.equal(both.ok, true)
  assert.deepEqual(
    [both.hit.rule.input, both.hit.rule.cacheRead, both.hit.rule.cacheWrite, both.hit.rule.output, both.hit.partial],
    [0.8, 0.08, 1, 4, false],
    '两档都收录：原样折算，不标 partial',
  )

  const onlyRead = aggregateRuleFor('bedrock_converse', 'amazon.nova-2-lite-v1:0')
  assert.equal(onlyRead.ok, true)
  assert.deepEqual(
    [onlyRead.hit.rule.input, onlyRead.hit.rule.cacheRead, onlyRead.hit.rule.cacheWrite, onlyRead.hit.rule.output, onlyRead.hit.partial],
    [0.3, 0.075, 0.3, 2.5, true],
    '只有缓存命中价：缓存写入按未命中价代（与 DeepSeek 官方口径一致）并标 partial',
  )

  const onlyWrite = aggregateRuleFor('openai', 'ft:gpt-4o-2024-11-20')
  assert.equal(onlyWrite.ok, true)
  assert.deepEqual(
    [onlyWrite.hit.rule.input, onlyWrite.hit.rule.cacheRead, onlyWrite.hit.rule.cacheWrite, onlyWrite.hit.rule.output, onlyWrite.hit.partial],
    [3.75, 3.75, 1.875, 15, true],
    '只有缓存写入价：缓存命中按未命中价代并标 partial',
  )

  const neither = aggregateRuleFor('bedrock', 'ai21.j2-mid-v1')
  assert.equal(neither.ok, true)
  assert.deepEqual(
    [neither.hit.rule.input, neither.hit.rule.cacheRead, neither.hit.rule.cacheWrite, neither.hit.rule.output, neither.hit.partial],
    [12.5, 0, 0, 12.5, false],
    '两档都缺 = 不支持缓存计价：0/0，不标 partial',
  )

  // 折算只看数值：input / output 缺失或为 0 的条目根本不进候选
  const zeroPriced = aggregateRuleFor('zai', 'synthetic-never-exists')
  assert.equal(zeroPriced.ok, false)
}

// ===== 7. 接进成本链路：官方 CNY 价目在上层，聚合价在它下面 =====
{
  // deepseek-v4-flash 两层都有：内置官方价目（CNY）必须压过聚合价（USD）
  const official = rowCostsOf(
    [{ provider: 'deepseek-official', model: 'deepseek-v4-flash', calls: 1, inputTokens: 1_000_000 }],
    { version: 1, currency: 'CNY', rules: [] },
    () => null,
  )[0]
  assert.equal(official.source, 'catalog', '人民币官方价目仍在聚合价之上')
  assert.equal(official.rule.currency, 'CNY')
  assert.equal(official.partial, false)

  // 官方价目没收录、聚合价能定的模型 → 走 aggregate（USD）
  const aggregate = rowCostsOf(
    [{ provider: 'opencode-go', model: 'moonshot-v1-8k', calls: 1, inputTokens: 1_000_000 }],
    { version: 1, currency: 'CNY', rules: [] },
    () => null,
  )[0]
  assert.equal(aggregate.source, 'aggregate')
  assert.equal(aggregate.rule.currency, 'USD')
  assert.equal(aggregate.cost, 0.2, '0.2 USD / 百万 tokens × 1M')
  assert.equal(aggregate.partial, false)

  // 缺一档缓存价的条目：partial 要一路传到成本行（界面据此标「部分」）
  const partial = rowCostsOf(
    [{ provider: 'opencode-go', model: 'amazon.nova-2-lite-v1:0', calls: 1, inputTokens: 1_000_000, cacheWriteTokens: 1_000_000 }],
    { version: 1, currency: 'CNY', rules: [] },
    () => null,
  )[0]
  assert.equal(partial.source, 'aggregate')
  assert.equal(partial.partial, true)
  assert.equal(partial.cost, 0.6, '未命中 0.3 + 缓存写入按 0.3 代 = 0.6 USD')

  // 定不了通道的模型仍然回落均价，不会被聚合价硬套一个通道
  const skipped = rowCostsOf(
    [{ provider: 'opencode-go', model: 'glm-5.3-flash', calls: 1, inputTokens: 1_000_000 }],
    { version: 1, currency: 'CNY', rules: [] },
    () => 7,
  )[0]
  assert.equal(skipped.source, 'estimate')
  assert.equal(skipped.cost, 7)
}

// ===== 8. 本地刷新文件优先 + 坏文件降级（绝不抛错） =====
{
  const localRaw = {
    sample_spec: { mode: 'chat', input_cost_per_token: 1, output_cost_per_token: 1 },
    'zai/local-only-model': { mode: 'chat', input_cost_per_token: 1e-6, output_cost_per_token: 2e-6, litellm_provider: 'zai' },
    'zai/second-model': { mode: 'chat', input_cost_per_token: 3e-6, output_cost_per_token: 4e-6, litellm_provider: 'zai', cache_read_input_token_cost: 1e-7 },
  }
  writeFileSync(localPath, JSON.stringify(localRaw), 'utf8')
  invalidateAggregateCache()
  const local = aggregateStatus()
  assert.equal(local.loaded, 'local', '本地刷新文件优先于随包快照')
  assert.equal(local.path, localPath)
  assert.equal(local.entries, 2, 'sample_spec 不算条目')
  assert.equal(local.models, 2)
  assert.equal(
    local.issues.some((entry) => entry.kind.startsWith('local-') || entry.kind.startsWith('shipped-')),
    false,
    '本地文件干净：没有装载类问题（匹配类 issue 是另一回事）',
  )
  const localHit = aggregateRuleFor('zai', 'local-only-model')
  assert.equal(localHit.ok, true)
  assert.equal(localHit.hit.source, 'alias')
  assert.deepEqual([localHit.hit.rule.input, localHit.hit.rule.output], [1, 2])
  // 随包快照里存在的模型在本地文件里没有 → 就该查不到（本地文件是整份替换，不是增量合并）
  assert.equal(aggregateRuleFor('deepseek-official', 'deepseek-v4-flash').ok, false)

  // 改文件（不重启、不主动失效）→ 最迟 250ms 后生效：mtime/size 缓存会自己重读
  writeFileSync(
    localPath,
    JSON.stringify({ ...localRaw, 'zai/local-only-model': { mode: 'chat', input_cost_per_token: 5e-6, output_cost_per_token: 6e-6, litellm_provider: 'zai' } }),
    'utf8',
  )
  await new Promise((resolve) => setTimeout(resolve, 300))
  assert.equal(aggregateStatus().loaded, 'local')
  assert.equal(aggregateRuleFor('zai', 'local-only-model').hit.rule.input, 5, '改了本地文件，下一次匹配即生效')

  // 坏 JSON：降级回随包快照 + issue，绝不抛错
  writeFileSync(localPath, '{ 这不是 JSON', 'utf8')
  invalidateAggregateCache()
  const brokenJson = aggregateStatus()
  assert.equal(brokenJson.loaded, 'shipped', '本地文件坏了要让位给随包快照')
  assert.equal(brokenJson.path, brokenJson.shippedPath)
  assert.ok(brokenJson.entries > 1000)
  assert.equal(brokenJson.issues.some((entry) => entry.kind === 'local-bad-json'), true, JSON.stringify(brokenJson.issues))
  assert.ok(aggregateRuleFor('deepseek-official', 'deepseek-v4-flash').ok, '降级后照常能匹配')

  // 顶层不是对象：同样降级
  writeFileSync(localPath, '[]', 'utf8')
  invalidateAggregateCache()
  assert.equal(aggregateStatus().loaded, 'shipped')
  assert.equal(aggregateStatus().issues.some((entry) => entry.kind === 'local-bad-json'), true)

  // 一条可定价条目都没有：同样降级（不能被一份空文件顶掉价目）
  writeFileSync(localPath, JSON.stringify({ sample_spec: { mode: 'chat', input_cost_per_token: 1, output_cost_per_token: 1 } }), 'utf8')
  invalidateAggregateCache()
  const noPrices = aggregateStatus()
  assert.equal(noPrices.loaded, 'shipped')
  assert.equal(noPrices.issues.some((entry) => entry.kind === 'local-no-prices'), true, JSON.stringify(noPrices.issues))
}

// ===== 9. 刷新：写本地文件（原子写）、失败不覆盖、镜像回落、超时与上限 =====
{
  // 先落一份「旧」的本地文件，后面每一步都验证它有没有被错误覆盖
  const staleText = buildPayload(120)
  writeFileSync(localPath, staleText, 'utf8')
  invalidateAggregateCache()
  assert.equal(aggregateStatus().loaded, 'local')
  assert.equal(aggregateStatus().entries, 120)

  // 首选地址成功：原样落盘 + 回执字段齐全 + 立刻切到本地文件
  const freshText = buildPayload(130)
  const primaryFetch = fakeFetch({ [AGGREGATE_SNAPSHOT_URL]: () => new Response(freshText, { status: 200 }) })
  const written = await refreshModelPrices(primaryFetch, localPath)
  assert.equal(written.ok, true)
  assert.equal(written.url, AGGREGATE_SNAPSHOT_URL)
  assert.equal(written.bytes, Buffer.byteLength(freshText, 'utf8'))
  assert.equal(written.entries, 130)
  assert.equal(written.sha256, createHash('sha256').update(freshText, 'utf8').digest('hex'))
  assert.ok(Number.isFinite(Date.parse(written.fetchedAt)), '回执要带抓取时间')
  assert.equal(primaryFetch.calls.length, 1, '首选地址成功就不再打镜像')
  assert.equal(readFileSync(localPath, 'utf8'), freshText, '落盘内容与响应字节一致')
  assert.equal(existsSync(localPath + '.tmp'), false, '临时文件不残留（同目录 tmp + rename）')
  const afterRefresh = aggregateStatus()
  assert.equal(afterRefresh.loaded, 'local')
  assert.equal(afterRefresh.entries, 130)
  assert.equal(afterRefresh.sha256, written.sha256)
  assert.equal(aggregateRuleFor('zai', 'synthetic-129').ok, true, '刷新后新条目立即可用')

  // 首选 500 → 回落到 jsDelivr 镜像
  const mirrorText = buildPayload(131)
  const mirrorFetch = fakeFetch({
    [AGGREGATE_SNAPSHOT_URL]: () => new Response('boom', { status: 500 }),
    [AGGREGATE_MIRROR_URL]: () => new Response(mirrorText, { status: 200 }),
  })
  const viaMirror = await refreshModelPrices(mirrorFetch, localPath)
  assert.equal(viaMirror.ok, true)
  assert.equal(viaMirror.url, AGGREGATE_MIRROR_URL)
  assert.equal(viaMirror.entries, 131)
  assert.deepEqual(mirrorFetch.calls.map((call) => call.url), [AGGREGATE_SNAPSHOT_URL, AGGREGATE_MIRROR_URL], '按 raw → 镜像 的顺序尝试')
  assert.equal(readFileSync(localPath, 'utf8'), mirrorText)

  // 两个地址都不是 JSON / 条目结构不对：拒绝，且一个字节都不覆盖
  const beforeBad = readFileSync(localPath, 'utf8')
  const badFetch = fakeFetch({
    [AGGREGATE_SNAPSHOT_URL]: () => new Response('{ 坏 JSON', { status: 200 }),
    [AGGREGATE_MIRROR_URL]: () => new Response('<html>429</html>', { status: 200 }),
  })
  const bad = await refreshModelPrices(badFetch, localPath)
  assert.equal(bad.ok, false)
  assert.ok(bad.error.includes('不是合法 JSON'), bad.error)
  assert.ok(bad.error.includes(AGGREGATE_SNAPSHOT_URL) && bad.error.includes(AGGREGATE_MIRROR_URL), '失败原因要指明两个地址')
  assert.equal(readFileSync(localPath, 'utf8'), beforeBad, '校验不过绝不覆盖已有本地文件')

  // 条目数不够（< 100）：拒绝
  const fewText = buildPayload(99)
  const fewFetch = fakeFetch({
    [AGGREGATE_SNAPSHOT_URL]: () => new Response(fewText, { status: 200 }),
    [AGGREGATE_MIRROR_URL]: () => new Response(fewText, { status: 200 }),
  })
  const few = await refreshModelPrices(fewFetch, localPath)
  assert.equal(few.ok, false)
  assert.ok(few.error.includes('少于 100'), few.error)
  assert.equal(readFileSync(localPath, 'utf8'), beforeBad)

  // 条目的值不是对象（上游结构变了）：拒绝
  const shapeRaw = JSON.parse(buildPayload(120))
  shapeRaw['zai/broken-shape'] = 'not-an-object'
  const shapeFetch = fakeFetch({
    [AGGREGATE_SNAPSHOT_URL]: () => new Response(JSON.stringify(shapeRaw), { status: 200 }),
    [AGGREGATE_MIRROR_URL]: () => new Response(JSON.stringify(shapeRaw), { status: 200 }),
  })
  const shape = await refreshModelPrices(shapeFetch, localPath)
  assert.equal(shape.ok, false)
  assert.ok(shape.error.includes('不是对象'), shape.error)
  assert.equal(readFileSync(localPath, 'utf8'), beforeBad)

  // 响应超过 12 MiB：声明 content-length 的直接拒绝
  const bigFetch = fakeFetch({
    [AGGREGATE_SNAPSHOT_URL]: () => new Response('x', { status: 200, headers: { 'content-length': String(13 * 1024 * 1024) } }),
    [AGGREGATE_MIRROR_URL]: () => new Response('y', { status: 200, headers: { 'content-length': String(13 * 1024 * 1024) } }),
  })
  const big = await refreshModelPrices(bigFetch, localPath)
  assert.equal(big.ok, false)
  assert.ok(big.error.includes('too-large'), big.error)
  assert.equal(readFileSync(localPath, 'utf8'), beforeBad)

  // 没有 content-length 但流式超过上限：边读边掐
  const streamFetch = fakeFetch({
    [AGGREGATE_SNAPSHOT_URL]: () => new Response(overLimitStream(), { status: 200 }),
    [AGGREGATE_MIRROR_URL]: () => new Response(overLimitStream(), { status: 200 }),
  })
  const streamed = await refreshModelPrices(streamFetch, localPath)
  assert.equal(streamed.ok, false)
  assert.ok(streamed.error.includes('too-large'), streamed.error)
  assert.equal(readFileSync(localPath, 'utf8'), beforeBad)

  // 总超时：两段都掐掉，回 {ok:false,error:'…timeout…'}
  const hangingFetch = async (url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
  })
  const timedOut = await refreshModelPrices(hangingFetch, localPath, { timeoutMs: 30 })
  assert.equal(timedOut.ok, false)
  assert.ok(timedOut.error.includes('timeout'), timedOut.error)
  assert.equal(readFileSync(localPath, 'utf8'), beforeBad, '超时同样不碰本地文件')
}

// ===== 10. 写入守卫：只允许写 $DSH_HOME/dsh-key-usage/model-prices.json =====
{
  const wrongName = join(home, 'dsh-key-usage', 'other-prices.json')
  const nameResult = writeModelPricesFile(wrongName, '{}')
  assert.equal(nameResult.ok, false)
  assert.ok(nameResult.error.includes('只允许写 model-prices.json'), nameResult.error)
  assert.equal(existsSync(wrongName), false, '守卫拦住时一个字节都不写')

  const otherDir = join(home, 'elsewhere', 'model-prices.json')
  mkdirSync(join(home, 'elsewhere'), { recursive: true })
  const dirResult = writeModelPricesFile(otherDir, '{}')
  assert.equal(dirResult.ok, false)
  assert.ok(dirResult.error.includes('$DSH_HOME'), dirResult.error)
  assert.equal(existsSync(otherDir), false)

  // 刷新端点走同一个守卫：目标不对时**不发起任何请求**
  const guardedFetch = fakeFetch({})
  const guarded = await refreshModelPrices(guardedFetch, otherDir)
  assert.equal(guarded.ok, false)
  assert.equal(guardedFetch.calls.length, 0, '写目标守卫先于联网：路径不对就一个请求都不发')
  assert.equal(existsSync(otherDir), false)
}

rmSync(home, { recursive: true, force: true })
console.log('model-prices.test: 全部通过')
