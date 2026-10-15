/**
 * 客户端计费展示工具测试（服务端契约对齐）：
 * - 成本来源角标的文案：`CostSource` 的每一档都要有中文标签与悬浮说明（漏一档界面会出现 undefined）；
 * - `partial` 标记只补口径说明，不当成错误；
 * - 聚合价装载信息与内置价目新鲜度的展示工具（MB / host / 短 commit / 抓取天数 / 过期阈值）。
 *
 * 用 Node 的类型擦除直接加载 `src/client/pricing.ts`（Node ≥ 22.18 默认开启）：该模块没有 import，是纯函数。
 * 运行：node test/client-pricing.test.mjs
 */
import assert from 'node:assert/strict'

// 标签/说明已改成 i18n 词典键：这里直接校验词典里的中文文案
const { zh } = await import('../src/client/core/copy.ts')

let clientPricing = null
try {
  clientPricing = await import('../src/client/core/pricing.ts')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  if (/Unknown file extension|strip-types|ERR_UNKNOWN_FILE_EXTENSION|TypeScript/i.test(message)) {
    console.log('client-pricing.test: 当前 Node 不支持直接加载 .ts（需要 ≥ 22.18），已跳过')
  } else {
    throw error
  }
}

if (clientPricing !== null) {
  const {
    AGGREGATE_LOADED_LABELS,
    CATALOG_STALE_DAYS,
    COST_SOURCE_HINTS,
    COST_SOURCE_LABELS,
    LITELLM_REPO_URL,
    PARTIAL_PRICE_HINT,
    aggregateLoadedLabelOf,
    catalogStaleDays,
    costSourceHintOf,
    fetchedDaysAgo,
    hostOf,
    megabytesTextOf,
    shortCommitOf,
  } = clientPricing

  // ===== 1. 成本来源：五档全覆盖，且与「你的规则」层一起退役 =====
  {
    const sources = ['official', 'catalog', 'aggregate', 'estimate', 'none']
    assert.deepEqual(Object.keys(COST_SOURCE_LABELS).sort(), [...sources].sort(), '标签表只认这五档')
    assert.deepEqual(Object.keys(COST_SOURCE_HINTS).sort(), [...sources].sort(), '说明表与标签表同集合')
    assert.equal(COST_SOURCE_LABELS.rule, undefined, '「自定」角标已随用户规则层移除')
    const values = Object.values(COST_SOURCE_LABELS)
    assert.equal(new Set(values).size, values.length, '标签不重复')
    for (const source of sources) {
      assert.equal(typeof COST_SOURCE_LABELS[source], 'string')
      assert.ok(COST_SOURCE_LABELS[source] !== '', source + ' 的标签不能为空')
      // 「none」用语言无关的破折号，其余必须是词典键
      const label = COST_SOURCE_LABELS[source]
      assert.ok(label === '—' || zh[label] !== undefined, source + ' 的标签必须是词典键（或语言无关符号）')
      assert.ok(zh[COST_SOURCE_HINTS[source]].length > 4, source + ' 的说明要能看懂')
    }
    assert.ok(zh[COST_SOURCE_HINTS.aggregate].includes('美元'), '聚合价要写明是美元价目')
  }

  // ===== 2. 角标悬浮说明：未知档位不拼 undefined，partial 只补口径 =====
  {
    assert.equal(costSourceHintOf('catalog'), zh[COST_SOURCE_HINTS.catalog])
    assert.equal(costSourceHintOf(null), zh[COST_SOURCE_HINTS.none], '服务端没给来源时按「无依据」展示')
    assert.equal(costSourceHintOf(undefined), zh[COST_SOURCE_HINTS.none])
    assert.ok(costSourceHintOf('unknown-source').includes('unknown-source'), '未知档位要如实写出来，而不是 undefined')
    assert.equal(
      costSourceHintOf('aggregate', true),
      zh[COST_SOURCE_HINTS.aggregate] + '；' + zh[PARTIAL_PRICE_HINT],
      'partial 只追加口径说明',
    )
    assert.equal(costSourceHintOf('aggregate', false), zh[COST_SOURCE_HINTS.aggregate])
    assert.equal(costSourceHintOf('aggregate', null), zh[COST_SOURCE_HINTS.aggregate])
  }

  // ===== 3. 聚合价装载来源标签与仓库地址 =====
  {
    assert.deepEqual(Object.keys(AGGREGATE_LOADED_LABELS).sort(), ['local', 'none', 'shipped'])
    assert.equal(aggregateLoadedLabelOf('local'), AGGREGATE_LOADED_LABELS.local)
    assert.equal(aggregateLoadedLabelOf('shipped'), AGGREGATE_LOADED_LABELS.shipped)
    assert.equal(typeof aggregateLoadedLabelOf(null), 'string', '拿不到装载状态时也要给一句可读文案')
    assert.equal(aggregateLoadedLabelOf(null), AGGREGATE_LOADED_LABELS.none, '缺字段按「未装载」')
    assert.equal(aggregateLoadedLabelOf(undefined), AGGREGATE_LOADED_LABELS.none)
    assert.equal(aggregateLoadedLabelOf(''), AGGREGATE_LOADED_LABELS.none)
    assert.equal(aggregateLoadedLabelOf('whatever'), '未知（whatever）', '没见过的取值如实写出来')
    assert.equal(LITELLM_REPO_URL, 'https://github.com/BerriAI/litellm')
  }

  // ===== 4. 体积 / 主机名 / commit 的展示工具：脏数据一律 null（界面整段省略） =====
  {
    assert.equal(megabytesTextOf(0), '0.00 MB')
    assert.equal(megabytesTextOf(2670000), '2.55 MB')
    assert.equal(megabytesTextOf(-1), null)
    assert.equal(megabytesTextOf('2 MB'), null)
    assert.equal(megabytesTextOf(undefined), null)
    assert.equal(megabytesTextOf(Number.NaN), null)

    assert.equal(hostOf('https://open.er-api.com/v6/latest/USD'), 'open.er-api.com')
    assert.equal(hostOf('https://api.frankfurter.app/latest?from=USD&to=CNY'), 'api.frankfurter.app')
    assert.equal(hostOf('not a url'), null)
    assert.equal(hostOf(''), null)
    assert.equal(hostOf(42), null)

    assert.equal(shortCommitOf('30b8db325e85740eb86901d08597da845b206504'), '30b8db3')
    assert.equal(shortCommitOf('  30b8db325e85740e  '), '30b8db3', '首尾空白先裁掉')
    assert.equal(shortCommitOf('abc123'), null, '太短的值不当 commit 展示')
    assert.equal(shortCommitOf(null), null)
  }

  // ===== 5. 内置价目新鲜度：按本地日历日算天数，未超阈值不给提醒 =====
  {
    const now = new Date(2026, 9, 14, 20, 30, 0)
    assert.equal(fetchedDaysAgo('2026-10-14', now), 0, '同一天算 0 天')
    assert.equal(fetchedDaysAgo('2026-10-01', now), 13)
    assert.equal(fetchedDaysAgo('2026-12-31', now), 0, '未来日期不出现负数')
    assert.equal(fetchedDaysAgo('2026/10/14', now), null, '只认 YYYY-MM-DD')
    assert.equal(fetchedDaysAgo('', now), null)

    assert.equal(catalogStaleDays([{ fetchedAt: '2026-10-14' }], now), null, '刚更新过不提醒')
    assert.equal(catalogStaleDays([{ fetchedAt: '2026-07-16' }], now), null, '刚好 90 天不提醒（阈值是「超过」）')
    assert.equal(catalogStaleDays([{ fetchedAt: '2026-07-15' }], now), 91, '超过 90 天给出天数')
    assert.equal(
      catalogStaleDays([{ fetchedAt: '2026-07-15' }, { fetchedAt: '2026-10-14' }], now),
      null,
      '多个来源取最新的一次判断',
    )
    assert.equal(catalogStaleDays([], now), null, '没有来源就没有提醒')
    assert.equal(catalogStaleDays([{ fetchedAt: '坏日期' }], now), null)
    assert.equal(CATALOG_STALE_DAYS, 90)
  }

  console.log('client-pricing.test: 全部通过')
}
