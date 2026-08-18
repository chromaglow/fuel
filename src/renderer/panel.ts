import type {
  CatchStats,
  EvictionEvent,
  HudState,
  Nudge,
  ReceiptRecord,
  RecentEvent,
  Tenant,
  TenantTotals,
} from '../shared/types.js'

function row(k: string, v: string, cls = ''): string {
  return `<div class="k">${k}</div><div class="v ${cls}">${v}</div>`
}

/** CSS class for a tenant's colour; unknown tenants get the neutral swatch. */
export function tenantClass(t: Tenant | null): string {
  return t ? t.id.replace(/[^a-z0-9-]/gi, '-') : 'unknown'
}

function fmtGb(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

function fmtKeepAlive(sec: number): string {
  if (sec >= 3600) return `${(sec / 3600).toFixed(sec % 3600 === 0 ? 0 : 1)}h`
  if (sec >= 60) return `${Math.round(sec / 60)}m`
  return `${sec}s`
}

function fmtTokens(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec.toFixed(0)}s`
  const m = Math.floor(sec / 60)
  return `${m}m ${Math.round(sec % 60)}s`
}

/** The dense telemetry revealed on hover — everything the gauge elides. */
export function renderPanelRows(el: HTMLElement, s: HudState): void {
  const g = s.gpu
  const t = s.today
  const parts: string[] = []

  if (g) {
    parts.push(row('gpu', `${g.utilGpu}% · ${g.smClockMhz} MHz`))
    parts.push(
      row(
        'vram',
        `${(g.memUsedMb / 1024).toFixed(2)} / ${(g.memTotalMb / 1024).toFixed(1)} GB`,
      ),
    )
    parts.push(
      row('power', `${g.powerW.toFixed(0)} / ${g.powerLimitW.toFixed(0)} W · ${g.tempC}°C`),
    )
  } else {
    parts.push(row('gpu', 'unavailable', 'warn'))
  }

  // One row per resident: who owns it, its VRAM, its context, and when its
  // own keep-alive runs out. Two rows here is the picture that used to be
  // impossible to see.
  if (s.residents.length === 0) {
    parts.push(row('resident', 'nothing loaded'))
  }
  for (const r of s.residents) {
    const cpuPct =
      r.sizeTotal > r.sizeVram * 1.01 ? Math.round((1 - r.sizeVram / r.sizeTotal) * 100) : 0
    const bits = [cpuPct ? `${fmtGb(r.sizeVram)} vram · ${cpuPct}% on CPU ⚠` : fmtGb(r.sizeVram)]
    if (r.contextLength != null) {
      bits.push(`ctx ${fmtTokens(r.contextLength)}${r.contextLength <= 4096 ? ' ⚠' : ''}`)
    }
    if (r.expiresAt != null) {
      const sec = Math.max(0, Math.round((r.expiresAt - s.ts) / 1000))
      bits.push(`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`)
    }
    // Observed keep-alive. Ollama's 5-min default on a caller that returns
    // every few minutes is exactly the self-reload churn the policy layer
    // exists to remove, so anything that short is flagged.
    const shortKa = r.keepAliveSec != null && r.keepAliveSec <= 300
    if (r.keepAliveSec != null) bits.push(`ka ${fmtKeepAlive(r.keepAliveSec)}${shortKa ? ' ⚠' : ''}`)
    const who = r.tenant ? r.tenant.label : 'unknown tenant'
    const warn = (r.contextLength != null && r.contextLength <= 4096) || shortKa || cpuPct > 0
    parts.push(
      row(
        `<span class="tenant ${tenantClass(r.tenant)}">${who}</span>`,
        `${r.name} · ${bits.join(' · ')}`,
        warn ? 'warn' : '',
      ),
    )
  }

  parts.push(row('tasks', String(t.tasks), t.tasks > 0 ? 'hl' : ''))
  parts.push(row('tokens in', fmtTokens(t.promptTokens)))
  parts.push(row('tokens out', fmtTokens(t.evalTokens)))
  parts.push(row('gpu time', fmtDuration(t.gpuSeconds)))
  // Reloads (any load > 1 s) vs evictions (a resident displaced early). The
  // first is a keep-alive question; the second is contention — the freeze.
  parts.push(row('reloads', String(t.coldStarts), t.coldStarts > 0 ? 'warn' : ''))
  parts.push(
    row('evictions', String(s.evictionsToday), s.evictionsToday > 0 ? 'warn' : 'hl'),
  )
  parts.push(
    row('truncated', String(t.truncations), t.truncations > 0 ? 'warn' : ''),
  )
  parts.push(row('preserved', `≈ $${s.usdToday.toFixed(4)}`, 'hl'))

  el.innerHTML = parts.join('')
}

/**
 * Who preserved what today. Each tenant is priced at its own counterfactual
 * Claude model, named on the row, so "≈ $7" is never one blended rate hiding
 * a small coder contribution inside a large DJ one — or the reverse.
 */
export function renderPanelTenants(el: HTMLElement, rows: TenantTotals[]): void {
  if (rows.length === 0) {
    el.innerHTML = '<div class="empty">nothing today</div>'
    return
  }
  el.innerHTML = rows
    .map((t) => {
      const who = t.tenant?.label ?? 'unattributed'
      const cls = t.tenant ? tenantClass(t.tenant) : 'unknown'
      const rate = t.rateModel ? `@ ${t.rateModel.replace('claude-', '')}` : 'no Claude equivalent'
      const usd = t.rateModel ? `≈ $${t.usd.toFixed(2)}` : '—'
      return (
        `<div class="tenant-row"><span class="tenant ${cls}">${who}</span>` +
        `<span class="mid">${t.tasks} · ${fmtTokens(t.promptTokens)} in · ${fmtTokens(t.evalTokens)} out</span>` +
        `<span class="usd" title="${rate}">${usd}</span></div>`
      )
    })
    .join('')
}

/** Recent task list. Empty state matters here — it is the product thesis. */
export function renderPanelTasks(el: HTMLElement, events: RecentEvent[]): void {
  if (events.length === 0) {
    el.innerHTML = '<div class="empty">nothing offloaded yet</div>'
    return
  }

  el.innerHTML = events
    .map((e) => {
      const time = new Date(e.startedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
      const tok = e.evalTokens != null ? `${fmtTokens(e.evalTokens)} tok` : '—'
      const rate = e.tokPerSec != null ? `${e.tokPerSec.toFixed(0)} t/s` : ''
      const flags = [e.coldStart ? 'cold' : '', e.truncated ? 'trunc' : '']
        .filter(Boolean)
        .join(' ')
      const who = e.who ?? 'unattributed'
      return (
        `<div class="task"><span class="t">${time}</span>` +
        `<span class="tenant ${who === 'unattributed' ? 'unknown' : who.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">${who}</span>` +
        `<span>${tok} · ${rate}` +
        (flags ? ` <span class="flag">${flags}</span>` : '') +
        `</span></div>`
      )
    })
    .join('')
}

/**
 * The contention log: every time a resident was displaced before its own
 * keep-alive deadline, and by whom. Empty is the goal state — the VRAM budget
 * is sized so this list stays empty.
 */
export function renderPanelEvictions(el: HTMLElement, evictions: EvictionEvent[]): void {
  if (evictions.length === 0) {
    el.innerHTML = '<div class="empty">none — everyone fits</div>'
    return
  }
  el.innerHTML = evictions
    .map((e) => {
      const time = new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const victim = e.tenant?.label ?? e.model
      const by = e.evictedBy
        ? `← ${e.evictedByTenant?.label ?? e.evictedBy}`
        : 'left early (no newcomer seen)'
      return (
        `<div class="evict"><span class="t">${time}</span>` +
        `<span class="tenant ${tenantClass(e.tenant)}">${victim}</span>` +
        `<span class="by">${by} · ${fmtGb(e.sizeVram)} · ${Math.round(e.earlyByMs / 1000)}s early</span></div>`
      )
    })
    .join('')
}

const HINT_MAX = 22

function shortHint(hint: string | null): string {
  if (!hint) return ''
  const base = hint.replace(/\\/g, '/').split('/').filter(Boolean).slice(-2).join('/')
  return base.length > HINT_MAX ? '…' + base.slice(-HINT_MAX) : base
}

/**
 * The catch-rate tile: of the work eligible for the free lane (local + gray),
 * how much the toll booth actually routed local. Cloud work is correctly
 * excluded — it was never a candidate — so it sits outside the ratio.
 */
export function renderPanelCatch(el: HTMLElement, s: CatchStats): void {
  const eligible = s.local + s.gray
  const total = eligible + s.cloud
  if (total === 0) {
    el.innerHTML = '<div class="empty">no decisions yet</div>'
    return
  }
  const pct = eligible > 0 ? Math.round((s.local / eligible) * 100) : 0
  const actual = s.offloaded > 0 ? ` · ${s.offloaded} offloaded` : ''
  el.innerHTML =
    `<div class="catch-head"><span class="catch-rate">${s.local}/${eligible}</span>` +
    `<span class="catch-sub">free-lane on eligible · ${pct}%${actual}</span></div>` +
    `<div class="catch-mix">` +
    `<span class="badge local">${s.local} local</span>` +
    `<span class="badge gray">${s.gray} gray</span>` +
    `<span class="badge cloud">${s.cloud} cloud</span>` +
    `</div>`
}

/** The live decision feed — each routing call with its lane and one reason. */
export function renderPanelReceipts(el: HTMLElement, receipts: ReceiptRecord[]): void {
  if (receipts.length === 0) {
    el.innerHTML = '<div class="empty">no decisions yet</div>'
    return
  }
  el.innerHTML = receipts
    .map((r) => {
      const time = new Date(r.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const why = r.reasons.filter((x) => x !== 'ambiguous-default-cloud')[0] ?? r.route
      return (
        `<div class="receipt"><span class="t">${time}</span>` +
        `<span class="badge ${r.route}">${r.route}</span>` +
        `<span class="sig">${shortHint(r.fileHint)} · ${why}</span></div>`
      )
    })
    .join('')
}

/**
 * Recent unburned-fuel detections. Reviewable during shadow-mode calibration —
 * this list is how you sanity-check the classifier before trusting the count.
 */
export function renderPanelNudges(el: HTMLElement, nudges: Nudge[]): void {
  if (nudges.length === 0) {
    el.innerHTML = '<div class="empty">none detected</div>'
    return
  }
  el.innerHTML = nudges
    .map((n) => {
      const time = new Date(n.ts).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
      const est = n.estTokens != null ? `~${fmtTokens(n.estTokens)} tok` : ''
      const sig = n.signals[0] ?? 'mechanical'
      return (
        `<div class="nudge"><span class="t">${time}</span>` +
        `<span class="sig">${sig} · ${shortHint(n.fileHint)}</span>` +
        `<span>${est}</span></div>`
      )
    })
    .join('')
}
