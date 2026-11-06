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
import { sessionDimensionsOf } from './tool-stats.js';
/**
 * 首条提问保留的最大字数：详情要展示「全文」，但不能让一次超长粘贴把折叠结果与响应撑爆。
 */
import { MAX_PROMPT_CHARS, MAX_SESSION_WORDS, PROMPT_SNIPPET_CHARS, PROMPT_STATS_CHARS, PROMPT_WORDS_LIMIT, addPromptWords, addWordCount, isHumanPromptMessage, isInjectedPromptText, stripInjectedPromptText, } from './prompt-stats.js';
export { MAX_PROMPT_CHARS, MAX_SESSION_WORDS, PROMPT_SNIPPET_CHARS, PROMPT_STATS_CHARS, PROMPT_TITLE_CHARS, PROMPT_WORDS_LIMIT, isInjectedPromptText, preparePromptSegmenter, } from './prompt-stats.js';
export function zeroBuckets() {
    return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
}
export function totalTokens(buckets) {
    return buckets.inputTokens + buckets.outputTokens + buckets.cacheReadTokens + buckets.cacheWriteTokens;
}
export function addBuckets(target, source) {
    target.inputTokens += source.inputTokens;
    target.outputTokens += source.outputTokens;
    target.cacheReadTokens += source.cacheReadTokens;
    target.cacheWriteTokens += source.cacheWriteTokens;
    return target;
}
/** 本地日历 `YYYY-MM-DD`。 */
export function dayKeyOf(timeMs) {
    const date = new Date(timeMs);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}
/** 本地小时（0–23）。 */
export function hourOfTime(timeMs) {
    return new Date(timeMs).getHours();
}
function bucketsOf(usage) {
    return {
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
        cacheReadTokens: usage?.cacheReadTokens ?? 0,
        cacheWriteTokens: usage?.cacheWriteTokens ?? 0,
    };
}
function modelOfEvent(event) {
    const source = event.data?.message?.source;
    if (source !== undefined && typeof source.model === 'string' && source.model !== '') {
        const provider = typeof source.provider === 'string' && source.provider !== '' ? source.provider : 'unknown';
        return `${provider}/${source.model}`;
    }
    const config = event.data?.header?.config;
    if (config !== undefined && typeof config.model === 'string' && config.model !== '') {
        const provider = typeof config.provider === 'string' && config.provider !== '' ? config.provider : 'unknown';
        return `${provider}/${config.model}`;
    }
    return null;
}
/**
 * 取事件携带的用量样本；与「哪些事件算样本」的口径一一对应（见 docs/01 §3.10）。
 * 注意 `assistant/attempt` 不认 `data.usage`，只认 `data.stream` 里的样本，与旧实现一致。
 */
function usagePayloadOf(event) {
    const type = event.type;
    const data = event.data;
    if (type === 'assistant/chunk') {
        const chunk = data?.chunk;
        return chunk?.type === 'usage' && chunk.usage !== undefined ? { usage: chunk.usage } : null;
    }
    if (type !== 'assistant/message' && type !== 'assistant/attempt')
        return null;
    if (type === 'assistant/message' && data?.usage !== undefined)
        return { usage: data.usage };
    const stream = data?.stream;
    if (!Array.isArray(stream))
        return null;
    for (let index = stream.length - 1; index >= 0; index -= 1) {
        const record = stream[index];
        if (record?.type === 'chunk' && record.chunk?.type === 'usage' && record.chunk.usage !== undefined) {
            return { usage: record.chunk.usage };
        }
    }
    return null;
}
/**
 * 工具统计口径（快照 `tools` 段）：工具调用是独立的 `tool/call` 事件（v4 事件流里没有 `tool_use` 内容块），
 * 一次调用一条事件、`callId` 在同一会话内不重复出现，所以按事件计数即可，不需要另做去重。
 * 技能名取自 `skill` 工具的 `arguments.name`；MCP server 取自 `mcp_call` 的 `arguments.server`，
 * 另外兼容直连工具名 `mcp__<server>__<tool>`（部分宿主把 MCP 工具直接暴露成工具）。
 */
const SKILL_TOOL_NAME = 'skill';
const MCP_CALL_TOOL_NAME = 'mcp_call';
/** 直连 MCP 工具名：`mcp__<server>__<tool>`，server 段不含双下划线。 */
const MCP_DIRECT_TOOL_PATTERN = /^mcp__([\s\S]+?)__([\s\S]+)$/;
/** 拿不到工具名 / server 名时归到这一行：不丢计数，也不编具体名字。 */
const UNKNOWN_NAME = 'unknown';
/** 各榜单下发的行数（原型：工具 7 行、技能 6 行 + 其它、MCP 8 行）。 */
export const TOOLS_TOP_LIMIT = 7;
export const SKILLS_TOP_LIMIT = 6;
export const MCP_TOP_LIMIT = 8;
/** 迷你柱覆盖的本地天数（含今天）。 */
export const TOOL_TREND_DAYS = 7;
/** 计数加一（工具名 / 技能名 / server 名都按整串命中）。 */
function incrementCount(counts, key) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
}
/** `arguments` 是 JSON 字符串（宿主当前写法）；兼容已经解析成对象的样本，非法 JSON 返回 null。 */
function argumentsObjectOf(value) {
    if (typeof value === 'string') {
        if (value.trim() === '')
            return null;
        try {
            const parsed = JSON.parse(value);
            if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
                return null;
            return parsed;
        }
        catch {
            return null;
        }
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return value;
    }
    return null;
}
/** `skill` 工具的技能名；解析不出返回 null（该次调用仍计入工具次数，只是不进技能榜）。 */
function skillNameOf(args) {
    const name = argumentsObjectOf(args)?.name;
    return typeof name === 'string' && name.trim() !== '' ? name.trim() : null;
}
/** 一次工具调用归属的 MCP server；不是 MCP 调用返回 null。 */
function mcpServerOf(toolName, args) {
    if (toolName === MCP_CALL_TOOL_NAME) {
        const server = argumentsObjectOf(args)?.server;
        return typeof server === 'string' && server.trim() !== '' ? server.trim() : UNKNOWN_NAME;
    }
    const matched = MCP_DIRECT_TOOL_PATTERN.exec(toolName);
    return matched === null ? null : matched[1];
}
/** 折叠一段事件（整段重折，重复上报覆盖旧值）。 */
export function foldSessionEvents(events) {
    const samples = new Map();
    // `llm/retry-started` 终结当前 (turn, step) 的覆盖槽：重试是新的上报，与原尝试累加而不是覆盖
    const attemptCounts = new Map();
    let currentModel = null;
    let firstTime = null;
    let lastTime = null;
    // 会话标题在宿主侧只对有投影的会话可见，其余用「首条用户提问」兜底
    let firstPrompt = null;
    const words = new Map();
    let promptCount = 0;
    let promptChars = 0;
    let promptFirstTime = null;
    let promptLastTime = null;
    const promptDayStats = new Map();
    /** 当天桶的词条总预算：与单会话词表同一上限，只兜病态会话的内存（到顶后只累加已有词）。 */
    const promptDayWordBudget = { remaining: MAX_SESSION_WORDS };
    /** 取（或建）某天的桶：词云环比按天切窗口，跨窗口的会话不会重复计。 */
    const promptDayOf = (time) => {
        const day = dayKeyOf(time);
        let stat = promptDayStats.get(day);
        if (stat === undefined) {
            stat = { count: 0, chars: 0, words: new Map() };
            promptDayStats.set(day, stat);
        }
        return stat;
    };
    let toolCalls = 0;
    let toolNameCounts = null;
    let skillNameCounts = null;
    let mcpServerCounts = null;
    let toolDayCalls = null;
    let toolDayStats = null;
    for (const event of events) {
        const time = typeof event.time === 'number' ? event.time : null;
        if (time !== null) {
            if (firstTime === null || time < firstTime)
                firstTime = time;
            if (lastTime === null || time > lastTime)
                lastTime = time;
        }
        // 先按类型分流：整段日志里绝大多数事件与用量无关，不必为它们拼 (turn, step) 键
        const type = event.type;
        if (type === 'assistant/chunk' || type === 'assistant/message' || type === 'assistant/attempt') {
            const payload = usagePayloadOf(event);
            if (payload === null || time === null)
                continue;
            const turn = event.data?.turn;
            const step = event.data?.step;
            const baseKey = Number.isInteger(turn) && Number.isInteger(step) ? `${turn}:${step}` : `seq:${event.seq}`;
            const attempt = attemptCounts.get(baseKey) ?? 0;
            const sampleKey = `${baseKey}#${attempt}`;
            const model = modelOfEvent(event) ?? currentModel ?? 'unknown/unknown';
            samples.set(sampleKey, {
                key: sampleKey,
                day: dayKeyOf(time),
                hour: hourOfTime(time),
                model,
                buckets: bucketsOf(payload.usage),
            });
            continue;
        }
        if (type === 'request/header') {
            const model = modelOfEvent(event);
            if (model !== null)
                currentModel = model;
            continue;
        }
        if (type === 'llm/retry-started') {
            const turn = event.data?.turn;
            const step = event.data?.step;
            if (Number.isInteger(turn) && Number.isInteger(step)) {
                const baseKey = `${turn}:${step}`;
                attemptCounts.set(baseKey, (attemptCounts.get(baseKey) ?? 0) + 1);
            }
            continue;
        }
        if (type === 'user/message') {
            const raw = promptRawTextOf(event);
            if (raw !== null) {
                // 同一条消息里拼进来的注入段先剥离再统计；清洗后为空则整条不计入
                const cleaned = flattenPromptText(stripInjectedPromptText(raw));
                // 宿主注入的上下文消息（time-context / runtime-context / agent-instructions…）也是 user/message，
                // 靠 source.kind 排除；没有 source 的旧数据按人类处理，再由文本清洗兜底。
                if (cleaned !== '' && isHumanPromptMessage(event.data) && !isInjectedPromptText(cleaned)) {
                    if (firstPrompt === null) {
                        firstPrompt = cleaned.length > MAX_PROMPT_CHARS ? cleaned.slice(0, MAX_PROMPT_CHARS) + '…' : cleaned;
                    }
                    const counted = cleaned.length > PROMPT_STATS_CHARS ? cleaned.slice(0, PROMPT_STATS_CHARS) : cleaned;
                    promptCount += 1;
                    promptChars += counted.length;
                    const dayStat = time === null ? null : promptDayOf(time);
                    addPromptWords(words, counted, dayStat === null ? undefined : { words: dayStat.words, budget: promptDayWordBudget });
                    if (time !== null && dayStat !== null) {
                        if (promptFirstTime === null || time < promptFirstTime)
                            promptFirstTime = time;
                        if (promptLastTime === null || time > promptLastTime)
                            promptLastTime = time;
                        dayStat.count += 1;
                        dayStat.chars += counted.length;
                    }
                }
            }
            continue;
        }
        if (type === 'tool/call') {
            const rawName = event.data?.name;
            const toolName = typeof rawName === 'string' && rawName.trim() !== '' ? rawName.trim() : UNKNOWN_NAME;
            toolCalls += 1;
            toolNameCounts ??= new Map();
            incrementCount(toolNameCounts, toolName);
            const skillName = toolName === SKILL_TOOL_NAME ? skillNameOf(event.data?.arguments) : null;
            if (skillName !== null) {
                skillNameCounts ??= new Map();
                incrementCount(skillNameCounts, skillName);
            }
            const mcpServer = mcpServerOf(toolName, event.data?.arguments);
            if (mcpServer !== null) {
                mcpServerCounts ??= new Map();
                incrementCount(mcpServerCounts, mcpServer);
            }
            if (time !== null) {
                const day = dayKeyOf(time);
                toolDayCalls ??= new Map();
                incrementCount(toolDayCalls, day);
                toolDayStats ??= new Map();
                let dayStat = toolDayStats.get(day);
                if (dayStat === undefined) {
                    dayStat = { calls: 0, tools: new Map(), skills: null, mcp: null };
                    toolDayStats.set(day, dayStat);
                }
                dayStat.calls += 1;
                incrementCount(dayStat.tools, toolName);
                if (skillName !== null) {
                    dayStat.skills ??= new Map();
                    incrementCount(dayStat.skills, skillName);
                }
                if (mcpServer !== null) {
                    dayStat.mcp ??= new Map();
                    incrementCount(dayStat.mcp, mcpServer);
                }
            }
            continue;
        }
    }
    return {
        samples, firstTime, lastTime, firstPrompt, promptCount, promptChars, words, promptFirstTime, promptLastTime, promptDayStats,
        toolCalls, toolNameCounts, skillNameCounts, mcpServerCounts, toolDayCalls, toolDayStats,
    };
}
/** 标题 / 搜索片段：压平空白并按需截断（详情要全文，列表只要一小段）。 */
export function promptSnippetOf(text, maxChars = PROMPT_SNIPPET_CHARS) {
    // 缺字段的历史记录与外部注入的折叠结果都可能没有 firstPrompt，这里一并兜住
    if (typeof text !== 'string' || text === '')
        return null;
    const flat = text.replace(/\s+/g, ' ').trim();
    if (flat === '')
        return null;
    return flat.length > maxChars ? flat.slice(0, maxChars) + '…' : flat;
}
/** 压平空白（标题与词频统计都先压平，再各自截断）。 */
function flattenPromptText(text) {
    return text.replace(/\s+/g, ' ').trim();
}
/**
 * 用户消息里的文本块（块间保留换行，供注入段清洗判断段落开头）。
 * 只收 `type === "text"` 的块：`tool_result` / `tool_use` / 图片块里的 text 字段不是人类提问。
 */
function promptRawTextOf(event) {
    const data = event.data;
    if (typeof data !== 'object' || data === null)
        return null;
    // `user/message` 的正文在 `data.content`（宿主 dsh-context 就是这么读的），
    // `assistant/message` 才用 `data.message.content` —— 两种都认，避免形状差异导致标题全空。
    const direct = data.content;
    const nested = data.message?.content;
    const content = Array.isArray(direct) ? direct : Array.isArray(nested) ? nested : null;
    if (content === null)
        return null;
    const texts = [];
    for (const block of content) {
        // 文本块既可能是对象，也可能是裸字符串
        if (typeof block === 'string') {
            if (block !== '')
                texts.push(block);
            continue;
        }
        if (typeof block !== 'object' || block === null)
            continue;
        const typed = block;
        if (typeof typed.type === 'string' && typed.type !== 'text')
            continue;
        if (typeof typed.text !== 'string' || typed.text === '')
            continue;
        texts.push(typed.text);
    }
    return texts.length === 0 ? null : texts.join('\n');
}
/**
 * 缓存命中率（百分数，一位小数）：`cacheRead / (input + output + cacheRead)`。
 * 与台账表的既有口径保持一致（截图里 3.82B/3.96B = 96.2%），不含 cacheWrite。
 */
export function cacheHitRateOf(buckets) {
    const displayTokens = buckets.inputTokens + buckets.outputTokens + buckets.cacheReadTokens;
    if (displayTokens <= 0)
        return null;
    return Math.round(buckets.cacheReadTokens / displayTokens * 1000) / 10;
}
function emptyHours() {
    return Array.from({ length: 24 }, () => ({ calls: 0, buckets: zeroBuckets() }));
}
/** 把折叠结果汇总成可直接下发的会话用量（按天升序、天内按模型降序）。 */
export function summarizeSession(fold) {
    const byDay = new Map();
    const byModel = new Map();
    const totals = zeroBuckets();
    let calls = 0;
    for (const sample of fold.samples.values()) {
        let dayBucket = byDay.get(sample.day);
        if (dayBucket === undefined) {
            dayBucket = { calls: 0, buckets: zeroBuckets(), hours: emptyHours(), models: new Map(), hourModels: Array.from({ length: 24 }, () => new Map()) };
            byDay.set(sample.day, dayBucket);
        }
        dayBucket.calls += 1;
        addBuckets(dayBucket.buckets, sample.buckets);
        dayBucket.hours[sample.hour].calls += 1;
        dayBucket.hours[sample.hour].sessions = 1;
        addBuckets(dayBucket.hours[sample.hour].buckets, sample.buckets);
        const hourMap = dayBucket.hourModels[sample.hour];
        let hourModel = hourMap.get(sample.model);
        if (hourModel === undefined) {
            hourModel = { key: sample.model, calls: 0, tokens: 0, buckets: zeroBuckets() };
            hourMap.set(sample.model, hourModel);
        }
        hourModel.calls += 1;
        addBuckets(hourModel.buckets, sample.buckets);
        hourModel.tokens = totalTokens(hourModel.buckets);
        let dayModel = dayBucket.models.get(sample.model);
        if (dayModel === undefined) {
            dayModel = { key: sample.model, calls: 0, tokens: 0, buckets: zeroBuckets() };
            dayBucket.models.set(sample.model, dayModel);
        }
        dayModel.calls += 1;
        addBuckets(dayModel.buckets, sample.buckets);
        dayModel.tokens = totalTokens(dayModel.buckets);
        let modelRow = byModel.get(sample.model);
        if (modelRow === undefined) {
            modelRow = { key: sample.model, calls: 0, tokens: 0, buckets: zeroBuckets() };
            byModel.set(sample.model, modelRow);
        }
        modelRow.calls += 1;
        addBuckets(modelRow.buckets, sample.buckets);
        modelRow.tokens = totalTokens(modelRow.buckets);
        calls += 1;
        addBuckets(totals, sample.buckets);
    }
    const days = [...byDay.entries()]
        .map(([date, bucket]) => ({
        date,
        calls: bucket.calls,
        tokens: totalTokens(bucket.buckets),
        buckets: bucket.buckets,
        hours: bucket.hours.map((slot, hour) => ({
            ...slot,
            models: [...bucket.hourModels[hour].values()].sort((first, second) => second.tokens - first.tokens),
        })),
        models: [...bucket.models.values()].sort((first, second) => second.tokens - first.tokens),
    }))
        .sort((first, second) => (first.date < second.date ? -1 : first.date > second.date ? 1 : 0));
    const models = [...byModel.values()].sort((first, second) => second.tokens - first.tokens);
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
    };
}
/**
 * 合并后的词表上限：只作跨大量会话的内存兜底 —— 到顶后仍只累加已有词，
 * 高频词早已入表，不影响 top 词统计。
 */
const MAX_MERGED_WORDS = 200000;
/** 词云排序：次数降序，同频按词升序（固定排序键，同一份数据每次下发顺序一致）。 */
function wordRanksBefore(first, second) {
    if (first.count !== second.count)
        return first.count > second.count;
    return first.word < second.word;
}
/** 取 top N：维护「最差在堆顶」的小顶堆，避免对上万词整体排序（8 万词整体排序本机实测约 80 ms）。 */
function topWordEntries(totals, limit) {
    const worse = (first, second) => wordRanksBefore(second, first);
    const siftUp = (heap, start) => {
        let index = start;
        while (index > 0) {
            const parent = (index - 1) >> 1;
            if (!worse(heap[index], heap[parent]))
                return;
            const swap = heap[parent];
            heap[parent] = heap[index];
            heap[index] = swap;
            index = parent;
        }
    };
    const siftDown = (heap, start) => {
        let index = start;
        for (;;) {
            const left = index * 2 + 1;
            if (left >= heap.length)
                return;
            const right = left + 1;
            const worseChild = right < heap.length && worse(heap[right], heap[left]) ? right : left;
            if (!worse(heap[worseChild], heap[index]))
                return;
            const swap = heap[index];
            heap[index] = heap[worseChild];
            heap[worseChild] = swap;
            index = worseChild;
        }
    };
    const heap = [];
    for (const [word, count] of totals) {
        const candidate = { word, count };
        if (heap.length < limit) {
            heap.push(candidate);
            siftUp(heap, heap.length - 1);
            continue;
        }
        if (!wordRanksBefore(candidate, heap[0]))
            continue;
        heap[0] = candidate;
        siftDown(heap, 0);
    }
    return heap.sort((first, second) => (wordRanksBefore(first, second) ? -1 : 1));
}
/**
 * 跨会话合并提问词频：词频相加、条数与字符数相加、时间取并集，最后按「次数降序、同频按词升序」
 * 取前 `limit` 个。
 */
export function mergePromptStats(records, limit = PROMPT_WORDS_LIMIT) {
    const totals = new Map();
    let totalPrompts = 0;
    let totalChars = 0;
    let firstTime = null;
    let lastTime = null;
    for (const record of records) {
        if (typeof record.promptCount === 'number' && record.promptCount > 0)
            totalPrompts += record.promptCount;
        if (typeof record.promptChars === 'number' && record.promptChars > 0)
            totalChars += record.promptChars;
        const recordFirst = record.promptFirstTime;
        if (typeof recordFirst === 'number' && (firstTime === null || recordFirst < firstTime))
            firstTime = recordFirst;
        const recordLast = record.promptLastTime;
        if (typeof recordLast === 'number' && (lastTime === null || recordLast > lastTime))
            lastTime = recordLast;
        if (!(record.words instanceof Map))
            continue;
        for (const [word, count] of record.words) {
            if (word === '' || !Number.isFinite(count) || count <= 0)
                continue;
            addWordCount(totals, word, count, MAX_MERGED_WORDS);
        }
    }
    const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 1000) : PROMPT_WORDS_LIMIT;
    return {
        words: topWordEntries(totals, safeLimit),
        totalPrompts,
        totalChars,
        from: firstTime === null ? null : dayKeyOf(firstTime),
        to: lastTime === null ? null : dayKeyOf(lastTime),
    };
}
/**
 * 某个日期区间（含首尾，本地 `YYYY-MM-DD`）内的提问统计：只读按天桶，
 * 同一会话跨两个窗口时按天各计各的，不重复、不近似。快照 `prompts` 段用它拼本期 / 上期。
 */
export function mergePromptStatsForWindow(records, fromDay, toDay, limit = PROMPT_WORDS_LIMIT) {
    const totals = new Map();
    const dayKeys = new Set();
    let totalPrompts = 0;
    let totalChars = 0;
    let sessionCount = 0;
    for (const record of records) {
        const dayStats = record.promptDayStats;
        if (!(dayStats instanceof Map))
            continue;
        let matched = false;
        for (const [day, stat] of dayStats) {
            if (day < fromDay || day > toDay)
                continue;
            matched = true;
            dayKeys.add(day);
            if (Number.isFinite(stat.count) && stat.count > 0)
                totalPrompts += stat.count;
            if (Number.isFinite(stat.chars) && stat.chars > 0)
                totalChars += stat.chars;
            if (!(stat.words instanceof Map))
                continue;
            for (const [word, count] of stat.words) {
                if (word === '' || !Number.isFinite(count) || count <= 0)
                    continue;
                addWordCount(totals, word, count, MAX_MERGED_WORDS);
            }
        }
        if (matched)
            sessionCount += 1;
    }
    const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 1000) : PROMPT_WORDS_LIMIT;
    return { words: topWordEntries(totals, safeLimit), totalPrompts, totalChars, days: dayKeys.size, sessionCount };
}
/**
 * 按窗口 + 项目 + 模型 + 通道聚合提问统计（`GET /prompts`）。
 * `null` = 运行期索引还没建好（老版本 / 构建中）：调用方回落快照里的 `prompts` 段，不报错。
 * 索引存在但窗口 / 筛选没有命中时返回**全 0 对象**（界面显示空态，不拿全量数据冒充）。
 */
export function mergePromptStatsInWindow(index, query, limit = PROMPT_WORDS_LIMIT) {
    if (index === null)
        return null;
    const projects = query.projects !== undefined && query.projects !== null && query.projects.length > 0 ? new Set(query.projects) : null;
    const models = query.models !== undefined && query.models !== null && query.models.length > 0 ? new Set(query.models) : null;
    const providers = query.providers !== undefined && query.providers !== null && query.providers.length > 0 ? new Set(query.providers) : null;
    const totals = new Map();
    const dayKeys = new Set();
    let totalPrompts = 0;
    let totalChars = 0;
    let sessionCount = 0;
    for (const entry of index.values()) {
        if (projects !== null && !projects.has(entry.workspace))
            continue;
        if (models !== null && !entry.models.some((model) => models.has(model)))
            continue;
        if (providers !== null && !entry.providers.some((provider) => providers.has(provider)))
            continue;
        if (entry.promptDayStats === null)
            continue;
        let matched = false;
        for (const [day, stat] of entry.promptDayStats) {
            if (day < query.from || day > query.to)
                continue;
            matched = true;
            dayKeys.add(day);
            if (Number.isFinite(stat.count) && stat.count > 0)
                totalPrompts += stat.count;
            if (Number.isFinite(stat.chars) && stat.chars > 0)
                totalChars += stat.chars;
            if (!(stat.words instanceof Map))
                continue;
            for (const [word, count] of stat.words) {
                if (word === '' || !Number.isFinite(count) || count <= 0)
                    continue;
                addWordCount(totals, word, count, MAX_MERGED_WORDS);
            }
        }
        if (matched)
            sessionCount += 1;
    }
    const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 1000) : PROMPT_WORDS_LIMIT;
    return { words: topWordEntries(totals, safeLimit), totalPrompts, totalChars, days: dayKeys.size, sessionCount };
}
/**
 * 上期窗口：与本期**同长度、紧邻前一段**（本地 `YYYY-MM-DD`）。
 * 日期按 UTC 做整数天算术，夏令时不会把窗口算歪；调用方保证入参是合法日期且 from <= to。
 */
export function previousPromptWindowOf(from, to) {
    const dayMs = 86400000;
    const fromMs = Date.parse(from + 'T00:00:00Z');
    const toMs = Date.parse(to + 'T00:00:00Z');
    const length = Math.round((toMs - fromMs) / dayMs) + 1;
    const previousTo = fromMs - dayMs;
    const previousFrom = previousTo - (length - 1) * dayMs;
    return { from: new Date(previousFrom).toISOString().slice(0, 10), to: new Date(previousTo).toISOString().slice(0, 10) };
}
/** 从同一份会话折叠结果建提问运行期索引：只搬按天桶引用、收集过滤维度，不读第二遍会话。 */
export function buildPromptSessionIndex(records, knownProviders) {
    const index = new Map();
    for (const record of records) {
        if (typeof record.id !== 'string' || record.id === '')
            continue;
        index.set(record.id, {
            ...sessionDimensionsOf(record, knownProviders),
            promptDayStats: record.promptDayStats ?? null,
        });
    }
    return index;
}
/** `/tools` 的查询窗口与筛选维度（空数组 / 缺省 = 不筛）。 */
export function normalizeProvider(provider, knownProviders) {
    if (knownProviders.includes(provider))
        return provider;
    const separator = provider.lastIndexOf('/');
    const tail = separator >= 0 ? provider.slice(separator + 1) : provider;
    const matched = knownProviders.find((candidate) => candidate === tail || candidate === provider);
    return matched ?? provider;
}
/**
 * 拆分 `provider/model` 归属键：优先按已知通道名在段边界上从右往左匹配，
 * 匹配不到再退回第一个 `/`。事件里的 provider 可能是 `pi-ai/opencode-go` 这类路由。
 */
export function attributeModelKey(key, knownProviders) {
    let bestIndex = -1;
    let bestProvider = '';
    for (const provider of knownProviders) {
        let searchFrom = 0;
        for (;;) {
            const index = key.indexOf(provider + '/', searchFrom);
            if (index === -1)
                break;
            if (index > bestIndex) {
                bestIndex = index;
                bestProvider = provider;
            }
            searchFrom = index + 1;
        }
    }
    if (bestIndex >= 0 && bestProvider !== '') {
        return { provider: bestProvider, model: key.slice(bestIndex + bestProvider.length + 1) };
    }
    const separator = key.indexOf('/');
    if (separator > 0)
        return { provider: key.slice(0, separator), model: key.slice(separator + 1) };
    return { provider: key, model: key };
}
