import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_FX, FX_PRESETS, hexRgb, normalizeFx } from '../src/renderer/fx-config.ts'

test('nothing stored is the defaults', () => {
  assert.deepEqual(normalizeFx(null), DEFAULT_FX)
  assert.deepEqual(normalizeFx('junk'), DEFAULT_FX)
})

test('numbers are clamped to the dials, and missing fields take the defaults', () => {
  const f = normalizeFx({ flames: { amount: 99, height: -5 } }).flames
  assert.equal(f.amount, 3)
  assert.equal(f.height, 0.3)
  assert.equal(f.size, DEFAULT_FX.flames.size)
  assert.equal(f.colors, DEFAULT_FX.flames.colors)
})

test('bad colours, types and choices are ignored; good colours are lower-cased', () => {
  assert.deepEqual(normalizeFx({ head: { color: 'red', size: 'big' } }).head, DEFAULT_FX.head)
  assert.equal(normalizeFx({ head: { color: '#FF0000' } }).head.color, '#ff0000')
  assert.equal(normalizeFx({ flames: { colors: 'neon' } }).flames.colors, 'tier')
  assert.equal(normalizeFx({ enabled: false }).enabled, false)
})

test('presets', () => {
  assert.equal(FX_PRESETS.Calm!(DEFAULT_FX).enabled, false)
  assert.ok(FX_PRESETS.Party!(DEFAULT_FX).explosions.amount > DEFAULT_FX.explosions.amount)
  assert.deepEqual(FX_PRESETS.Lively!(FX_PRESETS.Party!(DEFAULT_FX)), DEFAULT_FX)
})

test('hexRgb', () => {
  assert.deepEqual(hexRgb('#ff9900'), [255, 153, 0])
})
