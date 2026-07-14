export function createNotificationQueue({
  show,
  hide,
  setTimer = (callback, delay) => setTimeout(callback, delay),
  clearTimer = (timer) => clearTimeout(timer),
} = {}) {
  let timer = null
  let version = 0

  const cancelTimer = () => {
    if (timer !== null) clearTimer(timer)
    timer = null
  }

  return Object.freeze({
    show(message, { duration = 3000, persistent = false } = {}) {
      version += 1
      const notificationVersion = version
      cancelTimer()
      show?.(message)
      if (!persistent) {
        timer = setTimer(() => {
          if (notificationVersion !== version) return
          timer = null
          hide?.()
        }, Math.max(0, Number(duration) || 0))
      }
    },
    clear() {
      version += 1
      cancelTimer()
      hide?.()
    },
  })
}
