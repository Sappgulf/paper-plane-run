/**
 * One art rule, applied to everything.
 *
 * The old look was a texture library, not a direction: six photographic sky
 * JPEGs, six ground JPEGs, and a building tile. Nothing shared a palette,
 * nothing shared a rendering logic, and the result read as generic because
 * nothing was committing to anything. In a game whose entire identity is
 * *paper*, the art was made of photographs.
 *
 * The rule now, and it applies without exception:
 *
 *   1. Cut paper only. Flat fills with hard edges. No photographic texture,
 *      no gradients inside a shape — a sheet of paper is one colour.
 *   2. Three tones per zone plus one accent. The tones are near, mid and far;
 *      the accent is used for exactly the things the player must read fast.
 *   3. Every plane of colour carries a fibre grain and at least one fold
 *      crease, because that is what says "paper" rather than "flat shading".
 *   4. Depth comes from hard offset shadows between layers, never from blur.
 *
 * World plates, plane stock and hazard sprites share this palette. Hazards
 * are cut in the zone's
 * reserved accent so danger is one learnable colour. The canvas factory is
 * injected so the palettes stay testable outside a browser.
 */

/** Three tones (far → near) plus the read-me-first accent, per zone. */
export const PAPER_PALETTES = Object.freeze({
  city: Object.freeze({
    far: '#cfe2f2', mid: '#a8c8e4', near: '#7ea6cc', accent: '#ff7043',
    ground: '#e8dcc8', groundAlt: '#d6c6ac', paper: '#f6efe2',
  }),
  harbor: Object.freeze({
    far: '#d8eef6', mid: '#a6d4e6', near: '#6fb0cc', accent: '#ffb300',
    ground: '#cfe6ec', groundAlt: '#b2d2dc', paper: '#f2fbff',
  }),
  storm: Object.freeze({
    far: '#b7abc6', mid: '#8d81a4', near: '#635a78', accent: '#ffd54f',
    ground: '#a99cb4', groundAlt: '#8d8098', paper: '#e6dced',
  }),
  sunset: Object.freeze({
    far: '#ffd9b0', mid: '#f4a678', near: '#d2705c', accent: '#4fc3f7',
    ground: '#f0c49c', groundAlt: '#d9a077', paper: '#fff0dd',
  }),
  aurora: Object.freeze({
    far: '#3f4c78', mid: '#4f7f9e', near: '#69c6b0', accent: '#ff8a9c',
    ground: '#3c4a5c', groundAlt: '#2e3a49', paper: '#cfe0f2',
  }),
  midnight: Object.freeze({
    far: '#2b2750', mid: '#453d75', near: '#6a5ea6', accent: '#ffd166',
    ground: '#241f42', groundAlt: '#191634', paper: '#d7cdf2',
  }),
})

export const DEFAULT_PALETTE = PAPER_PALETTES.city

export function getPaperPalette(zoneId) {
  return PAPER_PALETTES[zoneId] || DEFAULT_PALETTE
}

function makeCanvas(factory, width, height) {
  const canvas = typeof factory === 'function'
    ? factory(width, height)
    : (typeof document !== 'undefined' ? document.createElement('canvas') : null)
  if (!canvas) return null
  canvas.width = width
  canvas.height = height
  return canvas
}

/**
 * Paper fibre. Deliberately sparse and low-contrast — grain is what stops a
 * flat fill from looking like a UI panel, but any more than this and it starts
 * competing with the hazards for attention.
 */
function drawGrain(ctx, width, height, alpha = 0.055, seed = 1) {
  let state = Math.max(1, Math.floor(seed)) >>> 0
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
  ctx.save()
  ctx.globalAlpha = alpha
  for (let i = 0; i < width * height * 0.05; i += 1) {
    const x = random() * width
    const y = random() * height
    ctx.fillStyle = random() < 0.5 ? '#000000' : '#ffffff'
    ctx.fillRect(x, y, 1, random() < 0.2 ? 2 : 1)
  }
  ctx.restore()
}

/** A fold crease: one hard highlight line and its hard shadow, never blurred. */
function drawCrease(ctx, { x0, y0, x1, y1, alpha = 0.12 }) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()
  ctx.globalAlpha = alpha * 0.8
  ctx.strokeStyle = '#000000'
  ctx.beginPath()
  ctx.moveTo(x0 + 2, y0)
  ctx.lineTo(x1 + 2, y1)
  ctx.stroke()
  ctx.restore()
}

/** Flat sheet used for the plane itself and any prop that should read as stock. */
export function createPaperSheetCanvas({ palette = DEFAULT_PALETTE, size = 128, canvasFactory } = {}) {
  const width = Math.max(8, Math.floor(size))
  const canvas = makeCanvas(canvasFactory, width, width)
  if (!canvas) return null
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = palette.paper || '#f6efe2'
  ctx.fillRect(0, 0, width, width)
  drawCrease(ctx, { x0: 0, y0: width * 0.5, x1: width, y1: width * 0.5, alpha: 0.1 })
  drawCrease(ctx, { x0: width * 0.5, y0: 0, x1: width * 0.5, y1: width, alpha: 0.06 })
  drawGrain(ctx, width, width, 0.045, 31)
  return canvas
}

/**
 * The one colour every zone reserves for danger.
 *
 * Hazards used to be cut-out product photographs, so a pair of scissors was a
 * mid-grey photographic object against a mid-tone paper city — the single most
 * important thing on screen and the hardest to pick out. Under the art rule
 * they are flat shapes in the zone's accent, which is reserved for exactly
 * this: nothing else in a zone is allowed to use it. Learn the colour once and
 * every zone tells you what will kill you.
 */
export const HAZARD_INK = '#221a1c'
/**
 * Visible edge weight as a fraction of sprite size. A thin cut edge (about 3%),
 * not a comic outline: the facets carry the shape, the ink only separates it.
 */
export const HAZARD_OUTLINE = 0.032

/** Hard drop shadow offset as a fraction of sprite size. Solid, never blurred. */
const HAZARD_SHADOW_OFFSET = 0.04
/** Hazards are drawn in a 100-unit sheet centred on the canvas. */
const SHEET = 100

/** Mix a hex colour toward white or black by a fraction (0 keeps it, 1 is full). */
function mixHex(hex, toward, fraction) {
  const target = toward === 'white' ? 255 : 0
  const amount = Math.min(1, Math.max(0, fraction))
  const channels = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16)
    return Math.round(channel + (target - channel) * amount).toString(16).padStart(2, '0')
  })
  return `#${channels.join('')}`
}

/** Two tones of the zone accent for the facets, plus a darker stripe and shadow. */
function hazardTones(accent) {
  return Object.freeze({
    lit: mixHex(accent, 'white', 0.3),
    shade: mixHex(accent, 'black', 0.2),
    stripe: mixHex(accent, 'black', 0.42),
    shadow: mixHex(accent, 'black', 0.5),
  })
}

function polygonBuild(points) {
  return (ctx) => {
    ctx.beginPath()
    points.forEach(([x, y], index) => {
      if (index) ctx.lineTo(x, y)
      else ctx.moveTo(x, y)
    })
    ctx.closePath()
  }
}

/**
 * One cut piece of paper. `crease` is [x, y, dx, dy]: a fold line the facets
 * are split along. When omitted it runs from the centroid to the farthest point.
 * `ink` scales the edge weight for thin strips such as ropes and spars.
 */
function piece(points, extra = {}) {
  return {
    points,
    build: polygonBuild(points),
    crease: null,
    rule: 'nonzero',
    ink: 1,
    stripes: null,
    ...extra,
  }
}

function circlePoints(cx, cy, r, count) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
  })
}

function mirrorX(points) {
  return points.map(([x, y]) => [-x, y]).reverse()
}

// Silhouettes. Every coordinate stays within about 40 units so the offset
// shadow and the edge ink never reach the canvas edge.
const BIRD_WING = [[-2, -6], [-14, -8], [-40, -13], [-27, 8], [-10, 17], [0, 9]]

const HAWK_WING = [[-3, -8], [-20, -14], [-40, -24], [-35, -13], [-39, -8], [-30, -4], [-34, 2], [-24, 4], [-27, 11], [-14, 12], [-4, 6]]
const HAWK_BODY = [[-4, -10], [4, -10], [6, 10], [9, 24], [0, 19], [-9, 24], [-6, 10]]

const KITE_DIAMOND = [[0, -37], [28, 0], [0, 26], [-28, 0]]

const BIPLANE_FUSELAGE = [[0, -36], [5, -30], [5, 24], [2, 34], [0, 36], [-2, 34], [-5, 24], [-5, -30]]
const BIPLANE_TAIL = [[-14, 24], [-3, 21], [3, 21], [14, 24], [12, 30], [-12, 30]]
const BIPLANE_LOWER = [[-34, 4], [-4, 2], [4, 2], [34, 4], [32, 11], [4, 9], [-4, 9], [-32, 11]]
const BIPLANE_UPPER = [[-40, -12], [-4, -14], [4, -14], [40, -12], [38, -4], [4, -6], [-4, -6], [-38, -4]]
const BIPLANE_PROP = [[-14, -38], [-1, -37], [1, -37], [14, -38], [1, -35], [-1, -35]]

const DRAGON_UPPER = [[-4, -16], [-36, -30], [-40, -12], [-6, -2]]
const DRAGON_LOWER = [[-4, 0], [-32, 4], [-26, 24], [-4, 12]]
const DRAGON_BODY = [[-3, -20], [3, -20], [4, 20], [0, 36], [-4, 20]]

const WASP_WING = [[-5, -12], [-20, -31], [-37, -31], [-34, -17], [-8, -3]]
const WASP_BODY = [[-6, -14], [6, -14], [8, -2], [5, 16], [0, 31], [-5, 16], [-8, -2]]
const WASP_STINGER = [[-2, 29], [2, 29], [0, 40]]

const BALLOON_ENVELOPE = circlePoints(0, 0, 1, 20).map(([x, y]) => [x * 24, -12 + y * 27])
const BALLOON_BASKET = [[-9, 20], [9, 20], [7, 31], [-7, 31]]
const BALLOON_ROPE = [[-12, 10], [-10, 10], [-6, 20], [-8, 20]]

const DART = [[0, -34], [40, 25], [12, 16], [0, 34], [-12, 16], [-40, 25]]

/** Cut pieces for each named hazard, painted back to front. */
const HAZARD_PIECES = Object.freeze({
  bird: [piece(BIRD_WING), piece(mirrorX(BIRD_WING))],
  hawk: [
    piece(HAWK_WING),
    piece(mirrorX(HAWK_WING)),
    piece(HAWK_BODY),
  ],
  kite: [
    piece(KITE_DIAMOND, { crease: [0, 0, 0, 1] }),
    piece([[-28, -1.5], [28, -1.5], [28, 1.5], [-28, 1.5]], { ink: 0.6, crease: [0, 0, 1, 0] }),
    piece([[-1.5, -36], [1.5, -36], [1.5, 25], [-1.5, 25]], { ink: 0.6, crease: [0, 0, 0, 1] }),
    piece([[0, 25], [-8, 31], [-4, 37], [0, 30]]),
    piece([[0, 25], [8, 31], [4, 37], [0, 30]]),
    piece([[-1, 30], [1, 30], [1.5, 40], [-1.5, 40]], { ink: 0.6 }),
  ],
  biplane: [
    piece(BIPLANE_FUSELAGE),
    piece(BIPLANE_TAIL),
    piece(BIPLANE_LOWER),
    piece(BIPLANE_UPPER),
    piece(BIPLANE_PROP, { ink: 0.6 }),
  ],
  dragonfly: [
    piece(DRAGON_UPPER),
    piece(mirrorX(DRAGON_UPPER)),
    piece(DRAGON_LOWER),
    piece(mirrorX(DRAGON_LOWER)),
    piece(DRAGON_BODY, { crease: [0, -20, 0, 1] }),
    piece(circlePoints(0, -27, 7, 14)),
  ],
  wasp: [
    piece(WASP_WING),
    piece(mirrorX(WASP_WING)),
    piece(WASP_STINGER, { ink: 0.6 }),
    piece(WASP_BODY, { crease: [0, 0, 0, 1], stripes: [[-6, -3], [2, 5], [10, 13]] }),
    piece(circlePoints(0, -21, 5.5, 10)),
  ],
  balloon: [
    piece(BALLOON_ENVELOPE, { crease: [0, -12, 0, 1] }),
    piece(BALLOON_ROPE, { ink: 0.6 }),
    piece(mirrorX(BALLOON_ROPE), { ink: 0.6 }),
    piece(BALLOON_BASKET),
  ],
})

/** Lookup for `HAZARD_PROFILES`: the outline of each piece, grouped by kind. */
export const HAZARD_PROFILES = Object.freeze(Object.fromEntries(
  Object.entries(HAZARD_PIECES).map(([kind, pieces]) => [
    kind,
    Object.freeze(pieces.map((cut) => cut.points)),
  ]),
))

/** The default paper dart, folded down its middle so each half is one facet. */
const FLYER_PIECES = Object.freeze([piece(DART, { crease: [0, 0, 0, 1] })])

function rotatePoints(points, angle) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return points.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos])
}

/** Halloween re-cut: a bat's scalloped wings, ears and body, same accent + ink. */
const BAT_WING = [[-1, -12], [-6, -18], [-14, -14], [-24, -16], [-32, -6], [-26, 0], [-32, 8], [-22, 12], [-12, 6], [-4, 14]]
const BAT_PIECES = Object.freeze([
  piece(BAT_WING),
  piece(mirrorX(BAT_WING)),
  piece([[-3, -10], [-10, -24], [-12, -8]]),
  piece(mirrorX([[-3, -10], [-10, -24], [-12, -8]])),
  piece([[-4, -10], [4, -10], [5, 8], [0, 16], [-5, 8]], { crease: [0, -10, 0, 1] }),
])

/** Snowfold re-cut: a six-spoke paper flake, spokes and side ticks as strips. */
const SNOWFLAKE_PIECES = Object.freeze((() => {
  const pieces = [piece(circlePoints(0, 0, 9, 14))]
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 3) * i
    pieces.push(piece(rotatePoints([[-2.4, 9], [2.4, 9], [2.4, 34], [-2.4, 34]], angle)))
    const tick = [[0, 24], [-7, 31], [-9.5, 29], [-2.5, 22]]
    pieces.push(piece(rotatePoints(tick, angle)))
    pieces.push(piece(rotatePoints(mirrorX(tick), angle)))
  }
  return pieces
})())

/** Love Notes re-cut: a sent-letter heart. */
const HEART_PIECES = Object.freeze([
  piece([
    [0, 36], [14, 22], [26, 8], [26, -6], [16, -14], [6, -12], [0, -4],
    [-6, -12], [-16, -14], [-26, -6], [-26, 8], [-14, 22],
  ], { crease: [0, -12, 0, 1] }),
])

/**
 * Seasonal re-cuts for the bird, the most frequent hazard. Same zone accent
 * and ink — only the silhouette changes, so the danger colour stays learnable.
 */
export const SEASONAL_BIRD_PIECES = Object.freeze({
  halloween: BAT_PIECES,
  winter: SNOWFLAKE_PIECES,
  valentine: HEART_PIECES,
})

/** Cache key suffix for the season's bird re-cut, or null for the plain bird. */
export function seasonalBirdSilhouetteId(seasonId) {
  return seasonId && SEASONAL_BIRD_PIECES[seasonId] ? `bird:${seasonId}` : null
}

/** Crossed blades with their finger rings; each blade is a tapered paper cut. */
function scissorBlade(tip, ring) {
  const ringRadius = 10
  const dx = ring[0] - tip[0]
  const dy = ring[1] - tip[1]
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  const nx = -uy
  const ny = ux
  // The handle meets the ring at its outer edge, nearest the blade tip.
  const ex = ring[0] - ux * ringRadius
  const ey = ring[1] - uy * ringRadius
  return piece([
    tip,
    [nx * 5, ny * 5],
    [ex + nx * 2.2, ey + ny * 2.2],
    [ex - nx * 2.2, ey - ny * 2.2],
    [-nx * 5, -ny * 5],
  ], { crease: [0, 0, ux, uy] })
}

function scissorRing(cx, cy) {
  const outer = 10
  const inner = 5.5
  return {
    points: null,
    build(ctx) {
      ctx.beginPath()
      ctx.arc(cx, cy, outer, 0, Math.PI * 2)
      ctx.moveTo(cx + inner, cy)
      ctx.arc(cx, cy, inner, 0, Math.PI * 2, true)
    },
    crease: [cx, cy, 0, 1],
    rule: 'evenodd',
    ink: 1,
    stripes: null,
  }
}

function scissorsPieces() {
  return [
    scissorBlade([22, -36], [-18, 30]),
    scissorBlade([-22, -36], [18, 30]),
    scissorRing(-18, 30),
    scissorRing(18, 30),
  ]
}

/** Fold crease through a piece: the centroid to its farthest point. */
function autoCrease(points) {
  let cx = 0
  let cy = 0
  for (const [x, y] of points) {
    cx += x
    cy += y
  }
  cx /= points.length
  cy /= points.length
  let far = null
  let best = 0
  for (const [x, y] of points) {
    const d = (x - cx) ** 2 + (y - cy) ** 2
    if (d > best) {
      best = d
      far = [x, y]
    }
  }
  if (!far) return [cx, cy, 0, 1]
  return [cx, cy, far[0] - cx, far[1] - cy]
}

/**
 * Fill the facet on the shaded side of a crease. Light comes from the upper
 * left, so the side facing down and right is the one in shadow.
 */
function fillShadedFacet(ctx, [cx, cy, dx, dy]) {
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  let nx = -uy
  let ny = ux
  if (nx + ny < 0) {
    nx = -nx
    ny = -ny
  }
  const reach = SHEET * 4
  ctx.beginPath()
  ctx.moveTo(cx - ux * reach, cy - uy * reach)
  ctx.lineTo(cx + ux * reach, cy + uy * reach)
  ctx.lineTo(cx + ux * reach + nx * reach, cy + uy * reach + ny * reach)
  ctx.lineTo(cx - ux * reach + nx * reach, cy - uy * reach + ny * reach)
  ctx.closePath()
  ctx.fill()
}

/**
 * Paint cut pieces in four hard passes: a solid offset shadow under everything,
 * then for each piece a thin ink edge, a lit facet, and a shaded facet split by
 * its fold crease. Only paths and fills are used; nothing is blurred.
 */
function drawHazardPieces(ctx, size, accent, pieces) {
  const scale = size / SHEET
  const edge = HAZARD_OUTLINE * SHEET
  const offset = HAZARD_SHADOW_OFFSET * SHEET
  const tones = hazardTones(accent)

  ctx.save()
  ctx.setTransform(scale, 0, 0, scale, size / 2, size / 2)
  ctx.lineJoin = 'round'

  ctx.fillStyle = tones.shadow
  for (const cut of pieces) {
    ctx.save()
    ctx.translate(offset, offset)
    cut.build(ctx)
    ctx.fill(cut.rule)
    ctx.restore()
  }

  for (const cut of pieces) {
    // The stroke is centred on the outline, so only its outer half shows.
    ctx.strokeStyle = HAZARD_INK
    ctx.lineWidth = edge * 2 * cut.ink
    cut.build(ctx)
    ctx.stroke()

    ctx.fillStyle = tones.lit
    cut.build(ctx)
    ctx.fill(cut.rule)

    ctx.save()
    cut.build(ctx)
    ctx.clip(cut.rule)
    ctx.fillStyle = tones.shade
    fillShadedFacet(ctx, cut.crease || autoCrease(cut.points))
    if (cut.stripes) {
      ctx.fillStyle = tones.stripe
      for (const [y0, y1] of cut.stripes) ctx.fillRect(-SHEET, y0, SHEET * 2, y1 - y0)
    }
    ctx.restore()
  }
  ctx.restore()
}

/**
 * A hazard sprite, cut from paper rather than photographed.
 *
 * `kind` picks the silhouette; everything else is the zone accent plus ink, so
 * a new hazard type cannot accidentally arrive in a colour that means
 * something else. `seasonId` optionally re-cuts the bird into its seasonal
 * silhouette.
 */
export function createHazardCanvas({
  kind = 'flyer',
  palette = DEFAULT_PALETTE,
  size = 128,
  canvasFactory,
  seasonId = null,
} = {}) {
  const width = Math.max(16, Math.floor(size))
  const canvas = makeCanvas(canvasFactory, width, width)
  if (!canvas) return null
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const fill = palette.accent || DEFAULT_PALETTE.accent
  let pieces = FLYER_PIECES
  if (kind === 'scissors') pieces = scissorsPieces()
  else if (kind === 'bird' && seasonId && SEASONAL_BIRD_PIECES[seasonId]) pieces = SEASONAL_BIRD_PIECES[seasonId]
  else if (Object.prototype.hasOwnProperty.call(HAZARD_PIECES, kind)) pieces = HAZARD_PIECES[kind]
  drawHazardPieces(ctx, width, fill, pieces)
  return canvas
}

/**
 * Hard offset shadow spec. Layers are separated by an offset silhouette in a
 * darker tone, never by a blur — a blurred shadow is the single fastest way to
 * stop looking like cut paper.
 */
export function paperShadowSpec({ depth = 1 } = {}) {
  const level = Math.max(0, Number(depth) || 0)
  return Object.freeze({ offsetX: 2 + level * 1.5, offsetY: 3 + level * 2, alpha: 0.18, blur: 0 })
}
