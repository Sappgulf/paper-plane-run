import { describe, expect, test } from 'vitest'

import {
  getAdaptiveQuality,
  installNativePerformanceListener,
  normalizeNativePerformanceSignal,
} from '../src/game/adaptive-quality.js'

describe('adaptive render quality', () => {
  test('keeps full quality when frame health and native conditions are stable', () => {
    expect(getAdaptiveQuality({
      status: 'stable',
      devicePixelRatio: 3,
      lowPower: false,
      nativeSignal: { thermalState: 'nominal', lowPowerMode: false, memoryPressure: false },
    })).toEqual({ level: 'high', pixelRatio: 2, shadows: true, secondaryEffects: true })
  })

  test('reduces expensive effects before gameplay when frames degrade', () => {
    expect(getAdaptiveQuality({
      status: 'degraded',
      devicePixelRatio: 3,
    })).toEqual({ level: 'medium', pixelRatio: 1.5, shadows: false, secondaryEffects: true })

    expect(getAdaptiveQuality({
      status: 'critical',
      devicePixelRatio: 3,
    })).toEqual({ level: 'low', pixelRatio: 1.25, shadows: false, secondaryEffects: false })
  })

  test('treats iOS thermal, low-power, and memory pressure as hard low-quality signals', () => {
    for (const nativeSignal of [
      { thermalState: 'serious' },
      { thermalState: 'critical' },
      { lowPowerMode: true },
      { memoryPressure: true },
    ]) {
      expect(getAdaptiveQuality({ status: 'stable', devicePixelRatio: 3, nativeSignal }))
        .toEqual({ level: 'low', pixelRatio: 1, shadows: false, secondaryEffects: false })
    }
  })

  test('normalizes malformed native bridge payloads into a safe stable signal', () => {
    expect(normalizeNativePerformanceSignal({
      thermalState: 'lava',
      lowPowerMode: 1,
      memoryPressure: 'yes',
    })).toEqual({ thermalState: 'nominal', lowPowerMode: false, memoryPressure: false })
  })

  test('subscribes to native runtime events and returns a removable listener', () => {
    const target = new EventTarget()
    const received = []
    const remove = installNativePerformanceListener({
      target,
      onSignal: (signal) => received.push(signal),
    })

    const event = new Event('paperplane:native-runtime')
    event.detail = { thermalState: 'fair', lowPowerMode: true }
    target.dispatchEvent(event)
    remove()
    target.dispatchEvent(event)

    expect(received).toEqual([{
      thermalState: 'fair',
      lowPowerMode: true,
      memoryPressure: false,
    }])
  })
})
