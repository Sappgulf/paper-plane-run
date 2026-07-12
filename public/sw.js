/* Paper Plane Run — lightweight offline shell */
const CACHE = 'paper-plane-run-v22'

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon-32.png',
  '/assets/logo.jpg',
  '/assets/paper.jpg',
  '/assets/sky.jpg',
  '/assets/sky-city.jpg',
  '/assets/sky-harbor.jpg',
  '/assets/sky-storm.jpg',
  '/assets/sky-sunset.jpg',
  '/assets/sky-aurora.jpg',
  '/assets/ground-city.jpg',
  '/assets/ground-harbor.jpg',
  '/assets/ground-storm.jpg',
  '/assets/buildings.jpg',
  '/assets/birds.jpg',
  '/assets/skin-mint.jpg',
  '/assets/skin-coral.jpg',
  '/assets/skin-night.jpg',
  '/assets/skin-gold.jpg',
  '/assets/skin-neon.jpg',
  '/assets/skin-rainbow.jpg',
  '/assets/flyer-butterfly.jpg',
  '/assets/flyer-balloon.jpg',
  '/assets/flyer-kite.jpg',
  '/assets/flyer-biplane.jpg',
  '/assets/pickup-boost.jpg',
  '/assets/pickup-orb.jpg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Network-first for HTML/JS/CSS so updates land; cache fallback offline
  if (
    request.mode === 'navigate' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html')
  ) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/'))),
    )
    return
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        }),
    ),
  )
})
