/**
 * 计费口径：单价匹配、错峰判定、单位换算与费用 / 缓存省钱计算（纯函数，可离线单测）。
 *
 * 真价格只有两层，且都只读、不可编辑：内置官方价目（`pricing-catalog.yml`，随包发布）
 * 与 LiteLLM 聚合价（`data/litellm-model-prices.json` 或本机刷新副本，USD，见 model-prices.ts）。
 * 两层都没命中时由调用方回落「台账反推均价」。用户规则层已整条移除：不再读、不再写、
 * 不再出现在任何响应里（要改价就改随包价目，或让 agent 改它）。
 *
 * 成本优先级（routes 逐格取值）：台账当天**官方成本** > 内置官方价目（catalog）> 聚合价（aggregate）
 * > 台账反推均价（estimate）> 无（none，界面显示 —）。本模块负责中间两层与均价回落的判定。
 *
 * 币种：内置价目按文档原样记（CNY / USD），聚合价恒为 USD，**不做任何汇率换算**；
 * 需要跨币种展示时由客户端按用户选择的显示币种折算（服务端并列下发 `costsByCurrency`）。
 */
import { catalogRuleFor } from './pricing-catalog.js';
import { aggregateRuleFor } from './model-prices.js';
export const PRICING_UNITS = ['perMillionTokens', 'perThousandTokens', 'perCall'];
const UNIT_FACTORS = {
    perMillionTokens: 1e-6,
    perThousandTokens: 1e-3,
    // 按次计费与 token 数无关，单价字段直接用「输入」档当每次调用价
    perCall: 0,
};
/** 单位文字说明（界面与文档共用一份，避免两侧口径漂移）。 */
export const UNIT_LABELS = {
    perMillionTokens: '每百万 tokens',
    perThousandTokens: '每千 tokens',
    perCall: '每次调用',
};
/** 成本来源强弱序：数字越大越弱（官方账单最可信，无依据最弱）。 */
export const SOURCE_RANK = { official: 0, catalog: 1, aggregate: 2, estimate: 3, none: 4 };
/** 两个来源取更弱的那个：整批金额的来源由最弱的一格决定（宁可标弱，也不把估算冒充成官方价）。 */
export function weakestOf(current, candidate) {
    return SOURCE_RANK[candidate] > SOURCE_RANK[current] ? candidate : current;
}
/**
 * 设置服务里的 volatile 字段是 `{ get() }` 引用而不是裸值；
 * 框架用 `updateVolatile` 原地换内容，所以每次现取即是最新值（旧版 config 形状仍要兼容）。
 */
export function unwrapSettingValue(value) {
    if (value !== null && typeof value === 'object' && typeof value.get === 'function') {
        return value.get();
    }
    return value;
}
/**
 * 旧版 entry config 的兼容读法：宿主设置服务当年给的是**命名空间根对象**
 * （`{ pricing: … }`，见宿主 dsh-settings 的 `projectForm(form, plainConfig(config))`），
 * 字段在它下面。没有该键时（直传一段值、或配置里本来就只有这一段）就用整份值，两种形状都能读。
 */
export function settingsSectionOf(raw, key) {
    const value = unwrapSettingValue(raw);
    if (value === null || typeof value !== 'object')
        return value;
    const record = value;
    return key in record ? record[key] : value;
}
/**
 * `days` 归一：只接受 1–7 的整数并去重排序。
 * 非法值（空数组 / 越界 / 非整数 / 非数组）一律**返回 undefined = 每天适用**：
 * 这些值只会来自手改价目文件，把整段错峰作废会让金额突然变高，
 * 而「每天适用」正是缺省语义，最保守也最接近官方口径（不静默改变已有行为）。
 */
export function normalizeDays(raw) {
    if (!Array.isArray(raw))
        return undefined;
    const days = new Set();
    for (const entry of raw) {
        if (typeof entry !== 'number' || !Number.isInteger(entry) || entry < 1 || entry > 7)
            continue;
        days.add(entry);
    }
    if (days.size === 0)
        return undefined;
    return [...days].sort((first, second) => first - second);
}
/** `HH:MM` → 当天分钟数；`24:00` 归一为 1440。无法解析返回 null。 */
export function clockMinutes(text) {
    if (typeof text !== 'string')
        return null;
    const match = text.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (match === null)
        return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (minutes > 59)
        return null;
    if (hours === 24)
        return minutes === 0 ? 1440 : null;
    if (hours > 23)
        return null;
    return hours * 60 + minutes;
}
/**
 * 找一条可用于该行的价目：内置官方价目（CNY / USD，随包）> LiteLLM 聚合价（USD）。
 * 两层都不命中时返回 null，由调用方回落台账反推均价（或显示 —）。
 */
export function matchPricedRule(provider, model) {
    const catalogRule = catalogRuleFor(provider, model);
    if (catalogRule !== null)
        return { rule: catalogRule, source: 'catalog', partial: false };
    // 聚合价目是可选层：它坏掉只该让这一层失效，绝不能影响其它端点（上层已保证不抛错，这里再兜一次底）
    let aggregate = null;
    try {
        aggregate = aggregateRuleFor(provider, model);
    }
    catch {
        aggregate = null;
    }
    if (aggregate !== null && aggregate.ok)
        return { rule: aggregate.hit.rule, source: 'aggregate', partial: aggregate.hit.partial };
    return null;
}
/**
 * 一个时间点是否落在价目的错峰窗口内（按**本地时间**判断，跨午夜窗口取并集）。
 * 星期几也取本地时间，与时间判定保持同一口径。
 */
export function isOffPeakAt(rule, at) {
    if (rule.offPeak === null)
        return false;
    return isOffPeakAtMinutes(rule, at.getHours() * 60 + at.getMinutes(), isoDayOf(at));
}
/** ISO 星期：1=周一 … 7=周日（`Date.getDay()` 的 0=周日 映射过来）。 */
export function isoDayOf(at) {
    const day = at.getDay();
    return day === 0 ? 7 : day;
}
function isOffPeakAtMinutes(rule, minutes, day) {
    if (rule.offPeak === null)
        return false;
    for (const window of rule.offPeak.windows) {
        // days 缺省或非法都当作「每天」；这里再归一一次，防住绕过解析器的调用方
        const days = normalizeDays(window.days);
        if (day !== undefined && days !== undefined && !days.includes(day))
            continue;
        const from = clockMinutes(window.from);
        const to = clockMinutes(window.to);
        if (from === null || to === null)
            continue;
        // 起止相同视为「全天」：官方写 00:00–00:00 想表达的是一整天
        if (from === to)
            return true;
        if (from < to) {
            if (minutes >= from && minutes < to)
                return true;
        }
        else if (minutes >= from || minutes < to) {
            return true;
        }
    }
    return false;
}
/** 价目在某个时间点的生效单价；`at` 为 null（无法定位时间点）时按标准价，不猜折扣。 */
export function ratesAt(rule, at) {
    if (at === null || rule.offPeak === null || !isOffPeakAt(rule, at)) {
        return { rates: rule, offPeak: false };
    }
    return { rates: rule.offPeak, offPeak: true };
}
/** 展示口径 tokens：输入 + 输出 + 缓存读（不含 cacheWrite，与界面口径一致）。 */
export function displayTokensOf(row) {
    if (typeof row.tokens === 'number')
        return row.tokens;
    return (row.inputTokens ?? 0) + (row.outputTokens ?? 0) + (row.cacheReadTokens ?? 0);
}
/** 一档单价下的金额：`perCall` 用「输入」档当每次调用价，token 数不参与。 */
export function costOfRowAtRates(row, rule, rates) {
    if (rule.unit === 'perCall')
        return (row.calls ?? 0) * rates.input;
    const factor = UNIT_FACTORS[rule.unit];
    return ((row.inputTokens ?? 0) * rates.input
        + (row.cacheReadTokens ?? 0) * rates.cacheRead
        + (row.cacheWriteTokens ?? 0) * rates.cacheWrite
        + (row.outputTokens ?? 0) * rates.output) * factor;
}
/**
 * 错峰权重：一天里落在错峰窗口内的 tokens 占比（按小时槽取样，小时粒度取该小时中点判定）。
 * 小时槽只有整天的分桶、没有「模型 × 小时」的拆分，所以这是近似值；调用方拿不到小时数据时按 0 处理。
 * 只有整天的分桶、拿不到日期，因此带 `days` 的窗口在这里按「每天适用」算 —— 与实际一周里的
 * 星期分布无关，属有意近似（单日范围的加权本就更粗）。
 */
export function offPeakTokenShare(rule, hours) {
    if (rule.offPeak === null || hours === null || hours.length === 0)
        return 0;
    let total = 0;
    let offPeak = 0;
    for (let index = 0; index < hours.length; index += 1) {
        const tokens = displayTokensOf(hours[index]);
        if (tokens <= 0)
            continue;
        total += tokens;
        if (isOffPeakAtMinutes(rule, index * 60 + 30))
            offPeak += tokens;
    }
    return total > 0 ? offPeak / total : 0;
}
/**
 * 按命中价目估算一组行的成本（内置官方价目 > 聚合价；两层都没命中时 cost 为 null）。
 * @param at - 时间点；null 表示这段用量跨了峰谷、无法定位，按标准价算（不猜折扣）
 * @param hours - 24 个小时槽（本地时间，索引即小时）；给了就按错峰占比加权
 */
export function priceRowsOf(rows, options = {}) {
    const at = options.at ?? null;
    const sharedHours = options.hours ?? null;
    return rows.map((row) => {
        const matched = matchPricedRule(row.provider, row.model);
        if (matched === null) {
            return { cost: null, source: 'none', rule: null, offPeak: false, partial: false, cacheSavings: 0 };
        }
        const rule = matched.rule;
        const standard = costOfRowAtRates(row, rule, rule);
        const share = rule.offPeak === null
            ? (at !== null && isOffPeakAt(rule, at) ? 1 : 0)
            : offPeakTokenShare(rule, sharedHours);
        const offPeakCost = rule.offPeak === null ? standard : costOfRowAtRates(row, rule, rule.offPeak);
        const cost = standard * (1 - share) + offPeakCost * share;
        return {
            cost,
            source: matched.source,
            rule,
            offPeak: share >= 1,
            partial: matched.partial,
            // 省下的钱 = 命中缓存的 tokens ×（未命中价 − 命中价），按要求只用标准价
            cacheSavings: rule.unit === 'perCall' ? 0 : (row.cacheReadTokens ?? 0) * (rule.input - rule.cacheRead) * UNIT_FACTORS[rule.unit],
        };
    });
}
function round4(value) {
    return Math.round(value * 10000) / 10000;
}
function round2(value) {
    return Math.round(value * 100) / 100;
}
/**
 * 逐行定价：内置官方价目 > LiteLLM 聚合价，都没命中时回落调用方给的均价查价（台账反推均价）。
 */
export function rowCostsOf(rows, averagePrice = () => null, options = {}) {
    const priced = priceRowsOf(rows, options);
    return rows.map((row, index) => {
        const hit = priced[index];
        if (hit.cost !== null && hit.rule !== null) {
            return {
                cost: round2(hit.cost),
                source: hit.source,
                rule: hit.rule,
                partial: hit.partial,
                cacheSavings: hit.cacheSavings,
                currency: hit.rule.currency,
            };
        }
        const average = averagePrice(row);
        if (average !== null) {
            return { cost: round2(average.cost), source: 'estimate', rule: null, partial: false, cacheSavings: 0, currency: average.currency };
        }
        return { cost: null, source: 'none', rule: null, partial: false, cacheSavings: 0, currency: null };
    });
}
export function addMoney(target, currency, amount) {
    target[currency] = round4((target[currency] ?? 0) + amount);
    return target;
}
/**
 * 把一组金额格按币种分组（金额保留两位小数）。
 * 累加顺序与调用方算 `cost` 的顺序一致，因此**单币种时拆分值与 `cost` 完全相同**（只是同一个和的另一种写法）。
 * 金额为 null（无依据）的格子不参与；没有币种的格子直接跳过（宁可少一行小计，也不硬塞一个币种）。
 */
export function costsByCurrencyOf(cells) {
    const sums = {};
    for (const cell of cells) {
        if (cell.cost === null || cell.currency === null)
            continue;
        sums[cell.currency] = (sums[cell.currency] ?? 0) + cell.cost;
    }
    for (const currency of Object.keys(sums))
        sums[currency] = round2(sums[currency]);
    return sums;
}
/** 合并子行的按币种金额（父行的小计）：单币种时同样等于父行 `cost`。 */
export function sumMoneyByCurrency(parts) {
    const sums = {};
    for (const part of parts) {
        for (const [currency, amount] of Object.entries(part))
            sums[currency] = (sums[currency] ?? 0) + amount;
    }
    for (const currency of Object.keys(sums))
        sums[currency] = round2(sums[currency]);
    return sums;
}
/**
 * 把父金额与它的按币种拆分对齐：单币种时拆分值直接取父金额（两者是同一个和，只是累加顺序不同
 * 会带来浮点尾差）；多币种或父金额为 null 时原样返回。保证「单币种时拆分值等于 cost」这条契约。
 */
export function alignMoneyWithCost(money, cost) {
    const currencies = Object.keys(money);
    if (cost === null || currencies.length !== 1)
        return money;
    return { [currencies[0]]: cost };
}
/**
 * 覆盖度统计（计费面板用）：按 `provider|model` 数出命中内置官方价目 / 命中聚合价 /
 * 回落均价 / 无依据，并按**所有行**累加金额与缓存省钱（各按自己的币种分组，跨币种不换算不合计）。
 * `partialModels` = 命中的聚合价目里缺一档缓存价（按未命中价代）的模型数。
 */
export function summarizeCoverage(rows, averagePrice = () => null) {
    const costByCurrency = {};
    const savingsByCurrency = {};
    const savingsByModel = new Map();
    const catalogKeys = new Set();
    const aggregateKeys = new Set();
    const partialKeys = new Set();
    const averagedKeys = new Set();
    const unpricedKeys = new Set();
    for (const row of rows) {
        const key = row.provider + '|' + row.model;
        const priced = priceRowsOf([row])[0];
        if (priced.cost === null || priced.rule === null) {
            // 与成本口径一致：先看台账反推均价还能不能给出数字，再判「无依据」
            if (averagePrice(row) !== null)
                averagedKeys.add(key);
            else
                unpricedKeys.add(key);
            continue;
        }
        if (priced.source === 'catalog')
            catalogKeys.add(key);
        else
            aggregateKeys.add(key);
        if (priced.partial)
            partialKeys.add(key);
        addMoney(costByCurrency, priced.rule.currency, priced.cost);
        if (priced.cacheSavings <= 0)
            continue;
        addMoney(savingsByCurrency, priced.rule.currency, priced.cacheSavings);
        const bucket = savingsByModel.get(key);
        if (bucket === undefined) {
            savingsByModel.set(key, {
                provider: row.provider,
                model: row.model,
                currency: priced.rule.currency,
                cacheReadTokens: row.cacheReadTokens ?? 0,
                amount: priced.cacheSavings,
            });
            continue;
        }
        bucket.cacheReadTokens += row.cacheReadTokens ?? 0;
        bucket.amount += priced.cacheSavings;
    }
    const savingsDetail = [...savingsByModel.values()]
        .map((entry) => ({ ...entry, amount: round4(entry.amount) }))
        .sort((first, second) => second.amount - first.amount);
    return {
        catalogModels: catalogKeys.size,
        aggregateModels: aggregateKeys.size,
        partialModels: partialKeys.size,
        averagedModels: averagedKeys.size,
        unpricedModels: unpricedKeys.size,
        costByCurrency,
        savingsByCurrency,
        savingsDetail,
    };
}
