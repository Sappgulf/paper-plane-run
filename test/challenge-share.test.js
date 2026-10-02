import { describe, expect, test } from 'vitest'
import { CHALLENGE_KINDS, CHALLENGE_MODES, decodeChallenge, describeChallenge, encodeChallenge, packGhostPath } from '../src/game/challenge-share.js'

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

  test('round-trips a 60 km run without wrapping the step', () => {
    const distance = 60000
    const code = encodeChallenge({
      kind: 'classic',
      mode: 'normal',
      seed: 424242,
      distance,
      stars: 9,
      name: 'Long Hauler',
      path: samplePath(distance),
    })
    expect(code).toBeTruthy()
    const decoded = decodeChallenge(code)
    expect(decoded.distance).toBe(60000)
    const stride = decoded.path[1][0] - decoded.path[0][0]
    expect(stride).toBe(Math.ceil(distance / 220))
    expect(stride).toBeGreaterThan(255)
    expect(decoded.path[decoded.path.length - 1][0]).toBeLessThan(distance)
  })

  test('still decodes legacy version-1 payloads with a single-byte step', () => {
    const nameBytes = new TextEncoder().encode('Retro')
    const samples = [10, -20, 30, 40]
    const bytes = new Uint8Array(16 + nameBytes.length + samples.length)
    bytes[0] = 1
    bytes[1] = CHALLENGE_KINDS.indexOf('classic')
    bytes[2] = CHALLENGE_MODES.indexOf('hard')
    bytes[3] = 7
    bytes[7] = 300
    bytes[8] = 1
    bytes[9] = 5
    bytes[11] = 16
    bytes[12] = 2
    bytes[14] = nameBytes.length
    bytes[15] = 0
    bytes.set(nameBytes, 16)
    bytes.set(samples, 16 + nameBytes.length)

    let bin = ''
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
    const code = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    const decoded = decodeChallenge(code)
    expect(decoded).toMatchObject({
      kind: 'classic',
      mode: 'hard',
      seed: 7,
      distance: 300,
      stars: 5,
      name: 'Retro',
    })
    expect(decoded.path).toEqual([
      [0, 2.5, -5, 0],
      [16, 7.5, 10, 0.38],
    ])
  })
})
