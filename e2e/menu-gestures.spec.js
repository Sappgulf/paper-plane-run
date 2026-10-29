import { expect, test } from '@playwright/test'
import { openApp, tap, collectConsoleErrors } from './smoke-helpers.js'
import { panRow } from './touch-helpers.js'

test('phone Hangar tabs and upgrade filters pan to their clipped options', async ({page},info) => {
  test.skip(info.project.name !== 'mobile','requires touch panning')
  const errors=collectConsoleErrors(page)
  await openApp(page)
  await tap(page.locator('#hangar-btn'))
  await panRow(page,'.hangar-tabs')
  await expect.poll(()=>page.locator('.hangar-tabs').evaluate(node=>node.scrollLeft)).toBeGreaterThan(20)
  await expect(page.locator('#hangar-tab-achievements')).toBeInViewport({ratio:1})
  await page.locator('#hangar-tab-achievements').tap()
  await expect(page.locator('#tab-achievements')).toBeVisible()
  await page.locator('#hangar-group-meta').tap()
  await expect(page.locator('#hangar-tab-board')).toBeInViewport({ratio:1})
  await expect(page.locator('#hangar-tab-board')).toHaveAttribute('aria-selected','true')
  await page.locator('#hangar-group-progress').tap()
  await expect(page.locator('#hangar-tab-upgrades')).toBeInViewport({ratio:1})
  await panRow(page,'#upgrade-groups')
  await panRow(page,'#upgrade-groups')
  await expect.poll(()=>page.locator('#upgrade-groups').evaluate(node=>node.scrollLeft)).toBeGreaterThan(20)
  const style=page.getByRole('button',{name:'Style',exact:true})
  await expect(style).toBeInViewport({ratio:1})
  await style.tap()
  await expect(page.locator('.upgrade-card')).toHaveCount(4)
  expect(errors).toEqual([])
})
