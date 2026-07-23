import { contextBridge, ipcRenderer } from 'electron'
import type { CatchStats, HudState, Nudge, RecentEvent, ReceiptRecord } from '../shared/types.js'

/** The entire surface the renderer is allowed to touch. */
const api = {
  onState(cb: (state: HudState) => void): () => void {
    const handler = (_e: unknown, state: HudState): void => cb(state)
    ipcRenderer.on('fuel:state', handler)
    return () => ipcRenderer.removeListener('fuel:state', handler)
  },
  onInteractive(cb: (on: boolean) => void): () => void {
    const handler = (_e: unknown, on: boolean): void => cb(on)
    ipcRenderer.on('fuel:interactive', handler)
    return () => ipcRenderer.removeListener('fuel:interactive', handler)
  },
  /** Hover state is detected in main by polling the cursor (see window.ts). */
  onExpanded(cb: (expanded: boolean) => void): () => void {
    const handler = (_e: unknown, expanded: boolean): void => cb(expanded)
    ipcRenderer.on('fuel:expanded', handler)
    return () => ipcRenderer.removeListener('fuel:expanded', handler)
  },
  recentEvents(): Promise<RecentEvent[]> {
    return ipcRenderer.invoke('fuel:recent-events')
  },
  recentNudges(): Promise<Nudge[]> {
    return ipcRenderer.invoke('fuel:recent-nudges')
  },
  catchStats(): Promise<CatchStats> {
    return ipcRenderer.invoke('fuel:catch-stats')
  },
  recentReceipts(): Promise<ReceiptRecord[]> {
    return ipcRenderer.invoke('fuel:recent-receipts')
  },
  models(): Promise<string[]> {
    return ipcRenderer.invoke('fuel:models')
  },
  clearTruncation(): Promise<boolean> {
    return ipcRenderer.invoke('fuel:clear-truncation')
  },
  quit(): void {
    ipcRenderer.send('fuel:quit')
  },
}

contextBridge.exposeInMainWorld('fuel', api)

export type FuelApi = typeof api
