/** CSS Modules 类名映射的类型占位（构建期由 tsdown 插件生成真实映射）。 */
declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}
