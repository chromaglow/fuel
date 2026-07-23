import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { HookEvent, Nudge } from '../src/shared/types.ts'
import {
  extractFeatures,
  scoreBurst,
  NudgeClassifier,
} from '../src/main/nudge/classify.ts'

function hook(over: Partial<HookEvent>): HookEvent {
  return {
    ts: 1_000_000,
    sessionId: 's1',
    cwd: '/proj',
    tool: 'Edit',
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

// ---- feature extraction ----

test('reformat-only edit is flagged mechanical (whitespace-insensitive equal)', () => {
  const f = extractFeatures(
    hook({
      oldString: 'function f(){\nreturn 1\n}',
      newString: 'function f() {\n  return 1\n}\n\n// extra\n',
    }),
  )
  // Not a pure reformat (content added), so mechanical should be false here.
  assert.equal(f.isMechanicalEdit, false)

  const pure = extractFeatures(
    hook({
      oldString: 'const a=1\nconst b=2\nconst c=3\nconst d=4',
      newString: 'const a = 1\nconst b = 2\nconst c = 3\nconst d = 4',
    }),
  )
  assert.equal(pure.isMechanicalEdit, true)
})

test('import reorder is mechanical; a real logic edit is not', () => {
  const reorder = extractFeatures(
    hook({
      oldString: "import z from 'z'\nimport a from 'a'\nimport m from 'm'\nimport b from 'b'",
      newString: "import a from 'a'\nimport b from 'b'\nimport m from 'm'\nimport z from 'z'",
    }),
  )
  assert.equal(reorder.isMechanicalEdit, true)

  const logic = extractFeatures(
    hook({
      oldString: 'const total = a + b\nreturn total',
      newString: 'const total = a + b + c\nif (total < 0) total = 0\nreturn total',
    }),
  )
  assert.equal(logic.isMechanicalEdit, false)
})

test('a comment/docstring block addition is detected', () => {
  const f = extractFeatures(
    hook({
      oldString: 'def foo():\n    return 1',
      newString:
        'def foo():\n    # explains foo\n    # step one\n    # step two\n    # step three\n    return 1',
    }),
  )
  assert.equal(f.isCommentOnly, true)
})

test('security-sensitive and test paths are recognised', () => {
  assert.equal(extractFeatures(hook({ filePath: '/proj/src/auth/login.ts' })).isSecuritySensitive, true)
  assert.equal(extractFeatures(hook({ filePath: '/proj/.env' })).isSecuritySensitive, true)
  assert.equal(extractFeatures(hook({ filePath: '/proj/test/a.test.ts' })).isTestFile, true)
  assert.equal(extractFeatures(hook({ filePath: '/proj/src/normal.ts' })).isSecuritySensitive, false)
})

// ---- burst scoring ----

test('a single judgment edit does NOT cross the threshold', () => {
  const f = extractFeatures(
    hook({ oldString: 'return a', newString: 'return a > 0 ? a : -a' }),
  )
  assert.ok(scoreBurst([f]).score < 4, 'one ordinary edit must not nudge')
})

test('a sibling burst of mechanical edits crosses the threshold', () => {
  const mech = (p: string): ReturnType<typeof extractFeatures> =>
    extractFeatures(
      hook({
        filePath: p,
        oldString: 'const a=1\nconst b=2\nconst c=3\nconst d=4',
        newString: 'const a = 1\nconst b = 2\nconst c = 3\nconst d = 4',
      }),
    )
  const r = scoreBurst([mech('/proj/x/a.ts'), mech('/proj/x/b.ts'), mech('/proj/x/c.ts')])
  assert.ok(r.score >= 4, `expected >=4, got ${r.score}`)
  assert.ok(r.signals.includes('sibling-burst'))
})

test('security-sensitive work is hard-suppressed regardless of shape', () => {
  const f = extractFeatures(
    hook({
      filePath: '/proj/src/auth/token.ts',
      oldString: 'const a=1\nconst b=2\nconst c=3\nconst d=4',
      newString: 'const a = 1\nconst b = 2\nconst c = 3\nconst d = 4',
    }),
  )
  assert.equal(scoreBurst([f, f, f]).score, -5)
})

test('a delegation in the burst suppresses the nudge (the good case)', () => {
  const del = extractFeatures(
    hook({ tool: 'mcp__ollama-coder__local_coding_task', filePath: '' }),
  )
  const mech = extractFeatures(
    hook({
      oldString: 'const a=1\nconst b=2\nconst c=3\nconst d=4',
      newString: 'const a = 1\nconst b = 2\nconst c = 3\nconst d = 4',
    }),
  )
  assert.equal(scoreBurst([mech, del, mech]).score, 0)
})

// ---- stateful classifier ----

test('classifier emits one nudge for a sibling burst, then debounces', () => {
  const nudges: Nudge[] = []
  let clock = 1_000_000
  const c = new NudgeClassifier((n) => nudges.push(n), 60_000, 300_000, 4)

  const mech = (p: string) =>
    hook({
      ts: clock,
      filePath: p,
      oldString: 'const a=1\nconst b=2\nconst c=3\nconst d=4',
      newString: 'const a = 1\nconst b = 2\nconst c = 3\nconst d = 4',
    })

  c.onEvent(mech('/proj/x/a.ts'))
  c.onEvent(mech('/proj/x/b.ts'))
  c.onEvent(mech('/proj/x/c.ts'))
  assert.equal(nudges.length, 1, 'burst should fire exactly one nudge')

  // Same directory again immediately → debounced.
  clock += 1000
  c.onEvent(mech('/proj/x/d.ts'))
  assert.equal(nudges.length, 1, 'debounce suppresses repeats')

  // Past the debounce window → a fresh burst can fire again.
  clock += 300_001
  c.onEvent(mech('/proj/x/e.ts'))
  c.onEvent(mech('/proj/x/f.ts'))
  c.onEvent(mech('/proj/x/g.ts'))
  assert.equal(nudges.length, 2)
})

test('classifier does not nudge ordinary interleaved work', () => {
  const nudges: Nudge[] = []
  let clock = 1_000_000
  const c = new NudgeClassifier((n) => nudges.push(n), 60_000, 300_000, 4)

  // Three logic edits across unrelated directories — not a burst, not mechanical.
  c.onEvent(hook({ ts: clock, filePath: '/proj/a/one.ts', oldString: 'x', newString: 'x + fixBug()' }))
  clock += 5000
  c.onEvent(hook({ ts: clock, filePath: '/proj/b/two.ts', oldString: 'y', newString: 'y.filter(z)' }))
  clock += 5000
  c.onEvent(hook({ ts: clock, filePath: '/proj/c/three.ts', oldString: 'q', newString: 'await q()' }))
  assert.equal(nudges.length, 0)
})
