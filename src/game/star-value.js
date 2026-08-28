import { FEVER_SCORE_MUL } from './combo-fever.js'
import { skimScoreMultiplier } from './ground-skim.js'

/**
 * Star pickups used to pay a flat +18m no matter what — fever, ground skim
 * and golden drops all ran as parallel meters that never touched the star
 * economy. Star value now rides the same risk multipliers the score factor
 * uses, so holding fever or skimming low makes every pickup worth more.
 */

export const STAR_BASE_METERS = 18
export const GOLDEN_STAR_VALUE = 5

/**
 * Resolve one star pickup.
 * @returns {{stars: number, meters: number, label: string, golden: boolean}}
 */
export function resolveStarPickup({
  golden = false,
  feverActive = false,
  skimTier = 0,
  baseMeters = STAR_BASE_METERS,
} = {}) {
  const stars = golden ? GOLDEN_STAR_VALUE : 1
  const riskMul =
    (feverActive ? FEVER_SCORE_MUL : 1) *
    skimScoreMultiplier(skimTier) *
    (golden ? 2 : 1)
  const rawBase = Number(baseMeters)
  const base = Number.isFinite(rawBase) ? Math.max(0, rawBase) : STAR_BASE_METERS
  const meters = Math.round(base * riskMul)
  const label = golden
    ? `GOLDEN STAR +${stars}★ · +${meters}m`
    : `STAR +1 · +${meters}m`
  return Object.freeze({ stars, meters, label, golden: Boolean(golden) })
}
