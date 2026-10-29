import { expect, test } from 'vitest'
import * as THREE from 'three'
import { createBossWorkshop } from '../src/game/boss-workshop.js'
import { committedBossGap } from '../src/game/boss-director.js'

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
