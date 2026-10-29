import { createHash } from 'node:crypto'
import { isLeaderboardMode, normalizeLeaderboardName } from '../src/game/leaderboard-contract.js'
import { dailyKey, dailySeed } from '../src/rng.js'
import { weeklyKey, weeklySeed } from '../src/game/weekly-fold.js'
import { createLeaderboardStore } from '../src/server/leaderboard-store.js'

const MAX_BODY_BYTES = 16 * 1024
const RUN_ID = /^[A-Za-z0-9_-]{32}$/
const KINDS = new Set(['classic', 'daily', 'weekly'])
const MAX_DISTANCE = 100_000_000
const MAX_STARS = 1_000_000

function parseBody(body) {
  try {
    const raw = typeof body === 'string' ? body : JSON.stringify(body ?? {})
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return { error: 413 }
    const value = JSON.parse(raw)
    return value && typeof value === 'object' && !Array.isArray(value) ? { value } : { error: 400 }
  } catch {
    return { error: 400 }
  }
}

function clientAddress(req) {
  return String(req.headers?.['x-vercel-forwarded-for'] || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'anonymous')
    .split(',')[0].trim().slice(0, 80)
}

function fingerprint(id, name, distance, stars) {
  return createHash('sha256').update(JSON.stringify([id, name, distance, stars])).digest('hex')
}

function configuredStore() {
  return createLeaderboardStore({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN })
}

/** The browser supplies scores, so these bounds are plausibility checks, not
 * proof of honest play. Generous margins preserve legitimate boosted runs. */
function plausible(run, distance, stars, now) {
  const seconds = Math.max(0, (now - run.startedAt) / 1000) + 30
  return distance <= seconds * 5000 && stars <= seconds * 500
}

export function createLeaderboardHandler({ getStore = configuredStore, now = Date.now } = {}) {
  return async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    if (req.method === 'OPTIONS') return res.status(204).end()
    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'method' })

    if (req.method === 'GET') {
      const mode = req.query?.mode || 'normal'
      const daily = req.query?.daily || '0'
      const weekly = req.query?.weekly || '0'
      if (!isLeaderboardMode(mode) || !['0', '1'].includes(daily) || !['0', '1'].includes(weekly) || (daily === '1' && weekly === '1')) {
        return res.status(400).json({ error: 'invalid leaderboard selection' })
      }
      const kind = daily === '1' ? 'daily' : weekly === '1' ? 'weekly' : 'classic'
      const date = new Date(now())
      const period = kind === 'daily' ? dailyKey(date) : kind === 'weekly' ? weeklyKey(date) : ''
      try {
        const scores = await getStore().read(mode, kind, period)
        return res.status(200).json({ source: 'remote', daily: kind === 'daily', weekly: kind === 'weekly', mode,
          ...(kind === 'daily' ? { day: period } : kind === 'weekly' ? { week: period } : {}), scores })
      } catch {
        return res.status(503).json({ error: 'leaderboard unavailable' })
      }
    }

    const parsed = parseBody(req.body)
    if (parsed.error) return res.status(parsed.error).json({ error: 'invalid or oversized body' })
    const body = parsed.value
    if (body.action !== 'start' && body.action !== 'finish') return res.status(400).json({ error: 'run ticket required' })
    if (body.action === 'start' && (!isLeaderboardMode(body.mode) || !KINDS.has(body.kind))) {
      return res.status(400).json({ error: 'invalid run' })
    }
    const startedAt = now()
    if (body.action === 'start' && body.kind !== 'classic') {
      const date = new Date(startedAt)
      const expected = body.kind === 'daily' ? dailySeed(body.mode, date) : weeklySeed(body.mode, date)
      if (body.seed !== expected) return res.status(400).json({ error: 'run does not match the current route' })
    }
    if (body.action === 'finish' && (!RUN_ID.test(body.runId || '') || typeof body.name !== 'string'
      || body.name.length > 128 || !Number.isSafeInteger(body.distance) || body.distance < 1 || body.distance > MAX_DISTANCE
      || !Number.isSafeInteger(body.stars) || body.stars < 0 || body.stars > MAX_STARS)) {
      return res.status(400).json({ error: 'invalid score' })
    }

    try {
      const store = getStore()
      if (!await store.rateLimit(clientAddress(req))) return res.status(429).json({ error: 'too many submissions' })
      if (body.action === 'start') {
        const date = new Date(startedAt)
        const period = body.kind === 'daily' ? dailyKey(date) : body.kind === 'weekly' ? weeklyKey(date) : ''
        const runId = await store.issue({ mode: body.mode, kind: body.kind, period, startedAt })
        return res.status(201).json({ runId })
      }

      const name = normalizeLeaderboardName(body.name)
      const hash = fingerprint(body.runId, name, body.distance, body.stars)
      const rawRun = await store.getRun(body.runId)
      if (!rawRun) {
        const receipt = await store.getReceipt(body.runId)
        return receipt === `c:${hash}` ? res.status(200).json({ ok: true }) : res.status(400).json({ error: 'run expired or already used' })
      }
      const run = JSON.parse(rawRun)
      const completedAt = now()
      if (!plausible(run, body.distance, body.stars, completedAt)) return res.status(400).json({ error: 'score outside plausible limits' })
      const entry = { name, distance: body.distance, stars: body.stars, mode: run.mode,
        daily: run.kind === 'daily', weekly: run.kind === 'weekly', at: run.startedAt, id: body.runId }
      const result = await store.commit({ id: body.runId, rawRun, fingerprint: hash,
        score: body.distance * (MAX_STARS + 1) + body.stars, entry, run })
      if (result === 1 || result === 2) return res.status(200).json({ ok: true })
      return res.status(400).json({ error: 'run expired or already used' })
    } catch {
      return res.status(503).json({ error: 'leaderboard unavailable' })
    }
  }
}

export default createLeaderboardHandler()
