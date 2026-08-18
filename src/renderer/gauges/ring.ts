import {
  clamp01,
  COLORS,
  CX,
  CY,
  lapColor,
  R_RING,
  rgba,
  START_ANGLE,
  SWEEP,
  W_RING,
} from '../theme.js'

export interface RingOptions {
  /**
   * Multiples of the daily goal, unbounded. 0.4 = 40% of lap one; 2.3 = 30%
   * into lap three. The integer part picks the colour, the fraction the sweep.
   */
  progress: number
  /** Dims the whole ring when the HUD is idle. */
  intensity: number
}

/**
 * The centre ring: cumulative budget preserved today, filling toward the
 * daily goal. This is the headline metric, so it gets the glow.
 *
 * One ring, lapping. Reaching the goal empties the sweep and starts again in
 * the next lap colour (red → yellow → orange → green → blue), and the lap just
 * completed stays on the track as a faint tint so a rollover is visible even
 * mid-lap. No second ring, no pinning at 100%.
 */
export function drawRing(
  ctx: CanvasRenderingContext2D,
  { progress, intensity }: RingOptions,
): void {
  const p = Math.max(0, progress)
  const lap = Math.floor(p)
  const filled = clamp01(p - lap)
  const color = lapColor(lap)

  // Track: neutral on the first lap, otherwise the colour of the lap that was
  // just completed — the ring "remembers" it rolled over.
  ctx.beginPath()
  ctx.arc(CX, CY, R_RING, START_ANGLE, START_ANGLE + SWEEP)
  ctx.strokeStyle = lap > 0 ? rgba(lapColor(lap - 1), 0.28) : COLORS.track
  ctx.lineWidth = W_RING
  ctx.lineCap = 'round'
  ctx.stroke()

  if (filled > 0.001) {
    const end = START_ANGLE + SWEEP * filled

    ctx.save()
    ctx.shadowColor = rgba(color, 0.55 * intensity)
    ctx.shadowBlur = 16 * intensity

    // Same top-to-bottom light/dark falloff as before, in the lap's own hue.
    const dark: readonly [number, number, number] = [
      Math.round(color[0] * 0.62),
      Math.round(color[1] * 0.62),
      Math.round(color[2] * 0.62),
    ]
    const grad = ctx.createLinearGradient(0, CY - R_RING, 0, CY + R_RING)
    grad.addColorStop(0, rgba(color, 1))
    grad.addColorStop(1, rgba(dark, 1))

    ctx.beginPath()
    ctx.arc(CX, CY, R_RING, START_ANGLE, end)
    ctx.strokeStyle = grad
    ctx.lineWidth = W_RING
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()
  }
}
