import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Tenant } from '@shared/types'
import defaults from '../../config/tenants.json' with { type: 'json' }

interface IpRule extends Tenant {
  /** The model this caller is expected to be using, when it is only ever one. */
  model?: string
}

interface TenantsConfig {
  byIp: Record<string, IpRule>
  byModel: Record<string, Tenant>
}

let cfg: TenantsConfig = normalise(defaults as unknown as Partial<TenantsConfig>)

function normalise(raw: Partial<TenantsConfig>): TenantsConfig {
  return {
    byIp: { ...(raw.byIp ?? {}) },
    byModel: { ...(raw.byModel ?? {}) },
  }
}

/**
 * Load a per-machine override from %LOCALAPPDATA%/fuel/tenants.json. It is
 * merged over the bundled defaults key-by-key, so a one-line file can add a new
 * caller without restating the rest.
 */
export function loadTenants(dataDir: string): void {
  try {
    const raw = readFileSync(join(dataDir, 'tenants.json'), 'utf8')
    const user = normalise(JSON.parse(raw) as Partial<TenantsConfig>)
    cfg = {
      byIp: { ...cfg.byIp, ...user.byIp },
      byModel: { ...cfg.byModel, ...user.byModel },
    }
  } catch {
    // No override, or malformed — bundled defaults stand.
  }
}

function pick(t: Tenant | undefined): Tenant | null {
  return t ? { id: t.id, label: t.label } : null
}

/** Tenant that owns a resident model, by exact model name. */
export function tenantForModel(model: string | null | undefined): Tenant | null {
  if (!model) return null
  return pick(cfg.byModel[model])
}

/**
 * Tenant by id, for labelling stored events (which keep only the id). Scans
 * both rule sets; ids are shared between them by design.
 */
export function tenantById(id: string | null | undefined): Tenant | null {
  if (!id) return null
  for (const t of Object.values(cfg.byModel)) if (t.id === id) return pick(t)
  for (const t of Object.values(cfg.byIp)) if (t.id === id) return pick(t)
  return null
}

/** Tenant that made a request, by the caller IP Ollama logged. */
export function tenantForIp(ip: string | null | undefined): Tenant | null {
  if (!ip) return null
  return pick(cfg.byIp[ip])
}

/**
 * Best-effort model for a log-sourced request, which carries no model name.
 * Order: the caller's declared model → the only model resident right now →
 * 'unknown'. Two residents and no declaration is genuinely ambiguous, and
 * saying so beats guessing.
 */
export function inferModel(ip: string | null, residents: readonly { name: string }[]): string {
  const declared = ip ? cfg.byIp[ip]?.model : undefined
  if (declared) return declared
  if (residents.length === 1) return residents[0]!.name
  return 'unknown'
}
