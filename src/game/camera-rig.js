/**
 * Pure camera rig math — extracted so the flight loop stays a thin coordinator.
 * No THREE dependency; the caller applies the returned scalars to its camera.
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function cameraLean({ velX = 0, velY = 0, reducedMotion = false } = {}) {
  if (reducedMotion) return { leanX: 0, leanY: 0 }
  return {
    leanX: clamp((Number(velX) || 0) * 0.1, -1.6, 1.6),
    leanY: clamp((Number(velY) || 0) * 0.08, -0.8, 0.8),
  }
}

export function bankRoll({ bank = 0, reducedMotion = false } = {}) {
  return reducedMotion ? 0 : clamp((Number(bank) || 0) * 0.055, -0.05, 0.05)
}

export function shadowForPlane({ planeY = 0, planeX = 0, bank = 0, maxY = 20 } = {}) {
  const shadowUp = clamp((Number(planeY) || 0) / Math.max(1, Number(maxY) || 20), 0, 1)
  const baseScale = 1.15 - shadowUp * 0.6
  return {
    visible: true,
    x: Number(planeX) || 0,
    scale: baseScale,
    scaleYFactor: 1 - Math.abs(Number(bank) || 0) * 0.2,
    rotationZ: -(Number(bank) || 0) * 0.35,
    opacity: 0.34 - shadowUp * 0.2,
    shadowUp,
  }
}

export function cameraTarget({ planeX = 0, planeY = 0, camHeight = 3.05, camZ = -8, followX = 1 } = {}) {
  return {
    x: (Number(planeX) || 0) * followX,
    y: (Number(planeY) || 0) + camHeight,
    z: Number(camZ) || -8,
  }
}

/** Keep the full folded wings inside a portrait viewport, including upgraded planes. */
export function cameraFlightDistance({ aspect = 1.78, fov = 60, planeScale = 1.12 } = {}) {
  const halfWidth = 2.1 * Math.max(1,Number(planeScale) || 1.12) + .75
  const angle = clamp(Number(fov) || 60,40,100)*Math.PI/360
  return Math.max(8,halfWidth/(Math.tan(angle)*Math.max(.35,Number(aspect) || 1.78)))
}

export function cameraLateralPosition({ current = 0, planeX = 0, aspect = 1.78 } = {}) {
  const lag = Math.min(1.2,Math.max(.35,Number(aspect) || 1.78)*.8)
  return clamp(Number(current) || 0,planeX-lag,planeX+lag)
}

export function lerpScalar(current, target, ease) {
  return current + (target - current) * ease
}
