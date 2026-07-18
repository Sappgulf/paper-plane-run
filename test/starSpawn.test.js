import { describe, expect, test } from 'vitest'
import { planStarSpawns } from '../src/game/star-spawn.js'

function sequence(values) {
  let index = 0
  return () => {
    const value = values[Math.min(index, values.length - 1)]
    index += 1
    return value
  }
}

describe('gold rush star clusters', () => {
  test('raises double-star cluster odds without inventing stars when rolls miss', () => {
    const baseline = planStarSpawns({
      // Base double-star chance is 0.25, so 0.30 stays a single-star roll.
      random: sequence([0.3, 0.1, 0.9]),
      starChance: 0.58,
      doubleStarBonus: 0,
    })
    const goldRush = planStarSpawns({
      // Max Gold Rush lifts the threshold to 0.49, so 0.30 becomes a cluster.
      random: sequence([0.3, 0.1, 0.1, 0.9]),
      starChance: 0.58,
      doubleStarBonus: 0.24,
    })

    expect(baseline.rolls).toBe(1)
    expect(baseline.cluster).toBe(false)
    expect(baseline.starCount).toBe(1)
    expect(goldRush.rolls).toBe(2)
    expect(goldRush.cluster).toBe(true)
    expect(goldRush.starCount).toBe(2)
    expect(goldRush.rates.doubleStarChance).toBeGreaterThan(baseline.rates.doubleStarChance)
  })
})
