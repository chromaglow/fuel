import { test } from 'node:test'
import assert from 'node:assert/strict'
import { residentVramMb } from '../src/shared/vram.ts'

test('one resident gets the whole nvidia-smi figure, not /api/ps size_vram', () => {
  // gemma4:12b on Ganymede: /api/ps says 1.95 GB, nvidia-smi says 13.1 GB.
  assert.deepEqual(residentVramMb([1950267472], 13414), [13414])
})

test('two residents split nvidia-smi used by their /api/ps weights', () => {
  assert.deepEqual(residentVramMb([3e9, 1e9], 12000), [9000, 3000])
})

test('zero or bogus weights split evenly', () => {
  assert.deepEqual(residentVramMb([0, NaN], 8000), [4000, 4000])
})

test('nothing loaded, and nvidia-smi missing', () => {
  assert.deepEqual(residentVramMb([], 900), [])
  assert.equal(residentVramMb([5e9], null), null)
  assert.equal(residentVramMb([5e9], undefined), null)
})
