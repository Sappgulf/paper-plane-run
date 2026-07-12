import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { loadSettings } from '../src/settings.js'

describe('first-run settings defaults', () => {
  let originalMaxTouchPoints

  beforeEach(() => {
    originalMaxTouchPoints = navigator.maxTouchPoints
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: originalMaxTouchPoints, configurable: true })
  })

  test('defaults to joystick + low-power on a touch device', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true })
    const s = loadSettings()
    expect(s.controlMode).toBe('joystick')
    expect(s.lowPower).toBe(true)
  })

  test('defaults to mouse + full quality on a non-touch device', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true })
    const s = loadSettings()
    expect(s.controlMode).toBe('mouse')
    expect(s.lowPower).toBe(false)
  })

  test('never overrides a saved preference on later loads', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true })
    localStorage.setItem('paper-plane-run-settings-v1', JSON.stringify({ lowPower: false }))
    expect(loadSettings().lowPower).toBe(false)
  })
})
