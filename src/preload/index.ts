import { contextBridge, ipcRenderer } from 'electron'
import type { HudState } from '../shared/types.js'

/** The entire surface the renderer is allowed to touch. */
const api = {
  onState(cb: (state: HudState) => void): () => void {
    const handler = (_e: unknown, state: HudState): void => cb(state)
    ipcRenderer.on('fuel:state', handler)
    return () => ipcRenderer.removeListener('fuel:state', handler)
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
