import { describe, expect, it } from 'vitest'
import { landscapeLayers, scrollLandscapeZ } from '../src/game/paper-landscape.js'
import { ZONES } from '../src/zones.js'

describe('folded landscape', () => {
  it.each(ZONES.map(zone => zone.id))('%s keeps every folded face outside the flight corridor', zone => {
    const layers = landscapeLayers(zone)
    expect(layers).toHaveLength(3)
    for (const { slots } of layers) for (const slot of slots) {
      // Rotation can project part of the depth inward as well as the width.
      const halfExtent = slot.width / 2 + slot.depth / 2 * Math.abs(Math.sin(slot.rotation))
      expect(Math.abs(slot.x) - halfExtent).toBeGreaterThan(24)
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
