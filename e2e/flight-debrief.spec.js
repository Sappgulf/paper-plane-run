import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openApp, tap, waitForGameText } from './smoke-helpers.js'

test('leaving a flight clears active magnet feedback', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'requires a development-only simulation fixture')
  await openApp(page, '/?upgrade-proof=max#test-upgrades-shield')
  await expect(page.locator('#magnet-pull-trail')).toBeVisible({ timeout: 45_000 })
  await page.keyboard.press('Escape')
  await tap(page.locator('#pause-menu'))
  await expect(page.locator('#menu')).toBeVisible()
  await expect(page.locator('#magnet-pull-trail')).toBeHidden()
  await expect(page.locator('#magnet-pull-trail')).toHaveAttribute('data-active', 'false')
})

async function finishFlight(page) {
  if (process.env.PLAYWRIGHT_PREVIEW !== '1') {
    // Exercise the complete real simulation without tying completion to
    // software WebGL frame rates. Production retains real-time flight.
    await page.evaluate(() => { window.__paperFreeze(true); window.advanceTime(30_000) })
  }
  await expect(page.locator('#gameover')).toBeVisible({ timeout: 120_000 })
}

test('a completed flight reports when its online score was submitted', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'uses development-only time stepping')
  await page.route('**/api/leaderboard', async route => {
    const body = route.request().postDataJSON()
    await route.fulfill({ status: body.action === 'start' ? 201 : 200, json: body.action === 'start' ? { runId: 'a'.repeat(32) } : { ok: true } })
  })
  await openApp(page)
  const started = page.waitForResponse(response => response.url().includes('/api/leaderboard') && response.request().postDataJSON()?.action === 'start')
  await tap(page.locator('#start-btn'))
  await started
  await waitForGameText(page)
  await page.keyboard.down('Space')
  await finishFlight(page)
  await page.keyboard.up('Space')
  await expect(page.locator('#score-sync-status')).toContainText('Online score submitted')
})

test('an unavailable leaderboard leaves the flight score on the device', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'uses development-only time stepping')
  await page.route('**/api/leaderboard', route => route.fulfill({ status: 503, json: { error: 'unavailable' } }))
  await openApp(page)
  await tap(page.locator('#start-btn'))
  await waitForGameText(page)
  await page.keyboard.down('Space')
  await finishFlight(page)
  await page.keyboard.up('Space')
  await expect(page.locator('#score-sync-status')).toContainText('Online score unavailable')
  const localScores = await page.evaluate(() => JSON.parse(localStorage.getItem('paper-plane-run-lb-local') || '[]'))
  expect(localScores[0].distance).toBeGreaterThan(0)
})

for (const [kind, startDate, storageKey] of [
  ['daily', '2026-01-01T23:59:50Z', 'paper-plane-run-lb-daily2026-01-01normal'],
  ['weekly', '2026-11-01T23:59:50Z', 'paper-plane-run-lb-weekly2026-W44normal'],
]) {
  test(`a ${kind} flight crossing a UTC boundary stays in its starting period`, async ({ page }) => {
    test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'uses development-only time stepping')
    await page.addInitScript(date => {
      const NativeDate = Date
      window.__testDate = NativeDate.parse(date)
      window.Date = class extends NativeDate {
        constructor(...args) { super(...(args.length ? args : [window.__testDate])) }
        static now() { return window.__testDate }
      }
    }, startDate)
    await page.route('**/api/leaderboard', async route => {
      const body = route.request().postDataJSON()
      await route.fulfill({ status: body.action === 'start' ? 201 : 200, json: body.action === 'start' ? { runId: 'a'.repeat(32) } : { ok: true } })
    })
    await openApp(page)
    await tap(page.locator(`#${kind}-btn`))
    await waitForGameText(page)
    await page.evaluate(() => { window.__testDate += 20_000 })
    await page.keyboard.down('Space')
    await finishFlight(page)
    await page.keyboard.up('Space')
    const stored = await page.evaluate(key => localStorage.getItem(key), storageKey)
    expect(JSON.parse(stored || '[]').length).toBeGreaterThan(0)
  })
}

test('quitting a resumed flight clears every flight banner and its timer', async ({ page }) => {
  await openApp(page)
  await tap(page.locator('#tutorial-btn'))
  await waitForGameText(page)
  await page.keyboard.press('Escape')
  await tap(page.locator('#pause-resume'))
  await page.keyboard.press('Escape')
  await tap(page.locator('#pause-menu'))
  await expect(page.locator('#menu')).toBeVisible()
  for (const id of ['power-banner', 'zone-banner', 'wind-banner']) {
    await expect(page.locator(`#${id}`)).toBeHidden()
    await expect(page.locator(`#${id}`)).toHaveText('')
  }
  const state = await page.evaluate(() => JSON.parse(window.render_game_to_text()))
  expect(state.banners).toEqual({ zone: null, action: null })
})

test('a held tuck ends with useful advice, an accurate summary and keyboard recovery', async ({ page }, testInfo) => {
  test.slow()
  const errors = collectConsoleErrors(page)
  await page.addInitScript(() => {
    localStorage.setItem('paper-plane-run-settings-v1', JSON.stringify({ lowPower: true }))
  })
  await openApp(page)
  await tap(page.locator('#tutorial-btn'))
  await waitForGameText(page)
  await page.keyboard.down('Space')
  await finishFlight(page)
  await page.keyboard.up('Space')
  await expect(page.locator('#final-detail')).toHaveText('Nosed into the paper ground')
  await expect(page.locator('#flight-debrief')).toContainText('Release Tuck while you still have height')
  await expect(page.locator('#run-summary')).not.toContainText('Personal best')
  await expect(page.locator('#run-summary')).not.toContainText('0x')
  await expect(page.locator('#retry-btn')).toBeFocused()
  await expect(page.locator('#practice-again-btn')).toBeHidden()
  await page.screenshot({ path: `output/round-two-${testInfo.project.name}-ground-debrief.png` })
  await page.keyboard.press('Space')
  await expect(page.locator('#hud')).toBeVisible()
  expect(errors).toEqual([])
})

test('completed practice offers Classic and a deliberate practice replay', async ({ page }, testInfo) => {
  test.slow()
  const errors = collectConsoleErrors(page)
  await page.addInitScript(() => {
    localStorage.setItem('paper-plane-run-settings-v1', JSON.stringify({ reducedMotion: true, lowPower: true }))
    localStorage.setItem('paper-plane-run-best-normal', '1')
  })
  await openApp(page)
  await tap(page.locator('#tutorial-btn'))
  await waitForGameText(page)
  await finishFlight(page)
  await expect(page.locator('#gameover-title')).toHaveText('Tutorial complete!')
  await expect(page.locator('#flight-debrief')).toContainText('Practice complete')
  await expect(page.locator('#run-summary')).not.toContainText('Personal best')
  await expect(page.locator('#retry-btn')).toHaveText('Fly Classic')
  await expect(page.locator('#retry-btn')).toBeFocused()
  const finished = await page.evaluate(() => JSON.parse(window.render_game_to_text()))
  await expect(page.locator('#final-score')).toContainText(`${finished.distance}m`)
  await page.screenshot({ path: `output/round-two-${testInfo.project.name}-tutorial-debrief.png` })
  await tap(page.locator('#practice-again-btn'))
  await expect.poll(() => page.evaluate(() => JSON.parse(window.render_game_to_text()).mode)).toBe('tutorial')
  await expect(page.locator('#practice-again-btn')).toBeHidden()
  await finishFlight(page)
  await tap(page.locator('#retry-btn'))
  await expect.poll(() => page.evaluate(() => JSON.parse(window.render_game_to_text()).mode)).toBe('classic')
  expect(errors).toEqual([])
})
