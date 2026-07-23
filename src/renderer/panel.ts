import type { HudState, Nudge, RecentEvent } from '../shared/types.js'

function row(k: string, v: string, cls = ''): string {
  return `<div class="k">${k}</div><div class="v ${cls}">${v}</div>`
}

function fmtTokens(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec.toFixed(0)}s`
  const m = Math.floor(sec / 60)
  return `${m}m ${Math.round(sec % 60)}s`
}

/** The dense telemetry revealed on hover — everything the gauge elides. */
export function renderPanelRows(el: HTMLElement, s: HudState): void {
  const g = s.gpu
  const t = s.today
  const parts: string[] = []

  if (g) {
    parts.push(row('gpu', `${g.utilGpu}% · ${g.smClockMhz} MHz`))
    parts.push(
      row(
        'vram',
        `${(g.memUsedMb / 1024).toFixed(2)} / ${(g.memTotalMb / 1024).toFixed(1)} GB`,
      ),
    )
    parts.push(
      row('power', `${g.powerW.toFixed(0)} / ${g.powerLimitW.toFixed(0)} W · ${g.tempC}°C`),
    )
  } else {
    parts.push(row('gpu', 'unavailable', 'warn'))
  }

  if (s.resident) {
    parts.push(
      row('model vram', `${(s.resident.sizeVram / 1024 ** 3).toFixed(2)} GB`),
    )
    const ctx = s.contextLength
    parts.push(
      row(
        'context',
        ctx != null ? fmtTokens(ctx) : '—',
        ctx != null && ctx <= 4096 ? 'warn' : '',
      ),
    )
    if (s.evictInSec != null) {
      const m = Math.floor(s.evictInSec / 60)
      const sec = s.evictInSec % 60
      parts.push(row('evicts in', `${m}:${String(sec).padStart(2, '0')}`))
    }
  } else {
    parts.push(row('model', 'not loaded'))
  }

  parts.push(row('tasks', String(t.tasks), t.tasks > 0 ? 'hl' : ''))
  parts.push(row('tokens in', fmtTokens(t.promptTokens)))
  parts.push(row('tokens out', fmtTokens(t.evalTokens)))
  parts.push(row('gpu time', fmtDuration(t.gpuSeconds)))
  parts.push(
    row('cold starts', String(t.coldStarts), t.coldStarts > 0 ? 'warn' : ''),
  )
  parts.push(
    row('truncated', String(t.truncations), t.truncations > 0 ? 'warn' : ''),
  )
  parts.push(row('preserved', `≈ $${s.usdToday.toFixed(4)}`, 'hl'))

  el.innerHTML = parts.join('')
}

/** Recent task list. Empty state matters here — it is the product thesis. */
export function renderPanelTasks(el: HTMLElement, events: RecentEvent[]): void {
  if (events.length === 0) {
    el.innerHTML = '<div class="empty">nothing offloaded yet</div>'
    return
  }

  el.innerHTML = events
    .map((e) => {
      const time = new Date(e.startedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
      const tok = e.evalTokens != null ? `${fmtTokens(e.evalTokens)} tok` : '—'
      const rate = e.tokPerSec != null ? `${e.tokPerSec.toFixed(0)} t/s` : ''
      const flags = [e.coldStart ? 'cold' : '', e.truncated ? 'trunc' : '']
        .filter(Boolean)
        .join(' ')
      return (
        `<div class="task"><span class="t">${time}</span>` +
        `<span>${tok} · ${rate}` +
        (flags ? ` <span class="flag">${flags}</span>` : '') +
        `</span></div>`
      )
    })
    .join('')
}

const HINT_MAX = 22

function shortHint(hint: string | null): string {
  if (!hint) return ''
  const base = hint.replace(/\\/g, '/').split('/').filter(Boolean).slice(-2).join('/')
  return base.length > HINT_MAX ? '…' + base.slice(-HINT_MAX) : base
}

/**
 * Recent unburned-fuel detections. Reviewable during shadow-mode calibration —
 * this list is how you sanity-check the classifier before trusting the count.
 */
export function renderPanelNudges(el: HTMLElement, nudges: Nudge[]): void {
  if (nudges.length === 0) {
    el.innerHTML = '<div class="empty">none detected</div>'
    return
  }
  el.innerHTML = nudges
    .map((n) => {
      const time = new Date(n.ts).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
      const est = n.estTokens != null ? `~${fmtTokens(n.estTokens)} tok` : ''
      const sig = n.signals[0] ?? 'mechanical'
      return (
        `<div class="nudge"><span class="t">${time}</span>` +
        `<span class="sig">${sig} · ${shortHint(n.fileHint)}</span>` +
        `<span>${est}</span></div>`
      )
    })
    .join('')
}
