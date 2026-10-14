/**
 * Fx Studio settings (2026-10-14): every dial on the gauge's effects, saved in
 * localStorage under FX_KEY. The HUD and the studio window share it (both are
 * file:// pages in the same session), and the HUD listens for 'storage' events,
 * so a slider in the studio changes the live gauge at once.
 *
 * FX_SCHEMA describes the controls; the studio builds its form from it, and
 * normalizeFx clamps anything stored to the schema's ranges.
 */

export const FX_KEY = 'fuel.fx'

export interface FxConfig {
  v: 1
  /** Master switch: off is Calm (tiers and moments stay, the lively effects go). */
  enabled: boolean
  card: { opacity: number }
  global: { intensity: number; fpsWorking: number; fpsIdle: number }
  head: { on: boolean; size: number; glow: number; flicker: boolean; color: string }
  flames: { on: boolean; amount: number; height: number; size: number; colors: 'tier' | 'fire' | 'custom'; custom: string }
  sparkles: { on: boolean; amount: number; size: number; lapShower: number }
  explosions: { on: boolean; onLap: boolean; onMilestone: boolean; amount: number; power: number }
  lasers: { on: boolean; onLap: boolean; whileWorking: boolean; count: number; length: number; color: string; useTier: boolean }
  confetti: { on: boolean; onMilestone: boolean; onLap: boolean; amount: number }
  ripples: { on: boolean; strength: number }
  number: { roll: boolean; rollSpeed: number; pop: boolean; delta: boolean }
  names: { on: boolean }
}

export const DEFAULT_FX: FxConfig = {
  v: 1,
  enabled: true,
  card: { opacity: 0.9 },
  global: { intensity: 1, fpsWorking: 30, fpsIdle: 10 },
  head: { on: true, size: 1, glow: 1, flicker: true, color: '#ffffff' },
  flames: { on: true, amount: 1, height: 1, size: 1, colors: 'tier', custom: '#f97316' },
  sparkles: { on: true, amount: 1, size: 1, lapShower: 16 },
  explosions: { on: true, onLap: true, onMilestone: true, amount: 50, power: 1 },
  lasers: { on: true, onLap: true, whileWorking: false, count: 6, length: 90, color: '#67e8f9', useTier: true },
  confetti: { on: true, onMilestone: true, onLap: false, amount: 46 },
  ripples: { on: true, strength: 1 },
  number: { roll: true, rollSpeed: 1, pop: true, delta: true },
  names: { on: true },
}

export type FxField =
  | { key: string; label: string; type: 'toggle' }
  | { key: string; label: string; type: 'range'; min: number; max: number; step: number }
  | { key: string; label: string; type: 'color' }
  | { key: string; label: string; type: 'select'; options: readonly { value: string; label: string }[] }

export interface FxSection {
  id: keyof Omit<FxConfig, 'v' | 'enabled'>
  title: string
  hint: string
  fields: readonly FxField[]
}

export const FX_SCHEMA: readonly FxSection[] = [
  { id: 'card', title: 'Card', hint: 'How see-through the gauge is.', fields: [{ key: 'opacity', label: 'Opacity', type: 'range', min: 0.5, max: 1, step: 0.01 }] },
  {
    id: 'global',
    title: 'Everything',
    hint: 'Turns every effect up or down, and how smooth they run.',
    fields: [
      { key: 'intensity', label: 'Intensity', type: 'range', min: 0.25, max: 2, step: 0.05 },
      { key: 'fpsWorking', label: 'Frames a second, working', type: 'range', min: 10, max: 60, step: 5 },
      { key: 'fpsIdle', label: 'Frames a second, idle', type: 'range', min: 0, max: 30, step: 1 },
    ],
  },
  {
    id: 'head',
    title: 'White-hot head',
    hint: 'The glowing tip of the bar as it travels.',
    fields: [
      { key: 'on', label: 'On', type: 'toggle' },
      { key: 'size', label: 'Size', type: 'range', min: 0.5, max: 2.5, step: 0.05 },
      { key: 'glow', label: 'Glow', type: 'range', min: 0, max: 3, step: 0.05 },
      { key: 'flicker', label: 'Flicker', type: 'toggle' },
      { key: 'color', label: 'Core colour', type: 'color' },
    ],
  },
  {
    id: 'flames',
    title: 'Flames',
    hint: 'Fire rising from behind the dial, taller as the day builds.',
    fields: [
      { key: 'on', label: 'On', type: 'toggle' },
      { key: 'amount', label: 'Amount', type: 'range', min: 0, max: 3, step: 0.05 },
      { key: 'height', label: 'Height', type: 'range', min: 0.3, max: 2.5, step: 0.05 },
      { key: 'size', label: 'Size', type: 'range', min: 0.5, max: 2.5, step: 0.05 },
      { key: 'colors', label: 'Colours', type: 'select', options: [{ value: 'tier', label: "The tier's" }, { value: 'fire', label: 'Always fire' }, { value: 'custom', label: 'My colour' }] },
      { key: 'custom', label: 'My colour', type: 'color' },
    ],
  },
  {
    id: 'sparkles',
    title: 'Sparkles',
    hint: 'Star glints twinkling around the dial.',
    fields: [
      { key: 'on', label: 'On', type: 'toggle' },
      { key: 'amount', label: 'Amount', type: 'range', min: 0, max: 4, step: 0.05 },
      { key: 'size', label: 'Size', type: 'range', min: 0.5, max: 3, step: 0.05 },
      { key: 'lapShower', label: 'Shower on a lap', type: 'range', min: 0, max: 60, step: 1 },
    ],
  },
  {
    id: 'explosions',
    title: 'Explosions',
    hint: 'A burst of sparks from the head.',
    fields: [
      { key: 'on', label: 'On', type: 'toggle' },
      { key: 'onLap', label: 'On every lap', type: 'toggle' },
      { key: 'onMilestone', label: 'On milestones', type: 'toggle' },
      { key: 'amount', label: 'Sparks', type: 'range', min: 10, max: 200, step: 5 },
      { key: 'power', label: 'Power', type: 'range', min: 0.3, max: 3, step: 0.05 },
    ],
  },
  {
    id: 'lasers',
    title: 'Lasers',
    hint: 'Beams fired out from the head.',
    fields: [
      { key: 'on', label: 'On', type: 'toggle' },
      { key: 'onLap', label: 'On every lap', type: 'toggle' },
      { key: 'whileWorking', label: 'Keep firing while working', type: 'toggle' },
      { key: 'count', label: 'Beams', type: 'range', min: 1, max: 16, step: 1 },
      { key: 'length', label: 'Length', type: 'range', min: 20, max: 200, step: 5 },
      { key: 'useTier', label: "In the tier's colour", type: 'toggle' },
      { key: 'color', label: 'Beam colour', type: 'color' },
    ],
  },
  {
    id: 'confetti',
    title: 'Confetti',
    hint: 'Thrown at $10, $25, $50, $100 and up, the first time each day.',
    fields: [
      { key: 'on', label: 'On', type: 'toggle' },
      { key: 'onMilestone', label: 'On milestones', type: 'toggle' },
      { key: 'onLap', label: 'On every lap too', type: 'toggle' },
      { key: 'amount', label: 'Pieces', type: 'range', min: 10, max: 200, step: 5 },
    ],
  },
  {
    id: 'ripples',
    title: 'Ripples',
    hint: 'A ring of light when a lap completes.',
    fields: [
      { key: 'on', label: 'On', type: 'toggle' },
      { key: 'strength', label: 'Strength', type: 'range', min: 0.3, max: 3, step: 0.05 },
    ],
  },
  {
    id: 'number',
    title: 'The number',
    hint: 'The dollar figure in the middle.',
    fields: [
      { key: 'roll', label: 'Rolls up like an odometer', type: 'toggle' },
      { key: 'rollSpeed', label: 'Roll speed', type: 'range', min: 0.3, max: 3, step: 0.05 },
      { key: 'pop', label: 'Pops when it grows', type: 'toggle' },
      { key: 'delta', label: 'Floats the "+$" added', type: 'toggle' },
    ],
  },
  { id: 'names', title: 'Names', hint: '"GOLD LAP", "$25 DAY" and friends.', fields: [{ key: 'on', label: 'On', type: 'toggle' }] },
]

/** Quick looks for the studio's preset buttons. */
export const FX_PRESETS: Record<string, (base: FxConfig) => FxConfig> = {
  Calm: (b) => ({ ...b, enabled: false }),
  Lively: () => structuredClone(DEFAULT_FX),
  Party: (b) => ({
    ...b,
    enabled: true,
    global: { ...b.global, intensity: 1.6 },
    flames: { ...b.flames, on: true, amount: 2, height: 1.6 },
    sparkles: { ...b.sparkles, on: true, amount: 3, lapShower: 50 },
    explosions: { ...b.explosions, on: true, onLap: true, amount: 140, power: 1.8 },
    lasers: { ...b.lasers, on: true, onLap: true, count: 12 },
    confetti: { ...b.confetti, on: true, onLap: true, amount: 120 },
    ripples: { ...b.ripples, on: true, strength: 2 },
  }),
  'Laser show': (b) => ({
    ...b,
    enabled: true,
    lasers: { ...b.lasers, on: true, onLap: true, whileWorking: true, count: 10, length: 160 },
    head: { ...b.head, on: true, size: 1.6, glow: 2.2 },
  }),
  Inferno: (b) => ({
    ...b,
    enabled: true,
    flames: { ...b.flames, on: true, amount: 3, height: 2.4, size: 2, colors: 'fire' },
    head: { ...b.head, on: true, size: 1.8, glow: 2.6 },
  }),
}

const HEX = /^#[0-9a-f]{6}$/i

/** Anything stored, made safe: missing fields take the defaults, numbers are clamped to the schema. */
export function normalizeFx(raw: unknown): FxConfig {
  const out = structuredClone(DEFAULT_FX)
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  if (typeof r.enabled === 'boolean') out.enabled = r.enabled
  for (const section of FX_SCHEMA) {
    const src = (r[section.id] && typeof r[section.id] === 'object' ? r[section.id] : {}) as Record<string, unknown>
    const dst = out[section.id] as Record<string, unknown>
    for (const f of section.fields) {
      const v = src[f.key]
      if (f.type === 'toggle' && typeof v === 'boolean') dst[f.key] = v
      else if (f.type === 'range' && typeof v === 'number' && Number.isFinite(v)) dst[f.key] = Math.min(f.max, Math.max(f.min, v))
      else if (f.type === 'color' && typeof v === 'string' && HEX.test(v)) dst[f.key] = v.toLowerCase()
      else if (f.type === 'select' && typeof v === 'string' && f.options.some((o) => o.value === v)) dst[f.key] = v
    }
  }
  return out
}

export function loadFx(): FxConfig {
  try {
    const raw = localStorage.getItem(FX_KEY)
    if (raw) return normalizeFx(JSON.parse(raw))
    // Before the studio, Calm was its own switch: carry it over.
    if (localStorage.getItem('fuel.effects') === 'calm') return { ...structuredClone(DEFAULT_FX), enabled: false }
  } catch {
    // Unreadable: the defaults.
  }
  return structuredClone(DEFAULT_FX)
}

export function saveFx(cfg: FxConfig): void {
  try {
    localStorage.setItem(FX_KEY, JSON.stringify(cfg))
  } catch {
    // Storage refused: the change holds until the window closes.
  }
}

/** '#ff9900' -> [255, 153, 0] */
export function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
