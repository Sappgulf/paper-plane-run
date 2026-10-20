import { describe, expect, it } from 'vitest'
import {
  STOOP_IMPACT_Z,
  STOOP_LOCK_Z,
  STOOP_MAX_LATERAL,
  STOOP_SHIVER,
  STOOP_TRIGGER_Z,
  advanceStoop,
  createStoopState,
  stoopLockX,
} from '../src/game/hawk-stoop.js'

const GAP = { gapCenter: 0, gapWidth: 5.5 }
// The caller pads the envelope with the hawk's own pattern drift and the shiver.
const padded = (radius, amplitudeX = 0.6) => radius + amplitudeX * 0.45 + STOOP_SHIVER

function clearance(x, { gapCenter, gapWidth }, damageRadius) {
  return Math.abs(x - gapCenter) - gapWidth / 2 - damageRadius
}

// Walk a hawk in from `from` to `to` one metre at a time, the way the world scrolls past.
function approach(state, from, to, input) {
  let current = state
  let last = null
  for (let ahead = from; ahead >= to; ahead -= 1) {
    last = advanceStoop(current, { ...input, ahead })
    current = last.state
  }
  return { state: current, last }
}

describe('hawk stoop timing', () => {
  const base = { anchorX: -6, anchorY: 12, planeX: 5, planeY: 9, ...GAP, damageRadius: padded(0.9) }

  it('never locks a hawk first seen inside the trigger distance', () => {
    const frame = advanceStoop(createStoopState(), { ...base, ahead: STOOP_TRIGGER_Z - 1 })
    expect(frame.phase).toBe('idle')
    expect(frame.state.armed).toBe(false)
    const later = approach(frame.state, STOOP_TRIGGER_Z - 2, STOOP_IMPACT_Z, base)
    expect(later.last.phase).toBe('idle')
    expect(later.last.offsetX).toBe(0)
    expect(later.last.offsetY).toBe(0)
  })

  it('arms beyond the trigger, then locks as it crosses the trigger distance', () => {
    const far = advanceStoop(createStoopState(), { ...base, ahead: STOOP_TRIGGER_Z + 20 })
    expect(far.phase).toBe('idle')
    expect(far.state.armed).toBe(true)
    expect(far.state.lockX).toBeNull()
    const locked = advanceStoop(far.state, { ...base, ahead: STOOP_TRIGGER_Z })
    expect(locked.phase).toBe('lock')
    expect(locked.state.lockX).not.toBeNull()
  })

  it('shivers in place during the lock and tightens its tension toward the stoop', () => {
    const armed = advanceStoop(createStoopState(), { ...base, ahead: STOOP_TRIGGER_Z + 5 })
    const early = advanceStoop(armed.state, { ...base, ahead: STOOP_TRIGGER_Z - 1 })
    const late = advanceStoop(armed.state, { ...base, ahead: STOOP_LOCK_Z + 1 })
    expect(early.phase).toBe('lock')
    expect(late.phase).toBe('lock')
    expect(early.tension).toBeLessThan(late.tension)
    expect(late.tension).toBeLessThanOrEqual(1)
    for (const frame of [early, late]) {
      expect(Math.abs(frame.offsetX)).toBeLessThanOrEqual(STOOP_SHIVER + 1e-9)
      expect(frame.offsetY).toBe(0)
    }
  })

  it('eases sideways and downward from the lock to the lane, and reaches it at impact', () => {
    const armed = advanceStoop(createStoopState(), { ...base, ahead: STOOP_TRIGGER_Z + 5 })
    const lockX = advanceStoop(armed.state, { ...base, ahead: STOOP_TRIGGER_Z }).state.lockX
    const xs = []
    for (let ahead = STOOP_LOCK_Z; ahead > STOOP_IMPACT_Z; ahead -= 2) {
      xs.push(advanceStoop(armed.state, { ...base, ahead }).offsetX)
    }
    for (let index = 1; index < xs.length; index += 1) {
      expect(Math.abs(xs[index])).toBeGreaterThanOrEqual(Math.abs(xs[index - 1]) - 1e-9)
    }
    const hold = advanceStoop(armed.state, { ...base, ahead: STOOP_IMPACT_Z })
    expect(hold.phase).toBe('hold')
    expect(hold.offsetX).toBeCloseTo(lockX, 9)
    expect(hold.offsetY).toBeCloseTo(base.planeY - base.anchorY, 9)
  })

  it('rears up through the lock and settles back as it stoops, with no jump', () => {
    const armed = advanceStoop(createStoopState(), { ...base, ahead: STOOP_TRIGGER_Z + 5 })
    const rears = []
    for (let ahead = STOOP_TRIGGER_Z; ahead > STOOP_IMPACT_Z; ahead -= 1) {
      rears.push(advanceStoop(armed.state, { ...base, ahead }).rear)
    }
    expect(rears[0]).toBeCloseTo(0, 9)
    expect(Math.max(...rears)).toBeCloseTo(1, 1)
    expect(rears[rears.length - 1]).toBeLessThan(0.1)
    for (let index = 1; index < rears.length; index += 1) {
      expect(Math.abs(rears[index] - rears[index - 1])).toBeLessThan(0.2)
    }
    expect(advanceStoop(armed.state, { ...base, ahead: STOOP_IMPACT_Z }).rear).toBe(0)
  })

  it('keeps its lane once locked, even if the plane moves away', () => {
    const armed = advanceStoop(createStoopState(), { ...base, ahead: STOOP_TRIGGER_Z + 5 })
    const locked = advanceStoop(armed.state, { ...base, ahead: STOOP_TRIGGER_Z })
    const moved = advanceStoop(locked.state, { ...base, planeX: -9, ahead: STOOP_LOCK_Z - 5 })
    expect(moved.state.lockX).toBe(locked.state.lockX)
  })
})

describe('hawk stoop lane', () => {
  it('locks toward the plane, but never farther than the widest stoop', () => {
    for (const planeX of [-13, -8, 8, 13]) {
      const lockX = stoopLockX({ anchorX: 0, planeX, damageRadius: 0.5, gapCenter: 40, gapWidth: 5 })
      expect(Math.abs(lockX)).toBeLessThanOrEqual(STOOP_MAX_LATERAL + 1e-9)
      expect(Math.sign(lockX) || 0).toBe(Math.sign(planeX))
    }
  })

  it('never carries the hawk into the wave gap, for any plane position or gap', () => {
    for (const gapCenter of [-3, 0, 2.5]) {
      for (let anchorX = -12; anchorX <= 12; anchorX += 1) {
        const damage = padded(0.9)
        const before = clearance(anchorX, { gapCenter, gapWidth: 5.5 }, damage)
        if (before < 0) continue
        for (let planeX = -13; planeX <= 13; planeX += 1) {
          const lockX = stoopLockX({ anchorX, planeX, gapCenter, gapWidth: 5.5, damageRadius: damage })
          expect(clearance(anchorX + lockX, { gapCenter, gapWidth: 5.5 }, damage)).toBeGreaterThanOrEqual(-1e-9)
        }
      }
    }
  })

  it('stops at the gap edge when the plane is in the gap, so a plane in the gap is never stooped on', () => {
    // The plane sits dead centre in the gap, and the hawk is outside it.
    const lockX = stoopLockX({ anchorX: 9, planeX: 0, gapCenter: 0, gapWidth: 5.5, damageRadius: padded(0.9) })
    expect(clearance(9 + lockX, { gapCenter: 0, gapWidth: 5.5 }, padded(0.9))).toBeGreaterThanOrEqual(-1e-9)
  })

  it('locks onto nothing when the hawk is already over the plane', () => {
    expect(stoopLockX({ anchorX: 4, planeX: 4, damageRadius: 0.5 })).toBe(0)
  })
})

describe('hawk stoop robustness', () => {
  it('treats junk input as an idle frame that leaves the state untouched', () => {
    const state = Object.freeze({ armed: true, lockX: 1.5 })
    for (const bad of [{}, { ahead: Number.NaN }, { ahead: 50, planeX: 'x', anchorX: 0, anchorY: 0, planeY: 0 }]) {
      const frame = advanceStoop(state, bad)
      expect(frame.phase).toBe('idle')
      expect(frame.state).toBe(state)
    }
  })

  it('is deterministic: the same inputs give the same frame', () => {
    const input = { ahead: 40, anchorX: -4, anchorY: 10, planeX: 3, planeY: 8, gapCenter: 0, gapWidth: 5.5, damageRadius: 1.2 }
    const armed = Object.freeze({ armed: true, lockX: 2 })
    expect(advanceStoop(armed, input)).toEqual(advanceStoop(armed, input))
  })

  it('returns frozen frames so a shared result cannot be mutated', () => {
    expect(Object.isFrozen(advanceStoop(createStoopState(), { ahead: 10 }))).toBe(true)
  })
})
