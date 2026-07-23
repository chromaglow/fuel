import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Watchdog } from '../src/main/proxy/watchdog.ts'

/**
 * Drives the bypass state machine directly through check(), with an injectable
 * probe result and no real timers — the interval plumbing is trivial; the logic
 * that matters is "3 consecutive misses trip, one hit recovers."
 */
function harness(threshold = 3) {
  let next = true
  const changes: boolean[] = []
  const w = new Watchdog(
    (b) => changes.push(b),
    () => Promise.resolve(next),
    5000,
    threshold,
    () => 0, // setTimer — unused; we call check() by hand
    () => {},
  )
  return {
    w,
    changes,
    set: (ok: boolean) => {
      next = ok
    },
    fail: async (n: number) => {
      next = false
      for (let i = 0; i < n; i++) await w.check()
    },
    ok: async () => {
      next = true
      await w.check()
    },
  }
}

test('bypass trips only after the threshold of consecutive failures', async () => {
  const h = harness(3)
  await h.fail(2)
  assert.equal(h.w.isBypassed(), false, 'two misses is not enough')
  assert.deepEqual(h.changes, [])
  await h.fail(1)
  assert.equal(h.w.isBypassed(), true)
  assert.deepEqual(h.changes, [true])
})

test('a success before the threshold resets the counter', async () => {
  const h = harness(3)
  await h.fail(2)
  await h.ok()
  await h.fail(2)
  assert.equal(h.w.isBypassed(), false, 'the streak was broken, so no trip')
  assert.deepEqual(h.changes, [])
})

test('a single success clears an engaged bypass', async () => {
  const h = harness(3)
  await h.fail(3)
  assert.equal(h.w.isBypassed(), true)
  await h.ok()
  assert.equal(h.w.isBypassed(), false)
  assert.deepEqual(h.changes, [true, false], 'recovery is automatic')
})

test('bypass change fires once, not on every repeated failure', async () => {
  const h = harness(3)
  await h.fail(6)
  assert.equal(h.w.isBypassed(), true)
  assert.deepEqual(h.changes, [true], 'no redundant notifications')
})
