import { describe, expect, test } from 'vitest'
import { shareBaseUrl, withShareBase } from '../src/share-url.js'

describe('share URLs', () => {
  test('falls back to the public site outside a browser origin', () => {
    expect(shareBaseUrl()).toBe('https://paper-plane-run.vercel.app/')
  })

  test('builds query links on the public base, not the custom-scheme shell', () => {
    const url = new URL(withShareBase({ d: 420, s: 7, m: 'normal' }))
    expect(url.origin).toBe('https://paper-plane-run.vercel.app')
    expect(url.searchParams.get('d')).toBe('420')
    expect(url.searchParams.get('s')).toBe('7')
    expect(url.searchParams.get('m')).toBe('normal')
  })
})
