window.__ModuleLoader__.load({ id: "dsh-key-usage", factory: (require) => {


		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/core/copy.ts
		/**
		* 界面文案词典（zh / en）。规则：界面标签中文 ≤6 字、提示 ≤8 字、英文 ≤2 词；
		* 解释性长句只允许出现在口径弹窗或 tooltip 里，且必须给英文。
		* 新增键 → 同时补齐两种语言；缺键会回落中文（见 i18n.ts）。
		*/
		const zh = {
			"nav.quota": "通道详情",
			"nav.usage": "使用情况",
			"app.title": "使用情况",
			"tab.overview": "概览",
			"tab.detail": "明细",
			"tab.distribution": "分布",
			"tab.sessions": "会话",
			"tab.tools": "工具",
			"tab.words": "提问",
			"tab.quota": "额度",
			"section.paged": "分页",
			"section.scroll": "滚动",
			"section.modeHint": "滚动：所有区块竖排一次铺开；取消勾选则一次只看一个区块",
			"filter.channel": "通道筛选",
			"filter.project": "项目筛选",
			"filter.model": "模型筛选",
			"filter.allProjects": "全部项目",
			"filter.allModels": "全部模型",
			"filter.refreshCycle": "刷新周期",
			"filter.searchChannel": "搜索通道",
			"filter.searchProject": "搜索项目",
			"filter.searchModel": "搜索模型",
			"multi.count": "已选 {count} 项",
			"multi.all": "全选",
			"multi.none": "清空",
			"multi.empty": "没有匹配项",
			"action.exportUsage": "导出明细",
			"action.exportSessions": "导出会话",
			"refresh.off": "关闭",
			"refresh.seconds": "{count} 秒",
			"refresh.minutes": "{count} 分钟",
			"action.refresh": "刷新",
			"action.retry": "重试",
			"err.renderFailed": "页面渲染出错（详情已写入系统日志）",
			"action.settings": "设置",
			"caliber.sessionSource": "按模型 / 项目 / 会话 / 按小时来自宿主会话事件（每个结算样本计一次调用）；成本按两层价目自动估算，命中率 = 缓存读 ÷（输入 + 输出 + 缓存读）。",
			"action.refreshing": "刷新中",
			"action.caliber": "口径",
			"action.close": "关闭",
			"log.title": "系统日志",
			"settings.title": "设置",
			"settings.tabGeneral": "设置",
			"settings.tabLog": "日志",
			"settings.tabCaliber": "口径",
			"settings.sectionDisplay": "显示偏好",
			"settings.sectionAbout": "关于",
			"settings.license": "许可",
			"settings.licenseValue": "MIT（含第三方 MIT 组件）",
			"settings.repo": "仓库",
			"settings.currency": "显示币种",
			"settings.fx": "汇率",
			"settings.pricing": "价目",
			"settings.version": "版本",
			"quota.pricingInfoHint": "价目随包发布，只有点刷新才联网。",
			"log.filterAll": "全部",
			"log.filterWarn": "警告",
			"log.filterError": "错误",
			"log.search": "搜索",
			"log.sourceAll": "全部来源",
			"log.count": "{count} 条",
			"dist.showTable": "明细",
			"dist.hideTable": "收起",
			"dist.modelsDetails": "模型明细",
			"dist.projectsDetails": "项目明细",
			"dist.focusScope": "项目图与项目明细只统计该项目",
			"dist.projectModel": "项目 × 模型",
			"dist.totalCost": "占总成本",
			"dist.cacheSave": "缓存节省",
			"dist.costMix": "Token 构成",
			"dist.byTokenType": "按 token 类型",
			"dist.channelCost": "通道成本",
			"dist.others": "其它 {count} 个",
			"dist.countUnit": "{count} 个",
			"words.kpiPrompts": "提问",
			"words.kpiChars": "字数",
			"words.kpiWords": "词表",
			"words.kpiTop": "最常提",
			"words.times": "{count} 次",
			"words.cloud": "词云",
			"words.wordCount": "{count} 词",
			"words.cloudTip": "{word} · {count} 次 · 占比 {share}%",
			"words.noPrompts": "还没有可统计的提问",
			"tools.empty": "暂无采集",
			"tools.tools": "工具调用",
			"tools.skills": "技能",
			"tools.mcp": "MCP",
			"tools.share": "工具占比",
			"tools.shareTop": "{name} 居首",
			"tools.callsUnit": "次",
			"tools.sessionsUnit": "个会话",
			"tools.skillsUnit": "个",
			"tools.serversUnit": "个 server",
			"tools.other": "其它",
			"tools.otherCount": "其它 {count} 个",
			"tools.dayBarTitle": "{date} · {calls} 次",
			"tools.none": "暂无",
			"log.copy": "复制",
			"log.clear": "清空",
			"log.export": "导出",
			"log.empty": "暂无日志",
			"log.retry": "重试",
			"log.view": "查看系统日志",
			"log.issue": "快照问题",
			"log.coveragePartial": "数据不完整",
			"log.copyBlocked": "复制被浏览器拦截",
			"log.exportBlocked": "导出被浏览器拦截",
			"caliber.title": "口径说明",
			"caliber.version": "版本 {version}",
			"caliber.source": "按天数据优先取宿主台账（含官方成本），台账没记录的日子回退会话事件补充{days}；项目 / 会话 / 按模型 / 按小时来自会话事件，每个样本计一次调用。",
			"caliber.sourceDays": "（当前有 {count} 天）",
			"caliber.cost": "成本两层自动生效，不需要填任何价格：本通道价目（内置厂商价目 / LiteLLM 别名命中）> 跨通道唯一的厂商官方价；都不命中显示 —，绝不按台账反推均价猜一个数字。",
			"caliber.costHint": "成本按两层价目自动估算：本通道价目（内置厂商价目 > LiteLLM 聚合价 USD）> 跨通道唯一的厂商官方价；命中率 = 缓存读 /（输入 + 输出 + 缓存读）",
			"caliber.pricingInfo": "价目来源与文件：内置厂商官方价目随包发布（data/pricing-catalog.yml，18 条）；聚合价目取自 LiteLLM（MIT），随包快照优先、本机刷新副本更优先；刷新只写本机副本，校验不过不覆盖。",
			"caliber.refresh": "页面数据来自统一快照，本地数据每 5 分钟重建；余额与订阅窗口只在打开页面或点刷新时联网，查不到就沿用上一份快照并标出时间与原因。",
			"common.calls": "调用",
			"common.channel": "通道",
			"common.workspace": "工作区",
			"common.sessionSuffix": " 个会话",
			"common.modelSuffix": " 个模型",
			"common.subagentSuffix": " 个子会话",
			"s.id": "会话 id",
			"s.title": "标题",
			"s.prompt": "首条提问",
			"s.first": "首次",
			"s.last": "最近",
			"s.crossDays": "跨天",
			"s.parentFocusNote": "只看该会话及其子会话（含父会话行）",
			"s.loadMore": "加载更多（+{count}）",
			"s.shownCount": "已显示 {shown} / {total} 个会话",
			"s.hitRate": "命中率(%)",
			"s.costNative": "成本(原币合计)",
			"s.costSource": "成本来源",
			"s.archived": "已归档",
			"s.yes": "是",
			"s.no": "否",
			"s.loading": "读取中",
			"s.unavailable": "会话数据不可用",
			"s.partial": "会话数据不完整",
			"s.partialTail": " 个会话读取失败",
			"s.searchPlaceholder": "搜索标题 / id",
			"s.filterChannel": "按通道筛选",
			"s.allChannels": "全部通道",
			"s.filterRange": "时间范围",
			"s.days7": "近 7 天",
			"s.days30": "近 30 天",
			"s.rangeAll": "全部",
			"s.sort": "排序",
			"s.sortRecent": "最新会话",
			"s.sortTokensDesc": "Tokens 最多",
			"s.sortTokensAsc": "Tokens 最少",
			"s.sortDuration": "时长最长",
			"s.sortCost": "成本最高",
			"s.sortHit": "命中率最高",
			"s.sortCalls": "调用最多",
			"s.filterArchive": "归档筛选",
			"s.archiveHide": "隐藏已归档",
			"s.archiveAll": "含已归档",
			"s.filterSubagent": "子会话筛选",
			"s.subagentHide": "只显示主会话",
			"s.subagentAll": "含子会话",
			"s.noCost": "无价目依据",
			"s.expandModels": "展开模型",
			"s.collapseModels": "收起模型",
			"s.noPrompt": "（无提问）",
			"s.noWorkspace": "无工作区",
			"s.gotoProject": "在项目用量筛选：",
			"s.focusChildren": "只看该会话与其 ",
			"s.focusChildrenTail": " 个子会话（tokens 不并入本行）",
			"d.title": "会话详情",
			"d.close": "关闭会话详情",
			"d.unknownReason": "未知原因",
			"d.loadFailed": "会话详情读取失败",
			"d.unavailable": "会话用量不可用",
			"d.partial": "会话用量不完整",
			"d.costMode": "计费模式",
			"d.activeDays": "活跃天数",
			"d.hitRate": "命中率",
			"d.cacheWrite": "缓存写",
			"d.ioNote": "输入 + 输出 + 缓存读",
			"d.billingOnly": "只参与计费",
			"d.busiest": "最忙 {hour} 时，",
			"d.first": "首次",
			"d.last": "最近",
			"d.duration": "时长",
			"d.subagentCount": "子会话 {count} 个",
			"d.systemSession": "系统会话",
			"d.samples": "样本数",
			"d.noHours": "无按小时用量",
			"o.noBilling": "无计费",
			"o.notQueried": "未查询",
			"r.today": "今天",
			"r.week": "7 天",
			"r.month": "30 天",
			"r.total": "全部",
			"r.90days": "90 天",
			"r.custom": "自定义",
			"c.date": "日期",
			"c.calls": "调用",
			"c.input": "输入",
			"c.output": "输出",
			"c.cacheRead": "缓存读",
			"c.hitRate": "命中率(%)",
			"c.costNative": "成本(原币合计)",
			"d.chartHourPrefix": "按小时 Tokens（",
			"d.chartDayPrefix": "按天 Tokens（",
			"d.chartDaysSuffix": " 天）",
			"d.chartHourAriaPrefix": "按小时 Tokens 柱状图（",
			"d.chartAriaMiddle": "），共 ",
			"d.chartHourAriaSuffix": " 个小时，含输入 / 输出 / 缓存读",
			"d.chartDayAriaPrefix": "按天 Tokens 柱状图，共 ",
			"d.chartDayAriaSuffix": " 天（含无用量日），含输入 / 输出 / 缓存读",
			"d.callCount": "调用次数",
			"d.backToParent": "← 返回主会话",
			"d.callTimes": "{count} 次",
			"d.channelCount": "通道数",
			"d.activeDayCount": "使用天数",
			"d.hitRateShort": "缓存命中率",
			"d.dailyAvg": "日均 Tokens",
			"detail.dailyCost": "每日成本",
			"detail.dailyDetail": "逐日明细",
			"detail.metricCost": "费用",
			"detail.metricTokens": "Token",
			"detail.metricOutput": "输出 Token",
			"detail.metricSessions": "会话",
			"detail.byDay": "按天",
			"detail.byChannel": "按通道",
			"detail.byModel": "按模型",
			"detail.total": "合计",
			"detail.dailyAvg": "日均",
			"detail.peak": "峰值",
			"detail.delta": "环比",
			"detail.source": "来源",
			"detail.partialCost": "部分",
			"detail.model": "模型",
			"detail.rows": "{count} 行",
			"detail.groupCount": "{count} 个",
			"detail.expand": "展开模型明细",
			"detail.collapse": "收起模型明细",
			"detail.barsAria": "{metric}柱状图：{count} 天",
			"m.channelId": "通道 id",
			"m.model": "模型",
			"m.sessions": "会话数",
			"m.lastActive": "最近活跃",
			"m.loading": "按模型数据读取中",
			"m.unavailable": "按模型数据不可用",
			"m.search": "搜索模型名、通道",
			"p.path": "项目路径",
			"p.mainChannel": "主要通道",
			"p.archivedSessions": "已归档",
			"p.search": "搜索项目路径",
			"p.focusPrefix": "仅看项目：",
			"p.orphan": "未归入工作区",
			"p.orphanHint": "{count} 个目录不在工作区里",
			"p.pathsOpen": "展开目录",
			"p.pathsClose": "收起目录",
			"p.clearFilter": "清除筛选",
			"p.archivePrefix": "（ ",
			"p.archiveSuffix": " 个已归档）",
			"p.empty": "无匹配项目",
			"p.noUsage": "没有可展示的用量",
			"h.month": "月",
			"h.summaryPrefix": "近 9 个月 · ",
			"h.summarySuffix": " 个活跃日",
			"h.noUsage": "当日无用量",
			"h.noLedger": "台账未覆盖",
			"sh.shareAll": "全部占比",
			"sh.channels": "通道占比",
			"sh.models": "模型占比",
			"sh.noData": "暂无数据",
			"sh.morePrefix": "，等 ",
			"sh.moreSuffix": " 项",
			"issue.build-failed": "快照构建失败，沿用上一份",
			"issue.channels-failed": "通道清单读取失败",
			"issue.quota-refresh": "配额后台补查",
			"issue.build-duration": "构建耗时偏长",
			"issue.quota-failed": "配额查询失败",
			"issue.write-failed": "快照写入失败",
			"srv.rateNoteEn": "价目细节见下方费率与来源",
			"srv.code.noSnapshot": "本机还没有快照",
			"srv.code.noCredential": "没有可用凭据",
			"srv.code.unsupported": "该通道无接口",
			"srv.code.hostUnavailable": "宿主接口不可用",
			"srv.code.fetchFailed": "查询失败",
			"srv.code.timeout": "查询超时",
			"fmt.dayHour": "{days} 天 {hours}h",
			"srv.ratesNone": "暂无价格依据",
			"srv.noSessionService": "宿主没有会话服务",
			"srv.noSingleSession": "不支持单会话查询",
			"srv.sessionDetailUnavailable": "会话详情不可用",
			"srv.fxCache": "缓存汇率（{hours} 小时内）",
			"srv.fxLive": "实时汇率来自 {host}",
			"srv.fxFailedCache": "上游失败，回落缓存",
			"srv.fxFailedDefault": "取汇率失败，暂用默认 {rate}",
			"m.others": "其它",
			"fx.live": "实时上游",
			"fx.cache": "缓存",
			"fx.default": "默认值",
			"fx.missing": "还没取到汇率，跨币种按原币种显示",
			"fx.stale": "已过期",
			"fx.defaultPrefix": "用默认汇率 ",
			"fx.defaultSuffix": "，未联网",
			"api.notFound": "HTTP 404：端点不存在",
			"api.requestFailed": "请求失败",
			"api.refreshTimeout": "刷新超时",
			"api.refreshTimeoutTail": " 秒内没有响应",
			"api.refreshRejected": "刷新被服务端拒绝",
			"rows.hiddenPrefix": "已隐藏 ",
			"rows.hiddenSuffix": " 行无 Token 记录",
			"ch.ok": "正常",
			"ch.warn": "偏高",
			"ch.danger": "告警",
			"ch.off": "未配置",
			"ch.inSub": "订阅内",
			"ch.noBilling": "无计费",
			"ch.subscription": "订阅制",
			"ch.metered": "按量计费",
			"ch.free": "免费额度",
			"ch.local": "本地端点",
			"ch.notQueried": "未查询",
			"src.liveFile": "本地刷新文件",
			"src.bundled": "随包快照",
			"src.notLoaded": "未装载",
			"src.unknown": "未知",
			"cso.official": "官方",
			"cso.catalog": "官方价",
			"cso.aggregate": "聚合",
			"csh.official": "官方：台账记录的厂商账单金额",
			"csh.catalog": "官方价：按内置厂商官方价目算出",
			"csh.aggregate": "聚合：LiteLLM 聚合价目（美元），点刷新价目可更新",
			"csh.none": "暂无价格依据",
			"csh.unknown": "成本来源未识别",
			"part.suffix": " · 部分",
			"part.hint": "缓存写入价未收录，按未命中价计",
			"s.showPrefix": "显示 ",
			"s.showSuffix": " 个会话",
			"s.amount": "金额",
			"s.unknownDate": "未知日期",
			"r.yesterday": "昨日",
			"c.cost": "成本",
			"q.resetUnknown": "重置于 —",
			"q.snapshotPrefix": "，快照 ",
			"q.modelRatesCount": " 个模型",
			"q.ratesRange": " · 近 30 天",
			"q.priceEntriesSuffix": " 条价目",
			"q.noBasis": "无依据",
			"export.csv": "导出 CSV",
			"export.json": "导出 JSON",
			"d.hourUnit": " 时 · ",
			"d.callUnit": " 次",
			"dd.sum": "合计",
			"empty.noUsage": "无用量记录",
			"h.summary": "热力图",
			"sh.shareByTokens": "占比 · 按 Tokens",
			"m.share": "占比",
			"m.empty": "无匹配模型",
			"p.project": "项目",
			"o.type": "类型",
			"o.balanceWindow": "余额 / 窗口",
			"o.cost30": "30 天成本",
			"o.detailArrow": "明细 →",
			"o.noChannels": "未读到通道配置",
			"o.ledgerHint": "—",
			"o.snapshotHint": "—",
			"h.wd0": "日",
			"h.wd1": "一",
			"h.wd2": "二",
			"h.wd3": "三",
			"h.wd4": "四",
			"h.wd5": "五",
			"h.wd6": "六",
			"d.loading": "会话详情读取中",
			"d.noDetail": "没有可展示的详情",
			"d.noCostBasis": "本通道与同名模型都没有价目，只能显示 —",
			"d.noPrompt": "没有人类提问（可能是 teammate / 系统会话）",
			"d.byModel": "逐模型用量",
			"d.hoursNote": "一天里的分布（各小时合计，跨天累加）",
			"d.ledgerLoading": "台账读取中或不可用",
			"d.sourceSession": "来源：会话事件（该日台账无记录）",
			"date.select": "选择日期",
			"date.startHint": "点击选择开始日期",
			"date.endHint": "点击选择结束日期",
			"date.clear": "清除",
			"date.prevMonth": "上一个月",
			"date.nextMonth": "下一个月",
			"s.timeDuration": "时间 / 时长",
			"s.empty": "无匹配会话",
			"s.sessionCost": "会话成本",
			"q.offPeakNow": " · 当前空闲价",
			"balance.total": "总余额",
			"balance.credit": "充值",
			"balance.grant": "赠送",
			"balance.balance": "余额",
			"balance.totalInline": "合计 {value}",
			"window.5h": "5 小时窗口",
			"w.5h": "5 小时",
			"w.week": "本周",
			"w.month": "本月",
			"w.day": "当日",
			"window.day": "当日窗口",
			"window.week": "本周窗口",
			"window.month": "本月窗口",
			"unit.perMillion": "每百万 tokens",
			"source.official": "官方",
			"source.catalog": "官方价",
			"source.aggregate": "聚合",
			"source.none": "无依据",
			"quota.resetPrefix": "重置于 ",
			"quota.resetAt": "重置于",
			"quota.noResponse": "没拿到服务端响应",
			"quota.fxBad": "汇率无法解析",
			"quota.fxUnavailable": "汇率不可用",
			"quota.fxCacheHint": "汇率在服务端缓存 12 小时",
			"quota.fetchFx": "取汇率",
			"quota.refreshFx": "刷新汇率",
			"quota.refreshPrices": "刷新价目",
			"quota.ratesHint": "近 30 天模型单价",
			"quota.notQueried": "未查询",
			"quota.loadingRates": "读取单价",
			"quota.ratesUnavailable": "单价表不可用",
			"quota.noUsage": "近 30 天无用量",
			"quota.noFourRates": "没有四档单价",
			"quota.sourceLabel": "来源",
			"quota.updated": "已更新",
			"quota.recomputed": "服务端没返回明细，已按新价目重算",
			"quota.priceUnit": "单价",
			"quota.tokensColumn": "用量",
			"quota.liveFailedShort": "实时查询未成功",
			"quota.snapshotAt": "数据时间 {time} · 本机快照 · ",
			"quota.pricingFailedShort": "刷新价目失败",
			"quota.ratesEmpty": "近 30 天无模型用量",
			"quota.justChecked": "刚查",
			"quota.quotaLabel": "额度",
			"quota.free": "免费",
			"quota.unpriced": "未计价",
			"quota.endpoint": "端点",
			"quota.local": "本地",
			"quota.remote": "远程",
			"quota.network": "联网",
			"quota.offline": "不联网",
			"quota.online": "联网",
			"quota.members": "成员",
			"quota.impact": "影响",
			"quota.impactValue": "用量计入，成本显示 —",
			"quota.channelFilter": "选择在额度页显示的通道",
			"quota.allChannels": "全部显示",
			"quota.channelCount": "显示 {count} 个",
			"quota.noChannelSelected": "未选中通道",
			"err.noLiveQuery": "未启用实时查询",
			"err.noApiKey": "未配置 API Key",
			"err.noSnapshot": "没有快照可用",
			"err.network": "网络不可达",
			"err.timeout": "请求超时",
			"err.unauthorized": "凭据被拒绝（401/403）",
			"err.badJson": "响应无法解析",
			"err.tooLarge": "响应异常大",
			"err.http": "HTTP {code}",
			"err.detail.noKey": "未配置 Key",
			"err.detail.rejected": "凭据被拒绝",
			"err.detail.keyMissing": "Key 未填写",
			"err.detail.local": "本地端点无接口",
			"err.detail.free": "免费额度无接口",
			"err.detail.none": "无余额接口",
			"sessions.top": "最耗会话",
			"sessions.shape": "会话形态",
			"sessions.recent": "最近会话",
			"sessions.scope": "会话范围",
			"sessions.all": "全部会话",
			"sessions.hideArchived": "隐藏已归档",
			"sessions.count": "{count} 个",
			"sessions.searchPlaceholder": "搜索会话",
			"sessions.noData": "暂无会话",
			"sessions.metricTokens": "Token",
			"sessions.metricCost": "费用",
			"sessions.metricDuration": "时长",
			"sessions.metricMessages": "消息",
			"sessions.metricTools": "工具调用",
			"sessions.calls": "{count} 次调用",
			"sessions.crossDays": "{days} 天",
			"sessions.subagents": "{count} 子会话",
			"sessions.subagentTokens": "子会话合计 {tokens}",
			"sessions.callsBucket": "按结算样本数分档",
			"overview.kpiCost": "本期成本",
			"overview.kpiTokens": "Tokens",
			"overview.kpiCache": "缓存命中",
			"overview.kpiSessions": "会话",
			"overview.kpiDaily": "日均",
			"overview.prev": "上期 {value}",
			"overview.ioSplit": "入 {input} · 出 {output}",
			"overview.cacheLine": "缓存读 {value} · 省 {saved}",
			"overview.cacheReadOnly": "缓存读 {value}",
			"overview.kpiCacheSaved": "缓存节省",
			"overview.ofCost": "占成本 {percent}%",
			"overview.activeDays": "活跃 {count} 天",
			"overview.streak": "最长连续 {count} 天",
			"overview.busiest": "最忙 {date}（{value}）",
			"overview.trend": "使用趋势",
			"overview.panelProjects": "项目",
			"overview.panelModels": "模型",
			"overview.hourly": "按时段",
			"overview.mActivity": "活跃度",
			"overview.mTokens": "Token",
			"overview.mOutTokens": "输出 Token",
			"overview.mCacheRead": "缓存读",
			"overview.mSessions": "会话",
			"overview.mSpend": "费用",
			"overview.mCost": "成本",
			"overview.more": "{total} 个 · 还有 {rest} 个 →",
			"overview.noData": "暂无数据",
			"overview.noCalls": "无按天调用数",
			"overview.noHourly": "暂无按时段数据",
			"overview.busiestHour": "最忙：周{weekday} {hour}",
			"overview.callsUnit": "次",
			"overview.sessionCount": "{count} 会话",
			"overview.monthLabel": "{month}月",
			"overview.monthLabelYear": "{year}年{month}月",
			"overview.legendLess": "少",
			"overview.legendMore": "多"
		};
		const en = {
			"nav.quota": "Channel detail",
			"nav.usage": "Usage",
			"app.title": "Usage",
			"tab.overview": "Overview",
			"tab.detail": "Details",
			"tab.distribution": "Distribution",
			"tab.sessions": "Sessions",
			"tab.tools": "Tools",
			"tab.words": "Prompts",
			"tab.quota": "Quota",
			"section.paged": "Paged",
			"section.scroll": "Scroll",
			"section.modeHint": "Scroll: all sections stacked on one page; uncheck to show one section at a time",
			"filter.channel": "Channel filter",
			"filter.project": "Project filter",
			"filter.model": "Model filter",
			"filter.allProjects": "All projects",
			"filter.allModels": "All models",
			"filter.refreshCycle": "Refresh interval",
			"filter.searchChannel": "Search channels",
			"filter.searchProject": "Search projects",
			"filter.searchModel": "Search models",
			"multi.count": "{count} selected",
			"multi.all": "All",
			"multi.none": "Clear",
			"multi.empty": "No match",
			"action.exportUsage": "Export details",
			"action.exportSessions": "Export sessions",
			"refresh.off": "Off",
			"refresh.seconds": "{count}s",
			"refresh.minutes": "{count} min",
			"action.refresh": "Refresh",
			"action.retry": "Retry",
			"err.renderFailed": "This page failed to render (details are in the system log)",
			"action.settings": "Settings",
			"caliber.sessionSource": "Models / projects / sessions / hourly come from host session events (one call per billing sample); cost is estimated from the two price layers; hit rate = cache read ÷ (input + output + cache read).",
			"action.refreshing": "Refreshing",
			"action.caliber": "Method",
			"action.close": "Close",
			"log.title": "System log",
			"settings.title": "Settings",
			"settings.tabGeneral": "Settings",
			"settings.tabLog": "Logs",
			"settings.tabCaliber": "Method",
			"settings.sectionDisplay": "Display preferences",
			"settings.sectionAbout": "About",
			"settings.license": "License",
			"settings.licenseValue": "MIT (with third-party MIT components)",
			"settings.repo": "Repository",
			"settings.currency": "Currency",
			"settings.fx": "FX rate",
			"settings.pricing": "Prices",
			"settings.version": "Version",
			"quota.pricingInfoHint": "Prices ship with the plugin; only Refresh goes online.",
			"log.filterAll": "All",
			"log.filterWarn": "Warning",
			"log.filterError": "Error",
			"log.search": "Search",
			"log.sourceAll": "All sources",
			"log.count": "{count} entries",
			"dist.showTable": "Details",
			"dist.hideTable": "Hide",
			"dist.modelsDetails": "Model details",
			"dist.projectsDetails": "Project details",
			"dist.focusScope": "project charts and table are filtered to this project",
			"dist.projectModel": "Project × model",
			"dist.totalCost": "Share of cost",
			"dist.cacheSave": "Cache savings",
			"dist.costMix": "Token mix",
			"dist.byTokenType": "By token type",
			"dist.channelCost": "Channel cost",
			"dist.others": "Others ({count})",
			"dist.countUnit": "{count}",
			"words.kpiPrompts": "Prompts",
			"words.kpiChars": "Chars",
			"words.kpiWords": "Words",
			"words.kpiTop": "Top word",
			"words.times": "{count} times",
			"words.cloud": "Word cloud",
			"words.wordCount": "{count} words",
			"words.cloudTip": "{word} · {count} · {share}%",
			"words.noPrompts": "No prompts to count yet",
			"tools.empty": "No data",
			"tools.tools": "Tool calls",
			"tools.skills": "Skills",
			"tools.mcp": "MCP",
			"tools.share": "Tool share",
			"tools.shareTop": "{name} leads",
			"tools.callsUnit": "calls",
			"tools.sessionsUnit": "sessions",
			"tools.skillsUnit": "skills",
			"tools.serversUnit": "servers",
			"tools.other": "Other",
			"tools.otherCount": "Other {count}",
			"tools.dayBarTitle": "{date} · {calls} calls",
			"tools.none": "None",
			"log.copy": "Copy",
			"log.clear": "Clear",
			"log.export": "Export",
			"log.empty": "No log entries",
			"log.retry": "Retry",
			"log.view": "View log",
			"log.issue": "Snapshot issue",
			"log.coveragePartial": "Incomplete data",
			"log.copyBlocked": "Copy blocked by the browser",
			"log.exportBlocked": "Export blocked by the browser",
			"caliber.title": "Method",
			"caliber.version": "Version {version}",
			"caliber.source": "Daily figures come from the host ledger (official cost included); days missing there fall back to session events{days}. Projects, sessions, models and hourly buckets come from session events, one call per sample.",
			"caliber.sourceDays": " ({count} days)",
			"caliber.cost": "Cost resolves in two layers: this channel (built-in vendor catalog, or LiteLLM alias match) > the unique cross-channel vendor official price (unique match). — means no basis; the ledger average is never used as a guess.",
			"caliber.costHint": "Cost comes from two price layers: this channel (bundled vendor catalog > LiteLLM aggregate USD) > the unique cross-channel vendor official price (unique match); hit rate = cache read / (input + output + cache read)",
			"caliber.pricingInfo": "Price sources and files: the vendor catalog ships with the plugin (data/pricing-catalog.yml, 18 entries); the aggregate comes from LiteLLM (MIT), where the local refreshed copy takes priority over the bundled snapshot; refreshing writes only the local copy and never overwrites it when validation fails.",
			"caliber.refresh": "Page data comes from one snapshot, rebuilt locally every 5 minutes. Balance and quota windows only go online when you open the page or refresh; stale values keep their timestamp and reason.",
			"common.calls": "Calls",
			"common.channel": "Channel",
			"common.workspace": "Workspace",
			"common.sessionSuffix": " sessions",
			"common.modelSuffix": " models",
			"common.subagentSuffix": " subagents",
			"s.id": "Session",
			"s.title": "Title",
			"s.prompt": "First prompt",
			"s.first": "First",
			"s.last": "Last",
			"s.crossDays": "Days",
			"s.parentFocusNote": "Showing this session and its subagents (parent row included)",
			"s.loadMore": "Load more (+{count})",
			"s.shownCount": "Showing {shown} / {total} sessions",
			"s.hitRate": "Hit %",
			"s.costNative": "Cost (native)",
			"s.costSource": "Cost source",
			"s.archived": "Archived",
			"s.yes": "Yes",
			"s.no": "No",
			"s.loading": "Loading",
			"s.unavailable": "Sessions unavailable",
			"s.partial": "Incomplete session data",
			"s.partialTail": " sessions failed",
			"s.searchPlaceholder": "Search title / id",
			"s.filterChannel": "Channel",
			"s.allChannels": "All channels",
			"s.filterRange": "Range",
			"s.days7": "7 days",
			"s.days30": "30 days",
			"s.rangeAll": "All",
			"s.sort": "Sort",
			"s.sortRecent": "Latest",
			"s.sortTokensDesc": "Tokens desc",
			"s.sortTokensAsc": "Tokens asc",
			"s.sortDuration": "Longest",
			"s.sortCost": "Cost desc",
			"s.sortHit": "Hit % desc",
			"s.sortCalls": "Calls desc",
			"s.filterArchive": "Archive",
			"s.archiveHide": "Hide archived",
			"s.archiveAll": "With archived",
			"s.filterSubagent": "Sub-sessions",
			"s.subagentHide": "Main only",
			"s.subagentAll": "With sub-sessions",
			"s.noCost": "No price basis",
			"s.expandModels": "Show models",
			"s.collapseModels": "Hide models",
			"s.noPrompt": "(no prompt)",
			"s.noWorkspace": "No workspace",
			"s.gotoProject": "Filter in Projects: ",
			"s.focusChildren": "Focus this session + ",
			"s.focusChildrenTail": " sub-sessions (tokens not merged)",
			"d.title": "Session",
			"d.close": "Close session",
			"d.unknownReason": "Unknown reason",
			"d.loadFailed": "Failed to load session detail",
			"d.unavailable": "Session usage unavailable",
			"d.partial": "Session usage incomplete",
			"d.costMode": "Billing",
			"d.activeDays": "Active days",
			"d.hitRate": "Hit %",
			"d.cacheWrite": "Cache write",
			"d.ioNote": "input + output + cache read",
			"d.billingOnly": "billing only",
			"d.busiest": "Busiest {hour}h, ",
			"d.first": "First",
			"d.last": "Last",
			"d.duration": "Duration",
			"d.subagentCount": "{count} subagent sessions",
			"d.systemSession": "System session",
			"d.samples": "Samples",
			"d.noHours": "No hourly usage",
			"o.noBilling": "No billing",
			"o.notQueried": "Not queried",
			"r.today": "Today",
			"r.week": "7 days",
			"r.month": "30 days",
			"r.total": "All",
			"r.90days": "90 days",
			"r.custom": "Custom",
			"c.date": "Date",
			"c.calls": "Calls",
			"c.input": "Input",
			"c.output": "Output",
			"c.cacheRead": "Cache read",
			"c.hitRate": "Hit %",
			"c.costNative": "Cost (native)",
			"d.chartHourPrefix": "Hourly tokens (",
			"d.chartDayPrefix": "Daily tokens (",
			"d.chartDaysSuffix": " days)",
			"d.chartHourAriaPrefix": "Hourly token bars (",
			"d.chartAriaMiddle": "), ",
			"d.chartHourAriaSuffix": " hours, input / output / cache read",
			"d.chartDayAriaPrefix": "Daily token bars, ",
			"d.chartDayAriaSuffix": " days (including empty days), input / output / cache read",
			"d.callCount": "Calls",
			"d.backToParent": "← Back to parent session",
			"d.callTimes": "{count} calls",
			"d.channelCount": "Channels",
			"d.activeDayCount": "Days used",
			"d.hitRateShort": "Cache hit rate",
			"d.dailyAvg": "Daily avg tokens",
			"detail.dailyCost": "Daily cost",
			"detail.dailyDetail": "Daily detail",
			"detail.metricCost": "Cost",
			"detail.metricTokens": "Tokens",
			"detail.metricOutput": "Output",
			"detail.metricSessions": "Sessions",
			"detail.byDay": "By day",
			"detail.byChannel": "By channel",
			"detail.byModel": "By model",
			"detail.total": "Total",
			"detail.dailyAvg": "Daily avg",
			"detail.peak": "Peak",
			"detail.delta": "Change",
			"detail.source": "Source",
			"detail.partialCost": "partial",
			"detail.model": "Model",
			"detail.rows": "{count} rows",
			"detail.groupCount": "{count}",
			"detail.expand": "Show models",
			"detail.collapse": "Hide models",
			"detail.barsAria": "{metric} bars: {count} days",
			"m.channelId": "Channel id",
			"m.model": "Model",
			"m.sessions": "Sessions",
			"m.lastActive": "Last active",
			"m.loading": "Loading models",
			"m.unavailable": "Models unavailable",
			"m.search": "Search model, channel",
			"p.path": "Project",
			"p.mainChannel": "Main channel",
			"p.archivedSessions": "Archived",
			"p.search": "Search project path",
			"p.focusPrefix": "Project only: ",
			"p.orphan": "Outside workspaces",
			"p.orphanHint": "{count} folders outside workspaces",
			"p.pathsOpen": "Show folders",
			"p.pathsClose": "Hide folders",
			"p.clearFilter": "Clear filter",
			"p.archivePrefix": "(",
			"p.archiveSuffix": " archived included)",
			"p.empty": "No matches",
			"p.noUsage": "No usage to show",
			"h.month": "Month",
			"h.summaryPrefix": "Last 9 months · ",
			"h.summarySuffix": " active days",
			"h.noUsage": "No usage",
			"h.noLedger": "Not in ledger",
			"sh.shareAll": "All shares",
			"sh.channels": "Channels",
			"sh.models": "Models",
			"sh.noData": "No data",
			"sh.morePrefix": ", +",
			"sh.moreSuffix": " more",
			"issue.build-failed": "Snapshot build failed; keeping the previous one",
			"issue.channels-failed": "Channel list read failed",
			"issue.quota-refresh": "Quota refresh (background)",
			"issue.build-duration": "Build is slow",
			"issue.quota-failed": "Quota query failed",
			"issue.write-failed": "Snapshot write failed",
			"srv.rateNoteEn": "see rates, source and date below",
			"srv.code.noSnapshot": "no local snapshot yet",
			"srv.code.noCredential": "no credential available",
			"srv.code.unsupported": "channel has no API",
			"srv.code.hostUnavailable": "host API unavailable",
			"srv.code.fetchFailed": "query failed",
			"srv.code.timeout": "query timed out",
			"fmt.dayHour": "{days}d {hours}h",
			"srv.ratesNone": "no price basis",
			"srv.noSessionService": "host has no session service",
			"srv.noSingleSession": "single-session query unsupported",
			"srv.sessionDetailUnavailable": "session detail unavailable",
			"srv.fxCache": "cached FX (within {hours}h)",
			"srv.fxLive": "live FX from {host}",
			"srv.fxFailedCache": "upstream failed, using cache",
			"srv.fxFailedDefault": "FX unavailable, using default {rate}",
			"m.others": "Others",
			"fx.live": "live upstream",
			"fx.cache": "cached",
			"fx.default": "Default",
			"fx.missing": "No FX rate yet, showing original currencies",
			"fx.stale": "Stale",
			"fx.defaultPrefix": "Using default rate ",
			"fx.defaultSuffix": ", offline",
			"api.notFound": "HTTP 404: endpoint missing",
			"api.requestFailed": "Request failed",
			"api.refreshTimeout": "Refresh timeout",
			"api.refreshTimeoutTail": " s without a response",
			"api.refreshRejected": "Refresh rejected by server",
			"rows.hiddenPrefix": "",
			"rows.hiddenSuffix": " rows without tokens hidden",
			"ch.ok": "OK",
			"ch.warn": "High",
			"ch.danger": "Alert",
			"ch.off": "Not set",
			"ch.inSub": "In plan",
			"ch.noBilling": "No billing",
			"ch.subscription": "Subscription",
			"ch.metered": "Metered",
			"ch.free": "Free tier",
			"ch.local": "Local",
			"ch.notQueried": "Not queried",
			"src.liveFile": "Local file",
			"src.bundled": "Bundled",
			"src.notLoaded": "Not loaded",
			"src.unknown": "Unknown",
			"cso.official": "Official",
			"cso.catalog": "Catalog",
			"cso.aggregate": "Aggregate",
			"csh.official": "Official: vendor bill from the ledger",
			"csh.catalog": "Catalog: built-in vendor price list",
			"csh.aggregate": "Aggregate: LiteLLM price list (USD), refreshable",
			"csh.none": "No price basis",
			"csh.unknown": "Unknown cost source",
			"part.suffix": " · partial",
			"part.hint": "cache-write price missing, uses the miss price",
			"s.showPrefix": "Show ",
			"s.showSuffix": " sessions",
			"s.amount": "Amount",
			"s.unknownDate": "Unknown date",
			"r.yesterday": "Yesterday",
			"c.cost": "Cost",
			"q.resetUnknown": "Resets —",
			"q.snapshotPrefix": ", snapshot ",
			"q.modelRatesCount": " models",
			"q.ratesRange": " · last 30 days",
			"q.priceEntriesSuffix": " price entries",
			"q.noBasis": "None",
			"export.csv": "CSV",
			"export.json": "JSON",
			"d.hourUnit": "h · ",
			"d.callUnit": " calls",
			"dd.sum": "Total",
			"empty.noUsage": "No usage",
			"h.summary": "Heatmap",
			"sh.shareByTokens": "share · by tokens",
			"m.share": "Share",
			"m.empty": "No matches",
			"p.project": "Project",
			"o.type": "Type",
			"o.balanceWindow": "Balance / window",
			"o.cost30": "30d cost",
			"o.detailArrow": "Details →",
			"o.noChannels": "No channel config",
			"o.ledgerHint": "—",
			"o.snapshotHint": "—",
			"h.wd0": "S",
			"h.wd1": "M",
			"h.wd2": "T",
			"h.wd3": "W",
			"h.wd4": "T",
			"h.wd5": "F",
			"h.wd6": "S",
			"d.loading": "Loading session",
			"d.noDetail": "No detail to show",
			"d.noCostBasis": "No price for this channel or the same-named model, showing —",
			"d.noPrompt": "No human prompt (teammate or system session)",
			"d.byModel": "By model",
			"d.hoursNote": "Distribution over a day (hours summed, cross-day merged)",
			"d.ledgerLoading": "Ledger loading or unavailable",
			"d.sourceSession": "Source: session events (no ledger entry that day)",
			"date.select": "Select date",
			"date.startHint": "Pick the start date",
			"date.endHint": "Pick the end date",
			"date.clear": "Clear",
			"date.prevMonth": "Previous month",
			"date.nextMonth": "Next month",
			"s.timeDuration": "Time / duration",
			"s.empty": "No matches",
			"s.sessionCost": "Session cost",
			"q.offPeakNow": " · off-peak now",
			"balance.total": "Total",
			"balance.credit": "Credit",
			"balance.grant": "Granted",
			"balance.balance": "Balance",
			"balance.totalInline": "Total {value}",
			"window.5h": "5-hour",
			"w.5h": "5h",
			"w.week": "Weekly",
			"w.month": "Monthly",
			"w.day": "Daily",
			"window.day": "Daily",
			"window.week": "Weekly",
			"window.month": "Monthly",
			"unit.perMillion": "per 1M tokens",
			"source.official": "Official",
			"source.catalog": "Catalog",
			"source.aggregate": "Aggregate",
			"source.none": "None",
			"quota.resetPrefix": "重置于 ",
			"quota.resetAt": "Resets",
			"quota.noResponse": "No response",
			"quota.fxBad": "Bad FX data",
			"quota.fxUnavailable": "FX unavailable",
			"quota.fxCacheHint": "FX is cached server-side for 12h",
			"quota.fetchFx": "Get FX",
			"quota.refreshFx": "Refresh FX",
			"quota.refreshPrices": "Refresh prices",
			"quota.ratesHint": "Model rates (30d)",
			"quota.notQueried": "Not queried",
			"quota.loadingRates": "Loading rates",
			"quota.ratesUnavailable": "Rates unavailable",
			"quota.noUsage": "No usage in 30d",
			"quota.noFourRates": "No 4-tier rates",
			"quota.sourceLabel": "Source",
			"quota.updated": "Updated",
			"quota.recomputed": "No detail from server; recomputed with the new prices",
			"quota.priceUnit": "Rates",
			"quota.tokensColumn": "Tokens",
			"quota.liveFailedShort": "Live query failed",
			"quota.snapshotAt": "Snapshot {time} · local cache · ",
			"quota.pricingFailedShort": "Price refresh failed",
			"quota.ratesEmpty": "no model usage in 30 days",
			"quota.justChecked": "Just now",
			"quota.quotaLabel": "Quota",
			"quota.free": "Free",
			"quota.unpriced": "Unpriced",
			"quota.endpoint": "Endpoint",
			"quota.local": "Local",
			"quota.remote": "Remote",
			"quota.network": "Network",
			"quota.offline": "Offline",
			"quota.online": "Online",
			"quota.members": "Members",
			"quota.impact": "Impact",
			"quota.impactValue": "Usage counted, cost shows —",
			"quota.channelFilter": "Choose channels shown on the quota page",
			"quota.allChannels": "Show all",
			"quota.channelCount": "Showing {count}",
			"quota.noChannelSelected": "No channel selected",
			"err.noLiveQuery": "Live query off",
			"err.noApiKey": "No API key",
			"err.noSnapshot": "No snapshot",
			"err.network": "Network unreachable",
			"err.timeout": "Timeout",
			"err.unauthorized": "Credentials rejected (401/403)",
			"err.badJson": "Bad response",
			"err.tooLarge": "Response too large",
			"err.http": "HTTP {code}",
			"err.detail.noKey": "No API key",
			"err.detail.rejected": "Credentials rejected",
			"err.detail.keyMissing": "Key empty",
			"err.detail.local": "Local endpoint",
			"err.detail.free": "Free tier, no API",
			"err.detail.none": "No balance API",
			"sessions.top": "Top sessions",
			"sessions.shape": "Session shape",
			"sessions.recent": "Recent sessions",
			"sessions.scope": "Session scope",
			"sessions.all": "All sessions",
			"sessions.hideArchived": "Hide archived",
			"sessions.count": "{count}",
			"sessions.searchPlaceholder": "Search sessions",
			"sessions.noData": "No sessions",
			"sessions.metricTokens": "Tokens",
			"sessions.metricCost": "Cost",
			"sessions.metricDuration": "Duration",
			"sessions.metricMessages": "Messages",
			"sessions.metricTools": "Tool calls",
			"sessions.calls": "{count} calls",
			"sessions.crossDays": "{days} days",
			"sessions.subagents": "{count} sub-sessions",
			"sessions.subagentTokens": "{tokens} in sub-sessions",
			"sessions.callsBucket": "Bucketed by settlement samples",
			"overview.kpiCost": "Period cost",
			"overview.kpiTokens": "Tokens",
			"overview.kpiCache": "Cache hit",
			"overview.kpiSessions": "Sessions",
			"overview.kpiDaily": "Daily avg",
			"overview.prev": "Prev {value}",
			"overview.ioSplit": "In {input} · Out {output}",
			"overview.cacheLine": "Cache read {value} · saved {saved}",
			"overview.cacheReadOnly": "Cache read {value}",
			"overview.kpiCacheSaved": "Cache saved",
			"overview.ofCost": "{percent}% of cost",
			"overview.activeDays": "{count} active days",
			"overview.streak": "Longest streak {count}d",
			"overview.busiest": "Busiest {date} ({value})",
			"overview.trend": "Trend",
			"overview.panelProjects": "Projects",
			"overview.panelModels": "Models",
			"overview.hourly": "By hour",
			"overview.mActivity": "Activity",
			"overview.mTokens": "Tokens",
			"overview.mOutTokens": "Out tokens",
			"overview.mCacheRead": "Cache read",
			"overview.mSessions": "Sessions",
			"overview.mSpend": "Spend",
			"overview.mCost": "Cost",
			"overview.more": "{total} total · {rest} more →",
			"overview.noData": "No data",
			"overview.noCalls": "No daily call count",
			"overview.noHourly": "No hourly data",
			"overview.busiestHour": "Busiest: {weekday} {hour}",
			"overview.callsUnit": "calls",
			"overview.sessionCount": "{count} sessions",
			"overview.monthLabel": "{month}",
			"overview.monthLabelYear": "{year}-{month}",
			"overview.legendLess": "Less",
			"overview.legendMore": "More"
		};
		//#endregion
		//#region src/client/core/log.ts
		const MAX_ENTRIES = 200;
		const LOG_PATH = "/dsh-key-usage/log";
		/** 攒批间隔：1 秒内的连续失败合成一次 POST，避免每条日志一个请求。 */
		const FLUSH_DELAY_MS = 1e3;
		const READ_LIMIT = 500;
		let entries = [];
		let nextId = 1;
		let notifyQueued = false;
		let hydrated = false;
		let flushTimer = null;
		/** 本次会话新建 / 累加过的条目：只回写这些（从磁盘读回来的不再写回去，否则越读越多）。 */
		const pending = /* @__PURE__ */ new Map();
		/** 已经落盘过的条目 id：同一问题重复出现只累加内存里的 `×N`，不再重复写文件。 */
		const flushed = /* @__PURE__ */ new Set();
		/** 已经从磁盘读过的记录（按时间 + 内容去重）：重复读同一份文件不会把次数刷虚。 */
		const storedKeys = /* @__PURE__ */ new Set();
		const listeners$2 = /* @__PURE__ */ new Set();
		const openListeners = /* @__PURE__ */ new Set();
		function notify() {
			if (notifyQueued) return;
			notifyQueued = true;
			queueMicrotask(() => {
				notifyQueued = false;
				for (const listener of listeners$2) listener();
			});
		}
		function trim() {
			if (entries.length > MAX_ENTRIES) entries = entries.slice(entries.length - MAX_ENTRIES);
		}
		/** 去重累加：同来源 + 同消息 + 同级别合并成一条（重试一次不该刷两屏）。 */
		function fold(level, source, message, detail, time) {
			const existing = entries.find((entry) => entry.source === source && entry.message === message && entry.level === level);
			if (existing !== void 0) {
				existing.count += 1;
				if (time > existing.time) existing.time = time;
				if (detail !== void 0) existing.detail = detail;
				return existing;
			}
			const entry = {
				id: nextId,
				time,
				level,
				source,
				message,
				detail,
				count: 1
			};
			nextId += 1;
			entries = [...entries, entry];
			return entry;
		}
		function scheduleFlush() {
			if (flushTimer !== null) return;
			flushTimer = setTimeout(() => {
				flushTimer = null;
				flushLog();
			}, FLUSH_DELAY_MS);
		}
		/**
		* 把待写条目发一批到磁盘；失败就丢掉这一批（内存里还看得到），不重试、不再记日志。
		*
		* 同一条目**只落盘一次**：重复出现只在内存里累加 `×N`（`fold` 干的），不再重复写文件 ——
		* 否则每次重复都写一条一模一样的记录，`plugin.log` 会被同一个已知问题刷满（实测 42 条里大半是这种）。
		*/
		async function flushLog() {
			const fresh = [...pending.values()].filter((entry) => !flushed.has(entry.id));
			if (fresh.length === 0) {
				pending.clear();
				return;
			}
			const records = fresh.map((entry) => ({
				time: new Date(entry.time).toISOString(),
				level: entry.level,
				source: entry.source,
				message: entry.message,
				...entry.detail === void 0 ? {} : { detail: entry.detail }
			}));
			for (const entry of fresh) flushed.add(entry.id);
			pending.clear();
			try {
				const response = await fetch(LOG_PATH, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json"
					},
					body: JSON.stringify({ records }),
					keepalive: true
				});
				if (!response.ok) throw new Error("HTTP " + String(response.status));
			} catch {}
		}
		/** 页面打开时读回磁盘上的历史日志（只做一次）；没有端点或读失败都安静跳过。 */
		async function hydrateLog() {
			if (hydrated) return;
			hydrated = true;
			await readFromDisk();
		}
		/** 拉取服务端日志；带 level / source 时服务端先过滤（能取到 limit 之外的更早记录）。 */
		async function refreshLog(filter = {}) {
			hydrated = true;
			await readFromDisk(filter);
		}
		async function readFromDisk(filter = {}) {
			try {
				const params = new URLSearchParams({ limit: String(READ_LIMIT) });
				if (filter.level !== void 0 && filter.level !== "") params.set("level", filter.level);
				if (filter.source !== void 0 && filter.source !== "") params.set("source", filter.source);
				const response = await fetch(LOG_PATH + "?" + params.toString(), { headers: { Accept: "application/json" } });
				if (!response.ok) return;
				const body = await response.json();
				if (!Array.isArray(body.records)) return;
				let changed = false;
				/**
				* 同一条内容在文件里可能真的出现多次（同一次失败被记了两遍），所以去重键要带「第几次出现」：
				* 文件没变时重复读不会虚增，文件里两条一模一样的记录仍各自计入次数。
				*/
				const occurrences = /* @__PURE__ */ new Map();
				for (const raw of body.records) {
					if (typeof raw !== "object" || raw === null) continue;
					const record = raw;
					if (typeof record.message !== "string" || record.message === "") continue;
					const level = record.level === "error" || record.level === "warn" ? record.level : "info";
					const time = typeof record.time === "string" && Number.isFinite(Date.parse(record.time)) ? Date.parse(record.time) : Date.now();
					const source = typeof record.source === "string" ? record.source : "ui";
					const content = String(time) + "|" + level + "|" + source + "|" + record.message;
					const nth = (occurrences.get(content) ?? 0) + 1;
					occurrences.set(content, nth);
					const key = content + "#" + String(nth);
					if (storedKeys.has(key)) continue;
					storedKeys.add(key);
					fold(level, source, record.message, typeof record.detail === "string" ? record.detail : void 0, time);
					changed = true;
				}
				if (!changed) return;
				entries = [...entries].sort((first, second) => first.time - second.time);
				trim();
				notify();
			} catch {}
		}
		function logPush(level, source, message, detail, retry) {
			if (message === "") return;
			const entry = fold(level, source, message, detail, Date.now());
			if (retry !== void 0) entry.retry = retry;
			pending.set(entry.id, entry);
			trim();
			notify();
			scheduleFlush();
		}
		function logInfo(source, message, detail) {
			logPush("info", source, message, detail);
		}
		function logWarn(source, message, detail) {
			logPush("warn", source, message, detail);
		}
		function logError(source, message, detail, retry) {
			logPush("error", source, message, detail, retry);
		}
		function logEntries() {
			return entries;
		}
		function subscribeLog(listener) {
			listeners$2.add(listener);
			return () => {
				listeners$2.delete(listener);
			};
		}
		/** 清空：内存与磁盘一起清（磁盘失败就只清内存，界面行为不变）。 */
		function clearLog() {
			entries = [];
			pending.clear();
			notify();
			fetch(LOG_PATH, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json"
				},
				body: JSON.stringify({ clear: true })
			}).catch(() => void 0);
		}
		/** 页面上的「查看系统日志」入口：任何组件都能请求打开日志窗，不必层层传 prop。 */
		function requestOpenLog() {
			for (const listener of openListeners) listener();
		}
		function subscribeOpenLog(listener) {
			openListeners.add(listener);
			return () => {
				openListeners.delete(listener);
			};
		}
		/** 导出成纯文本（贴 issue 用）：带日期时间，详情缩进一行跟在条目后面，重复次数标 ×N。 */
		/** 按给定条目渲染文本：面板只导出「当前筛选看到的那些」时用它（时间用确定性本地格式，不再跟 locale 走）。 */
		function logTextOf(list) {
			const pad = (value) => String(value).padStart(2, "0");
			return list.flatMap((entry) => {
				const time = new Date(entry.time);
				const head = time.getFullYear() + "-" + pad(time.getMonth() + 1) + "-" + pad(time.getDate()) + " " + pad(time.getHours()) + ":" + pad(time.getMinutes()) + ":" + pad(time.getSeconds()) + " [" + entry.level + "] " + entry.source + " · " + entry.message + (entry.count > 1 ? " ×" + String(entry.count) : "");
				return entry.detail === void 0 ? [head] : [head, "    " + entry.detail];
			}).join("\n");
		}
		/** 同一类问题只记一次，避免刷屏（例如同一次渲染里同一个缺词被问很多遍）。 */
		const onceKeys = /* @__PURE__ */ new Set();
		function logOnce(level, source, key, message) {
			const dedupe = source + "|" + key;
			if (onceKeys.has(dedupe)) return;
			onceKeys.add(dedupe);
			logPush(level, source, message);
		}
		if (typeof window !== "undefined") {
			window.addEventListener("pagehide", () => {
				flushLog();
			});
			document.addEventListener("visibilitychange", () => {
				if (document.visibilityState === "hidden") flushLog();
			});
		}
		//#endregion
		//#region src/client/core/i18n.ts
		/**
		* i18n：按宿主 `@deepseek-ai/dsh-client-locale` 的契约注册命名空间字典，组件用 `t()` 取词。
		*
		* - 注册：`ctx.locale.register('dsh-key-usage', { zh, en })`，两种内置语言必须齐全；
		* - 取词：优先用宿主 `ctx.locale.bind(ns)` 返回的绑定函数（身份稳定，跟随宿主语言切换）；
		* - 重渲染：订阅宿主 locale 快照，切语言时 `useT()` 触发组件更新，不需要刷新页面；
		* - 回落：宿主没有 locale 服务（旧版本）时用本文件的 `zh`，界面不会变空。
		*
		* 命名：键用「区域.用途」，界面标签尽量 ≤6 字，解释性长句统一放 `caliber.*`（弹窗里）。
		*/
		const NS$1 = "dsh-key-usage";
		let bound = null;
		/** 宿主当前生效的语言（register/subscribe 时同步；宿主无 locale 服务时按中文） */
		let active = "zh";
		let revision = 0;
		const listeners$1 = /* @__PURE__ */ new Set();
		/** 由客户端入口在 apply 时调用；任何一步失败都不抛错（界面继续用内置中文）。 */
		function installI18n(locale) {
			if (locale === void 0) return;
			try {
				locale.register?.(NS$1, {
					zh,
					en
				});
				if (typeof locale.bind === "function") bound = locale.bind(NS$1);
				const readActive = () => {
					const snapshot = locale.getSnapshot?.();
					if (snapshot !== void 0 && typeof snapshot.active === "string") active = snapshot.active;
				};
				readActive();
				locale.subscribe?.(() => {
					readActive();
					revision += 1;
					for (const listener of listeners$1) listener();
				});
			} catch {
				bound = null;
			}
		}
		/** 取词：`{name}` 占位用 params 替换；缺键回落中文词典，再缺则回显键名（便于发现漏词）。 */
		/** 当前语言是否英文（用于决定「服务端中文长文」要不要换成结构化指引）。 */
		function isEnglish() {
			return active.toLowerCase().startsWith("en");
		}
		function t(key, params) {
			let text = key;
			if (bound !== null) {
				const translated = bound(key);
				if (translated === key && zh[key] === void 0) logOnce("warn", "i18n", key, "缺词：" + key);
				text = translated === key ? zh[key] ?? key : translated;
			} else text = zh[key] ?? key;
			if (params === void 0) return text;
			return text.replace(/\{(\w+)\}/g, (whole, name) => {
				const value = params[name];
				return value === void 0 ? whole : String(value);
			});
		}
		function subscribe(listener) {
			listeners$1.add(listener);
			return () => {
				listeners$1.delete(listener);
			};
		}
		/** 组件里用它拿 t：宿主切语言时自动重渲染。 */
		function useT() {
			(0, react.useSyncExternalStore)(subscribe, () => revision, () => revision);
			return t;
		}
		//#endregion
		//#region src/client/UsageIcon.tsx
		function UsageIcon({ size = 18 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				focusable: "false",
				style: { display: "block" },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "2.6",
						y: "8.8",
						width: "2.6",
						height: "4.2",
						rx: "0.7",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "6.7",
						y: "5.6",
						width: "2.6",
						height: "7.4",
						rx: "0.7",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "10.8",
						y: "2.8",
						width: "2.6",
						height: "10.2",
						rx: "0.7",
						fill: "currentColor"
					})
				]
			});
		}
		//#endregion
		//#region src/client/core/boot.ts
		/** 渲染进程启动时刻：启动耗时埋点用（页面脚本开始执行时求值）。 */
		const CLIENT_BOOT_AT_MS = typeof performance === "undefined" ? 0 : performance.now();
		//#endregion
		//#region \0dsh-css:src/client/styles/shared.module.css.mjs
		const css$18 = ".d29QNW_section{box-sizing:border-box;--ku-body:max(14px, var(--dsh-content-font-size,14px));--ku-sub:max(13px, calc(var(--dsh-content-font-size,14px) * .92));--ku-title:max(17px, calc(var(--dsh-content-font-size,14px) * 1.2));--ku-kpi:max(20px, calc(var(--dsh-content-font-size,14px) * 1.42));--ku-control:36px;min-height:0;color:var(--dsw-alias-label-primary,#e8e8ec);font-size:var(--ku-body);padding:28px 48px 48px;line-height:1.6;overflow:visible}[data-sidebar-right-open] .d29QNW_section,[data-sidebar-right-float-host] .d29QNW_section{padding:16px}.d29QNW_pageHead{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;max-width:960px;margin:0 auto 16px;display:flex}.d29QNW_pageTitle{letter-spacing:normal;white-space:nowrap;color:var(--dsw-alias-label-primary,#0f1115);margin:0;font-size:20px;font-weight:500;line-height:28px}.d29QNW_headActions{flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:8px;display:inline-flex}.d29QNW_toolbarRow{flex-wrap:wrap;align-items:center;gap:8px 10px;max-width:960px;margin-left:auto;margin-right:auto;display:flex}.d29QNW_toolbarRow+.d29QNW_toolbarRow{margin-top:8px}.d29QNW_toolbarGroup{flex-wrap:wrap;align-items:center;gap:6px;min-width:0;display:inline-flex}.d29QNW_rowSpacer{flex:auto}.d29QNW_toolbarDivider{background:var(--dsw-alias-border-l1,#2c2c34);flex:none;width:1px;height:18px}.d29QNW_stickyHead .d29QNW_headBtn{height:var(--ku-control);border-radius:12px;padding:0 12px;font-size:13px;font-weight:400}.d29QNW_iconBtn{box-sizing:border-box;width:var(--ku-control);height:var(--ku-control);border:1px solid var(--dsw-alias-border-l2,#0000001f);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:var(--ku-body);cursor:pointer;background:0 0;border-radius:12px;justify-content:center;align-items:center;padding:0;line-height:1;text-decoration:none;display:inline-flex}.d29QNW_iconBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.d29QNW_iconBtn:disabled{opacity:.6;cursor:default}.d29QNW_iconBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.d29QNW_filterBar{flex-wrap:wrap;align-items:center;gap:8px;margin-top:6px;display:flex}.d29QNW_filterLabel{color:var(--dsw-alias-label-tertiary,#8b8b99);white-space:nowrap;font-size:var(--ku-body)}.d29QNW_stickyHead{z-index:6;background:var(--dsw-alias-bg-layer-2,#1d1d22);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);margin:-28px -48px 0;padding:4px 48px 8px;position:sticky;top:0}@media (min-width:0){[data-sidebar-right-open] .d29QNW_stickyHead,[data-sidebar-right-float-host] .d29QNW_stickyHead{margin:-16px -16px 0;padding:14px 16px 10px}}.d29QNW_ghLink{box-sizing:border-box;width:var(--ku-control);height:var(--ku-control);border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);background:0 0;border-radius:8px;justify-content:center;align-items:center;line-height:0;text-decoration:none;display:inline-flex}.d29QNW_ghLink:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.d29QNW_ghLink:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.d29QNW_refreshBtn{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:inherit;cursor:pointer;background:0 0;border-radius:999px;padding:3px 12px;font-family:inherit}.d29QNW_refreshBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.d29QNW_refreshBtn:disabled{opacity:.6;cursor:default}.d29QNW_refreshIcon,.d29QNW_refreshIconSpin{display:inline-block}.d29QNW_refreshIconSpin{animation:.9s linear infinite d29QNW_refreshSpin}@keyframes d29QNW_refreshSpin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.d29QNW_refreshIconSpin{animation:none}}.d29QNW_tabBar{background:0 0;border-radius:0;flex-wrap:wrap;gap:8px;padding:0;display:inline-flex}.d29QNW_tabBar button{color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:var(--ku-body);cursor:pointer;white-space:nowrap;background:0 0;border:0;border-radius:14px;height:28px;padding:0 10px;font-weight:400}.d29QNW_tabBar button:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.d29QNW_tabBar button.d29QNW_active{background:var(--dsw-alias-interactive-bg-active,#2631480f);color:var(--dsw-alias-label-primary,#0f1115);box-shadow:none;font-weight:400}.d29QNW_card{background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:12px;padding:14px 16px}.d29QNW_cardGrid6{grid-template-columns:repeat(auto-fit,minmax(172px,1fr));gap:10px;margin-bottom:20px;display:grid}.d29QNW_statLabel{color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ku-sub,13px);margin-bottom:6px}.d29QNW_statValue{font-size:max(18px, calc(var(--dsh-content-font-size,13px) * 1.4));font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e8e8ec);white-space:nowrap;padding-right:48px;font-weight:650}.d29QNW_statExtra{color:var(--dsw-alias-label-tertiary,#67676f);font-size:inherit;margin-top:4px}.d29QNW_table{border-collapse:collapse;width:100%;margin-top:10px}.d29QNW_table th{text-align:right;color:var(--dsw-alias-label-tertiary,#67676f);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);white-space:nowrap;padding:4px 8px;font-size:13px;font-weight:500}.d29QNW_table td{text-align:right;font-size:inherit;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9a9aa6);vertical-align:middle;border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);white-space:normal;overflow-wrap:anywhere;padding:8px}.d29QNW_table th:first-child,.d29QNW_table td:first-child{text-align:left;padding-left:0}.d29QNW_table td:first-child{color:var(--dsw-alias-label-primary,#e8e8ec)}.d29QNW_refreshBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.d29QNW_tabBar button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.d29QNW_table tr.d29QNW_clickable{cursor:pointer}.d29QNW_table tr.d29QNW_clickable:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c12)}.d29QNW_statusDot{border-radius:50%;flex-shrink:0;width:8px;height:8px;display:inline-block}.d29QNW_dim{color:var(--dsw-alias-label-tertiary,#67676f)}.d29QNW_empty{color:var(--dsw-alias-label-tertiary,#67676f);padding:16px 0}.d29QNW_warning{color:var(--dsw-alias-state-warn-primary,#e0a13c);font-size:inherit;margin-bottom:10px}.d29QNW_legend{font-size:inherit;color:var(--dsw-alias-label-tertiary,#67676f);flex-wrap:wrap;align-items:center;gap:10px;display:inline-flex}.d29QNW_legend i{border-radius:2px;width:10px;height:10px;margin-right:3px;display:inline-block}.d29QNW_footnoteList li{margin:1px 0}.d29QNW_tooltip{z-index:9999;pointer-events:none;background:var(--dsw-alias-bg-layer-3,#232329);border:1px solid var(--dsw-alias-border-l2,#2c2c34);box-shadow:var(--dsw-shadow-lv2,0 8px 24px #00000059);min-width:210px;max-width:300px;font-size:inherit;color:var(--dsw-alias-label-primary,#e8e8ec);border-radius:10px;padding:10px 12px;font-family:inherit;line-height:1.5;position:fixed}.d29QNW_tipTitle{font-size:inherit;margin-bottom:2px;font-weight:650}.d29QNW_tipSub{font-size:inherit;color:var(--dsw-alias-label-secondary,#9a9aa6);margin-bottom:8px}.d29QNW_tipRow{font-size:inherit;color:var(--dsw-alias-label-secondary,#9a9aa6);align-items:center;gap:6px;padding:2px 0;display:flex}.d29QNW_tipRow i{border-radius:2px;flex-shrink:0;width:7px;height:7px}.d29QNW_tipName{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.d29QNW_tipAmount{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary,#67676f);text-align:right;width:58px}.d29QNW_tipRate{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600}.d29QNW_tipBar{background:var(--dsw-alias-interactive-bg-hover,#80808c2e);border-radius:2px;height:3px;margin:1px 0 6px;overflow:hidden}.d29QNW_tipBar>i{border-radius:2px;height:100%;display:block}.d29QNW_tipDivider{border-top:1px solid var(--dsw-alias-border-l1,#2c2c34);font-size:inherit;color:var(--dsw-alias-label-secondary,#9a9aa6);justify-content:space-between;gap:12px;margin-top:6px;padding-top:6px;display:flex}.d29QNW_caliberVersion{font-size:inherit;color:var(--dsw-alias-label-tertiary,#67676f);font-variant-numeric:tabular-nums;margin:0 0 8px}.d29QNW_statValueRow{position:relative}.d29QNW_statBadge{white-space:nowrap;font-size:inherit;color:var(--dsw-alias-label-secondary,#9a9aa6);position:absolute;top:0;right:0}.d29QNW_statAbove{color:var(--dsw-alias-label-tertiary,#67676f);font-size:inherit;margin-top:2px}.d29QNW_badgeWarn{color:var(--dsw-alias-state-warn-primary,#e0a13c)}.d29QNW_statLabelRow{align-items:center;gap:6px;display:flex}.d29QNW_pathsCell{background:var(--dsw-alias-interactive-bg-hover,#80808c0f);text-align:left;padding:2px 10px 10px 14px}.d29QNW_pathLine{font-family:ui-monospace,Consolas,monospace;font-size:inherit;color:var(--dsw-alias-label-secondary,#5c6572);word-break:break-all;line-height:1.7}.d29QNW_modeSwitch{height:var(--ku-control);color:var(--dsw-alias-label-tertiary,#8b8b99);font-size:var(--ku-body);cursor:pointer;white-space:nowrap;align-items:center;gap:6px;display:inline-flex}.d29QNW_modeSwitch input{accent-color:var(--dsw-alias-state-business-primary,#5b8cff)}.d29QNW_refreshSelect{-webkit-appearance:none;appearance:none;box-sizing:border-box;height:var(--ku-control);border:1px solid var(--dsw-alias-border-l2,#0000001f);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:var(--ku-body);text-overflow:ellipsis;cursor:pointer;background-color:#0000;background-image:linear-gradient(45deg,#0000 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,#0000 50%);background-position:calc(100% - 12px),calc(100% - 8px);background-repeat:no-repeat;background-size:4px 4px,4px 4px;background-attachment:scroll;background-origin:padding-box;background-clip:border-box;border-radius:12px;max-width:200px;padding:0 24px 0 10px}.d29QNW_refreshSelect:hover{border-color:var(--dsw-alias-state-business-primary,#5b8cff)}.d29QNW_refreshSelect:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:1px}.d29QNW_sections{flex-direction:column;gap:32px;max-width:960px;margin:24px auto 0;display:flex}.d29QNW_pageSection{min-width:0}.d29QNW_pageSectionTitle{letter-spacing:normal;color:var(--dsw-alias-label-primary,#0f1115);margin:0 0 8px;font-size:14px;font-weight:500;line-height:22px}.d29QNW_rangeTabs{box-sizing:border-box;height:var(--ku-control);background:0 0;border-radius:0;flex-wrap:wrap;align-items:center;gap:2px;padding:0;display:inline-flex}.d29QNW_rangeTab,.d29QNW_rangeTabActive{color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:var(--ku-body);cursor:pointer;white-space:nowrap;background:0 0;border:0;border-radius:14px;height:28px;padding:0 10px;font-weight:400}.d29QNW_rangeTab:hover{color:var(--dsw-alias-label-primary,#e8e8ec)}.d29QNW_rangeTabActive{background:var(--dsw-alias-interactive-bg-active,#2631480f);color:var(--dsw-alias-label-primary,#0f1115);font-weight:400}.d29QNW_rangeTab:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:1px}.d29QNW_rangeTabActive:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:1px}";
		const tagId$18 = "dsh-key-usage/shared.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$18) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$18;
			tag.textContent = css$18;
			document.head.appendChild(tag);
		}
		const cssRegistry$18 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$18.some((e) => e.tagId === tagId$18)) cssRegistry$18.push({
			tagId: tagId$18,
			css: css$18
		});
		var shared_module_css_default = {
			"active": "d29QNW_active",
			"badgeWarn": "d29QNW_badgeWarn",
			"caliberVersion": "d29QNW_caliberVersion",
			"card": "d29QNW_card",
			"cardGrid6": "d29QNW_cardGrid6",
			"clickable": "d29QNW_clickable",
			"dim": "d29QNW_dim",
			"empty": "d29QNW_empty",
			"filterBar": "d29QNW_filterBar",
			"filterLabel": "d29QNW_filterLabel",
			"footnoteList": "d29QNW_footnoteList",
			"ghLink": "d29QNW_ghLink",
			"headActions": "d29QNW_headActions",
			"headBtn": "d29QNW_headBtn",
			"iconBtn": "d29QNW_iconBtn",
			"legend": "d29QNW_legend",
			"modeSwitch": "d29QNW_modeSwitch",
			"pageHead": "d29QNW_pageHead",
			"pageSection": "d29QNW_pageSection",
			"pageSectionTitle": "d29QNW_pageSectionTitle",
			"pageTitle": "d29QNW_pageTitle",
			"pathLine": "d29QNW_pathLine",
			"pathsCell": "d29QNW_pathsCell",
			"rangeTab": "d29QNW_rangeTab",
			"rangeTabActive": "d29QNW_rangeTabActive",
			"rangeTabs": "d29QNW_rangeTabs",
			"refreshBtn": "d29QNW_refreshBtn",
			"refreshIcon": "d29QNW_refreshIcon",
			"refreshIconSpin": "d29QNW_refreshIconSpin",
			"refreshSelect": "d29QNW_refreshSelect",
			"refreshSpin": "d29QNW_refreshSpin",
			"rowSpacer": "d29QNW_rowSpacer",
			"section": "d29QNW_section",
			"sections": "d29QNW_sections",
			"statAbove": "d29QNW_statAbove",
			"statBadge": "d29QNW_statBadge",
			"statExtra": "d29QNW_statExtra",
			"statLabel": "d29QNW_statLabel",
			"statLabelRow": "d29QNW_statLabelRow",
			"statValue": "d29QNW_statValue",
			"statValueRow": "d29QNW_statValueRow",
			"statusDot": "d29QNW_statusDot",
			"stickyHead": "d29QNW_stickyHead",
			"tabBar": "d29QNW_tabBar",
			"table": "d29QNW_table",
			"tipAmount": "d29QNW_tipAmount",
			"tipBar": "d29QNW_tipBar",
			"tipDivider": "d29QNW_tipDivider",
			"tipName": "d29QNW_tipName",
			"tipRate": "d29QNW_tipRate",
			"tipRow": "d29QNW_tipRow",
			"tipSub": "d29QNW_tipSub",
			"tipTitle": "d29QNW_tipTitle",
			"toolbarDivider": "d29QNW_toolbarDivider",
			"toolbarGroup": "d29QNW_toolbarGroup",
			"toolbarRow": "d29QNW_toolbarRow",
			"tooltip": "d29QNW_tooltip",
			"warning": "d29QNW_warning"
		};
		//#endregion
		//#region src/client/components/ErrorBoundary.tsx
		/** 页面错误边界：渲染异常时显示可读错误 + 写系统日志，不再让宿主主区域整块空白。 */
		var ErrorBoundary = class extends react.Component {
			state = { error: null };
			static getDerivedStateFromError(error) {
				return { error };
			}
			componentDidCatch(error) {
				logWarn("client", t("err.renderFailed"), error.stack ?? error.message);
			}
			render() {
				if (this.state.error !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shared_module_css_default.card,
					style: {
						padding: "24px 20px",
						textAlign: "center"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: { marginBottom: "6px" },
							children: t("err.renderFailed")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: shared_module_css_default.dim,
							style: { marginBottom: "12px" },
							children: this.state.error.message
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: shared_module_css_default.refreshBtn,
							onClick: () => this.setState({ error: null }),
							children: t("action.retry")
						})
					]
				});
				return this.props.children;
			}
		};
		//#endregion
		//#region src/client/core/api.ts
		/** 最近一次请求失败的原因，按路径记住（空态文案据此指向「要重启宿主」）。 */
		const failureReasons = /* @__PURE__ */ new Map();
		function failureReasonOf(path) {
			return failureReasons.get(path) ?? null;
		}
		/** 404 单独说清「要重启宿主」：刷新页面不会让服务端新端点出现。 */
		function failureTextOf(status) {
			return status === 404 ? t("api.notFound") : "HTTP " + String(status);
		}
		async function fetchJson(path, failureKey = path) {
			try {
				const response = await fetch(path, { headers: { Accept: "application/json" } });
				if (!response.ok) {
					const text = failureTextOf(response.status);
					failureReasons.set(failureKey, text);
					logWarn("api", t("api.requestFailed") + " · " + failureKey, text);
					return null;
				}
				failureReasons.delete(failureKey);
				return await response.json();
			} catch (error) {
				const text = t("api.requestFailed") + (error instanceof Error ? error.message : String(error));
				failureReasons.set(failureKey, text);
				logWarn("api", t("api.requestFailed") + " · " + failureKey, text);
				return null;
			}
		}
		async function loadChannels() {
			const result = await fetchJson("/dsh-key-usage/channels");
			return result === null ? null : result.channels;
		}
		async function loadUsage(from, to, provider) {
			const params = new URLSearchParams({
				from,
				to
			});
			if (provider !== "ALL") params.set("provider", provider);
			return fetchJson("/dsh-key-usage/usage?" + params.toString());
		}
		async function loadHeatmap() {
			return fetchJson("/dsh-key-usage/heatmap");
		}
		/** 余额与订阅窗口：服务端实时优先、失败回落本机快照；`fresh` = 用户手动刷新时强制重查官方接口。 */
		async function loadQuota(fresh = false) {
			const result = await fetchJson("/dsh-key-usage/quota" + (fresh ? "?fresh=1" : ""));
			return result === null ? null : result.providers;
		}
		function loadSummary() {
			return fetchJson("/dsh-key-usage/summary");
		}
		function loadSessions(limit = 300) {
			return fetchJson("/dsh-key-usage/sessions?limit=" + String(limit));
		}
		/** 单会话详情的请求路径：界面要按同一串查失败原因，所以路径由这里统一拼。 */
		function sessionDetailPath(id) {
			return "/dsh-key-usage/session?id=" + encodeURIComponent(id);
		}
		function loadSessionDetail(id) {
			return fetchJson(sessionDetailPath(id));
		}
		function loadProjects(limit = 200) {
			return fetchJson("/dsh-key-usage/projects?limit=" + String(limit));
		}
		function loadModels(limit = 200) {
			return fetchJson("/dsh-key-usage/models?limit=" + String(limit));
		}
		/** 工具 / 技能 / MCP 参数化端点：窗口 + 项目 / 模型多选（空串筛选值留给「未归入工作区」）。 */
		const TOOLS_PATH = "/dsh-key-usage/tools";
		/**
		* 按当前筛选取工具统计。服务端索引还没建好（老版本 / 构建中）时回 `null`，
		* 调用方保留快照里的全量段作为回落。
		* `projectFilter` 传 `null` = 不筛；传空串 = 只筛「未归入工作区」（服务端按 workspace 空串匹配）。
		*/
		function loadTools(from, to, projectFilter, modelFilter) {
			const params = new URLSearchParams({
				from,
				to
			});
			if (projectFilter !== null) params.set("project", projectFilter);
			if (modelFilter !== "") params.set("model", modelFilter);
			return fetchJson(TOOLS_PATH + "?" + params.toString(), TOOLS_PATH);
		}
		const RATES_PATH = "/dsh-key-usage/rates";
		/** 汇率端点：`?refresh=1` 强制走上游。 */
		const FX_PATH = "/dsh-key-usage/fx";
		function loadRates(days = 30, limit = 20) {
			const params = new URLSearchParams({
				days: String(days),
				limit: String(limit)
			});
			return fetchJson(RATES_PATH + "?" + params.toString(), RATES_PATH);
		}
		/** 取 USD→CNY 汇率：服务端 12 小时内走缓存；`force` = 用户点「刷新汇率」时强制走上游，失败返回 null。 */
		function loadFxRate(force = false) {
			return fetchJson(force ? FX_PATH + "?refresh=1" : FX_PATH, FX_PATH);
		}
		/** 刷新价目端点（404 = 服务端还是旧版本）。 */
		const MODEL_PRICE_REFRESH_PATH = "/dsh-key-usage/pricing/refresh";
		/** 刷新超时 30 秒：必须大于服务端 20 秒下载预算，否则会「文件已写成功、界面却报超时」。 */
		const MODEL_PRICE_REFRESH_TIMEOUT_MS = 3e4;
		/**
		* 拉取上游最新聚合价目：`null` = 请求失败，`{ok:false}` = 服务端拒绝（中文原因可直接展示）。
		*/
		async function refreshModelPrices() {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), MODEL_PRICE_REFRESH_TIMEOUT_MS);
			try {
				const response = await fetch(MODEL_PRICE_REFRESH_PATH, {
					method: "POST",
					headers: { Accept: "application/json" },
					signal: controller.signal
				});
				if (!response.ok) {
					failureReasons.set(MODEL_PRICE_REFRESH_PATH, failureTextOf(response.status));
					return null;
				}
				failureReasons.delete(MODEL_PRICE_REFRESH_PATH);
				return await response.json();
			} catch (error) {
				failureReasons.set(MODEL_PRICE_REFRESH_PATH, controller.signal.aborted ? t("api.refreshTimeout") + String(MODEL_PRICE_REFRESH_TIMEOUT_MS / 1e3) + t("api.refreshTimeoutTail") : t("api.requestFailed") + (error instanceof Error ? error.message : String(error)));
				return null;
			} finally {
				clearTimeout(timer);
			}
		}
		/** 统一快照端点：6 个 Tab 的唯一数据来源（服务端每 5 分钟重建本地段）。 */
		const SNAPSHOT_PATH = "/dsh-key-usage/snapshot";
		/** 手动刷新端点：重算全部本地段 + 查配额（联网）+ 写快照。 */
		const REFRESH_PATH = "/dsh-key-usage/refresh";
		/**
		* 读快照。`fresh: true`（页面打开时用）让服务端先保证数据是最新的：
		* 本地段超过防抖下限就重算一次再返回，配额段超时就**后台**补查（返回体标 `quotaRefreshing`）。
		*/
		function loadSnapshot(fresh = false, sections) {
			const query = [];
			if (fresh) query.push("fresh=1");
			if (sections !== void 0 && sections.length > 0) query.push("sections=" + sections.join(","));
			return fetchJson(SNAPSHOT_PATH + (query.length === 0 ? "" : "?" + query.join("&")));
		}
		/** 手动刷新：服务端自己串行化（撞上重建会等，最多 10 秒），超时才回 `{ok:false}`。 */
		async function refreshAll() {
			try {
				const response = await fetch(REFRESH_PATH, {
					method: "POST",
					headers: { Accept: "application/json" }
				});
				if (!response.ok) {
					failureReasons.set(REFRESH_PATH, failureTextOf(response.status));
					return null;
				}
				failureReasons.delete(REFRESH_PATH);
				const result = await response.json();
				if (result.ok !== true) {
					failureReasons.set(REFRESH_PATH, typeof result.error === "string" ? result.error : t("api.refreshRejected"));
					return null;
				}
				return result;
			} catch (error) {
				failureReasons.set(REFRESH_PATH, t("api.requestFailed") + (error instanceof Error ? error.message : String(error)));
				return null;
			}
		}
		//#endregion
		//#region src/client/core/format.ts
		/** 展示层格式化：全部与统计口径无关，只负责把数字变成界面文本。 */
		/** 本地日历 `YYYY-MM-DD`。 */
		function isoDate(date) {
			const month = String(date.getMonth() + 1).padStart(2, "0");
			const day = String(date.getDate()).padStart(2, "0");
			return `${date.getFullYear()}-${month}-${day}`;
		}
		function shiftedIsoDate(offsetDays) {
			return isoDate(new Date(Date.now() + offsetDays * 864e5));
		}
		/** 空格千分位：不用 toLocaleString（结果跟随浏览器区域设置，导出与截图会不一致）。 */
		function fmtCount(count) {
			if (!Number.isFinite(count)) return "—";
			return String(Math.round(count)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
		}
		/** 大数按 B / M / K 缩写；四舍五入到 1000 就降级显示（999 999 显示 999 999，不显示 1000K）。 */
		function fmtTokens(count) {
			if (!Number.isFinite(count)) return "—";
			for (const [base, suffix] of [
				[1e9, "B"],
				[1e6, "M"],
				[1e3, "K"]
			]) {
				if (Math.abs(count) < base) continue;
				const value = count / base;
				const text = value.toFixed(Math.abs(value) >= 100 ? 0 : 1);
				if (Number(text) < 1e3) return text + suffix;
			}
			return fmtCount(count);
		}
		function fmtCalls(count) {
			return fmtCount(count);
		}
		/** `MM-DD`（图表坐标轴与范围文案用）。 */
		function fmtShortDate(dateKey) {
			return dateKey.slice(5);
		}
		/** 毫秒时间戳 → `YYYY-MM-DD HH:mm`（本地时区）。 */
		function fmtDateTime(timeMs) {
			if (timeMs === null) return "—";
			const date = new Date(timeMs);
			const hours = String(date.getHours()).padStart(2, "0");
			const minutes = String(date.getMinutes()).padStart(2, "0");
			return `${isoDate(date)} ${hours}:${minutes}`;
		}
		/** ISO 时间戳 → 本地 `YYYY-MM-DD HH:mm`；解析不出来返回 null（ISO 之外的写法一律不猜）。 */
		function localTimeTextOf(timestamp) {
			if (typeof timestamp !== "string" || timestamp.trim() === "") return null;
			const parsed = new Date(timestamp);
			if (Number.isNaN(parsed.getTime())) return null;
			return fmtDateTime(parsed.getTime());
		}
		/** 时长（毫秒）→ `2h 15m` / `43m` / `—`。 */
		function fmtDuration(milliseconds) {
			if (milliseconds === null || milliseconds <= 0) return "—";
			const minutes = Math.max(1, Math.round(milliseconds / 6e4));
			if (minutes < 60) return `${minutes}m`;
			const hours = Math.floor(minutes / 60);
			if (hours >= 24) return t("fmt.dayHour", {
				days: Math.floor(hours / 24),
				hours: hours % 24
			});
			return `${hours}h ${minutes % 60}m`;
		}
		/** 最近活跃：确定性的本地时间（今天给 HH:mm，更早给 MM-DD HH:mm）—— 相对时间词（刚刚 / N 分钟前）用户明确不要。 */
		function fmtRelative(timeMs, nowMs) {
			if (timeMs === null) return "—";
			const time = new Date(timeMs);
			const pad = (value) => String(value).padStart(2, "0");
			const clock = pad(time.getHours()) + ":" + pad(time.getMinutes());
			const now = new Date(nowMs);
			return time.getFullYear() === now.getFullYear() && time.getMonth() === now.getMonth() && time.getDate() === now.getDate() ? clock : pad(time.getMonth() + 1) + "-" + pad(time.getDate()) + " " + clock;
		}
		//#endregion
		//#region src/client/core/currency.ts
		/**
		* 显示币种与汇率折算：全插件金额渲染的唯一收口点（模块级订阅 store，切币种时整页重渲染）。
		* 逐币种小计走 `costsByCurrency`（`cost` 是混币种相加，只当兜底）；能折算才折算（带 `≈`），绝不猜汇率；
		* 显示币种不落盘 —— 记住一个还没取到汇率的 USD 只会让界面更难懂。
		*/
		const DISPLAY_CURRENCIES = ["CNY", "USD"];
		/** 切换按钮的文案：只留单位符号（ISO 代码在设置弹窗与导出里出现，不占版面）。 */
		const DISPLAY_CURRENCY_SYMBOLS = {
			CNY: "¥",
			USD: "$"
		};
		const FX_SOURCE_LABELS = {
			upstream: t("fx.live"),
			cache: t("fx.cache"),
			default: t("fx.default")
		};
		/** 显示币种与汇率都在这里；`fx: null` = 还没取到汇率（跨币种金额按原币种显示）。 */
		let state = {
			display: "CNY",
			fx: null
		};
		const listeners = /* @__PURE__ */ new Set();
		function currencyDisplayStateOf() {
			return state;
		}
		function subscribeCurrencyDisplay(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}
		function emit() {
			for (const listener of [...listeners]) listener();
		}
		function setDisplayCurrency(display) {
			if (state.display === display) return;
			state = {
				...state,
				display
			};
			emit();
		}
		/** 写入汇率；服务端读不到时传 null（不要保留上一次的旧值冒充新值）。 */
		function setFxRate(fx) {
			state = {
				...state,
				fx
			};
			emit();
		}
		/** 订阅显示币种与汇率：切币种 / 汇率更新后组件重渲染。 */
		let fxBootstrapStarted = false;
		function useCurrencyDisplay() {
			const [current, setCurrent] = (0, react.useState)(currencyDisplayStateOf);
			(0, react.useEffect)(() => subscribeCurrencyDisplay(() => setCurrent(currencyDisplayStateOf())), []);
			(0, react.useEffect)(() => {
				if (fxBootstrapStarted || currencyDisplayStateOf().fx !== null) return;
				fxBootstrapStarted = true;
				loadFxRate(false).then((result) => {
					const normalized = result === null ? null : normalizeFxRate(result);
					if (normalized !== null) setFxRate(normalized);
				}).catch(() => {});
			}, []);
			return current;
		}
		/** 币种代码归一：只认 CNY / USD（其余返回 null，不猜汇率）。 */
		function normalizeCurrency(currency) {
			if (typeof currency !== "string") return null;
			const upper = currency.trim().toUpperCase();
			return upper === "CNY" || upper === "USD" ? upper : null;
		}
		/** 币种符号；未知 / 缺失的币种保留代码前缀，避免把 USD 当 CNY 渲染。 */
		function currencySymbolOf(currency) {
			const normalized = normalizeCurrency(currency);
			if (normalized === "CNY") return "¥";
			if (normalized === "USD") return "$";
			return typeof currency === "string" && currency !== "" ? currency + " " : "";
		}
		/** 显示币种的符号。 */
		function displaySymbolOf(display = state.display) {
			return currencySymbolOf(display);
		}
		/** 从 from 折算到 to 的倍率；方向不匹配或缺汇率时返回 null。 */
		function pairRateOf(from, to) {
			const fx = state.fx;
			if (fx === null || !Number.isFinite(fx.rate) || fx.rate <= 0) return null;
			const base = normalizeCurrency(fx.base);
			const quote = normalizeCurrency(fx.quote);
			if (base === null || quote === null) return null;
			if (from === base && to === quote) return fx.rate;
			if (from === quote && to === base) return 1 / fx.rate;
			return null;
		}
		/** 金额文本（全插件唯一入口）：按显示币种折算，折算值带 `≈`；两位小数精度不随折算改变。 */
		function moneyTextOf(currency, amount) {
			const value = Number.isFinite(amount) ? amount : 0;
			const display = state.display;
			const from = normalizeCurrency(currency);
			const rate = from === null || from === display ? null : pairRateOf(from, display);
			if (rate === null) return currencySymbolOf(currency) + value.toFixed(2);
			return "≈" + currencySymbolOf(display) + (value * rate).toFixed(2);
		}
		/** 单笔金额的展示视图：文本 + 是否折算 + 折算后的数值。 */
		function moneyViewOf(currency, amount) {
			const value = Number.isFinite(amount) ? amount : 0;
			const display = state.display;
			const from = normalizeCurrency(currency);
			const rate = from === null || from === display ? null : pairRateOf(from, display);
			return {
				text: moneyTextOf(currency, amount),
				converted: rate !== null,
				mixed: false,
				amount: rate === null ? value : value * rate,
				currency: rate === null ? typeof currency === "string" ? currency : "" : display
			};
		}
		/** 0 元占位文案（免费额度等）：跟着显示币种走，不带折算标记（0 折算还是 0）。 */
		function zeroMoneyTextOf() {
			return displaySymbolOf() + "0.00";
		}
		/** 单价数值文本：≥0.01 用两位小数，小值保留 4 位 —— 显示成 0.00 等于谎报「免费」。 */
		function rateValueTextOf(amount) {
			const value = Number.isFinite(amount) ? amount : 0;
			if (value === 0) return "0";
			if (Math.abs(value) >= .01) return value.toFixed(2);
			return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
		}
		/** 单价单元格：按显示币种折算（折算值带 `≈`），换算后仍用单价精度，不套金额的两位小数。 */
		function rateTextOf(currency, amount) {
			const display = state.display;
			const from = normalizeCurrency(currency);
			const rate = from === null || from === display ? null : pairRateOf(from, display);
			const value = Number.isFinite(amount) ? amount : 0;
			if (rate === null) return {
				text: rateValueTextOf(value),
				converted: false
			};
			return {
				text: "≈" + rateValueTextOf(value * rate),
				converted: true
			};
		}
		/** 逐币种小计里参与展示的项：0 与非有限值一律丢掉（0 只会污染文本）。 */
		function positiveEntriesOf(row) {
			const totals = row.costsByCurrency;
			if (totals === null || typeof totals !== "object") return [];
			const entries = [];
			for (const [currency, amount] of Object.entries(totals)) {
				if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) continue;
				entries.push([currency, amount]);
			}
			const orderOf = (currency) => {
				const normalized = normalizeCurrency(currency);
				return normalized === "CNY" ? 0 : normalized === "USD" ? 1 : 2;
			};
			return entries.sort((first, second) => orderOf(first[0]) - orderOf(second[0]) || first[0].localeCompare(second[0]));
		}
		/**
		* 一行金额：有 `costsByCurrency` 就逐币种折算后相加（`cost` 会把 CNY 与 USD 加在一起）；
		* 拿不到该字段时回落旧行为，多币种缺汇率时并列显示、不相加。
		*/
		function rowMoneyViewOf(row) {
			const entries = positiveEntriesOf(row);
			if (entries.length === 0) {
				const fallback = typeof row.cost === "number" && Number.isFinite(row.cost) ? row.cost : 0;
				return {
					text: currencySymbolOf("CNY") + fallback.toFixed(2),
					converted: false,
					mixed: false,
					amount: fallback,
					currency: "CNY"
				};
			}
			const parts = entries.map(([currency, amount]) => ({
				currency,
				amount,
				view: moneyViewOf(currency, amount)
			}));
			if (parts.filter((part) => !part.view.converted && normalizeCurrency(part.currency) !== state.display).length === 0) {
				const total = parts.reduce((sum, part) => sum + part.view.amount, 0);
				const converted = parts.some((part) => part.view.converted);
				const text = moneyTextOf(state.display, total);
				return {
					text: converted ? "≈" + text : text,
					converted,
					mixed: parts.length > 1,
					amount: total,
					currency: state.display
				};
			}
			if (parts.length === 1) return parts[0].view;
			return {
				text: parts.map((part) => part.view.text).join(" · "),
				converted: false,
				mixed: true,
				amount: parts.reduce((sum, part) => sum + part.amount, 0),
				currency: ""
			};
		}
		/** 行金额文本（含折算标记）；汇总 / 合计一律走它，不要直接渲染 `cost`。 */
		function moneyTotalsTextOf(row) {
			return rowMoneyViewOf(row).text;
		}
		/**
		* 同一行在展示币种下的可比数值（环比涨跌、排序用）。
		*
		* `rowMoneyViewOf().amount` 在**混币种又折算不了**时是「把各币种当同一个币种相加」（界面会如实显示 `¥611.55 · $11.63`
		* 这种分行文本），拿它算环比会得到一个没有意义的百分比 —— 所以这里只在**同一币种口径**下给数字：
		* 每个分币种小计要么本身就是展示币种，要么能按汇率折过来；否则返回 null（调用方据此不显示环比）。
		*/
		function comparableMoneyOf(row) {
			const entries = positiveEntriesOf(row);
			if (entries.length === 0) return typeof row.cost === "number" && Number.isFinite(row.cost) ? row.cost : null;
			let total = 0;
			for (const [currency, amount] of entries) {
				const view = moneyViewOf(currency, amount);
				if (!view.converted && normalizeCurrency(currency) !== state.display) return null;
				total += view.amount;
			}
			return total;
		}
		/** 汇率说明：`1 USD = 7.10 CNY · 实时上游 · 08-14 10:22`；没取到时说明为什么。 */
		function fxSummaryTextOf(fx) {
			if (fx === null) return t("fx.missing");
			const parts = ["1 " + fx.base + " = " + rateValueTextOf(fx.rate) + " " + fx.quote];
			parts.push(FX_SOURCE_LABELS[fx.source] ?? fx.source);
			const time = localTimeTextOf(fx.fetchedAt);
			if (time !== null) parts.push(time);
			if (fx.stale) parts.push(t("fx.stale"));
			return parts.join(" · ");
		}
		/** 把服务端 `/fx` 的响应归一化成内部结构；rate 非法时返回 null（宁可不算也不猜）。 */
		function normalizeFxRate(raw) {
			if (raw === null || typeof raw !== "object") return null;
			const record = raw;
			const rate = typeof record.rate === "number" ? record.rate : Number(record.rate);
			if (!Number.isFinite(rate) || rate <= 0) return null;
			const source = record.source === "upstream" || record.source === "cache" || record.source === "default" ? record.source : "default";
			return {
				base: typeof record.base === "string" && record.base !== "" ? record.base : "USD",
				quote: typeof record.quote === "string" && record.quote !== "" ? record.quote : "CNY",
				rate,
				fetchedAt: typeof record.fetchedAt === "string" && record.fetchedAt !== "" ? record.fetchedAt : null,
				source,
				stale: record.stale === true,
				upstream: typeof record.upstream === "string" && record.upstream !== "" ? record.upstream : null,
				note: typeof record.note === "string" && record.note !== "" ? record.note : null
			};
		}
		/** 服务端兜底汇率时的显式提示：`source: 'default'` 必须让人看出「这不是联网拿到的」。 */
		/** 汇率说明：服务端给了 code 就按词典渲染（双语），否则回落它给的中文串。 */
		function fxNoteTextOf(fx) {
			if (fx === null) return null;
			if (fx.noteCode !== void 0 && fx.noteCode !== null) return t(fx.noteCode, fx.noteParams ?? {});
			return fx.note;
		}
		function fxFallbackWarningOf(fx) {
			if (fx === null || fx.source !== "default") return null;
			return t("fx.defaultPrefix") + rateValueTextOf(fx.rate) + t("fx.defaultSuffix") + (fxNoteTextOf(fx) === null ? "" : "（" + fxNoteTextOf(fx) + "）");
		}
		//#endregion
		//#region src/client/core/filter-selection.ts
		/** 多选筛选的值约定：界面用数组，状态里存成逗号分隔的字符串（空串 = 全部）。 */
		function selectionOf(value) {
			if (value === void 0) return [];
			const trimmed = value.trim();
			if (trimmed === "" || trimmed === "ALL") return [];
			return trimmed.split(",").filter((item) => item !== "");
		}
		/** 一个值集合是否命中筛选：筛选为空表示不筛。 */
		function selectionMatches(values, filter) {
			const selected = selectionOf(filter);
			if (selected.length === 0) return true;
			return values.some((value) => selected.includes(value));
		}
		//#endregion
		//#region src/client/core/export-csv.ts
		const escapeCell = (value) => {
			if (/[",\n\r]/.test(value)) return "\"" + value.replace(/"/g, "\"\"") + "\"";
			return value;
		};
		/** 触发一次浏览器下载（BOM 让 Excel 直接按 UTF-8 打开）。 */
		function downloadCsv(filename, header, rows) {
			const lines = [header, ...rows].map((row) => row.map((cell) => escapeCell(cell === null || cell === void 0 ? "" : String(cell))).join(","));
			const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = filename;
			link.rel = "noopener";
			link.click();
			URL.revokeObjectURL(url);
		}
		const todaySuffix = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
		/** 使用明细：一行 = 一天 × 一个通道（与明细表同口径）。 */
		function exportUsageCsv(usage) {
			const header = [
				"日期",
				"通道",
				"calls",
				"输入 token",
				"输出 token",
				"缓存读 token",
				"缓存写 token",
				"成本",
				"成本来源",
				"部分计价"
			];
			const rows = usage.days.map((day) => [
				day.date,
				day.provider,
				day.calls,
				day.inputTokens,
				day.outputTokens,
				day.cacheReadTokens,
				day.cacheWriteTokens,
				day.cost,
				day.costSource,
				day.partial === true ? "是" : "否"
			]);
			downloadCsv("dsh-key-usage-使用明细-" + todaySuffix() + ".csv", header, rows);
		}
		/** 会话：一行 = 一个会话（与「最近会话」列表同口径）。 */
		function exportSessionsCsv(sessions) {
			const header = [
				"会话",
				"项目",
				"通道",
				"模型数",
				"calls",
				"Tokens",
				"缓存命中率",
				"成本",
				"成本来源",
				"首次时间",
				"最后时间",
				"归档",
				"子代理数"
			];
			const rows = sessions.rows.map((row) => [
				row.title,
				row.workspace,
				row.provider,
				row.modelCount,
				row.calls,
				row.tokens,
				row.cacheHitRate,
				row.cost,
				row.costSource,
				row.firstTime,
				row.lastTime,
				row.archived === true ? "是" : "否",
				row.subagentCount
			]);
			downloadCsv("dsh-key-usage-会话-" + todaySuffix() + ".csv", header, rows);
		}
		t("src.liveFile"), t("src.bundled"), t("src.notLoaded");
		[
			"https",
			"://github.com",
			"/BerriAI/litellm"
		].join("");
		/** 本插件仓库地址：与 LITELLM_REPO_URL 一样运行时拼出来 —— 构建产物里出现 `https://` 字面量会被 banner 校验当成机器路径拦下。 */
		const PLUGIN_REPO_URL = [
			"https",
			"://github.com",
			"/xyl886/dsh-key-usage"
		].join("");
		/** 字节数 → MB 文本；拿不到合法数字时返回 null，由调用方整段省略（不显示 undefined）。 */
		function megabytesTextOf(bytes) {
			if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) return null;
			return (bytes / 1048576).toFixed(2) + " MB";
		}
		/** URL 里的主机名（刷新回执的「来源」）；解析不出来返回 null。 */
		function hostOf(url) {
			if (typeof url !== "string" || url.trim() === "") return null;
			try {
				const host = new URL(url).host;
				return host === "" ? null : host;
			} catch {
				return null;
			}
		}
		/** 刷新回执：契约只给 `entries`（条目数）不给模型数，所以写「条」而不冒充「个模型」。 */
		function modelPriceRefreshTextOf(result) {
			const parts = [];
			if (typeof result.entries === "number" && Number.isFinite(result.entries)) parts.push(String(result.entries) + t("q.priceEntriesSuffix"));
			const megabytes = megabytesTextOf(result.bytes);
			if (megabytes !== null) parts.push(megabytes);
			const host = hostOf(result.url);
			if (host !== null) parts.push(t("quota.sourceLabel") + " " + host);
			const time = typeof result.fetchedAt === "string" ? localTimeTextOf(result.fetchedAt) : null;
			if (time !== null) parts.push(time);
			return t("quota.updated") + "：" + (parts.length === 0 ? t("quota.recomputed") : parts.join(" · "));
		}
		const COST_SOURCE_LABELS = {
			official: "cso.official",
			catalog: "cso.catalog",
			aggregate: "cso.aggregate",
			none: "—"
		};
		/** 来源 → 可见文案：未收录档与语言无关符号（—）不再交给 t()，避免日志里出现缺词告警。 */
		function costSourceLabelOf(source, translate) {
			if (source === null) return "—";
			const label = COST_SOURCE_LABELS[source];
			if (label === void 0 || label === "—") return "—";
			return translate(label);
		}
		/** 角标的悬浮说明：让「估算」不会被当成账单金额用。 */
		const COST_SOURCE_HINTS = {
			official: "csh.official",
			catalog: "csh.catalog",
			aggregate: "csh.aggregate",
			none: "csh.none"
		};
		const PARTIAL_PRICE_HINT = "part.hint";
		/** 角标悬浮说明：带 `partial` 时补一句口径，避免「部分」被读成缺数据 / 报错。 */
		function costSourceHintOf(source, partial) {
			const key = COST_SOURCE_HINTS[source ?? "none"];
			const hint = key === void 0 ? t("csh.unknown") + " " + String(source ?? "") : t(key);
			return partial === true ? hint + "；" + t(PARTIAL_PRICE_HINT) : hint;
		}
		//#endregion
		//#region src/client/core/tooltip.tsx
		/** 共享浮层：跟随鼠标的 fixed 层，内容用 React 节点渲染（不再拼接 innerHTML）。 */
		function useTooltip() {
			const [tooltip, setTooltip] = (0, react.useState)(null);
			return {
				tooltip,
				show: (0, react.useCallback)((event, node, pin) => {
					const rect = event.currentTarget?.getBoundingClientRect();
					setTooltip({
						x: event.clientX,
						y: event.clientY,
						node,
						anchorLeft: rect === void 0 ? event.clientX : rect.left,
						anchorRight: rect === void 0 ? event.clientX : rect.right,
						pinRight: pin?.right,
						pinTop: pin?.top
					});
				}, []),
				hide: (0, react.useCallback)(() => setTooltip(null), [])
			};
		}
		function TooltipView({ tooltip }) {
			const elementRef = (0, react.useRef)(null);
			(0, react.useLayoutEffect)(() => {
				const element = elementRef.current;
				if (element === null || tooltip === null) return;
				const width = element.offsetWidth;
				const height = element.offsetHeight;
				const margin = 12;
				const gap = 10;
				const pinRight = tooltip.pinRight;
				const pinTop = tooltip.pinTop;
				const pinned = pinRight !== void 0 && pinTop !== void 0;
				const left = pinned ? pinRight - width : tooltip.anchorRight + gap + width > window.innerWidth - margin ? tooltip.anchorLeft - width - gap : tooltip.anchorRight + gap;
				const top = pinned ? pinTop : tooltip.y - height / 2;
				element.style.left = Math.max(margin, Math.min(left, window.innerWidth - width - margin)) + "px";
				element.style.top = Math.max(margin, Math.min(top, window.innerHeight - height - margin)) + "px";
			}, [tooltip]);
			if (tooltip === null) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref: elementRef,
				className: shared_module_css_default.tooltip,
				children: tooltip.node
			});
		}
		function TipTitle({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shared_module_css_default.tipTitle,
				children
			});
		}
		function TipSub({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shared_module_css_default.tipSub,
				children
			});
		}
		function TipRow(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shared_module_css_default.tipRow,
				children: [
					props.color !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: props.color } }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: shared_module_css_default.tipName,
						children: props.label
					}),
					props.amount !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: shared_module_css_default.tipAmount,
						children: props.amount
					}),
					props.rate !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: shared_module_css_default.tipRate,
						children: props.rate
					})
				]
			});
		}
		function TipBar({ percent, color }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shared_module_css_default.tipBar,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: {
					width: Math.max(2, percent) + "%",
					background: color
				} })
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/dateRange.module.css.mjs
		const css$17 = ".Bnmpwa_root{flex:none;display:inline-flex;position:relative}.Bnmpwa_trigger{box-sizing:border-box;height:var(--ku-control,36px);border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:var(--ku-body,14px);cursor:pointer;white-space:nowrap;background:0 0;border-radius:12px;align-items:center;gap:6px;padding:0 10px;line-height:1;display:inline-flex}.Bnmpwa_trigger:hover{border-color:var(--dsw-alias-state-business-primary,#5b8cff);color:var(--dsw-alias-label-primary,#e8e8ec)}.Bnmpwa_trigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:1px}.Bnmpwa_half{font-variant-numeric:tabular-nums}.Bnmpwa_sep{color:var(--dsw-alias-label-tertiary,#67676f)}.Bnmpwa_caret{opacity:.7;font-size:12px}.Bnmpwa_panel{z-index:300;border:1px solid var(--dsw-alias-border-l1,#2c2c34);background:var(--dsw-alias-bg-layer-3,#232329);width:max-content;max-width:calc(100vw - 16px);box-shadow:var(--dsw-shadow-lv2,0 8px 24px #00000059);border-radius:10px;padding:8px;position:fixed}.Bnmpwa_nav{align-items:center;gap:4px;margin-bottom:4px;display:flex}.Bnmpwa_month{text-align:center;font-size:var(--ku-body,14px);color:var(--dsw-alias-label-primary,#e8e8ec);white-space:nowrap;flex:auto;font-weight:500;line-height:22px}.Bnmpwa_navBtn{width:22px;height:22px;color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;cursor:pointer;background:0 0;border:0;border-radius:6px;flex:none;font-size:14px;line-height:1}.Bnmpwa_navBtn:hover:enabled{background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.Bnmpwa_navBtn:disabled{opacity:.35;cursor:not-allowed}.Bnmpwa_navBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:1px}.Bnmpwa_weekdays,.Bnmpwa_week{display:flex}.Bnmpwa_weekday{text-align:center;color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ku-sub,13px);flex:0 0 30px;line-height:20px}.Bnmpwa_grid{outline:none;flex-direction:column;display:flex}.Bnmpwa_grid:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary,#5b8cff);border-radius:6px}.Bnmpwa_cell{box-sizing:border-box;height:28px;color:var(--dsw-alias-label-primary,#e8e8ec);font-size:var(--ku-sub,13px);font-variant-numeric:tabular-nums;cursor:pointer;-webkit-user-select:none;user-select:none;border-radius:6px;flex:0 0 30px;justify-content:center;align-items:center;line-height:1;display:flex}.Bnmpwa_cell:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c1a)}.Bnmpwa_inRange{background:color-mix(in srgb, var(--dsw-alias-state-business-primary,#5b8cff) 16%, transparent);border-radius:0}.Bnmpwa_inRange:hover{background:color-mix(in srgb, var(--dsw-alias-state-business-primary,#5b8cff) 24%, transparent)}.Bnmpwa_edge{background:var(--dsw-alias-state-business-primary,#5b8cff);color:var(--dsw-alias-label-primary-foreground,#fff);border-radius:6px;font-weight:600}.Bnmpwa_edge:hover{background:var(--dsw-alias-state-business-primary,#5b8cff)}.Bnmpwa_cursor{box-shadow:inset 0 0 0 1px var(--dsw-alias-label-secondary,#9a9aa6)}.Bnmpwa_todayCell{font-weight:600}.Bnmpwa_future{color:var(--dsw-alias-label-tertiary,#67676f);opacity:.4;cursor:not-allowed}.Bnmpwa_future:hover{background:0 0}.Bnmpwa_blank{cursor:default}.Bnmpwa_blank:hover{background:0 0}.Bnmpwa_foot{border-top:1px solid var(--dsw-alias-border-l2,#2c2c34);align-items:center;gap:8px;margin-top:6px;padding-top:6px;display:flex}.Bnmpwa_hint{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ku-sub,13px);flex:auto;line-height:18px;overflow:hidden}.Bnmpwa_triggerActive{background:var(--dsw-alias-interactive-bg-active,#2631480f);color:var(--dsw-alias-label-primary,#0f1115)}";
		const tagId$17 = "dsh-key-usage/dateRange.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$17) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$17;
			tag.textContent = css$17;
			document.head.appendChild(tag);
		}
		const cssRegistry$17 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$17.some((e) => e.tagId === tagId$17)) cssRegistry$17.push({
			tagId: tagId$17,
			css: css$17
		});
		var dateRange_module_css_default = {
			"blank": "Bnmpwa_blank",
			"caret": "Bnmpwa_caret",
			"cell": "Bnmpwa_cell",
			"cursor": "Bnmpwa_cursor",
			"edge": "Bnmpwa_edge",
			"foot": "Bnmpwa_foot",
			"future": "Bnmpwa_future",
			"grid": "Bnmpwa_grid",
			"half": "Bnmpwa_half",
			"hint": "Bnmpwa_hint",
			"inRange": "Bnmpwa_inRange",
			"month": "Bnmpwa_month",
			"nav": "Bnmpwa_nav",
			"navBtn": "Bnmpwa_navBtn",
			"panel": "Bnmpwa_panel",
			"root": "Bnmpwa_root",
			"sep": "Bnmpwa_sep",
			"todayCell": "Bnmpwa_todayCell",
			"trigger": "Bnmpwa_trigger",
			"triggerActive": "Bnmpwa_triggerActive",
			"week": "Bnmpwa_week",
			"weekday": "Bnmpwa_weekday",
			"weekdays": "Bnmpwa_weekdays"
		};
		//#endregion
		//#region src/client/components/DateRangePicker.tsx
		/**
		* 自定义日期区间选择器：胶囊触发条（起 → 止 ▾）+ 浮层日历。
		* 交互对齐 dsh-context：先点开始日、再点结束日；区间浅底连片、两端实心；Esc / 点外部 / 滚动关闭。
		* 日期运算一律用本地时间构造 Date，避免 UTC 偏移把「当天」算错。
		*/
		const WEEKDAY_COUNT = 7;
		/** `YYYY-MM-DD` → 本地零点的时间戳；解析失败返回 null。 */
		function timeOf(value) {
			if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
			const year = Number(value.slice(0, 4));
			const month = Number(value.slice(5, 7));
			const day = Number(value.slice(8, 10));
			const time = new Date(year, month - 1, day).getTime();
			return Number.isNaN(time) ? null : time;
		}
		/** 日期加减天数（本地时间）；入参非法返回 null。 */
		function addDaysOf(value, delta) {
			const time = timeOf(value);
			if (time === null) return null;
			return isoDate(new Date(time + delta * 864e5));
		}
		/** 月份加减：`YYYY-MM` → 相邻月份；入参非法返回 null。 */
		function shiftMonthOf(yearMonth, delta) {
			const year = Number(yearMonth.slice(0, 4));
			const month = Number(yearMonth.slice(5, 7));
			if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
			return isoDate(new Date(year, month - 1 + delta, 1)).slice(0, 7);
		}
		/** 月标题：跟随界面语言（中文「2026年10月」/ 英文 "October 2026"），不写死文案。 */
		function monthTitleOf(yearMonth) {
			const year = Number(yearMonth.slice(0, 4));
			const month = Number(yearMonth.slice(5, 7));
			if (!Number.isFinite(year) || !Number.isFinite(month)) return yearMonth;
			return new Date(year, month - 1, 1).toLocaleDateString(isEnglish() ? "en-US" : "zh-CN", {
				year: "numeric",
				month: "long"
			});
		}
		/** 一个月的日历行：6 行 × 7 列，首尾用 null 补齐（周日开头，与宿主日历一致）。 */
		function weeksOf(yearMonth) {
			const year = Number(yearMonth.slice(0, 4));
			const month = Number(yearMonth.slice(5, 7));
			const lead = new Date(year, month - 1, 1).getDay();
			const total = new Date(year, month, 0).getDate();
			const cells = Array.from({ length: lead }, () => null);
			for (let day = 1; day <= total; day += 1) cells.push(isoDate(new Date(year, month - 1, day)));
			while (cells.length % WEEKDAY_COUNT !== 0) cells.push(null);
			const weeks = [];
			for (let index = 0; index < cells.length; index += WEEKDAY_COUNT) weeks.push(cells.slice(index, index + WEEKDAY_COUNT));
			return weeks;
		}
		function DateRangePicker(props) {
			const t = useT();
			const today = isoDate(/* @__PURE__ */ new Date());
			const [open, setOpen] = (0, react.useState)(false);
			const [month, setMonth] = (0, react.useState)(() => timeOf(props.to) === null ? today.slice(0, 7) : props.to.slice(0, 7));
			const [cursor, setCursor] = (0, react.useState)(() => (timeOf(props.to) === null ? today.slice(0, 7) : props.to.slice(0, 7)) + "-01");
			/** 已点下开始日、还没点结束日 */
			const [pending, setPending] = (0, react.useState)(null);
			/** 选结束日时的悬停预览 */
			const [hovered, setHovered] = (0, react.useState)(null);
			const [position, setPosition] = (0, react.useState)(null);
			const rootRef = (0, react.useRef)(null);
			const triggerRef = (0, react.useRef)(null);
			const panelRef = (0, react.useRef)(null);
			const popupId = (0, react.useId)();
			const cursorId = (0, react.useId)();
			/** 浮层里要画的区间：选结束日阶段用「起点 + 悬停/起点」预览，否则用已提交的区间 */
			const previewFrom = pending === null ? props.from : hovered !== null && hovered < pending ? hovered : pending;
			const previewTo = pending === null ? props.to : hovered !== null && hovered > pending ? hovered : pending;
			const close = () => {
				setOpen(false);
				setPending(null);
				setHovered(null);
			};
			const openPicker = () => {
				const anchor = timeOf(props.to) === null ? today.slice(0, 7) : props.to.slice(0, 7);
				setMonth(anchor);
				setCursor(anchor + "-01");
				setPending(null);
				setHovered(null);
				setPosition(null);
				setOpen(true);
			};
			(0, react.useEffect)(() => {
				if (!open) return;
				const onPointerDown = (event) => {
					const root = rootRef.current;
					if (root !== null && event.target instanceof Node && root.contains(event.target)) return;
					close();
				};
				const onKeyDown = (event) => {
					if (event.key !== "Escape") return;
					event.stopPropagation();
					close();
					triggerRef.current?.focus();
				};
				const onDismiss = () => {
					close();
				};
				document.addEventListener("mousedown", onPointerDown);
				document.addEventListener("keydown", onKeyDown);
				window.addEventListener("scroll", onDismiss, true);
				window.addEventListener("resize", onDismiss);
				return () => {
					document.removeEventListener("mousedown", onPointerDown);
					document.removeEventListener("keydown", onKeyDown);
					window.removeEventListener("scroll", onDismiss, true);
					window.removeEventListener("resize", onDismiss);
				};
			}, [open]);
			(0, react.useLayoutEffect)(() => {
				if (!open) return;
				const trigger = rootRef.current;
				const panel = panelRef.current;
				if (trigger === null || panel === null) return;
				const box = trigger.getBoundingClientRect();
				const left = Math.max(8, Math.min(box.left, window.innerWidth - panel.offsetWidth - 8));
				const below = box.bottom + 6;
				const top = below + panel.offsetHeight > window.innerHeight - 8 ? Math.max(8, box.top - panel.offsetHeight - 6) : below;
				setPosition((previous) => previous !== null && previous.left === left && previous.top === top ? previous : {
					left,
					top
				});
			});
			const pickDay = (day) => {
				if (day > today) return;
				if (pending === null) {
					setPending(day);
					setHovered(null);
					return;
				}
				const start = pending <= day ? pending : day;
				const end = pending <= day ? day : pending;
				close();
				triggerRef.current?.focus();
				props.onChange(start, end);
			};
			const shiftMonth = (delta) => {
				const next = shiftMonthOf(month, delta);
				if (next === null || next > today.slice(0, 7)) return;
				setMonth(next);
				setCursor(next + "-01");
			};
			const onGridKeyDown = (event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					pickDay(cursor);
					return;
				}
				const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" ? -7 : event.key === "ArrowDown" ? 7 : null;
				if (step === null) return;
				event.preventDefault();
				const next = addDaysOf(cursor, step);
				if (next === null || next > today || next.slice(0, 7) !== month) return;
				setCursor(next);
			};
			const cellClassOf = (day) => {
				const parts = [dateRange_module_css_default.cell];
				if (day >= previewFrom && day <= previewTo) parts.push(dateRange_module_css_default.inRange);
				if (day === previewFrom || day === previewTo) parts.push(dateRange_module_css_default.edge);
				if (day === cursor) parts.push(dateRange_module_css_default.cursor);
				if (day === today) parts.push(dateRange_module_css_default.todayCell);
				if (day > today) parts.push(dateRange_module_css_default.future);
				return parts.join(" ");
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: dateRange_module_css_default.root,
				ref: rootRef,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					ref: triggerRef,
					className: props.active === true ? dateRange_module_css_default.trigger + " " + dateRange_module_css_default.triggerActive : dateRange_module_css_default.trigger,
					"aria-haspopup": "dialog",
					"aria-expanded": open,
					"aria-controls": open ? popupId : void 0,
					"aria-label": t("date.select"),
					title: t("date.select"),
					onClick: () => {
						if (open) close();
						else openPicker();
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: dateRange_module_css_default.half,
							children: props.from
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: dateRange_module_css_default.sep,
							"aria-hidden": "true",
							children: "→"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: dateRange_module_css_default.half,
							children: props.to
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: dateRange_module_css_default.caret,
							"aria-hidden": "true",
							children: "▾"
						})
					]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: panelRef,
					id: popupId,
					className: dateRange_module_css_default.panel,
					role: "dialog",
					"aria-label": t("date.select"),
					style: position === null ? {
						left: 0,
						top: 0,
						visibility: "hidden"
					} : {
						left: position.left,
						top: position.top
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: dateRange_module_css_default.nav,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: dateRange_module_css_default.navBtn,
									"aria-label": t("date.prevMonth"),
									onClick: () => shiftMonth(-1),
									children: "‹"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: dateRange_module_css_default.month,
									children: monthTitleOf(month)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: dateRange_module_css_default.navBtn,
									"aria-label": t("date.nextMonth"),
									disabled: month >= today.slice(0, 7),
									onClick: () => shiftMonth(1),
									children: "›"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: dateRange_module_css_default.weekdays,
							"aria-hidden": "true",
							children: Array.from({ length: WEEKDAY_COUNT }, (unused, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: dateRange_module_css_default.weekday,
								children: t("h.wd" + String(index))
							}, index))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: dateRange_module_css_default.grid,
							role: "grid",
							tabIndex: 0,
							"aria-label": t("date.select"),
							"aria-activedescendant": cursorId,
							onKeyDown: onGridKeyDown,
							children: weeksOf(month).map((week, weekIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: dateRange_module_css_default.week,
								role: "row",
								children: week.map((day, dayIndex) => {
									if (day === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: dateRange_module_css_default.cell + " " + dateRange_module_css_default.blank }, dayIndex);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										id: day === cursor ? cursorId : void 0,
										role: "gridcell",
										"aria-label": day,
										"aria-selected": day >= previewFrom && day <= previewTo,
										"aria-disabled": day > today,
										className: cellClassOf(day),
										onMouseEnter: () => {
											if (pending !== null) setHovered(day);
										},
										onClick: () => pickDay(day),
										children: String(Number(day.slice(8, 10)))
									}, dayIndex);
								})
							}, weekIndex))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: dateRange_module_css_default.foot,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: dateRange_module_css_default.hint,
								children: t(pending === null ? "date.startHint" : "date.endHint")
							})
						})
					]
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/multiSelect.module.css.mjs
		const css$16 = ".zLYuDG_root{min-width:0;display:inline-flex;position:relative}.zLYuDG_trigger{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2,#2c2c34);min-width:104px;max-width:190px;height:36px;color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:var(--ku-body,14px);cursor:pointer;background:0 0;border-radius:12px;align-items:center;gap:8px;padding:0 10px;display:inline-flex}.zLYuDG_trigger:hover{color:var(--dsw-alias-label-primary,#e8e8ec);border-color:var(--dsw-alias-state-business-primary,#5b8cff)}.zLYuDG_trigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:1px}.zLYuDG_triggerText{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.zLYuDG_caret{opacity:.7;margin-left:auto;font-size:12px}.zLYuDG_panel{z-index:60;border:1px solid var(--dsw-alias-border-l1,#2c2c34);background:var(--dsw-alias-bg-layer-3,#232329);width:260px;box-shadow:var(--dsw-shadow-lv2,0 8px 24px #00000059);border-radius:10px;flex-direction:column;gap:6px;padding:8px;display:flex;position:fixed}.zLYuDG_search{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2,#2c2c34);width:100%;height:30px;color:var(--dsw-alias-label-primary,#e8e8ec);font:inherit;font-size:var(--ku-sub,13px);background:0 0;border-radius:12px;padding:0 10px}.zLYuDG_search:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:1px}.zLYuDG_toolbar{gap:12px;padding:0 2px;display:flex}.zLYuDG_linkBtn{color:var(--dsw-alias-state-business-primary,#5b8cff);font:inherit;font-size:var(--ku-sub,13px);cursor:pointer;background:0 0;border:0;padding:0}.zLYuDG_linkBtn:hover{text-decoration:underline}.zLYuDG_list{flex-direction:column;max-height:260px;display:flex;overflow-y:auto}.zLYuDG_item,.zLYuDG_itemOn{text-align:left;cursor:pointer;width:100%;color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:var(--ku-body,14px);background:0 0;border:0;border-radius:12px;align-items:center;gap:8px;padding:6px;display:flex}.zLYuDG_item:hover,.zLYuDG_itemOn:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c1f)}.zLYuDG_itemOn{color:var(--dsw-alias-label-primary,#e8e8ec)}.zLYuDG_box,.zLYuDG_boxOn{border:1px solid var(--dsw-alias-border-l2,#2c2c34);border-radius:4px;flex:none;justify-content:center;align-items:center;width:16px;height:16px;font-size:12px;line-height:1;display:inline-flex}.zLYuDG_boxOn{border-color:var(--dsw-alias-state-business-primary,#5b8cff);background:var(--dsw-alias-state-business-primary,#5b8cff);color:#fff}.zLYuDG_itemLabel{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.zLYuDG_empty{color:var(--dsw-alias-label-tertiary,#8b8b99);font-size:var(--ku-sub,13px);padding:8px 6px}";
		const tagId$16 = "dsh-key-usage/multiSelect.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$16) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$16;
			tag.textContent = css$16;
			document.head.appendChild(tag);
		}
		const cssRegistry$16 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$16.some((e) => e.tagId === tagId$16)) cssRegistry$16.push({
			tagId: tagId$16,
			css: css$16
		});
		var multiSelect_module_css_default = {
			"box": "zLYuDG_box",
			"boxOn": "zLYuDG_boxOn",
			"caret": "zLYuDG_caret",
			"empty": "zLYuDG_empty",
			"item": "zLYuDG_item",
			"itemLabel": "zLYuDG_itemLabel",
			"itemOn": "zLYuDG_itemOn",
			"linkBtn": "zLYuDG_linkBtn",
			"list": "zLYuDG_list",
			"panel": "zLYuDG_panel",
			"root": "zLYuDG_root",
			"search": "zLYuDG_search",
			"toolbar": "zLYuDG_toolbar",
			"trigger": "zLYuDG_trigger",
			"triggerText": "zLYuDG_triggerText"
		};
		//#endregion
		//#region src/client/components/MultiSelect.tsx
		/** 可搜索、可多选、选项按名称排序的筛选下拉（通道 / 项目 / 模型共用）。 */
		/** 同一时刻只允许一个筛选浮层展开：新打开的那个负责关掉上一个。 */
		let closeOtherOverlay = null;
		const OVERLAY_CLOSE_EVENT = "dsh-key-usage:close-overlays";
		/** 名称排序：中文按拼音、数字与符号跟在后面，保证每次打开顺序稳定。 */
		function sorted(options, usageOf) {
			const byName = (left, right) => left.label.localeCompare(right.label, "zh-Hans-CN", {
				numeric: true,
				sensitivity: "base"
			});
			if (usageOf === void 0) return [...options].sort(byName);
			return [...options].sort((left, right) => usageOf(right.value) - usageOf(left.value) || byName(left, right));
		}
		function MultiSelect(props) {
			const [open, setOpen] = (0, react.useState)(false);
			const [query, setQuery] = (0, react.useState)("");
			const [anchor, setAnchor] = (0, react.useState)({
				top: 0,
				left: 0
			});
			const rootRef = (0, react.useRef)(null);
			const triggerRef = (0, react.useRef)(null);
			const options = (0, react.useMemo)(() => sorted(props.options, props.usageOf), [props.options, props.usageOf]);
			const selectedSet = (0, react.useMemo)(() => new Set(props.selected), [props.selected]);
			(0, react.useLayoutEffect)(() => {
				if (!open) return;
				const place = () => {
					const rect = triggerRef.current?.getBoundingClientRect();
					if (rect === void 0) return;
					setAnchor({
						top: rect.bottom + 6,
						left: Math.max(8, Math.min(rect.left, window.innerWidth - 260 - 8))
					});
				};
				place();
				window.addEventListener("resize", place);
				return () => window.removeEventListener("resize", place);
			}, [open]);
			(0, react.useEffect)(() => {
				if (!open) return;
				const myClose = () => {
					setOpen(false);
				};
				if (closeOtherOverlay !== null && closeOtherOverlay !== myClose) closeOtherOverlay();
				closeOtherOverlay = myClose;
				const onOverlayClose = () => setOpen(false);
				window.addEventListener(OVERLAY_CLOSE_EVENT, onOverlayClose);
				const onDown = (event) => {
					if (rootRef.current !== null && !rootRef.current.contains(event.target)) setOpen(false);
				};
				const onKey = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				document.addEventListener("mousedown", onDown);
				document.addEventListener("keydown", onKey);
				return () => {
					document.removeEventListener("mousedown", onDown);
					document.removeEventListener("keydown", onKey);
					window.removeEventListener(OVERLAY_CLOSE_EVENT, onOverlayClose);
					if (closeOtherOverlay === myClose) closeOtherOverlay = null;
				};
			}, [open]);
			const filtered = (0, react.useMemo)(() => {
				const keyword = query.trim().toLowerCase();
				if (keyword === "") return options;
				return options.filter((option) => option.label.toLowerCase().includes(keyword));
			}, [options, query]);
			const toggle = (value) => {
				const next = selectedSet.has(value) ? props.selected.filter((item) => item !== value) : [...props.selected, value];
				props.onChange(next);
			};
			const triggerText = props.selected.length === 0 ? props.allLabel : props.selected.length === 1 ? options.find((option) => option.value === props.selected[0])?.label ?? props.selected[0] : t("multi.count", { count: props.selected.length });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: multiSelect_module_css_default.root,
				ref: rootRef,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					ref: triggerRef,
					className: multiSelect_module_css_default.trigger,
					onClick: () => setOpen((previous) => !previous),
					"aria-haspopup": "listbox",
					"aria-expanded": open,
					"aria-label": props.ariaLabel,
					title: props.ariaLabel,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: multiSelect_module_css_default.triggerText,
						children: triggerText
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: multiSelect_module_css_default.caret,
						"aria-hidden": "true",
						children: "▾"
					})]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: multiSelect_module_css_default.panel,
					style: {
						top: anchor.top,
						left: anchor.left
					},
					role: "listbox",
					"aria-multiselectable": "true",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: multiSelect_module_css_default.search,
							value: query,
							placeholder: props.searchLabel,
							"aria-label": props.searchLabel,
							onChange: (event) => setQuery(event.target.value),
							autoFocus: true
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: multiSelect_module_css_default.toolbar,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: multiSelect_module_css_default.linkBtn,
								onClick: () => props.onChange(options.map((option) => option.value)),
								children: t("multi.all")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: multiSelect_module_css_default.linkBtn,
								onClick: () => props.onChange([]),
								children: t("multi.none")
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: multiSelect_module_css_default.list,
							children: [filtered.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: multiSelect_module_css_default.empty,
								children: t("multi.empty")
							}), filtered.map((option) => {
								const chosen = selectedSet.has(option.value);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: chosen ? multiSelect_module_css_default.itemOn : multiSelect_module_css_default.item,
									role: "option",
									"aria-selected": chosen,
									onClick: () => toggle(option.value),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: chosen ? multiSelect_module_css_default.boxOn : multiSelect_module_css_default.box,
										"aria-hidden": "true",
										children: chosen ? "✓" : ""
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: multiSelect_module_css_default.itemLabel,
										children: option.label
									})]
								}, option.value === "" ? "__empty" : option.value);
							})]
						})
					]
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/ui.module.css.mjs
		const css$15 = ".eBtFdG_btn{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.1);box-sizing:border-box;cursor:pointer;white-space:nowrap;background:0 0;border-radius:8px;justify-content:center;align-items:center;gap:6px;height:30px;padding:6px 12px;line-height:1;display:inline-flex}.eBtFdG_btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.eBtFdG_btn:disabled{opacity:.55;cursor:default}.eBtFdG_btn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.eBtFdG_btnSm{font-size:calc(var(--dsh-content-font-size,12px) * 1.05);padding:0 10px}.eBtFdG_btnPrimary{border-color:var(--dsw-alias-state-business-primary,#5b8cff);color:var(--dsw-alias-state-business-primary,#5b8cff)}.eBtFdG_btnPrimary:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-active,#5b8cff24);color:var(--dsw-alias-state-business-primary,#5b8cff)}.eBtFdG_btnActive{background:var(--dsw-alias-interactive-bg-active,#5b8cff24);color:var(--dsw-alias-state-business-primary,#5b8cff);font-weight:600}.eBtFdG_selectWrap{display:inline-block;position:relative}.eBtFdG_selectBtn{border:1px solid var(--dsw-alias-border-l2,#2c2c34);max-width:240px;color:var(--dsw-alias-label-primary,#e8e8ec);font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.05);box-sizing:border-box;cursor:pointer;background:0 0;border-radius:8px;align-items:center;gap:8px;height:30px;padding:0 10px;display:inline-flex}.eBtFdG_selectBtn:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c1a)}.eBtFdG_selectBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.eBtFdG_selectValue{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.eBtFdG_selectCaret{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .83);flex:none}.eBtFdG_selectList{z-index:40;border:1px solid var(--dsw-alias-border-l2,#2c2c34);background:var(--dsw-alias-bg-layer-2,#1c1c22);border-radius:10px;min-width:100%;max-height:280px;margin:0;padding:4px;list-style:none;position:absolute;top:calc(100% + 4px);left:0;overflow-y:auto;box-shadow:0 8px 24px #00000047}.eBtFdG_selectOption{font-size:calc(var(--dsh-content-font-size,12px) * 1.1);color:var(--dsw-alias-label-primary,#e8e8ec);cursor:pointer;white-space:nowrap;border-radius:8px;align-items:center;gap:6px;padding:6px 8px;display:flex}.eBtFdG_selectOptionActive{background:var(--dsw-alias-interactive-bg-active,#5b8cff24);color:var(--dsw-alias-state-business-primary,#5b8cff)}.eBtFdG_selectCheck{color:var(--dsw-alias-state-business-primary,#5b8cff);margin-left:auto}.eBtFdG_tableScroll{overflow-x:auto}.eBtFdG_emptyState{font-size:calc(var(--dsh-content-font-size,12px) * 1.1);color:var(--dsw-alias-label-tertiary,#67676f);flex-direction:column;gap:4px;padding:16px 0;display:flex}.eBtFdG_emptyTitle{color:var(--dsw-alias-label-secondary,#9a9aa6)}.eBtFdG_dialogMask{z-index:60;background:var(--dsw-alias-bg-mask-1,#00000073);justify-content:center;align-items:center;padding:24px;display:flex;position:fixed;top:0;bottom:0;left:0;right:0}.eBtFdG_dialog{border:1px solid var(--dsw-alias-border-l2,#2c2c34);background:var(--dsw-alias-bg-layer-1,#16161a);border-radius:12px;width:100%;max-width:620px;max-height:78vh;padding:16px;overflow:auto;box-shadow:0 16px 48px #0006}.eBtFdG_dialog:focus-visible{outline:none}.eBtFdG_dialogHead{justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px;display:flex}.eBtFdG_dialogTitle{font-size:calc(var(--dsh-content-font-size,12px) * 1.28);color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:650}.eBtFdG_dialogClose{color:var(--dsw-alias-label-tertiary,#67676f);cursor:pointer;font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.19);background:0 0;border:0;padding:4px}.eBtFdG_dialogClose:hover{color:var(--dsw-alias-label-primary,#e8e8ec)}.eBtFdG_dialogBody{font-size:calc(var(--dsh-content-font-size,12px) * 1.15);color:var(--dsw-alias-label-secondary,#9a9aa6);line-height:1.75}.eBtFdG_control{box-sizing:border-box;height:30px;font-size:calc(var(--dsh-content-font-size,12px) * 1);color:var(--dsw-alias-label-primary,#e8e8ec);background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l2,#3a3a44);cursor:pointer;border-radius:6px;align-items:center;gap:6px;padding:0 10px;font-weight:500;line-height:1;display:inline-flex}.eBtFdG_control:hover{border-color:var(--dsw-alias-state-business-primary,#5b8cff)}.eBtFdG_datePicker{display:inline-flex;position:relative}.eBtFdG_dateTrigger{font-variant-numeric:tabular-nums;justify-content:space-between;min-width:208px}.eBtFdG_dateTriggerEmpty,.eBtFdG_dateTriggerArrow{color:var(--dsw-alias-label-tertiary,#67676f)}.eBtFdG_datePopover{z-index:40;background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l1,#2c2c34);width:268px;box-shadow:var(--dsw-shadow-lv2,0 8px 24px #00000059);border-radius:8px;padding:10px 12px 8px;position:absolute;top:calc(100% + 6px);left:0}.eBtFdG_dateHead{justify-content:space-between;align-items:center;margin-bottom:6px;display:flex}.eBtFdG_dateNav{cursor:pointer;width:22px;height:22px;color:var(--dsw-alias-label-secondary,#9a9aa6);background:0 0;border:none;border-radius:4px;font-size:14px}.eBtFdG_dateNav:hover{background:var(--dsw-alias-interactive-bg-hover,#ffffff0f);color:var(--dsw-alias-label-primary,#e8e8ec)}.eBtFdG_dateTitle{font-size:calc(var(--dsh-content-font-size,12px) * 1.05);color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600}.eBtFdG_dateGrid{grid-template-columns:repeat(7,1fr);gap:2px 0;display:grid}.eBtFdG_dateWeekday{text-align:center;font-size:calc(var(--dsh-content-font-size,12px) * .87);color:var(--dsw-alias-label-tertiary,#67676f);padding-bottom:2px}.eBtFdG_dateCell{cursor:pointer;height:28px;color:var(--dsw-alias-label-primary,#e8e8ec);font-size:calc(var(--dsh-content-font-size,12px) * .95);font-variant-numeric:tabular-nums;background:0 0;border:none}.eBtFdG_dateCell:hover{background:var(--dsw-alias-interactive-bg-hover,#ffffff14)}.eBtFdG_dateCellMuted{color:var(--dsw-alias-label-tertiary,#67676f);opacity:.6}.eBtFdG_dateCellInRange{background:#5b8cff2e}.eBtFdG_dateCellEdge{background:var(--dsw-alias-state-business-primary,#5b8cff);color:#fff;font-weight:600}.eBtFdG_dateFoot{border-top:1px solid var(--dsw-alias-border-l1,#2c2c34);justify-content:space-between;align-items:center;margin-top:8px;padding-top:6px;display:flex}.eBtFdG_dateHint{font-size:calc(var(--dsh-content-font-size,12px) * .92);color:var(--dsw-alias-label-tertiary,#67676f)}.eBtFdG_dateClear{cursor:pointer;color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:calc(var(--dsh-content-font-size,12px) * .95);background:0 0;border:none}.eBtFdG_dateClear:hover{color:var(--dsw-alias-state-business-primary,#5b8cff)}.eBtFdG_logHint{font:inherit;cursor:pointer;text-align:left;background:0 0;border:0;align-items:baseline;gap:6px;padding:0;display:inline-flex}.eBtFdG_logHint:hover{text-decoration:underline}.eBtFdG_logHintError{color:var(--dsw-alias-state-error-primary,#e05a5a)}.eBtFdG_logHintWarn{color:var(--dsw-alias-state-warn-primary,#e0a13c)}.eBtFdG_logHintTail{color:var(--dsw-alias-label-secondary,#9a9aa6)}";
		const tagId$15 = "dsh-key-usage/ui.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$15) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$15;
			tag.textContent = css$15;
			document.head.appendChild(tag);
		}
		const cssRegistry$15 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$15.some((e) => e.tagId === tagId$15)) cssRegistry$15.push({
			tagId: tagId$15,
			css: css$15
		});
		var ui_module_css_default = {
			"btn": "eBtFdG_btn",
			"btnActive": "eBtFdG_btnActive",
			"btnPrimary": "eBtFdG_btnPrimary",
			"btnSm": "eBtFdG_btnSm",
			"control": "eBtFdG_control",
			"dateCell": "eBtFdG_dateCell",
			"dateCellEdge": "eBtFdG_dateCellEdge",
			"dateCellInRange": "eBtFdG_dateCellInRange",
			"dateCellMuted": "eBtFdG_dateCellMuted",
			"dateClear": "eBtFdG_dateClear",
			"dateFoot": "eBtFdG_dateFoot",
			"dateGrid": "eBtFdG_dateGrid",
			"dateHead": "eBtFdG_dateHead",
			"dateHint": "eBtFdG_dateHint",
			"dateNav": "eBtFdG_dateNav",
			"datePicker": "eBtFdG_datePicker",
			"datePopover": "eBtFdG_datePopover",
			"dateTitle": "eBtFdG_dateTitle",
			"dateTrigger": "eBtFdG_dateTrigger",
			"dateTriggerArrow": "eBtFdG_dateTriggerArrow",
			"dateTriggerEmpty": "eBtFdG_dateTriggerEmpty",
			"dateWeekday": "eBtFdG_dateWeekday",
			"dialog": "eBtFdG_dialog",
			"dialogBody": "eBtFdG_dialogBody",
			"dialogClose": "eBtFdG_dialogClose",
			"dialogHead": "eBtFdG_dialogHead",
			"dialogMask": "eBtFdG_dialogMask",
			"dialogTitle": "eBtFdG_dialogTitle",
			"emptyState": "eBtFdG_emptyState",
			"emptyTitle": "eBtFdG_emptyTitle",
			"logHint": "eBtFdG_logHint",
			"logHintError": "eBtFdG_logHintError",
			"logHintTail": "eBtFdG_logHintTail",
			"logHintWarn": "eBtFdG_logHintWarn",
			"selectBtn": "eBtFdG_selectBtn",
			"selectCaret": "eBtFdG_selectCaret",
			"selectCheck": "eBtFdG_selectCheck",
			"selectList": "eBtFdG_selectList",
			"selectOption": "eBtFdG_selectOption",
			"selectOptionActive": "eBtFdG_selectOptionActive",
			"selectValue": "eBtFdG_selectValue",
			"selectWrap": "eBtFdG_selectWrap",
			"tableScroll": "eBtFdG_tableScroll"
		};
		//#endregion
		//#region src/client/components/ui/Button.tsx
		function Button(props) {
			const classes = [ui_module_css_default.btn];
			if (props.size === "sm") classes.push(ui_module_css_default.btnSm);
			if (props.variant === "primary") classes.push(ui_module_css_default.btnPrimary);
			if (props.active === true) classes.push(ui_module_css_default.btnActive);
			if (props.className !== void 0) classes.push(props.className);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: classes.join(" "),
				disabled: props.disabled,
				"aria-label": props.ariaLabel,
				"aria-pressed": props.active,
				title: props.title,
				onClick: props.onClick,
				children: props.children
			});
		}
		//#endregion
		//#region src/client/components/ui/Dialog.tsx
		/** 通用弹窗：口径说明这类「可以写长、但不该占版面」的内容放这里。
		*  Esc / 点遮罩关闭；打开时焦点落到弹窗内，关闭后由浏览器还原到触发按钮。 */
		function Dialog(props) {
			const boxRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const onKeyDown = (event) => {
					if (event.key === "Escape") props.onClose();
				};
				document.addEventListener("keydown", onKeyDown);
				boxRef.current?.focus();
				return () => document.removeEventListener("keydown", onKeyDown);
			}, [props.onClose]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ui_module_css_default.dialogMask,
				onClick: props.onClose,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ui_module_css_default.dialog,
					role: "dialog",
					"aria-modal": "true",
					"aria-label": props.title,
					tabIndex: -1,
					ref: boxRef,
					onClick: (event) => event.stopPropagation(),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ui_module_css_default.dialogHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ui_module_css_default.dialogTitle,
							children: props.title
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: ui_module_css_default.dialogClose,
							"aria-label": props.closeLabel ?? "关闭",
							onClick: props.onClose,
							children: "✕"
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ui_module_css_default.dialogBody,
						children: props.children
					})]
				})
			});
		}
		//#endregion
		//#region src/client/components/LogHint.tsx
		function LogHint(props) {
			const toneClass = (props.tone ?? "warn") === "error" ? ui_module_css_default.logHintError : ui_module_css_default.logHintWarn;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: ui_module_css_default.logHint + " " + toneClass + (props.className === void 0 ? "" : " " + props.className),
				title: t("log.view"),
				onClick: () => requestOpenLog(),
				children: [props.text, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: ui_module_css_default.logHintTail,
					children: t("log.view")
				})]
			});
		}
		//#endregion
		//#region src/client/core/export.ts
		/**
		* 导出工具：纯函数生成 CSV / JSON 文本 + Blob 触发下载，导出的是当前筛选后的数据。
		* CSV 必须带 UTF-8 BOM（否则 Excel 中文乱码），JSON 不能带 BOM（`JSON.parse` 会抛错）。
		*/
		const UTF8_BOM = "﻿";
		const CSV_MIME = "text/csv;charset=utf-8";
		const JSON_MIME = "application/json;charset=utf-8";
		const TEXT_MIME = "text/plain;charset=utf-8";
		/** 表头 + 数据行 → CSV 文本（转义见 `csvCell`，换行用 RFC 4180 的 CRLF）。 */
		function toCsv(rows, columns) {
			const lines = [columns.map((column) => csvCell(column.labelKey === void 0 ? column.label ?? column.key : t(column.labelKey))).join(",")];
			for (const row of rows) lines.push(columns.map((column) => csvCell(column.value(row))).join(","));
			return UTF8_BOM + lines.join("\r\n") + "\r\n";
		}
		function toJson(value) {
			return JSON.stringify(value, null, 2) + "\n";
		}
		/** 下载文件名：`dsh-usage-<主题>-<当天>.<扩展名>`，主题用英文短名避免跨端中文文件名乱码。 */
		function exportFileName(topic, extension) {
			return "dsh-usage-" + topic + "-" + isoDate(/* @__PURE__ */ new Date()) + "." + extension;
		}
		function downloadFile(name, text, mime) {
			try {
				const objectUrl = URL.createObjectURL(new Blob([text], { type: mime }));
				const anchor = document.createElement("a");
				anchor.href = objectUrl;
				anchor.download = name;
				document.body.appendChild(anchor);
				anchor.click();
				anchor.remove();
				window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
			} catch (error) {
				logWarn("export", t("log.exportBlocked") + " · " + name, error instanceof Error ? error.message : String(error));
			}
		}
		/** 逗号、引号、换行都必须包引号并把内部引号翻倍，否则标题里的逗号会撑破列。 */
		function csvCell(value) {
			if (value === null) return "";
			const text = String(value);
			return /[",\r\n]/.test(text) ? "\"" + text.replace(/"/g, "\"\"") + "\"" : text;
		}
		//#endregion
		//#region src/client/components/ui/Select.tsx
		/** 通用下拉：原生 `select` 的外观改不动（各系统长相不一，与宿主主题脱节），这里自建 listbox。
		*  键盘：↑↓ 移动、Enter 选中、Esc 关闭；点外部关闭；role=listbox/option 供读屏。 */
		function labelOf(option) {
			if (option.label !== void 0) return option.label;
			if (option.labelKey !== void 0) return t(option.labelKey);
			return option.value;
		}
		function Select(props) {
			const [open, setOpen] = (0, react.useState)(false);
			const [activeIndex, setActiveIndex] = (0, react.useState)(0);
			const wrapRef = (0, react.useRef)(null);
			const current = props.options.find((option) => option.value === props.value) ?? props.options[0];
			(0, react.useEffect)(() => {
				if (!open) return;
				const onPointerDown = (event) => {
					const target = event.target;
					if (wrapRef.current !== null && !wrapRef.current.contains(target)) setOpen(false);
				};
				document.addEventListener("mousedown", onPointerDown);
				return () => document.removeEventListener("mousedown", onPointerDown);
			}, [open]);
			const step = (delta) => {
				setActiveIndex((previous) => Math.min(props.options.length - 1, Math.max(0, previous + delta)));
			};
			const commit = (index) => {
				const option = props.options[index];
				if (option !== void 0) props.onChange(option.value);
				setOpen(false);
			};
			const toggle = () => {
				const index = props.options.findIndex((option) => option.value === props.value);
				setActiveIndex(index < 0 ? 0 : index);
				setOpen((previous) => !previous);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: ui_module_css_default.selectWrap,
				ref: wrapRef,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: ui_module_css_default.selectBtn,
					"aria-label": props.ariaLabel,
					"aria-haspopup": "listbox",
					"aria-expanded": open,
					onClick: toggle,
					onKeyDown: (event) => {
						if (event.key === "ArrowDown" || event.key === "ArrowUp") {
							event.preventDefault();
							if (!open) {
								setOpen(true);
								return;
							}
							step(event.key === "ArrowDown" ? 1 : -1);
						}
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: ui_module_css_default.selectValue,
						children: current === void 0 ? "" : labelOf(current)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: ui_module_css_default.selectCaret,
						"aria-hidden": "true",
						children: "▼"
					})]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: ui_module_css_default.selectList,
					role: "listbox",
					"aria-label": props.ariaLabel,
					tabIndex: -1,
					autoFocus: true,
					onKeyDown: (event) => {
						if (event.key === "Escape") {
							setOpen(false);
							return;
						}
						if (event.key === "Enter") {
							event.preventDefault();
							commit(activeIndex);
							return;
						}
						if (event.key === "ArrowDown" || event.key === "ArrowUp") {
							event.preventDefault();
							step(event.key === "ArrowDown" ? 1 : -1);
						}
					},
					children: props.options.map((option, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
						role: "option",
						"aria-selected": option.value === props.value,
						className: ui_module_css_default.selectOption + (index === activeIndex ? " " + ui_module_css_default.selectOptionActive : ""),
						onMouseEnter: () => setActiveIndex(index),
						onClick: () => commit(index),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: labelOf(option) }), option.value === props.value && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ui_module_css_default.selectCheck,
							"aria-hidden": "true",
							children: "✓"
						})]
					}, option.value))
				})]
			});
		}
		//#endregion
		//#region src/client/components/ui/EmptyState.tsx
		function EmptyState(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ui_module_css_default.emptyState,
				role: "status",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ui_module_css_default.emptyTitle,
						children: props.title
					}),
					props.reason !== void 0 && props.reason !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: props.reason }),
					props.children
				]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/log.module.css.mjs
		const css$14 = ".bxCCjW_panel{flex-direction:column;gap:10px;display:flex}.bxCCjW_head{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.bxCCjW_count{color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:var(--ku-body,14px);font-variant-numeric:tabular-nums;white-space:nowrap}.bxCCjW_headActions{align-items:center;gap:8px;margin-left:auto;display:inline-flex}.bxCCjW_filters{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.bxCCjW_levelGroup{align-items:center;gap:4px;display:inline-flex}.bxCCjW_searchInput{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2,#2c2c34);background:var(--dsw-alias-bg-layer-2,#1d1d22);min-width:120px;height:30px;color:var(--dsw-alias-label-primary,#e8e8ec);font:inherit;font-size:var(--ku-body,14px);border-radius:6px;flex:140px;padding:0 10px}.bxCCjW_searchInput::placeholder{color:var(--dsw-alias-label-tertiary,#67676f)}.bxCCjW_searchInput:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.bxCCjW_listScroll{max-height:min(46vh,440px);padding-right:4px;overflow-y:auto}.bxCCjW_list{flex-direction:column;gap:8px;margin:0;padding:0;list-style:none;display:flex}.bxCCjW_row{border-radius:8px;flex-direction:column;gap:4px;padding:8px 10px;display:flex}.bxCCjW_row:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c14)}.bxCCjW_meta{flex-wrap:wrap;align-items:center;gap:10px;display:flex}.bxCCjW_time{color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ku-sub,13px);font-variant-numeric:tabular-nums;white-space:nowrap}.bxCCjW_level{color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ku-sub,13px);letter-spacing:.03em;white-space:nowrap;align-items:center;gap:4px;font-weight:600;display:inline-flex}.bxCCjW_levelDot{background:currentColor;border-radius:999px;flex:none;width:7px;height:7px}.bxCCjW_levelWarn{color:var(--dsw-alias-state-warn-primary,#e0a13c)}.bxCCjW_levelError{color:var(--dsw-alias-state-error-primary,#e05a5a)}.bxCCjW_source{color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ku-sub,13px);white-space:nowrap;font-family:ui-monospace,Consolas,monospace}.bxCCjW_retry{font:inherit;font-size:var(--ku-sub,13px);color:var(--dsw-alias-state-business-primary,#5b8cff);cursor:pointer;background:0 0;border:0;padding:0}.bxCCjW_retry:hover{text-decoration:underline}.bxCCjW_retry:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.bxCCjW_content{flex-direction:column;gap:4px;min-width:0;display:flex}.bxCCjW_message{color:var(--dsw-alias-label-primary,#e8e8ec);font-size:var(--ku-body,14px);white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere}.bxCCjW_detail{color:var(--dsw-alias-label-secondary,#9a9aa6);font-family:ui-monospace,Consolas,monospace;font-size:var(--ku-sub,13px);white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;margin:0;padding-left:12px;line-height:1.55}";
		const tagId$14 = "dsh-key-usage/log.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$14) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$14;
			tag.textContent = css$14;
			document.head.appendChild(tag);
		}
		const cssRegistry$14 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$14.some((e) => e.tagId === tagId$14)) cssRegistry$14.push({
			tagId: tagId$14,
			css: css$14
		});
		var log_module_css_default = {
			"content": "bxCCjW_content",
			"count": "bxCCjW_count",
			"detail": "bxCCjW_detail",
			"filters": "bxCCjW_filters",
			"head": "bxCCjW_head",
			"headActions": "bxCCjW_headActions",
			"level": "bxCCjW_level",
			"levelDot": "bxCCjW_levelDot",
			"levelError": "bxCCjW_levelError",
			"levelGroup": "bxCCjW_levelGroup",
			"levelWarn": "bxCCjW_levelWarn",
			"list": "bxCCjW_list",
			"listScroll": "bxCCjW_listScroll",
			"message": "bxCCjW_message",
			"meta": "bxCCjW_meta",
			"panel": "bxCCjW_panel",
			"retry": "bxCCjW_retry",
			"row": "bxCCjW_row",
			"searchInput": "bxCCjW_searchInput",
			"source": "bxCCjW_source",
			"time": "bxCCjW_time"
		};
		//#endregion
		//#region src/client/components/LogPanel.tsx
		/**
		* 系统日志面板：条数统计 + 级别 / 来源 / 搜索筛选 + 平铺条目。
		* 每条的 message 与详情直接展示（详情多行缩进、保留换行、不截断），不再需要点击展开。
		* 数据只来自 core/log.ts（内存 + 磁盘回读），动作与旧实现一致：刷新 / 复制 / 导出 / 清空。
		*/
		const LEVEL_FILTERS = [
			{
				value: "all",
				labelKey: "log.filterAll"
			},
			{
				value: "warn",
				labelKey: "log.filterWarn"
			},
			{
				value: "error",
				labelKey: "log.filterError"
			}
		];
		/** 列表停在顶部附近时才跟随新条目，用户往下翻看历史时不被抢滚动位置。 */
		const STICK_TOP_PX = 32;
		function LogPanel() {
			const t = useT();
			/** `tick` 只用来打破 React 的引用相等短路：同一条重复出现只累加 ×N 时数组引用不变。 */
			const [snapshot, setSnapshot] = (0, react.useState)(() => ({
				list: logEntries(),
				tick: 0
			}));
			const [levelFilter, setLevelFilter] = (0, react.useState)("all");
			const [sourceFilter, setSourceFilter] = (0, react.useState)("");
			const [search, setSearch] = (0, react.useState)("");
			const [refreshing, setRefreshing] = (0, react.useState)(false);
			const listRef = (0, react.useRef)(null);
			const newestRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => subscribeLog(() => {
				setSnapshot((previous) => ({
					list: logEntries(),
					tick: previous.tick + 1
				}));
			}), []);
			/** 来源下拉只列真实出现过的来源，去重后固定顺序，筛选时选项不跳。 */
			const sources = (0, react.useMemo)(() => {
				const seen = /* @__PURE__ */ new Set();
				for (const entry of snapshot.list) seen.add(entry.source);
				return [...seen].sort((first, second) => first.localeCompare(second));
			}, [snapshot.list]);
			/** 时间倒序 + 级别 / 来源 / 搜索三条件过滤（搜索按消息 / 来源 / 详情模糊匹配）。 */
			const visible = (0, react.useMemo)(() => {
				const query = search.trim().toLowerCase();
				return [...snapshot.list].sort((first, second) => second.time - first.time).filter((entry) => {
					if (levelFilter !== "all" && entry.level !== levelFilter) return false;
					if (sourceFilter !== "" && entry.source !== sourceFilter) return false;
					if (query === "") return true;
					return (entry.message + "\n" + entry.source + "\n" + (entry.detail ?? "")).toLowerCase().includes(query);
				});
			}, [
				snapshot.list,
				levelFilter,
				sourceFilter,
				search
			]);
			/** 新条目出现时回到最新一条（列表时间倒序，最新在顶部）。 */
			(0, react.useEffect)(() => {
				const list = listRef.current;
				if (list === null) return;
				const newest = visible.length === 0 ? null : visible[0].id;
				if (newest === newestRef.current) return;
				if (list.scrollTop <= STICK_TOP_PX) list.scrollTop = 0;
				newestRef.current = newest;
			}, [visible]);
			const onRefresh = () => {
				setRefreshing(true);
				refreshLog({
					level: levelFilter === "all" ? void 0 : levelFilter,
					source: sourceFilter === "" ? void 0 : sourceFilter
				}).finally(() => setRefreshing(false));
			};
			const onCopy = () => {
				navigator.clipboard?.writeText(logTextOf(visible)).catch(() => logWarn("export", t("log.copyBlocked"), "clipboard"));
			};
			const onExport = () => {
				try {
					downloadFile(exportFileName("log", "txt"), logTextOf(visible) + "\n", TEXT_MIME);
				} catch (error) {
					logWarn("export", t("log.exportBlocked"), error instanceof Error ? error.message : String(error));
				}
			};
			const onClear = () => {
				clearLog();
				setSourceFilter("");
			};
			const empty = visible.length === 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: log_module_css_default.panel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: log_module_css_default.head,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: log_module_css_default.count,
							children: t("log.count", { count: visible.length })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: log_module_css_default.headActions,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									size: "sm",
									disabled: refreshing,
									onClick: onRefresh,
									children: refreshing ? t("action.refreshing") : t("action.refresh")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									size: "sm",
									disabled: snapshot.list.length === 0,
									onClick: onCopy,
									children: t("log.copy")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									size: "sm",
									disabled: snapshot.list.length === 0,
									onClick: onExport,
									children: t("log.export")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									size: "sm",
									disabled: snapshot.list.length === 0,
									onClick: onClear,
									children: t("log.clear")
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: log_module_css_default.filters,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: log_module_css_default.levelGroup,
								children: LEVEL_FILTERS.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									size: "sm",
									active: levelFilter === option.value,
									onClick: () => setLevelFilter(option.value),
									children: t(option.labelKey)
								}, option.value))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Select, {
								ariaLabel: t("quota.sourceLabel"),
								value: sourceFilter,
								onChange: setSourceFilter,
								options: [{
									value: "",
									labelKey: "log.sourceAll"
								}, ...sources.map((source) => ({
									value: source,
									label: source
								}))]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: log_module_css_default.searchInput,
								type: "search",
								"aria-label": t("log.search"),
								placeholder: t("log.search"),
								value: search,
								onChange: (event) => setSearch(event.target.value)
							})
						]
					}),
					empty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { title: t("log.empty") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: log_module_css_default.listScroll,
						ref: listRef,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: log_module_css_default.list,
							children: visible.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								className: log_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: log_module_css_default.meta,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: log_module_css_default.time,
											children: formatTime(entry.time)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: log_module_css_default.level + levelClass(entry.level),
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: log_module_css_default.levelDot,
												"aria-hidden": "true"
											}), entry.level.toUpperCase()]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: log_module_css_default.source,
											children: entry.source
										}),
										entry.retry === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: log_module_css_default.retry,
											onClick: () => {
												entry.retry?.();
											},
											children: t("log.retry")
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: log_module_css_default.content,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: log_module_css_default.message,
										children: messageTextOf(entry)
									}), entry.detail === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
										className: log_module_css_default.detail,
										children: entry.detail
									})]
								})]
							}, entry.id))
						})
					})
				]
			});
		}
		/** 完整本地日期 + 时分秒：日志要跨天对照，只给时分秒看不出是哪一天。 */
		function formatTime(time) {
			const date = new Date(time);
			const pad = (value) => String(value).padStart(2, "0");
			return String(date.getFullYear()) + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) + " " + pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
		}
		/** 重复次数跟在消息后面（去重累加后要能看出「发生过几次」）。 */
		function messageTextOf(entry) {
			return entry.message + (entry.count > 1 ? " ×" + String(entry.count) : "");
		}
		/** 级别配色：错误红、警告黄、信息弱化（色点与色字同色）。 */
		function levelClass(level) {
			if (level === "error") return " " + log_module_css_default.levelError;
			if (level === "warn") return " " + log_module_css_default.levelWarn;
			return "";
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/settings.module.css.mjs
		const css$13 = ".YqBhuW_shell{align-items:stretch;gap:16px;min-width:620px;display:flex}.YqBhuW_tabs{border-right:1px solid var(--dsw-alias-interactive-bg-active,#80808c2e);flex-direction:column;flex:0 0 92px;gap:2px;padding-right:8px;display:flex}.YqBhuW_tab{-webkit-appearance:none;appearance:none;cursor:pointer;text-align:left;color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:var(--ku-body,14px);background:0 0;border:0;border-radius:6px;padding:6px 8px}.YqBhuW_tab:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c1f);color:var(--dsw-alias-label-primary,#e8e8ec)}.YqBhuW_tabActive{background:var(--dsw-alias-interactive-bg-active,#80808c2e);color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600}.YqBhuW_panel{flex:auto;min-width:0;max-height:62vh;overflow:auto}.YqBhuW_sections{flex-direction:column;gap:12px;min-width:300px;max-width:420px;display:flex}.YqBhuW_section{flex-direction:column;gap:8px;display:flex}.YqBhuW_sectionTitle{color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:15px;font-weight:600}.YqBhuW_block{flex-direction:column;gap:6px;display:flex}.YqBhuW_head{justify-content:space-between;align-items:center;gap:10px;display:flex}.YqBhuW_rowLabel{font-size:var(--ku-body,14px);color:var(--dsw-alias-label-secondary,#9a9aa6)}.YqBhuW_actions{align-items:center;gap:6px;display:flex}.YqBhuW_currencyBtn{min-width:34px;font-size:var(--ku-body,14px);line-height:1.2}.YqBhuW_value{font-size:var(--ku-sub,13px);color:var(--dsw-alias-label-tertiary,#67676f);word-break:break-all}.YqBhuW_valueWarn{color:var(--dsw-alias-state-warn-primary,#e0a13c)}.YqBhuW_logPane{min-height:44px}.YqBhuW_wrap{flex-direction:column;gap:16px;min-width:300px;max-width:420px;display:flex}.YqBhuW_caliberVersion{color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ku-sub,13px)}.YqBhuW_caliberList{color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:var(--ku-sub,13px);margin:8px 0 0;padding-left:20px;line-height:1.7}.YqBhuW_link{color:var(--dsw-alias-state-business-primary,#5b8cff);text-decoration:none}.YqBhuW_link:hover{text-decoration:underline}";
		const tagId$13 = "dsh-key-usage/settings.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$13) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$13;
			tag.textContent = css$13;
			document.head.appendChild(tag);
		}
		const cssRegistry$13 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$13.some((e) => e.tagId === tagId$13)) cssRegistry$13.push({
			tagId: tagId$13,
			css: css$13
		});
		var settings_module_css_default = {
			"actions": "YqBhuW_actions",
			"block": "YqBhuW_block",
			"caliberList": "YqBhuW_caliberList",
			"caliberVersion": "YqBhuW_caliberVersion",
			"currencyBtn": "YqBhuW_currencyBtn",
			"head": "YqBhuW_head",
			"link": "YqBhuW_link",
			"logPane": "YqBhuW_logPane",
			"panel": "YqBhuW_panel",
			"rowLabel": "YqBhuW_rowLabel",
			"section": "YqBhuW_section",
			"sectionTitle": "YqBhuW_sectionTitle",
			"sections": "YqBhuW_sections",
			"shell": "YqBhuW_shell",
			"tab": "YqBhuW_tab",
			"tabActive": "YqBhuW_tabActive",
			"tabs": "YqBhuW_tabs",
			"value": "YqBhuW_value",
			"valueWarn": "YqBhuW_valueWarn",
			"wrap": "YqBhuW_wrap"
		};
		//#endregion
		//#region src/client/components/SettingsDialog.tsx
		/**
		* 设置：左侧竖排 Tab —— 设置 / 日志 / 口径。
		* 「设置」把显示偏好、价目、关于三块按小节平铺；日志与口径各占一个 Tab。
		* 页面里只留结论；来源与时间放这里，失败原因仍只进系统日志（日志页签内可查）。
		*/
		const PLUGIN_REPO = "https://github.com/xyl886/dsh-key-usage";
		const TAB_KEYS = [
			{
				key: "general",
				labelKey: "settings.tabGeneral"
			},
			{
				key: "log",
				labelKey: "settings.tabLog"
			},
			{
				key: "caliber",
				labelKey: "settings.tabCaliber"
			}
		];
		function SettingsDialog(props) {
			const t = useT();
			const display = useCurrencyDisplay();
			const [tab, setTab] = (0, react.useState)(props.initialTab ?? "general");
			const [fxLoading, setFxLoading] = (0, react.useState)(false);
			const [fxError, setFxError] = (0, react.useState)(null);
			const [refreshing, setRefreshing] = (0, react.useState)(false);
			const [refreshElapsed, setRefreshElapsed] = (0, react.useState)(0);
			const [refreshStatus, setRefreshStatus] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (props.initialTab !== void 0) setTab(props.initialTab);
			}, [props.initialTab]);
			/** 取一次汇率：服务端 12 小时内走缓存，打上游的只有用户点「刷新汇率」那一下；失败时保留已有汇率。 */
			const fetchFx = (0, react.useCallback)(async (force) => {
				setFxLoading(true);
				const result = await loadFxRate(force);
				setFxLoading(false);
				if (result === null) {
					const reason = failureReasonOf("/dsh-key-usage/fx") ?? t("quota.noResponse");
					setFxError(reason);
					logWarn("fx", t("quota.fxUnavailable"), reason + " · /dsh-key-usage/fx");
					return;
				}
				setFxError(null);
				const normalized = normalizeFxRate(result);
				if (normalized === null) {
					setFxError(t("quota.fxBad"));
					logWarn("fx", t("quota.fxUnavailable"), t("quota.fxBad") + " · /dsh-key-usage/fx");
					setFxRate(null);
					return;
				}
				setFxRate(normalized);
				if (force) logInfo("fx", t("quota.refreshFx"), fxSummaryTextOf(normalized));
			}, [t]);
			(0, react.useEffect)(() => {
				fetchFx(false);
			}, [fetchFx]);
			(0, react.useEffect)(() => {
				if (!refreshing) return;
				const timer = setInterval(() => setRefreshElapsed((previous) => Math.min(previous + 1, 20)), 1e3);
				return () => clearInterval(timer);
			}, [refreshing]);
			const fxFallback = display.fx === null ? null : fxFallbackWarningOf(display.fx);
			(0, react.useEffect)(() => {
				if (fxFallback === null) return;
				logWarn("fx", fxFallback, (display.fx?.note ?? "") + " · /dsh-key-usage/fx");
			}, [fxFallback, display.fx?.note]);
			/** 切显示币种：只改展示口径，不重取用量；汇率缺失 / 过期才补取一次。 */
			const switchCurrency = (next) => {
				if (next === display.display) return;
				setDisplayCurrency(next);
				if (display.fx === null || display.fx.stale) fetchFx(false);
			};
			/** 「刷新价目」：唯一会拉上游的写动作；成功后让页面重取 /pricing 与用量。 */
			const refreshPrices = async () => {
				if (refreshing) return;
				setRefreshing(true);
				setRefreshElapsed(0);
				setRefreshStatus(null);
				const outcome = await refreshModelPrices();
				setRefreshing(false);
				if (outcome === null) {
					const reason = failureReasonOf("/dsh-key-usage/pricing/refresh") ?? t("quota.noResponse");
					logError("pricing", t("quota.pricingFailedShort"), reason + " · /dsh-key-usage/pricing/refresh", () => {
						refreshPrices();
					});
					setRefreshStatus({
						tone: "bad",
						text: t("quota.pricingFailedShort")
					});
					return;
				}
				if (!outcome.ok) {
					logError("pricing", t("quota.pricingFailedShort"), outcome.error, () => {
						refreshPrices();
					});
					setRefreshStatus({
						tone: "bad",
						text: t("quota.pricingFailedShort")
					});
					return;
				}
				setRefreshStatus({
					tone: "ok",
					text: modelPriceRefreshTextOf(outcome)
				});
				logInfo("pricing", t("quota.refreshPrices"), modelPriceRefreshTextOf(outcome) + "\n" + outcome.url);
				props.onPricingReload();
			};
			const fxText = display.fx === null ? fxError === null ? fxSummaryTextOf(null) : t("quota.fxUnavailable") : fxFallback ?? fxSummaryTextOf(display.fx);
			const fxWarn = display.fx === null || display.fx.source === "default";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: settings_module_css_default.shell,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: settings_module_css_default.tabs,
					role: "tablist",
					"aria-orientation": "vertical",
					children: TAB_KEYS.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						role: "tab",
						"aria-selected": tab === entry.key,
						className: tab === entry.key ? settings_module_css_default.tab + " " + settings_module_css_default.tabActive : settings_module_css_default.tab,
						onClick: () => setTab(entry.key),
						children: t(entry.labelKey)
					}, entry.key))
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: settings_module_css_default.panel,
					children: [
						tab === "general" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_module_css_default.sections,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									className: settings_module_css_default.section,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: settings_module_css_default.sectionTitle,
											children: t("settings.sectionDisplay")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: settings_module_css_default.block,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: settings_module_css_default.head,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: settings_module_css_default.rowLabel,
													children: t("settings.currency")
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: settings_module_css_default.actions,
													children: DISPLAY_CURRENCIES.map((currency) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
														size: "sm",
														active: display.display === currency,
														className: settings_module_css_default.currencyBtn,
														ariaLabel: currency,
														onClick: () => switchCurrency(currency),
														children: DISPLAY_CURRENCY_SYMBOLS[currency]
													}, currency))
												})]
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: settings_module_css_default.block,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: settings_module_css_default.head,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: settings_module_css_default.rowLabel,
													children: t("settings.fx")
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: settings_module_css_default.actions,
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
														size: "sm",
														disabled: fxLoading,
														"aria-busy": fxLoading,
														title: t("quota.fxCacheHint"),
														onClick: () => void fetchFx(true),
														children: fxLoading ? t("quota.fetchFx") : t("quota.refreshFx")
													})
												})]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: fxWarn ? settings_module_css_default.value + " " + settings_module_css_default.valueWarn : settings_module_css_default.value,
												children: fxText
											})]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									className: settings_module_css_default.section,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: settings_module_css_default.sectionTitle,
										children: t("settings.pricing")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: settings_module_css_default.block,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: settings_module_css_default.actions,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
												size: "sm",
												variant: "primary",
												disabled: refreshing,
												"aria-busy": refreshing,
												onClick: () => void refreshPrices(),
												children: refreshing ? t("action.refreshing") + (refreshElapsed > 0 ? " " + String(refreshElapsed) + "s" : "") : t("quota.refreshPrices")
											})
										}), refreshStatus === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: settings_module_css_default.value,
											children: t("quota.pricingInfoHint")
										}) : refreshStatus.tone === "ok" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: settings_module_css_default.value,
											children: refreshStatus.text
										}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LogHint, {
											text: refreshStatus.text,
											tone: "error"
										})]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									className: settings_module_css_default.section,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: settings_module_css_default.sectionTitle,
											children: t("settings.sectionAbout")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: settings_module_css_default.block,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: settings_module_css_default.head,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: settings_module_css_default.rowLabel,
													children: t("settings.version")
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: settings_module_css_default.value,
													children: "0.2.1"
												})]
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: settings_module_css_default.block,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: settings_module_css_default.head,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: settings_module_css_default.rowLabel,
													children: t("settings.license")
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: settings_module_css_default.value,
													children: t("settings.licenseValue")
												})]
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: settings_module_css_default.block,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: settings_module_css_default.head,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: settings_module_css_default.rowLabel,
													children: t("settings.repo")
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
													className: settings_module_css_default.link,
													href: PLUGIN_REPO,
													target: "_blank",
													rel: "noreferrer",
													children: PLUGIN_REPO.replace(/^https?:\/\//, "")
												})]
											})
										})
									]
								})
							]
						}),
						tab === "log" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: settings_module_css_default.logPane,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LogPanel, {})
						}),
						tab === "caliber" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: settings_module_css_default.wrap,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: settings_module_css_default.caliberVersion,
								children: t("caliber.version", { version: "0.2.1" })
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
								className: settings_module_css_default.caliberList,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("caliber.source", { days: props.todaySource === "session" ? t("caliber.sourceDays", { count: props.sessionDays }) : "" }) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("caliber.cost") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("caliber.costHint") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("caliber.pricingInfo") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("caliber.sessionSource") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("caliber.refresh") })
								]
							})]
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/core/channels.ts
		/** 通道展示工具：颜色、显示名、状态与计费模式文案。 */
		const CHANNEL_COLORS = [
			"var(--dsw-alias-state-business-primary, #5b8cff)",
			"var(--dsw-alias-state-business-tertiary, #9a7bff)",
			"var(--dsw-alias-state-success-primary, #3fb96f)",
			"var(--dsw-alias-state-warn-primary, #e0a13c)",
			"var(--dsw-alias-state-error-primary, #e05a5a)",
			"var(--dsw-alias-state-idle-primary, #38bdc8)"
		];
		function channelIndexOf(channels, provider) {
			return channels.findIndex((channel) => channel.provider === provider);
		}
		function channelColorOf(channels, provider) {
			const index = channelIndexOf(channels, provider);
			return CHANNEL_COLORS[(index >= 0 ? index : 0) % CHANNEL_COLORS.length];
		}
		function displayNameOf(channels, provider) {
			return channels.find((channel) => channel.provider === provider)?.displayName ?? provider;
		}
		function channelOf(channels, provider) {
			if (provider === null) return null;
			return channels.find((channel) => channel.provider === provider) ?? null;
		}
		/** 成本单元格：按计费模式给文案；金额走 `costsByCurrency` 逐币种折算，缺该字段时由 currency.ts 兜底。 */
		function costCellOf(channel, row) {
			const view = rowMoneyViewOf(row);
			const money = view.amount > 0 ? {
				text: view.text,
				dim: false,
				amount: true,
				converted: view.converted,
				mixed: view.mixed
			} : {
				text: "—",
				dim: true,
				amount: false,
				converted: false,
				mixed: false
			};
			if (channel === null) return money;
			if (channel.costMode === "sub") return {
				text: t("ch.inSub"),
				dim: true,
				amount: false,
				converted: false,
				mixed: false
			};
			if (channel.costMode === "free") return {
				text: zeroMoneyTextOf(),
				dim: true,
				amount: false,
				converted: false,
				mixed: false
			};
			if (channel.costMode === "none") return {
				text: t("ch.noBilling"),
				dim: true,
				amount: false,
				converted: false,
				mixed: false
			};
			return money;
		}
		/** 状态点的颜色（走宿主告警/成功令牌）。 */
		function statusColorOf(status) {
			if (status === "ok") return "var(--dsw-alias-state-success-primary, #3fb96f)";
			if (status === "warn") return "var(--dsw-alias-state-warn-primary, #e0a13c)";
			if (status === "danger") return "var(--dsw-alias-state-error-primary, #e05a5a)";
			return "var(--dsw-alias-label-tertiary, #67676f)";
		}
		/** 窗口占用进度条颜色：≥90 危险、≥60 警告，其余正常。 */
		function quotaBarColor(percent) {
			if (percent >= 90) return "var(--dsw-alias-state-error-primary, #e05a5a)";
			if (percent >= 60) return "var(--dsw-alias-state-warn-primary, #e0a13c)";
			return "var(--dsw-alias-state-success-primary, #3fb96f)";
		}
		const COST_MODE_KEYS = {
			sub: "ch.inSub",
			perToken: "ch.metered",
			free: "ch.free",
			none: "ch.noBilling",
			unknown: "ch.notQueried"
		};
		/**
		* 「类型」列用的短标签：与服务端 `costModeLabel` 的中文一一对应（订阅制 / 按量计费 / 免费额度 / 本地端点 / 未查询）。
		* 不能直接用服务端下发的 `costLabel`：那是中文字符串，切英文时不会跟着变。
		*/
		const COST_MODE_TAG_KEYS = {
			sub: "ch.subscription",
			perToken: "ch.metered",
			free: "ch.free",
			none: "ch.local",
			unknown: "ch.notQueried"
		};
		/** 订阅窗口短标签（与服务端 `WINDOW_LABELS` 对应；`window.*` 那组带「窗口」二字，用在下拉与卡片里）。 */
		const WINDOW_TAG_KEYS = {
			"5h": "w.5h",
			week: "w.week",
			month: "w.month",
			day: "w.day"
		};
		//#endregion
		//#region src/client/core/heatmap-axis.ts
		/** 单字符宽度占字号的倍数。宁可估宽：真机字体比估算宽时就会叠字。 */
		function charWidthEm(char) {
			if ((char.codePointAt(0) ?? 0) >= 11904) return 1;
			if (char >= "0" && char <= "9") return .62;
			if (char >= "a" && char <= "z" || char >= "A" && char <= "Z") return .65;
			return .4;
		}
		/** 标签宽度（px，估算值）：只用于判断放不放得下，不参与布局。 */
		function estimateLabelWidthPx(label, fontSizePx) {
			let width = 0;
			for (const char of label) width += charWidthEm(char) * fontSizePx;
			return width;
		}
		/**
		* 计算月份刻度：返回按列升序、互不重叠的标签。
		* `weekDates` 为空或列宽非正时返回空数组（调用方显示无刻度，不抛错）。
		*/
		function buildMonthAxis(options) {
			const columnCount = options.weekDates.length;
			const trackWidthPx = options.columnWidthPx + options.columnGapPx;
			if (columnCount === 0 || !(trackWidthPx > 0) || !(options.fontSizePx > 0)) return [];
			const candidates = [];
			let previousMonthKey = "";
			for (let column = 0; column < columnCount; column += 1) for (const dateKey of options.weekDates[column]) {
				const monthKey = dateKey.slice(0, 7);
				if (monthKey === previousMonthKey) continue;
				previousMonthKey = monthKey;
				candidates.push({
					column,
					year: Number(dateKey.slice(0, 4)),
					month: Number(dateKey.slice(5, 7))
				});
			}
			if (candidates.length === 0) return [];
			const spanOfLabel = (label) => Math.max(1, Math.ceil((estimateLabelWidthPx(label, options.fontSizePx) + options.minGapPx) / trackWidthPx));
			const markOf = (index, withYear) => {
				const candidate = candidates[index];
				const label = options.labelOf(candidate.month, withYear, candidate.year);
				return {
					column: candidate.column,
					label,
					spanColumns: spanOfLabel(label),
					year: candidate.year,
					month: candidate.month,
					withYear
				};
			};
			const fitsRightEdge = (mark) => mark.column + mark.spanColumns <= columnCount;
			const firstYear = candidates[0].year;
			let yearIndex = candidates.findIndex((candidate) => candidate.month === 1 && candidate.year > firstYear);
			let yearMark = yearIndex < 0 ? null : markOf(yearIndex, true);
			if (yearMark !== null && !fitsRightEdge(yearMark) && candidates[0].month === 1) {
				const firstMonthMark = markOf(0, true);
				if (fitsRightEdge(firstMonthMark)) {
					yearIndex = 0;
					yearMark = firstMonthMark;
				}
			}
			if (yearMark !== null && !fitsRightEdge(yearMark)) yearMark = yearMark.spanColumns <= columnCount ? {
				...yearMark,
				column: columnCount - yearMark.spanColumns
			} : null;
			if (yearMark === null) yearIndex = -1;
			const placed = [];
			for (let index = 0; index < candidates.length; index += 1) {
				const withYear = index === yearIndex;
				const mark = withYear && yearMark !== null ? yearMark : markOf(index, withYear);
				if (!fitsRightEdge(mark)) continue;
				while (withYear && placed.length > 0 && mark.column < placed[placed.length - 1].column + placed[placed.length - 1].spanColumns) {
					if (placed[placed.length - 1].withYear) break;
					placed.pop();
				}
				const previous = placed[placed.length - 1];
				if (previous !== void 0 && mark.column < previous.column + previous.spanColumns) continue;
				if (!fitsRightEdge(mark)) continue;
				placed.push(mark);
			}
			return placed;
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/overview.module.css.mjs
		const css$12 = ".tXjxsq_stack{--ov-body:var(--ku-body,14px);--ov-title:var(--ku-title,17px);--ov-kpi:var(--ku-kpi,20px);font-size:var(--ov-body);flex-direction:column;gap:10px;display:flex}.tXjxsq_kpiRow{grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:8px;display:grid}.tXjxsq_kpiCard{border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:9px;flex-direction:column;gap:2px;min-width:0;padding:8px 10px;display:flex}.tXjxsq_kpiLabel{color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ov-body);white-space:nowrap;text-overflow:ellipsis;overflow:hidden}.tXjxsq_kpiValue{font-size:var(--ov-kpi);letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e8e8ec);white-space:nowrap;text-overflow:ellipsis;margin:2px 0;font-weight:700;overflow:hidden}.tXjxsq_kpiUnit{font-size:var(--ov-body);color:var(--dsw-alias-label-tertiary,#67676f);margin-left:1px;font-weight:500}.tXjxsq_kpiDetail{color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ov-body);font-variant-numeric:tabular-nums;flex-wrap:wrap;gap:6px;display:flex}.tXjxsq_rise{color:var(--dsw-alias-state-error-primary,#e05a5a)}.tXjxsq_fall{color:var(--dsw-alias-state-success-primary,#3fb96f)}.tXjxsq_panel{border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:9px;min-width:0;padding:10px 12px}.tXjxsq_panelHead{flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:8px;display:flex}.tXjxsq_panelTitle{font-size:var(--ov-title);color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600}.tXjxsq_panelMore{color:var(--dsw-alias-label-tertiary,#67676f);font-variant-numeric:tabular-nums;white-space:nowrap;margin-left:auto}.tXjxsq_gridTwo{grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:10px;display:grid}.tXjxsq_metricTabs{background:var(--dsw-alias-interactive-bg-hover,#80808c1f);border-radius:8px;flex-wrap:wrap;gap:2px;padding:2px;display:inline-flex}.tXjxsq_metricTab{color:var(--dsw-alias-label-tertiary,#67676f);font:inherit;font-size:var(--ov-body);cursor:pointer;white-space:nowrap;background:0 0;border:0;border-radius:6px;padding:2px 8px}.tXjxsq_metricTab:hover{color:var(--dsw-alias-label-primary,#e8e8ec)}.tXjxsq_metricTabOn{background:var(--dsw-alias-bg-layer-2,#1d1d22);color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600}.tXjxsq_metricTab:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.tXjxsq_yearWrap{grid-template-rows:18px repeat(7,auto);grid-template-columns:26px repeat(53,minmax(0,1fr));gap:3px;display:grid}.tXjxsq_yearWeekday{color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ov-body);justify-content:flex-start;align-items:center;line-height:1;display:flex}.tXjxsq_yearAxisLabel{white-space:nowrap;color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ov-body);place-self:start;line-height:1}.tXjxsq_yearCell{aspect-ratio:1;background:var(--dsw-alias-interactive-bg-active,#80808c38);cursor:default;border-radius:2px;align-self:start}.tXjxsq_yearActive{cursor:pointer}.tXjxsq_yearEmpty{background:var(--dsw-alias-bg-layer-2,#1d1d22);box-shadow:inset 0 0 0 1px var(--dsw-alias-border-l1,#2c2c34)}.tXjxsq_yearFuture{box-shadow:none;background:0 0}.tXjxsq_hist{align-items:flex-end;gap:4px;height:104px;display:flex}.tXjxsq_histColumn{cursor:default;flex:1;align-items:flex-end;min-width:0;height:100%;display:flex}.tXjxsq_histBar{background:var(--dsw-alias-state-business-tertiary,#5b8cff47);border-radius:3px 3px 1px 1px;width:100%}.tXjxsq_histBarPeak{background:var(--dsw-alias-state-business-primary,#5b8cff)}.tXjxsq_histLabels{color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ov-body);font-variant-numeric:tabular-nums;gap:4px;margin-top:4px;display:flex}.tXjxsq_histLabels span{text-align:center;white-space:nowrap;flex:1;min-width:0}.tXjxsq_trendFoot{color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ov-body);flex-wrap:wrap;align-items:center;gap:12px;margin-top:8px;display:flex}.tXjxsq_legend{flex-wrap:wrap;align-items:center;gap:12px;display:inline-flex}.tXjxsq_legendItem{color:var(--dsw-alias-label-tertiary,#67676f);align-items:center;gap:4px;display:inline-flex}.tXjxsq_legendItem i{border-radius:2px;width:8px;height:8px;display:inline-block}.tXjxsq_trendStats{font-variant-numeric:tabular-nums;margin-left:auto}.tXjxsq_rankRow{font-size:var(--ov-body);grid-template-columns:minmax(76px,112px) minmax(0,1fr) 72px 56px;align-items:center;gap:8px;padding:4px 0;display:grid}.tXjxsq_rankName{white-space:nowrap;text-overflow:ellipsis;color:var(--dsw-alias-label-secondary,#9a9aa6);overflow:hidden}.tXjxsq_rankTrack{background:var(--dsw-alias-interactive-bg-hover,#80808c1f);border-radius:4px;height:9px;overflow:hidden}.tXjxsq_rankBar{background:var(--dsw-alias-state-business-tertiary,#5b8cff47);border-radius:4px;height:100%;display:block}.tXjxsq_rankBarTop{background:var(--dsw-alias-state-business-primary,#5b8cff)}.tXjxsq_rankValue{text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9a9aa6);white-space:nowrap}.tXjxsq_rankDim{color:var(--dsw-alias-label-tertiary,#67676f)}.tXjxsq_rankSub{text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary,#67676f);white-space:nowrap}.tXjxsq_hourWrap{grid-template-rows:18px repeat(7,auto);grid-template-columns:26px repeat(24,minmax(0,1fr));gap:3px;display:grid}.tXjxsq_hourWeekday{color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ov-body);justify-content:flex-start;align-items:center;line-height:1;display:flex}.tXjxsq_hourAxisLabel{white-space:nowrap;color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ov-body);place-self:start;line-height:1}.tXjxsq_hourCell{aspect-ratio:1;background:var(--dsw-alias-interactive-bg-hover,#80808c2e);cursor:default;border-radius:2px;align-self:start}.tXjxsq_kpiDetail{white-space:nowrap;text-overflow:ellipsis;overflow:hidden}";
		const tagId$12 = "dsh-key-usage/overview.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$12) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$12;
			tag.textContent = css$12;
			document.head.appendChild(tag);
		}
		const cssRegistry$12 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$12.some((e) => e.tagId === tagId$12)) cssRegistry$12.push({
			tagId: tagId$12,
			css: css$12
		});
		var overview_module_css_default = {
			"fall": "tXjxsq_fall",
			"gridTwo": "tXjxsq_gridTwo",
			"hist": "tXjxsq_hist",
			"histBar": "tXjxsq_histBar",
			"histBarPeak": "tXjxsq_histBarPeak",
			"histColumn": "tXjxsq_histColumn",
			"histLabels": "tXjxsq_histLabels",
			"hourAxisLabel": "tXjxsq_hourAxisLabel",
			"hourCell": "tXjxsq_hourCell",
			"hourWeekday": "tXjxsq_hourWeekday",
			"hourWrap": "tXjxsq_hourWrap",
			"kpiCard": "tXjxsq_kpiCard",
			"kpiDetail": "tXjxsq_kpiDetail",
			"kpiLabel": "tXjxsq_kpiLabel",
			"kpiRow": "tXjxsq_kpiRow",
			"kpiUnit": "tXjxsq_kpiUnit",
			"kpiValue": "tXjxsq_kpiValue",
			"legend": "tXjxsq_legend",
			"legendItem": "tXjxsq_legendItem",
			"metricTab": "tXjxsq_metricTab",
			"metricTabOn": "tXjxsq_metricTabOn",
			"metricTabs": "tXjxsq_metricTabs",
			"panel": "tXjxsq_panel",
			"panelHead": "tXjxsq_panelHead",
			"panelMore": "tXjxsq_panelMore",
			"panelTitle": "tXjxsq_panelTitle",
			"rankBar": "tXjxsq_rankBar",
			"rankBarTop": "tXjxsq_rankBarTop",
			"rankDim": "tXjxsq_rankDim",
			"rankName": "tXjxsq_rankName",
			"rankRow": "tXjxsq_rankRow",
			"rankSub": "tXjxsq_rankSub",
			"rankTrack": "tXjxsq_rankTrack",
			"rankValue": "tXjxsq_rankValue",
			"rise": "tXjxsq_rise",
			"stack": "tXjxsq_stack",
			"trendFoot": "tXjxsq_trendFoot",
			"trendStats": "tXjxsq_trendStats",
			"yearActive": "tXjxsq_yearActive",
			"yearAxisLabel": "tXjxsq_yearAxisLabel",
			"yearCell": "tXjxsq_yearCell",
			"yearEmpty": "tXjxsq_yearEmpty",
			"yearFuture": "tXjxsq_yearFuture",
			"yearWeekday": "tXjxsq_yearWeekday",
			"yearWrap": "tXjxsq_yearWrap"
		};
		//#endregion
		//#region src/client/components/Heatmap.tsx
		/**
		* 全年热力图：53 个 ISO 周（周一起）× 7 天，正方形格子；横轴只在每月首次出现的列标月份，
		* 放不下就跳过该月（列位统一用 grid-column / grid-row 精确定位，不靠 margin / 绝对偏移）。
		* 强度值由调用方给（同一套分档吃任意量纲），本组件只管排格、上色与悬停；点击某天交给调用方。
		*/
		const WEEK_COUNT = 53;
		const DAYS_PER_WEEK = 7;
		/** 周几标签列宽 / 格子列间距 / 横轴字号：与 overview.module.css 的 .yearWrap、.yearAxisLabel 一致（原型 26px / 3px / 正文 13px）。 */
		const WEEKDAY_COLUMN_PX = 26;
		const COLUMN_GAP_PX = 3;
		const AXIS_FONT_SIZE_PX = 13;
		const LABEL_MIN_GAP_PX = 4;
		/** 首帧还没量到面板宽度时的兜底列宽：按窄面板估，宁可少标也不叠字。 */
		const FALLBACK_COLUMN_WIDTH_PX = 8;
		/** 周一到周日的标签键（`h.wd0` 是周日）。 */
		const WEEKDAY_KEYS$1 = [
			"h.wd1",
			"h.wd2",
			"h.wd3",
			"h.wd4",
			"h.wd5",
			"h.wd6",
			"h.wd0"
		];
		/**
		* 六档色阶（浅 → 深），与原型图例「少 → 多」的 6 个色块一致。
		* 用 color-mix 按比例混出深浅：直接写实心色会让后几档变成同一个颜色，层次看不出来；
		* 兜底值给 rgba，color-mix 不可用时仍能显示。
		*/
		const LEVEL_COLORS = [
			"color-mix(in srgb, var(--dsw-alias-state-business-primary, #5b8cff) 14%, transparent)",
			"color-mix(in srgb, var(--dsw-alias-state-business-primary, #5b8cff) 28%, transparent)",
			"color-mix(in srgb, var(--dsw-alias-state-business-primary, #5b8cff) 42%, transparent)",
			"color-mix(in srgb, var(--dsw-alias-state-business-primary, #5b8cff) 58%, transparent)",
			"color-mix(in srgb, var(--dsw-alias-state-business-primary, #5b8cff) 78%, transparent)",
			"var(--dsw-alias-state-business-primary, #5b8cff)"
		];
		/** 档位颜色；0 = 无用量，返回 undefined 由样式表给底色。 */
		function levelColorOf(level) {
			if (level < 1 || level > LEVEL_COLORS.length) return void 0;
			return LEVEL_COLORS[level - 1];
		}
		/** 分档阈值（6 档 = 5 个门槛）：样本足够按分位，否则按峰值比例 —— 任何量纲（tokens / 次数 / 金额）都适用。 */
		function levelThresholds(values) {
			const active = values.filter((value) => Number.isFinite(value) && value > 0).sort((first, second) => first - second);
			if (active.length === 0) return [
				1,
				2,
				3,
				4,
				5
			];
			const peak = active[active.length - 1];
			if (active.length < 6) return [
				.17,
				.33,
				.5,
				.67,
				.83
			].map((fraction) => Math.max(peak * fraction, Number.EPSILON));
			const pick = (fraction) => active[Math.min(active.length - 1, Math.floor(active.length * fraction))];
			return [
				pick(1 / 6),
				pick(2 / 6),
				pick(3 / 6),
				pick(4 / 6),
				pick(5 / 6)
			];
		}
		/** 值 → 档位（0 = 无用量，1..6 = 六档由浅到深）。 */
		function levelOfValue(value, thresholds) {
			if (!Number.isFinite(value) || value <= 0) return 0;
			let level = 1;
			for (const threshold of thresholds) if (value >= threshold) level += 1;
			return Math.min(level, LEVEL_COLORS.length);
		}
		/** 周一 = 1 … 周日 = 7（JS `getDay()` 是周日 = 0）。 */
		function isoWeekdayOf(date) {
			return (date.getDay() + 6) % 7 + 1;
		}
		/** 本地日历加法：不用毫秒，夏令时那天也不会把日期推歪。 */
		function addDays(date, days) {
			const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
			next.setDate(next.getDate() + days);
			return next;
		}
		function YearHeatmap(props) {
			/** 取词：宿主切语言时重渲染 */
			const t = useT();
			const thresholds = levelThresholds([...props.valuesByDate.values()]);
			const today = /* @__PURE__ */ new Date();
			today.setHours(0, 0, 0, 0);
			const todayKey = isoDate(today);
			const windowStart = addDays(addDays(today, DAYS_PER_WEEK - isoWeekdayOf(today)), -370);
			const weekDates = [];
			const columns = [];
			for (let columnIndex = 0; columnIndex < WEEK_COUNT; columnIndex += 1) {
				const dates = [];
				const cells = [];
				for (let weekdayIndex = 0; weekdayIndex < DAYS_PER_WEEK; weekdayIndex += 1) {
					const dateKey = isoDate(addDays(windowStart, columnIndex * DAYS_PER_WEEK + weekdayIndex));
					const value = props.valuesByDate.get(dateKey) ?? 0;
					const state = dateKey > todayKey ? "future" : props.dataStart !== null && dateKey < props.dataStart ? "empty" : value > 0 ? "active" : "idle";
					dates.push(dateKey);
					cells.push({
						date: dateKey,
						state,
						level: state === "active" ? levelOfValue(value, thresholds) : 0
					});
				}
				weekDates.push(dates);
				columns.push(cells);
			}
			const wrapRef = (0, react.useRef)(null);
			const [wrapWidth, setWrapWidth] = (0, react.useState)(0);
			(0, react.useLayoutEffect)(() => {
				const element = wrapRef.current;
				if (element === null) return;
				const measure = () => setWrapWidth(element.getBoundingClientRect().width);
				measure();
				if (typeof ResizeObserver !== "function") return;
				const observer = new ResizeObserver(measure);
				observer.observe(element);
				return () => observer.disconnect();
			}, []);
			const monthAxis = buildMonthAxis({
				weekDates,
				columnWidthPx: wrapWidth > 0 ? Math.max(1, (wrapWidth - WEEKDAY_COLUMN_PX - 159) / WEEK_COUNT) : FALLBACK_COLUMN_WIDTH_PX,
				columnGapPx: COLUMN_GAP_PX,
				fontSizePx: AXIS_FONT_SIZE_PX,
				minGapPx: LABEL_MIN_GAP_PX,
				labelOf: (month, includeYear, year) => includeYear ? t("overview.monthLabelYear", {
					year,
					month
				}) : t("overview.monthLabel", { month })
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: overview_module_css_default.yearWrap,
				role: "group",
				"aria-label": props.ariaLabel,
				ref: wrapRef,
				children: [
					WEEKDAY_KEYS$1.map((key, weekdayIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: overview_module_css_default.yearWeekday,
						style: {
							gridColumn: 1,
							gridRow: weekdayIndex + 2
						},
						children: t(key)
					}, key)),
					monthAxis.map((mark) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: overview_module_css_default.yearAxisLabel,
						style: {
							gridColumn: mark.column + 2,
							gridRow: 1
						},
						children: mark.label
					}, mark.column + "-" + mark.month)),
					columns.map((week, columnIndex) => week.map((cell, weekdayIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: [
							overview_module_css_default.yearCell,
							cell.state === "active" ? overview_module_css_default.yearActive : "",
							cell.state === "empty" ? overview_module_css_default.yearEmpty : "",
							cell.state === "future" ? overview_module_css_default.yearFuture : ""
						].join(" ").trim(),
						style: {
							gridColumn: columnIndex + 2,
							gridRow: weekdayIndex + 2,
							...cell.state === "active" ? { background: levelColorOf(cell.level) } : {}
						},
						onMouseMove: (event) => props.tooltip.show(event, props.tipOf(cell.date)),
						onMouseLeave: props.tooltip.hide,
						onClick: cell.state === "active" ? () => props.onPickDay?.(cell.date) : void 0
					}, cell.date)))
				]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/detail.module.css.mjs
		const css$11 = "._91PKKq_page{--detail-body:var(--ku-body,14px);--detail-title:var(--ku-title,17px);font-size:var(--detail-body);flex-direction:column;gap:10px;display:flex}._91PKKq_panel{border:1px solid var(--dsw-alias-border-l1,#2c2c34);box-sizing:border-box;border-radius:9px;min-width:0;padding:10px 12px}._91PKKq_panelHead{flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:8px;display:flex}._91PKKq_panelTitle{font-size:var(--detail-title);color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600}._91PKKq_panelMore{color:var(--dsw-alias-label-tertiary,#67676f);font-variant-numeric:tabular-nums;white-space:nowrap;margin-left:auto}._91PKKq_metricTabs{background:var(--dsw-alias-interactive-bg-hover,#80808c1f);border-radius:8px;flex-wrap:wrap;gap:2px;padding:2px;display:inline-flex}._91PKKq_metricTab{color:var(--dsw-alias-label-tertiary,#67676f);font:inherit;font-size:var(--detail-body);cursor:pointer;white-space:nowrap;background:0 0;border:0;border-radius:6px;padding:2px 8px}._91PKKq_metricTab:hover{color:var(--dsw-alias-label-primary,#e8e8ec)}._91PKKq_metricTabOn{background:var(--dsw-alias-bg-layer-2,#1d1d22);color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600}._91PKKq_metricTab:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}._91PKKq_costBars{align-items:flex-end;gap:4px;height:104px;display:flex}._91PKKq_costBarsDense{gap:1px}._91PKKq_costBarCol{cursor:default;border-radius:3px;flex:1;align-items:flex-end;min-width:0;height:100%;display:flex}._91PKKq_costBarCol:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c14)}._91PKKq_costBar{background:var(--dsw-alias-state-business-tertiary,#5b8cff59);border-radius:3px 3px 1px 1px;width:100%}._91PKKq_costBarPeak{background:var(--dsw-alias-state-business-primary,#5b8cff);border-radius:3px 3px 1px 1px;width:100%}._91PKKq_costAxis{color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--detail-body);font-variant-numeric:tabular-nums;justify-content:space-between;gap:4px;margin-top:4px;display:flex}._91PKKq_costAxis span{text-align:center;white-space:nowrap;flex:1}._91PKKq_tableScroll{overflow-x:auto}._91PKKq_detailTable{border-collapse:collapse;font-variant-numeric:tabular-nums;width:100%;font-size:var(--detail-body)}._91PKKq_detailTable th{color:var(--dsw-alias-label-tertiary,#67676f);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);white-space:nowrap;padding:4px 8px;font-weight:500}._91PKKq_detailTable td{color:var(--dsw-alias-label-secondary,#9a9aa6);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);white-space:nowrap;padding:4px 8px}._91PKKq_detailTable ._91PKKq_alignLeft{text-align:left}._91PKKq_detailTable ._91PKKq_alignRight{text-align:right}._91PKKq_detailTable ._91PKKq_costCell{color:var(--dsw-alias-label-primary,#e8e8ec)}._91PKKq_detailTable tr._91PKKq_totalRow td{border-top:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-primary,#e8e8ec);border-bottom:0;font-weight:600}._91PKKq_deltaUp{color:var(--dsw-alias-state-error-primary,#e05a5a)}._91PKKq_deltaDown{color:var(--dsw-alias-state-success-primary,#3fb96f)}._91PKKq_deltaFlat{color:var(--dsw-alias-label-tertiary,#67676f)}._91PKKq_sortBtn{color:inherit;font:inherit;font-weight:inherit;cursor:pointer;background:0 0;border:0;align-items:center;gap:3px;padding:0;display:inline-flex}._91PKKq_sortBtn:hover{color:var(--dsw-alias-label-primary,#e8e8ec)}._91PKKq_sortBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px;border-radius:4px}._91PKKq_sortDir{color:var(--dsw-alias-state-business-primary,#5b8cff)}._91PKKq_expandBtn{width:16px;height:16px;color:var(--dsw-alias-label-tertiary,#67676f);font:inherit;cursor:pointer;background:0 0;border:0;border-radius:3px;justify-content:center;align-items:center;padding:0;line-height:1;display:inline-flex}._91PKKq_expandBtn:hover{color:var(--dsw-alias-label-primary,#e8e8ec);background:var(--dsw-alias-interactive-bg-hover,#80808c1a)}._91PKKq_expandBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:1px}._91PKKq_expandSpacer{width:16px;display:inline-block}._91PKKq_detailTable td._91PKKq_subCell{background:var(--dsw-alias-interactive-bg-hover,#80808c0a);padding:2px 8px 8px 28px}._91PKKq_subTable{border-collapse:collapse;width:100%}._91PKKq_subTable th{text-align:right;color:var(--dsw-alias-label-tertiary,#67676f);padding:2px 8px;font-size:13px;font-weight:500}._91PKKq_subTable td{text-align:right;color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:var(--detail-body);font-variant-numeric:tabular-nums;padding:2px 8px}._91PKKq_subTable th._91PKKq_alignLeft,._91PKKq_subTable td._91PKKq_alignLeft{text-align:left}";
		const tagId$11 = "dsh-key-usage/detail.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$11) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$11;
			tag.textContent = css$11;
			document.head.appendChild(tag);
		}
		const cssRegistry$11 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$11.some((e) => e.tagId === tagId$11)) cssRegistry$11.push({
			tagId: tagId$11,
			css: css$11
		});
		var detail_module_css_default = {
			"alignLeft": "_91PKKq_alignLeft",
			"alignRight": "_91PKKq_alignRight",
			"costAxis": "_91PKKq_costAxis",
			"costBar": "_91PKKq_costBar",
			"costBarCol": "_91PKKq_costBarCol",
			"costBarPeak": "_91PKKq_costBarPeak",
			"costBars": "_91PKKq_costBars",
			"costBarsDense": "_91PKKq_costBarsDense",
			"costCell": "_91PKKq_costCell",
			"deltaDown": "_91PKKq_deltaDown",
			"deltaFlat": "_91PKKq_deltaFlat",
			"deltaUp": "_91PKKq_deltaUp",
			"detailTable": "_91PKKq_detailTable",
			"expandBtn": "_91PKKq_expandBtn",
			"expandSpacer": "_91PKKq_expandSpacer",
			"metricTab": "_91PKKq_metricTab",
			"metricTabOn": "_91PKKq_metricTabOn",
			"metricTabs": "_91PKKq_metricTabs",
			"page": "_91PKKq_page",
			"panel": "_91PKKq_panel",
			"panelHead": "_91PKKq_panelHead",
			"panelMore": "_91PKKq_panelMore",
			"panelTitle": "_91PKKq_panelTitle",
			"sortBtn": "_91PKKq_sortBtn",
			"sortDir": "_91PKKq_sortDir",
			"subCell": "_91PKKq_subCell",
			"subTable": "_91PKKq_subTable",
			"tableScroll": "_91PKKq_tableScroll",
			"totalRow": "_91PKKq_totalRow"
		};
		//#endregion
		//#region src/client/tabs/DetailTab.tsx
		/**
		* 使用明细：每日成本柱状图（费用 · Token · 输出 Token · 会话）
		* + 逐日明细表（按天 / 按通道 / 按模型，列可排序、行可展开模型明细、带环比）。
		* 两张面板的数据都来自同一份 `/usage`，维度聚合与环比全在客户端算；
		* 范围、通道筛选与导出统一由页头承担，本组件不再重复一份。
		*/
		/** 图表最多铺开的列数：超过这个跨度的范围按天全画会挤成一团。 */
		const MAX_AXIS_DAYS = 366;
		/** 柱状图底下最多标几个日期（原型是 8 个等距刻度，逐柱都标会糊成一片）。 */
		const AXIS_LABEL_COUNT = 8;
		const DAY_MS = 864e5;
		const METRIC_ORDER = [
			"cost",
			"tokens",
			"output",
			"sessions"
		];
		const METRIC_LABEL_KEYS = {
			cost: "detail.metricCost",
			tokens: "detail.metricTokens",
			output: "detail.metricOutput",
			sessions: "detail.metricSessions"
		};
		const DIMENSIONS = [
			["day", "detail.byDay"],
			["channel", "detail.byChannel"],
			["model", "detail.byModel"]
		];
		/** 表头（原型顺序）；第一列是展开箭头，没有表头文案。 */
		const SORT_COLUMNS = [
			["date", "c.date"],
			["label", "common.channel"],
			["calls", "c.calls"],
			["input", "c.input"],
			["output", "c.output"],
			["cacheRead", "c.cacheRead"],
			["cost", "c.cost"],
			["delta", "detail.delta"],
			["source", "detail.source"]
		];
		/** 右对齐的列：数字与来源。 */
		const RIGHT_ALIGNED = /* @__PURE__ */ new Set([
			"calls",
			"input",
			"output",
			"cacheRead",
			"cost",
			"delta",
			"source"
		]);
		/** 成本来源强弱：聚合行取最弱的那一格（与价目层的强弱序一致）。 */
		const SOURCE_ORDER$1 = {
			official: 0,
			catalog: 1,
			aggregate: 2,
			model: 3,
			none: 4
		};
		function daysBetween(from, to) {
			const fromTime = (/* @__PURE__ */ new Date(from + "T00:00:00")).getTime();
			const toTime = (/* @__PURE__ */ new Date(to + "T00:00:00")).getTime();
			return Math.max(1, Math.round((toTime - fromTime) / DAY_MS) + 1);
		}
		/** 范围内每一天的日期键（无数据的日子也要出现在横轴上，空档才看得出来）；超长范围只画最近的那些天。 */
		function dateKeysOfRange(from, to) {
			const end = (/* @__PURE__ */ new Date(to + "T00:00:00")).getTime();
			const total = Math.min(daysBetween(from, to), MAX_AXIS_DAYS);
			const start = end - (total - 1) * DAY_MS;
			const keys = [];
			for (let offset = 0; offset < total; offset += 1) keys.push(isoDate(new Date(start + offset * DAY_MS)));
			return keys;
		}
		/** 前一个日历日。 */
		function previousDateOf(date) {
			return isoDate(/* @__PURE__ */ new Date((/* @__PURE__ */ new Date(date + "T00:00:00")).getTime() - DAY_MS));
		}
		/** 上一段等长范围（10-07~10-13 → 09-30~10-06）。 */
		function previousWindowOf(from, to) {
			const startTime = (/* @__PURE__ */ new Date(from + "T00:00:00")).getTime();
			const span = Math.min(daysBetween(from, to), MAX_AXIS_DAYS);
			return {
				from: isoDate(/* @__PURE__ */ new Date(startTime - span * DAY_MS)),
				to: isoDate(/* @__PURE__ */ new Date(startTime - DAY_MS))
			};
		}
		/**
		* 合计行的上一期：与统计卡同一口径（按上一段等长范围再取一次 `/usage`，纯客户端，无新端点）。
		* 通道 / 模型筛选都在客户端做，所以这里固定取全量（传 `'ALL'`），否则环比会拿「过滤后本期」比「全量上期」。
		* 只用于算一个百分比，取不到就保持 null（界面显示 —），不影响表格本身。
		*/
		function usePreviousUsage(props) {
			const [previous, setPrevious] = (0, react.useState)(null);
			const comparable = props.range !== "total";
			(0, react.useEffect)(() => {
				if (!comparable) return;
				const window = previousWindowOf(props.from, props.to);
				let cancelled = false;
				setPrevious(null);
				loadUsage(window.from, window.to, "ALL").then((result) => {
					if (!cancelled) setPrevious(result);
				});
				return () => {
					cancelled = true;
				};
			}, [
				comparable,
				props.from,
				props.to,
				props.pricingRevision
			]);
			return comparable ? previous : null;
		}
		function moneyRowOf(row) {
			const costsByCurrency = {};
			for (const [currency, amount] of Object.entries(row.costsByCurrency ?? {})) if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) costsByCurrency[currency] = amount;
			return {
				cost: typeof row.cost === "number" && Number.isFinite(row.cost) ? row.cost : 0,
				costsByCurrency
			};
		}
		function addMoneyInto(target, source) {
			target.cost += source.cost;
			for (const [currency, amount] of Object.entries(source.costsByCurrency)) target.costsByCurrency[currency] = (target.costsByCurrency[currency] ?? 0) + amount;
		}
		/** 金额文本：没有价目依据（`none`）或金额为 0 时给 —，不拿 0 元冒充「免费」。 */
		function costTextOf$1(row, source) {
			if (source === "none") return "—";
			const view = rowMoneyViewOf(row);
			return view.amount > 0 ? view.text : "—";
		}
		/** 聚合行取最弱的成本来源。 */
		function weakSourceOf(sources) {
			let weakest = null;
			for (const source of sources) if (weakest === null || SOURCE_ORDER$1[source] > SOURCE_ORDER$1[weakest]) weakest = source;
			return weakest;
		}
		/** 把若干模型桶并成一天：调用 / tokens 相加，金额按逐币种小计合并，来源取最弱那一格。 */
		function mergedDayOf(models, date, provider) {
			const costsByCurrency = {};
			const sources = [];
			let calls = 0;
			let inputTokens = 0;
			let outputTokens = 0;
			let cacheReadTokens = 0;
			let cacheWriteTokens = 0;
			let reasoningTokens = 0;
			let cost = 0;
			let partial = false;
			for (const model of models) {
				calls += model.calls;
				inputTokens += model.inputTokens;
				outputTokens += model.outputTokens;
				cacheReadTokens += model.cacheReadTokens;
				cacheWriteTokens += model.cacheWriteTokens;
				reasoningTokens += model.reasoningTokens;
				if (typeof model.cost === "number" && Number.isFinite(model.cost)) cost += model.cost;
				for (const [currency, amount] of Object.entries(model.costsByCurrency ?? {})) if (typeof amount === "number" && Number.isFinite(amount)) costsByCurrency[currency] = (costsByCurrency[currency] ?? 0) + amount;
				if (model.costSource !== void 0) sources.push(model.costSource);
				if (model.partial === true) partial = true;
			}
			const costSource = weakSourceOf(sources);
			return {
				date,
				provider,
				calls,
				inputTokens,
				outputTokens,
				cacheReadTokens,
				cacheWriteTokens,
				reasoningTokens,
				cost,
				models,
				...Object.keys(costsByCurrency).length > 0 ? { costsByCurrency } : {},
				...costSource === null ? {} : { costSource },
				...partial ? { partial: true } : {}
			};
		}
		/** 范围合计：由过滤后的逐日行相加；`cacheSaved` 无法从模型桶反推，不给（界面显示 —，不编）。 */
		function totalsOfDays(days, date) {
			const costsByCurrency = {};
			const sources = [];
			let calls = 0;
			let inputTokens = 0;
			let outputTokens = 0;
			let cacheReadTokens = 0;
			let cacheWriteTokens = 0;
			let reasoningTokens = 0;
			let cost = 0;
			let partial = false;
			for (const day of days) {
				calls += day.calls;
				inputTokens += day.inputTokens;
				outputTokens += day.outputTokens;
				cacheReadTokens += day.cacheReadTokens;
				cacheWriteTokens += day.cacheWriteTokens;
				reasoningTokens += day.reasoningTokens;
				cost += day.cost;
				for (const [currency, amount] of Object.entries(day.costsByCurrency ?? {})) if (typeof amount === "number" && Number.isFinite(amount)) costsByCurrency[currency] = (costsByCurrency[currency] ?? 0) + amount;
				if (day.costSource !== void 0) sources.push(day.costSource);
				if (day.partial === true) partial = true;
			}
			const costSource = weakSourceOf(sources);
			return {
				date,
				calls,
				inputTokens,
				outputTokens,
				cacheReadTokens,
				cacheWriteTokens,
				reasoningTokens,
				cost,
				...Object.keys(costsByCurrency).length > 0 ? { costsByCurrency } : {},
				...costSource === null ? {} : { costSource },
				...partial ? { partial: true } : {}
			};
		}
		/** 多选筛选里「未归入工作区」项目的值：空串被 `selectionOf` 当成「全部」，所以用固定 sentinel 表示。 */
		const ORPHAN_PROJECT_VALUE = "__orphan__";
		/**
		* 项目筛选的取值集合：未归入工作区的行（`workspace` 为空）用 sentinel，其余用 workspace + 覆盖目录。
		* 通道 / 模型 / 会话三个 Tab 都用它，保证同一个项目在各处命中同一批行。
		*/
		function projectFilterValuesOf(workspace, paths) {
			return [workspace === void 0 || workspace === null || workspace === "" ? ORPHAN_PROJECT_VALUE : workspace, ...paths ?? []];
		}
		/**
		* 按维度过滤 `/usage`：逐日只留命中的模型桶，当天合计与范围合计都按剩下的桶重算（口径一致）。
		* `hours`（按时段）没有模型 / 通道维度，保持原样、不二次聚合。
		*/
		function filterUsageOf(usage, keep) {
			const raw = usage ?? null;
			if (raw === null) return null;
			const days = [];
			for (const day of raw.days) {
				const models = day.models.filter(keep);
				if (models.length === 0) continue;
				days.push(mergedDayOf(models, day.date, day.provider));
			}
			return {
				...raw,
				days,
				totals: days.length === 0 ? null : totalsOfDays(days, raw.totals?.date ?? "")
			};
		}
		/**
		* 按通道多选过滤（值存逗号分隔串，空串 = 全部；通道维度只在模型桶的 `provider` 上）。
		* 页头把整段选中的通道一起下发，服务端 `/usage` 固定取全量，过滤在客户端做。
		*/
		function filterUsageByChannels(usage, channelFilter) {
			const raw = usage ?? null;
			const selected = selectionOf(channelFilter);
			if (raw === null || selected.length === 0) return raw;
			return filterUsageOf(raw, (model) => selected.includes(model.provider));
		}
		/** 按模型多选过滤（值同上）；多个模型先合并回逐日行再算，合计 / 图表 / 环比一起重算。 */
		function filterUsageByModel(usage, modelFilter) {
			const raw = usage ?? null;
			const selected = selectionOf(modelFilter);
			if (raw === null || selected.length === 0) return raw;
			return filterUsageOf(raw, (model) => selected.includes(model.model));
		}
		/** 环比百分比（一位小数）；缺一侧或上期为 0 时不给数字。 */
		function deltaOf(current, previous) {
			if (current === null || previous === null || previous === 0) return null;
			return Math.round((current - previous) / previous * 1e3) / 10;
		}
		/** 环比单元格：涨红跌绿，无上期数据给 —。 */
		function deltaCellOf(delta) {
			if (delta === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: detail_module_css_default.deltaFlat,
				children: "—"
			});
			if (Math.abs(delta) < .05) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: detail_module_css_default.deltaFlat,
				children: "0%"
			});
			const text = (delta > 0 ? "+" : "") + String(delta) + "%";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: delta > 0 ? detail_module_css_default.deltaUp : detail_module_css_default.deltaDown,
				children: text
			});
		}
		function itemKeyOf(model, dimension) {
			return dimension === "model" ? model.provider + "|" + model.model : model.provider;
		}
		function buildDetailRows(props) {
			const { usage, channels, dimension } = props;
			const rows = [];
			const dayMoney = /* @__PURE__ */ new Map();
			for (const day of usage.days) dayMoney.set(day.date, moneyRowOf(day));
			const itemMoney = /* @__PURE__ */ new Map();
			if (dimension !== "day") for (const day of usage.days) for (const model of day.models) {
				const itemKey = itemKeyOf(model, dimension);
				let byDate = itemMoney.get(itemKey);
				if (byDate === void 0) {
					byDate = /* @__PURE__ */ new Map();
					itemMoney.set(itemKey, byDate);
				}
				const bucket = byDate.get(day.date) ?? {
					cost: 0,
					costsByCurrency: {}
				};
				addMoneyInto(bucket, moneyRowOf(model));
				byDate.set(day.date, bucket);
			}
			if (dimension === "day") {
				for (const day of usage.days) {
					const tokensByProvider = /* @__PURE__ */ new Map();
					for (const model of day.models) {
						const tokens = model.inputTokens + model.outputTokens + model.cacheReadTokens;
						tokensByProvider.set(model.provider, (tokensByProvider.get(model.provider) ?? 0) + tokens);
					}
					let dominant = null;
					let dominantTokens = -1;
					for (const [provider, tokens] of tokensByProvider) if (tokens > dominantTokens) {
						dominant = provider;
						dominantTokens = tokens;
					}
					const previous = dayMoney.get(previousDateOf(day.date)) ?? null;
					const amount = comparableMoneyOf(day);
					const costText = costTextOf$1(day, day.costSource ?? null);
					rows.push({
						key: "day|" + day.date,
						date: day.date,
						label: dominant === null ? "—" : displayNameOf(channels, dominant),
						labelDim: tokensByProvider.size > 1 ? "+" + String(tokensByProvider.size - 1) : null,
						calls: day.calls,
						input: day.inputTokens,
						output: day.outputTokens,
						cacheRead: day.cacheReadTokens,
						costText,
						costAmount: amount,
						delta: costText === "—" ? null : deltaOf(amount, previous === null ? null : comparableMoneyOf(previous)),
						source: day.costSource ?? null,
						models: day.models
					});
				}
				return rows;
			}
			for (const day of usage.days) {
				const groups = /* @__PURE__ */ new Map();
				for (const model of day.models) {
					const itemKey = itemKeyOf(model, dimension);
					let group = groups.get(itemKey);
					if (group === void 0) {
						group = {
							itemKey,
							label: dimension === "channel" ? displayNameOf(channels, model.provider) : model.model,
							labelDim: dimension === "channel" ? null : displayNameOf(channels, model.provider),
							calls: 0,
							input: 0,
							output: 0,
							cacheRead: 0,
							money: {
								cost: 0,
								costsByCurrency: {}
							},
							sources: [],
							models: []
						};
						groups.set(itemKey, group);
					}
					group.calls += model.calls;
					group.input += model.inputTokens;
					group.output += model.outputTokens;
					group.cacheRead += model.cacheReadTokens;
					addMoneyInto(group.money, moneyRowOf(model));
					if (model.costSource !== void 0) group.sources.push(model.costSource);
					if (dimension === "channel") group.models.push(model);
				}
				for (const group of groups.values()) {
					const source = weakSourceOf(group.sources);
					const previous = itemMoney.get(group.itemKey)?.get(previousDateOf(day.date)) ?? null;
					const amount = comparableMoneyOf(group.money);
					const costText = costTextOf$1(group.money, source);
					rows.push({
						key: dimension + "|" + day.date + "|" + group.itemKey,
						date: day.date,
						label: group.label,
						labelDim: group.labelDim,
						calls: group.calls,
						input: group.input,
						output: group.output,
						cacheRead: group.cacheRead,
						costText,
						costAmount: amount,
						delta: costText === "—" ? null : deltaOf(amount, previous === null ? null : comparableMoneyOf(previous)),
						source,
						models: group.models
					});
				}
			}
			return rows;
		}
		function sortValueOf(row, sortKey) {
			if (sortKey === "date") return row.date;
			if (sortKey === "label") return row.label;
			if (sortKey === "calls") return row.calls;
			if (sortKey === "input") return row.input;
			if (sortKey === "output") return row.output;
			if (sortKey === "cacheRead") return row.cacheRead;
			if (sortKey === "cost") return row.costAmount;
			if (sortKey === "delta") return row.delta;
			return row.source === null ? null : SOURCE_ORDER$1[row.source];
		}
		/** 排序：无值（没价目 / 没上期）永远排最后，不跟方向翻转；同值时按日期倒序。 */
		function sortDetailRows(rows, sortKey, direction) {
			const sign = direction === "asc" ? 1 : -1;
			return [...rows].sort((first, second) => {
				const left = sortValueOf(first, sortKey);
				const right = sortValueOf(second, sortKey);
				if (left === null || right === null) {
					if (left === right) return 0;
					return left === null ? 1 : -1;
				}
				const base = typeof left === "string" ? left.localeCompare(String(right)) : left - right;
				if (base !== 0) return base * sign;
				return second.date.localeCompare(first.date);
			});
		}
		function metricValueOf$1(day, metric) {
			if (metric === "tokens") return day.inputTokens + day.outputTokens + day.cacheReadTokens;
			if (metric === "output") return day.outputTokens;
			if (metric === "cost") return comparableMoneyOf(day) ?? 0;
			return 0;
		}
		function metricTextOf$1(day, metric) {
			if (metric === "cost") return costTextOf$1(day, day.costSource ?? null);
			if (metric === "tokens") return fmtTokens(day.inputTokens + day.outputTokens + day.cacheReadTokens);
			if (metric === "output") return fmtTokens(day.outputTokens);
			return "—";
		}
		function buildDailyBars(props) {
			const byDate = new Map(props.usage.days.map((day) => [day.date, day]));
			const raw = dateKeysOfRange(props.from, props.to).map((date) => {
				const day = byDate.get(date) ?? null;
				return {
					date,
					value: day === null ? 0 : metricValueOf$1(day, props.metric),
					text: day === null ? "—" : metricTextOf$1(day, props.metric)
				};
			});
			let peak = 0;
			for (const item of raw) if (item.value > peak) peak = item.value;
			return raw.map((item) => ({
				date: item.date,
				short: fmtShortDate(item.date),
				value: item.value,
				height: peak > 0 ? String(Math.max(1, Math.round(item.value / peak * 100))) + "%" : "0%",
				peak: peak > 0 && item.value === peak,
				text: item.text
			}));
		}
		/** 横轴刻度：固定 `AXIS_LABEL_COUNT` 个等距日期（首尾都含）；跨度不足这个数时逐根标。 */
		function axisTicksOf(bars) {
			if (bars.length <= AXIS_LABEL_COUNT) return bars;
			const step = (bars.length - 1) / 7;
			return Array.from({ length: AXIS_LABEL_COUNT }, (unused, index) => bars[Math.round(index * step)]);
		}
		function DetailTab(props) {
			/** 取词：宿主切语言时重渲染 */
			const t = useT();
			const { usage, channels, bounds, tooltip } = props;
			const modelFilter = props.modelFilter ?? "";
			const currency = useCurrencyDisplay();
			const [metric, setMetric] = (0, react.useState)("cost");
			const [dimension, setDimension] = (0, react.useState)("day");
			const [sortKey, setSortKey] = (0, react.useState)("cost");
			const [sortDirection, setSortDirection] = (0, react.useState)("desc");
			const [expanded, setExpanded] = (0, react.useState)({});
			const previousUsage = usePreviousUsage({
				from: bounds.from,
				to: bounds.to,
				range: props.range,
				pricingRevision: props.pricingRevision
			});
			/** 模型筛选后的本期 / 上期 `/usage`：两张面板、合计、环比全部从它算，保证口径一致。
			*  本期已由页头按通道多选过滤；上期是本 Tab 自己取的（服务端固定取全量），必须在这里补一次通道过滤。 */
			const scopedUsage = (0, react.useMemo)(() => filterUsageByModel(usage, modelFilter), [usage, modelFilter]);
			const scopedPrevious = (0, react.useMemo)(() => filterUsageByModel(filterUsageByChannels(previousUsage, props.channelFilter), modelFilter), [
				previousUsage,
				props.channelFilter,
				modelFilter
			]);
			/** 显示币种或汇率一变，金额文本就得重算（模块级状态变了，memo 自己发现不了）。 */
			const moneyKey = currency.display + "|" + (currency.fx === null ? "" : String(currency.fx.rate));
			const rows = (0, react.useMemo)(() => scopedUsage === null ? [] : buildDetailRows({
				usage: scopedUsage,
				channels,
				dimension
			}), [
				scopedUsage,
				channels,
				dimension,
				moneyKey
			]);
			const sortedRows = (0, react.useMemo)(() => sortDetailRows(rows, sortKey, sortDirection), [
				rows,
				sortKey,
				sortDirection
			]);
			const bars = (0, react.useMemo)(() => scopedUsage === null || metric === "sessions" ? [] : buildDailyBars({
				usage: scopedUsage,
				from: bounds.from,
				to: bounds.to,
				metric
			}), [
				scopedUsage,
				metric,
				bounds.from,
				bounds.to,
				moneyKey
			]);
			if (scopedUsage === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shared_module_css_default.empty,
				children: t("d.ledgerLoading")
			});
			const safeTotals = scopedUsage.totals ?? {
				date: "",
				calls: 0,
				inputTokens: 0,
				outputTokens: 0,
				cacheReadTokens: 0,
				cacheWriteTokens: 0,
				reasoningTokens: 0,
				cost: 0
			};
			const totalTokens = safeTotals.inputTokens + safeTotals.outputTokens + safeTotals.cacheReadTokens;
			/** 日均分母：有数据的天（拿日历天数去除会把空闲日算成用量偏低）。 */
			const activeDays = scopedUsage.days.length;
			const totalCostText = safeTotals.cost > 0 ? rowMoneyViewOf(safeTotals).text + ((safeTotals.costSource ?? null) === "none" ? " · " + t("detail.partialCost") : "") : costTextOf$1(safeTotals, safeTotals.costSource ?? null);
			const totalAmount = comparableMoneyOf(safeTotals);
			const previousTotal = scopedPrevious === null ? null : scopedPrevious.totals;
			const totalDelta = totalCostText === "—" || previousTotal === null || previousTotal === void 0 ? null : deltaOf(totalAmount, comparableMoneyOf(previousTotal));
			const summaryText = (() => {
				if (metric === "sessions") return "—";
				const totalText = metric === "cost" ? totalCostText : metric === "tokens" ? fmtTokens(totalTokens) : fmtTokens(safeTotals.outputTokens);
				let averageText = "—";
				if (activeDays > 0) {
					if (metric === "cost") {
						const view = rowMoneyViewOf(safeTotals);
						if (!view.mixed && view.currency !== "" && view.amount > 0) averageText = (view.converted ? "≈" : "") + moneyTextOf(view.currency, view.amount / activeDays);
					} else {
						const total = metric === "tokens" ? totalTokens : safeTotals.outputTokens;
						averageText = fmtTokens(Math.round(total / activeDays));
					}
				}
				let peakBar = null;
				for (const bar of bars) if (bar.value > 0 && (peakBar === null || bar.value > peakBar.value)) peakBar = bar;
				return [
					t("detail.total") + " " + totalText,
					t("detail.dailyAvg") + " " + averageText,
					t("detail.peak") + " " + (peakBar === null ? "—" : fmtShortDate(peakBar.date))
				].join(" · ");
			})();
			const axisTicks = axisTicksOf(bars);
			const totalChannels = /* @__PURE__ */ new Set();
			const totalModels = /* @__PURE__ */ new Set();
			for (const day of scopedUsage.days) for (const model of day.models) {
				totalChannels.add(model.provider);
				totalModels.add(model.provider + "|" + model.model);
			}
			const groupCount = dimension === "model" ? totalModels.size : totalChannels.size;
			const toggleSort = (key) => {
				if (sortKey === key) {
					setSortDirection(sortDirection === "asc" ? "desc" : "asc");
					return;
				}
				setSortKey(key);
				setSortDirection(key === "label" ? "asc" : "desc");
			};
			const toggleExpanded = (key) => {
				setExpanded((previous) => ({
					...previous,
					[key]: previous[key] !== true
				}));
			};
			const pinOf = (node) => {
				const box = (node?.parentElement ?? node)?.getBoundingClientRect();
				return box === void 0 ? void 0 : {
					right: box.right - 4,
					top: box.top + 4
				};
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: detail_module_css_default.page,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: detail_module_css_default.panel,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: detail_module_css_default.panelHead,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: detail_module_css_default.panelTitle,
								children: t("detail.dailyCost")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: detail_module_css_default.metricTabs,
								children: METRIC_ORDER.map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: metric === key ? detail_module_css_default.metricTab + " " + detail_module_css_default.metricTabOn : detail_module_css_default.metricTab,
									"aria-pressed": metric === key,
									onClick: () => setMetric(key),
									children: t(METRIC_LABEL_KEYS[key])
								}, key))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: detail_module_css_default.panelMore,
								children: summaryText
							})
						]
					}), metric === "sessions" || scopedUsage.days.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shared_module_css_default.empty,
						children: metric === "sessions" ? "—" : t("empty.noUsage")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: bars.length > 60 ? detail_module_css_default.costBars + " " + detail_module_css_default.costBarsDense : detail_module_css_default.costBars,
						role: "img",
						"aria-label": t("detail.barsAria", {
							metric: t(METRIC_LABEL_KEYS[metric]),
							count: bars.length
						}),
						children: bars.map((bar) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: detail_module_css_default.costBarCol,
							onMouseMove: bar.value > 0 ? (event) => tooltip.show(event, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: bar.date }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(TipSub, { children: [
								t(METRIC_LABEL_KEYS[metric]),
								" ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: bar.text })
							] })] }), pinOf(event.currentTarget)) : void 0,
							onMouseLeave: tooltip.hide,
							children: bar.value > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: bar.peak ? detail_module_css_default.costBarPeak : detail_module_css_default.costBar,
								style: { height: bar.height }
							})
						}, bar.date))
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: detail_module_css_default.costAxis,
						"aria-hidden": "true",
						children: axisTicks.map((bar) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: bar.short }, bar.date))
					})] })]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: detail_module_css_default.panel,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: detail_module_css_default.panelHead,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: detail_module_css_default.panelTitle,
								children: t("detail.dailyDetail")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: detail_module_css_default.metricTabs,
								children: DIMENSIONS.map(([key, labelKey]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: dimension === key ? detail_module_css_default.metricTab + " " + detail_module_css_default.metricTabOn : detail_module_css_default.metricTab,
									"aria-pressed": dimension === key,
									onClick: () => setDimension(key),
									children: t(labelKey)
								}, key))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: detail_module_css_default.panelMore,
								children: t("detail.rows", { count: sortedRows.length })
							})
						]
					}), sortedRows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shared_module_css_default.empty,
						children: t("empty.noUsage")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: detail_module_css_default.tableScroll,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
							className: detail_module_css_default.detailTable,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { scope: "col" }), SORT_COLUMNS.map(([key, labelKey]) => {
								const active = sortKey === key;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									scope: "col",
									"aria-sort": active ? sortDirection === "asc" ? "ascending" : "descending" : "none",
									className: RIGHT_ALIGNED.has(key) ? detail_module_css_default.alignRight : detail_module_css_default.alignLeft,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: detail_module_css_default.sortBtn,
										onClick: () => toggleSort(key),
										children: [t(labelKey), active && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: detail_module_css_default.sortDir,
											"aria-hidden": "true",
											children: sortDirection === "asc" ? "↑" : "↓"
										})]
									})
								}, key);
							})] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tbody", { children: [sortedRows.map((row) => {
								const open = expanded[row.key] === true;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.models.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.expandSpacer,
										"aria-hidden": "true"
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: detail_module_css_default.expandBtn,
										"aria-expanded": open,
										"aria-label": open ? t("detail.collapse") : t("detail.expand"),
										onClick: () => toggleExpanded(row.key),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											"aria-hidden": "true",
											children: open ? "▾" : "▸"
										})
									}) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: detail_module_css_default.alignLeft,
										children: fmtShortDate(row.date)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
										className: detail_module_css_default.alignLeft,
										children: [row.label, row.labelDim !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: shared_module_css_default.dim,
											children: [" ", row.labelDim]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: detail_module_css_default.alignRight,
										children: fmtCalls(row.calls)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: detail_module_css_default.alignRight,
										children: fmtTokens(row.input)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: detail_module_css_default.alignRight,
										children: fmtTokens(row.output)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: detail_module_css_default.alignRight,
										children: fmtTokens(row.cacheRead)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: detail_module_css_default.alignRight + " " + detail_module_css_default.costCell,
										children: row.costText
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: detail_module_css_default.alignRight,
										children: deltaCellOf(row.delta)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: detail_module_css_default.alignRight,
										children: costSourceLabelOf(row.source, t)
									})
								] }), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: detail_module_css_default.subCell,
									colSpan: SORT_COLUMNS.length + 1,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
										className: detail_module_css_default.subTable,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												scope: "col",
												className: detail_module_css_default.alignLeft,
												children: t("detail.model")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												scope: "col",
												className: detail_module_css_default.alignRight,
												children: t("c.calls")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												scope: "col",
												className: detail_module_css_default.alignRight,
												children: "Tokens"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
												scope: "col",
												className: detail_module_css_default.alignRight,
												children: t("c.cost")
											})
										] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: row.models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
												className: detail_module_css_default.alignLeft,
												children: [model.model, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: shared_module_css_default.dim,
													children: [" · ", displayNameOf(channels, model.provider)]
												})]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
												className: detail_module_css_default.alignRight,
												children: fmtCalls(model.calls)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
												className: detail_module_css_default.alignRight,
												children: fmtTokens(model.inputTokens + model.outputTokens + model.cacheReadTokens)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
												className: detail_module_css_default.alignRight,
												children: costTextOf$1(model, model.costSource ?? null)
											})
										] }, model.provider + "|" + model.model)) })]
									})
								}) })] }, row.key);
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
								className: detail_module_css_default.totalRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: detail_module_css_default.alignLeft,
										children: t("detail.total")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: detail_module_css_default.alignLeft,
										children: t("detail.groupCount", { count: groupCount })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: detail_module_css_default.alignRight,
										children: fmtCalls(safeTotals.calls)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: detail_module_css_default.alignRight,
										children: fmtTokens(safeTotals.inputTokens)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: detail_module_css_default.alignRight,
										children: fmtTokens(safeTotals.outputTokens)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: detail_module_css_default.alignRight,
										children: fmtTokens(safeTotals.cacheReadTokens)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: detail_module_css_default.alignRight,
										children: totalCostText
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: detail_module_css_default.alignRight,
										children: deltaCellOf(totalDelta)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										className: detail_module_css_default.alignRight,
										children: "—"
									})
								]
							})] })]
						})
					})]
				})]
			});
		}
		//#endregion
		//#region src/client/tabs/OverviewTab.tsx
		/**
		* 总览：KPI 卡片行 + 使用趋势（「全部」看全年热力图，其余范围看柱状图）+ 项目 / 模型排行 + 按时段热力。
		* 按原型不再列通道表：通道余额与配额在「额度与订阅」，这里只留结论。
		* KPI 口径跟随页头范围：近 30 天取 `summary` 的月列（官方账单），其余范围取 `usage.totals`（同一窗口）；
		* 拿不到的字段一律显示 —，不编造，也不把两个窗口的数字拼进同一张卡。
		*/
		const TREND_METRICS = [
			["activity", "overview.mActivity"],
			["tokens", "overview.mTokens"],
			["outTokens", "overview.mOutTokens"],
			["cacheRead", "overview.mCacheRead"],
			["sessions", "overview.mSessions"],
			["cost", "overview.mSpend"]
		];
		const PROJECT_METRICS = [
			["cost", "overview.mCost"],
			["tokens", "overview.mTokens"],
			["sessions", "overview.mSessions"]
		];
		const MODEL_METRICS = [
			["cost", "overview.mCost"],
			["tokens", "overview.mTokens"],
			["cacheHit", "overview.kpiCache"]
		];
		const HOUR_METRICS = [
			["sessions", "overview.mSessions"],
			["tokens", "overview.mTokens"],
			["cost", "overview.mSpend"]
		];
		/** 周一到周日的标签键（`h.wd0` 是周日）。 */
		const WEEKDAY_KEYS = [
			"h.wd1",
			"h.wd2",
			"h.wd3",
			"h.wd4",
			"h.wd5",
			"h.wd6",
			"h.wd0"
		];
		/** 排行面板最多列出的行数，其余收进「还有 M 个」。 */
		const RANK_ROWS = 5;
		/** 柱状图横轴最多标注几个日期。 */
		const BAR_TICKS = 8;
		function OverviewTab(props) {
			/** 取词：宿主切语言时重渲染 */
			const t = useT();
			/** 订阅显示币种与汇率：金额随它重渲染（汇率与币种在设置弹窗里改）。 */
			const { display } = useCurrencyDisplay();
			const [trendMetric, setTrendMetric] = (0, react.useState)("activity");
			const [projectMetric, setProjectMetric] = (0, react.useState)("cost");
			const [modelMetric, setModelMetric] = (0, react.useState)("cost");
			const [hourMetric, setHourMetric] = (0, react.useState)("sessions");
			const range = props.range ?? "month";
			const summary = props.summary;
			const modelFilter = props.modelFilter ?? "";
			const projectFilter = props.projectFilter ?? "";
			/** 任一筛选激活时，KPI 必须从过滤后的 usage 算：summary 的月列没有通道/项目/模型维度 */
			const anyFilterActive = selectionOf(props.channelFilter ?? "").length > 0 || selectionOf(projectFilter).length > 0 || selectionOf(modelFilter).length > 0;
			/** 模型维度只在 `/usage` 的逐日模型桶里：过滤后当场重算每天与合计（纯客户端聚合，不改请求、不新增数据源） */
			const scopedUsage = filterUsageByModel(props.usage ?? null, modelFilter);
			const isMonthRange = range === "month";
			const monthRows = summary === null ? [] : summary.channels.map((row) => row.month);
			const monthCost = monthCostTotalsOf(summary);
			const monthTokens = monthRows.reduce((total, row) => total + row.tokens, 0);
			const monthFrom = summary === null ? null : summary.range.monthFrom;
			const monthTo = summary === null ? null : summary.range.today;
			const activeDaysOfMonth = monthFrom === null || monthTo === null ? 0 : props.heatmap.filter((day) => day.date >= monthFrom && day.date <= monthTo).length;
			const useSummaryKpi = isMonthRange && !anyFilterActive;
			const rangeTotals = useSummaryKpi ? null : rangeTotalsOf(scopedUsage, range);
			/** 入 / 出拆分与缓存读：近 30 天借 `usage.totals`（与 summary 同窗口），其余范围就是当前范围的合计。
			*  近 30 天整行 KPI 保持同源（official 账单 + 同窗口合计），不单独按模型拆，避免同一行混两个口径。 */
			const splitTotals = useSummaryKpi ? props.usage?.totals ?? null : rangeTotals;
			const costRow = useSummaryKpi ? summary === null ? null : monthCost : rangeTotals === null ? null : {
				cost: rangeTotals.cost,
				costsByCurrency: rangeTotals.costsByCurrency
			};
			const costAmount = costRow === null ? null : comparableMoneyOf(costRow);
			const tokenCount = useSummaryKpi ? summary === null ? null : monthTokens : rangeTotals === null ? null : rangeTotals.inputTokens + rangeTotals.outputTokens + rangeTotals.cacheReadTokens;
			const tokenValue = tokenCount === null ? null : tokenValueOf(tokenCount);
			const hitRate = hitRateOf(splitTotals);
			const cacheSaved = splitTotals === null || splitTotals.cacheSaved == null ? null : moneyTotalsTextOf({
				cost: splitTotals.cacheSaved,
				costsByCurrency: splitTotals.cacheSavedByCurrency
			});
			const activeDays = useSummaryKpi ? activeDaysOfMonth : usageDayCountOf(scopedUsage, range);
			const dailyAverage = costAmount === null || activeDays === 0 ? null : costAmount / activeDays;
			/** 会话数可按项目 / 模型收窄（会话行同时带 workspace 与模型桶）；截断判定仍按未过滤的原始行数 */
			const scopedSessions = sessionsOfScope(props.sessions, projectFilter, modelFilter);
			const rawSessionRowCount = props.sessions == null ? 0 : props.sessions.rows.length;
			const sessionCount = useSummaryKpi ? sessionCountOf(scopedSessions, monthFrom, rawSessionRowCount) : sessionCountOf(scopedSessions, sessionFromOf(range), rawSessionRowCount);
			const isAllRange = range === "total";
			/** 「全部」范围画的是全年热力图（热力图口径 → 保持全量）；其余范围是台账柱状图，跟随模型筛选。
			*  过滤时不能退回 heatmap：它没有模型维度，按它二次聚合就是凑数。 */
			const rawTrendDays = trendDaysOf(props.usage, props.heatmap);
			const trendDays = isAllRange ? rawTrendDays : selectionOf(modelFilter).length === 0 ? rawTrendDays : trendDaysOf(scopedUsage, []);
			/** 活跃度只认按天调用数：`heatmap` 段没有这一项时该档不画柱（不拿 token 量冒充调用数）。 */
			const hasDailyCalls = trendDays.some((day) => day.calls !== null);
			const rangeWindow = windowOfRange(range);
			const barDays = range === "custom" && props.usage == null || rangeWindow === null ? trendDays : trendDays.filter((day) => day.date >= rangeWindow.from && day.date <= rangeWindow.to);
			const barValues = barDays.map((day) => metricValueOf(trendMetric, day));
			const hasBarData = barValues.some((value) => value !== null && value > 0);
			const heatValues = /* @__PURE__ */ new Map();
			for (const day of trendDays) {
				const value = metricValueOf(trendMetric, day);
				if (value !== null && value > 0) heatValues.set(day.date, value);
			}
			const hasHeatData = heatValues.size > 0;
			/** 趋势空态：活跃度缺按天调用数时讲清原因，不给笼统的「暂无数据」。 */
			const trendEmptyText = trendMetric === "activity" && !hasDailyCalls ? t("overview.noCalls") : t("overview.noData");
			const drawnDates = isAllRange ? [...heatValues.keys()] : barDays.filter((_, index) => (barValues[index] ?? 0) > 0).map((day) => day.date);
			const busiest = busiestOf(drawnDates, isAllRange ? [...heatValues.values()] : barValues.filter((value) => value !== null && value > 0));
			const trendStats = [
				drawnDates.length > 0 ? t("overview.streak", { count: streakOf(drawnDates) }) : null,
				busiest === null ? null : t("overview.busiest", {
					date: fmtShortDate(busiest.date),
					value: metricTextOf(trendMetric, busiest.value)
				}),
				drawnDates.length > 0 ? t("overview.activeDays", { count: drawnDates.length }) : null
			].filter((part) => part !== null).join(" · ");
			const heatmapByDate = new Map(props.heatmap.map((day) => [day.date, day]));
			const dataStart = props.heatmap.length > 0 ? props.heatmap[0].date : null;
			/** 热力图悬停：先讲当前指标的值，Tokens 类指标再补逐模型占比（模型构成只有 tokens 口径）。 */
			const tipOfDay = (date) => {
				const value = heatValues.get(date);
				if (value === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: date }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipSub, { children: dataStart !== null && date >= dataStart ? t("h.noUsage") : t("h.noLedger") })] });
				const day = heatmapByDate.get(date);
				const withModels = trendMetric === "activity" || trendMetric === "tokens";
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: date }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(TipSub, { children: [
						t(labelKeyOf(TREND_METRICS, trendMetric)),
						" ",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: metricTextOf(trendMetric, value) })
					] }),
					withModels && day !== void 0 && day.models.map((model) => {
						const percent = day.totalTokens > 0 ? Math.round(model.totalTokens / day.totalTokens * 100) : 0;
						const color = channelColorOf(props.channels, model.provider);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
							color,
							label: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [model.model, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: shared_module_css_default.dim,
								children: [" · ", displayNameOf(props.channels, model.provider)]
							})] }),
							amount: fmtTokens(model.totalTokens),
							rate: percent + "%"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipBar, {
							percent,
							color
						})] }, model.provider + "|" + model.model);
					})
				] });
			};
			const barTipOf = (date, value) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: date }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(TipSub, { children: [
				t(labelKeyOf(TREND_METRICS, trendMetric)),
				" ",
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: value === null ? "—" : metricTextOf(trendMetric, value) })
			] })] });
			const projectItems = rankItemsOfProjects(projectsOfScope(props.projects, projectFilter), projectMetric);
			const modelItems = rankItemsOfModels(modelsOfScope(props.models, modelFilter), modelMetric);
			const hourMatrix = hourlyMatrixOf(props.hourly);
			const hourValues = hourMatrix === null ? null : hourMatrix.map((weekday) => weekday.map((cell) => hourMetricValueOf(hourMetric, cell)));
			const hourActiveValues = hourValues === null ? [] : hourValues.flat().filter((value) => value !== void 0 && value > 0);
			const hasHourData = hourActiveValues.length > 0;
			const hourThresholds = levelThresholds(hourActiveValues);
			const busiestHour = busiestHourOf(hourValues);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: overview_module_css_default.stack,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: overview_module_css_default.kpiRow,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KpiCard$1, {
								label: t("overview.kpiCost"),
								value: costRow === null ? "—" : moneyTotalsTextOf(costRow),
								detail: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PrevLine$1, {
									previous: props.previousCost ?? null,
									current: costAmount,
									format: (value) => moneyTextOf(display, value)
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KpiCard$1, {
								label: t("overview.kpiTokens"),
								value: tokenValue === null ? "—" : tokenValue.text,
								unit: tokenValue === null || tokenValue.unit === "" ? void 0 : tokenValue.unit,
								detail: splitTotals === null ? "—" : t("overview.ioSplit", {
									input: fmtTokens(splitTotals.inputTokens),
									output: fmtTokens(splitTotals.outputTokens)
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KpiCard$1, {
								label: t("overview.kpiCache"),
								value: hitRate === null ? "—" : hitRate.toFixed(1),
								unit: hitRate === null ? void 0 : "%",
								detail: splitTotals === null ? "—" : t("overview.cacheReadOnly", { value: tokenTextOf(splitTotals.cacheReadTokens) })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KpiCard$1, {
								label: t("overview.kpiCacheSaved"),
								value: cacheSaved ?? "—",
								detail: splitTotals?.cacheSaved == null || costAmount === null || costAmount <= 0 ? void 0 : t("overview.ofCost", { percent: Math.round(splitTotals.cacheSaved / costAmount * 100) })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KpiCard$1, {
								label: t("overview.kpiSessions"),
								value: sessionCount === null ? "—" : fmtCalls(sessionCount),
								detail: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PrevLine$1, {
									previous: props.previousSessions ?? null,
									current: sessionCount,
									format: fmtCalls
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KpiCard$1, {
								label: t("overview.kpiDaily"),
								value: dailyAverage === null ? "—" : displaySymbolOf(display) + dailyAverage.toFixed(1),
								detail: activeDays === 0 ? "—" : t("overview.activeDays", { count: activeDays })
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: overview_module_css_default.panel,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: overview_module_css_default.panelHead,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", {
									className: overview_module_css_default.panelTitle,
									children: t("overview.trend")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: overview_module_css_default.metricTabs,
									children: TREND_METRICS.map(([metric, labelKey]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: metric === trendMetric ? overview_module_css_default.metricTab + " " + overview_module_css_default.metricTabOn : overview_module_css_default.metricTab,
										"aria-pressed": metric === trendMetric,
										onClick: () => setTrendMetric(metric),
										children: t(labelKey)
									}, metric))
								})]
							}),
							isAllRange ? hasHeatData ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(YearHeatmap, {
								valuesByDate: heatValues,
								dataStart,
								tooltip: props.tooltip,
								tipOf: tipOfDay,
								onPickDay: props.onPickDay,
								ariaLabel: t("overview.trend") + " · " + String(heatValues.size) + t("h.summarySuffix")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: shared_module_css_default.empty,
								children: trendEmptyText
							}) : hasBarData ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TrendBars, {
								days: barDays,
								values: barValues,
								tooltip: props.tooltip,
								tipOf: barTipOf
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: shared_module_css_default.empty,
								children: trendEmptyText
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: overview_module_css_default.trendFoot,
								children: [isAllRange && hasHeatData && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: overview_module_css_default.legend,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: overview_module_css_default.legendItem,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: LEVEL_COLORS[0] } }), t("overview.legendLess")]
										}),
										LEVEL_COLORS.slice(1, -1).map((color) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: overview_module_css_default.legendItem,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: color } })
										}, color)),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: overview_module_css_default.legendItem,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: LEVEL_COLORS[LEVEL_COLORS.length - 1] } }), t("overview.legendMore")]
										})
									]
								}), trendStats !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: overview_module_css_default.trendStats,
									children: trendStats
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: overview_module_css_default.gridTwo,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RankPanel, {
							title: t("overview.panelProjects"),
							metrics: PROJECT_METRICS,
							active: projectMetric,
							onActive: setProjectMetric,
							items: projectItems.items,
							total: projectItems.total
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RankPanel, {
							title: t("overview.panelModels"),
							metrics: MODEL_METRICS,
							active: modelMetric,
							onActive: setModelMetric,
							items: modelItems.items,
							total: modelItems.total
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: overview_module_css_default.panel,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: overview_module_css_default.panelHead,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", {
									className: overview_module_css_default.panelTitle,
									children: t("overview.hourly")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: overview_module_css_default.metricTabs,
									children: HOUR_METRICS.map(([metric, labelKey]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: metric === hourMetric ? overview_module_css_default.metricTab + " " + overview_module_css_default.metricTabOn : overview_module_css_default.metricTab,
										"aria-pressed": metric === hourMetric,
										onClick: () => setHourMetric(metric),
										children: t(labelKey)
									}, metric))
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: overview_module_css_default.panelMore,
									children: busiestHour === null ? "" : t("overview.busiestHour", {
										weekday: t(WEEKDAY_KEYS[busiestHour.weekday]),
										hour: String(busiestHour.hour).padStart(2, "0") + ":00"
									})
								})
							]
						}), hourValues === null || hourMatrix === null || !hasHourData ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: shared_module_css_default.empty,
							children: t("overview.noHourly")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: overview_module_css_default.hourWrap,
							role: "group",
							"aria-label": t("overview.hourly"),
							children: [
								WEEKDAY_KEYS.map((key, weekdayIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: overview_module_css_default.hourWeekday,
									style: {
										gridColumn: 1,
										gridRow: weekdayIndex + 2
									},
									children: t(key)
								}, key)),
								Array.from({ length: 24 }, (_, hour) => hour % 3 === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: overview_module_css_default.hourAxisLabel,
									style: {
										gridColumn: hour + 2,
										gridRow: 1
									},
									children: String(hour)
								}, "axis-" + String(hour)) : null),
								hourMatrix.map((weekday, weekdayIndex) => weekday.map((cell, hour) => {
									const value = hourValues[weekdayIndex][hour];
									const level = value === void 0 ? 0 : levelOfValue(value, hourThresholds);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: overview_module_css_default.hourCell,
										style: {
											gridColumn: hour + 2,
											gridRow: weekdayIndex + 2,
											background: levelColorOf(level)
										},
										onMouseMove: (event) => props.tooltip.show(event, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: t(WEEKDAY_KEYS[weekdayIndex]) + " " + String(hour).padStart(2, "0") + ":00" }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(TipSub, { children: [
											t(labelKeyOf(HOUR_METRICS, hourMetric)),
											" ",
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: value === void 0 ? "—" : metricTextOf(hourMetric, value) })
										] })] })),
										onMouseLeave: props.tooltip.hide
									}, weekdayIndex + "-" + hour);
								}))
							]
						})]
					})
				]
			});
		}
		function KpiCard$1(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: overview_module_css_default.kpiCard,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: overview_module_css_default.kpiLabel,
						children: props.label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: overview_module_css_default.kpiValue,
						children: [props.value, props.unit !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: overview_module_css_default.kpiUnit,
							children: props.unit
						})]
					}),
					props.detail !== void 0 && props.detail !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: overview_module_css_default.kpiDetail,
						children: props.detail
					})
				]
			});
		}
		/**
		* 副标题的环比：服务端没有上期字段，拿不到就整行不显示（不编数字），
		* 有上期但本期拿不到时只讲上期；只有两边都有且上期非零才带涨跌百分比。
		*/
		function PrevLine$1(props) {
			if (props.previous === null) return null;
			const previousText = t("overview.prev", { value: props.format(props.previous) });
			if (props.current === null || props.previous <= 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: previousText });
			const delta = (props.current - props.previous) / props.previous * 100;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [previousText, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: delta > 0 ? overview_module_css_default.rise : delta < 0 ? overview_module_css_default.fall : void 0,
				children: (delta > 0 ? "+" : "") + delta.toFixed(1) + "%"
			})] });
		}
		/** 柱状图：只有高度与日期，数值在悬停里看（不往柱子上堆文字）。 */
		function TrendBars(props) {
			const peak = Math.max(0, ...props.values.filter((value) => value !== null));
			const peakIndex = props.values.findIndex((value) => value !== null && value === peak && peak > 0);
			const ticks = tickIndexesOf(props.days.length, BAR_TICKS);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: overview_module_css_default.hist,
				children: props.days.map((day, index) => {
					const value = props.values[index] ?? null;
					const percent = value === null || peak <= 0 ? 0 : Math.max(2, value / peak * 100);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: overview_module_css_default.histColumn,
						onMouseMove: (event) => props.tooltip.show(event, props.tipOf(day.date, value)),
						onMouseLeave: props.tooltip.hide,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: index === peakIndex ? overview_module_css_default.histBar + " " + overview_module_css_default.histBarPeak : overview_module_css_default.histBar,
							style: { height: percent + "%" }
						})
					}, day.date);
				})
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: overview_module_css_default.histLabels,
				children: ticks.map((index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: fmtShortDate(props.days[index].date) }, props.days[index].date))
			})] });
		}
		/** 排行面板：横条 + 右侧数值；行数超出「还有 M 个」。 */
		function RankPanel(props) {
			/** 取词：宿主切语言时重渲染 */
			const t = useT();
			const shown = props.items.slice(0, RANK_ROWS);
			const peak = shown.reduce((maximum, item) => item.value !== null && item.value > maximum ? item.value : maximum, 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: overview_module_css_default.panel,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: overview_module_css_default.panelHead,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", {
							className: overview_module_css_default.panelTitle,
							children: props.title
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: overview_module_css_default.metricTabs,
							children: props.metrics.map(([metric, labelKey]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: metric === props.active ? overview_module_css_default.metricTab + " " + overview_module_css_default.metricTabOn : overview_module_css_default.metricTab,
								"aria-pressed": metric === props.active,
								onClick: () => props.onActive(metric),
								children: t(labelKey)
							}, metric))
						}),
						props.total > shown.length && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: overview_module_css_default.panelMore,
							children: t("overview.more", {
								total: props.total,
								rest: Math.max(0, props.total - shown.length)
							})
						})
					]
				}), shown.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.empty,
					children: t("overview.noData")
				}) : shown.map((item, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: overview_module_css_default.rankRow,
					title: item.title,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: overview_module_css_default.rankName,
							children: item.name
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: overview_module_css_default.rankTrack,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
								className: index === 0 ? overview_module_css_default.rankBar + " " + overview_module_css_default.rankBarTop : overview_module_css_default.rankBar,
								style: { width: item.value === null || peak <= 0 ? 0 : Math.max(2, item.value / peak * 100) + "%" }
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: item.value === null ? overview_module_css_default.rankValue + " " + overview_module_css_default.rankDim : overview_module_css_default.rankValue,
							children: item.valueText
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: overview_module_css_default.rankSub,
							children: item.subText
						})
					]
				}, item.key))]
			});
		}
		/** 排行排序：有数值的按数值降序在前，没有依据（—）的稳定排在末尾。 */
		function compareRankValue(first, second) {
			if (first.value === null && second.value === null) return 0;
			if (first.value === null) return 1;
			if (second.value === null) return -1;
			return second.value - first.value;
		}
		/** 汇总 summary 的近 30 天成本：合计只按逐币种小计折算后相加（`cost` 只是兜底）。 */
		function monthCostTotalsOf(summary) {
			const totals = {
				cost: 0,
				costsByCurrency: {}
			};
			for (const row of summary?.channels ?? []) {
				totals.cost += row.month.cost;
				for (const [currency, amount] of Object.entries(row.month.costsByCurrency ?? {})) totals.costsByCurrency[currency] = (totals.costsByCurrency[currency] ?? 0) + amount;
			}
			return totals;
		}
		/** 缓存命中率 = 缓存读 ÷（输入 + 输出 + 缓存读）；没有拆分数据时给 null。 */
		function hitRateOf(totals) {
			if (totals === null) return null;
			const total = totals.inputTokens + totals.outputTokens + totals.cacheReadTokens;
			return total > 0 ? totals.cacheReadTokens / total * 100 : null;
		}
		/**
		* 本期会话数：最近活动落在当前窗口里的会话行数（`'all'` = 全部会话，不设下限）。
		* 列表被 limit 截断时不能拿来计数（会少算）—— 截断判定用**未过滤**的原始行数 `rawRowCount`，
		* 因为按项目 / 模型筛选后行数本来就比 `countedSessions` 少，不能拿它当截断证据；
		* `from` 为 null 表示窗口未知（自定义范围只有父级知道起止）→ 显示 —。
		*/
		function sessionCountOf(sessions, from, rawRowCount) {
			if (from === null || sessions == null || sessions.coverage.status === "unavailable") return null;
			if (rawRowCount === 0) return null;
			if (rawRowCount < sessions.coverage.countedSessions && from === "all") return sessions.coverage.countedSessions;
			const active = sessions.rows.filter((row) => row.calls > 0);
			if (from === "all") return active.length;
			const fromTime = (/* @__PURE__ */ new Date(from + "T00:00:00")).getTime();
			return active.filter((row) => row.lastTime !== null && row.lastTime >= fromTime).length;
		}
		/** 会话 KPI 的起点：今天 / 7 天按窗口起点，全部不设下限，自定义范围只有父级知道起止 → null（显示 —）。 */
		function sessionFromOf(range) {
			if (range === "total") return "all";
			return windowOfRange(range)?.from ?? null;
		}
		/**
		* 非近 30 天范围的可信合计：父级按当前范围请求 `/usage`，分页时可能还没跟上；
		* 逐日明细越出当前窗口就按没有数据处理（宁可显示 —，也不把上一个范围的数字贴到本范围）。
		*/
		function rangeTotalsOf(usage, range) {
			const totals = usage?.totals ?? null;
			if (totals === null) return null;
			const window = windowOfRange(range);
			if (window === null) return totals;
			return (usage?.days ?? []).some((day) => day.date < window.from || day.date > window.to) ? null : totals;
		}
		/** 当前范围里有数据的天数（日均的分母）：`usage.days` 的日期去重，只数窗口内的日子。 */
		function usageDayCountOf(usage, range) {
			const window = windowOfRange(range);
			const dates = /* @__PURE__ */ new Set();
			for (const day of usage?.days ?? []) {
				if (window !== null && (day.date < window.from || day.date > window.to)) continue;
				dates.add(day.date);
			}
			return dates.size;
		}
		/** KPI 大数：按原型展示 2 位小数（15.34<small>B</small>），与共用 `fmtTokens` 的 1 位小数区分（榜单仍用 1 位）。 */
		function tokenValueOf(count) {
			for (const [base, unit] of [
				[1e9, "B"],
				[1e6, "M"],
				[1e3, "K"]
			]) {
				if (Math.abs(count) < base) continue;
				const value = count / base;
				if (value < 1e3) return {
					text: value.toFixed(2),
					unit
				};
			}
			return {
				text: fmtCount(count),
				unit: ""
			};
		}
		/** 大数文本（2 位小数 + 单位）：缓存读明细这类 KPI 副标用。 */
		function tokenTextOf(count) {
			const value = tokenValueOf(count);
			return value.text + value.unit;
		}
		/** 逐日序列：有 usage 只用它的 days（父级已按当前范围请求），否则退回 heatmap 的逐日总量。 */
		function trendDaysOf(usage, heatmap) {
			const usageDays = usage?.days ?? [];
			if (usageDays.length > 0) return usageDays.map(trendDayOfDay).sort((first, second) => first.date.localeCompare(second.date));
			return heatmap.map((day) => ({
				date: day.date,
				tokens: day.totalTokens,
				calls: null,
				outTokens: null,
				cacheRead: null,
				cost: null
			})).sort((first, second) => first.date.localeCompare(second.date));
		}
		function trendDayOfDay(day) {
			return {
				date: day.date,
				tokens: day.inputTokens + day.outputTokens + day.cacheReadTokens,
				calls: day.calls,
				outTokens: day.outputTokens,
				cacheRead: day.cacheReadTokens,
				cost: comparableMoneyOf(day)
			};
		}
		/** 各范围对应的本地窗口；`total` 由热力图覆盖、`custom` 只有父级知道起止，两者返回 null。 */
		function windowOfRange(range) {
			const today = isoDate(/* @__PURE__ */ new Date());
			if (range === "today") return {
				from: today,
				to: today
			};
			if (range === "week") return {
				from: shiftedIsoDate(-6),
				to: today
			};
			if (range === "month") return {
				from: shiftedIsoDate(-29),
				to: today
			};
			return null;
		}
		/**
		* 当前指标在一天上的取值。`activity` 只认按天调用数：`heatmap` 段没有这一项时返回 null（该档不画柱），
		* 绝不拿 token 量冒充调用数；`sessions` 一律 null：服务端没有按天会话数。
		*/
		function metricValueOf(metric, day) {
			if (metric === "activity") return day.calls;
			if (metric === "tokens") return day.tokens;
			if (metric === "outTokens") return day.outTokens;
			if (metric === "cacheRead") return day.cacheRead;
			if (metric === "cost") return day.cost;
			return null;
		}
		/** 指标数值文本：金额按显示币种，调用次数带单位，其余按 tokens 缩写。 */
		function metricTextOf(metric, value) {
			if (metric === "cost") return displaySymbolOf() + value.toFixed(2);
			if (metric === "activity") return fmtCalls(value) + " " + t("overview.callsUnit");
			if (metric === "sessions") return fmtCalls(value);
			return fmtTokens(value);
		}
		function labelKeyOf(pairs, key) {
			return pairs.find(([item]) => item === key)?.[1] ?? "";
		}
		/** 连续活跃天数：只数有值的日子，中间断一天就重新起算。 */
		function streakOf(dates) {
			const sorted = [...dates].sort();
			let longest = 0;
			let run = 0;
			let previous = null;
			for (const date of sorted) {
				run = previous !== null && nextDateOf(previous) === date ? run + 1 : 1;
				longest = Math.max(longest, run);
				previous = date;
			}
			return longest;
		}
		function nextDateOf(dateKey) {
			return isoDate(new Date((/* @__PURE__ */ new Date(dateKey + "T00:00:00")).getTime() + 864e5));
		}
		/** 最忙的一天（值最大的那天）；没有值时给 null。 */
		function busiestOf(dates, values) {
			let busiest = null;
			for (let index = 0; index < dates.length; index += 1) {
				const value = values[index];
				if (value === void 0 || value <= 0) continue;
				if (busiest === null || value > busiest.value) busiest = {
					date: dates[index],
					value
				};
			}
			return busiest;
		}
		function tickIndexesOf(count, wanted) {
			if (count <= wanted) return Array.from({ length: count }, (_, index) => index);
			const step = Math.ceil(count / wanted);
			const indexes = [];
			for (let index = 0; index < count; index += step) indexes.push(index);
			return indexes;
		}
		function projectValueOf(metric, row) {
			if (metric === "cost") return comparableMoneyOf(row);
			if (metric === "tokens") return row.tokens;
			return row.sessionCount;
		}
		function projectValueTextOf(metric, row) {
			if (metric === "cost") return rowMoneyViewOf(row).text;
			if (metric === "tokens") return fmtTokens(row.tokens);
			return fmtCalls(row.sessionCount);
		}
		/** 项目榜按全局项目筛选收窄（项目行按 workspace / 覆盖目录命中，空 workspace 命中「未归入工作区」）；空选择原样返回。 */
		function projectsOfScope(projects, projectFilter) {
			if (projects == null || selectionOf(projectFilter).length === 0) return projects ?? null;
			return {
				...projects,
				rows: projects.rows.filter((row) => selectionMatches(projectFilterValuesOf(row.workspace, row.paths), projectFilter))
			};
		}
		/** 模型榜按全局模型筛选收窄；空选择原样返回。 */
		function modelsOfScope(models, modelFilter) {
			if (models == null || selectionOf(modelFilter).length === 0) return models ?? null;
			return {
				...models,
				rows: models.rows.filter((row) => selectionMatches([row.model], modelFilter))
			};
		}
		/** 会话按维度收窄（会话行同时带 workspace 与模型桶）；两个筛选都为空时原样返回。 */
		function sessionsOfScope(sessions, projectFilter, modelFilter) {
			if (sessions == null || selectionOf(projectFilter).length === 0 && selectionOf(modelFilter).length === 0) return sessions ?? null;
			return {
				...sessions,
				rows: sessions.rows.filter((row) => selectionMatches(projectFilterValuesOf(row.workspace, void 0), projectFilter) && selectionMatches(row.models.map((model) => model.model), modelFilter))
			};
		}
		function rankItemsOfProjects(projects, metric) {
			const rows = projects?.rows ?? [];
			const items = [];
			for (const row of rows) {
				const value = projectValueOf(metric, row);
				/** 成本口径下没有价目依据的行保留在末尾显示「—」（原型模型榜就有一条 —），不编金额 */
				const missingCost = metric === "cost" && value === null;
				if (!missingCost && (value === null || value <= 0)) continue;
				const name = row.workspaceTitle ?? (row.workspace === "" ? t("p.orphan") : row.workspace);
				items.push({
					key: row.workspace === "" ? "__orphan__" : row.workspace,
					name,
					title: name,
					value,
					valueText: missingCost ? "—" : projectValueTextOf(metric, row),
					subText: t("overview.sessionCount", { count: row.sessionCount })
				});
			}
			items.sort(compareRankValue);
			return {
				items,
				total: items.length
			};
		}
		function modelValueOf(metric, row) {
			if (metric === "cost") return comparableMoneyOf(row);
			if (metric === "tokens") return row.tokens;
			return row.cacheHitRate;
		}
		function modelValueTextOf(metric, row) {
			if (metric === "cost") return rowMoneyViewOf(row).text;
			if (metric === "tokens") return fmtTokens(row.tokens);
			return row.cacheHitRate === null ? "—" : row.cacheHitRate.toFixed(1) + "%";
		}
		function rankItemsOfModels(models, metric) {
			const rows = models?.rows ?? [];
			const items = [];
			for (const row of rows) {
				const value = modelValueOf(metric, row);
				/** 成本口径下没有价目依据的模型保留在末尾显示「—」（原型模型榜第 5 行就是这种），不编金额 */
				const missingCost = metric === "cost" && value === null;
				if (!missingCost && (value === null || value <= 0)) continue;
				items.push({
					key: row.provider + "|" + row.model,
					name: row.model,
					title: row.model + " · " + row.providerLabel,
					value,
					valueText: missingCost ? "—" : modelValueTextOf(metric, row),
					subText: fmtTokens(row.tokens)
				});
			}
			items.sort(compareRankValue);
			return {
				items,
				total: items.length
			};
		}
		function hourCellOf(value) {
			if (typeof value === "number" && Number.isFinite(value)) return { sessions: value };
			if (value === null || typeof value !== "object") return {};
			const record = value;
			const numberAt = (key) => {
				const raw = record[key];
				return typeof raw === "number" && Number.isFinite(raw) ? raw : void 0;
			};
			return {
				sessions: numberAt("sessions") ?? numberAt("calls"),
				tokens: numberAt("tokens"),
				cost: numberAt("cost")
			};
		}
		/**
		* 把 heatmap 段的 `hourly` 归一成「周一到周日 × 24 小时」。
		* 接受两种写法：`hours` 里是数字（当会话数）或对象（sessions / calls / tokens / cost）；
		* 周几用 7 或 0 区分「周一 = 1」与「周日 = 0」；外面包一层 `rows` / `weekdays` 也认。
		* 形状不对时返回 null（面板显示空态，不崩）。
		*/
		function hourlyMatrixOf(raw) {
			const list = hourlyListOf(raw);
			if (list === null) return null;
			const rows = [];
			for (const entry of list) {
				if (entry === null || typeof entry !== "object") continue;
				const record = entry;
				const weekday = typeof record.weekday === "number" ? record.weekday : Number(record.weekday);
				const hoursRaw = Array.isArray(record.hours) ? record.hours : null;
				if (!Number.isFinite(weekday) || hoursRaw === null) continue;
				const hours = [];
				for (let hour = 0; hour < 24; hour += 1) hours.push(hourCellOf(hoursRaw[hour]));
				rows.push({
					weekday,
					hours
				});
			}
			if (rows.length === 0) return null;
			const sundayZero = !rows.some((row) => row.weekday === 7) && rows.some((row) => row.weekday === 0);
			const matrix = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({})));
			for (const row of rows) {
				const displayIndex = sundayZero ? (row.weekday + 6) % 7 : row.weekday - 1;
				if (displayIndex < 0 || displayIndex > 6) continue;
				matrix[displayIndex] = row.hours;
			}
			return matrix;
		}
		/** 取承载七行的那一层数组：原子数组，或 `{ rows: [...] }` / `{ weekdays: [...] }` 这种包一层的写法。 */
		function hourlyListOf(raw) {
			if (Array.isArray(raw)) return raw;
			if (raw === null || typeof raw !== "object") return null;
			const record = raw;
			for (const key of [
				"rows",
				"weekdays",
				"hourly"
			]) {
				const value = record[key];
				if (Array.isArray(value)) return value;
			}
			return null;
		}
		function hourMetricValueOf(metric, cell) {
			if (metric === "sessions") return cell.sessions;
			if (metric === "tokens") return cell.tokens;
			return cell.cost;
		}
		function busiestHourOf(values) {
			if (values === null) return null;
			let busiest = null;
			for (let weekday = 0; weekday < values.length; weekday += 1) for (let hour = 0; hour < values[weekday].length; hour += 1) {
				const value = values[weekday][hour];
				if (value === void 0 || value <= 0) continue;
				if (busiest === null || value > busiest.value) busiest = {
					weekday,
					hour,
					value
				};
			}
			return busiest;
		}
		//#endregion
		//#region src/client/core/rows.ts
		function dropEmptyRows(rows, tokensOf) {
			const kept = rows.filter((row) => tokensOf(row) > 0);
			return {
				rows: kept,
				hidden: rows.length - kept.length
			};
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/distribution.module.css.mjs
		const css$10 = ".P_kW7q_page{--dist-body:var(--ku-body,14px);--dist-title:var(--ku-title,17px);font-size:var(--dist-body);flex-direction:column;gap:10px;display:flex}.P_kW7q_focusNote{color:var(--dsw-alias-label-tertiary,#67676f);margin-left:8px}.P_kW7q_panel{border:1px solid var(--dsw-alias-border-l1,#2c2c34);box-sizing:border-box;border-radius:9px;min-width:0;padding:10px 12px}.P_kW7q_panelHead{flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:8px;display:flex}.P_kW7q_panelTitle{color:var(--dsw-alias-label-primary,#e8e8ec);font-size:var(--dist-title);font-weight:600}.P_kW7q_panelNote{color:var(--dsw-alias-label-tertiary,#67676f);font-variant-numeric:tabular-nums;white-space:nowrap;margin-left:auto}.P_kW7q_mekko{border-radius:6px;align-items:stretch;height:132px;display:flex;overflow:hidden}.P_kW7q_mekkoBlock{box-sizing:border-box;flex-direction:column;justify-content:flex-start;align-items:flex-start;gap:3px;min-width:0;padding:8px;display:flex;overflow:hidden}.P_kW7q_mekkoBlockCompact{gap:2px;padding:6px 4px}.P_kW7q_mekkoHead{align-items:baseline;gap:4px;min-width:0;max-width:100%;display:flex}.P_kW7q_mekkoName{text-overflow:ellipsis;white-space:nowrap;min-width:0;max-width:100%;font-weight:600;overflow:hidden}.P_kW7q_mekkoAmount{text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums;opacity:.92;min-width:0;max-width:100%;overflow:hidden}.P_kW7q_mekkoHead .P_kW7q_mekkoAmount{opacity:1;flex:none;font-weight:600}.P_kW7q_mekkoModel{text-overflow:ellipsis;white-space:nowrap;opacity:.92;max-width:100%;overflow:hidden}.P_kW7q_grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));align-items:stretch;gap:10px;display:grid}.P_kW7q_row{grid-template-columns:minmax(76px,112px) minmax(0,1fr) minmax(58px,auto) minmax(56px,auto);align-items:center;gap:8px;padding:4px 0;display:grid}.P_kW7q_rowName{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-secondary,#9a9aa6);overflow:hidden}.P_kW7q_rowTrack{background:var(--dsw-alias-interactive-bg-active,#80808c2e);border-radius:4px;height:9px;overflow:hidden}.P_kW7q_rowFill,.P_kW7q_rowFillTop{background:var(--dsw-alias-state-business-primary,#5b8cff);border-radius:4px;height:100%;display:block}.P_kW7q_rowFill{opacity:.58}.P_kW7q_rowFillTop{opacity:1}.P_kW7q_rowAmount{text-align:right;color:var(--dsw-alias-label-secondary,#9a9aa6);font-variant-numeric:tabular-nums;white-space:nowrap}.P_kW7q_rowMeta{text-align:right;color:var(--dsw-alias-label-tertiary,#67676f);font-variant-numeric:tabular-nums;white-space:nowrap}.P_kW7q_stackBar{border-radius:6px;height:22px;display:flex;overflow:hidden}.P_kW7q_stackOutput,.P_kW7q_stackCache{box-sizing:border-box;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-primary-foreground,#fff);flex-basis:0;justify-content:center;align-items:center;padding:0 6px;display:flex;overflow:hidden}.P_kW7q_stackOutput{background:color-mix(in srgb, var(--dsw-alias-state-business-primary,#5b8cff) 85%, var(--dsw-alias-label-primary,#111))}.P_kW7q_stackCache{background:color-mix(in srgb, var(--dsw-alias-state-success-primary,#3fb96f) 60%, var(--dsw-alias-label-primary,#111))}.P_kW7q_legend{color:var(--dsw-alias-label-secondary,#9a9aa6);flex-wrap:wrap;gap:12px;margin-top:8px;display:flex}.P_kW7q_legend span{font-variant-numeric:tabular-nums;align-items:center;gap:4px;display:inline-flex}.P_kW7q_legendOutput,.P_kW7q_legendCache{border-radius:2px;width:8px;height:8px;display:inline-block}.P_kW7q_legendOutput{background:color-mix(in srgb, var(--dsw-alias-state-business-primary,#5b8cff) 85%, var(--dsw-alias-label-primary,#111))}.P_kW7q_legendCache{background:color-mix(in srgb, var(--dsw-alias-state-success-primary,#3fb96f) 60%, var(--dsw-alias-label-primary,#111))}.P_kW7q_detailsBar{justify-content:flex-end;align-items:center;gap:8px;margin-top:4px;display:flex}.P_kW7q_tables{flex-direction:column;gap:16px;display:flex}.P_kW7q_tableTitle{color:var(--dsw-alias-label-secondary,#9a9aa6);margin-bottom:6px;font-weight:600}";
		const tagId$10 = "dsh-key-usage/distribution.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$10) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$10;
			tag.textContent = css$10;
			document.head.appendChild(tag);
		}
		const cssRegistry$10 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$10.some((e) => e.tagId === tagId$10)) cssRegistry$10.push({
			tagId: tagId$10,
			css: css$10
		});
		var distribution_module_css_default = {
			"detailsBar": "P_kW7q_detailsBar",
			"focusNote": "P_kW7q_focusNote",
			"grid": "P_kW7q_grid",
			"legend": "P_kW7q_legend",
			"legendCache": "P_kW7q_legendCache",
			"legendOutput": "P_kW7q_legendOutput",
			"mekko": "P_kW7q_mekko",
			"mekkoAmount": "P_kW7q_mekkoAmount",
			"mekkoBlock": "P_kW7q_mekkoBlock",
			"mekkoBlockCompact": "P_kW7q_mekkoBlockCompact",
			"mekkoHead": "P_kW7q_mekkoHead",
			"mekkoModel": "P_kW7q_mekkoModel",
			"mekkoName": "P_kW7q_mekkoName",
			"page": "P_kW7q_page",
			"panel": "P_kW7q_panel",
			"panelHead": "P_kW7q_panelHead",
			"panelNote": "P_kW7q_panelNote",
			"panelTitle": "P_kW7q_panelTitle",
			"row": "P_kW7q_row",
			"rowAmount": "P_kW7q_rowAmount",
			"rowFill": "P_kW7q_rowFill",
			"rowFillTop": "P_kW7q_rowFillTop",
			"rowMeta": "P_kW7q_rowMeta",
			"rowName": "P_kW7q_rowName",
			"rowTrack": "P_kW7q_rowTrack",
			"stackBar": "P_kW7q_stackBar",
			"stackCache": "P_kW7q_stackCache",
			"stackOutput": "P_kW7q_stackOutput",
			"tableTitle": "P_kW7q_tableTitle",
			"tables": "P_kW7q_tables"
		};
		//#endregion
		//#region \0dsh-css:src/client/styles/lists.module.css.mjs
		const css$9 = ".ysq2ha_filterBar{flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:14px;display:flex}.ysq2ha_searchInput{border:1px solid var(--dsw-alias-border-l2,#2c2c34);min-width:150px;max-width:220px;color:var(--dsw-alias-label-primary,#e8e8ec);font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.05);box-sizing:border-box;background:0 0;border-radius:8px;flex:0 220px;height:30px;padding:0 10px}.ysq2ha_searchInput::placeholder{color:var(--dsw-alias-label-tertiary,#67676f)}.ysq2ha_searchInput:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px;height:30px}.ysq2ha_listTitle{align-items:center;gap:10px;min-width:0;display:flex}.ysq2ha_listMain{color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600;font-size:calc(var(--dsh-content-font-size,12px) * 1.15);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.ysq2ha_listSub{font-size:calc(var(--dsh-content-font-size,12px) * .96);color:var(--dsw-alias-label-tertiary,#67676f);text-overflow:ellipsis;white-space:nowrap;margin-top:1px;overflow:hidden}.ysq2ha_listBar{background:var(--dsw-alias-interactive-bg-active,#80808c2e);vertical-align:middle;border-radius:3px;width:70px;height:5px;display:inline-block;overflow:hidden}.ysq2ha_listBar>i{border-radius:3px;height:100%;display:block}.ysq2ha_sessionDay td{background:var(--dsw-alias-bg-layer-2,#1d1d22);color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600;font-size:calc(var(--dsh-content-font-size,12px) * 1.1);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);text-align:left!important;padding:8px 10px!important}.ysq2ha_dayCount{color:var(--dsw-alias-label-tertiary,#67676f);font-weight:500;font-size:calc(var(--dsh-content-font-size,12px) * 1.01);margin-left:8px}.ysq2ha_rowArchived td{opacity:.5}.ysq2ha_archivedTag{font-size:calc(var(--dsh-content-font-size,12px) * .92);color:var(--dsw-alias-label-tertiary,#67676f);border:1px solid var(--dsw-alias-border-l2,#2c2c34);border-radius:999px;margin-left:6px;padding:0 6px;font-weight:500}.ysq2ha_subagentTagBtn{font-family:inherit;font-size:calc(var(--dsh-content-font-size,12px) * .92);cursor:pointer;color:var(--dsw-alias-state-business-primary,#5b8cff);border:1px solid var(--dsw-alias-state-business-primary,#5b8cff);background:0 0;border-radius:999px;margin-left:6px;padding:0 6px;font-weight:500;display:inline}.ysq2ha_subagentTagBtn:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c1a)}.ysq2ha_sessionMetaBtn{font-family:inherit;font-size:inherit;color:var(--dsw-alias-label-tertiary,#67676f);cursor:pointer;background:0 0;border:0;margin-left:6px;padding:0}.ysq2ha_sessionMetaBtn:hover{color:var(--dsw-alias-state-business-primary,#5b8cff);text-decoration:underline}.ysq2ha_drawerBack{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.1);cursor:pointer;text-overflow:ellipsis;white-space:nowrap;background:0 0;border-radius:999px;align-items:center;max-width:100%;margin:4px 0 10px;padding:3px 10px;display:inline-flex;overflow:hidden}.ysq2ha_drawerBack:hover{color:var(--dsw-alias-label-primary,#e8e8ec);background:var(--dsw-alias-interactive-bg-hover,#80808c1a)}.ysq2ha_drawerBack:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ysq2ha_subagentBlock{border-top:1px solid var(--dsw-alias-border-l2,#2c2c34);margin-top:14px;padding-top:10px}.ysq2ha_subagentBlockTitle{font-size:calc(var(--dsh-content-font-size,12px) * 1.1);color:var(--dsw-alias-label-secondary,#9a9aa6);margin-bottom:6px}.ysq2ha_subagentRow{text-align:left;width:100%;color:inherit;font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.1);cursor:pointer;background:0 0;border:0;border-radius:6px;justify-content:space-between;gap:10px;padding:4px 6px;display:flex}.ysq2ha_subagentRow:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c1a)}.ysq2ha_subagentRow:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:-2px}.ysq2ha_subagentRowTitle{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.ysq2ha_subagentRowMeta{color:var(--dsw-alias-label-tertiary,#67676f);font-variant-numeric:tabular-nums;flex:none}.ysq2ha_sessionTable{table-layout:fixed}.ysq2ha_sessionTable th:first-child{width:38%}.ysq2ha_sessionTable th:nth-child(2){width:13%}.ysq2ha_sessionTable th:nth-child(3){width:19%}.ysq2ha_sessionTable th:nth-child(4){width:11%}.ysq2ha_sessionTable th:nth-child(5){width:8%}.ysq2ha_sessionTable th:nth-child(6){width:11%}.ysq2ha_modelTable{table-layout:fixed}.ysq2ha_modelTable th:first-child{width:30%}.ysq2ha_modelTable th:nth-child(2){width:9%}.ysq2ha_modelTable th:nth-child(3){width:11%}.ysq2ha_modelTable th:nth-child(4){width:12%}.ysq2ha_modelTable th:nth-child(5){width:9%}.ysq2ha_modelTable th:nth-child(6){width:12%}.ysq2ha_modelTable th:nth-child(7){width:17%}.ysq2ha_projectTable{table-layout:fixed}.ysq2ha_projectTable th:first-child{width:38%}.ysq2ha_projectTable th:nth-child(2){width:10%}.ysq2ha_projectTable th:nth-child(3){width:12%}.ysq2ha_projectTable th:nth-child(4){width:13%}.ysq2ha_projectTable th:nth-child(5){width:12%}.ysq2ha_projectTable th:nth-child(6){width:15%}.ysq2ha_sessionMeta{color:var(--dsw-alias-label-tertiary,#67676f);margin-left:6px}.ysq2ha_linkBtn{font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * .96);text-align:left;color:var(--dsw-alias-label-tertiary,#67676f);cursor:pointer;text-overflow:ellipsis;white-space:nowrap;background:0 0;border:0;max-width:100%;padding:0;overflow:hidden}.ysq2ha_linkBtn:hover{color:var(--dsw-alias-state-business-primary,#5b8cff);text-decoration:underline}.ysq2ha_linkBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ysq2ha_focusChip{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:calc(var(--dsh-content-font-size,12px) * 1.01);border-radius:999px;align-items:center;gap:6px;margin-bottom:10px;padding:3px 10px;display:inline-flex}.ysq2ha_focusClear{color:inherit;font:inherit;cursor:pointer;background:0 0;border:0;padding:0}.ysq2ha_focusClear:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ysq2ha_sessionToggle{font:inherit;color:inherit;cursor:pointer;background:0 0;border:0;flex-shrink:0;justify-content:center;align-items:center;gap:0;padding:0;display:inline-flex}.ysq2ha_sessionToggle:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ysq2ha_sessionToggleArrow{width:11px;color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .83);display:inline-block}.ysq2ha_sessionTitleBtn{min-width:0;font:inherit;font-weight:600;font-size:calc(var(--dsh-content-font-size,12px) * 1.15);color:var(--dsw-alias-label-primary,#e8e8ec);cursor:pointer;text-align:left;text-overflow:ellipsis;white-space:nowrap;background:0 0;border:0;flex:1;padding:0;overflow:hidden}.ysq2ha_sessionTitleBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ysq2ha_composeCell{background:var(--dsw-alias-interactive-bg-hover,#80808c0d);text-align:left!important;padding:4px 10px 10px 30px!important}.ysq2ha_composeRow{font-size:calc(var(--dsh-content-font-size,12px) * 1.05);grid-template-columns:minmax(120px,1.4fr) minmax(60px,.7fr) minmax(90px,1fr) minmax(70px,.8fr);align-items:center;gap:8px;padding:2px 0;display:grid}.ysq2ha_composeHead{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .96)}.ysq2ha_composeName{color:var(--dsw-alias-label-primary,#e8e8ec);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.ysq2ha_composeChannel{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .96);margin-left:6px}.ysq2ha_composeNumber{text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9a9aa6)}.ysq2ha_moreRow{align-items:center;gap:10px;margin-top:12px;display:flex}.ysq2ha_moreBtn{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.05);cursor:pointer;background:0 0;border-radius:999px;padding:4px 14px}.ysq2ha_moreBtn:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.ysq2ha_moreBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ysq2ha_moreText{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * 1.01)}.ysq2ha_drawerMask{z-index:9000;background:var(--dsw-alias-bg-mask-1,#00000061);justify-content:flex-end;display:flex;position:fixed;top:0;bottom:0;left:0;right:0}.ysq2ha_drawerPanel{box-sizing:border-box;background:var(--dsw-alias-bg-layer-2,#1d1d22);border-left:1px solid var(--dsw-alias-border-l1,#2c2c34);width:min(880px,96vw);height:100%;box-shadow:var(--dsw-shadow-lv2,0 8px 24px #00000059);padding:14px 20px 32px;overflow-y:auto}.ysq2ha_drawerHead{align-items:flex-start;gap:10px;display:flex}.ysq2ha_drawerTitle{min-width:0;font-size:calc(var(--dsh-content-font-size,12px) * 1.38);color:var(--dsw-alias-label-primary,#e8e8ec);overflow-wrap:anywhere;flex:1;font-weight:650}.ysq2ha_drawerClose{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);width:26px;height:26px;font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.1);cursor:pointer;background:0 0;border-radius:8px;flex-shrink:0;line-height:1}.ysq2ha_drawerClose:hover{color:var(--dsw-alias-label-primary,#e8e8ec);background:var(--dsw-alias-interactive-bg-hover,#80808c1a)}.ysq2ha_drawerClose:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ysq2ha_drawerId{font-family:ui-monospace,Consolas,monospace;font-size:calc(var(--dsh-content-font-size,12px) * .96);color:var(--dsw-alias-label-tertiary,#67676f);overflow-wrap:anywhere;margin:2px 0 12px}.ysq2ha_detailGrid{grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px 16px;display:grid}.ysq2ha_detailItemWide{grid-column:1/-1}.ysq2ha_detailItemLabel{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .96)}.ysq2ha_detailItemValue{color:var(--dsw-alias-label-primary,#e8e8ec);font-size:calc(var(--dsh-content-font-size,12px) * 1.1);font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.ysq2ha_detailItemNote{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .92)}.ysq2ha_detailStrip{border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:10px;grid-template-columns:repeat(auto-fit,minmax(84px,1fr));gap:8px 12px;margin:12px 0 4px;padding:10px 12px;display:grid}.ysq2ha_detailBlock{margin-top:16px}.ysq2ha_detailBody{grid-template-columns:repeat(2,minmax(0,1fr));gap:0 20px;display:grid}.ysq2ha_detailBody>.ysq2ha_detailGrid,.ysq2ha_detailBody>.ysq2ha_detailStrip,.ysq2ha_detailBody>.ysq2ha_detailBlock{grid-column:1/-1}.ysq2ha_detailBody>.ysq2ha_detailColLeft{grid-column:1}.ysq2ha_detailBody>.ysq2ha_detailColRight{grid-column:2}.ysq2ha_detailBlockTitle{color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:calc(var(--dsh-content-font-size,12px) * 1.05);margin-bottom:6px;font-weight:600}.ysq2ha_detailCost{font-size:calc(var(--dsh-content-font-size,12px) * 1.19);color:var(--dsw-alias-label-primary,#e8e8ec);font-variant-numeric:tabular-nums;flex-wrap:wrap;align-items:center;gap:8px;display:flex}.ysq2ha_detailCostHint{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * 1.01)}.ysq2ha_promptText{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--dsw-alias-interactive-bg-hover,#80808c0f);max-height:220px;color:var(--dsw-alias-label-primary,#e8e8ec);font-size:calc(var(--dsh-content-font-size,12px) * 1.1);border-radius:8px;padding:8px 10px;line-height:1.6;overflow-y:auto}.ysq2ha_sessionDetailModelTable{table-layout:fixed}.ysq2ha_sessionDetailModelTable th:first-child{width:40%}.ysq2ha_sessionDetailModelTable th:nth-child(2){width:18%}.ysq2ha_sessionDetailModelTable th:nth-child(3){width:24%}.ysq2ha_sessionDetailModelTable th:nth-child(4){width:18%}.ysq2ha_hourChart{align-items:flex-end;gap:2px;height:84px;margin-top:6px;display:flex}.ysq2ha_hourBar{flex-direction:column;flex:1;justify-content:flex-end;gap:2px;height:100%;display:flex}.ysq2ha_hourBarFill{background:var(--dsw-alias-state-business-primary,#5b8cff);border-radius:2px 2px 0 0;min-height:0;display:block}.ysq2ha_hourBarTick{text-align:center;font-size:calc(var(--dsh-content-font-size,12px) * .83);color:var(--dsw-alias-label-tertiary,#67676f)}";
		const tagId$9 = "dsh-key-usage/lists.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$9) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$9;
			tag.textContent = css$9;
			document.head.appendChild(tag);
		}
		const cssRegistry$9 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$9.some((e) => e.tagId === tagId$9)) cssRegistry$9.push({
			tagId: tagId$9,
			css: css$9
		});
		var lists_module_css_default = {
			"archivedTag": "ysq2ha_archivedTag",
			"composeCell": "ysq2ha_composeCell",
			"composeChannel": "ysq2ha_composeChannel",
			"composeHead": "ysq2ha_composeHead",
			"composeName": "ysq2ha_composeName",
			"composeNumber": "ysq2ha_composeNumber",
			"composeRow": "ysq2ha_composeRow",
			"dayCount": "ysq2ha_dayCount",
			"detailBlock": "ysq2ha_detailBlock",
			"detailBlockTitle": "ysq2ha_detailBlockTitle",
			"detailBody": "ysq2ha_detailBody",
			"detailColLeft": "ysq2ha_detailColLeft",
			"detailColRight": "ysq2ha_detailColRight",
			"detailCost": "ysq2ha_detailCost",
			"detailCostHint": "ysq2ha_detailCostHint",
			"detailGrid": "ysq2ha_detailGrid",
			"detailItemLabel": "ysq2ha_detailItemLabel",
			"detailItemNote": "ysq2ha_detailItemNote",
			"detailItemValue": "ysq2ha_detailItemValue",
			"detailItemWide": "ysq2ha_detailItemWide",
			"detailStrip": "ysq2ha_detailStrip",
			"drawerBack": "ysq2ha_drawerBack",
			"drawerClose": "ysq2ha_drawerClose",
			"drawerHead": "ysq2ha_drawerHead",
			"drawerId": "ysq2ha_drawerId",
			"drawerMask": "ysq2ha_drawerMask",
			"drawerPanel": "ysq2ha_drawerPanel",
			"drawerTitle": "ysq2ha_drawerTitle",
			"filterBar": "ysq2ha_filterBar",
			"focusChip": "ysq2ha_focusChip",
			"focusClear": "ysq2ha_focusClear",
			"hourBar": "ysq2ha_hourBar",
			"hourBarFill": "ysq2ha_hourBarFill",
			"hourBarTick": "ysq2ha_hourBarTick",
			"hourChart": "ysq2ha_hourChart",
			"linkBtn": "ysq2ha_linkBtn",
			"listBar": "ysq2ha_listBar",
			"listMain": "ysq2ha_listMain",
			"listSub": "ysq2ha_listSub",
			"listTitle": "ysq2ha_listTitle",
			"modelTable": "ysq2ha_modelTable",
			"moreBtn": "ysq2ha_moreBtn",
			"moreRow": "ysq2ha_moreRow",
			"moreText": "ysq2ha_moreText",
			"projectTable": "ysq2ha_projectTable",
			"promptText": "ysq2ha_promptText",
			"rowArchived": "ysq2ha_rowArchived",
			"searchInput": "ysq2ha_searchInput",
			"sessionDay": "ysq2ha_sessionDay",
			"sessionDetailModelTable": "ysq2ha_sessionDetailModelTable",
			"sessionMeta": "ysq2ha_sessionMeta",
			"sessionMetaBtn": "ysq2ha_sessionMetaBtn",
			"sessionTable": "ysq2ha_sessionTable",
			"sessionTitleBtn": "ysq2ha_sessionTitleBtn",
			"sessionToggle": "ysq2ha_sessionToggle",
			"sessionToggleArrow": "ysq2ha_sessionToggleArrow",
			"subagentBlock": "ysq2ha_subagentBlock",
			"subagentBlockTitle": "ysq2ha_subagentBlockTitle",
			"subagentRow": "ysq2ha_subagentRow",
			"subagentRowMeta": "ysq2ha_subagentRowMeta",
			"subagentRowTitle": "ysq2ha_subagentRowTitle",
			"subagentTagBtn": "ysq2ha_subagentTagBtn"
		};
		//#endregion
		//#region \0dsh-css:src/client/styles/pricing.module.css.mjs
		const css$8 = ".aymcxa_sourceChip{font-size:calc(var(--dsh-content-font-size,12px) * .92);vertical-align:baseline;white-space:nowrap;border:1px solid;border-radius:999px;margin-left:4px;padding:0 6px;line-height:1.7;display:inline-block}.aymcxa_sourceAggregate{color:var(--dsw-alias-label-tertiary,#67676f);border-style:dashed}.aymcxa_sourcePartial{color:var(--dsw-alias-label-secondary,#9a9aa2);border-bottom:1px dotted}.aymcxa_sourceModel{color:var(--dsw-alias-state-warn-primary,#e0a13c)}";
		const tagId$8 = "dsh-key-usage/pricing.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$8) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$8;
			tag.textContent = css$8;
			document.head.appendChild(tag);
		}
		const cssRegistry$8 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$8.some((e) => e.tagId === tagId$8)) cssRegistry$8.push({
			tagId: tagId$8,
			css: css$8
		});
		var pricing_module_css_default = {
			"sourceAggregate": "aymcxa_sourceAggregate",
			"sourceChip": "aymcxa_sourceChip",
			"sourceModel": "aymcxa_sourceModel",
			"sourcePartial": "aymcxa_sourcePartial"
		};
		//#endregion
		//#region src/client/components/CostSourceChip.tsx
		function CostSourceChip(props) {
			if (props.source === "official" || props.source === "catalog" || props.source === "model") return null;
			const source = props.source ?? "none";
			if (source === "none") return null;
			const partial = props.partial === true;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: pricing_module_css_default.sourceChip + " " + sourceClass(source),
				title: costSourceHintOf(source, partial),
				children: [costSourceLabelOf(source, t), partial && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: pricing_module_css_default.sourcePartial,
					children: t("part.suffix")
				})]
			});
		}
		function sourceClass(source) {
			if (source === "aggregate") return pricing_module_css_default.sourceAggregate;
			return pricing_module_css_default.sourceModel;
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/export.module.css.mjs
		const css$7 = ".-\\38 z9vG_exportGroup{align-items:center;gap:6px;margin-left:auto;display:inline-flex}.-\\38 z9vG_exportBtn{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);box-sizing:border-box;height:30px;font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.05);cursor:pointer;white-space:nowrap;background:0 0;border-radius:8px;padding:0 10px}.-\\38 z9vG_exportBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.-\\38 z9vG_exportBtn:disabled{opacity:.5;cursor:default}.-\\38 z9vG_exportBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}";
		const tagId$7 = "dsh-key-usage/export.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$7) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$7;
			tag.textContent = css$7;
			document.head.appendChild(tag);
		}
		const cssRegistry$7 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$7.some((e) => e.tagId === tagId$7)) cssRegistry$7.push({
			tagId: tagId$7,
			css: css$7
		});
		var export_module_css_default = {
			"exportBtn": "-8z9vG_exportBtn",
			"exportGroup": "-8z9vG_exportGroup"
		};
		//#endregion
		//#region src/client/tabs/ModelsTab.tsx
		/** 按模型：`provider + model` 聚合的用量与估算成本（数据来自宿主会话事件折叠）。 */
		const MODELS_PATH = "/dsh-key-usage/models";
		/** 导出列：取原始数值（金额、命中率不带单位），方便直接进表格做计算。 */
		const EXPORT_COLUMNS$1 = [
			{
				key: "provider",
				labelKey: "m.channelId",
				value: (row) => row.provider
			},
			{
				key: "providerLabel",
				labelKey: "common.channel",
				value: (row) => row.providerLabel
			},
			{
				key: "model",
				labelKey: "m.model",
				value: (row) => row.model
			},
			{
				key: "calls",
				labelKey: "common.calls",
				value: (row) => row.calls
			},
			{
				key: "tokens",
				label: "Tokens",
				value: (row) => row.tokens
			},
			{
				key: "inputTokens",
				labelKey: "c.input",
				value: (row) => row.buckets.inputTokens
			},
			{
				key: "outputTokens",
				labelKey: "c.output",
				value: (row) => row.buckets.outputTokens
			},
			{
				key: "cacheReadTokens",
				labelKey: "c.cacheRead",
				value: (row) => row.buckets.cacheReadTokens
			},
			{
				key: "cacheHitRate",
				labelKey: "c.hitRate",
				value: (row) => row.cacheHitRate
			},
			{
				key: "cost",
				labelKey: "c.costNative",
				value: (row) => row.cost
			},
			{
				key: "costSource",
				labelKey: "s.costSource",
				value: (row) => row.costSource === void 0 ? null : row.costSource
			},
			{
				key: "costMode",
				labelKey: "d.costMode",
				value: (row) => row.costMode
			},
			{
				key: "sessionCount",
				labelKey: "m.sessions",
				value: (row) => row.sessionCount
			},
			{
				key: "lastTime",
				labelKey: "m.lastActive",
				value: (row) => fmtDateTime(row.lastTime)
			}
		];
		function ModelsTab(props) {
			/** 取词：宿主切语言时重渲染 */
			const t = useT();
			const [query, setQuery] = (0, react.useState)("");
			const [channelFilter, setChannelFilter] = (0, react.useState)("ALL");
			const [sortKey, setSortKey] = (0, react.useState)("tokensDesc");
			const [nowMs] = (0, react.useState)(() => Date.now());
			const rows = props.data?.rows ?? [];
			const focusModel = props.focusModel ?? null;
			const focusProvider = props.focusProvider ?? null;
			const visible = (0, react.useMemo)(() => {
				const keyword = query.trim().toLowerCase();
				const filtered = dropEmptyRows(rows, (row) => row.tokens).rows.filter((row) => {
					const haystack = (row.model + " " + row.provider + " " + row.providerLabel).toLowerCase();
					const matchesQuery = keyword === "" || haystack.includes(keyword);
					const matchesChannel = channelFilter === "ALL" || row.provider === channelFilter;
					const matchesFocusModel = focusModel === null || row.provider + "|" + row.model === focusModel;
					const matchesFocusProvider = focusProvider === null || row.provider === focusProvider;
					return matchesQuery && matchesChannel && matchesFocusModel && matchesFocusProvider;
				});
				const sorters = {
					tokensDesc: (first, second) => second.tokens - first.tokens,
					callsDesc: (first, second) => second.calls - first.calls,
					costDesc: (first, second) => (second.cost ?? 0) - (first.cost ?? 0),
					recent: (first, second) => (second.lastTime ?? 0) - (first.lastTime ?? 0)
				};
				return [...filtered].sort(sorters[sortKey]);
			}, [
				rows,
				query,
				channelFilter,
				sortKey,
				focusModel,
				focusProvider
			]);
			const totalTokens = rows.reduce((total, row) => total + row.tokens, 0);
			dropEmptyRows(rows, (row) => row.tokens).hidden;
			/** 导出当前筛选与排序后的行（JSON 取整行，CSV 按固定列映射）。 */
			const exportRows = (format) => {
				if (format === "csv") downloadFile(exportFileName("models", "csv"), toCsv(visible, EXPORT_COLUMNS$1), CSV_MIME);
				else downloadFile(exportFileName("models", "json"), toJson(visible), JSON_MIME);
			};
			if (props.data === null) {
				const reason = failureReasonOf(MODELS_PATH);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.empty,
					children: reason === null ? t("m.loading") : t("m.unavailable") + reason
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				props.data.coverage.status !== "complete" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.warning,
					children: coverageText$1(props.data.coverage.status, props.data.coverage.skippedSessions)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.filterBar,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: lists_module_css_default.searchInput,
							placeholder: t("m.search"),
							value: query,
							onChange: (event) => setQuery(event.target.value)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Select, {
							ariaLabel: t("s.filterChannel"),
							value: channelFilter,
							onChange: setChannelFilter,
							options: [{
								value: "ALL",
								labelKey: "s.allChannels"
							}, ...props.channels.map((channel) => ({
								value: channel.provider,
								label: channel.displayName
							}))]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Select, {
							ariaLabel: t("s.sort"),
							value: sortKey,
							onChange: (next) => setSortKey(next),
							options: [
								{
									value: "tokensDesc",
									labelKey: "s.sortTokensDesc"
								},
								{
									value: "callsDesc",
									labelKey: "s.sortCalls"
								},
								{
									value: "costDesc",
									labelKey: "s.sortCost"
								},
								{
									value: "recent",
									labelKey: "m.lastActive"
								}
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: export_module_css_default.exportGroup,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								size: "sm",
								disabled: visible.length === 0,
								onClick: () => exportRows("csv"),
								children: t("export.csv")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								size: "sm",
								disabled: visible.length === 0,
								onClick: () => exportRows("json"),
								children: t("export.json")
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: ui_module_css_default.tableScroll,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						className: shared_module_css_default.table + " " + lists_module_css_default.modelTable,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("m.model") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("common.calls") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "Tokens" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("m.share") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("d.hitRate") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("c.cost") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("m.lastActive") })
						] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tbody", { children: [visible.map((row) => {
							const percent = totalTokens > 0 ? Math.round(row.tokens / totalTokens * 100) : 0;
							const channel = channelOf(props.channels, row.provider);
							const costCell = costCellOf(channel, row);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: lists_module_css_default.listTitle,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: lists_module_css_default.listMain,
										children: row.model === "" ? t("m.others") : row.model
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: lists_module_css_default.listSub,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: shared_module_css_default.statusDot,
												style: {
													background: channelColorOf(props.channels, row.provider),
													marginRight: 4
												}
											}),
											row.providerLabel,
											" · ",
											row.sessionCount,
											t("common.sessionSuffix")
										]
									})] })
								}) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtCalls(row.calls) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(row.tokens) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: lists_module_css_default.listBar,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: {
											width: Math.max(2, percent) + "%",
											background: channelColorOf(props.channels, row.provider)
										} })
									}),
									" ",
									percent,
									"%"
								] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.cacheHitRate === null ? "—" : row.cacheHitRate.toFixed(1) + "%" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.cost === null || channel?.costMode !== "perToken" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: shared_module_css_default.dim,
									children: costCell.text
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [costCell.text, costCell.amount && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostSourceChip, {
									source: row.costSource,
									partial: row.partial
								})] }) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtRelative(row.lastTime, nowMs) })
							] }, row.provider + "|" + row.model);
						}), visible.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							colSpan: 7,
							className: shared_module_css_default.empty,
							children: t("m.empty")
						}) })] })]
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.statExtra,
					children: props.data.priced ? "" : t("s.noCost")
				})
			] });
		}
		function coverageText$1(status, skipped) {
			if (status === "unavailable") return t("s.unavailable");
			return t("s.partial") + String(skipped) + t("s.partialTail");
		}
		//#endregion
		//#region src/client/tabs/ProjectsTab.tsx
		/** 项目用量：按会话工作目录聚合。 */
		/** 导出列：成本与命中率都给原始数值，方便在表格里继续算。 */
		const EXPORT_COLUMNS = [
			{
				key: "workspace",
				labelKey: "p.path",
				value: (row) => row.workspace === "" ? (row.paths ?? []).join(" / ") : row.workspace
			},
			{
				key: "dominantProvider",
				labelKey: "p.mainChannel",
				value: (row) => row.dominantProvider
			},
			{
				key: "calls",
				labelKey: "common.calls",
				value: (row) => row.calls
			},
			{
				key: "tokens",
				label: "Tokens",
				value: (row) => row.tokens
			},
			{
				key: "cacheHitRate",
				labelKey: "c.hitRate",
				value: (row) => row.cacheHitRate
			},
			{
				key: "cost",
				labelKey: "c.costNative",
				value: (row) => row.cost
			},
			{
				key: "costSource",
				labelKey: "s.costSource",
				value: (row) => row.costSource === void 0 ? null : row.costSource
			},
			{
				key: "sessionCount",
				labelKey: "m.sessions",
				value: (row) => row.sessionCount
			},
			{
				key: "archivedSessionCount",
				labelKey: "p.archivedSessions",
				value: (row) => row.archivedSessionCount
			},
			{
				key: "lastTime",
				labelKey: "m.lastActive",
				value: (row) => fmtDateTime(row.lastTime)
			}
		];
		function ProjectsTab(props) {
			/** 取词：宿主切语言时重渲染 */
			const t = useT();
			const [query, setQuery] = (0, react.useState)("");
			const [channelFilter, setChannelFilter] = (0, react.useState)("ALL");
			const [sortKey, setSortKey] = (0, react.useState)("recent");
			const [nowMs] = (0, react.useState)(() => Date.now());
			/** 「未归入工作区」那行的目录展开（那一行是多个目录合并出来的）。 */
			const [orphanOpen, setOrphanOpen] = (0, react.useState)(false);
			const rows = props.data?.rows ?? [];
			const focusWorkspace = props.focusWorkspace ?? null;
			const focusProvider = props.focusProvider ?? null;
			const visible = (0, react.useMemo)(() => {
				const keyword = query.trim().toLowerCase();
				const filtered = dropEmptyRows(rows, (row) => row.tokens).rows.filter((row) => {
					const paths = row.paths ?? [row.workspace];
					const matchesQuery = keyword === "" || row.workspace.toLowerCase().includes(keyword) || (row.workspaceTitle ?? "").toLowerCase().includes(keyword) || paths.some((path) => path.toLowerCase().includes(keyword));
					const matchesChannel = channelFilter === "ALL" || row.providers[channelFilter] !== void 0;
					const matchesFocus = focusWorkspace === null || row.workspace === focusWorkspace || paths.includes(focusWorkspace);
					const matchesFocusProvider = focusProvider === null || row.providers[focusProvider] !== void 0;
					return matchesQuery && matchesChannel && matchesFocus && matchesFocusProvider;
				});
				const sorters = {
					recent: (first, second) => (second.lastTime ?? 0) - (first.lastTime ?? 0),
					tokensDesc: (first, second) => second.tokens - first.tokens,
					tokensAsc: (first, second) => first.tokens - second.tokens,
					callsDesc: (first, second) => second.calls - first.calls
				};
				return [...filtered].sort(sorters[sortKey]);
			}, [
				rows,
				query,
				channelFilter,
				sortKey,
				focusWorkspace,
				focusProvider
			]);
			const totalTokens = rows.reduce((total, row) => total + row.tokens, 0);
			dropEmptyRows(rows, (row) => row.tokens).hidden;
			/** 导出当前筛选与排序后的项目行（JSON 取整行，CSV 按固定列映射）。 */
			const exportRows = (format) => {
				if (format === "csv") downloadFile(exportFileName("projects", "csv"), toCsv(visible, EXPORT_COLUMNS), CSV_MIME);
				else downloadFile(exportFileName("projects", "json"), toJson(visible), JSON_MIME);
			};
			if (props.data === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shared_module_css_default.empty,
				children: t("s.loading")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				props.data.coverage.status !== "complete" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.warning,
					children: coverageText(props.data.coverage.status, props.data.coverage.skippedSessions)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.filterBar,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: lists_module_css_default.searchInput,
							placeholder: t("p.search"),
							value: query,
							onChange: (event) => setQuery(event.target.value)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Select, {
							ariaLabel: t("s.filterChannel"),
							value: channelFilter,
							onChange: setChannelFilter,
							options: [{
								value: "ALL",
								labelKey: "s.allChannels"
							}, ...props.channels.map((channel) => ({
								value: channel.provider,
								label: channel.displayName
							}))]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Select, {
							ariaLabel: t("s.sort"),
							value: sortKey,
							onChange: (next) => setSortKey(next),
							options: [
								{
									value: "recent",
									labelKey: "m.lastActive"
								},
								{
									value: "tokensDesc",
									labelKey: "s.sortTokensDesc"
								},
								{
									value: "tokensAsc",
									labelKey: "s.sortTokensAsc"
								},
								{
									value: "callsDesc",
									labelKey: "s.sortCalls"
								}
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: export_module_css_default.exportGroup,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								size: "sm",
								disabled: visible.length === 0,
								onClick: () => exportRows("csv"),
								children: t("export.csv")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								size: "sm",
								disabled: visible.length === 0,
								onClick: () => exportRows("json"),
								children: t("export.json")
							})]
						})
					]
				}),
				focusWorkspace !== null && props.hideFocusChip !== true && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.focusChip,
					children: [
						t("p.focusPrefix"),
						focusWorkspace,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: lists_module_css_default.focusClear,
							onClick: () => props.onClearFocus?.(),
							"aria-label": t("p.clearFilter"),
							children: "✕"
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: ui_module_css_default.tableScroll,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						className: shared_module_css_default.table + " " + lists_module_css_default.projectTable,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("p.project") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("common.calls") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "Tokens" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("m.share") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("c.cost") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("m.lastActive") })
						] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tbody", { children: [visible.map((row) => {
							const percent = totalTokens > 0 ? Math.round(row.tokens / totalTokens * 100) : 0;
							const dominant = row.dominantProvider;
							const channel = channelOf(props.channels, dominant);
							const costCell = costCellOf(channel, row);
							const paths = row.paths ?? [row.workspace];
							const isOrphan = row.registered === false;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: lists_module_css_default.listTitle,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: lists_module_css_default.listMain,
										children: row.workspaceTitle ?? (isOrphan ? t("p.orphan") : baseNameOf(row.workspace))
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: lists_module_css_default.listSub,
										title: paths.join("\n"),
										children: [
											isOrphan ? t("p.orphanHint", { count: paths.length }) : row.workspace,
											" · ",
											row.sessionCount,
											t("common.sessionSuffix"),
											row.archivedSessionCount > 0 ? t("p.archivePrefix") + row.archivedSessionCount + t("p.archiveSuffix") : "",
											isOrphan && paths.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: lists_module_css_default.linkBtn,
												onClick: () => setOrphanOpen(!orphanOpen),
												children: orphanOpen ? t("p.pathsClose") : t("p.pathsOpen")
											})
										]
									})] })
								}) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtCalls(row.calls) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(row.tokens) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: lists_module_css_default.listBar,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: {
											width: Math.max(2, percent) + "%",
											background: channelColorOf(props.channels, dominant ?? "")
										} })
									}),
									" ",
									percent,
									"%"
								] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.cost === null || channel?.costMode === "sub" || channel?.costMode === "free" || channel?.costMode === "none" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: shared_module_css_default.dim,
									children: costCell.text
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [costCell.text, costCell.amount && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostSourceChip, {
									source: row.costSource,
									partial: row.partial
								})] }) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtRelative(row.lastTime, nowMs) })
							] }), isOrphan && orphanOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								colSpan: 6,
								className: shared_module_css_default.pathsCell,
								children: paths.map((path) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: shared_module_css_default.pathLine,
									children: path
								}, path))
							}) })] }, row.workspace === "" ? "orphan" : row.workspace);
						}), visible.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							colSpan: 6,
							className: shared_module_css_default.empty,
							children: focusWorkspace === null ? t("p.empty") : t("p.noUsage")
						}) })] })]
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: shared_module_css_default.statExtra })
			] });
		}
		function coverageText(status, skipped) {
			if (status === "unavailable") return t("s.unavailable");
			return t("s.partial") + String(skipped) + t("s.partialTail");
		}
		function baseNameOf(path) {
			const parts = path.replace(/[\\/]+$/, "").split(/[\\/]/);
			return parts[parts.length - 1] === "" ? path : parts[parts.length - 1];
		}
		//#endregion
		//#region src/client/tabs/DistributionTab.tsx
		/**
		* 分布：项目 × 模型（Mekko 成本占比）、缓存节省、Token 构成、通道成本；明细表默认收起。
		* 金额一律走 `currency.ts` 的收口函数；颜色只用宿主 `--dsw-alias-*` 令牌。
		*/
		/** 最多单列几个项目，其余并成一块「其它」：再切下去字只会互相挤。 */
		const MAX_PROJECT_BLOCKS = 5;
		/** 缓存节省 / 通道成本各最多几行（含「其它」）：与原型两张卡片的高度对齐。 */
		const MAX_CACHE_ROWS = 4;
		const MAX_CHANNEL_ROWS = 3;
		/** 排行条的可见下限（2%），0 宽度的条看起来像没渲染。 */
		const MIN_BAR_PERCENT$1 = 2;
		/** 块宽低于这个百分比只留名字：金额放进去会溢出。 */
		const TINY_BLOCK_PERCENT = 2.5;
		/** 块宽达到这个百分比才把「名字 + 金额」放在同一行，并腾出空间写逐模型占比。 */
		const WIDE_BLOCK_PERCENT = 20;
		/** 宽块里列几个模型：前二已经能说明「钱花在哪个模型上」，第三行起放不下。 */
		const MAX_BLOCK_MODELS = 2;
		/**
		* 项目块配色：按成本排名轮换。每个色都与 `label-primary` 混合 —— 亮色主题里压暗、暗色主题里提亮，
		* 这样配 `label-primary-foreground`（亮色主题白、暗色主题黑）始终可读；色相仍来自宿主状态色。
		*/
		const PROJECT_COLORS = [
			"color-mix(in srgb, var(--dsw-alias-state-business-primary, #5b8cff) 85%, var(--dsw-alias-label-primary, #111))",
			"color-mix(in srgb, var(--dsw-alias-state-warn-primary, #e0a13c) 60%, var(--dsw-alias-label-primary, #111))",
			"color-mix(in srgb, var(--dsw-alias-state-success-primary, #3fb96f) 60%, var(--dsw-alias-label-primary, #111))",
			"color-mix(in srgb, var(--dsw-alias-state-error-primary, #e05a5a) 60%, var(--dsw-alias-label-primary, #111))",
			"color-mix(in srgb, var(--dsw-alias-state-business-primary, #5b8cff) 55%, var(--dsw-alias-label-primary, #111))"
		];
		/** 成本来源强弱：聚合行取最弱的那一格（与价目层的强弱序一致）。 */
		const SOURCE_ORDER = {
			official: 0,
			catalog: 1,
			aggregate: 2,
			model: 3,
			none: 4
		};
		/** 「其它」块 / 合并行用中性底色，避免被误读成某个通道。 */
		const OTHERS_BG = "var(--dsw-alias-interactive-bg-active, rgba(128, 128, 140, .22))";
		function DistributionTab(props) {
			const t = useT();
			const [tableOpen, setTableOpen] = (0, react.useState)(false);
			const externalProject = props.projectFilter ?? "";
			const modelFilter = props.modelFilter ?? "";
			const noProjectSelection = selectionOf(externalProject).length === 0;
			const noModelSelection = selectionOf(modelFilter).length === 0;
			const focusWorkspace = noProjectSelection ? props.focusWorkspace ?? null : null;
			/** 内部联动 / 全局筛选各自的项目命中：项目行按 workspace 与覆盖目录匹配 */
			const projectMatches = (row) => noProjectSelection ? focusWorkspace === null || selectionMatches(projectFilterValuesOf(row.workspace, row.paths), focusWorkspace) : selectionMatches(projectFilterValuesOf(row.workspace, row.paths), externalProject);
			const projectRows = dropEmptyRows(props.projects?.rows ?? [], (row) => row.tokens).rows;
			const allModelRows = dropEmptyRows(props.models?.rows ?? [], (row) => row.tokens).rows;
			/** 模型维度（缓存节省 / Token 构成 / 通道成本）按全局模型筛选收窄；金额与占比都在各自面板内重算 */
			const modelRows = noModelSelection ? allModelRows : allModelRows.filter((row) => selectionMatches([row.model], modelFilter));
			const scopedProjects = projectRows.filter(projectMatches);
			/** Mekko 的项目块：有模型筛选时每个项目只留选中模型的用量，块宽 / 金额 / 逐模型占比一起重算 */
			const mekkoProjects = noModelSelection ? scopedProjects : scopedProjects.map((row) => projectOfModel(row, modelFilter)).filter((row) => row !== null);
			const cacheUsage = noModelSelection ? props.usage ?? null : null;
			const coverage = props.projects?.coverage ?? props.models?.coverage;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: distribution_module_css_default.page,
				children: [
					noProjectSelection && focusWorkspace !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lists_module_css_default.focusChip,
						children: [
							t("p.focusPrefix"),
							focusWorkspace,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: distribution_module_css_default.focusNote,
								children: t("dist.focusScope")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: lists_module_css_default.focusClear,
								onClick: () => props.onClearFocus?.(),
								"aria-label": t("p.clearFilter"),
								children: "✕"
							})
						]
					}),
					!tableOpen && coverage !== void 0 && coverage.status !== "complete" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shared_module_css_default.warning,
						children: coverageTextOf(coverage)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MekkoPanel, {
						projects: mekkoProjects,
						loading: props.projects === null
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: distribution_module_css_default.grid,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CacheSavingsPanel, {
								models: modelRows,
								usage: cacheUsage,
								loading: props.models === null
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostMixPanel, {
								models: modelRows,
								loading: props.models === null
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChannelCostPanel, {
								models: modelRows,
								channels: props.channels,
								loading: props.models === null
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: distribution_module_css_default.detailsBar,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							size: "sm",
							active: tableOpen,
							onClick: () => setTableOpen(!tableOpen),
							children: tableOpen ? t("dist.hideTable") : t("dist.showTable")
						})
					}),
					tableOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: distribution_module_css_default.tables,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: distribution_module_css_default.tableTitle,
							children: t("dist.modelsDetails")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelsTab, {
							data: props.models === null ? null : {
								...props.models,
								rows: modelRows
							},
							channels: props.channels
						})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: distribution_module_css_default.tableTitle,
							children: t("dist.projectsDetails")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProjectsTab, {
							data: props.projects === null ? null : {
								...props.projects,
								rows: scopedProjects
							},
							channels: props.channels,
							focusWorkspace,
							hideFocusChip: true,
							onClearFocus: () => props.onClearFocus?.()
						})] })]
					})
				]
			});
		}
		/** 聚合行取最弱的成本来源（与 DetailTab 同一口径，避免明细表里的来源角标与金额对不上）。 */
		function weakestSourceOf(sources) {
			let weakest = null;
			for (const source of sources) if (weakest === null || SOURCE_ORDER[source] > SOURCE_ORDER[weakest]) weakest = source;
			return weakest;
		}
		/**
		* 项目行按模型收窄（只给 Mekko 用）：模型桶只留该模型，tokens / calls / 金额按剩下的桶重算。
		* 金额只在每个桶都有价目时才给数（缺一个就 null → 该块不参与占比，不拿部分金额冒充合计）；
		* 该项目没有这个模型的用量时返回 null（整块不进 Mekko）。
		*/
		function projectOfModel(row, modelFilter) {
			const models = (row.models ?? []).filter((entry) => selectionMatches([entry.model], modelFilter));
			if (models.length === 0) return null;
			const costsByCurrency = {};
			const sources = [];
			let calls = 0;
			let tokens = 0;
			let cost = 0;
			let priced = true;
			let partial = false;
			let hasCurrency = true;
			for (const entry of models) {
				calls += entry.calls;
				tokens += entry.tokens;
				if (typeof entry.cost === "number" && Number.isFinite(entry.cost)) cost += entry.cost;
				else priced = false;
				const byCurrency = entry.costsByCurrency ?? {};
				if (Object.keys(byCurrency).length === 0) hasCurrency = false;
				for (const [currency, amount] of Object.entries(byCurrency)) if (typeof amount === "number" && Number.isFinite(amount)) costsByCurrency[currency] = (costsByCurrency[currency] ?? 0) + amount;
				if (entry.costSource !== void 0) sources.push(entry.costSource);
				if (entry.partial === true) partial = true;
			}
			const costSource = weakestSourceOf(sources);
			return {
				...row,
				calls,
				tokens,
				models,
				cost: priced ? cost : null,
				cacheHitRate: null,
				costSource: costSource ?? void 0,
				partial,
				...priced && hasCurrency ? { costsByCurrency } : { costsByCurrency: void 0 }
			};
		}
		/** 项目 × 模型：块宽 = 该项目成本占总成本比例；宽块写前二模型占比，窄块只留名字 / 金额。 */
		function MekkoPanel(props) {
			const t = useT();
			const blocks = mekkoBlocksOf(props.projects);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: distribution_module_css_default.panel,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: distribution_module_css_default.panelHead,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: distribution_module_css_default.panelTitle,
						children: t("dist.projectModel")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: distribution_module_css_default.panelNote,
						children: t("dist.totalCost")
					})]
				}), blocks.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.empty,
					children: props.loading ? t("s.loading") : t("s.noCost")
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: distribution_module_css_default.mekko,
					children: blocks.map((block, index) => {
						const wide = block.percent >= WIDE_BLOCK_PERCENT || index === 0 && block.percent >= 8;
						const tiny = block.percent < TINY_BLOCK_PERCENT;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: wide ? distribution_module_css_default.mekkoBlock : distribution_module_css_default.mekkoBlock + " " + distribution_module_css_default.mekkoBlockCompact,
							style: {
								flexGrow: block.percent,
								flexBasis: 0,
								background: block.color,
								color: block.textColor
							},
							title: block.label + " " + block.amountText,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: distribution_module_css_default.mekkoHead,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: distribution_module_css_default.mekkoName,
										children: block.label
									}), wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: distribution_module_css_default.mekkoAmount,
										children: block.amountText
									})]
								}),
								!wide && !tiny && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: distribution_module_css_default.mekkoAmount,
									children: block.amountText
								}),
								wide && block.models.map((model, modelIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: distribution_module_css_default.mekkoModel,
									children: [
										model.label,
										" ",
										model.percent,
										"%"
									]
								}, block.key + ":model:" + String(modelIndex)))
							]
						}, block.key);
					})
				})]
			});
		}
		/** 缓存节省：模型 + 横条 + 金额 + 缓存读 tokens；合计取 `/usage` 的 totals。 */
		function CacheSavingsPanel(props) {
			const t = useT();
			const { rows, totalText } = cacheSavingsOf(props.models, props.usage);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: distribution_module_css_default.panel,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: distribution_module_css_default.panelHead,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: distribution_module_css_default.panelTitle,
						children: t("dist.cacheSave")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: distribution_module_css_default.panelNote,
						children: t("balance.totalInline", { value: totalText })
					})]
				}), rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.empty,
					children: props.loading ? t("s.loading") : t("empty.noUsage")
				}) : rows.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RankLine, {
					row,
					top: index === 0
				}, row.key))]
			});
		}
		/** 成本构成：输出 / 缓存读的 token 占比 + 图例（金额无法按 token 类型拆，这里只按 token 类型说明）。 */
		function CostMixPanel(props) {
			const t = useT();
			const output = props.models.reduce((sum, row) => sum + row.buckets.outputTokens, 0);
			const cacheRead = props.models.reduce((sum, row) => sum + row.buckets.cacheReadTokens, 0);
			const total = output + cacheRead;
			const outputShare = total > 0 ? output / total * 100 : 0;
			const cacheShare = total > 0 ? 100 - outputShare : 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: distribution_module_css_default.panel,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: distribution_module_css_default.panelHead,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: distribution_module_css_default.panelTitle,
						children: t("dist.costMix")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: distribution_module_css_default.panelNote,
						children: t("dist.byTokenType")
					})]
				}), total === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.empty,
					children: props.loading ? t("s.loading") : t("empty.noUsage")
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: distribution_module_css_default.stackBar,
					children: [outputShare > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: distribution_module_css_default.stackOutput,
						style: { flexGrow: outputShare },
						children: outputShare >= 8 ? t("c.output") + " " + Math.round(outputShare) + "%" : ""
					}), cacheShare > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: distribution_module_css_default.stackCache,
						style: { flexGrow: cacheShare },
						children: cacheShare >= 8 ? t("c.cacheRead") + " " + Math.round(cacheShare) + "%" : ""
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: distribution_module_css_default.legend,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: distribution_module_css_default.legendOutput }),
						t("c.output"),
						" ",
						fmtTokens(output)
					] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: distribution_module_css_default.legendCache }),
						t("c.cacheRead"),
						" ",
						fmtTokens(cacheRead)
					] })]
				})] })]
			});
		}
		/** 通道成本：按通道汇总模型行的成本，取前几名 + 「其它」。 */
		function ChannelCostPanel(props) {
			const t = useT();
			const { rows, channelCount } = channelCostOf(props.models, props.channels);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: distribution_module_css_default.panel,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: distribution_module_css_default.panelHead,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: distribution_module_css_default.panelTitle,
						children: t("dist.channelCost")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: distribution_module_css_default.panelNote,
						children: t("dist.countUnit", { count: channelCount })
					})]
				}), rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.empty,
					children: props.loading ? t("s.loading") : t("s.noCost")
				}) : rows.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RankLine, {
					row,
					top: index === 0
				}, row.key))]
			});
		}
		/** 一条排行：名字 + 横条 + 金额 + 右侧附注（缓存读 tokens / 占比）。 */
		function RankLine(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: distribution_module_css_default.row,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: distribution_module_css_default.rowName,
						title: props.row.label,
						children: props.row.label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: distribution_module_css_default.rowTrack,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
							className: props.top ? distribution_module_css_default.rowFillTop : distribution_module_css_default.rowFill,
							style: { width: Math.max(MIN_BAR_PERCENT$1, props.row.weight) + "%" }
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: distribution_module_css_default.rowAmount,
						children: props.row.amountText
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: distribution_module_css_default.rowMeta,
						children: props.row.metaText
					})
				]
			});
		}
		/** 项目块：按可比成本降序，前 N 名各占一块，其余并成「其它」。 */
		function mekkoBlocksOf(projects) {
			const priced = projects.map((row) => ({
				row,
				cost: comparableMoneyOf(row)
			})).filter((item) => item.cost !== null && item.cost > 0).sort((first, second) => second.cost - first.cost);
			const total = priced.reduce((sum, item) => sum + item.cost, 0);
			if (total <= 0) return [];
			const blocks = priced.slice(0, MAX_PROJECT_BLOCKS).map((item, index) => ({
				key: "project:" + item.row.workspace,
				label: projectLabelOf(item.row),
				amountText: rowMoneyViewOf(item.row).text,
				percent: item.cost / total * 100,
				color: PROJECT_COLORS[index % PROJECT_COLORS.length] ?? OTHERS_BG,
				textColor: "var(--dsw-alias-label-primary-foreground, #fff)",
				models: topModelsOf(item.row)
			}));
			const tail = priced.slice(MAX_PROJECT_BLOCKS);
			if (tail.length > 0) blocks.push({
				key: "project:others",
				label: t("m.others"),
				amountText: moneyTextOfRows(tail.map((item) => item.row)),
				percent: tail.reduce((sum, item) => sum + item.cost, 0) / total * 100,
				color: OTHERS_BG,
				textColor: "var(--dsw-alias-label-primary, #e8e8ec)",
				models: []
			});
			return blocks;
		}
		/** 项目展示名：宿主工作区名 > 「未归入工作区」 > 目录名。 */
		function projectLabelOf(row) {
			const title = row.workspaceTitle;
			if (title !== void 0 && title !== null && title !== "") return title;
			if (row.registered === false) return t("p.orphan");
			return row.workspace === "" ? t("p.orphan") : baseNameOf(row.workspace);
		}
		/** 项目内 tokens 最多的前两个模型及占比（项目行的模型没有逐模型成本，占比只能按 tokens 算）。 */
		function topModelsOf(row) {
			const models = row.models ?? [];
			const total = models.reduce((sum, entry) => sum + entry.tokens, 0);
			if (total <= 0) return [];
			return [...models].sort((first, second) => second.tokens - first.tokens).slice(0, MAX_BLOCK_MODELS).map((entry) => ({
				label: entry.model === "" ? t("m.others") : entry.model,
				percent: Math.round(entry.tokens / total * 100)
			}));
		}
		/** 缓存节省排行：有钱按钱、没钱按缓存读 tokens 排序；合计只从 `/usage` totals 取。 */
		function cacheSavingsOf(models, usage) {
			const nameCount = /* @__PURE__ */ new Map();
			for (const row of models) nameCount.set(row.model, (nameCount.get(row.model) ?? 0) + 1);
			const entries = models.filter((row) => row.buckets.cacheReadTokens > 0 && (row.cost !== null || typeof row.cacheSaved === "number")).map((row) => {
				const extended = row;
				const saved = typeof extended.cacheSaved === "number" && Number.isFinite(extended.cacheSaved) ? extended.cacheSaved : null;
				const savedByCurrency = extended.cacheSavedByCurrency;
				const hasCurrency = savedByCurrency !== void 0 && savedByCurrency !== null && Object.keys(savedByCurrency).length > 0;
				const baseLabel = row.model === "" ? t("m.others") : row.model;
				return {
					key: "cache:" + row.provider + "|" + row.model,
					label: (nameCount.get(row.model) ?? 0) > 1 ? baseLabel + " · " + (row.providerLabel || row.provider) : baseLabel,
					cacheRead: row.buckets.cacheReadTokens,
					saved,
					amountText: hasCurrency ? rowMoneyViewOf({ costsByCurrency: savedByCurrency }).text : saved === null ? "—" : moneyTextOf("CNY", saved)
				};
			});
			const hasAmounts = entries.some((entry) => entry.saved !== null);
			const weightOf = (entry) => hasAmounts ? entry.saved ?? 0 : entry.cacheRead;
			const sorted = [...entries].sort((first, second) => weightOf(second) - weightOf(first));
			const named = sorted.length <= MAX_CACHE_ROWS ? sorted : sorted.slice(0, 3);
			const rows = named.map((entry) => ({
				key: entry.key,
				label: entry.label,
				weight: weightOf(entry),
				amountText: entry.amountText,
				metaText: fmtTokens(entry.cacheRead)
			}));
			const tail = sorted.slice(named.length);
			if (tail.length > 0) {
				const savedTail = tail.filter((entry) => entry.saved !== null);
				rows.push({
					key: "cache:others",
					label: t("dist.others", { count: tail.length }),
					weight: tail.reduce((sum, entry) => sum + weightOf(entry), 0),
					amountText: savedTail.length === tail.length ? moneyTextOf("CNY", savedTail.reduce((sum, entry) => sum + (entry.saved ?? 0), 0)) : "—",
					metaText: fmtTokens(tail.reduce((sum, entry) => sum + entry.cacheRead, 0))
				});
			}
			const maxWeight = Math.max(1, ...rows.map((row) => row.weight));
			for (const row of rows) row.weight = row.weight / maxWeight * 100;
			const rowTotal = entries.length > 0 && entries.every((entry) => entry.saved !== null) ? entries.reduce((sum, entry) => sum + (entry.saved ?? 0), 0) : null;
			return {
				rows,
				totalText: rowTotal === null ? cacheTotalTextOf(usage) : moneyTextOf("CNY", rowTotal)
			};
		}
		/** `/usage` 合计里的缓存省钱：优先逐币种小计，缺了才回落单值（混币种语义同 `cost`）。 */
		function cacheTotalTextOf(usage) {
			const totals = usage?.totals;
			if (totals === void 0 || totals === null) return "—";
			const byCurrency = totals.cacheSavedByCurrency;
			if (byCurrency !== void 0 && byCurrency !== null && Object.keys(byCurrency).length > 0) return rowMoneyViewOf({ costsByCurrency: byCurrency }).text;
			const saved = totals.cacheSaved;
			return typeof saved === "number" && Number.isFinite(saved) ? moneyTextOf("CNY", saved) : "—";
		}
		/** 通道成本排行：同通道模型成本相加，取前几名 + 「其它」，条宽按占总成本比例。 */
		function channelCostOf(models, channels) {
			const byProvider = /* @__PURE__ */ new Map();
			for (const row of models) {
				const entry = byProvider.get(row.provider) ?? {
					label: channelOf(channels, row.provider)?.displayName ?? row.providerLabel ?? row.provider,
					costs: {}
				};
				addCosts(entry.costs, row);
				byProvider.set(row.provider, entry);
			}
			const priced = [...byProvider.entries()].map(([provider, entry]) => ({
				provider,
				label: entry.label,
				costs: entry.costs,
				comparable: comparableMoneyOf({ costsByCurrency: entry.costs })
			})).filter((entry) => entry.comparable !== null && entry.comparable > 0).sort((first, second) => second.comparable - first.comparable);
			const total = priced.reduce((sum, entry) => sum + entry.comparable, 0);
			if (total <= 0) return {
				rows: [],
				channelCount: 0
			};
			const top = priced[0];
			const toRow = (entry, key) => ({
				key,
				label: entry.label,
				weight: entry.comparable / top.comparable * 100,
				amountText: rowMoneyViewOf({ costsByCurrency: entry.costs }).text,
				metaText: Math.round(entry.comparable / total * 100) + "%"
			});
			const named = priced.length <= MAX_CHANNEL_ROWS ? priced : priced.slice(0, 2);
			const rows = named.map((entry) => toRow(entry, "channel:" + entry.provider));
			const tail = priced.slice(named.length);
			if (tail.length > 0) {
				const costs = {};
				for (const entry of tail) addCosts(costs, { costsByCurrency: entry.costs });
				const comparable = tail.reduce((sum, entry) => sum + entry.comparable, 0);
				rows.push({
					key: "channel:others",
					label: t("dist.others", { count: tail.length }),
					weight: comparable / top.comparable * 100,
					amountText: rowMoneyViewOf({ costsByCurrency: costs }).text,
					metaText: Math.round(comparable / total * 100) + "%"
				});
			}
			return {
				rows,
				channelCount: priced.length
			};
		}
		/** 一行金额累加进逐币种小计；没有 `costsByCurrency` 时按 `cost` 兜底记 CNY。 */
		function addCosts(target, row) {
			const byCurrency = row.costsByCurrency;
			if (byCurrency !== void 0 && byCurrency !== null && Object.keys(byCurrency).length > 0) {
				for (const [currency, amount] of Object.entries(byCurrency)) if (typeof amount === "number" && Number.isFinite(amount)) target[currency] = (target[currency] ?? 0) + amount;
				return;
			}
			const fallback = row.cost;
			if (typeof fallback === "number" && Number.isFinite(fallback)) target.CNY = (target.CNY ?? 0) + fallback;
		}
		/** 多行金额合并成一行文本；一行都拿不到时返回 —。 */
		function moneyTextOfRows(rows) {
			const totals = {};
			for (const row of rows) addCosts(totals, row);
			return Object.keys(totals).length === 0 ? "—" : rowMoneyViewOf({ costsByCurrency: totals }).text;
		}
		/** 会话数据覆盖度结论：与两张列表同一套文案（不完整 / 不可用）。 */
		function coverageTextOf(coverage) {
			if (coverage.status === "unavailable") return t("s.unavailable");
			return t("s.partial") + String(coverage.skippedSessions) + t("s.partialTail");
		}
		//#endregion
		//#region src/client/core/serverText.ts
		/**
		* 服务端下发的中文说明 → 词典键（双语）。
		* 只收录**固定句子**（价目依据、会话服务降级原因等）；服务端将来改发 code 时这里会自然退化。
		* 未收录的串原样返回，不会把界面变成空白。
		*/
		const KEYS = {
			"暂无价格依据": "srv.ratesNone",
			"宿主未提供会话服务，无法读取该会话": "srv.noSessionService",
			"当前注入的会话数据源不支持单会话查询": "srv.noSingleSession",
			"会话详情不可用": "srv.sessionDetailUnavailable",
			"宿主没有会话服务": "srv.noSessionService",
			"no-snapshot": "srv.code.noSnapshot",
			"no-credential": "srv.code.noCredential",
			"unsupported": "srv.code.unsupported",
			"host-unavailable": "srv.code.hostUnavailable",
			"fetch-failed": "srv.code.fetchFailed",
			"timeout": "srv.code.timeout"
		};
		function serverText(text) {
			if (text === null || text === void 0 || text === "") return "";
			const key = KEYS[text];
			return key === void 0 ? text : t(key);
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/channelFilter.module.css.mjs
		const css$6 = ".MLInyG_root{display:inline-flex;position:relative}.MLInyG_trigger{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2,#2c2c34);height:30px;color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:var(--ku-body,14px);cursor:pointer;white-space:nowrap;background:0 0;border-radius:8px;align-items:center;gap:8px;padding:0 12px;line-height:1;display:inline-flex}.MLInyG_trigger:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.MLInyG_trigger:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.MLInyG_caret{font-size:var(--ku-sub,13px);opacity:.8}.MLInyG_popup{z-index:30;border:1px solid var(--dsw-alias-border-l2,#2c2c34);background:var(--dsw-alias-bg-layer-3,#232329);min-width:240px;max-height:300px;box-shadow:var(--dsw-shadow-lv2,0 8px 24px #00000059);border-radius:10px;padding:6px;position:absolute;top:calc(100% + 6px);left:0;overflow-y:auto}.MLInyG_item{font-size:var(--ku-body,14px);color:var(--dsw-alias-label-primary,#e8e8ec);cursor:pointer;border-radius:6px;align-items:center;gap:8px;padding:8px;display:flex}.MLInyG_item:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c1a)}.MLInyG_item input{width:14px;height:14px;accent-color:var(--dsw-alias-state-business-primary,#5b8cff);cursor:pointer;margin:0}.MLInyG_itemName{text-overflow:ellipsis;white-space:nowrap;flex:auto;min-width:0;overflow:hidden}.MLInyG_itemKind{font-size:var(--ku-body,14px);color:var(--dsw-alias-label-tertiary,#67676f);white-space:nowrap;flex:none}";
		const tagId$6 = "dsh-key-usage/channelFilter.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$6) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$6;
			tag.textContent = css$6;
			document.head.appendChild(tag);
		}
		const cssRegistry$6 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$6.some((e) => e.tagId === tagId$6)) cssRegistry$6.push({
			tagId: tagId$6,
			css: css$6
		});
		var channelFilter_module_css_default = {
			"caret": "MLInyG_caret",
			"item": "MLInyG_item",
			"itemKind": "MLInyG_itemKind",
			"itemName": "MLInyG_itemName",
			"popup": "MLInyG_popup",
			"root": "MLInyG_root",
			"trigger": "MLInyG_trigger"
		};
		//#endregion
		//#region src/client/components/ChannelFilter.tsx
		/**
		* 通道多选下拉：自绘浮层（不用原生 `select multiple`），触发条显示「全部通道」或「N 个通道」。
		* 勾选结果由父组件持有并落 localStorage；本组件只管浮层开关、点外部 / Esc 关闭。
		*/
		function ChannelFilter(props) {
			const t = useT();
			const [open, setOpen] = (0, react.useState)(false);
			const rootRef = (0, react.useRef)(null);
			const triggerRef = (0, react.useRef)(null);
			const popupId = (0, react.useId)();
			const visibleCount = props.channels.filter((channel) => !props.hidden.includes(channel.provider)).length;
			(0, react.useEffect)(() => {
				if (!open) return;
				const onPointerDown = (event) => {
					const root = rootRef.current;
					if (root !== null && event.target instanceof Node && root.contains(event.target)) return;
					setOpen(false);
				};
				const onKeyDown = (event) => {
					if (event.key !== "Escape") return;
					setOpen(false);
					triggerRef.current?.focus();
				};
				document.addEventListener("mousedown", onPointerDown);
				document.addEventListener("keydown", onKeyDown);
				return () => {
					document.removeEventListener("mousedown", onPointerDown);
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [open]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: channelFilter_module_css_default.root,
				ref: rootRef,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					ref: triggerRef,
					className: channelFilter_module_css_default.trigger,
					"aria-label": t("quota.channelFilter"),
					"aria-haspopup": "true",
					"aria-expanded": open,
					"aria-controls": open ? popupId : void 0,
					onClick: () => setOpen((previous) => !previous),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: visibleCount === props.channels.length ? t("quota.allChannels") : t("quota.channelCount", { count: visibleCount }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: channelFilter_module_css_default.caret,
						"aria-hidden": "true",
						children: "▾"
					})]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: channelFilter_module_css_default.popup,
					id: popupId,
					role: "group",
					"aria-label": t("quota.channelFilter"),
					children: props.channels.map((channel) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: channelFilter_module_css_default.item,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: !props.hidden.includes(channel.provider),
								onChange: () => props.onToggle(channel.provider)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: channelFilter_module_css_default.itemName,
								children: channel.displayName
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: channelFilter_module_css_default.itemKind,
								children: t(COST_MODE_TAG_KEYS[channel.costMode] ?? "ch.notQueried")
							})
						]
					}, channel.provider))
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/quota.module.css.mjs
		const css$5 = ".ohwLxW_cardGrid{grid-template-columns:repeat(auto-fit,minmax(292px,1fr));align-items:start;gap:10px;display:grid}.ohwLxW_cardGrid.ohwLxW_cardGridSingle{grid-template-columns:minmax(0,1fr)}@media (max-width:360px){.ohwLxW_cardGrid,.ohwLxW_cardGrid.ohwLxW_cardGridSingle{grid-template-columns:minmax(0,1fr)}}.ohwLxW_cardToolbar{align-items:center;gap:8px;margin-bottom:12px;display:flex}.ohwLxW_chanCard{border:1px solid var(--dsw-alias-border-l1,#80808c47);background:var(--dsw-alias-bg-layer-2,#1d1d22);border-radius:9px;flex-direction:column;gap:8px;min-width:0;padding:12px 14px;display:flex}.ohwLxW_chanHead{min-width:0;font:inherit;color:inherit;text-align:left;background:0 0;border:0;align-items:center;gap:8px;margin:0;padding:0;display:flex}.ohwLxW_chanHeadButton{cursor:pointer;border-radius:6px;width:100%}.ohwLxW_chanHeadButton:hover .ohwLxW_chanName{color:var(--dsw-alias-state-business-primary,#5b8cff)}.ohwLxW_chanHeadButton:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ohwLxW_chanName{min-width:0;font-size:var(--ku-title,17px);color:var(--dsw-alias-label-primary,#e8e8ec);text-overflow:ellipsis;white-space:nowrap;font-weight:600;overflow:hidden}.ohwLxW_chanKind{white-space:nowrap;background:var(--dsw-alias-interactive-bg-active,#80808c2e);color:var(--dsw-alias-label-tertiary,#67676f);border-radius:999px;padding:0 6px;font-size:13px}.ohwLxW_chanChecked{white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary,#67676f);margin-left:auto;font-size:13px}.ohwLxW_chanBody{grid-auto-rows:auto;align-content:start;align-items:center;gap:8px;min-height:0;font-size:13px;display:grid}.ohwLxW_windowLine{flex-direction:column;gap:4px;min-width:0;display:flex}.ohwLxW_windowTop{align-items:baseline;gap:8px;display:flex}.ohwLxW_windowName{color:var(--dsw-alias-label-secondary,#9a9aa6);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.ohwLxW_meter{background:var(--dsw-alias-interactive-bg-active,#80808c2e);border-radius:4px;height:8px;display:block;overflow:hidden}.ohwLxW_meter>i{border-radius:4px;height:100%;display:block}.ohwLxW_windowPercent{color:var(--dsw-alias-label-primary,#e8e8ec);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:15px;font-weight:600}.ohwLxW_windowReset{text-align:right;color:var(--dsw-alias-label-tertiary,#67676f);font-variant-numeric:tabular-nums;white-space:nowrap;margin-left:auto;font-size:13px}.ohwLxW_cardLine{font-variant-numeric:tabular-nums;justify-content:space-between;align-items:baseline;gap:8px;min-width:0;display:flex}.ohwLxW_lineKey{color:var(--dsw-alias-label-tertiary,#67676f);white-space:nowrap}.ohwLxW_lineValue{color:var(--dsw-alias-label-secondary,#9a9aa6);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.ohwLxW_lineValueNumber{font-size:var(--ku-kpi,20px);font-weight:600}.ohwLxW_ratePanel{border:1px solid var(--dsw-alias-border-l1,#80808c47);background:var(--dsw-alias-bg-layer-2,#1d1d22);border-radius:9px;margin-top:10px;padding:14px 16px}.ohwLxW_ratePanelHead{align-items:center;gap:8px;margin-bottom:8px;display:flex}.ohwLxW_ratePanelTitle{font-size:var(--ku-title,17px);color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600}.ohwLxW_ratePanelClose{cursor:pointer;font:inherit;color:var(--dsw-alias-label-tertiary,#67676f);background:0 0;border:0;border-radius:4px;margin-left:auto;padding:0 2px;font-size:13px}.ohwLxW_ratePanelClose:hover{color:var(--dsw-alias-label-primary,#e8e8ec)}.ohwLxW_rateScroll{overflow-x:auto}.ohwLxW_rateHead{color:var(--dsw-alias-label-tertiary,#67676f);margin-bottom:8px;font-size:13px;line-height:1.7}.ohwLxW_rateTable{border-collapse:collapse;width:100%}.ohwLxW_rateTable th{text-align:right;color:var(--dsw-alias-label-tertiary,#67676f);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);white-space:nowrap;padding:6px 8px;font-size:13px;font-weight:500}.ohwLxW_rateTable td{text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9a9aa6);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);white-space:nowrap;padding:8px;font-size:13px}.ohwLxW_rateTable th:first-child,.ohwLxW_rateTable td:first-child{text-align:left}.ohwLxW_rateTable td:first-child{color:var(--dsw-alias-label-primary,#e8e8ec)}.ohwLxW_rateModel{font-family:ui-monospace,Consolas,monospace;font-size:13px}.ohwLxW_rateSourceNone{color:var(--dsw-alias-label-tertiary,#67676f);white-space:nowrap;border:1px dashed;border-radius:999px;padding:0 6px;font-size:13px;line-height:1.7;display:inline-block}.ohwLxW_rateEmpty{color:var(--dsw-alias-label-tertiary,#67676f);padding:8px 0;font-size:13px}";
		const tagId$5 = "dsh-key-usage/quota.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$5) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$5;
			tag.textContent = css$5;
			document.head.appendChild(tag);
		}
		const cssRegistry$5 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$5.some((e) => e.tagId === tagId$5)) cssRegistry$5.push({
			tagId: tagId$5,
			css: css$5
		});
		var quota_module_css_default = {
			"cardGrid": "ohwLxW_cardGrid",
			"cardGridSingle": "ohwLxW_cardGridSingle",
			"cardLine": "ohwLxW_cardLine",
			"cardToolbar": "ohwLxW_cardToolbar",
			"chanBody": "ohwLxW_chanBody",
			"chanCard": "ohwLxW_chanCard",
			"chanChecked": "ohwLxW_chanChecked",
			"chanHead": "ohwLxW_chanHead",
			"chanHeadButton": "ohwLxW_chanHeadButton",
			"chanKind": "ohwLxW_chanKind",
			"chanName": "ohwLxW_chanName",
			"lineKey": "ohwLxW_lineKey",
			"lineValue": "ohwLxW_lineValue",
			"lineValueNumber": "ohwLxW_lineValueNumber",
			"meter": "ohwLxW_meter",
			"rateEmpty": "ohwLxW_rateEmpty",
			"rateHead": "ohwLxW_rateHead",
			"rateModel": "ohwLxW_rateModel",
			"ratePanel": "ohwLxW_ratePanel",
			"ratePanelClose": "ohwLxW_ratePanelClose",
			"ratePanelHead": "ohwLxW_ratePanelHead",
			"ratePanelTitle": "ohwLxW_ratePanelTitle",
			"rateScroll": "ohwLxW_rateScroll",
			"rateSourceNone": "ohwLxW_rateSourceNone",
			"rateTable": "ohwLxW_rateTable",
			"windowLine": "ohwLxW_windowLine",
			"windowName": "ohwLxW_windowName",
			"windowPercent": "ohwLxW_windowPercent",
			"windowReset": "ohwLxW_windowReset",
			"windowTop": "ohwLxW_windowTop"
		};
		//#endregion
		//#region src/client/tabs/QuotaTab.tsx
		/**
		* 额度与订阅：按通道渲染等高卡片（订阅窗口 / 余额 / 通道事实各三行），标题行可展开该通道近 30 天模型单价表。
		* 界面不维护任何价格；金额按设置里选的显示币种折算（汇率来自 `/fx`，折算收口在 currency.ts）。
		*/
		/** 余额字段展示顺序（未收录字段按原键名追加在后）。 */
		const BALANCE_ORDER = [
			"totalBalance",
			"topUpBalance",
			"giftBalance",
			"balance",
			"currency"
		];
		const BALANCE_LABELS = {
			totalBalance: "balance.total",
			topUpBalance: "balance.credit",
			giftBalance: "balance.grant",
			balance: "balance.balance"
		};
		const WINDOW_ORDER = [
			"5h",
			"week",
			"month",
			"day"
		];
		/** 通道筛选：只存被勾掉的 provider（新通道默认可见）；存储不可用或内容坏了都回退全选。 */
		const HIDDEN_CHANNELS_KEY = "dsh-key-usage:quota:hidden-channels";
		function readHiddenProviders() {
			try {
				const raw = window.localStorage.getItem(HIDDEN_CHANNELS_KEY);
				if (raw === null) return [];
				const parsed = JSON.parse(raw);
				return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
			} catch {
				return [];
			}
		}
		function writeHiddenProviders(hidden) {
			try {
				window.localStorage.setItem(HIDDEN_CHANNELS_KEY, JSON.stringify(hidden));
			} catch {}
		}
		function QuotaTab(props) {
			/** 取词：宿主切语言时重渲染（模块级辅助函数直接用 import 的 t） */
			const t = useT();
			const instanceId = (0, react.useId)();
			const display = useCurrencyDisplay();
			const [rates, setRates] = (0, react.useState)(null);
			const [ratesLoading, setRatesLoading] = (0, react.useState)(true);
			const [expandedProvider, setExpandedProvider] = (0, react.useState)(null);
			const [hiddenProviders, setHiddenProviders] = (0, react.useState)(readHiddenProviders);
			(0, react.useEffect)(() => {
				writeHiddenProviders(hiddenProviders);
			}, [hiddenProviders]);
			const toggleProvider = (provider) => {
				setHiddenProviders((previous) => previous.includes(provider) ? previous.filter((item) => item !== provider) : [...previous, provider]);
			};
			(0, react.useEffect)(() => {
				let cancelled = false;
				setRatesLoading(true);
				loadRates(30, 20).then((result) => {
					if (cancelled) return;
					setRates(result);
					setRatesLoading(false);
				});
				return () => {
					cancelled = true;
				};
			}, [props.reloadToken]);
			/**
			* 通道级失败原因进系统日志：卡片上只留更新时间，上游错误（含未配置 Key）摊在卡片里既挤又没人读，
			* 出问题时去日志窗按通道查。
			*/
			(0, react.useEffect)(() => {
				for (const channel of props.channels) {
					if (channel.status === "off") {
						logWarn("quota", t("quota.liveFailedShort") + " · " + channel.displayName, t("err.noApiKey"));
						continue;
					}
					const snapshot = props.quotas.find((item) => item.provider === channel.provider) ?? null;
					if (snapshot === null || snapshot.source === "live" || !snapshot.supported || snapshot.error === null || snapshot.error === "") continue;
					const stale = snapshot.updatedAt === null ? "" : t("q.snapshotPrefix") + fmtDateTime(snapshot.updatedAt);
					logWarn("quota", t("quota.liveFailedShort") + " · " + channel.displayName, errorTextOf(snapshot.error) + stale);
				}
				for (const provider of props.quotaOutcome?.providers ?? []) {
					if (provider.ok !== false) continue;
					const quota = props.quotas.find((item) => item.provider === provider.provider);
					if (quota !== void 0 && !quota.supported) continue;
					logWarn("quota", t("quota.liveFailedShort") + " · " + provider.provider, provider.error ?? t("quota.notQueried"));
				}
			}, [
				props.channels,
				props.quotas,
				props.quotaOutcome,
				t
			]);
			const rateChannels = Array.isArray(rates?.channels) ? rates.channels : [];
			const rateRowsOf = (provider) => {
				const entry = rateChannels.find((item) => item.provider === provider);
				return entry === void 0 || !Array.isArray(entry.models) ? [] : entry.models;
			};
			const filtering = props.onlyProvider === void 0;
			const unpricedEntries = unpricedEntriesOf(rateChannels).filter((entry) => !filtering || !hiddenProviders.includes(entry.provider));
			const shown = props.channels.filter((channel) => filtering ? !hiddenProviders.includes(channel.provider) : channel.provider === props.onlyProvider);
			const cards = shown.map((channel) => channelCardOf(channel, props.quotas.find((item) => item.provider === channel.provider) ?? null, unpricedCountOf(unpricedEntries, channel.provider))).sort((first, second) => first.rank - second.rank);
			const openProvider = props.onlyProvider ?? expandedProvider;
			const openChannel = shown.find((channel) => channel.provider === openProvider) ?? null;
			const drawerId = instanceId + "-rates";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				filtering && props.channels.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: quota_module_css_default.cardToolbar,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChannelFilter, {
						channels: props.channels,
						hidden: hiddenProviders,
						onToggle: toggleProvider
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: [quota_module_css_default.cardGrid, props.onlyProvider === void 0 ? "" : quota_module_css_default.cardGridSingle].join(" ").trim(),
					children: cards.map((card) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: quota_module_css_default.chanCard,
						children: [card.provider !== null && props.onlyProvider === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: quota_module_css_default.chanHead + " " + quota_module_css_default.chanHeadButton,
							"aria-expanded": openProvider === card.provider,
							"aria-controls": openProvider === card.provider ? drawerId : void 0,
							title: t("quota.ratesHint"),
							onClick: () => {
								if (props.onOpenProvider !== void 0) props.onOpenProvider(card.provider);
								else setExpandedProvider((previous) => previous === card.provider ? null : card.provider);
							},
							children: cardHeadOf(card)
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: quota_module_css_default.chanHead,
							children: cardHeadOf(card)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: quota_module_css_default.chanBody,
							children: card.rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardRowView, { row }, row.key))
						})]
					}, card.key))
				}),
				props.channels.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.empty,
					children: t("o.noChannels")
				}),
				filtering && props.channels.length > 0 && shown.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.empty,
					children: t("quota.noChannelSelected")
				}),
				openChannel !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					id: drawerId,
					className: quota_module_css_default.ratePanel,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: quota_module_css_default.ratePanelHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", {
							className: quota_module_css_default.ratePanelTitle,
							children: openChannel.displayName
						}), props.onlyProvider === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: quota_module_css_default.ratePanelClose,
							onClick: () => setExpandedProvider(null),
							children: t("dist.hideTable")
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RateTable, {
						rows: rateRowsOf(openChannel.provider),
						loading: ratesLoading,
						failureText: rates === null ? failureReasonOf("/dsh-key-usage/rates") ?? t("quota.noResponse") : null,
						display: display.display,
						range: rates !== null && typeof rates.from === "string" && typeof rates.to === "string" ? {
							from: rates.from,
							to: rates.to
						} : null
					})]
				})
			] });
		}
		/** 标题行：通道名 + 类型胶囊 + 右侧更新时间（告警色只在异常时出现）。 */
		function cardHeadOf(card) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				card.statusColor === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: shared_module_css_default.statusDot,
					style: { background: card.statusColor }
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: quota_module_css_default.chanName,
					title: card.title,
					children: card.title
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: quota_module_css_default.chanKind,
					children: card.kindText
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: quota_module_css_default.chanChecked,
					children: card.checkedText
				})
			] });
		}
		/** 正文一行：窗口行是「标签 + 固定宽度进度条 + 百分比 + 重置时间」，其余是左标签右值。 */
		function CardRowView(props) {
			const row = props.row;
			if (row.kind === "window") {
				const percent = Math.max(0, Math.min(100, Math.round(row.percent)));
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: quota_module_css_default.windowLine,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: quota_module_css_default.windowTop,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: quota_module_css_default.windowName,
								children: row.label
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: quota_module_css_default.windowPercent,
								children: [percent, "%"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: quota_module_css_default.windowReset,
								title: t("quota.resetAt"),
								children: [t("quota.resetPrefix"), row.reset]
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: quota_module_css_default.meter,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: {
							width: percent + "%",
							background: quotaBarColor(percent)
						} })
					})]
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: quota_module_css_default.cardLine,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: quota_module_css_default.lineKey,
					children: row.label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: row.number === true ? quota_module_css_default.lineValue + " " + quota_module_css_default.lineValueNumber : quota_module_css_default.lineValue,
					children: row.value
				})]
			});
		}
		/**
		* 通道卡：有订阅窗口先给三个窗口（进度条只属于窗口占用，余额不是进度）；其次余额三行；
		* 都没有时给三行通道事实（额度 / 端点 / 联网 / 成员），不写任何解释性长句。
		*/
		function channelCardOf(channel, snapshot, unpricedCount) {
			const base = {
				key: channel.provider,
				provider: channel.provider,
				title: channel.displayName,
				kindText: t(COST_MODE_TAG_KEYS[channel.costMode] ?? "ch.notQueried"),
				checkedText: checkedTextOf(snapshot),
				statusColor: channel.status === "ok" ? null : statusColorOf(channel.status)
			};
			const windowRows = windowRowsOf(snapshot);
			if (windowRows.length > 0) return {
				...base,
				rows: windowRows,
				rank: 0
			};
			const moneyRows = moneyRowsOf(snapshot?.balance ?? null);
			if (moneyRows.length > 0) return {
				...base,
				rows: moneyRows,
				rank: 1
			};
			return {
				...base,
				rows: metaRowsOf(channel, unpricedCount),
				rank: 2
			};
		}
		/** 订阅窗口正文：固定三行（多给的窗口截掉，缺的窗口不补假数据）。 */
		function windowRowsOf(snapshot) {
			const windows = windowsOf(snapshot);
			if (windows === null) return [];
			return windows.slice(0, 3).map((window) => ({
				kind: "window",
				key: window.key,
				label: t(WINDOW_TAG_KEYS[window.key] ?? window.key),
				percent: window.percent,
				reset: resetTextOf(window.resetsAt)
			}));
		}
		/** 订阅窗口：按 5h / 本周 / 本月排序，识别不出键的排最后；没有窗口返回 null。 */
		function windowsOf(snapshot) {
			const plan = snapshot?.plan;
			if (plan === null || plan === void 0) return null;
			const raw = plan.windows;
			if (!Array.isArray(raw)) return null;
			const windows = [];
			for (const entry of raw) {
				if (typeof entry !== "object" || entry === null) continue;
				const record = entry;
				const key = typeof record.key === "string" ? record.key : "";
				if (key === "") continue;
				windows.push({
					key,
					percent: typeof record.percent === "number" && Number.isFinite(record.percent) ? record.percent : 0,
					resetsAt: record.resetsAt
				});
			}
			if (windows.length === 0) return null;
			return windows.sort((first, second) => windowOrderOf(first.key) - windowOrderOf(second.key));
		}
		function windowOrderOf(key) {
			const index = WINDOW_ORDER.indexOf(key);
			return index < 0 ? WINDOW_ORDER.length : index;
		}
		/** 重置时间：本地 `YYYY-MM-DD HH:mm`；解析不出来的原样给出（服务端已做过 epoch 归一）。 */
		function resetTextOf(value) {
			if (typeof value !== "string" || value === "") return "—";
			const time = new Date(value);
			return Number.isNaN(time.getTime()) ? value : fmtDateTime(time.getTime());
		}
		/** 标题行右侧的更新时间：实时值写「刚查」，回落到快照时写数据时间，没查到过写 —。 */
		function checkedTextOf(snapshot) {
			if (snapshot === null) return "—";
			if (snapshot.source === "live") return t("quota.justChecked");
			const time = snapshot.updatedAt ?? snapshot.fetchedAt;
			return time === null ? "—" : fmtDateTime(time);
		}
		/** 余额正文：总余额 / 充值 / 赠送（最多三行）同字号同格式，金额走显示币种折算的唯一收口。 */
		function moneyRowsOf(balance) {
			if (balance === null) return [];
			const currency = typeof balance.currency === "string" && balance.currency !== "" ? balance.currency : null;
			const rows = [];
			for (const [key, value] of orderedBalanceEntries(balance)) {
				const amount = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
				if (!Number.isFinite(amount)) continue;
				rows.push({
					kind: "line",
					key,
					label: t(BALANCE_LABELS[key] ?? key),
					value: moneyTextOf(currency, amount),
					number: true
				});
				if (rows.length === 3) break;
			}
			return rows;
		}
		/** 通道事实正文：额度 / 端点 / 联网 / 成员里取三行，值都来自通道配置与近 30 天价目命中情况。 */
		function metaRowsOf(channel, unpricedCount) {
			const baseURL = typeof channel.baseURL === "string" ? channel.baseURL : "";
			const local = isLocalEndpointOf(baseURL);
			const endpointRow = {
				kind: "line",
				key: "endpoint",
				label: t("quota.endpoint"),
				value: baseURL === "" ? "—" : local ? t("quota.local") : t("quota.remote")
			};
			const networkRow = {
				kind: "line",
				key: "network",
				label: t("quota.network"),
				value: baseURL === "" ? "—" : local ? t("quota.offline") : t("quota.online")
			};
			if (channel.status === "off") return [
				{
					kind: "line",
					key: "quota",
					label: t("quota.quotaLabel"),
					value: t("err.noApiKey")
				},
				endpointRow,
				networkRow
			];
			if (channel.costMode === "free") return [
				{
					kind: "line",
					key: "quota",
					label: t("quota.quotaLabel"),
					value: t("quota.free")
				},
				{
					kind: "line",
					key: "unpriced",
					label: t("quota.unpriced"),
					value: fmtCount(unpricedCount) + t("common.modelSuffix")
				},
				endpointRow
			];
			return [
				endpointRow,
				networkRow,
				{
					kind: "line",
					key: "members",
					label: t("quota.members"),
					value: fmtCount(channel.models.length) + t("common.modelSuffix")
				}
			];
		}
		function isLocalEndpointOf(baseURL) {
			return baseURL.includes("127.0.0.1") || baseURL.includes("localhost") || baseURL.includes("0.0.0.0");
		}
		/** 未计价模型按通道归组（标题与清单都取服务端下发的通道显示名）。 */
		function unpricedEntriesOf(entries) {
			const result = [];
			for (const entry of entries) {
				const models = entry.models.filter((row) => row.source === "none").map((row) => row.model);
				if (models.length === 0) continue;
				result.push({
					provider: entry.provider,
					label: entry.label === "" ? entry.provider : entry.label,
					models
				});
			}
			return result;
		}
		function unpricedCountOf(entries, provider) {
			return entries.find((entry) => entry.provider === provider)?.models.length ?? 0;
		}
		/** 单价表：`rates` 为 null 的行在四档位置显示来源说明（写 0 会被读成「免费」，比「没有依据」更糟）。 */
		function RateTable(props) {
			if (props.rows.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: quota_module_css_default.rateEmpty,
				children: props.loading ? t("quota.loadingRates") : props.failureText !== null ? t("quota.ratesUnavailable") + "：" + props.failureText : t("quota.ratesEmpty")
			});
			const offPeakNow = props.rows.some((row) => row.offPeak === true);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: quota_module_css_default.rateHead,
				children: [
					t("quota.priceUnit"),
					"（",
					t("unit.perMillion"),
					" · ",
					DISPLAY_CURRENCY_SYMBOLS[props.display],
					"）",
					offPeakNow ? t("q.offPeakNow") : "",
					props.range === null ? "" : t("q.ratesRange")
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: quota_module_css_default.rateScroll,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: ui_module_css_default.tableScroll,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						className: quota_module_css_default.rateTable,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("m.model") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("c.input") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("c.cacheRead") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("d.cacheWrite") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("c.output") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("quota.tokensColumn") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("c.cost") })
						] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: props.rows.map((row) => {
							const rates = row.rates;
							const hasRates = rates !== null && typeof rates === "object";
							const note = noteTextOf(row);
							const costView = typeof row.cost === "number" && Number.isFinite(row.cost) ? rowMoneyViewOf({
								cost: row.cost,
								costsByCurrency: row.costCurrency === null ? void 0 : { [row.costCurrency]: row.cost }
							}) : null;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: quota_module_css_default.rateModel,
									children: row.model
								}) }),
								hasRates ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: rateCellText(row.currency, rates.input) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: rateCellText(row.currency, rates.cacheRead) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: rateCellText(row.currency, rates.cacheWrite) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: rateCellText(row.currency, rates.output) })
								] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: quota_module_css_default.rateEmpty,
									colSpan: 4,
									children: note !== "" ? note : noRateTextOf(row.source)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(typeof row.tokens === "number" && Number.isFinite(row.tokens) ? row.tokens : 0) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									title: note === "" ? void 0 : note,
									children: costView === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: quota_module_css_default.rateSourceNone,
										title: costSourceHintOf("none", row.partial),
										children: t("q.noBasis")
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [costView.text, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostSourceChip, {
										source: row.source,
										partial: row.partial
									})] })
								})
							] }, row.model);
						}) })]
					})
				})
			})] });
		}
		/** 单价单元格：按显示币种折算（`≈` 表示折算值），小值保留 4 位小数避免显示成 0.00。 */
		function rateCellText(currency, value) {
			return rateTextOf(currency, typeof value === "number" && Number.isFinite(value) ? value : 0).text;
		}
		/** `rates` 为 null 时的整段说明：按来源讲清为什么没有四档单价。 */
		function noRateTextOf(source) {
			return t(COST_SOURCE_HINTS[source] ?? "quota.noFourRates");
		}
		/** 价目说明：中文原文只在中文模式显示；英文模式改成指向界面已有的费率 / 来源 / 日期。 */
		function noteTextOf(row) {
			const note = row.note ?? "";
			if (isEnglish()) {
				const english = row.noteEn ?? "";
				if (english !== "") return english;
				if (/[\u4e00-\u9fa5]/.test(note)) return t("srv.rateNoteEn");
			}
			return note === "" ? "" : serverText(note);
		}
		function errorTextOf(error) {
			if (error === null) return t("err.noLiveQuery");
			if (error === "no-key") return t("err.noApiKey");
			if (error === "no-snapshot") return t("err.noSnapshot");
			if (error === "network") return t("err.network");
			if (error === "timeout") return t("err.timeout");
			if (error === "unauthorized") return t("err.unauthorized");
			if (error === "bad-json") return t("err.badJson");
			if (error === "too-large") return t("err.tooLarge");
			if (error.startsWith("http-")) return t("err.http", { code: error.slice(5) });
			return error;
		}
		function orderedBalanceEntries(balance) {
			const entries = Object.entries(balance).filter(([key]) => key !== "updatedAt");
			const ordered = [];
			for (const key of BALANCE_ORDER) {
				const found = entries.find(([entryKey]) => entryKey === key);
				if (found !== void 0) ordered.push(found);
			}
			for (const entry of entries) if (!BALANCE_ORDER.includes(entry[0])) ordered.push(entry);
			return ordered;
		}
		//#endregion
		//#region src/client/components/SessionDetailDrawer.tsx
		/** 会话详情抽屉：数据来自 `/session?id=…`（服务端只折叠这一个会话；读不出来时降级返回头部字段）。 */
		function SessionDetailDrawer(props) {
			/** 取词：宿主切语言时重渲染 */
			const t = useT();
			const [data, setData] = (0, react.useState)(null);
			const [failed, setFailed] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				let cancelled = false;
				setData(null);
				setFailed(false);
				loadSessionDetail(props.sessionId).then((result) => {
					if (cancelled) return;
					setData(result);
					setFailed(result === null);
					if (result === null) logWarn("ledger", t("d.loadFailed") + " · " + props.sessionId, failureReasonOf(sessionDetailPath(props.sessionId)) ?? t("d.unknownReason"));
				});
				return () => {
					cancelled = true;
				};
			}, [props.sessionId]);
			(0, react.useEffect)(() => {
				const onKeyDown = (event) => {
					if (event.key === "Escape") props.onClose();
				};
				window.addEventListener("keydown", onKeyDown);
				return () => window.removeEventListener("keydown", onKeyDown);
			}, [props.onClose]);
			const session = data?.session ?? null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: lists_module_css_default.drawerMask,
				onClick: props.onClose,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.drawerPanel,
					role: "dialog",
					"aria-modal": "true",
					"aria-label": t("d.title"),
					onClick: (event) => event.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: lists_module_css_default.drawerHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: lists_module_css_default.drawerTitle,
								children: [session?.title ?? props.fallbackTitle ?? t("s.noPrompt") + " · " + shortIdOf$1(props.sessionId), session?.archived === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: lists_module_css_default.archivedTag,
									children: t("s.archived")
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: lists_module_css_default.drawerClose,
								onClick: props.onClose,
								"aria-label": t("d.close"),
								children: "✕"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: lists_module_css_default.drawerId,
							children: props.sessionId
						}),
						props.parentId !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: lists_module_css_default.drawerBack,
							onClick: () => props.onOpenSession(props.parentId),
							children: [t("d.backToParent"), props.parentTitle === null ? "" : "：" + props.parentTitle]
						}),
						data === null && !failed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: shared_module_css_default.empty,
							children: t("d.loading")
						}),
						failed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: shared_module_css_default.warning,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LogHint, {
								text: t("d.loadFailed"),
								tone: "error"
							})
						}),
						data !== null && data.coverage.status !== "complete" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: shared_module_css_default.warning,
							children: [data.coverage.status === "unavailable" ? t("d.unavailable") : t("d.partial"), data.coverage.reason === null ? "" : "：" + serverText(data.coverage.reason)]
						}),
						data !== null && session !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionDetailBody, {
							session,
							channels: props.channels,
							priced: data.priced
						}),
						data !== null && session === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: shared_module_css_default.empty,
							children: t("d.noDetail")
						}),
						props.subagents.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: lists_module_css_default.subagentBlock,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: lists_module_css_default.subagentBlockTitle,
								children: t("d.subagentCount", { count: props.subagents.length })
							}), props.subagents.map((child) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: lists_module_css_default.subagentRow,
								onClick: () => props.onOpenSession(child.id),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: lists_module_css_default.subagentRowTitle,
									children: systemTitleOf(child.title) + " · " + shortIdOf$1(child.id)
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: lists_module_css_default.subagentRowMeta,
									children: [
										fmtTokens(child.tokens),
										" · ",
										fmtCalls(child.calls),
										" · ",
										fmtDateTime(child.lastTime)
									]
								})]
							}, child.id))]
						})
					]
				})
			});
		}
		/** teammate / 系统会话的标题是运行时注入的长句，列表里只显示「系统会话」，细节看时间与目录。 */
		function systemTitleOf(title) {
			if (title === null || title.trim() === "") return t("d.systemSession");
			return /^(Current runtime context|no prompt)/i.test(title.trim()) ? t("d.systemSession") : title;
		}
		function SessionDetailBody(props) {
			const session = props.session;
			const channel = channelOf(props.channels, session.provider);
			const costCell = costCellOf(channel, session);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: lists_module_css_default.detailBody,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lists_module_css_default.detailGrid,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailItem, {
								label: t("common.workspace"),
								value: session.workspace ?? t("s.noWorkspace"),
								wide: true
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailItem, {
								label: t("common.channel"),
								value: session.provider === null ? "—" : session.providerLabel ?? displayNameOf(props.channels, session.provider)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailItem, {
								label: t("d.costMode"),
								value: channel === null ? "—" : t(COST_MODE_KEYS[channel.costMode] ?? "ch.notQueried")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailItem, {
								label: t("d.first"),
								value: fmtDateTime(session.firstTime)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailItem, {
								label: t("d.last"),
								value: fmtDateTime(session.lastTime)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailItem, {
								label: t("d.duration"),
								value: fmtDuration(session.durationMs)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailItem, {
								label: t("d.activeDays"),
								value: String(session.days)
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lists_module_css_default.detailStrip,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StripItem, {
								label: "Tokens",
								value: fmtTokens(session.tokens),
								note: t("d.ioNote")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StripItem, {
								label: t("c.input"),
								value: fmtTokens(session.buckets.inputTokens)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StripItem, {
								label: t("c.output"),
								value: fmtTokens(session.buckets.outputTokens)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StripItem, {
								label: t("c.cacheRead"),
								value: fmtTokens(session.buckets.cacheReadTokens)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StripItem, {
								label: t("d.cacheWrite"),
								value: fmtTokens(session.buckets.cacheWriteTokens),
								note: t("d.billingOnly")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StripItem, {
								label: t("d.hitRate"),
								value: session.cacheHitRate === null ? "—" : session.cacheHitRate.toFixed(1) + "%"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StripItem, {
								label: t("common.calls"),
								value: fmtCalls(session.calls),
								note: t("d.samples")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lists_module_css_default.detailBlock,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: lists_module_css_default.detailBlockTitle,
								children: t("c.cost")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: lists_module_css_default.detailCost,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: costCell.dim ? shared_module_css_default.dim : void 0,
										children: costCell.text
									}),
									costCell.amount && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostSourceChip, {
										source: session.costSource,
										partial: session.partial
									}),
									costCell.amount && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: lists_module_css_default.detailCostHint,
										children: costSourceHintOf(session.costSource, session.partial)
									})
								]
							}),
							!props.priced && session.cost === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: shared_module_css_default.statExtra,
								children: t("d.noCostBasis")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lists_module_css_default.detailBlock,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: lists_module_css_default.detailBlockTitle,
							children: t("s.prompt")
						}), session.prompt === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: shared_module_css_default.empty,
							children: t("d.noPrompt")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: lists_module_css_default.promptText,
							children: session.prompt
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lists_module_css_default.detailBlock + " " + lists_module_css_default.detailColLeft,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: lists_module_css_default.detailBlockTitle,
							children: t("d.byModel")
						}), session.models.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: shared_module_css_default.empty,
							children: t("empty.noUsage")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
							className: shared_module_css_default.table + " " + lists_module_css_default.sessionDetailModelTable,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("m.model") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "Tokens" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("m.share") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("c.cost") })
							] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: session.models.map((model) => {
								const modelCostCell = costCellOf(channelOf(props.channels, model.provider), model);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: lists_module_css_default.listMain,
										children: model.model
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: lists_module_css_default.listSub,
										children: [
											model.providerLabel,
											" · ",
											t("d.callTimes", { count: fmtCalls(model.calls) })
										]
									})] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(model.tokens) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: lists_module_css_default.listBar,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: {
												width: Math.max(2, model.sharePercent) + "%",
												background: "var(--dsw-alias-state-business-primary, #5b8cff)"
											} })
										}),
										" ",
										model.sharePercent,
										"%"
									] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: model.cost === null || !modelCostCell.amount ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: shared_module_css_default.dim,
										children: modelCostCell.text
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [modelCostCell.text, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostSourceChip, {
										source: model.costSource,
										partial: model.partial
									})] }) })
								] }, model.provider + "|" + model.model);
							}) })]
						})]
					}),
					session.hours !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lists_module_css_default.detailBlock + " " + lists_module_css_default.detailColRight,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: lists_module_css_default.detailBlockTitle,
							children: t("d.hoursNote")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HourMiniChart, { hours: session.hours })]
					})
				]
			});
		}
		/** 24 小时迷你图：柱高按该会话的小时峰值归一，数值在悬停与读屏文本里给出。 */
		function HourMiniChart(props) {
			const peak = props.hours.reduce((max, hour) => Math.max(max, hour.tokens), 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: lists_module_css_default.hourChart,
				role: "img",
				"aria-label": hourChartSummary(props.hours),
				children: props.hours.map((hour, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.hourBar,
					title: String(index) + t("d.hourUnit") + fmtTokens(hour.tokens) + " · " + fmtCalls(hour.calls) + t("d.callUnit"),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: lists_module_css_default.hourBarFill,
						style: { height: peak > 0 ? Math.round(hour.tokens / peak * 100) + "%" : "0%" }
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: lists_module_css_default.hourBarTick,
						children: index % 6 === 0 ? String(index) : ""
					})]
				}, index))
			});
		}
		/** 读屏用户的数值概述：柱状图本身只有悬停才看得到数。 */
		function hourChartSummary(hours) {
			const busiest = hours.reduce((best, hour, index) => hour.tokens > hours[best].tokens ? index : best, 0);
			return hours[busiest].tokens === 0 ? t("d.noHours") : t("d.busiest", { hour: busiest }) + fmtTokens(hours[busiest].tokens) + " tokens";
		}
		function DetailItem(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: props.wide === true ? lists_module_css_default.detailItemWide : void 0,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: lists_module_css_default.detailItemLabel,
					children: props.label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: lists_module_css_default.detailItemValue,
					children: props.value
				})]
			});
		}
		function StripItem(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: lists_module_css_default.detailStrip,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: lists_module_css_default.detailItemLabel,
						children: props.label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: lists_module_css_default.detailItemValue,
						children: props.value
					}),
					props.note !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: lists_module_css_default.detailItemNote,
						children: props.note
					})
				]
			});
		}
		/** 会话头通常不带标题，用 id 的短片段做可读标识。 */
		function shortIdOf$1(id) {
			return id.replace(/^session-/, "").slice(0, 8);
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/sessions.module.css.mjs
		const css$4 = ".EL9i8q_page{font-size:var(--ku-body,14px);flex-direction:column;gap:10px;line-height:1.55;display:flex}.EL9i8q_grid2{grid-template-columns:repeat(auto-fit,minmax(320px,1fr));align-items:stretch;gap:10px;display:grid}.EL9i8q_panel{border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:9px;min-width:0;padding:10px 12px}.EL9i8q_panelHead{flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:8px;display:flex}.EL9i8q_panelTitle{color:var(--dsw-alias-label-primary,#e8e8ec);font-size:var(--ku-title,17px);font-weight:600}.EL9i8q_panelTotal{color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ku-body,14px);font-variant-numeric:tabular-nums;white-space:nowrap;margin-left:auto}.EL9i8q_metrics{background:var(--dsw-alias-interactive-bg-hover,#80808c1a);border-radius:8px;gap:2px;padding:2px;display:inline-flex}.EL9i8q_metricBtn{font:inherit;font-size:var(--ku-body,14px);color:var(--dsw-alias-label-tertiary,#67676f);cursor:pointer;white-space:nowrap;background:0 0;border:0;border-radius:6px;padding:2px 8px}.EL9i8q_metricBtn:hover{color:var(--dsw-alias-label-primary,#e8e8ec)}.EL9i8q_metricBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:1px}.EL9i8q_metricBtnOn{background:var(--dsw-alias-bg-layer-3,#26262d);color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600}.EL9i8q_topRow{border:0;border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);width:100%;font:inherit;font-size:var(--ku-body,14px);color:inherit;text-align:left;cursor:pointer;background:0 0;align-items:center;gap:8px;padding:4px 0;display:flex}.EL9i8q_topRow:last-child{border-bottom:0}.EL9i8q_topRow:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c12)}.EL9i8q_topRow:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:-2px}.EL9i8q_rank{width:18px;color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ku-body,14px);font-variant-numeric:tabular-nums;flex:none}.EL9i8q_rowBody{flex:1;min-width:0}.EL9i8q_rowTitle{min-width:0;color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:400;font-size:var(--ku-body,14px);text-overflow:ellipsis;white-space:nowrap;flex:1;overflow:hidden}.EL9i8q_rowSub{color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ku-body,14px);font-variant-numeric:tabular-nums;text-overflow:ellipsis;white-space:nowrap;display:block;overflow:hidden}.EL9i8q_rowValue{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;flex:none}.EL9i8q_rowBig{color:var(--dsw-alias-label-primary,#e8e8ec);font-size:var(--ku-kpi,20px);font-weight:600;display:block}.EL9i8q_rowSmall{color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ku-body,14px);display:block}.EL9i8q_hist{align-items:flex-end;gap:4px;height:104px;display:flex}.EL9i8q_histCol{flex:1;align-items:flex-end;min-width:0;height:100%;display:flex}.EL9i8q_histBar{background:var(--dsw-alias-state-business-tertiary,#8c98ff);border-radius:3px 3px 1px 1px;width:100%}.EL9i8q_histBarTop{background:var(--dsw-alias-state-business-primary,#5b8cff)}.EL9i8q_histX{color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ku-body,14px);gap:4px;margin-top:4px;display:flex}.EL9i8q_histX span{text-align:center;flex:1}.EL9i8q_row{border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);cursor:pointer;align-items:center;gap:12px;padding:4px 0;display:flex}.EL9i8q_row:last-child{border-bottom:0}.EL9i8q_row:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c12)}.EL9i8q_archived{opacity:.5}.EL9i8q_titleLine{align-items:center;gap:6px;min-width:0;display:flex}.EL9i8q_titleBtn{min-width:0;font:inherit;font-weight:400;font-size:var(--ku-body,14px);color:var(--dsw-alias-label-primary,#e8e8ec);text-align:left;cursor:pointer;text-overflow:ellipsis;white-space:nowrap;background:0 0;border:0;flex:1;padding:0;overflow:hidden}.EL9i8q_titleBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.EL9i8q_tag{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ku-sub,13px);border-radius:999px;flex:none;padding:0 6px;font-weight:500}.EL9i8q_tagChildren{border-color:var(--dsw-alias-state-business-primary,#5b8cff);color:var(--dsw-alias-state-business-primary,#5b8cff);cursor:default}.EL9i8q_tokens{text-align:right;font-variant-numeric:tabular-nums;flex-direction:column;flex:none;align-items:flex-end;gap:1px;display:flex}.EL9i8q_tokensValue{color:var(--dsw-alias-label-primary,#e8e8ec);font-size:var(--ku-kpi,20px);white-space:nowrap;font-weight:600}.EL9i8q_tokensSub{color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ku-body,14px);white-space:nowrap}.EL9i8q_cost{text-align:right;white-space:nowrap;min-width:86px;color:var(--dsw-alias-state-success-primary,#3fb96f);font-size:var(--ku-body,14px);font-variant-numeric:tabular-nums;flex:none}.EL9i8q_chev{text-align:right;width:10px;color:var(--dsw-alias-label-tertiary,#67676f);flex:none}input.EL9i8q_searchInput{box-sizing:border-box;min-width:150px;max-width:150px;font-size:var(--ku-body,14px);flex:0 150px}";
		const tagId$4 = "dsh-key-usage/sessions.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$4) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$4;
			tag.textContent = css$4;
			document.head.appendChild(tag);
		}
		const cssRegistry$4 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$4.some((e) => e.tagId === tagId$4)) cssRegistry$4.push({
			tagId: tagId$4,
			css: css$4
		});
		var sessions_module_css_default = {
			"archived": "EL9i8q_archived",
			"chev": "EL9i8q_chev",
			"cost": "EL9i8q_cost",
			"grid2": "EL9i8q_grid2",
			"hist": "EL9i8q_hist",
			"histBar": "EL9i8q_histBar",
			"histBarTop": "EL9i8q_histBarTop",
			"histCol": "EL9i8q_histCol",
			"histX": "EL9i8q_histX",
			"metricBtn": "EL9i8q_metricBtn",
			"metricBtnOn": "EL9i8q_metricBtnOn",
			"metrics": "EL9i8q_metrics",
			"page": "EL9i8q_page",
			"panel": "EL9i8q_panel",
			"panelHead": "EL9i8q_panelHead",
			"panelTitle": "EL9i8q_panelTitle",
			"panelTotal": "EL9i8q_panelTotal",
			"rank": "EL9i8q_rank",
			"row": "EL9i8q_row",
			"rowBig": "EL9i8q_rowBig",
			"rowBody": "EL9i8q_rowBody",
			"rowSmall": "EL9i8q_rowSmall",
			"rowSub": "EL9i8q_rowSub",
			"rowTitle": "EL9i8q_rowTitle",
			"rowValue": "EL9i8q_rowValue",
			"searchInput": "EL9i8q_searchInput",
			"tag": "EL9i8q_tag",
			"tagChildren": "EL9i8q_tagChildren",
			"titleBtn": "EL9i8q_titleBtn",
			"titleLine": "EL9i8q_titleLine",
			"tokens": "EL9i8q_tokens",
			"tokensSub": "EL9i8q_tokensSub",
			"tokensValue": "EL9i8q_tokensValue",
			"topRow": "EL9i8q_topRow"
		};
		//#endregion
		//#region src/client/tabs/SessionsTab.tsx
		/**
		* 会话用量：最耗会话 / 会话形态 / 最近会话三块。
		* 口径：服务端只采集结算样本数（calls），消息数与工具调用数没有单独字段，
		* 「会话形态」的消息 / 工具调用两档都按 calls 分档；时长按首末时间差（分钟）分档。
		* 三个列表都只列主会话：子代理不单独占行（判定只认服务端归一的 origin），父行标子会话数。
		*/
		/** 榜单条数：与「会话形态」的直方图等高。 */
		const TOP_LIMIT = 5;
		/** 形态分布 6 档，与原型一致。 */
		const SHAPE_BUCKETS = [
			{
				min: 1,
				max: 5
			},
			{
				min: 6,
				max: 15
			},
			{
				min: 16,
				max: 30
			},
			{
				min: 31,
				max: 60
			},
			{
				min: 61,
				max: 120
			},
			{
				min: 121,
				max: Number.POSITIVE_INFINITY
			}
		];
		const BUCKET_LABELS = [
			"1-5",
			"6-15",
			"16-30",
			"31-60",
			"61-120",
			"121+"
		];
		/** 首屏渲染 50 个：本机上百个会话，一次全渲染会明显卡顿。 */
		const PAGE_SIZE = 50;
		/** 价目算出来的金额（内置价目 / 聚合价 / 同模型官方价）不是账单金额，按原型加 ≈ 前缀。 */
		const ESTIMATED_COST_SOURCES = [
			"catalog",
			"aggregate",
			"model"
		];
		function SessionsTab(props) {
			/** 取词：宿主切语言时重渲染 */
			const t = useT();
			const [nowMs] = (0, react.useState)(() => Date.now());
			const [topMetric, setTopMetric] = (0, react.useState)("tokens");
			const [shapeMetric, setShapeMetric] = (0, react.useState)("messages");
			const [scope, setScope] = (0, react.useState)("all");
			const [query, setQuery] = (0, react.useState)("");
			const [pageSize, setPageSize] = (0, react.useState)(PAGE_SIZE);
			const [detailId, setDetailId] = (0, react.useState)(null);
			const projectFilter = props.projectFilter ?? "";
			const modelFilter = props.modelFilter ?? "";
			const channelFilter = props.channelFilter ?? "";
			const windowFromMs = props.bounds === void 0 ? null : Date.parse(props.bounds.from + "T00:00:00");
			const windowToMs = props.bounds === void 0 ? null : Date.parse(props.bounds.to + "T23:59:59.999");
			/** 未过滤的全量行：会话详情抽屉里的子会话列表仍按全量找，筛选只作用于列表与榜单 */
			const allRows = props.data?.rows ?? [];
			/** 项目 / 模型筛选都作用在行上（逗号分隔多选，空串 = 全部）：榜单 / 形态 / 计数 / 最近列表全部由过滤后的行重算 */
			const rows = (0, react.useMemo)(() => allRows.filter((row) => {
				if (!selectionMatches(projectFilterValuesOf(row.workspace, void 0), projectFilter)) return false;
				if (!selectionMatches(row.models.map((model) => model.model), modelFilter)) return false;
				if (!selectionMatches([row.provider ?? "", ...row.models.map((model) => model.provider)], channelFilter)) return false;
				if (windowFromMs !== null && windowToMs !== null && (row.firstTime !== null || row.lastTime !== null)) {
					const startMs = row.firstTime ?? row.lastTime;
					if ((row.lastTime ?? row.firstTime) < windowFromMs || startMs > windowToMs) return false;
				}
				return true;
			}), [
				allRows,
				projectFilter,
				modelFilter,
				channelFilter,
				windowFromMs,
				windowToMs
			]);
			(0, react.useEffect)(() => {
				setPageSize(PAGE_SIZE);
			}, [
				scope,
				query,
				projectFilter,
				modelFilter
			]);
			/** 只列主会话：子代理不单独占行（详情抽屉里仍可逐个点开）。 */
			const mainRows = (0, react.useMemo)(() => rows.filter((row) => !isSubagentOf(row)), [rows]);
			/** 有结算样本的会话才算用量：没有 calls 也没有 tokens 的空壳不进榜单与形态分布。 */
			const pool = (0, react.useMemo)(() => mainRows.filter((row) => row.calls > 0 || row.tokens > 0), [mainRows]);
			const topRows = (0, react.useMemo)(() => pool.map((row) => ({
				row,
				value: topValueOf(row, topMetric)
			})).filter((entry) => entry.value > 0).sort((first, second) => second.value - first.value).slice(0, TOP_LIMIT).map((entry) => entry.row), [pool, topMetric]);
			const histogram = (0, react.useMemo)(() => SHAPE_BUCKETS.map((bucket) => pool.filter((row) => {
				const value = shapeValueOf(row, shapeMetric);
				return value >= bucket.min && value <= bucket.max;
			}).length), [pool, shapeMetric]);
			const recentRows = (0, react.useMemo)(() => {
				const keyword = query.trim().toLowerCase();
				return mainRows.filter((row) => {
					if ((row.title ?? "") === "" && (row.prompt ?? "") === "") return false;
					if (keyword === "") return true;
					return ((row.title ?? "") + " " + row.id + " " + (row.workspace ?? "") + " " + (row.prompt ?? "")).toLowerCase().includes(keyword);
				}).sort((first, second) => (second.lastTime ?? 0) - (first.lastTime ?? 0));
			}, [mainRows, query]);
			/** 归档只影响列出的行：会话数与用量统计仍按全部会话算（归档只标注、不剔除）。 */
			const visibleRows = (0, react.useMemo)(() => scope === "hideArchived" ? recentRows.filter((row) => !row.archived) : recentRows, [recentRows, scope]);
			if (props.data === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { title: t("s.loading") });
			const shownRows = visibleRows.slice(0, pageSize);
			const histogramMax = Math.max(1, ...histogram);
			const detailRow = detailId === null ? null : allRows.find((row) => row.id === detailId) ?? null;
			const rowOptions = {
				channels: props.channels,
				tooltip: props.tooltip,
				nowMs,
				onOpenDetail: (id) => setDetailId(id),
				onOpenProject: props.onOpenProject
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sessions_module_css_default.page,
				children: [
					props.data.coverage.status !== "complete" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shared_module_css_default.warning,
						children: props.data.coverage.status === "unavailable" ? t("s.unavailable") : t("s.partial") + " " + String(props.data.coverage.skippedSessions) + t("s.partialTail")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sessions_module_css_default.grid2,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: sessions_module_css_default.panel,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: sessions_module_css_default.panelHead,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", {
										className: sessions_module_css_default.panelTitle,
										children: t("sessions.top")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricSwitch, {
										value: topMetric,
										onChange: setTopMetric,
										options: [
											{
												value: "tokens",
												label: t("sessions.metricTokens")
											},
											{
												value: "cost",
												label: t("sessions.metricCost")
											},
											{
												value: "duration",
												label: t("sessions.metricDuration")
											}
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: sessions_module_css_default.panelTotal,
										children: t("sessions.count", { count: fmtCount(pool.length) })
									})
								]
							}), topRows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: shared_module_css_default.empty,
								children: t(topMetric === "cost" ? "s.noCost" : "sessions.noData")
							}) : topRows.map((row, index) => topRowOf(row, index + 1, topMetric, props.channels, () => setDetailId(row.id)))]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: sessions_module_css_default.panel,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: sessions_module_css_default.panelHead,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", {
										className: sessions_module_css_default.panelTitle,
										children: t("sessions.shape")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricSwitch, {
										value: shapeMetric,
										onChange: setShapeMetric,
										options: [
											{
												value: "messages",
												label: t("sessions.metricMessages"),
												hint: t("sessions.callsBucket")
											},
											{
												value: "duration",
												label: t("sessions.metricDuration")
											},
											{
												value: "tools",
												label: t("sessions.metricTools"),
												hint: t("sessions.callsBucket")
											}
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: sessions_module_css_default.panelTotal,
										children: t("sessions.count", { count: fmtCount(pool.length) })
									})
								]
							}), pool.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: shared_module_css_default.empty,
								children: t("sessions.noData")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: sessions_module_css_default.hist,
								children: histogram.map((count, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: sessions_module_css_default.histCol,
									title: BUCKET_LABELS[index] + " · " + fmtCount(count),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: sessions_module_css_default.histBar + (count === histogramMax ? " " + sessions_module_css_default.histBarTop : ""),
										style: { height: (count === 0 ? 0 : Math.max(4, count / histogramMax * 100)) + "%" }
									})
								}, BUCKET_LABELS[index]))
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: sessions_module_css_default.histX,
								children: BUCKET_LABELS.map((label) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: label }, label))
							})] })]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: sessions_module_css_default.panel,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: sessions_module_css_default.panelHead,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", {
										className: sessions_module_css_default.panelTitle,
										children: t("sessions.recent")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Select, {
										ariaLabel: t("sessions.scope"),
										value: scope,
										onChange: (value) => setScope(value),
										options: [{
											value: "all",
											labelKey: "sessions.all"
										}, {
											value: "hideArchived",
											labelKey: "sessions.hideArchived"
										}]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: lists_module_css_default.searchInput + " " + sessions_module_css_default.searchInput,
										placeholder: t("sessions.searchPlaceholder"),
										"aria-label": t("sessions.searchPlaceholder"),
										value: query,
										onChange: (event) => setQuery(event.target.value)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: sessions_module_css_default.panelTotal,
										children: t("sessions.count", { count: fmtCount(recentRows.length) })
									})
								]
							}),
							visibleRows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: shared_module_css_default.empty,
								children: t("s.empty")
							}) : shownRows.map((row) => recentRowOf(row, rowOptions)),
							visibleRows.length > shownRows.length && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: lists_module_css_default.moreRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: lists_module_css_default.moreBtn,
									onClick: () => setPageSize(pageSize + PAGE_SIZE),
									children: t("s.loadMore", { count: PAGE_SIZE })
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: lists_module_css_default.moreText,
									children: t("s.shownCount", {
										shown: shownRows.length,
										total: visibleRows.length
									})
								})]
							})
						]
					}),
					detailId !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionDetailDrawer, {
						sessionId: detailId,
						fallbackTitle: detailRow?.title ?? null,
						channels: props.channels,
						subagents: detailRow === null ? [] : allRows.filter((row) => isSubagentOf(row) && row.parentSessionId === detailRow.id),
						onOpenSession: setDetailId,
						parentId: detailRow?.parentSessionId ?? null,
						parentTitle: detailRow === null || detailRow.parentSessionId == null ? null : allRows.find((row) => row.id === detailRow.parentSessionId)?.title ?? null,
						onClose: () => setDetailId(null)
					})
				]
			});
		}
		/** 指标切换：三档分段控件，选中档给 aria-pressed；口径有兜底的档给悬停说明。 */
		function MetricSwitch(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: sessions_module_css_default.metrics,
				role: "group",
				children: props.options.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: sessions_module_css_default.metricBtn + (option.value === props.value ? " " + sessions_module_css_default.metricBtnOn : ""),
					"aria-pressed": option.value === props.value,
					title: option.hint,
					onClick: () => props.onChange(option.value),
					children: option.label
				}, option.value))
			});
		}
		/** 最耗会话的一行：排名 + 标题 / 副标 + 右侧大数字与其下的次要数值。 */
		function topRowOf(row, rank, metric, channels, onOpen) {
			const value = topTextOf(row, metric, channelOf(channels, row.provider));
			const subagentCount = row.subagentCount ?? 0;
			const subParts = [row.workspace === null ? t("s.noWorkspace") : row.workspace];
			subParts.push(t("sessions.calls", { count: fmtCount(row.calls) }));
			if (metric !== "duration" && row.crossDays > 0) subParts.push(t("sessions.crossDays", { days: row.crossDays }));
			if (subagentCount > 0) subParts.push(t("sessions.subagents", { count: subagentCount }));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: sessions_module_css_default.topRow + (row.archived ? " " + sessions_module_css_default.archived : ""),
				onClick: onOpen,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: sessions_module_css_default.rank,
						children: rank
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: sessions_module_css_default.rowBody,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: sessions_module_css_default.titleLine,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: sessions_module_css_default.rowTitle,
								children: titleOf(row)
							}), row.archived && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: sessions_module_css_default.tag,
								children: t("s.archived")
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: sessions_module_css_default.rowSub,
							children: subParts.join(" · ")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: sessions_module_css_default.rowValue,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: sessions_module_css_default.rowBig,
							children: value.big
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: sessions_module_css_default.rowSmall,
							children: value.small
						})]
					})
				]
			}, row.id);
		}
		/** 最近会话的一行：标题 + 副标（项目 · 模型 · 时间）｜ Tokens ｜ 成本 ｜ ›。 */
		function recentRowOf(row, options) {
			const channel = channelOf(options.channels, row.provider);
			const model = dominantModelOf(row);
			const ioBreakdown = ioBreakdownOf(row);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: sessions_module_css_default.row + (row.archived ? " " + sessions_module_css_default.archived : ""),
				onClick: () => options.onOpenDetail(row.id),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sessions_module_css_default.rowBody,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: sessions_module_css_default.titleLine,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: sessions_module_css_default.titleBtn,
									onClick: (event) => {
										event.stopPropagation();
										options.onOpenDetail(row.id);
									},
									children: titleOf(row)
								}),
								row.archived && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: sessions_module_css_default.tag,
									children: t("s.archived")
								}),
								(row.subagentCount ?? 0) > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: sessions_module_css_default.tag + " " + sessions_module_css_default.tagChildren,
									title: t("sessions.subagentTokens", { tokens: fmtTokens(row.subagentTokens ?? 0) }),
									children: t("sessions.subagents", { count: row.subagentCount ?? 0 })
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: sessions_module_css_default.rowSub,
							children: [
								row.workspace === null ? t("s.noWorkspace") : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: lists_module_css_default.linkBtn,
									title: t("s.gotoProject") + row.workspace,
									onClick: (event) => {
										event.stopPropagation();
										options.onOpenProject(row.workspace ?? "");
									},
									children: row.workspace
								}),
								model === null ? "" : " · " + model,
								" · " + fmtRelative(row.lastTime, options.nowMs)
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: sessions_module_css_default.tokens,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: sessions_module_css_default.tokensValue,
							children: fmtTokens(row.tokens)
						}), ioBreakdown === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: sessions_module_css_default.tokensSub,
							children: ioBreakdown
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sessions_module_css_default.cost,
						onMouseEnter: (event) => options.tooltip.show(event, costTipOf(row)),
						onMouseMove: (event) => options.tooltip.show(event, costTipOf(row)),
						onMouseLeave: options.tooltip.hide,
						children: costTextOf(channel, row)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: sessions_module_css_default.chev,
						"aria-hidden": "true",
						children: "›"
					})
				]
			}, row.id);
		}
		/** 成本单元格的悬停说明：这一格钱是怎么来的（≈ 只写得下「估算」这一个信号）。 */
		function costTipOf(row) {
			const source = row.costSource ?? "none";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: t("s.sessionCost") }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipSub, { children: costSourceHintOf(source, row.partial) }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
					label: t("s.amount"),
					amount: row.cost === null ? "—" : moneyTotalsTextOf(row),
					rate: costSourceLabelOf(source, t)
				})
			] });
		}
		/** 成本文案：价目算出来的金额加 ≈（折算已经带 ≈ 的不重复加）。 */
		function costTextOf(channel, row) {
			const cell = costCellOf(channel, row);
			if (!cell.amount) return cell.text;
			const source = row.costSource;
			if (source === void 0 || !ESTIMATED_COST_SOURCES.includes(source)) return cell.text;
			return cell.text.startsWith("≈") ? cell.text : "≈" + cell.text;
		}
		function topValueOf(row, metric) {
			if (metric === "cost") return comparableMoneyOf(row) ?? row.cost ?? 0;
			if (metric === "duration") return durationOf(row);
			return row.tokens;
		}
		function topTextOf(row, metric, channel) {
			const cost = costTextOf(channel, row);
			if (metric === "cost") return {
				big: cost,
				small: fmtTokens(row.tokens)
			};
			if (metric === "duration") return {
				big: fmtDuration(durationOf(row)),
				small: cost
			};
			return {
				big: fmtTokens(row.tokens),
				small: cost
			};
		}
		/** 形态分档值：消息 / 工具调用都取结算样本数，时长取分钟（不足 1 分钟按 1 算，落进第一档）。 */
		function shapeValueOf(row, metric) {
			if (metric === "duration") return Math.max(1, Math.round(durationOf(row) / 6e4));
			return row.calls;
		}
		function durationOf(row) {
			if (row.firstTime === null || row.lastTime === null) return 0;
			return Math.max(0, row.lastTime - row.firstTime);
		}
		/** 子代理只认服务端归一后的 origin（宿主投影 `subagent.identity`）；父会话链接不作为判定依据。 */
		function isSubagentOf(row) {
			return row.origin === "subagent";
		}
		function titleOf(row) {
			return row.title ?? t("s.noPrompt") + " · " + shortIdOf(row.id);
		}
		/** 会话头通常不带标题，用 id 的短片段做可读标识。 */
		function shortIdOf(id) {
			return id.replace(/^session-/, "").slice(0, 8);
		}
		/** 副标只放得下一个模型：取该会话 tokens 最多的那个。 */
		function dominantModelOf(row) {
			let best = null;
			for (const model of row.models) if (best === null || model.tokens > best.tokens) best = {
				model: model.model,
				tokens: model.tokens
			};
			return best === null ? null : best.model;
		}
		/**
		* 最近会话 Tokens 下方的第二行：输入 / 输出 / 缓存读按模型分桶求和。
		* 列表行的 tokens 只有总数，分桶挂在 `models[].buckets` 上；三者全为 0（或老快照没有 buckets）时不显示，
		* 避免出现「输入 0 · 输出 0」这种没有信息量的行。
		*/
		function ioBreakdownOf(row) {
			let inputTokens = 0;
			let outputTokens = 0;
			let cacheReadTokens = 0;
			for (const model of row.models) {
				inputTokens += model.buckets?.inputTokens ?? 0;
				outputTokens += model.buckets?.outputTokens ?? 0;
				cacheReadTokens += model.buckets?.cacheReadTokens ?? 0;
			}
			if (inputTokens === 0 && outputTokens === 0 && cacheReadTokens === 0) return null;
			return [
				t("c.input") + " " + fmtTokens(inputTokens),
				t("c.output") + " " + fmtTokens(outputTokens),
				t("c.cacheRead") + " " + fmtTokens(cacheReadTokens)
			].join(" · ");
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/tools.module.css.mjs
		const css$3 = ".LvMOmq_page{flex-direction:column;gap:10px;display:flex}.LvMOmq_grid2{grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));align-items:stretch;gap:10px;display:grid}.LvMOmq_panel{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:9px;min-width:0;padding:10px 12px}.LvMOmq_panelHead{flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:8px;display:flex}.LvMOmq_panelTitle{color:var(--dsw-alias-label-primary,#e8e8ec);font-size:var(--ku-title,17px);margin:0;font-weight:600}.LvMOmq_panelMeta{color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ku-body,14px);font-variant-numeric:tabular-nums;white-space:nowrap;margin-left:auto}.LvMOmq_headNum{color:var(--dsw-alias-label-primary,#e8e8ec);font-size:var(--ku-kpi,20px);font-variant-numeric:tabular-nums;font-weight:650}.LvMOmq_row{grid-template-columns:minmax(76px,112px) 1fr 58px 56px;align-items:center;gap:8px;padding:4px 0;display:grid}.LvMOmq_rowName{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:var(--ku-body,14px);overflow:hidden}.LvMOmq_rowTrack{background:var(--dsw-alias-interactive-bg-active,#80808c2e);border-radius:4px;height:9px;overflow:hidden}.LvMOmq_rowFill,.LvMOmq_rowFillTop,.LvMOmq_rowFillOther{background:var(--dsw-alias-state-business-primary,#5b8cff);border-radius:4px;height:100%;display:block}.LvMOmq_rowFill{opacity:.58}.LvMOmq_rowFillTop{opacity:1}.LvMOmq_rowFillOther{opacity:.34}.LvMOmq_rowValue{text-align:right;color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:var(--ku-body,14px);font-variant-numeric:tabular-nums;white-space:nowrap}.LvMOmq_rowPercent{text-align:right;color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ku-body,14px);font-variant-numeric:tabular-nums;white-space:nowrap}.LvMOmq_stack{border-radius:6px;height:22px;display:flex;overflow:hidden}.LvMOmq_stackSegment{white-space:nowrap;min-width:0;color:var(--dsw-alias-label-primary-foreground,#fff);font-size:var(--ku-body,14px);font-variant-numeric:tabular-nums;flex-basis:0;justify-content:center;align-items:center;padding:0 6px;display:flex;overflow:hidden}.LvMOmq_stack1{background:var(--dsw-alias-state-business-primary,#5b8cff)}.LvMOmq_stack2{background:color-mix(in srgb, var(--dsw-alias-state-business-primary,#5b8cff) 55%, var(--dsw-alias-label-primary,#111))}.LvMOmq_stack3{background:color-mix(in srgb, var(--dsw-alias-state-success-primary,#3fb96f) 60%, var(--dsw-alias-label-primary,#111))}.LvMOmq_stack4{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary,#e0a13c) 60%, var(--dsw-alias-label-primary,#111))}.LvMOmq_stackOther{background:var(--dsw-alias-interactive-bg-active,#80808c38);color:var(--dsw-alias-label-primary,#e8e8ec)}.LvMOmq_legend{color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:var(--ku-body,14px);flex-wrap:wrap;gap:12px;margin-top:8px;display:flex}.LvMOmq_legend span{font-variant-numeric:tabular-nums;align-items:center;gap:4px;display:inline-flex}.LvMOmq_dot1,.LvMOmq_dot2,.LvMOmq_dot3,.LvMOmq_dot4,.LvMOmq_dotOther{border-radius:2px;width:8px;height:8px;display:inline-block}.LvMOmq_dot1{background:var(--dsw-alias-state-business-primary,#5b8cff)}.LvMOmq_dot2{background:color-mix(in srgb, var(--dsw-alias-state-business-primary,#5b8cff) 55%, var(--dsw-alias-label-primary,#111))}.LvMOmq_dot3{background:color-mix(in srgb, var(--dsw-alias-state-success-primary,#3fb96f) 60%, var(--dsw-alias-label-primary,#111))}.LvMOmq_dot4{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary,#e0a13c) 60%, var(--dsw-alias-label-primary,#111))}.LvMOmq_dotOther{background:var(--dsw-alias-interactive-bg-active,#80808c38)}.LvMOmq_mini{align-items:flex-end;gap:3px;height:56px;margin-top:8px;display:flex}.LvMOmq_miniItem{flex:1;align-items:flex-end;height:100%;display:flex}.LvMOmq_miniBar{background:var(--dsw-alias-state-business-primary,#5b8cff);opacity:.5;border-radius:2px;width:100%;display:block}.LvMOmq_miniBarTop{opacity:1}.LvMOmq_dimLine{color:var(--dsw-alias-label-tertiary,#67676f);font-size:var(--ku-body,14px);padding:6px 0}";
		const tagId$3 = "dsh-key-usage/tools.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		const cssRegistry$3 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$3.some((e) => e.tagId === tagId$3)) cssRegistry$3.push({
			tagId: tagId$3,
			css: css$3
		});
		var tools_module_css_default = {
			"dimLine": "LvMOmq_dimLine",
			"dot1": "LvMOmq_dot1",
			"dot2": "LvMOmq_dot2",
			"dot3": "LvMOmq_dot3",
			"dot4": "LvMOmq_dot4",
			"dotOther": "LvMOmq_dotOther",
			"grid2": "LvMOmq_grid2",
			"headNum": "LvMOmq_headNum",
			"legend": "LvMOmq_legend",
			"mini": "LvMOmq_mini",
			"miniBar": "LvMOmq_miniBar",
			"miniBarTop": "LvMOmq_miniBarTop",
			"miniItem": "LvMOmq_miniItem",
			"page": "LvMOmq_page",
			"panel": "LvMOmq_panel",
			"panelHead": "LvMOmq_panelHead",
			"panelMeta": "LvMOmq_panelMeta",
			"panelTitle": "LvMOmq_panelTitle",
			"row": "LvMOmq_row",
			"rowFill": "LvMOmq_rowFill",
			"rowFillOther": "LvMOmq_rowFillOther",
			"rowFillTop": "LvMOmq_rowFillTop",
			"rowName": "LvMOmq_rowName",
			"rowPercent": "LvMOmq_rowPercent",
			"rowTrack": "LvMOmq_rowTrack",
			"rowValue": "LvMOmq_rowValue",
			"stack": "LvMOmq_stack",
			"stack1": "LvMOmq_stack1",
			"stack2": "LvMOmq_stack2",
			"stack3": "LvMOmq_stack3",
			"stack4": "LvMOmq_stack4",
			"stackOther": "LvMOmq_stackOther",
			"stackSegment": "LvMOmq_stackSegment"
		};
		//#endregion
		//#region src/client/tabs/ToolsTab.tsx
		/**
		* 工具与技能：会话事件里的 `tool/call` 统计（工具 Top7 / 技能 Top6+其它 / MCP server Top8 / 工具占比 + 窗口内迷你柱）。
		*
		* 数据来自 `GET /tools`（窗口 + 项目 + 模型跟随顶部筛选，服务端按会话折叠里的按天计数表聚合）；
		* 首屏与请求失败时用统一快照的 `tools` 段兜底（全部会话、全量历史）；`null` = 暂无采集（老库 / 读不到会话），
		* 显示占位而不是 0。占比口径由服务端算好（该行次数 / 同类总次数），界面只做取整与条宽换算。
		*/
		/** 工具占比堆叠条只单列前 4 个工具，其余并成「其它」。 */
		const SHARE_TOP_LIMIT = 4;
		/** 条宽下限（2%）：0 宽的条看起来像没渲染。 */
		const MIN_BAR_PERCENT = 2;
		/** 排行榜行：名字 + 横条 + 次数 + 占比（正文 13px）。 */
		function RankRows(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: props.rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: tools_module_css_default.row,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: tools_module_css_default.rowName,
						title: row.label,
						children: row.label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: tools_module_css_default.rowTrack,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
							className: row.muted === true ? tools_module_css_default.rowFillOther : row.top ? tools_module_css_default.rowFillTop : tools_module_css_default.rowFill,
							style: { width: Math.max(MIN_BAR_PERCENT, Math.round(row.barPercent)) + "%" }
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: tools_module_css_default.rowValue,
						children: fmtTokens(row.calls)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: tools_module_css_default.rowPercent,
						children: Math.round(row.sharePercent) + "%"
					})
				]
			}, row.key)) });
		}
		/** 横条宽度：相对本榜最大次数（第一名 100%）。 */
		function barPercentOf(calls, maxCalls) {
			if (maxCalls <= 0) return 0;
			return calls / maxCalls * 100;
		}
		function ToolsTab(props) {
			const t = useT();
			const data = props.data;
			const share = (0, react.useMemo)(() => {
				if (data === null) return null;
				const topRows = data.tools.slice(0, SHARE_TOP_LIMIT);
				const topCalls = topRows.reduce((total, row) => total + row.calls, 0);
				return {
					topRows,
					otherCalls: Math.max(0, data.calls - topCalls)
				};
			}, [data]);
			if (data === null || data.calls <= 0 || share === null) {
				const reason = failureReasonOf(SNAPSHOT_PATH);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: tools_module_css_default.page,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, {
						title: t("tools.empty"),
						reason
					})
				});
			}
			const maxToolCalls = data.tools.length > 0 ? data.tools[0].calls : 0;
			const toolRows = data.tools.map((row, index) => ({
				key: "tool-" + row.name,
				label: row.name,
				calls: row.calls,
				sharePercent: row.sharePercent,
				barPercent: barPercentOf(row.calls, maxToolCalls),
				top: index === 0
			}));
			const skills = data.skills;
			const skillOtherVisible = skills.other.count > 0 && skills.other.calls > 0;
			const skillMaxCalls = skills.rows[0]?.calls ?? 0;
			const skillRows = skills.rows.map((row, index) => ({
				key: "skill-" + row.name,
				label: row.name,
				calls: row.calls,
				sharePercent: row.sharePercent,
				barPercent: barPercentOf(row.calls, skillMaxCalls),
				top: index === 0
			}));
			if (skillOtherVisible) skillRows.push({
				key: "skill-other",
				label: t("tools.otherCount", { count: fmtCount(skills.other.count) }),
				calls: skills.other.calls,
				sharePercent: skills.calls > 0 ? skills.other.calls / skills.calls * 100 : 0,
				barPercent: 100,
				top: false,
				muted: true
			});
			const mcp = data.mcp;
			const mcpMaxCalls = mcp.rows[0]?.calls ?? 0;
			const mcpRows = mcp.rows.map((row, index) => ({
				key: "mcp-" + row.server,
				label: row.server,
				calls: row.calls,
				sharePercent: row.sharePercent,
				barPercent: barPercentOf(row.calls, mcpMaxCalls),
				top: index === 0
			}));
			const topDisplayPercents = share.topRows.map((row) => Math.round(row.sharePercent));
			const otherDisplayPercent = Math.max(0, 100 - topDisplayPercents.reduce((total, percent) => total + percent, 0));
			const maxDayCalls = Math.max(1, ...data.days.map((day) => day.calls));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: tools_module_css_default.page,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: tools_module_css_default.grid2,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: tools_module_css_default.panel,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: tools_module_css_default.panelHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: tools_module_css_default.panelTitle,
								children: t("tools.tools")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: tools_module_css_default.panelMeta,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: tools_module_css_default.headNum,
										children: fmtTokens(data.calls)
									}),
									" ",
									t("tools.callsUnit"),
									" ·",
									" ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: tools_module_css_default.headNum,
										children: fmtCount(data.sessions)
									}),
									" ",
									t("tools.sessionsUnit")
								]
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RankRows, { rows: toolRows })]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: tools_module_css_default.panel,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: tools_module_css_default.panelHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: tools_module_css_default.panelTitle,
								children: t("tools.skills")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: tools_module_css_default.panelMeta,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: tools_module_css_default.headNum,
										children: fmtCount(skills.calls)
									}),
									" ",
									t("tools.callsUnit"),
									" ·",
									" ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: tools_module_css_default.headNum,
										children: fmtCount(skills.count)
									}),
									" ",
									t("tools.skillsUnit")
								]
							})]
						}), skillRows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: tools_module_css_default.dimLine,
							children: t("tools.none")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RankRows, { rows: skillRows })]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: tools_module_css_default.grid2,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: tools_module_css_default.panel,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: tools_module_css_default.panelHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: tools_module_css_default.panelTitle,
								children: t("tools.mcp")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: tools_module_css_default.panelMeta,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: tools_module_css_default.headNum,
										children: fmtCount(mcp.count)
									}),
									" ",
									t("tools.serversUnit"),
									" ·",
									" ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: tools_module_css_default.headNum,
										children: fmtCount(mcp.calls)
									}),
									" ",
									t("tools.callsUnit")
								]
							})]
						}), mcpRows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: tools_module_css_default.dimLine,
							children: t("tools.none")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RankRows, { rows: mcpRows })]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: tools_module_css_default.panel,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: tools_module_css_default.panelHead,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
									className: tools_module_css_default.panelTitle,
									children: t("tools.share")
								}), share.topRows.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: tools_module_css_default.panelMeta,
									children: t("tools.shareTop", { name: share.topRows[0].name })
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: tools_module_css_default.stack,
								children: [share.topRows.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: tools_module_css_default.stackSegment + " " + tools_module_css_default["stack" + String(index + 1)],
									style: { flexGrow: Math.max(1, topDisplayPercents[index]) },
									title: row.name + " · " + topDisplayPercents[index] + "%",
									children: [
										row.name,
										" ",
										topDisplayPercents[index],
										"%"
									]
								}, "share-" + row.name)), share.otherCalls > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: tools_module_css_default.stackSegment + " " + tools_module_css_default.stackOther,
									style: { flexGrow: Math.max(1, otherDisplayPercent) },
									title: t("tools.other") + " · " + otherDisplayPercent + "%",
									children: [
										t("tools.other"),
										" ",
										otherDisplayPercent,
										"%"
									]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: tools_module_css_default.legend,
								children: [share.topRows.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: tools_module_css_default["dot" + String(index + 1)] }),
									row.name,
									" ",
									fmtTokens(row.calls)
								] }, "legend-" + row.name)), share.otherCalls > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: tools_module_css_default.dotOther }),
									t("tools.other"),
									" ",
									fmtTokens(share.otherCalls)
								] })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: tools_module_css_default.mini,
								children: data.days.map((day) => {
									const heightPercent = day.calls / maxDayCalls * 100;
									const isTop = day.calls > 0 && day.calls === maxDayCalls;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: tools_module_css_default.miniItem,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
											className: isTop ? tools_module_css_default.miniBar + " " + tools_module_css_default.miniBarTop : tools_module_css_default.miniBar,
											style: { height: (day.calls > 0 ? Math.max(4, heightPercent) : 0) + "%" },
											title: t("tools.dayBarTitle", {
												date: fmtShortDate(day.date),
												calls: fmtCount(day.calls)
											})
										})
									}, "day-" + day.date);
								})
							})
						]
					})]
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/wordcloud.module.css.mjs
		const css$2 = ".b4AbkW_cloud{width:100%;height:auto;display:block}.b4AbkW_word{font-weight:500}.b4AbkW_heavy{font-weight:700}.b4AbkW_medium{font-weight:600}.b4AbkW_tone0{fill:var(--dsw-alias-state-business-primary,#5b8cff)}.b4AbkW_tone1{fill:var(--dsw-alias-state-warn-primary,#e0a13c)}.b4AbkW_tone2{fill:var(--dsw-alias-state-success-primary,#3fb96f)}.b4AbkW_tone3{fill:var(--dsw-alias-state-error-primary,#e05a5a)}.b4AbkW_tone4{fill:color-mix(in srgb, var(--dsw-alias-state-business-primary,#5b8cff) 45%, var(--dsw-alias-state-success-primary,#3fb96f))}.b4AbkW_tone5{fill:color-mix(in srgb, var(--dsw-alias-state-warn-primary,#e0a13c) 45%, var(--dsw-alias-state-error-primary,#e05a5a))}.b4AbkW_tone6{fill:color-mix(in srgb, var(--dsw-alias-state-business-primary,#5b8cff) 40%, var(--dsw-alias-state-warn-primary,#e0a13c))}.b4AbkW_tone7{fill:color-mix(in srgb, var(--dsw-alias-label-secondary,#9a9aa6) 55%, var(--dsw-alias-state-business-primary,#5b8cff))}.b4AbkW_empty{text-align:center;color:var(--dsw-alias-label-tertiary,#67676f);padding:24px 0}";
		const tagId$2 = "dsh-key-usage/wordcloud.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		const cssRegistry$2 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$2.some((e) => e.tagId === tagId$2)) cssRegistry$2.push({
			tagId: tagId$2,
			css: css$2
		});
		var wordcloud_module_css_default = {
			"cloud": "b4AbkW_cloud",
			"empty": "b4AbkW_empty",
			"heavy": "b4AbkW_heavy",
			"medium": "b4AbkW_medium",
			"tone0": "b4AbkW_tone0",
			"tone1": "b4AbkW_tone1",
			"tone2": "b4AbkW_tone2",
			"tone3": "b4AbkW_tone3",
			"tone4": "b4AbkW_tone4",
			"tone5": "b4AbkW_tone5",
			"tone6": "b4AbkW_tone6",
			"tone7": "b4AbkW_tone7",
			"word": "b4AbkW_word"
		};
		//#endregion
		//#region src/client/components/WordCloud.tsx
		/**
		* 提问词云：纯 SVG 螺旋布局（阿基米德螺线 + 矩形碰撞检测），零依赖、不量 DOM。
		* 坐标按固定 720×300 计算，容器只负责等比缩放，所以容器尺寸怎么变都不会重叠。
		*/
		/** 词云配色：按排名轮换的 8 个色相（都用宿主令牌派生，明暗主题都可见）。 */
		const WORD_TONES = [
			wordcloud_module_css_default.tone0,
			wordcloud_module_css_default.tone1,
			wordcloud_module_css_default.tone2,
			wordcloud_module_css_default.tone3,
			wordcloud_module_css_default.tone4,
			wordcloud_module_css_default.tone5,
			wordcloud_module_css_default.tone6,
			wordcloud_module_css_default.tone7
		];
		/** 画布逻辑尺寸（CSS 里按宽度等比缩放）。 */
		const VIEW_WIDTH = 720;
		const VIEW_HEIGHT = 300;
		const MAX_WORDS = 56;
		/** 画布按容器宽度等比缩放（约 0.77 倍），17 对应屏幕上约 13px，保证最小一档不小于正文。 */
		const MIN_FONT = 17;
		const CJK = /[\u4e00-\u9fa5]/;
		/** 字号按频次的平方根映射：线性映射会让高频词把画布撑爆、低频词小到看不清。 */
		function fontSizeOf(count, maxCount) {
			const ratio = maxCount <= 0 ? 0 : Math.sqrt(count / maxCount);
			return Math.round(MIN_FONT + ratio * 17);
		}
		/** 粗估词宽（中文按 1 个字号、其它按 0.58），避免为测量而读 DOM。 */
		function widthOf(word, fontSize) {
			let units = 0;
			for (const char of word) units += CJK.test(char) ? 1 : .58;
			return units * fontSize + fontSize * .35;
		}
		function overlaps(first, second) {
			const gap = 1.5;
			return first.x - gap < second.x + second.width && second.x - gap < first.x + first.width && first.y - gap < second.y + second.height && second.y - gap < first.y + first.height;
		}
		/** 从中心向外螺旋找空位；放不下就丢弃（比硬塞更耐看）。 */
		function layoutWords(words) {
			const ranked = [...words].sort((first, second) => second.count - first.count).slice(0, MAX_WORDS);
			if (ranked.length === 0) return [];
			const maxCount = ranked[0].count;
			const centerX = VIEW_WIDTH / 2;
			const centerY = VIEW_HEIGHT / 2;
			const placed = [];
			for (const item of ranked) {
				const fontSize = fontSizeOf(item.count, maxCount);
				const width = widthOf(item.word, fontSize);
				const height = fontSize * 1.14;
				for (let step = 0; step < 2200; step += 1) {
					const angle = step * .32;
					const radius = 1.9 * angle;
					const x = centerX + radius * Math.cos(angle) - width / 2;
					const y = centerY + radius * Math.sin(angle) * .58 - height / 2;
					if (x < 2 || y < 2 || x + width > 718 || y + height > 298) continue;
					const box = {
						x,
						y,
						width,
						height
					};
					if (placed.some((item2) => overlaps(box, {
						x: item2.x,
						y: item2.y,
						width: item2.width,
						height: item2.height
					}))) continue;
					placed.push({
						word: item.word,
						count: item.count,
						x,
						y,
						width,
						height,
						fontSize
					});
					break;
				}
			}
			return placed;
		}
		function WordCloud(props) {
			const placed = (0, react.useMemo)(() => layoutWords(props.words), [props.words]);
			if (placed.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: wordcloud_module_css_default.empty,
				children: props.emptyText
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				className: wordcloud_module_css_default.cloud,
				viewBox: "0 0 " + String(VIEW_WIDTH) + " " + String(VIEW_HEIGHT),
				role: "img",
				"aria-label": props.emptyText,
				children: placed.map((item, index) => {
					const tone = WORD_TONES[index % WORD_TONES.length] ?? wordcloud_module_css_default.tone0;
					const weight = index < 6 ? wordcloud_module_css_default.heavy : index < 18 ? wordcloud_module_css_default.medium : "";
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("text", {
						x: item.x + item.width / 2,
						y: item.y + item.height / 2,
						textAnchor: "middle",
						dominantBaseline: "central",
						fontSize: item.fontSize,
						className: [
							wordcloud_module_css_default.word,
							tone,
							weight
						].join(" ").trim(),
						children: [item.word, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: props.tipOf === void 0 ? item.word + " · " + String(item.count) : props.tipOf(item.word, item.count) })]
					}, item.word);
				})
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/words.module.css.mjs
		const css$1 = ".VeBaIW_page{--words-body:var(--ku-body,14px);--words-title:var(--ku-title,17px);--words-kpi:var(--ku-kpi,20px);font-size:var(--words-body);flex-direction:column;gap:10px;display:flex}.VeBaIW_kpis{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;display:grid}.VeBaIW_kpi{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:9px;min-width:0;padding:8px 10px}.VeBaIW_kpiLabel{color:var(--dsw-alias-label-tertiary,#67676f)}.VeBaIW_kpiValue{font-size:var(--words-kpi);letter-spacing:-.02em;font-variant-numeric:tabular-nums;text-overflow:ellipsis;white-space:nowrap;margin:2px 0;font-weight:700;overflow:hidden}.VeBaIW_kpiDetail{color:var(--dsw-alias-label-tertiary,#67676f);font-variant-numeric:tabular-nums}.VeBaIW_rise{color:var(--dsw-alias-state-error-primary,#e05a5a);margin-left:4px}.VeBaIW_fall{color:var(--dsw-alias-state-success-primary,#3fb96f);margin-left:4px}.VeBaIW_panel{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:9px;flex-direction:column;min-width:0;padding:10px 12px;display:flex}.VeBaIW_panelHead{flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:8px;display:flex}.VeBaIW_panelTitle{color:var(--dsw-alias-label-primary,#e8e8ec);font-size:var(--words-title);font-weight:600}.VeBaIW_panelAction{align-items:center;gap:8px;margin-left:auto;display:inline-flex}.VeBaIW_panelNote{color:var(--dsw-alias-label-tertiary,#67676f);font-variant-numeric:tabular-nums;white-space:nowrap}.VeBaIW_flat{color:var(--dsw-alias-label-tertiary,#67676f);margin-left:4px}";
		const tagId$1 = "dsh-key-usage/words.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		const cssRegistry$1 = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry$1.some((e) => e.tagId === tagId$1)) cssRegistry$1.push({
			tagId: tagId$1,
			css: css$1
		});
		var words_module_css_default = {
			"fall": "VeBaIW_fall",
			"flat": "VeBaIW_flat",
			"kpi": "VeBaIW_kpi",
			"kpiDetail": "VeBaIW_kpiDetail",
			"kpiLabel": "VeBaIW_kpiLabel",
			"kpiValue": "VeBaIW_kpiValue",
			"kpis": "VeBaIW_kpis",
			"page": "VeBaIW_page",
			"panel": "VeBaIW_panel",
			"panelAction": "VeBaIW_panelAction",
			"panelHead": "VeBaIW_panelHead",
			"panelNote": "VeBaIW_panelNote",
			"panelTitle": "VeBaIW_panelTitle",
			"rise": "VeBaIW_rise"
		};
		//#endregion
		//#region src/client/tabs/WordsTab.tsx
		function WordsTab(props) {
			/** 取词：宿主切语言时重渲染 */
			const t = useT();
			const prompts = props.prompts;
			const words = prompts === null ? [] : [...prompts.words].sort((first, second) => second.count - first.count);
			const topWord = words[0];
			const totalPrompts = prompts === null ? null : prompts.totalPrompts;
			const prevPrompts = prevOf(prompts?.prevTotalPrompts);
			const prevChars = prevOf(prompts?.prevTotalChars);
			const prevWords = prevOf(prompts?.prevWordCount);
			const prevTopWord = prevOf(prompts?.prevTopWordCount);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: words_module_css_default.page,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: words_module_css_default.kpis,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KpiCard, {
							label: t("words.kpiPrompts"),
							value: totalPrompts === null ? "—" : fmtCount(totalPrompts),
							detail: prevPrompts === null ? void 0 : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PrevLine, {
								previous: prevPrompts,
								current: totalPrompts,
								format: fmtCount
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KpiCard, {
							label: t("words.kpiChars"),
							value: prompts === null ? "—" : fmtCount(prompts.totalChars),
							detail: prevChars === null ? void 0 : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PrevLine, {
								previous: prevChars,
								current: prompts === null ? null : prompts.totalChars,
								format: fmtCount
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KpiCard, {
							label: t("words.kpiWords"),
							value: prompts === null ? "—" : fmtCount(words.length),
							detail: prevWords === null ? void 0 : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PrevLine, {
								previous: prevWords,
								current: prompts === null ? null : words.length,
								format: fmtCount
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KpiCard, {
							label: t("words.kpiTop"),
							value: topWord === void 0 ? "—" : topWord.word,
							detail: topWord === void 0 ? void 0 : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [t("words.times", { count: fmtCount(topWord.count) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TrendPercent, {
								previous: prevTopWord,
								current: topWord.count
							})] })
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: words_module_css_default.panel,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: words_module_css_default.panelHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: words_module_css_default.panelTitle,
							children: t("words.cloud")
						}), prompts !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: words_module_css_default.panelAction,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: words_module_css_default.panelNote,
								children: t("words.wordCount", { count: words.length })
							})
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WordCloud, {
						words,
						emptyText: prompts === null ? t("s.loading") : t("words.noPrompts"),
						tipOf: (word, count) => t("words.cloudTip", {
							word,
							count: fmtCount(count),
							share: sharePercentOf(count, totalPrompts)
						})
					})]
				})]
			});
		}
		/** KPI 小卡：标签 + 数值 +（可选）环比行。 */
		function KpiCard(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: words_module_css_default.kpi,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: words_module_css_default.kpiLabel,
						children: props.label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: words_module_css_default.kpiValue,
						title: props.value,
						children: props.value
					}),
					props.detail !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: words_module_css_default.kpiDetail,
						children: props.detail
					})
				]
			});
		}
		/** 服务端没给上期字段（旧版本 / 上期窗口没有提问）时为 null，整段环比不显示。 */
		function prevOf(value) {
			return typeof value === "number" && Number.isFinite(value) ? value : null;
		}
		/** 涨跌角标：与概览的环比同一套语义色（涨红跌绿），持平不染色。 */
		function TrendPercent(props) {
			if (props.previous === null || props.previous <= 0 || props.current === null) return null;
			const delta = (props.current - props.previous) / props.previous * 100;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: delta > 0 ? words_module_css_default.rise : delta < 0 ? words_module_css_default.fall : words_module_css_default.flat,
				children: (delta > 0 ? "+" : "") + delta.toFixed(1) + "%"
			});
		}
		/**
		* 「上期 X ±Y%」：没有上期字段就整行不显示（不编数字）；
		* 有上期但本期为 null 时只讲上期，只有两边都有且上期非零才带涨跌百分比。
		*/
		function PrevLine(props) {
			if (props.previous === null) return null;
			const previousText = t("overview.prev", { value: props.format(props.previous) });
			if (props.current === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: previousText });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [previousText, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TrendPercent, {
				previous: props.previous,
				current: props.current
			})] });
		}
		/** 词频占比：一位小数；没有参与统计的提问时给 0（此时词云必为空，不会真的显示）。 */
		function sharePercentOf(count, totalPrompts) {
			if (totalPrompts === null || totalPrompts <= 0) return "0.0";
			return (count / totalPrompts * 100).toFixed(1);
		}
		//#endregion
		//#region src/client/KeyUsageSection.tsx
		/** 「使用情况」页外壳：Tab 路由、筛选状态与取数（会话类数据切到对应 Tab 时才首次拉取）。 */
		/** 单页顺序：额度在最前（最先想知道「还剩多少」），其余按「总量 → 明细 → 结构 → 会话」展开。 */
		const TABS = [
			["quota", "tab.quota"],
			["overview", "tab.overview"],
			["detail", "tab.detail"],
			["distribution", "tab.distribution"],
			["sessions", "tab.sessions"],
			["tools", "tab.tools"],
			["words", "tab.words"]
		];
		/** 滚动式下要一次性取的段（不取 usage：它按范围单独请求）。 */
		const ALL_SECTIONS = [
			"channels",
			"overview",
			"heatmap",
			"quota",
			"sessions",
			"projects",
			"models",
			"prompts",
			"tools"
		];
		/** 页级范围：与明细同一套 RangeKey（90 天按 90 天算，'total' = 全部）。 */
		const RANGES = [
			["today", "r.today"],
			["week", "r.week"],
			["month", "r.month"],
			["quarter", "r.90days"],
			["total", "r.total"]
		];
		/** 刷新周期选项（秒，0 = 关闭）。 */
		const REFRESH_OPTIONS = [
			0,
			10,
			30,
			60,
			300
		];
		function KeyUsageSection() {
			const [activeTab, setActiveTab] = (0, react.useState)("quota");
			/** false = 滚动式（默认，全部区块铺开）；true = 分页（只显示当前区块）。 */
			const [paged, setPaged] = (0, react.useState)(true);
			/** 自动刷新周期（秒）；0 = 关闭。只打本地 /snapshot，不联网。 */
			const [refreshSeconds, setRefreshSeconds] = (0, react.useState)(30);
			const [range, setRange] = (0, react.useState)("month");
			const [customFrom, setCustomFrom] = (0, react.useState)(() => shiftedIsoDate(-29));
			const [customTo, setCustomTo] = (0, react.useState)(() => isoDate(/* @__PURE__ */ new Date()));
			/** 三个筛选都存多选值：逗号分隔字符串，空串 = 全部（服务端 /usage 固定取全量，过滤在客户端做）。 */
			const [channelFilter, setChannelFilter] = (0, react.useState)("");
			/** 项目值取 `projects` 段的 workspace（'' = 未归入工作区）；模型值取模型名。 */
			const [projectFilter, setProjectFilter] = (0, react.useState)("");
			const [modelFilter, setModelFilter] = (0, react.useState)("");
			const [channels, setChannels] = (0, react.useState)([]);
			const [quotas, setQuotas] = (0, react.useState)([]);
			const [summary, setSummary] = (0, react.useState)(null);
			const [heatmap, setHeatmap] = (0, react.useState)([]);
			/** 「按时段」7×24 矩阵：/heatmap 的 hourly（服务端只给调用数）。 */
			const [hourly, setHourly] = (0, react.useState)([]);
			const [usage, setUsage] = (0, react.useState)(null);
			const [sessions, setSessions] = (0, react.useState)(null);
			const [prompts, setPrompts] = (0, react.useState)(null);
			const [tools, setTools] = (0, react.useState)(null);
			/** 快照 `tools` 段（全量历史）：首屏与参数化请求失败时的回落，不被每次轮询覆盖筛选结果。 */
			const toolsFallbackRef = (0, react.useRef)(null);
			/** 每次快照落地自增：工具段据此在索引刚建好时补取一次（首开可能先于本地重建拿到 null）。 */
			const [snapshotRevision, setSnapshotRevision] = (0, react.useState)(0);
			const [projects, setProjects] = (0, react.useState)(null);
			const [models, setModels] = (0, react.useState)(null);
			const [available, setAvailable] = (0, react.useState)(null);
			const [loading, setLoading] = (0, react.useState)(false);
			/** 价目版本号：点「刷新价目」后自增，用来让服务端重算成本并整体重取数据。 */
			const [pricingRevision, setPricingRevision] = (0, react.useState)(0);
			/** 配额执行结果：哪个通道这次查到实时值、展示值的时间与失败原因（界面据此标「本机快照 + 数据时间」）。 */
			const [quotaOutcome, setQuotaOutcome] = (0, react.useState)(null);
			/** 口径说明放进弹窗：内容可以写长，但不再占版面。 */
			/** 设置弹窗：币种、汇率、价目的来源与刷新都收在这里，页面里只留结论。 */
			const [showSettings, setShowSettings] = (0, react.useState)(false);
			/** 总览的通道行点击：余额/配额 + 单价表放进弹窗（原来的「余额与配额」Tab 已移除） */
			const [quotaDialog, setQuotaDialog] = (0, react.useState)(null);
			const [settingsTab, setSettingsTab] = (0, react.useState)("general");
			/** 取词函数：宿主切语言时 useT 触发重渲染，文案跟着切 */
			const t = useT();
			const lastSnapshotAt = (0, react.useRef)(0);
			const tooltip = useTooltip();
			/** 订阅显示币种：金额随它重渲染（币种与汇率本身在设置弹窗里改）。 */
			useCurrencyDisplay();
			/** 打开那一刻的页决定首屏要哪些段：切 Tab 不该重跑首屏（会闪 loading），后续段按需取。 */
			const initialSectionsRef = (0, react.useRef)([]);
			/** 滚动式下 activeTab 会随滚动变化：首屏 / 轮询只读 ref，避免每滚一下就重跑一遍取数。 */
			const activeTabRef = (0, react.useRef)("quota");
			/**
			* 快照段按当前页取：总览要的三段是底座，其余段切到对应 Tab 时才要（会话段近 200 KB）。
			* 项目 / 模型两段挂在底座上：顶部「全部项目 / 全部模型」下拉要随时有选项可列。
			* 服务端只裁剪下发，构建仍是全量一份，所以不可能出现「两个数据源」。
			*/
			const sectionsForTab = (0, react.useCallback)((tab) => {
				const base = [
					"channels",
					"overview",
					"heatmap",
					"quota",
					"projects",
					"models"
				];
				if (tab === "sessions") return [...base, "sessions"];
				if (tab === "words") return [...base, "prompts"];
				if (tab === "tools") return [...base, "tools"];
				return base;
			}, []);
			/** 当前要不要加载/渲染某个区块（分页时只留当前那个）。 */
			const wants = (0, react.useCallback)((tab) => !paged || activeTab === tab, [paged, activeTab]);
			/** 布尔化的可见性：effect 依赖它而不是 activeTab，滚动时不会反复重取。 */
			const wantSessions = wants("sessions");
			const wantOverview = wants("overview");
			const wantDistribution = wants("distribution");
			const wantDetail = wants("detail");
			const wantWords = wants("words");
			const wantTools = wants("tools");
			activeTabRef.current = activeTab;
			(0, react.useEffect)(() => {
				window.dispatchEvent(new Event("dsh-key-usage:close-overlays"));
			}, [activeTab]);
			/** 用户是否还在看默认范围（近 30 天 / 未筛通道）：是才采用快照里的 usage，否则会覆盖他自己的选择。 */
			const usageIsDefaultRef = (0, react.useRef)(true);
			usageIsDefaultRef.current = range === "month" && selectionOf(channelFilter).length === 0;
			/** 把一份快照落到各 Tab 的状态上（快照是 6 个 Tab 的唯一数据来源）。 */
			const applySnapshot = (0, react.useCallback)((snapshot) => {
				const sections = snapshot.sections;
				setQuotaOutcome(snapshot.quotaOutcome);
				if (sections.channels !== void 0 && sections.channels !== null) setChannels(sections.channels.channels ?? []);
				if (sections.quota !== void 0 && sections.quota !== null) setQuotas(sections.quota.providers ?? []);
				if (sections.overview !== void 0) setSummary(sections.overview);
				if (sections.heatmap !== void 0 && sections.heatmap !== null) {
					setHeatmap(sections.heatmap.days ?? []);
					setHourly(sections.heatmap.hourly ?? []);
				}
				if (sections.sessions !== void 0 && sections.sessions !== null) setSessions(sections.sessions);
				if (sections.projects !== void 0 && sections.projects !== null) setProjects(sections.projects);
				if (sections.models !== void 0 && sections.models !== null) setModels(sections.models);
				if (sections.prompts !== void 0 && sections.prompts !== null) setPrompts(sections.prompts);
				if (sections.tools !== void 0) {
					toolsFallbackRef.current = sections.tools;
					setTools((current) => current === null ? sections.tools : current);
				}
				const usageSection = sections.usage;
				if (usageSection !== void 0 && usageIsDefaultRef.current && usageSection !== null) {
					setUsage(usageSection);
					if (usageSection.availableFrom !== null && usageSection.availableTo !== null) setAvailable({
						from: usageSection.availableFrom,
						to: usageSection.availableTo
					});
				}
				lastSnapshotAt.current = Date.now();
				for (const issue of snapshot.issues ?? []) if (issue.kind === "build-duration") logInfo("snapshot", t("log.issue") + "：" + issue.kind, issue.message);
				else logWarn("snapshot", t("log.issue") + "：" + issue.kind, issue.message);
				const partial = [];
				for (const [name, section] of [
					["models", sections.models],
					["projects", sections.projects],
					["sessions", sections.sessions]
				]) {
					if (section === void 0 || section === null || section.coverage.status === "complete") continue;
					partial.push(name + "(" + section.coverage.status + "：" + String(section.coverage.countedSessions) + "/" + String(section.coverage.totalSessions) + ")");
				}
				if (partial.length > 0) logWarn("snapshot", t("log.coveragePartial") + "：" + partial.join("、"));
				setSnapshotRevision((revision) => revision + 1);
			}, [t]);
			/** 逐端点兜底：服务端还是旧版本（没有 /snapshot）时用，语义与升级前一致。 */
			const reloadFromEndpoints = (0, react.useCallback)(async (includeSessionData, forceQuota) => {
				const quotaResult = await loadQuota(forceQuota);
				const [channelResult, summaryResult, heatmapResult] = await Promise.all([
					loadChannels(),
					loadSummary(),
					loadHeatmap()
				]);
				setChannels(channelResult ?? []);
				setQuotas(quotaResult ?? []);
				setSummary(summaryResult);
				setHeatmap(heatmapResult?.days ?? []);
				setHourly(heatmapResult?.hourly ?? []);
				if (includeSessionData) {
					const [sessionResult, projectResult, modelResult] = await Promise.all([
						loadSessions(),
						loadProjects(),
						loadModels()
					]);
					setSessions(sessionResult);
					setProjects(projectResult);
					setModels(modelResult);
				}
			}, []);
			(0, react.useEffect)(() => {
				let cancelled = false;
				(async () => {
					setLoading(true);
					if (initialSectionsRef.current.length === 0) initialSectionsRef.current = paged ? sectionsForTab(activeTabRef.current) : ALL_SECTIONS;
					const cached = await loadSnapshot(false, initialSectionsRef.current);
					if (cancelled) return;
					if (cached !== null) {
						applySnapshot(cached);
						setLoading(false);
					}
					const fresh = await loadSnapshot(true, initialSectionsRef.current);
					if (cancelled) return;
					if (fresh !== null) applySnapshot(fresh);
					else if (cached === null) await reloadFromEndpoints(false, false);
					if (!cancelled) setLoading(false);
				})();
				return () => {
					cancelled = true;
				};
			}, [
				applySnapshot,
				reloadFromEndpoints,
				sectionsForTab,
				paged
			]);
			/**
			* 打开页面时服务端可能还在重建（`building`）或后台补查配额（`quotaRefreshing`）：
			* 隔一会儿追取几次，拿到新数据就换上，用户不用手动刷新。冷启动重建可能十几秒，追到 12 次（约 30 秒）为止。
			*/
			(0, react.useEffect)(() => {
				let cancelled = false;
				let attempts = 0;
				let timer = null;
				const chase = async () => {
					const snapshot = await loadSnapshot(false, initialSectionsRef.current);
					if (cancelled || snapshot === null) return;
					applySnapshot(snapshot);
					if (snapshot.building === true || snapshot.quotaRefreshing === true) {
						attempts += 1;
						if (attempts < 12) timer = setTimeout(() => {
							chase();
						}, 2500);
					}
				};
				timer = setTimeout(() => {
					chase();
				}, 1500);
				return () => {
					cancelled = true;
					if (timer !== null) clearTimeout(timer);
				};
			}, [applySnapshot, sectionsForTab]);
			(0, react.useEffect)(() => {
				hydrateLog();
			}, []);
			(0, react.useEffect)(() => subscribeOpenLog(() => {
				setSettingsTab("log");
				setShowSettings(true);
			}), []);
			(0, react.useEffect)(() => {
				if (refreshSeconds <= 0) return;
				const pollMs = refreshSeconds * 1e3;
				const tick = () => {
					if (document.visibilityState === "hidden") return;
					if (Date.now() - lastSnapshotAt.current < pollMs) return;
					loadSnapshot(false, paged ? sectionsForTab(activeTabRef.current) : ALL_SECTIONS).then((snapshot) => {
						if (snapshot !== null) applySnapshot(snapshot);
					});
				};
				const timer = setInterval(tick, pollMs);
				document.addEventListener("visibilitychange", tick);
				return () => {
					clearInterval(timer);
					document.removeEventListener("visibilitychange", tick);
				};
			}, [
				refreshSeconds,
				paged,
				applySnapshot,
				sectionsForTab
			]);
			(0, react.useEffect)(() => {
				if (pricingRevision === 0) return;
				refreshAll().then((snapshot) => {
					if (snapshot !== null) applySnapshot(snapshot);
				});
			}, [pricingRevision, applySnapshot]);
			(0, react.useEffect)(() => {
				if (wantSessions && sessions === null) loadSessions().then(setSessions);
				if (wantDistribution) {
					if (projects === null) loadProjects().then(setProjects);
					if (models === null) loadModels().then(setModels);
				}
				if (wantWords && prompts === null) loadSnapshot(false, ["prompts"]).then((snapshot) => {
					if (snapshot !== null) applySnapshot(snapshot);
				});
				if (wantTools && tools === null) loadSnapshot(false, ["tools"]).then((snapshot) => {
					if (snapshot !== null) applySnapshot(snapshot);
				});
			}, [
				wantSessions,
				wantDistribution,
				wantWords,
				wantTools,
				sessions,
				projects,
				models,
				prompts,
				tools,
				applySnapshot
			]);
			const bounds = (0, react.useMemo)(() => {
				const today = isoDate(/* @__PURE__ */ new Date());
				if (range === "today") return {
					from: today,
					to: today
				};
				if (range === "week") return {
					from: shiftedIsoDate(-6),
					to: today
				};
				if (range === "month") return {
					from: shiftedIsoDate(-29),
					to: today
				};
				if (range === "quarter") return {
					from: shiftedIsoDate(-89),
					to: today
				};
				if (range === "custom") return {
					from: customFrom,
					to: customTo < customFrom ? customFrom : customTo
				};
				return {
					from: available?.from ?? today,
					to: available?.to ?? today
				};
			}, [
				range,
				customFrom,
				customTo,
				available
			]);
			/** 是否已经知道数据可用范围（range='total' 的窗口起点要靠它；布尔化避免每次回填都触发重取）。 */
			const hasAvailable = available !== null;
			/**
			* 工具段跟随顶部筛选：窗口 = bounds，项目 / 模型取多选值（项目 sentinel 还原成空串，
			* 服务端按实际 workspace 字符串匹配）。服务端用运行期索引聚合，不重读会话；
			* 回 null（索引还没建好 / 请求失败）时保留快照全量段作回落。
			*/
			(0, react.useEffect)(() => {
				if (!wantTools) return;
				let cancelled = false;
				const chosenProjects = selectionOf(projectFilter);
				const projectParam = chosenProjects.length === 0 ? null : chosenProjects.map((value) => value === "__orphan__" ? "" : value).join(",");
				loadTools(bounds.from, bounds.to, projectParam, selectionOf(modelFilter).join(",")).then((result) => {
					if (cancelled) return;
					setTools(result ?? toolsFallbackRef.current);
				});
				return () => {
					cancelled = true;
				};
			}, [
				wantTools,
				bounds.from,
				bounds.to,
				projectFilter,
				modelFilter,
				snapshotRevision
			]);
			(0, react.useEffect)(() => {
				if (!wantDetail && !wantDistribution && !wantOverview) {
					if (!wantTools || hasAvailable) return;
				}
				let cancelled = false;
				loadUsage(bounds.from, bounds.to, "ALL").then((result) => {
					if (cancelled || result === null) return;
					setUsage(result);
					if (result.availableFrom !== null && result.availableTo !== null) setAvailable({
						from: result.availableFrom,
						to: result.availableTo
					});
				});
				return () => {
					cancelled = true;
				};
			}, [
				wantDetail,
				wantDistribution,
				wantOverview,
				wantTools,
				hasAvailable,
				bounds.from,
				bounds.to,
				pricingRevision
			]);
			/** 上一周期（同长度、紧邻前一个窗口）：概览 KPI 的环比用它，拿不到就不显示环比 */
			const [previousUsage, setPreviousUsage] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				const dayMs = 864e5;
				const fromMs = Date.parse(bounds.from);
				const toMs = Date.parse(bounds.to);
				if (Number.isNaN(fromMs) || Number.isNaN(toMs) || toMs < fromMs) {
					setPreviousUsage(null);
					return;
				}
				const length = Math.round((toMs - fromMs) / dayMs) + 1;
				const previousFrom = isoDate(/* @__PURE__ */ new Date(fromMs - dayMs * length));
				const previousTo = isoDate(/* @__PURE__ */ new Date(fromMs - dayMs));
				let cancelled = false;
				loadUsage(previousFrom, previousTo, "ALL").then((result) => {
					if (!cancelled) setPreviousUsage(result);
				});
				return () => {
					cancelled = true;
				};
			}, [
				bounds.from,
				bounds.to,
				pricingRevision
			]);
			/** 通道用量：通道没有聚合接口，用 /usage 的逐日模型 token 相加，供筛选下拉排序 */
			const channelUsage = (0, react.useMemo)(() => {
				const map = /* @__PURE__ */ new Map();
				for (const day of usage?.days ?? []) for (const model of day.models) {
					const tokens = model.inputTokens + model.outputTokens + model.cacheReadTokens;
					map.set(model.provider, (map.get(model.provider) ?? 0) + tokens);
				}
				return map;
			}, [usage]);
			/** 额度页跟随通道筛选：只渲染选中通道的卡片与配额 */
			const selectedChannels = (0, react.useMemo)(() => {
				const chosen = selectionOf(channelFilter);
				if (chosen.length === 0) return channels;
				return channels.filter((channel) => chosen.includes(channel.provider));
			}, [channels, channelFilter]);
			const selectedQuotas = (0, react.useMemo)(() => {
				const chosen = selectionOf(channelFilter);
				if (chosen.length === 0) return quotas;
				return quotas.filter((provider) => chosen.includes(provider.provider));
			}, [quotas, channelFilter]);
			/** 通道多选过滤（客户端）：先按通道收窄 `/usage`，各区块再按模型收窄；合计由两次过滤各自重算。 */
			const scopedUsage = (0, react.useMemo)(() => filterUsageByChannels(usage, channelFilter), [usage, channelFilter]);
			/** 通道下拉：值取 provider，文案取显示名。 */
			const channelOptions = (0, react.useMemo)(() => channels.map((channel) => ({
				value: channel.provider,
				label: channel.displayName ?? channel.provider
			})), [channels]);
			/** 项目下拉：值取 workspace（未归入工作区的那行用 sentinel），文案取宿主工作区标题。 */
			const projectUsage = (0, react.useMemo)(() => {
				const map = /* @__PURE__ */ new Map();
				for (const row of projects?.rows ?? []) {
					const key = row.workspace === "" ? ORPHAN_PROJECT_VALUE : row.workspace;
					map.set(key, (map.get(key) ?? 0) + row.tokens);
				}
				return map;
			}, [projects]);
			const projectOptions = (0, react.useMemo)(() => (projects?.rows ?? []).map((row) => ({
				value: row.workspace === "" ? ORPHAN_PROJECT_VALUE : row.workspace,
				label: row.workspace === "" ? t("p.orphan") : row.workspaceTitle ?? row.workspace
			})), [projects, t]);
			/** 模型下拉：同一个模型跨通道只留一项（筛选按模型名）。 */
			const modelUsage = (0, react.useMemo)(() => {
				const map = /* @__PURE__ */ new Map();
				for (const row of models?.rows ?? []) map.set(row.model, (map.get(row.model) ?? 0) + row.tokens);
				return map;
			}, [models]);
			const modelOptions = (0, react.useMemo)(() => {
				const seen = /* @__PURE__ */ new Set();
				const options = [];
				for (const row of models?.rows ?? []) {
					if (seen.has(row.model)) continue;
					seen.add(row.model);
					options.push({
						value: row.model,
						label: row.model === "" ? t("m.others") : row.model
					});
				}
				return options;
			}, [models, t]);
			/** 刷新周期文案：0 = 关闭。 */
			const refreshLabel = (0, react.useCallback)((seconds) => {
				if (seconds <= 0) return t("refresh.off");
				if (seconds < 60) return t("refresh.seconds", { count: seconds });
				return t("refresh.minutes", { count: Math.round(seconds / 60) });
			}, [t]);
			/** 滚到某个区块（滚动式）；分页式直接切过去。 */
			const goSection = (0, react.useCallback)((tab) => {
				setActiveTab(tab);
				if (paged) {
					window.scrollTo({ top: 0 });
					return;
				}
				document.getElementById("sec-" + tab)?.scrollIntoView({
					behavior: "smooth",
					block: "start"
				});
			}, [paged]);
			/** 点导航：分页式切换区块，滚动式滚过去。 */
			const pickSection = (0, react.useCallback)((tab) => {
				if (paged) {
					setActiveTab(tab);
					window.scrollTo({ top: 0 });
					return;
				}
				goSection(tab);
			}, [paged, goSection]);
			(0, react.useEffect)(() => {
				if (paged) return;
				const sections = TABS.map(([tabId]) => ({
					tabId,
					el: document.getElementById("sec-" + tabId)
				})).filter((item) => item.el !== null);
				if (sections.length === 0) return;
				let ticking = false;
				const update = () => {
					ticking = false;
					const line = 160;
					let current = sections[0];
					for (const item of sections) if (item.el !== null && item.el.getBoundingClientRect().top <= line) current = item;
					setActiveTab(current.tabId);
				};
				const onScroll = () => {
					if (ticking) return;
					ticking = true;
					window.requestAnimationFrame(update);
				};
				window.addEventListener("scroll", onScroll, {
					passive: true,
					capture: true
				});
				document.addEventListener("scroll", onScroll, {
					passive: true,
					capture: true
				});
				return () => {
					window.removeEventListener("scroll", onScroll, { capture: true });
					document.removeEventListener("scroll", onScroll, { capture: true });
				};
			}, [paged]);
			const refresh = (0, react.useCallback)(() => {
				setLoading(true);
				(async () => {
					const snapshot = await refreshAll();
					if (snapshot !== null) {
						applySnapshot(snapshot);
						logInfo("snapshot", t("action.refresh"), t("quota.snapshotAt", { time: snapshot.updatedAt }) + snapshot.buildSource);
					} else {
						logWarn("snapshot", t("action.refresh") + " · " + t("api.requestFailed"), REFRESH_PATH);
						await reloadFromEndpoints(sessions !== null || projects !== null || models !== null, true);
					}
					const usageResult = await loadUsage(bounds.from, bounds.to, "ALL");
					if (usageResult !== null) setUsage(usageResult);
					setLoading(false);
				})();
			}, [
				applySnapshot,
				reloadFromEndpoints,
				sessions,
				projects,
				models,
				bounds.from,
				bounds.to,
				t
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shared_module_css_default.section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: shared_module_css_default.stickyHead,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: shared_module_css_default.pageHead,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
										className: shared_module_css_default.pageTitle,
										children: t("app.title")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: shared_module_css_default.rowSpacer }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: shared_module_css_default.toolbarGroup,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
												className: shared_module_css_default.refreshSelect,
												value: refreshSeconds,
												onChange: (event) => setRefreshSeconds(Number(event.target.value)),
												"aria-label": t("filter.refreshCycle"),
												title: t("filter.refreshCycle"),
												children: REFRESH_OPTIONS.map((seconds) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: seconds,
													children: refreshLabel(seconds)
												}, seconds))
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: shared_module_css_default.iconBtn,
												disabled: loading,
												onClick: refresh,
												"aria-label": loading ? t("action.refreshing") : t("action.refresh"),
												"aria-busy": loading,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: loading ? shared_module_css_default.refreshIconSpin : shared_module_css_default.refreshIcon,
													"aria-hidden": "true",
													children: "↻"
												})
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: shared_module_css_default.iconBtn,
												onClick: () => {
													setSettingsTab("general");
													setShowSettings(true);
												},
												"aria-label": t("action.settings"),
												title: t("action.settings"),
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
													viewBox: "0 0 16 16",
													width: "15",
													height: "15",
													"aria-hidden": "true",
													focusable: "false",
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
														cx: "8",
														cy: "8",
														r: "2.4",
														fill: "none",
														stroke: "currentColor",
														strokeWidth: "1.3"
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
														fill: "none",
														stroke: "currentColor",
														strokeWidth: "1.3",
														"stroke-linecap": "round",
														d: "M8 1.6v2M8 12.4v2M1.6 8h2M12.4 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M12.5 3.5l-1.4 1.4M4.9 11.1l-1.4 1.4"
													})]
												})
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
												className: shared_module_css_default.ghLink,
												href: PLUGIN_REPO_URL,
												target: "_blank",
												rel: "noreferrer",
												"aria-label": "GitHub",
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
													viewBox: "0 0 16 16",
													width: "15",
													height: "15",
													"aria-hidden": "true",
													focusable: "false",
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
														fill: "currentColor",
														d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"
													})
												})
											})
										]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: shared_module_css_default.toolbarRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: shared_module_css_default.toolbarGroup,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: shared_module_css_default.rangeTabs,
											children: RANGES.map(([key, labelKey]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												className: range === key ? shared_module_css_default.rangeTabActive : shared_module_css_default.rangeTab,
												onClick: () => setRange(key),
												children: t(labelKey)
											}, key))
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DateRangePicker, {
											from: range === "custom" ? customFrom : bounds.from,
											to: range === "custom" ? customTo : bounds.to,
											onChange: (from, to) => {
												setCustomFrom(from);
												setCustomTo(to);
												setRange("custom");
											},
											active: range === "custom"
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: shared_module_css_default.toolbarDivider,
										"aria-hidden": "true"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MultiSelect, {
										usageOf: (value) => channelUsage.get(value) ?? 0,
										options: channelOptions,
										selected: selectionOf(channelFilter),
										onChange: (next) => setChannelFilter(next.join(",")),
										allLabel: t("s.allChannels"),
										ariaLabel: t("filter.channel"),
										searchLabel: t("filter.searchChannel")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MultiSelect, {
										usageOf: (value) => projectUsage.get(value) ?? 0,
										options: projectOptions,
										selected: selectionOf(projectFilter),
										onChange: (next) => setProjectFilter(next.join(",")),
										allLabel: t("filter.allProjects"),
										ariaLabel: t("filter.project"),
										searchLabel: t("filter.searchProject")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MultiSelect, {
										usageOf: (value) => modelUsage.get(value) ?? 0,
										options: modelOptions,
										selected: selectionOf(modelFilter),
										onChange: (next) => setModelFilter(next.join(",")),
										allLabel: t("filter.allModels"),
										ariaLabel: t("filter.model"),
										searchLabel: t("filter.searchModel")
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: shared_module_css_default.toolbarRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: shared_module_css_default.tabBar,
										children: TABS.map(([tabId, labelKey]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											className: activeTab === tabId ? shared_module_css_default.active : "",
											onClick: () => pickSection(tabId),
											children: t(labelKey)
										}, tabId))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: shared_module_css_default.rowSpacer }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										size: "sm",
										className: shared_module_css_default.headBtn,
										disabled: scopedUsage === null,
										onClick: () => {
											if (scopedUsage !== null) exportUsageCsv(scopedUsage);
										},
										ariaLabel: t("action.exportUsage"),
										title: t("action.exportUsage"),
										children: t("action.exportUsage")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										size: "sm",
										className: shared_module_css_default.headBtn,
										disabled: sessions === null,
										onClick: () => {
											if (sessions !== null) exportSessionsCsv(sessions);
										},
										ariaLabel: t("action.exportSessions"),
										title: t("action.exportSessions"),
										children: t("action.exportSessions")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: shared_module_css_default.modeSwitch,
										title: t("section.modeHint"),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: !paged,
											onChange: (event) => setPaged(!event.target.checked)
										}), paged ? t("section.paged") : t("section.scroll")]
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: shared_module_css_default.sections,
						children: [
							wants("quota") && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: shared_module_css_default.pageSection,
								id: "sec-quota",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									className: shared_module_css_default.pageSectionTitle,
									children: t("tab.quota")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QuotaTab, {
									onOpenProvider: (provider) => setQuotaDialog(provider),
									channels: selectedChannels,
									quotas: selectedQuotas,
									quotaOutcome,
									reloadToken: pricingRevision,
									onPricingReload: () => setPricingRevision((previous) => previous + 1)
								})]
							}),
							wants("overview") && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: shared_module_css_default.pageSection,
								id: "sec-overview",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									className: shared_module_css_default.pageSectionTitle,
									children: t("tab.overview")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewTab, {
									previousCost: previousUsage === null || previousUsage.totals === null ? null : previousUsage.totals.cost,
									channels,
									summary,
									quotas,
									heatmap,
									hourly,
									range,
									usage: scopedUsage,
									sessions,
									projects,
									models,
									tooltip,
									onOpenDetail: (provider) => {
										setChannelFilter(provider);
										goSection("detail");
									},
									onOpenChannel: setQuotaDialog,
									onPickDay: (date) => {
										setRange("custom");
										setCustomFrom(date);
										setCustomTo(date);
										goSection("detail");
									},
									projectFilter,
									modelFilter,
									channelFilter
								})]
							}),
							wants("detail") && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: shared_module_css_default.pageSection,
								id: "sec-detail",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									className: shared_module_css_default.pageSectionTitle,
									children: t("tab.detail")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailTab, {
									usage: scopedUsage,
									channels,
									range,
									onRange: setRange,
									customFrom,
									onCustomFrom: setCustomFrom,
									customTo,
									onCustomTo: setCustomTo,
									channelFilter,
									onChannelFilter: setChannelFilter,
									bounds,
									tooltip,
									pricingRevision,
									modelFilter
								})]
							}),
							wants("distribution") && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: shared_module_css_default.pageSection,
								id: "sec-distribution",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									className: shared_module_css_default.pageSectionTitle,
									children: t("tab.distribution")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DistributionTab, {
									channelFilter,
									projects,
									models,
									channels,
									usage: scopedUsage,
									tooltip,
									projectFilter,
									modelFilter
								})]
							}),
							wants("sessions") && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: shared_module_css_default.pageSection,
								id: "sec-sessions",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									className: shared_module_css_default.pageSectionTitle,
									children: t("tab.sessions")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionsTab, {
									range,
									bounds,
									channelFilter,
									data: sessions,
									channels,
									tooltip,
									onOpenProject: (workspace) => {
										setProjectFilter(workspace === "" ? "__orphan__" : workspace);
										goSection("distribution");
									},
									projectFilter,
									modelFilter
								})]
							}),
							wants("tools") && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: shared_module_css_default.pageSection,
								id: "sec-tools",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									className: shared_module_css_default.pageSectionTitle,
									children: t("tab.tools")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToolsTab, { data: tools })]
							}),
							wants("words") && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: shared_module_css_default.pageSection,
								id: "sec-words",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									className: shared_module_css_default.pageSectionTitle,
									children: t("tab.words")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WordsTab, { prompts })]
							})
						]
					}),
					showSettings && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Dialog, {
						title: t("settings.title"),
						closeLabel: t("action.close"),
						onClose: () => setShowSettings(false),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingsDialog, {
							onPricingReload: () => setPricingRevision((previous) => previous + 1),
							initialTab: settingsTab,
							todaySource: summary === null ? null : summary.todaySource,
							sessionDays: summary === null ? 0 : summary.sessionDates.length
						})
					}),
					quotaDialog !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Dialog, {
						title: t("nav.quota"),
						closeLabel: t("action.close"),
						onClose: () => setQuotaDialog(null),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QuotaTab, {
							onlyProvider: quotaDialog,
							channels,
							quotas,
							quotaOutcome,
							reloadToken: pricingRevision,
							onPricingReload: () => setPricingRevision((previous) => previous + 1)
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TooltipView, { tooltip: tooltip.tooltip })
				]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/page.module.css.mjs
		const css = ".Zd1J4W_page{font-size:calc(var(--dsh-content-font-size,12px) * 1.05);box-sizing:border-box;overscroll-behavior:contain;width:100%;height:100%;min-height:0;font-weight:500;overflow-x:hidden;overflow-y:auto}.Zd1J4W_inner{box-sizing:border-box;width:100%;max-width:1240px;margin:0 auto;padding:20px 24px 28px}";
		const tagId = "dsh-key-usage/page.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-key-usage";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		const cssRegistry = globalThis.__DSH_PLUGIN_CSS__ ??= [];
		if (!cssRegistry.some((e) => e.tagId === tagId)) cssRegistry.push({
			tagId,
			css
		});
		var page_module_css_default = {
			"inner": "Zd1J4W_inner",
			"page": "Zd1J4W_page"
		};
		//#endregion
		//#region src/client/UsagePage.tsx
		/** 「使用情况」主区域页面（宿主内联渲染，不是弹窗）；宿主主内容区不滚动，滚动由本容器负责。 */
		/** 宿主会传入根作用域的标准 kit 与绑定的 `t`；本页面当前不需要它们。 */
		function UsagePage(_props) {
			const logged = (0, react.useRef)(false);
			(0, react.useEffect)(() => {
				if (logged.current) return;
				logged.current = true;
				logInfo("boot", "首屏已渲染", "渲染进程已运行 " + String(Math.round(performance.now())) + " ms；距插件挂载 " + String(Math.round(performance.now() - CLIENT_BOOT_AT_MS)) + " ms");
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: page_module_css_default.page,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: page_module_css_default.inner,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorBoundary, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KeyUsageSection, {}) })
				})
			});
		}
		//#endregion
		//#region src/client/index.tsx
		/**
		* dsh-key-usage 客户端入口：注册「使用情况」侧边栏导航项 + 主区域页面，本文件只做 cordis apply 接线。
		* slot 契约（对齐 dsh-context）：`sidebar.panellist` 宿主自持整行、只用 `id`；`main` 同一标识放 `key`。
		* 价格由服务端三层价目自动决定，客户端只经 `/pricing`、`/rates`、`/fx` 读。
		*/
		const NS = "dsh-key-usage";
		/** 侧边栏条目与 main 页面共用的面板标识（宿主 MainPanelId 域，命名空间化避免撞车）。 */
		const PANEL_ID = NS;
		const name = NS;
		const inject = ["slots", "locale"];
		function apply(ctx) {
			installI18n(ctx.locale);
			logInfo("boot", "客户端插件已挂载", "渲染进程已运行 " + String(Math.round(performance.now())) + " ms");
			ctx.slots.inject("main", () => ctx.slots.register({
				name: "main",
				key: PANEL_ID,
				locale: NS
			}, UsagePage));
			ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
				name: "sidebar.panellist",
				id: PANEL_ID,
				order: 30,
				label: () => t("nav.usage"),
				locale: NS
			}, (props) => (0, react.createElement)(UsageIcon, { size: props.size })));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map