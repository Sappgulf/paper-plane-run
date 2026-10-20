/* Paper Plane Run — build-injected offline shell */
const CACHE = self.__PPR_CACHE_VERSION__ || 'paper-plane-run-development'

// Injected at build time. PRECACHE is the blocking shell — the code plus the
// art the menu and first City flight need. WARM is the rest of the release
// (later zones, skins, bosses, postcards); it is fetched after activation so a
// first visit is not held behind megabytes of art it may never reach.
const PRECACHE = self.__PPR_PRECACHE__ || ['/', '/index.html', '/manifest.webmanifest']
const WARM = self.__PPR_WARM__ || []

// The blocking shell must be complete: a "successful" install missing its
// entry JS/CSS leaves the player with no working offline app. WARM is optional
// and may include art that a proxy or storage-quota limit rejects.
async function cacheRequired(urls) {
  const cache = await caches.open(CACHE)
  await Promise.all(urls.map((url) => cache.add(url)))
}

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
    cacheRequired(PRECACHE).then(() => {
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
    ).then(() => self.clients.claim()),
  )
  // Keep the warm fill inside the activation lifetime so the browser cannot
  // terminate the worker midway through the later zones/skins/postcards.
  event.waitUntil(cacheAllSettled(WARM))
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
