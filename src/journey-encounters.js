export const ENCOUNTER_STAGES = Object.freeze(['arrival', 'escalation', 'signature'])

export const OBJECTIVES = Object.freeze({
  'shortcut-gates': Object.freeze({ kind: 'shortcut-gates', label: 'Clear the shortcut gates', metric: 'shortcutGatesCleared' }),
  'near-miss': Object.freeze({ kind: 'near-miss', label: 'Chain close calls', metric: 'nearMisses' }),
  shieldless: Object.freeze({ kind: 'shieldless', label: 'Finish without a shield', metric: 'shieldUsed' }),
  'star-trail': Object.freeze({ kind: 'star-trail', label: 'Collect the star trail', metric: 'collectedJourneyStars' }),
  rival: Object.freeze({ kind: 'rival', label: 'Race Red Dart to 500m', metric: 'rivalBeaten' }),
  completion: Object.freeze({ kind: 'completion', label: 'Reach the destination', metric: 'completed' }),
})

const ZONE_EVENTS = Object.freeze({
  city: Object.freeze([
    Object.freeze({ type: 'formation', lanes: [-1, 0, 1], params: { direction: 1, speed: 2.2 } }),
    Object.freeze({ type: 'rooftop-gap', lanes: [0], params: { width: 1.15 } }),
    Object.freeze({ type: 'formation', lanes: [-1, 1], params: { direction: -1, speed: 2.8 } }),
  ]),
  harbor: Object.freeze([
    Object.freeze({ type: 'gust', lanes: [-1, 0, 1], params: { direction: 1, strength: 0.7 } }),
    Object.freeze({ type: 'formation', lanes: [-1, 0, 1], params: { direction: 1, speed: 2.0 } }),
    Object.freeze({ type: 'formation', lanes: [-1, 0, 1], params: { direction: -1, speed: 2.4 } }),
  ]),
  storm: Object.freeze([
    Object.freeze({ type: 'visibility-pocket', lanes: [-1, 0, 1], params: { duration: 4.5, density: 0.72 } }),
    Object.freeze({ type: 'reveal', lanes: [-1, 0, 1], params: { duration: 2.5 } }),
    Object.freeze({ type: 'visibility-pocket', lanes: [-1, 1], params: { duration: 5.5, density: 0.82 } }),
  ]),
  aurora: Object.freeze([
    Object.freeze({ type: 'rival', lanes: [-1, 0, 1], params: { speed: 1.04 } }),
    Object.freeze({ type: 'formation', lanes: [-1, 0, 1], params: { direction: 1, speed: 2.2 } }),
    Object.freeze({ type: 'formation', lanes: [-1, 1], params: { direction: -1, speed: 2.6 } }),
  ]),
  sunset: Object.freeze([
    Object.freeze({ type: 'formation', lanes: [-1, 0, 1], params: { direction: 1, speed: 2.0 } }),
    Object.freeze({ type: 'formation', lanes: [-1, 0, 1], params: { direction: -1, speed: 2.2 } }),
    Object.freeze({ type: 'formation', lanes: [-1, 1], params: { direction: -1, speed: 2.4 } }),
  ]),
  midnight: Object.freeze([
    Object.freeze({ type: 'visibility-pocket', lanes: [-1, 0, 1], params: { duration: 4.0, density: 0.68 } }),
    Object.freeze({ type: 'formation', lanes: [-1, 0, 1], params: { direction: 1, speed: 2.2 } }),
    Object.freeze({ type: 'formation', lanes: [-1, 1], params: { direction: -1, speed: 2.6 } }),
  ]),
})

function seededHash(seed, stageIndex, variantIndex = 0) {
  let value = (Number(seed) || 1) ^ Math.imul(stageIndex + 1, 0x9e3779b1) ^ Math.imul(variantIndex + 1, 0x85ebca6b)
  value ^= value >>> 16
  value = Math.imul(value, 0x7feb352d)
  value ^= value >>> 15
  return value >>> 0
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function varyLanes(lanes, seed) {
  const offset = (seed % 3) - 1
  // Rotate the three lane choices rather than clamping at the edge. Clamping
  // merges neighboring lanes and silently removes authored route options.
  return lanes.map((lane) => ((lane + 1 + offset + 3) % 3) - 1)
}

/** Translate an authored route beat into a readable, bounded flight line. */
export function journeyGauntletSpec(event, previousCenter, halfWidth) {
  const lanes = event?.lanes || []
  const variant = Math.max(0, Math.floor(Number(event?.params?.variant) || 0))
  const lane = lanes[variant % Math.max(1, lanes.length)] ?? 0
  const previous = Number.isFinite(previousCenter) ? previousCenter : 0
  const bound = Math.max(0, Number.isFinite(halfWidth) ? halfWidth : 0)
  const target = clamp(lane * 4, -bound, bound)
  return {
    gapCenter: clamp(target, Math.max(-bound, previous - 5.8), Math.min(bound, previous + 5.8)),
    pattern: event?.type === 'rooftop-gap' ? 'scissors' : 'flyers',
    widthMultiplier: clamp(Number(event?.params?.width) || 1.15, 1, 1.5),
  }
}

export function buildJourneyObjective(config = {}) {
  let kind = 'completion'
  let target = 1
  if (config.finale && config.rival) kind = 'rival'
  else if (config.modifier === 'shortcut-gates') { kind = 'near-miss'; target = 3 }
  else if (config.modifier === 'star-trail') { kind = 'star-trail'; target = 5 }
  else if (config.modifier === 'moving-formation') { kind = 'near-miss'; target = 4 }
  else if (config.modifier === 'low-visibility') kind = 'shieldless'
  else if (config.modifier === 'crosswind') { kind = 'near-miss'; target = 3 }
  const definition = OBJECTIVES[kind]
  return Object.freeze({
    id: `${config.routeId || 'journey-route'}:${kind}`,
    kind,
    label: definition.label,
    target: clamp(target, 1, kind === 'shortcut-gates' ? 3 : 8),
  })
}

export function buildEncounterTimeline(config = {}) {
  const templates = ZONE_EVENTS[config.zone] || ZONE_EVENTS.city
  const routeId = config.routeId || `${config.zone || 'city'}-route`
  const events = ENCOUNTER_STAGES.map((stage, index) => {
    const random = seededHash(config.encounterSeed ?? config.seed, index, templates.length)
    const original = templates[index] || templates[templates.length - 1]
    // Old route IDs remain valid for saved journeys; their shortcut now uses
    // regular moving hazards instead of the retired ring encounters.
    const template = !config.finale && config.modifier === 'shortcut-gates' && index > 0
      ? { type: 'formation', lanes: original.lanes, params: { direction: index === 1 ? 1 : -1, speed: 2.2 + index * 0.2 } }
      : original
    const bases = config.finale ? [55, 225, 395] : [48, 145, 248]
    const baseDistance = bases[index]
    return Object.freeze({
      id: `${routeId}:${stage}:${index}`,
      stage,
      distance: clamp(baseDistance + (random % 25) - 12, 40, config.finale ? 460 : 320),
      type: template.type,
      lanes: Object.freeze(varyLanes(template.lanes, random)),
      params: Object.freeze({ ...template.params, variant: random % 3 }),
    })
  }).sort((a, b) => a.distance - b.distance)
  return Object.freeze({
    routeId,
    zone: config.zone || 'city',
    objective: config.objective || buildJourneyObjective(config),
    events: Object.freeze(events),
  })
}

export function getEncounterEventsAtDistance(timeline, previousDistance, distance) {
  if (!timeline?.events || !Number.isFinite(distance)) return []
  const previous = Number.isFinite(previousDistance) ? previousDistance : 0
  return timeline.events.filter((event) => event.distance > previous && event.distance <= distance)
}

export function resolveJourneyObjective(objective, telemetry = {}) {
  const safeObjective = objective && OBJECTIVES[objective.kind]
    ? objective
    : { id: 'journey:completion', kind: 'completion', label: OBJECTIVES.completion.label, target: 1 }
  const target = Math.max(1, Number(safeObjective.target) || 1)
  let value = 0
  switch (safeObjective.kind) {
  case 'shortcut-gates': value = Math.max(0, Number(telemetry.shortcutGatesCleared) || 0); break
  case 'near-miss': value = Math.max(0, Number(telemetry.nearMisses) || 0); break
  case 'shieldless': value = telemetry.completed && !telemetry.shieldUsed ? 1 : 0; break
  case 'star-trail': value = Math.max(0, Number(telemetry.collectedJourneyStars) || 0); break
  case 'rival': value = telemetry.rivalBeaten ? 1 : 0; break
  default: value = telemetry.completed ? 1 : 0; break
  }
  return Object.freeze({ ...safeObjective, target, value, completed: value >= target })
}
