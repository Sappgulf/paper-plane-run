import { describe, expect, test, vi } from 'vitest'

import { createNotificationQueue } from '../src/game/notification-queue.js'

describe('gameplay notification queue', () => {
  test('an older timeout cannot hide a newer notification', () => {
    vi.useFakeTimers()
    const events = []
    const queue = createNotificationQueue({
      show: (message) => events.push(['show', message]),
      hide: () => events.push(['hide']),
    })

    queue.show('Old warning', { duration: 1000 })
    vi.advanceTimersByTime(700)
    queue.show('Boss phase', { duration: 1200 })
    vi.advanceTimersByTime(400)

    expect(events).toEqual([
      ['show', 'Old warning'],
      ['show', 'Boss phase'],
    ])

    vi.advanceTimersByTime(800)
    expect(events.at(-1)).toEqual(['hide'])
    vi.useRealTimers()
  })

  test('persistent notifications remain visible until explicitly cleared', () => {
    vi.useFakeTimers()
    const events = []
    const queue = createNotificationQueue({
      show: (message) => events.push(['show', message]),
      hide: () => events.push(['hide']),
    })

    queue.show('Graphics connection lost', { persistent: true })
    vi.runAllTimers()
    expect(events).toEqual([['show', 'Graphics connection lost']])

    queue.clear()
    expect(events.at(-1)).toEqual(['hide'])
    vi.useRealTimers()
  })
})
