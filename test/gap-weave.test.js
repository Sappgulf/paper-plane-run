import { describe, expect, test } from 'vitest'
import {
  CORRIDOR_HALF_WIDTH,
  MAX_GAP_DRIFT,
  chooseGapCenter,
  chooseStarX,
  clampAmplitudeToGap,
  gapClearanceAt,
  planWaveGaps,
  requiredGapWidth,
} from '../src/game/gap-weave.js'

/** Deterministic, uniformly distributed stand-in for the run's seeded rng. */
function seeded(seed = 1) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

describe('gap weave', () => {
  // The fairness guarantee. It used to be "one of three lanes is reserved";
  // it is now "there is always a continuous hole wide enough to fly", and this
  // is the assertion that makes that a property rather than a comment.
  test('every wave leaves a real gap, over many seeds', () => {
    const planeRadius = 0.7
    const damageRadius = 1.6
    for (let seed = 1; seed <= 500; seed += 1) {
      const random = seeded(seed)
      const gapWidth = requiredGapWidth({ planeRadius })
      const gapCenter = chooseGapCenter({ random, previousCenter: 0, gapWidth })
      const plan = planWaveGaps({
        random,
        count: 6,
        gapCenter,
        gapWidth,
        damageRadius,
      })
      const clearance = gapClearanceAt({
        x: plan.gapCenter,
        hazards: plan.xs.map((x) => ({ x, damageRadius })),
      })
      expect(clearance, `seed ${seed}`).toBeGreaterThanOrEqual(gapWidth * 0.5 - 1e-9)
      expect(clearance, `seed ${seed}`).toBeGreaterThan(planeRadius)
    }
  })

  test('hazards stay inside the corridor and out of the gap', () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const random = seeded(seed)
      const gapCenter = chooseGapCenter({ random, previousCenter: 0, gapWidth: 4 })
      const plan = planWaveGaps({ random, count: 5, gapCenter, gapWidth: 4, damageRadius: 1.2 })
      for (const x of plan.xs) {
        expect(Math.abs(x)).toBeLessThanOrEqual(CORRIDOR_HALF_WIDTH + 1e-9)
        expect(Math.abs(x - gapCenter)).toBeGreaterThanOrEqual(2 + 1.2 - 1e-9)
      }
    }
  })

  // Both halves matter: a gap that barely moves means the player can hold one
  // line forever, and a gap that can teleport is unreadable given the roll rate.
  test('the gap moves meaningfully but never further than the roll can cover', () => {
    let previous = 0
    const random = seeded(7)
    let sawMovement = 0
    for (let wave = 0; wave < 300; wave += 1) {
      const next = chooseGapCenter({ random, previousCenter: previous, gapWidth: 4 })
      const drift = Math.abs(next - previous)
      expect(drift).toBeLessThanOrEqual(MAX_GAP_DRIFT + 1e-9)
      if (drift > 1) sawMovement += 1
      previous = next
    }
    expect(sawMovement).toBeGreaterThan(180)
  })

  test('gap width tightens with tier but never below one plane plus clearance', () => {
    const wide = requiredGapWidth({ planeRadius: 0.7, tier: 0 })
    const tight = requiredGapWidth({ planeRadius: 0.7, tier: 8 })
    expect(tight).toBeLessThan(wide)
    expect(tight).toBeGreaterThan(0.7 * 2)
    expect(requiredGapWidth({ planeRadius: 0.7, tier: 999 })).toBe(tight)
  })

  // The old bug this replaces: a hazard's motion could carry it into the lane
  // the game had promised was flyable. The clamp has to hold for the whole path.
  //
  // Note the clamp only holds for anchors that are already outside the gap —
  // it cannot rescue a hazard someone placed *in* the passage, and deliberately
  // returns 0 there rather than pretending. `planWaveGaps` is what guarantees
  // the anchors, so the two are tested against each other.
  test('moving hazards can never swing into the gap', () => {
    const gapCenter = 3
    const gapWidth = 4
    const damageRadius = 1.4
    const anchors = planWaveGaps({
      random: seeded(11), count: 6, gapCenter, gapWidth, damageRadius,
    }).xs
    expect(anchors.length).toBeGreaterThan(3)
    for (const anchorX of anchors) {
      const amplitude = clampAmplitudeToGap({
        requestedAmplitude: 50,
        anchorX,
        gapCenter,
        gapWidth,
        damageRadius,
        reach: 1,
      })
      for (const direction of [-1, 1]) {
        const extreme = anchorX + amplitude * direction
        expect(Math.abs(extreme - gapCenter)).toBeGreaterThanOrEqual(gapWidth / 2 + damageRadius - 1e-9)
      }
    }
  })

  test('a hazard already inside the gap band is frozen, not made worse', () => {
    expect(clampAmplitudeToGap({
      requestedAmplitude: 5, anchorX: 0, gapCenter: 0, gapWidth: 4, damageRadius: 1, reach: 1,
    })).toBe(0)
  })

  test('stars off the gap are only placed where the wave is actually clear', () => {
    const damageRadius = 1.6
    for (let seed = 1; seed <= 300; seed += 1) {
      const random = seeded(seed)
      const gapCenter = chooseGapCenter({ random, previousCenter: 0, gapWidth: 4 })
      const plan = planWaveGaps({ random, count: 4, gapCenter, gapWidth: 4, damageRadius })
      const hazards = plan.xs.map((x) => ({ x, damageRadius }))
      const x = chooseStarX({ random, gapCenter, gapWidth: 4, hazards, damageRadius })
      const inGap = Math.abs(x - gapCenter) <= 4 * 0.6 + 1e-9
      // Either it sits in the guaranteed gap, or it sits somewhere that is
      // genuinely clear right now — never inside a damage envelope.
      expect(inGap || gapClearanceAt({ x, hazards }) > 0, `seed ${seed} x=${x}`).toBe(true)
    }
  })

  test('a telegraph star always sits in the gap so the opening still teaches', () => {
    const random = seeded(3)
    for (let i = 0; i < 50; i += 1) {
      const x = chooseStarX({ random, gapCenter: -5, gapWidth: 4, telegraph: true, hazards: [] })
      expect(Math.abs(x + 5)).toBeLessThanOrEqual(4 * 0.6 + 1e-9)
    }
  })

  test('a wave with no room outside the gap drops hazards rather than filling it', () => {
    const plan = planWaveGaps({
      random: seeded(1), count: 4, halfWidth: 3, gapCenter: 0, gapWidth: 6, damageRadius: 1.2,
    })
    expect(plan.xs).toEqual([])
  })
})
