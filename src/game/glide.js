/**
 * Altitude as the resource.
 *
 * Before this, height was a position and speed was a function of distance:
 * the plane sank at a fixed rate, you held the stick up to cancel it, and the
 * run ended when something hit you. Nothing about being high or low mattered
 * except which obstacles were nearby, and the ground was a soft wall you
 * bounced off.
 *
 * A paper plane only ever falls. So height is now the run's real currency:
 *
 *  - You always sink. The rate depends on what you are doing — banking hard
 *    (`banking.js`) and pulling the nose up both cost extra.
 *  - Diving trades height for forward speed. Climbing spends forward speed to
 *    buy height back. This is one conserved pool, not two dials.
 *  - Thermals, open windows and updrafts are the only free height in the run,
 *    which is what makes their placement a route rather than a decoration.
 *  - Touching the ground ends the run. The floor is the fail state, so
 *    `ground-skim.js` stops being a bonus system and becomes the core tension.
 *
 * Everything here is pure so the energy curve can be asserted directly.
 */

/** Baseline sink with wings level and no input, units/second. */
export const BASE_SINK = 3.2
/** Extra sink per unit of commanded climb — pulling up costs more than gliding. */
export const CLIMB_SINK_PENALTY = 2.6
/** Height below which the run ends. */
export const GROUND_HEIGHT = 1.15
/** Height at which the low-altitude warning arms. */
export const STALL_WARN_HEIGHT = 3.4

/**
 * Exchange rate between height and forward speed. One unit of height traded
 * downward buys this much cruise speed, and buying height back costs the same
 * — a lossless-looking number that is in practice lossy, because sink runs the
 * whole time you are converting.
 */
export const ENERGY_EXCHANGE = 2.35
/** Ceiling on speed borrowed from a dive, so a long dive cannot run away. */
export const MAX_DIVE_SPEED = 26
/** How fast borrowed dive speed bleeds off once you stop descending. */
export const DIVE_SPEED_DECAY = 0.55

function finite(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function createGlideState() {
  return Object.freeze({ diveSpeed: 0, lift: 0, grounded: false, warning: false })
}

/**
 * Total sink this frame, before any lift is added back.
 *
 * `inputY > 0` is a commanded climb. It does not directly move the plane here
 * — the caller still integrates it — but it makes the sheet less efficient,
 * which is why holding "up" forever is not a strategy.
 */
export function resolveSinkPerSecond({
  baseSink = BASE_SINK,
  inputY = 0,
  bankSink = 0,
  sinkMul = 1,
} = {}) {
  const climb = Math.max(0, finite(inputY))
  const base = Math.max(0, finite(baseSink, BASE_SINK))
  return (base + climb * CLIMB_SINK_PENALTY + Math.max(0, finite(bankSink))) *
    Math.max(0, finite(sinkMul, 1))
}

/**
 * Convert this frame's vertical movement into borrowed forward speed.
 *
 * `deltaHeight` is negative while descending. Descending pays in; climbing
 * pays back out of the same pool before it touches anything else, so a
 * dive-then-climb round trip nets close to zero rather than printing speed.
 */
export function advanceDiveSpeed(diveSpeed, { deltaHeight = 0, dt = 0 } = {}) {
  const step = Math.max(0, finite(dt))
  const drop = -finite(deltaHeight)
  let borrowed = finite(diveSpeed) + drop * ENERGY_EXCHANGE
  // Bleed toward zero whenever the plane is not actively trading height down.
  if (drop <= 0) borrowed *= Math.pow(DIVE_SPEED_DECAY, step)
  return clamp(borrowed, 0, MAX_DIVE_SPEED)
}

/**
 * Height bought back by a climb, given the speed available to spend.
 * Returns the height gained and the speed consumed, so the caller can never
 * gain altitude it did not pay for.
 */
export function spendSpeedForHeight({ diveSpeed = 0, requestedHeight = 0 } = {}) {
  const available = Math.max(0, finite(diveSpeed))
  const wanted = Math.max(0, finite(requestedHeight))
  const affordable = Math.min(wanted, available / ENERGY_EXCHANGE)
  return Object.freeze({ height: affordable, speedSpent: affordable * ENERGY_EXCHANGE })
}

/**
 * Height at which ground effect starts to cushion the plane.
 *
 * Below this the air trapped between wing and ground pushes back, and the
 * cushion is what makes the deck *flyable* rather than instantly fatal. Without
 * it, a plane aimed at a low-but-legal altitude overshoots its target on the
 * way down and touches the floor, so the whole skim band — the game's best
 * risk/reward — collapses into "descend and die".
 */
export const GROUND_EFFECT_HEIGHT = 2.9
/**
 * Peak cushion, units/second. Deliberately tuned to a value between two things:
 * more than ordinary sink plus a full-bank turn (so committed low flight can be
 * *held*), and less than a tuck's dive (so deliberately driving the nose into
 * the deck still ends the run). That gap is the entire skill expression of
 * flying the bottom of the corridor.
 */
export const GROUND_EFFECT_LIFT = 9.2

/**
 * Cushion at a given height. Zero above `GROUND_EFFECT_HEIGHT`, rising
 * smoothly to `GROUND_EFFECT_LIFT` at the floor.
 */
export function groundEffectLift(height = 99, { strength = GROUND_EFFECT_LIFT } = {}) {
  const y = finite(height, 99)
  const span = GROUND_EFFECT_HEIGHT - GROUND_HEIGHT
  if (span <= 0) return 0
  const depth = clamp((GROUND_EFFECT_HEIGHT - y) / span, 0, 1)
  // Squared so the cushion is negligible at the top of the band and firm at
  // the bottom — a soft edge, then a real floor you can feel.
  return depth * depth * Math.max(0, finite(strength, GROUND_EFFECT_LIFT))
}

/**
 * Fastest descent the cushion permits inside the ground-effect band.
 *
 * Lift alone is a force, and a force cannot undo speed the plane already has:
 * with the engine's dt capped at 0.05s, one long frame can carry a descending
 * plane across the whole cushion band and into the floor before the cushion
 * has integrated at all. On a fast machine the run survives; on a slow one, or
 * a loaded one, the identical input kills it — the fail state becomes a
 * function of frame rate, which is the least fair thing a game can do.
 *
 * So the cushion also *caps* sink rate near the deck. The floor stays fully
 * reachable — holding the nose down still walks the plane into it at this rate
 * — but reaching it now takes a decision sustained over time rather than one
 * unlucky frame.
 */
export const CUSHION_MAX_SINK = 6.5

/**
 * Clamp descent inside the cushion band.
 *
 * `punchThrough` is the Tuck: a deliberate dive is exactly the case that should
 * be able to beat ground effect, and keeping that escape hatch is what stops
 * the cushion from quietly removing the game's fail state.
 */
export function cushionDescent({ velY = 0, height = 99, punchThrough = false } = {}) {
  const vel = finite(velY)
  if (punchThrough || finite(height, 99) > GROUND_EFFECT_HEIGHT) return vel
  return Math.max(vel, -CUSHION_MAX_SINK)
}

/** Lift from an updraft field, tapering to nothing at the edge of its radius. */
export function updraftLift({ distance = 0, radius = 1, strength = 0 } = {}) {
  const reach = Math.max(0.0001, finite(radius, 1))
  const falloff = 1 - clamp(Math.abs(finite(distance)) / reach, 0, 1)
  return falloff * falloff * Math.max(0, finite(strength))
}

/** Whether this height ends the run, and whether it should be warning first. */
export function evaluateAltitude(height = 0) {
  const y = finite(height)
  return Object.freeze({
    grounded: y <= GROUND_HEIGHT,
    warning: y <= STALL_WARN_HEIGHT,
    /** 0 at the warning line, 1 at the ground — drives HUD urgency. */
    urgency: clamp((STALL_WARN_HEIGHT - y) / Math.max(0.0001, STALL_WARN_HEIGHT - GROUND_HEIGHT), 0, 1),
  })
}

/** Speed multiplier contributed by borrowed dive speed, for the HUD and cruise. */
export function diveSpeedMultiplier(diveSpeed = 0) {
  return 1 + clamp(finite(diveSpeed) / MAX_DIVE_SPEED, 0, 1) * 0.42
}
