/**
 * Compact shareable ghost challenges.
 *
 * A packed code carries enough to replay a friend's route: mode, kind,
 * the run seed, score, optional weekly fold, and a downsampled ghost path.
 * Path samples are quantized so a long flight still fits in a URL.
 */
import { foldById } from './weekly-fold.js'

export const CHALLENGE_KINDS = Object.freeze([
  'classic',
  'daily',
  'weekly',
  'timeattack',
  'coop',
  'hotseat',
])
export const CHALLENGE_MODES = Object.freeze(['easy', 'normal', 'hard'])

const VERSION = 1
const MAX_SAMPLES = 220
const MAX_NAME = 16
const MAX_CODE_CHARS = 1600

function toUrl64(bytes) {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromUrl64(code) {
  let s = String(code || '').replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function clampInt(value, min, max, fallback = 0) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.max(min, Math.min(max, Math.floor(number)))
}

function packCoord(value) {
  return Math.max(-128, Math.min(127, Math.round(Number(value) * 4)))
}

function unpackCoord(byte) {
  return (byte << 24 >> 24) / 4
}

export function packGhostPath(path, distance = 0) {
  if (!Array.isArray(path) || !path.length) {
    return { step: 8, samples: [] }
  }
  const span = Math.max(8, Number(distance) || path[path.length - 1]?.[0] || 8)
  const step = Math.max(8, Math.ceil(span / MAX_SAMPLES))
  const samples = []
  let nextAt = path[0][0]
  for (const sample of path) {
    const d = Number(sample?.[0])
    if (!Number.isFinite(d) || d + 0.01 < nextAt) continue
    samples.push([packCoord(sample[1]), packCoord(sample[2])])
    nextAt += step
    if (samples.length >= MAX_SAMPLES) break
  }
  return { step, samples }
}

export function unpackGhostPath(step, packedSamples) {
  const stride = Math.max(1, step | 0)
  const path = []
  for (let i = 0; i < packedSamples.length; i++) {
    const distance = i * stride
    path.push([
      distance,
      unpackCoord(packedSamples[i][0]),
      unpackCoord(packedSamples[i][1]),
      Number((distance / 42).toFixed(2)),
    ])
  }
  return path
}

function writeU16(bytes, offset, value) {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >> 8) & 0xff
}

function writeU32(bytes, offset, value) {
  bytes[offset] = value & 0xff
  bytes[offset + 1] = (value >> 8) & 0xff
  bytes[offset + 2] = (value >> 16) & 0xff
  bytes[offset + 3] = (value >> 24) & 0xff
}

function readU16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8)
}

function readU32(bytes, offset) {
  return (
    (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24))
    >>> 0
  )
}

export function encodeChallenge(input, { includePath = true } = {}) {
  const kindIndex = CHALLENGE_KINDS.indexOf(input?.kind)
  const modeIndex = CHALLENGE_MODES.indexOf(input?.mode)
  if (kindIndex < 0 || modeIndex < 0) return null
  const seed = clampInt(input.seed, 1, 0xffffffff, 1)
  const distance = clampInt(input.distance, 0, 65535)
  const stars = clampInt(input.stars, 0, 65535)
  const name = String(input.name || 'Pilot').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, MAX_NAME) || 'Pilot'
  const nameBytes = new TextEncoder().encode(name)
  const foldId = typeof input.foldId === 'string' ? input.foldId : ''
  const foldBytes = new TextEncoder().encode(foldId.slice(0, 24))
  const packed = includePath ? packGhostPath(input.path, distance) : { step: 8, samples: [] }

  const bytes = new Uint8Array(16 + nameBytes.length + 1 + foldBytes.length + packed.samples.length * 2)
  bytes[0] = VERSION
  bytes[1] = kindIndex
  bytes[2] = modeIndex
  writeU32(bytes, 3, seed)
  writeU16(bytes, 7, distance)
  writeU16(bytes, 9, stars)
  bytes[11] = packed.step & 0xff
  writeU16(bytes, 12, packed.samples.length)
  bytes[14] = nameBytes.length
  bytes[15] = foldBytes.length
  bytes.set(nameBytes, 16)
  bytes.set(foldBytes, 16 + nameBytes.length)
  let offset = 16 + nameBytes.length + foldBytes.length
  for (const sample of packed.samples) {
    bytes[offset] = sample[0] & 0xff
    bytes[offset + 1] = sample[1] & 0xff
    offset += 2
  }
  const code = toUrl64(bytes)
  if (includePath && code.length > MAX_CODE_CHARS) {
    return encodeChallenge(input, { includePath: false })
  }
  return code
}

export function decodeChallenge(code) {
  if (!code || typeof code !== 'string' || code.length > MAX_CODE_CHARS + 200) return null
  try {
    const bytes = fromUrl64(code)
    if (bytes.length < 16 || bytes[0] !== VERSION) return null
    const kind = CHALLENGE_KINDS[bytes[1]]
    const mode = CHALLENGE_MODES[bytes[2]]
    if (!kind || !mode) return null
    const seed = readU32(bytes, 3) || 1
    const distance = readU16(bytes, 7)
    const stars = readU16(bytes, 9)
    const step = Math.max(1, bytes[11] || 8)
    const sampleCount = readU16(bytes, 12)
    const nameLen = bytes[14]
    const foldLen = bytes[15]
    const headerEnd = 16 + nameLen + foldLen
    if (headerEnd + sampleCount * 2 > bytes.length || nameLen > MAX_NAME || foldLen > 24) return null
    const name = new TextDecoder().decode(bytes.slice(16, 16 + nameLen)).trim() || 'Pilot'
    const foldId = foldLen ? new TextDecoder().decode(bytes.slice(16 + nameLen, headerEnd)) : ''
    const packedSamples = []
    for (let i = 0; i < sampleCount; i++) {
      const at = headerEnd + i * 2
      packedSamples.push([bytes[at], bytes[at + 1]])
    }
    return Object.freeze({
      kind,
      mode,
      seed,
      distance,
      stars,
      name,
      foldId: foldById(foldId) ? foldId : '',
      path: unpackGhostPath(step, packedSamples),
    })
  } catch {
    return null
  }
}

export function describeChallenge(challenge) {
  if (!challenge) return ''
  const fold = foldById(challenge.foldId)
  const foldBit = fold ? ` · ${fold.icon} ${fold.name}` : ''
  return `Race ${challenge.name}'s ${challenge.distance}m ghost${foldBit}`
}
