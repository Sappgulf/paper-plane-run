/**
 * Calendar-driven themes for birds, stars, fog accents, free skins.
 */
export function getSeason(date = new Date(), force = 'auto') {
  if (force && force !== 'auto') return force
  const m = date.getMonth()
  const d = date.getDate()
  // Halloween window
  if ((m === 9 && d >= 15) || (m === 10 && d <= 2)) return 'halloween'
  // Winter / holidays
  if (m === 11 || (m === 0 && d <= 7)) return 'winter'
  // Valentine
  if (m === 1 && d >= 7 && d <= 16) return 'valentine'
  // Spring
  if ((m === 2 && d >= 15) || (m === 3 && d <= 20)) return 'spring'
  // Summer vibes mid-year
  if (m >= 5 && m <= 7) return 'summer'
  return 'default'
}

export const SEASON_META = {
  default: {
    id: 'default',
    name: 'Paper Season',
    birdColor: 0x4a3f3a,
    starColor: 0xfbbf24,
    starEmissive: 0xf59e0b,
    fogBoost: null,
    freeSkin: null,
    birdLabel: 'birds',
  },
  halloween: {
    id: 'halloween',
    name: 'Spooky Scrap',
    birdColor: 0x1a1a1a,
    starColor: 0xff6b00,
    starEmissive: 0xff4500,
    fogBoost: 0x3d2a4a,
    freeSkin: 'halloween',
    birdLabel: 'bats',
  },
  winter: {
    id: 'winter',
    name: 'Snowfold',
    birdColor: 0x64748b,
    starColor: 0xe0f2fe,
    starEmissive: 0x7dd3fc,
    fogBoost: 0xb8d4e8,
    freeSkin: 'winter',
    birdLabel: 'flakes',
  },
  valentine: {
    id: 'valentine',
    name: 'Love Notes',
    birdColor: 0xbe123c,
    starColor: 0xfb7185,
    starEmissive: 0xe11d48,
    fogBoost: 0xffd6e0,
    freeSkin: 'valentine',
    birdLabel: 'hearts',
  },
  spring: {
    id: 'spring',
    name: 'Blossom Run',
    birdColor: 0x65a30d,
    starColor: 0xf9a8d4,
    starEmissive: 0xec4899,
    fogBoost: 0xd8f5e8,
    freeSkin: 'spring',
    birdLabel: 'petals',
  },
  summer: {
    id: 'summer',
    name: 'Sunfold',
    birdColor: 0x0e7490,
    starColor: 0xfde047,
    starEmissive: 0xfacc15,
    fogBoost: 0xffe8b0,
    freeSkin: null,
    birdLabel: 'gulls',
  },
}

export function seasonInfo(force = 'auto') {
  const id = getSeason(new Date(), force)
  return SEASON_META[id] || SEASON_META.default
}
