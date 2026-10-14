/**
 * Fx Studio (2026-10-14): every dial on the gauge's effects, with a live
 * preview. The form is built from FX_SCHEMA; each change re-draws the preview
 * at once and is saved (fx-config.ts) a moment later, which the HUD picks up
 * through the 'storage' event. The preview's dollars are a sandbox.
 */
import { DEFAULT_FX, FX_KEY, FX_PRESETS, FX_SCHEMA, loadFx, saveFx, type FxConfig, type FxField } from './fx-config.js'
import { drawArc } from './gauges/arc.js'
import {
  drawRing,
  drawRingBack,
  drawRingFront,
  drawRingParticles,
  ringConfetti,
  ringExplode,
  ringLasers,
  ringRipple,
  ringSparkle,
  setRingConfig,
  setRingFx,
  stepRingFx,
} from './gauges/ring.js'
import { GAUGE_SIZE, lapColor } from './theme.js'
import { TIERS, tierForLap, tierRank } from './tiers.js'

const GOAL = 2
const MILESTONES = [10, 25, 50, 100, 250, 500, 1000]
const CONFETTI: ReadonlyArray<readonly [number, number, number]> = [
  [248, 113, 113], [251, 146, 60], [251, 191, 36], [74, 222, 128], [34, 211, 238], [192, 132, 252], [255, 255, 255],
]
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T

let cfg: FxConfig = loadFx()
let saveTimer: ReturnType<typeof setTimeout> | null = null

// ------------------------------------------------------------------ preview

const canvas = $<HTMLCanvasElement>('preview')
const ctx = canvas.getContext('2d')!
const dpr = window.devicePixelRatio || 1
canvas.width = Math.round(GAUGE_SIZE * dpr)
canvas.height = Math.round(GAUGE_SIZE * dpr)
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

const sim = { usd: 6.4, shown: 6.4, working: true }
let last = performance.now()

function heat(): number {
  return sim.usd <= 0 ? 0 : Math.min(1, 0.2 + 0.065 * (sim.usd / GOAL))
}

function frame(now: number): void {
  const dt = Math.min(now - last, 100)
  last = now
  const intensity = sim.working ? 1 : 0.35
  // The figure rolls toward the sandbox's dollars like the gauge's does.
  const roll = cfg.enabled && cfg.number.roll ? 1 - Math.exp(-dt / (420 / cfg.number.rollSpeed)) : 1
  sim.shown += (sim.usd - sim.shown) * roll
  $('p-usd').textContent = `≈ $${sim.shown.toFixed(2)}`

  setRingFx(heat(), cfg.enabled)
  stepRingFx(dt, intensity, reduceMotion)
  ctx.clearRect(0, 0, GAUGE_SIZE, GAUGE_SIZE)
  drawRingBack(ctx, intensity)
  drawArc(ctx, { tokPerSec: sim.working ? 96 : 0, redline: 150, intensity })
  drawRing(ctx, { progress: sim.usd / GOAL, intensity, t: now, still: reduceMotion })
  drawRingParticles(ctx, intensity)
  drawRingFront(ctx, intensity)
  requestAnimationFrame(frame)
}

let labelTimer: ReturnType<typeof setTimeout> | null = null
function flashName(name: string, color: readonly number[]): void {
  if (!cfg.names.on) return
  const label = $('p-label')
  label.textContent = name
  label.style.color = `rgb(${color.join(', ')})`
  label.classList.add('is-tier')
  if (labelTimer) clearTimeout(labelTimer)
  labelTimer = setTimeout(() => {
    label.textContent = 'budget preserved'
    label.style.color = ''
    label.classList.remove('is-tier')
  }, 3200)
}

/** Move the sandbox to `usd`, firing the moments a real day would: laps, tiers, milestones, the number's pop. */
function setUsd(usd: number): void {
  const before = sim.usd
  sim.usd = Math.max(0, Math.min(80, usd))
  ;($('sim-usd') as HTMLInputElement).value = String(sim.usd)
  $('sim-usd-out').textContent = `$${sim.usd.toFixed(2)}`
  if (!(cfg.enabled && cfg.number.roll)) sim.shown = sim.usd
  if (sim.usd <= before) return

  const lapBefore = Math.floor(before / GOAL)
  const lap = Math.floor(sim.usd / GOAL)
  const tier = tierForLap(lap)
  const color = tier.id === 'solid' ? lapColor(lap) : tier.color
  if (lap > lapBefore) {
    ringRipple(1, color)
    if (cfg.enabled) {
      ringSparkle()
      if (cfg.explosions.onLap) ringExplode(color)
      if (cfg.lasers.onLap) ringLasers(color)
      if (cfg.confetti.onLap) ringConfetti(CONFETTI)
    }
  }
  if (tierRank(tier.id) > tierRank(tierForLap(lapBefore).id)) {
    ringRipple(2, tier.color)
    if (tier.name) flashName(tier.name.toUpperCase(), tier.color)
  }
  const crossed = MILESTONES.filter((m) => before < m && sim.usd >= m).pop()
  if (crossed) {
    if (cfg.enabled && cfg.confetti.onMilestone) ringConfetti(CONFETTI)
    if (cfg.enabled && cfg.explosions.onMilestone) ringExplode([253, 224, 71], 1.8)
    ringRipple(2, [251, 191, 36])
    flashName(`$${crossed.toLocaleString('en-US')} DAY`, [253, 224, 71])
  }
  if (cfg.enabled && cfg.number.pop) {
    const u = $('p-usd')
    u.classList.remove('is-pop')
    void u.offsetWidth
    u.classList.add('is-pop')
  }
  if (cfg.enabled && cfg.number.delta && sim.usd - before >= 0.01) {
    const d = document.createElement('div')
    d.className = 'p-delta'
    d.textContent = `+$${(sim.usd - before).toFixed(2)}`
    $('p-center').appendChild(d)
    setTimeout(() => d.remove(), 1500)
  }
}

$('sim-usd').addEventListener('input', (e) => setUsd(Number((e.target as HTMLInputElement).value)))
$('sim-add').addEventListener('click', () => setUsd(sim.usd + 0.25))
$('sim-lap').addEventListener('click', () => setUsd((Math.floor(sim.usd / GOAL) + 1) * GOAL + 0.04))
$('sim-tier').addEventListener('click', () => {
  const lap = Math.floor(sim.usd / GOAL)
  const next = TIERS.find((t) => t.fromLap > lap) ?? TIERS[TIERS.length - 1]!
  setUsd(next.fromLap * GOAL + 0.06)
})
$('sim-milestone').addEventListener('click', () => setUsd((MILESTONES.find((m) => m > sim.usd) ?? 80) + 0.05))
$('sim-reset').addEventListener('click', () => {
  sim.usd = 0
  sim.shown = 0
  setUsd(0)
})
for (const b of document.querySelectorAll<HTMLButtonElement>('#sim-phase button')) {
  b.addEventListener('click', () => {
    sim.working = b.dataset.phase === 'working'
    document.querySelectorAll('#sim-phase button').forEach((x) => x.classList.toggle('is-on', x === b))
  })
}

// ------------------------------------------------------------------ controls

/** Apply to the preview now; save shortly after, so a dragged slider is one write. */
function changed(): void {
  setRingConfig(cfg)
  $('preview-card').style.background = `rgba(7, 11, 17, ${cfg.card.opacity})`
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveFx(cfg), 120)
  syncDisabled()
}

function fieldValue(section: string, key: string): unknown {
  return (cfg[section as keyof FxConfig] as Record<string, unknown>)[key]
}

function setField(section: string, key: string, v: unknown): void {
  cfg = { ...cfg, [section]: { ...(cfg[section as keyof FxConfig] as object), [key]: v } }
  changed()
}

/** How a dial reads: opacity as a percentage, counts as whole numbers, the rest as multiples. */
const fmt = (f: FxField & { type: 'range' }, v: number): string =>
  f.key === 'opacity' ? `${Math.round(v * 100)}%` : f.step >= 1 ? String(Math.round(v)) : `${v.toFixed(2).replace(/\.?0+$/, '')}×`

function buildControls(): void {
  const host = $('sections')
  host.innerHTML = ''
  for (const s of FX_SCHEMA) {
    const box = document.createElement('div')
    box.className = 'fx-section'
    box.dataset.section = s.id
    box.innerHTML = `<h2>${s.title}</h2><p class="hint">${s.hint}</p>`
    for (const f of s.fields) {
      const row = document.createElement('label')
      row.className = 'fx-field'
      row.dataset.key = f.key
      const name = document.createElement('span')
      name.textContent = f.label
      row.appendChild(name)
      const v = fieldValue(s.id, f.key)
      if (f.type === 'toggle') {
        const input = document.createElement('input')
        input.type = 'checkbox'
        input.checked = v === true
        input.addEventListener('change', () => setField(s.id, f.key, input.checked))
        row.appendChild(input)
        row.appendChild(document.createElement('span'))
      } else if (f.type === 'range') {
        const input = document.createElement('input')
        input.type = 'range'
        input.min = String(f.min)
        input.max = String(f.max)
        input.step = String(f.step)
        input.value = String(v)
        const out = document.createElement('output')
        out.textContent = fmt(f, Number(v))
        input.addEventListener('input', () => {
          out.textContent = fmt(f, Number(input.value))
          setField(s.id, f.key, Number(input.value))
        })
        row.appendChild(input)
        row.appendChild(out)
      } else if (f.type === 'color') {
        const input = document.createElement('input')
        input.type = 'color'
        input.value = String(v)
        input.addEventListener('input', () => setField(s.id, f.key, input.value.toLowerCase()))
        row.appendChild(input)
        row.appendChild(document.createElement('span'))
      } else {
        const select = document.createElement('select')
        for (const o of f.options) {
          const opt = document.createElement('option')
          opt.value = o.value
          opt.textContent = o.label
          select.appendChild(opt)
        }
        select.value = String(v)
        select.addEventListener('change', () => setField(s.id, f.key, select.value))
        row.appendChild(select)
        row.appendChild(document.createElement('span'))
      }
      box.appendChild(row)
    }
    host.appendChild(box)
  }
  const master = $<HTMLInputElement>('master')
  master.checked = cfg.enabled
  syncDisabled()
}

/** Dim a section's dials while it (or everything) is switched off. */
function syncDisabled(): void {
  for (const box of document.querySelectorAll<HTMLElement>('.fx-section')) {
    const id = box.dataset.section!
    const section = cfg[id as keyof FxConfig] as Record<string, unknown>
    const sectionOff = 'on' in section && section.on === false
    const masterOff = !cfg.enabled && id !== 'card' && id !== 'names'
    for (const row of box.querySelectorAll<HTMLElement>('.fx-field')) {
      row.classList.toggle('is-off', masterOff || (sectionOff && row.dataset.key !== 'on'))
    }
  }
}

$<HTMLInputElement>('master').addEventListener('change', (e) => {
  cfg = { ...cfg, enabled: (e.target as HTMLInputElement).checked }
  changed()
})

$('defaults').addEventListener('click', () => {
  cfg = structuredClone(DEFAULT_FX)
  buildControls()
  changed()
})

const presets = $('presets')
for (const name of Object.keys(FX_PRESETS)) {
  const b = document.createElement('button')
  b.type = 'button'
  b.textContent = name
  b.addEventListener('click', () => {
    cfg = FX_PRESETS[name]!(cfg)
    buildControls()
    changed()
    // Show it off: a lap's worth of moments.
    setUsd((Math.floor(sim.usd / GOAL) + 1) * GOAL + 0.04)
  })
  presets.appendChild(b)
}

// Another studio window (or a reset) saved: follow it.
window.addEventListener('storage', (e) => {
  if (e.key !== FX_KEY) return
  cfg = loadFx()
  buildControls()
  setRingConfig(cfg)
})

buildControls()
changed()
setUsd(sim.usd)
requestAnimationFrame(frame)
