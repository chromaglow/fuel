import type { HookEvent, ReceiptRecord } from '@shared/types'
import { extractSignals, isDelegation, type SignalContext } from './signals.js'
import { decide, presetFor, type Aggressiveness, type Route, type RouteReceipt } from './sorter.js'

/**
 * Module 4 — Catch. The real-time gate that fires on a PENDING write, before
 * Claude types it. Pure but for an injected `record` sink (mirrors
 * NudgeClassifier's emit), so it stays deterministic and testable.
 *
 * Modes: 'observe' records the decision and never interferes (safe default);
 * 'guard' additionally advises redirecting clearly-local work; 'off' does
 * nothing. Delegations and unwatched tools pass straight through, unrecorded.
 */

export type GateMode = 'observe' | 'guard' | 'off'
export type GateAction = 'allow' | 'advise'

/** What the PreToolUse hook POSTs to /decide (a not-yet-executed tool). */
export interface DecidePayload {
  session_id?: string | null
  cwd?: string | null
  tool_name?: string
  tool_input?: {
    file_path?: string | null
    content?: string | null
    old_string?: string | null
    new_string?: string | null
    task?: string | null
  }
}

export interface GateVerdict {
  route: Route
  action: GateAction
  reasons: string[]
  receipt: RouteReceipt | null
}

const WATCHED = new Set(['Write', 'Edit', 'MultiEdit'])

export function toGateEvent(p: DecidePayload): HookEvent | null {
  if (!p || !p.tool_name) return null
  const ti = p.tool_input ?? {}
  return {
    ts: Date.now(),
    sessionId: p.session_id != null ? String(p.session_id) : null,
    cwd: p.cwd != null ? String(p.cwd) : null,
    tool: p.tool_name,
    filePath: ti.file_path ?? null,
    oldString: ti.old_string ?? null,
    newString: ti.new_string ?? null,
    content: ti.content ?? null,
    contentHash: null,
    taskText: ti.task ?? null,
    outputHash: null,
  }
}

export function gateAction(route: Route, mode: GateMode): GateAction {
  return mode === 'guard' && route === 'local' ? 'advise' : 'allow'
}

export function advisoryText(reasons: string[]): string {
  const why = reasons.filter((r) => r !== 'ambiguous-default-cloud').slice(0, 3).join(', ')
  return `fuel: this looks like local work${why ? ` (${why})` : ''} — route it to local_coding_task, or split off the mechanical part.`
}

/** Flatten a decision + its originating event into a persistable receipt. */
export function toReceiptRecord(r: RouteReceipt, e: HookEvent): ReceiptRecord {
  return {
    ts: e.ts,
    sessionId: e.sessionId,
    tool: e.tool,
    fileHint: e.filePath,
    route: r.route,
    score: r.score,
    confidence: r.confidence,
    reasons: r.reasons,
    signals: r.signals,
    outcome: null,
  }
}

export function evaluate(
  payload: DecidePayload,
  opts: {
    level?: Aggressiveness
    mode?: GateMode
    ctx?: SignalContext
    record?: (r: RouteReceipt, event: HookEvent) => void
  } = {},
): GateVerdict {
  const mode = opts.mode ?? 'observe'
  const event = toGateEvent(payload)
  if (mode === 'off' || !event || !WATCHED.has(event.tool) || isDelegation(event)) {
    return { route: 'cloud', action: 'allow', reasons: [], receipt: null }
  }
  const receipt = decide(extractSignals(event, opts.ctx), presetFor(opts.level ?? 'normal'))
  opts.record?.(receipt, event)
  return { route: receipt.route, action: gateAction(receipt.route, mode), reasons: receipt.reasons, receipt }
}
