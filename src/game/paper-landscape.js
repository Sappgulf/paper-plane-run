import { getPaperPalette } from './paper-art.js'

const HEIGHTS = { city: 7, harbor: 10, storm: 16, sunset: 12, aurora: 20, midnight: 24 }
const SPAN = 360

export const ZONE_VISTAS = Object.freeze({
  city: ['house', 'tree'], harbor: ['lighthouse', 'sailboat'],
  storm: ['windmill', 'crystal'], sunset: ['house', 'windmill'],
  aurora: ['crystal', 'tree'], midnight: ['book', 'lighthouse'],
})

export function vistaLayers(zoneId, quality = 'high') {
  const palette = getPaperPalette(zoneId)
  const kinds = ZONE_VISTAS[zoneId] || ZONE_VISTAS.city
  const count = quality === 'low' ? 4 : quality === 'medium' ? 6 : 8
  return kinds.map((kind, layer) => ({
    kind, color: layer ? palette.near : palette.paper,
    slots: Array.from({ length: count }, (_, index) => {
      const side = index%2 ? 1 : -1
      const variation = ((index*31+layer*17)%29)/29
      return {
        // Vistas sit wider and smaller than they used to: at 36 units a house
        // filled the frame as a blank cream wall while it passed the camera.
        x: side*(44+layer*12+variation*4), z: Math.floor(index/2)*76+layer*32,
        width: 4+variation*2.4, height: kind === 'sailboat' ? 7 : 5+variation*4,
        depth: 5+variation*2, rotation: side*.16,
      }
    }),
  }))
}

/** Decorative terrain gets its own deterministic sequence, never the route RNG. */
export function landscapeLayers(zoneId, quality = 'high') {
  const palette = getPaperPalette(zoneId)
  const layerCount = quality === 'low' ? 1 : quality === 'medium' ? 2 : 3
  return Array.from({ length: layerCount }, (_, layer) => {
    const width = 22 + layer * 10
    const x = 44 + layer * 30
    const slots = []
    for (let side = -1; side <= 1; side += 2) {
      for (let index = 0; index < 8; index++) {
        const variation = ((index * 37 + layer * 11 + (side + 1) * 7) % 23) / 23
        // A separate hash for height so tall and low peaks do not follow the spacing.
        const peak = ((index * 13 + layer * 5 + (side + 1) * 3) % 9) / 8
        slots.push({
          x: side * (x + variation * 6), z: index * 45 - 24 + layer * 17,
          width: width * (.85 + variation * .25),
          height: (HEIGHTS[zoneId] || HEIGHTS.city) * (1 + layer * .4) * (.6 + peak * .7),
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
