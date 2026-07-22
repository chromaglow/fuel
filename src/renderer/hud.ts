import type { HudState } from '../shared/types.js'
import { TOK_PER_SEC_REDLINE, UTIL_HISTORY_LEN } from '../shared/constants.js'

const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T

const el = {
  model: $('model'),
  status: $('status'),
  usd: $('usd'),
  tokens: $('tokens'),
  util: $('util'),
  tps: $('tps'),
  vram: $('vram'),
  power: $('power'),
  tasks: $('tasks'),
  ctx: $('ctx'),
  spark: $<HTMLCanvasElement>('spark'),
}

const ctx2d = el.spark.getContext('2d')!

function fmtTokens(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

function fmtCountdown(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtGb(mb: number): string {
  return (mb / 1024).toFixed(2)
}

/** Scale the backing store to the device pixel ratio so lines stay crisp. */
function sizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1
  const rect = el.spark.getBoundingClientRect()
  el.spark.width = Math.round(rect.width * dpr)
  el.spark.height = Math.round(rect.height * dpr)
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function drawSparkline(history: number[]): void {
  const dpr = window.devicePixelRatio || 1
  const w = el.spark.width / dpr
  const h = el.spark.height / dpr
  ctx2d.clearRect(0, 0, w, h)

  if (history.length < 2) return

  // Always plot against a fixed-width window so the line scrolls rather than
  // stretching as history accumulates.
  const pad = 2
  const usable = h - pad * 2
  const step = w / (UTIL_HISTORY_LEN - 1)
  const offset = Math.max(0, UTIL_HISTORY_LEN - history.length)

  const pointAt = (i: number): [number, number] => {
    const x = (offset + i) * step
    const y = pad + usable - (Math.min(100, Math.max(0, history[i]!)) / 100) * usable
    return [x, y]
  }

  // Filled area under the curve.
  ctx2d.beginPath()
  const [x0, y0] = pointAt(0)
  ctx2d.moveTo(x0, h)
  ctx2d.lineTo(x0, y0)
  for (let i = 1; i < history.length; i++) {
    const [x, y] = pointAt(i)
    ctx2d.lineTo(x, y)
  }
  ctx2d.lineTo((offset + history.length - 1) * step, h)
  ctx2d.closePath()
  const grad = ctx2d.createLinearGradient(0, 0, 0, h)
  grad.addColorStop(0, 'rgba(34, 211, 238, 0.30)')
  grad.addColorStop(1, 'rgba(34, 211, 238, 0.02)')
  ctx2d.fillStyle = grad
  ctx2d.fill()

  // Stroke on top.
  ctx2d.beginPath()
  ctx2d.moveTo(x0, y0)
  for (let i = 1; i < history.length; i++) {
    const [x, y] = pointAt(i)
    ctx2d.lineTo(x, y)
  }
  ctx2d.strokeStyle = 'rgba(34, 211, 238, 0.85)'
  ctx2d.lineWidth = 1.25
  ctx2d.lineJoin = 'round'
  ctx2d.stroke()
}

const PHASE_LABEL: Record<HudState['phase'], string> = {
  offline: 'ollama offline',
  'idle-evicted': 'not loaded',
  'idle-resident': 'resident',
  warming: 'warming up…',
  generating: 'generating',
}

function render(s: HudState): void {
  document.body.className = `phase-${s.phase}`

  el.model.textContent = s.resident?.name ?? (s.ollama === 'online' ? 'no model loaded' : '—')

  const label = PHASE_LABEL[s.phase]
  el.status.textContent =
    s.evictInSec != null && s.phase === 'idle-resident'
      ? `${label} · evict in ${fmtCountdown(s.evictInSec)}`
      : label

  el.usd.textContent = `≈ $${s.usdToday.toFixed(2)}`
  el.tokens.textContent = `${fmtTokens(s.today.evalTokens + s.today.promptTokens)} tok today`

  el.util.textContent = `${s.gpu?.utilGpu ?? 0}% gpu`
  if (s.tokPerSec != null) {
    const over = s.tokPerSec > TOK_PER_SEC_REDLINE
    el.tps.textContent = `${s.tokPerSec.toFixed(1)} tok/s`
    el.tps.style.color = over ? 'var(--warn)' : 'var(--accent)'
  } else {
    el.tps.textContent = '— tok/s'
    el.tps.style.color = 'var(--muted)'
  }

  if (s.gpu) {
    el.vram.textContent = `⬡ ${fmtGb(s.gpu.memUsedMb)} / ${fmtGb(s.gpu.memTotalMb)} GB`
    el.power.textContent = `⬡ ${Math.round(s.gpu.powerW)} W · ${s.gpu.tempC}°C`
  } else {
    el.vram.textContent = '⬡ no gpu'
    el.power.textContent = '⬡ —'
  }

  el.tasks.textContent = `${s.today.tasks} task${s.today.tasks === 1 ? '' : 's'}`

  // The 4,096-context bug is the single most consequential thing this HUD can
  // surface before Phase C fixes it (SPEC.md §2.2).
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

  drawSparkline(s.utilHistory)
}

sizeCanvas()
window.addEventListener('resize', sizeCanvas)
window.fuel.onState(render)
