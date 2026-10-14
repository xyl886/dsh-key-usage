/**
 * LiteLLM 聚合价（第三方维护、**USD**）：随包快照 + 用户刷新后的本机副本，是「内置官方价目」之下的一层
 * （优先级：官方账单 > 内置官方价目 > 聚合价 > 台账反推均价，见 pricing.ts）。
 *
 * - 装载优先级：`$DSH_HOME/dsh-key-usage/model-prices.json`（面板刷新写入）> 随包 `data/litellm-model-prices.json`；
 *   两个都读不到时整层失效（匹配一律不命中），调用方继续回落台账均价，**绝不抛错**；读取按 mtime/size 缓存；
 * - **只有** `refreshModelPrices()` 会联网，且只由面板「刷新价目」按钮触发的
 *   `POST /dsh-key-usage/pricing/refresh` 调用 —— 不开机拉取、不定时轮询、不在别的端点里隐式拉。
 *
 * 币种口径：上游只有 USD，×1e6 换成「每百万 tokens」后**原样并列**，不做任何汇率换算。
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
/** 来源页（给人看）；刷新时先 raw、不可达再回落 jsDelivr 镜像。 */
export const AGGREGATE_SOURCE_URL = 'https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json';
export const AGGREGATE_SNAPSHOT_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';
export const AGGREGATE_MIRROR_URL = 'https://cdn.jsdelivr.net/gh/BerriAI/litellm@main/model_prices_and_context_window.json';
export const AGGREGATE_LICENSE = 'MIT';
/** 随包快照对应的上游提交（抓取当天 `gh api repos/BerriAI/litellm/commits/main --jq .sha`）。 */
export const AGGREGATE_UPSTREAM_COMMIT = '30b8db325e85740eb86901d08597da845b206504';
/** 随包快照的抓取日期（更详细的来源信息见 data/README.md）。 */
export const AGGREGATE_FETCHED_ON = '2026-10-14';
export const AGGREGATE_CURRENCY = 'USD';
/** 刷新端点：两次尝试的总超时 / 响应上限 / 最少条目数（不满足就拒绝，绝不覆盖已有本地文件）。 */
export const AGGREGATE_REFRESH_TIMEOUT_MS = 20000;
export const AGGREGATE_REFRESH_MAX_BYTES = 12 * 1024 * 1024;
export const AGGREGATE_REFRESH_MIN_ENTRIES = 100;
/**
 * 通道别名表（冻结口径）：插件通道 id → LiteLLM 的 `litellm_provider` 取值。
 * 别名命中后若仍有多条候选，按「键里 `/` 段数最少 → 键名字典序」取第一条（保证确定性）；
 * 别名不命中时只有该模型名在全库唯一才用（标记 `unique`），否则跳过并记 issue —— **不猜通道**。
 */
export const AGGREGATE_PROVIDER_ALIASES = {
    'deepseek-official': ['deepseek'],
    moonshotai: ['moonshot', 'moonshotai'],
    zai: ['zai'],
    openrouter: ['openrouter'],
    openai: ['openai'],
    anthropic: ['anthropic'],
    dashscope: ['dashscope'],
    azure: ['azure', 'azure_ai'],
    google: ['gemini', 'vertex_ai'],
    volcengine: ['volcengine'],
};
const SHIPPED_PATH = fileURLToPath(new URL('../data/litellm-model-prices.json', import.meta.url));
/** 本机刷新文件的唯一可写目标。 */
export function aggregateLocalPath() {
    return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'dsh-key-usage', 'model-prices.json');
}
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
/** 模型名归一：取最后一段并转小写（与 pricing-catalog 的 `normalizeModelId` 同一口径）。 */
function lastSegmentOf(text) {
    const trimmed = text.trim();
    const slash = trimmed.lastIndexOf('/');
    return (slash >= 0 ? trimmed.slice(slash + 1) : trimmed).toLowerCase();
}
/** 非负有限数字才算「收录了这一档」：0 是有效价（免费），不是缺档。 */
function costOf(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
/** USD / token → USD / 每百万 tokens；`toPrecision(12)` 只抹掉浮点乘法尾差，不做取整。 */
function perMillionTokens(perToken) {
    return Number((perToken * 1e6).toPrecision(12));
}
/** 上游对象 → 可定价条目；`sample_spec` 是文档条目、不是模型，必须排除。 */
function buildEntries(raw) {
    const entries = [];
    for (const [key, value] of Object.entries(raw)) {
        if (key === 'sample_spec')
            continue;
        if (!isObject(value))
            continue;
        const mode = typeof value.mode === 'string' ? value.mode : '';
        // 图片 / 音频 / embedding / rerank 等非会话条目没有可比口径，直接跳过
        if (mode !== 'chat' && mode !== 'completion')
            continue;
        const input = costOf(value.input_cost_per_token);
        const output = costOf(value.output_cost_per_token);
        if (input === null || input <= 0 || output === null || output <= 0)
            continue;
        const name = lastSegmentOf(key);
        if (name === '')
            continue;
        const read = costOf(value.cache_read_input_token_cost);
        const write = costOf(value.cache_creation_input_token_cost);
        // 两档都缺 = 不支持缓存计价（0/0，不标 partial）；只缺一档 = 该档按未命中价代（与
        // DeepSeek 官方「缓存写入按未命中价」一致），并标 partial 让界面显示「部分」
        let cacheRead = 0;
        let cacheWrite = 0;
        let partial = false;
        if (read !== null && write !== null) {
            cacheRead = read;
            cacheWrite = write;
        }
        else if (read !== null) {
            cacheRead = read;
            cacheWrite = input;
            partial = true;
        }
        else if (write !== null) {
            cacheRead = input;
            cacheWrite = write;
            partial = true;
        }
        const litellmProvider = typeof value.litellm_provider === 'string' ? value.litellm_provider.trim().toLowerCase() : '';
        const head = key.includes('/') ? key.slice(0, key.indexOf('/')).trim().toLowerCase() : '';
        entries.push({
            key,
            name,
            provider: litellmProvider !== '' ? litellmProvider : head,
            segments: key.split('/').length,
            input: perMillionTokens(input),
            output: perMillionTokens(output),
            cacheRead: perMillionTokens(cacheRead),
            cacheWrite: perMillionTokens(cacheWrite),
            partial,
        });
    }
    return entries;
}
function describeError(error) {
    return error instanceof Error ? error.message : String(error);
}
/** mtime → ISO；拿不到合法时间就返回 null（宁可少一个展示字段，也不抛错）。 */
function isoOrNull(milliseconds) {
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function readCandidate(path, label) {
    const empty = { usable: false, path, entries: [], bytes: 0, sha256: '', fetchedAt: null, issues: [] };
    let stamp;
    try {
        const stats = statSync(path);
        stamp = { mtimeMs: stats.mtimeMs };
    }
    catch {
        // 本地文件不存在 = 还没刷新过（正常）；随包快照缺失才是问题
        if (label === 'shipped')
            empty.issues.push({ kind: 'shipped-missing', message: '随包价目快照缺失：' + path });
        return empty;
    }
    let text;
    try {
        text = readFileSync(path, 'utf8');
    }
    catch (error) {
        empty.issues.push({ kind: label + '-read-failed', message: '价目文件读取失败（文件存在但读不出来）：' + path + '（' + describeError(error) + '）' });
        return empty;
    }
    let raw;
    try {
        raw = JSON.parse(text);
    }
    catch (error) {
        empty.issues.push({ kind: label + '-bad-json', message: '价目文件不是合法 JSON，已跳过该文件：' + path + '（' + describeError(error) + '）' });
        return empty;
    }
    if (!isObject(raw)) {
        empty.issues.push({ kind: label + '-bad-json', message: '价目文件顶层必须是 JSON 对象，已跳过该文件：' + path });
        return empty;
    }
    const entries = buildEntries(raw);
    if (entries.length === 0) {
        empty.issues.push({ kind: label + '-no-prices', message: '价目文件里没有任何可定价的会话模型，已跳过该文件：' + path });
        return empty;
    }
    return {
        usable: true,
        path,
        entries,
        bytes: Buffer.byteLength(text, 'utf8'),
        sha256: createHash('sha256').update(text, 'utf8').digest('hex'),
        fetchedAt: isoOrNull(stamp.mtimeMs),
        issues: [],
    };
}
function loadIndex(localPath) {
    const shipped = readCandidate(SHIPPED_PATH, 'shipped');
    const local = readCandidate(localPath, 'local');
    const chosen = local.usable ? local : shipped.usable ? shipped : null;
    // issue 只解释「当前装载状态」：本地能用就不提随包文件，降级了才说明为什么降级
    const issues = local.usable ? [] : [...local.issues, ...shipped.issues];
    const byName = new Map();
    let models = 0;
    for (const entry of chosen?.entries ?? []) {
        const list = byName.get(entry.name);
        if (list === undefined) {
            byName.set(entry.name, [entry]);
            models += 1;
            continue;
        }
        list.push(entry);
    }
    return {
        loaded: local.usable ? 'local' : shipped.usable ? 'shipped' : 'none',
        path: chosen?.path ?? '',
        shippedPath: SHIPPED_PATH,
        localPath,
        entries: chosen?.entries.length ?? 0,
        models,
        bytes: chosen?.bytes ?? 0,
        sha256: chosen?.sha256 ?? '',
        fetchedAt: chosen?.fetchedAt ?? null,
        byName,
        issues,
    };
}
let snapshot = null;
let snapshotStamp = '';
let checkedAt = 0;
/** 两次 stat 之间的最小间隔：一次请求会逐行匹配，不能每行都去 stat 两个文件。 */
const STAT_INTERVAL_MS = 250;
function fileStamp(path) {
    try {
        const stats = statSync(path);
        return stats.mtimeMs + ':' + stats.ctimeMs + ':' + stats.size;
    }
    catch {
        return '-';
    }
}
export function invalidateAggregateCache() {
    snapshot = null;
    snapshotStamp = '';
    checkedAt = 0;
}
/**
 * 当前价目索引：按 `mtimeMs:ctimeMs:size` 缓存，改了文件下一次匹配即生效（同一请求只 stat 一次）。
 */
export function aggregateIndex() {
    const localPath = aggregateLocalPath();
    const now = Date.now();
    if (snapshot !== null && snapshot.localPath === localPath && now - checkedAt < STAT_INTERVAL_MS)
        return snapshot;
    checkedAt = now;
    const stamp = fileStamp(localPath) + '|' + fileStamp(SHIPPED_PATH);
    if (snapshot !== null && snapshot.localPath === localPath && stamp === snapshotStamp)
        return snapshot;
    snapshot = loadIndex(localPath);
    snapshotStamp = stamp;
    return snapshot;
}
/* ------------------------------------------------------------------ 匹配 ------------------------------------------------------------------ */
const LOOKUP_ISSUE_LIMIT = 200;
const lookupIssues = new Map();
/** 定不了通道的匹配记一条 issue（按 `provider|model` 去重、有上限，避免长跑进程里无限增长）。 */
function recordAmbiguous(provider, model, candidates) {
    const key = provider + '|' + model;
    if (lookupIssues.has(key) || lookupIssues.size >= LOOKUP_ISSUE_LIMIT)
        return;
    lookupIssues.set(key, {
        kind: 'match-ambiguous',
        message: '聚合价目里有 ' + String(candidates) + ' 条候选、无法确定对应通道，已跳过不参与定价：' + key,
    });
}
/** 同一个进程里匹配时记下的 issue（面板的说明与测试都读它）。 */
export function aggregateLookupIssues() {
    return [...lookupIssues.values()];
}
/** 多条候选的确定性选择：先比键里 `/` 的段数，再比键名字典序。 */
function chooseDeterministic(candidates) {
    let best = candidates[0];
    for (const entry of candidates) {
        if (entry.segments < best.segments) {
            best = entry;
            continue;
        }
        if (entry.segments === best.segments && entry.key < best.key)
            best = entry;
    }
    return best;
}
function hitOf(entry, source) {
    return {
        rule: {
            provider: entry.provider,
            model: entry.name,
            unit: 'perMillionTokens',
            currency: AGGREGATE_CURRENCY,
            input: entry.input,
            cacheRead: entry.cacheRead,
            cacheWrite: entry.cacheWrite,
            output: entry.output,
            offPeak: null,
            note: 'LiteLLM 聚合价（第三方，USD）：上游键 ' + entry.key + '；来源 ' + AGGREGATE_SOURCE_URL + '，抓取 ' + AGGREGATE_FETCHED_ON,
        },
        partial: entry.partial,
        source,
        key: entry.key,
    };
}
/**
 * 按「通道 + 模型」查聚合价（冻结算法）：
 * 1. 模型名 = 键的末段（查询里的 `vendor/` 前缀同样剥掉），小写比较；
 * 2. 通道别名命中 → 取别名通道里「键段数最少 → 键名字典序」的第一条；
 * 3. 别名不命中 → 只有该模型名全库唯一才用（`unique`），否则跳过并记 issue（**不猜通道**）。
 */
export function aggregateRuleFor(provider, model) {
    const name = lastSegmentOf(model);
    if (name === '')
        return { ok: false, reason: 'no-model', candidates: 0, name };
    const candidates = aggregateIndex().byName.get(name) ?? [];
    if (candidates.length === 0)
        return { ok: false, reason: 'no-model', candidates: 0, name };
    const aliases = AGGREGATE_PROVIDER_ALIASES[lastSegmentOf(provider)] ?? null;
    if (aliases !== null) {
        const matched = candidates.filter((entry) => aliases.includes(entry.provider));
        if (matched.length > 0)
            return { ok: true, hit: hitOf(chooseDeterministic(matched), 'alias') };
    }
    if (candidates.length === 1)
        return { ok: true, hit: hitOf(candidates[0], 'unique') };
    recordAmbiguous(provider, model, candidates.length);
    return { ok: false, reason: 'ambiguous', candidates: candidates.length, name };
}
/** 面板装载状态（`GET /dsh-key-usage/pricing` 的 `aggregate` 字段）。 */
export function aggregateStatus() {
    const index = aggregateIndex();
    return {
        loaded: index.loaded,
        path: index.path,
        shippedPath: index.shippedPath,
        localPath: index.localPath,
        entries: index.entries,
        models: index.models,
        usd: true,
        fetchedAt: index.fetchedAt,
        bytes: index.bytes,
        sha256: index.sha256,
        source: AGGREGATE_SOURCE_URL,
        license: AGGREGATE_LICENSE,
        upstreamCommit: AGGREGATE_UPSTREAM_COMMIT,
        issues: [...index.issues, ...aggregateLookupIssues()],
    };
}
/** 写目标守卫：文件名 + 绝对路径都要对得上（Windows 路径大小写不敏感）。 */
function writableTargetProblem(path) {
    if (basename(path) !== 'model-prices.json') {
        return '只允许写 model-prices.json（当前目标：' + path + '）';
    }
    if (resolve(path).toLowerCase() !== resolve(aggregateLocalPath()).toLowerCase()) {
        return '只允许写 $DSH_HOME/dsh-key-usage/model-prices.json（当前目标：' + path + '）';
    }
    return null;
}
/** 原子写：同目录临时文件 + rename（避免读到半截文件）。 */
export function writeModelPricesFile(path, text) {
    const problem = writableTargetProblem(path);
    if (problem !== null)
        return { ok: false, error: problem };
    try {
        mkdirSync(dirname(path), { recursive: true });
        const temporaryPath = path + '.tmp';
        writeFileSync(temporaryPath, text, 'utf8');
        renameSync(temporaryPath, path);
    }
    catch (error) {
        return { ok: false, error: '写入价目文件失败：' + describeError(error) };
    }
    invalidateAggregateCache();
    return { ok: true, bytes: Buffer.byteLength(text, 'utf8') };
}
/** 下载内容的校验：能解析成对象、每个条目的值都是对象、可定价条目数达标。 */
function validatePricesText(text) {
    let raw;
    try {
        raw = JSON.parse(text);
    }
    catch (error) {
        return { ok: false, error: '响应不是合法 JSON（' + describeError(error) + '）' };
    }
    if (!isObject(raw))
        return { ok: false, error: '响应顶层不是 JSON 对象' };
    for (const [key, value] of Object.entries(raw)) {
        if (key === 'sample_spec')
            continue;
        if (isObject(value))
            continue;
        return { ok: false, error: '条目 ' + key + ' 的值不是对象（上游结构可能已变）' };
    }
    const entries = buildEntries(raw).length;
    if (entries < AGGREGATE_REFRESH_MIN_ENTRIES) {
        return { ok: false, error: '可定价条目只有 ' + String(entries) + ' 条（少于 ' + String(AGGREGATE_REFRESH_MIN_ENTRIES) + ' 条），拒绝覆盖已有文件' };
    }
    return { ok: true, value: { bytes: Buffer.byteLength(text, 'utf8'), entries, sha256: createHash('sha256').update(text, 'utf8').digest('hex') } };
}
/** 按上限读响应体：超过上限立刻中止连接并返回 null。 */
async function readCappedText(response, controller) {
    const body = response.body;
    const iterable = body !== null && typeof body[Symbol.asyncIterator] === 'function';
    if (!iterable) {
        const text = await response.text();
        return Buffer.byteLength(text, 'utf8') > AGGREGATE_REFRESH_MAX_BYTES ? null : text;
    }
    const chunks = [];
    let size = 0;
    try {
        for await (const chunk of body) {
            const buffer = Buffer.from(chunk);
            size += buffer.length;
            if (size > AGGREGATE_REFRESH_MAX_BYTES) {
                controller.abort();
                return null;
            }
            chunks.push(buffer);
        }
    }
    catch (error) {
        if (error instanceof Error && error.name === 'AbortError')
            return null;
        throw error;
    }
    return Buffer.concat(chunks).toString('utf8');
}
async function fetchPrices(url, timeoutMs, fetchImpl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' }, redirect: 'follow' });
        if (!response.ok)
            return { ok: false, error: 'http-' + String(response.status) };
        const declared = Number(response.headers?.get?.('content-length') ?? '');
        if (Number.isFinite(declared) && declared > AGGREGATE_REFRESH_MAX_BYTES)
            return { ok: false, error: 'too-large' };
        const text = await readCappedText(response, controller);
        if (text === null)
            return { ok: false, error: 'too-large' };
        return { ok: true, text };
    }
    catch (error) {
        const aborted = error instanceof Error && error.name === 'AbortError';
        return { ok: false, error: aborted ? 'timeout' : 'network' };
    }
    finally {
        clearTimeout(timer);
    }
}
/**
 * 拉远端最新价目并原子写本机副本（**唯一的联网路径**，只由面板「刷新价目」按钮触发）。
 * 先 raw 再 jsDelivr 镜像；总超时 20 秒、单次响应上限 12 MiB；校验不过就原样返回失败，
 * **不覆盖**已有的本地文件。返回失败时一律 `{ok:false,error}`，由端点转成 HTTP 200。
 */
export async function refreshModelPrices(fetchImpl = fetch, targetPath = aggregateLocalPath(), options = {}) {
    const problem = writableTargetProblem(targetPath);
    if (problem !== null)
        return { ok: false, error: problem };
    const timeoutMs = options.timeoutMs ?? AGGREGATE_REFRESH_TIMEOUT_MS;
    const deadline = Date.now() + timeoutMs;
    const failures = [];
    for (const url of [AGGREGATE_SNAPSHOT_URL, AGGREGATE_MIRROR_URL]) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
            failures.push('总超时 ' + String(Math.round(timeoutMs / 1000)) + ' 秒');
            break;
        }
        const downloaded = await fetchPrices(url, remaining, fetchImpl);
        if (!downloaded.ok) {
            failures.push(url + '：' + downloaded.error);
            continue;
        }
        const validation = validatePricesText(downloaded.text);
        if (!validation.ok) {
            failures.push(url + '：' + validation.error);
            continue;
        }
        const written = writeModelPricesFile(targetPath, downloaded.text);
        if (!written.ok)
            return { ok: false, error: written.error };
        return {
            ok: true,
            url,
            bytes: validation.value.bytes,
            entries: validation.value.entries,
            sha256: validation.value.sha256,
            fetchedAt: new Date().toISOString(),
        };
    }
    return { ok: false, error: '刷新价目失败：' + failures.join('；') };
}
