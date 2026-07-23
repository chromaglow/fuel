import type { HookEvent } from '@shared/types'

/**
 * Module 1 — Net. Pure feature extraction for the toll booth.
 *
 * Derives the six routing designators from ONE work item. No I/O, no repo
 * access, no shared state: anything the payload can't reveal (siblings, test
 * coverage) is passed in explicitly via SignalContext, so the function is fully
 * deterministic and testable in isolation. It measures; it does not decide the
 * route (that is Module 2 — the Sorter).
 *
 * All six signals point the same way: higher = safer/easier to offload.
 */

const DELEGATION_TOOL = 'mcp__ollama-coder__local_coding_task'

const SECURITY_PATH =
  /(^|[\\/])(\.env|secrets?|credentials?|auth|oauth|crypto|password|passwd|token|apikey|api[-_]?key|private[-_]?key|keystore)([\\/.]|$)/i

const TEST_PATH =
  /(^|[\\/._-])(tests?|specs?|__tests__|fixtures?)([\\/._-]|$)|\.(test|spec)\.[a-z]+$|_test\.[a-z]+$/i

// Shared/high-blast surfaces: changing these propagates outward.
const SHARED_PATH =
  /(^|[\\/])(interfaces?|types?|shared|common|core|lib|models?|schema|middleware|migrations?|\.github|ci)([\\/.]|$)|[\\/]index\.[a-z]+$/i

const SCRIPT_PATH = /(^|[\\/])scripts?([\\/])/i
const COMMENT_LINE = /^\s*(#|\/\/|\/\*|\*|\*\/|"""|'''|<!--|--|;)/
const IMPORT_LINE = /^\s*(import\b|from\b|#include\b|require\(|use\b|using\b)/
const SIGNATURE = /\b(def|function|class|interface|type|struct|enum|fn)\b/
const BRANCH = /\b(if|else|for|while|switch|case|catch|try|elif)\b|[?]{1}[^.]|&&|\|\|/g

const DECLARATIVE = new Set([
  'json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf',
  'html', 'xml', 'svg', 'md', 'mdx', 'css', 'scss', 'sass', 'csv', 'tsv', 'sql',
])
const TYPECHECKED = new Set(['ts', 'tsx', 'go', 'rs', 'java', 'c', 'cpp', 'cs'])

/** Optional, caller-provided facts the payload alone can't reveal. Pure input. */
export interface SignalContext {
  siblingCount?: number // files sharing this file's dir+ext
  maxSimilarity?: number // 0..1 similarity to the closest sibling
  hasTestCoverage?: boolean // a test exists that exercises this file
}

export interface WorkSignals {
  verifiability: number // ★ master gate: cheap to catch a mistake?
  specCompleteness: number // is the "what" already decided?
  patternAnalog: number // is there a template to copy?
  blastRadius: number // 1 = contained/leaf, 0 = shared/core
  reasoningDepth: number // 1 = shallow transform, 0 = deep derivation
  contextLocality: number // 1 = self-contained, 0 = needs whole system
  isSecuritySensitive: boolean // hard flag → Sorter forces cloud
  raw: {
    tool: string
    fileClass: FileClass
    ext: string
    addedLines: number
    branchDensity: number
    importCount: number
    isPureTransform: boolean
  }
}

type FileClass = 'test' | 'declarative' | 'script' | 'code' | 'other'

const clamp = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n)
const lines = (s: string): string[] => s.split(/\r?\n/)
const nonEmpty = (a: string[]): string[] => a.filter((l) => l.trim().length > 0)

function extOf(path: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(path)
  return m ? m[1]!.toLowerCase() : ''
}

function classify(path: string, ext: string): FileClass {
  if (TEST_PATH.test(path)) return 'test'
  if (DECLARATIVE.has(ext)) return 'declarative'
  if (SCRIPT_PATH.test(path) || ext === 'sh' || ext === 'ps1' || ext === 'bat') return 'script'
  if (ext) return 'code'
  return 'other'
}

/** Whitespace/format-only change: identical ignoring all whitespace. */
function isReformatOnly(oldS: string, newS: string): boolean {
  const strip = (s: string): string => s.replace(/\s+/g, '')
  return oldS !== '' && strip(oldS) === strip(newS) && oldS !== newS
}

/** Added lines over old_string are all comment/docstring lines. */
function isCommentAddition(oldS: string, newS: string): boolean {
  const oldSet = new Set(lines(oldS).map((l) => l.trim()))
  const added = nonEmpty(lines(newS)).filter((l) => !oldSet.has(l.trim()))
  return added.length > 0 && added.every((l) => COMMENT_LINE.test(l))
}

/** Branch-keyword hits per non-empty line — a cheap reasoning-depth proxy. */
function branchDensity(text: string): number {
  const ls = nonEmpty(lines(text))
  if (ls.length === 0) return 0
  const hits = (text.match(BRANCH) ?? []).length
  return hits / ls.length
}

export function extractSignals(e: HookEvent, ctx: SignalContext = {}): WorkSignals {
  const path = e.filePath ?? ''
  const oldS = e.oldString ?? ''
  const newS = e.newString ?? ''
  const content = e.content ?? newS
  const task = e.taskText ?? ''
  const ext = extOf(path)
  const fileClass = classify(path, ext)

  const isEdit = e.tool === 'Edit' || e.tool === 'MultiEdit'
  const isPureTransform = isEdit && (isReformatOnly(oldS, newS) || isCommentAddition(oldS, newS))
  const addedLines = nonEmpty(lines(content)).length
  const branch = branchDensity(content)
  const importCount = nonEmpty(lines(content)).filter((l) => IMPORT_LINE.test(l)).length
  const isSecuritySensitive = SECURITY_PATH.test(path)

  // ★ verifiability — can a wrong answer be caught cheaply and immediately?
  let verifiability = 0
  if (isPureTransform) verifiability += 0.6 // a diff tells you instantly
  if (fileClass === 'declarative') verifiability += 0.4 // parse/eyeball is cheap
  if (fileClass === 'test') verifiability += 0.3 // runs green/red
  if (TYPECHECKED.has(ext)) verifiability += 0.2 // compiler catches shape errors
  if (ctx.hasTestCoverage) verifiability += 0.4
  verifiability = clamp(verifiability)

  // specCompleteness — is the "what" already settled?
  let specCompleteness = 0.3
  if (task.trim().length > 40) specCompleteness += 0.4 // explicit spec handed over
  if (isEdit && SIGNATURE.test(oldS)) specCompleteness += 0.3 // filling a defined shape
  if (fileClass === 'declarative') specCompleteness += 0.2
  specCompleteness = clamp(specCompleteness)

  // patternAnalog — is there a template to copy?
  let patternAnalog = 0.2
  if (ctx.maxSimilarity != null) patternAnalog += 0.6 * clamp(ctx.maxSimilarity)
  if ((ctx.siblingCount ?? 0) >= 1) patternAnalog += 0.2
  if (fileClass === 'test' || fileClass === 'declarative') patternAnalog += 0.3
  patternAnalog = clamp(patternAnalog)

  // blastRadius — contained (1) vs. shared/core (0)
  let blastRadius = 1
  if (SHARED_PATH.test(path)) blastRadius -= 0.7
  if (isSecuritySensitive) blastRadius -= 0.5
  if (fileClass === 'test' || fileClass === 'script') blastRadius = Math.max(blastRadius, 0.8)
  blastRadius = clamp(blastRadius)

  // reasoningDepth — shallow transform (1) vs. deep derivation (0)
  let reasoningDepth: number
  if (isPureTransform) reasoningDepth = 1
  else if (fileClass === 'declarative') reasoningDepth = 0.85
  else reasoningDepth = clamp(1 - branch / 0.5) // ~0.5 hits/line reads as fully deep
  reasoningDepth = clamp(reasoningDepth)

  // contextLocality — self-contained (1) vs. needs whole system (0)
  const contextLocality = clamp(1 - importCount / 12)

  return {
    verifiability,
    specCompleteness,
    patternAnalog,
    blastRadius,
    reasoningDepth,
    contextLocality,
    isSecuritySensitive,
    raw: {
      tool: e.tool,
      fileClass,
      ext,
      addedLines,
      branchDensity: Number(branch.toFixed(3)),
      importCount,
      isPureTransform,
    },
  }
}

/** Delegation isn't a "work item to route" — it's the good outcome already. */
export function isDelegation(e: HookEvent): boolean {
  return e.tool === DELEGATION_TOOL
}
