/**
 * How many chips the flight HUD is allowed to show at once.
 *
 * Every system that earned a HUD chip added it unconditionally: combo, ground
 * skim, star streak, fever, power, the Tuck, guardian charges, the journey
 * objective, the ghost delta, the zone, the next zone. Each is reasonable
 * alone. Together, mid-run, they produced a nine-chip wall across the top of
 * the screen — and because they all render at the same weight, the one that
 * mattered (am I about to hit the ground?) looked exactly like the one that
 * did not (which zone is next).
 *
 * So the HUD has a budget. Three anchors are always shown because they are the
 * run: distance, stars, altitude. Everything else competes for a small number
 * of remaining slots, ranked by how much it changes what the player does in
 * the next second. Losing chips are hidden, not shrunk — a chip too small to
 * read is still something to look at.
 *
 * Pure, so the ranking is a table you can read and a test can pin down.
 */

/** Always visible: these three are the run. */
export const HUD_ANCHORS = Object.freeze(['distance', 'stars', 'altitude'])

/** How many non-anchor chips may share the row. */
export const HUD_STATE_BUDGET = 2

/**
 * Higher wins a slot. The ordering is "how much does this change what I do in
 * the next second" — an active move or a life you are about to spend beats a
 * running total, which beats context you could look up between runs.
 */
export const HUD_CHIP_RANK = Object.freeze({
  tuck: 100,
  guardian: 90,
  power: 80,
  skim: 70,
  fever: 60,
  combo: 50,
  streak: 40,
  timeattack: 35,
  'journey-objective': 30,
  'ghost-delta': 20,
  zone: 10,
  'next-zone': 5,
})

/**
 * Chips that are context, not state: they tell you *about* the run rather than
 * what is happening in it. They are useful on the way into a flight and pure
 * noise during one, so they are not ranked against live chips — they are simply
 * not on screen while flying. Ranking them instead would mean a quiet moment
 * with no combo or power active fills the budget with "Best" and "Control".
 */
export const HUD_FLIGHT_HIDDEN = Object.freeze([
  'best', 'mode', 'control', 'zone', 'next-zone', 'ghost-delta',
])

export function isFlightContextChip(id) {
  return HUD_FLIGHT_HIDDEN.includes(id)
}

export function hudChipRank(id) {
  return HUD_CHIP_RANK[id] ?? 0
}

export function isHudAnchor(id) {
  return HUD_ANCHORS.includes(id)
}

/**
 * Decide which chips render.
 *
 * `active` is every chip that currently wants to be visible. Context chips are
 * dropped outright while flying, anchors are never dropped, and the rest are
 * ranked and the budget applied. Returns the ids to show, so the caller only
 * has to toggle a class.
 */
export function selectHudChips(active = [], { budget = HUD_STATE_BUDGET, inFlight = true } = {}) {
  const wanted = [...new Set((active || []).filter(Boolean))]
    .filter((id) => !(inFlight && isFlightContextChip(id)))
  const anchors = wanted.filter(isHudAnchor)
  const contenders = wanted
    .filter((id) => !isHudAnchor(id))
    .sort((left, right) => hudChipRank(right) - hudChipRank(left))
  const allowed = Math.max(0, Math.floor(Number(budget) ?? HUD_STATE_BUDGET))
  return Object.freeze([...anchors, ...contenders.slice(0, allowed)])
}
