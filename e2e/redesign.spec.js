import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openApp, tap, waitForGameText } from './smoke-helpers.js'

test('workshop search keeps focus through a complete query and group filters recover empty results', async ({ page }) => {
  await openApp(page)
  await tap(page.locator('#hangar-btn'))
  const search = page.getByRole('searchbox', { name: 'Search upgrades' })
  await search.pressSequentially('Fold Handling')
  await expect(search).toHaveValue('Fold Handling')
  await expect(search).toBeFocused()
  await expect(page.locator('.upgrade-card')).toHaveCount(1)
  await tap(page.getByRole('button', { name: 'Clear search', exact: true }))
  await tap(page.getByRole('button', { name: 'Style', exact: true }))
  await expect(page.locator('.upgrade-card')).toHaveCount(2)
  await search.fill('unfindable fold')
  await expect(page.locator('#upgrade-empty')).toBeVisible()
  await tap(page.getByRole('button', { name: 'Reset filters', exact: true }))
  await expect(page.locator('.upgrade-card')).toHaveCount(14)
  await expect(search).toBeFocused()
})

test('progress export, invalid preview, restore and undo preserve the complete flight log', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('redesign-seeded')) return
    localStorage.setItem('redesign-seeded', '1')
    localStorage.setItem('paper-plane-run-wallet', '42')
    localStorage.setItem('paper-plane-run-wallet-migrated', '1')
    localStorage.setItem('paper-plane-run-lifetime-stars', '65')
    localStorage.setItem('paper-plane-run-name', 'Milo')
    localStorage.setItem('paper-plane-run-upgrades', '{"handling":1}')
    localStorage.setItem('paper-plane-run-settings-v1', '{"controlMode":"joystick","arDesk":false}')
  })
  const openKit = async () => {
    await tap(page.locator('#hangar-btn'))
    await tap(page.locator('#hangar-group-meta'))
    await tap(page.locator('#hangar-tab-settings'))
  }
  await openApp(page)
  await openKit()
  await tap(page.locator('#backup-export'))
  const original = await page.locator('#backup-export-text').inputValue()
  const saved = JSON.parse(original)
  expect(saved.entries['paper-plane-run-wallet']).toBe('42')
  expect(saved.entries['paper-plane-run-upgrades']).toBe('{"handling":1}')
  expect(JSON.parse(saved.entries['paper-plane-run-settings-v1']).arDesk).toBe(false)
  expect(saved.entries['paper-plane-run-disable-sw']).toBeUndefined()
  // This verifies the real download path, including its bytes.
  const downloadPromise = page.waitForEvent('download')
  await tap(page.locator('#backup-download'))
  const download = await downloadPromise
  const { readFile } = await import('node:fs/promises')
  expect(await readFile(await download.path(), 'utf8')).toBe(original)
  await tap(page.locator('.backup-import summary'))
  await page.locator('#backup-import-text').fill('{bad save}')
  await tap(page.locator('#backup-preview-btn'))
  await expect(page.locator('#backup-status')).toContainText('not a readable')
  await expect(page.locator('#backup-preview')).toBeHidden()
  expect(await page.evaluate(() => localStorage.getItem('paper-plane-run-wallet'))).toBe('42')
  saved.entries['paper-plane-run-wallet'] = '88'
  saved.entries['paper-plane-run-name'] = 'Pip'
  await page.locator('#backup-file').setInputFiles({
    name: 'paper-plane-progress.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)),
  })
  await expect(page.locator('#backup-preview-summary')).toContainText('Pip · 88★')
  // Editing after validation must invalidate the preview.
  await page.locator('#backup-import-text').fill(original)
  await expect(page.locator('#backup-preview')).toBeHidden()
  await page.locator('#backup-import-text').fill(JSON.stringify(saved))
  await tap(page.locator('#backup-preview-btn'))
  await page.screenshot({ path: `output/redesign-${testInfo.project.name}-restore-preview.png` })
  await tap(page.locator('#backup-restore'))
  await expect(page.locator('#menu')).toBeVisible()
  await expect(page.locator('#pilot-name')).toHaveValue('Pip')
  await expect(page.locator('#wallet-stars')).toHaveText('88')
  await openKit()
  await tap(page.locator('#backup-undo'))
  await expect(page.locator('#menu')).toBeVisible()
  await expect(page.locator('#pilot-name')).toHaveValue('Milo')
  await expect(page.locator('#wallet-stars')).toHaveText('42')
  expect(await page.evaluate(() => localStorage.getItem('paper-plane-run-upgrades'))).toBe('{"handling":1}')
  expect(await page.evaluate(() => localStorage.getItem('redesign-seeded'))).toBe('1')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('paper-plane-run-settings-v1')).arDesk)).toBe(false)
})


test('all six paper landscapes render with readable flight UI and bounded scenery cost', async ({ page }, testInfo) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'representative scene captures use development-only fixtures')
  test.slow()
  const errors = collectConsoleErrors(page)
  const readings = []
  for (const zone of ['city', 'harbor', 'storm', 'sunset', 'aurora', 'midnight']) {
    await openApp(page, `/?scene=${zone}#test-landscape-${zone}`)
    await waitForGameText(page)
    await expect(page.locator('#hud')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-zone', zone)
    await expect(page.locator('#altitude-hud')).toBeVisible()
    await page.screenshot({ path: `output/redesign-${testInfo.project.name}-flight-${zone}.png` })
    const state = await page.evaluate(() => JSON.parse(window.render_game_to_text()))
    readings.push({ zone, quality: state.performance.quality.level, ...state.performance.renderer })
    expect(state.performance.renderer.drawCalls).toBeLessThan(500)
    expect(state.performance.renderer.geometries).toBeLessThan(600)
    expect(state.performance.renderer.textures).toBeLessThan(150)
  }
  expect(errors).toEqual([])
  await testInfo.attach('scene-cost', { body: JSON.stringify(readings, null, 2), contentType: 'application/json' })
})
