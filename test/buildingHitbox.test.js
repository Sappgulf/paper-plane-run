import { describe, expect, test } from 'vitest'
import { buildingCollisionEnvelope, buildingOverlapsPlane } from '../src/game/building-hitbox.js'

describe('building collision envelope', () => {
  test('square buildings keep the old symmetric padding', () => {
    const envelope = buildingCollisionEnvelope({ halfWidth: 1.5, halfDepth: 1.5, planeRadius: 0.7 })
    expect(envelope.halfWidth).toBeCloseTo(1.85, 6)
    expect(envelope.halfDepth).toBeCloseTo(1.85, 6)
  })

  test('a long narrow roof no longer claims its corners', () => {
    // 6-wide x 2-deep building: the old square envelope was 3.35 deep.
    expect(buildingOverlapsPlane({ dx: 0, dz: 1.9, halfWidth: 3, halfDepth: 1 })).toBe(false)
    expect(buildingOverlapsPlane({ dx: 2.9, dz: 0, halfWidth: 3, halfDepth: 1 })).toBe(true)
  })

  test('boost shrinks both building and plane padding', () => {
    const normal = buildingCollisionEnvelope({ halfWidth: 2, halfDepth: 2 })
    const boosted = buildingCollisionEnvelope({ halfWidth: 2, halfDepth: 2, boostActive: true })
    expect(boosted.halfWidth).toBeLessThan(normal.halfWidth)
    expect(boosted.halfDepth).toBeLessThan(normal.halfDepth)
  })

  test('junk input collapses to a finite point rather than NaN', () => {
    const envelope = buildingCollisionEnvelope({ halfWidth: NaN, halfDepth: -4, planeRadius: 'x' })
    expect(Number.isFinite(envelope.halfWidth)).toBe(true)
    expect(Number.isFinite(envelope.halfDepth)).toBe(true)
    expect(envelope.halfDepth).toBeGreaterThan(0)
    expect(buildingOverlapsPlane({ dx: NaN, dz: 2, halfWidth: 1, halfDepth: 1 })).toBe(false)
  })
})
