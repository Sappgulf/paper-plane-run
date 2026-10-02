import { getPaperPalette } from './paper-art.js'

const HEIGHTS = { city: 7, harbor: 10, storm: 16, sunset: 12, aurora: 20, midnight: 24 }
const SPAN = 360

/** Decorative terrain gets its own deterministic sequence, never the route RNG. */
export function landscapeLayers(zoneId, quality = 'high') {
  const palette = getPaperPalette(zoneId)
  const layerCount = quality === 'low' ? 1 : quality === 'medium' ? 2 : 3
  return Array.from({ length: layerCount }, (_, layer) => {
    const width = 22 + layer * 10
    const x = 40 + layer * 30
    const slots = []
    for (let side = -1; side <= 1; side += 2) {
      for (let index = 0; index < 8; index++) {
        const variation = ((index * 37 + layer * 11 + (side + 1) * 7) % 23) / 23
        slots.push({
          x: side * (x + variation * 6), z: index * 45 - 24 + layer * 17,
          width: width * (.85 + variation * .25),
          height: (HEIGHTS[zoneId] || HEIGHTS.city) * (1 + layer * .4) * (.75 + variation * .5),
          depth: 48, rotation: side * (.05 + variation * .08),
        })
      }
    }
    return { color: [palette.near, palette.mid, palette.far][layer], slots }
  })
}

export function scrollLandscapeZ(z, move) {
  const next = z - Math.max(0, Number.isFinite(move) ? move : 0)
  return ((next + 50) % SPAN + SPAN) % SPAN - 50
}
