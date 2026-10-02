import * as THREE from 'three'
import { landscapeLayers, scrollLandscapeZ } from './game/paper-landscape.js'

export function createPaperLandscape(scene) {
  const fields = []
  const dummy = new THREE.Object3D()
  // An off-centre peak makes the long front face read as a folded sheet.
  const points = [[-.5,0,-.5],[.5,0,-.5],[.5,0,.5],[-.5,0,.5],[.12,1,-.05]]
  const faces = [[0,4,1],[1,4,2],[2,4,3],[3,4,0]]
  const vertices = faces.flatMap(face => face.flatMap(index => points[index]))
  const tones = [.8,1,.92,.68]
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
      for (const layer of landscapeLayers(zoneId, quality)) {
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
        geometry.computeVertexNormals()
        const material = new THREE.MeshBasicMaterial({ color: layer.color, vertexColors: true, side: THREE.DoubleSide })
        const mesh = new THREE.InstancedMesh(geometry, material, layer.slots.length)
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
        mesh.frustumCulled = false
        mesh.userData.decorative = true
        mesh.name = `paper-landscape-${zoneId}`
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
