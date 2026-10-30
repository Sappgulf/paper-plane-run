import * as THREE from 'three'

/**
 * Build a recognisable paper mechanism around, never inside, the collision
 * opening. The moving jaws/blades live in the encounter; these static cuts
 * provide a silhouette that reads before the small emblem or phase text.
 */
export function createBossWorkshop({ kind = 'scissors', halfWidth = 4.8, halfHeight = 4.4 } = {}) {
  const group = new THREE.Group()
  group.name = 'bossWorkshop'
  const colors = { scissors: 0xb95442, wind: 0x3b8199, stapler: 0xc79538, punch: 0x9d5b80 }
  const stock = new THREE.MeshStandardMaterial({ color: colors[kind] || colors.scissors, roughness: 0.92 })
  const paper = new THREE.MeshStandardMaterial({ color: 0xffe7b7, roughness: 1, side: THREE.DoubleSide })
  const ink = new THREE.MeshStandardMaterial({ color: 0x29373e, roughness: 0.9, side: THREE.DoubleSide })
  const metal = new THREE.MeshStandardMaterial({ color: 0x89a4b0, roughness: 0.65, metalness: 0.18, side: THREE.DoubleSide })
  const box = new THREE.BoxGeometry(1, 1, 1)
  const bolt = new THREE.CircleGeometry(0.16, 10)
  const addBox = (name, x, y, w, h, material, z = 0.5) => {
    const mesh = new THREE.Mesh(box, material)
    mesh.name = name
    mesh.position.set(x, y, z)
    mesh.scale.set(w, h, 0.38)
    group.add(mesh)
    return mesh
  }
  const addRing = (name, x, y, radius, tube, material, z = 0.15) => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 32), material)
    mesh.name = name
    mesh.position.set(x, y, z)
    group.add(mesh)
    return mesh
  }
  const addBolt = (x, y) => {
    const pin = new THREE.Mesh(bolt, paper)
    pin.position.set(x, y, -0.02)
    group.add(pin)
  }

  // Narrow rails give each mechanism a structural spine without making a
  // generic box around the passage.
  for (const side of [-1, 1]) {
    const x = side * (halfWidth + 0.95)
    addBox('mount-shadow', x, 0, 0.62, halfHeight * 2 + 1.5, ink, 0.8)
    addBox('mount', x, 0, 0.4, halfHeight * 2 + 1.35, stock, 0.45)
    addBolt(x, halfHeight + 0.45)
    addBolt(x, -halfHeight - 0.45)
  }

  if (kind === 'wind') {
    // Broad round housings surround the moving fan blades, like a wind tunnel.
    for (const side of [-1, 1]) {
      const x = side * (halfWidth + 2.65)
      addRing('turbine-cowl', x, 0, 1.74, 0.22, ink, 0.28)
      addRing('turbine-cowl-face', x, 0, 1.74, 0.12, stock, 0.02)
      addRing('turbine-cowl-rim', x, 0, 1.47, 0.06, paper, -0.04)
    }
  } else if (kind === 'stapler') {
    // A massive top crown and lower anvil frame the separately animated jaws.
    const top = halfHeight + 1.1
    const bottom = -halfHeight - 1.1
    addBox('stapler-crown-shadow', 0, top, halfWidth * 2 + 2.9, 1.05, ink, 0.8)
    addBox('stapler-crown', 0, top, halfWidth * 2 + 2.65, 0.82, stock, 0.35)
    addBox('stapler-anvil', 0, bottom, halfWidth * 2 + 2.65, 0.62, metal, 0.35)
    for (const side of [-1, 1]) {
      addBolt(side * halfWidth * 0.7, top)
      addBox('stapler-seam', side * halfWidth * 0.45, top, 0.09, 0.65, ink, -0.04)
    }
  } else if (kind === 'punch') {
    // Twin ring dies and paper chads distinguish the hole punch at a glance.
    for (const side of [-1, 1]) {
      const x = side * (halfWidth + 2.2)
      addRing('punch-die', x, side * 0.65, 1.25, 0.22, ink, 0.3)
      addRing('punch-die-face', x, side * 0.65, 1.25, 0.12, stock, 0.03)
      addRing('punch-die-inner', x, side * 0.65, 0.82, 0.08, metal, -0.03)
      addBolt(x, side * 0.65)
    }
    addBox('punch-bridge', 0, halfHeight + 1.05, halfWidth * 2 + 2.4, 0.58, stock)
  } else {
    // Oversized open handles make the two animated blades read as scissors.
    for (const side of [-1, 1]) {
      const x = side * (halfWidth + 2.35)
      addRing('scissor-handle', x, -halfHeight * 0.45, 1.43, 0.24, ink, 0.3)
      addRing('scissor-handle-face', x, -halfHeight * 0.45, 1.43, 0.14, stock, 0.02)
      addRing('scissor-handle-inset', x, -halfHeight * 0.45, 1.1, 0.07, paper, -0.03)
      addBolt(side * (halfWidth + 0.95), 0)
    }
  }
  return group
}
