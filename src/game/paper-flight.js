/**
 * Shared paper-plane integration: relative stick/keys and cursor aim
 * both have to feel like the same sheet of paper.
 *
 * Aim mode used to lerp onto the cursor and then rebuild velocity from that
 * delta, which wiped wind, tear, and sink — Lift Crease and gusts did nothing
 * on the default mouse/touch path.
 */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function finite(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

/** How much natural sink still pulls an aimed plane when the cursor is still. */
export const AIM_SINK_WEIGHT = 0.4
/** Wind/tear shove that survives cursor follow. */
export const AIM_WIND_WEIGHT = 0.62
export const UNFOLD_SECONDS = 0.55
export const SPAWN_INVULN_SECONDS = 0.8

export function groundEffectSpeedMul(tier = 0) {
  const level = Math.max(0, Math.min(5, Math.floor(finite(tier))))
  return 1 + level * 0.04
}

export function integrateRelativeFlight({
  x = 0,
  y = 0,
  velX = 0,
  velY = 0,
  inputX = 0,
  inputY = 0,
  dt = 1 / 60,
  acceleration = 42,
  sinkPerSecond = 0,
  dragX = 0.06,
  dragY = 0.1,
  maxVel = 38,
  extraForceX = 0,
  extraForceY = 0,
} = {}) {
  const step = Math.max(0, finite(dt))
  let vx = finite(velX) + finite(inputX) * finite(acceleration) * step + finite(extraForceX) * step
  let vy = finite(velY) + finite(inputY) * finite(acceleration) * step + finite(extraForceY) * step - finite(sinkPerSecond) * step
  vx *= Math.pow(clamp(finite(dragX, 0.06), 0.0001, 0.99), step)
  vy *= Math.pow(clamp(finite(dragY, 0.1), 0.0001, 0.99), step)
  const cap = Math.max(1, finite(maxVel, 38))
  vx = clamp(vx, -cap, cap)
  vy = clamp(vy, -cap, cap)
  return {
    x: finite(x) + vx * step,
    y: finite(y) + vy * step,
    velX: vx,
    velY: vy,
  }
}

/**
 * Turn "where the cursor is" into a stick deflection.
 *
 * Aim mode used to lerp the plane's *position* onto the cursor, which could
 * never overshoot but also ignored wind, sink and the tuck. Both control
 * schemes now drive the same force-based plane, so the cursor has to become an
 * input instead — and how that conversion is written decides whether the game
 * is playable at all, because the ground ends the run.
 *
 * This is velocity matching, not a position error with a damping term. It asks
 * "how fast should I be closing on the cursor right now?", caps that, and
 * deflects by how far the current speed is from it. The distinction matters
 * because of frame rate: a proportional-derivative command tuned at 60Hz is
 * under-damped at the 20Hz the engine's dt cap allows, and it overshoots by
 * more the longer the frame — which on a slow or stuttering device drove the
 * plane straight through the floor while the player was aiming at a perfectly
 * legal altitude. Velocity matching has no such term to mistune: the commanded
 * approach speed falls to zero as the plane arrives, at any frame rate.
 */
/** Fastest approach the aim will ask for, units/second. */
export const AIM_MAX_APPROACH = 17
/** Approach speed requested per unit of distance to the cursor. */
export const AIM_APPROACH_GAIN = 3.4
/** How hard a mismatch between actual and wanted closing speed deflects. */
export const AIM_VELOCITY_GAIN = 0.2

export function aimCommand({
  delta = 0,
  velocity = 0,
  maxApproach = AIM_MAX_APPROACH,
  approachGain = AIM_APPROACH_GAIN,
  velocityGain = AIM_VELOCITY_GAIN,
} = {}) {
  const cap = Math.max(0, finite(maxApproach, AIM_MAX_APPROACH))
  const wanted = clamp(finite(delta) * finite(approachGain, AIM_APPROACH_GAIN), -cap, cap)
  return clamp((wanted - finite(velocity)) * finite(velocityGain, AIM_VELOCITY_GAIN), -1, 1)
}

export function integrateAimFlight({
  x = 0,
  y = 0,
  targetX = 0,
  targetY = 0,
  dt = 1 / 60,
  follow = 0.3,
  sinkPerSecond = 0,
  extraForceX = 0,
  extraForceY = 0,
  maxVel = 38,
} = {}) {
  const step = Math.max(0.0001, finite(dt, 1 / 60))
  const blend = clamp(finite(follow), 0, 1)
  const prevX = finite(x)
  const prevY = finite(y)
  let nx = prevX + (finite(targetX) - prevX) * blend
  let ny = prevY + (finite(targetY) - prevY) * blend
  const sink = finite(sinkPerSecond) * AIM_SINK_WEIGHT * step
  ny -= sink
  nx += finite(extraForceX) * AIM_WIND_WEIGHT * step
  ny += finite(extraForceY) * AIM_WIND_WEIGHT * step
  const invDt = 1 / step
  const cap = Math.max(1, finite(maxVel, 38))
  return {
    x: nx,
    y: ny,
    velX: clamp((nx - prevX) * invDt, -cap, cap),
    velY: clamp((ny - prevY) * invDt, -cap, cap),
    targetY: finite(targetY) - sink * 0.35,
  }
}

export function applySoftBounds({
  x = 0,
  y = 0,
  velX = 0,
  velY = 0,
  targetX = 0,
  targetY = 0,
  minX = -12,
  maxX = 12,
  minY = 2.2,
  maxY = 16.5,
} = {}) {
  let nx = finite(x)
  let ny = finite(y)
  let vx = finite(velX)
  let vy = finite(velY)
  let tx = finite(targetX)
  let ty = finite(targetY)
  if (nx < minX) {
    nx = minX
    vx = Math.abs(vx) * 0.35
    tx = Math.max(tx, minX)
  } else if (nx > maxX) {
    nx = maxX
    vx = -Math.abs(vx) * 0.35
    tx = Math.min(tx, maxX)
  }
  if (ny < minY) {
    ny = minY
    vy = Math.max(0, -vy * 0.25)
    ty = Math.max(ty, minY)
  } else if (ny > maxY) {
    ny = maxY
    vy = -Math.abs(vy) * 0.3
    ty = Math.min(ty, maxY)
  }
  return { x: nx, y: ny, velX: vx, velY: vy, targetX: tx, targetY: ty }
}
