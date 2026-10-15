/**
 * 服务端下发的中文说明 → 词典键（双语）。
 * 只收录**固定句子**（价目依据、会话服务降级原因等）；服务端将来改发 code 时这里会自然退化。
 * 未收录的串原样返回，不会把界面变成空白。
 */
import { t } from './i18n.ts'

const KEYS: Record<string, string> = {
  '按台账反推均价估算': 'srv.ratesAverage',
  '暂无价格依据': 'srv.ratesNone',
  '宿主未提供会话服务，无法读取该会话': 'srv.noSessionService',
  '当前注入的会话数据源不支持单会话查询': 'srv.noSingleSession',
  '会话详情不可用': 'srv.sessionDetailUnavailable',
  '宿主没有会话服务': 'srv.noSessionService',
}

export function serverText(text: string | null | undefined): string {
  if (text === null || text === undefined || text === '') return ''
  const key = KEYS[text]
  return key === undefined ? text : t(key)
}
