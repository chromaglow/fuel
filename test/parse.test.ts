import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseGoDuration } from '../src/main/sensors/ollamaLog.ts'
import { usdEquivalent, tokensPerSecond } from '../src/main/metrics.ts'

test('parseGoDuration handles every GIN unit', () => {
  assert.equal(parseGoDuration('0s'), 0)
  assert.equal(parseGoDuration('12.5269ms'), 12.5269)
  // 509.3µs — the micro sign, as emitted by GIN.
  assert.ok(Math.abs(parseGoDuration('509.3µs') - 0.5093) < 1e-9)
  assert.ok(Math.abs(parseGoDuration('54.5301118s') - 54530.1118) < 1e-6)
})

test('parseGoDuration composes multi-unit durations', () => {
  assert.equal(parseGoDuration('1m30s'), 90_000)
  assert.equal(parseGoDuration('1h'), 3_600_000)
})

test('parseGoDuration returns 0 for unparseable input', () => {
  assert.equal(parseGoDuration('n/a'), 0)
  assert.equal(parseGoDuration(''), 0)
})

test('usdEquivalent uses Opus 4.8 input/output split (default pricing)', () => {
  // 1M input @ $5, 1M output @ $25 (config/pricing.json default).
  assert.ok(Math.abs(usdEquivalent(1_000_000, 0) - 5.0) < 1e-9)
  assert.ok(Math.abs(usdEquivalent(0, 1_000_000) - 25.0) < 1e-9)
  // The split matters: 610 output + 44 input from the M1 verification run.
  const v = usdEquivalent(44, 610)
  assert.ok(Math.abs(v - (44 / 1e6) * 5 - (610 / 1e6) * 25) < 1e-12)
})

test('tokensPerSecond matches the measured warm baseline', () => {
  // 610 tokens in 9.4806 s -> ~64.3 tok/s (SPEC §2.3a).
  const tps = tokensPerSecond(610, 9_480_608_000)
  assert.ok(tps != null && Math.abs(tps - 64.34) < 0.1)
})

test('tokensPerSecond guards the zero cases', () => {
  assert.equal(tokensPerSecond(0, 1000), null)
  assert.equal(tokensPerSecond(100, 0), null)
})
