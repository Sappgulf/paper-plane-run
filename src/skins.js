const KEY = 'paper-plane-run-skins'
const EQUIP = 'paper-plane-run-skin'
const STARS_KEY = 'paper-plane-run-lifetime-stars'

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
]

function loadUnlocked() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '["classic"]'))
  } catch {
    return new Set(['classic'])
  }
}

function saveUnlocked(set) {
  localStorage.setItem(KEY, JSON.stringify([...set]))
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
  return localStorage.getItem(EQUIP) || 'classic'
}

export function equipSkin(id) {
  const unlocked = loadUnlocked()
  if (!unlocked.has(id)) return false
  localStorage.setItem(EQUIP, id)
  return true
}

export function unlockSkin(id) {
  const skin = SKINS.find((s) => s.id === id)
  if (!skin) return { ok: false, reason: 'missing' }
  const unlocked = loadUnlocked()
  if (unlocked.has(id)) return { ok: true, already: true }
  const stars = getLifetimeStars()
  if (stars < skin.cost) return { ok: false, reason: 'poor', need: skin.cost - stars }
  // cost is unlock threshold (lifetime stars), not spend — arcade style
  unlocked.add(id)
  saveUnlocked(unlocked)
  return { ok: true }
}

export function isUnlocked(id) {
  return loadUnlocked().has(id)
}

export function getSkin(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0]
}

export function listSkins(seasonId = 'default') {
  const stars = getLifetimeStars()
  return SKINS.map((s) => {
    const seasonalFree = s.seasonal && s.seasonal === seasonId
    const unlocked = isUnlocked(s.id) || (!s.seasonal && stars >= s.cost) || seasonalFree
    return {
      ...s,
      unlocked,
      equipped: getEquippedSkinId() === s.id,
      canUnlock: unlocked,
      seasonalFree,
    }
  })
}

/** Auto-unlock skins when lifetime stars pass thresholds + seasonal free */
export function refreshUnlocks(seasonId = 'default') {
  const stars = getLifetimeStars()
  const unlocked = loadUnlocked()
  let changed = false
  for (const s of SKINS) {
    const seasonalFree = s.seasonal && s.seasonal === seasonId
    if ((stars >= s.cost && !s.seasonal) || seasonalFree) {
      if (!unlocked.has(s.id)) {
        unlocked.add(s.id)
        changed = true
      }
    }
  }
  if (changed) saveUnlocked(unlocked)
  return listSkins(seasonId)
}
