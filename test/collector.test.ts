import { test } from 'node:test'
import assert from 'node:assert/strict'
import { _toEvent } from '../src/main/collector/server.ts'

test('a well-formed MCP body maps to an attributed mcp event', () => {
  const e = _toEvent({
    client: 'claude-code',
    model: 'qwen2.5-coder:14b',
    status: 'ok',
    prompt_tokens: 39,
    eval_tokens: 76,
    prompt_eval_ns: 800_000_000,
    eval_ns: 7_000_000_000,
    load_ns: 0,
    total_ns: 7_900_000_000,
    num_ctx: 16384,
    started_at: 1_000_000,
    ended_at: 1_007_900,
    task_summary: 'reverse a string',
  })
  assert.ok(e)
  assert.equal(e.source, 'mcp')
  assert.equal(e.client, 'claude-code')
  assert.equal(e.promptTokens, 39)
  assert.equal(e.evalTokens, 76)
  assert.equal(e.numCtx, 16384)
  // The shim controls num_ctx, so its calls never truncate.
  assert.equal(e.truncated, false)
})

test('an unknown client is normalised to "unknown"', () => {
  const e = _toEvent({ client: 'some-other-tool', model: 'm' })
  assert.equal(e?.client, 'unknown')
})

test('cold_start is derived from load_ns over one second', () => {
  const cold = _toEvent({ load_ns: 33_000_000_000 })
  const warm = _toEvent({ load_ns: 0 })
  assert.equal(cold?.coldStart, true)
  assert.equal(warm?.coldStart, false)
})

test('error status is preserved', () => {
  const e = _toEvent({ status: 'error', error: 'Ollama is not running' })
  assert.equal(e?.status, 'error')
  assert.equal(e?.error, 'Ollama is not running')
})

test('missing timestamps fall back to now rather than null', () => {
  const before = Date.now()
  const e = _toEvent({ client: 'claude-code' })
  assert.ok(e && e.startedAt >= before && e.endedAt >= before)
})

test('non-numeric token fields become null, not NaN', () => {
  const e = _toEvent({ eval_tokens: 'lots' as unknown as number })
  assert.equal(e?.evalTokens, null)
})
