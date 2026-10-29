import { expect, test } from 'vitest'
import { paperFragmentPose } from '../src/game/crash-paper.js'

test('paper fragments fan out, land above the ground and fade away', () => {
 const paths = new Set()
 for (let index=0;index<18;index++) {
  const start=paperFragmentPose({index,age:0,y:8})
  expect(start.y).toBe(8)
  const falling=paperFragmentPose({index,age:.5,y:8})
  paths.add(`${falling.x},${falling.z}`)
  const settled=paperFragmentPose({index,age:1.5,y:8})
  expect(settled.y).toBe(.12)
  expect(settled.opacity).toBe(0)
  expect(settled.scale).toBeGreaterThan(0)
 }
 expect(paths.size).toBe(18)
})
