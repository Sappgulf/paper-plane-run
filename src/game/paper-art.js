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
  dawn: Object.freeze({
    far: '#f6dcd0', mid: '#efb9a4', near: '#d68f80', accent: '#8b5cf6',
    ground: '#ecd6c2', groundAlt: '#dcc0a8', paper: '#fff4e8',
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

/** A thin strip from one point to another — antennae, struts, prop bars. */
function stripPoints([ax, ay], [bx, by], width) {
  const dx = bx - ax
  const dy = by - ay
  const len = Math.hypot(dx, dy) || 1
  const nx = (-dy / len) * (width / 2)
  const ny = (dx / len) * (width / 2)
  return [
    [ax + nx, ay + ny],
    [bx + nx, by + ny],
    [bx - nx, by - ny],
    [ax - nx, ay - ny],
  ]
}

// Bird: a gliding dove seen head-on — round head with a side beak, a folded
// diamond body split down its middle, swept wings with two scalloped feather
// notches, and a small fanned tail. The old cut was two wings and nothing
// between them, which read as a moustache.
const BIRD_WING = [[-3, -5], [-17, -16], [-38, -22], [-32, -12], [-38, -8], [-27, -3], [-31, 3], [-20, 8], [-22, 12], [-8, 14], [-3, 8]]
const BIRD_BODY = [[0, -12], [7, 2], [0, 26], [-7, 2]]
const BIRD_TAIL = [[-4, 22], [4, 22], [10, 33], [0, 29], [-10, 33]]
const BIRD_HEAD = circlePoints(0, -17, 7, 12)
const BIRD_BEAK = [[4, -19], [14, -15], [4, -11]]

const HAWK_WING = [[-3, -8], [-18, -18], [-41, -29], [-35, -17], [-40, -13], [-31, -7], [-36, -3], [-27, 1], [-30, 6], [-20, 9], [-23, 13], [-9, 12], [-3, 6]]
const HAWK_BODY = [[-5, -12], [5, -12], [8, 4], [6, 17], [0, 27], [-6, 17], [-8, 4]]
const HAWK_TAIL = [[-5, 16], [-15, 32], [-7, 28], [-4, 36], [0, 30], [4, 36], [7, 28], [15, 32], [5, 16]]
const HAWK_TALON = [[-8, 8], [-16, 15], [-17, 21], [-13, 17], [-10, 22], [-7, 16], [-3, 13]]
const HAWK_HEAD = circlePoints(0, -17, 6.5, 12)
const HAWK_BEAK = [[2, -20], [13, -16], [2, -11]]

const KITE_DIAMOND = [[0, -37], [28, 0], [0, 26], [-28, 0]]

// Biplane: the iconic side view — long fuselage, two stacked wing bands on
// struts, a tail fin at the rear and a two-blade prop over the nose. The old
// head-on cut was three slabs and read as a ladder.
const BIPLANE_FUSELAGE = [[-31, -4], [-20, -7], [16, -7], [28, -4], [31, 0], [27, 6], [-21, 7], [-31, 3]]
const BIPLANE_FIN = [[-39, -17], [-30, -14], [-25, -4], [-29, 4], [-39, 8], [-35, -2]]
const BIPLANE_UPPER = [[-29, -19], [-20, -23], [17, -23], [27, -18], [25, -12], [-27, -12]]
const BIPLANE_LOWER = [[-22, 9], [18, 9], [24, 13], [19, 18], [-20, 18], [-25, 14]]
const BIPLANE_STRUT = [[-12, -11], [-10, -11], [-10, 10], [-12, 10]]
const BIPLANE_NOSE = circlePoints(29, 0, 5.5, 12)
const BIPLANE_COCKPIT = [[-14, -8], [-10, -12], [1, -12], [5, -8]]
const BIPLANE_WHEEL = circlePoints(-12, 22, 4, 10)
const BIPLANE_PROP = [[33, -13], [35, -13], [35, 13], [33, 13]]

// Dragonfly: four long horizontal wing blades in an X around a pin-thin body
// with big round eyes, so it reads as an insect, not a moth.
const DRAGON_UPPER = [[-4, -16], [-26, -29], [-41, -25], [-35, -17], [-19, -11], [-4, -8]]
const DRAGON_LOWER = [[-4, -2], [-22, -1], [-39, 8], [-32, 15], [-19, 13], [-4, 9]]
const DRAGON_BODY = [[-2.5, -20], [2.5, -20], [3.5, 16], [2, 28], [0, 36], [-2, 28], [-3.5, 16]]

// Wasp: striped teardrop abdomen hanging off a round thorax, small head with
// antennae, and one pair of long slim wings swept out flat and straight. The
// old cut curved the wings up like commas and they read as horns.
const WASP_WING = [[-3, -8], [-17, -21], [-34, -27], [-39, -22], [-27, -12], [-15, -5], [-4, -2]]
const WASP_THORAX = [[0, -19], [9, -13], [10, -5], [5, 1], [-5, 1], [-10, -5], [-9, -13]]
const WASP_LEG = stripPoints([-7, 1], [-18, 14], 1.8)
const WASP_HEAD = circlePoints(0, -22, 6, 12)
const WASP_ANTENNA_L = stripPoints([-1.5, -27], [-6, -38], 1.8)
const WASP_ABDOMEN = [[-8, -1], [8, -1], [10, 8], [7, 21], [0, 36], [-7, 21], [-10, 8]]
const WASP_STINGER = [[-2, 31], [2, 31], [0, 40]]

const BALLOON_ENVELOPE = [[0, -40], [16, -36], [25, -25], [27, -11], [23, 3], [13, 14], [7, 19], [-7, 19], [-13, 14], [-23, 3], [-27, -11], [-25, -25], [-16, -36]]
const BALLOON_BASKET = [[-9, 20], [9, 20], [7, 31], [-7, 31]]
const BALLOON_ROPE = [[-12, 10], [-10, 10], [-6, 20], [-8, 20]]

const DART = [[0, -34], [40, 25], [12, 16], [0, 34], [-12, 16], [-40, 25]]

/** Cut pieces for each named hazard, painted back to front. */
const HAZARD_PIECES = Object.freeze({
  bird: [
    piece(BIRD_WING),
    piece(mirrorX(BIRD_WING)),
    piece(BIRD_TAIL),
    piece(BIRD_BODY, { crease: [0, 0, 0, 1] }),
    piece(BIRD_HEAD),
    piece(BIRD_BEAK),
  ],
  hawk: [
    piece(HAWK_WING),
    piece(mirrorX(HAWK_WING)),
    piece(HAWK_TAIL),
    piece(HAWK_TALON, { ink: 0.55 }),
    piece(mirrorX(HAWK_TALON), { ink: 0.55 }),
    piece(HAWK_BODY, { crease: [0, 0, 0, 1] }),
    piece(HAWK_HEAD),
    piece(HAWK_BEAK),
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
    piece(BIPLANE_FIN, { crease: [0, -12, 0, 1] }),
    piece(BIPLANE_FUSELAGE, { crease: [0, 0, 1, 0] }),
    piece(BIPLANE_STRUT, { ink: 0.5 }),
    piece(mirrorX(BIPLANE_STRUT), { ink: 0.5 }),
    piece(BIPLANE_LOWER, { crease: [0, 13, 1, 0] }),
    piece(BIPLANE_UPPER, { crease: [0, -14, 1, 0] }),
    piece(BIPLANE_COCKPIT, { ink: 0.6 }),
    piece(BIPLANE_WHEEL, { ink: 0.7 }),
    piece(BIPLANE_NOSE),
    piece(BIPLANE_PROP, { ink: 0.55, crease: [0, 0, 0, 1] }),
  ],
  dragonfly: [
    piece(DRAGON_UPPER),
    piece(mirrorX(DRAGON_UPPER)),
    piece(DRAGON_LOWER),
    piece(mirrorX(DRAGON_LOWER)),
    piece(DRAGON_BODY, { crease: [0, -20, 0, 1] }),
    piece(circlePoints(-5.5, -27, 5, 10)),
    piece(circlePoints(5.5, -27, 5, 10)),
  ],
  wasp: [
    piece(WASP_WING),
    piece(mirrorX(WASP_WING)),
    piece(WASP_ANTENNA_L, { ink: 0.5 }),
    piece(mirrorX(WASP_ANTENNA_L), { ink: 0.5 }),
    piece(WASP_LEG, { ink: 0.45 }),
    piece(mirrorX(WASP_LEG), { ink: 0.45 }),
    piece(WASP_STINGER, { ink: 0.6 }),
    piece(WASP_ABDOMEN, { crease: [0, 0, 0, 1], stripes: [[-1, 3], [6, 10], [13, 17], [20, 24]] }),
    piece(WASP_THORAX, { crease: [0, -8, 0, 1] }),
    piece(WASP_HEAD),
  ],
  balloon: [
    piece(BALLOON_ENVELOPE, { crease: [0, -12, 0, 1] }),
    piece(BALLOON_ROPE, { ink: 0.6 }),
    piece(mirrorX(BALLOON_ROPE), { ink: 0.6 }),
    piece(BALLOON_BASKET),
  ],
})

// Authored paper stocks give the roster identity; the zone accent remains on
// each threat and the common ink silhouette / danger ring carries collision meaning.
const HAZARD_STOCKS = Object.freeze({
  bird: ['#fff1d3','#fff1d3','#e3c393',null,'#fff1d3','#d6a349'],
  hawk: ['#ac6244','#ac6244','#c5845f','#d6a349','#d6a349',null,'#ffe8b8','#d6a349'],
  kite: [null,'#fff1d3','#fff1d3','#e3c393','#e3c393','#283b4b'],
  biplane: ['#354b60','#fff1d3','#354b60','#354b60',null,null,'#354b60','#354b60','#d6a349','#354b60'],
  dragonfly: ['#b0dce0','#b0dce0','#d4ece3','#d4ece3',null,'#dab55d','#dab55d'],
  wasp: ['#fff1d3','#fff1d3','#283b4b','#283b4b','#283b4b','#283b4b','#283b4b','#e5b74e',null,null],
  balloon: [null,'#354b60','#354b60','#d5a56b'],
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

/** Halloween re-cut in the dove family: round head with round ears, a folded
 * diamond body, and membrane wings whose trailing edge carries the same two
 * scalloped notches as the dove's feather cuts. Same accent + ink. */
const BAT_WING = [[-2, -9], [-15, -14], [-28, -16], [-37, -14], [-30, -6], [-33, 1], [-24, 3], [-25, 9], [-7, 7]]
const BAT_BODY = [[0, -9], [6.5, 1], [0, 17], [-6.5, 1]]
const BAT_PIECES = Object.freeze([
  piece(BAT_WING, { crease: [-2, -9, -24, -7] }),
  piece(mirrorX(BAT_WING), { crease: [2, -9, 24, -7] }),
  piece(circlePoints(-5.5, -24, 4.5, 10)),
  piece(circlePoints(5.5, -24, 4.5, 10)),
  piece(BAT_BODY, { crease: [0, -9, 0, 1] }),
  piece(circlePoints(0, -17, 6.5, 12)),
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

/** Stable little hash so a sprite's grain is identical on every redraw. */
function hashLabel(label) {
  let hash = 2166136261
  for (let i = 0; i < label.length; i += 1) hash = Math.imul(hash ^ label.charCodeAt(i), 16777619) >>> 0
  return hash >>> 1 || 1
}

/**
 * Paint cut pieces in four hard passes: a solid offset shadow under everything,
 * then for each piece a thin ink edge, a lit facet, and a shaded facet split by
 * its fold crease. Each facet also takes a sparse fibre grain inside its own
 * outline, because the art rule gives every plane of colour grain. Only paths
 * and fills are used; nothing is blurred.
 */
function drawHazardPieces(ctx, size, accent, pieces, grainSeed = 1, stocks = []) {
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

  pieces.forEach((cut, index) => {
    const cutTones = stocks[index] ? hazardTones(stocks[index]) : tones
    // The stroke is centred on the outline, so only its outer half shows.
    ctx.strokeStyle = HAZARD_INK
    ctx.lineWidth = edge * 2 * cut.ink
    cut.build(ctx)
    ctx.stroke()

    ctx.fillStyle = cutTones.lit
    cut.build(ctx)
    ctx.fill(cut.rule)

    ctx.save()
    cut.build(ctx)
    ctx.clip(cut.rule)
    ctx.fillStyle = cutTones.shade
    fillShadedFacet(ctx, cut.crease || autoCrease(cut.points))
    if (cut.stripes) {
      ctx.fillStyle = cutTones.stripe
      for (const [y0, y1] of cut.stripes) ctx.fillRect(-SHEET, y0, SHEET * 2, y1 - y0)
    }
    drawGrain(ctx, SHEET, SHEET, 0.05, grainSeed + index * 131)
    ctx.restore()
  })
  ctx.restore()
}

/**
 * A hazard sprite, cut from paper rather than photographed.
 *
 * `kind` picks the silhouette and authored paper stocks. The zone accent,
 * common ink edge and runtime danger ring tie the threats together. `seasonId` optionally re-cuts the bird into its seasonal
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
  drawHazardPieces(ctx, width, fill, pieces, hashLabel(kind), kind === 'bird' && SEASONAL_BIRD_PIECES[seasonId] ? [] : HAZARD_STOCKS[kind] || (kind === 'scissors' ? ['#d7e4e5','#d7e4e5',null,null] : []))
  // Small ink details give the silhouettes character without changing their
  // outlines or the warning colour players use to identify danger.
  ctx.save()
  ctx.setTransform(width / SHEET, 0, 0, width / SHEET, width / 2, width / 2)
  if ((kind === 'bird' && !SEASONAL_BIRD_PIECES[seasonId]) || kind === 'hawk') {
    ctx.fillStyle = '#fff6e5'
    ctx.beginPath()
    ctx.arc(1.2, -18, 2.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = HAZARD_INK
    ctx.beginPath()
    ctx.arc(2, -18, 1.35, 0, Math.PI * 2)
    ctx.fill()
    if (kind === 'hawk') {
      ctx.strokeStyle = HAZARD_INK
      ctx.lineWidth = 1.8
      ctx.beginPath()
      ctx.moveTo(-1, -22)
      ctx.lineTo(4, -20)
      ctx.stroke()
    }
  } else if (kind === 'scissors') {
    ctx.fillStyle = HAZARD_INK
    ctx.beginPath()
    ctx.arc(0, 0, 3.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff6e5'
    ctx.beginPath()
    ctx.arc(0, 0, 1.3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = HAZARD_INK
  ctx.lineWidth = .8
  if ((kind === 'bird' && !SEASONAL_BIRD_PIECES[seasonId]) || kind === 'hawk') {
    for (const side of [-1,1]) for (let index=0;index<3;index++) {
      ctx.beginPath();ctx.moveTo(side*(14+index*6),-4-index*2);ctx.lineTo(side*(18+index*6),3-index*2);ctx.stroke()
    }
  } else if (kind === 'balloon') {
    ctx.strokeStyle = '#fff1d3';ctx.lineWidth = 1.5
    ctx.beginPath();ctx.ellipse(0,-12,12,25,0,0,Math.PI*2);ctx.stroke()
    ctx.beginPath();ctx.moveTo(0,-37);ctx.lineTo(0,15);ctx.stroke()
  } else if (kind === 'biplane') {
    ctx.fillStyle='#fff1d3';ctx.beginPath();ctx.arc(-5,0,4,0,Math.PI*2);ctx.fill()
    ctx.fillStyle=fill;ctx.beginPath();ctx.arc(-5,0,2.2,0,Math.PI*2);ctx.fill()
  }
  ctx.restore()
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
