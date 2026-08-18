import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { HookEvent } from '../src/shared/types.ts'
import type { RouteReceipt } from '../src/main/nudge/sorter.ts'
import {
  advisoryText,
  evaluate,
  gateAction,
  toGateEvent,
  toReceiptRecord,
  type DecidePayload,
} from '../src/main/nudge/gate.ts'

const reformat: DecidePayload = {
  session_id: 's1',
  cwd: '/proj',
  tool_name: 'Edit',
  tool_input: {
    file_path: '/proj/src/util.ts',
    old_string: 'const a=1\nconst b=2\nconst c=3',
    new_string: 'const a = 1\nconst b = 2\nconst c = 3',
  },
}
const denseLogic: DecidePayload = {
  tool_name: 'Write',
  tool_input: {
    file_path: '/proj/src/engine.ts',
    content: 'if (a) { for (;;) { while (b && c) { d || e } } } else { g }',
  },
}

test('toGateEvent maps a pending tool payload; null when tool missing', () => {
  const e = toGateEvent(reformat)
  assert.equal(e?.tool, 'Edit')
  assert.equal(e?.filePath, '/proj/src/util.ts')
  assert.equal(toGateEvent({ tool_input: {} }), null)
})

test('gateAction only advises clearly-local work, and only in guard mode', () => {
  assert.equal(gateAction('local', 'guard'), 'advise')
  assert.equal(gateAction('local', 'observe'), 'allow')
  assert.equal(gateAction('cloud', 'guard'), 'allow')
  assert.equal(gateAction('gray', 'guard'), 'allow')
})

test('enforce mode denies local work unless within the delegation grace window', () => {
  assert.equal(gateAction('local', 'enforce'), 'deny')
  assert.equal(gateAction('local', 'enforce', true), 'allow')
  assert.equal(gateAction('cloud', 'enforce'), 'allow')
  assert.equal(gateAction('gray', 'enforce'), 'allow')
})

test('evaluate threads inGrace through to the enforce verdict', () => {
  assert.equal(evaluate(reformat, { mode: 'enforce' }).action, 'deny')
  assert.equal(evaluate(reformat, { mode: 'enforce', inGrace: true }).action, 'allow')
})

test('observe mode records the decision but never interferes', () => {
  const recorded: RouteReceipt[] = []
  const v = evaluate(reformat, { mode: 'observe', record: (r) => recorded.push(r) })
  assert.equal(v.route, 'local')
  assert.equal(v.action, 'allow')
  assert.equal(recorded.length, 1)
})

test('guard mode advises redirecting a local write', () => {
  const v = evaluate(reformat, { mode: 'guard' })
  assert.equal(v.route, 'local')
  assert.equal(v.action, 'advise')
})

test('work forced to the cloud is never advised', () => {
  const v = evaluate(denseLogic, { mode: 'guard' })
  assert.equal(v.route, 'cloud')
  assert.equal(v.action, 'allow')
})

test('off mode, delegations, and unwatched tools pass through unrecorded', () => {
  const rec: RouteReceipt[] = []
  const push = (r: RouteReceipt) => rec.push(r)

  const off = evaluate(reformat, { mode: 'off', record: push })
  assert.equal(off.action, 'allow')
  assert.equal(off.receipt, null)

  const deleg = evaluate(
    { tool_name: 'mcp__ollama-coder__local_coding_task', tool_input: { task: 'x' } },
    { mode: 'guard', record: push },
  )
  assert.equal(deleg.receipt, null)

  const read = evaluate({ tool_name: 'Read', tool_input: { file_path: '/a' } }, { mode: 'guard', record: push })
  assert.equal(read.receipt, null)

  assert.equal(rec.length, 0)
})

test('advisoryText names the reasons and drops the gray filler', () => {
  const t = advisoryText(['pure-transform', 'contained', 'ambiguous-default-cloud'])
  assert.ok(t.includes('pure-transform'))
  assert.ok(t.includes('local_coding_task'))
  assert.ok(!t.includes('ambiguous-default-cloud'))
})

test('toReceiptRecord flattens a decision + its event for persistence', () => {
  const e = toGateEvent(reformat) as HookEvent
  const v = evaluate(reformat, { mode: 'observe' })
  const rr = toReceiptRecord(v.receipt!, e)
  assert.equal(rr.route, 'local')
  assert.equal(rr.fileHint, '/proj/src/util.ts')
  assert.equal(rr.outcome, null)
  assert.deepEqual(rr.reasons, v.receipt!.reasons)
})
