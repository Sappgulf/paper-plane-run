/**
 * Passive lifetime achievements — separate from the daily mission grind.
 * Each achievement has ordered tiers; clearing a tier's threshold lets the
 * player claim a one-time wallet-star reward.
 */
const DIST_KEY = 'paper-plane-run-lifetime-distance'
const RUNS_KEY = 'paper-plane-run-total-runs'
const CLAIMED_KEY = 'paper-plane-run-achievements-claimed'

export function getLifetimeDistance() {
  return Number(localStorage.getItem(DIST_KEY) || 0)
}
export function addLifetimeDistance(m) {
  if (!(m > 0)) return
  localStorage.setItem(DIST_KEY, String(getLifetimeDistance() + Math.floor(m)))
}
export function getRunCount() {
  return Number(localStorage.getItem(RUNS_KEY) || 0)
}
export function incrementRunCount() {
  localStorage.setItem(RUNS_KEY, String(getRunCount() + 1))
}

function loadClaimed() {
  try {
    return JSON.parse(localStorage.getItem(CLAIMED_KEY) || '{}')
  } catch {
    return {}
  }
}
function saveClaimed(obj) {
  localStorage.setItem(CLAIMED_KEY, JSON.stringify(obj))
}

export const ACHIEVEMENTS = [
  {
    id: 'distance',
    name: 'Long Haul',
    icon: '🌍',
    getValue: getLifetimeDistance,
    unit: 'm',
    tiers: [
      { threshold: 1000, reward: 10 },
      { threshold: 5000, reward: 20 },
      { threshold: 25000, reward: 40 },
      { threshold: 100000, reward: 80 },
    ],
  },
  {
    id: 'stars',
    name: 'Star Collector',
    icon: '⭐',
    getValue: null, // filled in by caller via lifetimeStars param (avoids a circular import on skins.js)
    unit: '★',
    tiers: [
      { threshold: 50, reward: 10 },
      { threshold: 250, reward: 20 },
      { threshold: 1000, reward: 40 },
      { threshold: 5000, reward: 80 },
    ],
  },
  {
    id: 'runs',
    name: 'Frequent Flyer',
    icon: '🛫',
    getValue: getRunCount,
    unit: ' runs',
    tiers: [
      { threshold: 10, reward: 8 },
      { threshold: 50, reward: 16 },
      { threshold: 200, reward: 32 },
      { threshold: 1000, reward: 64 },
    ],
  },
]

/** @param {number} lifetimeStars — passed in from skins.js's getLifetimeStars() */
export function getAchievementProgress(lifetimeStars) {
  const claimed = loadClaimed()
  return ACHIEVEMENTS.map((a) => {
    const value = a.id === 'stars' ? lifetimeStars : a.getValue()
    const claimedTier = claimed[a.id] ?? -1
    const tiers = a.tiers.map((t, i) => ({
      ...t,
      done: value >= t.threshold,
      claimed: i <= claimedTier,
      claimable: value >= t.threshold && i > claimedTier && i === claimedTier + 1,
    }))
    return { ...a, value, tiers }
  })
}

export function claimAchievementTier(id, tierIndex) {
  const a = ACHIEVEMENTS.find((x) => x.id === id)
  if (!a) return 0
  const claimed = loadClaimed()
  const current = claimed[id] ?? -1
  if (tierIndex !== current + 1) return 0
  const tier = a.tiers[tierIndex]
  if (!tier) return 0
  claimed[id] = tierIndex
  saveClaimed(claimed)
  return tier.reward
}
