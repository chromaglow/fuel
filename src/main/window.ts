import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import {
  WINDOW_HEIGHT,
  WINDOW_HEIGHT_EXPANDED,
  WINDOW_WIDTH,
} from '@shared/constants'
import type { Store } from './db/index.js'

const POSITION_KEY = 'window.position'
const MARGIN = 24

interface StoredPosition {
  displayId: number
  relX: number
  relY: number
}

/**
 * Position is persisted *relative to a display*, never as absolute screen
 * coordinates. This machine has displays at x=-3440 and at (-2989,-1107), so
 * absolute coordinates are meaningless the moment a monitor is unplugged,
 * rearranged, or the primary changes.
 */
function loadPosition(store: Store): StoredPosition | null {
  const raw = store.getMeta(POSITION_KEY)
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as StoredPosition
    if (
      typeof p.displayId === 'number' &&
      typeof p.relX === 'number' &&
      typeof p.relY === 'number'
    ) {
      return p
    }
  } catch {
    // Corrupt value: fall through to the default placement.
  }
  return null
}

function defaultPlacement(): { x: number; y: number } {
  const { workArea } = screen.getPrimaryDisplay()
  return {
    x: workArea.x + workArea.width - WINDOW_WIDTH - MARGIN,
    y: workArea.y + MARGIN,
  }
}

/** Resolve stored relative coordinates back to absolute, clamped on-screen. */
function resolvePlacement(store: Store): { x: number; y: number } {
  const saved = loadPosition(store)
  if (!saved) return defaultPlacement()

  const display = screen.getAllDisplays().find((d) => d.id === saved.displayId)
  if (!display) return defaultPlacement()

  const { workArea } = display
  // Clamp so the window stays fully inside that display's work area, even if
  // the monitor's resolution changed since the position was saved.
  const maxX = workArea.x + Math.max(0, workArea.width - WINDOW_WIDTH)
  const maxY = workArea.y + Math.max(0, workArea.height - WINDOW_HEIGHT)
  const x = Math.min(Math.max(workArea.x + saved.relX, workArea.x), maxX)
  const y = Math.min(Math.max(workArea.y + saved.relY, workArea.y), maxY)
  return { x: Math.round(x), y: Math.round(y) }
}

function savePosition(win: BrowserWindow, store: Store): void {
  if (win.isDestroyed()) return
  const bounds = win.getBounds()
  // getDisplayMatching picks the display with the largest overlap, which is
  // the right answer for a window straddling two monitors.
  const display = screen.getDisplayMatching(bounds)
  const pos: StoredPosition = {
    displayId: display.id,
    relX: bounds.x - display.bounds.x,
    relY: bounds.y - display.bounds.y,
  }
  store.setMeta(POSITION_KEY, JSON.stringify(pos))
}

export function createHudWindow(store: Store): BrowserWindow {
  const { x, y } = resolvePlacement(store)

  const win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    x,
    y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    // Keep it above normal windows without stealing focus from the editor.
    alwaysOnTop: true,
    // M1 keeps the window focusable so it can be dragged to verify
    // multi-monitor placement. M2 makes it click-through by default.
    focusable: true,
    acceptFirstMouse: true,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  })

  // 'screen-saver' keeps the HUD above full-screen apps and most overlays.
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  let saveTimer: NodeJS.Timeout | null = null
  const debouncedSave = (): void => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => savePosition(win, store), 400)
  }
  win.on('move', debouncedSave)
  win.on('moved', debouncedSave)

  // A display being added or removed can strand the window off-screen.
  const reflow = (): void => {
    if (win.isDestroyed()) return
    const p = resolvePlacement(store)
    win.setPosition(p.x, p.y)
  }
  screen.on('display-removed', reflow)
  screen.on('display-added', reflow)
  screen.on('display-metrics-changed', reflow)

  const debug = Boolean(process.env['FUEL_DEBUG'])
  const log = (...a: unknown[]): void => {
    if (debug) console.log('[fuel]', ...a)
  }

  win.webContents.on('did-fail-load', (_e, code, desc, url) =>
    console.error('[fuel] renderer failed to load:', code, desc, url),
  )
  win.webContents.on('render-process-gone', (_e, details) =>
    console.error('[fuel] render process gone:', details.reason),
  )
  win.webContents.on('preload-error', (_e, path, err) =>
    console.error('[fuel] preload error:', path, err.message),
  )
  win.webContents.on('did-finish-load', () => log('renderer loaded'))
  win.webContents.on('console-message', (details) =>
    log(`renderer[${details.level}] ${details.message} (${details.lineNumber})`),
  )

  // Load the renderer. In `electron-vite dev` the renderer is served over HTTP
  // and its URL arrives via env; a packaged/built run loads from disk.
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    log('loading dev url', devUrl)
    void win.loadURL(devUrl)
  } else {
    const file = join(import.meta.dirname, '../renderer/index.html')
    log('loading file', file)
    win.loadFile(file).catch((e) => console.error('[fuel] loadFile failed:', e))
  }

  win.once('ready-to-show', () => {
    win.showInactive()
    log('shown; visible=', win.isVisible(), 'bounds=', win.getBounds())
  })

  return win
}

/**
 * Click-through is the default: the HUD floats over the desktop without ever
 * intercepting a click meant for the window beneath it. `forward: true` keeps
 * mouse *movement* flowing to the renderer, so hover-to-expand still works.
 */
export function setClickThrough(win: BrowserWindow, on: boolean): void {
  if (win.isDestroyed()) return
  win.setIgnoreMouseEvents(on, { forward: true })
  // Non-focusable while click-through, so it can't steal focus from the editor.
  win.setFocusable(!on)
}

/**
 * Grow the window for the expanded panel. If the taller window would run off
 * the bottom of its display, shift it up rather than let it spill off-screen.
 */
export function setExpandedHeight(win: BrowserWindow, expanded: boolean): void {
  if (win.isDestroyed()) return
  const height = expanded ? WINDOW_HEIGHT_EXPANDED : WINDOW_HEIGHT
  const b = win.getBounds()
  if (b.height === height) return

  const { workArea } = screen.getDisplayMatching(b)
  const maxY = workArea.y + workArea.height - height
  const y = Math.min(b.y, Math.max(workArea.y, maxY))

  win.setBounds({ x: b.x, y, width: WINDOW_WIDTH, height }, false)
}

/**
 * Is the cursor over the HUD?
 *
 * Hover detection is polled from the main process rather than driven by DOM
 * events. A click-through window has WS_EX_TRANSPARENT, so mouse messages go
 * to whatever is underneath; `setIgnoreMouseEvents(..., { forward: true })` is
 * supposed to forward moves to the renderer but does not do so reliably here.
 * Polling GetCursorPos is a few microseconds and always correct.
 */
export function isCursorOver(win: BrowserWindow): boolean {
  if (win.isDestroyed() || !win.isVisible()) return false
  const p = screen.getCursorScreenPoint()
  const b = win.getBounds()
  return (
    p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height
  )
}

export function listDisplays(
  win: BrowserWindow,
): Array<{ id: number; label: string; current: boolean }> {
  const currentId = screen.getDisplayMatching(win.getBounds()).id
  const primaryId = screen.getPrimaryDisplay().id
  return screen.getAllDisplays().map((d, i) => ({
    id: d.id,
    label:
      `Display ${i + 1} — ${d.size.width}x${d.size.height}` +
      (d.id === primaryId ? ' (primary)' : ''),
    current: d.id === currentId,
  }))
}

/** Move the HUD to a chosen display, anchored top-right with a margin. */
export function moveToDisplay(
  win: BrowserWindow,
  store: Store,
  displayId: number,
): void {
  const display = screen.getAllDisplays().find((d) => d.id === displayId)
  if (!display || win.isDestroyed()) return

  const { workArea } = display
  const { height } = win.getBounds()
  const x = workArea.x + workArea.width - WINDOW_WIDTH - MARGIN
  const y = workArea.y + MARGIN

  win.setBounds({
    x: Math.round(x),
    y: Math.round(y),
    width: WINDOW_WIDTH,
    height,
  })
  savePosition(win, store)
}
