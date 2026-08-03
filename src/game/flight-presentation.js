export const FLIGHT_PRESENTATION_IDS = Object.freeze([
  'hud',
  'pause-overlay',
  'pause-btn',
  'wind-banner',
  'power-banner',
  'zone-banner',
  'boost-safety-cue',
  'magnet-pull-trail',
  'tutorial-hint',
  'combo-float',
  'fever-hud',
  'power-hud',
  'combo-hud',
  'streak-hud',
  'flight-route',
  'flight-focus',
  'flight-feedback',
  'challenge-toast',
  'next-zone-hud',
  'ghost-delta-hud',
  'guardian-hud',
  'journey-objective-hud',
  'timeattack-hud',
  'coop-hud',
  'hotseat-hud',
  'stick-zone',
  'wind-stick-zone',
  'fire-btn',
])

/**
 * Clear transient flight UI before a shell transition or terminal recap.
 * Keeping this DOM cleanup in one place prevents a banner or HUD chip from
 * surviving after its owning run has ended.
 */
export function clearFlightPresentation(doc = globalThis.document) {
  if (!doc) return

  for (const id of FLIGHT_PRESENTATION_IDS) {
    doc.getElementById(id)?.classList.add('hidden')
  }

  const speedFx = doc.getElementById('speed-fx')
  if (speedFx) speedFx.style.opacity = '0'

  const magnetPullTrail = doc.getElementById('magnet-pull-trail')
  if (magnetPullTrail) magnetPullTrail.dataset.active = 'false'

  const feverFx = doc.getElementById('fever-fx')
  feverFx?.classList.remove('fever-active')

  const fireBtn = doc.getElementById('fire-btn')
  fireBtn?.classList.remove('firing', 'cooling', 'weapon-ready', 'weapon-ready-pulse')

  const warnFlash = doc.getElementById('warn-flash')
  warnFlash?.classList.remove(
    'warn-pulse',
    'impact-pulse',
    'impact-hazard',
    'impact-star',
    'impact-power',
    'impact-route',
    'guardian-flash',
  )

  doc.querySelectorAll?.('#edge-indicators .edge-arrow')?.forEach((element) => {
    element.classList.remove('visible')
  })
}
