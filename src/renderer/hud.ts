import type { HudState, Nudge, RecentEvent } from '../shared/types.js'
import { TOK_PER_SEC_REDLINE, UTIL_HISTORY_LEN } from '../shared/constants.js'
import { GAUGE_SIZE, lerp } from './theme.js'
import { drawRing } from './gauges/ring.js'
import { drawArc } from './gauges/arc.js'
import { drawSparkline } from './gauges/sparkline.js'
import { renderPanelNudges, renderPanelRows, renderPanelTasks } from './panel.js'

const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T

const el = {
  model: $('model'),
  status: $('status'),
  usd: $('usd'),
  tokens: $('tokens'),
  tps: $('tps'),
  hw: $('hw'),
  ctx: $('ctx'),
  unburned: $('unburned'),
  nudgeHeading: $('nudge-heading'),
  panelRows: $('panel-rows'),
  panelTasks: $('panel-tasks'),
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

const PHASE_LABEL: Record<HudState['phase'], string> = {
  offline: 'ollama offline',
  'idle-evicted': 'not loaded',
  'idle-resident': 'resident',
  warming: 'warming up…',
  generating: 'generating',
}

function render(s: HudState): void {
  state = s

  document.body.classList.toggle('truncated', s.truncationWarning)
  for (const c of Array.from(document.body.classList)) {
    if (c.startsWith('phase-')) document.body.classList.remove(c)
  }
  document.body.classList.add(`phase-${s.phase}`)

  el.model.textContent =
    s.resident?.name ?? (s.ollama === 'online' ? 'no model loaded' : '—')

  const label = PHASE_LABEL[s.phase]
  el.status.textContent =
    s.evictInSec != null && s.phase === 'idle-resident'
      ? `${label} · evict in ${fmtCountdown(s.evictInSec)}`
      : label

  el.usd.textContent = `≈ $${s.usdToday.toFixed(2)}`
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

  if (s.truncationWarning) {
    el.ctx.textContent = 'truncated ⚠'
    el.ctx.className = 'warn'
  } else if (s.contextLength != null) {
    const small = s.contextLength <= 4096
    el.ctx.textContent = `ctx ${fmtTokens(s.contextLength)}${small ? ' ⚠' : ' ✓'}`
    el.ctx.className = small ? 'warn' : 'ok'
  } else {
    el.ctx.textContent = ''
    el.ctx.className = ''
  }

  anim.ringTarget = s.goalUsd > 0 ? s.usdToday / s.goalUsd : 0
  // The arc reflects the most recent measured rate while work is happening,
  // and decays to rest otherwise. M1/M2 have no token-level stream, so this
  // is last-completed throughput, not a live per-token reading.
  anim.arcTarget = s.phase === 'generating' ? (s.tokPerSec ?? 0) : 0
  anim.intensityTarget = INTENSITY_BY_PHASE[s.phase]

  if (document.body.classList.contains('expanded')) {
    renderPanelRows(el.panelRows, s)
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
    // Mark the nudge section as shadow so it's clear the count is being
    // withheld from the compact HUD during calibration.
    el.nudgeHeading.classList.toggle('shadow', state.nudgeMode === 'shadow')
  }
  const [events, nudges]: [RecentEvent[], Nudge[]] = await Promise.all([
    window.fuel.recentEvents(),
    window.fuel.recentNudges(),
  ])
  renderPanelTasks(el.panelTasks, events)
  renderPanelNudges(el.panelNudges, nudges)
})

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
