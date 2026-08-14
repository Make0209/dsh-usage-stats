// dsh-usage-stats 插件 Client 半（永久版，浏览器 bundle）
// 客户端模块工厂格式：window.__ModuleLoader__.load({ id, factory })
window.__ModuleLoader__.load({
  id: "dsh-usage-stats",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");

    function pad2(n) {
      return String(n).padStart(2, '0')
    }
    function fmtDate(d) {
      return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
    }
    function trim1(v) {
      return String(Math.round(v * 10) / 10)
    }
    function fmtCompact(n) {
      if (typeof n !== 'number' || !Number.isFinite(n)) return '0'
      if (n < 1000) return String(n)
      if (n < 1000000) return trim1(n / 1000) + 'k'
      if (n < 1000000000) return trim1(n / 1000000) + 'M'
      return trim1(n / 1000000000) + 'B'
    }
    function rateOf(input, cacheRead) {
      const denom = input + cacheRead
      if (denom <= 0) return 0
      return (cacheRead / denom) * 100
    }
    function money(currency, n) {
      if (n === null || n === undefined) return '—'
      const sym = currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : currency + ' '
      return sym + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    function humanDate(date) {
      const parts = date.split('-')
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
      return parts[0] + '年' + Number(parts[1]) + '月' + Number(parts[2]) + '日 ' + week
    }
    function levelOf(count) {
      if (count >= 10) return 4
      if (count >= 6) return 3
      if (count >= 3) return 2
      if (count >= 1) return 1
      return 0
    }
    const GH_GREEN = '#2ea043'
    const LEVEL_PCT = [20, 45, 70, 96]
    function cellBg(level) {
      if (level <= 0) return 'var(--dsw-alias-bg-layer-2)'
      return 'color-mix(in srgb, ' + GH_GREEN + ' ' + LEVEL_PCT[level - 1] + '%, var(--dsw-alias-bg-layer-2))'
    }
    function wsColor(i) {
      return 'hsl(' + ((i * 137) % 360) + ', 70%, 55%)'
    }
    function rangeAgg(stats, range) {
      if (stats === null) return { totals: { turns: 0, sessions: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }, perWs: [] }
      if (range === 'all') return { totals: stats.totals, perWs: stats.perWorkspace }
      let cutoff
      if (range === '30d') cutoff = fmtDate(new Date(Date.now() - 29 * 86400000))
      else cutoff = fmtDate(new Date(Date.now() - 89 * 86400000))
      const t = { turns: 0, sessions: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }
      const per = new Map()
      for (const day of stats.byDay) {
        if (day.date < cutoff) continue
        t.turns += day.turns
        t.input += day.tokens.input
        t.output += day.tokens.output
        t.cacheRead += day.tokens.cacheRead
        t.cacheWrite += day.tokens.cacheWrite
        t.reasoning += day.tokens.reasoning
        for (const w of day.byWorkspace) {
          let p = per.get(w.workspaceId)
          if (p === undefined) { p = { workspaceId: w.workspaceId, turns: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }; per.set(w.workspaceId, p) }
          p.input += w.input
          p.output += w.output
          p.cacheRead += w.cacheRead
          p.cacheWrite += w.cacheWrite
          p.reasoning += w.reasoning
        }
        for (const w of day.perWorkspace) {
          let p = per.get(w.workspaceId)
          if (p === undefined) { p = { workspaceId: w.workspaceId, turns: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }; per.set(w.workspaceId, p) }
          p.turns += w.turns
        }
      }
      return { totals: t, perWs: Array.from(per.values()) }
    }
    function streaks(dayMap) {
      const today = new Date()
      let streak = 0
      for (let i = 0; i < 371; i++) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
        const day = dayMap.get(fmtDate(d))
        const active = day !== undefined && day.turns > 0
        if (active) streak += 1
        else if (i > 0) break
      }
      let best = 0
      let run = 0
      for (let i = 0; i < 371; i++) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
        const day = dayMap.get(fmtDate(d))
        if (day !== undefined && day.turns > 0) {
          run += 1
          if (run > best) best = run
        } else {
          run = 0
        }
      }
      return { streak, best }
    }
    // 数字滚动动画：首次从 0 滚动到目标值，之后直接同步目标值
    function useCountUp(target, timer) {
      const [state, setState] = React.useState({ value: 0, done: false })
      React.useEffect(() => {
        if (typeof target !== 'number' || !Number.isFinite(target) || target <= 0) {
          setState({ value: 0, done: false })
          return undefined
        }
        if (state.done) {
          setState({ value: target, done: true })
          return undefined
        }
        const start = Date.now()
        const duration = 700
        const stop = timer.interval(() => {
          const t = Math.min(1, (Date.now() - start) / duration)
          const eased = 1 - Math.pow(1 - t, 3)
          if (t >= 1) {
            stop()
            setState({ value: target, done: true })
          } else {
            setState({ value: Math.round(target * eased), done: false })
          }
        }, 32)
        return stop
      }, [target])
      return state.value
    }

    const CSS = `
.uh-page { display:flex; flex-direction:column; gap:14px; padding:2px 2px 28px; font-family:inherit; }
.uh-head { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.uh-title { margin:0; font-size:15px; font-weight:600; color:var(--dsw-alias-label-primary); }
.uh-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.uh-range { display:inline-flex; border:1px solid var(--dsw-alias-border-l2); border-radius:8px; overflow:hidden; }
.uh-range button { border:0; background:transparent; color:var(--dsw-alias-label-secondary); padding:4px 12px; font-size:12px; cursor:pointer; font-family:inherit; transition:background-color .15s ease, color .15s ease; }
.uh-range button + button { border-left:1px solid var(--dsw-alias-border-l2); }
.uh-range button.uh-on { background:color-mix(in srgb, var(--dsw-alias-brand-primary) 20%, var(--dsw-alias-bg-layer-2)); color:var(--dsw-alias-label-primary); font-weight:600; }
.uh-refresh { border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-layer-1); color:var(--dsw-alias-label-primary); border-radius:8px; padding:4px 12px; font-size:12px; cursor:pointer; font-family:inherit; transition:border-color .15s ease, color .15s ease, transform .1s ease; }
.uh-refresh:hover { border-color:var(--dsw-alias-brand-primary); }
.uh-refresh:active, .uh-chip:active, .uh-range button:active { transform:scale(.96); }
.uh-alias-panel-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; font-size:13px; font-weight:600; color:var(--dsw-alias-label-primary); }
.uh-alias-close { border:0; background:transparent; color:var(--dsw-alias-label-secondary); font-size:12px; cursor:pointer; font-family:inherit; padding:0; transition:color .15s ease; }
.uh-alias-close:hover { color:var(--dsw-alias-brand-primary); }
.uh-alias-list { display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr)); gap:8px 16px; max-height:240px; overflow-y:auto; }
.uh-alias-item { display:flex; align-items:center; gap:8px; min-width:0; }
.uh-alias-folder { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; color:var(--dsw-alias-label-secondary); }
.uh-alias-input { flex:none; width:150px; border:1px solid var(--dsw-alias-border-l2); background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-primary); border-radius:6px; padding:3px 8px; font-size:12px; font-family:inherit; outline:none; transition:border-color .15s ease; }
.uh-alias-input:focus { border-color:var(--dsw-alias-brand-primary); }
.uh-alias-panel-foot { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:10px; padding-top:10px; border-top:1px solid var(--dsw-alias-border-l1); }
.uh-alias-ok { border:1px solid var(--dsw-alias-brand-primary); background:color-mix(in srgb, var(--dsw-alias-brand-primary) 16%, transparent); color:var(--dsw-alias-label-primary); border-radius:6px; font-size:12px; padding:3px 12px; cursor:pointer; font-family:inherit; flex:none; transition:transform .1s ease; }
.uh-alias-ok:active { transform:scale(.96); }
.uh-anim-panel { animation:uh-panel-in .28s ease both; }
.uh-progress { font-size:12px; color:var(--dsw-alias-label-secondary); display:flex; align-items:center; gap:10px; }
.uh-bar { flex:1; height:6px; border-radius:3px; background:var(--dsw-alias-bg-layer-2); overflow:hidden; max-width:340px; }
.uh-fill { height:100%; background:var(--dsw-alias-brand-primary); border-radius:3px; transition:width .3s ease; }
.uh-cards { display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; }
.uh-card { background:var(--dsw-alias-bg-layer-1); border:1px solid var(--dsw-alias-border-l1); border-radius:12px; padding:12px 14px; display:flex; flex-direction:column; gap:6px; min-height:86px; animation:uh-card-in .45s ease both; transition:transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
.uh-card:hover { transform:translateY(-2px); border-color:var(--dsw-alias-border-l2); box-shadow:0 6px 18px rgba(0,0,0,.10); }
.uh-card-label { font-size:12px; color:var(--dsw-alias-label-secondary); }
.uh-card-value { font-size:20px; font-weight:650; color:var(--dsw-alias-label-primary); line-height:1.2; }
.uh-card-sub { font-size:11px; color:var(--dsw-alias-label-secondary); line-height:1.55; }
.uh-wsbars { display:flex; flex-direction:column; gap:6px; margin-top:2px; }
.uh-wsbar { display:flex; flex-direction:column; gap:3px; cursor:pointer; padding:2px 6px; margin:0 -6px; border-radius:8px; transition:background-color .15s ease; }
.uh-wsbar:hover { background:var(--dsw-alias-bg-layer-2); }
.uh-wsbar.uh-sel { outline:1px solid var(--dsw-alias-brand-primary); }
.uh-wsbar-top { display:flex; align-items:center; gap:6px; min-width:0; }
.uh-wsbar-title { font-size:12px; color:var(--dsw-alias-label-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0; }
.uh-wsbar-num { font-size:11px; font-variant-numeric:tabular-nums; color:var(--dsw-alias-label-secondary); flex:none; }
.uh-panel { background:var(--dsw-alias-bg-layer-1); border:1px solid var(--dsw-alias-border-l1); border-radius:12px; padding:14px; }
.uh-hm-head { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:10px; }
.uh-chips { display:flex; flex-wrap:wrap; gap:6px; }
.uh-chip { display:inline-flex; align-items:center; gap:6px; border:1px solid var(--dsw-alias-border-l2); background:transparent; color:var(--dsw-alias-label-primary); border-radius:999px; padding:2px 10px; font-size:11px; cursor:pointer; font-family:inherit; max-width:190px; transition:border-color .15s ease, background-color .15s ease, color .15s ease, transform .1s ease; }
.uh-chip .uh-chip-title { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.uh-chip.uh-on { border-color:var(--dsw-alias-brand-primary); background:color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent); }
.uh-dot { width:8px; height:8px; border-radius:50%; flex:none; }
.uh-legend { display:flex; align-items:center; gap:4px; font-size:11px; color:var(--dsw-alias-label-secondary); }
.uh-legend .uh-cell { width:10px; height:10px; border-radius:2px; animation:none; }
.uh-hm-scroll { overflow-x:auto; padding-bottom:2px; }
.uh-months { position:relative; height:16px; margin-left:30px; width:686px; font-size:10px; color:var(--dsw-alias-label-secondary); }
.uh-months span { position:absolute; top:0; }
.uh-hm-body { display:flex; gap:6px; min-width:720px; }
.uh-wdays { display:grid; grid-template-rows:repeat(7,10px); gap:3px; font-size:10px; color:var(--dsw-alias-label-secondary); text-align:right; width:24px; }
.uh-wdays span { line-height:10px; }
.uh-grid { display:grid; grid-auto-flow:column; grid-template-rows:repeat(7,10px); gap:3px; }
.uh-cell { width:10px; height:10px; border-radius:2px; background:var(--dsw-alias-bg-layer-2); animation:uh-cell-in .45s ease both; transition:transform .12s ease, box-shadow .12s ease; }
.uh-cell:hover { transform:scale(1.35); box-shadow:0 1px 6px rgba(0,0,0,.28); position:relative; z-index:2; }
.uh-tip { position:fixed; z-index:1200; background:var(--dsw-alias-bg-overlay); border:1px solid var(--dsw-alias-border-l2); border-radius:10px; padding:10px 12px; box-shadow:0 8px 24px rgba(0,0,0,.18); pointer-events:auto; min-width:200px; max-width:290px; animation:uh-tip-in .16s ease both; }
.uh-tip-date { font-size:12px; font-weight:600; color:var(--dsw-alias-label-primary); margin-bottom:6px; }
.uh-tip-row { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--dsw-alias-label-primary); padding:3px 6px; margin:0 -6px; border-radius:6px; cursor:pointer; transition:background-color .12s ease; }
.uh-tip-row:hover { background:color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent); }
.uh-tip-row .uh-n { margin-left:auto; font-variant-numeric:tabular-nums; color:var(--dsw-alias-label-secondary); }
.uh-tip-tokens { font-size:11px; color:var(--dsw-alias-label-secondary); margin-top:6px; border-top:1px solid var(--dsw-alias-border-l1); padding-top:6px; }
.uh-tbl-title { font-size:13px; font-weight:600; color:var(--dsw-alias-label-primary); margin:0 0 10px; }
.uh-tbl-scroll { overflow-x:auto; }
.uh-hrow, .uh-row { display:grid; grid-template-columns:minmax(160px,2.2fr) .7fr .9fr .9fr .9fr .9fr 1.1fr .8fr 1fr; gap:8px; align-items:center; min-width:780px; padding:7px 10px; border-radius:8px; font-size:12px; }
.uh-hrow { color:var(--dsw-alias-label-secondary); font-size:11px; }
.uh-row { cursor:pointer; border:1px solid transparent; transition:background-color .15s ease, border-color .15s ease; }
.uh-row:hover { background:var(--dsw-alias-bg-layer-2); }
.uh-row.uh-sel { border-color:var(--dsw-alias-brand-primary); }
.uh-num { text-align:right; font-variant-numeric:tabular-nums; color:var(--dsw-alias-label-primary); }
.uh-hrow .uh-num { color:var(--dsw-alias-label-secondary); }
.uh-ws-title { color:var(--dsw-alias-label-primary); font-weight:550; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.uh-ws-path { color:var(--dsw-alias-label-secondary); font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.uh-barwrap { height:5px; border-radius:3px; background:var(--dsw-alias-bg-layer-2); overflow:hidden; margin-top:3px; }
.uh-barwrap.uh-bar-thin { height:3px; margin-top:1px; }
.uh-barfill { height:100%; border-radius:3px; transform-origin:left center; animation:uh-bar-grow .7s cubic-bezier(.22,.61,.36,1) both; transition:width .5s cubic-bezier(.22,.61,.36,1); }
.uh-empty { color:var(--dsw-alias-label-secondary); font-size:12px; text-align:center; padding:26px 0; }
.uh-note { font-size:11px; color:var(--dsw-alias-label-secondary); line-height:1.6; }
@keyframes uh-cell-in { from { opacity:0; transform:scale(.4); } to { opacity:1; transform:scale(1); } }
@keyframes uh-glow { 0% { box-shadow:0 0 0 0 rgba(46,160,67,.5); } 70% { box-shadow:0 0 0 5px rgba(46,160,67,0); } 100% { box-shadow:0 0 0 0 rgba(46,160,67,0); } }
@keyframes uh-card-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
@keyframes uh-bar-grow { from { transform:scaleX(0); } to { transform:scaleX(1); } }
@keyframes uh-panel-in { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
@keyframes uh-tip-in { from { opacity:0; } to { opacity:1; } }
@media (prefers-reduced-motion: reduce) {
  .uh-cell, .uh-card, .uh-barfill, .uh-anim-panel, .uh-tip { animation:none !important; }
  .uh-card, .uh-cell, .uh-barfill, .uh-fill, .uh-refresh, .uh-chip, .uh-row, .uh-tip-row { transition:none !important; }
}
`
    const cssTagId = "dsh-usage-stats/styles.css"
    if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(cssTagId) + "]") === null) {
      const tag = document.createElement("style")
      tag.dataset.plugin = "dsh-usage-stats"
      tag.dataset.pluginCss = cssTagId
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    // 与 Host 半的数据接口（webServer 路由）
    const getStats = () => fetch('/api/usage-stats', { headers: { accept: 'application/json' } }).then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return r.json()
    })
    const getBalance = (force) => fetch('/api/usage-stats/balance' + (force ? '?force=1' : ''), { headers: { accept: 'application/json' } }).then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return r.json()
    })
    const setAliasRpc = (workspaceId, alias) => fetch('/api/usage-stats/alias', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workspaceId, alias }),
    }).then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return r.json()
    })

    function UsagePage(props) {
      const timer = props.timerCtx
      const [stats, setStats] = React.useState(null)
      const [balance, setBalance] = React.useState(null)
      const [range, setRange] = React.useState('90d')
      const [wsFilter, setWsFilter] = React.useState(null)
      const [hover, setHover] = React.useState(null)
      const [aliasOpen, setAliasOpen] = React.useState(false)
      const [aliasDrafts, setAliasDrafts] = React.useState({})

      React.useEffect(() => {
        let alive = true
        let scanDone = false
        const refreshStats = () => {
          getStats().then((data) => {
            if (!alive) return
            if (data && data.scan) scanDone = !!data.scan.done
            setStats(data)
          }, () => {})
        }
        const refreshBalance = () => {
          getBalance(false).then((data) => {
            if (alive && data) setBalance(data)
          }, () => {})
        }
        refreshStats()
        refreshBalance()
        const fast = timer.interval(() => { if (!scanDone) refreshStats() }, 2000)
        const slow = timer.interval(() => { if (scanDone) refreshStats() }, 15000)
        const bal = timer.interval(() => { refreshBalance() }, 60000)
        return () => { alive = false; fast(); slow(); bal() }
      }, [])

      const onRefresh = () => {
        getStats().then((d) => { if (d) setStats(d) }, () => {})
        getBalance(true).then((d) => { if (d) setBalance(d) }, () => {})
      }
      const toggleFilter = (id) => {
        setWsFilter((prev) => (prev === id ? null : id))
      }

      const agg = rangeAgg(stats, range)
      const animatedTotal = useCountUp(agg.totals.input + agg.totals.output + agg.totals.cacheRead + agg.totals.cacheWrite + agg.totals.reasoning, timer)
      const animatedRate = useCountUp(Math.round(rateOf(agg.totals.input, agg.totals.cacheRead) * 10), timer)
      const animatedTurns = useCountUp(agg.totals.turns, timer)

      if (stats === null) {
        return React.createElement('div', { className: 'uh-page' },
          React.createElement('div', { className: 'uh-panel' }, React.createElement('div', { className: 'uh-empty' }, '正在加载用量统计…')),
        )
      }

      const scan = stats.scan || { done: true, started: true, scanned: 0, total: 0, failed: 0 }
      const workspaces = Array.isArray(stats.workspaces) ? stats.workspaces : []
      const aliases = stats.aliases && typeof stats.aliases === 'object' ? stats.aliases : {}
      const wsById = new Map()
      const wsIndex = new Map()
      workspaces.forEach((w, i) => { wsById.set(w.id, w); wsIndex.set(w.id, i) })
      const dayMap = new Map()
      for (const d of stats.byDay) dayMap.set(d.date, d)
      const wsTitle = (id) => {
        const alias = aliases[id]
        if (typeof alias === 'string' && alias !== '') return alias
        const meta = wsById.get(id)
        return meta ? meta.title : '未知工作区'
      }

      const saveAlias = (wsId, value) => {
        setAliasRpc(wsId, String(value === undefined ? '' : value).trim()).then((res) => {
          if (res && res.ok && res.aliases) {
            setStats((prev) => (prev === null ? prev : Object.assign({}, prev, { aliases: res.aliases })))
          }
        }, () => {})
      }
      const openAliasPanel = () => {
        const drafts = {}
        workspaces.forEach((w) => { drafts[w.id] = typeof aliases[w.id] === 'string' ? aliases[w.id] : '' })
        setAliasDrafts(drafts)
        setAliasOpen(true)
      }
      const saveAllAliases = () => {
        for (const id of Object.keys(aliasDrafts)) {
          const current = typeof aliases[id] === 'string' ? aliases[id] : ''
          if (aliasDrafts[id] !== current) saveAlias(id, aliasDrafts[id])
        }
        setAliasOpen(false)
      }

      const totalTokens = agg.totals.input + agg.totals.output + agg.totals.cacheRead + agg.totals.cacheWrite + agg.totals.reasoning
      const cacheRate = rateOf(agg.totals.input, agg.totals.cacheRead)
      const st = streaks(dayMap)

      const today = new Date()
      const todayKey = fmtDate(today)
      const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())
      const start = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() - 52 * 7)
      const cells = []
      for (let i = 0; i < 53 * 7; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
        cells.push({ date: fmtDate(d), month: d.getMonth(), year: d.getFullYear() })
      }
      const monthLabels = []
      for (let j = 0; j < 53; j++) {
        const first = cells[j * 7]
        const prev = j > 0 ? cells[(j - 1) * 7] : null
        if (prev === null || first.month !== prev.month) {
          monthLabels.push({ left: j * 13, text: first.month === 0 ? first.year + '年1月' : (first.month + 1) + '月' })
        }
      }
      const weekdayLabels = ['', '周一', '', '周三', '', '周五', '']

      const onEnter = (cell, ev) => {
        setHover({ date: cell.date, x: ev.clientX, y: ev.clientY, day: dayMap.get(cell.date) })
      }
      const onMove = (cell, ev) => {
        setHover((prev) => (prev !== null && prev.date === cell.date ? { date: prev.date, x: ev.clientX, y: ev.clientY, day: prev.day } : prev))
      }
      const onLeave = () => setHover(null)

      const cellElements = cells.map((cell, i) => {
        const day = dayMap.get(cell.date)
        let count = 0
        if (day !== undefined) {
          if (wsFilter === null) count = day.turns
          else {
            const w = day.perWorkspace.find((x) => x.workspaceId === wsFilter)
            if (w !== undefined) count = w.turns
          }
        }
        const level = levelOf(count)
        const dim = wsFilter !== null && day !== undefined && day.turns > 0 && count === 0
        const isToday = cell.date === todayKey
        const style = {
          background: cellBg(level),
          opacity: dim ? 0.22 : 1,
          animationDelay: (i * 1.2) + 'ms',
        }
        if (isToday) style.animation = 'uh-cell-in .45s ease both, uh-glow 3s ease-in-out .7s infinite'
        return React.createElement('div', {
          key: cell.date,
          className: 'uh-cell',
          style,
          onMouseEnter: (ev) => onEnter(cell, ev),
          onMouseMove: (ev) => onMove(cell, ev),
          onMouseLeave: onLeave,
        })
      })

      let balanceValue = '—'
      let balanceSub = '查询中…'
      if (balance !== null && balance !== undefined) {
        if (balance.status === 'missing-key') {
          balanceValue = '未配置'
          balanceSub = '在 设置 → 模型 中填写 DeepSeek API Key 后可见'
        } else if (balance.status === 'unavailable') {
          balanceValue = '不可用'
          balanceSub = balance.message || 'DeepSeek 接口返回余额不可用'
        } else if (balance.status === 'error') {
          balanceValue = '查询失败'
          const detail = balance.detail ? '（' + String(balance.detail).slice(0, 90) + '）' : ''
          balanceSub = (balance.message || '') + detail + ' 点“刷新”重试'
        } else if (balance.status === 'ok' && Array.isArray(balance.currencies) && balance.currencies.length > 0) {
          const list = balance.currencies
          const primary = list.find((c) => c.currency === 'CNY') || list[0]
          const others = list.filter((c) => c !== primary)
          balanceValue = money(primary.currency, primary.total)
          let sub = primary.total !== null ? '赠送 ' + money(primary.currency, primary.granted) + ' · 充值 ' + money(primary.currency, primary.toppedUp) : ''
          if (others.length > 0) sub += (sub ? ' ｜ ' : '') + others.map((c) => money(c.currency, c.total)).join(' ')
          balanceSub = sub
        } else {
          balanceValue = '无数据'
          balanceSub = ''
        }
      }

      const card = (label, value, sub, delay) => React.createElement('div', { className: 'uh-card', style: { animationDelay: (delay * 70) + 'ms' } },
        React.createElement('div', { className: 'uh-card-label' }, label),
        React.createElement('div', { className: 'uh-card-value' }, value),
        React.createElement('div', { className: 'uh-card-sub' }, sub),
      )

      const wsTotal = (w) => w.input + w.output + w.cacheRead + w.cacheWrite + w.reasoning
      const rows = agg.perWs.slice().sort((a, b) => wsTotal(b) - wsTotal(a))
      const maxTotal = rows.length > 0 ? wsTotal(rows[0]) : 0

      const tokenCardRows = rows.slice(0, 3).map((w) => {
        const total = wsTotal(w)
        const idx = wsIndex.get(w.workspaceId)
        const color = wsColor(idx === undefined ? 0 : idx)
        const selected = wsFilter === w.workspaceId
        return React.createElement('div', {
          key: w.workspaceId,
          className: 'uh-wsbar' + (selected ? ' uh-sel' : ''),
          onClick: () => toggleFilter(w.workspaceId),
        },
          React.createElement('div', { className: 'uh-wsbar-top' },
            React.createElement('span', { className: 'uh-dot', style: { background: color } }),
            React.createElement('span', { className: 'uh-wsbar-title' }, wsTitle(w.workspaceId)),
            React.createElement('span', { className: 'uh-wsbar-num' }, fmtCompact(total)),
          ),
          React.createElement('div', { className: 'uh-barwrap uh-bar-thin' },
            React.createElement('div', { className: 'uh-barfill', style: { width: maxTotal > 0 ? Math.max(2, (total / maxTotal) * 100) + '%' : '0%', background: color } }),
          ),
        )
      })
      const tokenCard = React.createElement('div', { className: 'uh-card', style: { animationDelay: '210ms' } },
        React.createElement('div', { className: 'uh-card-label' }, '各工作区 Token 花费'),
        rows.length === 0
          ? React.createElement('div', { className: 'uh-empty', style: { padding: '8px 0' } }, '暂无数据')
          : React.createElement('div', { className: 'uh-wsbars' },
            tokenCardRows,
            rows.length > 3 ? React.createElement('div', { className: 'uh-card-sub' }, '其余 ' + (rows.length - 3) + ' 个工作区见明细表') : null,
          ),
      )

      const rowElements = rows.map((w) => {
        const meta = wsById.get(w.workspaceId)
        const alias = typeof aliases[w.workspaceId] === 'string' ? aliases[w.workspaceId] : ''
        const folderTitle = meta ? meta.title : '未知工作区'
        const path = meta ? meta.path : ''
        const title = alias !== '' ? alias : folderTitle
        const subText = alias !== '' ? folderTitle + ' · ' + path : path
        const total = wsTotal(w)
        const rate = rateOf(w.input, w.cacheRead)
        const idx = wsIndex.get(w.workspaceId)
        const color = wsColor(idx === undefined ? 0 : idx)
        const selected = wsFilter === w.workspaceId
        return React.createElement('div', {
          key: w.workspaceId,
          className: 'uh-row' + (selected ? ' uh-sel' : ''),
          onClick: () => toggleFilter(w.workspaceId),
        },
          React.createElement('div', {},
            React.createElement('div', { className: 'uh-ws-title' }, title),
            React.createElement('div', { className: 'uh-ws-path' }, subText),
          ),
          React.createElement('div', { className: 'uh-num' }, fmtCompact(w.turns)),
          React.createElement('div', { className: 'uh-num' }, fmtCompact(w.input)),
          React.createElement('div', { className: 'uh-num' }, fmtCompact(w.cacheRead)),
          React.createElement('div', { className: 'uh-num' }, fmtCompact(w.output)),
          React.createElement('div', { className: 'uh-num' }, fmtCompact(w.reasoning)),
          React.createElement('div', {},
            React.createElement('div', { className: 'uh-num' }, fmtCompact(total)),
            React.createElement('div', { className: 'uh-barwrap' },
              React.createElement('div', { className: 'uh-barfill', style: { width: maxTotal > 0 ? Math.max(2, (total / maxTotal) * 100) + '%' : '0%', background: color } }),
            ),
          ),
          React.createElement('div', { className: 'uh-num' }, rate.toFixed(1) + '%'),
          React.createElement('div', { className: 'uh-num' }, maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(0) + '%' : '0%'),
        )
      })

      const aliasPanel = aliasOpen
        ? React.createElement('div', { className: 'uh-panel uh-anim-panel' },
          React.createElement('div', { className: 'uh-alias-panel-head' },
            React.createElement('span', {}, '工作区别名'),
            React.createElement('button', { className: 'uh-alias-close', onClick: () => setAliasOpen(false) }, '关闭'),
          ),
          workspaces.length === 0
            ? React.createElement('div', { className: 'uh-empty', style: { padding: '10px 0' } }, '暂无工作区')
            : React.createElement('div', { className: 'uh-alias-list' },
              workspaces.map((w, i) => React.createElement('div', { key: w.id, className: 'uh-alias-item' },
                React.createElement('span', { className: 'uh-dot', style: { background: wsColor(i) } }),
                React.createElement('span', { className: 'uh-alias-folder', title: w.path }, w.title || w.path),
                React.createElement('input', {
                  className: 'uh-alias-input',
                  value: aliasDrafts[w.id] !== undefined ? aliasDrafts[w.id] : '',
                  placeholder: '项目别名',
                  onChange: (e) => setAliasDrafts((prev) => Object.assign({}, prev, { [w.id]: e.target.value })),
                  onKeyDown: (e) => { if (e.key === 'Enter') saveAlias(w.id, e.target.value) },
                }),
              )),
            ),
          React.createElement('div', { className: 'uh-alias-panel-foot' },
            React.createElement('span', { className: 'uh-note' }, '回车保存单个；清空别名还原文件夹名'),
            React.createElement('button', { className: 'uh-alias-ok', onClick: saveAllAliases }, '全部保存'),
          ),
        )
        : null

      let tip = null
      if (hover !== null && hover !== undefined) {
        const day = hover.day
        let rowsContent = []
        let tokensText = ''
        if (day !== undefined) {
          const sorted = day.perWorkspace.slice().sort((a, b) => b.turns - a.turns)
          rowsContent = sorted.map((entry) => {
            const idx = wsIndex.get(entry.workspaceId)
            return React.createElement('div', {
              key: entry.workspaceId,
              className: 'uh-tip-row',
              onClick: () => { toggleFilter(entry.workspaceId); setHover(null) },
            },
              React.createElement('span', { className: 'uh-dot', style: { background: wsColor(idx === undefined ? 0 : idx) } }),
              React.createElement('span', {}, wsTitle(entry.workspaceId)),
              React.createElement('span', { className: 'uh-n' }, entry.turns + ' 次'),
            )
          })
          if (day.tokens.input + day.tokens.output + day.tokens.cacheRead > 0) {
            tokensText = 'Token：输入 ' + fmtCompact(day.tokens.input) + ' · 缓存命中 ' + fmtCompact(day.tokens.cacheRead) + ' · 输出 ' + fmtCompact(day.tokens.output)
          }
        }
        const flip = hover.x > 640
        tip = React.createElement('div', {
          key: hover.date,
          className: 'uh-tip',
          style: {
            left: hover.x + 14,
            top: hover.y + 12,
            transform: flip ? 'translateX(calc(-100% - 28px))' : 'none',
          },
        },
          React.createElement('div', { className: 'uh-tip-date' }, humanDate(hover.date)),
          day !== undefined && day.turns > 0
            ? rowsContent
            : React.createElement('div', { className: 'uh-empty', style: { padding: '6px 0' } }, '这一天没有使用记录'),
          tokensText !== '' ? React.createElement('div', { className: 'uh-tip-tokens' }, tokensText) : null,
        )
      }

      const rangeLabel = range === '30d' ? '近 30 天' : range === '90d' ? '近 90 天' : '全部'
      const scanning = !scan.done
      const pct = scan.total > 0 ? Math.min(100, Math.round((scan.scanned / scan.total) * 100)) : 40
      const isEmpty = scan.done && stats.byDay.length === 0 && stats.totals.turns === 0

      return React.createElement('div', { className: 'uh-page' },
        React.createElement('div', { className: 'uh-head' },
          React.createElement('h2', { className: 'uh-title' }, '用量统计'),
          React.createElement('div', { className: 'uh-actions' },
            React.createElement('button', {
              className: 'uh-refresh',
              title: '管理工作区别名',
              onClick: () => { if (aliasOpen) setAliasOpen(false); else openAliasPanel() },
            }, '✎ 工作区别名'),
            React.createElement('div', { className: 'uh-range' },
              ['30d', '90d', 'all'].map((r) => React.createElement('button', {
                key: r,
                className: range === r ? 'uh-on' : '',
                onClick: () => setRange(r),
              }, r === '30d' ? '近 30 天' : r === '90d' ? '近 90 天' : '全部')),
            ),
            React.createElement('button', { className: 'uh-refresh', onClick: onRefresh }, '刷新'),
          ),
        ),
        aliasOpen ? aliasPanel : null,
        scanning ? React.createElement('div', { className: 'uh-progress' },
          React.createElement('span', {}, '正在统计历史会话 ' + scan.scanned + ' / ' + scan.total + (scan.failed > 0 ? '（' + scan.failed + ' 个读取失败）' : '')),
          React.createElement('div', { className: 'uh-bar' }, React.createElement('div', { className: 'uh-fill', style: { width: pct + '%' } })),
        ) : null,
        isEmpty ? React.createElement('div', { className: 'uh-panel' },
          React.createElement('div', { className: 'uh-empty' }, '还没有使用记录。开始对话后，这里会点亮。'),
        ) : React.createElement(React.Fragment, null,
          React.createElement('div', { className: 'uh-cards' },
            card('总花费 Token', fmtCompact(animatedTotal), '输入 ' + fmtCompact(agg.totals.input) + ' · 命中 ' + fmtCompact(agg.totals.cacheRead) + ' · 输出 ' + fmtCompact(agg.totals.output) + ' · 推理 ' + fmtCompact(agg.totals.reasoning), 0),
            card('缓存命中率', (animatedRate / 10).toFixed(1) + '%', '命中 ' + fmtCompact(agg.totals.cacheRead) + ' / 未命中输入 ' + fmtCompact(agg.totals.input), 1),
            card('账户余额', balanceValue, balanceSub, 2),
            tokenCard,
            card('总使用次数', fmtCompact(animatedTurns), range === 'all' ? agg.totals.sessions + ' 个会话' : rangeLabel + '内的回合数', 4),
            card('连续使用', st.streak + ' 天', '最长连续 ' + st.best + ' 天', 5),
          ),
          React.createElement('div', { className: 'uh-panel' },
            React.createElement('div', { className: 'uh-hm-head' },
              React.createElement('div', { className: 'uh-chips' }, workspaces.map((w, i) => {
                const on = wsFilter === w.id
                return React.createElement('button', {
                  key: w.id,
                  className: 'uh-chip' + (on ? ' uh-on' : ''),
                  onClick: () => toggleFilter(w.id),
                  title: w.path,
                },
                  React.createElement('span', { className: 'uh-dot', style: { background: wsColor(i) } }),
                  React.createElement('span', { className: 'uh-chip-title' }, wsTitle(w.id)),
                )
              })),
              React.createElement('div', { className: 'uh-legend' },
                React.createElement('span', {}, '少'),
                [0, 1, 2, 3, 4].map((l) => React.createElement('span', { key: l, className: 'uh-cell', style: { background: cellBg(l) } })),
                React.createElement('span', {}, '多'),
              ),
            ),
            React.createElement('div', { className: 'uh-hm-scroll' },
              React.createElement('div', { className: 'uh-months' }, monthLabels.map((m, i) => React.createElement('span', { key: i, style: { left: m.left } }, m.text))),
              React.createElement('div', { className: 'uh-hm-body' },
                React.createElement('div', { className: 'uh-wdays' }, weekdayLabels.map((w, i) => React.createElement('span', { key: i }, w))),
                React.createElement('div', { className: 'uh-grid' }, cellElements),
              ),
            ),
            React.createElement('div', { className: 'uh-note', style: { marginTop: 10 } }, '口径：每完成一个回合点亮一次（含子代理会话）；悬停查看按工作区明细，点击工作区可筛选热力图与明细表。'),
          ),
          React.createElement('div', { className: 'uh-panel' },
            React.createElement('h3', { className: 'uh-tbl-title' }, '工作区明细（' + rangeLabel + '）'),
            rows.length === 0
              ? React.createElement('div', { className: 'uh-empty' }, '该时间范围内没有使用记录')
              : React.createElement('div', { className: 'uh-tbl-scroll' },
                React.createElement('div', { className: 'uh-hrow' },
                  React.createElement('div', {}, '工作区'),
                  React.createElement('div', { className: 'uh-num' }, '回合'),
                  React.createElement('div', { className: 'uh-num' }, '输入'),
                  React.createElement('div', { className: 'uh-num' }, '缓存命中'),
                  React.createElement('div', { className: 'uh-num' }, '输出'),
                  React.createElement('div', { className: 'uh-num' }, '推理'),
                  React.createElement('div', { className: 'uh-num' }, '合计'),
                  React.createElement('div', { className: 'uh-num' }, '命中率'),
                  React.createElement('div', { className: 'uh-num' }, '占比'),
                ),
                rowElements,
              ),
          ),
        ),
        tip,
      )
    }

    exports.inject = ['timer']
    exports.apply = (ctx) => {
      const slots = ctx.get('slots')
      if (slots === undefined) return
      slots.inject('settings.section', () => slots.register(
        { name: 'settings.section', id: 'usage-stats', order: 30, label: () => '用量统计' },
        () => React.createElement(UsagePage, { timerCtx: ctx }),
      ))
    }
    return module.exports;
  }
});
