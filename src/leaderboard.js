const LOCAL_KEY = 'paper-plane-run-lb-local'
const DAILY_KEY = 'paper-plane-run-lb-daily'

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

function save(key, rows) {
  localStorage.setItem(key, JSON.stringify(rows.slice(0, 20)))
}

export function submitLocalScore({ name, distance, stars, mode, daily, dailyKey }) {
  const entry = {
    name: (name || 'Pilot').slice(0, 16),
    distance: Math.floor(distance),
    stars: stars | 0,
    mode,
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
  return list.slice(0, 10)
}

export function getLocalTop(limit = 10) {
  return load(LOCAL_KEY).slice(0, limit)
}

export function getDailyTop(dailyKey, mode, limit = 10) {
  return load(DAILY_KEY + dailyKey + mode).slice(0, limit)
}

/** Optional remote — fails soft if API unavailable */
export async function fetchRemoteTop(mode = 'normal', daily = false) {
  try {
    const q = new URLSearchParams({ mode, daily: daily ? '1' : '0' })
    const res = await fetch(`/api/leaderboard?${q}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function submitRemoteScore(entry) {
  try {
    const res = await fetch('/api/leaderboard', {
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
