import { describe, expect, it } from 'vitest'
import { PASSAGE_LANES, PASSAGE_LANE_X, getObstacleDamageRadius } from '../src/game/pacing.js'
import {
  OFF_LANE_STAR_CHANCE,
  STAR_CLEARANCE,
  chooseStarLane,
  getCandidateStarLanes,
  getLaneClearance,
  getStarX,
} from '../src/game/star-placement.js'

/** Deterministic generator so lane mixes are assertable. */
function sequence(values) {
  let index = 0
  return () => values[index++ % values.length]
}

describe('lane clearance', () => {
  it('is infinite when nothing is near the lane', () => {
    expect(getLaneClearance({ lane: 0, hazards: [] })).toBe(Infinity)
  })

  it('measures spare room past the damage envelope', () => {
    const hazard = { x: 3, radius: 0.9 }
    const expected = 3 - getObstacleDamageRadius({ entityRadius: 0.9, planeRadius: 0.7 })
    expect(getLaneClearance({ lane: 0, hazards: [hazard] })).toBeCloseTo(expected, 6)
  })

  it('reports the nearest hazard, not the last one', () => {
    const hazards = [{ x: 5, radius: 0.5 }, { x: 0.4, radius: 0.5 }, { x: -6, radius: 0.5 }]
    expect(getLaneClearance({ lane: 0, hazards })).toBeLessThan(0.5)
  })

  it('survives junk hazards', () => {
    const clearance = getLaneClearance({
      lane: 0,
      hazards: [{ x: NaN, radius: NaN }, null, undefined],
    })
    expect(Number.isFinite(clearance) || clearance === Infinity).toBe(true)
  })
})

describe('candidate lanes', () => {
  it('never offers the reserved lane back', () => {
    for (const safeLane of PASSAGE_LANES) {
      const candidates = getCandidateStarLanes({ safeLane, hazards: [] })
      expect(candidates.map((candidate) => candidate.lane)).not.toContain(safeLane)
      expect(candidates).toHaveLength(PASSAGE_LANES.length - 1)
    }
  })

  it('drops lanes a hazard is sitting in', () => {
    // A hazard parked on lane +1 (x = 6) must disqualify it.
    const hazards = [{ x: 6, radius: 0.9 }]
    const lanes = getCandidateStarLanes({ safeLane: 0, hazards }).map((candidate) => candidate.lane)
    expect(lanes).not.toContain(1)
    expect(lanes).toContain(-1)
  })

  it('ranks the roomiest lane first', () => {
    const hazards = [{ x: 6.9, radius: 0.5 }]
    const candidates = getCandidateStarLanes({ safeLane: 0, hazards })
    expect(candidates[0].clearance).toBeGreaterThanOrEqual(candidates[candidates.length - 1].clearance)
  })

  it('returns nothing when every alternative is blocked', () => {
    const hazards = [{ x: -6, radius: 1.2 }, { x: 6, radius: 1.2 }]
    expect(getCandidateStarLanes({ safeLane: 0, hazards })).toHaveLength(0)
  })
})

describe('choosing a star lane', () => {
  it('pins telegraph stars to the reserved lane', () => {
    for (const safeLane of PASSAGE_LANES) {
      expect(chooseStarLane({ random: () => 0, safeLane, telegraph: true, hazards: [] })).toBe(safeLane)
    }
  })

  it('keeps the star on the safe lane when the roll says so', () => {
    // First sample >= offLaneChance -> stay safe.
    expect(chooseStarLane({ random: () => 0.99, safeLane: 0, hazards: [] })).toBe(0)
  })

  it('moves the star off the safe lane when the roll says so', () => {
    const lane = chooseStarLane({ random: sequence([0, 0]), safeLane: 0, hazards: [] })
    expect(lane).not.toBe(0)
    expect(PASSAGE_LANES).toContain(lane)
  })

  it('falls back to the safe lane when no alternative is clear', () => {
    const hazards = [{ x: -6, radius: 1.4 }, { x: 6, radius: 1.4 }]
    expect(chooseStarLane({ random: () => 0, safeLane: 0, hazards })).toBe(0)
  })

  it('never picks a lane whose clearance is below the requirement', () => {
    // Sweep hazard positions and rolls; any chosen off-lane must be clear.
    for (let hazardX = -7; hazardX <= 7; hazardX += 0.5) {
      const hazards = [{ x: hazardX, radius: 0.9 }]
      for (const roll of [0, 0.2, 0.4, 0.6, 0.8]) {
        const lane = chooseStarLane({ random: () => roll, safeLane: 0, hazards })
        if (lane === 0) continue
        expect(getLaneClearance({ lane, hazards })).toBeGreaterThan(STAR_CLEARANCE)
      }
    }
  })

  it('produces a mix rather than always the same lane', () => {
    const seen = new Set()
    let offLane = 0
    const total = 400
    for (let index = 0; index < total; index += 1) {
      // Deterministic sweep across the roll space.
      const roll = index / total
      const lane = chooseStarLane({ random: sequence([roll, (index * 0.37) % 1]), safeLane: 0, hazards: [] })
      seen.add(lane)
      if (lane !== 0) offLane += 1
    }
    // Both alternatives and the safe lane all appear.
    expect(seen.size).toBeGreaterThanOrEqual(3)
    // Roughly matches the configured share; generous bounds keep this stable.
    expect(offLane / total).toBeGreaterThan(OFF_LANE_STAR_CHANCE - 0.2)
    expect(offLane / total).toBeLessThan(OFF_LANE_STAR_CHANCE + 0.2)
  })

  it('returns null when the chunk reserved no lane', () => {
    expect(chooseStarLane({ random: () => 0, safeLane: null, hazards: [] })).toBeNull()
  })

  it('honours an offLaneChance of 0 or 1', () => {
    expect(chooseStarLane({ random: () => 0, safeLane: 0, hazards: [], offLaneChance: 0 })).toBe(0)
    expect(chooseStarLane({ random: sequence([0, 0]), safeLane: 0, hazards: [], offLaneChance: 1 }))
      .not.toBe(0)
  })
})

describe('star x', () => {
  it('scatters around the lane centre within the spread', () => {
    for (const lane of PASSAGE_LANES) {
      const center = PASSAGE_LANE_X[PASSAGE_LANES.indexOf(lane)]
      for (const roll of [0, 0.5, 1]) {
        const x = getStarX({ lane, random: () => roll, spread: 1.6 })
        expect(Math.abs(x - center)).toBeLessThanOrEqual(0.8 + 1e-9)
      }
    }
  })

  it('stays finite on junk input', () => {
    expect(Number.isFinite(getStarX({ lane: 99, random: () => NaN, spread: NaN }))).toBe(true)
  })
})
