import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OffloadActivity, parseActivity } from '../src/main/collector/activity.ts'

test('parseActivity accepts a start/end beacon', () => {
  assert.deepEqual(parseActivity({ id: 'abc', state: 'start', model: 'qwen2.5-coder:7b' }), {
    id: 'abc',
    state: 'start',
    model: 'qwen2.5-coder:7b',
  })
  assert.deepEqual(parseActivity({ id: 'abc', state: 'end' }), {
    id: 'abc',
    state: 'end',
    model: null,
  })
})

test('parseActivity rejects malformed beacons', () => {
  assert.equal(parseActivity(null), null)
  assert.equal(parseActivity('start'), null)
  assert.equal(parseActivity({ state: 'start' }), null)
  assert.equal(parseActivity({ id: '', state: 'start' }), null)
  assert.equal(parseActivity({ id: 'x'.repeat(65), state: 'start' }), null)
  assert.equal(parseActivity({ id: 'abc', state: 'running' }), null)
})

test('a started offload is active until its end beacon', () => {
  const a = new OffloadActivity()
  a.observe({ id: '1', state: 'start', model: 'coder' }, 0)
  assert.deepEqual(a.activeModels(1000), ['coder'])
  a.observe({ id: '1', state: 'end', model: 'coder' }, 2000)
  assert.deepEqual(a.activeModels(2000), [])
})

test('overlapping offloads stay active until the last one ends', () => {
  const a = new OffloadActivity()
  a.observe({ id: '1', state: 'start', model: 'coder' }, 0)
  a.observe({ id: '2', state: 'start', model: 'coder' }, 100)
  a.observe({ id: '1', state: 'end', model: 'coder' }, 200)
  assert.equal(a.activeModels(300).length, 1)
  a.observe({ id: '2', state: 'end', model: 'coder' }, 400)
  assert.equal(a.activeModels(500).length, 0)
})

test('an end beacon for an unknown id is harmless', () => {
  const a = new OffloadActivity()
  a.observe({ id: 'ghost', state: 'end', model: null }, 0)
  assert.deepEqual(a.activeModels(0), [])
})

test('a lost end beacon expires instead of lighting the pill forever', () => {
  const a = new OffloadActivity(1000)
  a.observe({ id: '1', state: 'start', model: 'coder' }, 0)
  assert.equal(a.activeModels(1000).length, 1)
  assert.equal(a.activeModels(1001).length, 0)
})
