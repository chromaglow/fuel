import { readFileSync, existsSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import type { OffloadEvent } from '@shared/types'
import { _toEvent } from './server.js'

/**
 * Durability backstop. When the collector isn't running, the MCP shim appends
 * its telemetry line to spool.jsonl instead of dropping it. fuel drains the
 * spool on next launch so offloads that happened while it was closed still
 * land on the gauge.
 *
 * The shim writes the same JSON shape it would POST, one object per line.
 */
export function drainSpool(dataDir: string, onEvent: (e: OffloadEvent) => void): number {
  const path = join(dataDir, 'spool.jsonl')
  if (!existsSync(path)) return 0

  let count = 0
  try {
    const text = readFileSync(path, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const event = _toEvent(JSON.parse(trimmed))
        if (event) {
          onEvent(event)
          count++
        }
      } catch {
        // Skip a corrupt line rather than abort the whole drain.
      }
    }
    // Consume the spool so events aren't replayed on the next launch.
    unlinkSync(path)
  } catch {
    // Unreadable spool: leave it for a later attempt.
  }
  return count
}
