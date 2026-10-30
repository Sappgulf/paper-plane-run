import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openFixture } from './smoke-helpers.js'

test('approaching threats in the flight corridor show camera-facing collision warnings', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'requires deterministic obstacle lineup')
  const errors = collectConsoleErrors(page)
  await openFixture(page, '/?warnings=1#test-obstacles')
  const warnings = await page.evaluate(() => {
    window.advanceTime(16)
    return window.__paperPose().hazardWarnings
  })
  for (const type of ['bird', 'scissors']) {
    const group = warnings.filter(item => item.type === type && item.z < 36)
    expect(group.length).toBeGreaterThan(0)
    for (const item of group) {
      expect(item.attached).toBe(true)
      const inCorridor = Math.abs(item.dx) <= item.hitRadius + 3.2 && Math.abs(item.dy) <= item.hitRadius + 3.2
      expect(item.visible).toBe(inCorridor)
      if (item.visible) {
        expect(item.opacity).toBeGreaterThan(0.2)
        expect(item.facing).toBeCloseTo(0)
        expect(item.radius).toBeGreaterThanOrEqual(item.hitRadius)
      }
    }
  }
  const armored = warnings.find(item => item.flyerId === 'biplane')
  expect(armored.armorVisible).toBe(armored.visible)
  if (armored.visible) expect(armored.armorRadius).toBeLessThan(armored.radius)
  expect(errors).toEqual([])
})

test('distant hidden warnings do not dim the nearby visible ones', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'requires deterministic fog fixture')
  const errors = collectConsoleErrors(page)
  await openFixture(page, '/?warnings=fog#test-fog-warning')
  const warnings = await page.evaluate(() => {
    window.__paperFreeze(true)
    window.advanceTime(500)
    return window.__paperPose().hazardWarnings
  })
  expect(warnings.some(item => !item.visible && item.z > 36)).toBe(true)
  const nearby = warnings.filter(item => item.visible && item.z > 0 && item.z < 36)
  expect(nearby.length).toBeGreaterThan(0)
  expect(nearby.every(item => item.opacity > 0.2)).toBe(true)
  expect(errors).toEqual([])
})

test('an oncoming enemy takes priority over the opening star lesson', async ({ page }, info) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'requires deterministic threat fixture')
  const errors = collectConsoleErrors(page)
  await openFixture(page, '/?warnings=focus#test-focus-danger')
  await page.evaluate(() => window.advanceTime(16))
  await expect(page.locator('#flight-focus')).toBeVisible()
  await expect(page.locator('#flight-focus-cue')).toHaveText('DODGE · BIPLANE')
  await expect(page.locator('#flight-focus .flight-focus-ring')).toBeHidden()
  const position = await page.evaluate(() => {
    const target = window.__paperPose().hazardWarnings.find(item => item.flyerId === 'biplane')
    const marker = document.querySelector('#flight-focus')
    return { x: parseFloat(marker.style.left), y: parseFloat(marker.style.top), target }
  })
  expect(position.x).toBeCloseTo(position.target.screenX, 0)
  expect(position.y).toBeCloseTo(position.target.screenY, 0)
  expect(position.target.visible).toBe(true)
  expect(position.target.armorVisible).toBe(true)
  expect(position.target.radius).toBeGreaterThanOrEqual(position.target.hitRadius)
  await page.screenshot({ path: `output/focus-danger-${info.project.name}.png` })
  expect(errors).toEqual([])
})
