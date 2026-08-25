import { describe, expect, test } from 'vitest'
import {
  THREAD_GAP_MAX_WIDTH,
  THREAD_REWARD_METERS,
  isInsideThreadGap,
  isThreadGapWidth,
} from '../src/game/thread-gap.js'

describe('thread-the-gap', () => {
  test('only tight inner-face gaps count as a thread', () => {
    expect(isThreadGapWidth(0)).toBe(false)
    expect(isThreadGapWidth(-2)).toBe(false)
    expect(isThreadGapWidth(4.4)).toBe(true)
    expect(isThreadGapWidth(THREAD_GAP_MAX_WIDTH)).toBe(true)
    expect(isThreadGapWidth(THREAD_GAP_MAX_WIDTH + 0.01)).toBe(false)
  })

  test('the plane must sit between the inner faces with wall clearance', () => {
    const bounds = { minX: -2.4, maxX: 2.6 }
    expect(isInsideThreadGap({ playerX: 0, ...bounds })).toBe(true)
    // Hugging either wall does not pay — clearance is honored on both sides.
    expect(isInsideThreadGap({ playerX: bounds.minX + 0.3, ...bounds })).toBe(false)
    expect(isInsideThreadGap({ playerX: bounds.maxX - 0.3, ...bounds })).toBe(false)
    // Faces given in the wrong order still resolve.
    expect(isInsideThreadGap({ playerX: 0, minX: 2.6, maxX: -2.4 })).toBe(true)
  })

  test('flying over the shorter rooftop is not a thread', () => {
    const bounds = { minX: -2.4, maxX: 2.6, maxY: 8 }
    expect(isInsideThreadGap({ playerX: 0, playerY: 7.9, ...bounds })).toBe(true)
    expect(isInsideThreadGap({ playerX: 0, playerY: 8.1, ...bounds })).toBe(false)
    // Open-topped corridors (no roof height) ignore altitude.
    expect(isInsideThreadGap({ playerX: 0, playerY: 50, minX: -2.4, maxX: 2.6, maxY: Number.POSITIVE_INFINITY })).toBe(true)
  })

  test('reward stays a small route bonus', () => {
    expect(THREAD_REWARD_METERS).toBeGreaterThan(0)
    expect(THREAD_REWARD_METERS).toBeLessThan(50)
  })
})
