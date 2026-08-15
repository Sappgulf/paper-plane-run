/**
 * Where a chunk's stars go.
 *
 * Every star used to spawn within ±0.8 of the reserved passage lane — the one
 * lane hazards are guaranteed to avoid. Stars therefore carried no positional
 * decision: the line that was safest was also the line that paid, so there was
 * never a reason to be anywhere else.
 *
 * Stars now mix across lanes. A share still lands on the reserved lane so the
 * safe line always pays something and the opening telegraph still teaches, but
 * the rest go to a *different* lane — and only to one whose damage envelopes
 * are clear at that moment. That turns a star into a genuine choice: leave the
 * lane that is guaranteed clear for one that merely happens to be clear now.
 *
 * The fairness rule is unchanged: a star is never placed inside a hazard's
 * damage envelope, so this can add risk of *movement*, never an unavoidable
 * hit. If no alternative lane is clear, the star falls back to the safe lane.
 *
 * Measured on a fixed daily seed against the old always-safe-lane placement,
 * a run that steers toward stars collects slightly more of them (24 vs 20 by
 * 700m), so this buys the decision without costing the early economy.
 */

import { PASSAGE_LANES, PASSAGE_LANE_X, getObstacleDamageRadius } from './pacing.js'

/** Share of stars that deliberately sit off the reserved lane. */
export const OFF_LANE_STAR_CHANCE = 0.45
/** Spare room a star needs beyond a hazard's damage envelope to be worth going for. */
export const STAR_CLEARANCE = 1.1

function finite(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function sampleFrom(random) {
  const value = Number(typeof random === 'function' ? random() : NaN)
  return Number.isFinite(value) ? value : 0.5
}

function laneCenter(lane, laneCenters = PASSAGE_LANE_X) {
  const index = PASSAGE_LANES.indexOf(lane)
  return laneCenters[index >= 0 ? index : 1] ?? 0
}

/**
 * Smallest spare distance between a lane centre and any hazard's damage
 * envelope. Infinity when nothing is near the lane.
 */
export function getLaneClearance({
  lane = 0,
  hazards = [],
  planeRadius = 0.7,
  laneCenters = PASSAGE_LANE_X,
} = {}) {
  const x = laneCenter(lane, laneCenters)
  let clearance = Infinity
  for (const hazard of hazards || []) {
    const damageRadius = getObstacleDamageRadius({
      entityRadius: finite(hazard?.radius),
      planeRadius,
    })
    clearance = Math.min(clearance, Math.abs(finite(hazard?.x) - x) - damageRadius)
  }
  return clearance
}

/**
 * Lanes other than the reserved one that a star can sit in safely right now,
 * best (most spare room) first.
 */
export function getCandidateStarLanes({
  safeLane = 0,
  hazards = [],
  planeRadius = 0.7,
  clearance = STAR_CLEARANCE,
  laneCenters = PASSAGE_LANE_X,
} = {}) {
  const required = Math.max(0, finite(clearance, STAR_CLEARANCE))
  return PASSAGE_LANES
    .filter((lane) => lane !== safeLane)
    .map((lane) => ({ lane, clearance: getLaneClearance({ lane, hazards, planeRadius, laneCenters }) }))
    .filter((candidate) => candidate.clearance > required)
    .sort((left, right) => right.clearance - left.clearance)
}

/**
 * Pick the lane for one star.
 *
 * `telegraph` pins the star to the reserved lane regardless — that is the
 * opening-metres teaching case, which must stay dead simple.
 */
export function chooseStarLane({
  random = Math.random,
  safeLane = 0,
  hazards = [],
  telegraph = false,
  offLaneChance = OFF_LANE_STAR_CHANCE,
  planeRadius = 0.7,
  clearance = STAR_CLEARANCE,
  laneCenters = PASSAGE_LANE_X,
} = {}) {
  if (safeLane === null || safeLane === undefined) return null
  if (telegraph) return safeLane
  const chance = Math.min(1, Math.max(0, finite(offLaneChance, OFF_LANE_STAR_CHANCE)))
  if (sampleFrom(random) >= chance) return safeLane
  const candidates = getCandidateStarLanes({ safeLane, hazards, planeRadius, clearance, laneCenters })
  if (!candidates.length) return safeLane
  // Spread across whichever alternatives are clear rather than always taking
  // the roomiest, so the pull off the safe line is not always the same way.
  const pick = Math.min(
    candidates.length - 1,
    Math.floor(sampleFrom(random) * candidates.length),
  )
  return candidates[pick].lane
}

/** World x for a star on `lane`, with a little scatter so clusters do not stack. */
export function getStarX({
  lane = 0,
  random = Math.random,
  spread = 1.6,
  laneCenters = PASSAGE_LANE_X,
} = {}) {
  const width = Math.max(0, finite(spread, 1.6))
  return laneCenter(lane, laneCenters) + (sampleFrom(random) - 0.5) * width
}
