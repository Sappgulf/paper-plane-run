export const LEADERBOARD_MODES = Object.freeze(['easy', 'normal', 'hard'])

const CONTROL_CHARACTER_RE = /[\u0000-\u001f\u007f]/g

export function isLeaderboardMode(value) {
  return typeof value === 'string' && LEADERBOARD_MODES.includes(value)
}

export function normalizeLeaderboardMode(value, fallback = 'normal') {
  return isLeaderboardMode(value) ? value : fallback
}

export function normalizeLeaderboardName(value) {
  const normalized = String(value ?? '')
    .replace(CONTROL_CHARACTER_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16)

  return normalized || 'Pilot'
}

export function normalizeLeaderboardInteger(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback
}
