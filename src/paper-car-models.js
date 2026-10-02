import * as THREE from 'three'

export function roadVehicleVariant(zoneId, speciesId = '') {
  if (zoneId === 'aurora') return 'sled'
  if (zoneId === 'storm' || zoneId === 'sunset') return 'pickup'
  if (zoneId === 'midnight' || speciesId === 'oncoming') return 'van'
  return 'sedan'
}

/** Folded body, glazing, stock edges, wheels and lamps in one instanced draw. */
export function createPaperCarGeometry({ variant = 'sedan', bodyColor = '#e96957' } = {}) {
  const parts = []
  const paint = new THREE.Color(bodyColor), stock = new THREE.Color('#fff1d7')
  const glass = new THREE.Color('#294858'), rubber = new THREE.Color('#34303b')
  const box = (size,at,color) => parts.push({geometry:new THREE.BoxGeometry(...size),at,color})
  const surface = (corners,color) => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,1,2,0,2,3].flatMap(index=>corners[index]),3))
    geometry.computeVertexNormals(); parts.push({geometry,at:[0,0,0],color})
  }
  box([1.7,.38,3.35],[0,.05,0],paint)
  box([1.76,.06,3.1],[0,-.14,0],rubber)
  const height = variant === 'van' ? 1.12 : variant === 'sled' ? .64 : .88
  const front = variant === 'pickup' ? 1.12 : .91
  const back = variant === 'pickup' ? .05 : variant === 'van' ? -1.25 : -.9
  const topFront = front-.42, topBack = back+.22
  const base = [[-.65,.26,front],[.65,.26,front],[.65,.26,back],[-.65,.26,back]]
  const roof = [[-.5,height,topFront],[.5,height,topFront],[.5,height,topBack],[-.5,height,topBack]]
  surface([roof[0],roof[1],roof[2],roof[3]],stock)
  surface([base[0],base[1],roof[1],roof[0]],glass)
  surface([base[2],base[3],roof[3],roof[2]],glass)
  surface([base[1],base[2],roof[2],roof[1]],glass)
  surface([base[3],base[0],roof[0],roof[3]],glass)
  // The pale pillars define folded window apertures instead of a solid cabin box.
  for (const x of [-.64,.64]) box([.05,height-.24,.07],[x,(height+.26)/2,(front+back)/2],paint)
  for (const z of [front,back]) box([1.32,.06,.06],[0,.28,z],stock)
  if (variant === 'pickup') {
    box([1.42,.05,1.43],[0,.27,-.84],stock)
    for (const x of [-.7,.7]) box([.1,.23,1.5],[x,.38,-.86],paint)
    box([1.45,.23,.1],[0,.38,-1.6],paint)
  }
  if (variant === 'sled') {
    for (const x of [-.96,.96]) box([.13,.12,3.8],[x,-.28,0],stock)
  } else {
    for (const x of [-.88,.88]) for (const z of [-1.05,1.05]) {
      const geometry = new THREE.CylinderGeometry(.25,.25,.14,8)
      geometry.rotateZ(Math.PI/2)
      parts.push({geometry,at:[x,-.14,z],color:rubber})
      box([.018,.11,.11],[x+Math.sign(x)*.08,-.14,z],stock)
    }
  }
  for (const x of [-.57,.57]) {
    box([.26,.12,.035],[x,.08,1.69],stock)
    box([.22,.1,.035],[x,.08,-1.69],new THREE.Color('#cd573f'))
  }
  for (const z of [-1.7,1.7]) box([1.1,.06,.035],[0,-.065,z],stock)
  box([.02,.012,.58],[0,.247,1.27],stock)
  const positions = [], colors = []
  for (const {geometry,at,color} of parts) {
    const raw = geometry.index ? geometry.toNonIndexed() : geometry
    const vertices = raw.attributes.position, normals = raw.attributes.normal
    for (let index=0;index<vertices.count;index++) {
      positions.push(vertices.getX(index)+at[0],vertices.getY(index)+at[1],vertices.getZ(index)+at[2])
      const shade = .83+Math.max(-.12,normals.getY(index)*.15+normals.getX(index)*.07)
      colors.push(color.r*shade,color.g*shade,color.b*shade)
    }
    if (raw !== geometry) raw.dispose()
    geometry.dispose()
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.computeVertexNormals(); geometry.computeBoundingBox()
  geometry.userData.variant = variant
  return geometry
}
