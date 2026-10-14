import { getPlaneGeometrySpec } from '../plane-models.js'

/** Skins point their Hangar portrait at this prefix instead of a photo file. */
export const PLANE_PORTRAIT_PREFIX = 'paper:plane:'

const INK = '#2b2b2b'
const PAPER = '#eadfc8'
const portraitCache = new Map()

function hexColor(value, fallback) {
  const number = Number.isFinite(value) ? value : fallback
  return `#${number.toString(16).padStart(6, '0')}`
}

function mixColor(color, target, amount) {
  const from = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16))
  const to = [1, 3, 5].map((index) => parseInt(target.slice(index, index + 2), 16))
  const channels = from.map((value, index) => Math.round(value + (to[index] - value) * amount))
  return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Cut-paper portrait of one plane, drawn from its real flight silhouette: a lit
 * and a shaded face split by the fold, accent creases, a hard offset shadow and
 * an ink edge. Matches the paper art in the flight instead of a photograph.
 */
export function drawPlanePortrait(ctx, size, { body, accent, silhouette } = {}) {
  const spec = getPlaneGeometrySpec(silhouette)
  const bodyColor = hexColor(body, 0xfff6ec)
  const accentColor = hexColor(accent, 0xf0956a)
  const lit = mixColor(bodyColor, '#ffffff', 0.12)
  const shade = mixColor(bodyColor, '#000000', 0.2)
  const wings = [spec.wingL, spec.wingR]
  const creases = [spec.creaseL, spec.creaseR]
  const outline = [...wings.flat(), ...creases.flat()]
  const xs = outline.map(([x]) => Math.abs(x))
  const ys = outline.map(([, y]) => y)
  const maxY = Math.max(...ys)
  const minY = Math.min(...ys)
  // Fit the wider of the span and the length into the tile, centred on the fold.
  const scale = (size * 0.84) / Math.max(2 * Math.max(...xs), maxY - minY)
  const centreY = (maxY + minY) / 2
  const toCanvas = ([x, y]) => [size / 2 + x * scale, size / 2 - (y - centreY) * scale]
  const tracePath = (points) => {
    ctx.beginPath()
    points.map(toCanvas).forEach(([px, py], index) => (index ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
    ctx.closePath()
  }

  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, size, size)

  ctx.lineJoin = 'miter'
  ctx.strokeStyle = INK
  ctx.lineWidth = size * 0.02
  ctx.save()
  ctx.translate(size * 0.03, size * 0.036)
  ctx.fillStyle = INK
  for (const wing of wings) {
    tracePath(wing)
    ctx.fill()
  }
  ctx.restore()

  wings.forEach((wing, index) => {
    tracePath(wing)
    ctx.fillStyle = lit
    ctx.fill()
    ctx.stroke()
    tracePath(creases[index])
    ctx.fillStyle = shade
    ctx.fill()
    ctx.strokeStyle = accentColor
    ctx.lineWidth = size * 0.012
    ctx.stroke()
    ctx.strokeStyle = INK
    ctx.lineWidth = size * 0.02
  })

  const [bodyX, bodyY] = toCanvas([spec.body.position[0], spec.body.position[2]])
  const bodyWidth = spec.body.size[0] * scale
  const bodyLength = spec.body.size[2] * scale
  ctx.fillStyle = shade
  ctx.fillRect(bodyX - bodyWidth / 2, bodyY - bodyLength / 2, bodyWidth, bodyLength)
  ctx.strokeRect(bodyX - bodyWidth / 2, bodyY - bodyLength / 2, bodyWidth, bodyLength)

  const [noseX, noseY] = toCanvas([0, spec.nose.position[2]])
  ctx.beginPath()
  ctx.arc(noseX, noseY, Math.max(2, spec.nose.radius * scale), 0, Math.PI * 2)
  ctx.fillStyle = accentColor
  ctx.fill()
  ctx.stroke()
}

/**
 * Data URL of a skin's portrait, drawn once per skin and size. Returns '' where
 * there is no canvas (tests, server rendering), so callers simply show no image.
 */
export function planePortraitUrl(skin, { size = 256 } = {}) {
  const key = `${skin.id}:${size}`
  if (portraitCache.has(key)) return portraitCache.get(key)
  if (typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext?.('2d')
  if (!ctx) return ''
  drawPlanePortrait(ctx, size, skin)
  const url = canvas.toDataURL('image/png')
  portraitCache.set(key, url)
  return url
}
