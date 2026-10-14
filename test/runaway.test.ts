import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseSlotTask, RunawayGuard } from '../src/main/sensors/runaway.ts'
import { parseKillOutput } from '../src/main/sensors/runnerKill.ts'

const LAUNCH = 'slot launch_slot_: id  0 | task 56049 | processing task, is_child = 0'
const RELEASE = 'slot      release: id  0 | task 56049 | stop processing: n_tokens = 3352, truncated = 0'
const TIMING = 'slot print_timing: id  0 | task 56049 |        eval time =    1032.25 ms /    89 tokens'
const IDLE = 'srv  update_slots: all slots are idle'

test('parseSlotTask reads launch and release lines', () => {
  assert.deepEqual(parseSlotTask(LAUNCH), { kind: 'start', key: '0:56049' })
  assert.deepEqual(parseSlotTask(RELEASE), { kind: 'end', key: '0:56049' })
})

test('parseSlotTask ignores other llama-server lines', () => {
  assert.equal(parseSlotTask(TIMING), null)
  assert.equal(parseSlotTask(IDLE), null)
})

test('a task is overdue exactly at the limit, and reported once', () => {
  const g = new RunawayGuard(60_000)
  g.start('0:1', 0)
  assert.deepEqual(g.overdue(59_999), [])
  assert.deepEqual(g.overdue(60_000), [{ key: '0:1', ms: 60_000 }])
  assert.deepEqual(g.overdue(90_000), [])
})

test('a task that ends before the limit is never reported', () => {
  const g = new RunawayGuard(60_000)
  g.start('0:1', 0)
  g.end('0:1')
  assert.deepEqual(g.overdue(120_000), [])
})

test('idle clears every tracked task', () => {
  const g = new RunawayGuard(60_000)
  g.start('0:1', 0)
  g.start('1:2', 0)
  g.idle()
  assert.deepEqual(g.overdue(120_000), [])
})

test('a limit of 0 disables the guard', () => {
  const g = new RunawayGuard(0)
  g.start('0:1', 0)
  assert.deepEqual(g.overdue(10_000_000), [])
})

test('with two slots busy, only the older task is overdue', () => {
  const g = new RunawayGuard(60_000)
  g.start('0:1', 0)
  g.start('1:2', 30_000)
  assert.deepEqual(g.overdue(65_000), [{ key: '0:1', ms: 65_000 }])
  assert.deepEqual(g.overdue(90_000), [{ key: '1:2', ms: 60_000 }])
})

test('parseKillOutput reads the script verdict', () => {
  assert.deepEqual(parseKillOutput('killed 239236 94\r\n'), { action: 'killed', pid: 239236, util: 94 })
  assert.deepEqual(parseKillOutput('skip 212844 3'), { action: 'skip', pid: 212844, util: 3 })
  assert.deepEqual(parseKillOutput(''), { action: 'none', pid: null, util: null })
})
