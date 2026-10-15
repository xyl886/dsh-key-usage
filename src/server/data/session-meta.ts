/**
 * 会话标题与归档状态的本地来源：标题取投影缓存 `storages/session_projcache.json`
 * （没有被宿主投影过的会话由「首条用户提问」兜底），归档优先取宿主只读服务
 * `workspaceRegistry.archivedSessionIds`、不可用时回退 `storages/workspace.json`。
 * 两个文件都只读；解析失败一律退化为「没有数据」，不影响统计。
 */
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** 宿主会话 id 两种写法（`session-<uuid>` / 裸 `<uuid>`）统一成裸 uuid 便于比对。 */
export function normalizeSessionId(id: string): string {
  const lowered = id.toLowerCase()
  return lowered.startsWith('session-') ? lowered.slice('session-'.length) : lowered
}

interface CacheEntry<T> {
  mtimeMs: number
  value: T
}

function readJson(path: string, readText: (path: string) => string | null): unknown {
  const text = readText(path)
  if (text === null) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** 读取 `session_projcache.json` 里的会话标题表（按 mtime 缓存，避免每次请求都解析 2 MB JSON）。 */
export function createTitleSource(
  cachePath: string,
  readText: (path: string) => string | null = (path) => {
    try { return readFileSync(path, 'utf8') } catch { return null }
  },
): { titles(): Map<string, string> } {
  let cache: CacheEntry<Map<string, string>> | null = null
  return {
    titles: () => {
      let mtimeMs = 0
      try { mtimeMs = statSync(cachePath).mtimeMs } catch { return new Map() }
      if (cache !== null && cache.mtimeMs === mtimeMs) return cache.value
      const value = parseTitles(readJson(cachePath, readText))
      cache = { mtimeMs, value }
      return value
    },
  }
}

/** 从投影缓存文档里取出 id → 标题（结构不符时返回空表）。 */
export function parseTitles(document: unknown): Map<string, string> {
  const titles = new Map<string, string>()
  const sessions = (document as { tables?: { sessions?: Record<string, unknown> } } | null)?.tables?.sessions
  if (typeof sessions !== 'object' || sessions === null) return titles
  for (const [id, entry] of Object.entries(sessions)) {
    const value = (entry as { rows?: { title?: { val?: unknown } } } | null)?.rows?.title?.val
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (trimmed !== '') titles.set(normalizeSessionId(id), trimmed)
  }
  return titles
}

/**
 * 会话投影（**新的按会话分文件**形态）：`storages/session_projcache/sessions/<sessionId>.json`。
 *
 * 为什么必须读它：侧边栏的会话名就是这里的 `record.rows.title.val`（如「dsh-key-usage 插件开发」），
 * 而旧的聚合文件 `session_projcache.json` 只留了少量历史条目 —— 只读旧文件时，绝大多数会话会退化成
 * 「首条提问的截断文本」，看起来就是「会话名字和侧边栏对不上」。
 *
 * 同时给出「是不是子代理」：`record.rows.subagent.val.identity` 存在才是真子代理。被 seed 续接的会话
 * 也带父会话链接，但投影里 `subagent.val` 是空对象 —— 侧边栏把它当独立会话，插件也必须当独立会话。
 *
 * 读取策略：按 id 惰性读、按文件 mtime 缓存（首次全量解析约 300 ms，之后每次调用只 stat）。
 */
export interface SessionProjectionFact {
  /** 侧边栏显示名；投影里没有标题时为 null。 */
  title: string | null
  /** true = 子代理；false = 主会话；null = 投影读不到，交给调用方判断。 */
  subagent: boolean | null
}

export function createSessionProjectionSource(
  sessionsDir: string,
  readText: (path: string) => string | null = (path) => {
    try { return readFileSync(path, 'utf8') } catch { return null }
  },
  mtimeOf: (path: string) => number = (path) => {
    try { return statSync(path).mtimeMs } catch { return -1 }
  },
): { facts(ids: string[]): Map<string, SessionProjectionFact> } {
  const cache = new Map<string, { mtimeMs: number; fact: SessionProjectionFact }>()

  const factAt = (path: string): SessionProjectionFact | null => {
    const mtimeMs = mtimeOf(path)
    if (mtimeMs < 0) return null
    const cached = cache.get(path)
    if (cached !== undefined && cached.mtimeMs === mtimeMs) return cached.fact
    const document = readJson(path, readText) as {
      record?: { rows?: { title?: { val?: unknown }; subagent?: { val?: { identity?: unknown } } } }
    } | null
    const rows = document?.record?.rows
    if (rows === undefined) return null
    const rawTitle = rows.title?.val
    const fact: SessionProjectionFact = {
      title: typeof rawTitle === 'string' && rawTitle.trim() !== '' ? rawTitle.trim() : null,
      subagent: rows.subagent?.val?.identity !== undefined,
    }
    cache.set(path, { mtimeMs, fact })
    return fact
  }

  return {
    facts: (ids) => {
      const result = new Map<string, SessionProjectionFact>()
      for (const id of ids) {
        const key = normalizeSessionId(id)
        if (result.has(key)) continue
        // 文件名就是宿主给的原 id（带 session- 前缀）；两种写法都试一遍，兼容裸 uuid
        for (const candidate of [id, 'session-' + key]) {
          const fact = factAt(join(sessionsDir, candidate + '.json'))
          if (fact !== null) {
            result.set(key, fact)
            break
          }
        }
      }
      return result
    },
  }
}

/**
 * 宿主工作区表：`path → title`（侧边栏显示名）。
 *
 * 为什么要它：插件的项目行按**工作目录**折叠，而侧边栏按**工作区**展示、名字用的是用户自己起的 title
 * （可能与目录名不同）。不读这张表，项目页就会出现「侧边栏里没有的目录」与「对不上的名字」。
 * 形状容错：宿主 getter 可能是 Map / 数组 / 字典，文件里是 `tables.workspaces` 字典，都读；拿不到返回空表。
 */
export function createWorkspaceSource(
  host: { get(name: string): unknown },
  workspacePath: string,
  readText: (path: string) => string | null = (path) => {
    try { return readFileSync(path, 'utf8') } catch { return null }
  },
): { titles(): Map<string, string> } {
  let cache: CacheEntry<Map<string, string>> | null = null
  return {
    titles: () => {
      try {
        const registry = host.get('workspaceRegistry') as { workspaces?: unknown } | undefined
        const fromHost = workspaceTitlesOf(registry?.workspaces)
        if (fromHost.size > 0) return fromHost
      } catch {
        // 落到文件
      }
      // stat 只用来做缓存键；拿不到（文件不存在 / 注入的读取器）也照样读一次，不能因此返回空表
      let mtimeMs = 0
      try { mtimeMs = statSync(workspacePath).mtimeMs } catch { mtimeMs = 0 }
      if (mtimeMs !== 0 && cache !== null && cache.mtimeMs === mtimeMs) return cache.value
      const document = readJson(workspacePath, readText) as { tables?: { workspaces?: unknown } } | null
      const value = workspaceTitlesOf(document?.tables?.workspaces)
      cache = mtimeMs === 0 ? null : { mtimeMs, value }
      return value
    },
  }
}

/** 工作区表的三种形状（Map / 数组 / 字典）统一成 `path → title`；没有 title 就用路径本身。 */
export function workspaceTitlesOf(raw: unknown): Map<string, string> {
  const titles = new Map<string, string>()
  const add = (entry: unknown): void => {
    if (typeof entry !== 'object' || entry === null) return
    const path = (entry as { path?: unknown }).path
    if (typeof path !== 'string' || path.trim() === '') return
    const title = (entry as { title?: unknown }).title
    titles.set(path.trim().toLowerCase(), typeof title === 'string' && title.trim() !== '' ? title.trim() : path.trim())
  }
  if (raw instanceof Map) {
    for (const entry of raw.values()) add(entry)
    return titles
  }
  if (Array.isArray(raw)) {
    for (const entry of raw) add(entry)
    return titles
  }
  if (typeof raw === 'object' && raw !== null) {
    for (const entry of Object.values(raw as Record<string, unknown>)) add(entry)
  }
  return titles
}

/** 归档会话 id 集合（归一后用于比对）。 */export function createArchiveSource(
  host: { get(name: string): unknown },
  workspacePath: string,
  readText: (path: string) => string | null = (path) => {
    try { return readFileSync(path, 'utf8') } catch { return null }
  },
): { archived(): Set<string> } {
  const fromFile = (): Set<string> => {
    const document = readJson(workspacePath, readText) as { global?: { archivedSessionIds?: unknown } } | null
    const ids = document?.global?.archivedSessionIds
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string').map(normalizeSessionId) : [])
  }
  return {
    archived: () => {
      // 先用宿主官方只读 getter；拿不到再读文件（两者都是权威数据，getter 优先）
      try {
        const registry = host.get('workspaceRegistry') as { archivedSessionIds?: unknown } | undefined
        if (registry !== null && registry !== undefined && Array.isArray(registry.archivedSessionIds)) {
          return new Set(registry.archivedSessionIds.filter((id): id is string => typeof id === 'string').map(normalizeSessionId))
        }
      } catch {
        // 落到文件
      }
      return fromFile()
    },
  }
}
