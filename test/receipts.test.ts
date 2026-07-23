import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { ReceiptRecord } from '../src/shared/types.ts'
import { Store } from '../src/main/db/index.ts'

function rec(over: Partial<ReceiptRecord>): ReceiptRecord {
  return {
    ts: Date.now(),
    sessionId: 's1',
    tool: 'Write',
    fileHint: '/proj/config/app.json',
    route: 'local',
    score: 0.68,
    confidence: 0.4,
    reasons: ['cheaply-verifiable', 'contained'],
    signals: { verifiability: 0.8, raw: { fileClass: 'declarative' } },
    outcome: null,
    ...over,
  }
}

test('a receipt round-trips through SQLite with reasons + signals intact', () => {
  const s = new Store(':memory:')
  const id = s.insertReceipt(rec({ route: 'local', reasons: ['pure-transform'] }))
  assert.ok(id > 0)

  const [got] = s.recentReceipts(10)
  assert.equal(got!.route, 'local')
  assert.deepEqual(got!.reasons, ['pure-transform'])
  assert.deepEqual(got!.signals, { verifiability: 0.8, raw: { fileClass: 'declarative' } })
  assert.equal(got!.score, 0.68)
  s.close()
})

test('recentReceipts returns newest first, respecting the limit', () => {
  const s = new Store(':memory:')
  const t0 = Date.now()
  s.insertReceipt(rec({ ts: t0 - 2000, fileHint: 'old' }))
  s.insertReceipt(rec({ ts: t0 - 1000, fileHint: 'mid' }))
  s.insertReceipt(rec({ ts: t0, fileHint: 'new' }))

  const got = s.recentReceipts(2)
  assert.equal(got.length, 2)
  assert.equal(got[0]!.fileHint, 'new')
  assert.equal(got[1]!.fileHint, 'mid')
  s.close()
})

test('todayCatchStats buckets by route and counts offloaded outcomes', () => {
  const s = new Store(':memory:')
  s.insertReceipt(rec({ route: 'local', outcome: 'offloaded' }))
  s.insertReceipt(rec({ route: 'local', outcome: null }))
  s.insertReceipt(rec({ route: 'cloud' }))
  s.insertReceipt(rec({ route: 'gray' }))
  s.insertReceipt(rec({ route: 'gray' }))

  const stats = s.todayCatchStats()
  assert.deepEqual(stats, { local: 2, cloud: 1, gray: 2, offloaded: 1 })
  s.close()
})

test('todayCatchStats ignores rows from before today', () => {
  const s = new Store(':memory:')
  s.insertReceipt(rec({ route: 'local', ts: Date.now() - 3 * 86_400_000 }))
  s.insertReceipt(rec({ route: 'local', ts: Date.now() }))
  assert.equal(s.todayCatchStats().local, 1)
  s.close()
})

test('empty store yields a zeroed tally, not nulls', () => {
  const s = new Store(':memory:')
  assert.deepEqual(s.todayCatchStats(), { local: 0, cloud: 0, gray: 0, offloaded: 0 })
  s.close()
})
