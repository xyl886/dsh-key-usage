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
 * - 工具调用是独立事件 `tool/call`（v4 事件流里没有 `tool_use` 内容块），顺带统计工具名、技能名与
 *   MCP server，供快照 `tools` 段使用；统计口径见 docs/架构与数据契约.md §3.10b。
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
    /** `tool/call` 的工具名（v4 事件流里工具调用是独立事件，没有 `tool_use` 内容块）。 */
    name?: unknown
    /** `tool/call` 的入参：宿主导出的是 JSON 字符串，兼容已解析成对象的旧样本。 */
    arguments?: unknown
    /** `tool/call` 的调用 id（同一会话内唯一，不重复出现）。 */
    callId?: unknown
  }
}

interface UsageSample {
  key: string
  day: string
  hour: number
  model: string
  buckets: TokenBuckets
}

/** 单日提问统计：词云环比要按「同长度前一窗口」切分，只有按天分桶才不跨窗口重复计。 */
export interface PromptDayStat {
  count: number
  chars: number
  words: Map<string, number>
}

/**
 * 一天里的工具 / 技能 / MCP 调用明细：`/tools` 按窗口切片时只能读天级数据，
 * 拿会话全量次数按比例摊是猜，不是统计。
 * 技能 / MCP 绝大多数天为空，按需建表（空 Map 也要占对象头，全库累计到 MB 级）。
 */
export interface ToolDayStat {
  calls: number
  tools: Map<string, number>
  skills: Map<string, number> | null
  mcp: Map<string, number> | null
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
  /** 本地日期（`YYYY-MM-DD`）→ 当天提问条数 / 字数 / 词频；没有统计到提问时为空表。 */
  promptDayStats: Map<string, PromptDayStat>
  /** 工具调用次数（`tool/call` 事件数；一次调用一条事件）。 */
  toolCalls: number
  /** 工具名 → 调用次数；该会话没有工具调用时为 null。 */
  toolNameCounts: Map<string, number> | null
  /** 技能名 → 调用次数（`skill` 工具的 `arguments.name`）；没有技能调用时为 null。 */
  skillNameCounts: Map<string, number> | null
  /** MCP server → 调用次数；没有 MCP 调用时为 null。 */
  mcpServerCounts: Map<string, number> | null
  /** 本地日期（`YYYY-MM-DD`）→ 工具调用次数（迷你柱的近 7 天趋势）；没有工具调用时为 null。 */
  toolDayCalls: Map<string, number> | null
  /** 本地日期 → 当天的工具 / 技能 / MCP 明细（窗口切片用）；没有工具调用时为 null。 */
  toolDayStats: Map<string, ToolDayStat> | null
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
function addPromptWords(
  words: Map<string, number>,
  text: string,
  dayBucket?: { words: Map<string, number>; budget: { remaining: number } },
): void {
  // 同一个词一次出现只切一次；当天桶与总表同步累加，避免重复分词
  const add = (word: string): void => {
    addWordCount(words, word, 1, MAX_SESSION_WORDS)
    if (dayBucket === undefined) return
    // 当天桶的总词条数另有预算：只兜病态会话的内存，到顶后只累加已有词
    if (dayBucket.budget.remaining <= 0) return
    if (!dayBucket.words.has(word)) dayBucket.budget.remaining -= 1
    addWordCount(dayBucket.words, word, 1, MAX_SESSION_WORDS)
  }
  for (const word of text.toLowerCase().match(LATIN_WORD_PATTERN) ?? []) {
    if (ENGLISH_STOP_WORDS.has(word)) continue
    add(word)
  }
  const cut = segmenter?.cut ?? null
  if (cut !== null) {
    for (const word of cut(text, true)) {
      // jieba 会把标点、英文、单字也切出来：只收 2 字以上的中文词
      if (word.length < 2 || !HAN_ANY_PATTERN.test(word)) continue
      // 词首 / 词尾是虚词（这个、什么、我们的…）就丢掉，与 2-gram 的边界判定同一套表
      if (CHINESE_FUNCTION_CHAR_FLAGS[word.charCodeAt(0)] === 1 || CHINESE_FUNCTION_CHAR_FLAGS[word.charCodeAt(word.length - 1)] === 1) continue
      if (CHINESE_INJECTED_GRAMS.has(word)) continue
      add(word)
    }
    return
  }
  for (const run of text.match(HAN_RUN_PATTERN) ?? []) {
    for (let index = 0; index + 1 < run.length; index += 1) {
      // 两个字都是虚词时必然被边界判定丢掉，所以不需要单独判「整词在表里」
      if (CHINESE_FUNCTION_CHAR_FLAGS[run.charCodeAt(index)] === 1 || CHINESE_FUNCTION_CHAR_FLAGS[run.charCodeAt(index + 1)] === 1) continue
      const gram = run.slice(index, index + 2)
      if (CHINESE_INJECTED_GRAMS.has(gram)) continue
      add(gram)
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

/**
 * 工具统计口径（快照 `tools` 段）：工具调用是独立的 `tool/call` 事件（v4 事件流里没有 `tool_use` 内容块），
 * 一次调用一条事件、`callId` 在同一会话内不重复出现，所以按事件计数即可，不需要另做去重。
 * 技能名取自 `skill` 工具的 `arguments.name`；MCP server 取自 `mcp_call` 的 `arguments.server`，
 * 另外兼容直连工具名 `mcp__<server>__<tool>`（部分宿主把 MCP 工具直接暴露成工具）。
 */
const SKILL_TOOL_NAME = 'skill'
const MCP_CALL_TOOL_NAME = 'mcp_call'
/** 直连 MCP 工具名：`mcp__<server>__<tool>`，server 段不含双下划线。 */
const MCP_DIRECT_TOOL_PATTERN = /^mcp__([\s\S]+?)__([\s\S]+)$/
/** 拿不到工具名 / server 名时归到这一行：不丢计数，也不编具体名字。 */
const UNKNOWN_NAME = 'unknown'

/** 各榜单下发的行数（原型：工具 7 行、技能 6 行 + 其它、MCP 8 行）。 */
export const TOOLS_TOP_LIMIT = 7
export const SKILLS_TOP_LIMIT = 6
export const MCP_TOP_LIMIT = 8
/** 迷你柱覆盖的本地天数（含今天）。 */
export const TOOL_TREND_DAYS = 7

/** 计数加一（工具名 / 技能名 / server 名都按整串命中）。 */
function incrementCount(counts: Map<string, number>, key: string): void {
  counts.set(key, (counts.get(key) ?? 0) + 1)
}

/** `arguments` 是 JSON 字符串（宿主当前写法）；兼容已经解析成对象的样本，非法 JSON 返回 null。 */
function argumentsObjectOf(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    if (value.trim() === '') return null
    try {
      const parsed: unknown = JSON.parse(value)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
      return parsed as Record<string, unknown>
    } catch {
      return null
    }
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

/** `skill` 工具的技能名；解析不出返回 null（该次调用仍计入工具次数，只是不进技能榜）。 */
function skillNameOf(args: unknown): string | null {
  const name = argumentsObjectOf(args)?.name
  return typeof name === 'string' && name.trim() !== '' ? name.trim() : null
}

/** 一次工具调用归属的 MCP server；不是 MCP 调用返回 null。 */
function mcpServerOf(toolName: string, args: unknown): string | null {
  if (toolName === MCP_CALL_TOOL_NAME) {
    const server = argumentsObjectOf(args)?.server
    return typeof server === 'string' && server.trim() !== '' ? server.trim() : UNKNOWN_NAME
  }
  const matched = MCP_DIRECT_TOOL_PATTERN.exec(toolName)
  return matched === null ? null : matched[1]
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
  const promptDayStats = new Map<string, PromptDayStat>()
  /** 当天桶的词条总预算：与单会话词表同一上限，只兜病态会话的内存（到顶后只累加已有词）。 */
  const promptDayWordBudget = { remaining: MAX_SESSION_WORDS }
  /** 取（或建）某天的桶：词云环比按天切窗口，跨窗口的会话不会重复计。 */
  const promptDayOf = (time: number): PromptDayStat => {
    const day = dayKeyOf(time)
    let stat = promptDayStats.get(day)
    if (stat === undefined) {
      stat = { count: 0, chars: 0, words: new Map() }
      promptDayStats.set(day, stat)
    }
    return stat
  }
  let toolCalls = 0
  let toolNameCounts: Map<string, number> | null = null
  let skillNameCounts: Map<string, number> | null = null
  let mcpServerCounts: Map<string, number> | null = null
  let toolDayCalls: Map<string, number> | null = null
  let toolDayStats: Map<string, ToolDayStat> | null = null
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
          const dayStat = time === null ? null : promptDayOf(time)
          addPromptWords(words, counted, dayStat === null ? undefined : { words: dayStat.words, budget: promptDayWordBudget })
          if (time !== null && dayStat !== null) {
            if (promptFirstTime === null || time < promptFirstTime) promptFirstTime = time
            if (promptLastTime === null || time > promptLastTime) promptLastTime = time
            dayStat.count += 1
            dayStat.chars += counted.length
          }
        }
      }
      continue
    }
    if (type === 'tool/call') {
      const rawName = event.data?.name
      const toolName = typeof rawName === 'string' && rawName.trim() !== '' ? rawName.trim() : UNKNOWN_NAME
      toolCalls += 1
      toolNameCounts ??= new Map()
      incrementCount(toolNameCounts, toolName)
      const skillName = toolName === SKILL_TOOL_NAME ? skillNameOf(event.data?.arguments) : null
      if (skillName !== null) {
        skillNameCounts ??= new Map()
        incrementCount(skillNameCounts, skillName)
      }
      const mcpServer = mcpServerOf(toolName, event.data?.arguments)
      if (mcpServer !== null) {
        mcpServerCounts ??= new Map()
        incrementCount(mcpServerCounts, mcpServer)
      }
      if (time !== null) {
        const day = dayKeyOf(time)
        toolDayCalls ??= new Map()
        incrementCount(toolDayCalls, day)
        toolDayStats ??= new Map()
        let dayStat = toolDayStats.get(day)
        if (dayStat === undefined) {
          dayStat = { calls: 0, tools: new Map(), skills: null, mcp: null }
          toolDayStats.set(day, dayStat)
        }
        dayStat.calls += 1
        incrementCount(dayStat.tools, toolName)
        if (skillName !== null) {
          dayStat.skills ??= new Map()
          incrementCount(dayStat.skills, skillName)
        }
        if (mcpServer !== null) {
          dayStat.mcp ??= new Map()
          incrementCount(dayStat.mcp, mcpServer)
        }
      }
      continue
    }
  }
  return {
    samples, firstTime, lastTime, firstPrompt, promptCount, promptChars, words, promptFirstTime, promptLastTime, promptDayStats,
    toolCalls, toolNameCounts, skillNameCounts, mcpServerCounts, toolDayCalls, toolDayStats,
  }
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
  /** 按天切分的提问统计（环比用）；旧数据源 / 老缓存没有这个字段时按窗口无数据处理。 */
  promptDayStats?: Map<string, PromptDayStat> | null
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

/** 一个日期窗口内的提问统计（环比用）。 */
export interface PromptWindowStat {
  words: Array<{ word: string; count: number }>
  totalPrompts: number
  totalChars: number
  /** 窗口内有提问数据的天数：0 = 该窗口没有任何提问（环比按「没数据」处理，不能当 0）。 */
  days: number
}

/**
 * 某个日期区间（含首尾，本地 `YYYY-MM-DD`）内的提问统计：只读按天桶，
 * 同一会话跨两个窗口时按天各计各的，不重复、不近似。快照 `prompts` 段用它拼本期 / 上期。
 */
export function mergePromptStatsForWindow(
  records: Iterable<PromptStatsRecord>,
  fromDay: string,
  toDay: string,
  limit: number = PROMPT_WORDS_LIMIT,
): PromptWindowStat {
  const totals = new Map<string, number>()
  const dayKeys = new Set<string>()
  let totalPrompts = 0
  let totalChars = 0
  for (const record of records) {
    const dayStats = record.promptDayStats
    if (!(dayStats instanceof Map)) continue
    for (const [day, stat] of dayStats) {
      if (day < fromDay || day > toDay) continue
      dayKeys.add(day)
      if (Number.isFinite(stat.count) && stat.count > 0) totalPrompts += stat.count
      if (Number.isFinite(stat.chars) && stat.chars > 0) totalChars += stat.chars
      if (!(stat.words instanceof Map)) continue
      for (const [word, count] of stat.words) {
        if (word === '' || !Number.isFinite(count) || count <= 0) continue
        addWordCount(totals, word, count, MAX_MERGED_WORDS)
      }
    }
  }
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 1000) : PROMPT_WORDS_LIMIT
  return { words: topWordEntries(totals, safeLimit), totalPrompts, totalChars, days: dayKeys.size }
}

/** `/prompts` 的查询窗口与筛选维度（空数组 / 缺省 = 不筛）。 */
export interface PromptWindowQuery {
  /** 起始本地日期 `YYYY-MM-DD`（含）。 */
  from: string
  /** 结束本地日期 `YYYY-MM-DD`（含）。 */
  to: string
  /** 工作区多选；`''` 匹配「未归入工作区」。 */
  projects?: string[] | null
  /** 展示模型名多选。 */
  models?: string[] | null
  /** 通道（provider id）多选。 */
  providers?: string[] | null
}

/**
 * 按窗口 + 项目 + 模型 + 通道聚合提问统计（`GET /prompts`）。
 * `null` = 运行期索引还没建好（老版本 / 构建中）：调用方回落快照里的 `prompts` 段，不报错。
 * 索引存在但窗口 / 筛选没有命中时返回**全 0 对象**（界面显示空态，不拿全量数据冒充）。
 */
export function mergePromptStatsInWindow(
  index: PromptSessionIndex | null,
  query: PromptWindowQuery,
  limit: number = PROMPT_WORDS_LIMIT,
): PromptWindowStat | null {
  if (index === null) return null
  const projects = query.projects !== undefined && query.projects !== null && query.projects.length > 0 ? new Set(query.projects) : null
  const models = query.models !== undefined && query.models !== null && query.models.length > 0 ? new Set(query.models) : null
  const providers = query.providers !== undefined && query.providers !== null && query.providers.length > 0 ? new Set(query.providers) : null
  const totals = new Map<string, number>()
  const dayKeys = new Set<string>()
  let totalPrompts = 0
  let totalChars = 0
  for (const entry of index.values()) {
    if (projects !== null && !projects.has(entry.workspace)) continue
    if (models !== null && !entry.models.some((model) => models.has(model))) continue
    if (providers !== null && !entry.providers.some((provider) => providers.has(provider))) continue
    if (entry.promptDayStats === null) continue
    for (const [day, stat] of entry.promptDayStats) {
      if (day < query.from || day > query.to) continue
      dayKeys.add(day)
      if (Number.isFinite(stat.count) && stat.count > 0) totalPrompts += stat.count
      if (Number.isFinite(stat.chars) && stat.chars > 0) totalChars += stat.chars
      if (!(stat.words instanceof Map)) continue
      for (const [word, count] of stat.words) {
        if (word === '' || !Number.isFinite(count) || count <= 0) continue
        addWordCount(totals, word, count, MAX_MERGED_WORDS)
      }
    }
  }
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 1000) : PROMPT_WORDS_LIMIT
  return { words: topWordEntries(totals, safeLimit), totalPrompts, totalChars, days: dayKeys.size }
}

/**
 * 上期窗口：与本期**同长度、紧邻前一段**（本地 `YYYY-MM-DD`）。
 * 日期按 UTC 做整数天算术，夏令时不会把窗口算歪；调用方保证入参是合法日期且 from <= to。
 */
export function previousPromptWindowOf(from: string, to: string): { from: string; to: string } {
  const dayMs = 86400000
  const fromMs = Date.parse(from + 'T00:00:00Z')
  const toMs = Date.parse(to + 'T00:00:00Z')
  const length = Math.round((toMs - fromMs) / dayMs) + 1
  const previousTo = fromMs - dayMs
  const previousFrom = previousTo - (length - 1) * dayMs
  return { from: new Date(previousFrom).toISOString().slice(0, 10), to: new Date(previousTo).toISOString().slice(0, 10) }
}

/** 工具统计的会话级样本（跟着会话折叠缓存走；外部注入的旧数据源可能没有这些字段）。 */
export interface ToolStatsRecord {
  toolCalls?: number
  toolNameCounts?: Map<string, number> | null
  skillNameCounts?: Map<string, number> | null
  mcpServerCounts?: Map<string, number> | null
  toolDayCalls?: Map<string, number> | null
  /** 按天的工具 / 技能 / MCP 明细（`/tools` 窗口切片用）；老数据源没有这个字段。 */
  toolDayStats?: Map<string, ToolDayStat> | null
}

/** 快照 `tools` 段的一行（工具 / 技能共用）。 */
export interface ToolUsageRow {
  name: string
  calls: number
  /** 占同类调用总次数的百分比，一位小数。 */
  sharePercent: number
}

/** 快照 `tools` 段的 MCP server 行。 */
export interface McpServerUsageRow {
  server: string
  calls: number
  sharePercent: number
}

/** 迷你柱的一天。 */
export interface ToolUsageDay {
  /** 本地日期 `YYYY-MM-DD`。 */
  date: string
  calls: number
}

/** 快照 `tools` 段：工具 / 技能 / MCP server 调用统计（全部会话、全量历史）。 */
export interface ToolsStat {
  /** 工具调用总次数（`tool/call` 事件数）。 */
  calls: number
  /** 至少调用过一次工具的会话数。 */
  sessions: number
  /** Top 7（调用次数降序，同频按名称升序）。 */
  tools: ToolUsageRow[]
  /** 近 7 个本地日的工具调用次数（含今天，缺失日补 0）。 */
  days: ToolUsageDay[]
  skills: {
    /** 技能调用总次数（`skill` 工具且能解析出 `arguments.name`）。 */
    calls: number
    /** 不同技能个数。 */
    count: number
    /** Top 6。 */
    rows: ToolUsageRow[]
    /** Top 6 之外的技能个数与调用次数合计（界面「其它 N 个」行）。 */
    other: { count: number; calls: number }
  }
  mcp: {
    /** MCP 调用总次数（`mcp_call` + 直连 `mcp__<server>__<tool>` 工具名）。 */
    calls: number
    /** 不同 MCP server 个数。 */
    count: number
    /** Top 8。 */
    rows: McpServerUsageRow[]
  }
}

/** 百分比：调用次数 / 同类总数，一位小数；分母为 0 时给 0。 */
function sharePercentOf(calls: number, total: number): number {
  if (total <= 0 || calls <= 0) return 0
  return Math.round(calls / total * 1000) / 10
}

/** 跨会话累加计数表（兼容旧数据源缺字段 / null）。 */
function mergeCounts(target: Map<string, number>, source: Map<string, number> | null | undefined): void {
  if (!(source instanceof Map)) return
  for (const [key, count] of source) {
    if (typeof key !== 'string' || key === '' || !Number.isFinite(count) || count <= 0) continue
    target.set(key, (target.get(key) ?? 0) + count)
  }
}

/** 计数表 → 榜单行：次数降序、同频按名称升序，取前 limit 个。 */
function countRowsOf(counts: Map<string, number>, limit: number, total: number): Array<{ key: string; calls: number; sharePercent: number }> {
  return [...counts.entries()]
    .filter(([key, calls]) => key !== '' && Number.isFinite(calls) && calls > 0)
    .sort((first, second) => (second[1] !== first[1] ? second[1] - first[1] : first[0] < second[0] ? -1 : first[0] > second[0] ? 1 : 0))
    .slice(0, limit)
    .map(([key, calls]) => ({ key, calls, sharePercent: sharePercentOf(calls, total) }))
}

/** 计数表 → 下发的 `ToolsStat`：两个入口（全量快照段、`/tools` 窗口）共用同一套占比与截断规则。 */
function toolsStatOf(input: {
  calls: number
  sessions: number
  toolCounts: Map<string, number>
  skillCounts: Map<string, number>
  mcpCounts: Map<string, number>
  days: ToolUsageDay[]
}): ToolsStat {
  const skillTotal = [...input.skillCounts.values()].reduce((sum, count) => sum + count, 0)
  const mcpTotal = [...input.mcpCounts.values()].reduce((sum, count) => sum + count, 0)
  // 占比分母：工具用总调用次数（与面板头部的「N 次」同一口径），技能 / MCP 用各自总数
  const toolRows = countRowsOf(input.toolCounts, TOOLS_TOP_LIMIT, input.calls)
  const skillRows = countRowsOf(input.skillCounts, SKILLS_TOP_LIMIT, skillTotal)
  const mcpRows = countRowsOf(input.mcpCounts, MCP_TOP_LIMIT, mcpTotal)
  return {
    calls: input.calls,
    sessions: input.sessions,
    tools: toolRows.map((row) => ({ name: row.key, calls: row.calls, sharePercent: row.sharePercent })),
    days: input.days,
    skills: {
      calls: skillTotal,
      count: input.skillCounts.size,
      rows: skillRows.map((row) => ({ name: row.key, calls: row.calls, sharePercent: row.sharePercent })),
      other: {
        count: Math.max(0, input.skillCounts.size - skillRows.length),
        calls: Math.max(0, skillTotal - skillRows.reduce((sum, row) => sum + row.calls, 0)),
      },
    },
    mcp: {
      calls: mcpTotal,
      count: input.mcpCounts.size,
      rows: mcpRows.map((row) => ({ server: row.key, calls: row.calls, sharePercent: row.sharePercent })),
    },
  }
}

/**
 * 跨会话合并工具 / 技能 / MCP 统计（快照 `tools` 段：全部会话、全量历史）。
 * `null` = 这份数据源没有工具统计（老缓存 / 外部注入的旧数据源 / 没有会话 / 一条工具调用都没有），
 * 界面统一显示「暂无采集」而不是 0；只有真的采集到调用才返回对象。
 */
export function mergeToolStats(records: Iterable<ToolStatsRecord>, options?: { now?: number }): ToolsStat | null {
  const toolCounts = new Map<string, number>()
  const skillCounts = new Map<string, number>()
  const mcpCounts = new Map<string, number>()
  const dayCounts = new Map<string, number>()
  let calls = 0
  let sessions = 0
  let collected = false
  for (const record of records) {
    if (typeof record.toolCalls !== 'number' || !Number.isFinite(record.toolCalls)) continue
    collected = true
    if (record.toolCalls > 0) sessions += 1
    calls += record.toolCalls
    mergeCounts(toolCounts, record.toolNameCounts)
    mergeCounts(skillCounts, record.skillNameCounts)
    mergeCounts(mcpCounts, record.mcpServerCounts)
    mergeCounts(dayCounts, record.toolDayCalls)
  }
  if (!collected || calls <= 0 || toolCounts.size === 0) return null
  const nowMs = options?.now ?? Date.now()
  const days: ToolUsageDay[] = []
  for (let offset = TOOL_TREND_DAYS - 1; offset >= 0; offset -= 1) {
    const date = dayKeyOf(nowMs - offset * 86400000)
    days.push({ date, calls: dayCounts.get(date) ?? 0 })
  }
  return toolsStatOf({ calls, sessions, toolCounts, skillCounts, mcpCounts, days })
}

/** 工具运行期索引里一个会话的维度与计数表（内存态、不落盘，随每次本地重建刷新）。 */
export interface ToolSessionEntry {
  /** 会话工作区；空串 = 未归入工作区。 */
  workspace: string
  /** 会话用到的**展示模型名**（去重，与顶部「模型」筛选的取值同一口径）。 */
  models: string[]
  /** 会话用到的通道（去重）。 */
  providers: string[]
  /** 工具名 → 调用次数（直接引用折叠缓存里的 Map，不复制）。 */
  byTool: Map<string, number> | null
  /** 技能名 → 调用次数。 */
  skills: Map<string, number> | null
  /** MCP server → 调用次数。 */
  mcp: Map<string, number> | null
  /** 本地日期 → 当天工具调用次数。 */
  byDay: Map<string, number> | null
  /** 本地日期 → 当天工具 / 技能 / MCP 明细：窗口切片只能读它。 */
  toolDayStats: Map<string, ToolDayStat> | null
  /** 全量工具调用次数（含没有事件时间、进不了 byDay 的那些）。 */
  total: number
}

/** 工具运行期索引：会话 id → 过滤维度 + 计数表。 */
export type ToolSessionIndex = Map<string, ToolSessionEntry>

/** 建运行期索引所需的会话字段（`SessionUsageRecord` 的结构子集，避免 data 层反向依赖 sessions.ts）。 */
export interface SessionIndexRecord {
  id: string
  workspace?: string | null
  summary?: { models?: ReadonlyArray<{ key: string }> } | null
}

/** 建索引所需的工具统计字段。 */
export interface ToolIndexRecord extends ToolStatsRecord, SessionIndexRecord {}

/** 运行期索引共用的过滤维度：模型名按展示口径拆（`attributeModelKey` 去掉路由前缀），与顶部「模型」筛选一致。 */
function sessionDimensionsOf(
  record: SessionIndexRecord,
  knownProviders: string[],
): { workspace: string; models: string[]; providers: string[] } {
  const models = new Set<string>()
  const providers = new Set<string>()
  for (const model of record.summary?.models ?? []) {
    if (model === null || typeof model.key !== 'string' || model.key === '') continue
    const attribution = attributeModelKey(model.key, knownProviders)
    if (attribution.model !== '') models.add(attribution.model)
    if (attribution.provider !== '') providers.add(attribution.provider)
  }
  return { workspace: record.workspace ?? '', models: [...models], providers: [...providers] }
}

/**
 * 从同一份会话折叠结果建工具运行期索引：只搬 Map 引用、收集过滤维度，**不读第二遍会话**。
 */
export function buildToolSessionIndex(records: Iterable<ToolIndexRecord>, knownProviders: string[]): ToolSessionIndex {
  const index: ToolSessionIndex = new Map()
  for (const record of records) {
    if (typeof record.id !== 'string' || record.id === '') continue
    index.set(record.id, {
      ...sessionDimensionsOf(record, knownProviders),
      byTool: record.toolNameCounts ?? null,
      skills: record.skillNameCounts ?? null,
      mcp: record.mcpServerCounts ?? null,
      byDay: record.toolDayCalls ?? null,
      toolDayStats: record.toolDayStats ?? null,
      total: typeof record.toolCalls === 'number' && Number.isFinite(record.toolCalls) ? record.toolCalls : 0,
    })
  }
  return index
}

/** 提问运行期索引里一个会话的过滤维度与按天桶（内存态、不落盘，随每次本地重建刷新）。 */
export interface PromptSessionEntry {
  /** 会话工作区；空串 = 未归入工作区。 */
  workspace: string
  /** 会话用到的展示模型名（去重，与顶部「模型」筛选同一口径）。 */
  models: string[]
  /** 会话用到的通道（去重）。 */
  providers: string[]
  /** 本地日期 → 当天提问统计（直接引用折叠缓存里的 Map，不复制）。 */
  promptDayStats: Map<string, PromptDayStat> | null
}

/** 提问运行期索引：会话 id → 过滤维度 + 按天桶。 */
export type PromptSessionIndex = Map<string, PromptSessionEntry>

/** 建提问索引所需的会话字段。 */
export interface PromptIndexRecord extends PromptStatsRecord, SessionIndexRecord {}

/** 从同一份会话折叠结果建提问运行期索引：只搬按天桶引用、收集过滤维度，不读第二遍会话。 */
export function buildPromptSessionIndex(records: Iterable<PromptIndexRecord>, knownProviders: string[]): PromptSessionIndex {
  const index: PromptSessionIndex = new Map()
  for (const record of records) {
    if (typeof record.id !== 'string' || record.id === '') continue
    index.set(record.id, {
      ...sessionDimensionsOf(record, knownProviders),
      promptDayStats: record.promptDayStats ?? null,
    })
  }
  return index
}

/** `/tools` 的查询窗口与筛选维度（空数组 / 缺省 = 不筛）。 */
export interface ToolWindowQuery {
  /** 起始本地日期 `YYYY-MM-DD`（含）。 */
  from: string
  /** 结束本地日期 `YYYY-MM-DD`（含）。 */
  to: string
  /** 工作区多选；`''` 匹配「未归入工作区」。 */
  projects?: string[] | null
  /** 展示模型名多选。 */
  models?: string[] | null
}

/** `/tools` 迷你柱最多画的天数：窗口更长时只画最后 N 天，次数仍按完整窗口统计。 */
export const TOOLS_WINDOW_MAX_DAYS = 400

/** 窗口内的日期序列（含首尾）；窗口更长时取最后 N 天。非法日期返回空表。 */
function windowDayKeysOf(from: string, to: string): string[] {
  const startMs = Date.parse(from)
  const endMs = Date.parse(to)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return []
  const span = Math.round((endMs - startMs) / 86400000) + 1
  const length = Math.min(span, TOOLS_WINDOW_MAX_DAYS)
  const days: string[] = []
  for (let offset = span - length; offset < span; offset += 1) {
    days.push(new Date(startMs + offset * 86400000).toISOString().slice(0, 10))
  }
  return days
}

/**
 * 按窗口 + 项目 + 模型聚合工具统计（`GET /tools`）。
 * `null` = 运行期索引还没建好（老版本 / 构建中）：调用方回落快照里的全量段，不报错。
 * 索引存在但窗口内没有调用时返回**全 0 的对象**（界面据此显示空态，而不是拿全量数据冒充）。
 */
export function mergeToolStatsInWindow(index: ToolSessionIndex | null, query: ToolWindowQuery): ToolsStat | null {
  if (index === null) return null
  const projects = query.projects !== undefined && query.projects !== null && query.projects.length > 0 ? new Set(query.projects) : null
  const models = query.models !== undefined && query.models !== null && query.models.length > 0 ? new Set(query.models) : null
  const toolCounts = new Map<string, number>()
  const skillCounts = new Map<string, number>()
  const mcpCounts = new Map<string, number>()
  const dayCounts = new Map<string, number>()
  let calls = 0
  let sessions = 0
  for (const entry of index.values()) {
    if (projects !== null && !projects.has(entry.workspace)) continue
    if (models !== null && !entry.models.some((model) => models.has(model))) continue
    if (entry.toolDayStats === null) continue
    let sessionCalls = 0
    for (const [day, stat] of entry.toolDayStats) {
      if (day < query.from || day > query.to) continue
      sessionCalls += stat.calls
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + stat.calls)
      mergeCounts(toolCounts, stat.tools)
      mergeCounts(skillCounts, stat.skills)
      mergeCounts(mcpCounts, stat.mcp)
    }
    if (sessionCalls <= 0) continue
    sessions += 1
    calls += sessionCalls
  }
  const days = windowDayKeysOf(query.from, query.to).map((date) => ({ date, calls: dayCounts.get(date) ?? 0 }))
  return toolsStatOf({ calls, sessions, toolCounts, skillCounts, mcpCounts, days })
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
