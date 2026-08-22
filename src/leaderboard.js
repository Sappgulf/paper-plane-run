import { safeSetItem } from './game/safe-storage.js'
import {
  LEADERBOARD_MODES,
  isLeaderboardMode,
  normalizeLeaderboardInteger,
  normalizeLeaderboardMode,
  normalizeLeaderboardName,
} from './game/leaderboard-contract.js'

export {
  LEADERBOARD_MODES,
  isLeaderboardMode,
  normalizeLeaderboardInteger,
  normalizeLeaderboardMode,
  normalizeLeaderboardName,
}

const LOCAL_KEY = 'paper-plane-run-lb-local'
const DAILY_KEY = 'paper-plane-run-lb-daily'
const WEEKLY_KEY = 'paper-plane-run-lb-weekly'
const TIME_ATTACK_KEY = 'paper-plane-run-lb-timeattack'
// The iOS app bundles this build offline and loads it via file://, where a
// relative /api/... fetch has no server to resolve against. Vite bakes this
// in at build time — see package.json's build:ios script — so the web build
// (relative, same-origin) is completely unaffected.
const API_BASE = import.meta.env.VITE_API_BASE || ''

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

function save(key, rows) {
  safeSetItem(key, JSON.stringify(rows.slice(0, 20)))
}

export function submitLocalScore({ name, distance, stars, mode, daily, dailyKey, weekly, weeklyKey }) {
  const entry = {
    name: normalizeLeaderboardName(name),
    distance: normalizeLeaderboardInteger(distance),
    stars: normalizeLeaderboardInteger(stars),
    mode: normalizeLeaderboardMode(mode),
    at: Date.now(),
  }
  const list = load(LOCAL_KEY)
  list.push(entry)
  list.sort((a, b) => b.distance - a.distance || b.stars - a.stars)
  save(LOCAL_KEY, list)

  if (daily && dailyKey) {
    const dlist = load(DAILY_KEY + dailyKey + mode)
    dlist.push(entry)
    dlist.sort((a, b) => b.distance - a.distance || b.stars - a.stars)
    save(DAILY_KEY + dailyKey + mode, dlist.slice(0, 15))
  }
  if (weekly && weeklyKey) {
    const wlist = load(WEEKLY_KEY + weeklyKey + mode)
    wlist.push(entry)
    wlist.sort((a, b) => b.distance - a.distance || b.stars - a.stars)
    save(WEEKLY_KEY + weeklyKey + mode, wlist.slice(0, 15))
  }
  return list.slice(0, 10)
}

export function getLocalTop(limit = 10) {
  return load(LOCAL_KEY).slice(0, limit)
}

/** Time Attack scores on stars-in-60s, not distance — a separate board. */
export function submitTimeAttackScore({ name, stars, distance, mode }) {
  const entry = {
    name: normalizeLeaderboardName(name),
    stars: normalizeLeaderboardInteger(stars),
    distance: normalizeLeaderboardInteger(distance),
    mode: normalizeLeaderboardMode(mode),
    at: Date.now(),
  }
  const list = load(TIME_ATTACK_KEY)
  list.push(entry)
  list.sort((a, b) => b.stars - a.stars || b.distance - a.distance)
  save(TIME_ATTACK_KEY, list)
  return list.slice(0, 10)
}

export function getTimeAttackTop(limit = 10) {
  return load(TIME_ATTACK_KEY).slice(0, limit)
}

export function getDailyTop(dailyKey, mode, limit = 10) {
  return load(DAILY_KEY + dailyKey + mode).slice(0, limit)
}

export function getWeeklyTop(weeklyKey, mode, limit = 10) {
  return load(WEEKLY_KEY + weeklyKey + mode).slice(0, limit)
}

/** Optional remote — fails soft if API unavailable */
export async function fetchRemoteTop(mode = 'normal', opts = false) {
  const daily = opts === true || opts?.daily
  const weekly = !!opts?.weekly
  try {
    const q = new URLSearchParams({
      mode,
      daily: daily ? '1' : '0',
      weekly: weekly ? '1' : '0',
    })
    const res = await fetch(`${API_BASE}/api/leaderboard?${q}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function submitRemoteScore(entry) {
  try {
    const res = await fetch(`${API_BASE}/api/leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
