/**
 * dsh-key-usage 服务端入口：挂载 HTTP 路由（只读聚合 + 规则写入），
 * 向客户端提供用量台账、通道配置、余额快照与会话用量的聚合数据。
 *
 * 数据来源：
 * - 台账 / 快照 / 通道配置：本地文件只读；
 * - 项目、会话、按小时：宿主 sessionPersistence 的只读 handle；
 * - 余额与订阅窗口：优先查各通道官方接口（凭据经宿主 credentials seam 解析，
 *   不落盘、不进日志、不返回给客户端），失败时回落到本地快照；
 * - 计费规则：插件自己原子写 `$DSH_HOME/dsh-key-usage/pricing-rules.yml`（见 pricing-store.ts）。
 *   宿主设置服务这条链路（schemastery `Config` / volatile 字段 / 客户端 configForms）已退役；
 *   旧版 entry config 只作只读回退，避免老用户规则丢失。
 */
import { mountKeyUsageRoutes } from './routes.js'
import { createLiveQuotaService } from './live-quota.js'
import { createSessionSource } from './sessions.js'

export const name = 'dsh-key-usage'

/** cordis 宿主上下文中本插件触达的最小面。 */
interface HostContext {
  webServer: {
    register(route: { kind: string; path: string; handler: (request: unknown, response: unknown) => Promise<void> | void }): void
  }
  inject(services: string[], callback: (host: HostContext) => void): void
  effect(callback: () => void, label?: string): void
  /** 选择器式取服务：服务缺失返回 undefined，不阻塞路由挂载。 */
  get(name: string): unknown
}

interface CredentialsService {
  resolve(reference: string): Promise<{ value?: unknown } | null>
}

export function apply(ctx: HostContext, config: unknown): void {
  // 会话服务是可选依赖：用 get 惰性取，缺了也只是会话相关页面显示空态
  const sessionSource = createSessionSource({
    get: (serviceName) => (typeof ctx.get === 'function' ? ctx.get(serviceName) : undefined),
  })
  // 凭据同样只在真正查询余额时经宿主 seam 解析；拿不到就回落快照
  const liveQuota = createLiveQuotaService({
    resolveCredential: async (reference) => {
      const credentials = (typeof ctx.get === 'function' ? ctx.get('credentials') : undefined) as CredentialsService | undefined
      if (credentials !== undefined && typeof credentials.resolve === 'function') {
        try {
          const hit = await credentials.resolve(reference)
          if (hit !== null && typeof hit.value === 'string' && hit.value.trim() !== '') return hit.value.trim()
        } catch {
          // 继续尝试进程环境变量
        }
      }
      // 兜底：宿主把凭据放在进程环境里时直接取（只读环境变量，不碰任何凭据文件）
      const fromEnv = process.env[reference]
      return typeof fromEnv === 'string' ? fromEnv.trim() : ''
    },
  })
  ctx.inject(['webServer'], (host) => {
    host.effect(
      () => mountKeyUsageRoutes(host.webServer, sessionSource, liveQuota, {
        // workspaceRegistry 用来读官方归档集合（拿不到就回退本地 storages/workspace.json）
        get: (serviceName) => (typeof ctx.get === 'function' ? ctx.get(serviceName) : undefined),
      }, {
        // 旧版 entry config（apply 的 config.pricing）只作**只读回退**：老用户规则不丢；
        // 新规则一律走 pricing-rules.yml，由 routes 侧的 POST /pricing/rules 原子写入
        current: () => (config as { pricing?: unknown } | undefined)?.pricing,
      }),
      'dsh-key-usage: http routes',
    )
  })
}
