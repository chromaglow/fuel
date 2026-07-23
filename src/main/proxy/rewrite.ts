import { DEFAULT_NUM_CTX, PROXY_KEEP_ALIVE } from '@shared/constants'

/**
 * The generation endpoints whose JSON body the valve is willing to enrich.
 * Everything else (/api/ps, /api/tags, /api/pull, embeddings, …) is streamed
 * straight through untouched.
 */
const MODIFIABLE = new Set(['/api/generate', '/api/chat'])

export function isModifiable(path: string | undefined): boolean {
  if (!path) return false
  const clean = path.split('?')[0]
  return clean != null && MODIFIABLE.has(clean)
}

export interface RewriteResult {
  /** The body to forward. Only meaningful when `changed` is true. */
  body: Record<string, unknown>
  /** False ⇒ forward the client's original bytes verbatim (nothing to fix). */
  changed: boolean
  /** The num_ctx we imposed, or null if the client's was already sufficient. */
  forcedCtx: number | null
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Force a context-length floor and pin keep_alive on a generation request.
 *
 * The whole reason the valve exists: uninstrumented clients (and Claude
 * Desktop) send no `num_ctx`, so Ollama silently runs them at 4,096 — the
 * truncation bug M3 fixed only for the instrumented shim. Here we fix it for
 * *every* client. A client that explicitly asks for MORE context keeps it (it
 * knows what it wants); one that asks for less, or nothing, is raised to the
 * floor. keep_alive is pinned only when the client left it unset, so a client
 * that deliberately wants an immediate unload is still honoured.
 */
export function rewriteBody(
  parsed: unknown,
  numCtxFloor: number = DEFAULT_NUM_CTX,
  keepAlive: string | number = PROXY_KEEP_ALIVE,
): RewriteResult {
  if (!isPlainObject(parsed)) return { body: {}, changed: false, forcedCtx: null }

  let changed = false
  const options = isPlainObject(parsed.options) ? { ...parsed.options } : {}

  const current = typeof options.num_ctx === 'number' ? options.num_ctx : 0
  let forcedCtx: number | null = null
  if (current < numCtxFloor) {
    options.num_ctx = numCtxFloor
    forcedCtx = numCtxFloor
    changed = true
  }

  const out: Record<string, unknown> = { ...parsed, options }

  if (parsed.keep_alive === undefined) {
    out.keep_alive = keepAlive
    changed = true
  }

  return { body: out, changed, forcedCtx }
}
