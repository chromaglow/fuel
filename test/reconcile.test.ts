import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { OffloadEvent } from '../src/shared/types.ts'
import { Reconciler } from '../src/main/collector/reconcile.ts'

/** A controllable clock + timer queue so tests don't sleep. */
function harness(windowMs = 6000) {
  let clock = 1_000_000
  const timers: Array<{ id: number; fireAt: number; fn: () => void }> = []
  let tid = 0
  const committed: OffloadEvent[] = []

  const r = new Reconciler(
    (e) => committed.push(e),
    windowMs,
    () => clock,
    (fn, ms) => {
      const id = tid++
      timers.push({ id, fireAt: clock + ms, fn })
      return id
    },
    (t) => {
      const i = timers.findIndex((x) => x.id === t)
      if (i >= 0) timers.splice(i, 1)
    },
  )

  const advance = (ms: number): void => {
    clock += ms
    for (const t of [...timers]) {
      if (t.fireAt <= clock) {
        timers.splice(timers.indexOf(t), 1)
        t.fn()
      }
    }
  }

  return { r, committed, advance, now: () => clock }
}

function ev(over: Partial<OffloadEvent>): OffloadEvent {
  return {
    startedAt: 1_000_000,
    endedAt: 1_000_000,
    source: 'log',
    client: null,
    sessionId: null,
    model: 'qwen2.5-coder:14b',
    status: 'ok',
    error: null,
    promptTokens: null,
    evalTokens: null,
    promptEvalNs: null,
    evalNs: null,
    loadNs: null,
    totalNs: null,
    numCtx: null,
    truncated: false,
    coldStart: false,
    taskSummary: null,
    outputHash: null,
    ...over,
  }
}

test('log event alone commits after the window', () => {
  const { r, committed, advance } = harness()
  r.onLog(ev({ source: 'log', evalTokens: 100, endedAt: 1_000_000 }))
  assert.equal(committed.length, 0, 'should wait for a possible MCP match')
  advance(6000)
  assert.equal(committed.length, 1)
  assert.equal(committed[0]!.source, 'log')
})

test('MCP claims a matching buffered log event — committed once, as mcp', () => {
  const { r, committed, advance } = harness()
  r.onLog(ev({ source: 'log', evalTokens: 610, endedAt: 1_000_100 }))
  r.onMcp(
    ev({ source: 'mcp', client: 'claude-code', evalTokens: 610, endedAt: 1_000_050 }),
  )
  assert.equal(committed.length, 1, 'log record must be cancelled')
  assert.equal(committed[0]!.source, 'mcp')
  assert.equal(committed[0]!.client, 'claude-code')
  advance(10000)
  assert.equal(committed.length, 1, 'no late log emission')
})

test('MCP arriving before the log suppresses the late log event', () => {
  const { r, committed, advance } = harness()
  r.onMcp(ev({ source: 'mcp', client: 'claude-desktop', evalTokens: 42, endedAt: 1_000_000 }))
  assert.equal(committed.length, 1)
  // Log line for the same inference lands ~80ms later.
  r.onLog(ev({ source: 'log', evalTokens: 42, endedAt: 1_000_080 }))
  advance(10000)
  assert.equal(committed.length, 1, 'the log duplicate must be dropped')
  assert.equal(committed[0]!.source, 'mcp')
})

test('non-matching token counts are treated as different inferences', () => {
  const { r, committed, advance } = harness()
  r.onLog(ev({ source: 'log', evalTokens: 100, endedAt: 1_000_000 }))
  r.onMcp(ev({ source: 'mcp', evalTokens: 200, endedAt: 1_000_050 }))
  advance(6000)
  assert.equal(committed.length, 2, 'both should commit')
})

test('events outside the time window do not pair even with equal tokens', () => {
  const { r, committed, advance } = harness()
  r.onLog(ev({ source: 'log', evalTokens: 50, endedAt: 1_000_000 }))
  advance(6000) // the log commits on its own
  assert.equal(committed.length, 1)
  r.onMcp(ev({ source: 'mcp', evalTokens: 50, endedAt: 1_007_000 }))
  assert.equal(committed.length, 2, 'the later MCP event is its own inference')
})

test('token-less log falls back to time-window pairing', () => {
  const { r, committed } = harness()
  r.onLog(ev({ source: 'log', evalTokens: null, endedAt: 1_000_000 }))
  r.onMcp(ev({ source: 'mcp', evalTokens: 610, endedAt: 1_000_100 }))
  assert.equal(committed.length, 1, 'serialized: the token-less log is the same run')
  assert.equal(committed[0]!.source, 'mcp')
})

test('flushAll commits pending log events immediately', () => {
  const { r, committed } = harness()
  r.onLog(ev({ source: 'log', evalTokens: 7, endedAt: 1_000_000 }))
  assert.equal(committed.length, 0)
  r.flushAll()
  assert.equal(committed.length, 1)
})
