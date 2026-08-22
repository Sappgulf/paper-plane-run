/**
 * Flight-path focus: what the reticle should name this frame.
 *
 * Nearest-in-Z is a bad proxy. Buildings sit in every wave, so a far-side
 * tower closer in depth would scream DODGE while the star in your lane
 * went unnamed. Score ahead-distance plus lateral miss so the cue is the
 * thing you can actually fly.
 */

export const FOCUS_Z_MIN = 3
export const FOCUS_Z_MAX = 46
export const TELEGRAPH_Z = 34
/** Lanes sit 6 apart; beyond ~1.4 lanes a telegraph is noise. */
export const TELEGRAPH_LANE_X = 8.5
const LANE_WEIGHT = 1.85

function finite(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

export function describeFocusCue(type) {
  if (type === 'boss') return { cue: 'hazard', label: 'GATE AHEAD' }
  if (type === 'building' || type === 'bird' || type === 'scissors') {
    return { cue: 'hazard', label: 'DODGE' }
  }
  if (type === 'power') return { cue: 'power', label: 'POWER' }
  if (type === 'star' || type === 'ring') return { cue: 'star', label: 'STAR LINE' }
  return { cue: 'clear', label: 'FLY' }
}

export function focusScore({ z, dx = 0, dy = 0, type, teachStars = false } = {}) {
  const ahead = finite(z, Infinity)
  if (ahead < FOCUS_Z_MIN || ahead > FOCUS_Z_MAX) return Infinity
  if (teachStars && type !== 'star' && type !== 'ring') return Infinity
  const isPickup = type === 'star' || type === 'power' || type === 'ring'
  const isHazard = type === 'building' || type === 'bird' || type === 'scissors' || type === 'boss'
  if (!teachStars && !isPickup && !isHazard) return Infinity
  const lateral = Math.hypot(finite(dx), finite(dy) * 0.55)
  const bossBias = type === 'boss' ? -8 : 0
  return ahead + lateral * LANE_WEIGHT + bossBias
}

export function pickFlightFocus(candidates, { planeX = 0, planeY = 10, teachStars = false } = {}) {
  let best = null
  let bestScore = Infinity
  for (const item of candidates || []) {
    const type = item.type
    const x = item.x ?? item.mesh?.position?.x
    const y = item.y ?? item.mesh?.position?.y
    const z = item.z ?? item.mesh?.position?.z
    const score = focusScore({
      z,
      dx: finite(x) - finite(planeX),
      dy: finite(y) - finite(planeY),
      type,
      teachStars,
    })
    if (score < bestScore) {
      bestScore = score
      best = { type, score, x: finite(x), y: finite(y), z: finite(z) }
    }
  }
  if (!best) return { cue: 'clear', label: 'FLY', type: null, score: Infinity, target: null }
  return { ...describeFocusCue(best.type), type: best.type, score: best.score, target: { x: best.x, y: best.y, z: best.z } }
}

export function isTelegraphHazardType(type, { dive = false } = {}) {
  return type === 'scissors' || type === 'boss' || (type === 'bird' && dive)
}

export function shouldTelegraphHazard({
  type,
  z,
  dx = 0,
  dive = false,
  alreadyWarned = false,
} = {}) {
  if (alreadyWarned) return false
  if (!isTelegraphHazardType(type, { dive })) return false
  const ahead = finite(z, Infinity)
  if (ahead > TELEGRAPH_Z || ahead <= 4) return false
  if (type !== 'boss' && Math.abs(finite(dx)) > TELEGRAPH_LANE_X) return false
  return true
}
