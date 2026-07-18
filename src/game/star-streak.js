import { getStreakTuning } from './upgrade-runtime.js'

export function createStarStreakState() {
  return Object.freeze({ count: 0, timer: 0, bonusStars: 0, milestone: false })
}

/**
 * Register a star pickup against Steady Hands' streak window.
 * Every 5th pickup in the chain banks tiered bonus stars.
 */
export function registerStarPickup({
  count = 0,
  streakWindowBonus = 0,
} = {}) {
  const next = Math.max(0, Math.floor(Number(count) || 0)) + 1
  const windowSeconds = getStreakTuning({ streakWindowBonus }).windowSeconds
  const milestone = next % 5 === 0
  const tier = milestone ? next / 5 : 0
  const bonusStars = milestone ? 1 + tier : 0
  return Object.freeze({
    count: next,
    timer: windowSeconds,
    windowSeconds,
    milestone,
    bonusStars,
    visible: next >= 2,
    banner: milestone ? `⭐ Star Streak x${next}! +${bonusStars}` : null,
  })
}

export function advanceStarStreakState(state, dt = 0) {
  const count = Math.max(0, Math.floor(Number(state?.count) || 0))
  const timer = Math.max(0, Number(state?.timer) || 0) - Math.max(0, Number(dt) || 0)
  if (count <= 0) return createStarStreakState()
  if (timer <= 0) return createStarStreakState()
  return Object.freeze({
    count,
    timer,
    bonusStars: 0,
    milestone: false,
    visible: count >= 2,
    banner: null,
  })
}
