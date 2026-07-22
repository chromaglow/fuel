import {
  clamp01,
  COLORS,
  CX,
  CY,
  R_ARC,
  R_TICK_IN,
  R_TICK_OUT,
  START_ANGLE,
  SWEEP,
  W_ARC,
} from '../theme.js'

const TICKS = 10

export interface ArcOptions {
  /** Live throughput, tokens/sec. */
  tokPerSec: number
  /** Full-scale value; the redline sits at the top of the sweep. */
  redline: number
  intensity: number
}

/** Tick marks around the outer sweep — the tachometer bezel. */
function drawTicks(ctx: CanvasRenderingContext2D, progress: number): void {
  for (let i = 0; i <= TICKS; i++) {
    const t = i / TICKS
    const a = START_ANGLE + SWEEP * t
    // Guard the zero case, or tick 0 reads as lit at rest.
    const lit = progress > 0 && t <= progress
    const major = i % 5 === 0

    const rIn = major ? R_TICK_IN - 3 : R_TICK_IN
    ctx.beginPath()
    ctx.moveTo(CX + Math.cos(a) * rIn, CY + Math.sin(a) * rIn)
    ctx.lineTo(CX + Math.cos(a) * R_TICK_OUT, CY + Math.sin(a) * R_TICK_OUT)
    ctx.strokeStyle = lit
      ? COLORS.accentSoft
      : 'rgba(148, 163, 184, 0.22)'
    ctx.lineWidth = major ? 1.8 : 1
    ctx.stroke()
  }
}

/**
 * The outer arc: live generation throughput. This is the motion that proves
 * the HUD is alive — it sweeps during generation and decays back to rest.
 */
export function drawArc(
  ctx: CanvasRenderingContext2D,
  { tokPerSec, redline, intensity }: ArcOptions,
): void {
  const progress = clamp01(tokPerSec / redline)

  drawTicks(ctx, progress)

  ctx.beginPath()
  ctx.arc(CX, CY, R_ARC, START_ANGLE, START_ANGLE + SWEEP)
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.10)'
  ctx.lineWidth = W_ARC
  ctx.stroke()

  if (progress <= 0.001) return

  const end = START_ANGLE + SWEEP * progress
  // Past the redline the sweep turns amber rather than just saturating.
  const over = tokPerSec > redline * 0.92

  ctx.save()
  ctx.shadowColor = over
    ? `rgba(251, 191, 36, ${0.6 * intensity})`
    : `rgba(34, 211, 238, ${0.5 * intensity})`
  ctx.shadowBlur = 12 * intensity
  ctx.beginPath()
  ctx.arc(CX, CY, R_ARC, START_ANGLE, end)
  ctx.strokeStyle = over ? COLORS.warn : COLORS.accent
  ctx.lineWidth = W_ARC
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.restore()

  // Bright head at the leading edge, so the sweep reads directionally.
  ctx.beginPath()
  ctx.arc(
    CX + Math.cos(end) * R_ARC,
    CY + Math.sin(end) * R_ARC,
    2.6,
    0,
    Math.PI * 2,
  )
  ctx.fillStyle = over ? COLORS.warn : '#a5f3fc'
  ctx.fill()
}
