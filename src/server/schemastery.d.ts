/**
 * 宿主自带 `@deepseek-ai/schemastery`（0.2.0-rc.2 实测：`node_modules/@deepseek-ai/schemastery`）。
 *
 * 本插件保持零运行时依赖，不打包它、也不声明 dependencies —— 与 dsh-context 的做法一致，
 * 由宿主在加载插件时解析。这里只声明用到的那一小部分 API，让 tsc 能过。
 */
declare module '@deepseek-ai/schemastery' {
  interface SchemaBuilder {
    (value?: unknown): SchemaBuilder
    default(value: unknown): SchemaBuilder
    required(): SchemaBuilder
    /** 标记为「不重挂载即可改」的字段：宿主设置服务只列出带此标记的字段。 */
    volatile(): SchemaBuilder
    loose(value?: boolean): SchemaBuilder
    toJSON(): unknown
    object(dict: Record<string, unknown>): SchemaBuilder
    array(inner: unknown): SchemaBuilder
    string(): SchemaBuilder
    number(): SchemaBuilder
    boolean(): SchemaBuilder
    union(list: unknown[]): SchemaBuilder
    const(value: unknown): SchemaBuilder
    any(): SchemaBuilder
  }

  const z: SchemaBuilder
  export default z
}
