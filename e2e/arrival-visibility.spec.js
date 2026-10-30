import { expect, test } from '@playwright/test'
import { openApp } from './smoke-helpers.js'

test('journey arrival restores a visible plane even when the last flight frame blinked', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'requires deterministic flight fixture')
  await openApp(page, '/?e2e=arrival#test-journey-city')
  await page.waitForFunction(() => typeof window.__paperPose === 'function')
  const frames = await page.evaluate(() => {
    window.__paperFreeze(true)
    let previous = window.__paperPose()
    let hiddenFlightFrames = 0
    for (let i = 0; i < 1500; i++) {
      const flight = JSON.parse(window.render_game_to_text())
      if (flight.state === 'playing' && flight.distance >= 340) {
        // Finish can now happen in the same update that crosses 350m, or
        // later while a gate resolves. Hide before each candidate update so
        // the transition itself must restore the plane.
        window.__paperHidePlane()
        previous = window.__paperPose()
        window.advanceTime(16)
        const current = window.__paperPose()
        if (current.state === 'dead') return { previous, current, hiddenFlightFrames }
        if (!current.planeVisible) hiddenFlightFrames++
        continue
      }
      window.advanceTime(16)
      const current = window.__paperPose()
      if (current.state === 'playing' && !current.planeVisible) hiddenFlightFrames++
      previous = current
    }
    return { previous }
  })
  expect(frames.current?.state).toBe('dead')
  expect(frames.hiddenFlightFrames).toBe(0)
  expect(frames.previous.planeVisible).toBe(false)
  expect(frames.current.planeVisible).toBe(true)
  expect(frames.current.wingBounds.min[0]).toBeLessThan(1)
  expect(frames.current.wingBounds.max[0]).toBeGreaterThan(-1)
  expect(frames.current.boostStreamerVisible).toBe(false)
  await expect(page.locator('#zone-banner')).toBeHidden()
})
