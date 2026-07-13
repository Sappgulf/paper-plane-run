export const JOURNEY_ART = Object.freeze({
  city: Object.freeze({
    id: 'city',
    name: 'Paper City Rooftops',
    src: '/assets/journey/city-postcard.webp',
    alt: 'A cream paper plane gliding over warm handcrafted paper city rooftops at sunrise.',
    icon: '🏙️',
    palette: 'apricot',
  }),
  harbor: Object.freeze({
    id: 'harbor',
    name: 'Harbor Crossing',
    src: '/assets/journey/harbor-postcard.webp',
    alt: 'A paper plane threading glowing rings above layered paper waves and a miniature harbor.',
    icon: '⚓',
    palette: 'seafoam',
  }),
  storm: Object.freeze({
    id: 'storm',
    name: 'Storm Front',
    src: '/assets/journey/storm-postcard.webp',
    alt: 'A paper plane finding a golden opening through deep layered paper storm clouds.',
    icon: '⛈️',
    palette: 'indigo',
  }),
  aurora: Object.freeze({
    id: 'aurora',
    name: 'Aurora Showdown',
    src: '/assets/journey/aurora-postcard.webp',
    alt: 'A cream paper plane racing a red paper dart beneath a luminous cut-paper aurora.',
    icon: '🌌',
    palette: 'aurora',
  }),
})

export function getJourneyArtwork(destinationId) {
  return JOURNEY_ART[destinationId] || JOURNEY_ART.city
}
