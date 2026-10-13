/**
 * 计费规则：用户可维护的单价表，作为成本估算的一手依据（替代「台账反推均价」）。
 *
 * 规则本体存放在宿主设置服务的 `dsh-key-usage` 命名空间里（见 index.ts 的 Config），
 * 本模块只做纯函数：归一化、优先级匹配、错峰判定、单位换算与费用 / 缓存省钱计算。
 * 不读文件、不联网，因此可以完全离线单测。
 *
 * 成本优先级：台账当天的**官方成本**（routes 直接用台账字段）> 用户规则 > 内置官方价目 > 台账反推均价
 * > 无（显示 —）。本模块负责「用户规则」与「内置官方价目」这两层。
 */
import { catalogRuleFor } from './pricing-catalog.js';
export const PRICING_UNITS = ['perMillionTokens', 'perThousandTokens', 'perCall'];
const UNIT_FACTORS = {
    perMillionTokens: 1e-6,
    perThousandTokens: 1e-3,
    // 按次计费与 token 数无关，单价字段直接用「输入」档当每次调用价
    perCall: 0,
};
/** 规则条数上限：设置里的值不可信，超出的部分直接丢弃，避免一次请求把 CPU 打满。 */
const MAX_RULES = 200;
export const EMPTY_PRICING = { version: 1, currency: 'CNY', rules: [] };
export const EMPTY_PRICING_VIEW = { config: EMPTY_PRICING, writable: false, revision: null };
/** 单位文字说明（界面与文档共用一份，避免两侧口径漂移）。 */
export const UNIT_LABELS = {
    perMillionTokens: '每百万 tokens',
    perThousandTokens: '每千 tokens',
    perCall: '每次调用',
};
/**
 * 设置服务里的 volatile 字段是 `{ get() }` 引用而不是裸值；
 * 框架用 `updateVolatile` 原地换内容，所以每次现取即是最新值。
 */
export function unwrapSettingValue(value) {
    if (value !== null && typeof value === 'object' && typeof value.get === 'function') {
        return value.get();
    }
    return value;
}
function finiteOr(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}
function textOr(value, fallback) {
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback;
}
function ratesOf(raw, fallback) {
    return {
        input: finiteOr(raw.input, fallback.input),
        cacheRead: finiteOr(raw.cacheRead, fallback.cacheRead),
        cacheWrite: finiteOr(raw.cacheWrite, fallback.cacheWrite),
        output: finiteOr(raw.output, fallback.output),
    };
}
/**
 * `days` 归一：只接受 1–7 的整数并去重排序。
 * 非法值（空数组 / 越界 / 非整数 / 非数组）一律**返回 undefined = 每天适用**：
 * 这些值只会来自手改 JSON 或旧配置，把整段错峰作废会让金额突然变高，
 * 而「每天适用」正是缺省语义，最保守也最接近用户原意（不静默改变已有行为）。
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
function windowsOf(raw) {
    if (!Array.isArray(raw))
        return [];
    const windows = [];
    for (const entry of raw) {
        if (typeof entry !== 'object' || entry === null)
            continue;
        const from = entry.from;
        const to = entry.to;
        if (clockMinutes(from) === null || clockMinutes(to) === null)
            continue;
        const days = normalizeDays(entry.days);
        windows.push({ from: from.trim(), to: to.trim(), ...(days === undefined ? {} : { days }) });
    }
    return windows;
}
/**
 * 防御式解析设置值：设置服务里的内容是用户手填 / 导入的，任何字段都可能缺失或类型不对。
 * 无法解释的规则整条丢弃（而不是填 0），否则 0 价会被当成「免费」静默算错。
 */
export function normalizePricing(raw) {
    const value = unwrapSettingValue(raw);
    if (typeof value !== 'object' || value === null)
        return EMPTY_PRICING;
    const record = value;
    const currency = textOr(record.currency, EMPTY_PRICING.currency);
    const rules = [];
    const rawRules = Array.isArray(record.rules) ? record.rules.slice(0, MAX_RULES) : [];
    for (const entry of rawRules) {
        if (typeof entry !== 'object' || entry === null)
            continue;
        const rule = entry;
        const provider = textOr(rule.provider, '*');
        const model = textOr(rule.model, '*');
        const unit = PRICING_UNITS.includes(rule.unit) ? rule.unit : 'perMillionTokens';
        const base = ratesOf(rule, { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 });
        let offPeak = null;
        if (typeof rule.offPeak === 'object' && rule.offPeak !== null) {
            const offPeakRecord = rule.offPeak;
            const windows = windowsOf(offPeakRecord.windows);
            // 没有可用窗口的错峰段等同于没填：留着会让人以为折扣生效了
            if (windows.length > 0)
                offPeak = { ...ratesOf(offPeakRecord, base), windows };
        }
        rules.push({
            provider,
            model,
            unit,
            currency: textOr(rule.currency, currency),
            ...base,
            offPeak,
            note: typeof rule.note === 'string' ? rule.note : '',
        });
    }
    return {
        version: typeof record.version === 'number' && Number.isFinite(record.version) ? record.version : 1,
        currency,
        rules,
    };
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
 * 规则匹配：`provider+model` 精确 → `provider+*` → `*+model` → `*+*`。
 * 同一档内按规则声明顺序取第一条，用户可以用上下移动调整优先级。
 */
export function matchPricingRule(rules, provider, model) {
    const tiers = [
        (rule) => rule.provider === provider && rule.model === model,
        (rule) => rule.provider === provider && rule.model === '*',
        (rule) => rule.provider === '*' && rule.model === model,
        (rule) => rule.provider === '*' && rule.model === '*',
    ];
    for (const matches of tiers) {
        const hit = rules.find(matches);
        if (hit !== undefined)
            return hit;
    }
    return null;
}
/**
 * 找一条可用于该行的价目：用户规则优先，没命中再查内置官方价目。
 * 内置价目不落盘、用户也不可编辑，因此只有「查得到 / 查不到」两种结果。
 */
export function matchPricedRule(rules, provider, model) {
    const userRule = matchPricingRule(rules, provider, model);
    if (userRule !== null)
        return { rule: userRule, source: 'rule' };
    const catalogRule = catalogRuleFor(provider, model);
    if (catalogRule !== null)
        return { rule: catalogRule, source: 'catalog' };
    return null;
}
/**
 * 一个时间点是否落在规则的错峰窗口内（按**本地时间**判断，跨午夜窗口取并集）。
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
        // days 缺省或非法都当作「每天」；这里再归一一次，防住绕过 normalizePricing 的调用方
        const days = normalizeDays(window.days);
        if (day !== undefined && days !== undefined && !days.includes(day))
            continue;
        const from = clockMinutes(window.from);
        const to = clockMinutes(window.to);
        if (from === null || to === null)
            continue;
        // 起止相同视为「全天」：用户写 00:00–00:00 想表达的是一整天
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
/** 该规则此刻是否处于错峰（规则面板上的「错峰中」角标）。 */
export function isOffPeakNow(rule, at = new Date()) {
    return isOffPeakAt(rule, at);
}
/** 规则生效的四档单价；`at` 为 null（无法定位时间点）时按标准价。 */
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
function costAtRates(row, rule, rates) {
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
 * 按规则估算一组行的成本。
 * @param at - 时间点；null 表示这段用量跨了峰谷、无法定位，按标准价算（不猜折扣）
 * @param hours - 24 个小时槽（本地时间，索引即小时）；给了就按错峰占比加权
 */
export function priceRowsByRules(rows, config, options = {}) {
    const at = options.at ?? null;
    const sharedHours = options.hours ?? null;
    return rows.map((row) => {
        const matched = matchPricedRule(config.rules, row.provider, row.model);
        if (matched === null) {
            return { cost: null, source: 'none', rule: null, offPeak: false, cacheSavings: 0 };
        }
        const rule = matched.rule;
        const standard = costAtRates(row, rule, rule);
        const share = rule.offPeak === null
            ? (at !== null && isOffPeakAt(rule, at) ? 1 : 0)
            : offPeakTokenShare(rule, sharedHours);
        const offPeakCost = rule.offPeak === null ? standard : costAtRates(row, rule, rule.offPeak);
        const cost = standard * (1 - share) + offPeakCost * share;
        return {
            cost,
            source: matched.source,
            rule,
            offPeak: share >= 1,
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
 * 逐行定价：用户规则 > 内置官方价目，都没命中时回落调用方给的均价查价（台账反推均价）。
 * @param averagePrice - 台账反推均价查价函数（由调用方注入，避免本模块依赖 ledger）
 */
export function rowCostsOf(rows, config, averagePrice = () => null, options = {}) {
    const priced = priceRowsByRules(rows, config, options);
    return rows.map((row, index) => {
        const hit = priced[index];
        if (hit.cost !== null) {
            return { cost: round2(hit.cost), source: hit.source, rule: hit.rule, cacheSavings: hit.cacheSavings };
        }
        const average = averagePrice(row);
        if (average !== null)
            return { cost: average, source: 'estimate', rule: null, cacheSavings: 0 };
        return { cost: null, source: 'none', rule: null, cacheSavings: 0 };
    });
}
/** 组合「用户规则 → 内置官方价目 → 台账反推均价」三层估算，给出金额、最弱来源、命中行数与缓存省钱。 */
export function costOfUsageRows(rows, config, averagePrice = () => null, options = {}) {
    const priced = rowCostsOf(rows, config, averagePrice, options);
    let total = 0;
    let matched = false;
    let ruleRows = 0;
    let cacheSavings = 0;
    let weakest = 'official';
    for (const row of priced) {
        if (row.cost === null)
            continue;
        total += row.cost;
        matched = true;
        cacheSavings += row.cacheSavings;
        if (row.source === 'rule' || row.source === 'catalog')
            ruleRows += 1;
        weakest = weakestOf(weakest, row.source);
    }
    if (!matched)
        return { cost: null, source: 'none', ruleRows: 0, cacheSavings: 0 };
    return {
        cost: round2(total),
        source: weakest,
        ruleRows,
        cacheSavings: round4(cacheSavings),
    };
}
/** 两个来源取更弱的那个（与 routes 的 `weakestSource` 同一顺序）。 */
function weakestOf(current, candidate) {
    const rank = { official: 0, rule: 1, catalog: 2, estimate: 3, none: 4 };
    return rank[candidate] > rank[current] ? candidate : current;
}
export function addMoney(target, currency, amount) {
    target[currency] = round4((target[currency] ?? 0) + amount);
    return target;
}
/**
 * 覆盖度统计（计费面板用）：按 `provider|model` 数出命中用户规则 / 命中内置价目 / 回落均价 / 无依据，
 * 并按**所有行**累加金额与缓存省钱（各按价目自己的币种分组，跨币种不换算不合计）。
 */
export function summarizeCoverage(rows, config, averagePrice = () => null) {
    const costByCurrency = {};
    const savingsByCurrency = {};
    const savingsByModel = new Map();
    const rulerKeys = new Set();
    const catalogKeys = new Set();
    const averagedKeys = new Set();
    const unpricedKeys = new Set();
    for (const row of rows) {
        const key = row.provider + '|' + row.model;
        const priced = priceRowsByRules([row], config)[0];
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
            rulerKeys.add(key);
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
        ruleModels: rulerKeys.size,
        catalogModels: catalogKeys.size,
        averagedModels: averagedKeys.size,
        unpricedModels: unpricedKeys.size,
        costByCurrency,
        savingsByCurrency,
        savingsDetail,
    };
}
/**
 * DeepSeek 错峰窗口（本地时间）：高峰 = 周一至周五 09:00–12:00 与 14:00–18:00，
 * 其余时段全是错峰，因此三段窗口都限定 `days` 为工作日，周末另给一条全天窗口。
 */
const DEEPSEEK_RULE_OFFPEAK_WINDOWS = [
    { from: '00:00', to: '09:00', days: [1, 2, 3, 4, 5] },
    { from: '12:00', to: '14:00', days: [1, 2, 3, 4, 5] },
    { from: '18:00', to: '00:00', days: [1, 2, 3, 4, 5] },
    { from: '00:00', to: '00:00', days: [6, 7] },
];
/**
 * 内置价目模板：只提供**结构与官方数值**，套用后由用户自行核对/修改。
 * 数值来自 docs/05 附录 A.5（2026-10-13 抓取）。
 * DeepSeek 取**中文文档的 CNY 价**（英文页同价不同币种）：peak = 北京时间周一至周五
 * 09:00–12:00 与 14:00–18:00，其余时段半价；错峰窗口因此必须带 `days`，
 * 否则周末会被算成高峰。法定节假日没有日历可查，仍按高峰价算，已在 note 写明。
 */
export const PRICING_TEMPLATES = [
    {
        id: 'deepseek',
        label: 'DeepSeek 官方',
        note: 'CNY / 百万 tokens；错峰 = 高峰半价。高峰为北京时间周一至周五（仅工作日）09:00–12:00 与 14:00–18:00，其余时段（含周末全天）为错峰；中国法定节假日无法表达，会按高峰价算。来源：https://api-docs.deepseek.com/zh-cn/quick_start/pricing（2026-10-13）',
        rules: [
            {
                provider: 'deepseek-official', model: 'deepseek-v4-pro', unit: 'perMillionTokens', currency: 'CNY',
                input: 9, cacheRead: 0.3, cacheWrite: 9, output: 27,
                offPeak: { windows: DEEPSEEK_RULE_OFFPEAK_WINDOWS, input: 4.5, cacheRead: 0.15, cacheWrite: 4.5, output: 13.5 },
                note: 'v4-pro 高峰价；缓存写文档未单列，沿用未命中价。来源同上',
            },
            {
                provider: 'deepseek-official', model: '*', unit: 'perMillionTokens', currency: 'CNY',
                input: 2, cacheRead: 0.04, cacheWrite: 2, output: 8,
                offPeak: { windows: DEEPSEEK_RULE_OFFPEAK_WINDOWS, input: 1, cacheRead: 0.02, cacheWrite: 1, output: 4 },
                note: '该通道兜底按 Flash 档填写（高峰价）；缓存写文档未单列，沿用未命中价。来源同上',
            },
        ],
    },
    {
        id: 'kimi',
        label: 'Kimi（月之暗面）',
        note: 'CNY / 百万 tokens。来源：https://www.kimi.com/help/kimi-api/api-pricing（2026-10-13）；缓存写未单独公布，按输入价填写',
        rules: [
            {
                provider: 'moonshotai', model: 'kimi-k3', unit: 'perMillionTokens', currency: 'CNY',
                input: 20, cacheRead: 2, cacheWrite: 20, output: 100, offPeak: null,
                note: 'K3：输入 ¥20 / 输出 ¥100 / 缓存写 ¥20 / 命中 ¥2',
            },
            {
                provider: 'moonshotai', model: 'kimi-k2.7-code', unit: 'perMillionTokens', currency: 'CNY',
                input: 6.5, cacheRead: 1.3, cacheWrite: 6.5, output: 27, offPeak: null,
                note: 'K2.7 Code：输入 ¥6.5 / 输出 ¥27 / 命中 ¥1.30',
            },
        ],
    },
    {
        id: 'glm',
        label: 'GLM（Z.ai）',
        note: 'USD / 百万 tokens。来源：https://docs.z.ai/guides/overview/pricing（2026-10-13）；缓存写未单独公布，按输入价填写',
        rules: [
            {
                provider: 'zai', model: 'glm-5.3', unit: 'perMillionTokens', currency: 'USD',
                input: 1.4, cacheRead: 0.26, cacheWrite: 1.4, output: 4.4, offPeak: null,
                note: 'GLM-5.3：$1.4 / 缓存 $0.26 / $4.4',
            },
            {
                provider: 'zai', model: 'glm-5.3-flash', unit: 'perMillionTokens', currency: 'USD',
                input: 0.15, cacheRead: 0.03, cacheWrite: 0.15, output: 0.50, offPeak: null,
                note: 'GLM-5.3-Flash：$0.15 / 缓存 $0.03 / $0.50',
            },
        ],
    },
];
/** 规则的键：导入合并与去重都用它（通道 + 模型）。 */
export function ruleKeyOf(rule) {
    return rule.provider + '|' + rule.model;
}
/** 导入合并：同键覆盖、新键追加，保留原有顺序。 */
export function mergePricingRules(current, incoming) {
    const merged = [...current];
    for (const rule of incoming) {
        const index = merged.findIndex((candidate) => ruleKeyOf(candidate) === ruleKeyOf(rule));
        if (index >= 0)
            merged[index] = rule;
        else
            merged.push(rule);
    }
    return merged.slice(0, MAX_RULES);
}
