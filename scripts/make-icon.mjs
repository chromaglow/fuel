/**
 * Generate fuel's icons as real PNG bytes — no binary blobs checked in that
 * can't be reviewed. Draws the gauge glyph: a 270-degree ring with a needle.
 *
 * Usage: node scripts/make-icon.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** Encode an RGBA Uint8Array (w*h*4) as a PNG buffer. */
function encodePng(rgba, w, h) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  // Each scanline is prefixed with filter type 0 (None).
  const raw = Buffer.alloc(h * (w * 4 + 1))
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    rgba.subarray(y * w * 4, (y + 1) * w * 4).forEach((v, i) => {
      raw[y * (w * 4 + 1) + 1 + i] = v
    })
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Signed angular distance from `a` to `b`, wrapped to (-PI, PI]. */
function angDelta(a, b) {
  let d = a - b
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

function drawIcon(size) {
  const rgba = new Uint8Array(size * size * 4)
  const c = (size - 1) / 2
  const R = size * 0.36
  const thickness = Math.max(1.4, size * 0.085)
  const needleLen = R * 0.72

  // Sweep from 135deg round to 405deg, matching the HUD's gauge geometry.
  const START = (135 * Math.PI) / 180
  const SWEEP = (270 * Math.PI) / 180
  const needleAngle = START + SWEEP * 0.68

  // Supersample 3x3 for smooth edges without a rasteriser.
  const S = 3
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hit = 0
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = x + (sx + 0.5) / S - 0.5
          const py = y + (sy + 0.5) / S - 0.5
          const dx = px - c
          const dy = py - c
          const dist = Math.hypot(dx, dy)

          // Canvas angles run clockwise from +x with y pointing down.
          let ang = Math.atan2(dy, dx)
          if (ang < 0) ang += Math.PI * 2

          // Ring band, restricted to the 270-degree sweep.
          if (Math.abs(dist - R) <= thickness / 2) {
            let rel = ang - START
            while (rel < 0) rel += Math.PI * 2
            if (rel <= SWEEP) hit++
            continue
          }

          // Needle: near the centre, close to the needle bearing.
          if (dist <= needleLen) {
            const off = Math.abs(angDelta(ang, needleAngle)) * dist
            if (off <= thickness * 0.42) hit++
          }
        }
      }

      if (hit === 0) continue
      const a = Math.round((hit / (S * S)) * 255)
      const i = (y * size + x) * 4
      rgba[i] = 0x22 // #22d3ee, the HUD accent
      rgba[i + 1] = 0xd3
      rgba[i + 2] = 0xee
      rgba[i + 3] = a
    }
  }
  return encodePng(rgba, size, size)
}

const out = join(process.cwd(), 'build')
mkdirSync(out, { recursive: true })
for (const size of [16, 32, 256]) {
  const file = join(out, size === 256 ? 'icon.png' : `tray-${size}.png`)
  writeFileSync(file, drawIcon(size))
  console.log(`wrote ${file}`)
}
