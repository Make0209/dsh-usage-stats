// dsh-usage-stats 插件 Host 半（永久版）
// 数据聚合 + 账户余额 + 工作区别名持久化，通过 webServer 路由向客户端提供数据。
const name = 'dsh-usage-stats'
const inject = ['sessionQuery', 'workspaceRegistry', 'timer']

function sendJson(res, code, value) {
  res.statusCode = code
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(value))
}

function readBody(req, maxBytes) {
  return new Promise((resolve) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size <= maxBytes) chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', () => resolve(''))
  })
}

function apply(ctx) {
  const subprocess = ctx.get('subprocess')
  const credentials = ctx.get('credentials')
  const settings = ctx.get('settings')
  const sandboxPolicy = ctx.get('sandboxPolicy')
  const storage = ctx.get('storage')
  const webServer = ctx.get('webServer')

  // ---------- owned aggregation state ----------
  const wsMeta = new Map()
  const pathIndex = new Map()
  const memberOf = new Map()
  const byDay = new Map()
  const perWorkspace = new Map()
  const perModel = new Map()
  const sessionModel = new Map()
  const totals = { turns: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }
  const sessionCount = new Set()
  const sessionSeq = new Map()
  const chains = new Map()
  const scan = { started: false, done: false, scanned: 0, total: 0, failed: 0 }
  const aliases = {}
  let kvUnit = null
  let aliasWriteChain = Promise.resolve()
  let balanceCache = { fetchedAt: 0, payload: null }

  const DAY_MS = 86400000
  const WEEKS = 53

  function dayKey(ms) {
    const d = new Date(ms)
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  }
  function cutoffKey() {
    return dayKey(Date.now() - WEEKS * 7 * DAY_MS)
  }
  function num(v) {
    return typeof v === 'number' && Number.isFinite(v) ? v : 0
  }
  function ensureDay(date) {
    let day = byDay.get(date)
    if (day === undefined) {
      day = { turns: 0, tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }, perWs: new Map(), byWs: new Map(), byModel: new Map() }
      byDay.set(date, day)
    }
    return day
  }
  function ensureWs(wsId) {
    let ws = perWorkspace.get(wsId)
    if (ws === undefined) {
      ws = { turns: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }
      perWorkspace.set(wsId, ws)
    }
    return ws
  }
  function ensureDayWs(day, wsId) {
    let w = day.byWs.get(wsId)
    if (w === undefined) {
      w = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }
      day.byWs.set(wsId, w)
    }
    return w
  }
  function ensureModel(model) {
    let item = perModel.get(model)
    if (item === undefined) {
      item = { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }
      perModel.set(model, item)
    }
    return item
  }
  function ensureDayModel(day, model) {
    let item = day.byModel.get(model)
    if (item === undefined) {
      item = { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 }
      day.byModel.set(model, item)
    }
    return item
  }
  function addUsage(wsId, time, usage, model) {
    const input = num(usage && usage.inputTokens)
    const output = num(usage && usage.outputTokens)
    const cacheRead = num(usage && usage.cacheReadTokens)
    const cacheWrite = num(usage && usage.cacheWriteTokens)
    const reasoning = num(usage && usage.reasoningTokens)
    const modelId = typeof model === 'string' && model !== '' ? model : '未知模型（历史记录缺少路由）'
    const modelTotals = ensureModel(modelId)
    modelTotals.calls += 1
    modelTotals.input += input
    modelTotals.output += output
    modelTotals.cacheRead += cacheRead
    modelTotals.cacheWrite += cacheWrite
    modelTotals.reasoning += reasoning
    totals.input += input
    totals.output += output
    totals.cacheRead += cacheRead
    totals.cacheWrite += cacheWrite
    totals.reasoning += reasoning
    const ws = ensureWs(wsId)
    ws.input += input
    ws.output += output
    ws.cacheRead += cacheRead
    ws.cacheWrite += cacheWrite
    ws.reasoning += reasoning
    const date = dayKey(time)
    if (date < cutoffKey()) return
    const day = ensureDay(date)
    day.tokens.input += input
    day.tokens.output += output
    day.tokens.cacheRead += cacheRead
    day.tokens.cacheWrite += cacheWrite
    day.tokens.reasoning += reasoning
    const dw = ensureDayWs(day, wsId)
    dw.input += input
    dw.output += output
    dw.cacheRead += cacheRead
    dw.cacheWrite += cacheWrite
    dw.reasoning += reasoning
    const dm = ensureDayModel(day, modelId)
    dm.calls += 1
    dm.input += input
    dm.output += output
    dm.cacheRead += cacheRead
    dm.cacheWrite += cacheWrite
    dm.reasoning += reasoning
  }
  function addTurn(wsId, time) {
    const date = dayKey(time)
    ensureWs(wsId).turns += 1
    totals.turns += 1
    if (date < cutoffKey()) return
    const day = ensureDay(date)
    day.turns += 1
    day.perWs.set(wsId, (day.perWs.get(wsId) || 0) + 1)
  }
  function routeLabel(route) {
    if (route && typeof route.model === 'string' && route.model !== '') return (typeof route.provider === 'string' && route.provider !== '' ? route.provider + ' / ' : '') + route.model
    return undefined
  }
  function modelFromRoute(data) {
    return routeLabel(data) || routeLabel(data && data.header && data.header.config)
  }
  function modelFromMessage(data, fallback) {
    return routeLabel(data && data.message && data.message.source) || fallback
  }
  function foldEvent(wsId, time, type, data, sid) {
    if (type === 'request/context' || type === 'request/header') {
      const model = modelFromRoute(data)
      if (model !== undefined) sessionModel.set(sid, model)
    } else if (type === 'turn/end') addTurn(wsId, time)
    else if (type === 'assistant/message' && data && data.usage) addUsage(wsId, time, data.usage, modelFromMessage(data, sessionModel.get(sid)))
  }
  function foldEvents(wsId, events, fromSeq, sid) {
    for (const ev of events) {
      if (fromSeq !== undefined) {
        const s = typeof ev.seq === 'number' ? ev.seq : -1
        if (s <= fromSeq) continue
      }
      if (ev.type === 'turn/end' || ev.type === 'assistant/message' || ev.type === 'request/context' || ev.type === 'request/header') foldEvent(wsId, ev.time, ev.type, ev.data, sid)
    }
  }
  function lastSeqOf(events) {
    let last = 0
    for (const ev of events) {
      const s = typeof ev.seq === 'number' ? ev.seq : -1
      if (s > last) last = s
    }
    return last
  }
  function enqueue(sid, task) {
    const prev = chains.get(sid) || Promise.resolve()
    const next = prev.then(() => task(), () => task())
    chains.set(sid, next)
    return next
  }
  function wsForLiveSession(session, sid) {
    let wsId = memberOf.get(sid)
    if (wsId !== undefined) return wsId
    const header = session && session.header
    const cwd = header && typeof header.cwd === 'string' ? header.cwd : ''
    if (cwd === '') return undefined
    wsId = pathIndex.get(cwd)
    if (wsId !== undefined) memberOf.set(sid, wsId)
    return wsId
  }
  async function processLiveEvent(sid, wsId, event) {
    const seq = typeof event.seq === 'number' ? event.seq : -1
    const last = sessionSeq.get(sid)
    if (last === undefined) {
      try {
        const snap = await ctx.sessionQuery.readSession(sid)
        if (snap && Array.isArray(snap.events)) {
          foldEvents(wsId, snap.events, undefined, sid)
          sessionSeq.set(sid, lastSeqOf(snap.events))
          sessionCount.add(sid)
        }
      } catch (err) { /* retry on the next event */ }
      return
    }
    if (seq <= last) return
    if (seq > last + 1) {
      try {
        const snap = await ctx.sessionQuery.readSession(sid)
        if (snap && Array.isArray(snap.events)) {
          foldEvents(wsId, snap.events, last, sid)
          sessionSeq.set(sid, lastSeqOf(snap.events))
        }
      } catch (err) { /* keep last; retry later */ }
      return
    }
    foldEvent(wsId, event.time, event.type, event.data, sid)
    sessionSeq.set(sid, seq)
    sessionCount.add(sid)
  }

  // ---------- baseline scan over durable logs ----------
  async function runBaseline() {
    if (scan.started) return
    scan.started = true
    try {
      const workspaces = ctx.workspaceRegistry.list()
      for (const w of workspaces) {
        const id = w && w.id
        const path = w && typeof w.path === 'string' ? w.path : ''
        const title = w && typeof w.title === 'string' ? w.title : ''
        if (id === undefined) continue
        wsMeta.set(id, { id, title, path })
        if (path !== '') pathIndex.set(path, id)
        if (w && Array.isArray(w.sessionIds)) {
          for (const sid of w.sessionIds) memberOf.set(sid, id)
        }
      }
    } catch (err) {
      console.error('[usage-stats] workspace list failed:', err)
    }
    let records = []
    try {
      records = await ctx.sessionQuery.listSessions()
    } catch (err) {
      console.error('[usage-stats] session list failed:', err)
    }
    scan.total = Array.isArray(records) ? records.length : 0
    for (const record of records) {
      if (record === undefined || record === null || record.header === undefined) {
        scan.scanned += 1
        continue
      }
      const sid = record.header.id
      const cwd = typeof record.header.cwd === 'string' ? record.header.cwd : ''
      const wsId = cwd === '' ? undefined : pathIndex.get(cwd)
      if (sid === undefined || wsId === undefined) {
        scan.scanned += 1
        continue
      }
      await enqueue(sid, async () => {
        try {
          if (sessionSeq.has(sid)) return
          const snap = await ctx.sessionQuery.readSession(sid)
          if (snap && Array.isArray(snap.events)) {
            foldEvents(wsId, snap.events, undefined, sid)
            sessionSeq.set(sid, lastSeqOf(snap.events))
            sessionCount.add(sid)
          }
        } catch (err) {
          sessionSeq.set(sid, -1)
          scan.failed += 1
        } finally {
          scan.scanned += 1
        }
      })
      await ctx.timeout(0)
    }
    scan.done = true
  }

  // ---------- live feed ----------
  ctx.on('session/event', (session, event) => {
    if (event === undefined || event === null) return
    const type = event.type
    if (type !== 'turn/end' && type !== 'assistant/message' && type !== 'request/context' && type !== 'request/header') return
    const sid = session && session.id
    if (typeof sid !== 'string') return
    const wsId = wsForLiveSession(session, sid)
    if (wsId === undefined) return
    enqueue(sid, () => processLiveEvent(sid, wsId, event))
  })

  // ---------- workspace aliases (durable, schema-free KV unit) ----------
  async function loadAliases() {
    if (storage === undefined) return
    try {
      const backend = storage.backend.get('json')
      if (backend === undefined || backend === null || backend.kv === undefined) return
      const unit = await backend.kv.open({ name: 'usage-stats-aliases', version: 0, tables: [], hasGlobal: true })
      kvUnit = unit
      const snap = await unit.loadAll()
      const g = snap && snap.global
      if (g !== null && g !== undefined && typeof g === 'object') {
        for (const key of Object.keys(g)) {
          const value = g[key]
          if (typeof value === 'string' && value.trim() !== '') aliases[key] = value
        }
      }
    } catch (err) {
      console.error('[usage-stats] alias storage unavailable:', err)
    }
  }
  function persistAliases() {
    const snapshotAliases = {}
    for (const key of Object.keys(aliases)) snapshotAliases[key] = aliases[key]
    aliasWriteChain = aliasWriteChain.then(() => {
      if (kvUnit === null || kvUnit === undefined) return undefined
      return kvUnit.setGlobal(snapshotAliases).catch((err) => {
        console.error('[usage-stats] alias persist failed:', err)
      })
    })
  }
  function setAlias(wsId, raw) {
    const alias = typeof raw === 'string' ? raw.trim().slice(0, 80) : ''
    if (!wsMeta.has(wsId)) return { ok: false, message: 'unknown-workspace', aliases: Object.assign({}, aliases) }
    if (alias === '') delete aliases[wsId]
    else aliases[wsId] = alias
    persistAliases()
    return { ok: true, aliases: Object.assign({}, aliases) }
  }
  ctx.effect(() => () => {
    const unit = kvUnit
    kvUnit = null
    if (unit !== null && unit !== undefined) void unit.close().catch(() => {})
  })

  // ---------- snapshot for the client ----------
  function snapshot() {
    const cutoff = cutoffKey()
    const byDayArr = []
    for (const pair of byDay) {
      const date = pair[0]
      const day = pair[1]
      if (date < cutoff) continue
      byDayArr.push({
        date,
        turns: day.turns,
        tokens: { input: day.tokens.input, output: day.tokens.output, cacheRead: day.tokens.cacheRead, cacheWrite: day.tokens.cacheWrite, reasoning: day.tokens.reasoning },
        perWorkspace: Array.from(day.perWs, (p) => ({ workspaceId: p[0], turns: p[1] })),
        byWorkspace: Array.from(day.byWs, (p) => ({ workspaceId: p[0], input: p[1].input, output: p[1].output, cacheRead: p[1].cacheRead, cacheWrite: p[1].cacheWrite, reasoning: p[1].reasoning })),
        byModel: Array.from(day.byModel, (p) => ({ model: p[0], calls: p[1].calls, input: p[1].input, output: p[1].output, cacheRead: p[1].cacheRead, cacheWrite: p[1].cacheWrite, reasoning: p[1].reasoning })),
      })
    }
    byDayArr.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    return {
      scan: { started: scan.started, done: scan.done, scanned: scan.scanned, total: scan.total, failed: scan.failed },
      generatedAt: Date.now(),
      workspaces: Array.from(wsMeta.values(), (w) => ({ id: w.id, title: w.title, path: w.path })),
      aliases: Object.assign({}, aliases),
      totals: { turns: totals.turns, sessions: sessionCount.size, input: totals.input, output: totals.output, cacheRead: totals.cacheRead, cacheWrite: totals.cacheWrite, reasoning: totals.reasoning },
      perWorkspace: Array.from(perWorkspace, (p) => ({ workspaceId: p[0], turns: p[1].turns, input: p[1].input, output: p[1].output, cacheRead: p[1].cacheRead, cacheWrite: p[1].cacheWrite, reasoning: p[1].reasoning })),
      perModel: Array.from(perModel, (p) => ({ model: p[0], calls: p[1].calls, input: p[1].input, output: p[1].output, cacheRead: p[1].cacheRead, cacheWrite: p[1].cacheWrite, reasoning: p[1].reasoning })),
      byDay: byDayArr,
    }
  }

  // ---------- account balance (DeepSeek open platform) ----------
  function spawnCwd() {
    if (sandboxPolicy !== undefined && typeof sandboxPolicy.workspaceRoot === 'string' && sandboxPolicy.workspaceRoot.length > 0) return sandboxPolicy.workspaceRoot
    for (const w of wsMeta.values()) {
      if (w.path !== '') return w.path
    }
    return '.'
  }
  function runAttempt(argv, env, cwd) {
    return new Promise((resolve) => {
      let handle
      try {
        handle = subprocess.spawn({
          argv,
          cwd,
          stdio: { stdin: 'ignore', stdout: { maxBytes: 16384 }, stderr: { maxBytes: 4096 } },
          graceMs: 5000,
          env,
        })
      } catch (err) {
        resolve(null)
        return
      }
      handle.done.then(
        (outcome) => {
          let text = ''
          let errText = ''
          try {
            if (handle.collected && handle.collected.stdout) text = handle.collected.stdout.readFrom(0).text || ''
            if (handle.collected && handle.collected.stderr) errText = handle.collected.stderr.readFrom(0).text || ''
          } catch (err) { /* ignore */ }
          resolve({ exitCode: outcome && typeof outcome.exitCode === 'number' ? outcome.exitCode : -1, text, errText })
        },
        () => resolve(null),
      )
    })
  }
  function moneyOf(v) {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '') {
      const n = parseFloat(v)
      if (Number.isFinite(n)) return n
    }
    return null
  }
  function parseBalance(text) {
    let obj = null
    try {
      obj = JSON.parse(String(text).replace(/^\uFEFF/, ''))
    } catch (err) {
      return null
    }
    if (obj === null || typeof obj !== 'object') return null
    if (obj.is_available === false) return { unavailable: true, currencies: [] }
    const infos = (Array.isArray(obj.balance_infos) && obj.balance_infos) || (Array.isArray(obj.balance) && obj.balance) || null
    if (!infos) return null
    const out = []
    for (const info of infos) {
      if (info === null || typeof info !== 'object') continue
      if (typeof info.currency !== 'string') continue
      out.push({
        currency: info.currency,
        total: moneyOf(info.total_balance !== undefined ? info.total_balance : info.balance),
        granted: moneyOf(info.granted_balance),
        toppedUp: moneyOf(info.topped_up_balance),
      })
    }
    return { unavailable: false, currencies: out }
  }
  async function fetchBalance(force) {
    const now = Date.now()
    if (force !== true && balanceCache.payload !== null && now - balanceCache.fetchedAt < 300000) return balanceCache.payload
    let ref = 'DEEPSEEK_API_KEY'
    if (settings !== undefined) {
      try {
        const section = settings.get('llm-deepseek')
        if (section !== null && typeof section === 'object' && typeof section.apiKeyEnv === 'string' && section.apiKeyEnv.length > 0) ref = section.apiKeyEnv
      } catch (err) { /* default ref */ }
    }
    let key
    if (credentials !== undefined) {
      try {
        const hit = await credentials.resolve(ref)
        if (hit !== null && hit !== undefined && typeof hit.value === 'string' && hit.value.length > 0) key = hit.value
      } catch (err) { /* unconfigured */ }
    }
    if (key === undefined) {
      const payload = { status: 'missing-key' }
      balanceCache = { fetchedAt: now, payload }
      return payload
    }
    if (subprocess === undefined) {
      const payload = { status: 'error', message: '进程服务不可用，无法查询余额' }
      balanceCache = { fetchedAt: now, payload }
      return payload
    }
    const url = 'https://api.deepseek.com/user/balance'
    const cwd = spawnCwd()
    const psCommand = "$h=@{Authorization='Bearer '+$env:DSH_UBK}; (Invoke-RestMethod -Uri 'https://api.deepseek.com/user/balance' -Headers $h -TimeoutSec 30) | ConvertTo-Json -Compress -Depth 5"
    const attempts = [
      { argv: ['curl.exe', '-sS', '-L', '-m', '30', '-H', 'Accept: application/json', '-H', 'Authorization: Bearer ' + key, url], env: undefined },
      { argv: ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', psCommand], env: { DSH_UBK: key } },
    ]
    let lastDiag = ''
    for (const attempt of attempts) {
      const result = await runAttempt(attempt.argv, attempt.env, cwd)
      if (result === null) {
        lastDiag = '无法启动查询进程'
        continue
      }
      const body = (result.text || '').trim()
      if (result.exitCode === 0 && body.length > 0) {
        const parsed = parseBalance(body)
        if (parsed !== null && parsed.unavailable) {
          const payload = { status: 'unavailable', message: 'DeepSeek 接口返回余额不可用（is_available=false）' }
          balanceCache = { fetchedAt: now, payload }
          return payload
        }
        if (parsed !== null && parsed.currencies.length > 0) {
          const payload = { status: 'ok', currencies: parsed.currencies, fetchedAt: now }
          balanceCache = { fetchedAt: now, payload }
          return payload
        }
        lastDiag = body.slice(0, 300)
      } else {
        lastDiag = (result.errText || body).trim().slice(0, 300)
      }
    }
    const payload = { status: 'error', message: '余额查询失败', detail: lastDiag }
    balanceCache = { fetchedAt: now, payload }
    return payload
  }

  // ---------- HTTP data routes for the client half ----------
  if (webServer !== undefined) {
    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: '/api/usage-stats',
      handler: (req, res) => {
        if (!scan.started) void runBaseline()
        sendJson(res, 200, snapshot())
      },
    }))
    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: '/api/usage-stats/balance',
      handler: async (req, res) => {
        let force = false
        try {
          const url = new URL(req.url ?? '/', 'http://x')
          force = url.searchParams.get('force') === '1'
        } catch (err) { /* default */ }
        sendJson(res, 200, await fetchBalance(force))
      },
    }))
    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: '/api/usage-stats/alias',
      handler: async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        const body = await readBody(req, 16 * 1024)
        let args = null
        try {
          args = JSON.parse(body)
        } catch (err) { /* invalid json */ }
        const result = args !== null && args !== undefined && typeof args.workspaceId === 'string'
          ? setAlias(args.workspaceId, args.alias)
          : { ok: false, message: 'bad-request', aliases: Object.assign({}, aliases) }
        sendJson(res, 200, result)
      },
    }))
  }

  // ---------- start the historical backfill immediately ----------
  void runBaseline()
  void loadAliases()
}

export { name, inject, apply }
export default { name, inject, apply }
