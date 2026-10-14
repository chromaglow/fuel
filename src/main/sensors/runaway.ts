// Runaway-request guard (2026-10-14). A model that never emits a stop token
// generates until its output cap — WEYLD's DJ hit 8,000 tokens twice in a row,
// pinning the 4080 at ~95% for three minutes and stalling the whole desktop,
// and the caller's own deadline didn't stop it (the ai-sdk-ollama transport
// ignores the abort). Ollama has no API to cancel one in-flight request, so the
// backstop lives here: time every llama-server task from its log lines, and
// when one outlives the limit, kill the runner process serving it. Ollama sees
// the runner exit, fails that request, and reloads the model on the next call.

// slot launch_slot_: id  0 | task 56049 | processing task, is_child = 0
const SLOT_LAUNCH = /launch_slot_:\s*id\s+(\d+)\s*\|\s*task\s+(\d+)/
// slot      release: id  0 | task 56049 | stop processing: n_tokens = 3352, truncated = 0
const SLOT_RELEASE = /release:\s*id\s+(\d+)\s*\|\s*task\s+(\d+)/

export interface SlotTask {
  kind: 'start' | 'end'
  /** `${slotId}:${taskId}` — task ids are per-runner, the slot keeps parallel slots apart. */
  key: string
}

/** A llama-server task start/end line, or null for anything else. */
export function parseSlotTask(line: string): SlotTask | null {
  const start = SLOT_LAUNCH.exec(line)
  if (start) return { kind: 'start', key: `${start[1]}:${start[2]}` }
  const end = SLOT_RELEASE.exec(line)
  if (end) return { kind: 'end', key: `${end[1]}:${end[2]}` }
  return null
}

export interface OverdueTask {
  key: string
  /** How long the task had been running when it was flagged. */
  ms: number
}

/**
 * Tracks running tasks and reports each one, once, when it outlives the limit.
 * Pure: time is passed in, so the logic is unit-tested without real clocks.
 * A limit of 0 disables the guard entirely.
 */
export class RunawayGuard {
  private readonly running = new Map<string, number>()
  private readonly reported = new Set<string>()

  constructor(private readonly limitMs: number) {}

  start(key: string, now: number): void {
    this.running.set(key, now)
    this.reported.delete(key)
  }

  end(key: string): void {
    this.running.delete(key)
    this.reported.delete(key)
  }

  /** "all slots are idle" — anything still tracked missed its release line. */
  idle(): void {
    this.running.clear()
    this.reported.clear()
  }

  overdue(now: number): OverdueTask[] {
    if (this.limitMs <= 0) return []
    const out: OverdueTask[] = []
    for (const [key, startedAt] of this.running) {
      const ms = now - startedAt
      if (ms < this.limitMs || this.reported.has(key)) continue
      this.reported.add(key)
      out.push({ key, ms })
    }
    return out
  }
}
