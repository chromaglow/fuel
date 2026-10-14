import { execFile } from 'node:child_process'

/**
 * Kills the busiest llama-server runner that belongs to the live ollama.exe —
 * the one doing the runaway generation. Only Ollama's own children are
 * candidates (orphans are a different problem, see HANDOFF), and a runner must
 * be measurably busy on the GPU: if none is, the log was stale and nothing is
 * killed. GPU use per process comes from Windows' "GPU Engine" counters,
 * summed across engines.
 */
const SCRIPT = [
  "$ErrorActionPreference = 'Stop'",
  "$o = @(Get-CimInstance Win32_Process -Filter \"Name='ollama.exe'\" | ForEach-Object { [int]$_.ProcessId })",
  "$r = @(Get-CimInstance Win32_Process -Filter \"Name='llama-server.exe'\" | Where-Object { $o -contains [int]$_.ParentProcessId })",
  'if ($r.Count -eq 0) { return }',
  '$u = @{}',
  "(Get-Counter '\\GPU Engine(*)\\Utilization Percentage').CounterSamples | ForEach-Object {",
  "  if ($_.InstanceName -match '^pid_(\\d+)_') { $p = [int]$Matches[1]; $u[$p] = [double]$u[$p] + $_.CookedValue }",
  '}',
  '$t = $r | Sort-Object { -[double]$u[[int]$_.ProcessId] } | Select-Object -First 1',
  '$busy = [math]::Round([double]$u[[int]$t.ProcessId])',
  'if ($busy -lt MIN_UTIL) { "skip $($t.ProcessId) $busy"; return }',
  'Stop-Process -Id $t.ProcessId -Force',
  '"killed $($t.ProcessId) $busy"',
].join('\n')

export interface KillResult {
  action: 'killed' | 'skip' | 'none'
  pid: number | null
  /** The runner's GPU utilization (%) at the moment of the decision. */
  util: number | null
}

/** Parses the script's one-line verdict. Exported for tests. */
export function parseKillOutput(stdout: string): KillResult {
  const m = /^(killed|skip)\s+(\d+)\s+(\d+)/m.exec(stdout.trim())
  if (!m) return { action: 'none', pid: null, util: null }
  return { action: m[1] as 'killed' | 'skip', pid: Number(m[2]), util: Number(m[3]) }
}

export function killBusiestRunner(minUtil: number, timeoutMs = 15_000): Promise<KillResult> {
  const script = SCRIPT.replace('MIN_UTIL', String(Math.max(0, Math.round(minUtil))))
  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { timeout: timeoutMs, windowsHide: true },
      (err, stdout) => (err ? reject(err) : resolve(parseKillOutput(String(stdout)))),
    )
  })
}
