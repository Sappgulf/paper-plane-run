import { describe, expect, test } from 'vitest'
import {
  pollFirstActiveGamepad,
  sampleGamepadAxes,
  sampleGamepadButtons,
} from '../src/game/gamepad.js'

describe('Gamepad controller support', () => {
  test('ignores analog stick jitter below deadzone', () => {
    expect(sampleGamepadAxes([0.05, -0.08])).toEqual({ x: 0, y: 0 })
    expect(sampleGamepadAxes([0, 0])).toEqual({ x: 0, y: 0 })
  })

  test('normalizes and rescales analog stick above deadzone', () => {
    const res = sampleGamepadAxes([0.8, -0.6])
    expect(res.x).toBeGreaterThan(0.7)
    expect(res.y).toBeGreaterThan(0.5) // -0.6 in Gamepad API maps to +Y (climb)
  })

  test('samples D-pad buttons into directional axes', () => {
    const buttons = new Array(16).fill(null)
    buttons[14] = { pressed: true, value: 1 } // Left
    buttons[12] = { pressed: true, value: 1 } // Up
    const res = sampleGamepadButtons(buttons)
    expect(res.dpadX).toBe(-1)
    expect(res.dpadY).toBe(1)
    expect(res.tuck).toBe(false)
  })

  test('samples A, RT, LT for tuck and Start for pause', () => {
    const buttonsA = new Array(16).fill(null)
    buttonsA[0] = { pressed: true, value: 1 } // Button A
    expect(sampleGamepadButtons(buttonsA).tuck).toBe(true)

    const buttonsRT = new Array(16).fill(null)
    buttonsRT[7] = { pressed: true, value: 1 } // RT
    expect(sampleGamepadButtons(buttonsRT).tuck).toBe(true)

    const buttonsStart = new Array(16).fill(null)
    buttonsStart[9] = { pressed: true, value: 1 } // Start
    expect(sampleGamepadButtons(buttonsStart).pause).toBe(true)
    expect(sampleGamepadButtons(buttonsStart).startFly).toBe(true)

    const buttonsMute = new Array(16).fill(null)
    buttonsMute[3] = { pressed: true, value: 1 } // Y
    expect(sampleGamepadButtons(buttonsMute).mute).toBe(true)
  })

  test('polls the first connected gamepad from list', () => {
    const gp1 = { connected: false, axes: [1, 0], buttons: [] }
    const gp2 = {
      connected: true,
      axes: [0.75, 0],
      buttons: [{ pressed: true, value: 1 }], // button 0 pressed
    }
    const result = pollFirstActiveGamepad([gp1, gp2])
    expect(result).not.toBeNull()
    expect(result.x).toBeGreaterThan(0.5)
    expect(result.tuck).toBe(true)
  })

  test('handles empty or null gamepad lists safely', () => {
    expect(pollFirstActiveGamepad(null)).toBeNull()
    expect(pollFirstActiveGamepad([])).toBeNull()
    expect(pollFirstActiveGamepad([null, undefined])).toBeNull()
  })
})
