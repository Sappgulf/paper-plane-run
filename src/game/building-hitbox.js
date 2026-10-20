/**
 * Building collisions used a single square envelope sized by the building's
 * longest side. A 6-wide x 2-deep roof therefore claimed a 6x6 footprint:
 * corners reported hits (and shoves) up to ~1.4x outside the visible paper.
 * Buildings only shove rather than kill, but a phantom shove still ruins a
 * clean line. This is the axis-aligned envelope in the plane's units.
 */

function nonNegative(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, number) : fallback
}

function positive(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

/**
 * Half-extents of the damaging footprint. Boosting scales both the building
 * and plane envelope exactly like `getCollisionRadius` does for airborne
 * hazards, so Turbo Fold is not made safer here than anywhere else.
 */
export function buildingCollisionEnvelope({
  halfWidth = 0,
  halfDepth = 0,
  planeRadius = 0.7,
  planeWeight = 0.5,
  boostActive = false,
  boostHitboxScale = 0.78,
} = {}) {
  const hitScale = boostActive ? positive(boostHitboxScale, 0.78) : 1
  const planePad = positive(planeRadius, 0.7) * nonNegative(planeWeight, 0.5) * hitScale
  return Object.freeze({
    halfWidth: nonNegative(halfWidth) * hitScale + planePad,
    halfDepth: nonNegative(halfDepth) * hitScale + planePad,
    hitScale,
  })
}

export function buildingOverlapsPlane({ dx = 0, dz = 0, ...options } = {}) {
  const envelope = buildingCollisionEnvelope(options)
  const x = Math.abs(Number(dx) || 0)
  const z = Math.abs(Number(dz) || 0)
  return x < envelope.halfWidth && z < envelope.halfDepth
}
