import { BrowserWindow, screen, type Display } from 'electron'
import { join } from 'node:path'
import {
  WINDOW_HEIGHT,
  WINDOW_HEIGHT_EXPANDED,
  WINDOW_HEIGHT_MINI,
  WINDOW_WIDTH,
  WINDOW_WIDTH_MINI,
} from '@shared/constants'
import type { Store } from './db/index.js'
import {
  anchorFromBounds,
  anchorFromLegacy,
  defaultCorner,
  parseLegacyPosition,
  parseStoredAnchor,
  placeFromCorner,
  resolveAnchor,
  type DisplayInfo,
  type Size,
  type StoredAnchor,
} from './placement.js'

/** Top-right anchor (see placement.ts). Supersedes LEGACY_POSITION_KEY. */
const ANCHOR_KEY = 'window.anchor'
const LEGACY_POSITION_KEY = 'window.position'
const MARGIN = 24

export type HudSize = 'compact' | 'expanded' | 'mini'

const SIZES: Record<HudSize, Size> = {
  compact: { width: WINDOW_WIDTH, height: WINDOW_HEIGHT },
  expanded: { width: WINDOW_WIDTH, height: WINDOW_HEIGHT_EXPANDED },
  mini: { width: WINDOW_WIDTH_MINI, height: WINDOW_HEIGHT_MINI },
}

// One HUD window per process (single-instance lock), so its placement state
// lives at module level.
let anchor: StoredAnchor | null = null
let hudSize: HudSize = 'compact'

const info = (d: Display): DisplayInfo => ({ id: d.id, workArea: d.workArea })

function loadAnchor(store: Store): StoredAnchor | null {
  const saved = parseStoredAnchor(store.getMeta(ANCHOR_KEY))
  if (saved) return saved
  // Migrate the pre-anchor format once: it was top-left relative to display
  // *bounds*, but restored against workArea, so a top/left taskbar drifted it.
  const legacy = parseLegacyPosition(store.getMeta(LEGACY_POSITION_KEY))
  if (!legacy) return null
  const d = screen.getAllDisplays().find((x) => x.id === legacy.displayId)
  if (!d) return null
  const migrated = anchorFromLegacy(legacy, d.bounds, info(d), WINDOW_WIDTH)
  store.setMeta(ANCHOR_KEY, JSON.stringify(migrated))
  return migrated
}

/**
 * Where the window should be for the current anchor and size, clamped inside
 * that display's work area. Re-resolved against the live display layout every
 * time, so unplugging or rearranging monitors can't strand it off-screen.
 */
function targetBounds(size: HudSize): Electron.Rectangle {
  const resolved = resolveAnchor(anchor, screen.getAllDisplays().map(info))
  if (resolved) {
    return placeFromCorner(resolved.corner, SIZES[size], resolved.display.workArea)
  }
  const { workArea } = screen.getPrimaryDisplay()
  return placeFromCorner(defaultCorner(workArea, MARGIN), SIZES[size], workArea)
}

/** True while main is moving the window itself, so it isn't saved as a drag. */
let placing = false

function applyPlacement(win: BrowserWindow): void {
  if (win.isDestroyed()) return
  const next = targetBounds(hudSize)
  const b = win.getBounds()
  if (
    b.x === next.x &&
    b.y === next.y &&
    b.width === next.width &&
    b.height === next.height
  ) {
    return
  }
  placing = true
  try {
    win.setBounds(next, false)
  } finally {
    placing = false
  }
}

/** A user drag ended: the window's current top-right becomes the anchor. */
function saveAnchorFromWindow(win: BrowserWindow, store: Store): void {
  if (win.isDestroyed()) return
  const bounds = win.getBounds()
  // getDisplayMatching picks the display with the largest overlap, which is
  // the right answer for a window straddling two monitors.
  anchor = anchorFromBounds(bounds, info(screen.getDisplayMatching(bounds)))
  store.setMeta(ANCHOR_KEY, JSON.stringify(anchor))
}

export function createHudWindow(store: Store, initialSize: HudSize): BrowserWindow {
  anchor = loadAnchor(store)
  hudSize = initialSize
  const { x, y, width, height } = targetBounds(hudSize)

  const win = new BrowserWindow({
    width,
    height,
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

  // The whole HUD is a drag region, and right-clicking a drag region on
  // Windows opens the system menu — whose "Close" would quit fuel. Suppress it.
  win.on('system-context-menu', (e) => e.preventDefault())

  // On Windows 'moved' fires once at the end of a user drag (WM_EXITSIZEMOVE),
  // not for programmatic setBounds — so only drags move the anchor. The
  // per-pixel 'move' event is deliberately not saved: it also fires when main
  // shifts the tall expanded panel up off the bottom edge, which used to be
  // persisted and made the HUD creep upward over time.
  win.on('moved', () => {
    if (!placing) saveAnchorFromWindow(win, store)
  })

  // Monitor added/removed/rescaled: re-resolve the same anchor against the
  // new layout (clamped on-screen) rather than resetting the user's spot.
  const reflow = (): void => applyPlacement(win)
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
  // and its URL arrives via env; a packaged/built run loads from disk. The
  // initial size rides along as a query param so the very first paint is
  // already the right layout (an IPC message could land after the window shows).
  const query = { size: initialSize }
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    log('loading dev url', devUrl)
    void win.loadURL(`${devUrl}?size=${initialSize}`)
  } else {
    const file = join(import.meta.dirname, '../renderer/index.html')
    log('loading file', file)
    win.loadFile(file, { query }).catch((e) => console.error('[fuel] loadFile failed:', e))
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
 * Switch between compact, hover-expanded and the mini pill. Every size hangs
 * from the same top-right anchor; if the taller expanded window would run off
 * the bottom of its display it is drawn shifted up, but the anchor is
 * untouched, so collapsing puts it back exactly where it was.
 */
export function setHudSize(win: BrowserWindow, size: HudSize): void {
  hudSize = size
  applyPlacement(win)
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

  const corner = defaultCorner(display.workArea, MARGIN)
  anchor = anchorFromBounds(
    { x: corner.x, y: corner.y, width: 0, height: 0 },
    info(display),
  )
  store.setMeta(ANCHOR_KEY, JSON.stringify(anchor))
  applyPlacement(win)
}
