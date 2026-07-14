import { describe, expect, test } from 'vitest'
import * as THREE from 'three'
import {
  PLANE_COLLISION_RADIUS,
  PLANE_SILHOUETTES,
  createPaperPlane,
  getPaperFlightPose,
  getPlaneGeometrySpec,
} from '../src/plane-models.js'

const EXPECTED_FAMILIES = ['classic', 'dart', 'glider', 'stunt']

describe('fair plane silhouette registry', () => {
  test('derives bank, pitch, and subtle fold flex from live flight motion', () => {
    const pose = getPaperFlightPose({
      horizontalVelocity: 18,
      verticalVelocity: -8,
      speed: 58,
      elapsed: 1.25,
    })
    expect(pose.roll).toBeGreaterThan(0)
    expect(pose.pitch).toBeGreaterThan(0)
    expect(pose.yaw).toBeGreaterThan(0)
    expect(pose.wingFlex).toBeGreaterThan(0)
    expect(pose.trailIntensity).toBeGreaterThan(0.5)

    expect(getPaperFlightPose({ speed: 58, elapsed: 1.25, reducedMotion: true }).wingFlex).toBe(0)
  })
  test('defines exactly four cosmetic families with positive normalized dimensions', () => {
    expect(PLANE_SILHOUETTES).toEqual(EXPECTED_FAMILIES)

    for (const silhouette of EXPECTED_FAMILIES) {
      const spec = getPlaneGeometrySpec(silhouette)
      expect(spec.id).toBe(silhouette)
      expect(spec.label).toMatch(/Fold|Dart|Glider/)
      expect(Object.keys(spec.dimensions)).toEqual(['width', 'length', 'height'])
      for (const dimension of Object.values(spec.dimensions)) {
        expect(dimension).toBeGreaterThan(0)
        expect(dimension).toBeLessThanOrEqual(1)
      }
    }
  })

  test('keeps one collision radius and no runtime stat advantages', () => {
    const forbiddenRuntimeStats = ['speed', 'handling', 'lift', 'scoreMultiplier', 'collisionScale']

    for (const silhouette of EXPECTED_FAMILIES) {
      const spec = getPlaneGeometrySpec(silhouette)
      expect(spec.collisionRadius).toBe(PLANE_COLLISION_RADIUS)
      for (const field of forbiddenRuntimeStats) expect(spec).not.toHaveProperty(field)
    }

    expect(PLANE_COLLISION_RADIUS).toBeGreaterThan(0)
  })

  test('builds distinct positive geometry while retaining stable animated child names', () => {
    const materials = {
      body: new THREE.MeshBasicMaterial({ color: 0xfff6ec, side: THREE.DoubleSide }),
      accent: new THREE.MeshBasicMaterial({ color: 0xf0956a, side: THREE.DoubleSide }),
      trail: new THREE.PointsMaterial({ color: 0xfff0c0, size: 0.22 }),
    }
    const bounds = new Set()

    for (const silhouette of EXPECTED_FAMILIES) {
      const plane = createPaperPlane({ THREE, silhouette, materials, withShield: true })
      const unshieldedPlane = createPaperPlane({ THREE, silhouette, materials, withShield: false })
      unshieldedPlane.updateMatrixWorld(true)
      const size = new THREE.Box3().setFromObject(unshieldedPlane).getSize(new THREE.Vector3())

      expect(size.x).toBeGreaterThan(0)
      expect(size.y).toBeGreaterThan(0)
      expect(size.z).toBeGreaterThan(0)
      expect(plane.getObjectByName('wingL')).toBe(plane.userData.wingL)
      expect(plane.getObjectByName('wingR')).toBe(plane.userData.wingR)
      expect(plane.getObjectByName('shieldBubble')).toBeTruthy()
      expect(plane.getObjectByName('upgradeTrail')).toBe(plane.userData.upgradeTrail)
      expect(plane.userData.collisionRadius).toBe(PLANE_COLLISION_RADIUS)
      bounds.add([size.x, size.y, size.z].map((value) => value.toFixed(3)).join(':'))
    }

    expect(bounds.size).toBe(EXPECTED_FAMILIES.length)
  })

  test('omits only the optional shield for non-player models', () => {
    const plane = createPaperPlane({ THREE, silhouette: 'dart', materials: {}, withShield: false })

    expect(plane.getObjectByName('wingL')).toBeTruthy()
    expect(plane.getObjectByName('wingR')).toBeTruthy()
    expect(plane.getObjectByName('upgradeTrail')).toBeTruthy()
    expect(plane.getObjectByName('shieldBubble')).toBeUndefined()
  })
})
