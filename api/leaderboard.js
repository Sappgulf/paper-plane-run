/**
 * Lightweight global leaderboard for Vercel serverless.
 * In-memory per warm instance + best-effort durability via response merge.
 * Clients also keep a local leaderboard.
 */

const g = globalThis
if (!g.__pprBoard) {
  g.__pprBoard = {
    all: [],
    daily: {},
  }
}

function sortTrim(list, n = 25) {
  return list
    .sort((a, b) => b.distance - a.distance || b.stars - a.stars)
    .slice(0, n)
}

function dayKey() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function sanitize(entry) {
  return {
    name: String(entry.name || 'Pilot').slice(0, 16),
    distance: Math.min(1e6, Math.max(0, Math.floor(Number(entry.distance) || 0))),
    stars: Math.min(1e4, Math.max(0, Math.floor(Number(entry.stars) || 0))),
    mode: ['easy', 'normal', 'hard'].includes(entry.mode) ? entry.mode : 'normal',
    daily: !!entry.daily,
    at: Date.now(),
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const board = g.__pprBoard

  if (req.method === 'GET') {
    const mode = String(req.query.mode || 'normal')
    const daily = req.query.daily === '1'
    if (daily) {
      const key = `${dayKey()}|${mode}`
      const list = board.daily[key] || []
      return res.status(200).json({ source: 'remote', daily: true, mode, day: dayKey(), scores: list })
    }
    const scores = board.all.filter((s) => s.mode === mode).slice(0, 15)
    return res.status(200).json({ source: 'remote', daily: false, mode, scores })
  }

  if (req.method === 'POST') {
    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {
        return res.status(400).json({ error: 'bad json' })
      }
    }
    const entry = sanitize(body || {})
    if (entry.distance < 1) return res.status(400).json({ error: 'too low' })

    board.all.push(entry)
    board.all = sortTrim(board.all, 100)

    if (entry.daily) {
      const key = `${dayKey()}|${entry.mode}`
      if (!board.daily[key]) board.daily[key] = []
      board.daily[key].push(entry)
      board.daily[key] = sortTrim(board.daily[key], 30)
    }

    return res.status(200).json({
      ok: true,
      scores: board.all.filter((s) => s.mode === entry.mode).slice(0, 15),
    })
  }

  return res.status(405).json({ error: 'method' })
}
