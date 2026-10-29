import { expect, test } from 'vitest'
import * as THREE from 'three'
import { createBossWorkshop } from '../src/game/boss-workshop.js'
import { committedBossGap, bossAssistY, bossFlightReadout, getBossFlightPattern } from '../src/game/boss-director.js'

test('every workshop leaves the complete authored opening clear', () => {
 for(const kind of ['scissors','wind','stapler','punch']) {
  const group=createBossWorkshop({kind,halfWidth:4.8,halfHeight:4.4})
  group.updateMatrixWorld(true)
  for(const mesh of group.children) {
   const bounds=new THREE.Box3().setFromObject(mesh)
   const outside=bounds.max.x < -4.8 || bounds.min.x > 4.8 || bounds.max.y < -4.4 || bounds.min.y > 4.4
   expect(outside,`${kind}: frame covers opening`).toBe(true)
  }
 }
})
test('the passage follows early, locks on final approach and stays locked after steering', () => {
 expect(committedBossGap({targetY:12,previousY:10,bossZ:23})).toBe(12)
 const locked=committedBossGap({targetY:8,previousY:12,bossZ:22})
 expect(locked).toBe(12)
 expect(committedBossGap({targetY:6,previousY:8,lockedY:locked,bossZ:3})).toBe(12)
})

test('final assist converges on the visible locked opening without recomputing a lane', () => {
  expect(bossAssistY({playerY:14,gapY:8,dt:.1})).toBeCloseTo(12.56)
  expect(bossAssistY({playerY:7,gapY:12,dt:1})).toBe(12)
  expect(bossAssistY({playerY:10,gapY:8,dt:-1})).toBe(10)
})
test('boss strip communicates approach, locked line, distance and existing precision reward', () => {
  expect(bossFlightReadout({kind:'wind',bossZ:60,initialZ:120})).toMatchObject({name:'Crosswind Mill',progress:.5,range:'60m',phase:'Approach · line up'})
  expect(bossFlightReadout({kind:'punch',bossZ:-1,initialZ:120,locked:true,centered:true})).toMatchObject({name:'Punch Foundry',progress:1,range:'0m',phase:'Line set · hold course',guidance:'On line · hold for +2★'})
})

test('boss approach profiles ask for distinct lines, mirror on repeat, and scale by difficulty', () => {
  const kinds = ['scissors','wind','stapler','punch']
  const lines = kinds.map((kind,index)=>getBossFlightPattern({kind,index}).x)
  expect(new Set(lines).size).toBe(4)
  for(const [index,kind] of kinds.entries()) {
    const first = getBossFlightPattern({kind,index})
    expect(getBossFlightPattern({kind,index:index+4}).x).toBe(-first.x)
    const easy = getBossFlightPattern({kind,index,difficulty:'easy'})
    const hard = getBossFlightPattern({kind,index,difficulty:'hard'})
    expect(Math.abs(easy.x)).toBeLessThan(Math.abs(first.x))
    expect(Math.abs(hard.x)).toBeGreaterThan(Math.abs(first.x))
    expect(Math.abs(hard.x)).toBeLessThanOrEqual(5.5)
    expect(easy.tracking).toBeGreaterThan(hard.tracking)
  }
})
