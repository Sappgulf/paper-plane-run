/** UI controls own their keyboard events, even after the engine has loaded. */
export function isUiKeyboardTarget(target) {
  return Boolean(target?.closest?.(
    'input, textarea, select, button, a[href], [contenteditable]:not([contenteditable="false"]), [role="dialog"], [role="tab"]',
  ))
}

export function isGameShortcut(event) {
  return !event.defaultPrevented && !event.isComposing
    && !event.ctrlKey && !event.metaKey && !event.altKey
}
