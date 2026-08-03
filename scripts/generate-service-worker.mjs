import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? walk(path) : [path]
  })
}

// These are legacy, high-cost duplicates with confirmed runtime replacements.
// They remain in the deploy output for compatibility, but should not be
// downloaded into every install's offline cache.
export const PRECACHE_EXCLUDED_FILES = new Set([
  'assets/paper-world-backdrop.png',
  'assets/zone-stamp-sheet.png',
  'assets/ambient-car-v2.png',
  'assets/ambient-person-v2.png',
  'assets/ambient/delivery-truck-v2.png',
  'assets/ambient/rooftop-person-v2.png',
  'assets/bosses/scissors.png',
  'assets/bosses/scissors.webp',
  'assets/bosses/scissors-v2.png',
  'assets/bosses/stapler.png',
  'assets/bosses/stapler.webp',
  'assets/bosses/stapler-v2.png',
  'assets/bosses/wind.png',
  'assets/bosses/wind.webp',
  'assets/bosses/wind-v2.png',
])

export function buildPrecacheManifest(directory) {
  const root = resolve(directory)
  const files = walk(root)
    .filter((path) => statSync(path).isFile())
    .filter((path) => {
      if (path.endsWith(`${sep}sw.js`) || path.endsWith('.map')) return false
      const rel = relative(root, path).split(sep).join('/')
      // Build tooling only — not needed for offline play
      if (rel === 'manifest.json' || rel.startsWith('.vite/')) return false
      if (PRECACHE_EXCLUDED_FILES.has(rel)) return false
      return true
    })
    .sort()
  const urls = ['/', ...files.map((path) => `/${relative(root, path).split(sep).join('/')}`)]
  const hash = createHash('sha256')
  for (const path of files) {
    hash.update(relative(root, path))
    hash.update(readFileSync(path))
  }
  return {
    urls,
    version: `paper-plane-run-${hash.digest('hex').slice(0, 12)}`,
  }
}

export function generateServiceWorker(directory = 'dist') {
  const root = resolve(directory)
  const serviceWorkerPath = resolve(root, 'sw.js')
  if (!existsSync(serviceWorkerPath)) throw new Error(`Missing service worker template at ${serviceWorkerPath}`)
  const manifest = buildPrecacheManifest(root)
  const template = readFileSync(serviceWorkerPath, 'utf8')
  const injected = `self.__PPR_CACHE_VERSION__ = ${JSON.stringify(manifest.version)}\nself.__PPR_PRECACHE__ = ${JSON.stringify(manifest.urls)}\n${template}`
  writeFileSync(serviceWorkerPath, injected)
  return manifest
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const manifest = generateServiceWorker(process.argv[2] || 'dist')
  console.log(`service worker: ${manifest.version} · ${manifest.urls.length} files`)
}
