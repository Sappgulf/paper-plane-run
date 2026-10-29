import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openApp, waitForGameText } from './smoke-helpers.js'

test.describe('touch navigation', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch navigation is exercised on the phone project')

  for (const [button, mode] of [
    ['start-btn', 'classic'], ['daily-btn', 'daily'],
    ['weekly-btn', 'weekly'], ['tutorial-btn', 'tutorial'],
  ]) {
    test(`${mode} starts, pauses, resumes and returns using touch`, async ({ page }) => {
      const errors = collectConsoleErrors(page)
      await page.route('**/api/leaderboard', route => route.fulfill({ status: 503, json: { error: 'unavailable' } }))
      await openApp(page)
      await page.locator(`#${button}`).tap()
      await waitForGameText(page)
      await expect.poll(async () => (await page.evaluate(() => JSON.parse(window.render_game_to_text()))).mode, { timeout: 45_000 }).toBe(mode)
      await expect(page.locator('#hud')).toBeVisible()
      await page.locator('#pause-btn').tap()
      await expect(page.locator('#pause-overlay')).toBeVisible()
      await page.locator('#pause-resume').tap()
      await expect(page.locator('#pause-overlay')).toBeHidden()
      await page.locator('#pause-btn').tap()
      await page.locator('#pause-menu').tap()
      await expect(page.locator('#menu')).toBeVisible()
      expect(errors).toEqual([])
    })
  }

  test('each Hangar section opens through its touch tab', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await openApp(page)
    await page.locator('#hangar-btn').tap()
    for (const id of ['upgrades', 'skins', 'missions', 'achievements']) {
      await page.locator(`#hangar-tab-${id}`).tap()
      await expect(page.locator(`#tab-${id}`)).toBeVisible()
      await expect(page.locator(`#hangar-tab-${id}`)).toHaveAttribute('aria-selected', 'true')
    }
    await page.locator('#hangar-group-meta').tap()
    for (const id of ['board', 'settings', 'stats', 'postcards', 'editor']) {
      await page.locator(`#hangar-tab-${id}`).tap()
      await expect(page.locator(`#tab-${id}`)).toBeVisible()
      await expect(page.locator(`#hangar-tab-${id}`)).toHaveAttribute('aria-selected', 'true')
    }
    await page.locator('.hangar-back').tap()
    await expect(page.locator('#menu')).toBeVisible()
    expect(errors).toEqual([])
  })
})
