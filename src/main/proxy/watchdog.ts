import { PROXY_FAIL_THRESHOLD, PROXY_HEALTH_MS, UPSTREAM_URL } from '@shared/constants'

/** A single upstream liveness probe. Default hits Ollama's /api/version. */
async function defaultProbe(timeoutMs = 2000): Promise<boolean> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${UPSTREAM_URL}/api/version`, { signal: ctrl.signal })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Supervises the valve's upstream (SPEC §4.3 mitigation #3). Probes every few
 * seconds; after `threshold` consecutive misses it flips the valve into bypass
 * — a zero-parsing byte pipe — so a wedged or slow upstream can never be made
 * worse by fuel's rewrite path. A single successful probe clears bypass and
 * resets the counter, so recovery is automatic and needs no GUI.
 *
 * Timers and the probe are injectable so the state machine can be unit-tested
 * without real time or sockets.
 */
export class Watchdog {
  private timer: unknown = null
  private failures = 0
  private bypassed = false

  constructor(
    private readonly onBypassChange: (bypassed: boolean) => void,
    private readonly probe: () => Promise<boolean> = () => defaultProbe(),
    private readonly intervalMs: number = PROXY_HEALTH_MS,
    private readonly threshold: number = PROXY_FAIL_THRESHOLD,
    private readonly setTimer: (fn: () => void, ms: number) => unknown = (fn, ms) =>
      setInterval(fn, ms),
    private readonly clearTimer: (t: unknown) => void = (t) =>
      clearInterval(t as ReturnType<typeof setInterval>),
  ) {}

  start(): void {
    if (this.timer != null) return
    this.timer = this.setTimer(() => void this.check(), this.intervalMs)
  }

  stop(): void {
    if (this.timer != null) this.clearTimer(this.timer)
    this.timer = null
  }

  isBypassed(): boolean {
    return this.bypassed
  }

  /** One probe cycle. Exposed so tests can drive it deterministically. */
  async check(): Promise<void> {
    const ok = await this.probe()
    if (ok) this.recordOk()
    else this.recordFail()
  }

  private recordFail(): void {
    this.failures++
    if (this.failures >= this.threshold && !this.bypassed) this.setBypass(true)
  }

  private recordOk(): void {
    this.failures = 0
    if (this.bypassed) this.setBypass(false)
  }

  private setBypass(next: boolean): void {
    this.bypassed = next
    this.onBypassChange(next)
  }
}
