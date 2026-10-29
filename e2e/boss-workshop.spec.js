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
