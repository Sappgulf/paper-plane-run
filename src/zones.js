export const ZONES = [
  {
    id: 'city',
    name: 'Paper City',
    from: 0,
    fog: 0xc8dff5,
    hemiSky: 0xffe8d6,
    hemiGround: 0x8fb8d8,
    exposure: 1.05,
    hazardBias: { building: 1, bird: 1, scissors: 1 },
  },
  {
    id: 'harbor',
    name: 'Cloud Harbor',
    from: 280,
    fog: 0xb8d4e8,
    hemiSky: 0xe8f4ff,
    hemiGround: 0x9ec5e0,
    exposure: 1.12,
    hazardBias: { building: 0.7, bird: 1.4, scissors: 0.9 },
  },
  {
    id: 'storm',
    name: 'Storm Scrapyard',
    from: 650,
    fog: 0x8a9bb0,
    hemiSky: 0xc5c0d0,
    hemiGround: 0x6a7080,
    exposure: 0.92,
    hazardBias: { building: 1.2, bird: 1.1, scissors: 1.5 },
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
