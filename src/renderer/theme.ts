/** Shared gauge geometry and palette. Keep in sync with style.css. */

export const COLORS = {
  accent: '#22d3ee',
  accentSoft: 'rgba(34, 211, 238, 0.85)',
  track: 'rgba(148, 163, 184, 0.14)',
  warn: '#fbbf24',
  bad: '#f87171',
  good: '#4ade80',
} as const

/**
 * The budget ring laps. Each full circuit of the daily goal resets the sweep
 * and advances one step along this sequence, so the colour alone says how many
 * times over the goal today has gone: red is the first lap, blue the fifth
 * and beyond. Stored as [r,g,b] so glow and track tints can be derived.
 */
export const LAP_COLORS: ReadonlyArray<readonly [number, number, number]> = [
  [248, 113, 113], // red
  [251, 191, 36], //  yellow
  [251, 146, 60], //  orange
  [74, 222, 128], //  green
  [34, 211, 238], //  blue
]

export function lapColor(lap: number): readonly [number, number, number] {
  return LAP_COLORS[Math.min(Math.max(0, lap), LAP_COLORS.length - 1)]!
}

export function rgba(c: readonly [number, number, number], a: number): string {
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`
}

/** Canvas size in CSS pixels. The window reserves room for exactly this. */
export const GAUGE_SIZE = 240

export const CX = GAUGE_SIZE / 2
export const CY = GAUGE_SIZE / 2

/**
 * A 270-degree sweep with the gap at the bottom, running clockwise from
 * lower-left. Canvas angles increase clockwise with y pointing down.
 */
export const START_ANGLE = (135 * Math.PI) / 180
export const SWEEP = (270 * Math.PI) / 180
export const END_ANGLE = START_ANGLE + SWEEP

/** Radii, outermost first. */
export const R_TICK_OUT = 116
export const R_TICK_IN = 108
export const R_ARC = 100 // live tok/s
export const R_RING = 82 // cumulative budget

export const W_ARC = 3
export const W_RING = 9

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/** Linear interpolation used by the frame-rate-independent easing in hud.ts. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
