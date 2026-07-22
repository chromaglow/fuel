import {
  clamp01,
  COLORS,
  CX,
  CY,
  R_RING,
  START_ANGLE,
  SWEEP,
  W_RING,
} from '../theme.js'

export interface RingOptions {
  /** 0..1 of the daily goal. Values above 1 spill into the overflow ring. */
  progress: number
  /** Dims the whole ring when the HUD is idle. */
  intensity: number
}

/**
 * The centre ring: cumulative budget preserved today, filling toward the
 * daily goal. This is the headline metric, so it gets the glow.
 *
 * Past 100% a second, thinner ring accumulates outside the first rather than
 * the gauge simply pinning — overshoot should feel like a reward.
 */
export function drawRing(
  ctx: CanvasRenderingContext2D,
  { progress, intensity }: RingOptions,
): void {
  const filled = clamp01(progress)
  const overflow = clamp01(progress - 1)

  // Track.
  ctx.beginPath()
  ctx.arc(CX, CY, R_RING, START_ANGLE, START_ANGLE + SWEEP)
  ctx.strokeStyle = COLORS.track
  ctx.lineWidth = W_RING
  ctx.lineCap = 'round'
  ctx.stroke()

  if (filled > 0.001) {
    const end = START_ANGLE + SWEEP * filled

    ctx.save()
    ctx.shadowColor = `rgba(34, 211, 238, ${0.55 * intensity})`
    ctx.shadowBlur = 16 * intensity

    const grad = ctx.createLinearGradient(0, CY - R_RING, 0, CY + R_RING)
    grad.addColorStop(0, '#67e8f9')
    grad.addColorStop(1, '#0891b2')

    ctx.beginPath()
    ctx.arc(CX, CY, R_RING, START_ANGLE, end)
    ctx.strokeStyle = grad
    ctx.lineWidth = W_RING
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()
  }

  if (overflow > 0.001) {
    ctx.beginPath()
    ctx.arc(
      CX,
      CY,
      R_RING + W_RING,
      START_ANGLE,
      START_ANGLE + SWEEP * overflow,
    )
    ctx.strokeStyle = COLORS.overflow
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.stroke()
  }
}
