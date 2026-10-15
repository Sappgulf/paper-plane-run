import { describe, expect, test } from 'vitest'
import { buildFlightDebrief } from '../src/game/flight-debrief.js'

describe('flight debrief', () => {
  test('distinguishes a held tuck from an ordinary loss of height', () => {
    expect(buildFlightDebrief({ reason: 'Nosed into the paper ground', tucking: true }).advice).toContain('Release Tuck')
    expect(buildFlightDebrief({ reason: 'Nosed into the paper ground', tucking: false }).advice).toContain('green UPDRAFT columns')
  })
  test.each(['wind', 'stapler', 'scissors'])('explains the %s boss passage', kind => {
    expect(buildFlightDebrief({ reason: `Missed the ${kind} ring!` }).title).toBe('Read the passage early')
  })
  test('a dive into a boss gate is named as the cause, not just the passage', () => {
    expect(buildFlightDebrief({ reason: 'Missed the wind ring!', tucking: true }).advice).toContain('Release Tuck before the gate')
    expect(buildFlightDebrief({ reason: 'Missed the wind ring!', tucking: false }).advice).toContain('outlined opening')
  })
  test('clean endings celebrate the actual mode', () => {
    expect(buildFlightDebrief({ reason: 'Tutorial complete!' }).title).toBe('Practice complete')
    expect(buildFlightDebrief({ reason: 'Journey route complete!' }).advice).toContain('route is stamped')
    expect(buildFlightDebrief({ reason: 'Tangled with paper birds' }).title).toBe('Find your next line')
  })
  test('shows at most three recorded achievements, in useful order', () => {
    expect(buildFlightDebrief({ stats: { gauntlets: 2, threads: 1, flares: 3, fevers: 1, powers: 5 } }).highlights)
      .toEqual([
        { id: 'gauntlets', label: 'Gauntlets cleared', value: 2 },
        { id: 'threads', label: 'Gap threaded', value: 1 },
        { id: 'flares', label: 'Clean flares', value: 3 },
      ])
  })
  test('a single count reads in the singular', () => {
    expect(buildFlightDebrief({ stats: { gauntlets: 1, flares: 1, powers: 1 } }).highlights.map(({ label }) => label))
      .toEqual(['Gauntlet cleared', 'Clean flare', 'Power pickup'])
  })
  test('omits absent, zero and malformed counters instead of inventing achievements', () => {
    expect(buildFlightDebrief({ stats: { flares: NaN, fevers: Infinity, threads: -1, powers: 0 } }).highlights).toEqual([])
    expect(buildFlightDebrief({ stats: null }).highlights).toEqual([])
  })
})
