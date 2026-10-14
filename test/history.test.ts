import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dayBefore, summarizeHistory, type PricedDay } from '../src/shared/history.ts'
import type { Tenant } from '../src/shared/types.ts'

const pc: Tenant = { id: 'local', label: 'this PC' }
const dj: Tenant = { id: 'weyld-dj', label: 'WEYLD DJ' }
const row = (day: string, tenant: Tenant | null, usd: number): PricedDay => ({ day, tenant, usd, tokens: usd * 1e5, tasks: 1 })

test('dayBefore counts local calendar days across month and year ends', () => {
  assert.equal(dayBefore('2026-10-14', 0), '2026-10-14')
  assert.equal(dayBefore('2026-10-01', 1), '2026-09-30')
  assert.equal(dayBefore('2026-01-01', 1), '2025-12-31')
})

test('the last 30 days run oldest to today, with empty days as zero', () => {
  const h = summarizeHistory([row('2026-10-14', pc, 2), row('2026-10-10', dj, 1)], '2026-10-14')
  assert.equal(h.days.length, 30)
  assert.equal(h.days[0]!.day, '2026-09-15')
  assert.equal(h.days[29]!.day, '2026-10-14')
  assert.equal(h.days[29]!.usd, 2)
  assert.equal(h.days[25]!.usd, 1)
  assert.equal(h.days[24]!.usd, 0)
})

test('month, year, all time, best day and since', () => {
  const h = summarizeHistory(
    [
      row('2025-12-30', pc, 5), // last year: all time only
      row('2026-02-01', pc, 3), // this year, outside the month
      row('2026-10-02', dj, 4),
      row('2026-10-02', pc, 4), // same day, two tenants: an 8-dollar best day
      row('2026-10-14', pc, 1),
    ],
    '2026-10-14',
  )
  assert.equal(h.monthUsd, 9)
  assert.equal(h.yearUsd, 12)
  assert.equal(h.allTimeUsd, 17)
  assert.deepEqual([h.best?.day, h.best?.usd], ['2026-10-02', 8])
  assert.deepEqual([h.bestBeforeToday?.day, h.bestBeforeToday?.usd], ['2026-10-02', 8])
  // Today beating it: best is today, the record to beat is still the old one.
  const today = summarizeHistory([row('2026-10-02', pc, 8), row('2026-10-14', pc, 9)], '2026-10-14')
  assert.deepEqual([today.best?.day, today.bestBeforeToday?.day], ['2026-10-14', '2026-10-02'])
  assert.equal(h.since, '2025-12-30')
})

test('by tenant: month and year, biggest year first, unattributed last', () => {
  const h = summarizeHistory([row('2026-10-14', null, 50), row('2026-10-14', dj, 2), row('2026-03-01', pc, 9), row('2026-10-13', pc, 1)], '2026-10-14')
  assert.deepEqual(
    h.byTenant.map((t) => [t.tenant?.id ?? null, t.usdMonth, t.usdYear]),
    [
      ['local', 1, 10],
      ['weyld-dj', 2, 2],
      [null, 50, 50],
    ],
  )
})

test('nothing yet', () => {
  const h = summarizeHistory([], '2026-10-14')
  assert.equal(h.best, null)
  assert.equal(h.since, null)
  assert.equal(h.allTimeUsd, 0)
})
