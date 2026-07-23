import { app, BrowserWindow, globalShortcut, ipcMain, type Tray } from 'electron'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import type {
  HudPhase,
  HudState,
  Nudge,
  NudgeMode,
  OffloadEvent,
  RecentEvent,
  Sample,
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
import { pingOllama, readResident, readTags } from './sensors/ollamaApi.js'
import { OllamaLogTailer } from './sensors/ollamaLog.js'
import { Collector } from './collector/server.js'
import { Reconciler } from './collector/reconcile.js'
import { drainSpool } from './collector/spool.js'
import { NudgeClassifier } from './nudge/classify.js'
import { Valve } from './proxy/server.js'
import { Watchdog } from './proxy/watchdog.js'
import { loadPricing, tokensPerSecond, usdForDay } from './metrics.js'
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

let utilHistory: number[] = []
let logBusy = false
let lastTokPerSec: number | null = null
let truncationWarning = false
let installedModels: string[] = []

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
  resident: boolean,
  busy: boolean,
  gpuUtil: number,
): HudPhase {
  if (!online) return 'offline'
  // A request in flight with nothing resident means we're paying the ~33 s
  // cold start (SPEC.md §2.3).
  if (busy && !resident) return 'warming'
  if (resident && (busy || gpuUtil > 25)) return 'generating'
  if (resident) return 'idle-resident'
  return 'idle-evicted'
}

async function collect(): Promise<void> {
  const now = Date.now()

  // GPU stats come from a long-lived `nvidia-smi --loop` process, so this is
  // just a field read rather than a process spawn.
  const gpu = gpuMon?.latest() ?? null
  const resident = await readResident()

  // readResident() returns null both when idle and when Ollama is down. A model
  // being resident proves Ollama is up for free; only when nothing is loaded do
  // we need a ping to tell "idle" from "down" — and that's the common desktop
  // state, so throttle it to every 5 s rather than firing an HTTP call/second.
  let online = resident != null
  if (!online) {
    if (now - lastPingAt >= PING_INTERVAL_MS) {
      lastPingAt = now
      lastPingOk = await pingOllama()
    }
    online = lastPingOk
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
    modelResident: resident?.name ?? null,
    modelVramBytes: resident?.sizeVram ?? null,
    evictAt: resident?.expiresAt ?? null,
  }
  store.insertSample(sample)

  const today = store.todayTotals()
  const evictInSec =
    resident?.expiresAt != null
      ? Math.max(0, Math.round((resident.expiresAt - now) / 1000))
      : null

  const state: HudState = {
    ts: now,
    phase: derivePhase(online, resident != null, logBusy, util),
    ollama: online ? 'online' : 'offline',
    gpu,
    resident,
    evictInSec,
    today,
    usdToday: usdForDay(today),
    utilHistory: [...utilHistory],
    tokPerSec: lastTokPerSec,
    truncationWarning,
    contextLength: resident?.contextLength ?? null,
    goalUsd,
    unburnedToday: nudgeMode === 'off' ? 0 : store.todayNudgeCount(),
    nudgeMode,
  }

  win?.webContents.send('fuel:state', state)
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
  )
  collector.start()

  // Phase A: the log tailer sees every inference but can't attribute it. The
  // reconciler merges the two so a single offload is counted once.
  tailer = new OllamaLogTailer()
  tailer.on('event', (e) => reconciler?.onLog(e))
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
      promptTokens: r.prompt_tokens != null ? Number(r.prompt_tokens) : null,
      evalTokens: r.eval_tokens != null ? Number(r.eval_tokens) : null,
      tokPerSec: tokensPerSecond(Number(r.eval_tokens ?? 0), Number(r.eval_ns ?? 0)),
      coldStart: Number(r.cold_start) === 1,
      truncated: Number(r.truncated) === 1,
      numCtx: r.num_ctx != null ? Number(r.num_ctx) : null,
    }))
  })

  ipcMain.handle('fuel:recent-nudges', (): Nudge[] => store.recentNudges(RECENT_EVENT_LIMIT))

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
      isOpenAtLogin: () => app.getLoginItemSettings().openAtLogin,
      setOpenAtLogin: (on) =>
        app.setLoginItemSettings({ openAtLogin: on, args: [] }),
      moveToDisplay: (id) => win && moveToDisplay(win, store, id),
      listDisplays: () => (win ? listDisplays(win) : []),
      nudgeMode: () => nudgeMode,
      setNudgeMode,
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
