import { EventEmitter } from 'node:events'
import { createReadStream, existsSync, statSync, watch, type FSWatcher } from 'node:fs'
import { join } from 'node:path'
import type { OffloadEvent } from '@shared/types'
import { COLD_START_NS } from '@shared/constants'

export function defaultLogPath(): string {
  const local = process.env.LOCALAPPDATA ?? ''
  return join(local, 'Ollama', 'server.log')
}

/**
 * Parse a Go `time.Duration` string as emitted by GIN — "54.5301118s",
 * "12.5269ms", "509.3µs", "0s", "1m30s" — into milliseconds.
 */
export function parseGoDuration(s: string): number {
  const re = /(\d+(?:\.\d+)?)\s*(ns|µs|us|ms|h|m|s)/g
  let ms = 0
  let matched = false
  let m: RegExpExecArray | null
  while ((m = re.exec(s)) !== null) {
    matched = true
    const v = Number(m[1])
    switch (m[2]) {
      case 'ns': ms += v / 1e6; break
      case 'µs':
      case 'us': ms += v / 1e3; break
      case 'ms': ms += v; break
      case 's': ms += v * 1e3; break
      case 'm': ms += v * 60e3; break
      case 'h': ms += v * 3600e3; break
    }
  }
  return matched ? ms : 0
}

// [GIN] 2026/07/22 - 13:35:34 | 200 |   54.5301118s |    127.0.0.1 | POST  "/api/generate"
const GIN = /^\[GIN\]\s+\S+\s+-\s+\S+\s*\|\s*(\d{3})\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(\w+)\s+"([^"]+)"/

// llama-server emits a separate timing line per phase. Keeping them apart
// matters: prompt tokens price as Claude *input* and eval tokens as *output*,
// a 5x difference, so conflating them would skew the headline metric.
//
//   prompt eval time = 17287.00 ms /  37 tokens (467.22 ms per token,  2.14 t/s)
//          eval time =  3865.35 ms / 155 tokens ( 24.94 ms per token, 40.10 t/s)
//         total time = 21152.35 ms / 192 tokens
//
// Caveat: llama-server counts only the prompt tokens it actually *evaluated*.
// With prefix caching, a 44-token prompt can report 18. For budget purposes the
// full prompt is what never reached Claude, so Phase A undercounts input
// tokens on cache hits; Phase C reads prompt_eval_count from Ollama's API,
// which is the honest figure.
const PROMPT_EVAL = /prompt eval time\s*=\s*([\d.]+)\s*ms\s*\/\s*(\d+)\s*tokens/
const EVAL = /\beval time\s*=\s*([\d.]+)\s*ms\s*\/\s*(\d+)\s*tokens/
const TOTAL_TIME = /total time\s*=\s*([\d.]+)\s*ms\s*\/\s*(\d+)\s*tokens/

// slot operator(): ... new prompt, n_ctx_slot = 4096, n_keep = 4, ...
// This is where the 4,096-context defect announces itself.
const CTX_SLOT = /n_ctx_slot\s*=\s*(\d+)/

// slot release: ... stop processing: n_tokens = 191, truncated = 0
const RELEASE = /n_tokens\s*=\s*(\d+),\s*truncated\s*=\s*(\d+)/

// msg="llama-server started in 30.11 seconds"
const LOADED = /llama-server started in\s+([\d.]+)\s+seconds/

const BUSY_START = /launch_slot_|processing task|update_slots:.*prompt (processing|eval)/
const BUSY_END = /all slots are idle/

/** Endpoints that represent real inference work, as opposed to status polls. */
const WORK_ROUTES = new Set(['/api/generate', '/api/chat', '/v1/chat/completions'])

export interface OllamaLogEvents {
  event: [OffloadEvent]
  busy: [boolean]
  error: [Error]
}

/**
 * Tails Ollama's server.log. This is the only vantage point that sees every
 * inference the local Ollama serves, regardless of which client made it —
 * including LAN callers once Ollama is bound to 0.0.0.0 (WEYLD's Jetson).
 * The GIN line carries the caller IP, which is kept on the event so main can
 * attribute it to a tenant; it does NOT carry the model name, so that is
 * inferred upstream. Shim (Phase C) events remain the richer, authoritative
 * record for the calls fuel itself made.
 */
export class OllamaLogTailer extends EventEmitter<OllamaLogEvents> {
  private offset = 0
  private carry = ''
  private watcher: FSWatcher | null = null
  private poll: NodeJS.Timeout | null = null
  private reading = false

  /** Facts accumulated from llama-server lines, claimed by the next GIN line. */
  private pendingLoadNs: number | null = null
  private pendingPromptTokens: number | null = null
  private pendingPromptEvalNs: number | null = null
  private pendingEvalTokens: number | null = null
  private pendingEvalNs: number | null = null
  private pendingNumCtx: number | null = null
  private pendingTruncated = false
  private busy = false

  constructor(private readonly path: string = defaultLogPath()) {
    super()
  }

  start(): void {
    if (!existsSync(this.path)) {
      // Ollama may not have written a log yet; the poll below picks it up.
      this.offset = 0
    } else {
      // Skip history on first attach — we only care about live activity.
      this.offset = statSync(this.path).size
    }

    this.attachWatcher()
    // fs.watch is unreliable on Windows for append-only writes; poll as well.
    this.poll = setInterval(() => void this.drain(), 2000)
  }

  private attachWatcher(): void {
    try {
      this.watcher = watch(this.path, () => void this.drain())
    } catch {
      // File missing or locked — the interval poll covers us.
      this.watcher = null
    }
  }

  private async drain(): Promise<void> {
    if (this.reading) return
    if (!existsSync(this.path)) return
    this.reading = true

    try {
      const size = statSync(this.path).size

      // Rotation (server.log -> server-1.log) or truncation: restart at 0.
      if (size < this.offset) {
        this.offset = 0
        this.carry = ''
        if (!this.watcher) this.attachWatcher()
      }
      if (size === this.offset) return

      const chunk = await this.read(this.offset, size - 1)
      this.offset = size

      const text = this.carry + chunk
      const lines = text.split(/\r?\n/)
      this.carry = lines.pop() ?? ''
      for (const line of lines) this.handleLine(line)
    } catch (err) {
      this.emit('error', err as Error)
    } finally {
      this.reading = false
    }
  }

  private read(start: number, end: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const parts: Buffer[] = []
      createReadStream(this.path, { start, end })
        .on('data', (d) => parts.push(d as Buffer))
        .on('end', () => resolve(Buffer.concat(parts).toString('utf8')))
        .on('error', reject)
    })
  }

  private handleLine(line: string): void {
    if (!line) return

    const loaded = LOADED.exec(line)
    if (loaded) {
      this.pendingLoadNs = Number(loaded[1]) * 1e9
      return
    }

    const ctx = CTX_SLOT.exec(line)
    if (ctx) {
      this.pendingNumCtx = Number(ctx[1])
      return
    }

    // Order matters: "prompt eval time" also satisfies the EVAL pattern.
    const promptEval = PROMPT_EVAL.exec(line)
    if (promptEval) {
      this.pendingPromptEvalNs = Number(promptEval[1]) * 1e6
      this.pendingPromptTokens = Number(promptEval[2])
      return
    }

    const evalTime = EVAL.exec(line)
    if (evalTime) {
      this.pendingEvalNs = Number(evalTime[1]) * 1e6
      this.pendingEvalTokens = Number(evalTime[2])
      return
    }

    // total time carries no phase breakdown; the GIN line gives wall clock.
    if (TOTAL_TIME.test(line)) return

    const release = RELEASE.exec(line)
    if (release) {
      if (Number(release[2]) === 1) this.pendingTruncated = true
      return
    }

    if (BUSY_END.test(line)) {
      this.setBusy(false)
      return
    }
    if (BUSY_START.test(line)) {
      this.setBusy(true)
      return
    }

    const gin = GIN.exec(line)
    if (gin) this.handleRequest(gin)
  }

  private setBusy(next: boolean): void {
    if (this.busy === next) return
    this.busy = next
    this.emit('busy', next)
  }

  private handleRequest(m: RegExpExecArray): void {
    const status = Number(m[1])
    const route = m[5] ?? ''
    if (!WORK_ROUTES.has(route)) return

    const totalMs = parseGoDuration(m[2] ?? '')
    const totalNs = totalMs * 1e6
    const loadNs = this.pendingLoadNs
    const ended = Date.now()
    const clientIp = (m[3] ?? '').trim() || null

    const event: OffloadEvent = {
      startedAt: ended - Math.round(totalMs),
      endedAt: ended,
      source: 'log',
      // Tenant attribution and model inference happen in main, which owns the
      // registry and the current /api/ps view. This layer just keeps the facts.
      client: null,
      clientIp,
      sessionId: null,
      model: 'unknown',
      status: status >= 200 && status < 300 ? 'ok' : 'error',
      error: status >= 400 ? `HTTP ${status}` : null,
      promptTokens: this.pendingPromptTokens,
      evalTokens: this.pendingEvalTokens,
      promptEvalNs: this.pendingPromptEvalNs,
      evalNs: this.pendingEvalNs,
      loadNs,
      totalNs,
      numCtx: this.pendingNumCtx,
      truncated: this.pendingTruncated,
      coldStart: loadNs != null && loadNs > COLD_START_NS,
      taskSummary: null,
      outputHash: null,
      outcome: null,
    }

    this.pendingLoadNs = null
    this.pendingPromptTokens = null
    this.pendingPromptEvalNs = null
    this.pendingEvalTokens = null
    this.pendingEvalNs = null
    this.pendingNumCtx = null
    this.pendingTruncated = false
    this.setBusy(false)

    this.emit('event', event)
  }

  stop(): void {
    this.watcher?.close()
    this.watcher = null
    if (this.poll) clearInterval(this.poll)
    this.poll = null
  }
}
