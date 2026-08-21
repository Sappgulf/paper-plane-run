const g = globalThis
if (!g.__pprAnalytics) {
  g.__pprAnalytics = { events: [], funnel: {} }
}

const MAX_BODY_BYTES = 32 * 1024
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 120

function setSecurityHeaders(res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
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
  if (typeof req.body === 'object') return Array.isArray(req.body) ? null : req.body
  try {
    const body = JSON.parse(req.body)
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null
  } catch {
    return null
  }
}

function sanitizeValue(value, depth = 0) {
  if (depth > 2 || value === null) return value
  if (typeof value === 'string') return value.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 200)
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1))
  if (typeof value === 'object') {
    return Object.entries(value).slice(0, 20).reduce((result, [key, item]) => {
      const safe = sanitizeValue(item, depth + 1)
      if (safe !== undefined) result[String(key).slice(0, 40)] = safe
      return result
    }, {})
  }
  return undefined
}

function isRateLimited(req) {
  const now = Date.now()
  const key = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'anonymous')
    .split(',')[0]
    .trim()
    .slice(0, 80)
  const state = g.__pprAnalyticsRate || (g.__pprAnalyticsRate = new Map())
  const previous = state.get(key)
  if (!previous || now - previous.startedAt >= RATE_LIMIT_WINDOW_MS) {
    state.set(key, { startedAt: now, count: 1 })
    return false
  }
  previous.count += 1
  return previous.count > RATE_LIMIT_MAX_REQUESTS
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  setSecurityHeaders(res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  const store = g.__pprAnalytics

  if (req.method === 'POST') {
    if (isRateLimited(req)) return res.status(429).json({ error: 'too many analytics events' })
    const body = parseBody(req)
    if (!body) return res.status(413).json({ error: 'invalid or oversized body' })
    const e = String(body.e || body.event || 'unknown').replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 40)
    store.funnel[e] = (store.funnel[e] || 0) + 1
    store.events.push({
      e,
      p: sanitizeValue(body.p || body.props || {}) || {},
      t: Date.now(),
      s: String(body.s || '').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 64),
    })
    if (store.events.length > 500) store.events = store.events.slice(-500)
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      funnel: store.funnel,
      eventCount: store.events.length,
    })
  }

  return res.status(405).json({ error: 'method' })
}
