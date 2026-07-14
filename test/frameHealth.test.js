import { describe, expect, test, vi } from 'vitest'

import { createFrameHealthMonitor } from '../src/game/frame-health.js'

describe('frame health monitor', () => {
  test('classifies sustained frame cost without reacting to one-off spikes', () => {
    const transitions = vi.fn()
    const monitor = createFrameHealthMonitor({ sampleSize: 6, onChange: transitions })

    for (const duration of [16, 17, 15, 16, 45, 16]) monitor.sample(duration)
    expect(monitor.snapshot()).toMatchObject({ status: 'stable', samples: 6 })

    for (const duration of [29, 31, 30, 32, 29, 31]) monitor.sample(duration)
    expect(monitor.snapshot()).toMatchObject({ status: 'critical', samples: 6 })
    expect(transitions).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'critical' }))
  })

  test('reports degraded performance between stable and critical budgets', () => {
    const monitor = createFrameHealthMonitor({ sampleSize: 4 })
    for (const duration of [22, 24, 23, 25]) monitor.sample(duration)
    expect(monitor.snapshot()).toMatchObject({ status: 'degraded', averageMs: 23.5 })
  })
})
