import type {
  CatchStats,
  EvictionEvent,
  HudState,
  Nudge,
  ReceiptRecord,
  RecentEvent,
  ResidentModel,
} from '../shared/types.js'
import { TOK_PER_SEC_REDLINE, UTIL_HISTORY_LEN } from '../shared/constants.js'
import { GAUGE_SIZE, lerp } from './theme.js'
import { drawRing } from './gauges/ring.js'
import { drawArc } from './gauges/arc.js'
import { drawSparkline } from './gauges/sparkline.js'
import {
  renderPanelCatch,
  renderPanelEvictions,
  renderPanelNudges,
  renderPanelReceipts,
  renderPanelRows,
  renderPanelTasks,
  renderPanelTenants,
  tenantClass,
} from './panel.js'

const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T

const el = {
  model: $('model'),
  status: $('status'),
  usd: $('usd'),
  miniUsd: $('mini-usd'),
  tokens: $('tokens'),
  tps: $('tps'),
  hw: $('hw'),
  evictions: $('evictions'),
  unburned: $('unburned'),
  vramBar: $('vram-bar'),
  vramLegend: $('vram-legend'),
  nudgeHeading: $('nudge-heading'),
  panelRows: $('panel-rows'),
  panelTenants: $('panel-tenants'),
  panelTasks: $('panel-tasks'),
  panelEvictions: $('panel-evictions'),
  panelCatch: $('panel-catch'),
  panelReceipts: $('panel-receipts'),
  panelNudges: $('panel-nudges'),
  gauge: $<HTMLCanvasElement>('gauge'),
}

const ctx2d = el.gauge.getContext('2d')!
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

let state: HudState | null = null

/** Animated values and the targets they ease toward. */
const anim = {
  ring: 0,
  ringTarget: 0,
  arc: 0,
  arcTarget: 0,
  intensity: 0,
  intensityTarget: 0,
}

const INTENSITY_BY_PHASE: Record<HudState['phase'], number> = {
  offline: 0,
  'idle-evicted': 0.15,
  'idle-resident': 0.35,
  warming: 0.7,
  generating: 1,
}

// ---------------------------------------------------------------- rendering

function sizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1
  el.gauge.width = Math.round(GAUGE_SIZE * dpr)
  el.gauge.height = Math.round(GAUGE_SIZE * dpr)
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function draw(): void {
  ctx2d.clearRect(0, 0, GAUGE_SIZE, GAUGE_SIZE)

  drawArc(ctx2d, {
    tokPerSec: anim.arc,
    redline: TOK_PER_SEC_REDLINE,
    intensity: anim.intensity,
  })
  drawRing(ctx2d, { progress: anim.ring, intensity: anim.intensity })

  if (state) {
    drawSparkline(ctx2d, {
      history: state.utilHistory,
      capacity: UTIL_HISTORY_LEN,
      intensity: anim.intensity,
    })
  }
}

/**
 * Frame-rate-independent easing. The loop is *event driven*: it runs only
 * while a value is still travelling, then stops dead. With nothing moving the
 * HUD does no work at all, which is what keeps idle CPU near zero — a monitor
 * that taxes the thing it monitors is self-defeating.
 */
const TAU = { ring: 260, arc: 180, intensity: 320 }
const EPS = { ring: 0.0005, arc: 0.05, intensity: 0.004 }

let raf = 0
let lastFrame = 0

function settled(): boolean {
  return (
    Math.abs(anim.ring - anim.ringTarget) < EPS.ring &&
    Math.abs(anim.arc - anim.arcTarget) < EPS.arc &&
    Math.abs(anim.intensity - anim.intensityTarget) < EPS.intensity
  )
}

function snap(): void {
  anim.ring = anim.ringTarget
  anim.arc = anim.arcTarget
  anim.intensity = anim.intensityTarget
}

function frame(now: number): void {
  const dt = lastFrame ? Math.min(now - lastFrame, 100) : 16
  lastFrame = now

  anim.ring = lerp(anim.ring, anim.ringTarget, 1 - Math.exp(-dt / TAU.ring))
  anim.arc = lerp(anim.arc, anim.arcTarget, 1 - Math.exp(-dt / TAU.arc))
  anim.intensity = lerp(
    anim.intensity,
    anim.intensityTarget,
    1 - Math.exp(-dt / TAU.intensity),
  )

  draw()

  if (settled()) {
    snap()
    draw()
    raf = 0
    lastFrame = 0
    return
  }
  raf = requestAnimationFrame(frame)
}

function kick(): void {
  if (reduceMotion) {
    snap()
    draw()
    return
  }
  if (settled()) {
    draw()
    return
  }
  if (!raf) raf = requestAnimationFrame(frame)
}

// ------------------------------------------------------------------ text

function fmtTokens(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

function fmtCountdown(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

const GB = 1024 ** 3

const PHASE_LABEL: Record<HudState['phase'], string> = {
  offline: 'ollama offline',
  'idle-evicted': 'nothing loaded',
  'idle-resident': 'resident',
  warming: 'warming up…',
  generating: 'generating',
}

/**
 * Who is on the card. One resident: "WEYLD DJ · llama3.1:8b". Several: just
 * the tenants, "coder + WEYLD DJ" — the model names live in the panel, and the
 * 320 px header cannot fit both without truncating the second tenant, which
 * is the one thing this line must never do.
 */
function residentsHeadline(rs: ResidentModel[], online: boolean): string {
  if (rs.length === 0) return online ? 'no model loaded' : '—'
  if (rs.length === 1) {
    const r = rs[0]!
    return r.tenant ? `${r.tenant.label} · ${r.name}` : r.name
  }
  return rs.map((r) => r.tenant?.label ?? r.name).join(' + ')
}

/** Soonest keep-alive expiry across residents, for the status line. */
function nextEvictIn(rs: ResidentModel[], now: number): { name: string; sec: number } | null {
  let best: { name: string; sec: number } | null = null
  for (const r of rs) {
    if (r.expiresAt == null) continue
    const sec = Math.max(0, Math.round((r.expiresAt - now) / 1000))
    if (!best || sec < best.sec) best = { name: r.tenant?.label ?? r.name, sec }
  }
  return best
}

/**
 * The VRAM budget bar: total card memory, segmented by resident model in its
 * tenant's colour, then whatever else the driver reports in use, then free.
 * This is the one picture that shows "do these two fit" without arithmetic.
 */
function renderVram(s: HudState): void {
  const total = s.gpu?.memTotalMb ?? 0
  if (!total) {
    el.vramBar.innerHTML = ''
    el.vramLegend.textContent = ''
    return
  }
  const usedMb = s.gpu?.memUsedMb ?? 0
  const residentMb = s.residents.reduce((a, r) => a + r.sizeVram / 1024 ** 2, 0)
  const otherMb = Math.max(0, usedMb - residentMb)
  const freeMb = Math.max(0, total - usedMb)
  // "Tight" = less than one small model's worth of headroom left; the next
  // load will evict someone.
  const tight = freeMb < 2048

  const seg = (cls: string, mb: number, title: string): string =>
    mb > 0
      ? `<div class="seg ${cls}" style="width:${((mb / total) * 100).toFixed(2)}%" title="${title}"></div>`
      : ''

  // A resident whose total exceeds what is in VRAM is running partly on the
  // CPU. Its segment gets the split style and the legend says how much.
  const split = (r: ResidentModel): number =>
    r.sizeTotal > r.sizeVram * 1.01 ? Math.round((1 - r.sizeVram / r.sizeTotal) * 100) : 0
  const anySplit = s.residents.some((r) => split(r) > 0)

  el.vramBar.className = [tight ? 'tight' : '', anySplit ? 'split' : ''].join(' ').trim()
  el.vramBar.innerHTML =
    s.residents
      .map((r) =>
        seg(
          `${tenantClass(r.tenant)}${split(r) ? ' cpu-split' : ''}`,
          r.sizeVram / 1024 ** 2,
          `${r.name} · ${(r.sizeVram / GB).toFixed(1)} GB` +
            (split(r) ? ` in VRAM · ${split(r)}% ON CPU` : ''),
        ),
      )
      .join('') + seg('other', otherMb, `other (driver, desktop) · ${(otherMb / 1024).toFixed(1)} GB`)

  const legend = s.residents.map((r) => {
    const pct = split(r)
    return (
      `<span class="lg ${tenantClass(r.tenant)}${pct ? ' cpu-split' : ''}">` +
      `${r.tenant?.label ?? r.name} ${(r.sizeVram / GB).toFixed(1)}${pct ? ` · ${pct}% cpu ⚠` : ''}</span>`
    )
  })
  legend.push(
    `<span class="lg free${tight ? ' tight' : ''}">free ${(freeMb / 1024).toFixed(1)} / ${(total / 1024).toFixed(0)} GB</span>`,
  )
  el.vramLegend.innerHTML = legend.join('')
}

function render(s: HudState): void {
  state = s

  document.body.classList.toggle('truncated', s.truncationWarning)
  for (const c of Array.from(document.body.classList)) {
    if (c.startsWith('phase-')) document.body.classList.remove(c)
  }
  document.body.classList.add(`phase-${s.phase}`)

  el.model.textContent = residentsHeadline(s.residents, s.ollama === 'online')

  const label = PHASE_LABEL[s.phase]
  const next = s.phase === 'idle-resident' ? nextEvictIn(s.residents, s.ts) : null
  el.status.textContent = next
    ? `${s.residents.length} resident · ${next.name} evicts in ${fmtCountdown(next.sec)}`
    : s.residents.length > 1
      ? `${label} · ${s.residents.length} resident`
      : label

  renderVram(s)

  el.usd.textContent = `≈ $${s.usdToday.toFixed(2)}`
  el.miniUsd.textContent = el.usd.textContent
  el.tokens.textContent = `${fmtTokens(s.today.evalTokens + s.today.promptTokens)} tok`

  if (s.tokPerSec != null) {
    el.tps.textContent = `${s.tokPerSec.toFixed(1)} tok/s`
    el.tps.style.color =
      s.tokPerSec > TOK_PER_SEC_REDLINE * 0.92 ? 'var(--warn)' : 'var(--accent)'
  } else {
    el.tps.textContent = '— tok/s'
    el.tps.style.color = 'var(--muted)'
  }

  el.hw.textContent = s.gpu
    ? `⬡ ${(s.gpu.memUsedMb / 1024).toFixed(1)}/${(s.gpu.memTotalMb / 1024).toFixed(0)} GB · ${Math.round(s.gpu.powerW)} W · ${s.gpu.tempC}°C`
    : '⬡ no gpu'

  // Unburned fuel: only surfaced in live mode. Shadow keeps it out of the
  // compact HUD (it's still reviewable in the expanded panel) until the
  // heuristics are trusted.
  el.unburned.textContent =
    s.nudgeMode === 'live' && s.unburnedToday > 0
      ? `${s.unburnedToday} unburned`
      : ''

  // Contention is the headline health signal for a shared card: zero evictions
  // means the budget holds; anything else means someone got shoved out today.
  // Two things outrank it: a truncated context (correctness), and a resident
  // running partly on the CPU (the freeze, happening right now).
  const cpuSplit = s.residents.find((r) => r.sizeTotal > r.sizeVram * 1.01)
  if (cpuSplit) {
    el.evictions.textContent = `${cpuSplit.tenant?.label ?? cpuSplit.name} on CPU ⚠`
    el.evictions.className = 'warn'
  } else if (s.truncationWarning) {
    el.evictions.textContent = 'truncated ⚠'
    el.evictions.className = 'warn'
  } else if (s.evictionsToday > 0) {
    el.evictions.textContent = `evicted ${s.evictionsToday} ⚠`
    el.evictions.className = 'warn'
  } else {
    el.evictions.textContent = 'evicted 0 ✓'
    el.evictions.className = 'ok'
  }

  anim.ringTarget = s.goalUsd > 0 ? s.usdToday / s.goalUsd : 0
  // The arc reflects the most recent measured rate while work is happening,
  // and decays to rest otherwise. M1/M2 have no token-level stream, so this
  // is last-completed throughput, not a live per-token reading.
  anim.arcTarget = s.phase === 'generating' ? (s.tokPerSec ?? 0) : 0
  anim.intensityTarget = INTENSITY_BY_PHASE[s.phase]

  if (document.body.classList.contains('expanded')) {
    renderPanelRows(el.panelRows, s)
    renderPanelTenants(el.panelTenants, s.byTenant)
  }

  kick()
}

// ------------------------------------------------------------- interaction

// Hover is detected in the main process by polling the cursor against the
// window bounds — a click-through window has WS_EX_TRANSPARENT, so DOM mouse
// events are not delivered to it. Main pushes the resulting state here.
window.fuel.onExpanded(async (next) => {
  document.body.classList.toggle('expanded', next)
  if (!next) return
  if (state) {
    renderPanelRows(el.panelRows, state)
    renderPanelTenants(el.panelTenants, state.byTenant)
    // Mark the nudge section as shadow so it's clear the count is being
    // withheld from the compact HUD during calibration.
    el.nudgeHeading.classList.toggle('shadow', state.nudgeMode === 'shadow')
  }
  const [events, nudges, catch_, receipts, evictions]: [
    RecentEvent[],
    Nudge[],
    CatchStats,
    ReceiptRecord[],
    EvictionEvent[],
  ] = await Promise.all([
    window.fuel.recentEvents(),
    window.fuel.recentNudges(),
    window.fuel.catchStats(),
    window.fuel.recentReceipts(),
    window.fuel.recentEvictions(),
  ])
  renderPanelTasks(el.panelTasks, events)
  renderPanelEvictions(el.panelEvictions, evictions)
  renderPanelCatch(el.panelCatch, catch_)
  renderPanelReceipts(el.panelReceipts, receipts)
  renderPanelNudges(el.panelNudges, nudges)
})

// Roll up / down. Main owns the state (it resizes the window and persists it)
// and echoes it back via onMini; the initial value arrives in the URL so the
// first paint already has the right layout.
document.body.classList.toggle(
  'mini',
  new URLSearchParams(location.search).get('size') === 'mini',
)
window.fuel.onMini((on) => document.body.classList.toggle('mini', on))
$('roll-up').addEventListener('click', () => window.fuel.setMini(true))
$('roll-down').addEventListener('click', () => window.fuel.setMini(false))

window.fuel.onInteractive((on) => {
  document.body.classList.toggle('interactive', on)
})

sizeCanvas()
window.addEventListener('resize', () => {
  sizeCanvas()
  draw()
})
window.fuel.onState(render)
draw()
