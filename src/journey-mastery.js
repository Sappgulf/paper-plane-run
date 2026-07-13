export const MASTERY_VERSION = 1

export const PILOT_MASTERY = Object.freeze({
  navigator: Object.freeze({
    levels: Object.freeze([
      Object.freeze({ level: 1, title: 'Route Reader', goal: 'Complete 2 Journey routes', cosmeticId: 'milo-portrait-route-reader' }),
      Object.freeze({ level: 2, title: 'Gate Scout', goal: 'Clear 6 shortcut gates', cosmeticId: 'milo-map-trail' }),
      Object.freeze({ level: 3, title: 'Paper Cartographer', goal: 'Complete all 4 destinations', cosmeticId: 'milo-compass-border' }),
    ]),
  }),
  daredevil: Object.freeze({
    levels: Object.freeze([
      Object.freeze({ level: 1, title: 'Close Call', goal: 'Record 8 Journey near misses', cosmeticId: 'pip-portrait-close-call' }),
      Object.freeze({ level: 2, title: 'Momentum Fold', goal: 'Complete 2 risky routes', cosmeticId: 'pip-ember-trail' }),
      Object.freeze({ level: 3, title: 'Redline Ace', goal: 'Beat Red Dart', cosmeticId: 'pip-foil-border' }),
    ]),
  }),
})

function emptyPilot(counters) {
  return { level: 0, counters, cosmetics: [] }
}

export function createMasteryState() {
  return {
    version: MASTERY_VERSION,
    receipts: [],
    pilots: {
      navigator: emptyPilot({ routesCompleted: 0, shortcutGatesCleared: 0, destinations: [] }),
      daredevil: emptyPilot({ nearMisses: 0, riskyRoutesCompleted: 0, rivalBeaten: false }),
    },
  }
}

function integer(value, maximum = 100000) {
  return Math.min(maximum, Math.max(0, Math.trunc(Number(value) || 0)))
}

function deriveNavigator(counters) {
  let level = counters.routesCompleted >= 2 ? 1 : 0
  if (level >= 1 && counters.shortcutGatesCleared >= 6) level = 2
  if (level >= 2 && counters.destinations.length >= 4) level = 3
  return level
}

function deriveDaredevil(counters) {
  let level = counters.nearMisses >= 8 ? 1 : 0
  if (level >= 1 && counters.riskyRoutesCompleted >= 2) level = 2
  if (level >= 2 && counters.rivalBeaten) level = 3
  return level
}

function withDerivedProgress(pilotId, counters) {
  const level = pilotId === 'navigator' ? deriveNavigator(counters) : deriveDaredevil(counters)
  return {
    level,
    counters,
    cosmetics: PILOT_MASTERY[pilotId].levels.slice(0, level).map((entry) => entry.cosmeticId),
  }
}

export function normalizeMasteryState(value) {
  if (!value || value.version !== MASTERY_VERSION || !Array.isArray(value.receipts) || !value.pilots) return null
  if (!value.receipts.every((receipt) => typeof receipt === 'string')) return null
  const navigator = value.pilots.navigator?.counters
  const daredevil = value.pilots.daredevil?.counters
  if (!navigator || !daredevil || !Array.isArray(navigator.destinations)) return null
  const destinations = [...new Set(navigator.destinations.filter((id) => ['city', 'harbor', 'storm', 'aurora'].includes(id)))]
  const navigatorCounters = {
    routesCompleted: integer(navigator.routesCompleted),
    shortcutGatesCleared: integer(navigator.shortcutGatesCleared),
    destinations,
  }
  const daredevilCounters = {
    nearMisses: integer(daredevil.nearMisses),
    riskyRoutesCompleted: integer(daredevil.riskyRoutesCompleted),
    rivalBeaten: !!daredevil.rivalBeaten,
  }
  return {
    version: MASTERY_VERSION,
    receipts: value.receipts.slice(-300),
    pilots: {
      navigator: withDerivedProgress('navigator', navigatorCounters),
      daredevil: withDerivedProgress('daredevil', daredevilCounters),
    },
  }
}

export function resolveMasteryOutcome(state, outcome = {}) {
  const current = normalizeMasteryState(state) || createMasteryState()
  if (!outcome.receiptId || !PILOT_MASTERY[outcome.pilotId] || current.receipts.includes(outcome.receiptId)) return current
  const pilots = {
    navigator: { ...current.pilots.navigator, counters: { ...current.pilots.navigator.counters, destinations: [...current.pilots.navigator.counters.destinations] } },
    daredevil: { ...current.pilots.daredevil, counters: { ...current.pilots.daredevil.counters } },
  }
  if (outcome.pilotId === 'navigator') {
    const counters = pilots.navigator.counters
    counters.shortcutGatesCleared += integer(outcome.shortcutGatesCleared, 20)
    if (outcome.completed) {
      counters.routesCompleted += 1
      if (['city', 'harbor', 'storm', 'aurora'].includes(outcome.destinationId) && !counters.destinations.includes(outcome.destinationId)) {
        counters.destinations.push(outcome.destinationId)
      }
    }
    pilots.navigator = withDerivedProgress('navigator', counters)
  } else {
    const counters = pilots.daredevil.counters
    counters.nearMisses += integer(outcome.nearMisses, 100)
    if (outcome.completed && outcome.risky) counters.riskyRoutesCompleted += 1
    if (outcome.completed && outcome.rivalBeaten) counters.rivalBeaten = true
    pilots.daredevil = withDerivedProgress('daredevil', counters)
  }
  return {
    version: MASTERY_VERSION,
    receipts: [...current.receipts, outcome.receiptId].slice(-300),
    pilots,
  }
}

export function getPilotMasteryView(state, pilotId) {
  const current = normalizeMasteryState(state) || createMasteryState()
  const pilot = current.pilots[pilotId]
  if (!pilot) return null
  const next = PILOT_MASTERY[pilotId].levels[pilot.level] || null
  return {
    pilotId,
    level: pilot.level,
    title: pilot.level ? PILOT_MASTERY[pilotId].levels[pilot.level - 1].title : 'New Pilot',
    nextGoal: next?.goal || 'Mastery complete',
    nextCosmetic: next?.cosmeticId || null,
    cosmetics: [...pilot.cosmetics],
    counters: { ...pilot.counters, ...(pilot.counters.destinations ? { destinations: [...pilot.counters.destinations] } : {}) },
  }
}
