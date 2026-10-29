import { expect, test } from 'vitest'
import * as THREE from 'three'
import { createFoldedFlyer, flyerWingAngle, poseFoldedFlyer } from '../src/game/folded-flyer.js'

test('hinged wings reuse geometry, reconstruct the full UV sheet and stay inside the collision silhouette', () => {
  for (const kind of ['bird','hawk','dragonfly','wasp']) {
    const material = new THREE.MeshBasicMaterial()
    const first = createFoldedFlyer({kind,scale:2,material})
    const second = createFoldedFlyer({kind,scale:2,material})
    first.children.forEach((part,index) => expect(part.geometry).toBe(second.children[index].geometry))
    const ranges = first.children.map(part => Array.from(part.geometry.attributes.uv.array).filter((_,i)=>i%2===0)).map(values=>[Math.min(...values),Math.max(...values)])
    expect(ranges[0][0]).toBe(0);expect(ranges[2][1]).toBe(1)
    expect(ranges[0][1]).toBeCloseTo(ranges[1][0]);expect(ranges[1][1]).toBeCloseTo(ranges[2][0])
    for (let phase=0;phase<7;phase+=.2) {
      poseFoldedFlyer(first,{kind,phase})
      const bounds = new THREE.Box3().setFromObject(first)
      expect(bounds.min.x).toBeGreaterThanOrEqual(-1)
      expect(bounds.max.x).toBeLessThanOrEqual(1)
      expect(bounds.max.z-bounds.min.z).toBeGreaterThan(0)
    }
  }
})
test('reduced motion holds a constant folded pose and rigid artwork keeps its existing renderer', () => {
  expect(flyerWingAngle({kind:'bird',phase:4,reducedMotion:true})).toBe(flyerWingAngle({kind:'bird',phase:0,reducedMotion:true}))
  expect(createFoldedFlyer({kind:'balloon'})).toBeNull()
})
