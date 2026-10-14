/**
 * 会话用量折叠：把宿主会话事件流折叠成「按天 / 按小时 / 按模型」的 token 桶，
 * 供「项目用量」「会话用量」两个 Tab 与「使用明细」的单日按小时视图使用。
 *
 * 口径对齐宿主 token 投影（参考 dsh-token-meter / dsh-usage-stats，MIT）：
 * - 用量样本搭载在 `assistant/chunk`（`data.chunk.type === "usage"`）或
 *   `assistant/message`（`data.usage`）；v2 结算还会把样本放进 `data.stream`；
 * - 同一 (turn, step) 重复上报按「后到覆盖先到」处理，不重复计费；
 * - 模型归属取 `data.message.source`，缺失时回落最近一次 `request/header` 的 config；
 * - 判定不出模型的样本落到 `unknown/unknown`。
 *
 * 与参考实现的差异：这里不做跨批次增量状态，而是每次按整段事件重折（按 revision 缓存），
 * 因此不需要「减掉上一次样本」的补偿逻辑，重复上报直接覆盖，天然一致。
 */
/**
 * 首条提问保留的最大字数：详情要展示「全文」，但不能让一次超长粘贴把折叠结果与响应撑爆。
 */
export const MAX_PROMPT_CHARS = 4000;
/** 列表里的提问片段长度（标题兜底与搜索都用它）；正文全文只在 `/session` 详情里给。 */
export const PROMPT_SNIPPET_CHARS = 200;
/** 列表标题的截断长度。 */
export const PROMPT_TITLE_CHARS = 60;
/**
 * 宿主注入的非人类文本：teammate 的系统提示、斜杠命令回显、本地命令输出都不是用户提问。
 * 取标题时必须跳过它们继续往下找，否则列表一屏全是 `You are teammate "…"` 这种无辨识度的标题。
 */
const INJECTED_TEXT_PREFIXES = ['<system-reminder', '<system', '<command-', '<local-command'];
export function isInjectedPromptText(text) {
    return INJECTED_TEXT_PREFIXES.some((prefix) => text.startsWith(prefix));
}
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
        if (type === 'user/message' && firstPrompt === null) {
            const text = promptTextOf(event);
            // 只改「取文本」这一步：系统注入文本不算提问，跳过它继续找下一条人类消息（优先级链不变）
            if (text !== null && !isInjectedPromptText(text))
                firstPrompt = text;
        }
    }
    return { samples, firstTime, lastTime, firstPrompt };
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
/** 提问正文：取用户消息里第一个非空文本块，压平空白并压到上限（不做系统文本判定，由调用方决定）。 */
function promptTextOf(event) {
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
    for (const block of content) {
        // 文本块既可能是对象，也可能是裸字符串
        const text = typeof block === 'string'
            ? block
            : typeof block === 'object' && block !== null ? block.text : null;
        if (typeof text !== 'string')
            continue;
        const flat = text.replace(/\s+/g, ' ').trim();
        if (flat === '')
            continue;
        return flat.length > MAX_PROMPT_CHARS ? flat.slice(0, MAX_PROMPT_CHARS) + '…' : flat;
    }
    return null;
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
            dayBucket = { calls: 0, buckets: zeroBuckets(), hours: emptyHours(), models: new Map() };
            byDay.set(sample.day, dayBucket);
        }
        dayBucket.calls += 1;
        addBuckets(dayBucket.buckets, sample.buckets);
        dayBucket.hours[sample.hour].calls += 1;
        addBuckets(dayBucket.hours[sample.hour].buckets, sample.buckets);
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
        hours: bucket.hours,
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
 * 把事件里出现的 provider 归一到宿主配置里的通道 id。
 * 事件里的 provider 可能是 pi-ai 路由（如 `pi-ai/opencode-go`）或适配器 id，
 * 只要末段与已知通道同名就归到该通道，否则原样保留。
 */
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
