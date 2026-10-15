/**
 * 会话标题与归档状态的本地来源：标题取投影缓存 `storages/session_projcache.json`
 * （没有被宿主投影过的会话由「首条用户提问」兜底），归档优先取宿主只读服务
 * `workspaceRegistry.archivedSessionIds`、不可用时回退 `storages/workspace.json`。
 * 两个文件都只读；解析失败一律退化为「没有数据」，不影响统计。
 */
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
/** 宿主会话 id 两种写法（`session-<uuid>` / 裸 `<uuid>`）统一成裸 uuid 便于比对。 */
export function normalizeSessionId(id) {
    const lowered = id.toLowerCase();
    return lowered.startsWith('session-') ? lowered.slice('session-'.length) : lowered;
}
function readJson(path, readText) {
    const text = readText(path);
    if (text === null)
        return null;
    try {
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
/** 读取 `session_projcache.json` 里的会话标题表（按 mtime 缓存，避免每次请求都解析 2 MB JSON）。 */
export function createTitleSource(cachePath, readText = (path) => {
    try {
        return readFileSync(path, 'utf8');
    }
    catch {
        return null;
    }
}) {
    let cache = null;
    return {
        titles: () => {
            let mtimeMs = 0;
            try {
                mtimeMs = statSync(cachePath).mtimeMs;
            }
            catch {
                return new Map();
            }
            if (cache !== null && cache.mtimeMs === mtimeMs)
                return cache.value;
            const value = parseTitles(readJson(cachePath, readText));
            cache = { mtimeMs, value };
            return value;
        },
    };
}
/** 从投影缓存文档里取出 id → 标题（结构不符时返回空表）。 */
export function parseTitles(document) {
    const titles = new Map();
    const sessions = document?.tables?.sessions;
    if (typeof sessions !== 'object' || sessions === null)
        return titles;
    for (const [id, entry] of Object.entries(sessions)) {
        const value = entry?.rows?.title?.val;
        if (typeof value !== 'string')
            continue;
        const trimmed = value.trim();
        if (trimmed !== '')
            titles.set(normalizeSessionId(id), trimmed);
    }
    return titles;
}
export function createSessionProjectionSource(sessionsDir, readText = (path) => {
    try {
        return readFileSync(path, 'utf8');
    }
    catch {
        return null;
    }
}, mtimeOf = (path) => {
    try {
        return statSync(path).mtimeMs;
    }
    catch {
        return -1;
    }
}) {
    const cache = new Map();
    const factAt = (path) => {
        const mtimeMs = mtimeOf(path);
        if (mtimeMs < 0)
            return null;
        const cached = cache.get(path);
        if (cached !== undefined && cached.mtimeMs === mtimeMs)
            return cached.fact;
        const document = readJson(path, readText);
        const rows = document?.record?.rows;
        if (rows === undefined)
            return null;
        const rawTitle = rows.title?.val;
        const fact = {
            title: typeof rawTitle === 'string' && rawTitle.trim() !== '' ? rawTitle.trim() : null,
            subagent: rows.subagent?.val?.identity !== undefined,
        };
        cache.set(path, { mtimeMs, fact });
        return fact;
    };
    return {
        facts: (ids) => {
            const result = new Map();
            for (const id of ids) {
                const key = normalizeSessionId(id);
                if (result.has(key))
                    continue;
                // 文件名就是宿主给的原 id（带 session- 前缀）；两种写法都试一遍，兼容裸 uuid
                for (const candidate of [id, 'session-' + key]) {
                    const fact = factAt(join(sessionsDir, candidate + '.json'));
                    if (fact !== null) {
                        result.set(key, fact);
                        break;
                    }
                }
            }
            return result;
        },
    };
}
/**
 * 宿主工作区表：`path → title`（侧边栏显示名）。
 *
 * 为什么要它：插件的项目行按**工作目录**折叠，而侧边栏按**工作区**展示、名字用的是用户自己起的 title
 * （可能与目录名不同）。不读这张表，项目页就会出现「侧边栏里没有的目录」与「对不上的名字」。
 * 形状容错：宿主 getter 可能是 Map / 数组 / 字典，文件里是 `tables.workspaces` 字典，都读；拿不到返回空表。
 */
export function createWorkspaceSource(host, workspacePath, readText = (path) => {
    try {
        return readFileSync(path, 'utf8');
    }
    catch {
        return null;
    }
}) {
    let cache = null;
    return {
        titles: () => {
            try {
                const registry = host.get('workspaceRegistry');
                const fromHost = workspaceTitlesOf(registry?.workspaces);
                if (fromHost.size > 0)
                    return fromHost;
            }
            catch {
                // 落到文件
            }
            // stat 只用来做缓存键；拿不到（文件不存在 / 注入的读取器）也照样读一次，不能因此返回空表
            let mtimeMs = 0;
            try {
                mtimeMs = statSync(workspacePath).mtimeMs;
            }
            catch {
                mtimeMs = 0;
            }
            if (mtimeMs !== 0 && cache !== null && cache.mtimeMs === mtimeMs)
                return cache.value;
            const document = readJson(workspacePath, readText);
            const value = workspaceTitlesOf(document?.tables?.workspaces);
            cache = mtimeMs === 0 ? null : { mtimeMs, value };
            return value;
        },
    };
}
/** 工作区表的三种形状（Map / 数组 / 字典）统一成 `path → title`；没有 title 就用路径本身。 */
export function workspaceTitlesOf(raw) {
    const titles = new Map();
    const add = (entry) => {
        if (typeof entry !== 'object' || entry === null)
            return;
        const path = entry.path;
        if (typeof path !== 'string' || path.trim() === '')
            return;
        const title = entry.title;
        titles.set(path.trim().toLowerCase(), typeof title === 'string' && title.trim() !== '' ? title.trim() : path.trim());
    };
    if (raw instanceof Map) {
        for (const entry of raw.values())
            add(entry);
        return titles;
    }
    if (Array.isArray(raw)) {
        for (const entry of raw)
            add(entry);
        return titles;
    }
    if (typeof raw === 'object' && raw !== null) {
        for (const entry of Object.values(raw))
            add(entry);
    }
    return titles;
}
/** 归档会话 id 集合（归一后用于比对）。 */ export function createArchiveSource(host, workspacePath, readText = (path) => {
    try {
        return readFileSync(path, 'utf8');
    }
    catch {
        return null;
    }
}) {
    const fromFile = () => {
        const document = readJson(workspacePath, readText);
        const ids = document?.global?.archivedSessionIds;
        return new Set(Array.isArray(ids) ? ids.filter((id) => typeof id === 'string').map(normalizeSessionId) : []);
    };
    return {
        archived: () => {
            // 先用宿主官方只读 getter；拿不到再读文件（两者都是权威数据，getter 优先）
            try {
                const registry = host.get('workspaceRegistry');
                if (registry !== null && registry !== undefined && Array.isArray(registry.archivedSessionIds)) {
                    return new Set(registry.archivedSessionIds.filter((id) => typeof id === 'string').map(normalizeSessionId));
                }
            }
            catch {
                // 落到文件
            }
            return fromFile();
        },
    };
}
