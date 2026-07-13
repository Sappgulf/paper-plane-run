import { describe, expect, test } from 'vitest'

import { createEngineLoader } from '../src/engine-contract.js'

describe('flight engine loader', () => {
  test('preload and start share one import and one engine boot', async () => {
    let importCalls = 0
    let bootCalls = 0
    let resolveModule
    const starts = []
    const engine = {
      startMode(kind, options) {
        starts.push({ kind, options })
        return 'started'
      },
    }
    const loader = createEngineLoader(() => {
      importCalls += 1
      return new Promise((resolve) => {
        resolveModule = resolve
      })
    })

    const preload = loader.preload()
    const start = loader.start('daily', { seed: 42 })

    expect(loader.getStatus()).toBe('loading')
    expect(importCalls).toBe(1)

    resolveModule({
      bootFlightEngine() {
        bootCalls += 1
        return engine
      },
    })

    await expect(preload).resolves.toBe(engine)
    await expect(start).resolves.toBe('started')
    expect(importCalls).toBe(1)
    expect(bootCalls).toBe(1)
    expect(starts).toEqual([{ kind: 'daily', options: { seed: 42 } }])
    expect(loader.getStatus()).toBe('ready')
  })

  test('a failed import returns to idle so a later start can retry', async () => {
    let importCalls = 0
    const engine = { startMode: () => 'retried' }
    const loader = createEngineLoader(() => {
      importCalls += 1
      if (importCalls === 1) return Promise.reject(new Error('chunk unavailable'))
      return Promise.resolve({ bootFlightEngine: () => engine })
    })

    await expect(loader.preload()).rejects.toThrow('chunk unavailable')
    expect(loader.getStatus()).toBe('idle')

    await expect(loader.start('classic')).resolves.toBe('retried')
    expect(importCalls).toBe(2)
    expect(loader.getStatus()).toBe('ready')
  })
})
