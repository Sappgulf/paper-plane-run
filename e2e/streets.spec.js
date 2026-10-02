import { expect, test } from '@playwright/test'
import { collectConsoleErrors, openApp, waitForGameText } from './smoke-helpers.js'

test('the city renders continuous painted roads and detailed vehicle groups',async({page},testInfo)=>{
  test.skip(process.env.PLAYWRIGHT_PREVIEW === '1','close scene fixture and source art inspection use development')
  const errors = collectConsoleErrors(page)
  await page.addInitScript(()=>localStorage.setItem('paper-plane-run-settings-v1',JSON.stringify({lowPower:false,haptics:false})))
  await openApp(page,'/#test-streets')
  await waitForGameText(page)
  await page.evaluate(()=>window.__paperFreeze(true))
  const life = await page.evaluate(()=>JSON.parse(window.render_game_to_text()).groundLife)
  expect(life.species.find(item=>item.id === 'roads')).toMatchObject({count:16,textured:true})
  expect(life.species.find(item=>item.id === 'cross-streets')).toMatchObject({count:4,textured:true})
  expect(life.species.find(item=>item.id === 'traffic').vehicle).toBe('sedan')
  expect(life.species.find(item=>item.id === 'oncoming').vehicle).toBe('van')
  for (const car of life.species.filter(item=>item.shape === 'car')) {
    expect(car.modelVertices).toBeGreaterThan(500)
    expect(car.minAbsX).toBeGreaterThan(15)
  }
  await page.screenshot({path:`output/round-two-${testInfo.project.name}-streets.png`})
  await page.evaluate(async()=>{
    const THREE = await import('/node_modules/three/build/three.module.js')
    const {createPaperCarGeometry} = await import('/src/paper-car-models.js')
    const {createStreetCanvas} = await import('/src/game/paper-streets.js')
    const gallery = document.createElement('section')
    gallery.style.cssText = 'position:fixed;inset:0;z-index:99999;display:grid;grid-template-columns:repeat(2,1fr);align-content:start;background:#f4edde;color:#332b35;text-align:center;gap:12px;padding:12px;overflow:auto'
    document.body.append(gallery)
    const renderer = new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true})
    renderer.setSize(256,256); renderer.setPixelRatio(1)
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#f4edde')
    const camera = new THREE.PerspectiveCamera(35,1,.1,30)
    camera.position.set(4.5,3.2,5.5); camera.lookAt(0,.25,0)
    const material = new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})
    for (const variant of ['sedan','van','pickup','sled']) {
      const geometry = createPaperCarGeometry({variant}), car = new THREE.Mesh(geometry,material)
      scene.add(car); renderer.render(scene,camera)
      const card = document.createElement('figure'), picture = document.createElement('img'), label = document.createElement('figcaption')
      card.style.margin = '0'; picture.src = renderer.domElement.toDataURL(); picture.alt = variant
      picture.style.cssText = 'width:min(100%,230px);display:block;margin:auto'; label.textContent = variant
      card.append(picture,label); gallery.append(card)
      scene.remove(car); geometry.dispose()
    }
    renderer.dispose(); material.dispose()
    const street = createStreetCanvas({zoneId:'city'})
    street.style.cssText = 'height:220px;width:auto;max-width:100%;margin:auto'
    const crossing = createStreetCanvas({zoneId:'city',crossStreet:true})
    crossing.style.cssText = 'width:100%;height:auto;margin:auto;align-self:center'
    gallery.append(street,crossing)
  })
  await expect(page.getByRole('img',{name:'sedan',exact:true})).toBeVisible()
  await page.screenshot({path:`output/round-two-${testInfo.project.name}-vehicle-art.png`,fullPage:true})
  expect(errors).toEqual([])
})
