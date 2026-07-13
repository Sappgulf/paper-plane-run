import { getPrestigeLevel, getWallet, spendWallet } from './upgrades.js'

const KEY = 'paper-plane-run-skins'
const EQUIP = 'paper-plane-run-skin'
const STARS_KEY = 'paper-plane-run-lifetime-stars'
const SCHEMA_VERSION_KEY = 'paper-plane-run-skins-version'
const SCHEMA_VERSION = '1'

export const SKINS = [
  {
    id: 'classic',
    name: 'Classic Cream',
    cost: 0,
    body: 0xfff6ec,
    accent: 0xf0956a,
    map: '/assets/paper.jpg',
  },
  {
    id: 'mint',
    name: 'Mint Fold',
    cost: 25,
    body: 0xd8f5e8,
    accent: 0x34d399,
    map: '/assets/skin-mint.jpg',
  },
  {
    id: 'coral',
    name: 'Coral Wash',
    cost: 50,
    body: 0xffe0d4,
    accent: 0xf97316,
    map: '/assets/skin-coral.jpg',
  },
  {
    id: 'night',
    name: 'Night Washi',
    cost: 80,
    body: 0x2a3350,
    accent: 0xfbbf24,
    map: '/assets/skin-night.jpg',
  },
  {
    id: 'gold',
    name: 'Gold Foil',
    cost: 120,
    body: 0xfff3c4,
    accent: 0xd97706,
    map: '/assets/skin-gold.jpg',
  },
  {
    id: 'neon',
    name: 'Neon Crease',
    cost: 160,
    body: 0x1e3a5f,
    accent: 0x38bdf8,
    map: '/assets/skin-neon.jpg',
  },
  {
    id: 'rainbow',
    name: 'Rainbow Scrap',
    cost: 200,
    body: 0xfff7ed,
    accent: 0xa855f7,
    map: '/assets/skin-rainbow.jpg',
  },
  {
    id: 'stormfoil',
    name: 'Storm Foil',
    cost: 150,
    body: 0x4b5563,
    accent: 0xa78bfa,
    map: '/assets/skin-night.jpg',
  },
  {
    id: 'sunset',
    name: 'Sunset Letter',
    cost: 140,
    body: 0xffedd5,
    accent: 0xea580c,
    map: '/assets/skin-coral.jpg',
  },
  {
    id: 'halloween',
    name: 'Jack-o-Plane',
    cost: 999,
    seasonal: 'halloween',
    body: 0x1a1a1a,
    accent: 0xff6b00,
    map: '/assets/skin-night.jpg',
  },
  {
    id: 'winter',
    name: 'Frost Fold',
    cost: 999,
    seasonal: 'winter',
    body: 0xe0f2fe,
    accent: 0x38bdf8,
    map: '/assets/skin-mint.jpg',
  },
  {
    id: 'valentine',
    name: 'Love Letter',
    cost: 999,
    seasonal: 'valentine',
    body: 0xffe4e6,
    accent: 0xe11d48,
    map: '/assets/skin-coral.jpg',
  },
  {
    id: 'spring',
    name: 'Blossom Sheet',
    cost: 999,
    seasonal: 'spring',
    body: 0xfce7f3,
    accent: 0x65a30d,
    map: '/assets/skin-mint.jpg',
  },
  {
    id: 'goldenfold',
    name: 'Golden Fold',
    cost: 0,
    prestigeReq: 1,
    body: 0xfff3c4,
    accent: 0x7c3aed,
    map: '/assets/skin-gold.jpg',
  },
]

function loadLegacyOwnership() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '["classic"]')
    return { owned: new Set(Array.isArray(saved) ? saved : ['classic']), needsRepair: !Array.isArray(saved) }
  } catch {
    return { owned: new Set(['classic']), needsRepair: true }
  }
}

function saveOwnership(set) {
  localStorage.setItem(KEY, JSON.stringify([...set]))
}

function loadOwnership() {
  const { owned, needsRepair } = loadLegacyOwnership()
  let changed = needsRepair

  if (!owned.has('classic')) {
    owned.add('classic')
    changed = true
  }

  const equipped = getEquippedSkinId()
  if (!owned.has(equipped)) {
    owned.add(equipped)
    changed = true
  }

  if (changed) saveOwnership(owned)
  if (localStorage.getItem(SCHEMA_VERSION_KEY) !== SCHEMA_VERSION) {
    localStorage.setItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION)
  }
  return owned
}

export function getLifetimeStars() {
  return Number(localStorage.getItem(STARS_KEY) || 0)
}

export function addLifetimeStars(n) {
  const v = getLifetimeStars() + n
  localStorage.setItem(STARS_KEY, String(v))
  return v
}

export function getEquippedSkinId() {
  const equipped = localStorage.getItem(EQUIP)
  return SKINS.some((skin) => skin.id === equipped) ? equipped : 'classic'
}

export function equipSkin(id) {
  const owned = loadOwnership()
  if (!owned.has(id)) return false
  localStorage.setItem(EQUIP, id)
  return true
}

function getRequirement(skin) {
  if (skin.seasonal) return { type: 'season', value: skin.seasonal }
  if (skin.prestigeReq != null) return { type: 'prestige', value: skin.prestigeReq }
  return { type: 'lifetime-stars', value: skin.cost }
}

function getPrice(skin) {
  if (skin.seasonal || skin.prestigeReq != null) return null
  return { currency: 'wallet-stars', value: skin.cost }
}

function availabilityMet(skin, seasonId) {
  if (skin.seasonal) return skin.seasonal === seasonId
  if (skin.prestigeReq != null) return prestigeMet(skin)
  return getLifetimeStars() >= skin.cost
}

/** Buy a lifetime-available plane using spendable wallet stars. */
export function purchasePlane(id) {
  const skin = SKINS.find((s) => s.id === id)
  if (!skin) return { ok: false, reason: 'missing' }

  const owned = loadOwnership()
  if (owned.has(id)) return { ok: true, already: true }
  if (skin.seasonal || skin.prestigeReq != null) return { ok: false, reason: 'claim-required' }
  if (!availabilityMet(skin)) return { ok: false, reason: 'locked' }
  if (!spendWallet(skin.cost)) return { ok: false, reason: 'poor', need: skin.cost - getWallet() }

  owned.add(id)
  saveOwnership(owned)
  return { ok: true, cost: skin.cost }
}

/** Claim a free seasonal or prestige plane once its availability requirement is met. */
export function claimPlane(id, seasonId = 'default') {
  const skin = SKINS.find((s) => s.id === id)
  if (!skin) return { ok: false, reason: 'missing' }

  const owned = loadOwnership()
  if (owned.has(id)) return { ok: true, already: true }
  if (!skin.seasonal && skin.prestigeReq == null) return { ok: false, reason: 'purchase-required' }
  if (!availabilityMet(skin, seasonId)) return { ok: false, reason: 'locked' }

  owned.add(id)
  saveOwnership(owned)
  return { ok: true }
}

/** @deprecated Use purchasePlane for wallet purchases. */
export function unlockSkin(id) {
  return purchasePlane(id)
}

export function isUnlocked(id) {
  return loadOwnership().has(id)
}

export function getSkin(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0]
}

function prestigeMet(s) {
  return s.prestigeReq != null && getPrestigeLevel() >= s.prestigeReq
}

export function listSkins(seasonId = 'default') {
  const owned = loadOwnership()
  const equipped = getEquippedSkinId()
  return SKINS.map((s) => {
    const seasonalFree = s.seasonal && s.seasonal === seasonId
    const available = availabilityMet(s, seasonId)
    const state = equipped === s.id ? 'equipped' : owned.has(s.id) ? 'owned' : available ? 'available' : 'locked'
    return {
      ...s,
      state,
      requirement: getRequirement(s),
      price: getPrice(s),
      unlocked: state === 'owned' || state === 'equipped',
      equipped: state === 'equipped',
      canUnlock: state === 'available',
      seasonalFree,
    }
  })
}

export function refreshUnlocks(seasonId = 'default') {
  loadOwnership()
  return listSkins(seasonId)
}
