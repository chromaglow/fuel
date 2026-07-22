import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { DailyTotals, OffloadEvent, Sample } from '@shared/types'
import { SAMPLE_RETENTION_DAYS } from '@shared/constants'

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

CREATE TABLE IF NOT EXISTS events (
  id                INTEGER PRIMARY KEY,
  started_at        INTEGER NOT NULL,
  ended_at          INTEGER,
  source            TEXT NOT NULL,
  client            TEXT,
  session_id        TEXT,
  model             TEXT NOT NULL,
  status            TEXT NOT NULL,
  error             TEXT,
  prompt_tokens     INTEGER,
  eval_tokens       INTEGER,
  prompt_eval_ns    INTEGER,
  eval_ns           INTEGER,
  load_ns           INTEGER,
  total_ns          INTEGER,
  num_ctx           INTEGER,
  truncated         INTEGER DEFAULT 0,
  cold_start        INTEGER DEFAULT 0,
  task_summary      TEXT,
  output_hash       TEXT,
  outcome           TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_started ON events(started_at);

CREATE TABLE IF NOT EXISTS samples (
  ts                INTEGER PRIMARY KEY,
  gpu_util          INTEGER,
  vram_used_mb      INTEGER,
  vram_total_mb     INTEGER,
  temp_c            INTEGER,
  power_w           REAL,
  sm_clock_mhz      INTEGER,
  model_resident    TEXT,
  model_vram_bytes  INTEGER,
  evict_at          INTEGER
);

CREATE TABLE IF NOT EXISTS nudges (
  id                INTEGER PRIMARY KEY,
  ts                INTEGER NOT NULL,
  session_id        TEXT,
  score             INTEGER NOT NULL,
  signals           TEXT NOT NULL,
  tool              TEXT,
  file_hint         TEXT,
  est_tokens        INTEGER,
  dismissed         INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_nudges_ts ON nudges(ts);

CREATE TABLE IF NOT EXISTS meta (
  key               TEXT PRIMARY KEY,
  value             TEXT NOT NULL
);
`

/** Local-day key, so "today" means the user's midnight, not UTC's. */
export function localDay(ts: number = Date.now()): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfLocalDay(ts: number = Date.now()): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export class Store {
  private db: DatabaseSync

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true })
    this.db = new DatabaseSync(path)
    this.db.exec(SCHEMA)
    this.prune()
  }

  /** Drop raw samples past the retention horizon. Events are kept forever. */
  private prune(): void {
    const cutoff = Date.now() - SAMPLE_RETENTION_DAYS * 86_400_000
    this.db.prepare('DELETE FROM samples WHERE ts < ?').run(cutoff)
  }

  insertSample(s: Sample): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO samples
         (ts, gpu_util, vram_used_mb, vram_total_mb, temp_c, power_w,
          sm_clock_mhz, model_resident, model_vram_bytes, evict_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        s.ts,
        s.gpuUtil,
        s.vramUsedMb,
        s.vramTotalMb,
        s.tempC,
        s.powerW,
        s.smClockMhz,
        s.modelResident,
        s.modelVramBytes,
        s.evictAt,
      )
  }

  insertEvent(e: OffloadEvent): number {
    const r = this.db
      .prepare(
        `INSERT INTO events
         (started_at, ended_at, source, client, session_id, model, status, error,
          prompt_tokens, eval_tokens, prompt_eval_ns, eval_ns, load_ns, total_ns,
          num_ctx, truncated, cold_start, task_summary, output_hash, outcome)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        e.startedAt,
        e.endedAt,
        e.source,
        e.client,
        e.sessionId,
        e.model,
        e.status,
        e.error,
        e.promptTokens,
        e.evalTokens,
        e.promptEvalNs,
        e.evalNs,
        e.loadNs,
        e.totalNs,
        e.numCtx,
        e.truncated ? 1 : 0,
        e.coldStart ? 1 : 0,
        e.taskSummary,
        e.outputHash,
        e.outcome,
      )
    return Number(r.lastInsertRowid)
  }

  /** Aggregate today's events on demand. Cheap: events are low-cardinality. */
  todayTotals(): DailyTotals {
    const from = startOfLocalDay()
    const row = this.db
      .prepare(
        `SELECT
           COUNT(*)                                   AS tasks,
           COALESCE(SUM(eval_tokens), 0)              AS evalTokens,
           COALESCE(SUM(prompt_tokens), 0)            AS promptTokens,
           COALESCE(SUM(total_ns - COALESCE(load_ns, 0)), 0) AS busyNs,
           COALESCE(SUM(cold_start), 0)               AS coldStarts,
           COALESCE(SUM(truncated), 0)                AS truncations
         FROM events
         WHERE started_at >= ? AND status = 'ok'`,
      )
      .get(from) as Record<string, number> | undefined

    return {
      day: localDay(),
      tasks: Number(row?.tasks ?? 0),
      evalTokens: Number(row?.evalTokens ?? 0),
      promptTokens: Number(row?.promptTokens ?? 0),
      gpuSeconds: Number(row?.busyNs ?? 0) / 1e9,
      coldStarts: Number(row?.coldStarts ?? 0),
      truncations: Number(row?.truncations ?? 0),
    }
  }

  /** Recent GPU-utilisation samples, oldest first — seeds the sparkline on launch. */
  recentUtil(limit: number): number[] {
    const rows = this.db
      .prepare(
        `SELECT gpu_util FROM samples
         WHERE gpu_util IS NOT NULL
         ORDER BY ts DESC LIMIT ?`,
      )
      .all(limit) as Array<Record<string, number>>
    return rows.map((r) => Number(r.gpu_util)).reverse()
  }

  /** True if any event in the last 24 h reported a truncated context. */
  recentTruncation(): boolean {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS n FROM events
         WHERE truncated = 1 AND started_at >= ?`,
      )
      .get(Date.now() - 86_400_000) as Record<string, number> | undefined
    return Number(row?.n ?? 0) > 0
  }

  getMeta(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as
      | Record<string, string>
      | undefined
    return row ? String(row.value) : null
  }

  setMeta(key: string, value: string): void {
    this.db
      .prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)')
      .run(key, value)
  }

  close(): void {
    this.db.close()
  }
}
