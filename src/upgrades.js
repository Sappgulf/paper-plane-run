/**
 * Spendable plane upgrades — paid with wallet stars earned in runs.
 */
import { FUTURE_PRICE_TABLE } from './game/economy.js'

const LEVELS_KEY = 'paper-plane-run-upgrades'
const WALLET_KEY = 'paper-plane-run-wallet'
const MIGRATED = 'paper-plane-run-wallet-migrated'
const PRESTIGE_KEY = 'paper-plane-run-prestige'
const PRESTIGE_MAX = 50

export const UPGRADES = [
  {
    id: 'handling',
    name: 'Fold Handling',
    icon: '🕹️',
    blurb: 'Sharper bank & climb response',
    max: 5,
    costs: FUTURE_PRICE_TABLE.upgrades.handling,
  },
  {
    id: 'lift',
    name: 'Lift Crease',
    icon: '⬆️',
    blurb: 'Less natural sink — easier altitude',
    max: 5,
    costs: FUTURE_PRICE_TABLE.upgrades.lift,
  },
  {
    id: 'glide',
    name: 'Long Glide',
    icon: '🌬️',
    blurb: 'Higher cruise speed & score flow',
    max: 5,
    costs: FUTURE_PRICE_TABLE.upgrades.glide,
  },
  {
    id: 'magnet',
    name: 'Star Magnet',
    icon: '🧲',
    blurb: 'Pull stars from farther away',
    max: 4,
    costs: FUTURE_PRICE_TABLE.upgrades.magnet,
  },
  {
    id: 'shield',
    name: 'Tough Fiber',
    icon: '🛡',
    blurb: 'Longer shield power-ups',
    max: 4,
    costs: FUTURE_PRICE_TABLE.upgrades.shield,
  },
  {
    id: 'luck',
    name: 'Lucky Scrap',
    icon: '🍀',
    blurb: 'More stars & power-ups spawn',
    max: 4,
    costs: FUTURE_PRICE_TABLE.upgrades.luck,
  },
  {
    id: 'wingspan',
    name: 'Wide Wings',
    icon: '🕊️',
    blurb: 'Bigger plane, slightly easier near-misses',
    max: 3,
    costs: FUTURE_PRICE_TABLE.upgrades.wingspan,
  },
  {
    id: 'trail',
    name: 'Paper Trail',
    icon: '✨',
    blurb: 'Sparkle trail + tiny score aura',
    max: 3,
    costs: FUTURE_PRICE_TABLE.upgrades.trail,
  },
  {
    id: 'turbo',
    name: 'Turbo Fold',
    icon: '🚀',
    blurb: 'Smoother, safer speed boosts',
    max: 3,
    costs: FUTURE_PRICE_TABLE.upgrades.turbo,
  },
  {
    id: 'guardian',
    name: 'Guardian Crease',
    icon: '🛟',
    blurb: 'Auto-save from a crash once per run',
    max: 2,
    costs: FUTURE_PRICE_TABLE.upgrades.guardian,
  },
  {
    id: 'weapon',
    name: 'Ink Blast',
    icon: '🖋️',
    blurb: 'Fire ink blots to pop birds & scissors for bonus stars',
    max: 4,
    costs: FUTURE_PRICE_TABLE.upgrades.weapon,
  },
  {
    id: 'fever',
    name: 'Fever Focus',
    icon: '🔥',
    blurb: 'Trigger Combo Fever sooner and hold it longer',
    max: 3,
    costs: FUTURE_PRICE_TABLE.upgrades.fever,
  },
  {
    id: 'streak',
    name: 'Steady Hands',
    icon: '⏳',
    blurb: 'Longer window to keep a star streak alive',
    max: 3,
    costs: FUTURE_PRICE_TABLE.upgrades.streak,
  },
  {
    id: 'wealth',
    name: 'Gold Rush',
    icon: '💰',
    blurb: 'More star clusters spawn along the route',
    max: 3,
    costs: FUTURE_PRICE_TABLE.upgrades.wealth,
  },
]

function findUpgrade(id) {
  return UPGRADES.find((upgrade) => upgrade.id === id) || null
}

function normalizeUpgradeLevel(id, level) {
  const upgrade = findUpgrade(id)
  if (!upgrade) return 0
  const value = Number(level)
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(upgrade.max, Math.floor(value)))
}

function effect(label, values, runtime) {
  return { label, values, runtime }
}

function formatScale(value) {
  return `${value.toFixed(2)}×`
}

function roundedEffectValue(value) {
  return Number(value.toFixed(2))
}

const UPGRADE_FORMULAS = {
  handling(level) {
    const responsePercent = level * 8
    return effect(`Control response +${responsePercent}%`, { responsePercent }, {
      accelMul: 1 + responsePercent / 100,
      handlingLevel: level,
    })
  },
  lift(level) {
    const sinkReductionPercent = level * 8
    return effect(`Sink rate -${sinkReductionPercent}%`, { sinkReductionPercent }, {
      sinkMul: Math.max(0.55, 1 - sinkReductionPercent / 100),
    })
  },
  glide(level) {
    const speedPercent = level * 4
    const scorePercent = level * 3
    return effect(`Cruise speed +${speedPercent}% · score +${scorePercent}%`, { speedPercent, scorePercent }, {
      speedMul: 1 + speedPercent / 100,
    })
  },
  magnet(level) {
    const pullPercent = level * 55
    return effect(`Star pull +${pullPercent}%`, { pullPercent }, {
      magnetBonus: pullPercent / 100,
    })
  },
  shield(level) {
    const durationPercent = level * 20
    return effect(`Shield duration +${durationPercent}%`, { durationPercent }, {
      shieldDurationMul: 1 + durationPercent / 100,
    })
  },
  luck(level) {
    const starSpawnPercent = level * 12
    const powerSpawnPercent = level * 10
    return effect(`Star spawns +${starSpawnPercent}% · power-ups +${powerSpawnPercent}%`, { starSpawnPercent, powerSpawnPercent }, {
      starChanceMul: 1 + starSpawnPercent / 100,
      powerChanceMul: 1 + powerSpawnPercent / 100,
    })
  },
  wingspan(level) {
    const planeScale = roundedEffectValue(1.2 + level * 0.08)
    const nearMissWindow = roundedEffectValue(1.4 + level * 0.15)
    return effect(`Plane scale ${formatScale(planeScale)} · near-miss window ${formatScale(nearMissWindow)}`, { planeScale, nearMissWindow }, {
      planeScale,
      nearMissBonus: nearMissWindow - 1.4,
    })
  },
  trail(level) {
    const scoreAuraPercent = level * 2
    return effect(`Score aura +${scoreAuraPercent}%`, { scoreAuraPercent }, {
      trailLevel: level,
    })
  },
  turbo(level) {
    const boostGraceSeconds = roundedEffectValue(level * 0.15)
    const boostHitboxScale = roundedEffectValue(Math.max(0.6, 0.78 - level * 0.06))
    return effect(`Boost grace +${boostGraceSeconds.toFixed(2)}s · hitbox ${formatScale(boostHitboxScale)}`, { boostGraceSeconds, boostHitboxScale }, {
      boostSafety: level,
      boostGraceSeconds,
      boostHitboxScale,
    })
  },
  guardian(level) {
    const charges = level
    return effect(`Crash saves ${charges} per run`, { charges }, {
      guardianCharges: charges,
    })
  },
  weapon(level) {
    const cooldownSeconds = roundedEffectValue(Math.max(0.35, 1.1 - level * 0.18))
    const label = level === 0 ? 'Ink Blast locked' : `Ink cooldown ${cooldownSeconds.toFixed(2)}s`
    return effect(label, { cooldownSeconds }, {
      weaponLevel: level,
      weaponCooldown: cooldownSeconds,
    })
  },
  fever(level) {
    const thresholdReduction = level
    const durationBonusSeconds = roundedEffectValue(level * 0.75)
    return effect(
      `Fever trigger -${thresholdReduction} combo · duration +${durationBonusSeconds.toFixed(2)}s`,
      { thresholdReduction, durationBonusSeconds },
      {
        feverThresholdBonus: thresholdReduction,
        feverDurationBonus: durationBonusSeconds,
      },
    )
  },
  streak(level) {
    const windowBonusSeconds = roundedEffectValue(level * 0.4)
    return effect(`Star streak window +${windowBonusSeconds.toFixed(2)}s`, { windowBonusSeconds }, {
      streakWindowBonus: windowBonusSeconds,
    })
  },
  wealth(level) {
    const doubleStarPercent = level * 8
    return effect(`Star cluster odds +${doubleStarPercent}%`, { doubleStarPercent }, {
      doubleStarBonus: doubleStarPercent / 100,
    })
  },
}

function getUpgradeFormula(id, level) {
  const upgrade = findUpgrade(id)
  if (!upgrade) return null
  return UPGRADE_FORMULAS[id](normalizeUpgradeLevel(id, level))
}

function getPrestigeFormula(level) {
  const bonusPercent = level * 3
  return { bonusPercent, multiplier: 1 + bonusPercent / 100 }
}

function normalizePrestigeLevel(level) {
  const value = Number(level)
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(PRESTIGE_MAX, Math.floor(value)))
}

function loadLevels() {
  try {
    const levels = JSON.parse(localStorage.getItem(LEVELS_KEY) || '{}')
    return levels && typeof levels === 'object' && !Array.isArray(levels) ? levels : {}
  } catch {
    return {}
  }
}

function saveLevels(obj) {
  localStorage.setItem(LEVELS_KEY, JSON.stringify(obj))
}

export function getUpgradeLevel(id) {
  return normalizeUpgradeLevel(id, loadLevels()[id])
}

export function getAllUpgradeLevels() {
  const out = {}
  for (const u of UPGRADES) out[u.id] = getUpgradeLevel(u.id)
  return out
}

export function getWallet() {
  migrateWalletOnce()
  return Math.max(0, Number(localStorage.getItem(WALLET_KEY) || 0))
}

export function addWallet(n) {
  migrateWalletOnce()
  const v = getWallet() + Math.max(0, Math.floor(n))
  localStorage.setItem(WALLET_KEY, String(v))
  return v
}

export function spendWallet(n) {
  const cost = Math.max(0, Math.floor(n))
  const w = getWallet()
  if (w < cost) return false
  localStorage.setItem(WALLET_KEY, String(w - cost))
  return true
}

/** One-time: seed wallet from a fraction of lifetime stars for existing players */
function migrateWalletOnce() {
  if (localStorage.getItem(MIGRATED) === '1') return
  const lifetime = Number(localStorage.getItem('paper-plane-run-lifetime-stars') || 0)
  const existing = localStorage.getItem(WALLET_KEY)
  if (existing == null && lifetime > 0) {
    localStorage.setItem(WALLET_KEY, String(Math.floor(lifetime * 0.5)))
  } else if (existing == null) {
    localStorage.setItem(WALLET_KEY, '0')
  }
  localStorage.setItem(MIGRATED, '1')
}

/** Prestige: once every upgrade is maxed, reset the tree for a permanent global bonus. */
export function getPrestigeLevel() {
  return normalizePrestigeLevel(localStorage.getItem(PRESTIGE_KEY) || 0)
}

export function getPrestigeBonusPercent(level = getPrestigeLevel()) {
  return getPrestigeFormula(normalizePrestigeLevel(level)).bonusPercent
}

function getPrestigeState() {
  const level = getPrestigeLevel()
  const capped = level >= PRESTIGE_MAX
  const upgradesMaxed = UPGRADES.every((upgrade) => getUpgradeLevel(upgrade.id) >= upgrade.max)
  return {
    level,
    capped,
    ready: !capped && upgradesMaxed,
  }
}

export function canPrestige() {
  return getPrestigeState().ready
}

export function doPrestige() {
  const state = getPrestigeState()
  if (state.capped) return { ok: false, reason: 'max-prestige', level: state.level }
  if (!state.ready) return { ok: false, reason: 'not-maxed' }
  const level = state.level + 1
  localStorage.setItem(PRESTIGE_KEY, String(level))
  saveLevels({})
  return { ok: true, level }
}

export function nextCost(id) {
  const u = UPGRADES.find((x) => x.id === id)
  if (!u) return null
  const lv = getUpgradeLevel(id)
  if (lv >= u.max) return null
  return u.costs[lv]
}

export function buyUpgrade(id) {
  const u = UPGRADES.find((x) => x.id === id)
  if (!u) return { ok: false, reason: 'missing' }
  const lv = getUpgradeLevel(id)
  if (lv >= u.max) return { ok: false, reason: 'max' }
  const cost = u.costs[lv]
  if (!spendWallet(cost)) return { ok: false, reason: 'poor', need: cost - getWallet() }
  const levels = loadLevels()
  levels[id] = lv + 1
  saveLevels(levels)
  return { ok: true, level: lv + 1, cost }
}

/**
 * Exact, player-facing current and next effect contract for one upgrade level.
 */
export function describeUpgradeEffect(id, level) {
  const upgrade = findUpgrade(id)
  if (!upgrade) return null
  const currentLevel = normalizeUpgradeLevel(id, level)
  const current = getUpgradeFormula(id, currentLevel)
  const next = currentLevel >= upgrade.max ? null : getUpgradeFormula(id, currentLevel + 1)
  return {
    id,
    level: currentLevel,
    max: upgrade.max,
    maxed: currentLevel >= upgrade.max,
    current: { label: current.label, values: current.values },
    next: next && { label: next.label, values: next.values },
  }
}

/**
 * Runtime multipliers applied in the flight loop.
 */
export function getUpgradeEffects() {
  const formulas = Object.fromEntries(UPGRADES.map((upgrade) => [
    upgrade.id,
    getUpgradeFormula(upgrade.id, getUpgradeLevel(upgrade.id)),
  ]))
  const prestigeLevel = getPrestigeLevel()
  const prestige = getPrestigeFormula(prestigeLevel)
  const handling = formulas.handling
  const lift = formulas.lift
  const glide = formulas.glide
  const magnet = formulas.magnet
  const shield = formulas.shield
  const luck = formulas.luck
  const wingspan = formulas.wingspan
  const trail = formulas.trail
  const turbo = formulas.turbo
  const guardian = formulas.guardian
  const weapon = formulas.weapon
  const fever = formulas.fever
  const streak = formulas.streak
  const wealth = formulas.wealth
  const synergyGold = ['wingspan', 'trail'].every((id) => getUpgradeLevel(id) >= findUpgrade(id).max)
  return {
    ...handling.runtime,
    ...lift.runtime,
    ...glide.runtime,
    scoreMul: (1 + glide.values.scorePercent / 100 + trail.values.scoreAuraPercent / 100) * prestige.multiplier,
    ...magnet.runtime,
    ...shield.runtime,
    ...luck.runtime,
    starChanceMul: luck.runtime.starChanceMul * prestige.multiplier,
    ...wingspan.runtime,
    ...trail.runtime,
    ...turbo.runtime,
    ...guardian.runtime,
    ...weapon.runtime,
    ...fever.runtime,
    ...streak.runtime,
    ...wealth.runtime,
    prestigeLevel,
    prestigeBonusPercent: prestige.bonusPercent,
    synergyGold,
  }
}

export function listUpgrades() {
  const wallet = getWallet()
  return UPGRADES.map((u) => {
    const level = getUpgradeLevel(u.id)
    const cost = level >= u.max ? null : u.costs[level]
    return {
      ...u,
      level,
      cost,
      maxed: level >= u.max,
      canAfford: cost != null && wallet >= cost,
      wallet,
    }
  })
}
