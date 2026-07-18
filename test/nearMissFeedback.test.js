import { describe, expect, test } from 'vitest'
import {
  describeNearMissFloat,
  feverConfettiOffsets,
  feverEnterShake,
  nearMissConfettiBursts,
  nearMissHudTier,
  nearMissShakeAmount,
} from '../src/game/near-miss-feedback.js'

describe('near-miss feedback', () => {
  test('escalates float copy and juice by combo tier', () => {
    expect(describeNearMissFloat(1)).toBe('Near miss!')
    expect(describeNearMissFloat(3)).toBe('3x NEAR MISS!')
    expect(describeNearMissFloat(6)).toBe('6x INSANE!')
    expect(describeNearMissFloat(10)).toBe('10x LEGENDARY!')
    expect(nearMissHudTier(2)).toBe('')
    expect(nearMissHudTier(3)).toBe('combo-tier-warm')
    expect(nearMissHudTier(6)).toBe('combo-tier-hot')
    expect(nearMissHudTier(10)).toBe('combo-tier-legend')
    expect(nearMissConfettiBursts(6)).toBe(2)
    expect(nearMissShakeAmount(8)).toBeGreaterThan(nearMissShakeAmount(2))
  })

  test('fever enter juice is stronger than a basic near-miss punch', () => {
    expect(feverEnterShake()).toBeGreaterThan(nearMissShakeAmount(3))
    expect(feverConfettiOffsets().length).toBeGreaterThanOrEqual(3)
  })
})
