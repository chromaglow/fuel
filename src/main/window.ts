import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import { WINDOW_HEIGHT, WINDOW_WIDTH } from '@shared/constants'
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

  win.once('ready-to-show', () => win.showInactive())

  return win
}
