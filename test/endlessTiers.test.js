import { describe, expect, it } from 'vitest'
import {
  MAX_TIER,
  TIER_SPAN,
  TIER_START,
  endlessTierAt,
  getTierHazardBias,
  getTierHazardBonus,
  getTierScoreMultiplier,
  getTierSpacingScale,
  getTierSpeedBonus,
  resolveTier,
  tierModifier,
  tierProgress,
  tierStartDistance,
} from '../src/game/endless-tiers.js'

describe('endless tier index', () => {
  it('stays at tier 0 for the whole authored opening', () => {
    for (const distance of [0, 1, 250, 700, TIER_START - 1]) {
      expect(endlessTierAt(distance)).toBe(0)
    }
  })

  it('enters tier 1 exactly where spacing compression stops working', () => {
    expect(endlessTierAt(TIER_START)).toBe(1)
    expect(endlessTierAt(TIER_START + TIER_SPAN - 1)).toBe(1)
    expect(endlessTierAt(TIER_START + TIER_SPAN)).toBe(2)
  })

  it('caps escalation instead of ramping forever', () => {
    expect(endlessTierAt(TIER_START + MAX_TIER * TIER_SPAN)).toBe(MAX_TIER)
    expect(endlessTierAt(500_000)).toBe(MAX_TIER)
  })

  it('treats junk and negative distances as the opening tier', () => {
    for (const distance of [-1, -9999, NaN, undefined, null, 'far']) {
      expect(endlessTierAt(distance)).toBe(0)
    }
  })

  it('round-trips tier start distances', () => {
    for (let tier = 1; tier <= MAX_TIER; tier += 1) {
      expect(endlessTierAt(tierStartDistance(tier))).toBe(tier)
      expect(endlessTierAt(tierStartDistance(tier) - 1)).toBe(tier - 1)
    }
  })
})

describe('tier escalation curves', () => {
  it('keeps every dial monotonic in the direction that raises difficulty', () => {
    for (let tier = 1; tier <= MAX_TIER; tier += 1) {
      expect(getTierSpeedBonus(tier)).toBeGreaterThan(getTierSpeedBonus(tier - 1))
      expect(getTierSpacingScale(tier)).toBeLessThan(getTierSpacingScale(tier - 1))
      expect(getTierHazardBonus(tier)).toBeGreaterThan(getTierHazardBonus(tier - 1))
      expect(getTierScoreMultiplier(tier)).toBeGreaterThan(getTierScoreMultiplier(tier - 1))
    }
  })

  it('leaves the pre-tier game exactly as it shipped', () => {
    expect(getTierSpeedBonus(0)).toBe(0)
    expect(getTierSpacingScale(0)).toBe(1)
    expect(getTierHazardBonus(0)).toBe(0)
    expect(getTierScoreMultiplier(0)).toBe(1)
    expect(tierModifier(0)).toBeNull()
    expect(getTierHazardBias(0)).toBeNull()
  })

  it('never compresses waves below a readable floor', () => {
    for (let tier = 0; tier <= MAX_TIER + 20; tier += 1) {
      expect(getTierSpacingScale(tier)).toBeGreaterThanOrEqual(0.82)
    }
  })

  it('bounds the hazard bonus so the mix cannot saturate a second time', () => {
    expect(getTierHazardBonus(MAX_TIER)).toBeLessThanOrEqual(0.5)
    expect(getTierHazardBonus(1000)).toBe(getTierHazardBonus(MAX_TIER))
  })

  it('holds every dial flat past the cap', () => {
    for (const dial of [getTierSpeedBonus, getTierSpacingScale, getTierHazardBonus, getTierScoreMultiplier]) {
      expect(dial(MAX_TIER + 5)).toBe(dial(MAX_TIER))
    }
  })
})

describe('tier modifiers', () => {
  it('rotates named modifiers so consecutive tiers stay distinct', () => {
    for (let tier = 1; tier < MAX_TIER; tier += 1) {
      expect(tierModifier(tier).id).not.toBe(tierModifier(tier + 1).id)
    }
  })

  it('gives every modifier a name, blurb, and complete hazard bias', () => {
    for (let tier = 1; tier <= MAX_TIER; tier += 1) {
      const modifier = tierModifier(tier)
      expect(modifier.name).toBeTruthy()
      expect(modifier.blurb).toBeTruthy()
      expect(Object.keys(modifier.bias).sort()).toEqual(['bird', 'building', 'scissors'])
      for (const weight of Object.values(modifier.bias)) {
        expect(weight).toBeGreaterThan(0)
        expect(weight).toBeLessThanOrEqual(1.5)
      }
    }
  })
})

describe('tier progress', () => {
  it('counts down to the next tier boundary', () => {
    const progress = tierProgress(TIER_START + TIER_SPAN / 2)
    expect(progress.tier).toBe(1)
    expect(progress.next).toBe(2)
    expect(progress.nextAt).toBe(TIER_START + TIER_SPAN)
    expect(progress.t).toBeCloseTo(0.5, 5)
  })

  it('measures the opening against the first tier boundary', () => {
    expect(tierProgress(TIER_START / 2)).toMatchObject({ tier: 0, next: 1, nextAt: TIER_START })
  })

  it('reports a terminal state once escalation caps', () => {
    expect(tierProgress(tierStartDistance(MAX_TIER) + 5_000)).toMatchObject({
      tier: MAX_TIER,
      t: 1,
      next: null,
      nextAt: null,
    })
  })
})

describe('resolveTier', () => {
  it('bundles the whole tier for the run loop in one frozen object', () => {
    const resolved = resolveTier(TIER_START)
    expect(resolved).toMatchObject({
      tier: 1,
      speedBonus: getTierSpeedBonus(1),
      spacingScale: getTierSpacingScale(1),
      hazardBonus: getTierHazardBonus(1),
      scoreMultiplier: getTierScoreMultiplier(1),
      capped: false,
    })
    expect(resolved.name).toContain('Tier 1')
    expect(Object.isFrozen(resolved)).toBe(true)
  })

  it('has no name to announce before the first tier', () => {
    expect(resolveTier(0)).toMatchObject({ tier: 0, name: null, modifier: null, capped: false })
  })

  it('flags the capped tier so the HUD can stop promising more', () => {
    expect(resolveTier(1_000_000).capped).toBe(true)
  })
})
