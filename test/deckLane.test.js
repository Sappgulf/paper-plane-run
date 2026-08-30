import { describe, expect, test } from 'vitest'
import { SKIM_CEILING } from '../src/game/ground-skim.js'
import { GROUND_EFFECT_HEIGHT, GROUND_HEIGHT } from '../src/game/glide.js'
import {
  DECK_CEILING,
  DECK_FLOOR,
  DECK_FULL_METERS,
  DECK_INTRO_METERS,
  DECK_MAX_CHANCE,
  DECK_MAX_COUNT,
  deckLaneChance,
  planDeckLane,
} from '../src/game/deck-lane.js'

/** Deterministic, uniformly distributed stand-in for the run's seeded rng. */
function seeded(seed = 1) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

describe('deck lane', () => {
  // The whole reason this module exists: the band a plane can hold with ground
  // effect had no hazards in it, so a hands-off run never ended.
  test('the band covers the height a cushioned plane can hold', () => {
    expect(DECK_FLOOR).toBeGreaterThan(GROUND_HEIGHT)
    expect(DECK_FLOOR).toBeLessThan(GROUND_EFFECT_HEIGHT)
    expect(DECK_CEILING).toBe(SKIM_CEILING)
  })

  test('the opening is free, then the lane ramps in', () => {
    expect(deckLaneChance({ distance: 0 })).toBe(0)
    expect(deckLaneChance({ distance: DECK_INTRO_METERS - 1 })).toBe(0)
    const early = deckLaneChance({ distance: DECK_INTRO_METERS + 200 })
    const late = deckLaneChance({ distance: DECK_FULL_METERS })
    expect(early).toBeGreaterThan(0)
    expect(late).toBeGreaterThan(early)
    expect(late).toBeLessThanOrEqual(DECK_MAX_CHANCE)
  })

  test('the chance never runs away with tier or difficulty', () => {
    for (const tier of [0, 4, 8, 99]) {
      for (const gap of [0.6, 1, 1.4]) {
        const chance = deckLaneChance({ distance: 50_000, tier, gap })
        expect(chance).toBeGreaterThanOrEqual(0)
        expect(chance).toBeLessThanOrEqual(1)
      }
    }
  })

  test("a forgiving difficulty's deck is thinner than a harsh one's", () => {
    const forgiving = deckLaneChance({ distance: 3000, gap: 1.35 })
    const harsh = deckLaneChance({ distance: 3000, gap: 0.8 })
    expect(forgiving).toBeLessThan(harsh)
  })

  test('every planned height sits inside the band, over many seeds', () => {
    let placed = 0
    for (let seed = 1; seed <= 500; seed += 1) {
      const plan = planDeckLane({ random: seeded(seed), distance: 4000, tier: 3 })
      expect(plan.count).toBe(plan.heights.length)
      expect(plan.count).toBeLessThanOrEqual(DECK_MAX_COUNT)
      for (const height of plan.heights) {
        expect(height).toBeGreaterThanOrEqual(DECK_FLOOR)
        expect(height).toBeLessThanOrEqual(DECK_CEILING)
      }
      placed += plan.count
    }
    // The lane has to actually appear often enough to close the free line.
    expect(placed).toBeGreaterThan(150)
  })

  test('heights spread across the band rather than hugging its floor', () => {
    const heights = []
    for (let seed = 1; seed <= 400; seed += 1) {
      heights.push(...planDeckLane({ random: seeded(seed), distance: 4000 }).heights)
    }
    const mid = (DECK_FLOOR + DECK_CEILING) / 2
    expect(heights.some((height) => height < mid)).toBe(true)
    expect(heights.some((height) => height > mid)).toBe(true)
  })

  test('a plan before the intro distance is always empty', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      expect(planDeckLane({ random: seeded(seed), distance: 100 }).count).toBe(0)
    }
  })

  test('a broken rng degrades to a plan, not a throw', () => {
    const plan = planDeckLane({ random: () => Number.NaN, distance: 5000 })
    expect(plan.count).toBeLessThanOrEqual(DECK_MAX_COUNT)
    for (const height of plan.heights) expect(Number.isFinite(height)).toBe(true)
  })
})
