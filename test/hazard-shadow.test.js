import { describe, expect, it } from 'vitest'
import {
  HAZARD_SHADOW_CAPACITY,
  HAZARD_SHADOW_MAX_ALTITUDE,
  hazardShadowForAltitude,
} from '../src/game/hazard-shadow.js'

describe('hazard ground shadows', () => {
  it('sits right under a flyer skimming the deck, tight and dark', () => {
    const shadow = hazardShadowForAltitude({ altitude: 1.6, radius: 0.7 })
    expect(shadow.visible).toBe(true)
    expect(shadow.scale).toBeGreaterThan(0.4)
    expect(shadow.scale).toBeLessThan(0.5)
  })

  it('spreads as the flyer climbs, so height reads from the ground', () => {
    const low = hazardShadowForAltitude({ altitude: 2, radius: 0.9 })
    const mid = hazardShadowForAltitude({ altitude: 7, radius: 0.9 })
    const high = hazardShadowForAltitude({ altitude: HAZARD_SHADOW_MAX_ALTITUDE, radius: 0.9 })
    expect(mid.scale).toBeGreaterThan(low.scale)
    expect(high.scale).toBeGreaterThan(mid.scale)
  })

  it('stops casting above the ceiling, where the flyer already reads on its own', () => {
    expect(hazardShadowForAltitude({ altitude: HAZARD_SHADOW_MAX_ALTITUDE + 0.01 })).toEqual({
      visible: false,
      scale: 0,
    })
    expect(hazardShadowForAltitude({ altitude: 15.5 }).visible).toBe(false)
  })

  it('collapses unusable input to a hidden shadow instead of throwing or going NaN', () => {
    for (const altitude of [Number.NaN, Infinity, undefined, null, 'high']) {
      const shadow = hazardShadowForAltitude({ altitude })
      expect(shadow.visible).toBe(false)
      expect(shadow.scale).toBe(0)
    }
  })

  it('never returns a negative or non-finite scale for a visible shadow', () => {
    for (let altitude = 0; altitude <= 14; altitude += 0.25) {
      const shadow = hazardShadowForAltitude({ altitude, radius: 0 })
      if (shadow.visible) {
        expect(Number.isFinite(shadow.scale)).toBe(true)
        expect(shadow.scale).toBeGreaterThan(0)
      }
    }
  })

  it('scales with the flyer size, so a scissors blade casts a wider shadow than a bird', () => {
    const bird = hazardShadowForAltitude({ altitude: 5, radius: 0.7 })
    const scissors = hazardShadowForAltitude({ altitude: 5, radius: 1.6 })
    expect(scissors.scale / bird.scale).toBeCloseTo(1.6 / 0.7, 5)
  })

  it('keeps a fixed pool capacity large enough for a dense screen of flyers', () => {
    expect(HAZARD_SHADOW_CAPACITY).toBeGreaterThanOrEqual(32)
  })

  it('is frozen so callers cannot mutate a shared shadow result', () => {
    const shadow = hazardShadowForAltitude({ altitude: 3 })
    expect(Object.isFrozen(shadow)).toBe(true)
  })
})
