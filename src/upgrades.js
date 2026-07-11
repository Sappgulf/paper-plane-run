/**
 * Spendable plane upgrades — paid with wallet stars earned in runs.
 */
const LEVELS_KEY = 'paper-plane-run-upgrades'
const WALLET_KEY = 'paper-plane-run-wallet'
const MIGRATED = 'paper-plane-run-wallet-migrated'

export const UPGRADES = [
  {
    id: 'handling',
    name: 'Fold Handling',
    icon: '🕹️',
    blurb: 'Sharper bank & climb response',
    max: 5,
    costs: [12, 25, 45, 70, 100],
  },
  {
    id: 'lift',
    name: 'Lift Crease',
    icon: '⬆️',
    blurb: 'Less natural sink — easier altitude',
    max: 5,
    costs: [12, 25, 45, 70, 100],
  },
  {
    id: 'glide',
    name: 'Long Glide',
    icon: '🌬️',
    blurb: 'Higher cruise speed & score flow',
    max: 5,
    costs: [15, 30, 55, 85, 120],
  },
  {
    id: 'magnet',
    name: 'Star Magnet',
    icon: '🧲',
    blurb: 'Pull stars from farther away',
    max: 4,
    costs: [20, 40, 70, 110],
  },
  {
    id: 'shield',
    name: 'Tough Fiber',
    icon: '🛡',
    blurb: 'Longer shield power-ups',
    max: 4,
    costs: [18, 35, 60, 95],
  },
  {
    id: 'luck',
    name: 'Lucky Scrap',
    icon: '🍀',
    blurb: 'More stars & power-ups spawn',
    max: 4,
    costs: [20, 40, 75, 115],
  },
  {
    id: 'wingspan',
    name: 'Wide Wings',
    icon: '🕊️',
    blurb: 'Bigger plane, slightly easier near-misses',
    max: 3,
    costs: [25, 50, 90],
  },
  {
    id: 'trail',
    name: 'Paper Trail',
    icon: '✨',
    blurb: 'Sparkle trail + tiny score aura',
    max: 3,
    costs: [15, 35, 65],
  },
]

function loadLevels() {
  try {
    return JSON.parse(localStorage.getItem(LEVELS_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveLevels(obj) {
  localStorage.setItem(LEVELS_KEY, JSON.stringify(obj))
}

export function getUpgradeLevel(id) {
  const lv = loadLevels()[id]
  return Math.max(0, Math.min(99, Number(lv) || 0))
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
 * Runtime multipliers applied in the flight loop.
 */
export function getUpgradeEffects() {
  const h = getUpgradeLevel('handling')
  const lift = getUpgradeLevel('lift')
  const glide = getUpgradeLevel('glide')
  const mag = getUpgradeLevel('magnet')
  const sh = getUpgradeLevel('shield')
  const luck = getUpgradeLevel('luck')
  const wing = getUpgradeLevel('wingspan')
  const trail = getUpgradeLevel('trail')
  return {
    accelMul: 1 + h * 0.08,
    sinkMul: Math.max(0.55, 1 - lift * 0.08),
    speedMul: 1 + glide * 0.04,
    scoreMul: 1 + glide * 0.03 + trail * 0.02,
    magnetBonus: mag * 0.55,
    shieldDurationMul: 1 + sh * 0.2,
    starChanceMul: 1 + luck * 0.12,
    powerChanceMul: 1 + luck * 0.1,
    planeScale: 1.2 + wing * 0.08,
    nearMissBonus: wing * 0.15,
    trailLevel: trail,
    handlingLevel: h,
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
