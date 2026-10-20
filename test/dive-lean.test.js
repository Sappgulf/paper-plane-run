import { describe, expect, it } from 'vitest'
import { clampAmplitudeToGap } from '../src/game/gap-weave.js'
import { DIVE_LEAN_MAX, diveLeanOffset } from '../src/game/dive-lean.js'

// The gap clamp's own safety contract: a flyer whose envelope starts outside
// the gap stays outside it after any lean the clamp allows.
function envelopeClearance(anchorX, gapCenter, gapWidth, damageRadius) {
  return Math.abs(anchorX - gapCenter) - gapWidth / 2 - damageRadius
}

describe('dive lean', () => {
  it('does nothing at the top of the dip, so the flyer does not snap sideways', () => {
    expect(diveLeanOffset({ diveDepth: 0, planeX: 8, anchorX: -3 })).toBe(0)
  })

  it('builds with the descent, reaching its full lean at the bottom of the dip', () => {
    const halfway = diveLeanOffset({ diveDepth: 0.5, planeX: 8, anchorX: -8, gapCenter: 0, gapWidth: 0.1, damageRadius: 0 })
    const bottom = diveLeanOffset({ diveDepth: 1, planeX: 8, anchorX: -8, gapCenter: 0, gapWidth: 0.1, damageRadius: 0 })
    expect(bottom).toBeGreaterThan(0)
    expect(halfway).toBeCloseTo(bottom / 2, 5)
  })

  it('drifts toward the plane when the plane is outside the wave gap', () => {
    // Plane far right of the gap; flyer far left. The lean is rightward.
    const lean = diveLeanOffset({ diveDepth: 1, planeX: 9, anchorX: -9, gapCenter: 0, gapWidth: 5.5, damageRadius: 0.7 })
    expect(lean).toBeGreaterThan(0)
  })

  it('never leans farther than the authored cap, however far the plane is', () => {
    for (const planeX of [-13, -4, 0, 4, 13]) {
      const lean = diveLeanOffset({ diveDepth: 1, planeX, anchorX: 0, gapCenter: 30, gapWidth: 0.1 })
      expect(Math.abs(lean)).toBeLessThanOrEqual(DIVE_LEAN_MAX + 1e-9)
    }
  })

  it('never carries a diving flyer into the wave gap, for any plane position or gap', () => {
    const gapWidth = 5.5
    const damageRadius = 0.9
    for (let gapCenter = -4; gapCenter <= 4; gapCenter += 1) {
      for (let anchorX = -12; anchorX <= 12; anchorX += 0.5) {
        const clearance = envelopeClearance(anchorX, gapCenter, gapWidth, damageRadius)
        if (clearance <= 0) continue
        for (let planeX = -13; planeX <= 13; planeX += 1) {
          for (let depth = 0; depth <= 1; depth += 0.25) {
            const lean = diveLeanOffset({ diveDepth: depth, planeX, anchorX, gapCenter, gapWidth, damageRadius })
            const after = envelopeClearance(anchorX + lean, gapCenter, gapWidth, damageRadius)
            expect(after).toBeGreaterThanOrEqual(-1e-9)
          }
        }
      }
    }
  })

  it('is no stronger than the shared gap clamp allows for the same flyer', () => {
    for (const anchorX of [-10, -6, -3, 3, 6, 10]) {
      const requested = Math.abs(8 - anchorX)
      const room = clampAmplitudeToGap({
        requestedAmplitude: requested,
        anchorX,
        gapCenter: 0,
        gapWidth: 5.5,
        damageRadius: 0.7,
        reach: 1,
      })
      const lean = diveLeanOffset({ diveDepth: 1, planeX: 8, anchorX, gapCenter: 0, gapWidth: 5.5, damageRadius: 0.7 })
      expect(Math.abs(lean)).toBeLessThanOrEqual(Math.min(requested, DIVE_LEAN_MAX, room) + 1e-9)
    }
  })

  it('treats junk input as no lean rather than throwing or drifting', () => {
    expect(diveLeanOffset({ diveDepth: Number.NaN, planeX: 5, anchorX: -5 })).toBe(0)
    expect(diveLeanOffset({ diveDepth: 1, planeX: Number.NaN, anchorX: -5 })).toBe(0)
    expect(diveLeanOffset({ diveDepth: 'deep', planeX: 5, anchorX: -5 })).toBe(0)
    expect(Number.isFinite(diveLeanOffset({ diveDepth: 1, planeX: 5, anchorX: 'left' }))).toBe(true)
  })
})
