/**
 * Pure placement math for the HUD window — no Electron imports, so it can be
 * unit-tested directly.
 *
 * The HUD is *anchored by its top-right corner*. It has three sizes (compact,
 * expanded on hover, mini) and all of them hang from the same corner, so
 * switching size never makes it jump sideways, and the expanded panel or the
 * mini pill grow/shrink from where the user put it.
 *
 * The anchor is the user's choice and is only ever changed by a user drag (or
 * the tray's "Move to display"). Clamping a window on-screen — e.g. the tall
 * expanded panel near the bottom of a display — changes where the window is
 * drawn, never the anchor, so the HUD returns to the same spot afterwards.
 */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

export interface DisplayInfo {
  id: number
  workArea: Rect
}

/**
 * Persisted anchor. Stored *relative to a display's work area*, because this
 * machine has displays at negative coordinates and absolute positions are
 * meaningless once a monitor is unplugged or rearranged. The absolute point is
 * kept only as a fallback for when the display id no longer exists.
 */
export interface StoredAnchor {
  displayId: number
  /** Top-right corner, relative to the display's work area origin. */
  relRight: number
  relTop: number
  /** Same corner in absolute screen coordinates (fallback only). */
  absRight: number
  absTop: number
}

/** Pre-anchor format: top-left, relative to display *bounds* (not workArea). */
export interface LegacyPosition {
  displayId: number
  relX: number
  relY: number
}

export function parseStoredAnchor(raw: string | null): StoredAnchor | null {
  if (!raw) return null
  try {
    const a = JSON.parse(raw) as Partial<StoredAnchor>
    const nums = [a.displayId, a.relRight, a.relTop, a.absRight, a.absTop]
    if (nums.every((n) => typeof n === 'number' && Number.isFinite(n))) {
      return a as StoredAnchor
    }
  } catch {
    // Corrupt value: caller falls back to the default placement.
  }
  return null
}

export function parseLegacyPosition(raw: string | null): LegacyPosition | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as Partial<LegacyPosition>
    if (
      typeof p.displayId === 'number' &&
      typeof p.relX === 'number' &&
      typeof p.relY === 'number'
    ) {
      return p as LegacyPosition
    }
  } catch {
    // Corrupt value.
  }
  return null
}

function contains(r: Rect, p: Point): boolean {
  return p.x >= r.x && p.x < r.x + r.width && p.y >= r.y && p.y < r.y + r.height
}

/** Record the top-right corner of `bounds` against the display it sits on. */
export function anchorFromBounds(bounds: Rect, display: DisplayInfo): StoredAnchor {
  const right = bounds.x + bounds.width
  return {
    displayId: display.id,
    relRight: right - display.workArea.x,
    relTop: bounds.y - display.workArea.y,
    absRight: right,
    absTop: bounds.y,
  }
}

/**
 * Resolve a stored anchor to an absolute top-right corner on the current
 * display layout. Prefers the same display (survives rearrangement), then
 * whichever display contains the old absolute point, else null (use default).
 */
export function resolveAnchor(
  saved: StoredAnchor | null,
  displays: DisplayInfo[],
): { corner: Point; display: DisplayInfo } | null {
  if (!saved) return null
  const same = displays.find((d) => d.id === saved.displayId)
  if (same) {
    return {
      corner: {
        x: same.workArea.x + saved.relRight,
        y: same.workArea.y + saved.relTop,
      },
      display: same,
    }
  }
  // Probe one pixel inside the corner — the right edge itself is exclusive.
  const probe = { x: saved.absRight - 1, y: saved.absTop }
  const holder = displays.find((d) => contains(d.workArea, probe))
  if (holder) return { corner: { x: saved.absRight, y: saved.absTop }, display: holder }
  return null
}

/** Default spot: top-right of the given work area, inset by `margin`. */
export function defaultCorner(workArea: Rect, margin: number): Point {
  return { x: workArea.x + workArea.width - margin, y: workArea.y + margin }
}

/**
 * Bounds for a window of `size` hung from `corner`, clamped fully inside
 * `workArea`. A window taller/wider than the work area pins to its top/left.
 */
export function placeFromCorner(corner: Point, size: Size, workArea: Rect): Rect {
  const maxX = workArea.x + workArea.width - size.width
  const maxY = workArea.y + workArea.height - size.height
  const x = Math.max(workArea.x, Math.min(corner.x - size.width, maxX))
  const y = Math.max(workArea.y, Math.min(corner.y, maxY))
  return { x: Math.round(x), y: Math.round(y), width: size.width, height: size.height }
}

/** Convert the pre-anchor format (top-left vs. display bounds) to an anchor. */
export function anchorFromLegacy(
  legacy: LegacyPosition,
  displayBounds: Rect,
  display: DisplayInfo,
  width: number,
): StoredAnchor {
  return anchorFromBounds(
    {
      x: displayBounds.x + legacy.relX,
      y: displayBounds.y + legacy.relY,
      width,
      height: 0,
    },
    display,
  )
}
