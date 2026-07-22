import type { ResidentModel } from '@shared/types'
import { OLLAMA_BASE } from '@shared/constants'

interface PsModel {
  name?: string
  model?: string
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
 * Currently-resident model, or null when nothing is loaded.
 * `expires_at` is Ollama's eviction deadline (default keep_alive is 5 min).
 * A null return also means "Ollama unreachable" — callers pair this with
 * `pingOllama` when they need to distinguish the two.
 */
export async function readResident(): Promise<ResidentModel | null> {
  const data = await getJson<{ models?: PsModel[] }>('/api/ps')
  const m = data?.models?.[0]
  if (!m) return null

  const expires = m.expires_at ? Date.parse(m.expires_at) : NaN

  return {
    name: m.name ?? m.model ?? 'unknown',
    sizeVram: Number(m.size_vram ?? 0),
    contextLength: m.context_length != null ? Number(m.context_length) : null,
    expiresAt: Number.isFinite(expires) ? expires : null,
  }
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
