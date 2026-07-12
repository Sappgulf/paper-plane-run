import { dailyKey, dailySeed, mulberry32 } from './rng.js'

const KEY = 'paper-plane-run-missions'

const TEMPLATES = [
  { id: 'stars', label: (n) => `Collect ${n} stars in one run`, type: 'stars', min: 5, max: 18 },
  { id: 'distance', label: (n) => `Fly ${n}m in one run`, type: 'distance', min: 80, max: 350 },
  { id: 'combo', label: (n) => `Reach a ${n}x near-miss combo`, type: 'combo', min: 3, max: 8 },
  { id: 'powers', label: (n) => `Pick up ${n} power-ups in one run`, type: 'powers', min: 1, max: 4 },
  { id: 'survive_wind', label: (n) => `Survive ${n} wind gusts in one run`, type: 'winds', min: 2, max: 5 },
  { id: 'hard_dist', label: (n) => `Reach ${n}m on Hard`, type: 'hard_distance', min: 60, max: 200 },
  { id: 'no_crash_easy', label: (n) => `Fly ${n}m on Easy without crashing early`, type: 'easy_distance', min: 120, max: 300 },
  { id: 'daily', label: (n) => `Score ${n}m on today's Daily Route`, type: 'daily_distance', min: 70, max: 250 },
]

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

function saveState(s) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function getDailyMissions() {
  const day = dailyKey()
  let state = loadState()
  if (state.day !== day || !state.missions?.length) {
    const rand = mulberry32(dailySeed('missions'))
    const pool = [...TEMPLATES]
    const missions = []
    for (let i = 0; i < 3 && pool.length; i++) {
      const idx = (rand() * pool.length) | 0
      const t = pool.splice(idx, 1)[0]
      const n = Math.floor(t.min + rand() * (t.max - t.min + 1))
      missions.push({
        id: `${t.id}-${i}`,
        type: t.type,
        target: n,
        label: t.label(n),
        progress: 0,
        done: false,
        claimed: false,
      })
    }
    state = { day, missions, claimStars: 0 }
    saveState(state)
  }
  return state.missions
}

export function updateMissionsFromRun(stats) {
  const day = dailyKey()
  const state = loadState()
  if (state.day !== day) getDailyMissions()
  const s = loadState()
  let changed = false
  for (const m of s.missions) {
    if (m.done) continue
    let val = 0
    switch (m.type) {
      case 'stars':
        val = stats.stars
        break
      case 'distance':
        val = stats.distance
        break
      case 'combo':
        val = stats.maxCombo
        break
      case 'powers':
        val = stats.powers
        break
      case 'winds':
        val = stats.winds
        break
      case 'hard_distance':
        val = stats.mode === 'hard' ? stats.distance : 0
        break
      case 'easy_distance':
        val = stats.mode === 'easy' ? stats.distance : 0
        break
      case 'daily_distance':
        val = stats.daily ? stats.distance : 0
        break
      default:
        val = 0
    }
    if (val > m.progress) {
      m.progress = val
      changed = true
    }
    if (m.progress >= m.target) {
      m.done = true
      m.progress = m.target
      changed = true
    }
  }
  if (changed) saveState(s)
  return s.missions
}

export function claimMission(id) {
  const s = loadState()
  const m = s.missions?.find((x) => x.id === id)
  if (!m || !m.done || m.claimed) return 0
  m.claimed = true
  const reward = 8 + Math.floor(m.target / 10)
  s.claimStars = (s.claimStars || 0) + reward
  saveState(s)
  return reward
}

export function unclaimedRewards() {
  return getDailyMissions().filter((m) => m.done && !m.claimed).length
}

/** Consecutive-day play streak. Call once per finished run; every 7th day pays a bonus. */
export function updatePlayStreak() {
  const day = dailyKey()
  const s = loadState()
  if (s.lastPlayDay === day) return s.streakDays || 0
  const yesterday = dailyKey(new Date(Date.now() - 86400000))
  s.streakDays = s.lastPlayDay === yesterday ? (s.streakDays || 0) + 1 : 1
  s.lastPlayDay = day
  saveState(s)
  return s.streakDays
}

export function getPlayStreak() {
  return loadState().streakDays || 0
}

/** Returns a wallet-star bonus the first time a 7-day multiple streak is reached. */
export function claimWeeklyStreakBonus() {
  const s = loadState()
  const streak = s.streakDays || 0
  if (streak > 0 && streak % 7 === 0 && s.lastWeeklyClaim !== streak) {
    s.lastWeeklyClaim = streak
    saveState(s)
    return 40
  }
  return 0
}
