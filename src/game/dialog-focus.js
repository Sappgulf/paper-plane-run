/** Keep keyboard navigation in the visible dialog and return focus on close. */
export function bindDialogFocus(root, { onEscape, restoreFocus = true, returnFocus } = {}) {
  if (!root) return
  const doc = root.ownerDocument
  let open = false
  let previousFocus = null
  const controls = () => [...root.querySelectorAll(
    'button, a[href], input, select, textarea, [tabindex]',
  )].filter((node) => !node.disabled && node.tabIndex >= 0 && node.getClientRects().length)

  const sync = () => {
    const visible = !root.classList.contains('hidden') && !root.hidden
    if (visible === open) return
    open = visible
    if (open) {
      previousFocus = doc.activeElement
      root.tabIndex = -1
      if (!root.contains(doc.activeElement)) (controls()[0] || root).focus({ preventScroll: true })
    } else if (restoreFocus) {
      const target = returnFocus?.() || previousFocus
      if (target?.isConnected && target.getClientRects().length) target.focus({ preventScroll: true })
    }
  }
  const observer = new MutationObserver(sync)
  observer.observe(root, { attributes: true, attributeFilter: ['class', 'hidden'] })
  doc.addEventListener('keydown', (event) => {
    if (!open) return
    if (event.key === 'Escape' && onEscape) {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (!event.repeat) onEscape()
    } else if (event.key === 'Tab') {
      const items = controls()
      const index = items.indexOf(doc.activeElement)
      if (!items.length || index < 0 || (event.shiftKey ? index === 0 : index === items.length - 1)) {
        event.preventDefault()
        const next = (event.shiftKey ? items.at(-1) : items[0]) || root
        next.focus({ preventScroll: true })
      }
    }
  }, true)
  doc.addEventListener('focusin', (event) => {
    if (open && !root.classList.contains('hidden') && !root.contains(event.target)) {
      (controls()[0] || root).focus({ preventScroll: true })
    }
  })
  sync()
}
