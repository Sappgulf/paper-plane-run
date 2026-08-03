import { describe, expect, test } from 'vitest'

import {
  focusFirst,
  getFocusableElements,
  trapFocus,
} from '../src/game/modal-focus.js'

function fakeElement({ disabled = false, hidden = false, ariaHidden = null } = {}) {
  const classes = new Set()
  return {
    disabled,
    hidden,
    focused: false,
    focus() { this.focused = true },
    getAttribute(name) { return name === 'aria-hidden' ? ariaHidden : null },
    closest(selector) { return selector === '.hidden' && classes.has('hidden') ? this : null },
  }
}

function fakeRoot(elements) {
  return {
    querySelectorAll() { return elements },
    contains(element) { return elements.includes(element) },
  }
}

describe('modal focus helpers', () => {
  test('filters unavailable controls and focuses the first usable control', () => {
    const disabled = fakeElement({ disabled: true })
    const hidden = fakeElement({ hidden: true })
    const usable = fakeElement()
    const root = fakeRoot([disabled, hidden, usable])

    expect(getFocusableElements(root)).toEqual([usable])
    expect(focusFirst(root)).toBe(usable)
    expect(usable.focused).toBe(true)
  })

  test('wraps Tab at both ends of a dialog', () => {
    const first = fakeElement()
    const last = fakeElement()
    const root = fakeRoot([first, last])
    const doc = { activeElement: first }
    const event = { key: 'Tab', shiftKey: true, preventDefault() { this.prevented = true } }

    expect(trapFocus(root, event, doc)).toBe(true)
    expect(event.prevented).toBe(true)
    expect(last.focused).toBe(true)

    doc.activeElement = last
    event.shiftKey = false
    event.prevented = false
    expect(trapFocus(root, event, doc)).toBe(true)
    expect(event.prevented).toBe(true)
    expect(first.focused).toBe(true)
  })
})
