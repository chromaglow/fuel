import {
  clamp01,
  COLORS,
  CX,
  CY,
  lapColor,
  LAP_COLORS,
  R_RING,
  rgba,
  START_ANGLE,
  SWEEP,
  W_RING,
} from '../theme.js'
import { tierForLap, type Tier } from '../tiers.js'
import { DEFAULT_FX, hexRgb, type FxConfig } from '../fx-config.js'

type Rgb = readonly [number, number, number]

/** The Fx Studio's dials (fx-config.ts); the HUD and the studio set them. */
let cfg: FxConfig = DEFAULT_FX
export function setRingConfig(next: FxConfig): void {
  cfg = next
}
/** The studio's master intensity, applied to every lively effect. */
const fxK = (): number => cfg.global.intensity

export interface RingOptions {
  /**
   * Multiples of the daily goal, unbounded. 0.4 = 40% of lap one; 2.3 = 30%
   * into lap three. The integer part picks the colour (or tier), the fraction the sweep.
   */
  progress: number
  /** Dims the whole ring when the HUD is idle. */
  intensity: number
  /** A clock in ms for the moving tiers (drift, shimmer, breathing). */
  t: number
  /** Reduced motion: every tier draws its still version, with no particles. */
  still: boolean
}

/**
 * The centre ring: cumulative budget preserved today, filling toward the
 * daily goal. This is the headline metric, so it gets the glow.
 *
 * One ring, lapping. Reaching the goal empties the sweep and starts again in
 * the next lap colour (red → orange → yellow → green → blue → purple), and the
 * lap just completed stays on the track as a faint tint so a rollover is
 * visible even mid-lap. From the seventh lap it climbs a ladder of tiers
 * (tiers.ts) that get livelier the more is preserved: Aurora drifts, Shimmer
 * glints, Gold grows a comet head that sheds sparks, Prism turns the whole
 * spectrum, Plasma breathes and throws embers.
 */
export function drawRing(ctx: CanvasRenderingContext2D, { progress, intensity, t, still }: RingOptions): void {
  const p = Math.max(0, progress)
  const lap = Math.floor(p)
  const filled = clamp01(p - lap)
  const tier = tierForLap(lap)
  const clock = still ? 0 : t

  // Track: neutral on the first lap, otherwise the colour of the lap that was
  // just completed — the ring "remembers" it rolled over.
  ctx.beginPath()
  ctx.arc(CX, CY, R_RING, START_ANGLE, START_ANGLE + SWEEP)
  ctx.strokeStyle = lap > 0 ? rgba(lookOf(lap - 1), 0.28) : COLORS.track
  ctx.lineWidth = W_RING
  ctx.lineCap = 'round'
  ctx.stroke()

  drawRipples(ctx, intensity)
  head = null
  fill = { end: START_ANGLE + SWEEP * filled, tier }
  if (filled <= 0.001) return

  const end = START_ANGLE + SWEEP * filled
  const glow = tier.id === 'solid' ? lapColor(lap) : tier.color
  // Plasma breathes: its glow swells and settles every ~4 s.
  const breathe = tier.id === 'plasma' ? 0.5 + 0.5 * Math.sin(clock / 700) : 0

  ctx.save()
  ctx.shadowColor = rgba(glow, (0.55 + 0.3 * breathe) * intensity)
  ctx.shadowBlur = (16 + 14 * breathe) * intensity
  ctx.beginPath()
  ctx.arc(CX, CY, R_RING, START_ANGLE, end)
  ctx.strokeStyle = fillStyle(ctx, tier, lap, clock)
  ctx.lineWidth = W_RING
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.restore()

  if (tier.id === 'shimmer' && !still) drawGlint(ctx, end, clock, intensity)
  const hot = cfg.enabled && cfg.head.on
  if (tier.id === 'gold' || tier.id === 'prism' || tier.id === 'plasma') {
    const tail = tier.id === 'plasma' ? 0.55 : tier.id === 'gold' ? 0.25 : 0.18
    drawComet(ctx, end, tail, tier.id === 'plasma' ? [255, 228, 255] : tier.id === 'gold' ? [255, 247, 204] : [255, 255, 255], intensity, !hot)
  }
  if (hot) drawHotHead(ctx, end, glow, clock, intensity, still)
  head = { x: CX + R_RING * Math.cos(end), y: CY + R_RING * Math.sin(end), angle: end, tier }
}

/**
 * The white-hot head: a blazing core at the leading edge of the bar with a
 * halo in the lap's colour, flickering like something molten.
 */
function drawHotHead(ctx: CanvasRenderingContext2D, end: number, glow: Rgb, clock: number, intensity: number, still: boolean): void {
  const x = CX + R_RING * Math.cos(end)
  const y = CY + R_RING * Math.sin(end)
  const flick = cfg.head.flicker && !still ? 1 + 0.1 * Math.sin(clock / 37) + 0.06 * Math.sin(clock / 13.3) : 1
  const r = W_RING * 0.62 * cfg.head.size * flick
  const core = hexRgb(cfg.head.color)
  const k = Math.max(0.5, intensity) * fxK()
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const reach = r * (2.2 + 1.6 * cfg.head.glow)
  const halo = ctx.createRadialGradient(x, y, 0, x, y, reach)
  halo.addColorStop(0, rgba(glow, Math.min(1, 0.5 * cfg.head.glow * k)))
  halo.addColorStop(0.4, rgba(glow, Math.min(1, 0.18 * cfg.head.glow * k)))
  halo.addColorStop(1, rgba(glow, 0))
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(x, y, reach, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.save()
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(core, 1))
  g.addColorStop(0.6, rgba(core, 0.92))
  g.addColorStop(1, rgba(glow, 0.15))
  ctx.fillStyle = g
  ctx.shadowColor = rgba(core, Math.min(1, 0.9 * k))
  ctx.shadowBlur = 12 * cfg.head.glow * k
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** The colour a completed lap leaves on the track. */
function lookOf(lap: number): Rgb {
  return lap < LAP_COLORS.length ? lapColor(lap) : tierForLap(lap).color
}

/** A conic gradient around the gauge's centre, its stops rotated by `turn` (0..1). */
function conic(ctx: CanvasRenderingContext2D, stops: Rgb[], turn: number): CanvasGradient {
  const g = ctx.createConicGradient(START_ANGLE + turn * Math.PI * 2, CX, CY)
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), rgba(c, 1)))
  return g
}

/** Top-to-bottom light/dark falloff in two colours. */
function vertical(ctx: CanvasRenderingContext2D, top: Rgb, bottom: Rgb): CanvasGradient {
  const g = ctx.createLinearGradient(0, CY - R_RING, 0, CY + R_RING)
  g.addColorStop(0, rgba(top, 1))
  g.addColorStop(1, rgba(bottom, 1))
  return g
}

function fillStyle(ctx: CanvasRenderingContext2D, tier: Tier, lap: number, clock: number): CanvasGradient {
  switch (tier.id) {
    case 'aurora':
      return conic(ctx, [[99, 102, 241], [167, 139, 250], [34, 211, 238], [99, 102, 241]], clock / 20000)
    case 'shimmer':
      return vertical(ctx, [221, 214, 254], [124, 58, 237])
    case 'gold': {
      const g = ctx.createLinearGradient(0, CY - R_RING, 0, CY + R_RING)
      g.addColorStop(0, '#fde68a')
      g.addColorStop(0.45, '#f59e0b')
      g.addColorStop(1, '#b45309')
      return g
    }
    case 'prism':
      return conic(ctx, [[248, 113, 113], [251, 146, 60], [251, 191, 36], [74, 222, 128], [34, 211, 238], [96, 165, 250], [192, 132, 252], [248, 113, 113]], clock / 12000)
    case 'plasma':
      return conic(ctx, [[192, 38, 211], [244, 114, 182], [255, 240, 255], [217, 70, 239], [192, 38, 211]], clock / 8000)
    default: {
      // The solid laps: the same light/dark falloff as always, in the lap's own hue.
      const c = lapColor(lap)
      return vertical(ctx, c, [Math.round(c[0] * 0.62), Math.round(c[1] * 0.62), Math.round(c[2] * 0.62)])
    }
  }
}

/** Shimmer: a highlight slides along the filled arc every few seconds. */
function drawGlint(ctx: CanvasRenderingContext2D, end: number, clock: number, intensity: number): void {
  const PERIOD = 3500
  const phase = (clock % PERIOD) / PERIOD
  if (phase > 0.6) return
  const k = phase / 0.6
  const at = START_ANGLE + (end - START_ANGLE) * k
  ctx.save()
  ctx.beginPath()
  ctx.arc(CX, CY, R_RING, Math.max(START_ANGLE, at - 0.22), at)
  ctx.strokeStyle = `rgba(255, 255, 255, ${(0.6 * Math.sin(Math.PI * k) * intensity).toFixed(3)})`
  ctx.lineWidth = W_RING - 3
  ctx.lineCap = 'round'
  ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'
  ctx.shadowBlur = 10 * intensity
  ctx.stroke()
  ctx.restore()
}

/** A bright head at the leading edge, with a tail that fades back along the arc. */
function drawComet(ctx: CanvasRenderingContext2D, end: number, tail: number, color: Rgb, intensity: number, withHead = true): void {
  const STEPS = 8
  ctx.save()
  ctx.lineCap = 'round'
  for (let i = 0; i < STEPS; i++) {
    const a0 = end - tail * ((i + 1) / STEPS)
    const a1 = end - tail * (i / STEPS)
    if (a1 <= START_ANGLE) break
    ctx.beginPath()
    ctx.arc(CX, CY, R_RING, Math.max(START_ANGLE, a0), a1)
    ctx.strokeStyle = rgba(color, 0.5 * (1 - i / STEPS) * intensity)
    ctx.lineWidth = W_RING - 2
    ctx.stroke()
  }
  if (!withHead) {
    ctx.restore()
    return
  }
  ctx.beginPath()
  ctx.arc(CX + R_RING * Math.cos(end), CY + R_RING * Math.sin(end), W_RING * 0.55, 0, Math.PI * 2)
  ctx.fillStyle = rgba(color, 0.95 * Math.max(0.4, intensity))
  ctx.shadowColor = rgba(color, intensity)
  ctx.shadowBlur = 14 * intensity
  ctx.fill()
  ctx.restore()
}

// ---------------------------------------------------------------- moments

interface Ripple {
  age: number
  dur: number
  color: Rgb
  /** 1 for a lap completed, 2 for a new tier or a record. */
  strength: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  color: Rgb
  size: number
  /** Explosion sparks slow down and fall a little; steady sparks don't. */
  drag?: number
}

const ripples: Ripple[] = []
const particles: Particle[] = []
const MAX_PARTICLES = 80
/** Explosions may go past the steady sparks' cap, up to this. */
const MAX_BURST_PARTICLES = 320
/** Where the comet head was last drawn, so sparks leave from it. */
let head: { x: number; y: number; angle: number; tier: Tier } | null = null
let spawnDebt = 0
/** The filled arc's end and today's tier, from the last draw: where flames and glints come from. */
let fill: { end: number; tier: Tier } = { end: START_ANGLE, tier: tierForLap(0) }

/** A ring of light around the gauge: a lap completed (1), a new tier or a record (2). */
export function ringRipple(strength: 1 | 2, color: Rgb): void {
  if (!cfg.ripples.on) return
  ripples.push({ age: 0, dur: strength === 2 ? 1100 : 700, color, strength })
  if (strength === 2) ripples.push({ age: -180, dur: 1100, color, strength: 1.4 })
}

/** A short burst is playing (a ripple or confetti): worth smooth frames while it lasts. */
export const ringBurstAlive = (): boolean => ripples.length > 0 || confetti.length > 0 || lasers.length > 0

/** Anything still moving that needs frames even if the ring itself is still. */
export const ringFxAlive = (): boolean => ripples.length > 0 || particles.length > 0 || flames.length > 0 || twinkles.length > 0 || confetti.length > 0 || lasers.length > 0

/** Advance ripples and particles by `dt` ms; Gold sheds sparks, Plasma embers. */
export function stepRingFx(dt: number, intensity: number, still: boolean): void {
  stepLively(dt, intensity, still)
  for (const r of ripples) r.age += dt
  for (let i = ripples.length - 1; i >= 0; i--) if (ripples[i]!.age >= ripples[i]!.dur) ripples.splice(i, 1)

  for (const pt of particles) {
    pt.age += dt
    pt.x += (pt.vx * dt) / 1000
    pt.y += (pt.vy * dt) / 1000
    if (pt.drag) {
      pt.vx *= 1 - pt.drag * dt
      pt.vy = pt.vy * (1 - pt.drag * dt) + (60 * dt) / 1000
    }
  }
  for (let i = particles.length - 1; i >= 0; i--) if (particles[i]!.age >= particles[i]!.life) particles.splice(i, 1)

  if (still || !head || intensity <= 0.05) return
  const sparks = head.tier.id === 'gold'
  const embers = head.tier.id === 'plasma'
  if (!sparks && !embers) return
  spawnDebt += ((sparks ? 9 : 14) * intensity * dt) / 1000
  while (spawnDebt >= 1 && particles.length < MAX_PARTICLES) {
    spawnDebt -= 1
    // Outward from the ring at the head, with some scatter; embers also float up.
    const out = head.angle + (Math.random() - 0.5) * 1.2
    const speed = sparks ? 28 + Math.random() * 30 : 10 + Math.random() * 14
    particles.push({
      x: head.x,
      y: head.y,
      vx: Math.cos(out) * speed,
      vy: Math.sin(out) * speed - (embers ? 12 : 0),
      age: 0,
      life: sparks ? 600 + Math.random() * 300 : 1200 + Math.random() * 600,
      color: sparks ? [253, 224, 71] : Math.random() < 0.5 ? [244, 114, 182] : [250, 232, 255],
      size: sparks ? 1.1 : 1.4,
    })
  }
  spawnDebt = Math.min(spawnDebt, 1)
}

function drawRipples(ctx: CanvasRenderingContext2D, intensity: number): void {
  const k = Math.max(0.45, intensity)
  for (const r of ripples) {
    if (r.age < 0) continue
    const f = r.age / r.dur
    ctx.save()
    ctx.beginPath()
    ctx.arc(CX, CY, R_RING + f * 16 * r.strength * cfg.ripples.strength, START_ANGLE, START_ANGLE + SWEEP)
    ctx.strokeStyle = rgba(r.color, Math.min(1, 0.6 * (1 - f) * k * Math.sqrt(cfg.ripples.strength) * fxK()))
    ctx.lineWidth = 1 + 3 * (1 - f)
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()
  }
}

/** Sparks and embers, drawn last so they float over the ring. */
export function drawRingParticles(ctx: CanvasRenderingContext2D, intensity: number): void {
  if (!particles.length) return
  ctx.save()
  for (const pt of particles) {
    const f = pt.age / pt.life
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, pt.size * (1 - 0.5 * f), 0, Math.PI * 2)
    ctx.fillStyle = rgba(pt.color, Math.min(1, (1 - f) * Math.max(0.4, intensity) * fxK()))
    ctx.fill()
  }
  ctx.restore()
}

// ------------------------------------------------- lively (2026-10-14, round 2)
//
// Excitement from the first dollar, not just the later tiers: flames licking up
// from behind the dial, star glints twinkling around it, sparkle showers when a
// lap completes and confetti at the day's milestones. `heat` (0..1, set by the
// HUD from today's laps) scales all of it; Calm turns it off.

interface Flame {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  size: number
  palette: readonly Rgb[]
  wobble: number
}

interface Twinkle {
  x: number
  y: number
  age: number
  life: number
  size: number
  color: Rgb
}

interface Confetto {
  x: number
  y: number
  vx: number
  vy: number
  spin: number
  angle: number
  age: number
  life: number
  color: Rgb
}

const flames: Flame[] = []
const twinkles: Twinkle[] = []
const confetti: Confetto[] = []
const MAX_FLAMES = 140
const MAX_TWINKLES = 40
let heat = 0
let lively = true
let flameDebt = 0
let twinkleDebt = 0

/** Today's heat (0..1) and whether the lively effects are on. */
export function setRingFx(nextHeat: number, nextLively: boolean): void {
  heat = clamp01(nextHeat)
  lively = nextLively
}

/** True while the lively effects want frames: flames burn whenever there's heat. */
export const ringLively = (): boolean => lively && heat > 0 && (cfg.flames.on || cfg.sparkles.on || (cfg.lasers.on && cfg.lasers.whileWorking) || cfg.head.on)

/** Flame colours by tier, hot core first: fire on the solid laps, then the tier's own hue. */
const FIRE: Record<string, readonly Rgb[]> = {
  solid: [[255, 244, 214], [251, 191, 36], [249, 115, 22], [185, 28, 28]],
  aurora: [[224, 231, 255], [129, 140, 248], [99, 102, 241], [55, 48, 163]],
  shimmer: [[250, 245, 255], [216, 180, 254], [168, 85, 247], [88, 28, 135]],
  gold: [[255, 251, 235], [253, 224, 71], [245, 158, 11], [146, 64, 14]],
  plasma: [[255, 240, 255], [244, 114, 182], [217, 70, 239], [112, 26, 117]],
}
const PRISM: readonly (readonly Rgb[])[] = [FIRE.solid!, FIRE.aurora!, FIRE.gold!, FIRE.plasma!, [[236, 253, 245], [110, 231, 183], [16, 185, 129], [6, 95, 70]]]

function paletteFor(tier: Tier): readonly Rgb[] {
  if (cfg.flames.colors === 'fire') return FIRE.solid!
  if (cfg.flames.colors === 'custom') return customFire(cfg.flames.custom)
  if (tier.id === 'prism') return PRISM[Math.floor(Math.random() * PRISM.length)]!
  return FIRE[tier.id] ?? FIRE.solid!
}

let customCache: { hex: string; palette: readonly Rgb[] } | null = null
/** A flame palette from one colour: near-white core, the colour, then darker as it cools. */
function customFire(hex: string): readonly Rgb[] {
  if (customCache?.hex === hex) return customCache.palette
  const c = hexRgb(hex)
  const mix = (t: number, to: number): Rgb => [Math.round(c[0] + (to - c[0]) * t), Math.round(c[1] + (to - c[1]) * t), Math.round(c[2] + (to - c[2]) * t)]
  const palette = [mix(0.8, 255), c, mix(0.4, 0), mix(0.7, 0)]
  customCache = { hex, palette }
  return palette
}

/** Along a palette, 0 = hot core, 1 = cooled. */
function along(palette: readonly Rgb[], f: number): Rgb {
  const x = clamp01(f) * (palette.length - 1)
  const i = Math.min(palette.length - 2, Math.floor(x))
  const k = x - i
  const a = palette[i]!
  const b = palette[i + 1]!
  return [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)]
}

/** A shower of glints from the dial: a lap completed. */
export function ringSparkle(count = cfg.sparkles.lapShower): void {
  if (!cfg.sparkles.on) return
  for (let i = 0; i < count && twinkles.length < MAX_TWINKLES + 60; i++) spawnTwinkle(true)
}

/** Confetti across the gauge: a milestone. */
export function ringConfetti(colors: readonly Rgb[]): void {
  if (!cfg.confetti.on) return
  for (let i = 0; i < cfg.confetti.amount && confetti.length < 400; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4
    const speed = 70 + Math.random() * 90
    confetti.push({
      x: CX + (Math.random() - 0.5) * 30,
      y: CY - 10,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      spin: (Math.random() - 0.5) * 12,
      angle: Math.random() * Math.PI,
      age: 0,
      life: 1600 + Math.random() * 900,
      color: colors[i % colors.length]!,
    })
  }
}

function spawnTwinkle(burst: boolean): void {
  const a = START_ANGLE + Math.random() * SWEEP
  const r = burst ? R_RING + 6 + Math.random() * 26 : 94 + Math.random() * 24
  twinkles.push({
    x: CX + r * Math.cos(a),
    y: CY + r * Math.sin(a),
    age: burst ? -Math.random() * 250 : 0,
    life: 500 + Math.random() * 600,
    size: (1.6 + Math.random() * (burst ? 3 : 2)) * cfg.sparkles.size,
    color: Math.random() < 0.6 ? [255, 255, 255] : fill.tier.id === 'solid' ? [253, 224, 71] : fill.tier.color,
  })
}

function stepLively(dt: number, intensity: number, still: boolean): void {
  for (const f of flames) {
    f.age += dt
    // Flicker: a little sideways wander, and they slow as they rise and cool.
    f.vx += Math.sin((f.age + f.wobble) / 90) * 0.9
    f.x += (f.vx * dt) / 1000
    f.y += (f.vy * dt) / 1000
    f.vy *= 1 - 0.0009 * dt
  }
  for (let i = flames.length - 1; i >= 0; i--) if (flames[i]!.age >= flames[i]!.life) flames.splice(i, 1)
  for (const t of twinkles) t.age += dt
  for (let i = twinkles.length - 1; i >= 0; i--) if (twinkles[i]!.age >= twinkles[i]!.life) twinkles.splice(i, 1)
  for (const c of confetti) {
    c.age += dt
    c.vy += (220 * dt) / 1000
    c.vx *= 1 - 0.0012 * dt
    c.x += (c.vx * dt) / 1000
    c.y += (c.vy * dt) / 1000
    c.angle += (c.spin * dt) / 1000
  }
  for (let i = confetti.length - 1; i >= 0; i--) if (confetti[i]!.age >= confetti[i]!.life) confetti.splice(i, 1)

  for (const l of lasers) l.age += dt
  for (let i = lasers.length - 1; i >= 0; i--) if (lasers[i]!.age >= lasers[i]!.life) lasers.splice(i, 1)

  if (still || !lively || heat <= 0 || intensity <= 0.05) return
  // Working, the fire roars; idle, it smoulders.
  const busy = intensity >= 0.7 ? 1 : 0.45
  // Lasers that keep firing while the card works: a beam or two from the head every so often.
  if (cfg.lasers.on && cfg.lasers.whileWorking && intensity >= 0.7 && head) {
    laserClock += dt
    if (laserClock >= 900) {
      laserClock = 0
      fireLasers(head.tier.id === 'solid' ? [253, 224, 71] : head.tier.color, head.x, head.y, head.angle, 1 + Math.floor(Math.random() * 2), 0.6)
    }
  }
  if (!cfg.flames.on) flameDebt = 0
  else flameDebt += ((18 + 70 * heat) * busy * cfg.flames.amount * dt) / 1000
  while (flameDebt >= 1 && flames.length < MAX_FLAMES) {
    flameDebt -= 1
    // From behind the whole dial, thickest along the filled part.
    const span = fill.end - START_ANGLE
    const a = Math.random() < 0.7 && span > 0.05 ? START_ANGLE + Math.random() * span : START_ANGLE + Math.random() * SWEEP
    const r = R_RING + W_RING / 2 - 1
    const lift = (26 + Math.random() * 30) * (0.7 + heat) * cfg.flames.height
    flames.push({
      x: CX + r * Math.cos(a),
      y: CY + r * Math.sin(a),
      vx: Math.cos(a) * 8 + (Math.random() - 0.5) * 8,
      vy: Math.sin(a) * 8 - lift,
      age: 0,
      life: (380 + Math.random() * 420) * (0.75 + 0.5 * heat) * (0.7 + 0.3 * cfg.flames.height),
      size: (2.2 + Math.random() * 2.4) * (0.8 + 0.6 * heat) * cfg.flames.size,
      palette: paletteFor(fill.tier),
      wobble: Math.random() * 1000,
    })
  }
  flameDebt = Math.min(flameDebt, 2)
  if (!cfg.sparkles.on) twinkleDebt = 0
  else twinkleDebt += ((1.2 + 6 * heat) * busy * cfg.sparkles.amount * dt) / 1000
  while (twinkleDebt >= 1 && twinkles.length < MAX_TWINKLES * Math.max(1, cfg.sparkles.amount)) {
    twinkleDebt -= 1
    spawnTwinkle(false)
  }
  twinkleDebt = Math.min(twinkleDebt, 1)
}

/** Flames, drawn before everything else so they rise from behind the dial. */
export function drawRingBack(ctx: CanvasRenderingContext2D, intensity: number): void {
  if (!flames.length) return
  const k = Math.max(0.5, intensity) * fxK()
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const f of flames) {
    const life = f.age / f.life
    // Swells as it catches, then shrinks as it cools.
    const size = f.size * (life < 0.25 ? 0.6 + 1.6 * life : 1 - 0.7 * (life - 0.25))
    const c = along(f.palette, life)
    // A tongue, not a blob: the glow is stretched tall, and leans with its drift.
    ctx.save()
    ctx.translate(f.x, f.y)
    ctx.rotate(Math.atan2(f.vx, -f.vy) * 0.6)
    ctx.scale(0.75, 1.9)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2.2)
    g.addColorStop(0, rgba(c, (0.6 + 0.25 * (1 - heat)) * (1 - life) * k))
    g.addColorStop(0.55, rgba(c, 0.22 * (1 - life) * k))
    g.addColorStop(1, rgba(c, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, size * 2.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

/** Glints and confetti, over everything. */
export function drawRingFront(ctx: CanvasRenderingContext2D, intensity: number): void {
  const k = Math.max(0.5, intensity) * fxK()
  drawLasers(ctx, k)
  if (twinkles.length) {
    ctx.save()
    ctx.lineCap = 'round'
    for (const t of twinkles) {
      if (t.age < 0) continue
      const f = t.age / t.life
      const a = Math.min(1, Math.sin(Math.PI * f) * k)
      const s = t.size * (0.6 + 0.4 * Math.sin(Math.PI * f))
      // A four-point star: two thin crossed strokes and a bright dot.
      ctx.strokeStyle = rgba(t.color, 0.9 * a)
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(t.x - s, t.y)
      ctx.lineTo(t.x + s, t.y)
      ctx.moveTo(t.x, t.y - s)
      ctx.lineTo(t.x, t.y + s)
      ctx.stroke()
      ctx.fillStyle = rgba(t.color, a)
      ctx.beginPath()
      ctx.arc(t.x, t.y, 0.9, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
  if (confetti.length) {
    ctx.save()
    for (const c of confetti) {
      const f = c.age / c.life
      ctx.save()
      ctx.translate(c.x, c.y)
      ctx.rotate(c.angle)
      ctx.fillStyle = rgba(c.color, (f > 0.7 ? (1 - f) / 0.3 : 1) * k)
      // Tumbling: the strip narrows as it turns edge-on.
      ctx.fillRect(-2, -1 * Math.abs(Math.cos(c.angle * 2)) - 0.4, 4, 2 * Math.abs(Math.cos(c.angle * 2)) + 0.8)
      ctx.restore()
    }
    ctx.restore()
  }
}

// ------------------------------------------------- explosions and lasers (2026-10-14, round 3)

interface Laser {
  x: number
  y: number
  angle: number
  age: number
  life: number
  length: number
  color: Rgb
}

const lasers: Laser[] = []
let laserClock = 0

/** Where the lap ends: the far end of the track, where a completed lap bursts from. */
const TRACK_END = START_ANGLE + SWEEP
const at = (angle: number): { x: number; y: number } => ({ x: CX + R_RING * Math.cos(angle), y: CY + R_RING * Math.sin(angle) })

/** A burst of sparks: from the end of the track (a lap) or the head (a milestone). `scale` makes it bigger. */
export function ringExplode(color: Rgb, scale = 1, angle = TRACK_END): void {
  if (!cfg.enabled || !cfg.explosions.on) return
  const o = at(angle)
  const n = Math.round(cfg.explosions.amount * scale)
  const hot: Rgb = [255, 251, 235]
  for (let i = 0; i < n && particles.length < MAX_BURST_PARTICLES; i++) {
    const a = Math.random() * Math.PI * 2
    const speed = (50 + Math.random() * 120) * cfg.explosions.power * (0.8 + 0.4 * scale)
    particles.push({
      x: o.x,
      y: o.y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      age: 0,
      life: 500 + Math.random() * 600,
      color: Math.random() < 0.35 ? hot : Math.random() < 0.5 ? color : [253, 224, 71],
      size: 1 + Math.random() * 1.3,
      drag: 0.0022,
    })
  }
}

/** A fan of beams out from the end of the track (a lap). */
export function ringLasers(tierColor: Rgb, angle = TRACK_END): void {
  if (!cfg.enabled || !cfg.lasers.on) return
  const o = at(angle)
  fireLasers(tierColor, o.x, o.y, angle, cfg.lasers.count, 1)
}

function fireLasers(tierColor: Rgb, x: number, y: number, angle: number, count: number, reach: number): void {
  const color = cfg.lasers.useTier ? tierColor : hexRgb(cfg.lasers.color)
  const spread = Math.min(2.6, 0.32 * count)
  for (let i = 0; i < count && lasers.length < 64; i++) {
    const a = count === 1 ? angle + (Math.random() - 0.5) * 0.6 : angle - spread / 2 + (spread * i) / (count - 1)
    lasers.push({ x, y, angle: a, age: -i * 28, life: 520, length: cfg.lasers.length * reach * (0.8 + 0.4 * Math.random()), color })
  }
}

function drawLasers(ctx: CanvasRenderingContext2D, k: number): void {
  if (!lasers.length) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  for (const l of lasers) {
    if (l.age < 0) continue
    const f = l.age / l.life
    // Shoots out fast, holds, then fades from the base.
    const ext = l.length * (1 - Math.pow(1 - Math.min(1, f * 2.4), 3))
    const alpha = Math.min(1, (f < 0.45 ? 1 : (1 - f) / 0.55) * k)
    const x2 = l.x + Math.cos(l.angle) * ext
    const y2 = l.y + Math.sin(l.angle) * ext
    const g = ctx.createLinearGradient(l.x, l.y, x2, y2)
    g.addColorStop(0, rgba([255, 255, 255], alpha))
    g.addColorStop(0.35, rgba(l.color, alpha))
    g.addColorStop(1, rgba(l.color, 0))
    ctx.strokeStyle = g
    ctx.shadowColor = rgba(l.color, alpha)
    ctx.shadowBlur = 8
    ctx.lineWidth = 2.2 * (1 - f * 0.6)
    ctx.beginPath()
    ctx.moveTo(l.x, l.y)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }
  ctx.restore()
}
