/**
 * 端点共用的纯辅助函数：价格行拼装、按小时聚合、过滤参数解析、回环校验等。
 * 由 routes.ts 统一挂载，测试直接从 lib/routes.js 回读（export * 透传）。
 */
/**
 * HTTP 路由：15 个只读 `GET` + 3 个写 `POST`（快照刷新、价目刷新、系统日志）；非本机回环一律 403。
 * 成本逐格取值：台账官方账单 > 通道内价目（内置价目 / 聚合价按通道别名）> 同模型官方价目 > 无依据（另有 `costSource` / `partial`
 * / `costsByCurrency` 三个并列字段）；台账缺的日期由会话事件补位（见 merge.ts）。
 * 外网只有三处、都由用户动作触发：余额查询（live-quota.ts）、价目刷新（model-prices.ts）、汇率（fx-rate.ts）。
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { costModeLabel, quotaWindowLabel, } from '../data/collect.js';
import { hoursByDateOf, } from '../data/sessions.js';
import { appendLogRecords, logFilePath } from '../data/log-store.js';
import { alignMoneyWithCost, costsByCurrencyOf, priceRowsOf, summarizeCoverage, sumMoneyByCurrency, weakestOf, UNIT_LABELS, isoDayOf, } from '../pricing/pricing.js';
/** 无会话服务时的兜底数据源，保证台账相关端点照常工作。 */
export const unavailableSessionSource = {
    collect: async () => ({
        records: [],
        coverage: { status: 'unavailable', totalSessions: 0, countedSessions: 0, skippedSessions: 0 },
    }),
    detail: async (id) => ({
        status: 'unavailable',
        id,
        title: null,
        workspace: null,
        reason: '宿主未提供会话服务，无法读取该会话',
        record: null,
    }),
};
/** 关闭实时查询时的空实现（离线测试与降级用）。 */
export const disabledLiveQuota = {
    cached: () => new Map(),
    refreshIfStale: async () => new Map(),
};
export const EMPTY_LEDGER = { version: 0, days: {} };
/** 一天里最弱的那一格决定整天的角标：宁可标弱，也不把估算冒充成官方价。 */
export function weakestSource(sources) {
    if (sources.length === 0)
        return 'none';
    return sources.reduce(weakestOf, sources[0]);
}
export function pricingRowOf(model) {
    return {
        provider: model.provider,
        model: model.model,
        calls: model.calls,
        tokens: model.tokens,
        inputTokens: model.buckets.inputTokens ?? 0,
        outputTokens: model.buckets.outputTokens ?? 0,
        cacheReadTokens: model.buckets.cacheReadTokens ?? 0,
        cacheWriteTokens: model.buckets.cacheWriteTokens ?? 0,
    };
}
/** 台账模型行 → 计费行：分桶在顶层字段上，不是 `buckets`。 */
export function dayModelPricingRow(model) {
    return {
        provider: model.provider,
        model: model.model,
        calls: model.calls,
        tokens: model.inputTokens + model.outputTokens + model.cacheReadTokens,
        inputTokens: model.inputTokens,
        outputTokens: model.outputTokens,
        cacheReadTokens: model.cacheReadTokens,
        cacheWriteTokens: model.cacheWriteTokens ?? 0,
    };
}
/** 把「按天聚合的小时槽」转成定价用的行，供逐日错峰加权（单日与多天同口径）。 */
export function pricingHoursByDateOf(records) {
    const byDate = hoursByDateOf(records);
    if (byDate.size === 0)
        return null;
    const priced = new Map();
    for (const [date, hours] of byDate) {
        const rows = hoursAsPricingRows(hours);
        if (rows !== null)
            priced.set(date, rows);
    }
    return priced.size === 0 ? null : priced;
}
/** 单个小时槽的金额：该槽的逐模型桶按价目算，错峰按「星期几 + 小时」判定（与按天成本同一套价目）。 */
function hourCostOf(slot, weekday, hour) {
    const empty = { cost: null, costsByCurrency: {} };
    const models = slot.models;
    if (models === undefined || models.size === 0)
        return empty;
    const hourSlots = Array.from({ length: 24 }, () => ({
        provider: '', model: '', calls: 0, tokens: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0,
    }));
    let total = null;
    const byCurrency = {};
    for (const [key, model] of models) {
        const cut = key.indexOf('|');
        const provider = cut > 0 ? key.slice(0, cut) : '';
        const name = cut > 0 ? key.slice(cut + 1) : key;
        const inputTokens = model.buckets.inputTokens ?? 0;
        const outputTokens = model.buckets.outputTokens ?? 0;
        const cacheReadTokens = model.buckets.cacheReadTokens ?? 0;
        const cacheWriteTokens = model.buckets.cacheWriteTokens ?? 0;
        const row = { provider, model: name, calls: model.calls, tokens: inputTokens + outputTokens + cacheReadTokens, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens };
        hourSlots[hour] = row;
        const priced = priceRowsOf([row], { hours: hourSlots, hoursDay: weekday })[0];
        if (priced.cost === null || priced.rule === null)
            continue;
        total = (total ?? 0) + priced.cost;
        const currency = priced.rule.currency;
        byCurrency[currency] = Math.round(((byCurrency[currency] ?? 0) + priced.cost) * 100) / 100;
    }
    return { cost: total === null ? null : Math.round(total * 100) / 100, costsByCurrency: byCurrency };
}
/** 指定窗口内每天 24 小时的指标桶：给「按小时 / 按 6 小时」的图表用。 */
export function hourMetricsByDateOf(records, from, to) {
    const out = {};
    if (from === '' || to === '' || from > to)
        return out;
    for (const [date, slots] of hoursByDateOf(records)) {
        if (date < from || date > to)
            continue;
        const weekday = isoDayOf(new Date(date + 'T12:00:00'));
        out[date] = Array.from({ length: 24 }, (_, hour) => {
            const slot = slots[hour];
            if (slot === undefined)
                return { calls: 0, tokens: 0, outputTokens: 0, cacheReadTokens: 0, sessions: 0, cost: null, costsByCurrency: {} };
            const buckets = slot.buckets ?? {};
            const inputTokens = buckets.inputTokens ?? 0;
            const outputTokens = buckets.outputTokens ?? 0;
            const cacheReadTokens = buckets.cacheReadTokens ?? 0;
            return {
                calls: slot.calls,
                tokens: inputTokens + outputTokens + cacheReadTokens,
                outputTokens,
                cacheReadTokens,
                sessions: slot.sessions ?? (slot.calls > 0 ? 1 : 0),
                ...hourCostOf(slot, weekday >= 1 && weekday <= 7 ? weekday : 1, hour),
            };
        });
    }
    return out;
}
/** 一周 × 24 小时的指标矩阵（对象形态，给「按时段」多指标用）：calls / tokens 都是真值，cost 与 sessions 没有逐小时依据，宁可不给。 */
export function weekHourlyMetricsOf(byDate) {
    const cells = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ calls: 0, tokens: 0, sessions: 0, cost: null })));
    for (const [date, slots] of byDate) {
        const weekday = isoDayOf(new Date(date + 'T12:00:00'));
        if (!(weekday >= 1 && weekday <= 7))
            continue;
        const hours = cells[weekday - 1];
        for (let hour = 0; hour < 24; hour += 1) {
            const slot = slots[hour];
            if (slot === undefined)
                continue;
            const cell = hours[hour];
            cell.calls += slot.calls;
            cell.sessions += slot.sessions ?? (slot.calls > 0 ? 1 : 0);
            const buckets = slot.buckets ?? {};
            cell.tokens += (buckets.inputTokens ?? 0) + (buckets.outputTokens ?? 0) + (buckets.cacheReadTokens ?? 0);
            // 逐模型按价目算这一小时的成本：错峰窗口按「星期几 + 小时」判定，所以把该小时放回 24 槽里计价
            const rawModels = slot.models;
            const models = rawModels === undefined
                ? []
                : Array.isArray(rawModels)
                    ? [...rawModels]
                    : [...rawModels.entries()].map(([key, value]) => ({ key, calls: value.calls, tokens: value.tokens, buckets: value.buckets }));
            if (models.length === 0)
                continue;
            const hourSlots = Array.from({ length: 24 }, () => ({ provider: '', model: '', calls: 0, tokens: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }));
            let anHourCost = null;
            for (const model of models) {
                const row = hourlyModelPricingRowOf(model);
                hourSlots[hour] = row;
                const priced = priceRowsOf([row], { hours: hourSlots, hoursDay: weekday })[0];
                if (priced.cost === null || priced.rule === null)
                    continue;
                anHourCost = (anHourCost ?? 0) + priced.cost;
            }
            if (anHourCost !== null)
                cell.cost = Math.round((cell.cost ?? 0) + anHourCost * 100) / 100;
        }
    }
    return cells.map((hours, index) => ({ weekday: index + 1, hours }));
}
/** 折叠层只留了模型键（provider|model 或裸模型名）：拆出通道后再走两层价目匹配。 */
function hourlyModelPricingRowOf(model) {
    const cut = model.key.indexOf('|');
    const provider = cut > 0 ? model.key.slice(0, cut) : '';
    const name = cut > 0 ? model.key.slice(cut + 1) : model.key;
    const inputTokens = model.buckets.inputTokens ?? 0;
    const outputTokens = model.buckets.outputTokens ?? 0;
    const cacheReadTokens = model.buckets.cacheReadTokens ?? 0;
    const cacheWriteTokens = model.buckets.cacheWriteTokens ?? 0;
    return {
        provider,
        model: name,
        calls: model.calls,
        tokens: inputTokens + outputTokens + cacheReadTokens,
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheWriteTokens,
    };
}
export function weekHourlyOf(byDate) {
    const weeks = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    for (const [date, slots] of byDate) {
        // 星期取本地日历日：'YYYY-MM-DD' 直接 new Date 会按 UTC 解析，改在正午构造，避免时区把日期挪一天
        const weekday = isoDayOf(new Date(date + 'T12:00:00'));
        // 日期键不是合法日历日时跳过这一格：宁可少一格，也不要让整份快照构建失败
        if (!(weekday >= 1 && weekday <= 7))
            continue;
        const hours = weeks[weekday - 1];
        for (let hour = 0; hour < 24; hour += 1)
            hours[hour] += slots[hour]?.calls ?? 0;
    }
    return weeks.map((hours, index) => ({ weekday: index + 1, hours }));
}
export function hoursAsPricingRows(hours) {
    if (hours === null)
        return null;
    return hours.map((slot) => ({
        provider: '',
        model: '',
        calls: slot.calls,
        inputTokens: slot.buckets.inputTokens ?? 0,
        outputTokens: slot.buckets.outputTokens ?? 0,
        cacheReadTokens: slot.buckets.cacheReadTokens ?? 0,
        cacheWriteTokens: slot.buckets.cacheWriteTokens ?? 0,
    }));
}
/**
 * 一周 × 24 小时的调用数矩阵（原型「按时段」热力图）：weekday 1=周一 … 7=周日，hours 长度固定 24。
 * 每格是该星期几在该小时的调用数累加。
 */
/**
 * 缓存省下的钱（原型 KPI「缓存读 · 省 ¥X」）：逐天逐模型用「标准输入价 − 标准缓存读价」乘缓存读 tokens。
 * 价目走同一套两层匹配，都对不上价目的模型跳过（不猜价）；错峰价不参与，与 `/rates` 的单价表同口径。
 * 币种按价目原样分列，`cacheSaved` 是混币种直接相加（语义同 `cost`）。
 */
export function cacheSavingsOf(days) {
    const { savingsByCurrency } = summarizeCoverage(days.flatMap((day) => day.models.map(dayModelPricingRow)));
    const rounded = {};
    for (const [currency, amount] of Object.entries(savingsByCurrency))
        rounded[currency] = Math.round(amount * 100) / 100;
    const cacheSaved = Math.round(Object.values(rounded).reduce((sum, amount) => sum + amount, 0) * 100) / 100;
    return { cacheSaved, cacheSavedByCurrency: rounded };
}
/** 逐行求和；全为 null（无依据）时返回 null，界面显示 —。 */
export function sumOrNull(costs) {
    let total = 0;
    let matched = false;
    for (const entry of costs) {
        if (entry.cost === null)
            continue;
        total += entry.cost;
        matched = true;
    }
    return matched ? Math.round(total * 100) / 100 : null;
}
/**
 * 会话列表行里的模型构成：只保留前若干个（已按 tokens 降序），其余合并成一行「其它」。
 * 长尾模型一个个列出来只会把响应撑大 —— 逐模型成本仍然按**全量**算，合并行只影响展示。
 */
export const SESSION_MODEL_ROWS = 5;
export function cappedModelRows(row, costs) {
    const total = row.tokens;
    const all = row.models.map((model, index) => {
        const cost = costs[index]?.cost ?? null;
        const currency = costs[index]?.currency ?? null;
        return {
            ...model,
            sharePercent: total > 0 ? Math.round(model.tokens / total * 1000) / 10 : 0,
            cost,
            costSource: costs[index]?.source ?? 'none',
            partial: costs[index]?.partial === true,
            costsByCurrency: costsByCurrencyOf([{ cost, currency }]),
        };
    });
    if (all.length <= SESSION_MODEL_ROWS)
        return all;
    const head = all.slice(0, SESSION_MODEL_ROWS);
    const rest = all.slice(SESSION_MODEL_ROWS);
    const restCost = sumOrNull(rest);
    head.push({
        provider: '',
        model: '',
        tokens: rest.reduce((sum, model) => sum + model.tokens, 0),
        calls: rest.reduce((sum, model) => sum + model.calls, 0),
        sharePercent: Math.round(rest.reduce((sum, model) => sum + model.sharePercent, 0) * 10) / 10,
        buckets: {},
        cost: restCost,
        costSource: weakestSource(rest.map((model) => model.costSource)),
        partial: rest.some((model) => model.partial),
        costsByCurrency: alignMoneyWithCost(sumMoneyByCurrency(rest.map((model) => model.costsByCurrency)), restCost),
    });
    return head;
}
/** 某个通道在指定范围内的成本来源：取该通道所有模型行里最弱的那一格。 */
export function sourceOfProvider(days, provider, from, to) {
    const sources = [];
    for (const day of days) {
        if (day.date < from || day.date > to)
            continue;
        for (const model of day.models)
            if (model.provider === provider)
                sources.push(model.costSource);
    }
    return sources.length === 0 ? 'none' : weakestSource(sources);
}
/** 某个通道在指定范围内是否有「部分收录」的聚合价目（缺一档缓存价、按未命中价代）。 */
export function partialOfProvider(days, provider, from, to) {
    for (const day of days) {
        if (day.date < from || day.date > to)
            continue;
        for (const model of day.models) {
            if (model.provider === provider && model.partial)
                return true;
        }
    }
    return false;
}
/** 某个通道在指定范围内的按币种小计（取自该通道各模型行的拆分，不跨币种合计）。 */
export function moneyOfProvider(days, provider, from, to) {
    const parts = [];
    for (const day of days) {
        if (day.date < from || day.date > to)
            continue;
        for (const model of day.models) {
            if (model.provider === provider)
                parts.push(model.costsByCurrency);
        }
    }
    return sumMoneyByCurrency(parts);
}
/**
 * 空金额格子补一个零：`cost` 已知为 0、拆分里却一个币种都没有（该通道近 30 天没有用量）时，
 * 按台账币种记 0，保证「有金额就有币种」的形状一致。
 */
export function moneyOrZero(money, cost, currency) {
    if (cost !== 0 || Object.keys(money).length > 0)
        return money;
    return { [currency]: 0 };
}
export function sendJson(response, statusCode, body) {
    const payload = JSON.stringify(body);
    response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    response.end(payload);
}
function isLoopback(request) {
    const remoteAddress = request.socket.remoteAddress ?? '';
    return remoteAddress === '127.0.0.1' || remoteAddress === '::1' || remoteAddress === '::ffff:127.0.0.1';
}
/** dsh 家目录：与宿主一致地优先 DSH_HOME。 */
export function dshHomePath() {
    return process.env.DSH_HOME ?? join(homedir(), '.dsh');
}
export function dayKeyOf(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}
export function shiftedDayKey(offsetDays) {
    return dayKeyOf(new Date(Date.now() + offsetDays * 86400000));
}
export function channelPayload(channel) {
    return {
        ...channel,
        costLabel: costModeLabel(channel.costMode),
        quotaWindowLabel: channel.quotaWindowKey === null ? null : quotaWindowLabel(channel.quotaWindowKey),
    };
}
/** `/rates` 默认与上限：days 与合并序列同为 400，limit 上限 50。 */
export const RATES_DEFAULT_DAYS = 30;
export const RATES_MAX_DAYS = 400;
export const RATES_DEFAULT_LIMIT = 20;
export const RATES_MAX_LIMIT = 50;
/**
 * 单价表的 `note`：命中价目就用价目自己的口径说明（附带非「每百万 tokens」的单位提示）；
 * 两层价目都没命中时给一句可读说明（不允许空 note）。
 */
export function ratesNoteOf(hit) {
    if (hit !== null) {
        const unitHint = hit.rule.unit === 'perMillionTokens' ? '' : '（计价单位：' + UNIT_LABELS[hit.rule.unit] + '）';
        return hit.rule.note + unitHint;
    }
    return '暂无价格依据';
}
export function minKey(first, second) {
    if (first === undefined)
        return second;
    if (second === undefined)
        return first;
    return first < second ? first : second;
}
export function maxKey(first, second) {
    if (first === undefined)
        return second;
    if (second === undefined)
        return first;
    return first > second ? first : second;
}
export function parseLimit(raw, fallback) {
    if (raw === null)
        return fallback;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0)
        return fallback;
    return Math.min(parsed, 1000);
}
export function parseDays(raw) {
    if (raw === null)
        return RATES_DEFAULT_DAYS;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0)
        return RATES_DEFAULT_DAYS;
    return Math.min(parsed, RATES_MAX_DAYS);
}
export function parseRatesLimit(raw) {
    if (raw === null)
        return RATES_DEFAULT_LIMIT;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0)
        return RATES_DEFAULT_LIMIT;
    return Math.min(parsed, RATES_MAX_LIMIT);
}
/** `YYYY-MM-DD` 的真实日期（`2026-02-30` 这类溢出值不算）—— `/tools` 的窗口参数只认它。 */
function isDayKey(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
    const time = Date.parse(value);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}
/** `/tools` 的日期参数：非法值回落默认值。 */
export function parseDayParam(raw, fallback) {
    if (raw === null)
        return fallback;
    const value = raw.trim();
    return isDayKey(value) ? value : fallback;
}
/**
 * 逗号分隔的多选筛选参数：trim 后去重；参数缺省返回 null（= 不筛）。
 * 空串项是合法值（项目筛选里 = 「未归入工作区」），所以 `project=` 是「只筛未归入工作区」而不是不筛。
 */
export function parseMultiFilter(raw) {
    if (raw === null)
        return null;
    const values = new Set();
    for (const piece of raw.split(','))
        values.add(piece.trim());
    return values.size === 0 ? null : [...values];
}
/** `/snapshot` 可以按需下发的段（= `sections` 的键）；顶层其余字段一律原样保留。 */
export const SNAPSHOT_SECTION_NAMES = ['overview', 'channels', 'usage', 'heatmap', 'models', 'projects', 'sessions', 'prompts', 'tools', 'quota'];
/**
 * `?sections=a,b,c` → 要下发的段名集合；trim + 小写比对，未知名字忽略。
 * 不传、或裁剪后一个合法段都不剩时返回 null（= 全量下发）：客户端拼错段名不该拿到空壳响应，也不该报错。
 */
export function parseSections(raw) {
    if (raw === null)
        return null;
    const names = new Set();
    for (const piece of raw.split(',')) {
        const name = piece.trim().toLowerCase();
        if (SNAPSHOT_SECTION_NAMES.includes(name))
            names.add(name);
    }
    return names.size === 0 ? null : names;
}
/** 只裁剪下发的 `sections`；`building` / `buildSource` / `quotaRefreshing` / `updatedAt` / `version` / `issues` / `quotaOutcome` 全部保留。 */
export function trimSnapshotSections(view, names) {
    if (names === null)
        return view;
    const source = view.sections;
    const sections = {};
    for (const name of SNAPSHOT_SECTION_NAMES) {
        if (names.has(name))
            sections[name] = source[name];
    }
    return { ...view, sections: sections };
}
export function requireLoopback(request, response) {
    if (isLoopback(request))
        return true;
    sendJson(response, 403, { error: 'loopback only' });
    return false;
}
export function readTextFile(path) {
    try {
        return readFileSync(path, 'utf8');
    }
    catch {
        return null;
    }
}
/**
 * 项目页与侧边栏对齐：只有宿主工作区各占一行。
 *
 * 历史会话里会出现「曾经用过、但已不在工作区表里」的目录（旧项目、子目录），它们各占一行会让项目数与
 * 侧边栏对不上；这里把它们合并成一行（`workspace` 置空、`paths` 保留全部目录），用量与归档数照旧累加。
 */
export function collapseOrphanProjects(rows) {
    const orphans = rows.filter((row) => !row.registered);
    if (orphans.length === 0)
        return rows;
    const providers = {};
    for (const row of orphans) {
        for (const [provider, tokens] of Object.entries(row.providers))
            providers[provider] = (providers[provider] ?? 0) + tokens;
    }
    const costs = orphans.map((row) => row.cost);
    const cost = costs.some((value) => value === null) ? null : costs.reduce((sum, value) => sum + (value ?? 0), 0);
    const merged = {
        ...orphans[0],
        workspace: '',
        workspaceTitle: null,
        paths: orphans.flatMap((row) => row.paths),
        registered: false,
        calls: orphans.reduce((sum, row) => sum + row.calls, 0),
        tokens: orphans.reduce((sum, row) => sum + row.tokens, 0),
        sessionCount: orphans.reduce((sum, row) => sum + row.sessionCount, 0),
        archivedSessionCount: orphans.reduce((sum, row) => sum + row.archivedSessionCount, 0),
        lastTime: orphans.reduce((latest, row) => row.lastTime === null ? latest : (latest === null ? row.lastTime : Math.max(latest, row.lastTime)), null),
        providers,
        models: [],
        dominantProvider: Object.entries(providers).sort((first, second) => second[1] - first[1])[0]?.[0] ?? null,
        cost,
        costsByCurrency: sumMoneyByCurrency(orphans.map((row) => row.costsByCurrency)),
        costSource: weakestSource(orphans.map((row) => row.costSource)),
        partial: orphans.some((row) => row.partial === true),
    };
    return [...rows.filter((row) => row.registered), merged];
}
/**
 * 读 POST 请求体并当 JSON 解析：上限 128 KiB（日志批量远小于这个数），
 * 超限或解析失败一律返回 null —— 端点回 `{ok:false}`，不抛错、不缓冲整个响应体。
 * 走异步迭代（真实 `IncomingMessage` 与测试夹具都支持），避免依赖事件式读取。
 */
export async function readJsonBody(request, limitBytes = 128 * 1024) {
    let text = '';
    try {
        for await (const chunk of request) {
            text += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
            if (text.length > limitBytes)
                return null;
        }
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
/** 启动埋点：插件挂载时刻（模块加载即挂载前一刻），与首次快照请求对比可看出首屏是否被拖慢。 */
const bootMountedAtWallClock = Date.now();
let bootFirstViewLogged = false;
/** 记录首次快照请求（只记一次，写失败静默）。 */
export function logFirstView(building) {
    if (bootFirstViewLogged)
        return;
    bootFirstViewLogged = true;
    try {
        appendLogRecords([{
                time: new Date().toISOString(),
                level: 'info',
                source: 'boot',
                message: '首次快照请求',
                detail: '宿主进程已运行 ' + String(Math.round(process.uptime() * 1000)) + ' ms；距插件挂载 '
                    + String(Date.now() - bootMountedAtWallClock) + ' ms；返回时 building=' + String(building),
            }], logFilePath());
    }
    catch {
        // 埋点失败不影响主流程
    }
}
