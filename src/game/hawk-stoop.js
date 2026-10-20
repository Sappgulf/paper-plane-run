/**
 * Diving hawks stoop.
 *
 * The dive lean (dive-lean.js) makes a biplane drift toward your lane while it
 * dips. That is readable, but it never commits to anything, so a hawk reads as
 * weather rather than as a predator. A hawk should attack the way one does: it
 * spots you from far ahead, rears back, and stoops at the lane you were in when
 * it committed.
 *
 * The attack is a telegraph in three beats. They are timed by how far ahead the
 * hawk is, not by the clock, so a fast run and a slow one get the same warning:
 *
 *  - Lock (STOOP_TRIGGER_Z to STOOP_LOCK_Z): the hawk shivers and its warning
 *    ring grows. Its lane is fixed here, at the plane's x now, capped at
 *    STOOP_MAX_LATERAL and clamped to the gap exactly as every other hazard
 *    motion is.
 *  - Stoop (STOOP_LOCK_Z to STOOP_IMPACT_Z): the hawk dives toward the plane's
 *    height and eases sideways onto its locked lane.
 *  - Hold (inside STOOP_IMPACT_Z): the hawk sits on its lane as it crosses the
 *    plane.
 *
 * A hawk first seen inside STOOP_TRIGGER_Z has no warning to give, so it never
 * stoops and dives the way it always did. The caller passes the hawk's full
 * envelope (its own pattern drift and the shiver included), so the clamp holds
 * for every position it can take. A stoop can therefore reach a plane that has
 * left the gap, and it cannot close a gap the plane is flying through.
 *
 * Pure, so the timing and the clamp are testable without a renderer.
 */
import { clampAmplitudeToGap } from './gap-weave.js'

/** Distance ahead at which an armed hawk locks its lane, world units (about 1.2 s before impact at cruise). */
export const STOOP_TRIGGER_Z = 72
/** Distance ahead at which the lock turns into the stoop. */
export const STOOP_LOCK_Z = 30
/** Distance ahead at which the hawk is on its lane as it crosses the plane. */
export const STOOP_IMPACT_Z = 2
/** Widest sideways stoop, world units. */
export const STOOP_MAX_LATERAL = 3.2
/** Sideways shiver while locked, world units at full tension. Callers pad the envelope by this much. */
export const STOOP_SHIVER = 0.12

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/** Smoothstep, so a stoop eases in and out rather than snapping. */
function ease(progress) {
  const t = clamp(progress, 0, 1)
  return t * t * (3 - 2 * t)
}

export function createStoopState() {
  return Object.freeze({ armed: false, lockX: null })
}

/**
 * The sideways offset a hawk locks onto: the plane's x at lock time, capped at
 * `STOOP_MAX_LATERAL` and clamped to the gap by the same bound that limits every
 * other hazard's motion. Returns 0 when the plane is directly over the hawk.
 */
export function stoopLockX({
  anchorX,
  planeX,
  gapCenter = 0,
  gapWidth = 5.5,
  damageRadius = 0.7,
} = {}) {
  const requested = clamp(planeX - anchorX, -STOOP_MAX_LATERAL, STOOP_MAX_LATERAL)
  if (requested === 0) return 0
  const room = clampAmplitudeToGap({
    requestedAmplitude: Math.abs(requested),
    anchorX,
    gapCenter,
    gapWidth,
    damageRadius,
    reach: 1,
  })
  return Math.sign(requested) * Math.min(Math.abs(requested), room)
}

/**
 * One frame of a hawk's attack.
 *
 * `ahead` is the hawk's distance in front of the plane, which shrinks as the
 * world scrolls. `anchorX` and `anchorY` are its spawn anchor, and `planeX` and
 * `planeY` are where the plane is now. `gapCenter`, `gapWidth` and `damageRadius`
 * describe the wave's gap and the hawk's full envelope.
 *
 * Returns the next state, the phase, the offsets to add to the hawk's own motion,
 * the telegraph tension from 0 to 1, and `rear`: how far the hawk is rearing up,
 * from 0 to 1 and back to 0 as it stoops. Junk input leaves the state untouched and
 * returns an idle frame.
 */
export function advanceStoop(state, input = {}) {
  const previous = state || createStoopState()
  const { ahead, anchorX, anchorY, planeX, planeY } = input
  if (![ahead, anchorX, anchorY, planeX, planeY].every(isNumber)) {
    return Object.freeze({ state: previous, phase: 'idle', offsetX: 0, offsetY: 0, tension: 0, rear: 0 })
  }
  if (ahead > STOOP_TRIGGER_Z) {
    // Still far out. A hawk seen here can warn, so it is armed. It has no lane yet.
    return Object.freeze({
      state: Object.freeze({ armed: true, lockX: null }),
      phase: 'idle',
      offsetX: 0,
      offsetY: 0,
      tension: 0,
      rear: 0,
    })
  }
  // A hawk first seen this close has no warning to give, so it never stoops.
  if (!previous.armed) {
    return Object.freeze({ state: previous, phase: 'idle', offsetX: 0, offsetY: 0, tension: 0, rear: 0 })
  }
  const lockX = previous.lockX ?? stoopLockX(input)
  const next = Object.freeze({ armed: true, lockX })
  const drop = planeY - anchorY
  if (ahead > STOOP_LOCK_Z) {
    const tension = clamp((STOOP_TRIGGER_Z - ahead) / (STOOP_TRIGGER_Z - STOOP_LOCK_Z), 0, 1)
    return Object.freeze({
      state: next,
      phase: 'lock',
      offsetX: Math.sin(ahead * 2.3) * STOOP_SHIVER * tension,
      offsetY: 0,
      tension,
      rear: tension,
    })
  }
  if (ahead > STOOP_IMPACT_Z) {
    const progress = ease((STOOP_LOCK_Z - ahead) / (STOOP_LOCK_Z - STOOP_IMPACT_Z))
    return Object.freeze({
      state: next,
      phase: 'stoop',
      offsetX: lockX * progress,
      offsetY: drop * progress,
      tension: 1,
      rear: 1 - progress,
    })
  }
  return Object.freeze({ state: next, phase: 'hold', offsetX: lockX, offsetY: drop, tension: 1, rear: 0 })
}
