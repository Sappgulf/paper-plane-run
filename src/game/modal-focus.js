const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function getFocusableElements(root) {
  if (!root?.querySelectorAll) return []
  return [...root.querySelectorAll(FOCUSABLE_SELECTOR)].filter((element) => {
    if (element.disabled || element.hidden) return false
    if (element.getAttribute?.('aria-hidden') === 'true') return false
    return !element.closest?.('.hidden')
  })
}

export function focusFirst(root) {
  const element = getFocusableElements(root)[0]
  element?.focus?.()
  return element || null
}

export function trapFocus(root, event, doc = globalThis.document) {
  if (!root || event?.key !== 'Tab') return false
  const elements = getFocusableElements(root)
  if (!elements.length) return false

  const active = doc?.activeElement
  if (!root.contains?.(active)) {
    event.preventDefault?.()
    elements[0].focus?.()
    return true
  }

  const first = elements[0]
  const last = elements[elements.length - 1]
  if (event.shiftKey && active === first) {
    event.preventDefault?.()
    last.focus?.()
    return true
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault?.()
    first.focus?.()
    return true
  }
  return false
}
