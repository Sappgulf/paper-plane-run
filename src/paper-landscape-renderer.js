import * as THREE from 'three'
import { landscapeLayers, vistaLayers, scrollLandscapeZ } from './game/paper-landscape.js'
import { createVistaGeometry } from './paper-vista-models.js'

/** Sparse 1px fibre specks on near-white stock — the shared grain map source. */
function createPaperGrainCanvas(size = 128) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#f7f2e6'
  ctx.fillRect(0, 0, size, size)
  let state = 31 >>> 0
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296 }
  ctx.globalAlpha = .055
  for (let i = 0; i < size * size * .05; i++) {
    ctx.fillStyle = random() < .5 ? '#000000' : '#ffffff'
    ctx.fillRect(random() * size, random() * size, 1, random() < .2 ? 2 : 1)
  }
  ctx.globalAlpha = 1
  return canvas
}

/** ONE grain texture for the whole material family, created lazily and shared. */
let grainTexture = null
function sharedGrainTexture() {
  if (grainTexture) return grainTexture
  if (typeof document === 'undefined') return null
  const canvas = createPaperGrainCanvas()
  if (!canvas) return null
  grainTexture = new THREE.CanvasTexture(canvas)
  grainTexture.colorSpace = THREE.SRGBColorSpace
  grainTexture.wrapS = grainTexture.wrapT = THREE.RepeatWrapping
  grainTexture.repeat.set(2, 2)
  return grainTexture
}

/** Planar UVs so the shared grain speckles across every folded face. */
function addGrainUv(geometry) {
  const position = geometry.getAttribute('position')
  if (!position || geometry.getAttribute('uv')) return
  const uvs = new Float32Array(position.count * 2)
  for (let i = 0; i < position.count; i++) {
    uvs[i * 2] = position.getX(i) + position.getZ(i)
    uvs[i * 2 + 1] = position.getY(i)
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
}

export function createPaperLandscape(scene) {
  const fields = []
  const dummy = new THREE.Object3D()
  // An off-centre peak makes the long front face read as a folded sheet.
  const points = [[-.5,0,-.5],[.5,0,-.5],[.5,0,.5],[-.5,0,.5],[.12,1,-.05]]
  const faces = [[0,4,1],[1,4,2],[2,4,3],[3,4,0]]
  const vertices = faces.flatMap(face => face.flatMap(index => points[index]))
  // Lit facet (+x) against a mid face and two shaded folds: every neighbour
  // differs, so each apex crease reads as a hard cut edge, never a gradient.
  const tones = [.86,1,.62,.74]
  const colors = faces.flatMap((_,face) => Array.from({ length: 3 }, () => [tones[face],tones[face],tones[face]]).flat())
  const writeMatrices = field => {
    field.slots.forEach((slot, index) => {
      dummy.position.set(slot.x, -.2, slot.z)
      dummy.scale.set(slot.width, slot.height, slot.depth)
      dummy.rotation.set(0, slot.rotation, 0)
      dummy.updateMatrix()
      field.mesh.setMatrixAt(index, dummy.matrix)
    })
    field.mesh.instanceMatrix.needsUpdate = true
  }
  const clear = () => {
    for (const field of fields.splice(0)) {
      scene.remove(field.mesh)
      field.mesh.geometry.dispose()
      field.mesh.material.dispose()
    }
  }
  return {
    rebuild(zoneId, quality) {
      clear()
      for (const layer of [...landscapeLayers(zoneId, quality), ...vistaLayers(zoneId, quality)]) {
        const geometry = layer.kind ? createVistaGeometry(layer.kind) : new THREE.BufferGeometry()
        if (!layer.kind) {
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
          geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
          geometry.computeVertexNormals()
        }
        addGrainUv(geometry)
        const material = new THREE.MeshBasicMaterial({ color: layer.color, vertexColors: true, side: THREE.DoubleSide })
        // map multiplies with color and vertexColors: near-white stock grain.
        material.map = sharedGrainTexture()
        const mesh = new THREE.InstancedMesh(geometry, material, layer.slots.length)
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
        mesh.frustumCulled = false
        mesh.userData.decorative = true
        mesh.name = layer.kind ? `paper-vista-${zoneId}-${layer.kind}` : `paper-landscape-${zoneId}`
        const field = { mesh, slots: layer.slots }
        fields.push(field)
        writeMatrices(field)
        scene.add(mesh)
      }
    },
    scroll(move) {
      if (!move) return
      for (const field of fields) {
        for (const slot of field.slots) slot.z = scrollLandscapeZ(slot.z, move * .65)
        writeMatrices(field)
      }
    },
    dispose: clear,
  }
}
