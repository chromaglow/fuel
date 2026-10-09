/**
 * Which of *your* offloads are running right now.
 *
 * The Ollama log's busy signal can't tell your coder from WEYLD's DJ (which
 * calls ~1,500×/day), and the shim's /ingest record only arrives once a call
 * has finished. So the shim also POSTs a tiny /activity beacon when a
 * local_coding_task starts and another when it ends. This drives the mini
 * pill's meter, which should light up for your own delegations only.
 */

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
