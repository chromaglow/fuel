import { app, Menu, nativeImage, Tray, type BrowserWindow } from 'electron'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

import type { NudgeMode } from '@shared/types'

export interface TrayHandlers {
  isInteractive: () => boolean
  setInteractive: (on: boolean) => void
  isOpenAtLogin: () => boolean
  setOpenAtLogin: (on: boolean) => void
  moveToDisplay: (displayId: number) => void
  listDisplays: () => Array<{ id: number; label: string; current: boolean }>
  nudgeMode: () => NudgeMode
  setNudgeMode: (mode: NudgeMode) => void
  isProxyEnabled: () => boolean
  setProxyEnabled: (on: boolean) => void
  prewarm: () => void
}

function iconPath(): string {
  // Packaged builds resolve against resources/; dev runs from the repo root.
  const candidates = [
    join(process.resourcesPath ?? '', 'build', 'tray-32.png'),
    join(app.getAppPath(), 'build', 'tray-32.png'),
    join(process.cwd(), 'build', 'tray-32.png'),
  ]
  return candidates.find((p) => p && existsSync(p)) ?? candidates[2]!
}

export function createTray(win: BrowserWindow, h: TrayHandlers): Tray {
  const image = nativeImage
    .createFromPath(iconPath())
    .resize({ width: 16, height: 16 })
  image.setTemplateImage(false)

  const tray = new Tray(image)
  tray.setToolTip('fuel — local offload telemetry')

  const rebuild = (): void => {
    const menu = Menu.buildFromTemplate([
      {
        label: win.isVisible() ? 'Hide HUD' : 'Show HUD',
        click: () => {
          win.isVisible() ? win.hide() : win.showInactive()
          rebuild()
        },
      },
      {
        label: 'Interactive (click-through off)',
        type: 'checkbox',
        checked: h.isInteractive(),
        accelerator: 'Ctrl+Alt+I',
        click: (item) => h.setInteractive(item.checked),
      },
      { type: 'separator' },
      {
        label: 'Move to display',
        submenu: h.listDisplays().map((d) => ({
          label: d.label,
          type: 'radio' as const,
          checked: d.current,
          click: () => h.moveToDisplay(d.id),
        })),
      },
      {
        label: 'Nudges',
        submenu: (['live', 'shadow', 'off'] as const).map((mode) => ({
          label:
            mode === 'live'
              ? 'Live (show unburned fuel)'
              : mode === 'shadow'
                ? 'Shadow (record only, calibrating)'
                : 'Off',
          type: 'radio' as const,
          checked: h.nudgeMode() === mode,
          click: () => h.setNudgeMode(mode),
        })),
      },
      { type: 'separator' },
      {
        label: 'Valve — force context, in-path (advanced)',
        type: 'checkbox',
        checked: h.isProxyEnabled(),
        // Load-bearing once on: fuel sits in front of Ollama. Requires Ollama
        // relocated first (node integrations/valve.mjs hook); enabling is a
        // no-op with a warning until the upstream answers. rebuild() reflects
        // whether it actually engaged.
        click: () => {
          h.setProxyEnabled(!h.isProxyEnabled())
          rebuild()
        },
      },
      {
        label: 'Pre-warm model now',
        enabled: h.isProxyEnabled(),
        click: () => h.prewarm(),
      },
      { type: 'separator' },
      {
        label: 'Launch at login',
        type: 'checkbox',
        checked: h.isOpenAtLogin(),
        click: (item) => h.setOpenAtLogin(item.checked),
      },
      { type: 'separator' },
      { label: 'Quit fuel', accelerator: 'Ctrl+Alt+Q', click: () => app.quit() },
    ])
    tray.setContextMenu(menu)
  }

  rebuild()
  // Left-click toggles visibility; the menu is on right-click.
  tray.on('click', () => {
    win.isVisible() ? win.hide() : win.showInactive()
    rebuild()
  })

  return Object.assign(tray, { rebuild }) as Tray & { rebuild: () => void }
}
