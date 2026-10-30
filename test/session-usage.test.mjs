/**
 * session-usage 折叠逻辑离线测试：样本去重/重试累加、模型归属、小时分桶、汇总与提问词频。
 * 运行：node test/session-usage.test.mjs
 */
import assert from 'node:assert/strict'
import {
  attributeModelKey,
  buildPromptSessionIndex,
  foldSessionEvents,
  preparePromptSegmenter,
  isInjectedPromptText,
  mergePromptStats,
  mergePromptStatsForWindow,
  mergePromptStatsInWindow,
  normalizeProvider,
  previousPromptWindowOf,
  promptSnippetOf,
  summarizeSession,
  MAX_SESSION_WORDS,
  PROMPT_SNIPPET_CHARS,
  PROMPT_STATS_CHARS,
  PROMPT_TITLE_CHARS,
} from '../lib/data/session-usage.js'

// 固定本地时间，避免测试依赖机器时区
const baseTime = new Date(2026, 9, 13, 10, 30, 0).getTime()
const laterTime = new Date(2026, 9, 13, 14, 5, 0).getTime()

const header = {
  seq: 0,
  time: baseTime,
  type: 'request/header',
  data: { header: { config: { provider: 'pi-ai/opencode-go', model: 'GLM-5.3-Flash' } } },
}

function usageChunk(seq, time, turn, step, usage) {
  return { seq, time, type: 'assistant/chunk', data: { turn, step, chunk: { type: 'usage', usage } } }
}

// 场景一：同一 (turn, step) 的重复上报按后到覆盖，不重复计数
const replacementFold = foldSessionEvents([
  header,
  usageChunk(1, baseTime, 1, 1, { inputTokens: 100, outputTokens: 50, cacheReadTokens: 850 }),
  {
    seq: 2,
    time: laterTime,
    type: 'assistant/message',
    data: {
      turn: 1, step: 1,
      usage: { inputTokens: 120, outputTokens: 60, cacheReadTokens: 900 },
      message: { source: { provider: 'opencode-go', model: 'GLM-5.3-Flash' } },
    },
  },
])
const replacementSummary = summarizeSession(replacementFold)
assert.equal(replacementSummary.calls, 1, '同一 turn/step 只算一次调用')
assert.equal(replacementSummary.buckets.inputTokens, 120, '后到的上报覆盖先到的')
assert.equal(replacementSummary.buckets.cacheReadTokens, 900)
assert.equal(replacementSummary.days.length, 1, '覆盖后只落在后到事件所在的那一天')
assert.equal(replacementSummary.days[0].date, '2026-10-13')
assert.equal(replacementSummary.days[0].hours[14].calls, 1, '小时槽跟随覆盖后的时间')
assert.equal(replacementSummary.days[0].hours[10].calls, 0, '被覆盖的旧小时槽清空')

// 场景二：llm/retry-started 之后的同 turn/step 是新一轮尝试，应与原尝试累加
const retryFold = foldSessionEvents([
  header,
  usageChunk(1, baseTime, 1, 1, { inputTokens: 100, outputTokens: 50, cacheReadTokens: 0 }),
  { seq: 2, time: baseTime, type: 'llm/retry-started', data: { turn: 1, step: 1 } },
  usageChunk(3, baseTime, 1, 1, { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0 }),
])
const retrySummary = summarizeSession(retryFold)
assert.equal(retrySummary.calls, 2, '重试是新的一次上报')
assert.equal(retrySummary.buckets.inputTokens, 110, '重试用量与原尝试累加')
assert.equal(retrySummary.buckets.outputTokens, 55)

// 场景三：模型归属 —— message.source 优先，缺失时回落最近一次 request/header
const attributionFold = foldSessionEvents([
  header,
  usageChunk(1, baseTime, 1, 1, { inputTokens: 10, outputTokens: 1, cacheReadTokens: 0 }),
  {
    seq: 2, time: baseTime, type: 'assistant/chunk',
    data: { turn: 1, step: 2, chunk: { type: 'usage', usage: { inputTokens: 20, outputTokens: 2, cacheReadTokens: 0 } } },
  },
  {
    seq: 3, time: baseTime, type: 'assistant/message',
    data: {
      turn: 1, step: 3,
      usage: { inputTokens: 30, outputTokens: 3, cacheReadTokens: 0 },
      message: { source: { provider: 'deepseek-official', model: 'DeepSeek-Flash' } },
    },
  },
])
const attributionSummary = summarizeSession(attributionFold)
assert.equal(attributionSummary.models.length, 2, '两个不同模型归属')
const fallbackModel = attributionSummary.models.find((row) => row.key.startsWith('pi-ai/opencode-go/'))
assert.ok(fallbackModel !== undefined, '未带 source 的样本回落到 request/header 的模型')
assert.equal(fallbackModel.calls, 2, '前两个样本都归到回落模型')
const sourceModel = attributionSummary.models.find((row) => row.key.startsWith('deepseek-official/'))
assert.ok(sourceModel !== undefined, 'message.source 命名的模型单独成行')
assert.equal(sourceModel.calls, 1)
assert.equal(sourceModel.tokens, 33, '模型行 tokens 为该模型四个分桶之和')
assert.equal(typeof attributionSummary.primaryModelKey, 'string', '存在主归属键')

// 场景四：v2 结算把样本放进 data.stream
const streamFold = foldSessionEvents([
  header,
  {
    seq: 1, time: baseTime, type: 'assistant/attempt',
    data: {
      turn: 2, step: 1,
      stream: [{ type: 'text' }, { type: 'chunk', chunk: { type: 'usage', usage: { inputTokens: 7, outputTokens: 3, cacheReadTokens: 0, cacheWriteTokens: 5 } } }],
    },
  },
])
const streamSummary = summarizeSession(streamFold)
assert.equal(streamSummary.calls, 1, 'stream 内嵌样本被识别')
assert.equal(streamSummary.buckets.cacheWriteTokens, 5, 'cacheWrite 一并计入总量')
assert.equal(streamSummary.tokens, 15, 'tokens = 四类分桶之和')

// 场景六：按类型分流后的边界 —— 缺 turn/step 的样本键、attempt 的样本来源、非整数重试、标题兜底
const fallbackKeysFold = foldSessionEvents([
  header,
  { seq: 1, time: baseTime, type: 'assistant/chunk', data: { chunk: { type: 'usage', usage: { inputTokens: 5, outputTokens: 1, cacheReadTokens: 0 } } } },
  { seq: 2, time: baseTime, type: 'llm/retry-started', data: {} },
  { seq: 3, time: baseTime, type: 'assistant/chunk', data: { chunk: { type: 'usage', usage: { inputTokens: 6, outputTokens: 2, cacheReadTokens: 0 } } } },
])
const fallbackKeysSummary = summarizeSession(fallbackKeysFold)
assert.equal(fallbackKeysSummary.calls, 2, '缺 turn/step 时按 seq 建档，两次上报都是独立样本')
assert.equal(fallbackKeysSummary.buckets.inputTokens, 11, '缺 turn/step 的重试事件不参与尝试分槽')
assert.ok([...fallbackKeysFold.samples.keys()].includes('seq:1#0'), '样本键回落 seq:<seq>')
assert.ok([...fallbackKeysFold.samples.keys()].includes('seq:3#0'))

// assistant/attempt 不认 data.usage，只认 data.stream（与旧实现一致）
const attemptFold = foldSessionEvents([
  header,
  { seq: 1, time: baseTime, type: 'assistant/attempt', data: { turn: 3, step: 1, usage: { inputTokens: 999, outputTokens: 999, cacheReadTokens: 0 } } },
  {
    seq: 2, time: baseTime, type: 'assistant/attempt',
    data: {
      turn: 3, step: 2,
      usage: { inputTokens: 888, outputTokens: 888, cacheReadTokens: 0 },
      stream: [{ type: 'chunk', chunk: { type: 'usage', usage: { inputTokens: 4, outputTokens: 2, cacheReadTokens: 0 } } }],
    },
  },
])
const attemptSummary = summarizeSession(attemptFold)
assert.equal(attemptSummary.calls, 1, 'attempt 只有 data.usage 时不算样本')
assert.equal(attemptSummary.buckets.inputTokens, 4, 'attempt 带 stream 时取 stream 里的样本，而不是 data.usage')

// 标题兜底：首个 user/message 没有文本块时继续找下一条
const promptFold = foldSessionEvents([
  { seq: 0, time: baseTime, type: 'user/message', data: { content: [{ type: 'image' }] } },
  { seq: 1, time: baseTime, type: 'user/message', data: { content: ['   第二 条   提问   '] } },
  { seq: 2, time: laterTime, type: 'user/message', data: { content: ['第三条不该被取'] } },
])
assert.equal(promptFold.firstPrompt, '第二 条 提问', '取第一条有文本的提问并压平空白')

// 标题质量：teammate / 斜杠命令这类**系统注入**文本不是人类提问，必须跳过它继续往下找
const userMessage = (seq, text) => ({ seq, time: baseTime, type: 'user/message', data: { content: [{ type: 'text', text }] } })
const injectedSamples = [
  '<system-reminder> You are teammate "kurlon".',
  '<system>系统提示</system>',
  '<command-name>/clear</command-name>',
  '<local-command-stdout>done</local-command-stdout>',
]
injectedSamples.forEach((injected, index) => {
  const fold = foldSessionEvents([userMessage(0, injected), userMessage(1, '第 ' + String(index) + ' 条真实提问')])
  assert.equal(fold.firstPrompt, '第 ' + String(index) + ' 条真实提问', '跳过注入文本：' + injected.slice(0, 24))
})

// 连续多条系统消息：继续往下找到第一条人类消息为止
const consecutiveSystem = foldSessionEvents([
  userMessage(0, '<system-reminder> You are teammate "kurlon".'),
  userMessage(1, '<command-name>/compact</command-name>'),
  userMessage(2, '<system>第二条系统消息</system>'),
  userMessage(3, '真正的提问在这里'),
])
assert.equal(consecutiveSystem.firstPrompt, '真正的提问在这里', '连续系统消息会一直往下找')

// 只有系统消息：没有提问可用（界面回落「（无提问）」+ 短 id，而不是空标题）
const onlySystem = foldSessionEvents([
  userMessage(0, '<system-reminder> You are teammate "kurlon".'),
  userMessage(1, '<local-command-stdout>ok</local-command-stdout>'),
])
assert.equal(onlySystem.firstPrompt, null, '全是系统消息时没有提问')

// 注入判定只看**开头**：正文里引用标签的正常提问不能被误杀
const inlineTag = foldSessionEvents([userMessage(0, '为什么 <system-reminder> 会出现在标题里？')])
assert.equal(inlineTag.firstPrompt, '为什么 <system-reminder> 会出现在标题里？', '只有开头的标签才算系统注入')
assert.equal(isInjectedPromptText('<system-reminder>x'), true)
assert.equal(isInjectedPromptText('普通提问'), false)

// 正文与列表片段分离：折叠里保留全文（详情要），标题 / 搜索片段才截断
const longText = '长'.repeat(300)
const longFold = foldSessionEvents([userMessage(0, longText)])
assert.equal(longFold.firstPrompt.length, 300, '折叠结果保留提问全文')
assert.equal(promptSnippetOf(longFold.firstPrompt, PROMPT_TITLE_CHARS).length, 61, '标题截断到 60 字 + 省略号')
assert.equal(promptSnippetOf(longFold.firstPrompt, PROMPT_SNIPPET_CHARS).length, PROMPT_SNIPPET_CHARS + 1, '搜索片段按 200 字截断')
assert.equal(promptSnippetOf(null), null, '没有提问时片段为 null')
assert.equal(promptSnippetOf('   '), null, '只有空白也算没有提问')

// 场景五：继承前缀不计入（由数据源负责裁剪），此处只验证时间范围
assert.equal(replacementSummary.firstTime, baseTime)
assert.equal(replacementSummary.lastTime, laterTime)
assert.equal(replacementSummary.cacheHitRate, 83.3, '命中率 = 900 / (120 + 60 + 900)')

// 归属键拆分：已知通道名在段边界上从右往左匹配
assert.deepEqual(attributeModelKey('pi-ai/opencode-go/GLM-5.3-Flash', ['opencode-go', 'local']), { provider: 'opencode-go', model: 'GLM-5.3-Flash' })
assert.deepEqual(attributeModelKey('sensenova/sensenova-6.8-flash-lite', ['sensenova']), { provider: 'sensenova', model: 'sensenova-6.8-flash-lite' })
assert.deepEqual(attributeModelKey('unknown/unknown', ['sensenova']), { provider: 'unknown', model: 'unknown' })
assert.equal(normalizeProvider('pi-ai/opencode-go', ['opencode-go']), 'opencode-go')
assert.equal(normalizeProvider('other', ['opencode-go']), 'other')

// ===== 场景七：提问词频（中文 2-gram + 英文标识符、虚词边界过滤、系统注入不计、中英等权） =====
const timeUserMessage = (seq, time, text) => ({ seq, time, type: 'user/message', data: { content: [{ type: 'text', text }] } })
const promptStatsFold = foldSessionEvents([
  timeUserMessage(0, baseTime, '<system-reminder> You are teammate "kurlon".'),
  timeUserMessage(1, baseTime, '请分析 snapshot.json 的写入耗时，插件的性能问题'),
  timeUserMessage(2, baseTime, 'The pricing parser is broken, please fix the ledger'),
  timeUserMessage(3, baseTime, '你是我的助手，不要修改数据库'),
])
const promptTexts = [
  '请分析 snapshot.json 的写入耗时，插件的性能问题',
  'The pricing parser is broken, please fix the ledger',
  '你是我的助手，不要修改数据库',
]
assert.equal(promptStatsFold.promptCount, 3, '每条非注入提问都统计（不再只取首条）')
assert.equal(promptStatsFold.promptChars, promptTexts.reduce((sum, text) => sum + text.length, 0), '字符数 = 参与统计的提问长度之和')
assert.equal(promptStatsFold.promptFirstTime, baseTime)
assert.equal(promptStatsFold.promptLastTime, baseTime)
assert.equal(promptStatsFold.words.get('snapshot.json'), 1, '英文标识符（含点号）计数')
assert.equal(promptStatsFold.words.get('pricing'), 1)
assert.equal(promptStatsFold.words.get('is'), undefined, '英文停用词不计：is')
assert.equal(promptStatsFold.words.get('the'), undefined, '英文停用词不计：the')
for (const chineseWord of ['分析', '写入', '耗时', '插件', '性能', '问题', '助手', '修改', '数据']) {
  assert.equal(promptStatsFold.words.get(chineseWord), 1, '中文 2-gram 计数：' + chineseWord)
}
for (const functionGram of ['你是', '不要', '件的', '的性', '的写', '我的', '要修', '是我']) {
  assert.equal(promptStatsFold.words.get(functionGram), undefined, '虚词边界 gram 被丢弃：' + functionGram)
}

// 中英等权：同一段里中英各出现两次，计数相同（不按语言加权）
const equalWeightFold = foldSessionEvents([timeUserMessage(0, baseTime, '分析 analysis 分析 analysis')])
assert.equal(equalWeightFold.words.get('分析'), 2)
assert.equal(equalWeightFold.words.get('analysis'), 2, '中英权重相同：一次出现算一次')

// 超长提问只统计前 300 字：300 字之后的词不进词表
const longPromptTail = '词频统计测试'.repeat(80) + ' uniquetailmarker'
const longStatsFold = foldSessionEvents([timeUserMessage(0, baseTime, longPromptTail)])
assert.equal(longStatsFold.promptCount, 1)
assert.equal(longStatsFold.promptChars, PROMPT_STATS_CHARS, '超过 300 字的提问只按前 300 字计入')
assert.ok(longStatsFold.words.get('词频') > 0, '前 300 字里的 2-gram 照常统计')
assert.equal(longStatsFold.words.get('uniquetailmarker'), undefined, '300 字之后的词不统计')

// 单会话词表上限：到顶后只累加已有词，不再收新词
const capEvents = []
let capToken = 0
for (let messageIndex = 0; messageIndex < 230; messageIndex += 1) {
  const tokens = []
  for (let position = 0; position < 37; position += 1) {
    tokens.push('t' + String(capToken).padStart(6, '0'))
    capToken += 1
  }
  capEvents.push(timeUserMessage(messageIndex, baseTime, tokens.join(' ')))
}
const capFold = foldSessionEvents(capEvents)
assert.equal(capFold.words.size, MAX_SESSION_WORDS, '单会话词表封顶：' + String(MAX_SESSION_WORDS))
assert.equal(capFold.words.get('t000000'), 1, '上限内的词照常计入')
assert.equal(capFold.words.get('t008509'), undefined, '超过上限后的词不收')

// 合并：词频相加、条数与字符数相加、时间取并集、top N 排序与截断
const mergeFirstDay = new Date(2026, 9, 13, 10, 30, 0).getTime()
const mergeSecondDay = new Date(2026, 9, 15, 9, 0, 0).getTime()
const mergeFirst = foldSessionEvents([
  timeUserMessage(0, mergeFirstDay, '分析 插件 snapshot.json'),
  timeUserMessage(1, mergeFirstDay, '分析 插件'),
])
const mergeSecond = foldSessionEvents([timeUserMessage(0, mergeSecondDay, 'ledger 分析 会话')])
const merged = mergePromptStats([mergeFirst, mergeSecond])
assert.equal(merged.totalPrompts, 3, '条数相加')
assert.equal(merged.totalChars, mergeFirst.promptChars + mergeSecond.promptChars, '字符数相加')
assert.deepEqual(merged.words[0], { word: '分析', count: 3 }, '词频相加后按次数降序')
assert.equal(merged.words.find((entry) => entry.word === '插件').count, 2)
assert.equal(merged.from, '2026-10-13', '起点取参与统计提问的最早本地日期')
assert.equal(merged.to, '2026-10-15', '终点取最晚本地日期')
assert.deepEqual(merged.words.filter((entry) => entry.count === 1), [
  { word: 'ledger', count: 1 },
  { word: 'snapshot.json', count: 1 },
  { word: '会话', count: 1 },
], '同频按词升序（排序键固定，下发顺序稳定）')
const limitedMerge = mergePromptStats([mergeFirst, mergeSecond], 2)
assert.deepEqual(limitedMerge.words.map((entry) => entry.word), ['分析', '插件'], 'limit 截断')
assert.deepEqual(mergePromptStats([]), { words: [], totalPrompts: 0, totalChars: 0, from: null, to: null }, '没有数据时给空词表')
assert.deepEqual(
  mergePromptStats([{ words: new Map([['分析', 4]]) }]),
  { words: [{ word: '分析', count: 4 }], totalPrompts: 0, totalChars: 0, from: null, to: null },
  '旧数据源没有统计字段时按空值合并，不抛错',
)

// 按天窗口合并（快照 prompts 段的环比用）：同一会话跨窗口时按天各计各的，不重复也不近似
const windowFirstDayOnly = mergePromptStatsForWindow([mergeFirst, mergeSecond], '2026-10-13', '2026-10-13')
assert.equal(windowFirstDayOnly.totalPrompts, 2, '窗口只算 10-13 的提问')
assert.equal(windowFirstDayOnly.totalChars, mergeFirst.promptChars, '字数按窗口切分')
assert.equal(windowFirstDayOnly.days, 1, '窗口内有数据的天数')
assert.deepEqual(
  windowFirstDayOnly.words.map((entry) => entry.word),
  ['分析', '插件', 'snapshot.json'],
  '窗口内 top 词（同频按词升序）',
)
const windowBothDays = mergePromptStatsForWindow([mergeFirst, mergeSecond], '2026-10-13', '2026-10-15')
assert.equal(windowBothDays.totalPrompts, merged.totalPrompts, '覆盖两天的窗口等于整体合计')
assert.equal(windowBothDays.days, 2)
const windowEmpty = mergePromptStatsForWindow([mergeFirst, mergeSecond], '2026-10-01', '2026-10-05')
assert.deepEqual(
  { prompts: windowEmpty.totalPrompts, chars: windowEmpty.totalChars, words: windowEmpty.words, days: windowEmpty.days },
  { prompts: 0, chars: 0, words: [], days: 0 },
  '窗口内没有任何提问：用 days=0 表示「没数据」，界面不能拿 0 编环比',
)
assert.equal(
  mergePromptStatsForWindow([{ words: new Map([['分析', 4]]) }], '2026-10-01', '2026-10-31').days,
  0,
  '旧数据源没有按天桶时窗口按无数据处理，不抛错',
)

// 上期窗口：同长度、紧邻前一段（UTC 日期算术，本地日期键不变）
assert.deepEqual(previousPromptWindowOf('2026-10-14', '2026-10-15'), { from: '2026-10-12', to: '2026-10-13' })
assert.deepEqual(previousPromptWindowOf('2026-10-15', '2026-10-15'), { from: '2026-10-14', to: '2026-10-14' })
assert.deepEqual(previousPromptWindowOf('2026-10-01', '2026-10-30'), { from: '2026-09-01', to: '2026-09-30' })

// ===== 场景九：提问运行期索引 = 窗口 + 项目 / 模型 / 通道筛选（`/prompts` 用的那套） =====
const indexFoldA = foldSessionEvents([
  timeUserMessage(0, mergeFirstDay, 'alpha deployment 分析'),
  timeUserMessage(1, mergeFirstDay, 'beta cache 插件'),
  timeUserMessage(2, mergeSecondDay, 'gamma snapshot 部署'),
])
const indexFoldB = foldSessionEvents([timeUserMessage(0, mergeSecondDay, 'delta ledger Qwen3')])
const promptIndex = buildPromptSessionIndex([
  { id: 'session-a', workspace: 'D:\\EasyJob', summary: { models: [{ key: 'pi-ai/opencode-go/GLM-5.3-Flash' }] }, promptDayStats: indexFoldA.promptDayStats },
  { id: 'session-b', workspace: null, summary: { models: [{ key: 'local/Qwen3' }] }, promptDayStats: indexFoldB.promptDayStats },
], ['opencode-go', 'local'])
assert.deepEqual(promptIndex.get('session-a').models, ['GLM-5.3-Flash'], '模型名按展示口径拆掉路由前缀')
assert.deepEqual(promptIndex.get('session-a').providers, ['opencode-go'])
assert.equal(promptIndex.get('session-b').workspace, '', '没有工作区的会话归到未归入工作区（空串）')
const noFilterIndex = mergePromptStatsInWindow(promptIndex, { from: '2026-10-13', to: '2026-10-15' })
assert.equal(noFilterIndex.totalPrompts, 4, '窗口内全部会话的提问条数')
assert.equal(noFilterIndex.days, 2, '窗口内有数据的天数（同一天多个会话只算一天）')
const firstDayIndex = mergePromptStatsInWindow(promptIndex, { from: '2026-10-13', to: '2026-10-13' })
assert.equal(firstDayIndex.totalPrompts, 2, '按天切片：只算 10-13 的提问')
assert.deepEqual(firstDayIndex.words.map((entry) => entry.word).slice(0, 2), ['alpha', 'beta'], '窗口内 top 词')
const byProject = mergePromptStatsInWindow(promptIndex, { from: '2026-10-13', to: '2026-10-15', projects: ['D:\\EasyJob'] })
assert.equal(byProject.totalPrompts, 3, '项目筛选只算该工作区的会话 A')
assert.equal(byProject.words.some((entry) => entry.word === 'delta'), false, '别的会话的词不混进来')
const byOrphan = mergePromptStatsInWindow(promptIndex, { from: '2026-10-13', to: '2026-10-15', projects: [''] })
assert.equal(byOrphan.totalPrompts, 1, '空串 = 未归入工作区的会话 B')
const byModel = mergePromptStatsInWindow(promptIndex, { from: '2026-10-13', to: '2026-10-15', models: ['GLM-5.3-Flash'] })
assert.equal(byModel.totalPrompts, 3, '模型筛选按展示模型名')
const byModelMulti = mergePromptStatsInWindow(promptIndex, { from: '2026-10-13', to: '2026-10-15', models: ['GLM-5.3-Flash', 'Qwen3'] })
assert.equal(byModelMulti.totalPrompts, 4, '模型多选是任一命中')
const byProvider = mergePromptStatsInWindow(promptIndex, { from: '2026-10-13', to: '2026-10-15', providers: ['local'] })
assert.equal(byProvider.totalPrompts, 1, '通道筛选按 provider id')
const combinedFilter = mergePromptStatsInWindow(promptIndex, {
  from: '2026-10-13', to: '2026-10-15', projects: ['D:\\EasyJob'], models: ['Qwen3'],
})
assert.deepEqual(
  { prompts: combinedFilter.totalPrompts, words: combinedFilter.words, days: combinedFilter.days },
  { prompts: 0, words: [], days: 0 },
  '不同维度之间是同时满足：项目命中但模型不命中 → 空结果（不是全量也不是报错）',
)
assert.equal(mergePromptStatsInWindow(promptIndex, { from: '2026-10-01', to: '2026-10-05' }).totalPrompts, 0, '空窗口回全 0')
assert.equal(mergePromptStatsInWindow(null, { from: '2026-10-13', to: '2026-10-15' }), null, '索引还没建好时回 null（客户端回落快照段）')

// ===== 场景八：剥离宿主注入（来源 kind + 标签段）与英文停用词 =====
const sourcedUserMessage = (seq, time, text, source) => ({ seq, time, type: 'user/message', data: { content: [{ type: 'text', text }], source } })
const humanPromptMessage = (seq, time, text) => sourcedUserMessage(seq, time, text, { kind: 'user' })
const timeContextText = [
  'Time sampled while preparing turn 1, step 1: 2026-10-23T10:36:14+08:00[Asia/Shanghai]',
  'Browser time zone for this request: unavailable. Ask the user to clarify otherwise-unqualified dates and times.',
  'Elapsed since the preceding model-visible message: unavailable.',
].join('\n')

// 宿主注入是独立的 user/message（source.kind 不是 user）：不进标题、不进词频、不计条数
const humanOnlyText = '帮我看看 snapshot.json 的 cache 命中率'
const sourcedFold = foldSessionEvents([
  sourcedUserMessage(0, baseTime, timeContextText, { kind: 'time-context' }),
  sourcedUserMessage(1, baseTime, 'Current runtime context. This snapshot supersedes earlier runtime-context snapshots.', { kind: 'runtime-context' }),
  humanPromptMessage(2, baseTime, humanOnlyText),
])
assert.equal(sourcedFold.promptCount, 1, '注入消息不计入提问条数')
assert.equal(sourcedFold.promptChars, humanOnlyText.length, '字符数只算人类提问')
assert.equal(sourcedFold.firstPrompt, humanOnlyText, '注入消息不当标题兜底')
assert.equal(sourcedFold.words.get('cache'), 1, '人类提问里的实词照常统计')
assert.equal(sourcedFold.words.get('snapshot.json'), 1)
for (const injectedWord of ['the', 'this', 'step', 'message', 'browser', 'zone', 'asia/shanghai', 'dates', 'elapsed', 'sampled', 'preparing', 'request', 'turn', 'otherwise-unqualified', 'preceding', 'supersedes']) {
  assert.equal(sourcedFold.words.get(injectedWord), undefined, '注入消息的词不进词表：' + injectedWord)
}

// 同一条人类消息里拼进成对注入段：只统计用户部分
const mixedHumanPart = '请分析 snapshot.json 的写入耗时'
const mixedFold = foldSessionEvents([
  humanPromptMessage(0, baseTime, mixedHumanPart + '\n\n<system-reminder>\n' + timeContextText + '\n</system-reminder>'),
])
assert.equal(mixedFold.promptCount, 1, '剥离注入段后仍有正文，保留一条')
assert.equal(mixedFold.promptChars, mixedHumanPart.length, '字符数只算用户部分')
assert.equal(mixedFold.words.get('分析'), 1)
assert.equal(mixedFold.words.get('写入'), 1)
assert.equal(mixedFold.words.get('耗时'), 1)
assert.equal(mixedFold.words.get('snapshot.json'), 1)
for (const injectedWord of ['browser', 'sampled', 'preparing', 'elapsed', 'dates', 'zone']) {
  assert.equal(mixedFold.words.get(injectedWord), undefined, '注入段剥离后不计：' + injectedWord)
}

// 行首的未闭合注入段（被截断）删到正文末尾
const trailingUnclosed = foldSessionEvents([
  humanPromptMessage(0, baseTime, '用户问题\n<system-reminder>Time sampled while preparing turn 3'),
])
assert.equal(trailingUnclosed.promptCount, 1)
assert.equal(trailingUnclosed.promptChars, '用户问题'.length, '未闭合注入段删到末尾')
assert.equal(trailingUnclosed.words.get('sampled'), undefined, '未闭合注入段不计词')

// 只有注入文本的消息（成对 / 未闭合）清洗后为空：不计条数、不出词
const onlyInjectedFold = foldSessionEvents([
  humanPromptMessage(0, baseTime, '<system-reminder>Time sampled while preparing turn 1, step 1.</system-reminder>'),
  humanPromptMessage(1, baseTime, '  <system>系统提示</system> '),
  humanPromptMessage(2, baseTime, '<local-command-stdout>done</local-command-stdout>'),
  humanPromptMessage(3, baseTime, '<system-reminder>Time sampled while preparing turn 2, step 1: 2026-10-23T10:36:14+08:00[Asia/Shanghai]'),
])
assert.equal(onlyInjectedFold.promptCount, 0, '清洗后为空的消息不计入提问条数')
assert.equal(onlyInjectedFold.promptChars, 0)
assert.equal(onlyInjectedFold.firstPrompt, null, '只有注入文本时没有标题兜底')
assert.equal(onlyInjectedFold.words.size, 0, '注入文本不产生词')

// 注入段在前、用户提问在后：剥掉注入后照常统计
const injectionFirst = foldSessionEvents([
  humanPromptMessage(0, baseTime, '<system-reminder>Time sampled while preparing turn 4</system-reminder>\n真正的提问在注入段之后'),
])
assert.equal(injectionFirst.promptCount, 1, '注入段在前的消息剥掉后仍统计用户部分')
assert.equal(injectionFirst.firstPrompt, '真正的提问在注入段之后')

// 正文里引用标签的正常提问不被清洗误杀（行内未闭合标签不删后半句）
const inlineReference = '为什么 <system-reminder> 会出现在标题里？'
const inlineReferenceFold = foldSessionEvents([humanPromptMessage(0, baseTime, inlineReference)])
assert.equal(inlineReferenceFold.promptCount, 1, '行内引用标签的提问照常统计')
assert.equal(inlineReferenceFold.firstPrompt, inlineReference)

// 非文本块（tool_result / tool_use / 图片）里的 text 不参与统计
const nonTextBlockFold = foldSessionEvents([{
  seq: 0, time: baseTime, type: 'user/message',
  data: {
    source: { kind: 'user' },
    content: [
      { type: 'tool_result', text: 'hiddenmarker' },
      { type: 'tool_use', text: 'othermarker' },
      { type: 'image' },
      { type: 'text', text: '真正的提问 deployment' },
    ],
  },
}])
assert.equal(nonTextBlockFold.firstPrompt, '真正的提问 deployment', '只取 type=text 的块')
assert.equal(nonTextBlockFold.words.get('hiddenmarker'), undefined, 'tool_result 文本不统计')
assert.equal(nonTextBlockFold.words.get('othermarker'), undefined, 'tool_use 文本不统计')
assert.equal(nonTextBlockFold.words.get('deployment'), 1)

// 英文停用词：虚词与注入模板词不出现，技术实词保留
const stopWordFold = foldSessionEvents([humanPromptMessage(0, baseTime, 'the token cache model cost deployment step message browser request time')])
for (const stopWord of ['the', 'step', 'message', 'browser', 'request', 'time']) {
  assert.equal(stopWordFold.words.get(stopWord), undefined, '英文停用词不计：' + stopWord)
}
for (const realWord of ['token', 'cache', 'model', 'cost', 'deployment']) {
  assert.equal(stopWordFold.words.get(realWord), 1, '技术实词保留：' + realWord)
}

// 中文注入模板 2-gram：整词命中即丢，2-gram 算法不变
const injectedGramFold = foldSessionEvents([humanPromptMessage(0, baseTime, '时间 请求 消息 环境 区域 上海 采样 准备 缓存')])
for (const injectedGram of ['时间', '请求', '消息', '环境', '区域', '上海', '采样', '准备']) {
  assert.equal(injectedGramFold.words.get(injectedGram), undefined, '中文注入模板词不计：' + injectedGram)
}
assert.equal(injectedGramFold.words.get('缓存'), 1, '中文实词照常统计')

console.log('session-usage.test: 全部通过')

// ===== jieba 分词（独立于 2-gram 回退）：预热后中文长词整体成词 =====
{
  await preparePromptSegmenter()
  const folded = foldSessionEvents([{
    seq: 1,
    time: Date.now(),
    type: 'user/message',
    data: { content: [{ type: 'text', text: '数据库表结构设计和成本计算，画蛇添足' }], source: { kind: 'user' } },
  }])
  const words = new Set(folded.words.keys())
  assert.ok(words.has('数据库'), 'jieba 应把「数据库」识别为一个词（词表实际：' + [...words].join(' ') + '）')
  assert.ok(words.has('成本计算'), 'jieba 应把「成本计算」识别为一个词')
  assert.ok(!words.has('据库'), '不应再出现 2-gram 碎片「据库」')
}
