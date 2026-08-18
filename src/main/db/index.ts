import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type {
  CatchStats,
  DailyTotals,
  EvictionEvent,
  Nudge,
  OffloadEvent,
  ReceiptRecord,
  ResidentModel,
  Sample,
  Tenant,
} from '@shared/types'
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
  client_ip         TEXT,
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
  evict_at          INTEGER,
  residents         TEXT
);

CREATE TABLE IF NOT EXISTS evictions (
  id                INTEGER PRIMARY KEY,
  ts                INTEGER NOT NULL,
  model             TEXT NOT NULL,
  tenant            TEXT,
  size_vram         INTEGER NOT NULL,
  early_by_ms       INTEGER NOT NULL,
  evicted_by        TEXT,
  evicted_by_tenant TEXT
);
CREATE INDEX IF NOT EXISTS idx_evictions_ts ON evictions(ts);

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

CREATE TABLE IF NOT EXISTS receipts (
  id                INTEGER PRIMARY KEY,
  ts                INTEGER NOT NULL,
  session_id        TEXT,
  tool              TEXT,
  file_hint         TEXT,
  route             TEXT NOT NULL,
  score             REAL NOT NULL,
  confidence        REAL NOT NULL,
  reasons           TEXT NOT NULL,
  signals           TEXT NOT NULL,
  outcome           TEXT
);
CREATE INDEX IF NOT EXISTS idx_receipts_ts ON receipts(ts);

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

function safeParseSignals(raw: number | string | null): string[] {
  if (typeof raw !== 'string') return []
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

function safeParseJson<T>(raw: number | string | null, fallback: T): T {
  if (typeof raw !== 'string') return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** What a sample keeps per resident: enough to replay the VRAM bar later. */
function compactResidents(rs: ResidentModel[]): Array<[string, number, string | null]> {
  return rs.map((r) => [r.name, r.sizeVram, r.tenant?.id ?? null])
}

function tenantJson(t: Tenant | null): string | null {
  return t ? JSON.stringify(t) : null
}

function parseTenant(raw: number | string | null): Tenant | null {
  const t = safeParseJson<Partial<Tenant> | null>(raw, null)
  return t && typeof t.id === 'string' && typeof t.label === 'string'
    ? { id: t.id, label: t.label }
    : null
}

export class Store {
  private db: DatabaseSync

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true })
    this.db = new DatabaseSync(path)
    this.db.exec(SCHEMA)
    this.migrate()
    this.prune()
  }

  /**
   * Additive migrations for databases created before a column existed.
   * CREATE TABLE IF NOT EXISTS leaves an existing table untouched, so new
   * columns have to be added explicitly; SQLite has no ADD COLUMN IF NOT
   * EXISTS, hence the probe.
   */
  private migrate(): void {
    const addColumn = (table: string, col: string, decl: string): void => {
      const cols = this.db.prepare(`PRAGMA table_info(${table})`).all() as Array<
        Record<string, unknown>
      >
      if (cols.some((c) => c['name'] === col)) return
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${decl}`)
    }
    // Multi-tenant residency (2026-08-18): the singular model_resident /
    // model_vram_bytes / evict_at columns are retained for old rows but no
    // longer written; every resident now lands in the JSON column.
    addColumn('samples', 'residents', 'TEXT')
    addColumn('events', 'client_ip', 'TEXT')
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
          sm_clock_mhz, residents)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        s.ts,
        s.gpuUtil,
        s.vramUsedMb,
        s.vramTotalMb,
        s.tempC,
        s.powerW,
        s.smClockMhz,
        JSON.stringify(compactResidents(s.residents)),
      )
  }

  insertEvent(e: OffloadEvent): number {
    const r = this.db
      .prepare(
        `INSERT INTO events
         (started_at, ended_at, source, client, client_ip, session_id, model, status, error,
          prompt_tokens, eval_tokens, prompt_eval_ns, eval_ns, load_ns, total_ns,
          num_ctx, truncated, cold_start, task_summary, output_hash, outcome)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        e.startedAt,
        e.endedAt,
        e.source,
        e.client,
        e.clientIp,
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

  /**
   * ended_at of the latest successful delegation — anchors the enforce gate's
   * grace window.
   *
   * Must count ONLY attributed (source='mcp') events. The log tailer harvests
   * every inference the local Ollama serves, including LAN traffic from other
   * machines that has nothing to do with a delegation. Counting those keeps the
   * grace window permanently open — a box serving even one background call a
   * minute silently degrades 'enforce' to 'allow' forever.
   */
  lastOkDelegationAt(): number | null {
    const row = this.db
      .prepare(`SELECT MAX(ended_at) AS t FROM events WHERE status = 'ok' AND source = 'mcp'`)
      .get() as Record<string, number | null> | undefined
    return row?.t == null ? null : Number(row.t)
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

  /** Record one contention event (a resident forced out before its deadline). */
  insertEviction(e: EvictionEvent): number {
    const r = this.db
      .prepare(
        `INSERT INTO evictions
         (ts, model, tenant, size_vram, early_by_ms, evicted_by, evicted_by_tenant)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        e.ts,
        e.model,
        tenantJson(e.tenant),
        e.sizeVram,
        e.earlyByMs,
        e.evictedBy,
        tenantJson(e.evictedByTenant),
      )
    return Number(r.lastInsertRowid)
  }

  /** Contention events today (local day) — the number the VRAM budget exists to drive to zero. */
  todayEvictionCount(): number {
    const from = startOfLocalDay()
    const row = this.db
      .prepare('SELECT COUNT(*) AS n FROM evictions WHERE ts >= ?')
      .get(from) as Record<string, number> | undefined
    return Number(row?.n ?? 0)
  }

  /** Recent evictions, newest first — the panel's contention log. */
  recentEvictions(limit: number): EvictionEvent[] {
    const rows = this.db
      .prepare(
        `SELECT id, ts, model, tenant, size_vram, early_by_ms, evicted_by, evicted_by_tenant
         FROM evictions ORDER BY ts DESC LIMIT ?`,
      )
      .all(limit) as Array<Record<string, number | string | null>>
    return rows.map((r) => ({
      id: Number(r.id),
      ts: Number(r.ts),
      model: String(r.model),
      tenant: parseTenant(r.tenant),
      sizeVram: Number(r.size_vram),
      earlyByMs: Number(r.early_by_ms),
      evictedBy: r.evicted_by != null ? String(r.evicted_by) : null,
      evictedByTenant: parseTenant(r.evicted_by_tenant),
    }))
  }

  /**
   * Today's successful work grouped by originator. `client` holds a tenant id
   * for log events and a shim client name ('claude-code', 'claude-desktop')
   * for attributed offloads; NULL is the unattributed bucket. Pricing and
   * labelling happen in main, which owns the registries.
   */
  todayTotalsByClient(): Array<{
    client: string | null
    tasks: number
    promptTokens: number
    evalTokens: number
  }> {
    const from = startOfLocalDay()
    const rows = this.db
      .prepare(
        `SELECT client,
                COUNT(*)                        AS tasks,
                COALESCE(SUM(prompt_tokens), 0) AS promptTokens,
                COALESCE(SUM(eval_tokens), 0)   AS evalTokens
         FROM events
         WHERE started_at >= ? AND status = 'ok'
         GROUP BY client`,
      )
      .all(from) as Array<Record<string, number | string | null>>
    return rows.map((r) => ({
      client: r.client != null ? String(r.client) : null,
      tasks: Number(r.tasks ?? 0),
      promptTokens: Number(r.promptTokens ?? 0),
      evalTokens: Number(r.evalTokens ?? 0),
    }))
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

  insertNudge(nudge: Nudge): number {
    const r = this.db
      .prepare(
        `INSERT INTO nudges (ts, session_id, score, signals, tool, file_hint, est_tokens, dismissed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        nudge.ts,
        nudge.sessionId,
        nudge.score,
        JSON.stringify(nudge.signals),
        nudge.tool,
        nudge.fileHint,
        nudge.estTokens,
        nudge.dismissed ? 1 : 0,
      )
    return Number(r.lastInsertRowid)
  }

  /** Count of non-dismissed nudges recorded today (local day). */
  todayNudgeCount(): number {
    const from = startOfLocalDay()
    const row = this.db
      .prepare('SELECT COUNT(*) AS n FROM nudges WHERE ts >= ? AND dismissed = 0')
      .get(from) as Record<string, number> | undefined
    return Number(row?.n ?? 0)
  }

  /** Recent nudges, newest first — feeds the expanded panel during calibration. */
  recentNudges(limit: number): Nudge[] {
    const rows = this.db
      .prepare(
        `SELECT id, ts, session_id, score, signals, tool, file_hint, est_tokens, dismissed
         FROM nudges ORDER BY ts DESC LIMIT ?`,
      )
      .all(limit) as Array<Record<string, number | string | null>>
    return rows.map((r) => ({
      id: Number(r.id),
      ts: Number(r.ts),
      sessionId: r.session_id != null ? String(r.session_id) : null,
      score: Number(r.score),
      signals: safeParseSignals(r.signals),
      tool: r.tool != null ? String(r.tool) : null,
      fileHint: r.file_hint != null ? String(r.file_hint) : null,
      estTokens: r.est_tokens != null ? Number(r.est_tokens) : null,
      dismissed: Number(r.dismissed) === 1,
    }))
  }

  /** Persist one toll-booth decision. Returns the new row id. */
  insertReceipt(r: ReceiptRecord): number {
    const res = this.db
      .prepare(
        `INSERT INTO receipts
         (ts, session_id, tool, file_hint, route, score, confidence, reasons, signals, outcome)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        r.ts,
        r.sessionId,
        r.tool,
        r.fileHint,
        r.route,
        r.score,
        r.confidence,
        JSON.stringify(r.reasons),
        JSON.stringify(r.signals),
        r.outcome,
      )
    return Number(res.lastInsertRowid)
  }

  /** Recent routing decisions, newest first — feeds the HUD decision feed. */
  recentReceipts(limit: number): ReceiptRecord[] {
    const rows = this.db
      .prepare(
        `SELECT id, ts, session_id, tool, file_hint, route, score, confidence, reasons, signals, outcome
         FROM receipts ORDER BY ts DESC LIMIT ?`,
      )
      .all(limit) as Array<Record<string, number | string | null>>
    return rows.map((r) => ({
      id: Number(r.id),
      ts: Number(r.ts),
      sessionId: r.session_id != null ? String(r.session_id) : null,
      tool: r.tool != null ? String(r.tool) : null,
      fileHint: r.file_hint != null ? String(r.file_hint) : null,
      route: String(r.route) as ReceiptRecord['route'],
      score: Number(r.score),
      confidence: Number(r.confidence),
      reasons: safeParseSignals(r.reasons),
      signals: safeParseJson<unknown>(r.signals, null),
      outcome: r.outcome != null ? String(r.outcome) : null,
    }))
  }

  /** Today's routing tally (local day) — the catch-rate tile. */
  todayCatchStats(): CatchStats {
    const from = startOfLocalDay()
    const row = this.db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN route = 'local'      THEN 1 ELSE 0 END), 0) AS local,
           COALESCE(SUM(CASE WHEN route = 'cloud'      THEN 1 ELSE 0 END), 0) AS cloud,
           COALESCE(SUM(CASE WHEN route = 'gray'       THEN 1 ELSE 0 END), 0) AS gray,
           COALESCE(SUM(CASE WHEN outcome = 'offloaded' THEN 1 ELSE 0 END), 0) AS offloaded
         FROM receipts WHERE ts >= ?`,
      )
      .get(from) as Record<string, number> | undefined
    return {
      local: Number(row?.local ?? 0),
      cloud: Number(row?.cloud ?? 0),
      gray: Number(row?.gray ?? 0),
      offloaded: Number(row?.offloaded ?? 0),
    }
  }

  /** Most recent tasks, newest first — feeds the expanded panel's list. */
  recentEvents(limit: number): Array<Record<string, number | string | null>> {
    return this.db
      .prepare(
        `SELECT started_at, status, client, model, prompt_tokens, eval_tokens, eval_ns,
                cold_start, truncated, num_ctx
         FROM events ORDER BY started_at DESC LIMIT ?`,
      )
      .all(limit) as Array<Record<string, number | string | null>>
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
