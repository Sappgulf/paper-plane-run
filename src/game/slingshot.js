/** The launcher owns one pointer at a time; cancelled pulls never start a run. */
export function createSlingshot({ onRelease, onCharge = () => {} }) {
  const panel = document.createElement('section')
  panel.id = 'slingshot'
  panel.className = 'slingshot hidden'
  panel.setAttribute('aria-label', 'Launch your plane')
  panel.innerHTML = `<div class="launch-heading"><p class="slingshot-eyebrow">THE PAPER FLIGHT CLUB</p><h2>Your next great flight.</h2></div><div class="slingshot-track"><svg aria-hidden="true"><path class="sling-band"/><path class="sling-trajectory"/></svg><button id="slingshot-plane" type="button" aria-label="Pull plane to launch" aria-describedby="slingshot-help"><span class="launch-grip" aria-hidden="true"></span><span class="launch-pull-label" aria-hidden="true">PULL</span></button></div><div class="launch-dock"><p id="slingshot-status" role="status">Pull the plane toward you</p><div class="launch-meter" aria-hidden="true"><span></span></div><p id="slingshot-help">Pull down, then release to fly.<br><span>Space / Enter · hold and release</span></p></div>`
  document.getElementById('app')?.append(panel)
  if (!panel.isConnected) document.body.append(panel)
  const button = panel.querySelector('button')
  const band = panel.querySelector('.sling-band')
  const status = panel.querySelector('#slingshot-status')
  const meter = panel.querySelector('.launch-meter span')
  const trajectory = panel.querySelector('.sling-trajectory')
  let ready = false, pointer = null, origin = 0, charge = 0, heldKey = null, touchId = null
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
    panel.classList.add('hidden')
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
    prepare() { ready = true; cancel(); panel.classList.remove('hidden'); button.focus({ preventScroll: true }) },
    hide() { ready = false; cancel(); panel.classList.add('hidden') },
    cancel,
    setAnchor(x, y, baseY, width, height) {
      button.style.left = `${x}px`; button.style.top = `${y}px`
      const svg = panel.querySelector('.slingshot-track > svg')
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
      const span = Math.min(125, width * .28)
      band.setAttribute('d', `M${x-span} ${baseY-12} L${x} ${y} L${x+span} ${baseY-12}`)
      trajectory.setAttribute('d', `M${x} ${baseY-65} Q${x} ${baseY-150} ${x} ${Math.max(180,baseY-230)}`)
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
