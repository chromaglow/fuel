import { execFile } from 'node:child_process'
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

const ARGS = [`--query-gpu=${FIELDS}`, '--format=csv,noheader,nounits']

function num(v: string | undefined): number {
  const n = Number(String(v ?? '').trim())
  return Number.isFinite(n) ? n : 0
}

/**
 * Read GPU telemetry. Resolves null when nvidia-smi is missing, errors, or
 * reports no GPU — the HUD degrades to "offline" rather than throwing.
 */
export function readGpu(timeoutMs = 4000): Promise<GpuStats | null> {
  return new Promise((resolve) => {
    execFile('nvidia-smi', ARGS, { timeout: timeoutMs }, (err, stdout) => {
      if (err || !stdout) return resolve(null)

      // Multi-GPU hosts emit one row per device; the first is our target.
      const line = stdout.split('\n').find((l) => l.trim().length > 0)
      if (!line) return resolve(null)

      const c = line.split(',').map((s) => s.trim())
      if (c.length < 9) return resolve(null)

      resolve({
        name: c[0] ?? 'GPU',
        utilGpu: num(c[1]),
        utilMem: num(c[2]),
        memUsedMb: num(c[3]),
        memTotalMb: num(c[4]),
        tempC: num(c[5]),
        powerW: num(c[6]),
        powerLimitW: num(c[7]),
        smClockMhz: num(c[8]),
      })
    })
  })
}
