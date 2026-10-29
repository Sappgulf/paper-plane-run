/** A real touch pan, rather than programmatically scrolling a clipped control into view. */
export async function panRow(page, selector) {
  const box = await page.locator(selector).boundingBox()
  const cdp = await page.context().newCDPSession(page)
  const x = box.x + box.width - 12, y = box.y + box.height / 2
  await cdp.send('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x,y,id:1}]})
  for(let step=1;step<=8;step++) {
    await cdp.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x:x-(box.width-24)*step/8,y,id:1}]})
    await page.waitForTimeout(20)
  }
  await cdp.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]})
  // Allow the compositor to finish its touch-scroll handoff before a second pan.
  await page.waitForTimeout(400)
  await cdp.detach()
}
