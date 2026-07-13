import { describe, expect, test } from 'vitest'

import { checkBudget, summarizeManifest } from '../scripts/bundle-budget.mjs'

describe('bundle budget accounting', () => {
  test('keeps entry bytes separate from deferred JavaScript bytes', () => {
    const summary = summarizeManifest(
      {
        'src/main.js': { file: 'assets/main.js', isEntry: true },
        'src/flight-engine.js': { file: 'assets/flight-engine.js' },
        'src/style.css': { file: 'assets/style.css', isEntry: true },
      },
      {
        'assets/main.js': 1200,
        'assets/flight-engine.js': 3400,
        'assets/style.css': 800,
      },
    )

    expect(summary).toEqual({ initialBytes: 1200, totalBytes: 4600 })
  })

  test('reports an initial budget breach without hiding a passing total budget', () => {
    const result = checkBudget(
      { initialBytes: 1200, totalBytes: 4600 },
      { initialBytes: 1000, totalBytes: 5000 },
    )

    expect(result.ok).toBe(false)
    expect(result.initial).toEqual({ bytes: 1200, limit: 1000, ok: false })
    expect(result.total).toEqual({ bytes: 4600, limit: 5000, ok: true })
    expect(result.failures).toEqual(['initialBytes'])
  })

  test('reports a total budget breach without hiding a passing initial budget', () => {
    const result = checkBudget(
      { initialBytes: 1200, totalBytes: 4600 },
      { initialBytes: 1500, totalBytes: 4000 },
    )

    expect(result.ok).toBe(false)
    expect(result.initial).toEqual({ bytes: 1200, limit: 1500, ok: true })
    expect(result.total).toEqual({ bytes: 4600, limit: 4000, ok: false })
    expect(result.failures).toEqual(['totalBytes'])
  })
})
