/**
 * Progressive endless zones — sky + ground art change as distance grows.
 */
export const ZONES = [
  {
    id: 'city',
    name: 'Paper City',
    from: 0,
    fog: 0xc8dff5,
    hemiSky: 0xffe8d6,
    hemiGround: 0x8fb8d8,
    exposure: 1.05,
    sky: '/assets/sky-city.jpg',
    ground: '/assets/ground-city.jpg',
    groundTint: 0xf2e6d8,
    hazardBias: { building: 1, bird: 1, scissors: 1 },
  },
  {
    id: 'harbor',
    name: 'Cloud Harbor',
    from: 220,
    fog: 0xb8d4e8,
    hemiSky: 0xe8f4ff,
    hemiGround: 0x9ec5e0,
    exposure: 1.12,
    sky: '/assets/sky-harbor.jpg',
    ground: '/assets/ground-harbor.jpg',
    groundTint: 0xdceef8,
    hazardBias: { building: 0.7, bird: 1.4, scissors: 0.9 },
  },
  {
    id: 'storm',
    name: 'Storm Scrapyard',
    from: 480,
    fog: 0x8a9bb0,
    hemiSky: 0xc5c0d0,
    hemiGround: 0x6a7080,
    exposure: 0.92,
    sky: '/assets/sky-storm.jpg',
    ground: '/assets/ground-storm.jpg',
    groundTint: 0x9a8f9e,
    hazardBias: { building: 1.2, bird: 1.1, scissors: 1.5 },
  },
  {
    id: 'sunset',
    name: 'Golden Fold',
    from: 800,
    fog: 0xe8b89a,
    hemiSky: 0xffd4b8,
    hemiGround: 0xc4846a,
    exposure: 1.08,
    sky: '/assets/sky-sunset.jpg',
    ground: '/assets/ground-sunset.jpg',
    groundTint: 0xf0c4a8,
    hazardBias: { building: 1.1, bird: 1.2, scissors: 1.2 },
  },
  {
    id: 'aurora',
    name: 'Aurora Washi',
    from: 1200,
    fog: 0x6a7ab0,
    hemiSky: 0xc8d4ff,
    hemiGround: 0x4a5568,
    exposure: 1.0,
    sky: '/assets/sky-aurora.jpg',
    ground: '/assets/ground-aurora.jpg',
    groundTint: 0x8a90b0,
    hazardBias: { building: 1.3, bird: 1.3, scissors: 1.4 },
  },
  {
    id: 'midnight',
    name: 'Midnight Origami',
    from: 1700,
    fog: 0x1e1b3a,
    hemiSky: 0x3b2f6b,
    hemiGround: 0x1a1628,
    exposure: 0.88,
    sky: '/assets/sky-midnight.jpg',
    ground: '/assets/ground-midnight.jpg',
    groundTint: 0x2a2440,
    hazardBias: { building: 1.35, bird: 1.45, scissors: 1.35 },
  },
]

export function zoneAt(distance) {
  let z = ZONES[0]
  for (const zone of ZONES) {
    if (distance >= zone.from) z = zone
  }
  return z
}

export function nextZone(distance) {
  for (const zone of ZONES) {
    if (zone.from > distance) return zone
  }
  return null
}

export function zoneProgress(distance) {
  const cur = zoneAt(distance)
  const nxt = nextZone(distance)
  if (!nxt) return { zone: cur, t: 1, next: null }
  const span = nxt.from - cur.from
  const t = span > 0 ? Math.min(1, Math.max(0, (distance - cur.from) / span)) : 1
  return { zone: cur, t, next: nxt }
}
