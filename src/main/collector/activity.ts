/**
 * Is anything being processed locally right now, by any tenant?
 *
 * Two sources feed it. The card-wide phase (Ollama log busy flag + GPU load)
 * sees every tenant, including WEYLD's DJ. The shim's /activity beacons (sent
 * when a local_coding_task starts and ends) add one thing the phase misses:
 * your coder cold-loading while another tenant is already resident, which the
 * phase reports as plain 'generating'. Drives the mini pill's fuel ticks.
 */
import type { HudPhase, LocalActivity } from '@shared/types'

/** The JSON the shim POSTs to /activity. */
export interface ActivityBeacon {
  id: string
  state: 'start' | 'end'
  model: string | null
}

/**
 * A lost "end" beacon (shim killed mid-call) must not light the pill forever.
 * The shim's own request timeout is 300 s, so anything older is gone.
 */
export const ACTIVITY_STALE_MS = 310_000

export function parseActivity(body: unknown): ActivityBeacon | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (typeof b['id'] !== 'string' || b['id'].length === 0 || b['id'].length > 64) return null
  if (b['state'] !== 'start' && b['state'] !== 'end') return null
  const model = typeof b['model'] === 'string' && b['model'] ? b['model'] : null
  return { id: b['id'], state: b['state'], model }
}

/**
 * Amber when a model is loading (your coder not resident yet, or a cold start
 * with nothing resident), green when anything is generating, else idle.
 */
export function localActivity(
  phase: HudPhase,
  offloadModels: string[],
  residentNames: Set<string>,
): LocalActivity {
  if (offloadModels.some((m) => !residentNames.has(m))) return 'loading'
  if (offloadModels.length > 0 || phase === 'generating') return 'working'
  if (phase === 'warming') return 'loading'
  return 'idle'
}

export class OffloadActivity {
  private readonly running = new Map<string, { startedAt: number; model: string | null }>()

  constructor(private readonly staleMs: number = ACTIVITY_STALE_MS) {}

  observe(b: ActivityBeacon, now: number): void {
    if (b.state === 'start') this.running.set(b.id, { startedAt: now, model: b.model })
    else this.running.delete(b.id)
  }

  /** Models with an offload in flight right now (stale entries pruned). */
  activeModels(now: number): string[] {
    const models: string[] = []
    for (const [id, r] of this.running) {
      if (now - r.startedAt > this.staleMs) this.running.delete(id)
      else models.push(r.model ?? 'unknown')
    }
    return models
  }
}
