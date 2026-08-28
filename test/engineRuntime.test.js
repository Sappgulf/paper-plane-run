import { describe, expect, test, vi } from 'vitest'

import { selectLayoutForStart, synchronizeRuntimeSettings } from '../src/engine-runtime.js'

describe('flight engine runtime synchronization', () => {
  test('uses every supplied custom layout, including repeated route plays', () => {
    const first = { name: 'First route', items: [{ t: 'star' }] }
    const second = { name: 'Current route', items: [{ t: 'bird' }] }

    let selected = selectLayoutForStart(null, 'layout', { layout: first })
    selected = selectLayoutForStart(selected, 'layout', { layout: second })

    expect(selected).toBe(second)
    expect(selectLayoutForStart(selected, 'layout')).toBe(second)
    expect(selectLayoutForStart(selected, 'classic', { layout: first })).toBe(second)
  })

  test('applies current low-power and colorblind settings to the live engine', async () => {
    const applied = []
    const rebuildPowerPalette = vi.fn((settings) => applied.push(['palette', settings.colorblindPowers]))
    const applyPerformance = vi.fn((settings) => applied.push(['performance', settings.lowPower]))

    const result = await synchronizeRuntimeSettings(
      { lowPower: true, colorblindPowers: true },
      { applyPerformance, rebuildPowerPalette },
    )

    expect(result.settings).toMatchObject({ lowPower: true, colorblindPowers: true })
    expect(applied).toEqual([['performance', true], ['palette', true]])
  })

  // AR is gone, but the result shape is part of the contract the iOS shell and
  // the settings panel read, so the flag has to keep existing and keep being false.
  test('always reports no AR permission problem now that AR is gone', async () => {
    const result = await synchronizeRuntimeSettings({ lowPower: false })
    expect(result.arPermissionDenied).toBe(false)
    expect(result.settings).toEqual({ lowPower: false })
  })
})
