const BOSS_ASSET_ROOT = '/assets/bosses'

function defineBossArt(id, { alt, palette, shape }) {
  return Object.freeze({
    id,
    texture: `${BOSS_ASSET_ROOT}/${id}-v2.webp`,
    preview: `${BOSS_ASSET_ROOT}/${id}-v2.webp`,
    alt,
    palette: Object.freeze(palette),
    shape: Object.freeze(shape),
  })
}

// Paper-diorama boss emblems — strong silhouettes generated for the new
// readable boss machines. One large emblem sits above each open passage.
export const BOSS_ART = Object.freeze({
  scissors: defineBossArt('scissors', {
    alt: 'Large coral and navy folded-paper scissors with a brass hinge.',
    palette: { primary: '#172b57', accent: '#e96957', paper: '#f7e8c5' },
    shape: { cue: 'crossed blade silhouette', silhouette: 'scissors' },
  }),
  wind: defineBossArt('wind', {
    alt: 'Large navy and cyan folded-paper wind turbine with a cream hub.',
    palette: { primary: '#172b57', accent: '#58c7dc', paper: '#f7e8c5' },
    shape: { cue: 'radial turbine silhouette', silhouette: 'turbine' },
  }),
  stapler: defineBossArt('stapler', {
    alt: 'Open coral and navy folded-paper stapler with a cream paper strip.',
    palette: { primary: '#172b57', accent: '#f59e0b', paper: '#f7e8c5' },
    shape: { cue: 'open stapler jaw silhouette', silhouette: 'stapler' },
  }),
})

/**
 * One transparent hero emblem mesh.
 * The runtime keeps it above the passage, so the gameplay opening remains
 * entirely procedural and unobstructed.
 */
export function createBossArtOverlay({ THREE, kind, size = 5.2, loadTexture }) {
  const art = BOSS_ART[kind]
  if (!art) return null

  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 1,
    alphaTest: 0.08,
    depthWrite: false,
    depthTest: false,
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
 * Layout for the boss identity and optional decorative side slots around an
 * open portal. The flight scene currently uses only the top hero slot; the
 * side slots remain useful to consumers that want a wider boss-card layout.
 * Never covers the center flyable hole.
 */
export function getBossBadgeLayout({ halfWidth = 4, halfHeight = 3.7, gapY = 10 } = {}) {
  const topSize = 5.2
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
