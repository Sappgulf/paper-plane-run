import { expect, test } from '@playwright/test'
import { openApp, openFixture, waitForGameText } from './smoke-helpers.js'

test('the opening throw settles while the flight continues', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'uses a development fixture')
  await openFixture(page, '/#test-launch-throw', 'test-launch-throw')
  const result = await page.evaluate(() => {
    window.advanceTime(100)
    const first = { state: JSON.parse(window.render_game_to_text()), pose: window.__paperPose() }
    window.advanceTime(600)
    return { first, last: { state: JSON.parse(window.render_game_to_text()), pose: window.__paperPose() } }
  })
  expect(result.first.pose.planeVisible).toBe(true)
  expect(result.last.pose.planeVisible).toBe(true)
  expect(result.first.pose.planePos[2]).toBeLessThan(0)
  expect(result.last.pose.planePos[2]).toBe(0)
  expect(result.last.state.distance).toBeGreaterThan(result.first.state.distance)
  expect(result.last.state.state).toBe('playing')
})

for (const reducedMotion of [false, true]) {
  test(`a crash lands before the result screen${reducedMotion ? ' with reduced motion' : ''}`, async ({ page }) => {
    test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'uses a development fixture')
    await page.addInitScript(reduced => localStorage.setItem('paper-plane-run-settings-v1', JSON.stringify({ reducedMotion: reduced })), reducedMotion)
    await openApp(page, '/#test-crash-impact')
    await waitForGameText(page)
    await expect.poll(() => page.evaluate(() => JSON.parse(window.render_game_to_text()).state)).toBe('dead')
    const result = await page.evaluate(() => {
      window.advanceTime(850)
      const impact = JSON.parse(window.render_game_to_text())
      window.advanceTime(400)
      return { impact, finished: JSON.parse(window.render_game_to_text()) }
    })
    expect(result.impact.crash.fragments).toBe(reducedMotion ? 0 : 18)
    expect(result.impact.crash.landed).toBe(true)
    expect(result.impact.crash.y).toBeLessThan(0.4)
    expect(result.finished.state).toBe('dead')
    await expect(page.locator('#gameover')).toBeVisible()
  })
}
