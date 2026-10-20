/**
 * Ink Blast — the auto-firing weapon tree.
 *
 * The plane gets visible wing pods (see the flight engine) and fires a short
 * homing paper dart at the nearest lethal hazard in a forward cone. It is
 * deliberately not a panic button: minimum range, a narrow cone and a long
 * cooldown keep steering primary, and bosses/buildings are immune.
 */

function finite(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function nonNegative(value, fallback = 0) {
  return Math.max(0, finite(value, fallback))
}

/** Nearest threat the weapon will acknowledge; closer than this is steering's job. */
export const WEAPON_MIN_RANGE = 10
/** Stars per popped hazard. */
export const WEAPON_POP_STARS = 1

export function getWeaponTuning({ level = 0, salvo = 0, pierce = 0 } = {}) {
  const lv = Math.max(0, Math.min(4, Math.floor(nonNegative(level))))
  const salvoRank = Math.max(0, Math.min(2, Math.floor(nonNegative(salvo))))
  const pierceRank = Math.max(0, Math.min(2, Math.floor(nonNegative(pierce))))
  if (lv === 0) {
    return Object.freeze({
      unlocked: false,
      level: 0,
      salvo: salvoRank,
      pierce: pierceRank,
      cooldownSeconds: 0,
      range: 0,
      darts: 0,
      pierceCount: 0,
      damage: 0,
      shotSpeed: 0,
      minRange: 0,
      maxLateral: 0,
      maxVertical: 0,
      homing: 0,
    })
  }
  return Object.freeze({
    unlocked: true,
    level: lv,
    salvo: salvoRank,
    pierce: pierceRank,
    cooldownSeconds: Math.max(1.4, 3.2 - (lv - 1) * 0.45 - salvoRank * 0.1),
    range: 46 + (lv - 1) * 6 + salvoRank * 2,
    darts: 1 + salvoRank,
    pierceCount: pierceRank,
    damage: 1 + (lv >= 3 ? 1 : 0),
    shotSpeed: 52 + lv * 4,
    minRange: WEAPON_MIN_RANGE,
    maxLateral: 5.6 + (lv - 1) * 0.7 + salvoRank * 1.2,
    maxVertical: 4.2 + (lv - 1) * 0.3,
    homing: 0.16,
  })
}

/** HUD contract for the weapon chip. */
export function getWeaponState({ tuning = getWeaponTuning(), cooldownLeft = 0 } = {}) {
  const unlocked = Boolean(tuning?.unlocked)
  const duration = nonNegative(tuning?.cooldownSeconds)
  const remaining = unlocked ? Math.min(duration, nonNegative(cooldownLeft)) : 0
  return Object.freeze({
    unlocked,
    ready: unlocked && remaining <= 0,
    cooldownSeconds: duration,
    cooldownRemaining: remaining,
    cooldownProgress: unlocked && duration > 0 ? Math.min(1, Math.max(0, 1 - remaining / duration)) : 0,
  })
}

/**
 * Pick up to `limit` targets in the forward cone, nearest in z first. The
 * engine passes simplified records so this stays pure and testable.
 */
export function selectWeaponTargets({
  targets = [],
  x = 0,
  y = 0,
  range = 0,
  maxLateral = 0,
  maxVertical = 0,
  minRange = WEAPON_MIN_RANGE,
  limit = 1,
} = {}) {
  const cap = Math.max(0, Math.floor(nonNegative(limit)))
  if (cap === 0) return []
  const maxZ = nonNegative(range)
  const minZ = nonNegative(minRange)
  const lateral = nonNegative(maxLateral)
  const vertical = nonNegative(maxVertical)
  const scored = []
  for (const target of targets || []) {
    if (!target || (target.type !== 'bird' && target.type !== 'scissors')) continue
    const z = finite(target.z, NaN)
    if (!Number.isFinite(z) || z < minZ || z > maxZ) continue
    const dx = finite(target.x) - finite(x)
    const dy = finite(target.y) - finite(y)
    if (Math.abs(dx) > lateral || Math.abs(dy) > vertical) continue
    scored.push({ target, z, distance: Math.abs(dx) + Math.abs(dy) })
  }
  scored.sort((a, b) => a.z - b.z || a.distance - b.distance)
  return scored.slice(0, cap).map(({ target }) => target)
}

/** Homing dart step: lateral steering only; forward travel stays constant. */
export function advanceHomingShot({
  x = 0,
  y = 0,
  z = 0,
  dt = 0,
  speed = 0,
  targetX = null,
  targetY = null,
  homing = 0,
} = {}) {
  const step = nonNegative(dt)
  const travel = nonNegative(speed) * step
  let nextX = finite(x)
  let nextY = finite(y)
  const tx = Number(targetX)
  const ty = Number(targetY)
  if (Number.isFinite(tx) && Number.isFinite(ty)) {
    const dx = tx - nextX
    const dy = ty - nextY
    const length = Math.hypot(dx, dy)
    if (length > 0.0001) {
      const steer = Math.min(length, travel * nonNegative(homing))
      nextX += (dx / length) * steer
      nextY += (dy / length) * steer
    }
  }
  return Object.freeze({ x: nextX, y: nextY, z: finite(z) + travel })
}

/**
 * Swept dart collision. A low-frame-rate step can move the dart several units
 * per update; a point test at the end of the step can tunnel straight through
 * a flyer. Measure the segment from the previous position instead.
 */
export function shotHitsTargetSwept({
  fromX = 0,
  fromY = 0,
  fromZ = 0,
  toX = 0,
  toY = 0,
  toZ = 0,
  shotRadius = 0.3,
  targetX = 0,
  targetY = 0,
  targetZ = 0,
  targetRadius = 0.7,
} = {}) {
  const ax = finite(fromX)
  const ay = finite(fromY)
  const az = finite(fromZ)
  const bx = finite(toX)
  const by = finite(toY)
  const bz = finite(toZ)
  const tx = finite(targetX)
  const ty = finite(targetY)
  const tz = finite(targetZ)
  const dx = bx - ax
  const dy = by - ay
  const dz = bz - az
  const lengthSq = dx * dx + dy * dy + dz * dz
  let t = 0
  if (lengthSq > 0.0000001) {
    t = ((tx - ax) * dx + (ty - ay) * dy + (tz - az) * dz) / lengthSq
    t = Math.max(0, Math.min(1, t))
  }
  const cx = ax + dx * t
  const cy = ay + dy * t
  const cz = az + dz * t
  const ox = tx - cx
  const oy = ty - cy
  const oz = tz - cz
  const hitR = nonNegative(targetRadius) + nonNegative(shotRadius)
  return ox * ox + oy * oy + oz * oz <= hitR * hitR
}

/** Apply one dart hit to a flyer's armor pool. */
export function resolveWeaponHit({ hp = 1, damage = 1 } = {}) {
  const current = Math.max(0, Math.floor(nonNegative(hp, 1)))
  const deltas = Math.max(1, Math.floor(nonNegative(damage, 1)))
  const next = Math.max(0, current - deltas)
  return Object.freeze({ hp: next, killed: next <= 0, damage: deltas })
}

export function shotHitsTarget({
  shotX = 0,
  shotY = 0,
  shotZ = 0,
  shotRadius = 0.3,
  targetX = 0,
  targetY = 0,
  targetZ = 0,
  targetRadius = 0.7,
} = {}) {
  const dx = finite(targetX) - finite(shotX)
  const dy = finite(targetY) - finite(shotY)
  const dz = finite(targetZ) - finite(shotZ)
  const hitR = nonNegative(targetRadius) + nonNegative(shotRadius)
  return dx * dx + dy * dy + dz * dz <= hitR * hitR
}
