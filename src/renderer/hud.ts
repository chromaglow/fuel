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
import { CY, GAUGE_SIZE, lapColor, lerp, R_RING, W_RING } from './theme.js'
import { drawRing, drawRingBack, drawRingFront, drawRingParticles, ringBurstAlive, ringConfetti, ringExplode, ringFxAlive, ringLasers, ringLively, ringRipple, ringSparkle, setRingConfig, setRingFx, stepRingFx } from './gauges/ring.js'
import { FX_KEY, loadFx, saveFx, type FxConfig } from './fx-config.js'
import { ambientFps, tierForLap, tierMoves, tierRank } from './tiers.js'
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
import { renderHistory, wireEffects, wireHistory } from './history.js'

const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T

/** The Fx Studio's settings (see applyFx below); loaded first, since startup code reads them. */
let fx: FxConfig = loadFx()
let lively = fx.enabled

/** The dollar figure's design size, and the smallest it may shrink to. */
const USD_FONT_MAX = 31
const USD_FONT_MIN = 14
/** Clearance between the figure and the ring's inner edge, px. */
const USD_RING_GAP = 7
/** What the figure was last fitted for, so the fit runs only when the text (or visibility) changes. */
let usdFitted = ''

/**
 * Keep the dollar figure inside the budget ring. The text grows through the
 * day ($1.20 → $11.67 → $123.45), and at the design's 31px it ran over the
 * ring. The room is the ring's inner chord at the figure's own height, so it
 * steps the font down a pixel at a time until the figure clears it.
 */
function fitUsd(): void {
  const usd = el.usd
  // Hidden (rolled up): nothing to measure. Fit when it shows again.
  if (usd.offsetParent === null) {
    usdFitted = ''
    return
  }
  // Keyed by the figure's shape (digits as 0s): a rolling odometer only re-fits when it gains a digit.
  const shape = (usd.textContent ?? '').replace(/\d/g, '0')
  if (usdFitted === shape) return
  const wrap = $('gauge-wrap').getBoundingClientRect()
  const inner = R_RING - W_RING / 2 - USD_RING_GAP
  let size = USD_FONT_MAX
  usd.style.fontSize = `${size}px`
  for (; size > USD_FONT_MIN; size--) {
    const r = usd.getBoundingClientRect()
    const dy = r.top + r.height / 2 - (wrap.top + (CY * wrap.height) / GAUGE_SIZE)
    const room = 2 * Math.sqrt(Math.max(0, inner * inner - dy * dy))
    if (usd.scrollWidth <= room) break
    usd.style.fontSize = `${size - 1}px`
  }
  usdFitted = shape
}

const el = {
  model: $('model'),
  status: $('status'),
  usd: $('usd'),
  miniUsd: $('mini-usd'),
  mini: $('mini'),
  miniTicks: [...$('mini-meter').children] as HTMLElement[],
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
  /** The dollar figure rolls up to its target like an odometer. */
  usd: 0,
  usdTarget: 0,
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

function draw(now = performance.now()): void {
  ctx2d.clearRect(0, 0, GAUGE_SIZE, GAUGE_SIZE)
  writeUsd()
  drawRingBack(ctx2d, anim.intensity)

  drawArc(ctx2d, {
    tokPerSec: anim.arc,
    redline: TOK_PER_SEC_REDLINE,
    intensity: anim.intensity,
  })
  drawRing(ctx2d, { progress: anim.ring, intensity: anim.intensity, t: now, still: reduceMotion })

  if (state) {
    drawSparkline(ctx2d, {
      history: state.utilHistory,
      capacity: UTIL_HISTORY_LEN,
      intensity: anim.intensity,
    })
  }
  drawRingParticles(ctx2d, anim.intensity)
  drawRingFront(ctx2d, anim.intensity)
}

/** The dollar figure as it stands mid-roll. */
function writeUsd(): void {
  const text = `≈ $${anim.usd.toFixed(2)}`
  if (el.usd.textContent === text) return
  el.usd.textContent = text
  fitUsd()
}

/**
 * Frame-rate-independent easing. The loop is *event driven*: it runs only
 * while a value is still travelling, then stops dead. With nothing moving the
 * HUD does no work at all, which is what keeps idle CPU near zero — a monitor
 * that taxes the thing it monitors is self-defeating.
 */
const TAU = { ring: 260, arc: 180, intensity: 320, usd: 420 }
const EPS = { ring: 0.0005, arc: 0.05, intensity: 0.004, usd: 0.004 }

let raf = 0
let lastFrame = 0
/** When the moving tiers last drew, so they keep to ambientFps. */
let lastAmbient = 0

/**
 * The moving tiers (Aurora and up) and the moments (ripples, sparks) need
 * frames even when nothing is easing. Only while the card is visible, rolled
 * down or up but on screen, not dark, and motion isn't reduced.
 */
function needsAmbient(): boolean {
  if (reduceMotion || document.hidden || !state || document.body.classList.contains('mini')) return false
  if (ambientFps(anim.intensity, fx.global.fpsWorking, fx.global.fpsIdle) === 0) return false
  return tierMoves(tierForLap(Math.floor(Math.max(0, anim.ring))).id) || ringFxAlive() || ringLively()
}

function settled(): boolean {
  return (
    Math.abs(anim.ring - anim.ringTarget) < EPS.ring &&
    Math.abs(anim.usd - anim.usdTarget) < EPS.usd &&
    Math.abs(anim.arc - anim.arcTarget) < EPS.arc &&
    Math.abs(anim.intensity - anim.intensityTarget) < EPS.intensity
  )
}

function snap(): void {
  anim.ring = anim.ringTarget
  anim.usd = anim.usdTarget
  anim.arc = anim.arcTarget
  anim.intensity = anim.intensityTarget
}

function frame(now: number): void {
  const dt = lastFrame ? Math.min(now - lastFrame, 100) : 16
  lastFrame = now

  anim.ring = lerp(anim.ring, anim.ringTarget, 1 - Math.exp(-dt / TAU.ring))
  anim.usd = lerp(anim.usd, anim.usdTarget, 1 - Math.exp(-dt / TAU.usd))
  anim.arc = lerp(anim.arc, anim.arcTarget, 1 - Math.exp(-dt / TAU.arc))
  anim.intensity = lerp(
    anim.intensity,
    anim.intensityTarget,
    1 - Math.exp(-dt / TAU.intensity),
  )
  stepRingFx(dt, anim.intensity, reduceMotion)

  const easing = !settled()
  if (!easing) snap()
  // Easing draws every frame; a burst (ripple, confetti) gets up to 30 fps; the
  // steady fire, glints and moving tiers keep to the ambient pace (30 working, 10 idle).
  const fps = ringBurstAlive() ? Math.max(30, fx.global.fpsWorking) : ambientFps(anim.intensity, fx.global.fpsWorking, fx.global.fpsIdle)
  if (easing || (fps > 0 && now - lastAmbient >= 1000 / fps - 2)) {
    draw(now)
    lastAmbient = now
  }

  if (!easing && !needsAmbient()) {
    draw(now)
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
  if (settled() && !needsAmbient()) {
    draw()
    return
  }
  if (!raf) raf = requestAnimationFrame(frame)
}

// A hidden window stops the ambient loop; showing it again restarts it.
document.addEventListener('visibilitychange', () => kick())

// ---------------------------------------------------------------- moments

/** Today's highest tier, kept across restarts so a relaunch doesn't replay its burst. */
const TIER_KEY = 'fuel.tierSeen'
let lapSeen: number | null = null
let daySeen = ''
let tierSeen = 0
/** The best day before today; beating it lights the record badge. Null until the history loads. */
let recordToBeat: number | null = null
let recordShown = false
let tierLabelTimer: ReturnType<typeof setTimeout> | null = null

function loadTierSeen(day: string): number | null {
  try {
    const v = JSON.parse(localStorage.getItem(TIER_KEY) ?? 'null') as { day?: string; rank?: number } | null
    return v && v.day === day && typeof v.rank === 'number' ? v.rank : null
  } catch {
    return null
  }
}

function saveTierSeen(day: string, rank: number): void {
  try {
    localStorage.setItem(TIER_KEY, JSON.stringify({ day, rank }))
  } catch {
    // Storage refused: the burst may replay after a restart, nothing worse.
  }
}

/** The tier's name, in its colour, where "budget preserved" sits, for about three seconds. */
function flashTierName(name: string, color: readonly [number, number, number]): void {
  if (!fx.names.on) return
  const label = $('usd-label')
  label.textContent = name
  label.style.color = `rgb(${color.join(', ')})`
  label.classList.add('is-tier')
  if (tierLabelTimer) clearTimeout(tierLabelTimer)
  tierLabelTimer = setTimeout(() => {
    label.classList.remove('is-tier')
    label.textContent = 'budget preserved'
    label.style.color = ''
  }, 3200)
}

async function loadRecord(): Promise<void> {
  try {
    const h = await window.fuel.history()
    recordToBeat = h.bestBeforeToday?.usd ?? 0
  } catch {
    recordToBeat = null
  }
}

/**
 * Lap completed: a ripple. A higher tier than any reached today: a bigger
 * burst and its name. Today passing the best day ever: a burst and the
 * New record badge. Nothing fires on the first state after launch, so a
 * restart doesn't replay the day.
 */
function moments(s: HudState): void {
  const day = s.today.day
  const lap = s.goalUsd > 0 ? Math.floor(s.usdToday / s.goalUsd) : 0
  const tier = tierForLap(lap)
  const rank = tierRank(tier.id)

  if (day !== daySeen) {
    // Launch or midnight: start the day's bookkeeping quietly.
    daySeen = day
    lapSeen = lap
    tierSeen = loadTierSeen(day) ?? rank
    saveTierSeen(day, tierSeen)
    milestoneSeen = loadMilestone(day) ?? (MILESTONES.filter((m) => s.usdToday >= m).pop() ?? 0)
    saveMilestone(day, milestoneSeen)
    recordShown = false
    recordToBeat = null
    void loadRecord()
  } else {
    if (lapSeen !== null && lap > lapSeen) {
      const c = tier.id === 'solid' ? lapColor(lap) : tier.color
      ringRipple(1, c)
      if (lively) {
        ringSparkle()
        if (fx.explosions.onLap) ringExplode(c)
        if (fx.lasers.onLap) ringLasers(c)
        if (fx.confetti.onLap) ringConfetti(CONFETTI)
      }
    }
    const milestone = MILESTONES.filter((m) => s.usdToday >= m).pop() ?? 0
    if (milestone > milestoneSeen) {
      milestoneSeen = milestone
      saveMilestone(day, milestone)
      if (lively) {
        if (fx.confetti.onMilestone) ringConfetti(CONFETTI)
        if (fx.explosions.onMilestone) ringExplode([253, 224, 71], 1.8)
      }
      ringRipple(2, [251, 191, 36])
      flashTierName(`$${milestone.toLocaleString('en-US')} DAY`, [253, 224, 71])
    }
    if (rank > tierSeen) {
      tierSeen = rank
      saveTierSeen(day, rank)
      ringRipple(2, tier.color)
      if (tier.name) flashTierName(tier.name.toUpperCase(), tier.color)
    }
    lapSeen = lap
  }

  const record = recordToBeat !== null && recordToBeat > 0 && s.usdToday > recordToBeat
  if (record && !recordShown && lapSeen !== null) {
    // Only celebrate a crossing seen live; at launch the badge just shows.
    if (s.usdToday - recordToBeat! < s.goalUsd) ringRipple(2, [251, 191, 36])
  }
  recordShown = record
  $('record').hidden = !record

  // The flames' heat: a little from the first cent, roaring by about $25 at the $2 goal.
  setRingFx(s.usdToday <= 0 || s.goalUsd <= 0 ? 0 : Math.min(1, 0.2 + 0.065 * (s.usdToday / s.goalUsd)), lively)
}

// ---------------------------------------------------------- lively number

/** Dollar milestones that throw confetti the first time a day reaches them. */
const MILESTONES = [10, 25, 50, 100, 250, 500, 1000]
const CONFETTI: ReadonlyArray<readonly [number, number, number]> = [
  [248, 113, 113], [251, 146, 60], [251, 191, 36], [74, 222, 128], [34, 211, 238], [192, 132, 252], [255, 255, 255],
]
const MILESTONE_KEY = 'fuel.milestoneSeen'
let milestoneSeen = 0
let usdStarted = false
let popTimer: ReturnType<typeof setTimeout> | null = null

function loadMilestone(day: string): number | null {
  try {
    const v = JSON.parse(localStorage.getItem(MILESTONE_KEY) ?? 'null') as { day?: string; usd?: number } | null
    return v && v.day === day && typeof v.usd === 'number' ? v.usd : null
  } catch {
    return null
  }
}

function saveMilestone(day: string, usd: number): void {
  try {
    localStorage.setItem(MILESTONE_KEY, JSON.stringify({ day, usd }))
  } catch {
    // Storage refused: a milestone may replay after a restart.
  }
}

/**
 * New dollars: the figure rolls up to them like an odometer, pops for a
 * moment, and the amount just added floats up off it. The first reading after
 * launch (and every reading in Calm or reduced motion) just shows the number.
 */
function rollUsd(target: number): void {
  const gained = target - anim.usdTarget
  anim.usdTarget = target
  if (!usdStarted || !lively || !fx.number.roll || reduceMotion || gained < 0) {
    anim.usd = target
    usdStarted = true
    writeUsd()
    return
  }
  if (gained < 0.005) return
  if (fx.number.pop) {
    el.usd.classList.remove('is-pop')
    void el.usd.offsetWidth // restart the animation
    el.usd.classList.add('is-pop')
    if (popTimer) clearTimeout(popTimer)
    popTimer = setTimeout(() => el.usd.classList.remove('is-pop'), 600)
  }
  if (fx.number.delta && gained >= 0.01) floatDelta(gained)
}

function floatDelta(gained: number): void {
  const d = document.createElement('div')
  d.className = 'usd-delta'
  d.textContent = `+$${gained.toFixed(2)}`
  $('center').appendChild(d)
  setTimeout(() => d.remove(), 1500)
}

// ---------------------------------------------------------- lively / calm

/**
 * The Fx Studio's settings (fx-config.ts). Calm is the master switch; the
 * studio window writes the rest, and a 'storage' event brings each change
 * here at once.
 */
function applyFx(): void {
  lively = fx.enabled
  setRingConfig(fx)
  TAU.usd = 420 / fx.number.rollSpeed
  // A more solid card: the desktop showing through the text was distracting.
  document.documentElement.style.setProperty('--panel', `rgba(7, 11, 17, ${fx.card.opacity})`)
  if (state) setRingFx(state.usdToday <= 0 ? 0 : Math.min(1, 0.2 + 0.065 * (state.usdToday / Math.max(0.01, state.goalUsd))), lively)
  kick()
}

window.addEventListener('storage', (e) => {
  if (e.key !== FX_KEY && e.key !== null) return
  fx = loadFx()
  applyFx()
})

export function setLively(on: boolean): void {
  fx = { ...fx, enabled: on }
  saveFx(fx)
  applyFx()
}

export const isLively = (): boolean => lively

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

  rollUsd(s.usdToday)
  el.miniUsd.textContent = `≈ $${s.usdToday.toFixed(2)}`
  renderMiniMeter(s)
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
  moments(s)
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

/**
 * The mini pill's fuel ticks: lit while anything is processed locally, by
 * any tenant (amber loading, green working), ten segments tracking GPU load.
 * At least one tick stays lit while working, so a light moment never reads
 * as idle. Updates once a second with the state push; no animation loop.
 */
function renderMiniMeter(s: HudState): void {
  el.mini.dataset['activity'] = s.activity
  const util = s.activity === 'idle' ? 0 : (s.gpu?.utilGpu ?? 0)
  const lit = s.activity === 'idle' ? 0 : Math.max(1, Math.round(util / 10))
  el.miniTicks.forEach((t, i) => t.classList.toggle('on', i < lit))
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
// ---------------------------------------------------------------- history

const historyEl = $('history')
const historyBody = $('history-body')

async function openHistory(): Promise<void> {
  const h = await window.fuel.history()
  historyBody.innerHTML = renderHistory(h)
  wireHistory(historyBody, h)
  wireEffects(historyBody, isLively(), setLively)
  historyEl.hidden = false
  document.body.classList.add('history-open')
  // Keeps the card rolled down while it's open, even with the cursor elsewhere.
  window.fuel.setHistoryOpen(true)
}

function closeHistory(): void {
  if (historyEl.hidden) return
  historyEl.hidden = true
  document.body.classList.remove('history-open')
  window.fuel.setHistoryOpen(false)
}

$('history-open').addEventListener('click', () => void openHistory())
$('studio-open').addEventListener('click', () => window.fuel.openStudio())
$('history-close').addEventListener('click', closeHistory)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeHistory()
})

window.fuel.onMini((on) => {
  if (on) closeHistory()
  document.body.classList.toggle('mini', on)
  // Rolled down again: the moving tiers pick up where they left off.
  kick()
})
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

// The studio's settings, applied once everything above exists.
applyFx()
