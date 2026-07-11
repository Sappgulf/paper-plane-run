import { encodeLayout, decodeLayout } from './rng.js'

/**
 * Layout format:
 * { v:1, name, items: [{ t:'building'|'bird'|'scissors'|'star'|'power', x, y, z, ... }] }
 */
export function emptyLayout(name = 'My Route') {
  return { v: 1, name, items: [] }
}

export function layoutToShareCode(layout) {
  return encodeLayout(layout)
}

export function layoutFromShareCode(code) {
  const L = decodeLayout(code)
  if (!L || L.v !== 1 || !Array.isArray(L.items)) return null
  return L
}

export function serializeCompact(layout) {
  // Short form for URLs: type codes
  const map = { building: 'B', bird: 'R', scissors: 'S', star: 'T', power: 'P' }
  const parts = layout.items.map((it) => {
    const t = map[it.t] || '?'
    return `${t}${it.x.toFixed(1)},${(it.y || 0).toFixed(1)},${it.z.toFixed(1)}`
  })
  return `L1|${encodeURIComponent(layout.name || 'Route')}|${parts.join(';')}`
}

export function parseCompact(str) {
  if (!str?.startsWith('L1|')) return layoutFromShareCode(str)
  try {
    const [, nameEnc, rest] = str.split('|')
    const rev = { B: 'building', R: 'bird', S: 'scissors', T: 'star', P: 'power' }
    const items = (rest || '').split(';').filter(Boolean).map((p) => {
      const t = rev[p[0]]
      const [x, y, z] = p.slice(1).split(',').map(Number)
      return { t, x, y, z }
    })
    return { v: 1, name: decodeURIComponent(nameEnc || 'Route'), items }
  } catch {
    return null
  }
}

export const EDITOR_PALETTE = [
  { t: 'building', label: '🏢 Building' },
  { t: 'bird', label: '🐦 Bird' },
  { t: 'scissors', label: '✂️ Scissors' },
  { t: 'star', label: '⭐ Star' },
  { t: 'power', label: '💎 Power' },
]
