export function createNotificationQueue({
  show,
  hide,
  setTimer = (callback, delay) => setTimeout(callback, delay),
  clearTimer = (timer) => clearTimeout(timer),
} = {}) {
  let timer = null
  let version = 0
  let lastMessage = ''
  let lastMessageAt = 0

  const cancelTimer = () => {
    if (timer !== null) clearTimer(timer)
    timer = null
  }

  return Object.freeze({
    show(message, { duration = 3000, persistent = false, dedupeMs = 0 } = {}) {
      version += 1
      const notificationVersion = version
      const now = performance.now ? performance.now() : Date.now()
      const isDuplicate = dedupeMs > 0 && message === lastMessage && now - lastMessageAt < dedupeMs
      cancelTimer()
      if (isDuplicate) {
        lastMessageAt = now
        if (!persistent) {
          timer = setTimer(() => {
            if (notificationVersion !== version) return
            timer = null
            hide?.()
          }, Math.max(0, Number(duration) || 0))
        }
        return
      }
      lastMessage = message
      lastMessageAt = now
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
