/**
 * Savings history for the HUD's history panel: what was preserved each day
 * for the last month, year to date, all time and the best day, plus the same
 * split by tenant. Pure, so it is tested without a database: main prices each
 * (day, tenant) row with the same per-tenant rates as the headline figure and
 * hands the rows here.
 */
import type { Tenant } from './types.js'

/** One local day's work by one tenant, already priced. */
export interface PricedDay {
  /** Local day key, YYYY-MM-DD. */
  day: string
  tenant: Tenant | null
  usd: number
  tokens: number
  tasks: number
}

export interface HistoryDay {
  day: string
  usd: number
  tokens: number
  tasks: number
}

export interface HistoryTenant {
  tenant: Tenant | null
  usdMonth: number
  usdYear: number
}

export interface SavingsHistory {
  /** The last `days` local days, oldest first, today last; days with no work are zero. */
  days: HistoryDay[]
  monthUsd: number
  yearUsd: number
  allTimeUsd: number
  /** The best single day ever, or null before any work. */
  best: HistoryDay | null
  /** The best day before today: what today has to beat for a new record. */
  bestBeforeToday: HistoryDay | null
  /** The first day with any work: how far back "all time" reaches. */
  since: string | null
  /** By tenant: the last month and the year, largest first, unattributed last. */
  byTenant: HistoryTenant[]
}

/** The local day key `n` days before `today` (YYYY-MM-DD in, YYYY-MM-DD out). */
export function dayBefore(today: string, n: number): string {
  const [y, m, d] = today.split('-').map(Number) as [number, number, number]
  const dt = new Date(y, m - 1, d - n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export function summarizeHistory(rows: PricedDay[], today: string, days = 30): SavingsHistory {
  const keys = Array.from({ length: days }, (_, i) => dayBefore(today, days - 1 - i))
  const monthFrom = keys[0]!
  const yearFrom = `${today.slice(0, 4)}-01-01`

  const perDay = new Map<string, HistoryDay>()
  const perTenant = new Map<string | null, HistoryTenant>()
  let allTimeUsd = 0
  let since: string | null = null

  for (const r of rows) {
    if (r.day > today) continue
    allTimeUsd += r.usd
    if (since === null || r.day < since) since = r.day
    const d = perDay.get(r.day) ?? { day: r.day, usd: 0, tokens: 0, tasks: 0 }
    d.usd += r.usd
    d.tokens += r.tokens
    d.tasks += r.tasks
    perDay.set(r.day, d)

    const key = r.tenant?.id ?? null
    const t = perTenant.get(key) ?? { tenant: r.tenant, usdMonth: 0, usdYear: 0 }
    if (r.day >= monthFrom) t.usdMonth += r.usd
    if (r.day >= yearFrom) t.usdYear += r.usd
    perTenant.set(key, t)
  }

  const all = [...perDay.values()]
  const bestOf = (list: HistoryDay[]) => list.reduce<HistoryDay | null>((b, d) => (d.usd > 0 && (!b || d.usd > b.usd) ? d : b), null)
  const best = bestOf(all)
  const bestBeforeToday = bestOf(all.filter((d) => d.day < today))
  const byTenant = [...perTenant.values()]
    .filter((t) => t.usdMonth > 0 || t.usdYear > 0)
    .sort((a, b) => {
      if (a.tenant == null) return 1
      if (b.tenant == null) return -1
      return b.usdYear - a.usdYear
    })

  return {
    days: keys.map((k) => perDay.get(k) ?? { day: k, usd: 0, tokens: 0, tasks: 0 }),
    monthUsd: all.filter((d) => d.day >= monthFrom).reduce((a, d) => a + d.usd, 0),
    yearUsd: all.filter((d) => d.day >= yearFrom).reduce((a, d) => a + d.usd, 0),
    allTimeUsd,
    best,
    bestBeforeToday,
    since,
    byTenant,
  }
}
