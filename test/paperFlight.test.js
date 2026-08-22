import { describe, expect, test } from 'vitest'
import {
  AIM_SINK_WEIGHT,
  applySoftBounds,
  groundEffectSpeedMul,
  integrateAimFlight,
  integrateRelativeFlight,
} from '../src/game/paper-flight.js'

describe('paper flight integration', () => {
  test('relative flight sinks without input and answers to a sideways shove', () => {
    const held = integrateRelativeFlight({
      x: 0,
      y: 10,
      velX: 0,
      velY: 0,
      inputX: 0,
      inputY: 0,
      dt: 0.2,
      sinkPerSecond: 2.4,
    })
    expect(held.y).toBeLessThan(10)

    const shoved = integrateRelativeFlight({
      ...held,
      extraForceX: 14,
      dt: 0.2,
    })
    expect(shoved.x).toBeGreaterThan(held.x)
  })

  test('aim flight still sinks and still takes wind after the cursor lerp', () => {
    const still = integrateAimFlight({
      x: 0,
      y: 10,
      targetX: 0,
      targetY: 10,
      dt: 0.25,
      follow: 0.4,
      sinkPerSecond: 2.4,
      extraForceX: 0,
    })
    expect(still.y).toBeLessThan(10)
    expect(10 - still.y).toBeCloseTo(2.4 * AIM_SINK_WEIGHT * 0.25, 5)

    const gust = integrateAimFlight({
      x: 0,
      y: 10,
      targetX: 0,
      targetY: 10,
      dt: 0.25,
      follow: 0.4,
      sinkPerSecond: 0,
      extraForceX: 20,
    })
    expect(gust.x).toBeGreaterThan(0)
  })

  test('less sink (Lift Crease) drops an aimed plane more slowly', () => {
    const heavy = integrateAimFlight({
      x: 0, y: 10, targetX: 0, targetY: 10, dt: 0.5, follow: 0.2, sinkPerSecond: 2.4,
    })
    const light = integrateAimFlight({
      x: 0, y: 10, targetX: 0, targetY: 10, dt: 0.5, follow: 0.2, sinkPerSecond: 1.44,
    })
    expect(light.y).toBeGreaterThan(heavy.y)
  })

  test('soft walls bounce instead of sticking', () => {
    const hit = applySoftBounds({
      x: -20, y: 1, velX: -8, velY: -4, targetX: -22, targetY: 1, minX: -12, maxX: 12, minY: 2.2, maxY: 16.5,
    })
    expect(hit.x).toBe(-12)
    expect(hit.velX).toBeGreaterThan(0)
    expect(hit.y).toBe(2.2)
    expect(hit.velY).toBeGreaterThanOrEqual(0)
  })

  test('ground effect pays a small cruise bonus that caps at tier 5', () => {
    expect(groundEffectSpeedMul(0)).toBe(1)
    expect(groundEffectSpeedMul(2)).toBeCloseTo(1.08)
    expect(groundEffectSpeedMul(9)).toBe(groundEffectSpeedMul(5))
  })
})
