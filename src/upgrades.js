/**
 * Spendable plane upgrades — paid with wallet stars earned in runs.
 */
import { FUTURE_PRICE_TABLE } from './game/economy.js'
import { getWeaponTuning } from './game/weapon-runtime.js'
import { safeSetItem } from './game/safe-storage.js'

const LEVELS_KEY = 'paper-plane-run-upgrades'
const WALLET_KEY = 'paper-plane-run-wallet'
const MIGRATED = 'paper-plane-run-wallet-migrated'

function parseStarCount(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0
}

export const UPGRADES = [
  {
    id: 'handling',
    name: 'Fold Handling',
    icon: '🕹️',
    blurb: 'Roll into each bank faster — sharper control & wingtip contrail flex',
    max: 5,
    costs: FUTURE_PRICE_TABLE.upgrades.handling,
  },
  {
    id: 'lift',
    name: 'Lift Crease',
    icon: '⬆️',
    blurb: 'Less natural sink — easier altitude, visibly gentler contrail fade',
    max: 5,
    costs: FUTURE_PRICE_TABLE.upgrades.lift,
  },
  {
    id: 'glide',
    name: 'Long Glide',
    icon: '🌬️',
    blurb: 'Higher cruise speed & score flow — visibly longer contrail',
    max: 5,
    costs: FUTURE_PRICE_TABLE.upgrades.glide,
  },
  {
    id: 'magnet',
    name: 'Star Magnet',
    icon: '🧲',
    blurb: 'A violet halo pulls stars from farther away',
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
    blurb: 'Larger paper plane — easier near-misses · Synergy: max with Paper Trail → gold trail',
    max: 3,
    costs: FUTURE_PRICE_TABLE.upgrades.wingspan,
  },
  {
    id: 'trail',
    name: 'Paper Trail',
    icon: '✨',
    blurb: 'A sparkle wake streams behind the plane · Synergy: max with Wide Wings → gold trail',
    max: 3,
    costs: FUTURE_PRICE_TABLE.upgrades.trail,
  },
  {
    id: 'turbo',
    name: 'Turbo Fold',
    icon: '🚀',
    blurb: 'Boosts last longer and shrink your hitbox',
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
    blurb: 'Wing pods auto-fire paper darts at the nearest hazard ahead — pops pay +1★',
    max: 4,
    costs: FUTURE_PRICE_TABLE.upgrades.weapon,
  },
  {
    id: 'salvo',
    name: 'Wing Salvo',
    icon: '🪶',
    blurb: 'Extra darts per volley and a wider forward cone · Requires Ink Blast Lv1',
    max: 2,
    costs: FUTURE_PRICE_TABLE.upgrades.salvo,
    requires: { id: 'weapon', level: 1 },
  },
  {
    id: 'pierce',
    name: 'Ink Piercer',
    icon: '🎯',
    blurb: 'Darts punch through extra targets and hit armored flyers harder · Requires Ink Blast Lv2',
    max: 2,
    costs: FUTURE_PRICE_TABLE.upgrades.pierce,
    requires: { id: 'weapon', level: 2 },
  },
  {
    id: 'flare',
    name: 'Deep Flare',
    icon: '🪁',
    blurb: 'Charge the Tuck faster and cash a bigger flare out of it',
    max: 4,
    costs: FUTURE_PRICE_TABLE.upgrades.flare,
  },
  {
    id: 'fever',
    name: 'Fever Focus',
    icon: '🔥',
    blurb: 'Trigger Combo Fever sooner and hold it longer · Synergy: max with Steady Hands → +0.35s fever',
    max: 3,
    costs: FUTURE_PRICE_TABLE.upgrades.fever,
  },
  {
    id: 'streak',
    name: 'Steady Hands',
    icon: '⏳',
    blurb: 'Longer window to keep a star streak alive · Synergy: max with Fever Focus → +0.35s fever',
    max: 3,
    costs: FUTURE_PRICE_TABLE.upgrades.streak,
  },
  {
    id: 'wealth',
    name: 'Gold Rush',
    icon: '💰',
    blurb: 'More star clusters spawn along the route — Gold Rush 3-star cluster is gold-tinted (stacks with Lucky Scrap)',
    max: 3,
    costs: FUTURE_PRICE_TABLE.upgrades.wealth,
  },
  {
    id: 'gust',
    name: 'Gust Guard',
    icon: '💨',
    blurb: 'Wind gusts push you 15% less per level',
    max: 3,
    costs: FUTURE_PRICE_TABLE.upgrades.gust,
  },
  {
    id: 'thermal',
    name: 'Thermal Sense',
    icon: '🌡️',
    blurb: 'Updrafts lift 12% harder per level',
    max: 3,
    costs: FUTURE_PRICE_TABLE.upgrades.thermal,
  },
  {
    id: 'reader',
    name: 'Gust Reader',
    icon: '🔭',
    blurb: 'Gust warnings stay up longer, so you can read the side before the push',
    max: 3,
    costs: FUTURE_PRICE_TABLE.upgrades.reader,
  },
  {
    id: 'bounty',
    name: 'Formation Bounty',
    icon: '🏅',
    blurb: 'Clearing a hazard formation pays extra stars',
    max: 3,
    costs: FUTURE_PRICE_TABLE.upgrades.bounty,
  },
  {
    id: 'lens',
    name: 'Fog Lens',
    icon: '🔦',
    blurb: 'Thick fog draws back 12% farther per level, so hidden hazards read sooner',
    max: 3,
    costs: FUTURE_PRICE_TABLE.upgrades.lens,
  },
  {
    id: 'purse',
    name: 'Skim Purse',
    icon: '👝',
    blurb: 'Each skim tier-up banks one extra star per level',
    max: 3,
    costs: FUTURE_PRICE_TABLE.upgrades.purse,
  },
  {
    id: 'mail',
    name: 'Fan Mail',
    icon: '📮',
    blurb: 'Every near miss pays +1m extra per level — the crowd loves a close call',
    max: 3,
    costs: FUTURE_PRICE_TABLE.upgrades.mail,
  },
  {
    id: 'patient',
    name: 'Patient Fold',
    icon: '🧘',
    blurb: 'A near-miss chain holds open +0.25s longer per level',
    max: 3,
    costs: FUTURE_PRICE_TABLE.upgrades.patient,
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
  // The Tuck is the run's one deep move, so the tree's fourth-tier slot buys
  // into it rather than into a second, unrelated verb. Charge rate and payout
  // scale together: a shorter hold for the same flare, which is a real change
  // in how close to the ground you are willing to take it.
  weapon(level) {
    const tuning = getWeaponTuning({ level })
    const label = level === 0
      ? 'Ink Blast locked'
      : `Auto-fire ${tuning.cooldownSeconds.toFixed(2)}s · ${tuning.range}m range`
    return effect(label, {
      cooldownSeconds: roundedEffectValue(tuning.cooldownSeconds),
      range: tuning.range,
    }, {
      weaponLevel: tuning.level,
    })
  },
  salvo(level) {
    const darts = 1 + level
    return effect(`Darts per volley ${darts}`, { darts }, {
      weaponSalvo: level,
    })
  },
  pierce(level) {
    return effect(`Pierce ${level} target${level === 1 ? '' : 's'} · damage +${Math.floor(level / 2)}`, { pierce: level }, {
      weaponPierce: level,
    })
  },
  flare(level) {
    const chargeRate = roundedEffectValue(1 + level * 0.16)
    const payoutMul = roundedEffectValue(1 + level * 0.18)
    const label = level === 0
      ? 'Flare pays base'
      : `Charge ${chargeRate.toFixed(2)}x · flare ${payoutMul.toFixed(2)}x`
    return effect(label, { chargeRate, payoutMul }, {
      flareChargeRate: chargeRate,
      flarePayoutMul: payoutMul,
    })
  },
  fever(level) {
    const thresholdReduction = level
    const durationBonusSeconds = roundedEffectValue(level * 0.75)
    const threshold = Math.max(4, 8 - thresholdReduction)
    const durationSeconds = roundedEffectValue(4 + durationBonusSeconds)
    return effect(
      `Fever at ${threshold} near-misses · ${durationSeconds.toFixed(2)}s`,
      { thresholdReduction, durationBonusSeconds, threshold, durationSeconds },
      {
        feverThresholdBonus: thresholdReduction,
        feverDurationBonus: durationBonusSeconds,
      },
    )
  },
  streak(level) {
    const windowBonusSeconds = roundedEffectValue(level * 0.4)
    const windowSeconds = roundedEffectValue(2.2 + windowBonusSeconds)
    return effect(`Star streak window ${windowSeconds.toFixed(2)}s`, { windowBonusSeconds, windowSeconds }, {
      streakWindowBonus: windowBonusSeconds,
    })
  },
  wealth(level) {
    const doubleStarPercent = level * 8
    return effect(
      `Cluster chance +${doubleStarPercent}% (stacks with Lucky Scrap)`,
      { doubleStarPercent },
      {
        doubleStarBonus: doubleStarPercent / 100,
      },
    )
  },
  gust(level) {
    const pushReductionPercent = level * 15
    const label = level === 0
      ? 'Gusts push at full strength'
      : `Gust push -${pushReductionPercent}%`
    return effect(label, { pushReductionPercent }, {
      windPushMul: Math.max(0.55, 1 - pushReductionPercent / 100),
    })
  },
  thermal(level) {
    const liftPercent = level * 12
    const label = level === 0
      ? 'Updrafts lift at base strength'
      : `Updraft lift +${liftPercent}%`
    return effect(label, { liftPercent }, {
      updraftStrengthMul: 1 + liftPercent / 100,
    })
  },
  reader(level) {
    const warningBonusSeconds = roundedEffectValue(level * 0.3)
    const label = level === 0
      ? 'Gust warnings at base length'
      : `Gust warning +${warningBonusSeconds.toFixed(2)}s`
    return effect(label, { warningBonusSeconds }, {
      windWarningBonus: warningBonusSeconds,
    })
  },
  bounty(level) {
    const starBonus = level * 2
    const label = level === 0
      ? 'Formation clears pay base stars'
      : `Formation clears +${starBonus}★`
    return effect(label, { starBonus }, {
      gateStarBonus: starBonus,
    })
  },
  lens(level) {
    const drawPercent = level * 12
    const label = level === 0
      ? 'Fog draws at base distance'
      : `Fog draw +${drawPercent}%`
    return effect(label, { drawPercent }, {
      fogDistanceMul: 1 + drawPercent / 100,
    })
  },
  purse(level) {
    const tierStars = level
    const label = level === 0
      ? 'Skim tiers pay base stars'
      : `Skim tiers +${tierStars}★`
    return effect(label, { tierStars }, {
      skimTierStarBonus: tierStars,
    })
  },
  mail(level) {
    const nearMissMeters = level
    const label = level === 0
      ? 'Near misses pay base meters'
      : `Near misses +${nearMissMeters}m`
    return effect(label, { nearMissMeters }, {
      nearMissPayBonus: nearMissMeters,
    })
  },
  patient(level) {
    const holdBonusSeconds = roundedEffectValue(level * 0.25)
    const label = level === 0
      ? 'Combo holds at base length'
      : `Combo hold +${holdBonusSeconds.toFixed(2)}s`
    return effect(label, { holdBonusSeconds }, {
      comboHoldBonus: holdBonusSeconds,
    })
  },
}

function getUpgradeFormula(id, level) {
  const upgrade = findUpgrade(id)
  if (!upgrade) return null
  return UPGRADE_FORMULAS[id](normalizeUpgradeLevel(id, level))
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
  safeSetItem(LEVELS_KEY, JSON.stringify(obj))
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
  return parseStarCount(localStorage.getItem(WALLET_KEY))
}

export function addWallet(n) {
  migrateWalletOnce()
  const v = getWallet() + parseStarCount(n)
  safeSetItem(WALLET_KEY, String(v))
  return v
}

export function spendWallet(n) {
  const cost = parseStarCount(n)
  const w = getWallet()
  if (w < cost) return false
  safeSetItem(WALLET_KEY, String(w - cost))
  return true
}

/** One-time: seed wallet from a fraction of lifetime stars for existing players */
function migrateWalletOnce() {
  if (localStorage.getItem(MIGRATED) === '1') return
  const lifetime = parseStarCount(localStorage.getItem('paper-plane-run-lifetime-stars'))
  const existing = localStorage.getItem(WALLET_KEY)
  if (existing == null && lifetime > 0) {
    safeSetItem(WALLET_KEY, String(Math.floor(lifetime * 0.5)))
  } else if (existing == null) {
    safeSetItem(WALLET_KEY, '0')
  }
  safeSetItem(MIGRATED, '1')
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
  if (u.requires && getUpgradeLevel(u.requires.id) < u.requires.level) {
    return { ok: false, reason: 'requires', requires: u.requires }
  }
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
  const salvo = formulas.salvo
  const pierce = formulas.pierce
  const weaponTuning = getWeaponTuning({
    level: getUpgradeLevel('weapon'),
    salvo: getUpgradeLevel('salvo'),
    pierce: getUpgradeLevel('pierce'),
  })
  const flare = formulas.flare
  const fever = formulas.fever
  const streak = formulas.streak
  const wealth = formulas.wealth
  const gust = formulas.gust
  const thermal = formulas.thermal
  const reader = formulas.reader
  const bounty = formulas.bounty
  const lens = formulas.lens
  const purse = formulas.purse
  const mail = formulas.mail
  const patient = formulas.patient
  const synergyGold = ['wingspan', 'trail'].every((id) => getUpgradeLevel(id) >= findUpgrade(id).max)
  const synergyFever = ['fever', 'streak'].every((id) => getUpgradeLevel(id) >= findUpgrade(id).max)
  return {
    ...handling.runtime,
    ...lift.runtime,
    ...glide.runtime,
    scoreMul: 1 + glide.values.scorePercent / 100 + trail.values.scoreAuraPercent / 100,
    ...magnet.runtime,
    ...shield.runtime,
    ...luck.runtime,
    starChanceMul: luck.runtime.starChanceMul,
    ...wingspan.runtime,
    ...trail.runtime,
    ...turbo.runtime,
    ...guardian.runtime,
    ...weapon.runtime,
    ...salvo.runtime,
    ...pierce.runtime,
    weaponLevel: weaponTuning.level,
    weaponCooldown: weaponTuning.cooldownSeconds,
    weaponRange: weaponTuning.range,
    weaponDarts: weaponTuning.darts,
    weaponPierce: weaponTuning.pierce,
    weaponPierceCount: weaponTuning.pierceCount,
    weaponDamage: weaponTuning.damage,
    weaponShotSpeed: weaponTuning.shotSpeed,
    weaponMinRange: weaponTuning.minRange,
    weaponMaxLateral: weaponTuning.maxLateral,
    weaponMaxVertical: weaponTuning.maxVertical,
    weaponHoming: weaponTuning.homing,
    ...flare.runtime,
    ...fever.runtime,
    ...streak.runtime,
    ...wealth.runtime,
    ...gust.runtime,
    ...thermal.runtime,
    ...reader.runtime,
    ...bounty.runtime,
    ...lens.runtime,
    ...purse.runtime,
    ...mail.runtime,
    ...patient.runtime,
    synergyGold,
    synergyFever,
    // Max fever + streak: a tiny extra fever duration (feel, not a new system).
    feverDurationBonus: fever.runtime.feverDurationBonus + (synergyFever ? 0.35 : 0),
  }
}

export function listUpgrades() {
  const wallet = getWallet()
  return UPGRADES.map((u) => {
    const level = getUpgradeLevel(u.id)
    const cost = level >= u.max ? null : u.costs[level]
    const requiresName = u.requires ? (findUpgrade(u.requires.id)?.name || u.requires.id) : null
    const requirementMet = !u.requires || getUpgradeLevel(u.requires.id) >= u.requires.level
    return {
      ...u,
      level,
      cost,
      maxed: level >= u.max,
      requirementMet,
      requiresName,
      canAfford: requirementMet && cost != null && wallet >= cost,
      wallet,
    }
  })
}
