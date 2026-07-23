import type { WorkSignals } from './signals.js'

/**
 * Module 2 — Sorter. Pure toll-booth decision.
 *
 * Turns the six signals into a route. Two laws:
 *   1. Cost is never a factor — only the nature of the work.
 *   2. Default to the cloud on any doubt (a wrong offload ≫ a missed one).
 *
 * Order of judgment: hard guards first (security, un-verifiability), then a
 * verifiability-weighted blend banded into local / gray / cloud. Every decision
 * carries a receipt so it is auditable — nothing is routed as a black box.
 */

export type Route = 'local' | 'cloud' | 'gray'
export type Aggressiveness = 'off' | 'careful' | 'normal' | 'eager'

export interface RouteConfig {
  disabled: boolean
  verifyFloor: number // verifiability below this → cloud, always (the master gate)
  localBand: number // blended score ≥ this → local
  cloudBand: number // blended score ≤ this → cloud; between the bands → gray
}

export interface RouteReceipt {
  route: Route
  score: number // blended offload score, 0..1
  confidence: number // how firmly the verdict sits, 0..1
  reasons: string[] // human-readable justification
  signals: WorkSignals // the readings that produced it
}

// Verifiability is the heaviest term; the rest separate "safe mechanical" from
// "risky" once the master gate is passed. Sums to 1.
const WEIGHTS = {
  verifiability: 0.3,
  blastRadius: 0.2,
  reasoningDepth: 0.2,
  patternAnalog: 0.12,
  specCompleteness: 0.1,
  contextLocality: 0.08,
} as const

export const PRESETS: Record<Aggressiveness, RouteConfig> = {
  off: { disabled: true, verifyFloor: 2, localBand: 2, cloudBand: 0 },
  careful: { disabled: false, verifyFloor: 0.45, localBand: 0.72, cloudBand: 0.55 },
  normal: { disabled: false, verifyFloor: 0.35, localBand: 0.62, cloudBand: 0.48 },
  eager: { disabled: false, verifyFloor: 0.3, localBand: 0.55, cloudBand: 0.42 },
}

const clamp = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n)

function blend(s: WorkSignals): number {
  return (
    WEIGHTS.verifiability * s.verifiability +
    WEIGHTS.blastRadius * s.blastRadius +
    WEIGHTS.reasoningDepth * s.reasoningDepth +
    WEIGHTS.patternAnalog * s.patternAnalog +
    WEIGHTS.specCompleteness * s.specCompleteness +
    WEIGHTS.contextLocality * s.contextLocality
  )
}

/** Salient, human-readable reasons — the audit trail, not every reading. */
function reasonsFor(route: Route, s: WorkSignals, cfg: RouteConfig): string[] {
  const r: string[] = []
  if (cfg.disabled) return ['disabled']
  if (s.isSecuritySensitive) r.push('security-sensitive')
  if (s.verifiability < cfg.verifyFloor) r.push('not-cheaply-verifiable')
  if (s.raw.isPureTransform) r.push('pure-transform')
  if (s.verifiability >= 0.6) r.push('cheaply-verifiable')
  if (s.reasoningDepth >= 0.85) r.push('shallow')
  else if (s.reasoningDepth <= 0.3) r.push('deep-logic')
  if (s.blastRadius >= 0.8) r.push('contained')
  else if (s.blastRadius <= 0.4) r.push('high-blast')
  if (s.patternAnalog >= 0.7) r.push('has-template')
  if (route === 'gray') r.push('ambiguous-default-cloud')
  return r
}

function confidenceFor(route: Route, score: number, cfg: RouteConfig): number {
  if (route === 'local') return clamp((score - cfg.localBand) / (1 - cfg.localBand || 1))
  if (route === 'cloud') return clamp((cfg.cloudBand - score) / (cfg.cloudBand || 1))
  const mid = (cfg.localBand + cfg.cloudBand) / 2
  const half = (cfg.localBand - cfg.cloudBand) / 2 || 1
  return clamp(1 - Math.abs(score - mid) / half) // gray: firmest at the midpoint
}

/** The toll booth. Pure: signals + config → an auditable route. */
export function decide(signals: WorkSignals, config: RouteConfig = PRESETS.normal): RouteReceipt {
  const score = Number(blend(signals).toFixed(4))

  let route: Route
  let hardGuard = false
  if (config.disabled) {
    route = 'cloud'
    hardGuard = true
  } else if (signals.isSecuritySensitive || signals.verifiability < config.verifyFloor) {
    route = 'cloud' // master gate: never offload what a mistake would hide
    hardGuard = true
  } else if (score >= config.localBand) {
    route = 'local'
  } else if (score <= config.cloudBand) {
    route = 'cloud'
  } else {
    route = 'gray'
  }

  return {
    route,
    score,
    confidence: hardGuard ? 1 : Number(confidenceFor(route, score, config).toFixed(4)),
    reasons: reasonsFor(route, signals, config),
    signals,
  }
}

export function presetFor(level: Aggressiveness): RouteConfig {
  return PRESETS[level]
}
