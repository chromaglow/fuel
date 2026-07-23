import { createServer, request as httpRequest, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import {
  DEFAULT_MODEL,
  DEFAULT_NUM_CTX,
  PROXY_HOST,
  PROXY_KEEP_ALIVE,
  PROXY_MAX_BODY_BYTES,
  PROXY_PORT,
  UPSTREAM_URL,
} from '@shared/constants'
import { isModifiable, rewriteBody } from './rewrite.js'

const debug = (...a: unknown[]): void => {
  if (process.env['FUEL_DEBUG']) console.error('[fuel:valve]', ...a)
}

/**
 * The Valve (SPEC §4.3, Phase B) — an opt-in reverse proxy that fuel binds on
 * Ollama's usual port, with the real Ollama relocated to UPSTREAM. Every local
 * inference then flows through here so fuel can force a context floor and pin
 * keep_alive for *all* clients, not just the instrumented shim.
 *
 * It is deliberately paranoid, because when engaged it is load-bearing: if it
 * misbehaves, all local inference misbehaves. The safety contract:
 *
 *   - Only POST /api/generate and /api/chat are ever inspected; everything else
 *     is a pure streaming pipe (mitigation: minimal surface).
 *   - The inspected path buffers only the small request body; the *response* is
 *     always streamed chunk-by-chunk, so NDJSON token streams are never held up.
 *   - Any parse/rewrite exception forwards the client's original bytes verbatim
 *     (mitigation #2, transparent passthrough on error).
 *   - When the watchdog signals bypass, even the inspected endpoints become a
 *     zero-parsing pipe (mitigation #3).
 *
 * Ships disabled by default; engaged only from the tray after the user has
 * relocated Ollama (integrations/valve.mjs hook).
 */
export class Valve {
  private server: Server | null = null
  private bypassed = false
  private readonly upstream = new URL(UPSTREAM_URL)

  constructor(
    private readonly onListenError: (err: NodeJS.ErrnoException) => void = () => {},
    private readonly numCtxFloor: number = DEFAULT_NUM_CTX,
    private readonly keepAlive: string | number = PROXY_KEEP_ALIVE,
    private readonly port: number = PROXY_PORT,
  ) {}

  start(): void {
    this.server = createServer((req, res) => this.handle(req, res))
    this.server.on('error', (err: NodeJS.ErrnoException) => {
      // EADDRINUSE almost always means Ollama itself is still on this port —
      // i.e. the user hasn't relocated it. Surface it so the caller can refuse
      // to consider the valve engaged rather than silently swallowing inference.
      this.onListenError(err)
    })
    this.server.listen(this.port, PROXY_HOST)
    debug(`listening on ${PROXY_HOST}:${this.port} → ${this.upstream.host}`)
  }

  stop(): void {
    this.server?.close()
    this.server = null
  }

  /** Watchdog hook: drop to (or leave) a zero-parsing byte pipe. */
  setBypass(on: boolean): void {
    if (this.bypassed === on) return
    this.bypassed = on
    debug(on ? 'bypass ENGAGED (pure pipe)' : 'bypass cleared')
  }

  isBypassed(): boolean {
    return this.bypassed
  }

  private handle(req: IncomingMessage, res: ServerResponse): void {
    try {
      if (this.bypassed || req.method !== 'POST' || !isModifiable(req.url)) {
        this.pipeThrough(req, res)
        return
      }
      this.inspectAndForward(req, res)
    } catch (err) {
      // A bug in our own dispatch must never take inference down: fall back to
      // the dumb pipe. Safe only if the request body hasn't been consumed yet,
      // which is the case for any throw before inspectAndForward starts reading.
      debug('handle() threw, piping through', err)
      try {
        this.pipeThrough(req, res)
      } catch {
        if (!res.headersSent) res.writeHead(502).end()
      }
    }
  }

  /** Pure streaming proxy: pipe request up, pipe response back, touch nothing. */
  private pipeThrough(req: IncomingMessage, res: ServerResponse): void {
    const upReq = this.openUpstream(req, (upRes) => {
      res.writeHead(upRes.statusCode ?? 502, upRes.headers)
      upRes.pipe(res)
    })
    upReq.on('error', () => this.failResponse(res))
    req.pipe(upReq)
  }

  /** Buffer the (small) generation body, rewrite it, forward with a streamed reply. */
  private inspectAndForward(req: IncomingMessage, res: ServerResponse): void {
    const chunks: Buffer[] = []
    let size = 0
    let aborted = false

    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > PROXY_MAX_BODY_BYTES) {
        aborted = true
        if (!res.headersSent) res.writeHead(413).end()
        req.destroy()
        return
      }
      chunks.push(c)
    })

    req.on('error', () => {
      if (!aborted && !res.headersSent) res.writeHead(400).end()
    })

    req.on('end', () => {
      if (aborted) return
      const raw = Buffer.concat(chunks)
      let outBody = raw
      try {
        const parsed = JSON.parse(raw.toString('utf8'))
        const { body, changed, forcedCtx } = rewriteBody(parsed, this.numCtxFloor, this.keepAlive)
        if (changed) {
          outBody = Buffer.from(JSON.stringify(body), 'utf8')
          if (forcedCtx != null) debug(`forced num_ctx=${forcedCtx} on ${req.url}`)
        }
      } catch {
        // Unparseable body, or rewrite threw — forward the client's bytes as-is.
        outBody = raw
      }
      this.forwardBuffered(req, res, outBody)
    })
  }

  private forwardBuffered(req: IncomingMessage, res: ServerResponse, body: Buffer): void {
    const headers = { ...req.headers, host: this.upstream.host }
    headers['content-length'] = String(body.byteLength)
    delete headers['transfer-encoding']

    const upReq = this.openUpstream(req, (upRes) => {
      res.writeHead(upRes.statusCode ?? 502, upRes.headers)
      upRes.pipe(res)
    }, headers)
    upReq.on('error', () => this.failResponse(res))
    upReq.end(body)
  }

  private openUpstream(
    req: IncomingMessage,
    onResponse: (upRes: IncomingMessage) => void,
    headers: IncomingMessage['headers'] = { ...req.headers, host: this.upstream.host },
  ): ReturnType<typeof httpRequest> {
    return httpRequest(
      {
        protocol: this.upstream.protocol,
        hostname: this.upstream.hostname,
        port: this.upstream.port,
        method: req.method,
        path: req.url,
        headers,
      },
      onResponse,
    )
  }

  private failResponse(res: ServerResponse): void {
    if (!res.headersSent) res.writeHead(502).end('fuel: upstream unreachable')
    else res.destroy()
  }

  /**
   * Load the model into VRAM ahead of demand, killing the ~33 s cold start on
   * the next real request. Fire-and-forget: an empty-prompt generate with the
   * forced context and pinned keep_alive. Failures are ignored — pre-warm is an
   * optimisation, never a correctness requirement.
   */
  prewarm(model: string = DEFAULT_MODEL): void {
    const body = Buffer.from(
      JSON.stringify({
        model,
        prompt: '',
        keep_alive: this.keepAlive,
        options: { num_ctx: this.numCtxFloor },
      }),
      'utf8',
    )
    const upReq = httpRequest({
      protocol: this.upstream.protocol,
      hostname: this.upstream.hostname,
      port: this.upstream.port,
      method: 'POST',
      path: '/api/generate',
      headers: { 'content-type': 'application/json', 'content-length': String(body.byteLength) },
    }, (r) => r.resume())
    upReq.on('error', (e) => debug('prewarm failed', e))
    upReq.end(body)
    debug(`pre-warming ${model}`)
  }
}
