/**
 * 会话用量折叠：把宿主会话事件流折叠成「按天 / 按小时 / 按模型」的 token 桶，
 * 供「项目用量」「会话用量」两个 Tab 与「使用明细」的单日按小时视图使用。
 *
 * 口径对齐宿主 token 投影（参考 dsh-token-meter / dsh-usage-stats，MIT）：
 * - 用量样本搭载在 `assistant/chunk`（`data.chunk.type === "usage"`）或
 *   `assistant/message`（`data.usage`）；v2 结算还会把样本放进 `data.stream`；
 * - 同一 (turn, step) 重复上报按「后到覆盖先到」处理，不重复计费；
 * - 模型归属取 `data.message.source`，缺失时回落最近一次 `request/header` 的 config；
 * - 判定不出模型的样本落到 `unknown/unknown`；
 * - 提问词频只统计人类提问：`user/message` 的 `data.source.kind === "user"` 才是用户输入，
 *   宿主注入的上下文（time-context / runtime-context / agent-instructions…）同样是 `user/message`；
 *   正文再剥离 `<system-reminder>` 等注入段，并过滤中英虚词与注入模板词。
 *
 * 与参考实现的差异：不做跨批次增量状态，每次按整段事件重折（按 revision 缓存）。
 */

export interface TokenBuckets {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

export interface SessionEvent {
  seq: number
  time: number
  type: string
  data?: {
    turn?: number
    step?: number
    chunk?: { type?: string; usage?: Partial<TokenBuckets> }
    usage?: Partial<TokenBuckets>
    stream?: Array<{ type?: string; chunk?: { type?: string; usage?: Partial<TokenBuckets> } }>
    /** `user/message` 的消息正文（块数组，形状见 promptRawTextOf）。 */
    content?: unknown
    /** `user/message` 的来源标签：`kind === "user"` 才是人类输入，其余都是宿主 / 插件注入。 */
    source?: { kind?: unknown }
    message?: { content?: unknown; source?: { provider?: string; model?: string; kind?: unknown } }
    header?: { config?: { provider?: string; model?: string } }
  }
}

interface UsageSample {
  key: string
  day: string
  hour: number
  model: string
  buckets: TokenBuckets
}

export interface SessionFold {
  /** 样本键（turn:step，缺失时回落 seq）→ 最后一次上报的用量。 */
  samples: Map<string, UsageSample>
  firstTime: number | null
  lastTime: number | null
  /** 首条**真实**人类提问（压平空白、超长截断），没有则 null；列表标题与搜索都取它。 */
  firstPrompt: string | null
  /** 参与词频统计的提问条数（`user/message`、`source.kind === "user"`、剥离注入段后正文非空）。 */
  promptCount: number
  /** 参与统计的提问字符数（每条剥离注入段、压平空白后截到 `PROMPT_STATS_CHARS` 再相加）。 */
  promptChars: number
  /** 词频表：中文 2-gram + 英文标识符，一次出现计 1，中英等权；中英虚词与注入模板词已过滤。 */
  words: Map<string, number>
  /** 参与统计的提问最早时间（毫秒）；没有统计到提问时为 null。 */
  promptFirstTime: number | null
  /** 参与统计的提问最晚时间（毫秒）；没有统计到提问时为 null。 */
  promptLastTime: number | null
}

export interface ModelUsageRow {
  /** `provider/model` 原始归属键（provider 可能是路由名，展示前用 attributeModelKey 归一）。 */
  key: string
  calls: number
  tokens: number
  buckets: TokenBuckets
}

export interface HourBucket {
  calls: number
  buckets: TokenBuckets
}

export interface SessionDaySummary {
  date: string
  calls: number
  tokens: number
  buckets: TokenBuckets
  /** 24 个本地小时槽。 */
  hours: HourBucket[]
  models: ModelUsageRow[]
}

export interface SessionSummary {
  calls: number
  tokens: number
  buckets: TokenBuckets
  cacheHitRate: number | null
  firstTime: number | null
  lastTime: number | null
  /** 首条真实提问（标题兜底 + 搜索），没有则 null。 */
  firstPrompt: string | null
  /** 用量最大的模型归属键（列表里的通道列据此归一）。 */
  primaryModelKey: string | null
  days: SessionDaySummary[]
  models: ModelUsageRow[]
}

/**
 * 首条提问保留的最大字数：详情要展示「全文」，但不能让一次超长粘贴把折叠结果与响应撑爆。
 */
export const MAX_PROMPT_CHARS = 4000

/** 列表里的提问片段长度（标题兜底与搜索都用它）；正文全文只在 `/session` 详情里给。 */
export const PROMPT_SNIPPET_CHARS = 200

/** 列表标题的截断长度。 */
export const PROMPT_TITLE_CHARS = 60

/** 每条提问参与词频统计的最大字符数：超长粘贴只取前 300 字，统计不被一段长文带偏。 */
export const PROMPT_STATS_CHARS = 300

/**
 * 单会话词表上限：到顶后只累加已有词、不再收新词（高频词早已入表，不受影响）。
 * 上限只兜「数十万条消息 / 随机文本」这类病态会话的内存，不参与正常数据口径。
 */
export const MAX_SESSION_WORDS = 8192

/** 词云默认下发的词数（客户端只渲染 top 词）。 */
export const PROMPT_WORDS_LIMIT = 60

/**
 * 宿主注入的非人类文本：teammate 的系统提示、斜杠命令回显、本地命令输出都不是用户提问。
 * 取标题时必须跳过它们继续往下找，否则列表一屏全是 `You are teammate "…"` 这种无辨识度的标题。
 */
const INJECTED_TEXT_PREFIXES = ['<system-reminder', '<system', '<command-', '<local-command']

/** 真实人类输入的来源 kind；宿主注入的上下文消息（time-context / runtime-context / agent-instructions…）用别的 kind。 */
const HUMAN_PROMPT_SOURCE_KIND = 'user'

/** 注入段标签名：成对段落整段删除，未闭合的开头删到正文末尾（注入被截断时）。 */
const INJECTED_TAG_NAME_PATTERN = '(?:system-reminder|local-command[a-z0-9-]*|command-[a-z0-9-]*|system)'

/** 成对标签包裹的注入段：大小写不敏感、可跨行、非贪婪。 */
const PAIRED_INJECTED_SECTION_PATTERN = new RegExp(
  `<(${INJECTED_TAG_NAME_PATTERN})\\b[^>]*>[\\s\\S]*?<\\/\\1\\s*>`,
  'gi',
)

/**
 * 未闭合的注入段只在其位于段落开头（全文开头或行首）时删到末尾：
 * 宿主注入段总是独立成段，而正文里引用 `<system-reminder>` 的正常提问不能被误删后半句。
 */
const UNCLOSED_INJECTED_SECTION_PATTERN = new RegExp(
  `(^|[\\r\\n])\\s*<(${INJECTED_TAG_NAME_PATTERN})\\b[^>]*>[\\s\\S]*$`,
  'i',
)

export function isInjectedPromptText(text: string): boolean {
  return INJECTED_TEXT_PREFIXES.some((prefix) => text.startsWith(prefix))
}

/** 剥离正文里的注入段（成对段落 + 段落开头的未闭合段），返回仍保留换行的原文。 */
function stripInjectedPromptText(text: string): string {
  return text.replace(PAIRED_INJECTED_SECTION_PATTERN, ' ').replace(UNCLOSED_INJECTED_SECTION_PATTERN, '$1')
}

/** 消息来源是否人类输入：没有 source 的旧数据按人类处理，再由文本清洗兜底。 */
function isHumanPromptMessage(data: SessionEvent['data']): boolean {
  const source = data?.source ?? data?.message?.source
  if (typeof source !== 'object' || source === null) return true
  const kind = (source as { kind?: unknown }).kind
  if (typeof kind !== 'string' || kind === '') return true
  return kind === HUMAN_PROMPT_SOURCE_KIND
}

/**
 * 中文虚词表：2-gram 的首字或尾字落在表里就丢弃，也不收整词落在表里的 gram。
 * 依据：这些字没有独立语义或只作语法连接，不过滤会拼出「你是」「不要」这类跨词碎片，词云全是噪声；
 * 过滤只看边界，不做分词，不会漏掉「分析」「插件」这类实词组合。
 * 按码点做成标记表：逐 gram 判定时直接按 charCode 下标查，不分配单字字符串。
 */
const CHINESE_FUNCTION_CHAR_FLAGS = (() => {
  const flags = new Uint8Array(0x10000)
  for (const char of '的了是我你他这那有在和就不人都一个上也很到说要去可以们什么怎样吗呢吧啊把被让给对从但而叉再又还只没做用看下里中之与及') {
    flags[char.codePointAt(0) as number] = 1
  }
  return flags
})()

/** 英文 / 标识符：先小写，首字符必须是字母，总长 2~25，允许 `.` `_` `-` `/`。 */
const LATIN_WORD_PATTERN = /[a-z][a-z0-9_.\-/]{1,24}/g

/** 连续汉字串（基本区 U+4E00–U+9FFF）。 */
const HAN_RUN_PATTERN = /[\u4e00-\u9fff]+/g

/**
 * 英文停用词：虚词 + 宿主注入模板里的高频词（时间上下文 / 后台任务 / 审批提示）。
 * 只删这些，技术实词（token / cache / model / cost / deployment…）一律保留。
 */
const ENGLISH_STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'than', 'that', 'this', 'these', 'those',
  'for', 'from', 'with', 'without', 'into', 'onto', 'over', 'under', 'while', 'during',
  'before', 'after', 'since', 'by', 'as', 'at', 'in', 'on', 'of', 'to',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am', 'not', 'no', 'nor',
  'you', 'your', 'yours', 'we', 'our', 'ours', 'they', 'their', 'theirs', 'them', 'there', 'it', 'its',
  'he', 'she', 'him', 'her', 'his', 'hers', 'i', 'me', 'my', 'mine',
  'do', 'does', 'did', 'done', 'have', 'has', 'had', 'having',
  'can', 'could', 'should', 'would', 'will', 'shall', 'may', 'might', 'must',
  'step', 'message', 'browser', 'zone', 'dates', 'elapsed', 'sampled', 'preparing', 'request', 'turn',
  'result', 'output', 'input', 'system', 'human', 'user', 'assistant', 'date', 'time',
])

/** 中文注入模板词：注入段的中文碎片，整词命中即丢；实词组合仍保留。 */
const CHINESE_INJECTED_GRAMS = new Set(['时间', '请求', '消息', '环境', '区域', '上海', '采样', '准备'])

/** 含汉字判定（jieba 会把标点与英文也切出来，这里只要中文词）。 */
const HAN_ANY_PATTERN = /[\u4e00-\u9fff]/

interface PromptSegmenter {
  cut: (text: string, hmm?: boolean | null) => string[]
}
let segmenter: PromptSegmenter | null = null
let segmenterLoading: Promise<void> | null = null

/**
 * 准备中文分词器（jieba-wasm，MIT）。
 * **懒加载**：wasm 3.9 MB、首次 cut 约 270 ms，绝不能放在宿主启动路径上；构建词云前调用一次即可。
 * 加载失败静默回退到 2-gram，不影响快照与其它端点。
 */
export async function preparePromptSegmenter(): Promise<void> {
  if (segmenter !== null) return
  segmenterLoading ??= (async () => {
    try {
      // nodejs 入口在 import 时已自带 wasm（无需手动 initSync / 读文件）
      const wasm = await import('jieba-wasm') as unknown as { cut?: PromptSegmenter['cut']; default?: { cut?: PromptSegmenter['cut'] } }
      const cut = wasm.cut ?? wasm.default?.cut
      if (typeof cut === 'function') segmenter = { cut }
    } catch {
      segmenter = null
    }
  })()
  await segmenterLoading
}

/** 累加词频：到上限后只累加已有词、不再收新词。 */
function addWordCount(words: Map<string, number>, word: string, count: number, cap: number): void {
  const current = words.get(word)
  if (current !== undefined) {
    words.set(word, current + count)
    return
  }
  if (words.size >= cap) return
  words.set(word, count)
}

/**
 * 把一段提问正文拆成英文标识符与中文词并逐词计数（中英同一权重）。
 * 中文优先走 jieba 分词；分词器没就绪时回退到滑动 2-gram（宁可碎片也不丢词）。
 */
function addPromptWords(words: Map<string, number>, text: string): void {
  for (const word of text.toLowerCase().match(LATIN_WORD_PATTERN) ?? []) {
    if (ENGLISH_STOP_WORDS.has(word)) continue
    addWordCount(words, word, 1, MAX_SESSION_WORDS)
  }
  const cut = segmenter?.cut ?? null
  if (cut !== null) {
    for (const word of cut(text, true)) {
      // jieba 会把标点、英文、单字也切出来：只收 2 字以上的中文词
      if (word.length < 2 || !HAN_ANY_PATTERN.test(word)) continue
      // 词首 / 词尾是虚词（这个、什么、我们的…）就丢掉，与 2-gram 的边界判定同一套表
      if (CHINESE_FUNCTION_CHAR_FLAGS[word.charCodeAt(0)] === 1 || CHINESE_FUNCTION_CHAR_FLAGS[word.charCodeAt(word.length - 1)] === 1) continue
      if (CHINESE_INJECTED_GRAMS.has(word)) continue
      addWordCount(words, word, 1, MAX_SESSION_WORDS)
    }
    return
  }
  for (const run of text.match(HAN_RUN_PATTERN) ?? []) {
    for (let index = 0; index + 1 < run.length; index += 1) {
      // 两个字都是虚词时必然被边界判定丢掉，所以不需要单独判「整词在表里」
      if (CHINESE_FUNCTION_CHAR_FLAGS[run.charCodeAt(index)] === 1 || CHINESE_FUNCTION_CHAR_FLAGS[run.charCodeAt(index + 1)] === 1) continue
      const gram = run.slice(index, index + 2)
      if (CHINESE_INJECTED_GRAMS.has(gram)) continue
      addWordCount(words, gram, 1, MAX_SESSION_WORDS)
    }
  }
}

export function zeroBuckets(): TokenBuckets {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }
}

export function totalTokens(buckets: TokenBuckets): number {
  return buckets.inputTokens + buckets.outputTokens + buckets.cacheReadTokens + buckets.cacheWriteTokens
}

export function addBuckets(target: TokenBuckets, source: TokenBuckets): TokenBuckets {
  target.inputTokens += source.inputTokens
  target.outputTokens += source.outputTokens
  target.cacheReadTokens += source.cacheReadTokens
  target.cacheWriteTokens += source.cacheWriteTokens
  return target
}

/** 本地日历 `YYYY-MM-DD`。 */
export function dayKeyOf(timeMs: number): string {
  const date = new Date(timeMs)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** 本地小时（0–23）。 */
export function hourOfTime(timeMs: number): number {
  return new Date(timeMs).getHours()
}

function bucketsOf(usage: Partial<TokenBuckets> | undefined): TokenBuckets {
  return {
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    cacheReadTokens: usage?.cacheReadTokens ?? 0,
    cacheWriteTokens: usage?.cacheWriteTokens ?? 0,
  }
}

function modelOfEvent(event: SessionEvent): string | null {
  const source = event.data?.message?.source
  if (source !== undefined && typeof source.model === 'string' && source.model !== '') {
    const provider = typeof source.provider === 'string' && source.provider !== '' ? source.provider : 'unknown'
    return `${provider}/${source.model}`
  }
  const config = event.data?.header?.config
  if (config !== undefined && typeof config.model === 'string' && config.model !== '') {
    const provider = typeof config.provider === 'string' && config.provider !== '' ? config.provider : 'unknown'
    return `${provider}/${config.model}`
  }
  return null
}

/** 一次上报的用量载荷：区分「不是样本」（null）与「是样本但没有分桶」（usage 为 undefined）。 */
interface UsagePayload {
  usage: Partial<TokenBuckets> | undefined
}

/**
 * 取事件携带的用量样本；与「哪些事件算样本」的口径一一对应（见 docs/01 §3.10）。
 * 注意 `assistant/attempt` 不认 `data.usage`，只认 `data.stream` 里的样本，与旧实现一致。
 */
function usagePayloadOf(event: SessionEvent): UsagePayload | null {
  const type = event.type
  const data = event.data
  if (type === 'assistant/chunk') {
    const chunk = data?.chunk
    return chunk?.type === 'usage' && chunk.usage !== undefined ? { usage: chunk.usage } : null
  }
  if (type !== 'assistant/message' && type !== 'assistant/attempt') return null
  if (type === 'assistant/message' && data?.usage !== undefined) return { usage: data.usage }
  const stream = data?.stream
  if (!Array.isArray(stream)) return null
  for (let index = stream.length - 1; index >= 0; index -= 1) {
    const record = stream[index]
    if (record?.type === 'chunk' && record.chunk?.type === 'usage' && record.chunk.usage !== undefined) {
      return { usage: record.chunk.usage }
    }
  }
  return null
}

/** 折叠一段事件（整段重折，重复上报覆盖旧值）。 */
export function foldSessionEvents(events: SessionEvent[]): SessionFold {
  const samples = new Map<string, UsageSample>()
  // `llm/retry-started` 终结当前 (turn, step) 的覆盖槽：重试是新的上报，与原尝试累加而不是覆盖
  const attemptCounts = new Map<string, number>()
  let currentModel: string | null = null
  let firstTime: number | null = null
  let lastTime: number | null = null
  // 会话标题在宿主侧只对有投影的会话可见，其余用「首条用户提问」兜底
  let firstPrompt: string | null = null
  const words = new Map<string, number>()
  let promptCount = 0
  let promptChars = 0
  let promptFirstTime: number | null = null
  let promptLastTime: number | null = null
  for (const event of events) {
    const time = typeof event.time === 'number' ? event.time : null
    if (time !== null) {
      if (firstTime === null || time < firstTime) firstTime = time
      if (lastTime === null || time > lastTime) lastTime = time
    }
    // 先按类型分流：整段日志里绝大多数事件与用量无关，不必为它们拼 (turn, step) 键
    const type = event.type
    if (type === 'assistant/chunk' || type === 'assistant/message' || type === 'assistant/attempt') {
      const payload = usagePayloadOf(event)
      if (payload === null || time === null) continue
      const turn = event.data?.turn
      const step = event.data?.step
      const baseKey = Number.isInteger(turn) && Number.isInteger(step) ? `${turn}:${step}` : `seq:${event.seq}`
      const attempt = attemptCounts.get(baseKey) ?? 0
      const sampleKey = `${baseKey}#${attempt}`
      const model = modelOfEvent(event) ?? currentModel ?? 'unknown/unknown'
      samples.set(sampleKey, {
        key: sampleKey,
        day: dayKeyOf(time),
        hour: hourOfTime(time),
        model,
        buckets: bucketsOf(payload.usage),
      })
      continue
    }
    if (type === 'request/header') {
      const model = modelOfEvent(event)
      if (model !== null) currentModel = model
      continue
    }
    if (type === 'llm/retry-started') {
      const turn = event.data?.turn
      const step = event.data?.step
      if (Number.isInteger(turn) && Number.isInteger(step)) {
        const baseKey = `${turn}:${step}`
        attemptCounts.set(baseKey, (attemptCounts.get(baseKey) ?? 0) + 1)
      }
      continue
    }
    if (type === 'user/message') {
      const raw = promptRawTextOf(event)
      if (raw !== null) {
        // 同一条消息里拼进来的注入段先剥离再统计；清洗后为空则整条不计入
        const cleaned = flattenPromptText(stripInjectedPromptText(raw))
        // 宿主注入的上下文消息（time-context / runtime-context / agent-instructions…）也是 user/message，
        // 靠 source.kind 排除；没有 source 的旧数据按人类处理，再由文本清洗兜底。
        if (cleaned !== '' && isHumanPromptMessage(event.data) && !isInjectedPromptText(cleaned)) {
          if (firstPrompt === null) {
            firstPrompt = cleaned.length > MAX_PROMPT_CHARS ? cleaned.slice(0, MAX_PROMPT_CHARS) + '…' : cleaned
          }
          const counted = cleaned.length > PROMPT_STATS_CHARS ? cleaned.slice(0, PROMPT_STATS_CHARS) : cleaned
          promptCount += 1
          promptChars += counted.length
          addPromptWords(words, counted)
          if (time !== null) {
            if (promptFirstTime === null || time < promptFirstTime) promptFirstTime = time
            if (promptLastTime === null || time > promptLastTime) promptLastTime = time
          }
        }
      }
      continue
    }
  }
  return { samples, firstTime, lastTime, firstPrompt, promptCount, promptChars, words, promptFirstTime, promptLastTime }
}

/** 标题 / 搜索片段：压平空白并按需截断（详情要全文，列表只要一小段）。 */
export function promptSnippetOf(text: string | null | undefined, maxChars: number = PROMPT_SNIPPET_CHARS): string | null {
  // 缺字段的历史记录与外部注入的折叠结果都可能没有 firstPrompt，这里一并兜住
  if (typeof text !== 'string' || text === '') return null
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat === '') return null
  return flat.length > maxChars ? flat.slice(0, maxChars) + '…' : flat
}

/** 压平空白（标题与词频统计都先压平，再各自截断）。 */
function flattenPromptText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * 用户消息里的文本块（块间保留换行，供注入段清洗判断段落开头）。
 * 只收 `type === "text"` 的块：`tool_result` / `tool_use` / 图片块里的 text 字段不是人类提问。
 */
function promptRawTextOf(event: SessionEvent): string | null {
  const data = event.data
  if (typeof data !== 'object' || data === null) return null
  // `user/message` 的正文在 `data.content`（宿主 dsh-context 就是这么读的），
  // `assistant/message` 才用 `data.message.content` —— 两种都认，避免形状差异导致标题全空。
  const direct = data.content
  const nested = data.message?.content
  const content = Array.isArray(direct) ? direct : Array.isArray(nested) ? nested : null
  if (content === null) return null
  const texts: string[] = []
  for (const block of content) {
    // 文本块既可能是对象，也可能是裸字符串
    if (typeof block === 'string') {
      if (block !== '') texts.push(block)
      continue
    }
    if (typeof block !== 'object' || block === null) continue
    const typed = block as { type?: unknown; text?: unknown }
    if (typeof typed.type === 'string' && typed.type !== 'text') continue
    if (typeof typed.text !== 'string' || typed.text === '') continue
    texts.push(typed.text)
  }
  return texts.length === 0 ? null : texts.join('\n')
}

/**
 * 缓存命中率（百分数，一位小数）：`cacheRead / (input + output + cacheRead)`。
 * 与台账表的既有口径保持一致（截图里 3.82B/3.96B = 96.2%），不含 cacheWrite。
 */
export function cacheHitRateOf(buckets: TokenBuckets): number | null {
  const displayTokens = buckets.inputTokens + buckets.outputTokens + buckets.cacheReadTokens
  if (displayTokens <= 0) return null
  return Math.round(buckets.cacheReadTokens / displayTokens * 1000) / 10
}

function emptyHours(): HourBucket[] {
  return Array.from({ length: 24 }, () => ({ calls: 0, buckets: zeroBuckets() }))
}

/** 把折叠结果汇总成可直接下发的会话用量（按天升序、天内按模型降序）。 */
export function summarizeSession(fold: SessionFold): SessionSummary {
  interface DayBucket { calls: number; buckets: TokenBuckets; hours: HourBucket[]; models: Map<string, ModelUsageRow> }
  const byDay = new Map<string, DayBucket>()
  const byModel = new Map<string, ModelUsageRow>()
  const totals = zeroBuckets()
  let calls = 0
  for (const sample of fold.samples.values()) {
    let dayBucket = byDay.get(sample.day)
    if (dayBucket === undefined) {
      dayBucket = { calls: 0, buckets: zeroBuckets(), hours: emptyHours(), models: new Map() }
      byDay.set(sample.day, dayBucket)
    }
    dayBucket.calls += 1
    addBuckets(dayBucket.buckets, sample.buckets)
    dayBucket.hours[sample.hour].calls += 1
    addBuckets(dayBucket.hours[sample.hour].buckets, sample.buckets)
    let dayModel = dayBucket.models.get(sample.model)
    if (dayModel === undefined) {
      dayModel = { key: sample.model, calls: 0, tokens: 0, buckets: zeroBuckets() }
      dayBucket.models.set(sample.model, dayModel)
    }
    dayModel.calls += 1
    addBuckets(dayModel.buckets, sample.buckets)
    dayModel.tokens = totalTokens(dayModel.buckets)
    let modelRow = byModel.get(sample.model)
    if (modelRow === undefined) {
      modelRow = { key: sample.model, calls: 0, tokens: 0, buckets: zeroBuckets() }
      byModel.set(sample.model, modelRow)
    }
    modelRow.calls += 1
    addBuckets(modelRow.buckets, sample.buckets)
    modelRow.tokens = totalTokens(modelRow.buckets)
    calls += 1
    addBuckets(totals, sample.buckets)
  }
  const days: SessionDaySummary[] = [...byDay.entries()]
    .map(([date, bucket]) => ({
      date,
      calls: bucket.calls,
      tokens: totalTokens(bucket.buckets),
      buckets: bucket.buckets,
      hours: bucket.hours,
      models: [...bucket.models.values()].sort((first, second) => second.tokens - first.tokens),
    }))
    .sort((first, second) => (first.date < second.date ? -1 : first.date > second.date ? 1 : 0))
  const models = [...byModel.values()].sort((first, second) => second.tokens - first.tokens)
  return {
    calls,
    tokens: totalTokens(totals),
    buckets: totals,
    cacheHitRate: cacheHitRateOf(totals),
    firstTime: fold.firstTime,
    lastTime: fold.lastTime,
    firstPrompt: fold.firstPrompt,
    primaryModelKey: models.length > 0 ? models[0].key : null,
    days,
    models,
  }
}

/**
 * 合并后的词表上限：只作跨大量会话的内存兜底 —— 到顶后仍只累加已有词，
 * 高频词早已入表，不影响 top 词统计。
 */
const MAX_MERGED_WORDS = 200000

/** 参与词频统计的会话字段（会话数据源透传；外部注入的旧数据源可能没有，缺字段按 0 / 空表处理）。 */
export interface PromptStatsRecord {
  promptCount?: number
  promptChars?: number
  words?: Map<string, number>
  promptFirstTime?: number | null
  promptLastTime?: number | null
}

/** 下发给客户端的提问词云（快照 `sections.prompts`）：只有词与次数，**不含提问原文**。 */
export interface PromptWordsStat {
  words: Array<{ word: string; count: number }>
  totalPrompts: number
  totalChars: number
  /** 参与统计的提问最早日期（本地 `YYYY-MM-DD`）；没有统计到提问时为 null = 不限。 */
  from: string | null
  /** 参与统计的提问最晚日期（本地 `YYYY-MM-DD`）；没有统计到提问时为 null = 不限。 */
  to: string | null
}

/** 词云排序：次数降序，同频按词升序（固定排序键，同一份数据每次下发顺序一致）。 */
function wordRanksBefore(first: { word: string; count: number }, second: { word: string; count: number }): boolean {
  if (first.count !== second.count) return first.count > second.count
  return first.word < second.word
}

/** 取 top N：维护「最差在堆顶」的小顶堆，避免对上万词整体排序（8 万词整体排序本机实测约 80 ms）。 */
function topWordEntries(totals: Map<string, number>, limit: number): Array<{ word: string; count: number }> {
  const worse = (first: { word: string; count: number }, second: { word: string; count: number }): boolean =>
    wordRanksBefore(second, first)
  const siftUp = (heap: Array<{ word: string; count: number }>, start: number): void => {
    let index = start
    while (index > 0) {
      const parent = (index - 1) >> 1
      if (!worse(heap[index], heap[parent])) return
      const swap = heap[parent]
      heap[parent] = heap[index]
      heap[index] = swap
      index = parent
    }
  }
  const siftDown = (heap: Array<{ word: string; count: number }>, start: number): void => {
    let index = start
    for (;;) {
      const left = index * 2 + 1
      if (left >= heap.length) return
      const right = left + 1
      const worseChild = right < heap.length && worse(heap[right], heap[left]) ? right : left
      if (!worse(heap[worseChild], heap[index])) return
      const swap = heap[index]
      heap[index] = heap[worseChild]
      heap[worseChild] = swap
      index = worseChild
    }
  }
  const heap: Array<{ word: string; count: number }> = []
  for (const [word, count] of totals) {
    const candidate = { word, count }
    if (heap.length < limit) {
      heap.push(candidate)
      siftUp(heap, heap.length - 1)
      continue
    }
    if (!wordRanksBefore(candidate, heap[0])) continue
    heap[0] = candidate
    siftDown(heap, 0)
  }
  return heap.sort((first, second) => (wordRanksBefore(first, second) ? -1 : 1))
}

/**
 * 跨会话合并提问词频：词频相加、条数与字符数相加、时间取并集，最后按「次数降序、同频按词升序」
 * 取前 `limit` 个。
 */
export function mergePromptStats(
  records: Iterable<PromptStatsRecord>,
  limit: number = PROMPT_WORDS_LIMIT,
): PromptWordsStat {
  const totals = new Map<string, number>()
  let totalPrompts = 0
  let totalChars = 0
  let firstTime: number | null = null
  let lastTime: number | null = null
  for (const record of records) {
    if (typeof record.promptCount === 'number' && record.promptCount > 0) totalPrompts += record.promptCount
    if (typeof record.promptChars === 'number' && record.promptChars > 0) totalChars += record.promptChars
    const recordFirst = record.promptFirstTime
    if (typeof recordFirst === 'number' && (firstTime === null || recordFirst < firstTime)) firstTime = recordFirst
    const recordLast = record.promptLastTime
    if (typeof recordLast === 'number' && (lastTime === null || recordLast > lastTime)) lastTime = recordLast
    if (!(record.words instanceof Map)) continue
    for (const [word, count] of record.words) {
      if (word === '' || !Number.isFinite(count) || count <= 0) continue
      addWordCount(totals, word, count, MAX_MERGED_WORDS)
    }
  }
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 1000) : PROMPT_WORDS_LIMIT
  return {
    words: topWordEntries(totals, safeLimit),
    totalPrompts,
    totalChars,
    from: firstTime === null ? null : dayKeyOf(firstTime),
    to: lastTime === null ? null : dayKeyOf(lastTime),
  }
}

/**
 * 把事件里出现的 provider 归一到宿主配置里的通道 id。
 * 事件里的 provider 可能是 pi-ai 路由（如 `pi-ai/opencode-go`）或适配器 id，
 * 只要末段与已知通道同名就归到该通道，否则原样保留。
 */
export function normalizeProvider(provider: string, knownProviders: string[]): string {
  if (knownProviders.includes(provider)) return provider
  const separator = provider.lastIndexOf('/')
  const tail = separator >= 0 ? provider.slice(separator + 1) : provider
  const matched = knownProviders.find((candidate) => candidate === tail || candidate === provider)
  return matched ?? provider
}

/**
 * 拆分 `provider/model` 归属键：优先按已知通道名在段边界上从右往左匹配，
 * 匹配不到再退回第一个 `/`。事件里的 provider 可能是 `pi-ai/opencode-go` 这类路由。
 */
export function attributeModelKey(key: string, knownProviders: string[]): { provider: string; model: string } {
  let bestIndex = -1
  let bestProvider = ''
  for (const provider of knownProviders) {
    let searchFrom = 0
    for (;;) {
      const index = key.indexOf(provider + '/', searchFrom)
      if (index === -1) break
      if (index > bestIndex) { bestIndex = index; bestProvider = provider }
      searchFrom = index + 1
    }
  }
  if (bestIndex >= 0 && bestProvider !== '') {
    return { provider: bestProvider, model: key.slice(bestIndex + bestProvider.length + 1) }
  }
  const separator = key.indexOf('/')
  if (separator > 0) return { provider: key.slice(0, separator), model: key.slice(separator + 1) }
  return { provider: key, model: key }
}
