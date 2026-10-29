import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  getLocalTop,
  fetchRemoteTop,
  getWeeklyTop,
  startRemoteRun,
  submitLocalScore,
  submitRemoteScore,
} from '../src/leaderboard.js'

describe('leaderboards', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => vi.unstubAllGlobals())

  test('submits a score against its run ticket and retries a lost response', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('connection lost')).mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
    vi.stubGlobal('fetch', fetchMock)
    const result = await submitRemoteScore({ runId: 'a'.repeat(32), name: 'Fold', distance: 42, stars: 2 })
    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const bodies = fetchMock.mock.calls.map(([, options]) => JSON.parse(options.body))
    expect(bodies).toEqual([
      { action: 'finish', runId: 'a'.repeat(32), name: 'Fold', distance: 42, stars: 2 },
      { action: 'finish', runId: 'a'.repeat(32), name: 'Fold', distance: 42, stars: 2 },
    ])
  })

  test('starts a daily run with its route seed and fails safely on a rejected score', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ runId: 'b'.repeat(32) }) })
      .mockResolvedValueOnce({ ok: false, status: 400 })
    vi.stubGlobal('fetch', fetchMock)
    const runId = await startRemoteRun({ kind: 'daily', mode: 'normal', seed: 123 })
    expect(runId).toBe('b'.repeat(32))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ action: 'start', kind: 'daily', mode: 'normal', seed: 123 })
    expect(await submitRemoteScore({ runId, name: 'Fold', distance: 99, stars: 1 })).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test('treats a malformed online leaderboard response as unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ scores: 'invalid' }) }))
    expect(await fetchRemoteTop('normal', { daily: true })).toBeNull()
  })

  test('keeps a weekly board separate from the daily list', () => {
    submitLocalScore({
      name: 'Fold',
      distance: 900,
      stars: 11,
      mode: 'normal',
      weekly: true,
      weeklyKey: '2026-W34',
    })
    expect(getWeeklyTop('2026-W34', 'normal').map((row) => row.distance)).toEqual([900])
    expect(getWeeklyTop('2026-W33', 'normal')).toEqual([])
  })

  test('normalizes names and numeric scores at the storage boundary', () => {
    submitLocalScore({
      name: '  <img src=x>\u0000  ',
      distance: '42.9',
      stars: '-3.4',
      mode: 'unknown',
    })

    expect(getLocalTop()).toEqual([
      expect.objectContaining({
        name: '<img src=x>',
        distance: 42,
        stars: 0,
        mode: 'normal',
      }),
    ])
  })
})
