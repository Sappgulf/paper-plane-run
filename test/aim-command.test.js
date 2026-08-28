import { describe, expect, test } from 'vitest'
import { AIM_MAX_APPROACH, aimCommand } from '../src/game/paper-flight.js'

describe('aim command', () => {
  test('deflects toward the target and is clamped', () => {
    expect(aimCommand({ delta: 10, velocity: 0 })).toBe(1)
    expect(aimCommand({ delta: -10, velocity: 0 })).toBe(-1)
    expect(aimCommand({ delta: 0, velocity: 0 })).toBe(0)
  })

  // The bug this exists to prevent: full deflection right up to the target,
  // so the plane sails through it — into the ground, when aimed at the deck.
  test('eases off as closing speed rises', () => {
    // Target above, already climbing toward it: less deflection is needed than
    // from a standstill, or the plane arrives with speed it cannot shed.
    const fromRest = aimCommand({ delta: 2, velocity: 0 })
    const closingFast = aimCommand({ delta: 2, velocity: 12 })
    expect(closingFast).toBeLessThan(fromRest)
    // Same in the descending direction.
    expect(aimCommand({ delta: -2, velocity: -12 }))
      .toBeGreaterThan(aimCommand({ delta: -2, velocity: 0 }))
  })

  test('actively brakes when overshooting a nearby target', () => {
    // Just below the target and still falling fast: the command must point up.
    expect(aimCommand({ delta: 0.2, velocity: -20 })).toBeGreaterThan(0)
    // Above the target and still climbing fast: the command must point down.
    expect(aimCommand({ delta: -0.2, velocity: 20 })).toBeLessThan(0)
  })

  test('never asks to close faster than the approach cap', () => {
    // However far away the cursor is, the requested approach is bounded — the
    // plane must not build speed it cannot shed before it arrives.
    expect(aimCommand({ delta: 1000, velocity: AIM_MAX_APPROACH })).toBeCloseTo(0, 5)
    expect(aimCommand({ delta: -1000, velocity: -AIM_MAX_APPROACH })).toBeCloseTo(0, 5)
  })

  // The bug that made this a velocity-matching controller instead of a PD one:
  // gains tuned at 60Hz overshoot at the 20Hz the engine's dt cap allows, and a
  // descent aimed at a legal altitude punched through the floor on any device
  // slow enough to hit that cap. The descent must be safe at EVERY frame rate
  // the engine can actually run at.
  test.each([1 / 60, 1 / 30, 1 / 20, 0.05])('a descent settles without touching the floor at dt=%s', (dt) => {
    let y = 8
    let vel = 0
    const target = 2.5
    let lowest = y
    for (let t = 0; t < 10; t += dt) {
      const command = aimCommand({ delta: target - y, velocity: vel })
      vel += command * 42 * dt - 3.2 * dt
      vel *= Math.pow(0.1, dt)
      y += vel * dt
      lowest = Math.min(lowest, y)
    }
    // Never reaches the ground (1.15), and actually arrives near the target.
    expect(lowest).toBeGreaterThan(1.15)
    expect(Math.abs(y - target)).toBeLessThan(1.2)
  })

  test('a climb settles without slamming into the ceiling at any frame rate', () => {
    for (const dt of [1 / 60, 0.05]) {
      let y = 3
      let vel = 0
      const target = 14
      let highest = y
      for (let t = 0; t < 10; t += dt) {
        const command = aimCommand({ delta: target - y, velocity: vel })
        vel += command * 42 * dt - 3.2 * dt
        vel *= Math.pow(0.1, dt)
        y += vel * dt
        highest = Math.max(highest, y)
      }
      expect(highest, `dt=${dt}`).toBeLessThan(16.5)
      expect(Math.abs(y - target), `dt=${dt}`).toBeLessThan(1.4)
    }
  })

  test('non-finite input cannot produce a NaN command', () => {
    expect(aimCommand({ delta: NaN, velocity: NaN })).toBe(0)
    expect(Number.isFinite(aimCommand({ delta: Infinity, velocity: 0 }))).toBe(true)
  })
})
