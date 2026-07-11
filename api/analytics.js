const g = globalThis
if (!g.__pprAnalytics) {
  g.__pprAnalytics = { events: [], funnel: {} }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const store = g.__pprAnalytics

  if (req.method === 'POST') {
    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch {
        return res.status(400).json({ error: 'bad json' })
      }
    }
    const e = String(body?.e || body?.event || 'unknown').slice(0, 40)
    store.funnel[e] = (store.funnel[e] || 0) + 1
    store.events.push({
      e,
      p: body?.p || body?.props || {},
      t: Date.now(),
      s: String(body?.s || '').slice(0, 40),
    })
    if (store.events.length > 500) store.events = store.events.slice(-500)
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      funnel: store.funnel,
      recent: store.events.slice(-40).reverse(),
      n: store.events.length,
    })
  }

  return res.status(405).json({ error: 'method' })
}
