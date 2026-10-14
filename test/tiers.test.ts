import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ambientFps, tierForLap, tierMoves, tierRank, TIERS } from '../src/renderer/tiers.ts'

test('laps climb the ladder at the agreed points (0-based laps, $2 each)', () => {
  const at = (lap: number) => tierForLap(lap).id
  assert.equal(at(0), 'solid') // $0-2, red
  assert.equal(at(5), 'solid') // $10-12, purple
  assert.equal(at(6), 'aurora') // $12
  assert.equal(at(8), 'shimmer') // $16
  assert.equal(at(10), 'gold') // $20
  assert.equal(at(15), 'prism') // $30
  assert.equal(at(25), 'plasma') // $50
  assert.equal(at(400), 'plasma')
})

test('ranks rise with the ladder, and only the solid laps sit still', () => {
  assert.deepEqual(TIERS.map((t) => tierRank(t.id)), [0, 1, 2, 3, 4, 5])
  assert.equal(tierMoves('solid'), false)
  assert.equal(tierMoves('aurora'), true)
})

test('ambient frames: smooth while working, slow while idle, none when dark', () => {
  assert.equal(ambientFps(1), 30)
  assert.equal(ambientFps(0.35), 10)
  assert.equal(ambientFps(0), 0)
})
