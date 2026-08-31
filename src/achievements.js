/**
 * Passive lifetime achievements — separate from the daily mission grind.
 * Each achievement has ordered tiers; clearing a tier's threshold lets the
 * player claim a one-time wallet-star reward.
 */
import { safeSetItem } from './game/safe-storage.js'
import { getLifetimeStars } from './skins.js'

const DIST_KEY = 'paper-plane-run-lifetime-distance'
const RUNS_KEY = 'paper-plane-run-total-runs'
const POPPED_KEY = 'paper-plane-run-lifetime-popped'
const FEVER_KEY = 'paper-plane-run-lifetime-fever'
const CLAIMED_KEY = 'paper-plane-run-achievements-claimed'

function parseNonNegativeInt(value) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0
}

export function getLifetimeDistance() {
  return parseNonNegativeInt(localStorage.getItem(DIST_KEY))
}
export function addLifetimeDistance(m) {
  if (!(m > 0)) return
  safeSetItem(DIST_KEY, String(getLifetimeDistance() + parseNonNegativeInt(m)))
}
export function getRunCount() {
  return parseNonNegativeInt(localStorage.getItem(RUNS_KEY))
}
export function incrementRunCount() {
  safeSetItem(RUNS_KEY, String(getRunCount() + 1))
}
export function getLifetimePopped() {
  return parseNonNegativeInt(localStorage.getItem(POPPED_KEY))
}
export function addLifetimePopped(n) {
  if (!(n > 0)) return
  safeSetItem(POPPED_KEY, String(getLifetimePopped() + parseNonNegativeInt(n)))
}
export function getLifetimeFever() {
  return parseNonNegativeInt(localStorage.getItem(FEVER_KEY))
}
export function addLifetimeFever(n) {
  if (!(n > 0)) return
  safeSetItem(FEVER_KEY, String(getLifetimeFever() + parseNonNegativeInt(n)))
}

function loadClaimed() {
  try {
    return JSON.parse(localStorage.getItem(CLAIMED_KEY) || '{}')
  } catch {
    return {}
  }
}
function saveClaimed(obj) {
  safeSetItem(CLAIMED_KEY, JSON.stringify(obj))
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
    getValue: null, // lifetime stars are read via skins.js's getLifetimeStars() (see claimAchievementTier)
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
  {
    id: 'popped',
    name: 'Sharpshooter',
    icon: '🎯',
    getValue: getLifetimePopped,
    unit: ' popped',
    tiers: [
      { threshold: 25, reward: 10 },
      { threshold: 100, reward: 20 },
      { threshold: 400, reward: 40 },
      { threshold: 1500, reward: 80 },
    ],
  },
  {
    id: 'fever',
    name: 'Fever Pitch',
    icon: '🔥',
    getValue: getLifetimeFever,
    unit: ' fevers',
    tiers: [
      { threshold: 3, reward: 10 },
      { threshold: 15, reward: 20 },
      { threshold: 50, reward: 40 },
      { threshold: 150, reward: 80 },
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
  const value = a.id === 'stars' ? getLifetimeStars() : a.getValue()
  if (value < tier.threshold) return 0
  claimed[id] = tierIndex
  saveClaimed(claimed)
  return tier.reward
}
