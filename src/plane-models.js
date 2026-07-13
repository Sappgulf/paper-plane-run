export const PLANE_COLLISION_RADIUS = 0.7
export const PLANE_SILHOUETTES = Object.freeze(['classic', 'dart', 'glider', 'stunt'])

const PLANE_GEOMETRY = Object.freeze({
  classic: Object.freeze({
    id: 'classic',
    label: 'Classic Fold',
    dimensions: Object.freeze({ width: 1, length: 0.85, height: 0.18 }),
    collisionRadius: PLANE_COLLISION_RADIUS,
    wingL: Object.freeze([[0, 0], [-1.4, -0.15], [0, 0.35]]),
    wingR: Object.freeze([[0, 0], [1.4, -0.15], [0, 0.35]]),
    creaseL: Object.freeze([[0, 0], [-0.55, -0.07], [0, 0.14]]),
    creaseR: Object.freeze([[0, 0], [0.55, -0.07], [0, 0.14]]),
    body: Object.freeze({ size: [0.12, 0.08, 1.6], position: [0, 0.04, -0.1] }),
    nose: Object.freeze({ radius: 0.08, length: 0.35, position: [0, 0.02, 0.85] }),
    tail: Object.freeze({ size: [0.06, 0.28, 0.28], position: [0, 0.16, -0.7] }),
  }),
  dart: Object.freeze({
    id: 'dart',
    label: 'Dart',
    dimensions: Object.freeze({ width: 0.74, length: 1, height: 0.16 }),
    collisionRadius: PLANE_COLLISION_RADIUS,
    wingL: Object.freeze([[0, -0.3], [-1.02, -0.42], [0, 0.66]]),
    wingR: Object.freeze([[0, -0.3], [1.02, -0.42], [0, 0.66]]),
    creaseL: Object.freeze([[0, -0.2], [-0.48, -0.28], [0, 0.38]]),
    creaseR: Object.freeze([[0, -0.2], [0.48, -0.28], [0, 0.38]]),
    body: Object.freeze({ size: [0.1, 0.07, 2.05], position: [0, 0.035, -0.02] }),
    nose: Object.freeze({ radius: 0.07, length: 0.42, position: [0, 0.015, 1.18] }),
    tail: Object.freeze({ size: [0.05, 0.22, 0.38], position: [0, 0.13, -0.92] }),
  }),
  glider: Object.freeze({
    id: 'glider',
    label: 'Glider',
    dimensions: Object.freeze({ width: 1, length: 0.68, height: 0.15 }),
    collisionRadius: PLANE_COLLISION_RADIUS,
    wingL: Object.freeze([[0, -0.2], [-1.7, -0.06], [-1.52, 0.3], [0, 0.5]]),
    wingR: Object.freeze([[0, -0.2], [1.7, -0.06], [1.52, 0.3], [0, 0.5]]),
    creaseL: Object.freeze([[0, -0.11], [-0.76, -0.04], [-0.65, 0.16], [0, 0.28]]),
    creaseR: Object.freeze([[0, -0.11], [0.76, -0.04], [0.65, 0.16], [0, 0.28]]),
    body: Object.freeze({ size: [0.14, 0.07, 1.45], position: [0, 0.035, -0.08] }),
    nose: Object.freeze({ radius: 0.09, length: 0.3, position: [0, 0.02, 0.78] }),
    tail: Object.freeze({ size: [0.08, 0.23, 0.34], position: [0, 0.14, -0.62] }),
  }),
  stunt: Object.freeze({
    id: 'stunt',
    label: 'Stunt Fold',
    dimensions: Object.freeze({ width: 0.88, length: 0.78, height: 0.28 }),
    collisionRadius: PLANE_COLLISION_RADIUS,
    wingL: Object.freeze([[0, -0.2], [-1.28, -0.24], [-1.03, 0.08], [-1.34, 0.38], [0, 0.5]]),
    wingR: Object.freeze([[0, -0.2], [1.28, -0.24], [1.03, 0.08], [1.34, 0.38], [0, 0.5]]),
    creaseL: Object.freeze([[0, -0.1], [-0.62, -0.12], [-0.5, 0.08], [-0.72, 0.2], [0, 0.27]]),
    creaseR: Object.freeze([[0, -0.1], [0.62, -0.12], [0.5, 0.08], [0.72, 0.2], [0, 0.27]]),
    body: Object.freeze({ size: [0.13, 0.1, 1.55], position: [0, 0.05, -0.05] }),
    nose: Object.freeze({ radius: 0.09, length: 0.34, position: [0, 0.025, 0.86] }),
    tail: Object.freeze({ size: [0.08, 0.4, 0.32], position: [0, 0.22, -0.66] }),
  }),
})

export function getPlaneGeometrySpec(silhouette) {
  return PLANE_GEOMETRY[silhouette] || PLANE_GEOMETRY.classic
}

function makeShape(THREE, points) {
  const shape = new THREE.Shape()
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  })
  shape.closePath()
  return shape
}

function makeMaterial(THREE, provided, color) {
  return provided || new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide })
}

function makeWing({ THREE, points, creasePoints, bodyMaterial, accentMaterial, name }) {
  const wing = new THREE.Mesh(new THREE.ShapeGeometry(makeShape(THREE, points)), bodyMaterial)
  wing.rotation.x = -Math.PI / 2
  wing.castShadow = true
  wing.name = name

  const crease = new THREE.Mesh(new THREE.ShapeGeometry(makeShape(THREE, creasePoints)), accentMaterial)
  crease.position.z = 0.004
  crease.name = `${name}Crease`
  wing.add(crease)
  return wing
}

function makeUpgradeTrail(THREE, material) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24 * 3), 3))
  const trail = new THREE.Points(
    geometry,
    material || new THREE.PointsMaterial({
      color: 0xfff0c0,
      size: 0.22,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    }),
  )
  trail.name = 'upgradeTrail'
  trail.visible = false
  return trail
}

export function createPaperPlane({
  THREE,
  silhouette = 'classic',
  materials = {},
  withShield = true,
} = {}) {
  if (!THREE) throw new TypeError('createPaperPlane requires THREE')

  const spec = getPlaneGeometrySpec(silhouette)
  const bodyMaterial = makeMaterial(THREE, materials.body, 0xfff6ec)
  const accentMaterial = makeMaterial(THREE, materials.accent, 0xf0956a)
  const plane = new THREE.Group()
  plane.name = `${spec.id}PaperPlane`

  const wingL = makeWing({
    THREE,
    points: spec.wingL,
    creasePoints: spec.creaseL,
    bodyMaterial,
    accentMaterial,
    name: 'wingL',
  })
  const wingR = makeWing({
    THREE,
    points: spec.wingR,
    creasePoints: spec.creaseR,
    bodyMaterial,
    accentMaterial,
    name: 'wingR',
  })
  plane.add(wingL, wingR)

  const body = new THREE.Mesh(new THREE.BoxGeometry(...spec.body.size), accentMaterial)
  body.position.set(...spec.body.position)
  body.name = 'body'
  plane.add(body)

  const nose = new THREE.Mesh(new THREE.ConeGeometry(spec.nose.radius, spec.nose.length, 4), accentMaterial)
  nose.rotation.x = -Math.PI / 2
  nose.position.set(...spec.nose.position)
  nose.name = 'nose'
  plane.add(nose)

  const tail = new THREE.Mesh(new THREE.BoxGeometry(...spec.tail.size), bodyMaterial)
  tail.position.set(...spec.tail.position)
  tail.name = 'tail'
  plane.add(tail)

  if (withShield) {
    const shield = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 16, 12),
      materials.shield || new THREE.MeshStandardMaterial({
        color: 0x60a5fa,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    )
    shield.visible = false
    shield.name = 'shieldBubble'
    plane.add(shield)
  }

  const upgradeTrail = makeUpgradeTrail(THREE, materials.trail)
  plane.add(upgradeTrail)
  plane.userData.wingL = wingL
  plane.userData.wingR = wingR
  plane.userData.upgradeTrail = upgradeTrail
  plane.userData.silhouette = spec.id
  plane.userData.collisionRadius = spec.collisionRadius
  plane.scale.setScalar(1.2)
  return plane
}
