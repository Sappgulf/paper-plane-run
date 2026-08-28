/**
 * One banner at a time.
 *
 * The flight HUD grew three independent banner elements — wind, power, zone —
 * each of which showed and hid itself whenever its own system had something to
 * say. Nothing coordinated them, so a boost pickup during a zone change during
 * a gauntlet stacked three rounded rectangles down the middle of the screen,
 * on top of the HUD, over the plane. The information was all individually
 * correct and collectively unreadable.
 *
 * This picks the single most important banner currently being requested. Two
 * rules, and deliberately no more:
 *
 *  - **Highest priority wins**, so the message that matters most to staying
 *    alive gets the slot: a boss gate outranks a zone name outranks a pickup.
 *  - **Ties go to whatever is already on screen.** Without that the winner
 *    would depend on the order the engine happened to collect requests in, and
 *    two equal banners would trade the slot frame by frame — a flicker, which
 *    is worse than showing only one of them.
 *
 * There is no dwell timer. An earlier draft held a fresh banner for a moment
 * against lower-priority arrivals, but since lower priority already loses and
 * ties already go to the incumbent, the timer could not change any outcome. A
 * knob that cannot change an outcome is just a thing to misread later.
 *
 * Pure: the engine reports what each source wants, this decides what shows.
 */

/** Higher wins. Anything not listed sorts below everything listed. */
export const BANNER_PRIORITY = Object.freeze({
  guardian: 100,
  boss: 90,
  gauntlet: 70,
  zone: 60,
  wind: 50,
  flare: 40,
  power: 30,
  status: 10,
})

export function bannerPriority(kind) {
  return BANNER_PRIORITY[kind] ?? 0
}

export function createBannerState() {
  return Object.freeze({ id: null, kind: null, text: '' })
}

/**
 * Choose which requested banner owns the slot.
 *
 * `requests` is every banner that currently wants to be visible, as
 * `{ id, kind, text }`. A request with no text is not a request — banner
 * elements live permanently in the DOM and are empty when they have nothing
 * to say.
 */
export function resolveBanner(state, { requests = [] } = {}) {
  const previous = state || createBannerState()
  const live = (requests || []).filter((request) => request && request.id && request.text)
  if (live.length === 0) return createBannerState()

  const incumbent = live.find((request) => request.id === previous.id)
  let best = incumbent || live[0]
  for (const request of live) {
    if (bannerPriority(request.kind) > bannerPriority(best.kind)) best = request
  }
  return Object.freeze({ id: best.id, kind: best.kind, text: best.text })
}
