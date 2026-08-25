import { describe, expect, test } from 'vitest'
import {
  GAUNTLET_LANE_HALF_WIDTH,
  isInsideGauntletLane,
  resolveGauntletReward,
} from '../src/game/gauntlet-reward.js'

describe('mini-gauntlet payoff', () => {
  test('lane check tolerates the promised corridor width', () => {
    const laneX = -6
    expect(isInsideGauntletLane({ playerX: laneX, laneX })).toBe(true)
    expect(isInsideGauntletLane({ playerX: laneX + GAUNTLET_LANE_HALF_WIDTH, laneX })).toBe(true)
    expect(isInsideGauntletLane({ playerX: laneX + GAUNTLET_LANE_HALF_WIDTH + 0.01, laneX })).toBe(false)
    expect(isInsideGauntletLane({ playerX: 0, laneX })).toBe(false)
  })

  test('committing to the advertised lane banks a real payout', () => {
    const reward = resolveGauntletReward({ inLane: true })
    expect(reward).toMatchObject({ stars: 3, bonusMeters: 50 })
    expect(reward.label).toContain('+3★')
  })

  test('passing outside the lane pays nothing — no penalty either', () => {
    expect(resolveGauntletReward({ inLane: false })).toBeNull()
  })
})
