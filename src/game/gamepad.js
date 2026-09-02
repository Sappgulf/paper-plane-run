/**
 * Standard Gamepad API polling for Paper Plane Run.
 * Supports Xbox, DualShock/DualSense, Switch Pro, and standard Bluetooth controllers.
 */
const DEADZONE = 0.14

export function sampleGamepadAxes(axes = []) {
  const rawX = Number(axes[0]) || 0
  const rawY = Number(axes[1]) || 0
  const mag = Math.hypot(rawX, rawY)
  if (mag < DEADZONE) {
    return { x: 0, y: 0 }
  }
  const scale = (mag - DEADZONE) / (1 - DEADZONE)
  const norm = mag > 0 ? scale / mag : 0
  return {
    x: Math.max(-1, Math.min(1, rawX * norm)),
    y: Math.max(-1, Math.min(1, -rawY * norm)), // +1 up, -1 down
  }
}

export function sampleGamepadButtons(buttons = []) {
  const isPressed = (idx) => {
    const b = buttons[idx]
    if (!b) return false
    return typeof b === 'object' ? Boolean(b.pressed || b.value > 0.5) : Boolean(b > 0.5)
  }

  let dpadX = 0
  let dpadY = 0
  if (isPressed(14)) dpadX -= 1 // Left
  if (isPressed(15)) dpadX += 1 // Right
  if (isPressed(12)) dpadY += 1 // Up
  if (isPressed(13)) dpadY -= 1 // Down

  const tuck = isPressed(0) || isPressed(7) || isPressed(6) // A / Cross, RT, LT
  const pause = isPressed(9) || isPressed(8) // Start / Select / Menu
  const mute = isPressed(3) // Y / Triangle
  const startFly = isPressed(0) || isPressed(9)

  return { dpadX, dpadY, tuck, pause, mute, startFly }
}

export function pollFirstActiveGamepad(gamepadList) {
  if (!gamepadList || typeof gamepadList.length !== 'number') return null
  for (let i = 0; i < gamepadList.length; i++) {
    const gp = gamepadList[i]
    if (gp && gp.connected) {
      const stick = sampleGamepadAxes(gp.axes)
      const btns = sampleGamepadButtons(gp.buttons)
      return {
        x: Math.max(-1, Math.min(1, stick.x + btns.dpadX)),
        y: Math.max(-1, Math.min(1, stick.y + btns.dpadY)),
        tuck: btns.tuck,
        pause: btns.pause,
        mute: btns.mute,
        startFly: btns.startFly,
      }
    }
  }
  return null
}
