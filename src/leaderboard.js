import { safeGetItem, safeSetItem } from './game/safe-storage.js'
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
// The iOS app bundles this build offline and loads it via file://, where a
// relative /api/... fetch has no server to resolve against. Vite bakes this
// in at build time — see package.json's build:ios script — so the web build
// (relative, same-origin) is completely unaffected.
const API_BASE = import.meta.env.VITE_API_BASE || ''

function load(key) {
  try {
    return JSON.parse(safeGetItem(key, '[]'))
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

export function getDailyTop(dailyKey, mode, limit = 10) {
  return load(DAILY_KEY + dailyKey + mode).slice(0, limit)
}

export function getWeeklyTop(weeklyKey, mode, limit = 10) {
  return load(WEEKLY_KEY + weeklyKey + mode).slice(0, limit)
}

/** Optional remote — fails soft if API unavailable */
export async function fetchRemoteTop(mode = 'normal', opts = false, { timeoutMs = 6000 } = {}) {
  const daily = opts === true || opts?.daily
  const weekly = !!opts?.weekly
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
  try {
    const q = new URLSearchParams({
      mode,
      daily: daily ? '1' : '0',
      weekly: weekly ? '1' : '0',
    })
    const res = await fetch(`${API_BASE}/api/leaderboard?${q}`, controller ? { signal: controller.signal } : undefined)
    if (!res.ok) return null
    const result = await res.json()
    return Array.isArray(result?.scores) ? result : null
  } catch {
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function postRemote(body, attempts = 1) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timer = controller ? setTimeout(() => controller.abort(), 6000) : null
    try {
      const res = await fetch(`${API_BASE}/api/leaderboard`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), ...(controller ? { signal: controller.signal } : {}),
      })
      if (res.ok) return await res.json()
      if (res.status < 500) return null
    } catch {
      // A retry is safe for finish: the server makes identical submissions idempotent.
    } finally {
      if (timer) clearTimeout(timer)
    }
  }
  return null
}

export async function startRemoteRun({ mode, kind, seed }) {
  const result = await postRemote({ action: 'start', mode, kind, seed })
  return typeof result?.runId === 'string' ? result.runId : null
}

export async function submitRemoteScore({ runId, name, distance, stars }) {
  if (!runId) return null
  return postRemote({ action: 'finish', runId, name, distance, stars }, 2)
}
