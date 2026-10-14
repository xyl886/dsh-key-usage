/**
 * 预算与告警：把「今日 / 本月用量」与阈值折成 ok / near / over 三档（纯函数，可离线单测）。
 *
 * 阈值与计费规则同住宿主设置服务的 `dsh-key-usage` 命名空间（见 index.ts 的 `Config.budget`），
 * 本模块不读文件、不联网。口径：「日」「月」按**本地日历日 / 日历月**切分；Tokens 用**展示口径**
 * （输入 + 输出 + 缓存读，不含缓存写）；成本**按币种独立比较**，不换算、不合计。
 * 告警只是提示，不阻断任何操作。
 */
import { settingsSectionOf } from './pricing.js';
export const EMPTY_BUDGET = { dailyTokens: 0, monthlyTokens: 0, monthlyCost: [] };
/** 接近阈值：使用率到达这条线就提醒（提前量，不随配置变化）。 */
export const NEAR_PERCENT = 80;
/** 单币种上限条数上限：设置里的值不可信，超出的丢弃，避免一次请求把界面撑爆。 */
const MAX_COST_LIMITS = 12;
/** 阈值的唯一合法形态是「有限且大于 0」；其余（负数 / 字符串 / NaN）一律折算成 0 = 不启用。 */
function limitOr(value) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}
/**
 * 防御式解析设置值：命名空间根对象（`{ budget: … }`）与直接给这一段的两种形状都接受。
 * 上限为 0 或金额非法的条目直接丢掉 —— 留着只会在界面上显示「0 上限」的假条目。
 */
export function normalizeBudget(raw) {
    const value = settingsSectionOf(raw, 'budget');
    if (value === null || typeof value !== 'object')
        return EMPTY_BUDGET;
    const record = value;
    const candidates = Array.isArray(record.monthlyCost) ? record.monthlyCost.slice(0, MAX_COST_LIMITS) : [];
    const monthlyCost = [];
    for (const entry of candidates) {
        if (entry === null || typeof entry !== 'object')
            continue;
        const fields = entry;
        const currency = typeof fields.currency === 'string' ? fields.currency.trim() : '';
        const amount = limitOr(fields.amount);
        if (currency === '' || amount === 0)
            continue;
        monthlyCost.push({ currency, amount });
    }
    return {
        dailyTokens: limitOr(record.dailyTokens),
        monthlyTokens: limitOr(record.monthlyTokens),
        monthlyCost,
    };
}
function percentOf(used, limit) {
    return Math.round(used / limit * 1000) / 10;
}
function levelOf(percent) {
    if (percent >= 100)
        return 'over';
    if (percent >= NEAR_PERCENT)
        return 'near';
    return 'ok';
}
const LEVEL_RANK = { ok: 0, near: 1, over: 2 };
/**
 * 判定：逐项算使用率，整体取**最严重**的那一项（日与月同时配置时不会互相掩盖）。
 * 没有任何有效阈值时 `enabled:false`、`level:'ok'`、`entries:[]` —— 界面据此完全不渲染。
 * @param usage - 读数；缺的币种按 0 处理（该币种本月没花钱）
 */
export function evaluateBudget(thresholds, usage) {
    const entries = [];
    const push = (kind, rawUsed, limit, currency) => {
        // limit <= 0 = 该项不启用；顺带挡掉除零，percent 永远是可用的有限数
        if (!(limit > 0))
            return;
        const used = Number.isFinite(rawUsed) ? rawUsed : 0;
        entries.push({
            kind,
            ...(currency === undefined ? {} : { currency }),
            used,
            limit,
            percent: percentOf(used, limit),
        });
    };
    push('dailyTokens', usage.todayTokens, thresholds.dailyTokens);
    push('monthlyTokens', usage.monthTokens, thresholds.monthlyTokens);
    for (const entry of thresholds.monthlyCost) {
        push('monthlyCost', usage.monthCostByCurrency[entry.currency] ?? 0, entry.amount, entry.currency);
    }
    if (entries.length === 0)
        return { enabled: false, level: 'ok', entries };
    let level = 'ok';
    for (const entry of entries) {
        const candidate = levelOf(entry.percent);
        if (LEVEL_RANK[candidate] > LEVEL_RANK[level])
            level = candidate;
    }
    return { enabled: true, level, entries };
}
