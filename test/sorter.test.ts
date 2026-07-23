import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { HookEvent } from '../src/shared/types.ts'
import { extractSignals, type SignalContext } from '../src/main/nudge/signals.ts'
import { decide, presetFor } from '../src/main/nudge/sorter.ts'

function hook(over: Partial<HookEvent>): HookEvent {
  return {
    ts: 1,
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

const route = (h: HookEvent, ctx?: SignalContext, level = presetFor('normal')) =>
  decide(extractSignals(h, ctx), level)

const reformat = hook({
  tool: 'Edit',
  filePath: '/proj/src/util.ts',
  oldString: 'const a=1\nconst b=2\nconst c=3',
  newString: 'const a = 1\nconst b = 2\nconst c = 3',
})
const config = hook({ filePath: '/proj/config/app.json', content: '{\n  "a": 1,\n  "b": 2\n}' })
const security = hook({ filePath: '/proj/src/auth/tokens.ts', content: 'return sign(u)' })
const denseLogic = hook({
  filePath: '/proj/src/engine.ts',
  content: 'if (a) { for (;;) { while (b && c) { d || e } } } else { g }',
})
const sharedSchema = hook({ filePath: '/proj/src/schema/models.json', content: '{\n  "x": 1\n}' })

// ---- hard guards (verifiability-first, cloud-default) ----

test('security-sensitive work is forced to the cloud, no matter what', () => {
  const d = decide(extractSignals(security))
  assert.equal(d.route, 'cloud')
  assert.equal(d.confidence, 1)
  assert.ok(d.reasons.includes('security-sensitive'))
})

test('work a mistake could hide (low verifiability) is forced to the cloud', () => {
  const d = route(denseLogic)
  assert.equal(d.route, 'cloud')
  assert.ok(d.reasons.includes('not-cheaply-verifiable'))
})

// ---- the offloadable cases go local ----

test('a pure reformat routes local', () => {
  const d = route(reformat)
  assert.equal(d.route, 'local')
  assert.ok(d.reasons.includes('pure-transform'))
  assert.ok(d.confidence > 0)
})

test('boilerplate config routes local', () => {
  assert.equal(route(config).route, 'local')
})

test('a template + test coverage pushes borderline config to confident local', () => {
  const d = route(config, { siblingCount: 5, maxSimilarity: 0.9, hasTestCoverage: true })
  assert.equal(d.route, 'local')
  assert.ok(d.reasons.includes('has-template'))
  assert.ok(d.score > route(config).score)
})

// ---- the gray zone ----

test('verifiable-but-high-blast work lands in gray (default cloud, logged)', () => {
  const d = route(sharedSchema)
  assert.equal(d.route, 'gray')
  assert.ok(d.reasons.includes('ambiguous-default-cloud'))
})

// ---- the aggressiveness dial ----

test('careful is stricter than normal: config that goes local drops out under careful', () => {
  assert.equal(route(config).route, 'local')
  // careful raises verifyFloor to 0.45; config verifiability (0.4) now fails the
  // master gate → forced cloud. Stricter, exactly as intended.
  const strict = route(config, undefined, presetFor('careful'))
  assert.equal(strict.route, 'cloud')
  assert.ok(strict.reasons.includes('not-cheaply-verifiable'))
})

test('off disables the booth entirely — everything routes cloud', () => {
  const d = route(reformat, undefined, presetFor('off'))
  assert.equal(d.route, 'cloud')
  assert.deepEqual(d.reasons, ['disabled'])
})

// ---- receipt integrity ----

test('every decision carries its signals and a bounded score/confidence', () => {
  const d = route(config)
  assert.ok(d.score >= 0 && d.score <= 1)
  assert.ok(d.confidence >= 0 && d.confidence <= 1)
  assert.ok(d.signals.raw.fileClass === 'declarative')
})
