/**
 * The savings history panel (2026-10-14): opens from the chart button on the
 * VRAM legend line and covers the card. Thirty daily bars (hover one for its
 * day), the totals for the month, the year, all time and the best day, and the
 * same split by tenant. The numbers come from main (fuel:history), priced with
 * the headline figure's own per-tenant rates.
 */
import type { HistoryDay, SavingsHistory } from '../shared/history.js'
import { tenantClass } from './panel.js'

const usd = (n: number): string =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** "2026-10-14" -> "Oct 14" (local date, no time zone shift). */
export function shortDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function tokens(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** The line under the bars: the hovered day, or today. */
export function dayLine(d: HistoryDay, today: string): string {
  const when = d.day === today ? `today, ${shortDay(d.day)}` : shortDay(d.day)
  return d.usd > 0 ? `${when} · ≈ ${usd(d.usd)} · ${tokens(d.tokens)} tok · ${d.tasks} tasks` : `${when} · nothing offloaded`
}

export function renderHistory(h: SavingsHistory): string {
  const today = h.days[h.days.length - 1]!.day
  const peak = Math.max(...h.days.map((d) => d.usd), 0.01)
  const bars = h.days
    .map((d, i) => {
      const pct = d.usd > 0 ? Math.max(3, (d.usd / peak) * 100) : 0
      const cls = ['hist-bar', d.day === today ? 'is-today' : '', h.best && d.day === h.best.day ? 'is-best' : ''].join(' ').trim()
      return `<div class="${cls}" data-i="${i}" title="${esc(dayLine(d, today))}"><i style="height:${pct.toFixed(1)}%"></i></div>`
    })
    .join('')
  const tile = (label: string, value: string, note: string): string =>
    `<div class="hist-tile"><span class="hist-label">${label}</span><span class="hist-value">${value}</span><span class="hist-note">${note}</span></div>`
  const tenants = h.byTenant
    .map(
      (t) =>
        `<div class="hist-tenant"><span class="tenant ${tenantClass(t.tenant)}">${esc(t.tenant?.label ?? 'unattributed')}</span><span>≈ ${usd(t.usdMonth)}</span><span class="hist-note">${usd(t.usdYear)} this year</span></div>`,
    )
    .join('')
  const year = today.slice(0, 4)
  return `
    <div class="hist-bars" id="hist-bars">${bars}</div>
    <div class="hist-axis"><span>${shortDay(h.days[0]!.day)}</span><span>${shortDay(today)}</span></div>
    <div class="hist-day" id="hist-day">${esc(dayLine(h.days[h.days.length - 1]!, today))}</div>
    <div class="hist-tiles">
      ${tile('last 30 days', `≈ ${usd(h.monthUsd)}`, `${usd(h.monthUsd / 30)} a day`)}
      ${tile(`${year} so far`, `≈ ${usd(h.yearUsd)}`, 'year to date')}
      ${tile('all time', `≈ ${usd(h.allTimeUsd)}`, h.since ? `since ${shortDay(h.since)}` : 'nothing yet')}
      ${tile('best day', h.best ? `≈ ${usd(h.best.usd)}` : '—', h.best ? shortDay(h.best.day) : 'nothing yet')}
    </div>
    <div class="sub">by tenant · last 30 days</div>
    <div class="hist-tenants">${tenants || '<div class="hist-note">nothing offloaded yet</div>'}</div>
    <div class="hist-note hist-foot">Estimates: what these tokens would have cost on Claude, at each tenant's rate.</div>`
}

/** Hovering a bar shows its day on the line under the chart; leaving shows today again. */
export function wireHistory(root: HTMLElement, h: SavingsHistory): void {
  const line = root.querySelector<HTMLElement>('#hist-day')
  const bars = root.querySelector<HTMLElement>('#hist-bars')
  if (!line || !bars) return
  const today = h.days[h.days.length - 1]!
  bars.addEventListener('mouseover', (e) => {
    const bar = (e.target as HTMLElement).closest<HTMLElement>('.hist-bar')
    const d = bar ? h.days[Number(bar.dataset.i)] : undefined
    if (d) line.textContent = dayLine(d, today.day)
  })
  bars.addEventListener('mouseleave', () => {
    line.textContent = dayLine(today, today.day)
  })
}
