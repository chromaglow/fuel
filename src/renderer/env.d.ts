import type { FuelApi } from '../preload/index.js'

declare global {
  interface Window {
    fuel: FuelApi
  }
}

export {}
