import { beforeEach, describe, expect, test } from 'vitest'
import leaderboardHandler, { createLeaderboardHandler } from '../api/leaderboard.js'
import analyticsHandler from '../api/analytics.js'

function responseDouble() {
  return {
    statusCode: 200,
    headers: {},
    payload: undefined,
    ended: false,
    setHeader(key, value) {
      this.headers[key] = value
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.payload = payload
      return this
    },
    end() {
      this.ended = true
      return this
    },
  }
}

beforeEach(() => {
  globalThis.__pprAnalytics = { events: [], funnel: {} }
  globalThis.__pprAnalyticsRate = new Map()
})

describe('leaderboard API boundary', () => {
  test('rejects scores without a server-issued run', async () => {
    const result = responseDouble()
    await leaderboardHandler({ method: 'POST', body: { name: 'Pilot', distance: 500, stars: 10, mode: 'normal' } }, result)
    expect(result.statusCode).toBe(400)
  })

  test('reports unavailable storage instead of accepting a run', async () => {
    const result = responseDouble()
    const handler = createLeaderboardHandler({ getStore: () => { throw new Error('offline') } })
    await handler({ method: 'POST', body: { action: 'start', mode: 'normal', kind: 'classic' } }, result)
    expect(result.statusCode).toBe(503)
  })

  test('rejects invalid board selectors, runs, scores and oversized bodies', async () => {
    const cases = [
      [{ method: 'GET', query: { mode: 'admin' } }, 400],
      [{ method: 'GET', query: { mode: 'normal', daily: '1', weekly: '1' } }, 400],
      [{ method: 'POST', body: { action: 'start', mode: 'normal', kind: 'layout' } }, 400],
      [{ method: 'POST', body: { action: 'start', mode: 'normal', kind: 'daily', seed: 1 } }, 400],
      [{ method: 'POST', body: { action: 'finish', runId: 'a'.repeat(32), name: 'Pilot', distance: '42', stars: 1 } }, 400],
      [{ method: 'POST', body: { action: 'finish', runId: 'a'.repeat(32), name: 'Pilot', distance: 42, stars: -1 } }, 400],
      [{ method: 'POST', body: 'x'.repeat(16 * 1024 + 1) }, 413],
    ]
    for (const [req, status] of cases) {
      const result = responseDouble()
      await leaderboardHandler(req, result)
      expect(result.statusCode).toBe(status)
    }
  })

  test('rejects expired tickets and enforces the shared rate limit', async () => {
    let allowed = true
    const store = { rateLimit: async () => allowed, getRun: async () => null, getReceipt: async () => null }
    const handler = createLeaderboardHandler({ getStore: () => store })
    const body = { action: 'finish', runId: 'a'.repeat(32), name: 'Pilot', distance: 42, stars: 1 }
    const expired = responseDouble()
    await handler({ method: 'POST', body }, expired)
    expect(expired.statusCode).toBe(400)
    allowed = false
    const limited = responseDouble()
    await handler({ method: 'POST', body }, limited)
    expect(limited.statusCode).toBe(429)
  })

  test('a retry after a partial storage failure does not create a second score', async () => {
    let clock = 100_000
    const written = new Set()
    let first = true
    const store = {
      rateLimit: async () => true,
      getRun: async () => JSON.stringify({ mode: 'normal', kind: 'classic', period: '', startedAt: 90_000 }),
      commit: async ({ entry }) => {
        written.add(JSON.stringify(entry))
        if (first) { first = false; throw new Error('interrupted') }
        return 1
      },
    }
    const handler = createLeaderboardHandler({ getStore: () => store, now: () => clock })
    const body = { action: 'finish', runId: 'a'.repeat(32), name: 'Pilot', distance: 42, stars: 1 }
    const failed = responseDouble()
    await handler({ method: 'POST', body }, failed)
    expect(failed.statusCode).toBe(503)
    clock += 1000
    const retried = responseDouble()
    await handler({ method: 'POST', body }, retried)
    expect(retried.statusCode).toBe(200)
    expect(written.size).toBe(1)
  })
})

describe('analytics API boundary', () => {
  test('aggregates events without returning raw recent payloads', async () => {
    const posted = responseDouble()
    await analyticsHandler({
      method: 'POST',
      headers: { 'x-forwarded-for': 'test-analytics' },
      body: {
        e: '<script>alert(1)</script>',
        p: { reason: 'ok\u0000' },
        s: 'session',
      },
    }, posted)

    const summary = responseDouble()
    await analyticsHandler({ method: 'GET' }, summary)
    expect(summary.payload).toEqual({
      funnel: { '_script_alert_1___script_': 1 },
      eventCount: 1,
    })
    expect(summary.payload.recent).toBeUndefined()
    expect(globalThis.__pprAnalytics.events[0].p.reason).toBe('ok ')
  })

  test('rejects oversized bodies', async () => {
    const result = responseDouble()
    await analyticsHandler({ method: 'POST', body: 'x'.repeat(32 * 1024 + 1) }, result)
    expect(result.statusCode).toBe(413)
  })
})
