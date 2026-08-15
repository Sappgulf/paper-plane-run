import { describe, expect, test } from 'vitest'

import {
  SKIM_CEILING,
  SKIM_GRACE_SECONDS,
  SKIM_MAX_TIER,
  SKIM_TIER_SECONDS,
  advanceGroundSkim,
  createGroundSkimState,
  describeSkimHudValue,
  describeSkimTier,
  skimHudTier,
  skimScoreMultiplier,
  skimTierFor,
  skimReleaseDistance,
  skimTierReward,
} from '../src/game/ground-skim.js'

/** Hold the plane low for `seconds`, in the given frame step. */
function skimFor(seconds, { step = 0.1, state = createGroundSkimState() } = {}) {
  let current = state
  const banked = []
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += step) {
    current = advanceGroundSkim(current, { low: true, dt: step })
    if (current.bankedStars > 0) banked.push({ tier: current.tier, stars: current.bankedStars })
  }
  return { state: current, banked }
}

describe('ground skim tiers', () => {
  test('sits below the plane ceiling so skimming is a deliberate choice', () => {
    // MIN_Y is 2.2 and MAX_Y is 16.5 — the band must be near the floor, not
    // something a player drifts into while flying normally.
    expect(SKIM_CEILING).toBeGreaterThan(2.2)
    expect(SKIM_CEILING).toBeLessThan(16.5 / 2)
  })

  test('starts empty and stays empty until a tier is earned', () => {
    const fresh = createGroundSkimState()
    expect(fresh).toEqual(expect.objectContaining({ active: false, tier: 0, seconds: 0 }))
    const { state } = skimFor(SKIM_TIER_SECONDS * 0.5)
    expect(state.active).toBe(true)
    expect(state.tier).toBe(0)
    expect(state.bankedStars).toBe(0)
  })

  test('banks a bigger reward at each tier, once per tier', () => {
    const { banked } = skimFor(SKIM_TIER_SECONDS * 3 + 0.05)
    expect(banked).toEqual([
      { tier: 1, stars: 1 },
      { tier: 2, stars: 2 },
      { tier: 3, stars: 3 },
    ])
  })

  test('caps the tier so a long hold cannot run away with the score', () => {
    const { state, banked } = skimFor(SKIM_TIER_SECONDS * (SKIM_MAX_TIER + 4))
    expect(state.tier).toBe(SKIM_MAX_TIER)
    expect(skimTierFor(9999)).toBe(SKIM_MAX_TIER)
    expect(banked.at(-1)).toEqual({ tier: SKIM_MAX_TIER, stars: SKIM_MAX_TIER })
    expect(banked.filter((b) => b.tier === SKIM_MAX_TIER)).toHaveLength(1)
    expect(skimScoreMultiplier(SKIM_MAX_TIER)).toBeCloseTo(1.4)
  })

  test('multiplier rises with tier and never drops below 1', () => {
    expect(skimScoreMultiplier(0)).toBe(1)
    expect(skimScoreMultiplier(-3)).toBe(1)
    expect(skimScoreMultiplier(2)).toBeGreaterThan(skimScoreMultiplier(1))
    expect(skimScoreMultiplier(99)).toBe(skimScoreMultiplier(SKIM_MAX_TIER))
  })

  test('rewards and labels escalate together', () => {
    expect(skimTierReward(0)).toBe(0)
    expect(describeSkimTier(0)).toBe('')
    expect(describeSkimTier(1)).toBe('Skim')
    expect(describeSkimTier(SKIM_MAX_TIER)).toBe('GROUND EFFECT!')
    expect(skimHudTier(0)).toBe('')
    expect(skimHudTier(SKIM_MAX_TIER)).toBe('skim-tier-legend')
  })
})

describe('ground skim grace', () => {
  test('a brief hop over the ceiling keeps the chain alive', () => {
    const { state } = skimFor(SKIM_TIER_SECONDS * 2)
    const hopped = advanceGroundSkim(state, { low: false, dt: SKIM_GRACE_SECONDS / 2 })
    expect(hopped.active).toBe(true)
    expect(hopped.tier).toBe(state.tier)

    // Dropping back down resumes the same chain rather than restarting it.
    const resumed = advanceGroundSkim(hopped, { low: true, dt: 0.1 })
    expect(resumed.seconds).toBeGreaterThan(state.seconds)
    expect(resumed.tier).toBe(state.tier)
  })

  test('staying high past the grace window ends the chain', () => {
    const { state } = skimFor(SKIM_TIER_SECONDS * 2)
    const dropped = advanceGroundSkim(state, { low: false, dt: SKIM_GRACE_SECONDS + 0.05 })
    // The chain is spent, though ending it deliberately still pays out — see
    // the release payout suite below.
    expect(dropped.active).toBe(false)
    expect(dropped.tier).toBe(0)
    expect(dropped.seconds).toBe(0)
    expect(dropped.grace).toBe(0)
  })

  test('a re-entered chain re-pays its tiers from scratch', () => {
    const first = skimFor(SKIM_TIER_SECONDS * 2)
    const broken = advanceGroundSkim(first.state, { low: false, dt: SKIM_GRACE_SECONDS + 1 })
    const second = skimFor(SKIM_TIER_SECONDS + 0.05, { state: broken })
    expect(second.banked).toEqual([{ tier: 1, stars: 1 }])
  })

  test('disabling clears the chain outright', () => {
    const { state } = skimFor(SKIM_TIER_SECONDS * 2)
    expect(advanceGroundSkim(state, { low: true, dt: 0.1, enabled: false }))
      .toEqual(createGroundSkimState())
  })
})

describe('ground skim frame independence', () => {
  test('reaches the same tier whether frames are long or short', () => {
    const coarse = skimFor(SKIM_TIER_SECONDS * 3, { step: 0.05 })
    const fine = skimFor(SKIM_TIER_SECONDS * 3, { step: 0.005 })
    expect(coarse.state.tier).toBe(fine.state.tier)
    expect(coarse.banked.map((b) => b.tier)).toEqual(fine.banked.map((b) => b.tier))
  })

  test('a zero-length frame changes nothing', () => {
    const { state } = skimFor(SKIM_TIER_SECONDS * 2)
    const stalled = advanceGroundSkim(state, { low: true, dt: 0 })
    expect(stalled.seconds).toBe(state.seconds)
    expect(stalled.tier).toBe(state.tier)
    expect(stalled.bankedStars).toBe(0)
  })

  test('handles junk input without producing NaN state', () => {
    const junk = advanceGroundSkim(null, { low: true, dt: Number.NaN })
    expect(Number.isFinite(junk.seconds)).toBe(true)
    expect(junk.tier).toBe(0)
  })
})

describe('ground skim HUD copy', () => {
  test('stays blank until a tier lands, then counts down to the next', () => {
    expect(describeSkimHudValue(createGroundSkimState())).toBe('')
    const { state } = skimFor(SKIM_TIER_SECONDS + 0.4)
    expect(describeSkimHudValue(state)).toMatch(/^Skim · \d\.\ds$/)
  })

  test('reads MAX at the top tier instead of a countdown', () => {
    const { state } = skimFor(SKIM_TIER_SECONDS * (SKIM_MAX_TIER + 1))
    expect(describeSkimHudValue(state)).toBe('GROUND EFFECT! MAX')
  })
})

describe('ground skim release payout', () => {
  test('pulling up under control banks distance scaled to the tier held', () => {
    const { state } = skimFor(SKIM_TIER_SECONDS * 3 + 0.05)
    expect(state.tier).toBe(3)
    const released = advanceGroundSkim(state, { low: false, dt: SKIM_GRACE_SECONDS + 0.05 })
    expect(released.releaseTier).toBe(3)
    expect(released.releaseDistance).toBe(skimReleaseDistance(3))
    expect(released.releaseDistance).toBeGreaterThan(0)
    expect(released.banner).toContain('PULL UP!')
    // The chain itself is spent — the payout is a one-off, not a standing bonus.
    expect(released.active).toBe(false)
    expect(released.tier).toBe(0)
    expect(released.seconds).toBe(0)
  })

  test('pays nothing for a chain that never reached a tier', () => {
    const { state } = skimFor(SKIM_TIER_SECONDS * 0.5)
    expect(state.tier).toBe(0)
    const released = advanceGroundSkim(state, { low: false, dt: SKIM_GRACE_SECONDS + 0.05 })
    expect(released.releaseDistance).toBe(0)
    expect(released.banner).toBeNull()
  })

  test('pays out once, not every frame the plane stays high', () => {
    const { state } = skimFor(SKIM_TIER_SECONDS * 2 + 0.05)
    const released = advanceGroundSkim(state, { low: false, dt: SKIM_GRACE_SECONDS + 0.05 })
    expect(released.releaseDistance).toBeGreaterThan(0)
    const stillHigh = advanceGroundSkim(released, { low: false, dt: 0.5 })
    expect(stillHigh.releaseDistance).toBe(0)
    expect(stillHigh.banner).toBeNull()
  })

  test('rewards a longer hold with a bigger pull-up', () => {
    expect(skimReleaseDistance(0)).toBe(0)
    expect(skimReleaseDistance(5)).toBeGreaterThan(skimReleaseDistance(2))
    expect(skimReleaseDistance(99)).toBe(skimReleaseDistance(SKIM_MAX_TIER))
  })
})
