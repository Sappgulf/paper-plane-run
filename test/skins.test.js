import { beforeEach, describe, expect, test } from 'vitest'
import { listSkins } from '../src/skins.js'
import { UPGRADES, doPrestige } from '../src/upgrades.js'

describe('prestige-gated skin', () => {
  beforeEach(() => {
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
  })

  test('Golden Fold skin is locked before prestige and unlocks after', () => {
    const before = listSkins().find((s) => s.id === 'goldenfold')
    expect(before.unlocked).toBe(false)

    const maxed = {}
    for (const u of UPGRADES) maxed[u.id] = u.max
    localStorage.setItem('paper-plane-run-upgrades', JSON.stringify(maxed))
    expect(doPrestige().ok).toBe(true)

    const after = listSkins().find((s) => s.id === 'goldenfold')
    expect(after.unlocked).toBe(true)
  })
})
