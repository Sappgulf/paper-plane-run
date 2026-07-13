export const POSTCARD_STORAGE_KEY = 'paper-plane-run-postcards-v1'

export function loadPostcardAlbum(storage = localStorage) {
  try {
    const cards = JSON.parse(storage.getItem(POSTCARD_STORAGE_KEY) || '[]')
    return Array.isArray(cards) ? cards : []
  } catch { return [] }
}

export function savePostcardOnce(storage = localStorage, postcard) {
  if (!postcard?.id) return false
  const cards = loadPostcardAlbum(storage)
  if (cards.some((card) => card.id === postcard.id)) return false
  storage.setItem(POSTCARD_STORAGE_KEY, JSON.stringify([postcard, ...cards].slice(0, 50)))
  return true
}
