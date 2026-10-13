/**
 * 计费规则的读写通道：把宿主的配置表单服务（`ctx.configForms`）包成一个 React 可订阅的 store。
 *
 * 为什么不用自己的 HTTP 路由写文件：插件只允许写 `quota-snapshots.json` 一个文件。
 * 规则的命名空间就是本插件在 profile 里的条目 id（`dsh-key-usage`），
 * 写入由宿主的 config-editor 落到当前 profile 的 cordis patch 上，插件全程不碰文件系统。
 */
import { EMPTY_CONFIG, configForWrite, normalizeClientPricing, type PricingConfig } from './pricing.ts'

/** `configForms.get(entryId)` 返回的表单控制器（宿主 dsh-client-ui-settings 提供）。 */
export interface PricingForm {
  getSnapshot(): { status?: string; value?: unknown; revision?: number; writable?: boolean }
  subscribe(listener: () => void): () => void
  mutate(ops: Array<{ op: 'set' | 'unset'; path: string[]; value?: unknown }>, expectedRevision?: number): Promise<boolean>
}

export interface ConfigFormsService {
  get(entryId: string): PricingForm
  whileServed(namespaces: string[], register: (served: Set<string>) => () => void): () => void
}

export interface PricingSettingsState {
  /** loading = 宿主还没回；ready = 已拿到值；unavailable = 宿主没有这个命名空间。 */
  status: 'loading' | 'ready' | 'unavailable'
  writable: boolean
  config: PricingConfig
  /** 写入失败的中文原因（乐观锁冲突 / 命名空间未服务 / 宿主拒绝）。 */
  error: string | null
}

export interface PricingSettingsStore {
  store: {
    subscribe(listener: () => void): () => void
    getSnapshot(): PricingSettingsState
  }
  /** 绑定表单控制器；返回解绑函数。宿主没提供 configForms 时传 null。 */
  attach(form: PricingForm | null): () => void
  /** 整份规则写回；成功返回 true。 */
  save(config: PricingConfig): Promise<boolean>
  /** 设置命名空间是否由宿主服务（决定要不要注册插件页卡片）。 */
  isServed(): boolean
  noteError(message: string): void
}

export function createPricingSettings(): PricingSettingsStore {
  let state: PricingSettingsState = {
    status: 'loading',
    writable: false,
    config: EMPTY_CONFIG,
    error: null,
  }
  let form: PricingForm | null = null
  let unsubscribe: (() => void) | null = null
  const listeners = new Set<() => void>()

  const publish = (next: PricingSettingsState): void => {
    if (
      next.status === state.status && next.writable === state.writable
      && next.error === state.error && next.config === state.config
    ) return
    state = next
    for (const listener of listeners) listener()
  }

  const sync = (): void => {
    if (form === null) {
      publish({ status: 'unavailable', writable: false, config: state.config, error: state.error })
      return
    }
    const snapshot = form.getSnapshot()
    const ready = snapshot.status === 'ready' && snapshot.value !== undefined
    publish({
      status: ready ? 'ready' : snapshot.status === 'unavailable' ? 'unavailable' : 'loading',
      writable: snapshot.writable === true,
      config: ready ? normalizeClientPricing(snapshot.value) : state.config,
      error: state.error,
    })
  }

  return {
    store: {
      subscribe(listener) {
        listeners.add(listener)
        return () => { listeners.delete(listener) }
      },
      getSnapshot: () => state,
    },
    attach(next) {
      unsubscribe?.()
      unsubscribe = null
      form = next
      if (form !== null) {
        unsubscribe = form.subscribe(sync)
        publish({ ...state, error: null })
      }
      sync()
      return () => {
        unsubscribe?.()
        unsubscribe = null
        form = null
      }
    },
    async save(config) {
      if (form === null) {
        publish({ ...state, error: '宿主没有提供配置表单服务，规则只能导出 / 导入，无法保存' })
        return false
      }
      publish({ ...state, error: null })
      let accepted = false
      try {
        // 整段替换而非逐条改数组：宿主的数组层是整体覆盖语义，逐条改很容易留下旧元素
        accepted = await form.mutate([{ op: 'set', path: ['pricing'], value: configForWrite(config) }])
      } catch (error) {
        publish({ ...state, error: '写入失败：' + (error instanceof Error ? error.message : String(error)) })
        return false
      }
      if (!accepted) publish({ ...state, error: '写入被宿主拒绝（可能是规则在别处被同时修改，请重试）' })
      return accepted
    },
    isServed: () => state.status !== 'unavailable',
    noteError(message) {
      publish({ ...state, error: message })
    },
  }
}

/**
 * 进程内单例：插件在页面里只有一个实例，index.tsx 在 apply 时把它接到 `configForms` 上，
 * 组件用 useSyncExternalStore 订阅即可（避免把服务对象一层层透传进 React 树）。
 */
export const pricingSettings = createPricingSettings()
