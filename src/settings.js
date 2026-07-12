const KEY = 'paper-plane-run-settings-v1'

const DEFAULTS = {
  reducedMotion: false,
  largeStick: false,
  autoLevel: false,
  colorblindPowers: false,
  lowPower: false, // lower DPR, fewer shadows, fewer dust
  haptics: true,
  arDesk: false,
  forceSeason: 'auto', // auto | default | halloween | winter | valentine | spring
  /** @type {'mouse'|'joystick'} */
  controlMode: 'mouse',
  invertY: false,
  invertX: false,
  /** 0.5–1.5 style multiplier for mouse follow */
  mouseSensitivity: 1,
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      // First run: joysticks on touch devices, mouse on desktop
      const touch =
        typeof navigator !== 'undefined' &&
        ('ontouchstart' in globalThis || navigator.maxTouchPoints > 0)
      return { ...DEFAULTS, controlMode: touch ? 'joystick' : 'mouse' }
    }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(partial) {
  const next = { ...loadSettings(), ...partial }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

/** Colorblind-safe power palette (shape labels stay; colors differ more) */
export function powerColors(colorblind) {
  if (!colorblind) {
    return {
      shield: 0x60a5fa,
      slow: 0xa78bfa,
      magnet: 0x34d399,
      boost: 0xfb7185,
      tear: 0xfbbf24,
      clip: 0x94a3b8,
      sling: 0xf97316,
      phase: 0xe9d5ff,
    }
  }
  // High-contrast / pattern-friendly hues
  return {
    shield: 0x0077bb, // blue
    slow: 0xee7733, // orange
    magnet: 0x009988, // teal
    boost: 0xcc3311, // red
    tear: 0xee3377, // magenta
    clip: 0x33bbee, // cyan
    sling: 0xbbbb00, // yellow
    phase: 0xaa4499, // purple
  }
}

export function applyDocumentA11y(settings) {
  document.documentElement.classList.toggle('a11y-reduced-motion', !!settings.reducedMotion)
  document.documentElement.classList.toggle('a11y-large-stick', !!settings.largeStick)
  document.documentElement.classList.toggle('a11y-colorblind', !!settings.colorblindPowers)
}
