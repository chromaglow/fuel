import type { EvictionEvent, ResidentModel } from '@shared/types'

/**
 * A model that leaves VRAM *at* its keep-alive deadline timed out on its own —
 * cheap, expected, and Ollama's default behaviour. One that leaves *before* it
 * was shoved out to make room, and that reload is what stalls the box. Anything
 * closer to the deadline than this is treated as a natural timeout (Ollama's
 * expiry check runs on a coarse ticker, so a second or two of slop is normal).
 */
export const EVICTION_EARLY_THRESHOLD_MS = 5_000

/**
 * A departed model waits this long for a newcomer to blame. Ollama unloads,
 * then loads, and /api/ps can briefly show neither; the newcomer usually
 * appears within a tick or two, but a large model can take longer to land.
 */
export const EVICTION_ATTRIBUTION_WINDOW_MS = 20_000

interface Pending {
  event: EvictionEvent
  deadline: number
}

/**
 * Turns successive /api/ps snapshots into eviction events.
 *
 *   detector.observe(residents, now) → EvictionEvent[]   (zero or more, ready to store)
 *
 * Purely functional over its own state so it can be unit-tested with hand-fed
 * snapshots. Emits an event either when a newcomer arrives to blame, or when
 * the attribution window closes with no newcomer (evictedBy = null — the model
 * left early for a reason we can't see, e.g. `ollama stop`).
 */
export class EvictionDetector {
  private prev: ResidentModel[] = []
  private pending: Pending[] = []

  observe(current: ResidentModel[], now: number = Date.now()): EvictionEvent[] {
    const out: EvictionEvent[] = []
    const currentNames = new Set(current.map((r) => r.name))
    const prevNames = new Set(this.prev.map((r) => r.name))

    // Newcomers first, so a departure in the same tick can be attributed.
    const newcomers = current.filter((r) => !prevNames.has(r.name))

    // Departures: in prev, not in current, and gone early.
    for (const r of this.prev) {
      if (currentNames.has(r.name)) continue
      if (r.expiresAt == null) continue
      const earlyByMs = r.expiresAt - now
      if (earlyByMs < EVICTION_EARLY_THRESHOLD_MS) continue // natural timeout
      this.pending.push({
        event: {
          ts: now,
          model: r.name,
          tenant: r.tenant,
          sizeVram: r.sizeVram,
          earlyByMs,
          evictedBy: null,
          evictedByTenant: null,
        },
        deadline: now + EVICTION_ATTRIBUTION_WINDOW_MS,
      })
    }

    // Attribute every pending departure to the newcomer(s), if any.
    if (newcomers.length > 0 && this.pending.length > 0) {
      const by = newcomers.map((n) => n.name).join(' + ')
      const byTenant = newcomers[0]!.tenant
      for (const p of this.pending) {
        out.push({ ...p.event, evictedBy: by, evictedByTenant: byTenant })
      }
      this.pending = []
    }

    // Anything still unattributed past its window is committed as-is.
    const still: Pending[] = []
    for (const p of this.pending) {
      if (now >= p.deadline) out.push(p.event)
      else still.push(p)
    }
    this.pending = still

    this.prev = current
    return out
  }
}
