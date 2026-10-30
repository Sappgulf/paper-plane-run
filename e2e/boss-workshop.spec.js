import { test, expect } from '@playwright/test'
import { openFixture, collectConsoleErrors } from './smoke-helpers.js'

for(const kind of ['scissors','wind','stapler','punch']) {
 test(`${kind} workshop commits its visible passage before crossing`,async({page},info)=>{
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1','deterministic encounter fixture')
  const errors=collectConsoleErrors(page)
  await openFixture(page,`/?boss-proof=${kind}#test-boss-encounter`)
  const locked=await page.evaluate(()=>{
   window.__paperFreeze(true)
   for(let step=0;step<50;step++) {
    const state=JSON.parse(window.render_game_to_text())
    if(state.boss?.locked)return state.boss
    window.advanceTime(100)
   }
   return JSON.parse(window.render_game_to_text()).boss
  })
  expect(locked.workshop).toBe(true)
  expect(locked.precisionTarget).toBe(false)
  await expect(page.locator('#boss-flight')).toBeVisible()
  await page.evaluate(() => {
    const toast = document.querySelector('#challenge-toast')
    toast.dataset.seasonal = 'true'
    toast.classList.remove('hidden')
  })
  await expect(page.locator('#challenge-toast')).toBeHidden()
  await page.evaluate(() => { delete document.querySelector('#challenge-toast').dataset.seasonal })
  await expect(page.locator('#challenge-toast')).toBeVisible()
  await page.evaluate(() => document.querySelector('#challenge-toast').classList.add('hidden'))
  await expect(page.locator('#boss-flight-phase')).toHaveText('Line set · hold course')
  expect(locked.locked).toBe(true)
  await page.screenshot({path:`output/workshop-${kind}-${info.project.name}.png`})
  await page.keyboard.down('ArrowUp')
  const after=await page.evaluate(()=>{window.advanceTime(150);return JSON.parse(window.render_game_to_text())})
  await page.keyboard.up('ArrowUp')
  expect(after.boss.gapY).toBe(locked.gapY)
  expect(after.state).toBe('playing')
  expect(errors).toEqual([])
 })
}

test('a cleared boss stops showing its approach instruction', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'deterministic encounter fixture')
  const errors = collectConsoleErrors(page)
  await openFixture(page, '/?boss-proof=scissors&boss-pass=1#test-boss-encounter')
  const result = await page.evaluate(() => {
    window.__paperFreeze(true)
    for (let i = 0; i < 20; i++) {
      window.advanceTime(50)
      const state = JSON.parse(window.render_game_to_text())
      if (state.boss?.completed) {
        window.advanceTime(350) // Let the encounter strip retire and the cleared gate keep animating.
        return state
      }
    }
    return JSON.parse(window.render_game_to_text())
  })
  expect(result.boss?.completed).toBe(true)
  await expect(page.locator('#boss-flight')).toBeHidden()
  await expect(page.locator('#zone-banner')).toBeHidden()
  await expect(page.locator('#zone-banner')).toHaveClass(/hidden/)
  await expect(page.locator('#flight-feedback')).toContainText('THREAD')
  expect(errors).toEqual([])
})

test('the boss opening stays clear of the generic target marker', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1', 'deterministic encounter fixture')
  const errors = collectConsoleErrors(page)
  await openFixture(page, '/?boss-proof=stapler#test-boss-encounter')
  const position = await page.evaluate(() => {
    window.__paperFreeze(true)
    for (let i = 0; i < 100; i++) {
      window.advanceTime(50)
      const state = JSON.parse(window.render_game_to_text())
      if (state.boss?.z > 8 && state.boss.z < 40 && document.querySelector('#flight-focus-cue').textContent === 'GATE AHEAD') {
        const marker = document.querySelector('#flight-focus')
        return { hidden: marker.classList.contains('hidden'), target: window.__paperPose().bossGapScreen }
      }
    }
    return null
  })
  expect(position).not.toBeNull()
  expect(position.target).not.toBeNull()
  expect(position.hidden).toBe(true)
  expect(errors).toEqual([])
})
