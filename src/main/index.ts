import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import { join } from 'node:path'
import type { HudPhase, HudState, OffloadEvent, Sample } from '@shared/types'
import { POLL_GPU_MS, POLL_TAGS_MS, UTIL_HISTORY_LEN } from '@shared/constants'
import { Store } from './db/index.js'
import { createHudWindow } from './window.js'
import { readGpu } from './sensors/nvidiaSmi.js'
import { pingOllama, readResident, readTags } from './sensors/ollamaApi.js'
import { OllamaLogTailer } from './sensors/ollamaLog.js'
import { loadPricing, tokensPerSecond, usdForDay } from './metrics.js'

function dataDir(): string {
  const local = process.env.LOCALAPPDATA
  return local ? join(local, 'fuel') : app.getPath('userData')
}

let store: Store
let win: BrowserWindow | null = null
let tailer: OllamaLogTailer | null = null
let tick: NodeJS.Timeout | null = null
let tagsTimer: NodeJS.Timeout | null = null

/** Rolling sparkline buffer, oldest first. */
let utilHistory: number[] = []
/** Set by the log tailer when llama-server reports slot activity. */
let logBusy = false
/** Throughput of the most recently completed task. */
let lastTokPerSec: number | null = null
let truncationWarning = false
let installedModels: string[] = []

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
  const [gpu, resident] = await Promise.all([readGpu(), readResident()])

  // readResident() returns null both when idle and when Ollama is down; ping
  // only when we need to tell those apart.
  const online = resident != null ? true : await pingOllama()

  const now = Date.now()
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
  }

  win?.webContents.send('fuel:state', state)
}

function onOffloadEvent(e: OffloadEvent): void {
  store.insertEvent(e)

  // Generation rate only — llama-server's "eval time" line excludes prompt
  // processing and model load, matching the 40.1 tok/s baseline in SPEC §2.3.
  const rate = tokensPerSecond(e.evalTokens ?? 0, e.evalNs ?? 0)
  if (rate != null) lastTokPerSec = rate

  if (e.truncated) truncationWarning = true
}

function startSensors(): void {
  tailer = new OllamaLogTailer()
  tailer.on('event', onOffloadEvent)
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

function registerIpc(): void {
  ipcMain.handle('fuel:models', () => installedModels)
  ipcMain.handle('fuel:clear-truncation', () => {
    truncationWarning = false
    return true
  })
  ipcMain.on('fuel:quit', () => app.quit())
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

    // Seed the sparkline from disk so a restart doesn't start visually blank.
    utilHistory = store.recentUtil(UTIL_HISTORY_LEN)
    truncationWarning = store.recentTruncation()

    win = createHudWindow(store)
    registerIpc()
    startSensors()

    // The window is frameless and hidden from the taskbar, so there is no
    // affordance to close it. Until the M2 tray icon lands, these are the
    // only escape hatches.
    globalShortcut.register('CommandOrControl+Alt+Q', () => app.quit())
    globalShortcut.register('CommandOrControl+Alt+F', () => {
      if (!win) return
      win.isVisible() ? win.hide() : win.showInactive()
    })
  })

  app.on('window-all-closed', () => app.quit())

  app.on('before-quit', () => {
    if (tick) clearInterval(tick)
    if (tagsTimer) clearInterval(tagsTimer)
    tailer?.stop()
    globalShortcut.unregisterAll()
    store?.close()
  })
}
