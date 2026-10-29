import { test, expect } from '@playwright/test'
import { openApp } from './smoke-helpers.js'

async function swipe(page, x, fromY, toY) {
 const cdp=await page.context().newCDPSession(page)
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:fromY,id:1}]})
 for(let n=1;n<=12;n++) {
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:fromY+(toY-fromY)*n/12,id:1}]})
  await page.waitForTimeout(20)
 }
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
 await page.waitForTimeout(500)
 await cdp.detach()
}

test('Journey and Hangar respond to vertical touch pans',async({page},info)=>{
 test.skip(info.project.name!=='mobile','touch only')
 await openApp(page)
 await page.locator('#journey-btn').tap()
 const journey=page.locator('#journey-panel')
 await swipe(page,190,720,330)
 await expect.poll(()=>journey.evaluate(el=>el.scrollTop)).toBeGreaterThan(80)
 await expect(page.locator('.journey-route-card').last()).toBeInViewport({ratio:.5})
 await swipe(page,190,330,720)
 await expect.poll(()=>journey.evaluate(el=>el.scrollTop)).toBeLessThan(30)
 await swipe(page,190,720,330)
 await expect.poll(()=>journey.evaluate(el=>el.scrollTop)).toBeGreaterThan(80)
 await page.locator('#journey-panel [data-back]').click()
 await page.locator('#journey-btn').tap()
 await expect.poll(()=>journey.evaluate(el=>el.scrollTop)).toBeLessThan(30)
 await page.locator('#journey-panel [data-back]').click()
 await page.locator('#hangar-btn').tap()
 const body=page.locator('.hangar-body')
 await swipe(page,190,700,370)
 await expect.poll(()=>body.evaluate(el=>el.scrollTop)).toBeGreaterThan(80)
})
