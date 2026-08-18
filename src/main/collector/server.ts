import { createServer, type Server } from 'node:http'
import type { HookEvent, OffloadEvent } from '@shared/types'
import { COLLECTOR_HOST, COLLECTOR_PORT, COLD_START_NS } from '@shared/constants'

/** The JSON the instrumented MCP shim POSTs to /ingest. */
interface IngestBody {
  client?: string
  session_id?: string | null
  model?: string
  status?: string
  error?: string | null
  prompt_tokens?: number | null
  eval_tokens?: number | null
  prompt_eval_ns?: number | null
  eval_ns?: number | null
  load_ns?: number | null
  total_ns?: number | null
  num_ctx?: number | null
  started_at?: number
  ended_at?: number
  task_summary?: string | null
  output_hash?: string | null
}

const KNOWN_CLIENTS = new Set(['claude-code', 'claude-desktop', 'unknown'])

function n(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function toEvent(b: IngestBody): OffloadEvent | null {
  if (!b || typeof b !== 'object') return null
  const now = Date.now()
  const loadNs = n(b.load_ns)
  const client = KNOWN_CLIENTS.has(String(b.client)) ? String(b.client) : 'unknown'

  return {
    startedAt: n(b.started_at) ?? now,
    endedAt: n(b.ended_at) ?? now,
    source: 'mcp',
    client,
    // The shim runs on this machine by construction; it never sees the socket.
    clientIp: null,
    sessionId: b.session_id != null ? String(b.session_id) : null,
    model: b.model ? String(b.model) : 'unknown',
    status: b.status === 'error' ? 'error' : 'ok',
    error: b.error != null ? String(b.error) : null,
    promptTokens: n(b.prompt_tokens),
    evalTokens: n(b.eval_tokens),
    promptEvalNs: n(b.prompt_eval_ns),
    evalNs: n(b.eval_ns),
    loadNs,
    totalNs: n(b.total_ns),
    numCtx: n(b.num_ctx),
    // The shim controls num_ctx, so its calls never truncate.
    truncated: false,
    coldStart: loadNs != null && loadNs > COLD_START_NS,
    taskSummary: b.task_summary != null ? String(b.task_summary) : null,
    outputHash: b.output_hash != null ? String(b.output_hash) : null,
    // Set later by the nudge engine (M4) when the shim's output can be diffed
    // against what Claude ultimately wrote.
    outcome: null,
  }
}

/** The JSON the PostToolUse hook POSTs to /hook. */
interface HookBody {
  session_id?: string | null
  cwd?: string | null
  tool?: string
  file_path?: string | null
  old_string?: string | null
  new_string?: string | null
  content?: string | null
  content_hash?: string | null
  task?: string | null
  output_hash?: string | null
}

function toHookEvent(b: HookBody): HookEvent | null {
  if (!b || typeof b !== 'object' || !b.tool) return null
  const s = (v: unknown): string | null => (v != null ? String(v) : null)
  return {
    ts: Date.now(),
    sessionId: s(b.session_id),
    cwd: s(b.cwd),
    tool: String(b.tool),
    filePath: s(b.file_path),
    oldString: s(b.old_string),
    newString: s(b.new_string),
    content: s(b.content),
    contentHash: s(b.content_hash),
    taskText: s(b.task),
    outputHash: s(b.output_hash),
  }
}

/**
 * Loopback ingest for the Phase C shim (/ingest) and PostToolUse hook (/hook).
 *
 * Each Claude Code / Desktop session spawns its *own* shim and fires its own
 * hooks, so per-process state is useless — everything POSTs here, to the one
 * long-lived collector. Bound to 127.0.0.1 only; no auth needed on loopback.
 */
export class Collector {
  private server: Server | null = null

  constructor(
    private readonly onEvent: (e: OffloadEvent) => void,
    private readonly onHook: (e: HookEvent) => void = () => {},
    // The PreToolUse gate POSTs a pending tool action to /decide and gets back
    // a routing verdict. Defaults to a permissive no-op so /decide never blocks.
    private readonly onDecide: (payload: unknown) => unknown = () => ({
      route: 'cloud',
      action: 'allow',
      reasons: [],
    }),
  ) {}

  start(): void {
    this.server = createServer((req, res) => {
      const route = req.url
      if (req.method !== 'POST' || (route !== '/ingest' && route !== '/hook' && route !== '/decide')) {
        res.writeHead(404).end()
        return
      }

      let body = ''
      let tooBig = false
      req.on('data', (chunk) => {
        body += chunk
        if (body.length > 256 * 1024) {
          tooBig = true
          req.destroy()
        }
      })
      req.on('end', () => {
        if (tooBig) return
        try {
          const parsed = JSON.parse(body)
          if (route === '/decide') {
            const verdict = this.onDecide(parsed)
            res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(verdict))
            return
          }
          if (route === '/ingest') {
            const event = toEvent(parsed as IngestBody)
            if (event) this.onEvent(event)
          } else {
            const hookEvent = toHookEvent(parsed as HookBody)
            if (hookEvent) this.onHook(hookEvent)
          }
          res.writeHead(204).end()
        } catch {
          res.writeHead(400).end()
        }
      })
      req.on('error', () => {})
    })

    this.server.on('error', (err: NodeJS.ErrnoException) => {
      // EADDRINUSE means another fuel instance owns the port — the single
      // instance lock should prevent this, so just log and carry on headless.
      if (err.code !== 'EADDRINUSE') return
    })

    this.server.listen(COLLECTOR_PORT, COLLECTOR_HOST)
  }

  stop(): void {
    this.server?.close()
    this.server = null
  }
}

// Exposed for unit testing the wire-format parsing.
export const _toEvent = toEvent
export const _toHookEvent = toHookEvent
