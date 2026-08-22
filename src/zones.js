/**
 * Progressive endless zones — sky + ground art change as distance grows.
 */
export const ZONES = [
  {
    id: 'city',
    name: 'Paper City',
    from: 0,
    fog: 0xc5dcf0,
    hemiSky: 0xffefe0,
    hemiGround: 0x7aa8c8,
    exposure: 1.05,
    sky: '/assets/sky-city.jpg',
    ground: '/assets/ground-city.jpg',
    groundTint: 0xe9ddcf,
    hazardBias: { building: 1, bird: 1, scissors: 1 },
  },
  {
    id: 'harbor',
    name: 'Cloud Harbor',
    from: 220,
    fog: 0xc8e4f4,
    hemiSky: 0xf2fbff,
    hemiGround: 0x7eb8d4,
    exposure: 1.16,
    sky: '/assets/sky-harbor.jpg',
    ground: '/assets/ground-harbor.jpg',
    groundTint: 0xd8eef6,
    hazardBias: { building: 0.7, bird: 1.4, scissors: 0.9 },
  },
  {
    id: 'storm',
    name: 'Storm Scrapyard',
    from: 480,
    fog: 0xb4a8c4,
    hemiSky: 0xe4d8f0,
    hemiGround: 0x7a7088,
    exposure: 1.06,
    sky: '/assets/sky-storm.jpg',
    ground: '/assets/ground-storm.jpg',
    groundTint: 0xc4b4c8,
    nightReadability: true,
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
    groundTint: 0xf3c8a4,
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
    groundTint: 0xb8c8c4,
    hazardBias: { building: 1.3, bird: 1.3, scissors: 1.4 },
  },
  {
    id: 'midnight',
    name: 'Midnight Origami',
    from: 1700,
    fog: 0x7a72a8,
    hemiSky: 0xd4c8ff,
    hemiGround: 0x4a4570,
    exposure: 1.18,
    sky: '/assets/sky-midnight.jpg',
    ground: '/assets/ground-midnight.jpg',
    groundTint: 0x9a90c4,
    nightReadability: true,
    hazardBias: { building: 1.35, bird: 1.45, scissors: 1.35 },
  },
]

/**
 * Meters of Midnight Origami before the route folds back to Paper City. The
 * last zone gets a longer stretch than the others because it is the payoff of
 * a first full lap, not a waypoint.
 */
export const FINAL_ZONE_SPAN = 700

/** Total distance of one full City → Midnight lap. */
export const ZONE_LOOP_SPAN = ZONES[ZONES.length - 1].from + FINAL_ZONE_SPAN

/**
 * Endless zone lookup. The authored `from` table only covers the first lap;
 * past it the route cycles so the sky, ground and music keep turning over
 * instead of freezing on Midnight Origami forever. `lap` counts completed
 * cycles, which callers use to tell "same zone again" from "no change" and to
 * label repeat visits.
 */
export function cyclicZoneAt(distance) {
  const meters = Math.max(0, Number(distance) || 0)
  const lap = Math.floor(meters / ZONE_LOOP_SPAN)
  const local = meters - lap * ZONE_LOOP_SPAN
  return { zone: zoneAt(local), lap, localDistance: local }
}

/** Zone progress that keeps counting down to the next zone across laps. */
export function cyclicZoneProgress(distance) {
  const { zone, lap, localDistance } = cyclicZoneAt(distance)
  const visual = lap * ZONE_LOOP_SPAN + localDistance
  const next = nextZone(localDistance)
  if (next) {
    const span = Math.max(1, next.from - zone.from)
    const nextAt = lap * ZONE_LOOP_SPAN + next.from
    return {
      zone,
      lap,
      t: Math.min(1, Math.max(0, (localDistance - zone.from) / span)),
      next,
      nextAt,
      remain: Math.max(0, nextAt - visual),
    }
  }
  // Final zone of the lap — the countdown wraps to Paper City on the next lap.
  const span = Math.max(1, ZONE_LOOP_SPAN - zone.from)
  const nextAt = (lap + 1) * ZONE_LOOP_SPAN
  return {
    zone,
    lap,
    t: Math.min(1, Math.max(0, (localDistance - zone.from) / span)),
    next: ZONES[0],
    nextAt,
    remain: Math.max(0, nextAt - visual),
  }
}

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
