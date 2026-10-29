import { expect, test } from '@playwright/test'
import { openApp, tap } from './smoke-helpers.js'

for(const wallet of [0,60]) {
 test(`logbook shows saved distance and honest purchase readiness with ${wallet} stars`, async({page},info)=>{
  await page.addInitScript(wallet=>{
   localStorage.setItem('paper-plane-run-lb-local',JSON.stringify([{name:'Milo',distance:1234,stars:12,mode:'normal',at:1}]))
   localStorage.setItem('paper-plane-run-wallet',String(wallet))
   localStorage.setItem('paper-plane-run-wallet-migrated','1')
  },wallet)
  await openApp(page)
  await tap(page.locator('#hangar-btn'))
  await tap(page.locator('#hangar-group-meta'))
  await tap(page.locator('#hangar-tab-stats'))
  await expect(page.locator('.logbook-card').filter({hasText:'Best Record'}).locator('.logbook-num')).toHaveText('1234m')
  await expect(page.locator('#stats-body')).not.toContainText(/undefined|NaN|~0 runs/)
  if(wallet===60) await expect(page.locator('#stats-body')).toContainText('Upgrades ready to buy')
  else await expect(page.locator('#stats-body')).toContainText('~2 runs to your cheapest fold')
  await tap(page.locator('#hangar-tab-settings'))
  await expect(page.locator('#set-control-mode option[value="mouse"]')).toHaveText(info.project.name==='mobile'?'Touch Aim':'Mouse aim')
 })
}
