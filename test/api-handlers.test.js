import { beforeEach, describe, expect, test } from 'vitest'
import leaderboardHandler from '../api/leaderboard.js'
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
  globalThis.__pprBoard = { all: [], daily: {}, weekly: {} }
  globalThis.__pprLeaderboardRate = new Map()
  globalThis.__pprAnalytics = { events: [], funnel: {} }
  globalThis.__pprAnalyticsRate = new Map()
})

describe('leaderboard API boundary', () => {
  test('rejects invalid modes and bounds submissions', async () => {
    const invalid = responseDouble()
    await leaderboardHandler({ method: 'GET', query: { mode: 'admin' } }, invalid)
    expect(invalid.statusCode).toBe(400)

    const submitted = responseDouble()
    await leaderboardHandler({
      method: 'POST',
      headers: { 'x-forwarded-for': 'test-leaderboard' },
      body: {
        name: '  <img src=x>\u0000',
        distance: '42.9',
        stars: '-3.4',
        mode: 'normal',
      },
    }, submitted)

    expect(submitted.statusCode).toBe(200)
    expect(submitted.headers['Cache-Control']).toBe('no-store')
    expect(submitted.payload.scores[0]).toMatchObject({
      name: '<img src=x>',
      distance: 42,
      stars: 0,
      mode: 'normal',
    })
  })

  test('rejects oversized bodies', async () => {
    const result = responseDouble()
    await leaderboardHandler({ method: 'POST', body: 'x'.repeat(16 * 1024 + 1) }, result)
    expect(result.statusCode).toBe(413)
  })

  test('keeps a weekly bucket separate from daily and all-time', async () => {
    const posted = responseDouble()
    await leaderboardHandler({
      method: 'POST',
      headers: { 'x-forwarded-for': 'test-weekly' },
      body: { name: 'Fold', distance: 880, stars: 9, mode: 'normal', weekly: true },
    }, posted)
    expect(posted.statusCode).toBe(200)

    const weekly = responseDouble()
    await leaderboardHandler({ method: 'GET', query: { mode: 'normal', weekly: '1' } }, weekly)
    expect(weekly.payload.weekly).toBe(true)
    expect(weekly.payload.week).toMatch(/^\d{4}-W\d{2}$/)
    expect(weekly.payload.scores.map((row) => row.distance)).toEqual([880])

    const daily = responseDouble()
    await leaderboardHandler({ method: 'GET', query: { mode: 'normal', daily: '1' } }, daily)
    expect(daily.payload.scores).toEqual([])
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
