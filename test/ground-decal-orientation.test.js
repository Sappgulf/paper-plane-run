import { describe, expect, it } from 'vitest'
import * as THREE from 'three'

// A flat ground decal is a plane lying on the road: its normal must stay
// vertical whatever yaw the decal fans out to. Euler order decides it. XYZ applies
// the yaw before the tilt, so any decal with a yaw leans, and some stood up as
// blank cream walls beside the road. YXZ applies the tilt first, so it stays flat.
function normalAfter(order, yaw) {
  const euler = new THREE.Euler(-Math.PI / 2, yaw, 0, order)
  const normal = new THREE.Vector3(0, 0, 1).applyEuler(euler)
  return normal
}

describe('flat ground decal orientation', () => {
  it('keeps the decal lying flat for every yaw when the tilt is applied first (YXZ)', () => {
    for (let index = 0; index < 64; index += 1) {
      const yaw = (index / 64) * Math.PI * 2
      const normal = normalAfter('YXZ', yaw)
      expect(Math.abs(normal.y)).toBeCloseTo(1, 9)
      expect(Math.abs(normal.x)).toBeLessThan(1e-9)
      expect(Math.abs(normal.z)).toBeLessThan(1e-9)
    }
  })

  it('documents the bug: the default XYZ order tilts a yawed decal off the ground', () => {
    const tilted = [0.3, 1.1, 2.4, 4.0].map(yaw => Math.abs(normalAfter('XYZ', yaw).y))
    expect(Math.min(...tilted)).toBeLessThan(0.99)
  })

  it('leaves an unyawed decal flat in either order', () => {
    expect(Math.abs(normalAfter('XYZ', 0).y)).toBeCloseTo(1, 9)
    expect(Math.abs(normalAfter('YXZ', 0).y)).toBeCloseTo(1, 9)
  })
})
