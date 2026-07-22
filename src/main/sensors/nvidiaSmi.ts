import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import type { GpuStats } from '@shared/types'

const FIELDS = [
  'name',
  'utilization.gpu',
  'utilization.memory',
  'memory.used',
  'memory.total',
  'temperature.gpu',
  'power.draw',
  'power.limit',
  'clocks.sm',
].join(',')

const BASE_ARGS = [`--query-gpu=${FIELDS}`, '--format=csv,noheader,nounits']

function num(v: string | undefined): number {
  const n = Number(String(v ?? '').trim())
  return Number.isFinite(n) ? n : 0
}

function parseLine(line: string): GpuStats | null {
  const c = line.split(',').map((s) => s.trim())
  if (c.length < 9) return null
  return {
    name: c[0] ?? 'GPU',
    utilGpu: num(c[1]),
    utilMem: num(c[2]),
    memUsedMb: num(c[3]),
    memTotalMb: num(c[4]),
    tempC: num(c[5]),
    powerW: num(c[6]),
    powerLimitW: num(c[7]),
    smClockMhz: num(c[8]),
  }
}

/**
 * One-shot read. Used by scripts and as a fallback; the app itself uses
 * GpuMonitor, because spawning a process every second is expensive.
 */
export function readGpu(timeoutMs = 4000): Promise<GpuStats | null> {
  return new Promise((resolve) => {
    execFile('nvidia-smi', BASE_ARGS, { timeout: timeoutMs }, (err, stdout) => {
      if (err || !stdout) return resolve(null)
      const line = stdout.split('\n').find((l) => l.trim().length > 0)
      resolve(line ? parseLine(line) : null)
    })
  })
}

/**
 * Long-lived `nvidia-smi -l` process that emits one CSV row per interval.
 *
 * Spawning nvidia-smi once per second cost ~11% of a core — process creation
 * dominated, not the query. Loop mode pays that cost once and then just parses
 * stdout, which is what keeps the HUD's idle footprint negligible.
 */
export class GpuMonitor {
  private child: ChildProcessWithoutNullStreams | null = null
  private carry = ''
  private stats: GpuStats | null = null
  private restart: NodeJS.Timeout | null = null
  private stopped = false

  constructor(private readonly intervalSec = 1) {}

  start(): void {
    this.stopped = false
    this.spawn()
  }

  private spawn(): void {
    if (this.stopped) return
    try {
      this.child = spawn(
        'nvidia-smi',
        [...BASE_ARGS, `--loop=${this.intervalSec}`],
        { windowsHide: true },
      )
    } catch {
      this.scheduleRestart()
      return
    }

    this.child.stdout.setEncoding('utf8')
    this.child.stdout.on('data', (chunk: string) => {
      const text = this.carry + chunk
      const lines = text.split(/\r?\n/)
      this.carry = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        const parsed = parseLine(line)
        if (parsed) this.stats = parsed
      }
    })

    // No GPU, driver hiccup, or nvidia-smi missing: drop to null and retry.
    this.child.on('error', () => {
      this.stats = null
      this.scheduleRestart()
    })
    this.child.on('exit', () => {
      this.child = null
      this.scheduleRestart()
    })
  }

  private scheduleRestart(): void {
    if (this.stopped || this.restart) return
    this.restart = setTimeout(() => {
      this.restart = null
      this.spawn()
    }, 5000)
  }

  /** Most recent reading, or null if nvidia-smi is unavailable. */
  latest(): GpuStats | null {
    return this.stats
  }

  stop(): void {
    this.stopped = true
    if (this.restart) clearTimeout(this.restart)
    this.restart = null
    this.child?.kill()
    this.child = null
  }
}
