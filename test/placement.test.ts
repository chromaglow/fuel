import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  anchorFromBounds,
  anchorFromLegacy,
  parseStoredAnchor,
  placeFromCorner,
  resolveAnchor,
} from '../src/main/placement.ts'

// Work area with a 40px top taskbar — the case the old bounds-vs-workArea
// mismatch got wrong.
const WA = { x: 0, y: 40, width: 1920, height: 1000 }
const D1 = { id: 1, workArea: WA }
const D2 = { id: 2, workArea: { x: -3440, y: 0, width: 3440, height: 1400 } }

const COMPACT = { width: 320, height: 352 }
const EXPANDED = { width: 320, height: 800 }
const MINI = { width: 168, height: 52 }

test('placeFromCorner hangs the window from its top-right corner', () => {
  assert.deepEqual(placeFromCorner({ x: 1896, y: 64 }, COMPACT, WA), {
    x: 1576,
    y: 64,
    width: 320,
    height: 352,
  })
})

test('placeFromCorner shifts a tall window up off the bottom edge', () => {
  const b = placeFromCorner({ x: 1896, y: 900 }, EXPANDED, WA)
  assert.equal(b.y, 240) // 40 + 1000 - 800
  assert.equal(b.x, 1576)
})

test('placeFromCorner pins a window taller than the work area to its top', () => {
  const b = placeFromCorner({ x: 1896, y: 500 }, { width: 320, height: 2000 }, WA)
  assert.equal(b.y, 40)
})

test('placeFromCorner clamps a corner past the left edge', () => {
  assert.equal(placeFromCorner({ x: 100, y: 64 }, COMPACT, WA).x, 0)
})

test('anchorFromBounds records the top-right relative to the work area', () => {
  assert.deepEqual(anchorFromBounds({ x: 1576, y: 64, ...COMPACT }, D1), {
    displayId: 1,
    relRight: 1896,
    relTop: 24,
    absRight: 1896,
    absTop: 64,
  })
})

test('save → resolve → place round-trips exactly (no taskbar drift)', () => {
  const bounds = { x: 1576, y: 64, ...COMPACT }
  const r = resolveAnchor(anchorFromBounds(bounds, D1), [D1, D2])
  assert.ok(r)
  assert.deepEqual(r.corner, { x: 1896, y: 64 })
  assert.equal(r.display.id, 1)
  assert.deepEqual(placeFromCorner(r.corner, COMPACT, r.display.workArea), bounds)
})

test('mini pill hangs from the same top-right corner', () => {
  const r = resolveAnchor(anchorFromBounds({ x: 1576, y: 64, ...COMPACT }, D1), [D1])
  assert.ok(r)
  assert.deepEqual(placeFromCorner(r.corner, MINI, WA), {
    x: 1728,
    y: 64,
    width: 168,
    height: 52,
  })
})

test('resolveAnchor follows its display when monitors are rearranged', () => {
  const anchor = { displayId: 2, relRight: 3000, relTop: 100, absRight: -440, absTop: 100 }
  const moved = { id: 2, workArea: { x: 1920, y: 0, width: 3440, height: 1400 } }
  const r = resolveAnchor(anchor, [D1, moved])
  assert.ok(r)
  assert.deepEqual(r.corner, { x: 4920, y: 100 })
  assert.equal(r.display.id, 2)
})

test('resolveAnchor falls back to the absolute point when the id is gone', () => {
  const anchor = { displayId: 99, relRight: 500, relTop: 10, absRight: 1000, absTop: 300 }
  const r = resolveAnchor(anchor, [D1, D2])
  assert.ok(r)
  assert.deepEqual(r.corner, { x: 1000, y: 300 })
  assert.equal(r.display.id, 1)
})

test('resolveAnchor gives up when neither id nor point matches a display', () => {
  const anchor = { displayId: 99, relRight: 0, relTop: 0, absRight: 99999, absTop: 99999 }
  assert.equal(resolveAnchor(anchor, [D1, D2]), null)
  assert.equal(resolveAnchor(null, [D1]), null)
})

test('parseStoredAnchor rejects missing, corrupt and partial values', () => {
  assert.equal(parseStoredAnchor(null), null)
  assert.equal(parseStoredAnchor('not json'), null)
  assert.equal(parseStoredAnchor('{"displayId":1}'), null)
  const full = { displayId: 2, relRight: 3000, relTop: 100, absRight: -440, absTop: 100 }
  assert.deepEqual(parseStoredAnchor(JSON.stringify(full)), full)
})

test('anchorFromLegacy converts top-left-vs-bounds to top-right-vs-workArea', () => {
  const legacy = { displayId: 1, relX: 1576, relY: 24 }
  const displayBounds = { x: 0, y: 0, width: 1920, height: 1080 }
  assert.deepEqual(anchorFromLegacy(legacy, displayBounds, D1, 320), {
    displayId: 1,
    relRight: 1896,
    relTop: -16,
    absRight: 1896,
    absTop: 24,
  })
})
