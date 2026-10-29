import { afterAll, describe, expect, test } from 'vitest'
import { createHash, randomBytes } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createLeaderboardHandler } from '../api/leaderboard.js'
import { createLeaderboardStore } from '../src/server/leaderboard-store.js'
import { dailySeed } from '../src/rng.js'
import { weeklySeed } from '../src/game/weekly-fold.js'

const url = process.env.KV_REST_API_URL
const token = process.env.KV_REST_API_TOKEN
const prefix = `ppr:test:${randomBytes(12).toString('hex')}`
const ids = []
const address = `integration-${prefix}`
const rateAddress = `${address}-rate`
let clock = Date.parse('2026-10-29T12:00:00Z')
const store = url && token ? createLeaderboardStore({ url, token, prefix }) : null
const handler = createLeaderboardHandler({ getStore: () => store, now: () => clock })
function response() {
  return { statusCode: 200, setHeader() {}, status(code) { this.statusCode = code; return this }, json(payload) { this.payload = payload; return this }, end() { return this } }
}
async function request(method, body = {}, query = {}) {
  const res = response()
  await handler({ method, body, query, headers: { 'x-forwarded-for': address } }, res)
  return res
}
async function start(kind = 'classic', mode = 'normal') {
  const seed = kind === 'daily' ? dailySeed(mode, new Date(clock)) : kind === 'weekly' ? weeklySeed(mode, new Date(clock)) : undefined
  const res = await request('POST', { action: 'start', kind, mode, seed })
  expect(res.statusCode).toBe(201)
  ids.push(res.payload.runId)
  return res.payload.runId
}
async function redisCommand(...args) {
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
  if (!res.ok) throw new Error('test storage request failed')
  const payload = await res.json()
  if (payload.error) throw new Error('test storage command failed')
  return payload.result
}

afterAll(async () => {
  if (!store) return
  const digest = createHash('sha256').update(address).digest('hex')
  const rateDigest = createHash('sha256').update(rateAddress).digest('hex')
  const keys = [`${prefix}:rate:${digest}`, `${prefix}:rate:${rateDigest}`, `${prefix}:all:normal`, `${prefix}:all:hard`, `${prefix}:weekly:2026-W44:normal`, `${prefix}:daily:2026-10-29:hard`,
    ...ids.flatMap(id => [`${prefix}:run:${id}`, `${prefix}:receipt:${id}`])]
  await redisCommand('DEL', ...keys)
})

describe.skipIf(!store)('leaderboard against isolated Redis keys', () => {
  test('persists scores across store instances and isolates weekly, daily, and difficulty boards', async () => {
    const weekly = await start('weekly')
    clock += 20_000
    const finish = await request('POST', { action: 'finish', runId: weekly, name: '  Fold  ', distance: 880, stars: 9 })
    expect(finish.statusCode).toBe(200)
    const fresh = createLeaderboardStore({ url, token, prefix })
    const allRows = await fresh.read('normal', 'classic', '')
    expect(allRows).toMatchObject([{ name: 'Fold', distance: 880, stars: 9 }])
    expect(allRows[0]).not.toHaveProperty('id')
    const script = `import { createLeaderboardStore } from './src/server/leaderboard-store.js';
      const store = createLeaderboardStore({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN, prefix: process.env.PPR_TEST_PREFIX });
      console.log(JSON.stringify(await store.read('normal', 'classic', '')))`
    const child = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, PPR_TEST_PREFIX: prefix } })
    expect(JSON.parse(child.stdout)).toMatchObject([{ name: 'Fold', distance: 880 }])
    expect(await fresh.read('normal', 'weekly', '2026-W44')).toMatchObject([{ distance: 880 }])
    expect(await redisCommand('TTL', `${prefix}:all:normal`)).toBe(-1)
    expect(await redisCommand('TTL', `${prefix}:weekly:2026-W44:normal`)).toBeGreaterThan(89 * 86400)
    expect(await fresh.read('normal', 'daily', '2026-10-29')).toEqual([])
    expect(await fresh.read('hard', 'classic', '')).toEqual([])

    const daily = await start('daily', 'hard')
    clock += 20_000
    expect((await request('POST', { action: 'finish', runId: daily, name: 'Hard', distance: 600, stars: 3 })).statusCode).toBe(200)
    expect(await fresh.read('hard', 'daily', '2026-10-29')).toMatchObject([{ name: 'Hard' }])
  })

  test('commits concurrent retries once and rejects a modified replay', async () => {
    const runId = await start()
    clock += 15_000
    const body = { action: 'finish', runId, name: 'Retry', distance: 500, stars: 4 }
    const results = await Promise.all([request('POST', body), request('POST', body)])
    expect(results.map(result => result.statusCode)).toEqual([200, 200])
    const rows = await store.read('normal', 'classic', '')
    expect(rows.filter(row => row.name === 'Retry')).toHaveLength(1)
    expect((await request('POST', { ...body, distance: 900 })).statusCode).toBe(400)
  })

  test('resumes a partially written submission without duplicating or accepting a changed score', async () => {
    const runId = await start()
    const raw = await store.getRun(runId)
    const run = JSON.parse(raw)
    const body = { action: 'finish', runId, name: 'Partial', distance: 650, stars: 4 }
    const hash = createHash('sha256').update(JSON.stringify([runId, body.name, body.distance, body.stars])).digest('hex')
    const entry = { name: body.name, distance: body.distance, stars: body.stars, mode: 'normal', daily: false, weekly: false, at: run.startedAt, id: runId }
    await redisCommand('SET', `${prefix}:receipt:${runId}`, `p:${hash}`, 'EX', 120)
    await redisCommand('ZADD', `${prefix}:all:normal`, body.distance * 1_000_001 + body.stars, JSON.stringify(entry))
    clock += 1000
    expect((await request('POST', { ...body, stars: 5 })).statusCode).toBe(400)
    expect((await request('POST', body)).statusCode).toBe(200)
    expect((await store.read('normal', 'classic', '')).filter(row => row.name === 'Partial')).toHaveLength(1)
  })

  test('rejects malformed and implausible scores without consuming the run', async () => {
    const runId = await start()
    expect((await request('POST', { action: 'finish', runId, name: 'Pilot', distance: '12', stars: 2 })).statusCode).toBe(400)
    expect((await request('POST', { action: 'finish', runId, name: 'Pilot', distance: 200_000, stars: 2 })).statusCode).toBe(400)
    clock += 20_000
    expect((await request('POST', { action: 'finish', runId, name: 'Pilot', distance: 700, stars: 2 })).statusCode).toBe(200)
  })

  test('orders distance first and uses stars as the tiebreaker', async () => {
    for (const [name, distance, stars] of [['Short', 1100, 99], ['Long', 1200, 1], ['Tie', 1200, 9]]) {
      const runId = await start()
      clock += 1000
      expect((await request('POST', { action: 'finish', runId, name, distance, stars })).statusCode).toBe(200)
    }
    expect((await store.read('normal', 'classic', '')).slice(0, 3).map(row => row.name)).toEqual(['Tie', 'Long', 'Short'])
  })

  test('keeps a run in the week in which it began', async () => {
    clock = Date.parse('2026-11-01T23:59:50Z')
    const runId = await start('weekly')
    clock += 20_000
    expect((await request('POST', { action: 'finish', runId, name: 'Boundary', distance: 400, stars: 1 })).statusCode).toBe(200)
    expect((await store.read('normal', 'weekly', '2026-W44')).some(row => row.name === 'Boundary')).toBe(true)
    expect(await store.read('normal', 'weekly', '2026-W45')).toEqual([])
  })

  test('shares a single rate limit across store instances', async () => {
    const fresh = createLeaderboardStore({ url, token, prefix })
    const decisions = await Promise.all(Array.from({ length: 61 }, (_, i) => (i % 2 ? store : fresh).rateLimit(rateAddress)))
    expect(decisions.filter(Boolean)).toHaveLength(60)
    expect(decisions.filter(value => !value)).toHaveLength(1)
  })
})
