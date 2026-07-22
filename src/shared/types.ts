/** Contracts shared across main, preload, and renderer. */

/** One 1 Hz hardware + model-residency sample. */
export interface Sample {
  ts: number
  gpuUtil: number | null
  vramUsedMb: number | null
  vramTotalMb: number | null
  tempC: number | null
  powerW: number | null
  smClockMhz: number | null
  modelResident: string | null
  modelVramBytes: number | null
  evictAt: number | null
}

/** Live model-residency state, from Ollama's /api/ps. */
export interface ResidentModel {
  name: string
  sizeVram: number
  contextLength: number | null
  expiresAt: number | null
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
  client: string | null
  sessionId: string | null
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
  resident: ResidentModel | null
  /** Seconds until the resident model is evicted; null when not resident. */
  evictInSec: number | null
  today: DailyTotals
  /** Estimated Claude API dollars preserved today. */
  usdToday: number
  /** Rolling GPU-utilisation history for the sparkline, oldest first. */
  utilHistory: number[]
  /** Live generation throughput, tokens/sec; null when not generating. */
  tokPerSec: number | null
  /** True when any recent event reported truncated=1. */
  truncationWarning: boolean
  /** Effective context length of the resident model, if known. */
  contextLength: number | null
  /** Daily budget target the centre ring fills toward, in USD. */
  goalUsd: number
}

/** One row in the expanded panel's recent-task list. */
export interface RecentEvent {
  startedAt: number
  status: string
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
