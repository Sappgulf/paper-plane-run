const PAPER_BOSS_PREFIX = 'paper:boss:'

function defineBossArt(id, { alt, palette, shape }) {
  const url = `${PAPER_BOSS_PREFIX}${id}`
  return Object.freeze({
    id,
    texture: url,
    preview: url,
    alt,
    palette: Object.freeze(palette),
    shape: Object.freeze(shape),
  })
}

// Paper-diorama boss emblems — cream / navy / coral (or cyan/amber accents).
// Used as small badges around the open portal, never as a full-face wall.
export const BOSS_ART = Object.freeze({
  scissors: defineBossArt('scissors', {
    alt: 'Cream origami scissors with navy paper handles and a coral hinge pin.',
    palette: { primary: '#172b57', accent: '#e96957', paper: '#f7e8c5' },
    shape: { cue: 'open scissors silhouette', silhouette: 'scissors' },
  }),
  wind: defineBossArt('wind', {
    alt: 'Six curved cream turbine blades sweep inside a navy ring around a cyan hub.',
    palette: { primary: '#172b57', accent: '#58c7dc', paper: '#f7e8c5' },
    shape: { cue: 'curved turbine vane ring', silhouette: 'turbine' },
  }),
  stapler: defineBossArt('stapler', {
    alt: 'Cream stapler head raised open over a navy base plate, with an amber staple mid-fire over the anvil.',
    palette: { primary: '#172b57', accent: '#f59e0b', paper: '#f7e8c5' },
    shape: { cue: 'open stapler side silhouette', silhouette: 'stapler' },
  }),
  punch: defineBossArt('punch', {
    alt: 'Cream hole punch body with two navy round press heads, a coral lever arm swung up, and falling confetti dots.',
    palette: { primary: '#172b57', accent: '#e96957', paper: '#f7e8c5' },
    shape: { cue: 'hole punch with twin round press heads', silhouette: 'punch' },
  }),
})

// ---------------------------------------------------------------------------
// Procedural cut-paper emblems. Same language as src/game/paper-art.js: flat
// facets split by a fold crease, a hard offset shadow, a heavy ink edge, and no
// blur anywhere. Pieces are drawn in a 100-unit sheet centred on the canvas,
// with artwork kept inside roughly 8% of the edge.
// ---------------------------------------------------------------------------

const EMBLEM_PX = 256
const SHEET = 100
const TAU = Math.PI * 2
/** Hard drop shadow, 4% of the canvas, straight down-right. */
const SHADOW_OFFSET = 0.04 * SHEET
/** Visible ink edge, 4.5% of the canvas, heavy enough to read at phone distance. Strokes are centred, so double it. */
const INK_EDGE = 0.045 * SHEET
/** The pale plate the emblem sits on — a cool stock tone so cream facets keep contrast. */
const PLATE = '#d9e7f0'
const PLATE_DARK = '#c3d7e4'

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

/** Flat tones for each piece family, all derived from the boss palette. */
function emblemTones(palette) {
  return {
    paper: { lit: palette.paper, dark: mixHex(palette.paper, 'black', 0.22) },
    primary: { lit: mixHex(palette.primary, 'white', 0.2), dark: palette.primary },
    accent: { lit: mixHex(palette.accent, 'white', 0.2), dark: mixHex(palette.accent, 'black', 0.22) },
    shadow: mixHex(palette.primary, 'black', 0.45),
    ink: mixHex(palette.primary, 'black', 0.7),
  }
}

function piece(tone, build, crease, rule = 'nonzero', ink = 1) {
  return Object.freeze({ tone, build, crease, rule, ink })
}

function polyPath(points) {
  return (ctx) => {
    ctx.beginPath()
    points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
    ctx.closePath()
  }
}

function circlePath([cx, cy], r) {
  return (ctx) => {
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, TAU)
  }
}

/** Annulus, filled with evenodd so the centre stays open. */
function ringPath([cx, cy], outer, inner) {
  return (ctx) => {
    ctx.beginPath()
    ctx.arc(cx, cy, outer, 0, TAU)
    ctx.moveTo(cx + inner, cy)
    ctx.arc(cx, cy, inner, 0, TAU, true)
  }
}

function polar(r, angle) {
  return [r * Math.cos(angle), r * Math.sin(angle)]
}

/** Fold crease running through a point along a direction. */
function creaseThrough([x, y], [tx, ty]) {
  return [x, y, tx - x, ty - y]
}

/** Pointed blade from a base point to a tip, `width` wide at the base. */
function bladeOutline(from, to, width) {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const len = Math.hypot(dx, dy) || 1
  const nx = (-dy / len) * (width / 2)
  const ny = (dx / len) * (width / 2)
  return [
    [from[0] + nx, from[1] + ny],
    to,
    [from[0] - nx, from[1] - ny],
  ]
}

/** Straight strip from one point to another — lever arms, struts. */
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

function scissorsPieces() {
  const ringA = [-21, 19]
  const ringB = [21, 19]
  const tipA = [20, -36]
  const tipB = [-20, -36]
  const pivot = [0, -8]
  const along = (from, to, t) => [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]
  // Blades start just inside each handle ring and run to the opposite tip.
  const startA = along(ringA, tipA, 0.12)
  const startB = along(ringB, tipB, 0.12)
  return [
    piece('paper', polyPath(bladeOutline(startA, tipA, 12)), creaseThrough(startA, tipA)),
    piece('paper', polyPath(bladeOutline(startB, tipB, 12)), creaseThrough(startB, tipB)),
    piece('primary', ringPath(ringA, 15, 7.5), creaseThrough(ringA, [ringA[0] + 1, ringA[1] - 1])),
    piece('primary', ringPath(ringB, 15, 7.5), creaseThrough(ringB, [ringB[0] + 1, ringB[1] - 1])),
    piece('accent', circlePath(pivot, 6), creaseThrough(pivot, [pivot[0] + 1, pivot[1] - 1])),
  ]
}

/**
 * Wind: a fan turbine, not a steering wheel. Six curved cream blades sweep one
 * way inside a navy rim, around a cyan hub — the curved cut is what separates
 * "fan pushing air" from the old straight three spokes.
 */
function windPieces() {
  const rimCentre = [0, 0]
  const vanes = []
  for (let k = 0; k < 6; k += 1) {
    const angle = -Math.PI / 2 + (k * TAU) / 6
    // A curved blade: the outer edge trails the inner edge by a sweep, so the
    // flat cut still reads as a pitched fan blade.
    const outline = [
      polar(12, angle),
      polar(29.5, angle + 0.42),
      polar(29.5, angle + 0.72),
      polar(12, angle + 0.24),
    ]
    vanes.push(piece('paper', polyPath(outline), creaseThrough(polar(16, angle + 0.42), polar(29, angle + 0.62))))
  }
  return [
    piece('primary', ringPath(rimCentre, 36, 30.5), creaseThrough(rimCentre, [1, -1])),
    ...vanes,
    piece('accent', circlePath(rimCentre, 12), creaseThrough(rimCentre, [1, -1])),
  ]
}

/**
 * Stapler: side view with the jaws genuinely open — a navy base plate with an
 * anvil lip, the cream head hinged up behind it, and a fired amber staple
 * mid-air over the mouth. The old cut was a closed iron-shaped block.
 */
/**
 * Stapler: side view with the jaws genuinely open — the cream head is a Γ
 * shape whose underside overhangs the navy anvil, leaving a wide rectangular
 * mouth with a fired amber staple inside it. The old cut was a closed
 * iron-shaped block with the staple perched on top.
 */
function staplerPieces() {
  const base = [[-38, 12], [38, 12], [38, 22], [-38, 22]]
  const anvil = [[8, 8], [38, 8], [38, 12], [8, 12]]
  // Γ-shaped head: thick top bar over the whole mouth, a rear leg down to the
  // base, and its underside lifted well clear of the anvil — that pale gap is
  // what says "jaws open" from a distance.
  const head = [[-38, -22], [36, -22], [36, -12], [10, -12], [10, 12], [-38, 12]]
  // A U-shaped staple, bridge up, legs reaching for the anvil. Its ink is
  // lightened so the amber still reads instead of collapsing into black.
  const staple = [[14, 8], [14, -6], [34, -6], [34, 8], [30, 8], [30, -1], [18, -1], [18, 8]]
  const hinge = circlePath([-29, 10], 4.5)
  return [
    piece('primary', polyPath(base), creaseThrough([-38, 17], [38, 17])),
    piece('primary', polyPath(anvil), creaseThrough([16, 10], [38, 10])),
    piece('paper', polyPath(head), creaseThrough([-38, -17], [36, -17])),
    piece('accent', polyPath(staple), creaseThrough([15, 1], [34, 1]), 'nonzero', 0.55),
    piece('accent', hinge, creaseThrough([-29, 10], [-28, 9]), 'nonzero', 0.7),
  ]
}

/**
 * Punch: a real hole punch in side view — cream wedge body, twin round navy
 * press heads on top, a coral lever arm swung up over the back, and two
 * confetti dots falling free of the throat. The old cut was a pale slab with a
 * red hook that named nothing.
 */
function punchPieces() {
  const body = [[-34, 16], [-38, 2], [-26, -10], [16, -10], [30, 2], [32, 16]]
  const throat = [[20, -10], [32, 2], [32, -10]]
  const headBack = circlePath([-6, -13], 9)
  const headFront = circlePath([14, -10], 8)
  const lever = stripPoints([-30, -12], [20, -36], 7)
  const leverKnuckle = circlePath([20, -36], 5)
  const dotBig = circlePath([26, 23], 5)
  const dotSmall = circlePath([17, 31], 3.5)
  return [
    piece('paper', polyPath(body), creaseThrough([-38, 18], [32, 2])),
    piece('primary', polyPath(throat), creaseThrough([20, -10], [32, -10])),
    piece('primary', headBack, creaseThrough([-6, -13], [-5, -14])),
    piece('primary', headFront, creaseThrough([14, -10], [15, -11])),
    piece('accent', polyPath(lever), creaseThrough([-30, -12], [20, -36])),
    piece('accent', leverKnuckle, creaseThrough([20, -36], [21, -37]), 'nonzero', 0.7),
    piece('accent', dotBig, creaseThrough([26, 23], [27, 22]), 'nonzero', 0.7),
    piece('accent', dotSmall, creaseThrough([17, 31], [18, 30]), 'nonzero', 0.7),
  ]
}

const EMBLEM_PIECES = Object.freeze({
  scissors: scissorsPieces,
  wind: windPieces,
  stapler: staplerPieces,
  punch: punchPieces,
})

/** Fill the facet on the shaded side of a crease, lower-right of the fold. */
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
  const reach = SHEET * 2
  ctx.beginPath()
  ctx.moveTo(cx - ux * reach, cy - uy * reach)
  ctx.lineTo(cx + ux * reach, cy + uy * reach)
  ctx.lineTo(cx + ux * reach + nx * reach, cy + uy * reach + ny * reach)
  ctx.lineTo(cx - ux * reach + nx * reach, cy - uy * reach + ny * reach)
  ctx.closePath()
  ctx.fill()
}

/** Sparse deterministic fibre grain over the current clip region. */
function drawGrain(ctx, size, seed = 1, alpha = 0.05) {
  let state = Math.max(1, Math.floor(seed)) >>> 0
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
  ctx.save()
  ctx.globalAlpha = alpha
  for (let i = 0; i < size * size * 0.04; i += 1) {
    const x = random() * size
    const y = random() * size
    ctx.fillStyle = random() < 0.5 ? '#000000' : '#ffffff'
    ctx.fillRect(x, y, 1, random() < 0.2 ? 2 : 1)
  }
  ctx.restore()
}

/** Fold crease: one hard highlight line and its hard shadow, never blurred. */
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

/** Four hard passes: offset shadows, then per piece ink, lit facet, shaded facet, grain. */
function drawEmblemPieces(ctx, size, tones, pieces, seed = 1) {
  const scale = size / SHEET
  ctx.save()
  ctx.setTransform(scale, 0, 0, scale, size / 2, size / 2)
  ctx.lineJoin = 'round'

  ctx.fillStyle = tones.shadow
  for (const cut of pieces) {
    ctx.save()
    ctx.translate(SHADOW_OFFSET, SHADOW_OFFSET)
    cut.build(ctx)
    ctx.fill(cut.rule)
    ctx.restore()
  }

  pieces.forEach((cut, index) => {
    const tone = tones[cut.tone]
    ctx.strokeStyle = tones.ink
    ctx.lineWidth = INK_EDGE * 2 * (cut.ink ?? 1)
    cut.build(ctx)
    ctx.stroke()

    ctx.fillStyle = tone.lit
    cut.build(ctx)
    ctx.fill(cut.rule)

    ctx.save()
    cut.build(ctx)
    ctx.clip(cut.rule)
    ctx.fillStyle = tone.dark
    fillShadedFacet(ctx, cut.crease)
    drawGrain(ctx, SHEET, seed + index * 37, 0.045)
    ctx.restore()
  })
  ctx.restore()
}

function makeCanvas(canvasFactory, width, height) {
  if (typeof canvasFactory === 'function') return canvasFactory(width, height)
  const doc = globalThis.document
  if (doc && typeof doc.createElement === 'function') {
    const canvas = doc.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  }
  return null
}

/**
 * Draw one emblem onto a fresh canvas, or return null when no canvas can be
 * made (node tests, no DOM, no factory).
 */
function drawBossEmblem(id, palette, { canvasFactory, size = EMBLEM_PX } = {}) {
  const buildPieces = EMBLEM_PIECES[id]
  if (!buildPieces) return null
  const canvas = makeCanvas(canvasFactory, size, size)
  if (!canvas) return null
  const ctx = canvas.getContext?.('2d')
  if (!ctx) return null
  const tones = emblemTones(palette)
  // A pale paper plate with a heavy navy ink frame and a hard offset shadow
  // sits behind the emblem, so the badge reads against a pale sky as well as a
  // dark one. The plate itself is a folded paper sheet: grain plus one crease.
  const inset = size * 0.045
  const frame = size * 0.05
  const off = size * 0.03
  ctx.fillStyle = tones.shadow
  ctx.fillRect(inset + off, inset + off, size - inset * 2, size - inset * 2)
  ctx.fillStyle = tones.ink
  ctx.fillRect(inset, inset, size - inset * 2, size - inset * 2)
  ctx.fillStyle = PLATE
  ctx.fillRect(inset + frame, inset + frame, size - (inset + frame) * 2, size - (inset + frame) * 2)
  // A folded corner plus its crease keeps the plate from reading as a UI panel.
  const fold = size * 0.16
  const corner = size - inset - frame
  ctx.fillStyle = PLATE_DARK
  ctx.beginPath()
  ctx.moveTo(corner - fold, inset + frame)
  ctx.lineTo(corner, corner)
  ctx.lineTo(corner - fold, corner)
  ctx.closePath()
  ctx.fill()
  drawCrease(ctx, { x0: corner - fold, y0: inset + frame, x1: corner, y1: corner, alpha: 0.2 })
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(inset + frame, inset + frame)
  ctx.lineTo(size - inset - frame, inset + frame)
  ctx.lineTo(size - inset - frame, size - inset - frame)
  ctx.lineTo(inset + frame, size - inset - frame)
  ctx.closePath()
  ctx.clip()
  drawGrain(ctx, size, 811, 0.04)
  ctx.restore()
  drawEmblemPieces(ctx, size, tones, buildPieces(), id.length * 97 + size)
  return canvas
}

/**
 * One transparent emblem badge mesh.
 * size stays small so the flyable portal center stays empty.
 * Paper emblems (`paper:boss:<id>`) are drawn on a canvas right away. Any other
 * url still goes through loadTexture, so real image files keep working.
 */
export function createBossArtOverlay({ THREE, kind, size = 2.8, loadTexture, canvasFactory }) {
  const art = BOSS_ART[kind]
  if (!art) return null

  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 1,
    alphaTest: 0.08,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material)
  overlay.name = `bossArt-${kind}`
  overlay.renderOrder = 6
  overlay.visible = false

  const showTexture = (texture) => {
    if (!texture) return
    texture.colorSpace = THREE.SRGBColorSpace
    texture.premultiplyAlpha = false
    material.map = texture
    material.needsUpdate = true
    overlay.visible = true
  }
  const keepProceduralFallback = () => { overlay.visible = false }

  if (art.texture.startsWith(PAPER_BOSS_PREFIX)) {
    try {
      const id = art.texture.slice(PAPER_BOSS_PREFIX.length)
      const canvas = drawBossEmblem(id, art.palette, { canvasFactory })
      if (canvas) {
        showTexture(new THREE.CanvasTexture(canvas))
      } else {
        keepProceduralFallback()
      }
    } catch (error) {
      console.warn(`[boss-art] could not draw ${art.id} emblem`, error)
      keepProceduralFallback()
    }
    return overlay
  }

  try {
    loadTexture(art.texture, showTexture, keepProceduralFallback)
  } catch {
    keepProceduralFallback()
  }

  return overlay
}

/**
 * Layout for badges around an open portal:
 * - top identity badge
 * - left / right side badges (mirrored on right)
 * Never covers the center flyable hole.
 */
export function getBossBadgeLayout({ halfWidth = 4, halfHeight = 3.7, gapY = 10 } = {}) {
  // The top badge sits far above the gate, so it needs more size than the flanks
  // to read as a boss emblem from play distance — at gate distance a 3.7-unit
  // plate was a speck, so the identity badge grew and its silhouette fills the
  // plate right up to the frame.
  const topSize = 5
  const sideSize = 3.5
  return Object.freeze({
    top: Object.freeze({
      size: topSize,
      x: 0,
      y: gapY + halfHeight + topSize * 0.55 + 0.35,
      z: 0.6,
      scaleX: 1,
    }),
    left: Object.freeze({
      size: sideSize,
      x: -(halfWidth + sideSize * 0.55 + 0.55),
      y: gapY,
      z: 0.55,
      scaleX: 1,
    }),
    right: Object.freeze({
      size: sideSize,
      x: halfWidth + sideSize * 0.55 + 0.55,
      y: gapY,
      z: 0.55,
      scaleX: -1, // mirror for balance
    }),
  })
}
