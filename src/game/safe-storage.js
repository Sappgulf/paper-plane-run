/**
 * localStorage.setItem throws in a handful of real, unavoidable browser
 * states — Safari private browsing, quota exceeded, storage blocked by
 * policy/extension. Reads across this codebase are already defensively
 * guarded with try/catch fallbacks, but writes were not: an uncaught throw
 * from a write partway through a function (e.g. the post-crash score/best/
 * ghost/mission save sequence) silently aborts everything after it,
 * including showing the game-over screen. Swallow write failures instead.
 */
export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}
