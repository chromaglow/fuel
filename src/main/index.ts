import { app, BrowserWindow, globalShortcut, ipcMain, type Tray } from 'electron'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import type {
  CatchStats,
  EvictionEvent,
  HudPhase,
  HudState,
  Nudge,
  NudgeMode,
  OffloadEvent,
  RecentEvent,
  ReceiptRecord,
  ResidentModel,
  Sample,
  Tenant,
  TenantTotals,
} from '@shared/types'
import {
  DEFAULT_DAILY_GOAL_USD,
  POLL_GPU_MS,
  POLL_TAGS_MS,
  RECENT_EVENT_LIMIT,
  UTIL_HISTORY_LEN,
} from '@shared/constants'
import { Store } from './db/index.js'
import {
  createHudWindow,
  isCursorOver,
  listDisplays,
  moveToDisplay,
  setClickThrough,
  setExpandedHeight,
} from './window.js'
import { createTray } from './tray.js'
import { GpuMonitor } from './sensors/nvidiaSmi.js'
import { pingOllama, readResidents, readTags } from './sensors/ollamaApi.js'
import { OllamaLogTailer } from './sensors/ollamaLog.js'
import { EvictionDetector } from './sensors/evictions.js'
import { inferModel, loadTenants, tenantById, tenantForIp, tenantForModel } from './tenants.js'
import { Collector } from './collector/server.js'
import { Reconciler } from './collector/reconcile.js'
import { drainSpool } from './collector/spool.js'
import { NudgeClassifier } from './nudge/classify.js'
import { evaluate as gateEvaluate, toReceiptRecord } from './nudge/gate.js'
import type { DecidePayload, GateMode } from './nudge/gate.js'
import type { Aggressiveness } from './nudge/sorter.js'
import { Valve } from './proxy/server.js'
import { Watchdog } from './proxy/watchdog.js'
import { loadPricing, rateModelForTenant, tokensPerSecond, usdForTenant } from './metrics.js'
import { UPSTREAM_URL } from '@shared/constants'

function dataDir(): string {
  const local = process.env.LOCALAPPDATA
  return local ? join(local, 'fuel') : app.getPath('userData')
}

let store: Store
let win: BrowserWindow | null = null
let tray: (Tray & { rebuild?: () => void }) | null = null
let tailer: OllamaLogTailer | null = null
let tick: NodeJS.Timeout | null = null
let tagsTimer: NodeJS.Timeout | null = null
let gpuMon: GpuMonitor | null = null
let collector: Collector | null = null
let reconciler: Reconciler | null = null
let classifier: NudgeClassifier | null = null
let valve: Valve | null = null
let watchdog: Watchdog | null = null

/**
 * Nudge surfacing. Defaults to 'shadow': nudges are recorded and reviewable in
 * the expanded panel, but the compact HUD count stays hidden until the
 * heuristics have been calibrated against real activity (there's no historical
 * ground truth — offloading has never actually happened). Flip to 'live' from
 * the tray once the classifications look trustworthy.
 */
let nudgeMode: NudgeMode = 'shadow'

/**
 * Toll-booth (M4) surfacing. 'observe' records every routing decision as a
 * receipt but never interferes — the safe default while the designators
 * calibrate. 'guard' additionally advises redirecting clearly-local work;
 * 'off' disables the gate. `tollLevel` is the aggressiveness preset.
 */
let tollMode: GateMode = 'observe'
let tollLevel: Aggressiveness = 'normal'

// Enforce mode: how long after a completed delegation writes pass the gate,
// so the delegated result (and its sibling files) can land without re-denial.
const ENFORCE_GRACE_MS = 10 * 60_000

let utilHistory: number[] = []
let logBusy = false
let lastTokPerSec: number | null = null
let truncationWarning = false
let installedModels: string[] = []

/**
 * The most recent /api/ps view, tenant-tagged. Shared between the sampler
 * (which refreshes it every tick) and the log-event attributor (which uses it
 * to infer which model a caller hit when the caller declares none).
 */
let residents: ResidentModel[] = []
const evictions = new EvictionDetector()

/**
 * Observed keep-alive per model. A request moves `expires_at` forward; the
 * distance it lands from "now" is the keep-alive actually in force for that
 * caller. Remembered across ticks so a resident shows its policy even between
 * requests, and reset when the model leaves (a new load may carry a new one).
 */
const keepAliveByModel = new Map<string, number>()
let prevExpiresAt = new Map<string, number>()

function observeKeepAlive(now: number, ps: readonly { name: string; expiresAt: number | null }[]): void {
  const next = new Map<string, number>()
  for (const r of ps) {
    if (r.expiresAt == null) continue
    next.set(r.name, r.expiresAt)
    const before = prevExpiresAt.get(r.name)
    // A forward jump of more than a tick means a request just landed. Ollama's
    // expiry math is coarse (seconds), so round to whole seconds.
    if (before != null && r.expiresAt > before + 2_000) {
      keepAliveByModel.set(r.name, Math.round((r.expiresAt - now) / 1000))
    }
  }
  for (const name of keepAliveByModel.keys()) {
    if (!next.has(name)) keepAliveByModel.delete(name)
  }
  prevExpiresAt = next
}

/** Throttle the "is Ollama up?" ping when no model is resident. */
const PING_INTERVAL_MS = 5000
let lastPingAt = 0
let lastPingOk = false

/** Interactive = click-through disabled, so the HUD can be dragged. */
let interactive = false
let goalUsd = DEFAULT_DAILY_GOAL_USD

/**
 * The valve (M5, Phase B) is load-bearing and off by default. It only makes
 * sense once Ollama has been relocated to the upstream port (integrations/
 * valve.mjs hook); engaging it before that would bind Ollama's port with
 * nothing behind it. So enabling is guarded on the upstream actually answering.
 */
let proxyEnabled = false

// ------------------------------------------------------------- settings

function loadSettings(): void {
  interactive = store.getMeta('ui.interactive') === '1'
  const goal = Number(store.getMeta('ui.goalUsd'))
  if (Number.isFinite(goal) && goal > 0) goalUsd = goal
  const mode = store.getMeta('nudge.mode')
  if (mode === 'shadow' || mode === 'live' || mode === 'off') nudgeMode = mode
  const tMode = store.getMeta('toll.mode')
  if (tMode === 'observe' || tMode === 'guard' || tMode === 'enforce' || tMode === 'off') {
    tollMode = tMode
  }
  const tLevel = store.getMeta('toll.level')
  if (tLevel === 'off' || tLevel === 'careful' || tLevel === 'normal' || tLevel === 'eager') {
    tollLevel = tLevel
  }
}

/** Whether the valve was engaged last session; re-engaged (guarded) on launch. */
function proxyWasEnabled(): boolean {
  return store.getMeta('proxy.enabled') === '1'
}

function setNudgeMode(mode: NudgeMode): void {
  nudgeMode = mode
  store.setMeta('nudge.mode', mode)
  tray?.rebuild?.()
}

function setTollMode(mode: GateMode): void {
  tollMode = mode
  store.setMeta('toll.mode', mode)
  tray?.rebuild?.()
}

function setTollLevel(level: Aggressiveness): void {
  tollLevel = level
  store.setMeta('toll.level', level)
  tray?.rebuild?.()
}

// ------------------------------------------------------------- valve (M5)

/** Is the real Ollama answering on the upstream port? ⇒ safe to engage. */
async function upstreamReachable(): Promise<boolean> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 2000)
  try {
    const res = await fetch(`${UPSTREAM_URL}/api/version`, { signal: ctrl.signal })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

function stopValve(): void {
  watchdog?.stop()
  watchdog = null
  valve?.stop()
  valve = null
}

/**
 * Engage or release the valve. Enabling is refused unless the upstream is
 * already reachable, so fuel can never bind Ollama's port with nothing behind
 * it. A late EADDRINUSE (Ollama still squatting the port) tears back down.
 */
async function setProxyEnabled(on: boolean): Promise<boolean> {
  if (on === proxyEnabled && (valve != null) === on) return proxyEnabled

  if (!on) {
    stopValve()
    proxyEnabled = false
    store.setMeta('proxy.enabled', '0')
    tray?.rebuild?.()
    return false
  }

  if (!(await upstreamReachable())) {
    console.warn(
      `[fuel] refusing to engage valve: ${UPSTREAM_URL} not answering. ` +
        `Relocate Ollama first (node integrations/valve.mjs hook).`,
    )
    tray?.rebuild?.()
    return false
  }

  valve = new Valve((err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('[fuel] valve port busy — is Ollama still on it? Disabling valve.')
      stopValve()
      proxyEnabled = false
      store.setMeta('proxy.enabled', '0')
      tray?.rebuild?.()
    }
  })
  valve.start()
  watchdog = new Watchdog((bypassed) => valve?.setBypass(bypassed))
  watchdog.start()

  proxyEnabled = true
  store.setMeta('proxy.enabled', '1')
  tray?.rebuild?.()
  return true
}

// ---------------------------------------------------------- hover / expand

let expanded = false
let hoverTimer: NodeJS.Timeout | null = null
let outsideTicks = 0

/** Ticks outside the window before collapsing — stops edge flicker. */
const COLLAPSE_GRACE_TICKS = 2
const HOVER_POLL_MS = 180

function setExpanded(next: boolean): void {
  if (expanded === next || !win) return
  expanded = next
  setExpandedHeight(win, next)
  win.webContents.send('fuel:expanded', next)
}

function startHoverWatch(): void {
  hoverTimer = setInterval(() => {
    if (!win || win.isDestroyed()) return
    if (isCursorOver(win)) {
      outsideTicks = 0
      setExpanded(true)
    } else if (expanded && ++outsideTicks >= COLLAPSE_GRACE_TICKS) {
      setExpanded(false)
    }
  }, HOVER_POLL_MS)
}

function setInteractive(on: boolean): void {
  interactive = on
  store.setMeta('ui.interactive', on ? '1' : '0')
  if (win) setClickThrough(win, !on)
  win?.webContents.send('fuel:interactive', on)
  tray?.rebuild?.()
}

// -------------------------------------------------------------- sampling

function derivePhase(
  online: boolean,
  anyResident: boolean,
  busy: boolean,
  gpuUtil: number,
): HudPhase {
  if (!online) return 'offline'
  // A request in flight with nothing resident means someone is paying a cold
  // start right now (SPEC.md §2.3).
  if (busy && !anyResident) return 'warming'
  if (anyResident && (busy || gpuUtil > 25)) return 'generating'
  if (anyResident) return 'idle-resident'
  return 'idle-evicted'
}

async function collect(): Promise<void> {
  const now = Date.now()

  // GPU stats come from a long-lived `nvidia-smi --loop` process, so this is
  // just a field read rather than a process spawn.
  const gpu = gpuMon?.latest() ?? null
  const ps = await readResidents()

  // readResidents() is null when Ollama is down and [] when it is up but idle.
  // Anything resident proves Ollama is up for free; only when nothing is loaded
  // do we need a ping to tell "idle" from "down" — the common desktop state, so
  // throttle it to every 5 s rather than firing an HTTP call per second.
  let online = ps != null
  if (!online) {
    if (now - lastPingAt >= PING_INTERVAL_MS) {
      lastPingAt = now
      lastPingOk = await pingOllama()
    }
    online = lastPingOk
  }

  // Tag each resident with its tenant. Only advance the residency view when
  // Ollama actually answered — a transient timeout must not read as "everyone
  // was evicted" and spray false contention events.
  if (ps != null) {
    observeKeepAlive(now, ps)
    residents = ps.map((r) => ({
      ...r,
      tenant: tenantForModel(r.name),
      keepAliveSec: keepAliveByModel.get(r.name) ?? null,
    }))
    for (const ev of evictions.observe(residents, now)) {
      store.insertEviction(ev)
      console.log(
        `[fuel] eviction: ${ev.model} (${ev.tenant?.label ?? 'unknown'}) left ` +
          `${Math.round(ev.earlyByMs / 1000)}s early` +
          (ev.evictedBy ? ` — displaced by ${ev.evictedBy}` : ''),
      )
    }
  }

  const util = gpu?.utilGpu ?? 0

  utilHistory.push(util)
  if (utilHistory.length > UTIL_HISTORY_LEN) {
    utilHistory = utilHistory.slice(-UTIL_HISTORY_LEN)
  }

  const sample: Sample = {
    ts: now,
    gpuUtil: gpu?.utilGpu ?? null,
    vramUsedMb: gpu?.memUsedMb ?? null,
    vramTotalMb: gpu?.memTotalMb ?? null,
    tempC: gpu?.tempC ?? null,
    powerW: gpu?.powerW ?? null,
    smClockMhz: gpu?.smClockMhz ?? null,
    residents,
  }
  store.insertSample(sample)

  const today = store.todayTotals()
  const byTenant = tenantTotals()

  const state: HudState = {
    ts: now,
    phase: derivePhase(online, residents.length > 0, logBusy, util),
    ollama: online ? 'online' : 'offline',
    gpu,
    residents,
    evictionsToday: store.todayEvictionCount(),
    today,
    // The honest sum: each tenant at its own counterfactual rate.
    usdToday: byTenant.reduce((a, t) => a + t.usd, 0),
    byTenant,
    utilHistory: [...utilHistory],
    tokPerSec: lastTokPerSec,
    truncationWarning,
    goalUsd,
    unburnedToday: nudgeMode === 'off' ? 0 : store.todayNudgeCount(),
    nudgeMode,
  }

  win?.webContents.send('fuel:state', state)
}

/**
 * Today's work per tenant, each priced against its own counterfactual Claude
 * model. Shim clients ('claude-code', 'claude-desktop') are your own offloads
 * and fold into the `local` tenant; log events carry a tenant id; NULL is the
 * unattributed bucket, priced at the default rate and labelled as such rather
 * than hidden. Sorted by dollars, unattributed last.
 */
function tenantTotals(): TenantTotals[] {
  const merged = new Map<string | null, TenantTotals>()
  for (const r of store.todayTotalsByClient()) {
    let tenant: Tenant | null = null
    if (r.client === 'claude-code' || r.client === 'claude-desktop') {
      tenant = tenantForIp('127.0.0.1') ?? { id: 'local', label: 'this PC' }
    } else if (r.client != null) {
      tenant = tenantById(r.client) ?? { id: r.client, label: r.client }
    }
    const key = tenant?.id ?? null
    const cur = merged.get(key) ?? {
      tenant,
      tasks: 0,
      promptTokens: 0,
      evalTokens: 0,
      usd: 0,
      rateModel: rateModelForTenant(key),
    }
    cur.tasks += r.tasks
    cur.promptTokens += r.promptTokens
    cur.evalTokens += r.evalTokens
    merged.set(key, cur)
  }
  const out = [...merged.values()].map((t) => ({
    ...t,
    usd: usdForTenant(t.tenant?.id ?? null, t.promptTokens, t.evalTokens),
  }))
  out.sort((a, b) => {
    if (a.tenant == null) return 1
    if (b.tenant == null) return -1
    return b.usd - a.usd
  })
  return out
}

/**
 * Human label for a stored event's originator. Shim clients keep their own
 * name; log events carry a tenant id; failing both, fall back to whoever owns
 * the model, and finally to null so the panel can say "unattributed" honestly.
 */
function whoLabel(client: string | null, model: string): string | null {
  return tenantForModel(model)?.label ?? client
}

/**
 * Give a log-sourced event its tenant and best-effort model before it enters
 * the reconciler. The log line knows the caller IP but not the model; the
 * registry knows who the IP is and (sometimes) what they run; /api/ps knows
 * what is loaded right now. Together that is enough to stop everything
 * landing as `unknown`.
 */
function attributeLogEvent(e: OffloadEvent): OffloadEvent {
  const tenant = tenantForIp(e.clientIp)
  return {
    ...e,
    client: tenant?.id ?? null,
    model: e.model === 'unknown' ? inferModel(e.clientIp, residents) : e.model,
  }
}

/**
 * The single sink for reconciled events — whichever of the two sources (log or
 * MCP) survives deduplication ends up here exactly once. See Reconciler.
 */
function commitEvent(e: OffloadEvent): void {
  store.insertEvent(e)

  // Generation rate only — llama-server's "eval time" line excludes prompt
  // processing and model load, matching the ~63 tok/s warm baseline (§2.3a).
  const rate = tokensPerSecond(e.evalTokens ?? 0, e.evalNs ?? 0)
  if (rate != null) lastTokPerSec = rate

  if (e.truncated) truncationWarning = true
}

function startSensors(): void {
  gpuMon = new GpuMonitor(1)
  gpuMon.start()

  reconciler = new Reconciler(commitEvent)

  // The nudge engine watches tool activity for delegatable work Claude did
  // inline. In 'off' mode it isn't even constructed.
  if (nudgeMode !== 'off') {
    classifier = new NudgeClassifier((n) => store.insertNudge(n))
  }

  // Phase C: the MCP shim POSTs attributed events (/ingest); the PostToolUse
  // hook POSTs tool actions (/hook).
  collector = new Collector(
    (e) => reconciler?.onMcp(e),
    (h) => classifier?.onEvent(h),
    (payload) =>
      gateEvaluate(payload as DecidePayload, {
        level: tollLevel,
        mode: tollMode,
        record: (r, ev) => store.insertReceipt(toReceiptRecord(r, ev)),
        inGrace: (store.lastOkDelegationAt() ?? 0) > Date.now() - ENFORCE_GRACE_MS,
      }),
  )
  collector.start()

  // Phase A: the log tailer sees every inference (local and LAN) and keeps the
  // caller IP; attribution happens here, then the reconciler merges it with any
  // shim record for the same call so a single offload is counted once.
  tailer = new OllamaLogTailer()
  tailer.on('event', (e) => reconciler?.onLog(attributeLogEvent(e)))
  tailer.on('busy', (b) => {
    logBusy = b
  })
  tailer.on('error', () => {
    // Log parsing is best-effort; /api/ps remains authoritative for state.
  })
  tailer.start()

  tick = setInterval(() => void collect(), POLL_GPU_MS)
  void collect()

  const refreshTags = async (): Promise<void> => {
    installedModels = await readTags()
  }
  tagsTimer = setInterval(() => void refreshTags(), POLL_TAGS_MS)
  void refreshTags()
}

// ------------------------------------------------------------------- ipc

function registerIpc(): void {
  ipcMain.handle('fuel:models', () => installedModels)

  ipcMain.handle('fuel:clear-truncation', () => {
    truncationWarning = false
    return true
  })

  ipcMain.handle('fuel:recent-events', (): RecentEvent[] => {
    return store.recentEvents(RECENT_EVENT_LIMIT).map((r) => ({
      startedAt: Number(r.started_at),
      status: String(r.status),
      who: whoLabel(r.client != null ? String(r.client) : null, String(r.model ?? 'unknown')),
      model: String(r.model ?? 'unknown'),
      promptTokens: r.prompt_tokens != null ? Number(r.prompt_tokens) : null,
      evalTokens: r.eval_tokens != null ? Number(r.eval_tokens) : null,
      tokPerSec: tokensPerSecond(Number(r.eval_tokens ?? 0), Number(r.eval_ns ?? 0)),
      coldStart: Number(r.cold_start) === 1,
      truncated: Number(r.truncated) === 1,
      numCtx: r.num_ctx != null ? Number(r.num_ctx) : null,
    }))
  })

  ipcMain.handle('fuel:recent-nudges', (): Nudge[] => store.recentNudges(RECENT_EVENT_LIMIT))

  ipcMain.handle('fuel:catch-stats', (): CatchStats => store.todayCatchStats())

  ipcMain.handle('fuel:recent-receipts', (): ReceiptRecord[] =>
    store.recentReceipts(RECENT_EVENT_LIMIT),
  )

  ipcMain.handle('fuel:recent-evictions', (): EvictionEvent[] =>
    store.recentEvictions(RECENT_EVENT_LIMIT),
  )

  ipcMain.on('fuel:quit', () => app.quit())
}

// GUI-independent escape hatch (SPEC §4.3 mitigation #4). `electron . --unhook`
// removes the OLLAMA_HOST relocation and exits, so a wedged valve can always be
// undone from the command line without opening fuel. Restart Ollama afterwards.
if (process.argv.includes('--unhook')) {
  try {
    execFileSync('reg', ['delete', 'HKCU\\Environment', '/v', 'OLLAMA_HOST', '/f'], {
      stdio: 'ignore',
    })
    console.log('[fuel] OLLAMA_HOST removed — restart Ollama to return it to :11434')
  } catch {
    console.log('[fuel] OLLAMA_HOST was not set; nothing to undo')
  }
  process.exit(0)
}

// A second instance would double-write samples and fight over the window slot.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => win?.showInactive())

  app.whenReady().then(() => {
    const dir = dataDir()
    loadPricing(dir)
    loadTenants(dir)
    store = new Store(join(dir, 'fuel.db'))
    loadSettings()

    // Seed the sparkline from disk so a restart doesn't start visually blank.
    utilHistory = store.recentUtil(UTIL_HISTORY_LEN)
    truncationWarning = store.recentTruncation()

    win = createHudWindow(store)
    registerIpc()
    startSensors()
    startHoverWatch()

    // Replay any telemetry the shim spooled while fuel was closed, so offloads
    // that happened between sessions still land on the gauge. Committed
    // directly (not through the reconciler) — the matching log lines are long
    // gone, so there is nothing to pair against.
    const drained = drainSpool(dir, commitEvent)
    if (drained > 0) console.log(`[fuel] drained ${drained} spooled event(s)`)

    win.once('ready-to-show', () => setClickThrough(win!, !interactive))

    tray = createTray(win, {
      isInteractive: () => interactive,
      setInteractive,
      // In dev, process.execPath is the bare electron binary — it needs the app
      // path as an argument or the login item launches an empty Electron shell.
      isOpenAtLogin: () =>
        app.getLoginItemSettings({ args: [app.getAppPath()] }).openAtLogin,
      setOpenAtLogin: (on) =>
        app.setLoginItemSettings({ openAtLogin: on, args: [app.getAppPath()] }),
      moveToDisplay: (id) => win && moveToDisplay(win, store, id),
      listDisplays: () => (win ? listDisplays(win) : []),
      nudgeMode: () => nudgeMode,
      setNudgeMode,
      tollMode: () => tollMode,
      setTollMode,
      tollLevel: () => tollLevel,
      setTollLevel,
      isProxyEnabled: () => proxyEnabled,
      setProxyEnabled: (on) => void setProxyEnabled(on),
      prewarm: () => valve?.prewarm(),
    })

    // Re-engage the valve if it was on last session — guarded on the upstream
    // actually answering, so a machine that isn't relocated just stays off.
    if (proxyWasEnabled()) void setProxyEnabled(true)

    // Debug aid: capture what the window is actually painting, independent of
    // z-order. Distinguishes "renderer is blank" from "something is on top".
    const shot = process.env['FUEL_DEBUG_SHOT']
    if (shot) {
      setTimeout(() => {
        void win?.webContents.capturePage().then(async (img) => {
          const { writeFile } = await import('node:fs/promises')
          await writeFile(shot, img.toPNG())
          console.log('[fuel] captured page ->', shot, img.getSize())
        })
      }, Number(process.env['FUEL_DEBUG_SHOT_DELAY'] ?? 5000))
    }

    globalShortcut.register('CommandOrControl+Alt+Q', () => app.quit())
    globalShortcut.register('CommandOrControl+Alt+I', () =>
      setInteractive(!interactive),
    )
    globalShortcut.register('CommandOrControl+Alt+F', () => {
      if (!win) return
      win.isVisible() ? win.hide() : win.showInactive()
      tray?.rebuild?.()
    })
  })

  // The tray keeps the app alive with no visible window, so don't quit here.
  app.on('window-all-closed', () => app.quit())

  app.on('before-quit', () => {
    if (tick) clearInterval(tick)
    if (tagsTimer) clearInterval(tagsTimer)
    if (hoverTimer) clearInterval(hoverTimer)
    tailer?.stop()
    gpuMon?.stop()
    collector?.stop()
    stopValve()
    reconciler?.flushAll()
    globalShortcut.unregisterAll()
    tray?.destroy()
    store?.close()
  })
}
