import { attributeModelKey } from './session-usage.js';
/** 把会话记录摊平成按天行（provider 用已知通道名归一）。 */
export function sessionDayRows(records, knownProviders) {
    const rows = [];
    for (const record of records) {
        for (const day of record.summary.days) {
            for (const model of day.models) {
                const attribution = attributeModelKey(model.key, knownProviders);
                rows.push({
                    date: day.date,
                    provider: attribution.provider,
                    model: attribution.model,
                    calls: model.calls,
                    inputTokens: model.buckets.inputTokens,
                    outputTokens: model.buckets.outputTokens,
                    cacheReadTokens: model.buckets.cacheReadTokens,
                    cacheWriteTokens: model.buckets.cacheWriteTokens,
                });
            }
        }
    }
    return rows;
}
const DAY_MS = 86400000;
/** 单次合并最多铺多少天的骨架；超过时**从 to 往前**取最近这些天（不要丢掉最新数据）。 */
const MAX_RANGE_DAYS = 400;
function dateKeysOf(from, to) {
    if (from === '' || to === '')
        return [];
    const start = new Date(from + 'T00:00:00Z').getTime();
    const end = new Date(to + 'T00:00:00Z').getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
        return [];
    const span = Math.floor((end - start) / DAY_MS) + 1;
    const total = Math.min(span, MAX_RANGE_DAYS);
    // 超长区间取「最近」的那一段：用户看「全部」时关心的是最近的量，丢最新数据会直接算错环比
    const firstOffset = span - total;
    const keys = [];
    for (let offset = firstOffset; offset < span; offset += 1) {
        keys.push(new Date(start + offset * DAY_MS).toISOString().slice(0, 10));
    }
    return keys;
}
function synthesizeDay(date, rows) {
    // 同一天同一模型可能来自多个会话，必须先按 `provider|model` 合并，
    // 否则热力图与每日细目会出现多条同名重复行。
    const byModel = new Map();
    let calls = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;
    let cacheWriteTokens = 0;
    for (const row of rows) {
        calls += row.calls;
        inputTokens += row.inputTokens;
        outputTokens += row.outputTokens;
        cacheReadTokens += row.cacheReadTokens;
        cacheWriteTokens += row.cacheWriteTokens;
        const key = row.provider + '|' + row.model;
        const entry = byModel.get(key);
        if (entry === undefined) {
            byModel.set(key, {
                date,
                provider: row.provider,
                model: row.model,
                calls: row.calls,
                inputTokens: row.inputTokens,
                outputTokens: row.outputTokens,
                cacheReadTokens: row.cacheReadTokens,
                cacheWriteTokens: row.cacheWriteTokens,
                reasoningTokens: 0,
                // 会话事件没有官方成本，成本列对这些天留 0，由界面按计费模式展示
                cost: 0,
            });
            continue;
        }
        entry.calls += row.calls;
        entry.inputTokens += row.inputTokens;
        entry.outputTokens += row.outputTokens;
        entry.cacheReadTokens += row.cacheReadTokens;
        entry.cacheWriteTokens += row.cacheWriteTokens;
    }
    const models = [...byModel.values()];
    return {
        date,
        provider: '',
        calls,
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheWriteTokens,
        reasoningTokens: 0,
        cost: 0,
        models: models.sort((first, second) => (second.inputTokens + second.outputTokens + second.cacheReadTokens)
            - (first.inputTokens + first.outputTokens + first.cacheReadTokens)),
    };
}
/**
 * 合并台账与会话序列（按天取舍）。
 */
export function mergeDailySeries(ledgerDays, sessionRows, from, to) {
    const ledgerByDate = new Map(ledgerDays.map((day) => [day.date, day]));
    const sessionByDate = new Map();
    for (const row of sessionRows) {
        const bucket = sessionByDate.get(row.date);
        if (bucket === undefined)
            sessionByDate.set(row.date, [row]);
        else
            bucket.push(row);
    }
    const days = [];
    const sessionDates = [];
    for (const date of dateKeysOf(from, to)) {
        const ledgerDay = ledgerByDate.get(date);
        if (ledgerDay !== undefined) {
            days.push(ledgerDay);
            continue;
        }
        const rows = sessionByDate.get(date);
        if (rows === undefined || rows.length === 0)
            continue;
        sessionDates.push(date);
        days.push(synthesizeDay(date, rows));
    }
    return { days, sessionDates };
}
/** 合并后的范围总计（展示口径 tokens 不含 cacheWrite）。 */
export function totalsOfMerged(days) {
    const totals = { date: '', calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, cost: 0 };
    for (const day of days) {
        totals.calls += day.calls;
        totals.inputTokens += day.inputTokens;
        totals.outputTokens += day.outputTokens;
        totals.cacheReadTokens += day.cacheReadTokens;
        totals.cacheWriteTokens += day.cacheWriteTokens;
        totals.reasoningTokens += day.reasoningTokens;
        totals.cost += day.cost;
    }
    return totals;
}
export function summarizeMergedByProvider(days, from, to) {
    const byProvider = new Map();
    for (const day of days) {
        if (day.date < from || day.date > to)
            continue;
        for (const model of day.models) {
            let summary = byProvider.get(model.provider);
            if (summary === undefined) {
                summary = { provider: model.provider, calls: 0, tokens: 0, cost: 0 };
                byProvider.set(model.provider, summary);
            }
            summary.calls += model.calls;
            summary.tokens += model.inputTokens + model.outputTokens + model.cacheReadTokens;
            summary.cost += model.cost;
        }
    }
    return [...byProvider.values()];
}
/** 会话记录里是否有指定日期的数据（总览标注来源用）。 */
export function hasSessionDate(records, date) {
    return records.some((record) => record.summary.days.some((day) => day.date === date && day.tokens > 0));
}
