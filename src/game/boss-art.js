const BOSS_ASSET_ROOT = '/assets/bosses'

function defineBossArt(id, { alt, palette, shape }) {
  return Object.freeze({
    id,
    texture: `${BOSS_ASSET_ROOT}/${id}.webp`,
    preview: `${BOSS_ASSET_ROOT}/${id}.webp`,
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
})

/**
 * One transparent emblem badge mesh.
 * size stays small so the flyable portal center stays empty.
 */
export function createBossArtOverlay({ THREE, kind, size = 2.8, loadTexture }) {
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
  const topSize = 2.9
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
