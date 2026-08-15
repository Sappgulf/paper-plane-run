import { describe, expect, it } from 'vitest'
import {
  HAZARD_PATTERN_IDS,
  clampAmplitudeToLane,
  getPatternReach,
  getTierMotionScale,
  isHazardPattern,
  patternForFlyer,
  resolveHazardOffset,
  resolveHazardRoll,
} from '../src/game/hazard-patterns.js'

const TIME_SAMPLES = Array.from({ length: 2_000 }, (_, index) => index * 0.037)
// Coarser grid for the anchor sweep, which multiplies out to millions of
// evaluations. Still dense enough to land near every pattern's peak.
const SWEEP_SAMPLES = Array.from({ length: 240 }, (_, index) => index * 0.031)

describe('pattern bounds', () => {
  it('never exceeds the requested amplitude, over a long time domain', () => {
    for (const pattern of HAZARD_PATTERN_IDS) {
      for (const t of TIME_SAMPLES) {
        const offset = resolveHazardOffset({
          pattern, elapsed: t, phase: 1.7, speed: 8, amplitudeX: 3, amplitudeY: 2,
        })
        expect(Math.abs(offset.x)).toBeLessThanOrEqual(3 + 1e-9)
        expect(Math.abs(offset.y)).toBeLessThanOrEqual(2 + 1e-9)
      }
    }
  })

  it('honours the declared reach, which the lane clamp depends on', () => {
    for (const pattern of HAZARD_PATTERN_IDS) {
      const reach = getPatternReach(pattern)
      let peakX = 0
      let peakY = 0
      for (const t of TIME_SAMPLES) {
        const offset = resolveHazardOffset({
          pattern, elapsed: t, phase: 0, speed: 8, amplitudeX: 1, amplitudeY: 1,
        })
        peakX = Math.max(peakX, Math.abs(offset.x))
        peakY = Math.max(peakY, Math.abs(offset.y))
      }
      // The declared reach must be an upper bound, and not a wildly loose one.
      expect(peakX).toBeLessThanOrEqual(reach.x + 1e-9)
      expect(peakY).toBeLessThanOrEqual(reach.y + 1e-9)
      if (reach.x > 0) expect(peakX).toBeGreaterThan(reach.x * 0.7)
      if (reach.y > 0) expect(peakY).toBeGreaterThan(reach.y * 0.7)
    }
  })

  it('is a pure function of time — no frame-to-frame drift', () => {
    // The whole point of the rewrite: sampling coarsely or finely, or
    // revisiting a time, must give the same offset. The old integrated motion
    // could not do this.
    const at = (t) => resolveHazardOffset({
      pattern: 'tumble', elapsed: t, phase: 0.3, speed: 8, amplitudeX: 2, amplitudeY: 1,
    })
    expect(at(12.5)).toEqual(at(12.5))
    const coarse = at(9)
    let fineTime = 0
    for (let step = 0; step < 900; step += 1) fineTime += 0.01
    expect(at(fineTime).x).toBeCloseTo(coarse.x, 6)
    expect(at(fineTime).y).toBeCloseTo(coarse.y, 6)
  })

  it('holds still for the hold pattern', () => {
    for (const t of [0, 1, 50]) {
      expect(resolveHazardOffset({ pattern: 'hold', elapsed: t, amplitudeX: 5, amplitudeY: 5 }))
        .toMatchObject({ x: 0, y: 0 })
    }
  })

  it('treats an unknown pattern as hold rather than throwing', () => {
    expect(resolveHazardOffset({ pattern: 'nope', elapsed: 3, amplitudeX: 5, amplitudeY: 5 }))
      .toMatchObject({ x: 0, y: 0 })
    expect(getPatternReach('nope')).toEqual({ x: 0, y: 0 })
  })

  it('survives junk inputs', () => {
    for (const bad of [NaN, undefined, null, 'x', -1]) {
      const offset = resolveHazardOffset({
        pattern: 'weave', elapsed: bad, phase: bad, speed: bad, amplitudeX: bad, amplitudeY: bad,
      })
      expect(Number.isFinite(offset.x)).toBe(true)
      expect(Number.isFinite(offset.y)).toBe(true)
    }
  })

  it('desynchronises hazards that share a spawn moment via their phase', () => {
    const a = resolveHazardOffset({ pattern: 'weave', elapsed: 2, phase: 0, speed: 8, amplitudeX: 2 })
    const b = resolveHazardOffset({ pattern: 'weave', elapsed: 2, phase: 2.1, speed: 8, amplitudeX: 2 })
    expect(a.x).not.toBeCloseTo(b.x, 3)
  })
})

describe('lane safety', () => {
  const damageRadius = 1.964
  const margin = 0.35

  it('keeps the damage envelope out of the reserved lane for the whole path', () => {
    // Sweep anchors across the spawn range and confirm the clamped amplitude
    // can never carry a hazard into the lane the run promised was flyable.
    for (const pattern of HAZARD_PATTERN_IDS) {
      for (const safeLaneX of [-6, 0, 6]) {
        for (let anchorX = -9; anchorX <= 9; anchorX += 0.25) {
          const amplitudeX = clampAmplitudeToLane({
            requestedAmplitude: 4,
            anchorX,
            safeLaneX,
            damageRadius,
            margin,
            pattern,
          })
          const movesSideways = getPatternReach(pattern).x > 0
          const startsClear = Math.abs(anchorX - safeLaneX) > damageRadius + margin
          if (!startsClear) {
            // Already inside the band. A pattern that moves sideways must not
            // be allowed to add to the overlap; one that only moves vertically
            // cannot make it worse, so its amplitude is left alone.
            if (movesSideways) expect(amplitudeX).toBe(0)
            continue
          }
          // Reduce the whole path to its worst frame, then assert once —
          // asserting per sample turns this sweep into millions of expect()
          // calls and times the suite out.
          let worstGap = Infinity
          for (const t of SWEEP_SAMPLES) {
            const offset = resolveHazardOffset({
              pattern, elapsed: t, phase: 0.9, speed: 8, amplitudeX, amplitudeY: 2,
            })
            worstGap = Math.min(worstGap, Math.abs(anchorX + offset.x - safeLaneX))
          }
          expect(worstGap).toBeGreaterThanOrEqual(damageRadius + margin - 1e-6)
        }
      }
    }
  })

  it('leaves amplitude untouched when no lane is reserved', () => {
    expect(clampAmplitudeToLane({ requestedAmplitude: 3, anchorX: 0, safeLaneX: null, pattern: 'weave' }))
      .toBe(3)
  })

  it('does not clamp patterns that never move sideways', () => {
    expect(clampAmplitudeToLane({
      requestedAmplitude: 3, anchorX: 0.1, safeLaneX: 0, damageRadius, pattern: 'bob',
    })).toBe(3)
  })

  it('never returns a negative or non-finite amplitude', () => {
    for (const bad of [NaN, undefined, null, -5]) {
      const amplitude = clampAmplitudeToLane({
        requestedAmplitude: bad, anchorX: bad, safeLaneX: 0, damageRadius: bad, pattern: 'weave',
      })
      expect(Number.isFinite(amplitude)).toBe(true)
      expect(amplitude).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('pattern selection', () => {
  it('maps the shipped flyer flags onto patterns', () => {
    expect(patternForFlyer({ floaty: true })).toBe('bob')
    expect(patternForFlyer({ weave: true })).toBe('weave')
    expect(patternForFlyer({ dive: true })).toBe('dive')
    expect(patternForFlyer({ spin: true })).toBe('orbit')
    expect(patternForFlyer({ barrel: true })).toBe('tumble')
    // A flyer that both dives and weaves is the erratic one.
    expect(patternForFlyer({ dive: true, weave: true })).toBe('tumble')
    expect(patternForFlyer({})).toBe('hold')
  })

  it('lets a definition name its pattern outright, ignoring junk', () => {
    expect(patternForFlyer({ pattern: 'orbit', dive: true })).toBe('orbit')
    expect(patternForFlyer({ pattern: 'not-a-pattern' })).toBe('hold')
  })

  it('recognises exactly the published pattern ids', () => {
    for (const id of HAZARD_PATTERN_IDS) expect(isHazardPattern(id)).toBe(true)
    expect(isHazardPattern('spiral')).toBe(false)
  })
})

describe('tier motion scale', () => {
  it('grows with tier and then caps', () => {
    expect(getTierMotionScale(0)).toBe(1)
    expect(getTierMotionScale(4)).toBeGreaterThan(getTierMotionScale(2))
    expect(getTierMotionScale(100)).toBeLessThanOrEqual(1.6)
    expect(getTierMotionScale(100)).toBe(getTierMotionScale(8))
  })

  it('never shrinks motion below the shipped baseline', () => {
    for (const bad of [-5, NaN, undefined]) expect(getTierMotionScale(bad)).toBe(1)
  })
})

describe('roll', () => {
  it('only spins the patterns that should spin', () => {
    expect(resolveHazardRoll({ pattern: 'hold', elapsed: 3 })).toBe(0)
    expect(resolveHazardRoll({ pattern: 'weave', elapsed: 3 })).toBe(0)
    expect(resolveHazardRoll({ pattern: 'tumble', elapsed: 3, speed: 1 })).toBeCloseTo(2.7)
    expect(Math.abs(resolveHazardRoll({ pattern: 'orbit', elapsed: 3 }))).toBeLessThanOrEqual(0.6)
  })
})
