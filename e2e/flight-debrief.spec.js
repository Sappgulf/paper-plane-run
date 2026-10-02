import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openApp, tap, waitForGameText } from './smoke-helpers.js'

async function finishFlight(page) {
  if (process.env.PLAYWRIGHT_PREVIEW !== '1') {
    // Exercise the complete real simulation without tying completion to
    // software WebGL frame rates. Production retains real-time flight.
    await page.evaluate(() => { window.__paperFreeze(true); window.advanceTime(30_000) })
  }
  await expect(page.locator('#gameover')).toBeVisible({ timeout: 120_000 })
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
