import type { OffloadEvent } from '@shared/types'
import { RECONCILE_WINDOW_MS } from '@shared/constants'

/**
 * Merges the two views of a single local inference.
 *
 * The log tailer (Phase A) sees every `/api/generate` and `/api/chat` the
 * local Ollama serves — from this machine and from LAN tenants such as the
 * WEYLD Jetson — with the caller IP but no model name or token detail. The
 * MCP shim (Phase C) POSTs a richer record for the calls fuel itself made:
 * exact prompt tokens, the client that asked, and the `num_ctx` it requested.
 * Left alone the two would double-count every shim offload.
 *
 * The reconciler pairs them. An MCP record is authoritative and is committed
 * immediately; a log record waits briefly to see whether an MCP record claims
 * the same inference, and is committed on its own only if none does (a direct
 * `ollama run`, another tool, etc.).
 *
 * Correlation key: identical `evalTokens` within the window. Two tenants can
 * now be resident and generating close together (the DJ picks every few
 * minutes; a shim call can land mid-pick), so the token-count match is what
 * keeps a DJ log record from being swallowed by a shim record that merely
 * finished nearby. When a log record has no token count (parse miss) it falls
 * back to time-only pairing — rare, and worst case one event is under-counted
 * rather than double-counted.
 */
export class Reconciler {
  private pendingLog = new Map<number, { event: OffloadEvent; timer: unknown }>()
  private recentMcp: Array<{ evalTokens: number | null; endedAt: number }> = []
  private seq = 0

  constructor(
    private readonly commit: (e: OffloadEvent) => void,
    private readonly windowMs: number = RECONCILE_WINDOW_MS,
    // Injectable so tests can drive time deterministically.
    private readonly now: () => number = Date.now,
    private readonly setTimer: (fn: () => void, ms: number) => unknown = (
      fn,
      ms,
    ) => setTimeout(fn, ms),
    private readonly clearTimer: (t: unknown) => void = (t) =>
      clearTimeout(t as ReturnType<typeof setTimeout>),
  ) {}

  private matches(log: OffloadEvent, mcp: { evalTokens: number | null; endedAt: number }): boolean {
    const dt = Math.abs((log.endedAt ?? 0) - mcp.endedAt)
    if (dt > this.windowMs) return false
    // Both token counts known → they must agree exactly (log "eval time" tokens
    // equal the API's eval_count, verified in M1).
    if (log.evalTokens != null && mcp.evalTokens != null) {
      return log.evalTokens === mcp.evalTokens
    }
    // Otherwise fall back to the time window alone (serialized generations).
    return true
  }

  private pruneRecent(): void {
    const cutoff = this.now() - this.windowMs
    this.recentMcp = this.recentMcp.filter((m) => m.endedAt >= cutoff)
  }

  /** A client-agnostic event from the Ollama log. */
  onLog(event: OffloadEvent): void {
    this.pruneRecent()

    // Already claimed by an MCP record that arrived first → drop it.
    if (this.recentMcp.some((m) => this.matches(event, m))) return

    const id = this.seq++
    const timer = this.setTimer(() => {
      this.pendingLog.delete(id)
      this.commit(event)
    }, this.windowMs)
    this.pendingLog.set(id, { event, timer })
  }

  /** A richer, attributed event from the MCP shim. Authoritative. */
  onMcp(event: OffloadEvent): void {
    this.pruneRecent()

    const key = { evalTokens: event.evalTokens, endedAt: event.endedAt ?? this.now() }

    // Cancel any buffered log record for the same inference.
    for (const [id, p] of this.pendingLog) {
      if (this.matches(p.event, key)) {
        this.clearTimer(p.timer)
        this.pendingLog.delete(id)
      }
    }

    // Remember it briefly so a log record that arrives *after* is suppressed.
    this.recentMcp.push(key)
    this.commit(event)
  }

  /** Flush any still-pending log events immediately (called on shutdown). */
  flushAll(): void {
    for (const [, p] of this.pendingLog) {
      this.clearTimer(p.timer)
      this.commit(p.event)
    }
    this.pendingLog.clear()
  }
}
