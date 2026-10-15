/**
 * 会话标题与归档状态的本地来源：标题取投影缓存 `storages/session_projcache.json`
 * （没有被宿主投影过的会话由「首条用户提问」兜底），归档优先取宿主只读服务
 * `workspaceRegistry.archivedSessionIds`、不可用时回退 `storages/workspace.json`。
 * 两个文件都只读；解析失败一律退化为「没有数据」，不影响统计。
 */
import { readFileSync, statSync } from 'node:fs'

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

/** 归档会话 id 集合（归一后用于比对）。 */
export function createArchiveSource(
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
