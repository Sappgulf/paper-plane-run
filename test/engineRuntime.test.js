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
      { lowPower: true, colorblindPowers: true, arDesk: false },
      { deskAR: { active: false }, applyPerformance, rebuildPowerPalette },
    )

    expect(result.settings).toMatchObject({ lowPower: true, colorblindPowers: true })
    expect(applied).toEqual([['performance', true], ['palette', true]])
  })

  test('stops active AR when the shell turns it off', async () => {
    const stop = vi.fn()

    const result = await synchronizeRuntimeSettings(
      { arDesk: false },
      { deskAR: { active: true, stop } },
    )

    expect(stop).toHaveBeenCalledOnce()
    expect(result).toEqual({ settings: { arDesk: false }, arPermissionDenied: false })
  })

  test('rolls AR back to false when camera permission is unavailable', async () => {
    const persist = vi.fn((partial) => ({ lowPower: true, colorblindPowers: true, ...partial }))
    const applyPerformance = vi.fn()

    const result = await synchronizeRuntimeSettings(
      { lowPower: true, colorblindPowers: true, arDesk: true },
      {
        deskAR: { active: false, start: vi.fn().mockResolvedValue(false) },
        persist,
        applyPerformance,
      },
    )

    expect(persist).toHaveBeenCalledWith({ arDesk: false })
    expect(result.settings.arDesk).toBe(false)
    expect(result.arPermissionDenied).toBe(true)
    expect(applyPerformance).toHaveBeenCalledWith(expect.objectContaining({ arDesk: false }))
  })
})
