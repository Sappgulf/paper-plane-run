import { getWallet, spendWallet } from './upgrades.js'
import { safeSetItem } from './game/safe-storage.js'
import { FUTURE_PRICE_TABLE } from './game/economy.js'

const KEY = 'paper-plane-run-skins'
const EQUIP = 'paper-plane-run-skin'
const STARS_KEY = 'paper-plane-run-lifetime-stars'
const SCHEMA_VERSION_KEY = 'paper-plane-run-skins-version'
const SCHEMA_VERSION = '1'
function parseStarCount(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0
}

const LEGACY_LIFETIME_REQUIREMENTS = Object.freeze({
  classic: 0,
  mint: 25,
  coral: 50,
  night: 80,
  gold: 120,
  sunset: 140,
  stormfoil: 150,
  neon: 160,
  rainbow: 200,
  // The four former prestige planes. Prestige is gone, but these were the
  // only long-tail cosmetic goal in the game, so they survive as the far end
  // of the same lifetime-star ladder every other plane sits on rather than
  // being deleted along with the loop that used to gate them.
  goldenfold: 300,
  inkveil: 450,
  starcrest: 650,
  paperlegend: 1000,
})

function planeArt(id, silhouette) {
  return {
    portrait: `/assets/planes/${id}.webp`,
    texture: `/assets/planes/${id}.webp`,
    silhouette,
  }
}

/**
 * Every plane flies on the same generated paper sheet (`paper:sheet:city` in
 * game/paper-art.js) and is distinguished by its `body`/`accent` tints alone.
 * The old per-skin photographic JPEGs each carried their own lighting and
 * grain, so two planes side by side looked like they came from two different
 * games — which is exactly the incoherence the art rule exists to stop.
 */
export const SKINS = [
  {
    id: 'classic',
    ...planeArt('classic', 'classic'),
    name: 'Classic Cream',
    cost: 0,
    body: 0xfff6ec,
    accent: 0xf0956a,
    map: 'paper:sheet:city',
  },
  {
    id: 'mint',
    ...planeArt('mint', 'glider'),
    name: 'Mint Fold',
    cost: FUTURE_PRICE_TABLE.planes.mint,
    body: 0xd8f5e8,
    accent: 0x34d399,
    map: 'paper:sheet:city',
  },
  {
    id: 'coral',
    ...planeArt('coral', 'dart'),
    name: 'Coral Wash',
    cost: FUTURE_PRICE_TABLE.planes.coral,
    body: 0xffe0d4,
    accent: 0xf97316,
    map: 'paper:sheet:city',
  },
  {
    id: 'night',
    ...planeArt('night', 'stunt'),
    name: 'Night Washi',
    cost: FUTURE_PRICE_TABLE.planes.night,
    body: 0x2a3350,
    accent: 0xfbbf24,
    map: 'paper:sheet:city',
  },
  {
    id: 'gold',
    ...planeArt('gold', 'classic'),
    name: 'Gold Foil',
    cost: FUTURE_PRICE_TABLE.planes.gold,
    body: 0xfff3c4,
    accent: 0xd97706,
    map: 'paper:sheet:city',
  },
  {
    id: 'sunset',
    ...planeArt('sunset', 'classic'),
    name: 'Sunset Letter',
    cost: FUTURE_PRICE_TABLE.planes.sunset,
    body: 0xffedd5,
    accent: 0xea580c,
    map: 'paper:sheet:city',
  },
  {
    id: 'stormfoil',
    ...planeArt('stormfoil', 'stunt'),
    name: 'Storm Foil',
    cost: FUTURE_PRICE_TABLE.planes.stormfoil,
    body: 0x4b5563,
    accent: 0xa78bfa,
    map: 'paper:sheet:city',
  },
  {
    id: 'neon',
    ...planeArt('neon', 'dart'),
    name: 'Neon Crease',
    cost: FUTURE_PRICE_TABLE.planes.neon,
    body: 0x1e3a5f,
    accent: 0x38bdf8,
    map: 'paper:sheet:city',
  },
  {
    id: 'rainbow',
    ...planeArt('rainbow', 'glider'),
    name: 'Rainbow Scrap',
    cost: FUTURE_PRICE_TABLE.planes.rainbow,
    body: 0xfff7ed,
    accent: 0xa855f7,
    map: 'paper:sheet:city',
  },
  {
    id: 'halloween',
    ...planeArt('halloween', 'stunt'),
    name: 'Jack-o-Plane',
    cost: 999,
    seasonal: 'halloween',
    body: 0x1a1a1a,
    accent: 0xff6b00,
    map: 'paper:sheet:city',
  },
  {
    id: 'winter',
    ...planeArt('winter', 'glider'),
    name: 'Frost Fold',
    cost: 999,
    seasonal: 'winter',
    body: 0xe0f2fe,
    accent: 0x38bdf8,
    map: 'paper:sheet:city',
  },
  {
    id: 'valentine',
    ...planeArt('valentine', 'dart'),
    name: 'Love Letter',
    cost: 999,
    seasonal: 'valentine',
    body: 0xffe4e6,
    accent: 0xe11d48,
    map: 'paper:sheet:city',
  },
  {
    id: 'spring',
    ...planeArt('spring', 'glider'),
    name: 'Blossom Sheet',
    cost: 999,
    seasonal: 'spring',
    body: 0xfce7f3,
    accent: 0x65a30d,
    map: 'paper:sheet:city',
  },
  {
    id: 'goldenfold',
    ...planeArt('goldenfold', 'classic'),
    name: 'Golden Fold',
    cost: 150,
    body: 0xfff3c4,
    accent: 0x7c3aed,
    map: 'paper:sheet:city',
  },
  {
    id: 'inkveil',
    ...planeArt('inkveil', 'dart'),
    name: 'Ink Veil',
    cost: 185,
    body: 0x111827,
    accent: 0x38bdf8,
    map: 'paper:sheet:city',
  },
  {
    id: 'starcrest',
    ...planeArt('starcrest', 'stunt'),
    name: 'Starcrest',
    cost: 225,
    body: 0x1e1b4b,
    accent: 0xfbbf24,
    map: 'paper:sheet:city',
  },
  {
    id: 'paperlegend',
    ...planeArt('paperlegend', 'glider'),
    name: 'Paper Legend',
    cost: 280,
    body: 0xfff7ed,
    accent: 0xa855f7,
    map: 'paper:sheet:city',
  },
]

const KNOWN_SKIN_IDS = new Set(SKINS.map((skin) => skin.id))

function loadLegacyOwnership() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '["classic"]')
    const raw = Array.isArray(saved) ? saved : ['classic']
    const normalized = [...new Set(raw.filter((id) => typeof id === 'string' && KNOWN_SKIN_IDS.has(id)))]
    const needsRepair =
      !Array.isArray(saved) || normalized.length !== raw.length || normalized.some((id, index) => id !== raw[index])
    return { owned: new Set(normalized), needsRepair }
  } catch {
    return { owned: new Set(['classic']), needsRepair: true }
  }
}

function saveOwnership(set) {
  safeSetItem(KEY, JSON.stringify([...set]))
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
    safeSetItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION)
  }
  return owned
}

export function getLifetimeStars() {
  return parseStarCount(localStorage.getItem(STARS_KEY))
}

export function addLifetimeStars(n) {
  const v = getLifetimeStars() + parseStarCount(n)
  safeSetItem(STARS_KEY, String(v))
  return v
}

export function getEquippedSkinId() {
  const equipped = localStorage.getItem(EQUIP)
  if (KNOWN_SKIN_IDS.has(equipped)) return equipped
  if (equipped !== null) safeSetItem(EQUIP, 'classic')
  return 'classic'
}

export function equipSkin(id) {
  const owned = loadOwnership()
  if (!owned.has(id)) return false
  safeSetItem(EQUIP, id)
  return true
}

function getRequirement(skin) {
  if (skin.seasonal) return { type: 'season', value: skin.seasonal }
  return { type: 'lifetime-stars', value: LEGACY_LIFETIME_REQUIREMENTS[skin.id] }
}

function getPrice(skin) {
  if (skin.seasonal) return null
  return { currency: 'wallet-stars', value: skin.cost }
}

function availabilityMet(skin, seasonId) {
  if (skin.seasonal) return skin.seasonal === seasonId
  return getLifetimeStars() >= LEGACY_LIFETIME_REQUIREMENTS[skin.id]
}

/** Buy a lifetime-available plane using spendable wallet stars. */
export function purchasePlane(id) {
  const skin = SKINS.find((s) => s.id === id)
  if (!skin) return { ok: false, reason: 'missing' }

  const owned = loadOwnership()
  if (owned.has(id)) return { ok: true, already: true }
  if (skin.seasonal) return { ok: false, reason: 'claim-required' }
  if (!availabilityMet(skin)) return { ok: false, reason: 'locked' }
  if (!spendWallet(skin.cost)) return { ok: false, reason: 'poor', need: skin.cost - getWallet() }

  owned.add(id)
  saveOwnership(owned)
  return { ok: true, cost: skin.cost }
}

/** Claim a free seasonal plane once its availability requirement is met. */
export function claimPlane(id, seasonId = 'default') {
  const skin = SKINS.find((s) => s.id === id)
  if (!skin) return { ok: false, reason: 'missing' }

  const owned = loadOwnership()
  if (owned.has(id)) return { ok: true, already: true }
  if (!skin.seasonal) return { ok: false, reason: 'purchase-required' }
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

export function listSkins(seasonId = 'default') {
  const owned = loadOwnership()
  const equipped = getEquippedSkinId()
  const wallet = getWallet()
  return SKINS.map((s) => {
    const seasonalFree = s.seasonal && s.seasonal === seasonId
    const available = availabilityMet(s, seasonId)
    const state = equipped === s.id ? 'equipped' : owned.has(s.id) ? 'owned' : available ? 'available' : 'locked'
    const price = getPrice(s)
    const canAfford = state === 'available' && (price == null || wallet >= price.value)
    return {
      ...s,
      state,
      requirement: getRequirement(s),
      price,
      unlocked: state === 'owned' || state === 'equipped',
      equipped: state === 'equipped',
      canUnlock: state === 'available',
      canAfford,
      seasonalFree,
    }
  })
}

export function refreshUnlocks(seasonId = 'default') {
  loadOwnership()
  return listSkins(seasonId)
}
