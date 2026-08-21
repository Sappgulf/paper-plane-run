/* Paper Plane Run — build-injected offline shell */
const CACHE = self.__PPR_CACHE_VERSION__ || 'paper-plane-run-development'

// Injected at build time. PRECACHE is the blocking shell — the code plus the
// art the menu and first City flight need. WARM is the rest of the release
// (later zones, skins, bosses, postcards); it is fetched after activation so a
// first visit is not held behind megabytes of art it may never reach.
const PRECACHE = self.__PPR_PRECACHE__ || ['/', '/index.html', '/manifest.webmanifest']
const WARM = self.__PPR_WARM__ || []

async function cacheAllSettled(urls) {
  const cache = await caches.open(CACHE)
  await Promise.all(urls.map(async (url) => {
    try {
      await cache.add(url)
    } catch {
      // One unavailable optional asset must not prevent the new shell from installing.
    }
  }))
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    cacheAllSettled(PRECACHE).then(() => {
      // First install activates immediately; updates wait for the menu "Restart" prompt.
      if (!self.registration.active) return self.skipWaiting()
    }),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim())
      // Fill in the rest of the release for offline play. Deliberately not
      // awaited into the activate lifetime — the page is already usable.
      .then(() => { void cacheAllSettled(WARM) }),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Never cache the service worker or API routes
  if (url.pathname === '/sw.js' || url.pathname.startsWith('/api/')) return

  // Network-first for HTML/JS/CSS so updates land; cache fallback offline
  if (
    request.mode === 'navigate' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.webmanifest')
  ) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (!res.ok) throw new Error(`Static request failed: ${res.status}`)
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/') || caches.match('/index.html') || Response.error())),
    )
    return
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (!res.ok) throw new Error(`Static request failed: ${res.status}`)
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        }).catch(() => Response.error()),
    ),
  )
})
