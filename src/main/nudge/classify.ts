import type { HookEvent, Nudge } from '@shared/types'
import {
  CHARS_PER_TOKEN,
  MECHANICAL_MIN_LINES,
  NUDGE_DEBOUNCE_MS,
  NUDGE_THRESHOLD,
  NUDGE_WINDOW_MS,
} from '@shared/constants'

const DELEGATION_TOOL = 'mcp__ollama-coder__local_coding_task'

/** Intrinsic, content-derived properties of one tool action. Pure. */
export interface EventFeatures {
  tool: string
  isDelegation: boolean
  isWriteNewFile: boolean
  isTestFile: boolean
  isSecuritySensitive: boolean
  isMechanicalEdit: boolean
  isCommentOnly: boolean
  dir: string
  ext: string
  estTokens: number
  ts: number
}

const COMMENT_LINE =
  /^\s*(#|\/\/|\/\*|\*|\*\/|"""|'''|<!--|--|;)|^\s*['"].*['"]\s*$/

const SECURITY_PATH =
  /(^|[\\/])(\.env|secrets?|credentials?|auth|oauth|crypto|password|passwd|token|apikey|api[-_]?key|private[-_]?key|keystore)([\\/.]|$)/i

const TEST_PATH = /(^|[\\/._-])(tests?|specs?|__tests__)([\\/._-]|$)|\.(test|spec)\.[a-z]+$|_test\.[a-z]+$/i

const IMPORT_LINE = /^\s*(import\b|from\b|#include\b|require\(|use\b|using\b)/

function lines(s: string): string[] {
  return s.split(/\r?\n/)
}

function nonEmpty(a: string[]): string[] {
  return a.filter((l) => l.trim().length > 0)
}

function ext(path: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(path)
  return m ? m[1]!.toLowerCase() : ''
}

function dirOf(path: string): string {
  const norm = path.replace(/\\/g, '/')
  const i = norm.lastIndexOf('/')
  return i >= 0 ? norm.slice(0, i) : ''
}

/** Whitespace/format-only: same content ignoring all whitespace. */
function isReformatOnly(oldS: string, newS: string): boolean {
  const strip = (s: string): string => s.replace(/\s+/g, '')
  return strip(oldS) === strip(newS) && oldS !== newS
}

/** Both sides are only import lines, and are permutations of each other. */
function isImportReorder(oldS: string, newS: string): boolean {
  const o = nonEmpty(lines(oldS))
  const n = nonEmpty(lines(newS))
  if (o.length < 2 || o.length !== n.length) return false
  if (!o.every((l) => IMPORT_LINE.test(l)) || !n.every((l) => IMPORT_LINE.test(l))) {
    return false
  }
  const sortedO = [...o].map((l) => l.trim()).sort()
  const sortedN = [...n].map((l) => l.trim()).sort()
  return sortedO.join('\n') === sortedN.join('\n') && o.join('\n') !== n.join('\n')
}

/** The lines new_string adds over old_string are all comments/docstrings. */
function isCommentAddition(oldS: string, newS: string): boolean {
  const oldSet = new Set(lines(oldS).map((l) => l.trim()))
  const added = nonEmpty(lines(newS)).filter((l) => !oldSet.has(l.trim()))
  if (added.length < MECHANICAL_MIN_LINES) return false
  return added.every((l) => COMMENT_LINE.test(l))
}

/** Derive features from a raw hook event. Pure — the testable core. */
export function extractFeatures(e: HookEvent): EventFeatures {
  const path = e.filePath ?? ''
  const oldS = e.oldString ?? ''
  const newS = e.newString ?? e.content ?? ''
  const isEdit = e.tool === 'Edit' || e.tool === 'MultiEdit'
  const isWrite = e.tool === 'Write'

  const reformat = isEdit && isReformatOnly(oldS, newS)
  const importReorder = isEdit && isImportReorder(oldS, newS)
  const substantial =
    nonEmpty(lines(newS)).length >= MECHANICAL_MIN_LINES ||
    nonEmpty(lines(oldS)).length >= MECHANICAL_MIN_LINES
  const commentOnly = isEdit && isCommentAddition(oldS, newS)

  const contentLen = (e.content ?? '').length + newS.length

  return {
    tool: e.tool,
    isDelegation: e.tool === DELEGATION_TOOL,
    isWriteNewFile: isWrite,
    isTestFile: TEST_PATH.test(path),
    isSecuritySensitive: SECURITY_PATH.test(path),
    isMechanicalEdit: (reformat || importReorder) && substantial,
    isCommentOnly: commentOnly,
    dir: dirOf(path),
    ext: ext(path),
    estTokens: Math.round(contentLen / CHARS_PER_TOKEN),
    ts: e.ts,
  }
}

export interface BurstScore {
  score: number
  signals: string[]
  estTokens: number
}

/**
 * Score a burst of tool actions that share a directory and time window.
 *
 * Deliberately conservative — a false "you should have delegated this" is worse
 * than a missed one, so a single judgment edit never fires; it takes either a
 * repetitive sibling burst or a substantial purely-mechanical action.
 */
export function scoreBurst(features: EventFeatures[]): BurstScore {
  const signals: string[] = []

  // Hard suppressors first.
  if (features.some((f) => f.isSecuritySensitive)) {
    return { score: -5, signals: ['security-sensitive'], estTokens: 0 }
  }
  if (features.some((f) => f.isDelegation)) {
    // The work was (or is being) offloaded — the good case, never a miss.
    return { score: 0, signals: ['delegated'], estTokens: 0 }
  }

  const edits = features.filter(
    (f) => !f.isDelegation && (f.tool === 'Edit' || f.tool === 'MultiEdit' || f.isWriteNewFile),
  )
  if (edits.length === 0) return { score: 0, signals: [], estTokens: 0 }

  let score = 0

  // A repetitive burst across sibling files is the strongest signal.
  if (edits.length >= 3) {
    score += 3
    signals.push('sibling-burst')
  }

  const mechanical = edits.filter((f) => f.isMechanicalEdit).length
  const comments = edits.filter((f) => f.isCommentOnly).length
  const tests = edits.filter((f) => f.isTestFile).length
  const scaffold = edits.filter((f) => f.isWriteNewFile).length

  // Per-kind contributions, each capped so one giant burst can't run away.
  if (mechanical > 0) {
    score += Math.min(mechanical * 2, 4)
    signals.push(mechanical > 1 ? 'mechanical-edits' : 'mechanical-edit')
  }
  if (comments > 0) {
    score += Math.min(comments * 2, 4)
    signals.push('comment-block')
  }
  if (tests >= 2) {
    score += 2
    signals.push('test-scaffolding')
  }
  if (scaffold >= 2) {
    score += 1
    signals.push('file-scaffolding')
  }

  const estTokens = edits.reduce((s, f) => s + f.estTokens, 0)
  return { score, signals, estTokens }
}

/**
 * Stateful wrapper around the pure scorers. Buffers recent actions per session,
 * finds the current same-directory burst, scores it, and emits at most one
 * nudge per session+directory per debounce period. Emits via a callback so it's
 * decoupled from storage. Mirrors the Reconciler's design.
 */
export class NudgeClassifier {
  private buffers = new Map<string, EventFeatures[]>()
  private lastNudge = new Map<string, number>()

  // All timing is derived from each event's own `ts`, which makes the
  // classifier fully deterministic from its inputs (and trivial to test).
  constructor(
    private readonly emit: (n: Nudge) => void,
    private readonly windowMs: number = NUDGE_WINDOW_MS,
    private readonly debounceMs: number = NUDGE_DEBOUNCE_MS,
    private readonly threshold: number = NUDGE_THRESHOLD,
  ) {}

  onEvent(e: HookEvent): void {
    const feat = extractFeatures(e)
    const session = e.sessionId ?? 'unknown'

    const buf = this.buffers.get(session) ?? []
    buf.push(feat)
    // Keep only what's within the window of the newest event.
    const cutoff = feat.ts - this.windowMs
    const pruned = buf.filter((f) => f.ts >= cutoff)
    this.buffers.set(session, pruned)

    // A delegation clears any pending nudge pressure for its directory — the
    // user just did the right thing.
    if (feat.isDelegation) return

    // The current burst is same-session actions in the same directory.
    const cluster = pruned.filter((f) => f.dir === feat.dir)
    const { score, signals, estTokens } = scoreBurst(cluster)
    if (score < this.threshold) return

    const key = `${session}::${feat.dir}`
    const last = this.lastNudge.get(key) ?? 0
    if (feat.ts - last < this.debounceMs) return
    this.lastNudge.set(key, feat.ts)

    this.emit({
      ts: feat.ts,
      sessionId: e.sessionId,
      score,
      signals,
      tool: feat.tool,
      fileHint: feat.dir || e.filePath,
      estTokens,
      dismissed: false,
    })
  }

  /** Drop buffered state for a session (e.g. on session end). */
  forget(session: string): void {
    this.buffers.delete(session)
  }
}
