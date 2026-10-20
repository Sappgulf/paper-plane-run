/**
 * Diving flyers lean toward the lane you are in.
 *
 * A biplane or hawk on the dive pattern drops on a fixed rhythm and ignores
 * where the plane is. That is readable, but it is also the easiest threat in
 * the sky to sidestep without thinking, because it never comes for you. Here,
 * the lower half of each dip drifts sideways toward the plane's current x, so
 * a player who wanders off the wave's gap is actually pursued, and a player
 * who holds the gap is not.
 *
 * The lean is capped by the same gap clamp that bounds every other hazard's
 * motion (`clampAmplitudeToGap`): it can close on the plane only as far as the
 * damage envelope stays clear of the wave's guaranteed gap. The fairness
 * property in `gap-weave` therefore still holds while the flyer moves.
 *
 * Pure, so the lean curve and its clamp are testable without a renderer.
 */
import { clampAmplitudeToGap } from './gap-weave.js'

/** Largest sideways drift a dive can add, in world units. */
export const DIVE_LEAN_MAX = 2.2

function clamp01(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : 0
}

function finite(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

/**
 * The sideways offset to add to a diving flyer this frame.
 *
 * `diveDepth` is 0 at the top of the dip and 1 at its bottom, so the lean
 * builds with the descent rather than snapping on. `anchorX` should already
 * include the pattern's own x offset, so the gap clamp measures the flyer's
 * real position.
 */
export function diveLeanOffset({
  diveDepth = 0,
  planeX = 0,
  anchorX = 0,
  gapCenter = 0,
  gapWidth = 5.5,
  damageRadius = 0.7,
  maxLean = DIVE_LEAN_MAX,
} = {}) {
  const depth = clamp01(diveDepth)
  // Without a known plane position, anchor and gap there is nothing safe to
  // lean toward, so the flyer keeps its authored path rather than guessing.
  if (depth <= 0 || ![planeX, anchorX, gapCenter].every((value) => Number.isFinite(Number(value)))) return 0
  const cap = Math.max(0, finite(maxLean, DIVE_LEAN_MAX))
  const wanted = Math.min(cap, Math.max(-cap, Number(planeX) - Number(anchorX))) * depth
  if (wanted === 0) return 0
  const room = clampAmplitudeToGap({
    requestedAmplitude: Math.abs(wanted),
    anchorX: Number(anchorX),
    gapCenter: Number(gapCenter),
    gapWidth,
    damageRadius,
    reach: 1,
  })
  return Math.sign(wanted) * Math.min(Math.abs(wanted), room)
}
