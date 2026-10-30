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

export function describeFocusCue(type, kind) {
  if (type === 'boss') return { cue: 'hazard', label: 'GATE AHEAD' }
  if (type === 'building') return { cue: 'hazard', label: 'DODGE · BUILDING' }
  if (type === 'scissors') return { cue: 'hazard', label: 'DODGE · SCISSORS' }
  if (type === 'bird') {
    const name = { bird: 'BIRD', balloon: 'BALLOON', kite: 'KITE', biplane: 'BIPLANE', dragonfly: 'DRAGONFLY', wasp: 'WASP', hawk: 'HAWK' }[kind] || 'FLYER'
    return { cue: 'hazard', label: `DODGE · ${name}` }
  }
  if (type === 'power') return { cue: 'power', label: ({ boost: 'BOOST · SPEED', shield: 'SHIELD · PROTECT', magnet: 'MAGNET · STARS' })[kind] || 'POWER' }
  if (type === 'updraft') return { cue: 'lift', label: 'UPDRAFT · LIFT' }
  if (type === 'star' || type === 'ring') return { cue: 'star', label: 'STAR LINE' }
  return { cue: 'clear', label: 'FLY' }
}

export function focusScore({ z, dx = 0, dy = 0, type, teachStars = false } = {}) {
  const ahead = finite(z, Infinity)
  if (ahead < FOCUS_Z_MIN || ahead > FOCUS_Z_MAX) return Infinity
  if (teachStars && type !== 'star' && type !== 'ring') return Infinity
  const isPickup = type === 'star' || type === 'power' || type === 'ring' || type === 'updraft'
  const isHazard = type === 'building' || type === 'bird' || type === 'scissors' || type === 'boss'
  if (!teachStars && !isPickup && !isHazard) return Infinity
  const lateral = Math.hypot(finite(dx), finite(dy) * 0.55)
  if (type === 'updraft' && Math.abs(finite(dx)) > 6) return Infinity
  const bossBias = type === 'boss' ? -8 : 0
  return ahead + lateral * LANE_WEIGHT + bossBias
}

export function pickFlightFocus(candidates, { planeX = 0, planeY = 10, teachStars = false } = {}) {
  let best = null
  let bestScore = Infinity
  let urgent = null
  let urgentScore = Infinity
  for (const item of candidates || []) {
    const type = item.type
    const x = item.x ?? item.mesh?.position?.x
    const bossGap = item.mesh?.userData?.gapY
    const y = type === 'boss' && Number.isFinite(bossGap)
      ? finite(item.mesh?.position?.y) + bossGap
      : item.y ?? item.mesh?.position?.y
    const z = item.z ?? item.mesh?.position?.z
    const score = focusScore({
      z,
      dx: finite(x) - finite(planeX),
      dy: finite(y) - finite(planeY),
      type,
      teachStars,
    })
    // Teaching a star line must never hide a nearby collision threat in the
    // player's path. Ignore distant or off-lane hazards so the lesson stays calm.
    if (teachStars && ['bird', 'scissors', 'building'].includes(type)
      && finite(z, Infinity) >= FOCUS_Z_MIN && finite(z, Infinity) <= 32
      && Math.abs(finite(x) - finite(planeX)) <= 4
      && Math.abs(finite(y) - finite(planeY)) <= 4.5) {
      const dangerScore = focusScore({ z, dx: finite(x) - finite(planeX), dy: finite(y) - finite(planeY), type })
      if (dangerScore < urgentScore) {
        urgentScore = dangerScore
        urgent = { type, kind: type === 'bird' ? item.flyerId : item.kind, score: dangerScore, x: finite(x), y: finite(y), z: finite(z) }
      }
    }
    if (score < bestScore) {
      bestScore = score
      best = { type, kind: type === 'bird' ? item.flyerId : item.kind, score, x: finite(x), y: finite(y), z: finite(z) }
    }
  }
  if (urgent) best = urgent
  // Prefer the teaching star line when one exists; do not suppress useful
  // lift or power cues merely because the early corridor has no stars.
  if (!best && teachStars) return pickFlightFocus(candidates,{planeX,planeY,teachStars:false})
  if (!best) return { cue: 'clear', label: 'FLY', type: null, score: Infinity, target: null }
  return { ...describeFocusCue(best.type,best.kind), type: best.type, score: best.score, target: { x: best.x, y: best.y, z: best.z } }
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
