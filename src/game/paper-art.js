/**
 * One art rule, applied to everything.
 *
 * The old look was a texture library, not a direction: six photographic sky
 * JPEGs, six ground JPEGs, a `buildings.jpg` tile. Nothing shared a palette,
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
/** Outline weight as a fraction of sprite size — hairlines vanish at distance. */
export const HAZARD_OUTLINE = 0.055

function outlinedPath(ctx, size, fill, draw) {
  const line = Math.max(2, size * HAZARD_OUTLINE)
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  // Ink first and fat, then the fill on top: one path drawn twice gives a hard
  // even outline without needing a second, offset silhouette.
  ctx.strokeStyle = HAZARD_INK
  ctx.lineWidth = line * 2.2
  draw(ctx)
  ctx.stroke()
  ctx.fillStyle = fill
  ctx.strokeStyle = fill
  ctx.lineWidth = line * 0.6
  draw(ctx)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

/** Crossed blades and two finger rings — read as scissors at any distance. */
function drawScissors(ctx, size, fill) {
  const c = size / 2
  const cy = size * .45
  const s = size / 100 * .85
  outlinedPath(ctx, size, fill, (context) => {
    context.beginPath()
    context.moveTo(c - 26 * s, cy + 34 * s)
    context.lineTo(c + 22 * s, cy - 38 * s)
    context.moveTo(c + 26 * s, cy + 34 * s)
    context.lineTo(c - 22 * s, cy - 38 * s)
  })
  for (const side of [-1, 1]) {
    outlinedPath(ctx, size, fill, (context) => {
      context.beginPath()
      context.arc(c + side * 20 * s, cy + 40 * s, 13 * s, 0, Math.PI * 2)
    })
  }
}

/** A hard-angled paper dart silhouette: two swept wings and a tail. */
function drawFlyer(ctx, size, fill) {
  const c = size / 2
  const s = size / 100
  outlinedPath(ctx, size, fill, (context) => {
    context.beginPath()
    context.moveTo(c, c - 34 * s)
    context.lineTo(c + 42 * s, c + 26 * s)
    context.lineTo(c + 12 * s, c + 16 * s)
    context.lineTo(c, c + 36 * s)
    context.lineTo(c - 12 * s, c + 16 * s)
    context.lineTo(c - 42 * s, c + 26 * s)
    context.closePath()
  })
}

// Coordinates are paper cuts in a 100-unit sheet. Each active flyer keeps a
// recognizable silhouette even when its texture is only a few pixels tall.
export const HAZARD_PROFILES = Object.freeze({
  bird: [[[-42,-12],[-13,-7],[0,7],[13,-7],[42,-12],[26,10],[9,18],[0,11],[-9,18],[-26,10]]],
  hawk: [[[-43,-24],[-24,-10],[-6,-4],[0,-18],[6,-4],[24,-10],[43,-24],[34,13],[12,21],[5,15],[0,35],[-5,15],[-12,21],[-34,13]]],
  kite: [[[0,-37],[28,0],[0,26],[-28,0]],[[0,24],[6,30],[-5,35],[5,40],[0,41],[-10,35]]],
  biplane: [[[-40,-19],[40,-19],[40,-9],[-40,-9]],[[-37,8],[37,8],[37,18],[-37,18]],[[-6,-30],[6,-30],[9,31],[-9,31]],[[-19,25],[19,25],[19,33],[-19,33]]],
  dragonfly: [[[-4,-18],[-39,-30],[-42,-12],[-7,-2]],[ [4,-18],[39,-30],[42,-12],[7,-2]],[[-5,0],[-35,5],[-28,23],[-4,12]],[[5,0],[35,5],[28,23],[4,12]],[[-4,-25],[4,-25],[5,30],[0,39],[-5,30]]],
  wasp: [[[-4,-10],[-29,-29],[-35,-12],[-9,5]],[[4,-10],[29,-29],[35,-12],[9,5]],[[0,-20],[12,-6],[10,18],[0,34],[-10,18],[-12,-6]]],
  balloon: [Array.from({length:12},(_,i)=>{ const a=i*Math.PI/6; return [Math.cos(a)*27,Math.sin(a)*31-10] }),[[-4,20],[4,20],[7,27],[-7,27]],[[0,27],[3,34],[-1,41],[-3,40],[0,34],[-2,28]]],
})

function drawProfile(ctx, size, fill, profile) {
  const center = size / 2, scale = size / 100
  for (const points of profile) outlinedPath(ctx, size, fill, context => {
    context.beginPath()
    points.forEach(([x,y], index) => {
      const method = index ? 'lineTo' : 'moveTo'
      context[method](center+x*scale,center+y*scale)
    })
    context.closePath()
  })
  // A narrow crease differentiates the two sides without changing danger ink.
  ctx.strokeStyle = HAZARD_INK
  ctx.lineWidth = Math.max(1, size * .012)
  ctx.beginPath(); ctx.moveTo(center,center-size*.12); ctx.lineTo(center,center+size*.12); ctx.stroke()
}

/**
 * A hazard sprite, cut from paper rather than photographed.
 *
 * `kind` picks the silhouette; everything else is the zone accent plus ink, so
 * a new hazard type cannot accidentally arrive in a colour that means
 * something else.
 */
export function createHazardCanvas({
  kind = 'flyer',
  palette = DEFAULT_PALETTE,
  size = 128,
  canvasFactory,
} = {}) {
  const width = Math.max(16, Math.floor(size))
  const canvas = makeCanvas(canvasFactory, width, width)
  if (!canvas) return null
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const fill = palette.accent || DEFAULT_PALETTE.accent
  if (kind === 'scissors') drawScissors(ctx, width, fill)
  else if (HAZARD_PROFILES[kind]) drawProfile(ctx, width, fill, HAZARD_PROFILES[kind])
  else drawFlyer(ctx, width, fill)
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
