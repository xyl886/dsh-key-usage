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
                });
            }
        }
    }
    return rows;
}
const DAY_MS = 86400000;
const MAX_RANGE_DAYS = 400;
function dateKeysOf(from, to) {
    if (from === '' || to === '')
        return [];
    const start = new Date(from + 'T00:00:00Z').getTime();
    const end = new Date(to + 'T00:00:00Z').getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
        return [];
    const total = Math.min(Math.floor((end - start) / DAY_MS) + 1, MAX_RANGE_DAYS);
    const keys = [];
    for (let offset = 0; offset < total; offset += 1) {
        keys.push(new Date(start + offset * DAY_MS).toISOString().slice(0, 10));
    }
    return keys;
}
function synthesizeDay(date, rows) {
    const models = [];
    let calls = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;
    for (const row of rows) {
        calls += row.calls;
        inputTokens += row.inputTokens;
        outputTokens += row.outputTokens;
        cacheReadTokens += row.cacheReadTokens;
        models.push({
            date,
            provider: row.provider,
            model: row.model,
            calls: row.calls,
            inputTokens: row.inputTokens,
            outputTokens: row.outputTokens,
            cacheReadTokens: row.cacheReadTokens,
            reasoningTokens: 0,
            // 会话事件没有官方成本，成本列对这些天留 0，由界面按计费模式展示
            cost: 0,
        });
    }
    return {
        date,
        provider: '',
        calls,
        inputTokens,
        outputTokens,
        cacheReadTokens,
        reasoningTokens: 0,
        cost: 0,
        models: models.sort((first, second) => (second.inputTokens + second.outputTokens + second.cacheReadTokens)
            - (first.inputTokens + first.outputTokens + first.cacheReadTokens)),
    };
}
/**
 * 合并台账与会话序列（按天取舍）。
 * @param ledgerDays - 台账范围聚合结果
 * @param sessionRows - 会话事件摊平行（可先按通道过滤）
 * @param from - 范围起始（含）
 * @param to - 范围结束（含）
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
    const totals = { date: '', calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, reasoningTokens: 0, cost: 0 };
    for (const day of days) {
        totals.calls += day.calls;
        totals.inputTokens += day.inputTokens;
        totals.outputTokens += day.outputTokens;
        totals.cacheReadTokens += day.cacheReadTokens;
        totals.reasoningTokens += day.reasoningTokens;
        totals.cost += day.cost;
    }
    return totals;
}
/** 按通道汇总合并序列（总览「今日 / 近 30 天」用）。 */
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
