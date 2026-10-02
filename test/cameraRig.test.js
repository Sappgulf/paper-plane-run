import { describe, expect, test } from 'vitest'
import * as THREE from 'three'
import { createPaperPlane, PLANE_SILHOUETTES } from '../src/plane-models.js'
import { bankRoll, cameraFlightDistance, cameraLateralPosition, cameraLean, cameraTarget, shadowForPlane } from '../src/game/camera-rig.js'

describe('camera rig', () => {
  test('leans with velocity and clamps', () => {
    const { leanX, leanY } = cameraLean({ velX: 20, velY: -20 })
    expect(leanX).toBeCloseTo(1.6)
    expect(leanY).toBeCloseTo(-0.8)
    const mid = cameraLean({ velX: 1, velY: 1 })
    expect(mid.leanX).toBeCloseTo(0.1)
    expect(mid.leanY).toBeCloseTo(0.08)
  })

  test('bank roll is gentle and clamped', () => {
    expect(bankRoll({ bank: 0 })).toBe(0)
    expect(bankRoll({ bank: 2 })).toBeCloseTo(0.05)
    expect(bankRoll({ bank: -2 })).toBeCloseTo(-0.05)
  })

  test('reduced motion keeps the horizon stable through banks and dives', () => {
    expect(cameraLean({ velX: 30, velY: -30, reducedMotion: true })).toEqual({ leanX: 0, leanY: 0 })
    expect(bankRoll({ bank: 1, reducedMotion: true })).toBe(0)
  })

  test('shadow shrinks and fades with altitude', () => {
    const low = shadowForPlane({ planeY: 0, planeX: 1, bank: 0, maxY: 20 })
    const high = shadowForPlane({ planeY: 20, planeX: 1, bank: 0, maxY: 20 })
    expect(low.scale).toBeGreaterThan(high.scale)
    expect(low.opacity).toBeGreaterThan(high.opacity)
    expect(low.x).toBe(1)
  })

  test('camera target follows plane proportion', () => {
    const t = cameraTarget({ planeX: 10, planeY: 5, camHeight: 3, camZ: -8, followX: 0.5 })
    expect(t.x).toBe(5)
    expect(t.y).toBe(8)
    expect(t.z).toBe(-8)
  })

  test('handles garbage input safely', () => {
    expect(cameraLean({ velX: NaN, velY: 'bad' }).leanX).toBe(0)
    expect(bankRoll({ bank: null })).toBe(0)
    expect(shadowForPlane({}).scale).toBeGreaterThan(0.5)
  })

  test('keeps every folded wing on screen at both route edges, including portrait boost with max wings', () => {
    for (const silhouette of PLANE_SILHOUETTES) {
      const plane = createPaperPlane({ THREE, silhouette, withShield: false })
      for (const aspect of [390/844,844/390,1280/720]) {
        for (const lane of [-13,13]) for (const direction of [-1,1]) for (const boost of [false,true]) {
          const camera = new THREE.PerspectiveCamera(boost ? 72 : 60,aspect,.1,500)
          const scale = 1.44*1.12*(boost ? 1.1 : 1)
          plane.position.set(lane,10,0); plane.scale.setScalar(scale)
          plane.rotation.set(.25,.28*direction,.7*direction)
          plane.updateMatrixWorld(true)
          camera.position.set(cameraLateralPosition({ current: 0, planeX: lane, aspect }),13.05+(boost ? .4 : 0),
            -cameraFlightDistance({ aspect, fov: camera.fov, planeScale: scale }))
          camera.lookAt(lane+direction*1.6*Math.min(1,aspect),9.9,13)
          camera.rotation.z += bankRoll({ bank: direction })
          camera.updateMatrixWorld(true)
          for (const wing of [plane.userData.wingL,plane.userData.wingR]) {
            const vertices = wing.geometry.attributes.position
            for (let i=0;i<vertices.count;i++) {
              const ndc = wing.localToWorld(new THREE.Vector3().fromBufferAttribute(vertices,i)).project(camera)
              expect(Math.abs(ndc.x),`${silhouette} ${aspect} lane ${lane} boost ${boost}`).toBeLessThan(.95)
              expect(Math.abs(ndc.y)).toBeLessThan(.95)
            }
          }
        }
      }
      plane.traverse(child=>child.geometry?.dispose())
    }
  })
})
