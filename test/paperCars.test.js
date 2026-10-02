import { expect, test } from 'vitest'
import * as THREE from 'three'
import { createPaperCarGeometry, roadVehicleVariant } from '../src/paper-car-models.js'
import { getGroundLifeSpecies, groundLifeSlotX } from '../src/game/ground-life.js'

test('vehicle parts merge into distinct finite geometry with contrasting paper and glazing',()=>{
  const signatures = new Set()
  for (const variant of ['sedan','van','pickup','sled']) {
    const geometry = createPaperCarGeometry({variant})
    const positions = geometry.attributes.position,colors = geometry.attributes.color
    expect(positions.count).toBeLessThan(2000)
    expect(colors.count).toBe(positions.count)
    expect([...positions.array,...colors.array,...geometry.attributes.normal.array].every(Number.isFinite)).toBe(true)
    const size = geometry.boundingBox.getSize(new THREE.Vector3())
    expect(size.x).toBeGreaterThan(1.7); expect(size.z).toBeGreaterThan(3.3)
    expect(size.y).toBeGreaterThan(.9)
    expect(Math.min(...colors.array)).toBeLessThan(.1)
    expect(Math.max(...colors.array)).toBeGreaterThan(.8)
    signatures.add(JSON.stringify([...positions.array]))
    geometry.dispose()
  }
  expect(signatures.size).toBe(4)
})

test('the actual scaled vehicle bounds stay outside the flight corridor on every road',()=>{
  for (const zone of ['city','storm','sunset','aurora','midnight']) {
    for (const species of getGroundLifeSpecies(zone).filter(item=>item.shape === 'car')) {
      const geometry = createPaperCarGeometry({variant:roadVehicleVariant(zone,species.id)})
      const halfWidth = geometry.boundingBox.getSize(new THREE.Vector3()).x/2*species.scale
      for (let index=0;index<species.count;index++) {
        expect(Math.abs(groundLifeSlotX(index,0,species))-halfWidth,`${zone}/${species.id}`).toBeGreaterThan(13)
      }
      expect(species.y+geometry.boundingBox.max.y*species.scale).toBeLessThan(2.2)
      geometry.dispose()
    }
  }
})
