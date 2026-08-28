/**
 * Banked flight — lateral movement with a roll axis in the middle.
 *
 * The old model was `velX += inputX * acceleration * dt`: the stick was a
 * direct force on the plane's sideways velocity, so a full-left to full-right
 * reversal cost nothing but the drag term. That reads as a cursor being
 * dragged, not as a sheet of paper carving through air, and it flattens the
 * skill ceiling — there is no line to nail because there is no commitment.
 *
 * Now the stick commands a *bank angle*, and the bank angle is what produces
 * lateral acceleration. Reversing means rolling back through wings-level
 * first, which takes real time, so every lateral decision is a decision you
 * are still paying for a moment later. Two consequences fall out of this for
 * free, and both are wanted:
 *
 *  - Committing early to a gap beats reacting late to it.
 *  - A hard bank spills lift (see `bankSinkPerSecond`), which is what ties
 *    this to the altitude economy in `glide.js` — you cannot turn for free,
 *    you turn by spending height.
 *
 * Pure, so the roll curve is testable without a renderer.
 */

/** Maximum bank, radians. Past ~55° a paper plane is falling, not turning. */
export const MAX_BANK = 0.95
/** How fast the plane rolls toward the commanded bank, radians/second. */
export const ROLL_RATE = 5.2
/** Rolling back toward level is faster than rolling into a turn. */
export const ROLL_RECOVER_RATE = 6.8
/** Lateral acceleration at full bank, units/second². */
export const TURN_POWER = 46
/** Sideways drag. Lower than the old model: bank now does the arresting. */
export const LATERAL_DRAG = 0.12
/** Altitude bled per second at full bank. */
export const BANK_SINK = 5.4

function finite(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function createBankState() {
  return Object.freeze({ bank: 0, commanded: 0 })
}

/**
 * Advance the roll axis one frame.
 *
 * Rolling *toward* level uses the faster rate: a plane returning to neutral is
 * being helped by its own dihedral, and making recovery sluggish too would
 * read as input lag rather than as commitment.
 */
export function advanceBank(state, { inputX = 0, dt = 0, rollMul = 1 } = {}) {
  const previous = state || createBankState()
  const step = Math.max(0, finite(dt))
  const commanded = clamp(finite(inputX), -1, 1) * MAX_BANK
  const bank = finite(previous.bank)
  const towardLevel = Math.abs(commanded) < Math.abs(bank) || (commanded * bank) < 0
  const rate = (towardLevel ? ROLL_RECOVER_RATE : ROLL_RATE) * Math.max(0.1, finite(rollMul, 1))
  const delta = commanded - bank
  const move = clamp(delta, -rate * step, rate * step)
  return Object.freeze({ bank: clamp(bank + move, -MAX_BANK, MAX_BANK), commanded })
}

/**
 * Lateral acceleration produced by the current bank. `sin` rather than a
 * linear ramp so small corrections stay gentle and the last few degrees of
 * bank are where the real authority lives.
 */
export function bankTurnAcceleration(bank = 0, turnPower = TURN_POWER) {
  return Math.sin(clamp(finite(bank), -MAX_BANK, MAX_BANK)) * Math.max(0, finite(turnPower, TURN_POWER))
}

/**
 * Height spilled by holding a bank. Scales with the *square* of the normalized
 * bank so gentle steering is nearly free and a committed carve is expensive —
 * that gap is the whole reason a bank is worth thinking about.
 */
export function bankSinkPerSecond(bank = 0, bankSink = BANK_SINK) {
  const normalized = clamp(Math.abs(finite(bank)) / MAX_BANK, 0, 1)
  return normalized * normalized * Math.max(0, finite(bankSink, BANK_SINK))
}

/** Visual roll for the mesh, including a little overshoot on the rate. */
export function bankVisualRoll(bank = 0) {
  return clamp(finite(bank), -MAX_BANK, MAX_BANK) * 1.15
}
