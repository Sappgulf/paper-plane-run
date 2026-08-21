/**
 * Lightweight global leaderboard for Vercel serverless.
 * In-memory per warm instance + best-effort durability via response merge.
 * Clients also keep a local leaderboard.
 */

import {
  isLeaderboardMode,
  normalizeLeaderboardInteger,
  normalizeLeaderboardMode,
  normalizeLeaderboardName,
} from '../src/game/leaderboard-contract.js'

const g = globalThis
const MAX_BODY_BYTES = 16 * 1024
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 60
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
    name: normalizeLeaderboardName(entry.name),
    distance: Math.min(1e6, normalizeLeaderboardInteger(entry.distance)),
    stars: Math.min(1e4, normalizeLeaderboardInteger(entry.stars)),
    mode: normalizeLeaderboardMode(entry.mode),
    daily: !!entry.daily,
    at: Date.now(),
  }
}

function setSecurityHeaders(res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
}

function requestKey(req) {
  return String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'anonymous')
    .split(',')[0]
    .trim()
    .slice(0, 80)
}

function isRateLimited(req) {
  const now = Date.now()
  const key = requestKey(req)
  const state = g.__pprLeaderboardRate || (g.__pprLeaderboardRate = new Map())
  const previous = state.get(key)
  if (!previous || now - previous.startedAt >= RATE_LIMIT_WINDOW_MS) {
    state.set(key, { startedAt: now, count: 1 })
    return false
  }
  previous.count += 1
  return previous.count > RATE_LIMIT_MAX_REQUESTS
}

function requestBodySize(req) {
  if (typeof req.body === 'string') return new TextEncoder().encode(req.body).byteLength
  if (req.body && typeof req.body === 'object') {
    try {
      return new TextEncoder().encode(JSON.stringify(req.body)).byteLength
    } catch {
      return MAX_BODY_BYTES + 1
    }
  }
  return 0
}

function parseBody(req) {
  if (requestBodySize(req) > MAX_BODY_BYTES) return null
  if (!req.body) return {}
  if (typeof req.body === 'object') {
    return Array.isArray(req.body) ? null : req.body
  }
  try {
    const body = JSON.parse(req.body)
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  setSecurityHeaders(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const board = g.__pprBoard

  if (req.method === 'GET') {
    const mode = normalizeLeaderboardMode(req.query?.mode, 'normal')
    if (req.query?.mode && !isLeaderboardMode(req.query.mode)) {
      return res.status(400).json({ error: 'invalid mode' })
    }
    const daily = req.query?.daily === '1'
    if (daily) {
      const key = `${dayKey()}|${mode}`
      const list = board.daily[key] || []
      return res.status(200).json({ source: 'remote', daily: true, mode, day: dayKey(), scores: list })
    }
    const scores = board.all.filter((s) => s.mode === mode).slice(0, 15)
    return res.status(200).json({ source: 'remote', daily: false, mode, scores })
  }

  if (req.method === 'POST') {
    if (isRateLimited(req)) return res.status(429).json({ error: 'too many submissions' })
    const body = parseBody(req)
    if (!body) return res.status(413).json({ error: 'invalid or oversized body' })
    const entry = sanitize(body)
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
