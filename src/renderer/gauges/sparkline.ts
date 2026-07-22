import { CX, CY } from '../theme.js'

const WIDTH = 108
const HEIGHT = 22
/** Sits below the centre text, inside the ring's lower opening. */
const TOP = CY + 30

export interface SparkOptions {
  /** Oldest-first history, 0..100. */
  history: number[]
  /** Fixed window width so the line scrolls instead of stretching. */
  capacity: number
  intensity: number
}

/** GPU-utilisation history, tucked inside the gauge. */
export function drawSparkline(
  ctx: CanvasRenderingContext2D,
  { history, capacity, intensity }: SparkOptions,
): void {
  if (history.length < 2) return

  const left = CX - WIDTH / 2
  const step = WIDTH / (capacity - 1)
  const offset = Math.max(0, capacity - history.length)

  const pointAt = (i: number): [number, number] => {
    const v = Math.min(100, Math.max(0, history[i] ?? 0))
    return [left + (offset + i) * step, TOP + HEIGHT - (v / 100) * HEIGHT]
  }

  const [x0, y0] = pointAt(0)
  const lastX = left + (offset + history.length - 1) * step

  ctx.save()
  ctx.globalAlpha = 0.5 + 0.5 * intensity

  ctx.beginPath()
  ctx.moveTo(x0, TOP + HEIGHT)
  ctx.lineTo(x0, y0)
  for (let i = 1; i < history.length; i++) {
    const [x, y] = pointAt(i)
    ctx.lineTo(x, y)
  }
  ctx.lineTo(lastX, TOP + HEIGHT)
  ctx.closePath()
  const grad = ctx.createLinearGradient(0, TOP, 0, TOP + HEIGHT)
  grad.addColorStop(0, 'rgba(34, 211, 238, 0.28)')
  grad.addColorStop(1, 'rgba(34, 211, 238, 0.01)')
  ctx.fillStyle = grad
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(x0, y0)
  for (let i = 1; i < history.length; i++) {
    const [x, y] = pointAt(i)
    ctx.lineTo(x, y)
  }
  ctx.strokeStyle = 'rgba(103, 232, 249, 0.75)'
  ctx.lineWidth = 1
  ctx.lineJoin = 'round'
  ctx.stroke()
  ctx.restore()
}
