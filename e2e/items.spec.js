import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openApp, waitForGameText } from './smoke-helpers.js'

test.describe('paper pickups and boost readability', () => {
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1','deterministic collection fixtures use the development engine')

  test('pickup symbols have distinct transparent silhouettes and the live lineup renders', async ({page},testInfo) => {
    const errors = collectConsoleErrors(page)
    await openApp(page,'/#test-items')
    await waitForGameText(page)
    await page.evaluate(()=>window.__paperFreeze(true))
    await page.screenshot({path:`output/round-two-${testInfo.project.name}-items-flight.png`})
    const symbols = await page.evaluate(async()=>{
      const { createPickupCanvas } = await import('/src/game/pickup-art.js')
      const gallery = document.createElement('section')
      gallery.style.cssText = 'position:fixed;inset:0;z-index:99999;display:grid;grid-template-columns:repeat(3,1fr);align-content:center;background:#f4edde;color:#332b35;text-align:center;gap:20px;padding:20px;overflow:auto'
      document.body.append(gallery)
      return ['star','golden','boost','shield','magnet'].map(kind=>{
        const canvas = createPickupCanvas({kind})
        canvas.style.cssText = 'width:min(100%,160px);display:block;margin:auto'
        const card = document.createElement('figure'), label = document.createElement('figcaption')
        card.style.margin = '0'; label.textContent = kind; card.append(canvas,label); gallery.append(card)
        const pixels = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data
        let coverage = 0,edge = 0,hash = 2166136261
        for (let i=0;i<pixels.length;i+=4) {
          const x = (i/4)%canvas.width,y = Math.floor(i/4/canvas.width)
          if (pixels[i+3]) {
            coverage++
            if (x === 0 || y === 0 || x === canvas.width-1 || y === canvas.height-1) edge++
          }
          for (let channel=0;channel<4;channel++) hash = Math.imul(hash^pixels[i+channel],16777619)>>>0
        }
        return {kind,coverage:coverage/(canvas.width*canvas.height),edge,hash}
      })
    })
    expect(new Set(symbols.map(symbol=>symbol.hash)).size).toBe(5)
    for (const symbol of symbols) {
      expect(symbol.coverage,symbol.kind).toBeGreaterThan(.15)
      expect(symbol.coverage,symbol.kind).toBeLessThan(.65)
      expect(symbol.edge,`${symbol.kind} must not clip`).toBe(0)
    }
    await page.screenshot({path:`output/round-two-${testInfo.project.name}-items-art.png`})
    expect(errors).toEqual([])
  })

  for (const reducedMotion of [false,true]) {
    test(`collecting boost shows a countdown, keeps wings on screen and expires cleanly${reducedMotion ? ' with reduced motion' : ''}`,async({page},testInfo)=>{
      const errors = collectConsoleErrors(page)
      await page.addInitScript(reduced=>{
        localStorage.setItem('paper-plane-run-settings-v1',JSON.stringify({reducedMotion:reduced,controlMode:'joystick',haptics:false}))
      },reducedMotion)
      await openApp(page,'/#test-item-boost')
      await waitForGameText(page)
      await page.evaluate(()=>{window.__paperFreeze(true);window.advanceTime(300)})
      let state = await page.evaluate(()=>JSON.parse(window.render_game_to_text()))
      expect(state.power.kind).toBe('boost')
      await expect(page.locator('#power-label')).toContainText(/Boost · \d\.\ds/)
      await expect(page.locator('#power-hud')).toHaveAttribute('data-power','boost')
      const start = state.power.timeLeft
      await page.keyboard.down('ArrowRight')
      await page.evaluate(()=>window.advanceTime(2000))
      await page.keyboard.up('ArrowRight')
      state = await page.evaluate(()=>JSON.parse(window.render_game_to_text()))
      expect(state.power.timeLeft).toBeLessThan(start-1.8)
      expect(Math.abs(state.player.x)).toBeGreaterThanOrEqual(12.9)
      const pose = await page.evaluate(()=>window.__paperPose())
      expect(pose.boostStreamerVisible).toBe(true)
      expect(pose.wingBounds.min[0]).toBeGreaterThan(-1)
      expect(pose.wingBounds.max[0]).toBeLessThan(1)
      if (reducedMotion) expect(pose.camFov).toBe(60)
      else expect(pose.camFov).toBeGreaterThan(60)
      await page.screenshot({path:`output/round-two-${testInfo.project.name}-boost${reducedMotion ? '-steady' : ''}.png`})
      await page.evaluate(()=>window.advanceTime(4500))
      expect(await page.evaluate(()=>JSON.parse(window.render_game_to_text()).state)).toBe('playing')
      await expect(page.locator('#power-hud')).toBeHidden()
      expect(await page.evaluate(()=>window.__paperPose().boostStreamerVisible)).toBe(false)
      expect(errors).toEqual([])
    })
  }

  test('the green column names its lift effect and actually regains height',async({page},testInfo)=>{
    const errors = collectConsoleErrors(page)
    await openApp(page,'/#test-item-lift')
    await waitForGameText(page)
    await page.evaluate(()=>{window.__paperFreeze(true);window.advanceTime(16)})
    await expect(page.locator('#flight-focus-cue')).toHaveText('UPDRAFT · LIFT')
    await expect(page.locator('#flight-focus')).toBeVisible()
    const before = await page.evaluate(()=>JSON.parse(window.render_game_to_text()).player.y)
    await page.screenshot({path:`output/round-two-${testInfo.project.name}-updraft.png`})
    const visibleInk = await page.evaluate(()=>{
      const bounds = window.__paperPose().liftLabelBounds[0]
      const source = document.querySelector('#c'), canvas = document.createElement('canvas')
      canvas.width = source.width; canvas.height = source.height
      const ctx = canvas.getContext('2d'); ctx.drawImage(source,0,0)
      const x = Math.max(0,Math.floor((bounds.min[0]+1)/2*canvas.width))
      const y = Math.max(0,Math.floor((1-bounds.max[1])/2*canvas.height))
      const width = Math.min(canvas.width-x,Math.ceil((bounds.max[0]-bounds.min[0])/2*canvas.width))
      const height = Math.min(canvas.height-y,Math.ceil((bounds.max[1]-bounds.min[1])/2*canvas.height))
      const pixels = ctx.getImageData(x,y,width,height).data
      let ink = 0
      for (let index=0;index<pixels.length;index+=4) {
        if (pixels[index]<100 && pixels[index+1]<100 && pixels[index+2]<100) ink++
      }
      return ink
    })
    expect(visibleInk,'the lift sign must render against sky, not be painted over by it').toBeGreaterThan(10)
    await page.evaluate(()=>window.advanceTime(250))
    const after = await page.evaluate(()=>JSON.parse(window.render_game_to_text()))
    expect(after.player.y).toBeGreaterThan(before)
    expect(after.power).toBeNull()
    expect(errors).toEqual([])
  })
})
