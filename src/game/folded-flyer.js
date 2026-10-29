import * as THREE from 'three'

const geometryCache = new Map()
const ARTICULATED = new Set(['bird', 'hawk', 'dragonfly', 'wasp'])

// Three UV strips reconstruct the original art at rest. Shared buffers keep
// endless spawning bounded; only the wing hinges belong to each flyer.
function strips(scale) {
  if (geometryCache.has(scale)) return geometryCache.get(scale)
  const parts = [[0, .34], [.34, .66], [.66, 1]].map(([from, to], index) => {
    const geometry = new THREE.PlaneGeometry(scale * (to - from), scale)
    const uv = geometry.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setX(i, from + uv.getX(i) * (to - from))
    if (index !== 1) geometry.translate((index === 0 ? -1 : 1) * scale * .17, 0, 0)
    return geometry
  })
  geometryCache.set(scale, parts)
  return parts
}

export function flyerWingAngle({ kind, phase = 0, reducedMotion = false } = {}) {
  if (reducedMotion) return .12
  const insect = kind === 'dragonfly' || kind === 'wasp'
  return .12 + (.5 + .5 * Math.sin(phase * (insect ? 4 : 1))) * (insect ? .5 : .38)
}

export function createFoldedFlyer({ kind, scale = 1.5, material } = {}) {
  if (!ARTICULATED.has(kind)) return null
  const group = new THREE.Group()
  group.name = 'foldedPaperFlyer'
  const geometry = strips(scale)
  const left = new THREE.Mesh(geometry[0], material)
  const body = new THREE.Mesh(geometry[1], material)
  const right = new THREE.Mesh(geometry[2], material)
  left.position.x = -scale * .16
  right.position.x = scale * .16
  group.add(left, body, right)
  group.userData.wings = [left, right]
  poseFoldedFlyer(group, { kind, reducedMotion: true })
  return group
}

export function poseFoldedFlyer(group, options) {
  const wings = group?.userData.wings
  if (!wings) return
  const angle = flyerWingAngle(options)
  wings[0].rotation.y = angle
  wings[1].rotation.y = -angle
}
