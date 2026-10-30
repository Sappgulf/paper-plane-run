import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openApp, tap } from './smoke-helpers.js'

test('flight guide loads the illustrated enemy tips and closes', async ({ page }, info) => {
  const errors = collectConsoleErrors(page)
  await openApp(page)
  await tap(page.locator('#flight-guide-btn'))
  const dialog = page.getByRole('dialog', { name: 'A good fold goes further.' })
  await expect(dialog).toBeVisible()
  const figure = dialog.locator('.manual-sky-watch')
  await figure.scrollIntoViewIfNeeded()
  await expect(figure.getByText('Watch the sky')).toBeVisible()
  await expect.poll(() => figure.locator('img').evaluate((image) => image.complete && image.naturalWidth)).toBeGreaterThan(0)
  await page.screenshot({ path: `output/sky-watch-guide-${info.project.name}.png` })
  await dialog.locator('#flight-guide-close').click()
  await expect(dialog).toBeHidden()
  expect(errors).toEqual([])
})
