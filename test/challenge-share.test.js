import { describe, expect, test } from 'vitest'
import { decodeChallenge, describeChallenge, encodeChallenge, packGhostPath } from '../src/game/challenge-share.js'

function samplePath(distance = 400) {
  const path = []
  for (let d = 0; d <= distance; d += 2) {
    path.push([d, Math.sin(d / 20) * 6, 8 + Math.cos(d / 30) * 2, d / 42])
  }
  return path
}

describe('challenge share codec', () => {
  test('round-trips seed, score, fold, and a downsampled ghost', () => {
    const path = samplePath(480)
    const code = encodeChallenge({
      kind: 'weekly',
      mode: 'normal',
      seed: 123456789,
      distance: 480,
      stars: 17,
      name: 'Milo',
      foldId: 'harbor-week',
      path,
    })
    expect(code).toBeTruthy()
    expect(code.length).toBeLessThan(1600)
    const decoded = decodeChallenge(code)
    expect(decoded).toMatchObject({
      kind: 'weekly',
      mode: 'normal',
      seed: 123456789,
      distance: 480,
      stars: 17,
      name: 'Milo',
      foldId: 'harbor-week',
    })
    expect(decoded.path.length).toBeGreaterThan(10)
    expect(Math.abs(decoded.path[3][1])).toBeLessThanOrEqual(16)
    expect(describeChallenge(decoded)).toMatch(/Race Milo's 480m ghost/)
    expect(describeChallenge(decoded)).toMatch(/Harbor Week/)
  })

  test('rejects garbage and unknown kinds', () => {
    expect(decodeChallenge('')).toBeNull()
    expect(decodeChallenge('!!!!')).toBeNull()
    expect(encodeChallenge({ kind: 'journey', mode: 'normal', seed: 1 })).toBeNull()
  })

  test('drops an oversized path rather than overflowing the URL', () => {
    const packed = packGhostPath(samplePath(8000), 8000)
    expect(packed.samples.length).toBeLessThanOrEqual(220)
    const code = encodeChallenge({
      kind: 'classic',
      mode: 'hard',
      seed: 99,
      distance: 8000,
      stars: 40,
      name: 'Pip',
      path: samplePath(8000),
    })
    expect(code.length).toBeLessThanOrEqual(1600)
    const decoded = decodeChallenge(code)
    expect(decoded.distance).toBe(8000)
    expect(decoded.seed).toBe(99)
  })

  test('strips control characters from the pilot name', () => {
    const code = encodeChallenge({
      kind: 'classic',
      mode: 'easy',
      seed: 7,
      distance: 12,
      stars: 1,
      name: '  A\u0000<b>  ',
      path: [],
    })
    expect(decodeChallenge(code).name).toBe('A <b>')
  })
})
