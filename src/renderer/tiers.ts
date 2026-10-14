/**
 * The budget ring's tiers (2026-10-14): it gets more exciting the more is
 * preserved. Laps are counted from 0 (lap 0 is the first circuit of the daily
 * goal); the first six are the solid rainbow (theme.ts LAP_COLORS), then each
 * tier adds motion. Counted in laps, not dollars, so a different daily goal
 * scales the whole ladder.
 */

export type TierId = 'solid' | 'aurora' | 'shimmer' | 'gold' | 'prism' | 'plasma'

export interface Tier {
  id: TierId
  /** The first lap (0-based) of this tier. */
  fromLap: number
  /** Shown under the dollar figure the first time a day reaches it. */
  name: string | null
  /** The colour its name and moments are drawn in. */
  color: readonly [number, number, number]
}

export const TIERS: readonly Tier[] = [
  { id: 'solid', fromLap: 0, name: null, color: [34, 211, 238] },
  { id: 'aurora', fromLap: 6, name: 'Aurora lap', color: [129, 140, 248] },
  { id: 'shimmer', fromLap: 8, name: 'Shimmer lap', color: [196, 181, 253] },
  { id: 'gold', fromLap: 10, name: 'Gold lap', color: [251, 191, 36] },
  { id: 'prism', fromLap: 15, name: 'Prism lap', color: [244, 114, 182] },
  { id: 'plasma', fromLap: 25, name: 'Plasma lap', color: [232, 121, 249] },
]

export function tierForLap(lap: number): Tier {
  let out = TIERS[0]!
  for (const t of TIERS) if (lap >= t.fromLap) out = t
  return out
}

/** Index in the ladder, so "a higher tier than before" is a plain comparison. */
export const tierRank = (id: TierId): number => TIERS.findIndex((t) => t.id === id)

/** Solid laps sit still; every later tier moves. */
export const tierMoves = (id: TierId): boolean => id !== 'solid'

/**
 * Frames per second for the moving tiers: smooth while the card is working,
 * a slow drift while idle, nothing when it's dark. A GPU monitor shouldn't
 * spend the GPU on itself.
 */
export function ambientFps(intensity: number, working = 30, idle = 10): number {
  if (intensity <= 0.05) return 0
  return intensity >= 0.7 ? working : idle
}
