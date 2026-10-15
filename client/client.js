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
			"nav.usage": "使用情况",
			"app.title": "使用情况",
			"tab.overview": "总览",
			"tab.detail": "使用明细",
			"tab.projects": "项目用量",
			"tab.models": "按模型",
			"tab.sessions": "会话用量",
			"tab.quota": "余额与配额",
			"action.refresh": "刷新",
			"action.refreshing": "刷新中",
			"action.caliber": "口径",
			"action.close": "关闭",
			"log.title": "系统日志",
			"log.copy": "复制",
			"log.clear": "清空",
			"caliber.title": "口径说明",
			"caliber.version": "版本 {version}",
			"caliber.source": "按天数据优先取宿主台账（含官方成本），台账没记录的日子回退会话事件补充{days}；项目 / 会话 / 按模型 / 按小时来自会话事件，每个样本计一次调用。",
			"caliber.sourceDays": "（当前有 {count} 天）",
			"caliber.cost": "成本四层自动生效，不需要填任何价格：官方账单 > 官方价（内置厂商价目）> 聚合（LiteLLM）> 台账反推均价；角标同此命名，没有依据时显示 —。",
			"caliber.currency": "金额按所选币种折算（带 ≈），当前{fx}。",
			"caliber.fxMissing": "还没取到汇率，跨币种按原币种显示",
			"caliber.refresh": "页面数据来自统一快照，本地数据每 5 分钟重建；余额与订阅窗口只在打开页面或点刷新时联网，查不到就沿用上一份快照并标出时间与原因。",
			"common.calls": "调用",
			"common.channel": "通道",
			"common.workspace": "工作区",
			"s.id": "会话 id",
			"s.title": "标题",
			"s.prompt": "首条提问",
			"s.first": "首次",
			"s.last": "最近",
			"s.crossDays": "跨天",
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
			"s.archiveOnly": "仅已归档",
			"s.filterSubagent": "子会话筛选",
			"s.subagentHide": "只显示主会话",
			"s.subagentAll": "含子会话",
			"s.subagentOnly": "仅子会话",
			"s.subagentOther": "另有 {count} 个子代理会话",
			"s.archivedOther": "另有 {count} 个已归档会话未显示",
			"s.subagentHidden": "未显示",
			"s.subagentShown": "（已显示）",
			"s.noCost": "无台账成本",
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
			"d.unavailable": "会话用量不可用",
			"d.partial": "会话用量不完整",
			"d.costMode": "计费模式",
			"d.activeDays": "活跃天数",
			"d.crossDays": "（跨 {count} 天）",
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
			"o.ledgerUnavailable": "台账不可用",
			"r.today": "今日",
			"r.week": "周",
			"r.month": "月",
			"r.total": "总计",
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
			"d.channelCount": "通道数",
			"d.activeDayCount": "有用量天数",
			"d.channelsWithUsageSuffix": " 个通道",
			"d.hitRateShort": "缓存命中率",
			"d.dailyAvg": "日均 Tokens",
			"d.daysWithUsageSuffix": " 天有用量",
			"t.title": "环比对比",
			"t.titleNote": "与上一段等长范围",
			"t.prevZero": "上期为 0",
			"t.currentPrefix": "本期 ",
			"t.previousPrefix": " · 上期 ",
			"t.loading": "读取中",
			"t.failed": "无法获取",
			"t.prevNoData": "上期无数据",
			"t.notComparableSession": "口径不完全可比",
			"t.sourceDiffPrefix": "两期成本来源不同（本期 ",
			"t.sourceDiffMiddle": " / 上期 ",
			"t.sourceDiffSuffix": "）",
			"t.prevLoadFailed": "上期读取失败",
			"t.noUsage": "本期无用量",
			"t.ppNote": "命中率按百分点（pp），其余为环比百分比",
			"t.currentCost": "本期成本",
			"t.currentTokens": "本期 Tokens",
			"t.vs": " · 环比 ",
			"fmt.justNow": "刚刚",
			"fmt.minutesAgo": "{count} 分钟前",
			"fmt.hoursAgo": "{count} 小时前",
			"fmt.daysAgo": "{count} 天前",
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
			"p.clearFilter": "清除筛选",
			"p.archivePrefix": "（ ",
			"p.archiveSuffix": " 个已归档）",
			"p.empty": "无匹配项目",
			"p.noUsage": "没有可展示的用量",
			"h.month": "月",
			"h.summaryPrefix": "近 9 个月 · ",
			"h.summarySuffix": " 个活跃日",
			"h.tip": "每格一天 Tokens，颜色越深用量越高",
			"h.noUsage": "当日无用量",
			"h.noLedger": "台账未覆盖",
			"sh.shareAll": "全部占比",
			"sh.channels": "通道占比",
			"sh.models": "模型占比",
			"sh.noData": "暂无数据",
			"sh.morePrefix": "，等 ",
			"sh.moreSuffix": " 项",
			"issue.build-failed": "快照构建失败，沿用上一份",
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
			"p.costHint": "成本按价目自动估算",
			"fmt.dayHour": "{days} 天 {hours}h",
			"srv.ratesAverage": "按台账均价估算",
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
			"fx.cache": "服务端缓存",
			"fx.default": "默认值",
			"fx.missing": "还没取到汇率，跨币种按原币种显示",
			"fx.stale": "已过期",
			"fx.defaultPrefix": "用默认汇率 ",
			"fx.defaultSuffix": "，未联网",
			"api.notFound": "HTTP 404：端点不存在",
			"api.restartHint": "服务端改动需退出重开 DSH",
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
			"cso.estimate": "估算",
			"cso.none": "暂无价格依据",
			"csh.official": "官方：台账记录的厂商账单金额",
			"csh.catalog": "官方价：按内置厂商官方价目算出",
			"csh.aggregate": "聚合：LiteLLM 聚合价目（美元），点刷新价目可更新",
			"csh.estimate": "估算：按台账反推的均价",
			"csh.none": "暂无价格依据",
			"csh.unknown": "成本来源未识别",
			"part.suffix": " · 部分",
			"part.hint": "缓存写入价未收录，按未命中价计",
			"s.showPrefix": "显示 ",
			"s.showSuffix": " 个会话",
			"s.amount": "金额",
			"s.unknownDate": "未知日期",
			"r.yesterday": "昨日",
			"o.callsSuffix": " 次调用",
			"c.cost": "成本",
			"q.resetUnknown": "重置于 —",
			"q.retryHint": "，暂无快照，点刷新重试",
			"q.snapshotPrefix": "，快照 ",
			"q.stalePrefix": "，",
			"q.daysStaleSuffix": " 天未更新",
			"q.modelRatesPrefix": " 个模型单价 · ",
			"q.aggregateSuffix": " · LiteLLM 聚合）",
			"q.convertedPrefix": "（≈ 为折算值：",
			"q.rangePrefix": " · 区间 ",
			"q.partialPrefix": "其中部分 ",
			"q.priceEntriesSuffix": " 条价目",
			"q.entriesClose": " 条）",
			"q.modelsSuffix": " 个模型",
			"q.agoPrefix": "，距今 ",
			"q.minutesAgoSuffix": " 分钟前",
			"q.hoursAgoSuffix": " 小时前",
			"q.rowPrefix": " 第 ",
			"q.rowSuffix": " 行",
			"q.daySuffix": " 天",
			"q.countSuffix": " 个",
			"q.noBasis": "无依据",
			"export.csv": "导出 CSV",
			"export.json": "导出 JSON",
			"d.hourUnit": " 时 · ",
			"d.callUnit": " 次",
			"dd.title": "每日细目",
			"dd.sum": "合计",
			"empty.noUsage": "无用量记录",
			"h.summary": "热力图",
			"h.noData": "无数据",
			"h.level1": "少",
			"h.level2": "较少",
			"h.level3": "中",
			"h.level4": "较多",
			"h.level5": "多",
			"sh.shareByTokens": "占比 · 按 Tokens",
			"sh.shareLabel": "占比",
			"t.noPrevRange": "无可对比上一段",
			"t.metric": "指标",
			"t.currentCol": "本期",
			"t.previousCol": "上期",
			"t.change": "变化",
			"m.share": "占比",
			"m.empty": "无匹配模型",
			"p.project": "项目",
			"o.keyList": "Key 清单",
			"o.type": "类型",
			"o.balanceWindow": "余额 / 窗口",
			"o.cost30": "30 天成本",
			"o.detailArrow": "明细 →",
			"o.noChannels": "未读到通道配置",
			"o.ledgerHint": "台账不可用，两列为空",
			"o.snapshotHint": "无余额快照，显示为 —",
			"h.wd0": "日",
			"h.wd1": "一",
			"h.wd2": "二",
			"h.wd3": "三",
			"h.wd4": "四",
			"h.wd5": "五",
			"h.wd6": "六",
			"d.loading": "会话详情读取中",
			"d.noDetail": "没有可展示的详情",
			"d.noCostBasis": "台账无成本，价目也没命中，只能显示 —",
			"d.noPrompt": "没有人类提问（可能是 teammate / 系统会话）",
			"d.byModel": "逐模型用量",
			"d.hoursNote": "一天里的分布（各小时合计，跨天累加）",
			"d.ledgerLoading": "台账读取中或不可用",
			"d.sourceSession": "来源：会话事件（该日台账无记录）",
			"d.hourlyNote": "按小时来自会话事件，不含成本",
			"r.from": "从",
			"r.to": "至",
			"s.timeDuration": "时间 / 时长",
			"s.empty": "无匹配会话",
			"s.sessionCost": "会话成本",
			"q.offPeak": "错峰中",
			"q.catalogPrefix": " 条厂商官方价目，",
			"q.catalogAuto": "自动生效，不需要维护",
			"q.aggregateRefreshOnly": "只有点刷新价目时才联网",
			"q.aggregateScope": "只影响聚合价目这一层",
			"caliber.orderPrefix": "取值顺序：",
			"caliber.orderCatalog": "（内置厂商价目，人民币）",
			"caliber.orderAggregate": "（LiteLLM，美元）",
			"caliber.orderTail": "（台账反推均价），每格取第一个可用的",
			"caliber.officialNote": "是台账里的厂商账单，不会被价目覆盖；",
			"caliber.estimateNote": "仅供参照，不是账单。",
			"caliber.unitNote": "单价按每百万 tokens；错峰按本地时间判定；聚合价缺缓存写入价时标「部分」，那一档按未命中价计。",
			"caliber.nonePrefix": "没有价格依据的格子显示 ",
			"caliber.convertNote": "；多币种按当前汇率折算后相加，折算值前缀 ",
			"balance.total": "总余额",
			"balance.credit": "充值余额",
			"balance.grant": "赠送余额",
			"balance.balance": "余额",
			"balance.currency": "币种",
			"window.5h": "5 小时窗口",
			"window.day": "当日窗口",
			"window.week": "本周窗口",
			"window.month": "本月窗口",
			"unit.perMillion": "每百万 tokens",
			"source.official": "官方",
			"source.catalog": "官方价",
			"source.aggregate": "聚合",
			"source.estimate": "估算",
			"source.none": "无依据",
			"quota.resetAt": "重置于",
			"quota.noResponse": "没拿到服务端响应",
			"quota.fxBad": "汇率无法解析",
			"quota.refreshFailed": "刷新失败",
			"quota.fxUnavailable": "汇率不可用",
			"quota.fxCacheHint": "汇率在服务端缓存 12 小时",
			"quota.fetchFx": "取汇率",
			"quota.refreshFx": "刷新汇率",
			"quota.refreshPrices": "刷新价目",
			"quota.caliberHint": "成本口径说明",
			"quota.aggregateLabel": "LiteLLM 聚合价目",
			"quota.ratesHint": "近 30 天模型单价",
			"quota.unknown": "未知",
			"quota.notQueried": "未查询",
			"quota.snapshotTime": "快照时间",
			"quota.daysStale": "{count} 天未更新",
			"quota.modelRates": "{count} 个模型单价",
			"quota.loadingRates": "读取单价",
			"quota.ratesUnavailable": "单价表不可用",
			"quota.noUsage": "近 30 天无用量",
			"quota.converted": "≈ 为折算值",
			"quota.range": "统计区间",
			"quota.noFourRates": "没有四档单价",
			"quota.noSourceDetail": "没有来源明细",
			"quota.daysAgo": "距今 {count} 天",
			"quota.entriesCount": "{count} 条",
			"quota.unreadable": "读不到，成本会少一层依据",
			"quota.row": "第 {count} 行",
			"quota.loadingPricing": "读取价目信息",
			"quota.pricingUnavailable": "价目信息不可用",
			"quota.pricingUnavailableDetail": "服务端没有返回聚合价目信息，多半是插件服务端还是旧版本 —— 改了服务端要退出重开 DSH 才生效。",
			"quota.entry": "条目",
			"quota.modelCount": "模型",
			"quota.fileTime": "文件时间",
			"quota.currentFile": "当前文件",
			"quota.officialBill": "官方账单",
			"quota.modelsUnit": "{count} 个模型",
			"quota.partial": "其中部分 {count} 个",
			"quota.basis": "近 30 天这一格的依据",
			"quota.basisAuto": "三层价目自动生效，不需要填价格",
			"quota.priceEntries": "价目条数",
			"quota.sourceLabel": "来源",
			"quota.updated": "已更新",
			"quota.recomputed": "服务端没返回明细，已按新价目重算",
			"quota.justNow": "刚刚",
			"quota.minutesAgo": "{count} 分钟前",
			"quota.hoursAgo": "{count} 小时前",
			"quota.priceUnit": "单价",
			"quota.displayCurrency": "显示币种",
			"quota.catalogStale": "价目最近抓取距今 {days} 天，厂商调价后需人工更新",
			"quota.liveAt": "实时查询于 {time}",
			"quota.liveFailed": "实时查询未成功（{reason}）",
			"quota.entriesSuffix": " 条",
			"quota.ratesEmpty": "近 30 天无模型用量",
			"quota.live": "实时",
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
			"err.detail.none": "无余额接口"
		};
		const en = {
			"nav.usage": "Usage",
			"app.title": "Usage",
			"tab.overview": "Overview",
			"tab.detail": "Details",
			"tab.projects": "Projects",
			"tab.models": "Models",
			"tab.sessions": "Sessions",
			"tab.quota": "Balance",
			"action.refresh": "Refresh",
			"action.refreshing": "Refreshing",
			"action.caliber": "Method",
			"action.close": "Close",
			"log.title": "System log",
			"log.copy": "Copy",
			"log.clear": "Clear",
			"caliber.title": "Method",
			"caliber.version": "Version {version}",
			"caliber.source": "Daily figures come from the host ledger (official cost included); days missing there fall back to session events{days}. Projects, sessions, models and hourly buckets come from session events, one call per sample.",
			"caliber.sourceDays": " ({count} days)",
			"caliber.cost": "Cost resolves in four layers: official bill > built-in vendor catalog > LiteLLM aggregate > ledger average. Badges use the same names; — means no basis.",
			"caliber.currency": "Amounts convert to the selected currency (≈). Currently {fx}.",
			"caliber.fxMissing": "no FX rate yet, showing original currencies",
			"caliber.refresh": "Page data comes from one snapshot, rebuilt locally every 5 minutes. Balance and quota windows only go online when you open the page or refresh; stale values keep their timestamp and reason.",
			"common.calls": "Calls",
			"common.channel": "Channel",
			"common.workspace": "Workspace",
			"s.id": "Session",
			"s.title": "Title",
			"s.prompt": "First prompt",
			"s.first": "First",
			"s.last": "Last",
			"s.crossDays": "Days",
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
			"s.archiveOnly": "Archived only",
			"s.filterSubagent": "Sub-sessions",
			"s.subagentHide": "Main only",
			"s.subagentAll": "With sub-sessions",
			"s.subagentOnly": "Sub-sessions only",
			"s.subagentOther": "另有 {count} 个子代理会话",
			"s.archivedOther": "另有 {count} 个已归档会话未显示",
			"s.subagentHidden": "hidden",
			"s.subagentShown": "(shown)",
			"s.noCost": "No ledger cost",
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
			"d.unavailable": "Session usage unavailable",
			"d.partial": "Session usage incomplete",
			"d.costMode": "Billing",
			"d.activeDays": "Active days",
			"d.crossDays": "(crosses {count} days)",
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
			"o.ledgerUnavailable": "Ledger unavailable",
			"r.today": "Today",
			"r.week": "Week",
			"r.month": "Month",
			"r.total": "Total",
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
			"d.channelCount": "Channels",
			"d.activeDayCount": "Days with usage",
			"d.channelsWithUsageSuffix": " channels",
			"d.hitRateShort": "Cache hit rate",
			"d.dailyAvg": "Daily avg tokens",
			"d.daysWithUsageSuffix": " days with usage",
			"t.title": "Comparison",
			"t.titleNote": "same-length previous range",
			"t.prevZero": "previous 0",
			"t.currentPrefix": "now ",
			"t.previousPrefix": " · prev ",
			"t.loading": "Loading",
			"t.failed": "Unavailable",
			"t.prevNoData": "No previous data",
			"t.notComparableSession": "Not fully comparable",
			"t.sourceDiffPrefix": "cost sources differ (now ",
			"t.sourceDiffMiddle": " / prev ",
			"t.sourceDiffSuffix": ")",
			"t.prevLoadFailed": "Prev range failed",
			"t.noUsage": "No usage in current range",
			"t.ppNote": "hit rate in percentage points, others as % change",
			"t.currentCost": "Current cost",
			"t.currentTokens": "Current tokens",
			"t.vs": " · vs ",
			"fmt.justNow": "just now",
			"fmt.minutesAgo": "{count} min ago",
			"fmt.hoursAgo": "{count} h ago",
			"fmt.daysAgo": "{count} d ago",
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
			"p.clearFilter": "Clear filter",
			"p.archivePrefix": "(",
			"p.archiveSuffix": " archived included)",
			"p.empty": "No matches",
			"p.noUsage": "No usage to show",
			"h.month": "Month",
			"h.summaryPrefix": "Last 9 months · ",
			"h.summarySuffix": " active days",
			"h.tip": "One cell = one day of tokens; darker means more",
			"h.noUsage": "No usage",
			"h.noLedger": "Not in ledger",
			"sh.channels": "Channels",
			"sh.models": "Models",
			"sh.noData": "No data",
			"sh.morePrefix": ", +",
			"sh.moreSuffix": " more",
			"issue.build-failed": "Snapshot build failed; keeping the previous one",
			"issue.build-duration": "Build is slow",
			"issue.quota-failed": "Quota query failed",
			"issue.write-failed": "Snapshot write failed",
			"srv.rateNoteEn": "see rates, source and date below",
			"p.costHint": "cost estimated from the price catalog",
			"p.hitHint": "; hit rate = cache read / (input + output + cache read)",
			"srv.code.noSnapshot": "no local snapshot yet",
			"srv.code.noCredential": "no credential available",
			"srv.code.unsupported": "channel has no API",
			"srv.code.hostUnavailable": "host API unavailable",
			"srv.code.fetchFailed": "query failed",
			"srv.code.timeout": "query timed out",
			"fmt.dayHour": "{days}d {hours}h",
			"srv.ratesAverage": "ledger average estimate",
			"srv.ratesNone": "no price basis",
			"srv.noSessionService": "host has no session service",
			"srv.noSingleSession": "single-session query unsupported",
			"srv.sessionDetailUnavailable": "session detail unavailable",
			"srv.fxCache": "cached FX (within {hours}h)",
			"srv.fxLive": "live FX from {host}",
			"srv.fxFailedCache": "upstream failed, using cache",
			"srv.fxFailedDefault": "FX unavailable, using default {rate}",
			"m.others": "Others",
			"fx.live": "Live",
			"fx.cache": "Cached",
			"fx.default": "Default",
			"fx.missing": "No FX rate yet, showing original currencies",
			"fx.stale": "Stale",
			"fx.defaultPrefix": "Using default rate ",
			"fx.defaultSuffix": ", offline",
			"api.notFound": "HTTP 404: endpoint missing",
			"api.restartHint": "restart DSH after server changes",
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
			"cso.estimate": "Estimate",
			"cso.none": "No basis",
			"csh.official": "Official: vendor bill from the ledger",
			"csh.catalog": "Catalog: built-in vendor price list",
			"csh.aggregate": "Aggregate: LiteLLM price list (USD), refreshable",
			"csh.estimate": "Estimate: derived from the ledger average",
			"csh.none": "No price basis",
			"csh.unknown": "Unknown cost source",
			"part.suffix": " · partial",
			"part.hint": "cache-write price missing, uses the miss price",
			"s.showPrefix": "Show ",
			"s.showSuffix": " sessions",
			"s.amount": "Amount",
			"s.unknownDate": "Unknown date",
			"r.yesterday": "Yesterday",
			"o.callsSuffix": " calls",
			"c.cost": "Cost",
			"q.resetUnknown": "Resets —",
			"q.retryHint": ", no snapshot — tap refresh",
			"q.snapshotPrefix": ", snapshot ",
			"q.stalePrefix": ", ",
			"q.daysStaleSuffix": " days old",
			"q.modelRatesPrefix": " model rates · ",
			"q.aggregateSuffix": " · LiteLLM)",
			"q.convertedPrefix": "(≈ converted: ",
			"q.rangePrefix": " · range ",
			"q.partialPrefix": "partial ",
			"q.priceEntriesSuffix": " price entries",
			"q.entriesClose": " entries)",
			"q.modelsSuffix": " models",
			"q.agoPrefix": ", ",
			"q.minutesAgoSuffix": " min ago",
			"q.hoursAgoSuffix": " h ago",
			"q.rowPrefix": " row ",
			"q.rowSuffix": "",
			"q.daySuffix": " d",
			"q.countSuffix": "",
			"q.noBasis": "None",
			"export.csv": "CSV",
			"export.json": "JSON",
			"d.hourUnit": "h · ",
			"d.callUnit": " calls",
			"dd.title": "Daily detail",
			"dd.sum": "Total",
			"empty.noUsage": "No usage",
			"h.summary": "Heatmap",
			"h.noData": "No data",
			"h.level1": "Less",
			"h.level2": "Low",
			"h.level3": "Mid",
			"h.level4": "High",
			"h.level5": "More",
			"sh.shareByTokens": "share · by tokens",
			"sh.shareLabel": "share",
			"t.noPrevRange": "No previous range",
			"t.metric": "Metric",
			"t.currentCol": "Now",
			"t.previousCol": "Prev",
			"t.change": "Change",
			"m.share": "Share",
			"m.empty": "No matches",
			"p.project": "Project",
			"o.keyList": "Keys",
			"o.type": "Type",
			"o.balanceWindow": "Balance / window",
			"o.cost30": "30d cost",
			"o.detailArrow": "Details →",
			"o.noChannels": "No channel config",
			"o.ledgerHint": "Ledger unavailable, columns empty",
			"o.snapshotHint": "No balance snapshot, showing —",
			"h.wd0": "S",
			"h.wd1": "M",
			"h.wd2": "T",
			"h.wd3": "W",
			"h.wd4": "T",
			"h.wd5": "F",
			"h.wd6": "S",
			"d.loading": "Loading session",
			"d.noDetail": "No detail to show",
			"d.noCostBasis": "No ledger cost and no price match, showing —",
			"d.noPrompt": "No human prompt (teammate or system session)",
			"d.byModel": "By model",
			"d.hoursNote": "Distribution over a day (hours summed, cross-day merged)",
			"d.ledgerLoading": "Ledger loading or unavailable",
			"d.sourceSession": "Source: session events (no ledger entry that day)",
			"d.hourlyNote": "Hourly data from session events, cost excluded",
			"r.from": "From",
			"r.to": "To",
			"s.timeDuration": "Time / duration",
			"s.empty": "No matches",
			"s.sessionCost": "Session cost",
			"q.offPeak": "Off-peak",
			"q.catalogPrefix": " vendor catalog entries, ",
			"q.catalogAuto": "applied automatically",
			"q.aggregateRefreshOnly": "online only when you refresh prices",
			"q.aggregateScope": "affects the aggregate layer only",
			"caliber.orderPrefix": "Order: ",
			"caliber.orderCatalog": " (built-in catalog, CNY)",
			"caliber.orderAggregate": " (LiteLLM, USD)",
			"caliber.orderTail": " (ledger average); the first available wins",
			"caliber.officialNote": "is the vendor bill in the ledger, not overridden by prices; ",
			"caliber.estimateNote": "is indicative, not a bill.",
			"caliber.unitNote": "Prices are per 1M tokens; off-peak uses local time; aggregate entries missing the cache-write price are marked partial and billed at the miss price.",
			"caliber.nonePrefix": "Cells without any price basis show ",
			"caliber.convertNote": "; multi-currency amounts are converted then summed, prefixed with ",
			"balance.total": "Total",
			"balance.credit": "Credit",
			"balance.grant": "Granted",
			"balance.balance": "Balance",
			"balance.currency": "Currency",
			"window.5h": "5-hour",
			"window.day": "Daily",
			"window.week": "Weekly",
			"window.month": "Monthly",
			"unit.perMillion": "per 1M tokens",
			"source.official": "Official",
			"source.catalog": "Catalog",
			"source.aggregate": "Aggregate",
			"source.estimate": "Estimate",
			"source.none": "None",
			"quota.resetAt": "Resets",
			"quota.noResponse": "No response",
			"quota.fxBad": "Bad FX data",
			"quota.refreshFailed": "Refresh failed",
			"quota.fxUnavailable": "FX unavailable",
			"quota.fxCacheHint": "FX is cached server-side for 12h",
			"quota.fetchFx": "Get FX",
			"quota.refreshFx": "Refresh FX",
			"quota.refreshPrices": "Refresh prices",
			"quota.caliberHint": "Cost method",
			"quota.aggregateLabel": "LiteLLM aggregate",
			"quota.ratesHint": "Model rates (30d)",
			"quota.unknown": "Unknown",
			"quota.notQueried": "Not queried",
			"quota.snapshotTime": "Snapshot",
			"quota.daysStale": "{count} days old",
			"quota.modelRates": "{count} model rates",
			"quota.loadingRates": "Loading rates",
			"quota.ratesUnavailable": "Rates unavailable",
			"quota.noUsage": "No usage in 30d",
			"quota.converted": "≈ converted",
			"quota.range": "Range",
			"quota.noFourRates": "No 4-tier rates",
			"quota.noSourceDetail": "No source detail",
			"quota.daysAgo": "{count} days ago",
			"quota.entriesCount": "{count} entries",
			"quota.unreadable": "unreadable: cost loses one layer",
			"quota.row": "Row {count}",
			"quota.loadingPricing": "Loading pricing",
			"quota.pricingUnavailable": "Pricing unavailable",
			"quota.pricingUnavailableDetail": "The server returned no aggregate pricing — the plugin server is probably an older build. Restart DSH after server changes.",
			"quota.entry": "Entries",
			"quota.modelCount": "Models",
			"quota.fileTime": "File time",
			"quota.currentFile": "Current file",
			"quota.officialBill": "Official bill",
			"quota.modelsUnit": "{count} models",
			"quota.partial": "{count} partial",
			"quota.basis": "Basis for this cell (30d)",
			"quota.basisAuto": "three price layers apply automatically",
			"quota.priceEntries": "Price entries",
			"quota.sourceLabel": "Source",
			"quota.updated": "Updated",
			"quota.recomputed": "No detail from server; recomputed with the new prices",
			"quota.justNow": "just now",
			"quota.minutesAgo": "{count} min ago",
			"quota.hoursAgo": "{count} h ago",
			"quota.priceUnit": "Rates",
			"quota.displayCurrency": "Currency",
			"quota.catalogStale": "catalog last fetched {days} days ago; update it when vendors change prices",
			"quota.liveAt": "live query at {time}",
			"quota.liveFailed": "live query failed ({reason})",
			"quota.entriesSuffix": " entries",
			"quota.ratesEmpty": "no model usage in 30 days",
			"quota.live": "Live",
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
			"err.detail.none": "No balance API"
		};
		//#endregion
		//#region src/client/core/log.ts
		const MAX_ENTRIES = 200;
		let entries = [];
		let nextId = 1;
		let notifyQueued = false;
		const listeners$2 = /* @__PURE__ */ new Set();
		function notify() {
			if (notifyQueued) return;
			notifyQueued = true;
			queueMicrotask(() => {
				notifyQueued = false;
				for (const listener of listeners$2) listener();
			});
		}
		function logPush(level, source, message) {
			if (message === "") return;
			entries = [...entries, {
				id: nextId,
				time: Date.now(),
				level,
				source,
				message
			}];
			nextId += 1;
			if (entries.length > MAX_ENTRIES) entries = entries.slice(entries.length - MAX_ENTRIES);
			notify();
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
		function clearLog() {
			entries = [];
			notify();
		}
		/** 导出成纯文本，便于贴到 issue 里。 */
		function logText() {
			return entries.map((entry) => new Date(entry.time).toLocaleTimeString("zh-CN", { hour12: false }) + " [" + entry.level + "] " + entry.source + ": " + entry.message).join("\n");
		}
		/** 同一类问题只记一次，避免刷屏（例如同一次渲染里同一个缺词被问很多遍）。 */
		const onceKeys = /* @__PURE__ */ new Set();
		function logOnce(level, source, key, message) {
			const dedupe = source + "|" + key;
			if (onceKeys.has(dedupe)) return;
			onceKeys.add(dedupe);
			logPush(level, source, message);
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
			(0, react.useSyncExternalStore)(subscribe, () => revision);
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
					failureReasons.set(failureKey, failureTextOf(response.status));
					return null;
				}
				failureReasons.delete(failureKey);
				return await response.json();
			} catch (error) {
				failureReasons.set(failureKey, t("api.requestFailed") + (error instanceof Error ? error.message : String(error)));
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
			const result = await fetchJson("/dsh-key-usage/heatmap");
			return result === null ? null : result.days;
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
		function loadPricing() {
			return fetchJson("/dsh-key-usage/pricing");
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
		function loadSnapshot() {
			return fetchJson(SNAPSHOT_PATH);
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
		/** 毫秒时间戳 → `HH:mm`。 */
		function fmtTime(timeMs) {
			if (timeMs === null) return "—";
			const date = new Date(timeMs);
			return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
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
		/** 最近活跃：刚刚 / N 分钟前 / N 小时前 / N 天前。 */
		function fmtRelative(timeMs, nowMs) {
			if (timeMs === null) return "—";
			const minutes = Math.round((nowMs - timeMs) / 6e4);
			if (minutes < 1) return t("fmt.justNow");
			if (minutes < 60) return t("fmt.minutesAgo", { count: minutes });
			if (minutes < 1440) return t("fmt.hoursAgo", { count: Math.round(minutes / 60) });
			return t("fmt.daysAgo", { count: Math.round(minutes / 1440) });
		}
		//#endregion
		//#region src/client/core/currency.ts
		/**
		* 显示币种与汇率折算：全插件金额渲染的唯一收口点（模块级订阅 store，切币种时整页重渲染）。
		* 逐币种小计走 `costsByCurrency`（`cost` 是混币种相加，只当兜底）；能折算才折算（带 `≈`），绝不猜汇率；
		* 显示币种不落盘 —— 记住一个还没取到汇率的 USD 只会让界面更难懂。
		*/
		const DISPLAY_CURRENCIES = ["CNY", "USD"];
		/** 切换按钮的文案：符号 + ISO 代码，避免只认符号的用户认错币种。 */
		const DISPLAY_CURRENCY_LABELS = {
			CNY: "¥ RMB",
			USD: "$ USD"
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
		function useCurrencyDisplay() {
			const [current, setCurrent] = (0, react.useState)(currencyDisplayStateOf);
			(0, react.useEffect)(() => subscribeCurrencyDisplay(() => setCurrent(currencyDisplayStateOf())), []);
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
		/** 该币种的金额在当前显示币种下是否会被折算（决定要不要显示 `≈` 与原始币种）。 */
		function convertsCurrencyOf(currency) {
			const from = normalizeCurrency(currency);
			return from !== null && from !== state.display && pairRateOf(from, state.display) !== null;
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
		/** 同一行在展示币种下的可比数值（环比涨跌、排序用）。 */
		function comparableMoneyAmountOf(row) {
			return rowMoneyViewOf(row).amount;
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
		//#region src/client/core/pricing.ts
		/**
		* 价目视图模型：只把服务端给的三层价目来源、覆盖度与装载状态翻译成文案，**界面不维护任何价格**。
		* 金额渲染见 `currency.ts`（显示币种与汇率折算的唯一收口点）。
		*/
		/** 成本来源角标，与服务端 `costSource` 一一对应。 */
		const AGGREGATE_LOADED_LABELS = {
			local: t("src.liveFile"),
			shipped: t("src.bundled"),
			none: t("src.notLoaded")
		};
		/** 装载状态文案；服务端给了没见过的取值时按「未知」显示，不崩。 */
		function aggregateLoadedLabelOf(loaded) {
			if (loaded === "local" || loaded === "shipped" || loaded === "none") return AGGREGATE_LOADED_LABELS[loaded];
			return loaded === void 0 || loaded === null || loaded === "" ? t("src.notLoaded") : t("src.unknown") + "（" + loaded + "）";
		}
		/**
		* LiteLLM 仓库地址。**不能**写成带协议前缀的完整字面量：构建后处理会把「字母 + 冒号 + 斜杠」误判成
		* 盘符路径而让构建失败，所以拆段拼（冒号必须在第二段里）。
		*/
		const LITELLM_REPO_URL = [
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
		/** 上游 commit 的短写法；太短或缺失时返回 null（完整值挂在装载信息的 tooltip 上）。 */
		function shortCommitOf(commit) {
			if (typeof commit !== "string" || commit.trim().length < 7) return null;
			return commit.trim().slice(0, 7);
		}
		const COST_SOURCE_LABELS = {
			official: "cso.official",
			catalog: "cso.catalog",
			aggregate: "cso.aggregate",
			estimate: "cso.estimate",
			none: "—"
		};
		/** 角标的悬浮说明：让「估算」不会被当成账单金额用。 */
		const COST_SOURCE_HINTS = {
			official: "csh.official",
			catalog: "csh.catalog",
			aggregate: "csh.aggregate",
			estimate: "csh.estimate",
			none: "csh.none"
		};
		const PARTIAL_PRICE_HINT = "part.hint";
		/** 角标悬浮说明：带 `partial` 时补一句口径，避免「部分」被读成缺数据 / 报错。 */
		function costSourceHintOf(source, partial) {
			const key = COST_SOURCE_HINTS[source ?? "none"];
			const hint = key === void 0 ? t("csh.unknown") + " " + String(source ?? "") : t(key);
			return partial === true ? hint + "；" + t(PARTIAL_PRICE_HINT) : hint;
		}
		/** 抓取日期（`YYYY-MM-DD`，本地日历日）距今天数；解析不出返回 null。 */
		function fetchedDaysAgo(fetchedAt, now = /* @__PURE__ */ new Date()) {
			const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fetchedAt.trim());
			if (match === null) return null;
			const fetched = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
			if (!Number.isFinite(fetched)) return null;
			const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
			return Math.max(0, Math.round((today - fetched) / 864e5));
		}
		/** 最新一次抓取距今的天数；没有可解析的日期、或还没超过阈值时返回 null。 */
		function catalogStaleDays(sources, now = /* @__PURE__ */ new Date()) {
			const days = sources.map((entry) => fetchedDaysAgo(entry.fetchedAt, now)).filter((day) => day !== null);
			if (days.length === 0) return null;
			const newest = Math.min(...days);
			return newest > 90 ? newest : null;
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/shared.module.css.mjs
		const css$8 = ".d29QNW_section{box-sizing:border-box;height:100%;color:var(--dsw-alias-label-primary,#e8e8ec);font-size:calc(var(--dsh-content-font-size,12px) * 1.24);padding:16px 20px 32px;line-height:1.55;overflow-y:auto}[data-sidebar-right-open] .d29QNW_section,[data-sidebar-right-float-host] .d29QNW_section{padding:12px}.d29QNW_title{font-size:calc(var(--dsh-content-font-size,12px) * 1.65);justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;font-weight:650;display:flex}.d29QNW_titleActions{align-items:center;gap:8px;display:inline-flex}.d29QNW_ghLink{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);background:0 0;border-radius:999px;align-items:center;gap:4px;padding:4px 8px;line-height:0;text-decoration:none;display:inline-flex}.d29QNW_ghLink:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.d29QNW_ghLink:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.d29QNW_refreshBtn{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:calc(var(--dsh-content-font-size,12px) * 1.05);cursor:pointer;background:0 0;border-radius:999px;padding:3px 12px;font-family:inherit}.d29QNW_refreshBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.d29QNW_refreshBtn:disabled{opacity:.6;cursor:default}.d29QNW_refreshIcon,.d29QNW_refreshIconSpin{display:inline-block}.d29QNW_refreshIconSpin{animation:.9s linear infinite d29QNW_refreshSpin}@keyframes d29QNW_refreshSpin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.d29QNW_refreshIconSpin{animation:none}}.d29QNW_tabBar{border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);flex-wrap:wrap;gap:2px;margin-bottom:18px;display:flex}.d29QNW_tabBar button{color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.19);cursor:pointer;background:0 0;border:0;border-bottom:2px solid #0000;margin-bottom:-1px;padding:8px 14px}.d29QNW_tabBar button:hover{color:var(--dsw-alias-label-primary,#e8e8ec)}.d29QNW_tabBar button.d29QNW_active{color:var(--dsw-alias-state-business-primary,#5b8cff);border-bottom-color:var(--dsw-alias-state-business-primary,#5b8cff);font-weight:600}.d29QNW_card{background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:12px;padding:14px 16px}.d29QNW_cardGrid3{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px;display:grid}.d29QNW_cardGrid4{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:18px;display:grid}.d29QNW_cardGridAuto{grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:18px;display:grid}.d29QNW_cardGrid6{grid-template-columns:repeat(auto-fit,minmax(172px,1fr));gap:10px;margin-bottom:18px;display:grid}@media (max-width:720px){.d29QNW_cardGrid4{grid-template-columns:repeat(2,minmax(0,1fr))}}.d29QNW_statLabel{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * 1.05);margin-bottom:6px}.d29QNW_statValue{font-size:calc(var(--dsh-content-font-size,12px) * 1.83);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e8e8ec);white-space:nowrap;padding-right:72px;font-weight:650}.d29QNW_statExtra{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * 1.05);margin-top:4px}.d29QNW_groupLabel{color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:calc(var(--dsh-content-font-size,12px) * 1.15);margin:4px 0 10px;font-weight:600}.d29QNW_blockLabel{color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:calc(var(--dsh-content-font-size,12px) * 1.05);margin:18px 0 4px}.d29QNW_table{border-collapse:collapse;width:100%;margin-top:10px}.d29QNW_table th{text-align:right;color:var(--dsw-alias-label-tertiary,#67676f);font-weight:500;font-size:calc(var(--dsh-content-font-size,12px) * .96);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);white-space:nowrap;padding:5px 8px}.d29QNW_table td{text-align:right;font-size:calc(var(--dsh-content-font-size,12px) * 1.1);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9a9aa6);vertical-align:middle;border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);white-space:normal;overflow-wrap:anywhere;padding:7px 8px}.d29QNW_table th:first-child,.d29QNW_table td:first-child{text-align:left;padding-left:0}.d29QNW_table td:first-child{color:var(--dsw-alias-label-primary,#e8e8ec)}.d29QNW_sortBtn{font:inherit;color:inherit;cursor:pointer;-webkit-user-select:none;user-select:none;background:0 0;border:0;align-items:center;padding:0;display:inline-flex}.d29QNW_sortBtn:hover{color:var(--dsw-alias-label-secondary,#9a9aa6)}.d29QNW_sortBtn.d29QNW_sortActiveBtn{color:var(--dsw-alias-state-business-primary,#5b8cff)}.d29QNW_refreshBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.d29QNW_chip:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.d29QNW_sortBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.d29QNW_tabBar button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.d29QNW_sortArrow{font-size:calc(var(--dsh-content-font-size,12px) * .73);opacity:.8;margin-left:3px}.d29QNW_table tr.d29QNW_clickable{cursor:pointer}.d29QNW_table tr.d29QNW_clickable:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c12)}.d29QNW_table tr.d29QNW_total td{color:var(--dsw-alias-label-primary,#e8e8ec);border-bottom:0;border-top:1px solid var(--dsw-alias-border-l2,#2c2c34);font-weight:600}.d29QNW_table tr.d29QNW_disabled{opacity:.55}.d29QNW_chipRow{flex-wrap:wrap;gap:8px;margin-bottom:14px;display:flex}.d29QNW_chip{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.1);cursor:pointer;background:0 0;border-radius:999px;align-items:center;gap:6px;padding:5px 13px;display:inline-flex}.d29QNW_chip:hover{color:var(--dsw-alias-label-primary,#e8e8ec);border-color:var(--dsw-alias-label-tertiary,#67676f)}.d29QNW_chip.d29QNW_active{background:var(--dsw-alias-interactive-bg-active,#5b8cff24);color:var(--dsw-alias-state-business-primary,#5b8cff);border-color:#5b8cff66;font-weight:600}.d29QNW_statusDot{border-radius:50%;flex-shrink:0;width:8px;height:8px;display:inline-block}.d29QNW_dim{color:var(--dsw-alias-label-tertiary,#67676f)}.d29QNW_mono{font-family:ui-monospace,Consolas,monospace;font-size:calc(var(--dsh-content-font-size,12px) * 1.01);color:var(--dsw-alias-label-secondary,#9a9aa6)}.d29QNW_empty{color:var(--dsw-alias-label-tertiary,#67676f);padding:18px 0}.d29QNW_warning{color:var(--dsw-alias-state-warning-primary,#e0a13c);font-size:calc(var(--dsh-content-font-size,12px) * 1.05);margin-bottom:10px}.d29QNW_legend{font-size:calc(var(--dsh-content-font-size,12px) * .96);color:var(--dsw-alias-label-tertiary,#67676f);flex-wrap:wrap;align-items:center;gap:10px;display:inline-flex}.d29QNW_legend i{border-radius:2px;width:10px;height:10px;margin-right:3px;display:inline-block}.d29QNW_legend i.d29QNW_ghost{background:#80808c1a;border:1px solid #80808c47}.d29QNW_footnote{border-top:1px solid var(--dsw-alias-border-l1,#2c2c34);color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * 1.05);margin-top:26px;padding-top:14px;line-height:1.8}.d29QNW_footnote b{color:var(--dsw-alias-label-secondary,#9a9aa6);font-weight:500}.d29QNW_footnoteList{margin:4px 0 0;padding-left:18px}.d29QNW_footnoteList li{margin:1px 0}.d29QNW_tooltip{z-index:9999;pointer-events:none;background:var(--dsw-alias-bg-layer-3,#232329);border:1px solid var(--dsw-alias-border-l2,#2c2c34);box-shadow:var(--dsw-shadow-lv2,0 8px 24px #00000059);min-width:210px;max-width:300px;font-size:calc(var(--dsh-content-font-size,12px) * 1.1);color:var(--dsw-alias-label-primary,#e8e8ec);border-radius:10px;padding:10px 12px;font-family:inherit;line-height:1.5;position:fixed}.d29QNW_tipTitle{font-size:calc(var(--dsh-content-font-size,12px) * 1.1);margin-bottom:2px;font-weight:650}.d29QNW_tipSub{font-size:calc(var(--dsh-content-font-size,12px) * 1.05);color:var(--dsw-alias-label-secondary,#9a9aa6);margin-bottom:8px}.d29QNW_tipRow{font-size:calc(var(--dsh-content-font-size,12px) * 1.01);color:var(--dsw-alias-label-secondary,#9a9aa6);align-items:center;gap:6px;padding:2px 0;display:flex}.d29QNW_tipRow i{border-radius:2px;flex-shrink:0;width:7px;height:7px}.d29QNW_tipName{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.d29QNW_tipAmount{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-tertiary,#67676f);text-align:right;width:58px}.d29QNW_tipRate{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600}.d29QNW_tipBar{background:var(--dsw-alias-fill-l1,#80808c2e);border-radius:2px;height:3px;margin:1px 0 5px;overflow:hidden}.d29QNW_tipBar>i{border-radius:2px;height:100%;display:block}.d29QNW_tipDivider{border-top:1px solid var(--dsw-alias-border-l1,#2c2c34);font-size:calc(var(--dsh-content-font-size,12px) * 1.01);color:var(--dsw-alias-label-secondary,#9a9aa6);justify-content:space-between;gap:12px;margin-top:6px;padding-top:6px;display:flex}.d29QNW_ghost{background:var(--dsw-alias-fill-l2,#80808c1a);border:1px solid var(--dsw-alias-border-l2,#80808c47)}.d29QNW_caliberVersion{font-size:calc(var(--dsh-content-font-size,12px) * 1.05);color:var(--dsw-alias-label-tertiary,#67676f);font-variant-numeric:tabular-nums;margin:0 0 8px}.d29QNW_logActions{gap:8px;margin-bottom:10px;display:flex}.d29QNW_logEmpty{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * 1.1)}.d29QNW_logList{flex-direction:column;gap:4px;margin:0;padding:0;list-style:none;display:flex}.d29QNW_logRow{font-size:calc(var(--dsh-content-font-size,12px) * 1.05);font-variant-numeric:tabular-nums;grid-template-columns:68px 44px 62px 1fr;gap:8px;line-height:1.5;display:grid}.d29QNW_logTime,.d29QNW_logLevel{color:var(--dsw-alias-label-tertiary,#67676f)}.d29QNW_logWarn{color:var(--dsw-alias-state-warn-primary,#e0a13c)}.d29QNW_logError{color:var(--dsw-alias-state-error-primary,#e05a5a)}.d29QNW_logSource{color:var(--dsw-alias-label-secondary,#9a9aa6)}.d29QNW_logMessage{color:var(--dsw-alias-label-primary,#e8e8ec);word-break:break-all}.d29QNW_statValueRow{position:relative}.d29QNW_statBadge{white-space:nowrap;font-size:calc(var(--dsh-content-font-size,12px) * .92);color:var(--dsw-alias-label-secondary,#9a9aa6);position:absolute;top:0;right:0}.d29QNW_statAbove{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .87);margin-top:2px}.d29QNW_badgeWarn{color:var(--dsw-alias-state-warn-primary,#e0a13c)}";
		const tagId$8 = "dsh-key-usage/shared.module.css";
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
		var shared_module_css_default = {
			"active": "d29QNW_active",
			"badgeWarn": "d29QNW_badgeWarn",
			"blockLabel": "d29QNW_blockLabel",
			"caliberVersion": "d29QNW_caliberVersion",
			"card": "d29QNW_card",
			"cardGrid3": "d29QNW_cardGrid3",
			"cardGrid4": "d29QNW_cardGrid4",
			"cardGrid6": "d29QNW_cardGrid6",
			"cardGridAuto": "d29QNW_cardGridAuto",
			"chip": "d29QNW_chip",
			"chipRow": "d29QNW_chipRow",
			"clickable": "d29QNW_clickable",
			"dim": "d29QNW_dim",
			"disabled": "d29QNW_disabled",
			"empty": "d29QNW_empty",
			"footnote": "d29QNW_footnote",
			"footnoteList": "d29QNW_footnoteList",
			"ghLink": "d29QNW_ghLink",
			"ghost": "d29QNW_ghost",
			"groupLabel": "d29QNW_groupLabel",
			"legend": "d29QNW_legend",
			"logActions": "d29QNW_logActions",
			"logEmpty": "d29QNW_logEmpty",
			"logError": "d29QNW_logError",
			"logLevel": "d29QNW_logLevel",
			"logList": "d29QNW_logList",
			"logMessage": "d29QNW_logMessage",
			"logRow": "d29QNW_logRow",
			"logSource": "d29QNW_logSource",
			"logTime": "d29QNW_logTime",
			"logWarn": "d29QNW_logWarn",
			"mono": "d29QNW_mono",
			"refreshBtn": "d29QNW_refreshBtn",
			"refreshIcon": "d29QNW_refreshIcon",
			"refreshIconSpin": "d29QNW_refreshIconSpin",
			"refreshSpin": "d29QNW_refreshSpin",
			"section": "d29QNW_section",
			"sortActiveBtn": "d29QNW_sortActiveBtn",
			"sortArrow": "d29QNW_sortArrow",
			"sortBtn": "d29QNW_sortBtn",
			"statAbove": "d29QNW_statAbove",
			"statBadge": "d29QNW_statBadge",
			"statExtra": "d29QNW_statExtra",
			"statLabel": "d29QNW_statLabel",
			"statValue": "d29QNW_statValue",
			"statValueRow": "d29QNW_statValueRow",
			"statusDot": "d29QNW_statusDot",
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
			"title": "d29QNW_title",
			"titleActions": "d29QNW_titleActions",
			"tooltip": "d29QNW_tooltip",
			"total": "d29QNW_total",
			"warning": "d29QNW_warning"
		};
		//#endregion
		//#region src/client/core/tooltip.tsx
		/** 共享浮层：跟随鼠标的 fixed 层，内容用 React 节点渲染（不再拼接 innerHTML）。 */
		function useTooltip() {
			const [tooltip, setTooltip] = (0, react.useState)(null);
			return {
				tooltip,
				show: (0, react.useCallback)((event, node) => {
					setTooltip({
						x: event.clientX,
						y: event.clientY,
						node
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
				const maxX = window.innerWidth - element.offsetWidth - 12;
				const maxY = window.innerHeight - element.offsetHeight - 12;
				element.style.left = Math.max(8, Math.min(tooltip.x + 14, maxX)) + "px";
				element.style.top = Math.max(8, Math.min(tooltip.y + 14, maxY)) + "px";
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
		function TipDivider({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shared_module_css_default.tipDivider,
				children
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/ui.module.css.mjs
		const css$7 = ".eBtFdG_btn{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.1);cursor:pointer;white-space:nowrap;background:0 0;border-radius:8px;justify-content:center;align-items:center;gap:6px;padding:6px 12px;line-height:1;display:inline-flex}.eBtFdG_btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.eBtFdG_btn:disabled{opacity:.55;cursor:default}.eBtFdG_btn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.eBtFdG_btnSm{font-size:calc(var(--dsh-content-font-size,12px) * 1.05);padding:4px 9px}.eBtFdG_btnIcon{padding:6px}.eBtFdG_btnPrimary{border-color:var(--dsw-alias-state-business-primary,#5b8cff);color:var(--dsw-alias-state-business-primary,#5b8cff)}.eBtFdG_btnPrimary:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-active,#5b8cff24);color:var(--dsw-alias-state-business-primary,#5b8cff)}.eBtFdG_btnActive{background:var(--dsw-alias-interactive-bg-active,#5b8cff24);color:var(--dsw-alias-state-business-primary,#5b8cff);font-weight:600}.eBtFdG_selectWrap{display:inline-block;position:relative}.eBtFdG_selectBtn{border:1px solid var(--dsw-alias-border-l2,#2c2c34);max-width:240px;color:var(--dsw-alias-label-primary,#e8e8ec);font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.1);cursor:pointer;background:0 0;border-radius:9px;align-items:center;gap:8px;padding:5px 9px;display:inline-flex}.eBtFdG_selectBtn:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c1a)}.eBtFdG_selectBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.eBtFdG_selectValue{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.eBtFdG_selectCaret{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .83);flex:none}.eBtFdG_selectList{z-index:40;border:1px solid var(--dsw-alias-border-l2,#2c2c34);background:var(--dsw-alias-bg-layer-2,#1c1c22);border-radius:10px;min-width:100%;max-height:280px;margin:0;padding:4px;list-style:none;position:absolute;top:calc(100% + 4px);left:0;overflow-y:auto;box-shadow:0 8px 24px #00000047}.eBtFdG_selectOption{font-size:calc(var(--dsh-content-font-size,12px) * 1.1);color:var(--dsw-alias-label-primary,#e8e8ec);cursor:pointer;white-space:nowrap;border-radius:7px;align-items:center;gap:6px;padding:6px 8px;display:flex}.eBtFdG_selectOptionActive{background:var(--dsw-alias-interactive-bg-active,#5b8cff24);color:var(--dsw-alias-state-business-primary,#5b8cff)}.eBtFdG_selectCheck{color:var(--dsw-alias-state-business-primary,#5b8cff);margin-left:auto}.eBtFdG_tableScroll{overflow-x:auto}.eBtFdG_emptyState{font-size:calc(var(--dsh-content-font-size,12px) * 1.1);color:var(--dsw-alias-label-tertiary,#67676f);flex-direction:column;gap:4px;padding:16px 0;display:flex}.eBtFdG_emptyTitle{color:var(--dsw-alias-label-secondary,#9a9aa6)}.eBtFdG_dialogMask{z-index:60;background:var(--dsw-alias-bg-mask,#00000073);justify-content:center;align-items:center;padding:24px;display:flex;position:fixed;top:0;bottom:0;left:0;right:0}.eBtFdG_dialog{border:1px solid var(--dsw-alias-border-l2,#2c2c34);background:var(--dsw-alias-bg-layer-1,#16161a);border-radius:12px;width:100%;max-width:620px;max-height:78vh;padding:16px;overflow:auto;box-shadow:0 16px 48px #0006}.eBtFdG_dialog:focus-visible{outline:none}.eBtFdG_dialogHead{justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px;display:flex}.eBtFdG_dialogTitle{font-size:calc(var(--dsh-content-font-size,12px) * 1.28);color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:650}.eBtFdG_dialogClose{color:var(--dsw-alias-label-tertiary,#67676f);cursor:pointer;font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.19);background:0 0;border:0;padding:4px}.eBtFdG_dialogClose:hover{color:var(--dsw-alias-label-primary,#e8e8ec)}.eBtFdG_dialogBody{font-size:calc(var(--dsh-content-font-size,12px) * 1.15);color:var(--dsw-alias-label-secondary,#9a9aa6);line-height:1.75}";
		const tagId$7 = "dsh-key-usage/ui.module.css";
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
		var ui_module_css_default = {
			"btn": "eBtFdG_btn",
			"btnActive": "eBtFdG_btnActive",
			"btnIcon": "eBtFdG_btnIcon",
			"btnPrimary": "eBtFdG_btnPrimary",
			"btnSm": "eBtFdG_btnSm",
			"dialog": "eBtFdG_dialog",
			"dialogBody": "eBtFdG_dialogBody",
			"dialogClose": "eBtFdG_dialogClose",
			"dialogHead": "eBtFdG_dialogHead",
			"dialogMask": "eBtFdG_dialogMask",
			"dialogTitle": "eBtFdG_dialogTitle",
			"emptyState": "eBtFdG_emptyState",
			"emptyTitle": "eBtFdG_emptyTitle",
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
		//#region src/client/core/channels.ts
		/** 通道展示工具：颜色、显示名、状态与计费模式文案。 */
		const CHANNEL_COLORS = [
			"var(--dsw-alias-state-business-primary, #5b8cff)",
			"var(--dsw-alias-state-business-secondary, #9a7bff)",
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
			if (status === "warn") return "var(--dsw-alias-state-warning-primary, #e0a13c)";
			if (status === "danger") return "var(--dsw-alias-state-danger-primary, #e05a5a)";
			return "var(--dsw-alias-label-tertiary, #67676f)";
		}
		/** 窗口占用进度条颜色：≥90 危险、≥60 警告，其余正常。 */
		function quotaBarColor(percent) {
			if (percent >= 90) return "var(--dsw-alias-state-danger-primary, #e05a5a)";
			if (percent >= 60) return "var(--dsw-alias-state-warning-primary, #e0a13c)";
			return "var(--dsw-alias-state-success-primary, #3fb96f)";
		}
		const COST_MODE_KEYS = {
			sub: "ch.inSub",
			perToken: "ch.metered",
			free: "ch.free",
			none: "ch.noBilling",
			unknown: "ch.notQueried"
		};
		t("ch.subscription"), t("ch.local");
		//#endregion
		//#region \0dsh-css:src/client/styles/overview.module.css.mjs
		const css$6 = ".tXjxsq_keyTable{border-collapse:collapse;width:100%}.tXjxsq_keyTable th{text-align:right;color:var(--dsw-alias-label-tertiary,#67676f);font-weight:500;font-size:calc(var(--dsh-content-font-size,12px) * .96);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);white-space:nowrap;padding:6px 10px}.tXjxsq_keyTable th:first-child{text-align:left;padding-left:0}.tXjxsq_keyTable td{text-align:right;font-size:calc(var(--dsh-content-font-size,12px) * 1.15);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9a9aa6);border-bottom:1px solid var(--dsw-alias-fill-l1,#80808c1f);white-space:nowrap;padding:10px}.tXjxsq_keyTable td:first-child{text-align:left;padding-left:0}.tXjxsq_keyTable tr:last-child td{border-bottom:0}.tXjxsq_keyTable tbody tr.tXjxsq_clickable{cursor:pointer}.tXjxsq_keyTable tbody tr.tXjxsq_clickable:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c12)}.tXjxsq_keyTable tr.tXjxsq_disabledRow{opacity:.55}.tXjxsq_cellKey{align-items:center;gap:10px;display:flex}.tXjxsq_keyDisplay{font-size:calc(var(--dsh-content-font-size,12px) * 1.19);color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600}.tXjxsq_keyEnv{font-family:ui-monospace,Consolas,monospace;font-size:calc(var(--dsh-content-font-size,12px) * .92);color:var(--dsw-alias-label-tertiary,#67676f);margin-top:1px}.tXjxsq_tag{font-size:calc(var(--dsh-content-font-size,12px) * .96);border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);background:var(--dsw-alias-bg-layer-2,#1d1d22);border-radius:5px;padding:1px 7px;display:inline-block}.tXjxsq_tag.tXjxsq_free{color:var(--dsw-alias-state-success-primary,#3fb96f);border-color:#3fb96f59}.tXjxsq_tag.tXjxsq_sub{color:var(--dsw-alias-state-business-primary,#5b8cff);border-color:#5b8cff59}.tXjxsq_tag.tXjxsq_off{color:var(--dsw-alias-label-tertiary,#67676f)}.tXjxsq_rowLink{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * 1.01)}.tXjxsq_keyTable tbody tr.tXjxsq_clickable:hover .tXjxsq_rowLink{color:var(--dsw-alias-state-business-primary,#5b8cff)}.tXjxsq_quotaCell{align-items:center;gap:8px;display:inline-flex}.tXjxsq_miniBar{background:var(--dsw-alias-fill-l2,#80808c2e);border-radius:3px;flex-shrink:0;width:64px;height:5px;overflow:hidden}.tXjxsq_miniBar>i{border-radius:3px;height:100%;display:block}.tXjxsq_quotaText{text-align:left;min-width:74px}.tXjxsq_quotaText.tXjxsq_warn{color:var(--dsw-alias-state-warning-primary,#e0a13c);font-weight:600}.tXjxsq_quotaText.tXjxsq_danger{color:var(--dsw-alias-state-danger-primary,#e05a5a);font-weight:600}.tXjxsq_quotaText.tXjxsq_dim{color:var(--dsw-alias-label-tertiary,#67676f)}.tXjxsq_heatmapCard{background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:12px;margin-top:24px;padding:14px 16px}.tXjxsq_heatmapHead{flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:6px;margin-bottom:10px;display:flex}.tXjxsq_heatmapTitle{color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:calc(var(--dsh-content-font-size,12px) * 1.05)}.tXjxsq_heatmapScroll{padding-bottom:4px;overflow-x:auto}.tXjxsq_heatmapBody{gap:6px;width:max-content;display:flex}.tXjxsq_heatWeekdays{z-index:2;background:var(--dsw-alias-bg-layer-2,#1d1d22);flex-direction:column;flex-shrink:0;gap:3px;padding-right:4px;display:flex;position:sticky;left:0}.tXjxsq_heatWeekdays span{font-size:calc(var(--dsh-content-font-size,12px) * .87);color:var(--dsw-alias-label-tertiary,#67676f);text-align:right;width:13px;height:28px;line-height:28px}.tXjxsq_heatGridCol{flex-direction:column;display:flex}.tXjxsq_heatGrid{gap:3px;display:flex}.tXjxsq_heatWeek{flex-direction:column;gap:3px;display:flex}.tXjxsq_heatCell{box-sizing:border-box;background:var(--dsw-alias-fill-l1,#80808c2e);cursor:default;border-radius:5px;flex-shrink:0;width:28px;height:28px}.tXjxsq_heatCell.tXjxsq_idle{background:#80808c38}.tXjxsq_heatCell.tXjxsq_empty{background:#80808c1a;box-shadow:inset 0 0 0 1px #80808c47}.tXjxsq_heatMonths{gap:3px;margin-top:6px;display:flex}.tXjxsq_heatMonths span{width:28px;font-size:calc(var(--dsh-content-font-size,12px) * .92);color:var(--dsw-alias-label-tertiary,#67676f);text-align:left;white-space:nowrap;flex-shrink:0}";
		const tagId$6 = "dsh-key-usage/overview.module.css";
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
		var overview_module_css_default = {
			"cellKey": "tXjxsq_cellKey",
			"clickable": "tXjxsq_clickable",
			"danger": "tXjxsq_danger",
			"dim": "tXjxsq_dim",
			"disabledRow": "tXjxsq_disabledRow",
			"empty": "tXjxsq_empty",
			"free": "tXjxsq_free",
			"heatCell": "tXjxsq_heatCell",
			"heatGrid": "tXjxsq_heatGrid",
			"heatGridCol": "tXjxsq_heatGridCol",
			"heatMonths": "tXjxsq_heatMonths",
			"heatWeek": "tXjxsq_heatWeek",
			"heatWeekdays": "tXjxsq_heatWeekdays",
			"heatmapBody": "tXjxsq_heatmapBody",
			"heatmapCard": "tXjxsq_heatmapCard",
			"heatmapHead": "tXjxsq_heatmapHead",
			"heatmapScroll": "tXjxsq_heatmapScroll",
			"heatmapTitle": "tXjxsq_heatmapTitle",
			"idle": "tXjxsq_idle",
			"keyDisplay": "tXjxsq_keyDisplay",
			"keyEnv": "tXjxsq_keyEnv",
			"keyTable": "tXjxsq_keyTable",
			"miniBar": "tXjxsq_miniBar",
			"off": "tXjxsq_off",
			"quotaCell": "tXjxsq_quotaCell",
			"quotaText": "tXjxsq_quotaText",
			"rowLink": "tXjxsq_rowLink",
			"sub": "tXjxsq_sub",
			"tag": "tXjxsq_tag",
			"warn": "tXjxsq_warn"
		};
		//#endregion
		//#region src/client/components/Heatmap.tsx
		/**
		* 活跃热力图：约 9 个月的滚动窗口，强度按活跃日五分位分档（阈值随可见区间变化）。
		* 格子固定方形 + 横向滚动，保证三类格子（有数据 / 无数据 / 无用量）等大。
		*/
		const DAY_MS$1 = 864e5;
		function levelThresholds(days) {
			const active = days.map((day) => day.totalTokens).filter((tokens) => tokens > 0).sort((first, second) => first - second);
			if (active.length < 5) return [
				1e7,
				3e7,
				6e7,
				15e7
			];
			const pick = (fraction) => active[Math.min(active.length - 1, Math.floor(active.length * fraction))];
			return [
				pick(.2),
				pick(.4),
				pick(.6),
				pick(.8)
			];
		}
		function levelOf(tokens, thresholds) {
			if (tokens <= 0) return 0;
			let level = 1;
			for (const threshold of thresholds) if (tokens >= threshold) level += 1;
			return level;
		}
		/** 五档由浅到深（首档为「无用量」的灰）。 */
		const LEVEL_COLORS = [
			"var(--dsw-alias-fill-l2, rgba(128,128,140,.22))",
			"color-mix(in srgb, var(--dsw-alias-state-business-primary, #5b8cff) 18%, transparent)",
			"color-mix(in srgb, var(--dsw-alias-state-business-primary, #5b8cff) 36%, transparent)",
			"color-mix(in srgb, var(--dsw-alias-state-business-primary, #5b8cff) 56%, transparent)",
			"color-mix(in srgb, var(--dsw-alias-state-business-primary, #5b8cff) 76%, transparent)",
			"var(--dsw-alias-state-business-primary, #5b8cff)"
		];
		function Heatmap(props) {
			/** 取词：宿主切语言时重渲染 */
			const t = useT();
			const { days, channels, tooltip } = props;
			const heatmapByDate = (0, react.useMemo)(() => new Map(days.map((day) => [day.date, day])), [days]);
			const thresholds = (0, react.useMemo)(() => levelThresholds(days), [days]);
			const { columns, monthLabels } = (0, react.useMemo)(() => {
				const today = /* @__PURE__ */ new Date();
				today.setHours(0, 0, 0, 0);
				const endSaturday = new Date(today.getTime() + (6 - today.getDay()) * DAY_MS$1);
				const start = /* @__PURE__ */ new Date(endSaturday.getTime() - 272 * DAY_MS$1);
				const dataStart = days.length > 0 ? days[0].date : null;
				const cells = [];
				for (let offset = 0; offset < 273; offset += 1) {
					const date = new Date(start.getTime() + offset * DAY_MS$1);
					const dateKey = isoDate(date);
					if (date.getTime() > today.getTime()) {
						cells.push({
							date: dateKey,
							state: "future",
							level: 0
						});
						continue;
					}
					if (dataStart === null || dateKey < dataStart) {
						cells.push({
							date: dateKey,
							state: "empty",
							level: 0
						});
						continue;
					}
					const day = heatmapByDate.get(dateKey);
					if (day === void 0 || day.totalTokens <= 0) {
						cells.push({
							date: dateKey,
							state: "idle",
							level: 0
						});
						continue;
					}
					cells.push({
						date: dateKey,
						state: "active",
						level: levelOf(day.totalTokens, thresholds)
					});
				}
				const weeks = [];
				for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
				const labels = [];
				let previousMonth = -1;
				for (const week of weeks) {
					const month = Number(week[0].date.slice(5, 7));
					labels.push(month !== previousMonth ? month + t("h.month") : "");
					previousMonth = month;
				}
				return {
					columns: weeks,
					monthLabels: labels
				};
			}, [days, heatmapByDate]);
			const activeDays = columns.reduce((count, week) => count + week.filter((cell) => cell.state === "active").length, 0);
			const scrollRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const node = scrollRef.current;
				if (node === null) return;
				node.scrollLeft = node.scrollWidth - node.clientWidth;
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: overview_module_css_default.heatmapCard,
				role: "img",
				"aria-label": t("h.summaryPrefix") + String(activeDays) + t("h.summarySuffix") + "",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: overview_module_css_default.heatmapHead,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: overview_module_css_default.heatmapTitle,
						children: t("h.summary")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: shared_module_css_default.legend,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: overview_module_css_default.ghost }), t("h.noData")] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: LEVEL_COLORS[0] } }), t("h.noUsage")] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: LEVEL_COLORS[1] } }), t("h.level1")] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: LEVEL_COLORS[2] } }), t("h.level2")] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: LEVEL_COLORS[3] } }), t("h.level3")] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: LEVEL_COLORS[4] } }), t("h.level4")] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: LEVEL_COLORS[5] } }), t("h.level5")] })
						]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: overview_module_css_default.heatmapScroll,
					ref: scrollRef,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: overview_module_css_default.heatmapBody,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: overview_module_css_default.heatWeekdays,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("h.wd0") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("h.wd1") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("h.wd2") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("h.wd3") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("h.wd4") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("h.wd5") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("h.wd6") })
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: overview_module_css_default.heatGridCol,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: overview_module_css_default.heatGrid,
								children: columns.map((week, weekIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: overview_module_css_default.heatWeek,
									children: week.map((cell) => {
										const day = cell.state === "active" ? heatmapByDate.get(cell.date) : void 0;
										const className = cell.state === "active" ? overview_module_css_default.heatCell : cell.state === "idle" ? overview_module_css_default.heatCell + " " + overview_module_css_default.idle : overview_module_css_default.heatCell + " " + overview_module_css_default.empty;
										return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className,
											style: cell.state === "active" ? { background: LEVEL_COLORS[cell.level] } : void 0,
											onMouseMove: (event) => tooltip.show(event, tipOf(cell, day, channels)),
											onMouseLeave: tooltip.hide
										}, cell.date);
									})
								}, weekIndex))
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: overview_module_css_default.heatMonths,
								children: monthLabels.map((label, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: label }, index))
							})]
						})]
					})
				})]
			});
		}
		function tipOf(cell, day, channels) {
			if (cell.state !== "active" || day === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: cell.date }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipSub, { children: cell.state === "idle" ? t("h.noUsage") : t("h.noLedger") })] });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: cell.date }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(TipSub, { children: [
					t("dd.sum"),
					" ",
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: fmtTokens(day.totalTokens) }),
					" tokens"
				] }),
				day.models.map((model) => {
					const percent = day.totalTokens > 0 ? Math.round(model.totalTokens / day.totalTokens * 100) : 0;
					const color = channelColorOf(channels, model.provider);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
						color,
						label: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [model.model, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: shared_module_css_default.dim,
							children: [" · ", displayNameOf(channels, model.provider)]
						})] }),
						amount: fmtTokens(model.totalTokens),
						rate: percent + "%"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipBar, {
						percent,
						color
					})] }, model.provider + "|" + model.model);
				})
			] });
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/pricing.module.css.mjs
		const css$5 = ".aymcxa_sourceChip{font-size:calc(var(--dsh-content-font-size,12px) * .92);vertical-align:baseline;white-space:nowrap;border:1px solid;border-radius:999px;margin-left:5px;padding:0 6px;line-height:1.7;display:inline-block}.aymcxa_sourceOfficial{color:var(--dsw-alias-label-tertiary,#67676f)}.aymcxa_sourceCatalog{color:var(--dsw-alias-label-secondary,#9a9aa2)}.aymcxa_sourceAggregate{color:var(--dsw-alias-label-tertiary,#67676f);border-style:dashed}.aymcxa_sourcePartial{color:var(--dsw-alias-label-secondary,#9a9aa2);border-bottom:1px dotted}.aymcxa_sourceEstimate{color:var(--dsw-alias-state-warning-primary,#e0a13c)}.aymcxa_linkBtn{color:var(--dsw-alias-label-tertiary,#67676f);font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.01);cursor:pointer;background:0 0;border:0;padding:0 6px}.aymcxa_linkBtn:hover{color:var(--dsw-alias-state-business-primary,#5b8cff)}.aymcxa_linkBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.aymcxa_linkBtn:disabled{opacity:.5;cursor:default}.aymcxa_catalogNote{font-size:calc(var(--dsh-content-font-size,12px) * 1.05);color:var(--dsw-alias-label-secondary,#9a9aa2);background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:8px;margin:8px 0;padding:8px 12px;line-height:1.7}.aymcxa_catalogStale{color:var(--dsw-alias-state-warning-primary,#e0a13c);border-color:var(--dsw-alias-state-warning-primary,#e0a13c)}.aymcxa_fileLine{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .96);flex-wrap:wrap;gap:4px 18px;margin:6px 0;display:flex}.aymcxa_pathText{font-family:ui-monospace,Consolas,monospace;font-size:calc(var(--dsh-content-font-size,12px) * .96);word-break:break-all}.aymcxa_issueBlock{font-size:calc(var(--dsh-content-font-size,12px) * 1.05);color:var(--dsw-alias-state-warning-primary,#e0a13c);background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-state-warning-primary,#e0a13c);border-radius:8px;margin:8px 0;padding:8px 12px;line-height:1.7}.aymcxa_issueHead{flex-wrap:wrap;align-items:baseline;gap:8px;display:flex}.aymcxa_issueNote{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * 1.01)}.aymcxa_issueList{margin:6px 0 0;padding-left:18px}.aymcxa_issueWhere{color:var(--dsw-alias-label-secondary,#9a9aa6);margin-right:6px}.aymcxa_aggregateBlock{font-size:calc(var(--dsh-content-font-size,12px) * 1.05);color:var(--dsw-alias-label-secondary,#9a9aa2);background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:8px;margin:8px 0;padding:8px 12px;line-height:1.75}.aymcxa_aggregateHead{flex-wrap:wrap;align-items:center;gap:6px 12px;display:flex}.aymcxa_aggregateTitle{flex:auto;min-width:0}.aymcxa_aggregateMeta{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .96);margin-top:3px}.aymcxa_aggregateMeta b{color:var(--dsw-alias-label-secondary,#9a9aa2);font-weight:600}.aymcxa_aggregateStatus{font-size:calc(var(--dsh-content-font-size,12px) * 1.01);margin-top:4px}.aymcxa_aggregateStatusOk{color:var(--dsw-alias-state-success-primary,#3fb96f)}.aymcxa_aggregateStatusBad{color:var(--dsw-alias-state-danger-primary,#e05a5a)}.aymcxa_explanation{background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:10px;margin-top:8px;padding:10px 14px}.aymcxa_explanationTitle{color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:calc(var(--dsh-content-font-size,12px) * 1.05);margin-bottom:4px;font-weight:600}.aymcxa_explanationList{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * 1.05);margin:0;padding-left:18px;line-height:1.75}.aymcxa_explanationList b{color:var(--dsw-alias-label-secondary,#9a9aa6);font-weight:500}.aymcxa_explanationList code{font-family:ui-monospace,Consolas,monospace;font-size:calc(var(--dsh-content-font-size,12px) * 1.01)}";
		const tagId$5 = "dsh-key-usage/pricing.module.css";
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
		var pricing_module_css_default = {
			"aggregateBlock": "aymcxa_aggregateBlock",
			"aggregateHead": "aymcxa_aggregateHead",
			"aggregateMeta": "aymcxa_aggregateMeta",
			"aggregateStatus": "aymcxa_aggregateStatus",
			"aggregateStatusBad": "aymcxa_aggregateStatusBad",
			"aggregateStatusOk": "aymcxa_aggregateStatusOk",
			"aggregateTitle": "aymcxa_aggregateTitle",
			"catalogNote": "aymcxa_catalogNote",
			"catalogStale": "aymcxa_catalogStale",
			"explanation": "aymcxa_explanation",
			"explanationList": "aymcxa_explanationList",
			"explanationTitle": "aymcxa_explanationTitle",
			"fileLine": "aymcxa_fileLine",
			"issueBlock": "aymcxa_issueBlock",
			"issueHead": "aymcxa_issueHead",
			"issueList": "aymcxa_issueList",
			"issueNote": "aymcxa_issueNote",
			"issueWhere": "aymcxa_issueWhere",
			"linkBtn": "aymcxa_linkBtn",
			"pathText": "aymcxa_pathText",
			"sourceAggregate": "aymcxa_sourceAggregate",
			"sourceCatalog": "aymcxa_sourceCatalog",
			"sourceChip": "aymcxa_sourceChip",
			"sourceEstimate": "aymcxa_sourceEstimate",
			"sourceOfficial": "aymcxa_sourceOfficial",
			"sourcePartial": "aymcxa_sourcePartial"
		};
		//#endregion
		//#region src/client/components/CostSourceChip.tsx
		function CostSourceChip(props) {
			const source = props.source ?? "none";
			if (source === "none") return null;
			const partial = props.partial === true;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: pricing_module_css_default.sourceChip + " " + sourceClass(source),
				title: costSourceHintOf(source, partial),
				children: [t(COST_SOURCE_LABELS[source] ?? source), partial && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: pricing_module_css_default.sourcePartial,
					children: t("part.suffix")
				})]
			});
		}
		function sourceClass(source) {
			if (source === "official") return pricing_module_css_default.sourceOfficial;
			if (source === "catalog") return pricing_module_css_default.sourceCatalog;
			if (source === "aggregate") return pricing_module_css_default.sourceAggregate;
			return pricing_module_css_default.sourceEstimate;
		}
		//#endregion
		//#region src/client/tabs/OverviewTab.tsx
		function OverviewTab(props) {
			/** 取词：宿主切语言时重渲染 */
			const t = useT();
			const { channels, summary } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: ui_module_css_default.tableScroll,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						className: overview_module_css_default.keyTable,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("common.channel") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("o.type") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("r.today") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("s.days30") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("o.balanceWindow") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("o.cost30") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {})
						] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tbody", { children: [channels.map((channel) => {
							const row = summary?.channels.find((item) => item.provider === channel.provider) ?? null;
							const todayTokens = row === null ? 0 : row.today.tokens;
							const monthTokens = row === null ? 0 : row.month.tokens;
							const costCell = costCellOf(channel, row?.month ?? {});
							const disabled = channel.status === "off";
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
								className: disabled ? overview_module_css_default.disabledRow : overview_module_css_default.clickable,
								onClick: disabled ? void 0 : () => props.onOpenDetail(channel.provider),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: overview_module_css_default.cellKey,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: shared_module_css_default.statusDot,
											style: { background: statusColorOf(channel.status) }
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: overview_module_css_default.keyDisplay,
											children: channel.displayName
										})]
									}) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: tagClassOf(channel),
										children: channel.status === "off" ? t("err.noApiKey") : channel.costLabel
									}) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: todayTokens > 0 ? fmtTokens(todayTokens) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: shared_module_css_default.dim,
										children: "—"
									}) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: monthTokens > 0 ? fmtTokens(monthTokens) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: shared_module_css_default.dim,
										children: "—"
									}) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: quotaCellOf(channel) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: costCell.dim ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: shared_module_css_default.dim,
										children: costCell.text
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [costCell.text, costCell.amount && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostSourceChip, {
										source: row?.month.costSource,
										partial: row?.month.partial
									})] }) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: disabled ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: overview_module_css_default.rowLink,
										children: t("o.detailArrow")
									}) })
								]
							}, channel.provider);
						}), channels.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							colSpan: 7,
							className: shared_module_css_default.empty,
							children: t("o.noChannels")
						}) })] })]
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Heatmap, {
					days: props.heatmap,
					channels,
					tooltip: props.tooltip
				}),
				summary === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.empty,
					children: t("o.ledgerHint")
				}),
				props.quotas.length === 0 && channels.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.empty,
					children: t("o.snapshotHint")
				})
			] });
		}
		function tagClassOf(channel) {
			const base = overview_module_css_default.tag;
			if (channel.status === "off") return base + " " + overview_module_css_default.off;
			if (channel.costMode === "free") return base + " " + overview_module_css_default.free;
			if (channel.costMode === "sub") return base + " " + overview_module_css_default.sub;
			return base;
		}
		function quotaCellOf(channel) {
			if (channel.costMode === "sub" && channel.quotaPercent !== null) {
				const percent = channel.quotaPercent;
				const levelClass = percent >= 90 ? overview_module_css_default.danger : percent >= 60 ? overview_module_css_default.warn : "";
				const windowLabel = channel.quotaWindowLabel ?? channel.quotaWindowKey ?? "";
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: overview_module_css_default.quotaCell,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: overview_module_css_default.miniBar,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: {
							width: Math.max(2, percent) + "%",
							background: percent >= 60 ? "var(--dsw-alias-state-warning-primary, #e0a13c)" : "var(--dsw-alias-state-success-primary, #3fb96f)"
						} })
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: [overview_module_css_default.quotaText, levelClass].join(" ").trim(),
						children: [
							windowLabel,
							" ",
							percent,
							"%"
						]
					})]
				});
			}
			if (channel.balanceText !== null) {
				const levelClass = channel.status === "danger" ? overview_module_css_default.danger : channel.status === "warn" ? overview_module_css_default.warn : "";
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: overview_module_css_default.quotaCell,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: [overview_module_css_default.quotaText, levelClass].join(" ").trim(),
						children: channel.balanceText
					})
				});
			}
			const fallback = channel.costMode === "none" ? t("o.noBilling") : channel.costMode === "free" ? "—" : t("o.notQueried");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: [overview_module_css_default.quotaText, overview_module_css_default.dim].join(" "),
				children: fallback
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
			const objectUrl = URL.createObjectURL(new Blob([text], { type: mime }));
			const anchor = document.createElement("a");
			anchor.href = objectUrl;
			anchor.download = name;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
		}
		/** 逗号、引号、换行都必须包引号并把内部引号翻倍，否则标题里的逗号会撑破列。 */
		function csvCell(value) {
			if (value === null) return "";
			const text = String(value);
			return /[",\r\n]/.test(text) ? "\"" + text.replace(/"/g, "\"\"") + "\"" : text;
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/detail.module.css.mjs
		const css$4 = "._91PKKq_rangeBar{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;display:flex}._91PKKq_rangeLeft{flex-wrap:wrap;align-items:center;gap:10px;display:flex}._91PKKq_rangeTabs{border:1px solid var(--dsw-alias-border-l2,#2c2c34);border-radius:9px;gap:2px;padding:2px;display:inline-flex}._91PKKq_rangeTabs button{color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.1);cursor:pointer;background:0 0;border:0;border-radius:7px;padding:4px 13px}._91PKKq_rangeTabs button._91PKKq_active{background:var(--dsw-alias-interactive-bg-active,#5b8cff24);color:var(--dsw-alias-state-business-primary,#5b8cff);font-weight:600}._91PKKq_dateRange{border:1px solid var(--dsw-alias-border-l2,#2c2c34);background:var(--dsw-alias-bg-layer-2,#80808c0f);border-radius:9px;align-items:center;gap:4px;padding:2px 8px;display:inline-flex}._91PKKq_dateField{align-items:center;gap:5px;display:inline-flex}._91PKKq_dateLabel{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * 1.01)}._91PKKq_rangeInput{color:var(--dsw-alias-label-primary,#e8e8ec);font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.1);--lightningcss-light:initial;--lightningcss-dark: ;color-scheme:light dark;font-variant-numeric:tabular-nums;cursor:text;background:0 0;border:0;padding:4px 2px}@media (prefers-color-scheme:dark){._91PKKq_rangeInput{--lightningcss-light: ;--lightningcss-dark:initial}}._91PKKq_rangeInput::-webkit-calendar-picker-indicator{cursor:pointer;opacity:.55}._91PKKq_rangeInput::-webkit-calendar-picker-indicator:hover{opacity:1}._91PKKq_rangeInput:hover{color:var(--dsw-alias-state-business-primary,#5b8cff)}._91PKKq_rangeTabs button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px;border-radius:6px}._91PKKq_rangeInput:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px;border-radius:6px}._91PKKq_rangeCaption{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * 1.05);margin-left:auto}._91PKKq_rowToggle{font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.1);color:inherit;cursor:pointer;font-variant-numeric:tabular-nums;background:0 0;border:0;align-items:center;gap:6px;padding:0;display:inline-flex}._91PKKq_rowToggle:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}._91PKKq_shareBar{border-radius:6px;gap:2px;height:12px;margin:8px 0 2px;display:flex;overflow:hidden}._91PKKq_shareBar>i{cursor:default;height:100%;display:block}._91PKKq_shareBar>i:hover{filter:brightness(1.15)}._91PKKq_chartTitle{flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:10px;display:flex}._91PKKq_chartAxisWrap{gap:6px;display:flex}._91PKKq_chartPane{flex:1;min-width:0}._91PKKq_yAxis{text-align:right;min-width:40px;height:110px;font-size:calc(var(--dsh-content-font-size,12px) * .87);color:var(--dsw-alias-label-tertiary,#67676f);font-variant-numeric:tabular-nums;flex-direction:column;justify-content:space-between;margin-top:8px;display:flex}._91PKKq_bars{align-items:flex-end;gap:3px;height:110px;margin-top:8px;display:flex}._91PKKq_barsDense{gap:2px}._91PKKq_barColumn{cursor:default;flex-direction:column;flex:1;justify-content:flex-end;gap:1px;height:100%;display:flex}._91PKKq_barColumn:hover{filter:brightness(1.2)}._91PKKq_segCache{background:var(--dsw-alias-state-business-tertiary,#5b8cff47);border-radius:2px 2px 0 0}._91PKKq_segIn{background:var(--dsw-alias-state-business-primary,#5b8cff)}._91PKKq_segOut{background:var(--dsw-alias-state-business-primary,#9a7bff);border-radius:0 0 2px 2px}._91PKKq_barLabels{margin-top:6px;display:flex}._91PKKq_barLabels span{text-align:center;font-size:calc(var(--dsh-content-font-size,12px) * .87);color:var(--dsw-alias-label-tertiary,#67676f);white-space:nowrap;flex:1}._91PKKq_subRowCell{background:var(--dsw-alias-fill-l1,#80808c0d);text-align:left!important;padding:2px 10px 10px 30px!important}._91PKKq_subHead,._91PKKq_subRow{grid-template-columns:minmax(150px,1.5fr) minmax(70px,1fr) minmax(70px,1fr) minmax(70px,1fr) minmax(80px,1.1fr) minmax(70px,1fr);align-items:center;gap:8px;display:grid}._91PKKq_subHead{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .92);border-bottom:1px solid var(--dsw-alias-fill-l2,#80808c33);padding:4px 0}._91PKKq_subRow{border-bottom:1px dashed var(--dsw-alias-fill-l1,#80808c24);font-size:calc(var(--dsh-content-font-size,12px) * 1.05);padding:5px 0}._91PKKq_subRow:last-child{border-bottom:0}._91PKKq_subName{flex-direction:column;gap:1px;min-width:0;display:flex}._91PKKq_subModel{font-family:ui-monospace,Consolas,monospace;font-size:calc(var(--dsh-content-font-size,12px) * 1.01);color:var(--dsw-alias-label-primary,#e8e8ec);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}._91PKKq_subChannel{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .92);text-overflow:ellipsis;white-space:nowrap;font-family:inherit;overflow:hidden}._91PKKq_subNumber{text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9a9aa6)}._91PKKq_toggleArrow{width:13px;color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .83);display:inline-block}._91PKKq_shareLegend{grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:4px 16px;margin:8px 0 0;padding:0;list-style:none;display:grid}._91PKKq_shareLegend li{font-size:calc(var(--dsh-content-font-size,12px) * .95);grid-template-columns:8px 1fr auto auto;align-items:center;gap:8px;display:grid}._91PKKq_shareDot{border-radius:2px;width:8px;height:8px}._91PKKq_shareName{color:var(--dsw-alias-label-secondary,#9a9aa6);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}._91PKKq_sharePercent{color:var(--dsw-alias-label-primary,#e8e8ec);font-variant-numeric:tabular-nums}._91PKKq_shareTokens{color:var(--dsw-alias-label-tertiary,#67676f);font-variant-numeric:tabular-nums}";
		const tagId$4 = "dsh-key-usage/detail.module.css";
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
		var detail_module_css_default = {
			"active": "_91PKKq_active",
			"barColumn": "_91PKKq_barColumn",
			"barLabels": "_91PKKq_barLabels",
			"bars": "_91PKKq_bars",
			"barsDense": "_91PKKq_barsDense",
			"chartAxisWrap": "_91PKKq_chartAxisWrap",
			"chartPane": "_91PKKq_chartPane",
			"chartTitle": "_91PKKq_chartTitle",
			"dateField": "_91PKKq_dateField",
			"dateLabel": "_91PKKq_dateLabel",
			"dateRange": "_91PKKq_dateRange",
			"rangeBar": "_91PKKq_rangeBar",
			"rangeCaption": "_91PKKq_rangeCaption",
			"rangeInput": "_91PKKq_rangeInput",
			"rangeLeft": "_91PKKq_rangeLeft",
			"rangeTabs": "_91PKKq_rangeTabs",
			"rowToggle": "_91PKKq_rowToggle",
			"segCache": "_91PKKq_segCache",
			"segIn": "_91PKKq_segIn",
			"segOut": "_91PKKq_segOut",
			"shareBar": "_91PKKq_shareBar",
			"shareDot": "_91PKKq_shareDot",
			"shareLegend": "_91PKKq_shareLegend",
			"shareName": "_91PKKq_shareName",
			"sharePercent": "_91PKKq_sharePercent",
			"shareTokens": "_91PKKq_shareTokens",
			"subChannel": "_91PKKq_subChannel",
			"subHead": "_91PKKq_subHead",
			"subModel": "_91PKKq_subModel",
			"subName": "_91PKKq_subName",
			"subNumber": "_91PKKq_subNumber",
			"subRow": "_91PKKq_subRow",
			"subRowCell": "_91PKKq_subRowCell",
			"toggleArrow": "_91PKKq_toggleArrow",
			"yAxis": "_91PKKq_yAxis"
		};
		//#endregion
		//#region src/client/components/ShareBar.tsx
		function ShareBar(props) {
			/** 取词：宿主切语言时重渲染 */
			const t = useT();
			const { usage, totalTokens, channels } = props;
			if (usage === null || totalTokens <= 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shared_module_css_default.card,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.statLabel,
					children: t("sh.shareByTokens")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.empty,
					style: { padding: "8px 0" },
					children: t("empty.noUsage")
				})]
			});
			let rows = [];
			let title = t("sh.channels");
			if (props.channelFilter === "ALL") {
				const byProvider = /* @__PURE__ */ new Map();
				for (const day of usage.days) for (const model of day.models) byProvider.set(model.provider, (byProvider.get(model.provider) ?? 0) + model.inputTokens + model.outputTokens + model.cacheReadTokens);
				rows = [...byProvider.entries()].map(([provider, tokens]) => ({
					key: provider,
					label: displayNameOf(channels, provider),
					tokens,
					color: channelColorOf(channels, provider)
				}));
			} else {
				title = t("sh.models");
				const byModel = /* @__PURE__ */ new Map();
				for (const day of usage.days) for (const model of day.models) {
					const bucket = byModel.get(model.model);
					const tokens = model.inputTokens + model.outputTokens + model.cacheReadTokens;
					if (bucket === void 0) byModel.set(model.model, {
						tokens,
						provider: model.provider
					});
					else bucket.tokens += tokens;
				}
				rows = [...byModel.entries()].map(([model, value]) => ({
					key: model,
					label: model,
					tokens: value.tokens,
					color: channelColorOf(channels, value.provider)
				}));
			}
			rows.sort((first, second) => second.tokens - first.tokens);
			rows = rows.filter((row) => row.tokens > 0);
			const shareSummary = rows.length === 0 ? title + t("sh.noData") : title + "：" + rows.slice(0, 3).map((row) => row.label + " " + String(totalTokens > 0 ? Math.round(row.tokens / totalTokens * 100) : 0) + "%").join("、") + (rows.length > 3 ? t("sh.morePrefix") + String(rows.length) + t("sh.moreSuffix") : "");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shared_module_css_default.card,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.statLabel,
					children: title
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: detail_module_css_default.shareBar,
					role: "img",
					"aria-label": shareSummary,
					onMouseMove: (event) => props.tooltip.show(event, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: title }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipSub, { children: t("sh.shareAll") }),
						rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
							color: row.color,
							label: row.label,
							amount: fmtTokens(row.tokens),
							rate: (totalTokens > 0 ? Math.round(row.tokens / totalTokens * 100) : 0) + "%"
						}, row.key))
					] })),
					onMouseLeave: props.tooltip.hide,
					children: rows.map((row) => {
						totalTokens > 0 && Math.round(row.tokens / totalTokens * 100);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: {
							width: row.tokens / totalTokens * 100 + "%",
							background: row.color
						} }, row.key);
					})
				})]
			});
		}
		//#endregion
		//#region src/client/components/StatCard.tsx
		function StatCard(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shared_module_css_default.card,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shared_module_css_default.statLabel,
						children: props.label
					}),
					props.above !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shared_module_css_default.statAbove,
						children: props.above
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: shared_module_css_default.statValueRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: shared_module_css_default.statValue,
							children: props.value
						}), props.badge !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: shared_module_css_default.statBadge,
							children: props.badge
						})]
					}),
					props.extra !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shared_module_css_default.statExtra,
						children: props.extra
					})
				]
			});
		}
		//#endregion
		//#region src/client/components/TokenBars.tsx
		function TokenBars(props) {
			const { rows, tooltip } = props;
			if (props.hidden === true || rows.length === 0) return null;
			const peak = Math.max(1, ...rows.map((row) => row.cacheReadTokens + row.inputTokens + row.outputTokens));
			const heightOf = (value) => (peak > 0 ? Math.max(1, Math.round(value / peak * 100)) : 1) + "%";
			const labelEvery = Math.max(1, Math.ceil(rows.length / 14));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: detail_module_css_default.chartAxisWrap,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: detail_module_css_default.yAxis,
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: fmtTokens(peak) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: fmtTokens(Math.round(peak / 2)) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "0" })
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: detail_module_css_default.chartPane,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: rows.length > 20 ? detail_module_css_default.bars + " " + detail_module_css_default.barsDense : detail_module_css_default.bars,
						role: "img",
						"aria-label": props.ariaLabel,
						children: rows.map((row) => {
							const rowTotal = row.cacheReadTokens + row.inputTokens + row.outputTokens;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: detail_module_css_default.barColumn,
								onMouseMove: (event) => tooltip.show(event, row.tip),
								onMouseLeave: tooltip.hide,
								children: rowTotal > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.segCache,
										style: { height: heightOf(row.cacheReadTokens) }
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.segIn,
										style: { height: heightOf(row.inputTokens) }
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.segOut,
										style: { height: heightOf(row.outputTokens) }
									})
								] })
							}, row.key);
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: detail_module_css_default.barLabels,
						children: rows.map((row, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: index % labelEvery === 0 || index === rows.length - 1 ? row.axisLabel : "" }, row.key))
					})]
				})]
			});
		}
		//#endregion
		//#region src/client/core/useTrend.tsx
		/**
		* 统计卡的上期对比：每张卡右上角给涨跌角标、数值上方给上期值（缩小淡化）。
		*
		* 复用 /usage 按上一段等长范围再请求一次（纯客户端，无新端点）；「累计」范围没有上一段，整组返回 null。
		* 涨跌只用中性色 + 箭头（成本上升沿用提示色），不引入对错语义。
		*/
		const DAY_MS = 864e5;
		/** 小于这个幅度算持平（百分比 / 百分点通用）。 */
		const FLAT_EPSILON = .05;
		/** 闭区间天数，至少 1。 */
		function spanDaysOf(from, to) {
			return Math.max(1, Math.round(((/* @__PURE__ */ new Date(to + "T00:00:00")).getTime() - (/* @__PURE__ */ new Date(from + "T00:00:00")).getTime()) / DAY_MS) + 1);
		}
		/** 上一段等长范围（10-07~10-13 → 09-30~10-06）。 */
		function previousWindowOf(from, to) {
			const startTime = (/* @__PURE__ */ new Date(from + "T00:00:00")).getTime();
			return {
				from: isoDate(/* @__PURE__ */ new Date(startTime - spanDaysOf(from, to) * DAY_MS)),
				to: isoDate(/* @__PURE__ */ new Date(startTime - DAY_MS))
			};
		}
		function metricsOf(usage) {
			if (usage === null) return null;
			let calls = 0;
			let input = 0;
			let output = 0;
			let cacheRead = 0;
			let activeDays = 0;
			const channels = /* @__PURE__ */ new Set();
			for (const day of usage.days) {
				const dayTokens = day.inputTokens + day.outputTokens + day.cacheReadTokens;
				calls += day.calls;
				input += day.inputTokens;
				output += day.outputTokens;
				cacheRead += day.cacheReadTokens;
				if (dayTokens > 0) activeDays += 1;
				for (const model of day.models) if (model.inputTokens + model.outputTokens + model.cacheReadTokens > 0) channels.add(model.provider);
			}
			const tokens = input + output + cacheRead;
			return {
				calls,
				tokens,
				input,
				output,
				cacheRead,
				hitRate: tokens === 0 ? null : cacheRead / tokens,
				dailyAvg: activeDays === 0 ? 0 : tokens / activeDays,
				channels: channels.size,
				activeDays,
				cost: usage.totals === null ? 0 : comparableMoneyAmountOf(usage.totals)
			};
		}
		/** 百分比涨跌角标。 */
		function percentBadge(current, previous, warnOnUp) {
			if (previous === 0) return null;
			const delta = Math.round((current - previous) / previous * 1e3) / 10;
			if (Math.abs(delta) < FLAT_EPSILON) return null;
			const arrow = delta > 0 ? "↑" : "↓";
			const sign = delta > 0 ? "+" : "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: warnOnUp && delta > 0 ? shared_module_css_default.badgeWarn : void 0,
				children: [
					arrow,
					" ",
					sign,
					delta,
					"%"
				]
			});
		}
		/** 百分点变化角标（命中率这类比率指标）。 */
		function pointBadge(current, previous) {
			if (current === null || previous === null) return null;
			const delta = Math.round((current - previous) * 1e3) / 10;
			if (Math.abs(delta) < FLAT_EPSILON) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
				delta > 0 ? "↑" : "↓",
				" ",
				delta > 0 ? "+" : "",
				delta,
				"pp"
			] });
		}
		function useTrend(props) {
			const { usage, from, to, channelFilter } = props;
			const previousWindow = (0, react.useMemo)(() => previousWindowOf(from, to), [from, to]);
			const comparable = props.range !== "total";
			const [previousUsage, setPreviousUsage] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (!comparable) return;
				let cancelled = false;
				loadUsage(previousWindow.from, previousWindow.to, channelFilter).then((result) => {
					if (!cancelled) setPreviousUsage(result);
				});
				return () => {
					cancelled = true;
				};
			}, [
				comparable,
				previousWindow.from,
				previousWindow.to,
				channelFilter,
				props.pricingRevision
			]);
			return (0, react.useMemo)(() => {
				if (!comparable) return null;
				const current = metricsOf(usage);
				const previous = metricsOf(previousUsage);
				if (current === null) return null;
				const aboveOf = (node) => previous === null ? void 0 : node;
				const points = (value) => value === null ? "—" : (value * 100).toFixed(1) + "%";
				return {
					calls: {
						above: aboveOf(previous === null ? "—" : fmtCalls(previous.calls)),
						badge: previous === null ? null : percentBadge(current.calls, previous.calls, false)
					},
					tokens: {
						above: aboveOf(previous === null ? "—" : fmtTokens(previous.tokens)),
						badge: previous === null ? null : percentBadge(current.tokens, previous.tokens, false)
					},
					input: {
						above: aboveOf(previous === null ? "—" : fmtTokens(previous.input)),
						badge: previous === null ? null : percentBadge(current.input, previous.input, false)
					},
					output: {
						above: aboveOf(previous === null ? "—" : fmtTokens(previous.output)),
						badge: previous === null ? null : percentBadge(current.output, previous.output, false)
					},
					cacheRead: {
						above: aboveOf(previous === null ? "—" : fmtTokens(previous.cacheRead)),
						badge: previous === null ? null : percentBadge(current.cacheRead, previous.cacheRead, false)
					},
					hitRate: {
						above: aboveOf(points(previous === null ? null : previous.hitRate)),
						badge: pointBadge(current.hitRate, previous === null ? null : previous.hitRate)
					},
					dailyAvg: {
						above: aboveOf(previous === null ? "—" : fmtTokens(Math.round(previous.dailyAvg))),
						badge: previous === null ? null : percentBadge(current.dailyAvg, previous.dailyAvg, false)
					},
					channels: {
						above: aboveOf(previous === null ? "—" : String(previous.channels)),
						badge: previous === null ? null : percentBadge(current.channels, previous.channels, false)
					},
					activeDays: {
						above: aboveOf(previous === null ? "—" : String(previous.activeDays)),
						badge: previous === null ? null : percentBadge(current.activeDays, previous.activeDays, false)
					},
					cost: {
						above: aboveOf(previous === null ? "—" : rowMoneyViewOf({ cost: previous.cost }).text),
						badge: previous === null || current.cost === 0 ? null : percentBadge(current.cost, previous.cost, true)
					}
				};
			}, [
				comparable,
				usage,
				previousUsage
			]);
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/export.module.css.mjs
		const css$3 = ".-\\38 z9vG_exportGroup{align-items:center;gap:6px;margin-left:auto;display:inline-flex}.-\\38 z9vG_exportBtn{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.05);cursor:pointer;white-space:nowrap;background:0 0;border-radius:999px;padding:4px 11px}.-\\38 z9vG_exportBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.-\\38 z9vG_exportBtn:disabled{opacity:.5;cursor:default}.-\\38 z9vG_exportBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}";
		const tagId$3 = "dsh-key-usage/export.module.css";
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
		var export_module_css_default = {
			"exportBtn": "-8z9vG_exportBtn",
			"exportGroup": "-8z9vG_exportGroup"
		};
		//#endregion
		//#region src/client/tabs/DetailTab.tsx
		const RANGE_TABS = [
			["today", "r.today"],
			["week", "r.week"],
			["month", "r.month"],
			["total", "r.total"],
			["custom", "r.custom"]
		];
		/** 图表最多铺开的列数：超过这个跨度的范围按天全画会挤成一团。 */
		const MAX_AXIS_DAYS = 366;
		/** 导出列：命中率与成本给数值（不带单位），方便在表格里继续算。 */
		const EXPORT_COLUMNS$3 = [
			{
				key: "date",
				labelKey: "c.date",
				value: (row) => row.date
			},
			{
				key: "calls",
				labelKey: "c.calls",
				value: (row) => row.calls
			},
			{
				key: "inputTokens",
				labelKey: "c.input",
				value: (row) => row.inputTokens
			},
			{
				key: "outputTokens",
				labelKey: "c.output",
				value: (row) => row.outputTokens
			},
			{
				key: "cacheReadTokens",
				labelKey: "c.cacheRead",
				value: (row) => row.cacheReadTokens
			},
			{
				key: "cacheHitRate",
				labelKey: "c.hitRate",
				value: (row) => hitRateValueOf(row)
			},
			{
				key: "cost",
				labelKey: "c.costNative",
				value: (row) => row.cost
			}
		];
		/** 命中率数值（导出用；界面上的带 % 文本由 `hitRateOf` 生成）。 */
		function hitRateValueOf(row) {
			const total = row.inputTokens + row.outputTokens + row.cacheReadTokens;
			return total > 0 ? Math.round(row.cacheReadTokens / total * 1e3) / 10 : null;
		}
		function hitRateOf(cacheReadTokens, inputTokens, outputTokens) {
			const total = inputTokens + outputTokens + cacheReadTokens;
			return total > 0 ? (cacheReadTokens / total * 100).toFixed(1) + "%" : "—";
		}
		/** 每日成本文本：合计按逐币种小计折算后相加（缺字段时回落旧的单值口径）。 */
		function dayMoneyOf(row) {
			const view = rowMoneyViewOf(row);
			return view.amount > 0 ? view.text : "—";
		}
		function daysBetween$1(from, to) {
			const fromTime = (/* @__PURE__ */ new Date(from + "T00:00:00")).getTime();
			const toTime = (/* @__PURE__ */ new Date(to + "T00:00:00")).getTime();
			return Math.max(1, Math.round((toTime - fromTime) / 864e5) + 1);
		}
		/** 范围内每一天的日期键（无数据的日子也要出现在横轴上）。 */
		function dateKeysOfRange(from, to) {
			const start = (/* @__PURE__ */ new Date(from + "T00:00:00")).getTime();
			const total = Math.min(daysBetween$1(from, to), MAX_AXIS_DAYS);
			const keys = [];
			for (let offset = 0; offset < total; offset += 1) keys.push(isoDate(new Date(start + offset * 864e5)));
			return keys;
		}
		function DetailTab(props) {
			/** 取词：宿主切语言时重渲染 */
			const t = useT();
			const { usage, channels, bounds, tooltip, channelFilter } = props;
			if (usage === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shared_module_css_default.empty,
				children: t("d.ledgerLoading")
			});
			const safeTotals = usage.totals ?? {
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
			const hitRate = hitRateOf(safeTotals.cacheReadTokens, safeTotals.inputTokens, safeTotals.outputTokens);
			/** 缓存读在展示口径 Tokens 里的占比；分母为 0 时不给数字（避免显示 0% 误导）。 */
			/** 范围内「有用量」的天数：日均 Tokens 的分母（拿日历天数去除会把空闲日算成用量偏低）。 */
			const activeDays = usage.days.filter((day) => day.inputTokens + day.outputTokens + day.cacheReadTokens > 0).length;
			const singleChannel = channelFilter === "ALL" ? null : channelOf(channels, channelFilter);
			const costCell = costCellOf(singleChannel, safeTotals);
			const trend = useTrend({
				usage,
				from: bounds.from,
				to: bounds.to,
				range: props.range,
				channelFilter,
				channels,
				pricingRevision: props.pricingRevision
			});
			const singleDay = bounds.from === bounds.to;
			const rangeDays = Math.min(daysBetween$1(bounds.from, bounds.to), MAX_AXIS_DAYS);
			/** 导出当前范围与通道筛选后的每日明细（按日期升序，不跟随表格排序）。 */
			const exportDaily = (format) => {
				if (format === "csv") downloadFile(exportFileName("daily", "csv"), toCsv(usage.days, EXPORT_COLUMNS$3), CSV_MIME);
				else downloadFile(exportFileName("daily", "json"), toJson(usage.days), JSON_MIME);
			};
			const activeProviders = /* @__PURE__ */ new Set();
			for (const day of usage.days) for (const model of day.models) if (model.inputTokens + model.outputTokens + model.cacheReadTokens > 0) activeProviders.add(model.provider);
			const hourlyRows = [];
			if (singleDay && usage.hours !== null) usage.hours.forEach((slot, hour) => {
				const slotTokens = slot.buckets.inputTokens + slot.buckets.outputTokens + slot.buckets.cacheReadTokens;
				hourlyRows.push({
					key: String(hour),
					axisLabel: String(hour).padStart(2, "0") + ":00",
					cacheReadTokens: slot.buckets.cacheReadTokens,
					inputTokens: slot.buckets.inputTokens,
					outputTokens: slot.buckets.outputTokens,
					tip: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: bounds.from + " " + String(hour).padStart(2, "0") + ":00" }), slot.calls === 0 && slotTokens === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipSub, { children: t("h.noUsage") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(TipSub, { children: [
							t("common.calls"),
							" ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: fmtCalls(slot.calls) }),
							" · Tokens ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: fmtTokens(slotTokens) })
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
							color: "var(--dsw-alias-state-business-primary, #5b8cff)",
							label: t("c.input"),
							amount: fmtTokens(slot.buckets.inputTokens)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
							color: "var(--dsw-alias-state-business-primary, #9a7bff)",
							label: t("c.output"),
							amount: fmtTokens(slot.buckets.outputTokens)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
							color: "var(--dsw-alias-state-business-tertiary, rgba(91,140,255,.28))",
							label: t("c.cacheRead"),
							amount: fmtTokens(slot.buckets.cacheReadTokens),
							rate: hitRateOf(slot.buckets.cacheReadTokens, slot.buckets.inputTokens, slot.buckets.outputTokens)
						})
					] })] })
				});
			});
			const sessionDates = new Set(usage.sessionDates ?? []);
			const dayByDate = new Map(usage.days.map((day) => [day.date, day]));
			const dailyRows = dateKeysOfRange(bounds.from, bounds.to).map((dateKey) => {
				const day = dayByDate.get(dateKey);
				if (day === void 0) return {
					key: dateKey,
					axisLabel: fmtShortDate(dateKey),
					cacheReadTokens: 0,
					inputTokens: 0,
					outputTokens: 0,
					tip: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: dateKey }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipSub, { children: t("h.noUsage") })] })
				};
				const dayTotal = day.inputTokens + day.outputTokens + day.cacheReadTokens;
				const fromSession = sessionDates.has(day.date);
				const topModels = [...day.models].sort((first, second) => second.inputTokens + second.outputTokens + second.cacheReadTokens - (first.inputTokens + first.outputTokens + first.cacheReadTokens)).slice(0, 5);
				return {
					key: day.date,
					axisLabel: fmtShortDate(day.date),
					cacheReadTokens: day.cacheReadTokens,
					inputTokens: day.inputTokens,
					outputTokens: day.outputTokens,
					tip: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: day.date }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(TipSub, { children: [
							t("common.calls"),
							" ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: fmtCalls(day.calls) }),
							" · Tokens ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: fmtTokens(dayTotal) })
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
							color: "var(--dsw-alias-state-business-primary, #5b8cff)",
							label: t("c.input"),
							amount: fmtTokens(day.inputTokens)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
							color: "var(--dsw-alias-state-business-primary, #9a7bff)",
							label: t("c.output"),
							amount: fmtTokens(day.outputTokens)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
							color: "var(--dsw-alias-state-business-tertiary, rgba(91,140,255,.28))",
							label: t("c.cacheRead"),
							amount: fmtTokens(day.cacheReadTokens),
							rate: hitRateOf(day.cacheReadTokens, day.inputTokens, day.outputTokens)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(TipDivider, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("c.cost") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: dayMoneyOf(day) })] }),
						fromSession && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipSub, { children: t("d.sourceSession") }),
						topModels.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
							label: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [model.model, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: shared_module_css_default.dim,
								children: [" · ", displayNameOf(channels, model.provider)]
							})] }),
							amount: fmtTokens(model.inputTokens + model.outputTokens + model.cacheReadTokens)
						}, model.provider + "|" + model.model))
					] })
				};
			});
			const useHourAxis = singleDay && usage.hours !== null;
			const chartRows = useHourAxis ? hourlyRows : dailyRows;
			const chartTitle = useHourAxis ? t("d.chartHourPrefix") + bounds.from + "）" : t("d.chartDayPrefix") + rangeDays + t("d.chartDaysSuffix");
			const chartAriaLabel = useHourAxis ? t("d.chartHourAriaPrefix") + bounds.from + t("d.chartAriaMiddle") + String(chartRows.length) + t("d.chartHourAriaSuffix") : t("d.chartDayAriaPrefix") + String(chartRows.length) + t("d.chartDayAriaSuffix");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: detail_module_css_default.rangeBar,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: detail_module_css_default.rangeLeft,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: detail_module_css_default.rangeTabs,
							children: RANGE_TABS.map(([key, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: props.range === key ? detail_module_css_default.active : "",
								onClick: () => props.onRange(key),
								children: t(label)
							}, key))
						}), props.range === "custom" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: detail_module_css_default.dateRange,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: detail_module_css_default.dateField,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.dateLabel,
										children: t("r.from")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "date",
										className: detail_module_css_default.rangeInput,
										value: props.customFrom,
										onChange: (event) => props.onCustomFrom(event.target.value)
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: shared_module_css_default.dim,
									children: "–"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: detail_module_css_default.dateField,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: detail_module_css_default.dateLabel,
										children: t("r.to")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "date",
										className: detail_module_css_default.rangeInput,
										value: props.customTo,
										onChange: (event) => props.onCustomTo(event.target.value)
									})]
								})
							]
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: export_module_css_default.exportGroup,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: export_module_css_default.exportBtn,
							disabled: usage.days.length === 0,
							onClick: () => exportDaily("csv"),
							children: t("export.csv")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: export_module_css_default.exportBtn,
							disabled: usage.days.length === 0,
							onClick: () => exportDaily("json"),
							children: t("export.json")
						})]
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shared_module_css_default.cardGrid6,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
							label: t("d.callCount"),
							value: fmtCalls(safeTotals.calls),
							badge: trend?.calls.badge,
							above: trend?.calls.above
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
							label: "Tokens",
							value: fmtTokens(totalTokens),
							badge: trend?.tokens.badge,
							above: trend?.tokens.above
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
							label: t("c.input"),
							value: fmtTokens(safeTotals.inputTokens),
							badge: trend?.input.badge,
							above: trend?.input.above
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
							label: t("c.output"),
							value: fmtTokens(safeTotals.outputTokens),
							badge: trend?.output.badge,
							above: trend?.output.above
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
							label: t("c.cacheRead"),
							value: fmtTokens(safeTotals.cacheReadTokens),
							badge: trend?.cacheRead.badge,
							above: trend?.cacheRead.above
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
							label: t("d.hitRateShort"),
							value: hitRate,
							badge: trend?.hitRate.badge,
							above: trend?.hitRate.above
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
							label: t("d.dailyAvg"),
							value: activeDays === 0 ? "—" : fmtTokens(Math.round(totalTokens / activeDays)),
							badge: trend?.dailyAvg.badge,
							above: trend?.dailyAvg.above
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
							label: t("d.channelCount"),
							value: String(activeProviders.size),
							badge: trend?.channels.badge,
							above: trend?.channels.above
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
							label: t("d.activeDayCount"),
							value: String(activeDays),
							badge: trend?.activeDays.badge,
							above: trend?.activeDays.above
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatCard, {
							label: t("c.cost"),
							badge: trend?.cost.badge,
							above: trend?.cost.above,
							value: costCell.dim ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: shared_module_css_default.dim,
								children: costCell.text
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [costCell.text, costCell.amount && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostSourceChip, {
								source: safeTotals.costSource,
								partial: safeTotals.partial
							})] })
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShareBar, {
					usage,
					totalTokens,
					channelFilter,
					channels,
					tooltip
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shared_module_css_default.chipRow,
					style: { marginTop: 14 },
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						className: channelFilter === "ALL" ? shared_module_css_default.chip + " " + shared_module_css_default.active : shared_module_css_default.chip,
						onClick: () => props.onChannelFilter("ALL"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: shared_module_css_default.statusDot,
							style: { background: "var(--dsw-alias-state-business-primary, #5b8cff)" }
						}), "全部通道"]
					}), channels.map((channel) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						className: channelFilter === channel.provider ? shared_module_css_default.chip + " " + shared_module_css_default.active : shared_module_css_default.chip,
						onClick: () => props.onChannelFilter(channel.provider),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: shared_module_css_default.statusDot,
							style: { background: statusColorOf(channel.status) }
						}), channel.displayName]
					}, channel.provider))]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shared_module_css_default.card,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: detail_module_css_default.chartTitle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									display: "inline-flex",
									alignItems: "center",
									gap: 8
								},
								children: singleChannel === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: t("s.allChannels") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: shared_module_css_default.statusDot,
									style: { background: statusColorOf(singleChannel.status) }
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: singleChannel.displayName })] })
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: shared_module_css_default.dim,
								style: { fontSize: "calc(var(--dsh-content-font-size, 12px) * 1.05)" },
								children: [
									bounds.from,
									" ~ ",
									bounds.to
								]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: detail_module_css_default.chartTitle,
							style: { marginTop: 10 },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: shared_module_css_default.statLabel,
								children: chartTitle
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: shared_module_css_default.legend,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: "rgba(91,140,255,.28)" } }), t("c.cacheRead")] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: "var(--dsw-alias-state-business-primary, #5b8cff)" } }), t("c.input")] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: { background: "var(--dsw-alias-state-business-primary, #9a7bff)" } }), t("c.output")] })
								]
							})]
						}),
						chartRows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: shared_module_css_default.empty,
							children: t("empty.noUsage")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TokenBars, {
							rows: chartRows,
							tooltip,
							ariaLabel: chartAriaLabel
						}),
						useHourAxis && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: shared_module_css_default.statExtra,
							children: t("d.hourlyNote")
						})
					]
				})
			] });
		}
		//#endregion
		//#region src/client/core/rows.ts
		/**
		* 零 Token 行的统一处理：只有调用次数、Token 全 0 的行基本都是调用失败（本机实测 key 失效的模型
		* 就是这样），留在表里全是噪音；四处列表统一用它过滤，并把隐藏条数如实告诉用户。
		*/
		function dropEmptyRows(rows, tokensOf) {
			const kept = rows.filter((row) => tokensOf(row) > 0);
			return {
				rows: kept,
				hidden: rows.length - kept.length
			};
		}
		/** 列表底部的一行小字：说明隐藏了什么、为什么。 */
		function hiddenEmptyRowsText(hidden) {
			return t("rows.hiddenPrefix") + String(hidden) + t("rows.hiddenSuffix");
		}
		//#endregion
		//#region \0dsh-css:src/client/styles/lists.module.css.mjs
		const css$2 = ".ysq2ha_filterBar{flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:14px;display:flex}.ysq2ha_searchInput{border:1px solid var(--dsw-alias-border-l2,#2c2c34);min-width:180px;color:var(--dsw-alias-label-primary,#e8e8ec);font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.15);background:0 0;border-radius:9px;flex:1;padding:6px 12px}.ysq2ha_searchInput::placeholder{color:var(--dsw-alias-label-tertiary,#67676f)}.ysq2ha_filterSelect{background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.1);cursor:pointer;border-radius:9px;padding:6px 10px}.ysq2ha_searchInput:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ysq2ha_filterSelect:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ysq2ha_listTitle{align-items:center;gap:10px;min-width:0;display:flex}.ysq2ha_listMain{color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600;font-size:calc(var(--dsh-content-font-size,12px) * 1.15);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.ysq2ha_listSub{font-size:calc(var(--dsh-content-font-size,12px) * .96);color:var(--dsw-alias-label-tertiary,#67676f);text-overflow:ellipsis;white-space:nowrap;margin-top:1px;overflow:hidden}.ysq2ha_listBar{background:var(--dsw-alias-fill-l2,#80808c2e);vertical-align:middle;border-radius:3px;width:70px;height:5px;display:inline-block;overflow:hidden}.ysq2ha_listBar>i{border-radius:3px;height:100%;display:block}.ysq2ha_sessionDay td{background:var(--dsw-alias-bg-layer-2,#1d1d22);color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600;font-size:calc(var(--dsh-content-font-size,12px) * 1.1);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);text-align:left!important;padding:7px 10px!important}.ysq2ha_dayCount{color:var(--dsw-alias-label-tertiary,#67676f);font-weight:500;font-size:calc(var(--dsh-content-font-size,12px) * 1.01);margin-left:8px}.ysq2ha_rowArchived td{opacity:.5}.ysq2ha_archivedTag{font-size:calc(var(--dsh-content-font-size,12px) * .92);color:var(--dsw-alias-label-tertiary,#67676f);border:1px solid var(--dsw-alias-border-l2,#2c2c34);border-radius:999px;margin-left:6px;padding:0 6px;font-weight:500}.ysq2ha_subagentTag{font-size:calc(var(--dsh-content-font-size,12px) * .92);color:var(--dsw-alias-state-business-primary,#5b8cff);border:1px solid var(--dsw-alias-state-business-primary,#5b8cff);border-radius:999px;margin-left:6px;padding:0 6px;font-weight:500}.ysq2ha_subagentTagBtn{font-family:inherit;font-size:calc(var(--dsh-content-font-size,12px) * .92);cursor:pointer;color:var(--dsw-alias-state-business-primary,#5b8cff);border:1px solid var(--dsw-alias-state-business-primary,#5b8cff);background:0 0;border-radius:999px;margin-left:6px;padding:0 6px;font-weight:500;display:inline}.ysq2ha_subagentTagBtn:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c1a)}.ysq2ha_sessionMetaBtn{font-family:inherit;font-size:inherit;color:var(--dsw-alias-label-tertiary,#67676f);cursor:pointer;background:0 0;border:0;margin-left:6px;padding:0}.ysq2ha_sessionMetaBtn:hover{color:var(--dsw-alias-state-business-primary,#5b8cff);text-decoration:underline}.ysq2ha_drawerBack{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.1);cursor:pointer;text-overflow:ellipsis;white-space:nowrap;background:0 0;border-radius:999px;align-items:center;max-width:100%;margin:4px 0 10px;padding:3px 10px;display:inline-flex;overflow:hidden}.ysq2ha_drawerBack:hover{color:var(--dsw-alias-label-primary,#e8e8ec);background:var(--dsw-alias-interactive-bg-hover,#80808c1a)}.ysq2ha_drawerBack:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ysq2ha_subagentBlock{border-top:1px solid var(--dsw-alias-border-l2,#2c2c34);margin-top:14px;padding-top:10px}.ysq2ha_subagentBlockTitle{font-size:calc(var(--dsh-content-font-size,12px) * 1.1);color:var(--dsw-alias-label-secondary,#9a9aa6);margin-bottom:6px}.ysq2ha_subagentRow{text-align:left;width:100%;color:inherit;font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.1);cursor:pointer;background:0 0;border:0;border-radius:6px;justify-content:space-between;gap:10px;padding:5px 6px;display:flex}.ysq2ha_subagentRow:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c1a)}.ysq2ha_subagentRow:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:-2px}.ysq2ha_subagentRowTitle{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.ysq2ha_subagentRowMeta{color:var(--dsw-alias-label-tertiary,#67676f);font-variant-numeric:tabular-nums;flex:none}.ysq2ha_sessionTable{table-layout:fixed}.ysq2ha_sessionTable th:first-child{width:38%}.ysq2ha_sessionTable th:nth-child(2){width:13%}.ysq2ha_sessionTable th:nth-child(3){width:19%}.ysq2ha_sessionTable th:nth-child(4){width:11%}.ysq2ha_sessionTable th:nth-child(5){width:8%}.ysq2ha_sessionTable th:nth-child(6){width:11%}.ysq2ha_modelTable{table-layout:fixed}.ysq2ha_modelTable th:first-child{width:30%}.ysq2ha_modelTable th:nth-child(2){width:9%}.ysq2ha_modelTable th:nth-child(3){width:11%}.ysq2ha_modelTable th:nth-child(4){width:12%}.ysq2ha_modelTable th:nth-child(5){width:9%}.ysq2ha_modelTable th:nth-child(6){width:12%}.ysq2ha_modelTable th:nth-child(7){width:17%}.ysq2ha_projectTable{table-layout:fixed}.ysq2ha_projectTable th:first-child{width:38%}.ysq2ha_projectTable th:nth-child(2){width:10%}.ysq2ha_projectTable th:nth-child(3){width:12%}.ysq2ha_projectTable th:nth-child(4){width:13%}.ysq2ha_projectTable th:nth-child(5){width:12%}.ysq2ha_projectTable th:nth-child(6){width:15%}.ysq2ha_crossDayTag,.ysq2ha_sessionMeta{color:var(--dsw-alias-label-tertiary,#67676f);margin-left:6px}.ysq2ha_linkBtn{font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * .96);text-align:left;color:var(--dsw-alias-label-tertiary,#67676f);cursor:pointer;text-overflow:ellipsis;white-space:nowrap;background:0 0;border:0;max-width:100%;padding:0;overflow:hidden}.ysq2ha_linkBtn:hover{color:var(--dsw-alias-state-business-primary,#5b8cff);text-decoration:underline}.ysq2ha_linkBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ysq2ha_focusChip{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:calc(var(--dsh-content-font-size,12px) * 1.01);border-radius:999px;align-items:center;gap:6px;margin-bottom:10px;padding:3px 10px;display:inline-flex}.ysq2ha_focusClear{color:inherit;font:inherit;cursor:pointer;background:0 0;border:0;padding:0}.ysq2ha_focusClear:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ysq2ha_sessionToggle{font:inherit;color:inherit;cursor:pointer;background:0 0;border:0;flex-shrink:0;justify-content:center;align-items:center;gap:0;padding:0;display:inline-flex}.ysq2ha_sessionToggle:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ysq2ha_sessionToggleArrow{width:11px;color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .83);display:inline-block}.ysq2ha_sessionTitleBtn{min-width:0;font:inherit;font-weight:600;font-size:calc(var(--dsh-content-font-size,12px) * 1.15);color:var(--dsw-alias-label-primary,#e8e8ec);cursor:pointer;text-align:left;text-overflow:ellipsis;white-space:nowrap;background:0 0;border:0;flex:1;padding:0;overflow:hidden}.ysq2ha_sessionTitleBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ysq2ha_composeCell{background:var(--dsw-alias-fill-l1,#80808c0d);text-align:left!important;padding:4px 10px 10px 30px!important}.ysq2ha_composeRow{font-size:calc(var(--dsh-content-font-size,12px) * 1.05);grid-template-columns:minmax(120px,1.4fr) minmax(60px,.7fr) minmax(90px,1fr) minmax(70px,.8fr);align-items:center;gap:8px;padding:2px 0;display:grid}.ysq2ha_composeHead{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .96)}.ysq2ha_composeName{color:var(--dsw-alias-label-primary,#e8e8ec);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.ysq2ha_composeChannel{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .96);margin-left:6px}.ysq2ha_composeNumber{text-align:right;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9a9aa6)}.ysq2ha_moreRow{align-items:center;gap:10px;margin-top:12px;display:flex}.ysq2ha_moreBtn{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.05);cursor:pointer;background:0 0;border-radius:999px;padding:4px 14px}.ysq2ha_moreBtn:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.ysq2ha_moreBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ysq2ha_moreText{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * 1.01)}.ysq2ha_drawerMask{z-index:9000;background:var(--dsw-alias-bg-mask-1,#00000061);justify-content:flex-end;display:flex;position:fixed;top:0;bottom:0;left:0;right:0}.ysq2ha_drawerPanel{box-sizing:border-box;background:var(--dsw-alias-bg-layer-2,#1d1d22);border-left:1px solid var(--dsw-alias-border-l1,#2c2c34);width:min(880px,96vw);height:100%;box-shadow:var(--dsw-shadow-lv2,0 8px 24px #00000059);padding:14px 18px 30px;overflow-y:auto}.ysq2ha_drawerHead{align-items:flex-start;gap:10px;display:flex}.ysq2ha_drawerTitle{min-width:0;font-size:calc(var(--dsh-content-font-size,12px) * 1.38);color:var(--dsw-alias-label-primary,#e8e8ec);overflow-wrap:anywhere;flex:1;font-weight:650}.ysq2ha_drawerClose{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);width:26px;height:26px;font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.1);cursor:pointer;background:0 0;border-radius:8px;flex-shrink:0;line-height:1}.ysq2ha_drawerClose:hover{color:var(--dsw-alias-label-primary,#e8e8ec);background:var(--dsw-alias-interactive-bg-hover,#80808c1a)}.ysq2ha_drawerClose:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ysq2ha_drawerId{font-family:ui-monospace,Consolas,monospace;font-size:calc(var(--dsh-content-font-size,12px) * .96);color:var(--dsw-alias-label-tertiary,#67676f);overflow-wrap:anywhere;margin:2px 0 12px}.ysq2ha_shareCell{white-space:nowrap;align-items:center;gap:8px;display:flex}.ysq2ha_detailGrid{grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px 16px;display:grid}.ysq2ha_detailItemWide{grid-column:1/-1}.ysq2ha_detailItemLabel{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .96)}.ysq2ha_detailItemValue{color:var(--dsw-alias-label-primary,#e8e8ec);font-size:calc(var(--dsh-content-font-size,12px) * 1.1);font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.ysq2ha_detailItemNote{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .92)}.ysq2ha_detailStrip{border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:10px;grid-template-columns:repeat(auto-fit,minmax(84px,1fr));gap:8px 12px;margin:12px 0 4px;padding:10px 12px;display:grid}.ysq2ha_detailBlock{margin-top:16px}.ysq2ha_detailColumns{grid-template-columns:repeat(auto-fit,minmax(280px,1fr));align-items:start;gap:4px 20px;display:grid}.ysq2ha_detailBody{grid-template-columns:repeat(2,minmax(0,1fr));gap:0 20px;display:grid}.ysq2ha_detailBody>.ysq2ha_detailGrid,.ysq2ha_detailBody>.ysq2ha_detailStrip,.ysq2ha_detailBody>.ysq2ha_detailBlock{grid-column:1/-1}.ysq2ha_detailBody>.ysq2ha_detailColLeft{grid-column:1}.ysq2ha_detailBody>.ysq2ha_detailColRight{grid-column:2}.ysq2ha_detailColumns .ysq2ha_detailBlock{margin-top:14px}.ysq2ha_detailBlockTitle{color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:calc(var(--dsh-content-font-size,12px) * 1.05);margin-bottom:6px;font-weight:600}.ysq2ha_detailCost{font-size:calc(var(--dsh-content-font-size,12px) * 1.19);color:var(--dsw-alias-label-primary,#e8e8ec);font-variant-numeric:tabular-nums;flex-wrap:wrap;align-items:center;gap:8px;display:flex}.ysq2ha_detailCostHint{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * 1.01)}.ysq2ha_promptText{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--dsw-alias-fill-l1,#80808c0f);max-height:220px;color:var(--dsw-alias-label-primary,#e8e8ec);font-size:calc(var(--dsh-content-font-size,12px) * 1.1);border-radius:8px;padding:8px 10px;line-height:1.6;overflow-y:auto}.ysq2ha_sessionDetailModelTable{table-layout:fixed}.ysq2ha_sessionDetailModelTable th:first-child{width:40%}.ysq2ha_sessionDetailModelTable th:nth-child(2){width:18%}.ysq2ha_sessionDetailModelTable th:nth-child(3){width:24%}.ysq2ha_sessionDetailModelTable th:nth-child(4){width:18%}.ysq2ha_hourChart{align-items:flex-end;gap:2px;height:84px;margin-top:6px;display:flex}.ysq2ha_hourBar{flex-direction:column;flex:1;justify-content:flex-end;gap:2px;height:100%;display:flex}.ysq2ha_hourBarFill{background:var(--dsw-alias-state-business-primary,#5b8cff);border-radius:2px 2px 0 0;min-height:1px;display:block}.ysq2ha_hourBarTick{text-align:center;font-size:calc(var(--dsh-content-font-size,12px) * .83);color:var(--dsw-alias-label-tertiary,#67676f)}";
		const tagId$2 = "dsh-key-usage/lists.module.css";
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
		var lists_module_css_default = {
			"archivedTag": "ysq2ha_archivedTag",
			"composeCell": "ysq2ha_composeCell",
			"composeChannel": "ysq2ha_composeChannel",
			"composeHead": "ysq2ha_composeHead",
			"composeName": "ysq2ha_composeName",
			"composeNumber": "ysq2ha_composeNumber",
			"composeRow": "ysq2ha_composeRow",
			"crossDayTag": "ysq2ha_crossDayTag",
			"dayCount": "ysq2ha_dayCount",
			"detailBlock": "ysq2ha_detailBlock",
			"detailBlockTitle": "ysq2ha_detailBlockTitle",
			"detailBody": "ysq2ha_detailBody",
			"detailColLeft": "ysq2ha_detailColLeft",
			"detailColRight": "ysq2ha_detailColRight",
			"detailColumns": "ysq2ha_detailColumns",
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
			"filterSelect": "ysq2ha_filterSelect",
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
			"shareCell": "ysq2ha_shareCell",
			"subagentBlock": "ysq2ha_subagentBlock",
			"subagentBlockTitle": "ysq2ha_subagentBlockTitle",
			"subagentRow": "ysq2ha_subagentRow",
			"subagentRowMeta": "ysq2ha_subagentRowMeta",
			"subagentRowTitle": "ysq2ha_subagentRowTitle",
			"subagentTag": "ysq2ha_subagentTag",
			"subagentTagBtn": "ysq2ha_subagentTagBtn"
		};
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
		//#region src/client/tabs/ModelsTab.tsx
		/** 按模型：`provider + model` 聚合的用量与估算成本（数据来自宿主会话事件折叠）。 */
		const MODELS_PATH = "/dsh-key-usage/models";
		/** 导出列：取原始数值（金额、命中率不带单位），方便直接进表格做计算。 */
		const EXPORT_COLUMNS$2 = [
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
				value: (row) => row.costSource === void 0 ? null : t(COST_SOURCE_LABELS[row.costSource])
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
			const visible = (0, react.useMemo)(() => {
				const keyword = query.trim().toLowerCase();
				const filtered = dropEmptyRows(rows, (row) => row.tokens).rows.filter((row) => {
					const haystack = (row.model + " " + row.provider + " " + row.providerLabel).toLowerCase();
					const matchesQuery = keyword === "" || haystack.includes(keyword);
					const matchesChannel = channelFilter === "ALL" || row.provider === channelFilter;
					return matchesQuery && matchesChannel;
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
				sortKey
			]);
			const totalTokens = rows.reduce((total, row) => total + row.tokens, 0);
			const hiddenEmpty = dropEmptyRows(rows, (row) => row.tokens).hidden;
			/** 导出当前筛选与排序后的行（JSON 取整行，CSV 按固定列映射）。 */
			const exportRows = (format) => {
				if (format === "csv") downloadFile(exportFileName("models", "csv"), toCsv(visible, EXPORT_COLUMNS$2), CSV_MIME);
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
											" 个会话"
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
				hiddenEmpty > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.statExtra,
					children: hiddenEmptyRowsText(hiddenEmpty)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shared_module_css_default.statExtra,
					children: [
						"模型用量按宿主会话事件折叠（每个结算样本计一次调用）；成本按三层价目自动估算",
						props.data.priced ? "" : t("s.noCost"),
						"；命中率 = 缓存读 ÷（输入 + 输出 + 缓存读）"
					]
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
		const EXPORT_COLUMNS$1 = [
			{
				key: "workspace",
				labelKey: "p.path",
				value: (row) => row.workspace
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
				value: (row) => row.costSource === void 0 ? null : t(COST_SOURCE_LABELS[row.costSource])
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
			const rows = props.data?.rows ?? [];
			const focusWorkspace = props.focusWorkspace ?? null;
			const visible = (0, react.useMemo)(() => {
				const keyword = query.trim().toLowerCase();
				const filtered = dropEmptyRows(rows, (row) => row.tokens).rows.filter((row) => {
					const matchesQuery = keyword === "" || row.workspace.toLowerCase().includes(keyword);
					const matchesChannel = channelFilter === "ALL" || row.providers[channelFilter] !== void 0;
					const matchesFocus = focusWorkspace === null || row.workspace === focusWorkspace;
					return matchesQuery && matchesChannel && matchesFocus;
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
				focusWorkspace
			]);
			const totalTokens = rows.reduce((total, row) => total + row.tokens, 0);
			const hiddenEmpty = dropEmptyRows(rows, (row) => row.tokens).hidden;
			/** 导出当前筛选与排序后的项目行（JSON 取整行，CSV 按固定列映射）。 */
			const exportRows = (format) => {
				if (format === "csv") downloadFile(exportFileName("projects", "csv"), toCsv(visible, EXPORT_COLUMNS$1), CSV_MIME);
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
				focusWorkspace !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.focusChip,
					children: [
						"仅看项目：",
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
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: lists_module_css_default.listTitle,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: lists_module_css_default.listMain,
										children: baseNameOf(row.workspace)
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: lists_module_css_default.listSub,
										children: [
											row.workspace,
											" · ",
											row.sessionCount,
											" 个会话",
											row.archivedSessionCount > 0 ? t("p.archivePrefix") + row.archivedSessionCount + t("p.archiveSuffix") : ""
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
							] }, row.workspace);
						}), visible.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							colSpan: 6,
							className: shared_module_css_default.empty,
							children: focusWorkspace === null ? t("p.empty") : t("p.noUsage")
						}) })] })]
					})
				}),
				hiddenEmpty > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.statExtra,
					children: hiddenEmptyRowsText(hiddenEmpty)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shared_module_css_default.statExtra,
					children: [t("p.costHint"), props.data.priced ? "" : t("s.noCost")]
				})
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
		//#region src/client/core/serverText.ts
		/**
		* 服务端下发的中文说明 → 词典键（双语）。
		* 只收录**固定句子**（价目依据、会话服务降级原因等）；服务端将来改发 code 时这里会自然退化。
		* 未收录的串原样返回，不会把界面变成空白。
		*/
		const KEYS = {
			"按台账反推均价估算": "srv.ratesAverage",
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
		//#region \0dsh-css:src/client/styles/quota.module.css.mjs
		const css$1 = ".ohwLxW_quotaList{flex-direction:column;gap:12px;display:flex}.ohwLxW_quotaCard{background:var(--dsw-alias-bg-layer-2,#1d1d22);border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:12px;padding:12px 18px 16px}.ohwLxW_quotaToggle{width:100%;font:inherit;text-align:left;cursor:pointer;color:var(--dsw-alias-label-primary,#e8e8ec);background:0 0;border:0;border-radius:8px;flex-wrap:wrap;align-items:center;gap:10px;margin:0;padding:4px 0;display:flex}.ohwLxW_quotaToggle:hover{background:var(--dsw-alias-interactive-bg-hover,#80808c1a)}.ohwLxW_quotaToggle:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ohwLxW_quotaTitle{font-size:calc(var(--dsh-content-font-size,12px) * 1.19);color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600}.ohwLxW_quotaProvider{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * 1.05);margin-left:auto}.ohwLxW_rateCount{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .96);white-space:nowrap}.ohwLxW_expandArrow{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .92)}.ohwLxW_liveChip{border:1px solid var(--dsw-alias-state-success-primary,#3fb950);color:var(--dsw-alias-state-success-primary,#3fb950);font-size:calc(var(--dsh-content-font-size,12px) * .92);border-radius:999px;padding:1px 7px;line-height:1.6}.ohwLxW_balanceStrip{flex-wrap:wrap;align-items:baseline;gap:10px 44px;margin-top:8px;display:flex}.ohwLxW_balanceItem .ohwLxW_bsLabel{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * 1.01);margin-bottom:2px}.ohwLxW_balanceItem .ohwLxW_bsValue{font-size:calc(var(--dsh-content-font-size,12px) * 1.47);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:650}.ohwLxW_windowRow{flex-wrap:wrap;gap:18px;margin-top:8px;display:flex}.ohwLxW_windowItem{flex:1;min-width:150px}.ohwLxW_windowHead{justify-content:space-between;align-items:baseline;margin-bottom:5px;display:flex}.ohwLxW_windowName{color:var(--dsw-alias-label-secondary,#9a9aa6);font-size:calc(var(--dsh-content-font-size,12px) * 1.05)}.ohwLxW_windowValue{font-size:calc(var(--dsh-content-font-size,12px) * 1.1);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,#e8e8ec);font-weight:600}.ohwLxW_windowReset{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .96);margin-top:3px}.ohwLxW_windowBar{background:var(--dsw-alias-fill-l2,#80808c2e);border-radius:4px;height:6px;overflow:hidden}.ohwLxW_windowBar>i{border-radius:4px;height:100%;display:block}.ohwLxW_snapshotHint{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .96);margin-top:10px}.ohwLxW_snapshotStale{color:var(--dsw-alias-state-warning-primary,#e0a13c);font-size:calc(var(--dsh-content-font-size,12px) * .96);margin-top:10px}.ohwLxW_toolbar{flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:10px;display:flex}.ohwLxW_toolbarLabel{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * 1.01)}.ohwLxW_toolbarBtn{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-secondary,#9a9aa6);font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.05);cursor:pointer;background:0 0;border-radius:6px;padding:4px 11px}.ohwLxW_toolbarBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,#80808c1a);color:var(--dsw-alias-label-primary,#e8e8ec)}.ohwLxW_toolbarBtn:disabled{opacity:.5;cursor:default}.ohwLxW_toolbarBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ohwLxW_toolbarBtnPrimary{color:var(--dsw-alias-state-business-primary,#5b8cff);border-color:#5b8cff73}.ohwLxW_currencyBtnOn{border-color:var(--dsw-alias-state-business-primary,#5b8cff);color:var(--dsw-alias-label-primary,#e8e8ec);background:var(--dsw-alias-interactive-bg-active,#5b8cff24);font-weight:600}.ohwLxW_toolbarSpacer{flex:1}.ohwLxW_fxText{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .96)}.ohwLxW_fxWarn{color:var(--dsw-alias-state-warning-primary,#e0a13c);font-size:calc(var(--dsh-content-font-size,12px) * .96)}.ohwLxW_infoBtn{border:1px solid var(--dsw-alias-border-l2,#2c2c34);color:var(--dsw-alias-label-tertiary,#67676f);width:22px;height:22px;font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.1);cursor:pointer;background:0 0;border-radius:999px;padding:0;line-height:1}.ohwLxW_infoBtn:hover,.ohwLxW_infoBtnActive{color:var(--dsw-alias-state-business-primary,#5b8cff);border-color:#5b8cff73}.ohwLxW_infoBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ohwLxW_pricingInfo{margin-bottom:12px}.ohwLxW_pricingInfoToggle{color:var(--dsw-alias-label-tertiary,#67676f);font:inherit;font-size:calc(var(--dsh-content-font-size,12px) * 1.01);cursor:pointer;background:0 0;border:0;padding:2px 0}.ohwLxW_pricingInfoToggle:hover{color:var(--dsw-alias-label-primary,#e8e8ec)}.ohwLxW_pricingInfoToggle:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5b8cff);outline-offset:2px}.ohwLxW_pricingInfoBody{border:1px solid var(--dsw-alias-border-l1,#2c2c34);border-radius:10px;margin-top:6px;padding:4px 14px 12px}.ohwLxW_countLine{color:var(--dsw-alias-label-secondary,#9a9aa2);font-size:calc(var(--dsh-content-font-size,12px) * 1.05);margin:6px 0;line-height:1.8}.ohwLxW_staleLine{color:var(--dsw-alias-state-warning-primary,#e0a13c);font-size:calc(var(--dsh-content-font-size,12px) * 1.05);margin:6px 0;line-height:1.7}.ohwLxW_rateDrawer:empty{display:none}.ohwLxW_rateDrawer{border-top:1px solid var(--dsw-alias-border-l1,#2c2c34);margin-top:10px;padding-top:10px}.ohwLxW_rateScroll{overflow-x:auto}.ohwLxW_rateHead{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .96);margin-bottom:6px;line-height:1.7}.ohwLxW_rateTable{border-collapse:collapse;width:100%}.ohwLxW_rateTable th{text-align:right;color:var(--dsw-alias-label-tertiary,#67676f);font-weight:500;font-size:calc(var(--dsh-content-font-size,12px) * .96);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);white-space:nowrap;padding:4px 8px}.ohwLxW_rateTable td{text-align:right;font-size:calc(var(--dsh-content-font-size,12px) * 1.05);font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#9a9aa6);border-bottom:1px solid var(--dsw-alias-border-l1,#2c2c34);white-space:nowrap;padding:6px 8px}.ohwLxW_rateTable th:first-child,.ohwLxW_rateTable td:first-child{text-align:left}.ohwLxW_rateTable td:first-child{color:var(--dsw-alias-label-primary,#e8e8ec)}.ohwLxW_rateModel{font-family:ui-monospace,Consolas,monospace;font-size:calc(var(--dsh-content-font-size,12px) * 1.01)}.ohwLxW_rateNote{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .96);white-space:normal;text-align:left;max-width:320px}.ohwLxW_rateSourceNone{font-size:calc(var(--dsh-content-font-size,12px) * .92);color:var(--dsw-alias-label-tertiary,#67676f);white-space:nowrap;border:1px dashed;border-radius:999px;padding:0 6px;line-height:1.7;display:inline-block}.ohwLxW_offPeakChip{font-size:calc(var(--dsh-content-font-size,12px) * .92);border:1px solid var(--dsw-alias-state-success-primary,#3fb96f);color:var(--dsw-alias-state-success-primary,#3fb96f);border-radius:999px;padding:0 6px;line-height:1.7;display:inline-block}.ohwLxW_rateConverted{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * .92)}.ohwLxW_rateEmpty{color:var(--dsw-alias-label-tertiary,#67676f);font-size:calc(var(--dsh-content-font-size,12px) * 1.05);padding:6px 0}";
		const tagId$1 = "dsh-key-usage/quota.module.css";
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
		var quota_module_css_default = {
			"balanceItem": "ohwLxW_balanceItem",
			"balanceStrip": "ohwLxW_balanceStrip",
			"bsLabel": "ohwLxW_bsLabel",
			"bsValue": "ohwLxW_bsValue",
			"countLine": "ohwLxW_countLine",
			"currencyBtnOn": "ohwLxW_currencyBtnOn",
			"expandArrow": "ohwLxW_expandArrow",
			"fxText": "ohwLxW_fxText",
			"fxWarn": "ohwLxW_fxWarn",
			"infoBtn": "ohwLxW_infoBtn",
			"infoBtnActive": "ohwLxW_infoBtnActive",
			"liveChip": "ohwLxW_liveChip",
			"offPeakChip": "ohwLxW_offPeakChip",
			"pricingInfo": "ohwLxW_pricingInfo",
			"pricingInfoBody": "ohwLxW_pricingInfoBody",
			"pricingInfoToggle": "ohwLxW_pricingInfoToggle",
			"quotaCard": "ohwLxW_quotaCard",
			"quotaList": "ohwLxW_quotaList",
			"quotaProvider": "ohwLxW_quotaProvider",
			"quotaTitle": "ohwLxW_quotaTitle",
			"quotaToggle": "ohwLxW_quotaToggle",
			"rateConverted": "ohwLxW_rateConverted",
			"rateCount": "ohwLxW_rateCount",
			"rateDrawer": "ohwLxW_rateDrawer",
			"rateEmpty": "ohwLxW_rateEmpty",
			"rateHead": "ohwLxW_rateHead",
			"rateModel": "ohwLxW_rateModel",
			"rateNote": "ohwLxW_rateNote",
			"rateScroll": "ohwLxW_rateScroll",
			"rateSourceNone": "ohwLxW_rateSourceNone",
			"rateTable": "ohwLxW_rateTable",
			"snapshotHint": "ohwLxW_snapshotHint",
			"snapshotStale": "ohwLxW_snapshotStale",
			"staleLine": "ohwLxW_staleLine",
			"toolbar": "ohwLxW_toolbar",
			"toolbarBtn": "ohwLxW_toolbarBtn",
			"toolbarBtnPrimary": "ohwLxW_toolbarBtnPrimary",
			"toolbarLabel": "ohwLxW_toolbarLabel",
			"toolbarSpacer": "ohwLxW_toolbarSpacer",
			"windowBar": "ohwLxW_windowBar",
			"windowHead": "ohwLxW_windowHead",
			"windowItem": "ohwLxW_windowItem",
			"windowName": "ohwLxW_windowName",
			"windowReset": "ohwLxW_windowReset",
			"windowRow": "ohwLxW_windowRow",
			"windowValue": "ohwLxW_windowValue"
		};
		//#endregion
		//#region src/client/tabs/QuotaTab.tsx
		/**
		* 余额与配额：按通道展示官方余额快照与订阅窗口，卡片可展开看该通道近 30 天的模型单价表（`/rates`）。
		* 界面不维护任何价格；金额按工具条选的显示币种折算（汇率来自 `/fx`，折算收口在 currency.ts）。
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
			balance: "balance.balance",
			currency: "balance.currency"
		};
		const WINDOW_ORDER = [
			"5h",
			"week",
			"month",
			"day"
		];
		const WINDOW_LABELS = {
			"5h": "window.5h",
			week: "window.week",
			month: "window.month",
			day: "window.day"
		};
		/** 解析问题默认只列几条：一屏列不完的清单没人读。 */
		const ISSUE_LIMIT = 5;
		/** 单价来源在表格里的说法（`none` 写「无依据」，不用角标的 `—`）。 */
		const RATE_SOURCE_LABELS = {
			official: "source.official",
			catalog: "source.catalog",
			aggregate: "source.aggregate",
			estimate: "source.estimate",
			none: "source.none"
		};
		function resetTextOf(value) {
			if (typeof value !== "string" || value === "") return t("q.resetUnknown");
			const time = new Date(value);
			if (Number.isNaN(time.getTime())) return t("quota.resetAt") + " " + value;
			return t("quota.resetAt") + " " + fmtDateTime(time.getTime());
		}
		function QuotaTab(props) {
			/** 取词：宿主切语言时重渲染（模块级辅助函数直接用 import 的 t） */
			const t = useT();
			const instanceId = (0, react.useId)();
			const pricingInfoId = instanceId + "-pricing-info";
			const display = useCurrencyDisplay();
			const [rates, setRates] = (0, react.useState)(null);
			const [ratesLoading, setRatesLoading] = (0, react.useState)(true);
			const [fxLoading, setFxLoading] = (0, react.useState)(false);
			const [fxError, setFxError] = (0, react.useState)(null);
			const [showExplanation, setShowExplanation] = (0, react.useState)(false);
			const [showPricingInfo, setShowPricingInfo] = (0, react.useState)(false);
			const [expandedProviders, setExpandedProviders] = (0, react.useState)({});
			const [refreshingPrices, setRefreshingPrices] = (0, react.useState)(false);
			const [refreshElapsedSeconds, setRefreshElapsedSeconds] = (0, react.useState)(0);
			const [refreshStatus, setRefreshStatus] = (0, react.useState)(null);
			/** 取一次汇率：服务端 12 小时内走缓存，打上游的只有用户点「刷新汇率」那一下；失败时保留已有汇率。 */
			const fetchFx = (0, react.useCallback)(async (force) => {
				setFxLoading(true);
				const result = await loadFxRate(force);
				setFxLoading(false);
				if (result === null) {
					setFxError(failureReasonOf("/dsh-key-usage/fx") ?? t("quota.noResponse"));
					return;
				}
				setFxError(null);
				const normalized = normalizeFxRate(result);
				if (normalized === null) setFxError(t("quota.fxBad"));
				setFxRate(normalized);
			}, []);
			(0, react.useEffect)(() => {
				fetchFx(false);
			}, [fetchFx]);
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
			(0, react.useEffect)(() => {
				if (!refreshingPrices) return;
				const timer = setInterval(() => setRefreshElapsedSeconds((previous) => previous + 1), 1e3);
				return () => clearInterval(timer);
			}, [refreshingPrices]);
			/** 切显示币种：只改展示口径，不重取用量；汇率缺失 / 过期才补取一次。 */
			const switchCurrency = (next) => {
				if (next === display.display) return;
				setDisplayCurrency(next);
				if (display.fx === null || display.fx.stale) fetchFx(false);
			};
			/** 「刷新价目」：唯一会拉上游的动作；成功后再让页面重取 /pricing 与用量（成本口径整体变了）。 */
			const refreshPrices = async () => {
				if (refreshingPrices) return;
				setRefreshingPrices(true);
				setRefreshElapsedSeconds(0);
				setRefreshStatus(null);
				const outcome = await refreshModelPrices();
				setRefreshingPrices(false);
				if (outcome === null) {
					setRefreshStatus({
						tone: "bad",
						text: t("quota.refreshFailed") + "：" + (failureReasonOf("/dsh-key-usage/pricing/refresh") ?? t("quota.noResponse"))
					});
					return;
				}
				if (!outcome.ok) {
					setRefreshStatus({
						tone: "bad",
						text: t("quota.refreshFailed") + "：" + outcome.error
					});
					return;
				}
				setRefreshStatus({
					tone: "ok",
					text: modelPriceRefreshTextOf(outcome)
				});
				props.onPricingReload();
			};
			const pricing = props.pricing;
			const aggregate = pricing?.aggregate ?? null;
			const catalog = pricing?.catalog ?? null;
			const issues = Array.isArray(pricing?.issues) ? pricing.issues : [];
			const catalogStale = catalog === null ? null : catalogStaleDays(Array.isArray(catalog.sources) ? catalog.sources : []);
			const rateChannels = Array.isArray(rates?.channels) ? rates.channels : [];
			const rateRowsOf = (provider) => {
				const entry = rateChannels.find((item) => item.provider === provider);
				return entry === void 0 || !Array.isArray(entry.models) ? [] : entry.models;
			};
			const fxText = display.fx === null ? fxError === null ? fxSummaryTextOf(null) : t("quota.fxUnavailable") + "：" + fxError : fxFallbackWarningOf(display.fx) ?? fxSummaryTextOf(display.fx);
			const fxTone = display.fx === null || display.fx.source === "default" ? quota_module_css_default.fxWarn : quota_module_css_default.fxText;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: quota_module_css_default.toolbar,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: quota_module_css_default.toolbarLabel,
							children: t("quota.displayCurrency")
						}),
						DISPLAY_CURRENCIES.map((currency) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: quota_module_css_default.toolbarBtn + (display.display === currency ? " " + quota_module_css_default.currencyBtnOn : ""),
							"aria-pressed": display.display === currency,
							onClick: () => switchCurrency(currency),
							children: DISPLAY_CURRENCY_LABELS[currency]
						}, currency)),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: quota_module_css_default.toolbarBtn,
							disabled: fxLoading,
							"aria-busy": fxLoading,
							title: t("quota.fxCacheHint"),
							onClick: () => void fetchFx(true),
							children: fxLoading ? t("quota.fetchFx") : t("quota.refreshFx")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: quota_module_css_default.toolbarSpacer }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: quota_module_css_default.toolbarBtn + " " + quota_module_css_default.toolbarBtnPrimary,
							disabled: refreshingPrices,
							"aria-busy": refreshingPrices,
							onClick: () => void refreshPrices(),
							children: refreshingPrices ? t("action.refreshing") + (refreshElapsedSeconds > 0 ? " " + String(refreshElapsedSeconds) + "s" : "") : t("quota.refreshPrices")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: quota_module_css_default.infoBtn + (showExplanation ? " " + quota_module_css_default.infoBtnActive : ""),
							"aria-label": t("quota.caliberHint"),
							"aria-expanded": showExplanation,
							onClick: () => setShowExplanation((previous) => !previous),
							children: "ⓘ"
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: fxTone,
					title: display.fx?.note ?? void 0,
					children: fxText
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: quota_module_css_default.pricingInfo,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: quota_module_css_default.pricingInfoToggle,
						"aria-expanded": showPricingInfo,
						"aria-controls": pricingInfoId,
						onClick: () => setShowPricingInfo((previous) => !previous),
						children: [
							showPricingInfo ? "▾" : "▸",
							" 价目数据来源与文件（内置厂商官方价目",
							catalog !== null && Number.isFinite(catalog.entries) ? " " + String(catalog.entries) + t("quota.entriesSuffix") : "",
							t("q.aggregateSuffix")
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						id: pricingInfoId,
						className: quota_module_css_default.pricingInfoBody,
						hidden: !showPricingInfo,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PricingInfoBlock, {
							pricing,
							aggregate,
							issues,
							catalogStale
						})
					})]
				}),
				catalogStale !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: quota_module_css_default.staleLine,
					children: t("quota.catalogStale", { days: catalogStale })
				}),
				showExplanation && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplanationBlock, {}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: pricing_module_css_default.aggregateStatus + (refreshStatus === null ? "" : " " + (refreshStatus.tone === "ok" ? pricing_module_css_default.aggregateStatusOk : pricing_module_css_default.aggregateStatusBad)),
					role: "status",
					"aria-live": "polite",
					children: refreshStatus === null ? "" : refreshStatus.text
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: quota_module_css_default.quotaList,
					children: [props.channels.map((channel, index) => {
						const snapshot = props.quotas.find((item) => item.provider === channel.provider) ?? null;
						const outcome = props.quotaOutcome?.providers.find((item) => item.provider === channel.provider) ?? null;
						const balance = snapshot?.balance ?? null;
						const plan = snapshot?.plan ?? null;
						const isLive = snapshot?.source === "live";
						const windows = plan !== null && Array.isArray(plan.windows) ? plan.windows : null;
						const rateRows = rateRowsOf(channel.provider);
						const isOpen = expandedProviders[channel.provider] === true;
						const drawerId = instanceId + "-rates-" + String(index);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: quota_module_css_default.quotaCard,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: quota_module_css_default.quotaToggle,
									"aria-expanded": isOpen,
									"aria-controls": drawerId,
									title: t("quota.ratesHint"),
									onClick: () => setExpandedProviders((previous) => ({
										...previous,
										[channel.provider]: previous[channel.provider] !== true
									})),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: shared_module_css_default.statusDot,
											style: { background: statusColorOf(channel.status) }
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: quota_module_css_default.quotaTitle,
											children: channel.displayName
										}),
										isLive && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: quota_module_css_default.liveChip,
											children: t("quota.live")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: quota_module_css_default.rateCount,
											children: rateCountTextOf(rateRows, ratesLoading, rates === null, failureReasonOf(RATES_PATH))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: quota_module_css_default.quotaProvider,
											children: [
												channel.provider,
												" · ",
												t(COST_MODE_KEYS[channel.costMode] ?? "ch.notQueried")
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: quota_module_css_default.expandArrow,
											"aria-hidden": "true",
											children: isOpen ? "▼" : "▶"
										})
									]
								}),
								outcome !== null && outcome.ok === false && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: quota_module_css_default.staleLine,
									children: [
										"数据时间 ",
										outcome.capturedAt === null ? t("quota.unknown") : localTimeTextOf(outcome.capturedAt),
										" · 本机快照 · 本次失败：",
										outcome.error ?? t("quota.notQueried")
									]
								}),
								balance !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: quota_module_css_default.balanceStrip,
									children: orderedBalanceEntries(balance).map(([key, value]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: quota_module_css_default.balanceItem,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: quota_module_css_default.bsLabel,
											children: t(BALANCE_LABELS[key] ?? key)
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: quota_module_css_default.bsValue,
											children: String(value)
										})]
									}, key))
								}),
								balance === null && windows !== null && windows.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: quota_module_css_default.windowRow,
									children: orderedWindows(windows).map((window) => {
										const percent = typeof window.percent === "number" ? window.percent : 0;
										const key = typeof window.key === "string" ? window.key : "window";
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: quota_module_css_default.windowItem,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: quota_module_css_default.windowHead,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: quota_module_css_default.windowName,
														children: t(WINDOW_LABELS[key] ?? key)
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: quota_module_css_default.windowValue,
														children: [percent, "%"]
													})]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: quota_module_css_default.windowBar,
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: {
														width: Math.max(percent, 0) + "%",
														background: quotaBarColor(percent)
													} })
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
													className: quota_module_css_default.windowReset,
													children: resetTextOf(window.resetsAt)
												})
											]
										}, key);
									})
								}),
								balance === null && (windows === null || windows.length === 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: shared_module_css_default.dim,
									children: emptyReasonOf(channel, snapshot)
								}),
								isLive && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: quota_module_css_default.snapshotHint,
									children: t("quota.liveAt", { time: freshTextOf(snapshot?.fetchedAt ?? null) })
								}),
								snapshot !== null && !isLive && snapshot.supported && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: staleDaysOf(snapshot.updatedAt) >= 1 ? quota_module_css_default.snapshotStale : quota_module_css_default.snapshotHint,
									children: [t("quota.liveFailed", { reason: errorTextOf(snapshot.error) }), snapshot.updatedAt === null ? t("q.retryHint") : t("q.snapshotPrefix") + fmtDateTime(snapshot.updatedAt) + (staleDaysOf(snapshot.updatedAt) >= 1 ? t("q.stalePrefix") + staleDaysOf(snapshot.updatedAt) + t("q.daysStaleSuffix") : "")]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									id: drawerId,
									className: quota_module_css_default.rateDrawer,
									children: isOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RateTable, {
										rows: rateRows,
										loading: ratesLoading,
										failureText: rates === null ? failureReasonOf("/dsh-key-usage/rates") ?? t("quota.noResponse") : null,
										display: display.display,
										convertedHint: display.fx === null ? null : fxSummaryTextOf(display.fx),
										range: rates !== null && typeof rates.from === "string" && typeof rates.to === "string" ? {
											from: rates.from,
											to: rates.to
										} : null
									})
								})
							]
						}, channel.provider);
					}), props.channels.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shared_module_css_default.empty,
						children: t("o.noChannels")
					})]
				})
			] });
		}
		/** 卡片头部的单价摘要：收起时也能看出有多少个模型、来源压在哪一层。 */
		function rateCountTextOf(rows, loading, failed, failureText) {
			if (rows.length > 0) {
				const counts = /* @__PURE__ */ new Map();
				for (const row of rows) counts.set(row.source, (counts.get(row.source) ?? 0) + 1);
				const mix = [...counts.entries()].map(([source, count]) => t(RATE_SOURCE_LABELS[source] ?? source) + " " + String(count)).join(" / ");
				return String(rows.length) + t("q.modelRatesPrefix") + mix;
			}
			if (loading) return t("quota.loadingRates");
			if (failed) return failureText === null ? t("quota.ratesUnavailable") : t("quota.ratesUnavailable") + "：" + failureText;
			return t("quota.noUsage");
		}
		/** 单价表：`rates` 为 null 的行在四档位置显示来源说明（写 0 会被读成「免费」，比「没有依据」更糟）。 */
		function RateTable(props) {
			if (props.rows.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: quota_module_css_default.rateEmpty,
				children: props.loading ? t("quota.loadingRates") : props.failureText !== null ? t("quota.ratesUnavailable") + "：" + props.failureText : t("quota.ratesEmpty")
			});
			const converted = props.rows.some((row) => convertsCurrencyOf(row.currency));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: quota_module_css_default.rateHead,
				children: [
					t("quota.priceUnit"),
					"（",
					t("unit.perMillion"),
					"）· ",
					t("quota.displayCurrency"),
					" ",
					DISPLAY_CURRENCY_LABELS[props.display],
					converted && props.convertedHint !== null ? t("q.convertedPrefix") + props.convertedHint + "）" : "",
					props.range === null ? "" : t("q.rangePrefix") + props.range.from + " ~ " + props.range.to
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
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("quota.sourceLabel") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("m.lastActive") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("m.model") })
						] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: props.rows.map((row) => {
							const rates = row.rates;
							const hasRates = rates !== null && typeof rates === "object";
							const rowConverted = convertsCurrencyOf(row.currency);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: quota_module_css_default.rateModel,
										children: row.model
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: quota_module_css_default.rateConverted,
										children: [
											"币种 ",
											typeof row.currency === "string" && row.currency !== "" ? row.currency : "—",
											rowConverted ? " → " + props.display : ""
										]
									}),
									row.offPeak === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: quota_module_css_default.offPeakChip,
										children: t("q.offPeak")
									})
								] }),
								hasRates ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: rateCellText(row.currency, rates.input) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: rateCellText(row.currency, rates.cacheRead) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: rateCellText(row.currency, rates.cacheWrite) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: rateCellText(row.currency, rates.output) })
								] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: quota_module_css_default.rateEmpty,
									colSpan: 4,
									children: noteTextOf(row) !== "" ? noteTextOf(row) : noRateTextOf(row.source)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.source === "none" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: quota_module_css_default.rateSourceNone,
									title: costSourceHintOf("none", row.partial),
									children: t("q.noBasis")
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostSourceChip, {
									source: row.source,
									partial: row.partial
								}) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(typeof row.tokens === "number" && Number.isFinite(row.tokens) ? row.tokens : 0) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
									className: quota_module_css_default.rateNote,
									children: row.note !== null && row.note !== "" ? row.note : "—"
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
		/** 价目信息块：官方价目来源与新鲜度、价目文件与解析问题、聚合价目装载状态。 */
		function PricingInfoBlock(props) {
			const { pricing, aggregate } = props;
			const catalog = pricing?.catalog ?? null;
			const sources = Array.isArray(catalog?.sources) ? catalog.sources : [];
			const issues = props.issues ?? [];
			const shownIssues = issues.slice(0, ISSUE_LIMIT);
			const coverage = pricing?.coverage ?? null;
			const files = pricing?.files ?? null;
			const coverageText = coverageTextOf(coverage);
			const aggregateIssues = (Array.isArray(aggregate?.issues) ? aggregate.issues : []).filter((issue) => issue !== null && typeof issue === "object");
			const fetchedAtText = aggregate === null ? null : localTimeTextOf(aggregate.fetchedAt);
			const pathText = typeof aggregate?.path === "string" && aggregate.path !== "" ? aggregate.path : null;
			const commitFull = typeof aggregate?.upstreamCommit === "string" && aggregate.upstreamCommit.trim() !== "" ? aggregate.upstreamCommit.trim() : null;
			const commitShort = commitFull === null ? null : shortCommitOf(commitFull);
			const licenseText = typeof aggregate?.license === "string" && aggregate.license.trim() !== "" ? aggregate.license : "MIT";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				coverageText !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: quota_module_css_default.countLine,
					children: coverageText
				}),
				catalog !== null && Number.isFinite(catalog.entries) && catalog.entries > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: pricing_module_css_default.catalogNote + (props.catalogStale === null ? "" : " " + pricing_module_css_default.catalogStale),
					children: [
						"已内置 ",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: String(catalog.entries) }),
						t("q.catalogPrefix"),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: t("q.catalogAuto") }),
						"。来源：",
						sources.length === 0 ? t("quota.noSourceDetail") : sources.map((entry, index) => {
							const daysAgo = fetchedDaysAgo(entry.fetchedAt);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								index > 0 && "；",
								typeof entry.source === "string" && entry.source !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
									className: pricing_module_css_default.linkBtn,
									href: entry.source,
									target: "_blank",
									rel: "noreferrer",
									children: (entry.providers ?? []).join(" / ")
								}) : (entry.providers ?? []).join(" / "),
								"（",
								String(entry.count),
								" 条，",
								entry.fetchedAt,
								" 抓取",
								daysAgo === null ? "" : t("q.agoPrefix") + String(daysAgo) + t("q.daySuffix"),
								"）"
							] }, entry.source);
						})
					]
				}),
				files !== null && files.catalog !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: pricing_module_css_default.fileLine,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
						"内置价目文件 ",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
							className: pricing_module_css_default.pathText,
							children: files.catalog.path
						}),
						files.catalog.exists ? "（" + String(files.catalog.entries) + t("q.entriesClose") : "（" + t("quota.unreadable") + "）"
					] })
				}),
				issues.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: pricing_module_css_default.issueBlock,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: pricing_module_css_default.issueHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("b", { children: [String(issues.length), " 处价目解析问题"] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: pricing_module_css_default.issueNote,
								children: "—— 这些问题所在的条目已被跳过，成本按其余层与台账算"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: pricing_module_css_default.issueList,
							children: shownIssues.map((issue, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: pricing_module_css_default.issueWhere,
								children: ["内置价目", issue.line === null ? "" : t("q.rowPrefix") + String(issue.line) + t("q.rowSuffix")]
							}), issueTextOf(issue)] }, String(issue.file) + "|" + String(issue.line) + "|" + String(index)))
						}),
						issues.length > ISSUE_LIMIT && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: pricing_module_css_default.issueNote,
							children: [
								"还有 ",
								String(issues.length - ISSUE_LIMIT),
								" 条同类问题已折叠。"
							]
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: pricing_module_css_default.aggregateBlock,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: pricing_module_css_default.aggregateHead,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: pricing_module_css_default.aggregateTitle,
								children: [
									"聚合价目来源：",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
										className: pricing_module_css_default.linkBtn,
										href: LITELLM_REPO_URL,
										target: "_blank",
										rel: "noreferrer",
										children: "LiteLLM"
									}),
									"（",
									licenseText,
									"，第三方聚合价目，美元计价；优先级低于内置官方价目）"
								]
							})
						}),
						aggregate === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: pricing_module_css_default.aggregateMeta,
							children: pricing === null ? t("quota.loadingPricing") : t("quota.pricingUnavailable")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: pricing_module_css_default.aggregateMeta,
							children: [
								"当前装载：",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: aggregateLoadedLabelOf(aggregate.loaded) }),
								Number.isFinite(aggregate.entries) ? t("quota.entry") + " " + String(aggregate.entries) : "",
								Number.isFinite(aggregate.models) ? t("quota.modelCount") + " " + String(aggregate.models) : "",
								fetchedAtText === null ? "" : t("quota.fileTime") + " " + fetchedAtText,
								commitShort === null ? "" : "　upstream " + commitShort
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: pricing_module_css_default.aggregateMeta,
							children: [
								"平时不联网：",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: t("q.aggregateRefreshOnly") }),
								"才会访问 LiteLLM 上游地址；刷新失败不影响已装载的那一份。",
								pathText === null ? "" : t("quota.currentFile") + "：" + pathText
							]
						})] }),
						aggregateIssues.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: pricing_module_css_default.issueBlock,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: pricing_module_css_default.issueHead,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("b", { children: [String(aggregateIssues.length), " 处聚合价目装载问题"] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: pricing_module_css_default.issueNote,
									children: t("q.aggregateScope")
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								className: pricing_module_css_default.issueList,
								children: aggregateIssues.slice(0, ISSUE_LIMIT).map((issue, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: pricing_module_css_default.issueWhere,
									children: issue.kind
								}), issueTextOf(issue)] }, issue.kind + "|" + String(index)))
							})]
						})
					]
				})
			] });
		}
		/** 覆盖度一行：官方账单天数 + 三层价目各命中多少模型 + 台账兜底与无依据；一个数字都没有就整段省略。 */
		function coverageTextOf(coverage) {
			if (coverage === null) return null;
			const days = coverage.from === void 0 || coverage.to === void 0 ? null : daysBetween(coverage.from, coverage.to);
			const parts = [];
			if (days !== null) parts.push(t("quota.officialBill") + " " + String(days) + t("q.daySuffix"));
			const counts = [
				[t("cso.catalog"), coverage.catalogModels],
				[t("cso.aggregate"), coverage.aggregateModels],
				[t("cso.estimate"), coverage.averagedModels],
				[t("q.noBasis"), coverage.unpricedModels]
			];
			for (const [label, value] of counts) if (typeof value === "number" && Number.isFinite(value)) parts.push(label + " " + String(value) + t("q.modelsSuffix"));
			if (typeof coverage.partialModels === "number" && coverage.partialModels > 0) parts.push(t("q.partialPrefix") + String(coverage.partialModels) + t("q.countSuffix"));
			if (parts.length === 0) return null;
			return t("quota.basis") + "：" + parts.join(" · ") + t("quota.basisAuto");
		}
		/** 覆盖区间的自然天数（含首尾），用作「官方账单 X 天」的口径。 */
		function daysBetween(from, to) {
			const start = (/* @__PURE__ */ new Date(from + "T00:00:00")).getTime();
			const end = (/* @__PURE__ */ new Date(to + "T00:00:00")).getTime();
			if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
			return Math.round((end - start) / 864e5) + 1;
		}
		/** 成本口径说明：点 ⓘ 才展开，只留结论口径（算法细节在 docs/01）。 */
		function ExplanationBlock() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: pricing_module_css_default.explanation,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: pricing_module_css_default.explanationTitle,
					children: t("caliber.title")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
					className: pricing_module_css_default.explanationList,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
							t("caliber.orderPrefix"),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: t("quota.officialBill") }),
							" > ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: t("cso.catalog") }),
							t("caliber.orderCatalog"),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: t("cso.aggregate") }),
							t("caliber.orderAggregate"),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: t("cso.estimate") }),
							t("caliber.orderTail")
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: t("cso.official") }),
							t("caliber.officialNote"),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: t("cso.estimate") }),
							t("caliber.estimateNote")
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("caliber.unitNote") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
							t("caliber.nonePrefix"),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: "—" }),
							t("caliber.convertNote"),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: "≈" }),
							"。"
						] })
					]
				})]
			});
		}
		/** 刷新回执：契约只给 `entries`（条目数）不给模型数，所以写「条」而不冒充「个模型」。 */
		function modelPriceRefreshTextOf(result) {
			const parts = [];
			if (typeof result.entries === "number" && Number.isFinite(result.entries)) parts.push(String(result.entries) + t("q.priceEntriesSuffix"));
			const megabytes = megabytesTextOf(result.bytes);
			if (megabytes !== null) parts.push(megabytes);
			const host = hostOf(result.url);
			if (host !== null) parts.push(t("quota.sourceLabel") + " " + host);
			const time = localTimeTextOf(result.fetchedAt);
			if (time !== null) parts.push(time);
			return t("quota.updated") + "：" + (parts.length === 0 ? t("quota.recomputed") : parts.join(" · "));
		}
		function freshTextOf(fetchedAt) {
			if (fetchedAt === null) return t("quota.justNow");
			const seconds = Math.max(0, Math.floor((Date.now() - fetchedAt) / 1e3));
			if (seconds < 60) return t("quota.justNow");
			const minutes = Math.floor(seconds / 60);
			if (minutes < 60) return minutes + t("q.minutesAgoSuffix");
			return Math.floor(minutes / 60) + t("q.hoursAgoSuffix");
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
		/** 快照 issue：kind 机器可读，英文模式按 kind 渲染；中文模式保留服务端原文（含路径与数字）。 */
		function issueTextOf(issue) {
			if (!isEnglish() || issue.kind === void 0) return issue.message;
			const english = t("issue." + issue.kind);
			return english === "issue." + issue.kind ? issue.message : english;
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
		/** 快照距今天数（向下取整）；用于把「宿主很久没刷新」显式标出来。 */
		function staleDaysOf(updatedAt) {
			if (updatedAt === null) return 0;
			return Math.floor((Date.now() - updatedAt) / 864e5);
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
		function orderedWindows(windows) {
			return [...windows].sort((first, second) => {
				const firstIndex = WINDOW_ORDER.indexOf(typeof first.key === "string" ? first.key : "");
				const secondIndex = WINDOW_ORDER.indexOf(typeof second.key === "string" ? second.key : "");
				return (firstIndex < 0 ? 99 : firstIndex) - (secondIndex < 0 ? 99 : secondIndex);
			});
		}
		/** 无数据时的分档说明：区分未配置凭据 / 免费额度 / 本地端点 / 无查询能力。 */
		function emptyReasonOf(channel, snapshot) {
			if (snapshot?.source === "snapshot" && snapshot.error === "no-key") return t("err.detail.noKey");
			if (snapshot?.source === "snapshot" && snapshot.error === "unauthorized") return t("err.detail.rejected");
			if (channel.status === "off") return t("err.detail.keyMissing");
			if (channel.costMode === "none") return t("err.detail.local");
			if (channel.costMode === "free") return t("err.detail.free");
			return t("err.detail.none");
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
							children: ["← 返回主会话", props.parentTitle === null ? "" : "：" + props.parentTitle]
						}),
						data === null && !failed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: shared_module_css_default.empty,
							children: t("d.loading")
						}),
						failed && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: shared_module_css_default.warning,
							children: ["会话详情读取失败：", failureReasonOf(sessionDetailPath(props.sessionId)) ?? t("d.unknownReason")]
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
								value: fmtDuration(session.durationMs) + (session.crossDays >= 1 ? t("d.crossDays", { count: session.crossDays }) : "")
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
											fmtCalls(model.calls),
											" 次"
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
		//#region src/client/tabs/SessionsTab.tsx
		/** 会话用量：按会话列出 tokens / 命中率 / 时长；点行开详情，行内可展开模型构成。 */
		/** 首屏渲染 50 个：本机有 ~130 个会话，一次全渲染会明显卡顿；「加载更多」每次再加这么多。 */
		const PAGE_SIZE = 50;
		/** 导出列：标题可能带逗号或换行，由 toCsv 统一转义。 */
		const EXPORT_COLUMNS = [
			{
				key: "id",
				labelKey: "s.id",
				value: (row) => row.id
			},
			{
				key: "title",
				labelKey: "s.title",
				value: (row) => row.title
			},
			{
				key: "prompt",
				labelKey: "s.prompt",
				value: (row) => row.prompt
			},
			{
				key: "workspace",
				labelKey: "common.workspace",
				value: (row) => row.workspace
			},
			{
				key: "provider",
				labelKey: "common.channel",
				value: (row) => row.provider
			},
			{
				key: "firstTime",
				labelKey: "s.first",
				value: (row) => fmtDateTime(row.firstTime)
			},
			{
				key: "lastTime",
				labelKey: "s.last",
				value: (row) => fmtDateTime(row.lastTime)
			},
			{
				key: "crossDays",
				labelKey: "s.crossDays",
				value: (row) => row.crossDays
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
				labelKey: "s.hitRate",
				value: (row) => row.cacheHitRate
			},
			{
				key: "cost",
				labelKey: "s.costNative",
				value: (row) => row.cost
			},
			{
				key: "costSource",
				labelKey: "s.costSource",
				value: (row) => row.costSource === void 0 ? null : t(COST_SOURCE_LABELS[row.costSource])
			},
			{
				key: "archived",
				labelKey: "s.archived",
				value: (row) => row.archived ? t("s.yes") : t("s.no")
			}
		];
		function SessionsTab(props) {
			/** 取词：宿主切语言时重渲染 */
			const t = useT();
			const [query, setQuery] = (0, react.useState)("");
			const [channelFilter, setChannelFilter] = (0, react.useState)("ALL");
			const [daysFilter, setDaysFilter] = (0, react.useState)("30");
			const [sortKey, setSortKey] = (0, react.useState)("recent");
			const [archiveFilter, setArchiveFilter] = (0, react.useState)("hide");
			/** 子代理会话默认隐藏（它们是子会话，单独成行会淹没主会话）；可切换显示或只看。 */
			const [subagentFilter, setSubagentFilter] = (0, react.useState)("hide");
			/** 只看某个会话及其子会话（点子会话上的「子代理」标签或父行上的「N 个子会话」时设置）。 */
			const [parentFocus, setParentFocus] = (0, react.useState)(null);
			const [pageSize, setPageSize] = (0, react.useState)(PAGE_SIZE);
			const [expandedIds, setExpandedIds] = (0, react.useState)({});
			const [detailId, setDetailId] = (0, react.useState)(null);
			const [nowMs] = (0, react.useState)(() => Date.now());
			const rows = props.data?.rows ?? [];
			const archivedCount = rows.filter((row) => row.archived).length;
			const subagentCount = rows.filter((row) => row.origin === "subagent" || (row.parentSessionId ?? null) !== null).length;
			const hiddenEmpty = dropEmptyRows(rows, (row) => row.tokens).hidden;
			(0, react.useEffect)(() => {
				setPageSize(PAGE_SIZE);
			}, [
				query,
				channelFilter,
				daysFilter,
				sortKey,
				archiveFilter,
				subagentFilter,
				parentFocus
			]);
			const visible = (0, react.useMemo)(() => {
				const keyword = query.trim().toLowerCase();
				const maxAgeDays = Number(daysFilter);
				const filtered = rows.filter((row) => (row.title ?? "") !== "" || (row.prompt ?? "") !== "").filter((row) => {
					const haystack = (row.title ?? "") + " " + row.id + " " + (row.workspace ?? "") + " " + (row.prompt ?? "");
					const matchesQuery = keyword === "" || haystack.toLowerCase().includes(keyword);
					const matchesChannel = channelFilter === "ALL" || row.provider === channelFilter;
					const matchesAge = maxAgeDays === 0 || row.lastTime === null || nowMs - row.lastTime <= maxAgeDays * 864e5;
					const matchesArchive = archiveFilter === "all" || (archiveFilter === "only" ? row.archived : !row.archived);
					const isSubagent = row.origin === "subagent" || (row.parentSessionId ?? null) !== null;
					const matchesSubagent = subagentFilter === "all" || (subagentFilter === "only" ? isSubagent : !isSubagent);
					const matchesFocus = parentFocus === null || row.id === parentFocus || row.parentSessionId === parentFocus;
					return matchesQuery && matchesChannel && matchesAge && matchesArchive && matchesSubagent && matchesFocus;
				});
				const sorters = {
					recent: (first, second) => (second.lastTime ?? 0) - (first.lastTime ?? 0),
					tokensDesc: (first, second) => second.tokens - first.tokens,
					tokensAsc: (first, second) => first.tokens - second.tokens,
					durationDesc: (first, second) => durationOf(second) - durationOf(first),
					costDesc: (first, second) => (second.cost ?? -1) - (first.cost ?? -1),
					hitDesc: (first, second) => (second.cacheHitRate ?? -1) - (first.cacheHitRate ?? -1),
					callsDesc: (first, second) => second.calls - first.calls
				};
				return [...filtered].sort(sorters[sortKey]);
			}, [
				rows,
				query,
				channelFilter,
				daysFilter,
				sortKey,
				nowMs,
				archiveFilter,
				subagentFilter,
				parentFocus
			]);
			/** 只导当前筛选后的会话行（归档筛选、时间窗口、搜索都算数）；分页不影响导出。 */
			const exportRows = (format) => {
				if (format === "csv") downloadFile(exportFileName("sessions", "csv"), toCsv(visible, EXPORT_COLUMNS), CSV_MIME);
				else downloadFile(exportFileName("sessions", "json"), toJson(visible), JSON_MIME);
			};
			if (props.data === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { title: t("s.loading") });
			const groups = [];
			if (sortKey === "recent") for (const row of visible) {
				const label = dayLabelOf(row.lastTime, nowMs);
				const last = groups[groups.length - 1];
				if (last === void 0 || last.label !== label) groups.push({
					label,
					rows: [row],
					tokens: row.tokens
				});
				else {
					last.rows.push(row);
					last.tokens += row.tokens;
				}
			}
			let remaining = pageSize;
			const shownGroups = groups.map((group) => {
				const shown = remaining <= 0 ? [] : group.rows.slice(0, remaining);
				remaining -= shown.length;
				return {
					label: group.label,
					rows: shown,
					total: group.rows.length,
					tokens: group.tokens
				};
			}).filter((group) => group.rows.length > 0);
			const shownRows = sortKey === "recent" ? [] : visible.slice(0, pageSize);
			const shownCount = sortKey === "recent" ? shownGroups.reduce((count, group) => count + group.rows.length, 0) : shownRows.length;
			const detailRow = detailId === null ? null : rows.find((row) => row.id === detailId) ?? null;
			const rowOptions = {
				channels: props.channels,
				tooltip: props.tooltip,
				expandedIds,
				nowMs,
				onToggleModels: (id) => setExpandedIds((previous) => ({
					...previous,
					[id]: previous[id] !== true
				})),
				onOpenDetail: (id) => setDetailId(id),
				onOpenProject: props.onOpenProject,
				onFocusSession: (id) => {
					setParentFocus(id);
					setSubagentFilter("all");
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				props.data.coverage.status !== "complete" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.warning,
					children: props.data.coverage.status === "unavailable" ? t("s.unavailable") : t("s.partial") + " " + String(props.data.coverage.skippedSessions) + t("s.partialTail")
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.filterBar,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: lists_module_css_default.searchInput,
							placeholder: t("s.searchPlaceholder"),
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
							ariaLabel: t("s.filterRange"),
							value: daysFilter,
							onChange: setDaysFilter,
							options: [
								{
									value: "7",
									labelKey: "s.days7"
								},
								{
									value: "30",
									labelKey: "s.days30"
								},
								{
									value: "0",
									labelKey: "s.rangeAll"
								}
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Select, {
							ariaLabel: t("s.sort"),
							value: sortKey,
							onChange: (value) => setSortKey(value),
							options: [
								{
									value: "recent",
									labelKey: "s.sortRecent"
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
									value: "durationDesc",
									labelKey: "s.sortDuration"
								},
								{
									value: "costDesc",
									labelKey: "s.sortCost"
								},
								{
									value: "hitDesc",
									labelKey: "s.sortHit"
								},
								{
									value: "callsDesc",
									labelKey: "s.sortCalls"
								}
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Select, {
							ariaLabel: t("s.filterArchive"),
							value: archiveFilter,
							onChange: (value) => setArchiveFilter(value),
							options: [
								{
									value: "hide",
									labelKey: "s.archiveHide"
								},
								{
									value: "all",
									labelKey: "s.archiveAll"
								},
								{
									value: "only",
									labelKey: "s.archiveOnly"
								}
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Select, {
							ariaLabel: t("s.filterSubagent"),
							value: subagentFilter,
							onChange: (value) => setSubagentFilter(value),
							options: [
								{
									value: "hide",
									labelKey: "s.subagentHide"
								},
								{
									value: "all",
									labelKey: "s.subagentAll"
								},
								{
									value: "only",
									labelKey: "s.subagentOnly"
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
				parentFocus !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shared_module_css_default.statExtra,
					children: ["只看该会话及其子会话（含父会话行）·", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						className: lists_module_css_default.linkBtn,
						onClick: () => setParentFocus(null),
						children: t("p.clearFilter")
					})]
				}),
				subagentFilter !== "only" && subagentCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shared_module_css_default.statExtra,
					children: [
						t("s.subagentOther", { count: subagentCount }),
						subagentFilter === "hide" ? t("s.subagentHidden") : t("s.subagentShown"),
						"：子会话各自计入统计，不并入父会话"
					]
				}),
				archiveFilter === "hide" && archivedCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.statExtra,
					children: t("s.archivedOther", { count: archivedCount })
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: ui_module_css_default.tableScroll,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						className: shared_module_css_default.table + " " + lists_module_css_default.sessionTable,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("s.id") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("common.channel") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("s.timeDuration") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "Tokens" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("d.hitRate") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("c.cost") })
						] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tbody", { children: [
							sortKey === "recent" && shownGroups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", {
								className: lists_module_css_default.sessionDay,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", {
									colSpan: 6,
									children: [group.label, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: lists_module_css_default.dayCount,
										children: [
											group.rows.length < group.total ? t("s.showPrefix") + String(group.rows.length) + " / " + String(group.total) + t("s.showSuffix") : String(group.total) + t("s.showSuffix"),
											" · ",
											fmtTokens(group.tokens)
										]
									})]
								})
							}), group.rows.map((row) => sessionRowOf(row, rowOptions))] }, "group-" + group.label)),
							sortKey !== "recent" && shownRows.map((row) => sessionRowOf(row, rowOptions)),
							visible.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								colSpan: 6,
								className: shared_module_css_default.empty,
								children: t("s.empty")
							}) })
						] })]
					})
				}),
				visible.length > shownCount && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.moreRow,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: lists_module_css_default.moreBtn,
						onClick: () => setPageSize(pageSize + PAGE_SIZE),
						children: [
							"加载更多（+",
							PAGE_SIZE,
							"）"
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: lists_module_css_default.moreText,
						children: [
							"已显示 ",
							shownCount,
							" / ",
							visible.length,
							" 个会话"
						]
					})]
				}),
				hiddenEmpty > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.statExtra,
					children: hiddenEmptyRowsText(hiddenEmpty)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shared_module_css_default.statExtra,
					children: ["会话用量按宿主会话事件折叠（每个结算样本计一次调用）；成本按三层价目自动估算", props.data.priced ? "" : t("s.noCost")]
				}),
				detailId !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionDetailDrawer, {
					sessionId: detailId,
					fallbackTitle: detailRow?.title ?? null,
					channels: props.channels,
					subagents: detailRow === null ? [] : rows.filter((row) => row.parentSessionId === detailRow.id),
					onOpenSession: setDetailId,
					parentId: detailRow?.parentSessionId ?? null,
					parentTitle: detailRow === null || detailRow.parentSessionId == null ? null : rows.find((row) => row.id === detailRow.parentSessionId)?.title ?? null,
					onClose: () => setDetailId(null)
				})
			] });
		}
		function sessionRowOf(row, options) {
			const channel = channelOf(options.channels, row.provider);
			const costCell = costCellOf(channel, row);
			const isOpen = options.expandedIds[row.id] === true;
			const workspace = row.workspace;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
				className: (row.archived ? lists_module_css_default.rowArchived + " " : "") + shared_module_css_default.clickable,
				onClick: () => options.onOpenDetail(row.id),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lists_module_css_default.listTitle,
						children: [
							row.models.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: lists_module_css_default.sessionToggleArrow,
								"aria-hidden": "true"
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: lists_module_css_default.sessionToggle,
								"aria-expanded": isOpen,
								"aria-label": isOpen ? t("s.collapseModels") : t("s.expandModels"),
								onClick: (event) => {
									event.stopPropagation();
									options.onToggleModels(row.id);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: lists_module_css_default.sessionToggleArrow,
									"aria-hidden": "true",
									children: isOpen ? "▼" : "▶"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: lists_module_css_default.sessionTitleBtn,
								onClick: (event) => {
									event.stopPropagation();
									options.onOpenDetail(row.id);
								},
								children: row.title ?? t("s.noPrompt") + " · " + shortIdOf(row.id)
							}),
							row.archived && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: lists_module_css_default.archivedTag,
								children: t("s.archived")
							}),
							row.origin === "subagent" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: lists_module_css_default.subagentTagBtn,
								onClick: (event) => {
									event.stopPropagation();
									if (row.parentSessionId !== null && row.parentSessionId !== void 0) options.onFocusSession(row.parentSessionId);
								},
								children: "子代理"
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lists_module_css_default.listSub,
						children: [
							workspace === null ? t("s.noWorkspace") : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: lists_module_css_default.linkBtn,
								title: t("s.gotoProject") + workspace,
								onClick: (event) => {
									event.stopPropagation();
									options.onOpenProject(workspace);
								},
								children: workspace
							}),
							row.modelCount !== void 0 && row.modelCount > 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: lists_module_css_default.sessionMeta,
								children: [row.modelCount, " 个模型"]
							}),
							row.subagentCount !== void 0 && row.subagentCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: lists_module_css_default.sessionMetaBtn,
								title: t("s.focusChildren") + String(row.subagentCount) + t("s.focusChildrenTail"),
								onClick: (event) => {
									event.stopPropagation();
									options.onFocusSession(row.id);
								},
								children: [
									row.subagentCount,
									" 个子会话",
									row.subagentTokens !== void 0 && row.subagentTokens > 0 ? " · " + fmtTokens(row.subagentTokens) : ""
								]
							})
						]
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.providerLabel ?? displayNameOf(options.channels, row.provider ?? "") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: row.lastTime === null ? "—" : dayLabelOf(row.lastTime, options.nowMs) + " " + fmtTime(row.lastTime) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lists_module_css_default.listSub,
						children: [
							"时长 ",
							fmtDuration(durationOf(row)),
							row.crossDays >= 1 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: lists_module_css_default.crossDayTag,
								children: [
									"跨 ",
									row.crossDays,
									" 天"
								]
							})
						]
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: fmtTokens(row.tokens) }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: row.cacheHitRate === null ? "—" : row.cacheHitRate.toFixed(1) + "%" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
						onMouseEnter: (event) => options.tooltip.show(event, costTipOf(row)),
						onMouseMove: (event) => options.tooltip.show(event, costTipOf(row)),
						onMouseLeave: options.tooltip.hide,
						children: row.cost === null || channel === null || channel.costMode !== "perToken" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: shared_module_css_default.dim,
							children: costCell.text
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [costCell.text, costCell.amount && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostSourceChip, {
							source: row.costSource,
							partial: row.partial
						})] })
					})
				]
			}), isOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
				className: lists_module_css_default.composeCell,
				colSpan: 6,
				children: row.models.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shared_module_css_default.empty,
					children: t("empty.noUsage")
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: lists_module_css_default.composeRow + " " + lists_module_css_default.composeHead,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("m.model") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: lists_module_css_default.composeNumber,
							children: "Tokens"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: lists_module_css_default.composeNumber,
							children: t("m.share")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: lists_module_css_default.composeNumber,
							children: t("c.cost")
						})
					]
				}), row.models.map((model) => {
					const percent = model.sharePercent ?? 0;
					const modelCost = model.cost ?? null;
					const color = model.provider === "" ? "var(--dsw-alias-label-tertiary, #67676f)" : channelColorOf(options.channels, model.provider);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: lists_module_css_default.composeRow,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: lists_module_css_default.composeName,
								children: [model.model, model.provider !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: lists_module_css_default.composeChannel,
									children: model.providerLabel ?? displayNameOf(options.channels, model.provider)
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: lists_module_css_default.composeNumber,
								children: fmtTokens(model.tokens)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: lists_module_css_default.composeNumber,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: lists_module_css_default.listBar,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { style: {
											width: Math.max(2, percent) + "%",
											background: color
										} })
									}),
									" ",
									percent,
									"%"
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: lists_module_css_default.composeNumber,
								children: modelCost === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: shared_module_css_default.dim,
									children: "—"
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [moneyTotalsTextOf(model), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CostSourceChip, {
									source: model.costSource,
									partial: model.partial,
									compact: true
								})] })
							})
						]
					}, model.provider + "|" + model.model);
				})] })
			}) })] }, row.id);
		}
		/** 成本单元格的悬停说明：这一格钱是怎么来的（角标只写得下两个字）。 */
		function costTipOf(row) {
			const source = row.costSource ?? "none";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipTitle, { children: t("s.sessionCost") }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipSub, { children: costSourceHintOf(source, row.partial) }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TipRow, {
					label: t("s.amount"),
					amount: row.cost === null ? "—" : moneyTotalsTextOf(row),
					rate: t(COST_SOURCE_LABELS[source])
				})
			] });
		}
		function durationOf(row) {
			if (row.firstTime === null || row.lastTime === null) return 0;
			return Math.max(0, row.lastTime - row.firstTime);
		}
		/** 会话头通常不带标题，用 id 的短片段做可读标识。 */
		function shortIdOf(id) {
			return id.replace(/^session-/, "").slice(0, 8);
		}
		function dayLabelOf(timeMs, nowMs) {
			if (timeMs === null) return t("s.unknownDate");
			const dateKey = isoDate(new Date(timeMs));
			if (dateKey === isoDate(new Date(nowMs))) return t("r.today");
			if (dateKey === isoDate(/* @__PURE__ */ new Date(nowMs - 864e5))) return t("r.yesterday");
			return dateKey;
		}
		//#endregion
		//#region src/client/KeyUsageSection.tsx
		/** 「使用情况」页外壳：Tab 路由、筛选状态与取数（会话类数据切到对应 Tab 时才首次拉取）。 */
		const TABS = [
			["overview", "tab.overview"],
			["detail", "tab.detail"],
			["projects", "tab.projects"],
			["models", "tab.models"],
			["sessions", "tab.sessions"],
			["quota", "tab.quota"]
		];
		function KeyUsageSection() {
			const [activeTab, setActiveTab] = (0, react.useState)("overview");
			const [range, setRange] = (0, react.useState)("month");
			const [customFrom, setCustomFrom] = (0, react.useState)(() => shiftedIsoDate(-29));
			const [customTo, setCustomTo] = (0, react.useState)(() => isoDate(/* @__PURE__ */ new Date()));
			const [channelFilter, setChannelFilter] = (0, react.useState)("ALL");
			/** 跨 Tab 联动：从「会话用量」点工作目录进来时只看那一个项目（不做全局路由） */
			const [projectFilter, setProjectFilter] = (0, react.useState)(null);
			const [channels, setChannels] = (0, react.useState)([]);
			const [quotas, setQuotas] = (0, react.useState)([]);
			const [summary, setSummary] = (0, react.useState)(null);
			const [heatmap, setHeatmap] = (0, react.useState)([]);
			const [usage, setUsage] = (0, react.useState)(null);
			const [sessions, setSessions] = (0, react.useState)(null);
			const [projects, setProjects] = (0, react.useState)(null);
			const [models, setModels] = (0, react.useState)(null);
			const [pricing, setPricing] = (0, react.useState)(null);
			const [available, setAvailable] = (0, react.useState)(null);
			const [loading, setLoading] = (0, react.useState)(false);
			/** 价目版本号：点「刷新价目」后自增，用来让服务端重算成本并整体重取数据。 */
			const [pricingRevision, setPricingRevision] = (0, react.useState)(0);
			/** 配额执行结果：哪个通道这次查到实时值、展示值的时间与失败原因（界面据此标「本机快照 + 数据时间」）。 */
			const [quotaOutcome, setQuotaOutcome] = (0, react.useState)(null);
			/** 口径说明放进弹窗：内容可以写长，但不再占版面。 */
			const [showCaliber, setShowCaliber] = (0, react.useState)(false);
			const [showLog, setShowLog] = (0, react.useState)(false);
			/** 取词函数：宿主切语言时 useT 触发重渲染，文案跟着切 */
			const t = useT();
			const lastSnapshotAt = (0, react.useRef)(0);
			const tooltip = useTooltip();
			/** 汇率与显示币种放在模块级 store 里：任意 Tab 的金额都要按它折算，页脚也要显示来源。 */
			const currency = useCurrencyDisplay();
			/** 用户是否还在看默认范围（近 30 天 / 全部通道）：是才采用快照里的 usage，否则会覆盖他自己的选择。 */
			const usageIsDefaultRef = (0, react.useRef)(true);
			usageIsDefaultRef.current = range === "month" && channelFilter === "ALL";
			/** 把一份快照落到各 Tab 的状态上（快照是 6 个 Tab 的唯一数据来源）。 */
			const applySnapshot = (0, react.useCallback)((snapshot) => {
				const sections = snapshot.sections;
				setQuotaOutcome(snapshot.quotaOutcome);
				if (sections.channels !== null) setChannels(sections.channels.channels ?? []);
				if (sections.quota !== null) setQuotas(sections.quota.providers ?? []);
				setSummary(sections.overview);
				if (sections.heatmap !== null) setHeatmap(sections.heatmap.days ?? []);
				setSessions(sections.sessions);
				setProjects(sections.projects);
				setModels(sections.models);
				const usageSection = sections.usage;
				if (usageIsDefaultRef.current && usageSection !== null) {
					setUsage(usageSection);
					if (usageSection.availableFrom !== null && usageSection.availableTo !== null) setAvailable({
						from: usageSection.availableFrom,
						to: usageSection.availableTo
					});
				}
				lastSnapshotAt.current = Date.now();
			}, []);
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
				setHeatmap(heatmapResult ?? []);
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
					const snapshot = await loadSnapshot();
					if (cancelled) return;
					if (snapshot !== null) applySnapshot(snapshot);
					else await reloadFromEndpoints(false, false);
					if (!cancelled) setLoading(false);
				})();
				return () => {
					cancelled = true;
				};
			}, [applySnapshot, reloadFromEndpoints]);
			(0, react.useEffect)(() => {
				const pollMs = 3e5;
				const tick = () => {
					if (document.visibilityState === "hidden") return;
					if (Date.now() - lastSnapshotAt.current < pollMs) return;
					loadSnapshot().then((snapshot) => {
						if (snapshot !== null) applySnapshot(snapshot);
					});
				};
				const timer = setInterval(tick, pollMs);
				document.addEventListener("visibilitychange", tick);
				return () => {
					clearInterval(timer);
					document.removeEventListener("visibilitychange", tick);
				};
			}, [applySnapshot]);
			(0, react.useEffect)(() => {
				let cancelled = false;
				loadPricing().then((result) => {
					if (!cancelled) setPricing(result);
				});
				return () => {
					cancelled = true;
				};
			}, [pricingRevision]);
			(0, react.useEffect)(() => {
				if (pricingRevision === 0) return;
				refreshAll().then((snapshot) => {
					if (snapshot !== null) applySnapshot(snapshot);
				});
			}, [pricingRevision, applySnapshot]);
			(0, react.useEffect)(() => {
				if (activeTab === "sessions" && sessions === null) loadSessions().then(setSessions);
				if (activeTab === "projects" && projects === null) loadProjects().then(setProjects);
				if (activeTab === "models" && models === null) loadModels().then(setModels);
			}, [
				activeTab,
				sessions,
				projects,
				models
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
			(0, react.useEffect)(() => {
				let cancelled = false;
				loadUsage(bounds.from, bounds.to, channelFilter).then((result) => {
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
				bounds.from,
				bounds.to,
				channelFilter,
				pricingRevision
			]);
			const refresh = (0, react.useCallback)(() => {
				setLoading(true);
				(async () => {
					const snapshot = await refreshAll();
					if (snapshot !== null) applySnapshot(snapshot);
					else await reloadFromEndpoints(sessions !== null || projects !== null || models !== null, true);
					const usageResult = await loadUsage(bounds.from, bounds.to, channelFilter);
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
				channelFilter
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shared_module_css_default.section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: shared_module_css_default.title,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("app.title") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: shared_module_css_default.titleActions,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									size: "sm",
									ariaLabel: t("log.title"),
									title: t("log.title"),
									onClick: () => setShowLog(true),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
										viewBox: "0 0 16 16",
										width: "15",
										height: "15",
										"aria-hidden": "true",
										focusable: "false",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												x: "1.6",
												y: "2.2",
												width: "12.8",
												height: "11.6",
												rx: "2",
												fill: "none",
												stroke: "currentColor",
												strokeWidth: "1.3"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												x: "3.6",
												y: "4.6",
												width: "5.2",
												height: "1.4",
												rx: "0.7",
												fill: "currentColor"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												x: "3.6",
												y: "7.4",
												width: "8.8",
												height: "1.4",
												rx: "0.7",
												fill: "currentColor"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												x: "3.6",
												y: "10.2",
												width: "6.6",
												height: "1.4",
												rx: "0.7",
												fill: "currentColor"
											})
										]
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									size: "sm",
									onClick: () => setShowCaliber(true),
									ariaLabel: t("action.caliber"),
									title: t("action.caliber"),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
										viewBox: "0 0 16 16",
										width: "15",
										height: "15",
										"aria-hidden": "true",
										focusable: "false",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
												cx: "8",
												cy: "8",
												r: "6.6",
												fill: "none",
												stroke: "currentColor",
												strokeWidth: "1.3"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
												cx: "8",
												cy: "4.9",
												r: "0.85",
												fill: "currentColor"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												x: "7.15",
												y: "6.9",
												width: "1.7",
												height: "5",
												rx: "0.85",
												fill: "currentColor"
											})
										]
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
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									className: shared_module_css_default.refreshBtn,
									disabled: loading,
									onClick: refresh,
									"aria-label": loading ? t("action.refreshing") : t("action.refresh"),
									"aria-busy": loading,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: loading ? shared_module_css_default.refreshIconSpin : shared_module_css_default.refreshIcon,
										"aria-hidden": "true",
										children: "↻"
									})
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shared_module_css_default.tabBar,
						children: TABS.map(([tabId, labelKey]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: activeTab === tabId ? shared_module_css_default.active : "",
							onClick: () => setActiveTab(tabId),
							children: t(labelKey)
						}, tabId))
					}),
					activeTab === "overview" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewTab, {
						channels,
						summary,
						quotas,
						heatmap,
						tooltip,
						onOpenDetail: (provider) => {
							setChannelFilter(provider);
							setActiveTab("detail");
						}
					}),
					activeTab === "detail" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailTab, {
						usage,
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
						pricingRevision
					}),
					activeTab === "projects" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProjectsTab, {
						data: projects,
						channels,
						focusWorkspace: projectFilter,
						onClearFocus: () => setProjectFilter(null)
					}),
					activeTab === "models" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelsTab, {
						data: models,
						channels
					}),
					activeTab === "sessions" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionsTab, {
						data: sessions,
						channels,
						tooltip,
						onOpenProject: (workspace) => {
							setProjectFilter(workspace);
							setActiveTab("projects");
						}
					}),
					activeTab === "quota" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QuotaTab, {
						channels,
						quotas,
						pricing,
						quotaOutcome,
						reloadToken: pricingRevision,
						onPricingReload: () => setPricingRevision((previous) => previous + 1)
					}),
					showCaliber && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Dialog, {
						title: t("caliber.title"),
						closeLabel: t("action.close"),
						onClose: () => setShowCaliber(false),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: shared_module_css_default.caliberVersion,
							children: t("caliber.version", { version: "0.1.7" })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", {
							className: shared_module_css_default.footnoteList,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("caliber.source", { days: summary !== null && summary.todaySource === "session" ? t("caliber.sourceDays", { count: summary.sessionDates.length }) : "" }) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("caliber.cost") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("caliber.currency", { fx: currency.fx === null ? t("caliber.fxMissing") : fxSummaryTextOf(currency.fx) }) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: t("caliber.refresh") })
							]
						})]
					}),
					showLog && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Dialog, {
						title: t("log.title"),
						closeLabel: t("action.close"),
						onClose: () => setShowLog(false),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LogPanel, {})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TooltipView, { tooltip: tooltip.tooltip })
				]
			});
		}
		/** 系统日志面板：内存日志（不落盘），出问题时能看见原因。 */
		function LogPanel() {
			const [entries, setEntries] = (0, react.useState)(logEntries);
			(0, react.useEffect)(() => subscribeLog(() => setEntries(logEntries())), []);
			if (entries.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shared_module_css_default.logEmpty,
				children: "—"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shared_module_css_default.logActions,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					size: "sm",
					onClick: () => {
						navigator.clipboard?.writeText(logText());
					},
					children: t("log.copy")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					size: "sm",
					onClick: () => {
						clearLog();
					},
					children: t("log.clear")
				})]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
				className: shared_module_css_default.logList,
				children: [...entries].reverse().map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
					className: shared_module_css_default.logRow,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: shared_module_css_default.logTime,
							children: new Date(entry.time).toLocaleTimeString("zh-CN", { hour12: false })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: shared_module_css_default.logLevel + " " + (entry.level === "error" ? shared_module_css_default.logError : entry.level === "warn" ? shared_module_css_default.logWarn : ""),
							children: entry.level
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: shared_module_css_default.logSource,
							children: entry.source
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: shared_module_css_default.logMessage,
							children: entry.message
						})
					]
				}, entry.id))
			})] });
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
		/** 宿主会传入根作用域的标准 kit 与绑定的 `t`；本页面当前不需要它们。 */
		function UsagePage(_props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: page_module_css_default.page,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: page_module_css_default.inner,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KeyUsageSection, {})
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
			ctx.slots.inject("main", () => ctx.slots.register({
				name: "main",
				key: PANEL_ID
			}, UsagePage));
			ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
				name: "sidebar.panellist",
				id: PANEL_ID,
				order: 30,
				label: () => t("nav.usage")
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