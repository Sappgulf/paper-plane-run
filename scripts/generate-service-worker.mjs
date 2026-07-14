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
    .filter((path) => !path.endsWith(`${sep}sw.js`) && !path.endsWith('.map'))
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
