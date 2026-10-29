import { createHash, randomBytes } from 'node:crypto'

const RUN_TTL = 48 * 60 * 60
const PERIOD_TTL = 90 * 24 * 60 * 60
const COMMIT_SCRIPT = `
local prior = redis.call('GET', KEYS[2])
if prior then
  if prior == 'c:' .. ARGV[2] then return 2 end
  if prior ~= 'p:' .. ARGV[2] then return -1 end
end
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
if not prior then redis.call('SET', KEYS[2], 'p:' .. ARGV[2], 'EX', ARGV[6]) end
redis.call('ZADD', KEYS[3], ARGV[3], ARGV[4])
redis.call('ZREMRANGEBYRANK', KEYS[3], 0, -101)
if KEYS[4] ~= '' then
  redis.call('ZADD', KEYS[4], ARGV[3], ARGV[4])
  redis.call('ZREMRANGEBYRANK', KEYS[4], 0, -31)
  redis.call('EXPIRE', KEYS[4], ARGV[5])
end
redis.call('SET', KEYS[2], 'c:' .. ARGV[2], 'EX', ARGV[6])
redis.call('DEL', KEYS[1])
return 1`
const RATE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], 60) end
return count`

/** Upstash's REST API is the durable store. The namespace is injectable so
 * integration tests can use disposable keys without touching public scores. */
export function createLeaderboardStore({ url, token, prefix = 'ppr:leaderboard:v1', fetchImpl = fetch }) {
  if (!url || !token) throw new Error('leaderboard storage is not configured')
  const root = String(url).replace(/\/+$/, '')
  async function command(...args) {
    const response = await fetchImpl(root, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error('leaderboard storage request failed')
    const payload = await response.json()
    if (payload.error) throw new Error('leaderboard storage command failed')
    return payload.result
  }
  const key = (suffix) => `${prefix}:${suffix}`
  const boardKey = (mode, kind, period) => key(kind === 'classic' ? `all:${mode}` : `${kind}:${period}:${mode}`)
  return {
    async rateLimit(ip) {
      const digest = createHash('sha256').update(ip).digest('hex')
      const count = await command('EVAL', RATE_SCRIPT, 1, key(`rate:${digest}`))
      return Number(count) <= 60
    },
    async issue(run) {
      const id = randomBytes(24).toString('base64url')
      const raw = JSON.stringify(run)
      const result = await command('SET', key(`run:${id}`), raw, 'EX', RUN_TTL, 'NX')
      if (result !== 'OK') throw new Error('could not create run')
      return id
    },
    async getRun(id) {
      return await command('GET', key(`run:${id}`))
    },
    async getReceipt(id) {
      return await command('GET', key(`receipt:${id}`))
    },
    async commit({ id, rawRun, fingerprint, score, entry, run }) {
      const all = boardKey(run.mode, 'classic')
      const period = run.kind === 'classic' ? '' : boardKey(run.mode, run.kind, run.period)
      const result = await command('EVAL', COMMIT_SCRIPT, 4, key(`run:${id}`), key(`receipt:${id}`), all, period,
        rawRun, fingerprint, score, JSON.stringify(entry), PERIOD_TTL, RUN_TTL)
      return Number(result)
    },
    async read(mode, kind, period) {
      const rows = await command('ZREVRANGE', boardKey(mode, kind, period), 0, 14)
      if (!Array.isArray(rows)) throw new Error('invalid leaderboard response')
      return rows.map((row) => {
        const { id, ...publicScore } = JSON.parse(row)
        return publicScore
      })
    },
  }
}
