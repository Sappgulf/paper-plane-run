/** The launcher owns one pointer at a time; cancelled pulls never start a run. */
export function createSlingshot({ onRelease, onCharge = () => {} }) {
  const panel = document.createElement('section')
  panel.id = 'slingshot'
  panel.className = 'slingshot hidden'
  panel.setAttribute('aria-label', 'Launch your plane')
  panel.innerHTML = `<div class="slingshot-card"><p class="slingshot-eyebrow">READY FOR TAKEOFF</p><h2>Pull back. Let fly.</h2><p id="slingshot-help">Drag the plane down, then release.<br>Keyboard: hold and release Space or Enter.</p><div class="slingshot-track"><svg viewBox="0 0 300 220" aria-hidden="true"><path class="sling-band" d="M50 65 L150 65 L250 65"/><circle cx="50" cy="65" r="7"/><circle cx="250" cy="65" r="7"/></svg><button id="slingshot-plane" type="button" aria-label="Pull plane to launch" aria-describedby="slingshot-help"><svg viewBox="0 0 100 80" aria-hidden="true"><path d="M50 5 L95 70 L50 53 L5 70 Z" fill="#fff8e7" stroke="#28434a" stroke-width="3"/><path d="M50 5 L50 53 L38 65 Z" fill="#dc7654"/></svg></button></div><p id="slingshot-status" role="status">Pull the plane toward you</p></div>`
  document.getElementById('app')?.append(panel)
  if (!panel.isConnected) document.body.append(panel)
  const button = panel.querySelector('button')
  const band = panel.querySelector('.sling-band')
  const status = panel.querySelector('#slingshot-status')
  let ready = false, pointer = null, origin = 0, charge = 0, heldKey = null, touchId = null
  function setCharge(value) {
    charge = Math.max(0, Math.min(1, value))
    button.style.transform = `translate(-50%, ${charge * 95}px)`
    band.setAttribute('d', `M50 65 L150 ${65 + charge * 95} L250 65`)
    status.textContent = charge >= .18 ? 'Release to launch!' : 'Pull the plane toward you'
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
