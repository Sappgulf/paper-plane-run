/**
 * Lightweight anonymous analytics — local ring buffer + optional POST.
 */
const KEY = 'paper-plane-run-analytics'
const SESSION = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
const MAX = 200

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

function save(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX)))
}

export function track(event, props = {}) {
  const row = {
    e: event,
    p: props,
    t: Date.now(),
    s: SESSION,
    v: 2,
  }
  const all = load()
  all.push(row)
  save(all)

  // Fire-and-forget remote
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', JSON.stringify(row))
    } else {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    /* offline ok */
  }
  return row
}

export function getFunnelSummary() {
  const all = load()
  const counts = {}
  for (const r of all) counts[r.e] = (counts[r.e] || 0) + 1
  const deaths = all.filter((r) => r.e === 'death')
  const reasons = {}
  for (const d of deaths) {
    const why = d.p?.reason || 'unknown'
    reasons[why] = (reasons[why] || 0) + 1
  }
  return { counts, reasons, total: all.length, session: SESSION }
}

export function recentEvents(n = 30) {
  return load().slice(-n).reverse()
}

export { SESSION as analyticsSession }
