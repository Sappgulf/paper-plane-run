export const POSTCARD_STORAGE_KEY = 'paper-plane-run-postcards-v1'

const DESTINATIONS = new Set(['city', 'harbor', 'storm', 'aurora'])

export function normalizePostcard(card) {
  if (!card || typeof card.id !== 'string' || !card.id || typeof card.journeyId !== 'string' || !card.journeyId) return null
  const routePath = Array.isArray(card.routePath) ? card.routePath.filter((route) => typeof route === 'string') : []
  const derivedArtwork = routePath.at(-1)?.split('-')[0] || 'city'
  return {
    ...card,
    routePath,
    stampIds: Array.isArray(card.stampIds) ? card.stampIds.filter((stamp) => typeof stamp === 'string') : [],
    artworkId: DESTINATIONS.has(card.artworkId) ? card.artworkId : (DESTINATIONS.has(derivedArtwork) ? derivedArtwork : 'city'),
    objectiveResults: Array.isArray(card.objectiveResults) ? card.objectiveResults.filter(Boolean) : [],
    masteryLevel: Math.min(3, Math.max(0, Math.trunc(Number(card.masteryLevel) || 0))),
    decorationIds: Array.isArray(card.decorationIds) ? card.decorationIds.filter((id) => typeof id === 'string') : [],
    totalDistance: Math.max(0, Math.trunc(Number(card.totalDistance) || 0)),
    totalStars: Math.max(0, Math.trunc(Number(card.totalStars) || 0)),
    rivalBeaten: !!card.rivalBeaten,
    perfect: !!card.perfect,
  }
}

export function loadPostcardAlbum(storage = localStorage) {
  try {
    const cards = JSON.parse(storage.getItem(POSTCARD_STORAGE_KEY) || '[]')
    return Array.isArray(cards) ? cards.map(normalizePostcard).filter(Boolean) : []
  } catch { return [] }
}

export function savePostcardOnce(storage = localStorage, postcard) {
  const normalized = normalizePostcard(postcard)
  if (!normalized) return false
  const cards = loadPostcardAlbum(storage)
  if (cards.some((card) => card.id === normalized.id)) return false
  storage.setItem(POSTCARD_STORAGE_KEY, JSON.stringify([normalized, ...cards].slice(0, 50)))
  return true
}

export function buildPostcardShareModel(card, url = 'https://paper-plane-run.vercel.app') {
  const postcard = normalizePostcard(card)
  if (!postcard) return null
  const pilot = postcard.pilotId === 'daredevil' ? 'Pip' : 'Milo'
  const route = postcard.routePath.map((id) => id.split('-')[0]).join(' → ') || 'Paper Skies'
  const rival = postcard.rivalBeaten ? ' · Beat Red Dart!' : ''
  return {
    title: 'Paper Plane Run Journey Postcard',
    text: `${pilot} flew ${route} · ${postcard.totalDistance.toLocaleString('en-US')}m · ${postcard.totalStars}★${rival}`,
    url,
  }
}
