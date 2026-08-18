import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  EvictionDetector,
  EVICTION_ATTRIBUTION_WINDOW_MS,
} from '../src/main/sensors/evictions.ts'
import type { ResidentModel, Tenant } from '../src/shared/types.ts'

const res = (
  name: string,
  expiresAt: number | null,
  sizeVram = 5e9,
  tenant: Tenant | null = null,
): ResidentModel => ({
  name,
  sizeVram,
  sizeTotal: sizeVram,
  contextLength: null,
  expiresAt,
  tenant,
  keepAliveSec: null,
})

const DJ: Tenant = { id: 'weyld-dj', label: 'WEYLD DJ' }
const CODER: Tenant = { id: 'coder', label: 'coder' }

test('the first snapshot never emits — nothing to compare against', () => {
  const d = new EvictionDetector()
  assert.deepEqual(d.observe([res('a', 300_000)], 0), [])
})

test('a model that leaves at its keep-alive deadline is a timeout, not an eviction', () => {
  const d = new EvictionDetector()
  d.observe([res('a', 10_000)], 0)
  assert.deepEqual(d.observe([], 10_000), [])
  // Even a couple of seconds early is within Ollama's expiry-ticker slop.
  const d2 = new EvictionDetector()
  d2.observe([res('a', 10_000)], 0)
  assert.deepEqual(d2.observe([], 8_000), [])
})

test('leaving well before the deadline and being replaced is an eviction blamed on the newcomer', () => {
  const d = new EvictionDetector()
  d.observe([res('a', 300_000, 7e9, DJ)], 0)
  const out = d.observe([res('b', 900_000, 11e9, CODER)], 1_000)
  assert.equal(out.length, 1)
  assert.deepEqual(out[0], {
    ts: 1_000,
    model: 'a',
    tenant: DJ,
    sizeVram: 7e9,
    earlyByMs: 299_000,
    evictedBy: 'b',
    evictedByTenant: CODER,
  })
})

test('a newcomer arriving later inside the attribution window still gets the blame', () => {
  const d = new EvictionDetector()
  d.observe([res('a', 300_000)], 0)
  // /api/ps briefly shows nobody while Ollama unloads then loads.
  assert.deepEqual(d.observe([], 1_000), [])
  const out = d.observe([res('b', 900_000)], 6_000)
  assert.equal(out.length, 1)
  assert.equal(out[0]!.model, 'a')
  assert.equal(out[0]!.evictedBy, 'b')
  // Stamped when it left, not when it was blamed.
  assert.equal(out[0]!.ts, 1_000)
  assert.equal(out[0]!.earlyByMs, 299_000)
})

test('an early departure with no newcomer is committed unattributed once the window closes', () => {
  const d = new EvictionDetector()
  d.observe([res('a', 300_000)], 0)
  assert.deepEqual(d.observe([], 1_000), [])
  assert.deepEqual(d.observe([], 1_000 + EVICTION_ATTRIBUTION_WINDOW_MS - 1), [])
  const out = d.observe([], 1_000 + EVICTION_ATTRIBUTION_WINDOW_MS)
  assert.equal(out.length, 1)
  assert.equal(out[0]!.model, 'a')
  assert.equal(out[0]!.evictedBy, null)
  assert.equal(out[0]!.evictedByTenant, null)
  assert.equal(out[0]!.ts, 1_000)
})

test('two residents both surviving produce nothing — co-residency is the goal state', () => {
  const d = new EvictionDetector()
  d.observe([res('a', 300_000), res('b', 300_000)], 0)
  assert.deepEqual(d.observe([res('a', 300_000), res('b', 300_000)], 1_000), [])
})

test('a model with no expiresAt never counts as evicted', () => {
  const d = new EvictionDetector()
  d.observe([res('a', null)], 0)
  assert.deepEqual(d.observe([res('b', 900_000)], 1_000), [])
})

test('a pending departure is emitted only once', () => {
  const d = new EvictionDetector()
  d.observe([res('a', 300_000)], 0)
  d.observe([], 1_000)
  const first = d.observe([res('b', 900_000)], 2_000)
  assert.equal(first.length, 1)
  assert.deepEqual(d.observe([res('b', 900_000)], 3_000), [])
  assert.deepEqual(d.observe([res('b', 900_000)], 1_000 + EVICTION_ATTRIBUTION_WINDOW_MS + 5), [])
})
