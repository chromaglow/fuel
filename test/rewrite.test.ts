import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isModifiable, rewriteBody } from '../src/main/proxy/rewrite.ts'

const FLOOR = 16384
const KEEP = '30m'

test('a body with no options is floored and keep_alive is pinned', () => {
  const r = rewriteBody({ model: 'm', prompt: 'hi' }, FLOOR, KEEP)
  assert.equal(r.changed, true)
  assert.equal(r.forcedCtx, FLOOR)
  assert.deepEqual(r.body.options, { num_ctx: FLOOR })
  assert.equal(r.body.keep_alive, KEEP)
  // Untouched fields survive.
  assert.equal(r.body.model, 'm')
  assert.equal(r.body.prompt, 'hi')
})

test('a num_ctx below the floor is raised', () => {
  const r = rewriteBody({ options: { num_ctx: 4096, temperature: 0.2 } }, FLOOR, KEEP)
  assert.equal(r.forcedCtx, FLOOR)
  assert.deepEqual(r.body.options, { num_ctx: FLOOR, temperature: 0.2 })
})

test('a client asking for MORE context keeps it', () => {
  const r = rewriteBody({ options: { num_ctx: 32768 } }, FLOOR, KEEP)
  assert.equal(r.forcedCtx, null, 'we do not shrink an explicit larger request')
  assert.equal((r.body.options as Record<string, unknown>).num_ctx, 32768)
})

test('an explicit keep_alive is respected, not overwritten', () => {
  const r = rewriteBody({ options: { num_ctx: 4096 }, keep_alive: 0 }, FLOOR, KEEP)
  assert.equal(r.body.keep_alive, 0, 'a client wanting immediate unload is honoured')
})

test('a fully-sufficient body is left unchanged', () => {
  const r = rewriteBody({ options: { num_ctx: 20000 }, keep_alive: '10m' }, FLOOR, KEEP)
  assert.equal(r.changed, false, 'nothing to fix ⇒ forward original bytes verbatim')
  assert.equal(r.forcedCtx, null)
})

test('non-object bodies are refused, not mangled', () => {
  for (const bad of [null, undefined, 42, 'x', [1, 2, 3]]) {
    const r = rewriteBody(bad, FLOOR, KEEP)
    assert.equal(r.changed, false)
    assert.deepEqual(r.body, {})
  }
})

test('isModifiable only matches the two generation endpoints', () => {
  assert.equal(isModifiable('/api/generate'), true)
  assert.equal(isModifiable('/api/chat'), true)
  assert.equal(isModifiable('/api/chat?foo=1'), true, 'query string is ignored')
  assert.equal(isModifiable('/api/ps'), false)
  assert.equal(isModifiable('/api/tags'), false)
  assert.equal(isModifiable('/api/embeddings'), false)
  assert.equal(isModifiable(undefined), false)
})
