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
    function LineIcon(props) {
      const size = props.size || 16
      const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
      const paths = {
        edit: [React.createElement('path', { key: 'a', d: 'M12.2 3.4l2.4 2.4M4 16l2.8-.6L15 7.2a1.7 1.7 0 0 0-2.4-2.4L4.4 13z', ...base })],
        export: [React.createElement('path', { key: 'a', d: 'M12 3v11M8 7l4-4 4 4M5 13v5h14v-5', ...base })],
        refresh: [React.createElement('path', { key: 'a', d: 'M19 9a7 7 0 1 0 1.1 5.2M19 4v5h-5', ...base })],
        close: [React.createElement('path', { key: 'a', d: 'M6 6l12 12M18 6L6 18', ...base })],
        chart: [React.createElement('path', { key: 'a', d: 'M4 19V5M4 19h16M7 15l3-4 3 2 5-7', ...base })],
        cache: [React.createElement('path', { key: 'a', d: 'M12 4l7 4-7 4-7-4 7-4zM5 12l7 4 7-4M5 16l7 4 7-4', ...base })],
        wallet: [React.createElement('path', { key: 'a', d: 'M4 7.5A2.5 2.5 0 0 1 6.5 5H18v14H6.5A2.5 2.5 0 0 1 4 16.5zM4 8h14M14 13h.01', ...base })],
        clock: [React.createElement('path', { key: 'a', d: 'M12 6v6l4 2M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0z', ...base })],
        folder: [React.createElement('path', { key: 'a', d: 'M3.5 7.5h6l2 2h9v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z', ...base })],
        calendar: [React.createElement('path', { key: 'a', d: 'M6 4v3M18 4v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z', ...base })],
      }
      return React.createElement('svg', { className: 'uh-line-icon ' + (props.className || ''), width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true }, paths[props.name] || paths.chart)
    }
    function chineseMagnitude(n) {
      if (typeof n !== 'number' || !Number.isFinite(n) || n < 10000) return ''
      const value = n >= 100000000 ? n / 100000000 : n / 10000
      const rounded = Math.round(value * 1000) / 1000
      return String(rounded) + (n >= 100000000 ? '亿' : '万')
    }
    function valueWithMagnitude(value, raw) {
      const magnitude = chineseMagnitude(raw)
      return React.createElement(React.Fragment, null, value, magnitude ? React.createElement('span', { className: 'uh-unit' }, magnitude) : null)
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
      if (stats === null) return { totals: { turns: 0, sessions: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }, perWs: [], perModel: [] }
      if (range === 'all') return { totals: stats.totals, perWs: stats.perWorkspace, perModel: stats.perModel || [] }
      let cutoff
      if (range === '30d') cutoff = fmtDate(new Date(Date.now() - 29 * 86400000))
      else cutoff = fmtDate(new Date(Date.now() - 89 * 86400000))
      const t = { turns: 0, sessions: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }
      const per = new Map()
      const models = new Map()
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
        for (const m of (day.byModel || [])) {
          let p = models.get(m.model)
          if (p === undefined) { p = { model: m.model, calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }; models.set(m.model, p) }
          p.calls += m.calls; p.input += m.input; p.output += m.output; p.cacheRead += m.cacheRead; p.cacheWrite += m.cacheWrite; p.reasoning += m.reasoning
        }
      }
      return { totals: t, perWs: Array.from(per.values()), perModel: Array.from(models.values()) }
    }
    function modelParts(label) {
      const text = typeof label === 'string' ? label : ''
      const cut = text.indexOf(' / ')
      return cut >= 0 ? { provider: text.slice(0, cut) || '未知供应商', model: text.slice(cut + 3) || '未知模型' } : { provider: '未知供应商', model: text || '未知模型' }
    }
    function aggregateModelRows(rows, view) {
      if (view === 'route') return rows.slice()
      const grouped = new Map()
      for (const row of rows) {
        const parts = modelParts(row.model)
        const key = view === 'model' ? parts.model : parts.provider
        let item = grouped.get(key)
        if (item === undefined) { item = { model: key, calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }; grouped.set(key, item) }
        item.calls += row.calls; item.input += row.input; item.output += row.output; item.cacheRead += row.cacheRead; item.cacheWrite += row.cacheWrite; item.reasoning += row.reasoning
      }
      return Array.from(grouped.values())
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
.uh-model-hrow, .uh-model-row { display:grid; grid-template-columns:minmax(190px,2.2fr) .7fr .9fr .9fr .9fr .9fr 1.1fr .8fr; gap:8px; align-items:center; min-width:780px; padding:7px 10px; border-radius:8px; font-size:12px; }
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
.uh-side-entry { width:100%; border:0; background:transparent; color:var(--dsw-alias-label-secondary); border-radius:8px; min-height:36px; padding:7px 10px; display:flex; align-items:center; gap:9px; font:inherit; font-size:13px; cursor:pointer; text-align:left; }
.uh-side-entry:hover { background:var(--dsw-alias-interactive-bg-hover); color:var(--dsw-alias-label-primary); }
.uh-side-entry-icon { width:18px; text-align:center; flex:none; font-size:15px; }
.uh-side-entry-label { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.uh-side-modal { position:fixed; inset:0; z-index:1100; background:color-mix(in srgb, #000 44%, transparent); display:flex; align-items:stretch; justify-content:center; padding:26px; }
.uh-side-dialog { width:min(1120px, 100%); overflow:auto; background:var(--dsw-alias-bg-base); border:1px solid var(--dsw-alias-border-l2); border-radius:14px; box-shadow:0 18px 52px rgba(0,0,0,.35); padding:18px; }
.uh-side-dialog-head { display:flex; justify-content:flex-end; margin-bottom:8px; }
@media (max-width: 640px) { .uh-side-modal { padding:0; } .uh-side-dialog { border-radius:0; border:0; padding:14px; } }
/* iOS-style dashboard: grouped surfaces, tactile controls, and an elevated sheet. */
.uh-page { gap:18px; max-width:1160px; margin:0 auto; padding:4px 2px 34px; font-family:-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif; }
.uh-head { position:sticky; top:-18px; z-index:5; margin:0 -2px; padding:18px 2px 14px; background:color-mix(in srgb, var(--dsw-alias-bg-base) 88%, transparent); backdrop-filter:blur(18px) saturate(150%); border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 76%, transparent); }
.uh-title { font-size:22px; line-height:1.2; font-weight:700; letter-spacing:0; }
.uh-actions { gap:8px; }
.uh-range { padding:2px; gap:2px; border:0; border-radius:9px; background:color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent); overflow:visible; }
.uh-range button, .uh-range button + button { min-height:28px; border:0; border-radius:7px; padding:4px 10px; }
.uh-range button.uh-on { background:var(--dsw-alias-bg-layer-1); box-shadow:0 1px 3px rgba(0,0,0,.16); }
.uh-refresh { min-height:30px; border:0; border-radius:15px; padding:5px 12px; display:inline-flex; align-items:center; justify-content:center; gap:6px; background:color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, var(--dsw-alias-bg-layer-1)); color:var(--dsw-alias-brand-primary); font-weight:600; }
.uh-line-icon { flex:none; }
.uh-icon-button { width:30px; padding:0; }
.uh-refresh:hover { border:0; background:color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, var(--dsw-alias-bg-layer-1)); }
.uh-progress { padding:10px 12px; background:color-mix(in srgb, var(--dsw-alias-brand-primary) 9%, var(--dsw-alias-bg-layer-1)); border:0; border-radius:12px; }
.uh-cards { grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; border:0; border-radius:0; overflow:visible; background:transparent; }
.uh-card { min-height:100px; padding:15px; gap:6px; border:0; border-radius:18px; background:var(--dsw-alias-bg-layer-1); box-shadow:0 1px 2px rgba(0,0,0,.07), 0 8px 22px rgba(0,0,0,.05); animation:none; }
.uh-card:first-child { border:0; background:color-mix(in srgb, #0a84ff 15%, var(--dsw-alias-bg-layer-1)); }
.uh-card:nth-child(2) { background:color-mix(in srgb, #30d158 13%, var(--dsw-alias-bg-layer-1)); }
.uh-card:nth-child(3) { background:color-mix(in srgb, #ff9f0a 14%, var(--dsw-alias-bg-layer-1)); }
.uh-card:hover { transform:translateY(-2px); box-shadow:0 12px 28px rgba(0,0,0,.12); }
.uh-card-label { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; letter-spacing:0; }
.uh-ios-summary-label, .uh-section-title, .uh-title-with-icon { display:flex; align-items:center; gap:7px; }
.uh-section-title { margin-bottom:12px; color:var(--dsw-alias-label-primary); font-size:14px; font-weight:650; }
/* Raise the complete reading scale without changing the data grid geometry. */
.uh-page { font-size:14px; }
.uh-range button, .uh-refresh { font-size:13px; }
.uh-card-label, .uh-ios-summary-label { font-size:13px; }
.uh-card-sub, .uh-ios-summary-caption, .uh-note { font-size:12px; }
.uh-hrow, .uh-row, .uh-model-hrow, .uh-model-row { font-size:13px; }
.uh-tbl-title { font-size:15px; }
.uh-num { font-variant-numeric:tabular-nums; }
.uh-card-value { font-size:25px; font-weight:700; letter-spacing:0; }
.uh-card-sub { font-size:11px; line-height:1.45; }
.uh-panel { padding:16px; border:0; border-radius:18px; background:var(--dsw-alias-bg-layer-1); box-shadow:0 1px 2px rgba(0,0,0,.06), 0 6px 18px rgba(0,0,0,.04); }
.uh-hm-head { margin-bottom:12px; }
.uh-chip { border:0; border-radius:14px; padding:5px 10px; background:color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent); }
.uh-chip.uh-on { border:0; background:color-mix(in srgb, var(--dsw-alias-brand-primary) 18%, transparent); color:var(--dsw-alias-brand-primary); }
.uh-hrow, .uh-row, .uh-model-hrow, .uh-model-row { border-radius:10px; }
.uh-hrow, .uh-model-hrow { position:sticky; top:66px; z-index:2; background:var(--dsw-alias-bg-layer-1); border-bottom:1px solid var(--dsw-alias-border-l1); }
.uh-row, .uh-model-row { padding-top:9px; padding-bottom:9px; }
.uh-row:nth-child(even) { background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 52%, transparent); }
.uh-side-entry { min-height:40px; border:0; border-radius:12px; padding:8px 10px; background:color-mix(in srgb, var(--dsw-alias-brand-primary) 9%, transparent); color:var(--dsw-alias-brand-primary); font-weight:600; }
.uh-side-entry:hover { border:0; background:color-mix(in srgb, var(--dsw-alias-brand-primary) 17%, transparent); }
.uh-side-entry-icon { color:var(--dsw-alias-brand-primary); font-weight:700; }
.uh-side-modal { align-items:flex-end; padding:0; background:rgba(0,0,0,.34); backdrop-filter:blur(8px); }
.uh-side-dialog { width:min(1260px, 100%); max-height:calc(100vh - 44px); border:0; border-radius:24px 24px 0 0; padding:22px 24px 28px; background:color-mix(in srgb, var(--dsw-alias-bg-base) 94%, transparent); box-shadow:0 -10px 44px rgba(0,0,0,.25); }
.uh-side-dialog-head { position:sticky; top:-22px; z-index:8; justify-content:center; height:22px; margin:-22px -24px 8px; padding:8px 24px; background:color-mix(in srgb, var(--dsw-alias-bg-base) 94%, transparent); border:0; }
.uh-side-dialog-head::before { content:""; width:36px; height:5px; border-radius:3px; background:color-mix(in srgb, var(--dsw-alias-label-primary) 24%, transparent); }
.uh-side-dialog-head .uh-refresh { position:absolute; right:20px; top:7px; min-height:28px; background:transparent; }
.uh-close-button { width:30px; padding:0; font-size:22px; line-height:1; color:var(--dsw-alias-label-secondary); }
.uh-close-button:hover { color:var(--dsw-alias-label-primary); background:color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent); }
@media (max-width:640px) { .uh-page { gap:14px; padding-bottom:20px; } .uh-head { position:static; padding:4px 0 10px; } .uh-title { font-size:20px; } .uh-side-dialog { max-height:calc(100vh - 8px); border-radius:20px 20px 0 0; padding:18px 14px 24px; } .uh-side-dialog-head { top:-18px; margin:-18px -14px 8px; padding:7px 14px; } .uh-card-value { font-size:22px; } }
/* Navigation separates the dashboard into three focused iOS-style surfaces. */
.uh-ios-tabs { display:grid; grid-template-columns:repeat(3, 1fr); gap:4px; padding:4px; border-radius:14px; background:color-mix(in srgb, var(--dsw-alias-label-primary) 9%, transparent); }
.uh-ios-tab { min-height:32px; border:0; border-radius:10px; background:transparent; color:var(--dsw-alias-label-secondary); font:inherit; font-size:13px; font-weight:600; cursor:pointer; }
.uh-ios-tab.uh-on { color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-layer-1); box-shadow:0 1px 4px rgba(0,0,0,.16); }
.uh-ios-summary { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px; background:transparent; box-shadow:none; }
.uh-ios-summary-total, .uh-ios-summary-cache { min-height:124px; padding:22px; border-radius:22px; display:flex; flex-direction:column; justify-content:center; box-shadow:0 14px 32px rgba(0,0,0,.08); }
.uh-ios-summary-total { background:color-mix(in srgb, #0a84ff 18%, var(--dsw-alias-bg-layer-1)); }
.uh-ios-summary-cache { background:color-mix(in srgb, #30d158 17%, var(--dsw-alias-bg-layer-1)); }
.uh-ios-summary-label { font-size:13px; font-weight:600; color:var(--dsw-alias-label-secondary); }
.uh-ios-summary-value { margin-top:4px; font-size:36px; line-height:1; font-weight:750; letter-spacing:0; color:var(--dsw-alias-label-primary); }
.uh-unit { margin-left:6px; color:var(--dsw-alias-label-secondary); font-size:.4em; font-weight:650; white-space:nowrap; vertical-align:baseline; }
.uh-wsbar-num .uh-unit { font-size:.78em; margin-left:3px; }
.uh-ios-summary-caption { margin-top:8px; font-size:12px; color:var(--dsw-alias-label-secondary); }
.uh-ios-summary-meta { display:grid; align-content:center; grid-template-columns:1fr auto; gap:7px 12px; padding:20px 22px; background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) 64%, transparent); font-size:12px; color:var(--dsw-alias-label-secondary); }
.uh-ios-summary-meta strong { color:var(--dsw-alias-label-primary); font-size:15px; font-variant-numeric:tabular-nums; }
.uh-ios-list-panel { min-height:360px; }
/* Each detail table owns its scrolling and sticky header; sections must not overlap in the page scroll. */
.uh-tbl-scroll { max-height:360px; overflow:auto; border-radius:12px; background:color-mix(in srgb, var(--dsw-alias-bg-layer-2) 55%, transparent); }
.uh-hrow, .uh-model-hrow { position:sticky; top:0; z-index:3; border-bottom:1px solid var(--dsw-alias-border-l1); box-shadow:0 1px 0 color-mix(in srgb, var(--dsw-alias-bg-base) 70%, transparent); }
.uh-row, .uh-model-row { min-height:48px; border-bottom:1px solid color-mix(in srgb, var(--dsw-alias-border-l1) 72%, transparent); }
.uh-row:last-child, .uh-model-row:last-child { border-bottom:0; }
@media (max-width:640px) { .uh-tbl-scroll { max-height:300px; border-radius:10px; } }
@media (max-width:640px) { .uh-ios-summary { grid-template-columns:1fr; } .uh-ios-summary-total, .uh-ios-summary-cache { padding:18px; min-height:0; border-radius:18px; } .uh-ios-summary-value { font-size:31px; } }
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
    if (typeof document !== "undefined") {
      let tag = document.querySelector("style[data-plugin-css=" + JSON.stringify(cssTagId) + "]")
      if (tag === null) {
        tag = document.createElement("style")
        tag.dataset.plugin = "dsh-usage-stats"
        tag.dataset.pluginCss = cssTagId
        document.head.appendChild(tag)
      }
      tag.textContent = CSS
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
      const [modelView, setModelView] = React.useState('route')
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

      const card = (label, value, sub, delay, icon) => React.createElement('div', { className: 'uh-card', style: { animationDelay: (delay * 70) + 'ms' } },
        React.createElement('div', { className: 'uh-card-label' }, icon ? React.createElement(LineIcon, { name: icon, size: 14 }) : null, label),
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
            React.createElement('span', { className: 'uh-wsbar-num' }, valueWithMagnitude(fmtCompact(total), total)),
          ),
          React.createElement('div', { className: 'uh-barwrap uh-bar-thin' },
            React.createElement('div', { className: 'uh-barfill', style: { width: maxTotal > 0 ? Math.max(2, (total / maxTotal) * 100) + '%' : '0%', background: color } }),
          ),
        )
      })
      const tokenCard = React.createElement('div', { className: 'uh-card', style: { animationDelay: '210ms' } },
        React.createElement('div', { className: 'uh-card-label' }, React.createElement(LineIcon, { name: 'folder', size: 14 }), '各工作区 Token 花费'),
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

      const modelViewLabel = modelView === 'route' ? '混合查看' : modelView === 'model' ? '按模型合并' : '按供应商汇总'
      const modelColumnLabel = modelView === 'route' ? '供应商 / 模型' : modelView === 'model' ? '模型' : '供应商'
      const modelRows = aggregateModelRows(agg.perModel || [], modelView).sort((a, b) => wsTotal(b) - wsTotal(a))
      const exportCsv = () => {
        const quote = (value) => '"' + String(value === undefined || value === null ? '' : value).replace(/"/g, '""') + '"'
        const line = (values) => values.map(quote).join(',')
        const allTokens = (entry) => entry.input + entry.output + entry.cacheRead + entry.cacheWrite + entry.reasoning
        const output = [
          line(['DSH 用量统计导出']),
          line(['导出时间', new Date().toLocaleString()]),
          line(['时间范围', rangeLabel]),
          line(['模型查看模式', modelViewLabel]),
          '',
          line(['汇总']),
          line(['回合', '会话', '输入 Token', '缓存命中 Token', '缓存写入 Token', '输出 Token', '推理 Token', 'Token 合计', '缓存命中率']),
          line([agg.totals.turns, agg.totals.sessions, agg.totals.input, agg.totals.cacheRead, agg.totals.cacheWrite, agg.totals.output, agg.totals.reasoning, allTokens(agg.totals), rateOf(agg.totals.input, agg.totals.cacheRead).toFixed(2) + '%']),
          '',
          line(['模型用量明细']),
          line([modelColumnLabel, '调用', '输入 Token', '缓存命中 Token', '缓存写入 Token', '输出 Token', '推理 Token', 'Token 合计', '缓存命中率']),
          ...modelRows.map((m) => line([m.model, m.calls, m.input, m.cacheRead, m.cacheWrite, m.output, m.reasoning, allTokens(m), rateOf(m.input, m.cacheRead).toFixed(2) + '%'])),
          '',
          line(['工作区明细']),
          line(['工作区', '路径', '回合', '输入 Token', '缓存命中 Token', '缓存写入 Token', '输出 Token', '推理 Token', 'Token 合计', '缓存命中率']),
          ...rows.map((w) => { const meta = wsById.get(w.workspaceId); return line([wsTitle(w.workspaceId), meta ? meta.path : '', w.turns, w.input, w.cacheRead, w.cacheWrite, w.output, w.reasoning, allTokens(w), rateOf(w.input, w.cacheRead).toFixed(2) + '%']) }),
        ]
        const blob = new Blob(['\uFEFF' + output.join('\r\n')], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = 'dsh-usage-stats-' + range + '-' + modelView + '-' + fmtDate(new Date()) + '.csv'
        document.body.appendChild(anchor); anchor.click(); anchor.remove()
        URL.revokeObjectURL(url)
      }

      const modelElements = modelRows.map((m) => {
        const total = wsTotal(m)
        const rate = rateOf(m.input, m.cacheRead)
        return React.createElement('div', { key: m.model, className: 'uh-model-row uh-row' },
          React.createElement('div', { className: 'uh-ws-title', title: m.model }, m.model),
          React.createElement('div', { className: 'uh-num' }, fmtCompact(m.calls)),
          React.createElement('div', { className: 'uh-num' }, fmtCompact(m.input)),
          React.createElement('div', { className: 'uh-num' }, fmtCompact(m.cacheRead)),
          React.createElement('div', { className: 'uh-num' }, fmtCompact(m.output)),
          React.createElement('div', { className: 'uh-num' }, fmtCompact(m.reasoning)),
          React.createElement('div', { className: 'uh-num' }, fmtCompact(total)),
          React.createElement('div', { className: 'uh-num' }, rate.toFixed(1) + '%'),
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
          React.createElement('div', { className: 'uh-title-wrap' },
            React.createElement('h2', { className: 'uh-title' }, '用量统计'),
          ),
          React.createElement('div', { className: 'uh-actions' },
            React.createElement('button', {
              className: 'uh-refresh',
              title: '管理工作区别名',
              onClick: () => { if (aliasOpen) setAliasOpen(false); else openAliasPanel() },
            }, React.createElement(LineIcon, { name: 'edit', size: 14 }), '工作区别名'),
            React.createElement('div', { className: 'uh-range' },
              ['30d', '90d', 'all'].map((r) => React.createElement('button', {
                key: r,
                className: range === r ? 'uh-on' : '',
                onClick: () => setRange(r),
              }, r === '30d' ? '近 30 天' : r === '90d' ? '近 90 天' : '全部')),
            ),
            React.createElement('button', { className: 'uh-refresh', title: '导出当前时间范围与模型查看模式的 CSV 数据', onClick: exportCsv }, React.createElement(LineIcon, { name: 'export', size: 14 }), '导出数据'),
            React.createElement('button', { className: 'uh-refresh uh-icon-button', title: '刷新统计数据', 'aria-label': '刷新统计数据', onClick: onRefresh }, React.createElement(LineIcon, { name: 'refresh', size: 16 })),
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
          React.createElement(React.Fragment, null,
          React.createElement('div', { className: 'uh-ios-summary' },
            React.createElement('div', { className: 'uh-ios-summary-total' },
              React.createElement('div', { className: 'uh-ios-summary-label' }, React.createElement(LineIcon, { name: 'chart', size: 15 }), 'Token 用量'),
              React.createElement('div', { className: 'uh-ios-summary-value' }, valueWithMagnitude(fmtCompact(animatedTotal), agg.totals.input + agg.totals.output + agg.totals.cacheRead + agg.totals.cacheWrite + agg.totals.reasoning)),
              React.createElement('div', { className: 'uh-ios-summary-caption' }, rangeLabel + ' · ' + fmtCompact(animatedTurns) + ' 次使用'),
            ),
            React.createElement('div', { className: 'uh-ios-summary-cache' },
              React.createElement('div', { className: 'uh-ios-summary-label' }, React.createElement(LineIcon, { name: 'cache', size: 15 }), '缓存命中'),
              React.createElement('div', { className: 'uh-ios-summary-value' }, (animatedRate / 10).toFixed(1) + '%'),
              React.createElement('div', { className: 'uh-ios-summary-caption' }, '命中 ' + fmtCompact(agg.totals.cacheRead) + ' Token'),
            ),
          ),
          React.createElement('div', { className: 'uh-cards' },
            card('账户余额', balanceValue, balanceSub, 0, 'wallet'),
            card('总使用次数', fmtCompact(animatedTurns), range === 'all' ? agg.totals.sessions + ' 个会话' : rangeLabel + '内的回合数', 4, 'chart'),
            card('连续使用', st.streak + ' 天', '最长连续 ' + st.best + ' 天', 5, 'clock'),
            tokenCard,
          ),
          React.createElement('div', { className: 'uh-panel' },
            React.createElement('div', { className: 'uh-section-title' }, React.createElement(LineIcon, { name: 'calendar', size: 16 }), '使用热力图'),
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
          ),
          React.createElement('div', { className: 'uh-panel uh-ios-list-panel' },
            React.createElement('div', { className: 'uh-hm-head' },
              React.createElement('h3', { className: 'uh-tbl-title uh-title-with-icon', style: { margin: 0 } }, React.createElement(LineIcon, { name: 'chart', size: 16 }), '模型用量明细（' + rangeLabel + '）'),
              React.createElement('div', { className: 'uh-range' },
                [['route', '混合查看'], ['model', '按模型'], ['provider', '按供应商']].map((entry) => React.createElement('button', {
                  key: entry[0], className: modelView === entry[0] ? 'uh-on' : '', onClick: () => setModelView(entry[0]),
                }, entry[1])),
              ),
            ),
            modelRows.length === 0
              ? React.createElement('div', { className: 'uh-empty' }, '尚无带模型路由信息的用量记录')
              : React.createElement('div', { className: 'uh-tbl-scroll' },
                React.createElement('div', { className: 'uh-model-hrow uh-hrow' },
                  React.createElement('div', {}, modelColumnLabel),
                  React.createElement('div', { className: 'uh-num' }, '调用'),
                  React.createElement('div', { className: 'uh-num' }, '输入'),
                  React.createElement('div', { className: 'uh-num' }, '缓存命中'),
                  React.createElement('div', { className: 'uh-num' }, '输出'),
                  React.createElement('div', { className: 'uh-num' }, '推理'),
                  React.createElement('div', { className: 'uh-num' }, '合计'),
                  React.createElement('div', { className: 'uh-num' }, '命中率'),
                ),
                modelElements,
              ),
            React.createElement('div', { className: 'uh-note', style: { marginTop: 10 } }, modelViewLabel + '：混合查看按“供应商 / 模型”区分；按模型会跨供应商合并同名模型；按供应商则汇总其全部模型。缺少路由信息的历史记录会归为“未知”。'),
          ),
          React.createElement('div', { className: 'uh-panel uh-ios-list-panel' },
            React.createElement('h3', { className: 'uh-tbl-title uh-title-with-icon' }, React.createElement(LineIcon, { name: 'folder', size: 16 }), '工作区明细（' + rangeLabel + '）'),
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

    function UsageSidebarEntry(props) {
      const [open, setOpen] = React.useState(false)
      React.useEffect(() => {
        if (!open) return undefined
        const closeOnEscape = (event) => { if (event.key === 'Escape') setOpen(false) }
        document.addEventListener('keydown', closeOnEscape)
        return () => document.removeEventListener('keydown', closeOnEscape)
      }, [open])
      return React.createElement(React.Fragment, null,
        React.createElement('button', {
          type: 'button', className: 'uh-side-entry', title: '用量统计', 'aria-label': '用量统计', onClick: () => setOpen(true),
        }, React.createElement('span', { className: 'uh-side-entry-icon' }, React.createElement(LineIcon, { name: 'chart', size: 17 })), props.wide ? React.createElement('span', { className: 'uh-side-entry-label' }, '用量统计') : null),
        open ? React.createElement('div', { className: 'uh-side-modal', role: 'presentation', onMouseDown: (event) => { if (event.target === event.currentTarget) setOpen(false) } },
          React.createElement('div', { className: 'uh-side-dialog', role: 'dialog', 'aria-modal': true, 'aria-label': '用量统计' },
            React.createElement('div', { className: 'uh-side-dialog-head' },
              React.createElement('button', { className: 'uh-refresh uh-close-button', type: 'button', title: '关闭用量统计', 'aria-label': '关闭用量统计', onClick: () => setOpen(false) }, React.createElement(LineIcon, { name: 'close', size: 18 })),
            ),
            React.createElement(UsagePage, { timerCtx: props.timerCtx }),
          ),
        ) : null,
      )
    }

    exports.inject = ['timer', 'slots']
    exports.apply = (ctx) => {
      const slots = ctx.get('slots')
      if (slots === undefined) return
      slots.inject('sidebar.footer.action', () => slots.register(
        { name: 'sidebar.footer.action', id: 'usage-stats', order: 10 },
        (props) => React.createElement(UsageSidebarEntry, { wide: props.wide, timerCtx: ctx }),
      ))
    }
    return module.exports;
  }
});
