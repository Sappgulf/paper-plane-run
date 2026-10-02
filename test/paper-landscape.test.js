import { describe, expect, it } from 'vitest'
import { landscapeLayers, vistaLayers, scrollLandscapeZ } from '../src/game/paper-landscape.js'
import { createVistaGeometry } from '../src/paper-vista-models.js'
import { createPaperLandscape } from '../src/paper-landscape-renderer.js'
import * as THREE from 'three'
import { ZONES } from '../src/zones.js'
import { ROAD_LANES_X, PAVEMENT_OFFSET_X } from '../src/game/ground-life.js'

const streetEdgeX = Math.max(...ROAD_LANES_X) + PAVEMENT_OFFSET_X

describe('folded landscape', () => {
  it('gives each map distinct landmarks outside the playable corridor at every quality', () => {
    const signatures = new Set()
    for (const zone of ZONES) {
      signatures.add(vistaLayers(zone.id).map(layer => layer.kind).join(':'))
      for (const quality of ['low','medium','high']) for (const layer of vistaLayers(zone.id,quality)) {
        for (const slot of layer.slots) {
          const extent = slot.width/2 + slot.depth/2*Math.abs(Math.sin(slot.rotation))
          expect(Math.abs(slot.x)-extent).toBeGreaterThan(streetEdgeX)
        }
      }
    }
    expect(signatures.size).toBe(6)
  })
  it('merges complete finite landmark models and disposes the previous scene on transitions', () => {
    for (const kind of ['house','tree','lighthouse','sailboat','windmill','crystal','book']) {
      const geometry = createVistaGeometry(kind)
      geometry.computeBoundingBox()
      const size = geometry.boundingBox.getSize(new THREE.Vector3())
      expect([size.x,size.y,size.z]).toEqual([1,1,1])
      expect(geometry.boundingBox.min.y).toBe(0)
      expect([...geometry.attributes.position.array].every(Number.isFinite)).toBe(true)
      expect(geometry.attributes.color.count).toBe(geometry.attributes.position.count)
      geometry.dispose()
    }
    const scene = new THREE.Scene(), landscape = createPaperLandscape(scene)
    landscape.rebuild('harbor','high')
    expect(scene.children).toHaveLength(5)
    let disposed = 0
    scene.children.forEach(mesh => mesh.geometry.addEventListener('dispose',()=>disposed++))
    landscape.rebuild('midnight','low')
    expect(disposed).toBe(5)
    expect(scene.children).toHaveLength(3)
    landscape.scroll(9999)
    landscape.dispose()
    expect(scene.children).toHaveLength(0)
  })
  it.each(ZONES.map(zone => zone.id))('%s keeps every folded face outside the streets and flight corridor', zone => {
    const layers = landscapeLayers(zone)
    expect(layers).toHaveLength(3)
    for (const { slots } of layers) for (const slot of slots) {
      // Rotation can project part of the depth inward as well as the width.
      const halfExtent = slot.width / 2 + slot.depth / 2 * Math.abs(Math.sin(slot.rotation))
      expect(Math.abs(slot.x) - halfExtent).toBeGreaterThan(streetEdgeX)
      expect(slot.height).toBeGreaterThan(0)
    }
  })
  it('uses independent deterministic placement and reduces draw calls with quality', () => {
    expect(landscapeLayers('city')).toEqual(landscapeLayers('city'))
    expect(landscapeLayers('city', 'low')).toHaveLength(1)
    expect(landscapeLayers('city', 'medium')).toHaveLength(2)
    expect(landscapeLayers('midnight')[0].slots[0].height).toBeGreaterThan(landscapeLayers('city')[0].slots[0].height)
  })
  it('wraps huge scroll steps and ignores invalid movement without leaving its depth span', () => {
    for (const move of [0, 1, 360, 9999, NaN, -10]) {
      const z = scrollLandscapeZ(-49, move)
      expect(z).toBeGreaterThanOrEqual(-50)
      expect(z).toBeLessThan(310)
    }
    expect(scrollLandscapeZ(100, 360)).toBe(100)
    expect(scrollLandscapeZ(100, 10)).toBe(90)
  })
})
