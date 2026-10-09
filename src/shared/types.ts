/** Contracts shared across main, preload, and renderer. */

/**
 * A tenant is *who* a model or request belongs to. The GPU is a shared
 * resource: fuel's own coding helper is one tenant, WEYLD radio's DJ (calling
 * from the Jetson) is another, and anything unrecognised is shown as unknown
 * rather than silently merged. Resolved from `config/tenants.json` by caller
 * IP (for requests) and by model name (for residents).
 */
export interface Tenant {
  id: string
  label: string
}

/** One 1 Hz hardware + model-residency sample. */
export interface Sample {
  ts: number
  gpuUtil: number | null
  vramUsedMb: number | null
  vramTotalMb: number | null
  tempC: number | null
  powerW: number | null
  smClockMhz: number | null
  /** Every model resident at this instant — the GPU is multi-tenant. */
  residents: ResidentModel[]
}

/** One model currently resident in VRAM, from Ollama's /api/ps. */
export interface ResidentModel {
  name: string
  /** Bytes of this model actually in VRAM. */
  sizeVram: number
  /**
   * Total bytes the model occupies. When this exceeds `sizeVram`, the rest is
   * in system RAM and the model is running partly on the CPU — the single
   * worst state for the desktop (a 40 tok/s model becomes a 5 tok/s one that
   * pegs cores). Ollama does this silently when VRAM is short at load time.
   */
  sizeTotal: number
  contextLength: number | null
  expiresAt: number | null
  /** Who this model serves; null when no tenant rule matches. */
  tenant: Tenant | null
  /**
   * The keep-alive this model is actually getting, in seconds — observed, not
   * configured: every request pushes `expiresAt` forward by exactly the
   * keep-alive in force (client value, else OLLAMA_KEEP_ALIVE, else 5 min).
   * Null until a request has been seen while resident.
   */
  keepAliveSec: number | null
}

/**
 * A model left VRAM before its own keep-alive deadline. That is contention:
 * another model needed the room. Self-timeouts (leaving at `expiresAt`) are
 * NOT evictions — they cost a cheap reload; evictions are what freeze the box.
 */
export interface EvictionEvent {
  id?: number
  ts: number
  model: string
  tenant: Tenant | null
  sizeVram: number
  /** How early it left, ms before its keep-alive would have expired. */
  earlyByMs: number
  /** The model that took its place, if one loaded around the same time. */
  evictedBy: string | null
  evictedByTenant: Tenant | null
}

/** GPU telemetry, from nvidia-smi. */
export interface GpuStats {
  name: string
  utilGpu: number
  utilMem: number
  memUsedMb: number
  memTotalMb: number
  tempC: number
  powerW: number
  powerLimitW: number
  smClockMhz: number
}

/** One offload attempt. M1 populates these from the Ollama log only. */
export interface OffloadEvent {
  id?: number
  startedAt: number
  endedAt: number | null
  source: 'mcp' | 'proxy' | 'log'
  /**
   * Who asked. Shim events carry the client name they were configured with
   * ('claude-code', 'claude-desktop'); log events carry the tenant id resolved
   * from the caller IP ('weyld-dj'), or null when no rule matches.
   */
  client: string | null
  /** Caller IP as Ollama logged it. Log events only; the shim doesn't know it. */
  clientIp: string | null
  sessionId: string | null
  /**
   * Model name. Authoritative from the shim; for log events it is inferred
   * (tenant's declared model, else the sole resident) and 'unknown' otherwise.
   */
  model: string
  status: 'running' | 'ok' | 'error' | 'timeout'
  error: string | null
  promptTokens: number | null
  evalTokens: number | null
  promptEvalNs: number | null
  evalNs: number | null
  loadNs: number | null
  totalNs: number | null
  numCtx: number | null
  truncated: boolean
  coldStart: boolean
  taskSummary: string | null
  outputHash: string | null
  outcome: 'accepted' | 'edited' | 'discarded' | null
}

/** Rolled-up totals for a single local day. */
export interface DailyTotals {
  day: string
  tasks: number
  evalTokens: number
  promptTokens: number
  gpuSeconds: number
  coldStarts: number
  truncations: number
}

/**
 * Today's work and its avoided-spend estimate for one tenant. `tenant` is
 * null for the unattributed bucket (events recorded before attribution
 * existed, or callers no tenant rule matches). `rateModel` names the Claude
 * model the estimate is priced against, or null when the tenant has no honest
 * Claude counterfactual (then `usd` is 0 by construction).
 */
export interface TenantTotals {
  tenant: Tenant | null
  tasks: number
  promptTokens: number
  evalTokens: number
  usd: number
  rateModel: string | null
}

export type OllamaStatus = 'online' | 'offline'

export type HudPhase =
  | 'offline'
  | 'idle-evicted'
  | 'idle-resident'
  | 'warming'
  | 'generating'

/** The single snapshot pushed to the renderer on every tick. */
export interface HudState {
  ts: number
  phase: HudPhase
  ollama: OllamaStatus
  gpu: GpuStats | null
  /** Every model in VRAM right now, with its tenant. Empty when idle. */
  residents: ResidentModel[]
  /** Contention events today — a resident forced out early by another load. */
  evictionsToday: number
  today: DailyTotals
  /**
   * Estimated Claude API dollars preserved today — the sum of `byTenant`, each
   * priced at its own counterfactual model, so it is not one blended rate.
   */
  usdToday: number
  /** Today's totals per tenant, largest first; the unattributed bucket last. */
  byTenant: TenantTotals[]
  /** Rolling GPU-utilisation history for the sparkline, oldest first. */
  utilHistory: number[]
  /** Live generation throughput, tokens/sec; null when not generating. */
  tokPerSec: number | null
  /** True when any recent event reported truncated=1. */
  truncationWarning: boolean
  /** Daily budget target the centre ring fills toward, in USD. */
  goalUsd: number
  /** Delegatable work Claude did inline today (missed opportunities). */
  unburnedToday: number
  /** Whether nudges are surfaced, recorded silently, or off. */
  nudgeMode: NudgeMode
  /**
   * Your own offloads in flight (shim /activity beacons), not the whole card:
   * 'loading' while the coder model isn't resident yet (cold start),
   * 'working' once it is. Drives the mini pill's meter.
   */
  offload: OffloadState
}

export type OffloadState = 'idle' | 'loading' | 'working'

/** One row in the expanded panel's recent-task list. */
export interface RecentEvent {
  startedAt: number
  status: string
  /** Tenant/client label for the row, so DJ picks and coder calls read apart. */
  who: string | null
  model: string
  promptTokens: number | null
  evalTokens: number | null
  tokPerSec: number | null
  coldStart: boolean
  truncated: boolean
  numCtx: number | null
}

/** Persisted user preferences. */
export interface Settings {
  clickThrough: boolean
  openAtLogin: boolean
  goalUsd: number
}

/** A Claude Code tool action, forwarded by the PostToolUse hook. */
export interface HookEvent {
  ts: number
  sessionId: string | null
  cwd: string | null
  tool: string
  filePath: string | null
  oldString: string | null
  newString: string | null
  content: string | null
  contentHash: string | null
  taskText: string | null
  outputHash: string | null
}

/** A detected-but-not-taken delegation opportunity ("unburned fuel"). */
export interface Nudge {
  id?: number
  ts: number
  sessionId: string | null
  score: number
  signals: string[]
  tool: string | null
  fileHint: string | null
  estTokens: number | null
  dismissed: boolean
}

/** How nudges surface. Shadow records without showing, to calibrate first. */
export type NudgeMode = 'shadow' | 'live' | 'off'

/** One toll-booth routing decision, persisted for audit + the catch-rate tile. */
export interface ReceiptRecord {
  id?: number
  ts: number
  sessionId: string | null
  tool: string | null
  fileHint: string | null
  route: 'local' | 'cloud' | 'gray'
  score: number
  confidence: number
  reasons: string[]
  signals: unknown
  outcome: string | null
}

/** Today's routing tally — feeds the "free-lane rate on eligible work" tile. */
export interface CatchStats {
  local: number
  cloud: number
  gray: number
  offloaded: number
}
