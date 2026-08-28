import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

export function buildPrecacheManifest(directory) {
  const root = resolve(directory)
  const files = walk(root)
    .filter((path) => statSync(path).isFile())
    .filter((path) => {
      if (path.endsWith(`${sep}sw.js`) || path.endsWith('.map')) return false
      const rel = relative(root, path).split(sep).join('/')
      // Build tooling only — not needed for offline play
      if (rel === 'manifest.json' || rel.startsWith('.vite/')) return false
      return true
    })
    .sort()
  const urls = ['/', ...files.map((path) => `/${relative(root, path).split(sep).join('/')}`)]
  const hash = createHash('sha256')
  for (const path of files) {
    hash.update(relative(root, path))
    hash.update(readFileSync(path))
  }
  const shell = urls.filter(isShellUrl)
  return {
    urls,
    shell,
    // Everything else still lands in the same cache, just after activation so a
    // first visit is not held behind megabytes of zone and skin art.
    warm: urls.filter((url) => !shell.includes(url)),
    version: `paper-plane-run-${hash.digest('hex').slice(0, 12)}`,
  }
}

// Art the very first flight needs: the menu backdrop plus the City zone. Later
// zones, skins, bosses and postcards warm in the background after activation.
const FIRST_RUN_ART = new Set([
  '/assets/logo.jpg',
  '/assets/paper-world-backdrop.webp',
  '/assets/zone-stamp-sheet.webp',
  '/assets/pickup-orb.webp',
  '/assets/pickup-boost.webp',
  '/assets/planes/classic.webp',
])

function isShellUrl(url) {
  if (!url.startsWith('/assets/')) return true // '/', index.html, manifest, icons
  if (url.endsWith('.js') || url.endsWith('.css')) return true
  return FIRST_RUN_ART.has(url)
}

export function generateServiceWorker(directory = 'dist') {
  const root = resolve(directory)
  const serviceWorkerPath = resolve(root, 'sw.js')
  if (!existsSync(serviceWorkerPath)) throw new Error(`Missing service worker template at ${serviceWorkerPath}`)
  const manifest = buildPrecacheManifest(root)
  const template = readFileSync(serviceWorkerPath, 'utf8')
  const injected = [
    `self.__PPR_CACHE_VERSION__ = ${JSON.stringify(manifest.version)}`,
    `self.__PPR_PRECACHE__ = ${JSON.stringify(manifest.shell)}`,
    `self.__PPR_WARM__ = ${JSON.stringify(manifest.warm)}`,
    template,
  ].join('\n')
  writeFileSync(serviceWorkerPath, injected)
  return manifest
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const manifest = generateServiceWorker(process.argv[2] || 'dist')
  console.log(`service worker: ${manifest.version} · ${manifest.urls.length} files`)
}
