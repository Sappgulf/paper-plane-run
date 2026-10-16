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
    alt: 'Cream paper turbine vanes in a navy octagon ring with cyan hub and coral diamonds.',
    palette: { primary: '#172b57', accent: '#58c7dc', paper: '#f7e8c5' },
    shape: { cue: 'radial turbine ring', silhouette: 'turbine' },
  }),
  stapler: defineBossArt('stapler', {
    alt: 'Cream paper desk stapler with open jaws, navy base, and coral paper wheel.',
    palette: { primary: '#172b57', accent: '#f59e0b', paper: '#f7e8c5' },
    shape: { cue: 'open stapler side silhouette', silhouette: 'stapler' },
  }),
  punch: defineBossArt('punch', {
    alt: 'Navy paper hole punch with a coral lever arm over a cream confetti dot.',
    palette: { primary: '#172b57', accent: '#e96957', paper: '#f7e8c5' },
    shape: { cue: 'twin round press ring', silhouette: 'punch' },
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
/** Visible ink edge, 3.5% of the canvas, heavy enough to read at phone distance. Strokes are centred, so double it. */
const INK_EDGE = 0.035 * SHEET

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

function piece(tone, build, crease, rule = 'nonzero') {
  return Object.freeze({ tone, build, crease, rule })
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

function windPieces() {
  const rimCentre = [0, 0]
  const vanes = [0, 1, 2].map((k) => {
    const angle = -Math.PI / 2 + (k * TAU) / 3
    const outline = [
      polar(8, angle - 0.2),
      polar(31, angle + 0.3),
      polar(29, angle + 0.52),
      polar(9, angle + 0.22),
    ]
    return piece('paper', polyPath(outline), creaseThrough(polar(9, angle), polar(30, angle + 0.35)))
  })
  return [
    piece('primary', ringPath(rimCentre, 35, 29.5), creaseThrough(rimCentre, [1, -1])),
    ...vanes,
    piece('accent', circlePath(rimCentre, 9), creaseThrough(rimCentre, [1, -1])),
  ]
}

function staplerPieces() {
  // Desk stapler in side view: high back, sloped nose, flat navy base plate.
  const head = [[-35, 16], [-35, -8], [-27, -19], [4, -21], [29, -6], [35, 16]]
  const jaw = [[-39, 16], [37, 16], [37, 27], [-39, 27]]
  // A U-shaped staple, bridge up and legs down, just fired above the nose.
  const staple = [
    [11, -22], [11, -36], [16, -38], [26, -38], [31, -36], [31, -22],
    [26, -22], [26, -33], [16, -33], [16, -22],
  ]
  return [
    piece('paper', polyPath(head), creaseThrough([-35, 2], [35, 2])),
    piece('primary', polyPath(jaw), creaseThrough([-39, 21], [37, 21])),
    piece('accent', polyPath(staple), creaseThrough([11, -35], [31, -35])),
  ]
}

function punchPieces() {
  // Hole punch in side view: a cream body block, a navy throat, a coral lever
  // arm reaching over the top, and the round confetti dot it just cut.
  // Coordinates stay inside the ±40 emblem margin like every other boss.
  const body = [[-30, 14], [-30, -12], [-12, -22], [14, -22], [30, -10], [30, 14]]
  const neck = [[-10, -22], [-5, -34], [12, -34], [17, -22]]
  const lever = [[-6, -28], [-2, -40], [24, -40], [28, -28], [20, -28], [18, -36], [6, -36], [4, -28]]
  const dot = circlePath([16, 28], 7)
  return [
    piece('paper', polyPath(body), creaseThrough([-30, 0], [30, 0])),
    piece('primary', polyPath(neck), creaseThrough([-10, -28], [17, -28])),
    piece('accent', polyPath(lever), creaseThrough([-2, -36], [28, -32])),
    piece('accent', dot, creaseThrough([16, 24], [17, 31])),
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

/** Four hard passes: offset shadows, then per piece ink, lit facet, shaded facet. */
function drawEmblemPieces(ctx, size, tones, pieces) {
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

  for (const cut of pieces) {
    const tone = tones[cut.tone]
    ctx.strokeStyle = tones.ink
    ctx.lineWidth = INK_EDGE * 2
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
    ctx.restore()
  }
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
  // A pale paper plate with an ink edge sits behind the emblem, so the badge
  // reads against a pale sky as well as a dark one.
  const inset = size * 0.04
  const edge = size * 0.035
  ctx.fillStyle = '#2b2b2b'
  ctx.fillRect(inset, inset, size - inset * 2, size - inset * 2)
  ctx.fillStyle = '#d9e7f0'
  ctx.fillRect(inset + edge, inset + edge, size - (inset + edge) * 2, size - (inset + edge) * 2)
  drawEmblemPieces(ctx, size, emblemTones(palette), buildPieces())
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
  // to read as a boss emblem from play distance.
  const topSize = 3.7
  const sideSize = 3.15
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
