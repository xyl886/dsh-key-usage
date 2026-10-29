/**
 * 余额 / 窗口快照的本地持久化。
 *
 * 宿主那份 `dsh-usage/provider-snapshots.json` 本机从 2026-09-30 起就停更，所以每次实时查询成功后
 * 立刻落一份自己的快照，失败时优先回落它，把数据断档压缩到「最近一次成功查询」。
 * 只写插件自己的文件（`$DSH_HOME/dsh-key-usage/quota-snapshots.json`）；读写失败一律静默忽略。
 */
import { openStorage, readQuotaSeed } from '../storage/db.js'

/** 快照里保存的订阅窗口（与 `/quota` 的 plan.windows 同结构）。 */
export interface QuotaSnapshotWindow {
  key: string
  percent: number
  resetsAt: string | null
  status: string | null
}

export interface QuotaSnapshotEntry {
  provider: string
  displayName: string | null
  updatedAt: number
  balance: Record<string, unknown> | null
  windows: QuotaSnapshotWindow[] | null
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 读快照；任何异常都返回空数组，不抛错。 */
export function readQuotaSnapshots(path: string): QuotaSnapshotEntry[] {
  // 历史配额快照在迁移时已导入 quota_seed 表（只读种子），这里不再读文件
  let rows: Array<{ provider: string; payload: string }>
  try {
    rows = readQuotaSeed(openStorage(path))
  } catch {
    return []
  }
  const providers: Record<string, unknown> = {}
  for (const row of rows) {
    try {
      providers[row.provider] = JSON.parse(row.payload)
    } catch { /* 坏行跳过 */ }
  }
  if (!isObject(providers)) return []
  const entries: QuotaSnapshotEntry[] = []
  for (const [id, raw] of Object.entries(providers)) {
    if (!isObject(raw)) continue
    if (typeof raw.updatedAt !== 'number' || !Number.isFinite(raw.updatedAt)) continue
    const windows = Array.isArray(raw.windows)
      ? raw.windows.filter((window): window is QuotaSnapshotWindow => isObject(window) && typeof window.key === 'string' && typeof window.percent === 'number')
      : null
    entries.push({
      provider: typeof raw.provider === 'string' ? raw.provider : id,
      displayName: typeof raw.displayName === 'string' ? raw.displayName : null,
      updatedAt: raw.updatedAt,
      balance: isObject(raw.balance) ? raw.balance : null,
      windows: windows !== null && windows.length > 0 ? windows : null,
    })
  }
  return entries
}

/**
 * 合并写入：本次成功的通道覆盖旧值，其余通道保留（避免一次只刷新部分通道时把别的通道抹掉）。
 * 先写临时文件再改名，避免读到半截 JSON；任何异常都吞掉。
 */
