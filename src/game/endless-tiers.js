/**
 * Endless long-tail escalation — "Altitude Tiers".
 *
 * Every difficulty dial the run owns saturates early: cruise speed hits its
 * difficulty cap around 450m, the hazard ramp tops out at 700m, and wave
 * spacing stops compressing at ~1050m. Past that the endless modes were
 * mechanically identical forever, so a 5000m run played exactly like an
 * 1100m one and the only thing still moving was the odometer.
 *
 * Tiers pick the curve back up where those dials die. Each tier is a small,
 * bounded step — a little more speed, slightly tighter waves, a slightly
 * richer hazard mix — plus a *named* crosswind-style modifier so the long
 * tail reads as authored escalation rather than a silent number creep. Every
 * knob is capped at MAX_TIER, so the ceiling is a hard, tuned difficulty, not
 * an asymptote that eventually becomes unplayable.
 */

/** Tiers begin where wave-spacing compression stops doing work. */
export const TIER_START = 1000
/** Meters per tier. Roughly 20–25s of flight at capped cruise. */
export const TIER_SPAN = 900
/** Escalation stops here — beyond this the game is hard but stable. */
export const MAX_TIER = 8

const SPEED_PER_TIER = 1.6
// Tuned so spacing is still tightening at MAX_TIER rather than pinning to the
// floor early and making the last tiers a no-op on wave density.
const SPACING_PER_TIER = 0.022
const MIN_SPACING_SCALE = 0.84
const HAZARD_PER_TIER = 0.07
const MAX_HAZARD_BONUS = 0.5

/**
 * Named modifiers rotate so consecutive tiers feel distinct. These are flavor
 * plus a light mechanical lean; the numeric escalation lives in the tier index
 * itself, not here, so a modifier can never spike difficulty on its own.
 */
const MODIFIERS = Object.freeze([
  Object.freeze({ id: 'headwind', name: 'Headwind', blurb: 'The air pushes back — waves arrive closer together.', bias: { building: 1.1, bird: 1, scissors: 1 } }),
  Object.freeze({ id: 'flocking', name: 'Flocking Hour', blurb: 'Paper birds gather in denser flights.', bias: { building: 0.85, bird: 1.45, scissors: 0.95 } }),
  Object.freeze({ id: 'scissor-storm', name: 'Scissor Storm', blurb: 'Open blades ride the updraft.', bias: { building: 0.9, bird: 0.95, scissors: 1.5 } }),
  Object.freeze({ id: 'skyline', name: 'Rising Skyline', blurb: 'The city folds itself taller.', bias: { building: 1.4, bird: 0.9, scissors: 0.95 } }),
])

function tierIndexFrom(value) {
  const number = Math.floor(Number(value) || 0)
  return Math.min(MAX_TIER, Math.max(0, number))
}

/** Tier 0 covers everything before TIER_START; tier 1 begins at TIER_START. */
export function endlessTierAt(distance = 0) {
  const meters = Math.max(0, Number(distance) || 0)
  if (meters < TIER_START) return 0
  return tierIndexFrom(Math.floor((meters - TIER_START) / TIER_SPAN) + 1)
}

export function endlessTierProgress(distance = 0) {
  const meters = Math.max(0, Number(distance) || 0)
  if (meters < TIER_START) return 0
  const tier = endlessTierAt(meters)
  const tierStart = TIER_START + (tier - 1) * TIER_SPAN
  const into = Math.max(0, Math.min(1, (meters - tierStart) / TIER_SPAN))
  return into
}

/** Distance at which a given tier begins, for HUD "next tier in Nm" readouts. */
export function tierStartDistance(tier = 0) {
  const index = tierIndexFrom(tier)
  return index <= 0 ? 0 : TIER_START + (index - 1) * TIER_SPAN
}

/**
 * Progress through the current tier plus the tier that follows it. Returns a
 * null `next` once escalation has capped, which the HUD renders as a terminal
 * label rather than a countdown that never fires.
 */
export function tierProgress(distance = 0) {
  const meters = Math.max(0, Number(distance) || 0)
  const tier = endlessTierAt(meters)
  if (tier >= MAX_TIER) return Object.freeze({ tier, t: 1, next: null, nextAt: null })
  const start = tier === 0 ? 0 : tierStartDistance(tier)
  const end = tier === 0 ? TIER_START : tierStartDistance(tier + 1)
  const span = Math.max(1, end - start)
  return Object.freeze({
    tier,
    t: Math.min(1, Math.max(0, (meters - start) / span)),
    next: tier + 1,
    nextAt: end,
  })
}

/** The named modifier a tier flies under. Tier 0 has none — the run is still opening. */
export function tierModifier(tier = 0) {
  const index = tierIndexFrom(tier)
  if (index <= 0) return null
  return MODIFIERS[(index - 1) % MODIFIERS.length]
}

/** Additive cruise-speed bonus in world units per second, on top of the difficulty cap. */
export function getTierSpeedBonus(tier = 0) {
  return tierIndexFrom(tier) * SPEED_PER_TIER
}

export function getTierSpeedBonusSmooth(distance = 0) {
  const tier = endlessTierAt(distance)
  const progress = endlessTierProgress(distance)
  return tier * SPEED_PER_TIER + progress * SPEED_PER_TIER * 0.5
}

/** Multiplier applied to wave spacing. Floored so waves never become unreadable. */
export function getTierSpacingScale(tier = 0) {
  return Math.max(MIN_SPACING_SCALE, 1 - tierIndexFrom(tier) * SPACING_PER_TIER)
}

export function getTierSpacingScaleSmooth(distance = 0) {
  const tier = endlessTierAt(distance)
  const progress = endlessTierProgress(distance)
  return Math.max(MIN_SPACING_SCALE, 1 - (tier + progress * 0.5) * SPACING_PER_TIER)
}

/**
 * Extra hazard-ramp headroom past the shipped `min(1, distance / 700)` cap, so
 * flock sizes and building heights keep growing without a second saturation.
 */
export function getTierHazardBonus(tier = 0) {
  return Math.min(MAX_HAZARD_BONUS, tierIndexFrom(tier) * HAZARD_PER_TIER)
}

export function getTierHazardBonusSmooth(distance = 0) {
  const tier = endlessTierAt(distance)
  const progress = endlessTierProgress(distance)
  return Math.min(MAX_HAZARD_BONUS, (tier + progress * 0.5) * HAZARD_PER_TIER)
}

/** Per-tier hazard-type weighting, folded on top of the zone's own bias. */
export function getTierHazardBias(tier = 0) {
  return tierModifier(tier)?.bias || null
}

/**
 * Score reward for flying deep. Escalation without a payoff is just attrition,
 * so each tier pays a small permanent multiplier for the rest of the run.
 */
export function getTierScoreMultiplier(tier = 0) {
  return 1 + tierIndexFrom(tier) * 0.06
}

export function getTierScoreMultiplierSmooth(distance = 0) {
  const tier = endlessTierAt(distance)
  const progress = endlessTierProgress(distance)
  return 1 + (tier + progress * 0.5) * 0.06
}

/** Everything the run loop needs for one tier, resolved once per tier change. */
export function resolveTier(distance = 0) {
  const tier = endlessTierAt(distance)
  const modifier = tierModifier(tier)
  return Object.freeze({
    tier,
    modifier,
    name: modifier ? `Tier ${tier} · ${modifier.name}` : null,
    speedBonus: getTierSpeedBonus(tier),
    spacingScale: getTierSpacingScale(tier),
    hazardBonus: getTierHazardBonus(tier),
    hazardBias: getTierHazardBias(tier),
    scoreMultiplier: getTierScoreMultiplier(tier),
    capped: tier >= MAX_TIER,
  })
}
