/** The launcher owns one pointer at a time; cancelled pulls never start a run. */
export function createSlingshot({ onRelease, onCharge = () => {}, reducedMotion = () => false }) {
  const panel = document.createElement('section')
  panel.id = 'slingshot'
  panel.className = 'slingshot hidden'
  panel.setAttribute('aria-label', 'Launch your plane')
  panel.innerHTML = `<div class="launch-heading"><p class="slingshot-eyebrow">THE PAPER FLIGHT CLUB</p><h2>Your next great flight.</h2></div><div class="slingshot-track"><svg aria-hidden="true"><path class="sling-band"/><circle class="sling-post sling-post-left" r="5"/><circle class="sling-post sling-post-right" r="5"/><path class="sling-trajectory"/></svg><button id="slingshot-plane" type="button" aria-label="Pull plane to launch" aria-describedby="slingshot-help"><span class="launch-grip" aria-hidden="true"></span><span class="launch-pull-label" aria-hidden="true">PULL</span></button></div><div class="launch-dock"><p id="slingshot-status" role="status">Pull the plane toward you</p><div class="launch-meter" aria-hidden="true"><span></span></div><p id="slingshot-help">Pull down, then release to fly.<br><span>Space / Enter · hold and release</span></p></div>`
  document.getElementById('app')?.append(panel)
  if (!panel.isConnected) document.body.append(panel)
  const button = panel.querySelector('button')
  const band = panel.querySelector('.sling-band')
  const status = panel.querySelector('#slingshot-status')
  const meter = panel.querySelector('.launch-meter span')
  const trajectory = panel.querySelector('.sling-trajectory')
  const posts = panel.querySelectorAll('.sling-post')
  let ready = false, pointer = null, origin = 0, charge = 0, heldKey = null, touchId = null
  let anchor = null, recoilFrame = 0
  function drawBand(x, y) {
    if (!anchor) return
    const { baseX, baseY, span } = anchor
    band.setAttribute('d', `M${baseX-span} ${baseY-12} L${x} ${y} L${baseX+span} ${baseY-12}`)
  }
  function stopRecoil() {
    cancelAnimationFrame(recoilFrame)
    recoilFrame = 0
    panel.classList.remove('releasing')
    band.style.opacity = ''
  }
  function setCharge(value) {
    charge = Math.max(0, Math.min(1, value))
    meter.style.width = `${charge * 100}%`
    panel.dataset.charged = String(charge >= .18)
    status.textContent = charge >= .8 ? 'Full tension · let it fly!' : charge >= .18 ? 'Release to launch!' : 'Pull the plane toward you'
    onCharge(charge)
  }
  function cancel() { touchId = null; pointer = null; heldKey = null; setCharge(0) }
  function release() {
    if (!ready || charge < .18) { cancel(); return }
    ready = false
    const power = charge
    const pulled = anchor && { ...anchor }
    if (reducedMotion() || !pulled) panel.classList.add('hidden')
    else {
      panel.classList.add('releasing')
      const start = performance.now()
      const recoil = now => {
        const t = Math.min(1, (now - start) / 260)
        const travel = Math.exp(-8 * t) * Math.cos(16 * t)
        drawBand(pulled.baseX + (pulled.x - pulled.baseX) * travel, pulled.baseY + (pulled.y - pulled.baseY) * travel)
        band.style.opacity = String(1 - t)
        if (t < 1) recoilFrame = requestAnimationFrame(recoil)
        else { panel.classList.add('hidden'); stopRecoil() }
      }
      recoilFrame = requestAnimationFrame(recoil)
    }
    cancel()
    onRelease(power)
  }
  button.addEventListener('pointerdown', event => {
    if (!ready || pointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return
    event.preventDefault(); event.stopPropagation()
    pointer = event.pointerId; origin = event.clientY
    button.setPointerCapture(pointer)
  })
  button.addEventListener('pointermove', event => {
    if (event.pointerId === pointer) { event.preventDefault(); setCharge((event.clientY - origin) / 110) }
  })
  button.addEventListener('pointerup', event => {
    if (event.pointerId !== pointer) return
    event.preventDefault(); event.stopPropagation(); pointer = null; release()
  })
  // WebKit can hand a drag to its touch recognizer after pointer capture.
  // Follow the original touch identifier as well so release is reliable in WKWebView.
  button.addEventListener('touchstart', event => {
    if (!ready || touchId !== null) return
    const touch = event.changedTouches[0]
    touchId = touch.identifier; origin = touch.clientY
    event.preventDefault()
  }, { passive: false })
  button.addEventListener('touchmove', event => {
    const touch = [...event.changedTouches].find(item => item.identifier === touchId)
    if (!touch || !ready) return
    event.preventDefault(); setCharge((touch.clientY - origin) / 110)
  }, { passive: false })
  button.addEventListener('touchend', event => {
    if (![...event.changedTouches].some(item => item.identifier === touchId)) return
    event.preventDefault(); touchId = null; pointer = null; release()
  }, { passive: false })
  button.addEventListener('touchcancel', () => { touchId = null; cancel() })
  button.addEventListener('dragstart', event => event.preventDefault())
  button.addEventListener('pointercancel', event => { if (event.pointerId === pointer) cancel() })
  button.addEventListener('lostpointercapture', () => { if (pointer !== null) cancel() })
  button.addEventListener('keydown', event => {
    if (!ready || !['Space', 'Enter'].includes(event.code)) return
    event.preventDefault(); event.stopPropagation()
    if (!heldKey && pointer === null) { heldKey = event.code; setCharge(.7) }
  })
  button.addEventListener('keyup', event => {
    if (event.code !== heldKey) return
    event.preventDefault(); event.stopPropagation(); heldKey = null; release()
  })
  button.addEventListener('click', event => { if (ready && event.detail === 0 && !heldKey) { setCharge(.7); release() } })
  button.addEventListener('blur', cancel)
  window.addEventListener('blur', cancel)
  return {
    prepare() { stopRecoil(); ready = true; cancel(); panel.classList.remove('hidden'); button.focus({ preventScroll: true }) },
    hide() { stopRecoil(); ready = false; cancel(); panel.classList.add('hidden') },
    cancel,
    setAnchor(x, y, baseX, baseY, width, height) {
      button.style.left = `${x}px`; button.style.top = `${y}px`
      const svg = panel.querySelector('.slingshot-track > svg')
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
      const span = Math.min(125, width * .28)
      anchor = { x, y, baseX, baseY, span }
      drawBand(x, y)
      posts.forEach((post, index) => { post.setAttribute('cx', baseX + (index ? span : -span)); post.setAttribute('cy', baseY - 12) })
      trajectory.setAttribute('d', `M${baseX} ${baseY-65} Q${baseX} ${baseY-150} ${baseX} ${Math.max(180,baseY-230)}`)
    },
    gamepad(held) {
      if (held === null) { if (heldKey === 'gamepad') cancel(); return }
      if (!ready || pointer !== null) return
      if (held && !heldKey) { heldKey = 'gamepad'; setCharge(.7) }
      else if (!held && heldKey === 'gamepad') { heldKey = null; release() }
    },
    setPaused(paused) { cancel(); if (ready) { panel.classList.toggle('hidden', paused); if (!paused) button.focus({ preventScroll: true }) } },
    get pending() { return ready },
    get charge() { return charge },
  }
}
