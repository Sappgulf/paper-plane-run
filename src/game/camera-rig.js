/**
 * Pure camera rig math — extracted so the flight loop stays a thin coordinator.
 * No THREE dependency; the caller applies the returned scalars to its camera.
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function cameraLean({ velX = 0, velY = 0 } = {}) {
  return {
    leanX: clamp((Number(velX) || 0) * 0.38, -4.2, 4.2),
    leanY: clamp((Number(velY) || 0) * 0.3, -3.2, 3.2),
  }
}

export function bankRoll({ bank = 0 } = {}) {
  return clamp((Number(bank) || 0) * 0.14, -0.12, 0.12)
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

export function cameraTarget({ planeX = 0, planeY = 0, camHeight = 3.05, camZ = -8, followX = 0.62 } = {}) {
  return {
    x: (Number(planeX) || 0) * followX,
    y: (Number(planeY) || 0) + camHeight,
    z: Number(camZ) || -8,
  }
}

export function lerpScalar(current, target, ease) {
  return current + (target - current) * ease
}
