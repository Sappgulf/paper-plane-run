import { getWeaponState } from './upgrade-runtime.js'

export function resolveWeaponFire({
  weaponLevel = 0,
  cooldownSeconds = 0,
  cooldownLeft = 0,
  playing = true,
} = {}) {
  if (!playing) {
    return Object.freeze({ fired: false, cooldownLeft: Math.max(0, Number(cooldownLeft) || 0) })
  }
  const weapon = getWeaponState({ weaponLevel, cooldownSeconds, cooldownLeft })
  if (!weapon.ready) {
    return Object.freeze({
      fired: false,
      cooldownLeft: weapon.cooldownRemaining,
      ready: false,
      cooldownProgress: weapon.cooldownProgress,
    })
  }
  return Object.freeze({
    fired: true,
    cooldownLeft: weapon.cooldownSeconds,
    ready: false,
    cooldownProgress: 0,
    shot: Object.freeze({ radius: 0.5, ttl: 1.4, speed: 46 }),
  })
}

export function advanceShot({ z = 0, ttl = 0, dt = 0, speed = 46 } = {}) {
  const step = Math.max(0, Number(dt) || 0)
  return Object.freeze({
    z: Number(z) + speed * step,
    ttl: Math.max(0, Number(ttl) - step),
    expired: Number(ttl) - step <= 0,
  })
}

export function shotHitsTarget({
  shotX = 0,
  shotY = 0,
  shotZ = 0,
  shotRadius = 0.5,
  targetX = 0,
  targetY = 0,
  targetZ = 0,
  targetRadius = 0.7,
} = {}) {
  const dx = targetX - shotX
  const dy = targetY - shotY
  const dz = targetZ - shotZ
  const hitR = (Number(targetRadius) || 0) + (Number(shotRadius) || 0)
  return dx * dx + dy * dy + dz * dz < hitR * hitR
}

/** Stars awarded when Ink Blast pops a hazard. */
export function inkPopReward() {
  return 2
}
