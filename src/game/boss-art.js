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

// These cues deliberately combine a high-contrast palette with a distinct
// silhouette so a boss never relies on color alone for recognition.
export const BOSS_ART = Object.freeze({
  scissors: defineBossArt('scissors', {
    alt: 'Cream paper blades crossing above navy loop handles and a coral hinge.',
    palette: { primary: '#172b57', accent: '#e96957', paper: '#f7e8c5' },
    shape: { cue: 'crossed blade pair with loop handles', silhouette: 'scissors' },
  }),
  wind: defineBossArt('wind', {
    alt: 'Cream paper turbine vanes inside a navy octagonal shroud with a cyan hub.',
    palette: { primary: '#172b57', accent: '#58c7dc', paper: '#f7e8c5' },
    shape: { cue: 'radial turbine vanes inside an octagonal ring', silhouette: 'turbine' },
  }),
  stapler: defineBossArt('stapler', {
    alt: 'Cream paper desk stapler with navy jaws and a coral hinge, open slot in the middle.',
    palette: { primary: '#172b57', accent: '#f59e0b', paper: '#f7e8c5' },
    shape: { cue: 'horizontal jaw pair with a clear center slot', silhouette: 'stapler' },
  }),
})

/**
 * Creates an optional visual layer for a procedural boss. The owning boss
 * remains fully rendered and collidable if this asynchronous texture request
 * fails, including when an offline bundle is incomplete.
 */
export function createBossArtOverlay({ THREE, kind, size, loadTexture }) {
  const art = BOSS_ART[kind]
  if (!art) return null

  const material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.9,
    alphaTest: 0.01,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material)
  overlay.name = `bossArt-${kind}`
  overlay.renderOrder = 2
  overlay.visible = false

  const showTexture = (texture) => {
    if (!texture) return
    texture.colorSpace = THREE.SRGBColorSpace
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
