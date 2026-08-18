import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DailyTotals } from '@shared/types'
import defaults from '../../config/pricing.json' with { type: 'json' }

interface Rate {
  inputPerMTok: number
  outputPerMTok: number
}

interface Pricing {
  default: string
  /** tenant id → counterfactual model key, or null for "no Claude equivalent". */
  tenants?: Record<string, string | null>
  models: Record<string, Rate>
}

let pricing: Pricing = defaults as unknown as Pricing

/**
 * Load a user override from %LOCALAPPDATA%/fuel/pricing.json if present, so
 * rate changes don't require a release. Falls back to the bundled defaults.
 */
export function loadPricing(dataDir: string): void {
  try {
    const raw = readFileSync(join(dataDir, 'pricing.json'), 'utf8')
    const parsed = JSON.parse(raw) as Pricing
    if (parsed?.models && parsed?.default) pricing = parsed
  } catch {
    // No override, or it's malformed — bundled defaults stand.
  }
}

export function activeRate(): Rate {
  return (
    pricing.models[pricing.default] ?? { inputPerMTok: 5.0, outputPerMTok: 25.0 }
  )
}

export function activeModelName(): string {
  return pricing.default
}

/**
 * The Claude model a tenant's tokens are priced against, or null when there is
 * no honest counterfactual (an embedding model was never going to be Claude).
 * Unlisted tenants — and unattributed work — price at the default.
 */
export function rateModelForTenant(tenantId: string | null): string | null {
  const t = pricing.tenants ?? {}
  if (tenantId != null && tenantId in t) return t[tenantId] ?? null
  return pricing.default
}

export function usdForTenant(
  tenantId: string | null,
  promptTokens: number,
  evalTokens: number,
): number {
  const model = rateModelForTenant(tenantId)
  if (model == null) return 0
  const r = pricing.models[model] ?? activeRate()
  return (promptTokens / 1e6) * r.inputPerMTok + (evalTokens / 1e6) * r.outputPerMTok
}

/**
 * Estimated Claude API spend avoided by running these tokens locally.
 *
 * This is deliberately labelled an *estimate* everywhere it surfaces. On a
 * Claude subscription no dollars are literally refunded — what is actually
 * preserved is rate-limit headroom. The dollar figure is the legible proxy;
 * see SPEC.md §6.2.
 */
export function usdEquivalent(promptTokens: number, evalTokens: number): number {
  const r = activeRate()
  return (
    (promptTokens / 1e6) * r.inputPerMTok + (evalTokens / 1e6) * r.outputPerMTok
  )
}

export function usdForDay(totals: DailyTotals): number {
  return usdEquivalent(totals.promptTokens, totals.evalTokens)
}

/** Generation throughput in tokens/sec. Excludes prompt eval and model load. */
export function tokensPerSecond(evalTokens: number, evalNs: number): number | null {
  if (!evalTokens || !evalNs) return null
  return evalTokens / (evalNs / 1e9)
}
