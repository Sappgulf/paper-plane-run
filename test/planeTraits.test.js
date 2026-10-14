import { describe, expect, test } from 'vitest'
import { applyPlaneTraits, PLANE_TRAITS } from '../src/plane-models.js'
import { SKINS } from '../src/skins.js'

const EFFECTS = { accelMul: 1.2, sinkMul: 0.8, speedMul: 1.1, flarePayoutMul: 1.3, scoreMul: 1.05 }

describe('plane traits', () => {
  test('every skin silhouette has a trait, and every trait stays within about 12%', () => {
    for (const skin of SKINS) expect(PLANE_TRAITS[skin.silhouette], skin.id).toBeDefined()
    for (const trait of Object.values(PLANE_TRAITS)) {
      for (const key of ['handlingMul', 'sinkMul', 'speedMul', 'flareMul']) {
        expect(trait[key]).toBeGreaterThanOrEqual(0.88)
        expect(trait[key]).toBeLessThanOrEqual(1.12)
      }
    }
  })

  test('applies the trait to its own effect keys and leaves the rest alone', () => {
    const dart = applyPlaneTraits(EFFECTS, 'dart')
    expect(dart.accelMul).toBeCloseTo(EFFECTS.accelMul * PLANE_TRAITS.dart.handlingMul)
    expect(dart.sinkMul).toBeCloseTo(EFFECTS.sinkMul * PLANE_TRAITS.dart.sinkMul)
    expect(dart.speedMul).toBeCloseTo(EFFECTS.speedMul)
    expect(dart.flarePayoutMul).toBeCloseTo(EFFECTS.flarePayoutMul)
    expect(dart.scoreMul).toBe(EFFECTS.scoreMul)
    expect(EFFECTS.accelMul).toBe(1.2)
  })

  test('the classic plane and unknown silhouettes change nothing', () => {
    expect(applyPlaneTraits(EFFECTS, 'classic')).toEqual(EFFECTS)
    expect(applyPlaneTraits(EFFECTS, 'unknown')).toEqual(EFFECTS)
  })
})
