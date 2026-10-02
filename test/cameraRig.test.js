import { describe, expect, test } from 'vitest'
import { bankRoll, cameraLean, cameraTarget, shadowForPlane } from '../src/game/camera-rig.js'

describe('camera rig', () => {
  test('leans with velocity and clamps', () => {
    const { leanX, leanY } = cameraLean({ velX: 20, velY: -20 })
    expect(leanX).toBeCloseTo(4.2)
    expect(leanY).toBeCloseTo(-3.2)
    const mid = cameraLean({ velX: 1, velY: 1 })
    expect(mid.leanX).toBeCloseTo(0.38)
    expect(mid.leanY).toBeCloseTo(0.3)
  })

  test('bank roll is gentle and clamped', () => {
    expect(bankRoll({ bank: 0 })).toBe(0)
    expect(bankRoll({ bank: 2 })).toBeCloseTo(0.12)
    expect(bankRoll({ bank: -2 })).toBeCloseTo(-0.12)
  })

  test('shadow shrinks and fades with altitude', () => {
    const low = shadowForPlane({ planeY: 0, planeX: 1, bank: 0, maxY: 20 })
    const high = shadowForPlane({ planeY: 20, planeX: 1, bank: 0, maxY: 20 })
    expect(low.scale).toBeGreaterThan(high.scale)
    expect(low.opacity).toBeGreaterThan(high.opacity)
    expect(low.x).toBe(1)
  })

  test('camera target follows plane proportion', () => {
    const t = cameraTarget({ planeX: 10, planeY: 5, camHeight: 3, camZ: -8, followX: 0.5 })
    expect(t.x).toBe(5)
    expect(t.y).toBe(8)
    expect(t.z).toBe(-8)
  })

  test('handles garbage input safely', () => {
    expect(cameraLean({ velX: NaN, velY: 'bad' }).leanX).toBe(0)
    expect(bankRoll({ bank: null })).toBe(0)
    expect(shadowForPlane({}).scale).toBeGreaterThan(0.5)
  })
})
