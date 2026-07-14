const ABSOLUTE_CONTROL_MODES = new Set(['mouse', 'pointer', 'touch'])

export const SHIELD_BASE_DURATION = 8

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function positiveNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, number) : fallback
}

/** Shared steering response for relative inputs and absolute aim inputs. */
export function getControlResponse({
  mode = 'keyboard',
  dt = 1 / 60,
  accelMul = 1,
  sensitivity = 1,
  baseAcceleration = 42,
  baseFollowRate = 22,
} = {}) {
  const absolute = ABSOLUTE_CONTROL_MODES.has(mode)
  const response = positiveNumber(accelMul, 1)
  return {
    mode,
    absolute,
    acceleration: baseAcceleration * response,
    follow: absolute
      ? clamp(positiveNumber(dt) * baseFollowRate * positiveNumber(sensitivity, 1) * response, 0, 1)
      : 0,
  }
}

/** Natural sink and the inverse recovery benefit used in HUD/text feedback. */
export function getAltitudeRecovery({ baseSink = 0, sinkMul = 1 } = {}) {
  const multiplier = positiveNumber(sinkMul, 1)
  return {
    sinkMultiplier: multiplier,
    sinkPerSecond: positiveNumber(baseSink) * multiplier,
    recoveryMultiplier: multiplier > 0 ? 1 / multiplier : 1,
  }
}

/** Cruise speed keeps the existing difficulty cap calculation, then applies Long Glide. */
export function getCruiseSpeed({ baseSpeed = 0, speedRamp = 0, speedCap = baseSpeed, distance = 0, speedMul = 1 } = {}) {
  const base = positiveNumber(baseSpeed)
  const cap = Math.max(base, positiveNumber(speedCap, base))
  const ramped = Math.min(cap - base, positiveNumber(distance) * positiveNumber(speedRamp))
  return {
    baseCruise: base + ramped,
    cruiseSpeed: (base + ramped) * positiveNumber(speedMul, 1),
  }
}

/** Luck's deterministic chunk-roll thresholds. Callers keep ownership of their seeded RNG. */
export function getSpawnRates({
  starChance = 0,
  powerChance = 0,
  ramp = 0,
  starChanceMul = 1,
  powerChanceMul = 1,
  twistStarMul = 1,
  doubleStarBonus = 0,
} = {}) {
  const stars = positiveNumber(starChanceMul, 1) * positiveNumber(twistStarMul, 1)
  return {
    doubleStarChance: clamp((0.25 + positiveNumber(doubleStarBonus)) * stars, 0, 1),
    starChance: clamp(positiveNumber(starChance) * stars, 0, 1),
    powerChance: clamp(
      (positiveNumber(powerChance) + 0.08 + positiveNumber(ramp) * 0.05) * positiveNumber(powerChanceMul, 1),
      0,
      1,
    ),
  }
}

/** Star pull, catch radius, and a normalized value for the visible pull trail. */
export function getMagnetPull({
  activePowerKind = null,
  magnetBonus = 0,
  starRadius = 0.9,
  planeRadius = 0.7,
} = {}) {
  const powerBonus = activePowerKind === 'magnet' ? 1.2 : 0
  const bonus = positiveNumber(magnetBonus) + powerBonus
  const active = bonus > 0
  return {
    active,
    influenceRadius: 12,
    pullStrength: active ? 14 + bonus * 12 : 5,
    catchRadius: positiveNumber(starRadius) + positiveNumber(planeRadius, 0.7) + bonus + 0.35,
    visualStrength: clamp(bonus / 3.2, 0, 1),
  }
}

/** Tough Fiber only changes shield duration; all other power-up durations stay fixed. */
export function getPowerDuration({ kind, baseDuration = 0, shieldDurationMul = 1 } = {}) {
  const duration = positiveNumber(baseDuration) * (kind === 'shield' ? positiveNumber(shieldDurationMul, 1) : 1)
  return { kind, duration }
}

/** Wide Wings affects only the near-miss envelope, never this shared plane hitbox. */
export function getCollisionRadius({
  entityRadius = 0,
  planeRadius = 0.7,
  planeWeight = 1,
  boostActive = false,
  boostHitboxScale = 0.78,
} = {}) {
  const sharedPlaneRadius = positiveNumber(planeRadius, 0.7)
  const hitScale = boostActive ? positiveNumber(boostHitboxScale, 0.78) : 1
  return {
    planeRadius: sharedPlaneRadius,
    hitScale,
    effectiveRadius: (positiveNumber(entityRadius) + sharedPlaneRadius * positiveNumber(planeWeight, 1)) * hitScale,
  }
}

export function getNearMissRadius({ entityRadius = 0, planeRadius = 0.7, nearMissBonus = 0, tighten = 1 } = {}) {
  return positiveNumber(entityRadius) + positiveNumber(planeRadius, 0.7) *
    (1.4 + positiveNumber(nearMissBonus)) * positiveNumber(tighten, 1)
}

/** Turbo Fold's readable safety window and exact contract hitbox scale. */
export function getBoostSafety({ boostGraceSeconds = 0, boostHitboxScale = 0.78 } = {}) {
  return {
    graceSeconds: 0.9 + positiveNumber(boostGraceSeconds),
    collisionScale: positiveNumber(boostHitboxScale, 0.78),
  }
}

export function getGuardianState({ charges = 0, remaining = charges } = {}) {
  const initial = Math.floor(positiveNumber(charges))
  const left = clamp(Math.floor(positiveNumber(remaining)), 0, initial)
  return { charges: initial, remaining: left, visible: left > 0 }
}

export function getWeaponState({ weaponLevel = 0, cooldownSeconds = 0, cooldownLeft = 0 } = {}) {
  const unlocked = positiveNumber(weaponLevel) > 0
  const duration = positiveNumber(cooldownSeconds)
  const remaining = unlocked ? clamp(positiveNumber(cooldownLeft), 0, duration) : 0
  return {
    unlocked,
    ready: unlocked && remaining === 0,
    cooldownSeconds: duration,
    cooldownRemaining: remaining,
    cooldownProgress: unlocked && duration > 0 ? clamp(1 - remaining / duration, 0, 1) : 0,
  }
}

export const FEVER_BASE_THRESHOLD = 8
export const FEVER_BASE_DURATION = 4
export const STREAK_BASE_WINDOW = 2.2

/** Fever Focus: an earlier, longer Combo Fever window. Threshold never drops below 4. */
export function getFeverTuning({ feverThresholdBonus = 0, feverDurationBonus = 0 } = {}) {
  return {
    threshold: Math.max(4, FEVER_BASE_THRESHOLD - positiveNumber(feverThresholdBonus)),
    duration: FEVER_BASE_DURATION + positiveNumber(feverDurationBonus),
  }
}

/** Steady Hands: a longer star-streak pickup window before the chain resets. */
export function getStreakTuning({ streakWindowBonus = 0 } = {}) {
  return {
    windowSeconds: STREAK_BASE_WINDOW + positiveNumber(streakWindowBonus),
  }
}

export function getTrailFeedback({ trailLevel = 0, synergyGold = false } = {}) {
  const level = Math.floor(positiveNumber(trailLevel))
  return {
    visible: level > 0,
    opacity: level > 0 ? 0.35 + level * 0.2 : 0,
    size: level > 0 ? 0.16 + level * 0.08 : 0,
    color: synergyGold ? 0x7cf9ff : 0xfff0c0,
  }
}

/**
 * Concise, deterministic runtime contract used by tests and render_game_to_text.
 * The flight loop calls the same small helpers for each live calculation.
 */
export function getUpgradeRuntimeSnapshot({
  effects = {},
  controlMode = 'keyboard',
  dt = 1 / 60,
  distance = 0,
  difficulty = {},
  activePowerKind = null,
  fireCooldown = 0,
  guardianLeft = effects.guardianCharges,
  planeRadius = 0.7,
  nearMissTighten = 1,
  sensitivity = 1,
  twistStarMul = 1,
} = {}) {
  const handling = getControlResponse({ mode: controlMode, dt, accelMul: effects.accelMul, sensitivity })
  const lift = getAltitudeRecovery({ baseSink: difficulty.sink, sinkMul: effects.sinkMul })
  const glide = getCruiseSpeed({
    baseSpeed: difficulty.speedBase,
    speedRamp: difficulty.speedRamp,
    speedCap: difficulty.speedCap,
    distance,
    speedMul: effects.speedMul,
  })
  const luck = getSpawnRates({
    starChance: difficulty.starChance,
    powerChance: difficulty.powerChance,
    ramp: Math.min(1, positiveNumber(distance) / 700),
    starChanceMul: effects.starChanceMul,
    powerChanceMul: effects.powerChanceMul,
    twistStarMul,
    doubleStarBonus: effects.doubleStarBonus,
  })
  const magnet = getMagnetPull({ activePowerKind, magnetBonus: effects.magnetBonus, planeRadius })
  const shield = getPowerDuration({
    kind: 'shield',
    baseDuration: SHIELD_BASE_DURATION,
    shieldDurationMul: effects.shieldDurationMul,
  })
  const collision = getCollisionRadius({ entityRadius: 1.6, planeRadius })
  const nearMissRadius = getNearMissRadius({
    entityRadius: 1.6,
    planeRadius,
    nearMissBonus: effects.nearMissBonus,
    tighten: nearMissTighten,
  })
  const turbo = getBoostSafety(effects)
  const guardian = getGuardianState({ charges: effects.guardianCharges, remaining: guardianLeft })
  const weapon = getWeaponState({
    weaponLevel: effects.weaponLevel,
    cooldownSeconds: effects.weaponCooldown,
    cooldownLeft: fireCooldown,
  })
  const trail = getTrailFeedback(effects)
  const fever = getFeverTuning(effects)
  const streak = getStreakTuning(effects)

  return {
    effects,
    handling,
    lift,
    glide,
    magnet,
    shield,
    luck,
    wingspan: {
      visualScale: positiveNumber(effects.planeScale, 1),
      nearMissRadius,
      collisionPlaneRadius: collision.planeRadius,
    },
    trail,
    turbo,
    guardian,
    weapon,
    fever,
    streak,
  }
}
