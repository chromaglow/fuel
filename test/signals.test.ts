import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { HookEvent } from '../src/shared/types.ts'
import { extractSignals, isDelegation, type SignalContext } from '../src/main/nudge/signals.ts'

function hook(over: Partial<HookEvent>): HookEvent {
  return {
    ts: 1_000_000,
    sessionId: 's1',
    cwd: '/proj',
    tool: 'Write',
    filePath: '/proj/src/a.ts',
    oldString: null,
    newString: null,
    content: null,
    contentHash: null,
    taskText: null,
    outputHash: null,
    ...over,
  }
}

/** Float-tolerant equality — signals are weighted sums, not exact decimals. */
const close = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) < eps

// ---- Fixtures spanning the offload spectrum ----

const reformat = hook({
  tool: 'Edit',
  filePath: '/proj/src/util.ts',
  oldString: 'const a=1\nconst b=2\nconst c=3',
  newString: 'const a = 1\nconst b = 2\nconst c = 3',
})

const config = hook({
  filePath: '/proj/config/app.json',
  content: '{\n  "a": 1,\n  "b": 2,\n  "c": 3\n}',
})

const security = hook({
  filePath: '/proj/src/auth/tokens.ts',
  content: 'export function mint(u: string) {\n  return sign(u)\n}',
})

const denseLogic = hook({
  filePath: '/proj/src/engine.ts',
  content: [
    'function solve(x) {',
    '  if (x > 0) {',
    '    for (let i = 0; i < x; i++) {',
    '      if (i % 2 === 0 && i > 1) {',
    '        while (x) { x-- }',
    '      }',
    '    }',
    '  } else {',
    '    return x || 0',
    '  }',
    '}',
  ].join('\n'),
})

const testFile = hook({
  filePath: '/proj/test/foo.test.ts',
  content: "import { test } from 'node:test'\ntest('x', () => {})",
})

// ---- Tests ----

test('★ verifiability tracks how cheaply a mistake is caught', () => {
  const s = (h: HookEvent) => extractSignals(h).verifiability
  // pure diff (0.8) > test file (0.5) > dense logic (0.2)
  assert.ok(s(reformat) > s(testFile))
  assert.ok(s(testFile) > s(denseLogic))
  assert.ok(close(s(reformat), 0.8))
  assert.ok(close(s(denseLogic), 0.2))
})

test('pure transform → max reasoningDepth & blastRadius, flagged transform', () => {
  const s = extractSignals(reformat)
  assert.equal(s.raw.isPureTransform, true)
  assert.equal(s.reasoningDepth, 1)
  assert.equal(s.blastRadius, 1)
})

test('declarative boilerplate reads as offloadable', () => {
  const s = extractSignals(config)
  assert.equal(s.raw.fileClass, 'declarative')
  assert.ok(close(s.verifiability, 0.4))
  assert.ok(close(s.reasoningDepth, 0.85))
  assert.ok(close(s.patternAnalog, 0.5))
})

test('security-sensitive path sets the hard flag and shrinks blast radius', () => {
  const s = extractSignals(security)
  assert.equal(s.isSecuritySensitive, true)
  assert.ok(close(s.blastRadius, 0.5))
})

test('dense branching → deep reasoning (low reasoningDepth)', () => {
  const s = extractSignals(denseLogic)
  assert.ok(s.reasoningDepth < 0.5)
  assert.equal(s.reasoningDepth, 0) // 7 branch hits / 11 lines clamps to floor
})

test('test files are classified and read as contained', () => {
  const s = extractSignals(testFile)
  assert.equal(s.raw.fileClass, 'test')
  assert.equal(s.blastRadius, 1)
  assert.ok(close(s.verifiability, 0.5))
})

test('SignalContext (siblings, similarity, coverage) raises pattern & verifiability', () => {
  const ctx: SignalContext = { siblingCount: 5, maxSimilarity: 0.9, hasTestCoverage: true }
  const bare = extractSignals(config)
  const rich = extractSignals(config, ctx)
  assert.ok(rich.patternAnalog > bare.patternAnalog)
  assert.ok(rich.verifiability > bare.verifiability)
  assert.ok(close(rich.patternAnalog, 1)) // clamped at ceiling
  assert.ok(close(rich.verifiability, 0.8))
})

test('contextLocality falls as cross-module imports rise', () => {
  const six = hook({
    filePath: '/proj/src/wired.ts',
    content: Array.from({ length: 6 }, (_, i) => `import x${i} from 'x${i}'`).join('\n'),
  })
  const twelve = hook({
    filePath: '/proj/src/wired.ts',
    content: Array.from({ length: 12 }, (_, i) => `import x${i} from 'x${i}'`).join('\n'),
  })
  assert.ok(close(extractSignals(six).contextLocality, 0.5))
  assert.ok(close(extractSignals(twelve).contextLocality, 0))
})

test('isDelegation detects the offload tool only', () => {
  assert.equal(isDelegation(hook({ tool: 'mcp__ollama-coder__local_coding_task' })), true)
  assert.equal(isDelegation(hook({ tool: 'Write' })), false)
})
