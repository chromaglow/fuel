import type { ResidentModel } from '@shared/types'
import { OLLAMA_BASE } from '@shared/constants'

interface PsModel {
  name?: string
  model?: string
  size?: number
  size_vram?: number
  context_length?: number
  expires_at?: string
}

async function getJson<T>(path: string, timeoutMs = 3000): Promise<T | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${OLLAMA_BASE}${path}`, { signal: ctrl.signal })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    // Ollama down, mid-restart, or slow — the caller renders "offline".
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Every model currently resident, from /api/ps — the GPU is shared, and two
 * tenants can be loaded at once (that is the whole point of the VRAM budget).
 * `expires_at` is each model's own keep-alive deadline.
 *
 * Returns `null` when Ollama is unreachable, `[]` when it is up but idle, so
 * callers can tell "down" from "nothing loaded" without a second probe.
 * Tenant is filled in by the caller (main knows the registry; this sensor
 * only knows Ollama).
 */
export async function readResidents(): Promise<
  Omit<ResidentModel, 'tenant' | 'keepAliveSec'>[] | null
> {
  const data = await getJson<{ models?: PsModel[] }>('/api/ps')
  if (data == null) return null

  return (data.models ?? []).map((m) => {
    const expires = m.expires_at ? Date.parse(m.expires_at) : NaN
    const sizeVram = Number(m.size_vram ?? 0)
    return {
      name: m.name ?? m.model ?? 'unknown',
      sizeVram,
      sizeTotal: Math.max(sizeVram, Number(m.size ?? 0)),
      contextLength: m.context_length != null ? Number(m.context_length) : null,
      expiresAt: Number.isFinite(expires) ? expires : null,
    }
  })
}

/** Installed models. Polled infrequently; used for the model picker later. */
export async function readTags(): Promise<string[]> {
  const data = await getJson<{ models?: Array<{ name?: string }> }>('/api/tags')
  return (data?.models ?? []).map((m) => m.name ?? '').filter(Boolean)
}

/** Distinguishes "Ollama is up but idle" from "Ollama is down". */
export async function pingOllama(): Promise<boolean> {
  const v = await getJson<{ version?: string }>('/api/version', 2000)
  return v != null
}
