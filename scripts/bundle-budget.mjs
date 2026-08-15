import { readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

// Uncompressed JavaScript, which is roughly 3.5x the wire cost after gzip.
//
// Composition as of the ground-life work: three ~572KB, flight engine ~140KB,
// menu/shell entry ~100KB. The three chunk is effectively a floor — it is
// lazy-loaded, and WebGLRenderer alone reaches most of the library, so named
// imports and dropping PMREM were both measured at under 5KB of savings.
//
// The two limits do different jobs. `initialBytes` guards the critical path:
// what a player downloads before the menu paints, which must stay small and is
// the number worth defending. `totalBytes` guards the lazy engine chunk, where
// gameplay features land, and is sized to leave real room to build.
export const BUNDLE_BUDGET = Object.freeze({
  initialBytes: 160 * 1024,
  totalBytes: 900 * 1024,
})

export function summarizeManifest(manifest, sizes) {
  const js = Object.values(manifest).filter((entry) => entry.file?.endsWith('.js'))
  return {
    initialBytes: js.filter((entry) => entry.isEntry).reduce((n, entry) => n + (sizes[entry.file] || 0), 0),
    totalBytes: js.reduce((n, entry) => n + (sizes[entry.file] || 0), 0),
  }
}

export function checkBudget(summary, budget) {
  const initial = {
    bytes: summary.initialBytes,
    limit: budget.initialBytes,
    ok: summary.initialBytes <= budget.initialBytes,
  }
  const total = {
    bytes: summary.totalBytes,
    limit: budget.totalBytes,
    ok: summary.totalBytes <= budget.totalBytes,
  }

  return {
    ok: initial.ok && total.ok,
    initial,
    total,
    failures: [
      ...(initial.ok ? [] : ['initialBytes']),
      ...(total.ok ? [] : ['totalBytes']),
    ],
  }
}

function readManifest() {
  const manifestPath = resolve('dist/.vite/manifest.json')
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch (error) {
    throw new Error(`Unable to read ${manifestPath}; run npm run build first. ${error.message}`)
  }
}

function getJavaScriptSizes(manifest) {
  return Object.fromEntries(
    Object.values(manifest)
      .filter((entry) => entry.file?.endsWith('.js'))
      .map((entry) => {
        const outputPath = resolve('dist', entry.file)
        return [entry.file, statSync(outputPath).size]
      }),
  )
}

function formatBytes(bytes) {
  return `${bytes.toLocaleString('en-US')} bytes`
}

function printFiles(manifest, sizes, selector) {
  return Object.values(manifest)
    .filter((entry) => entry.file?.endsWith('.js'))
    .filter(selector)
    .map((entry) => `  - ${entry.file}: ${formatBytes(sizes[entry.file] || 0)}`)
    .join('\n')
}

function main() {
  const manifest = readManifest()
  const sizes = getJavaScriptSizes(manifest)
  const summary = summarizeManifest(manifest, sizes)
  const result = checkBudget(summary, BUNDLE_BUDGET)

  console.log(`bundle budget: initial ${formatBytes(summary.initialBytes)} / ${formatBytes(BUNDLE_BUDGET.initialBytes)}`)
  console.log(`bundle budget: total   ${formatBytes(summary.totalBytes)} / ${formatBytes(BUNDLE_BUDGET.totalBytes)}`)

  if (!result.ok) {
    if (!result.initial.ok) {
      console.error('bundle budget: initial JavaScript files:')
      console.error(printFiles(manifest, sizes, (entry) => entry.isEntry))
    }
    if (!result.total.ok) {
      console.error('bundle budget: total JavaScript files:')
      console.error(printFiles(manifest, sizes, () => true))
    }
    console.error(`bundle budget: FAIL (${result.failures.join(', ')})`)
    process.exitCode = 1
    return
  }

  console.log('bundle budget: PASS')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
