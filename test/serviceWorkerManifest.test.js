import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'

import { buildPrecacheManifest } from '../scripts/generate-service-worker.mjs'

const directories = []

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

describe('service worker build manifest', () => {
  test('includes required bundles and gameplay art in a content-addressed release', () => {
    const directory = mkdtempSync(join(tmpdir(), 'paper-plane-sw-'))
    directories.push(directory)
    mkdirSync(join(directory, 'assets', 'bosses'), { recursive: true })
    mkdirSync(join(directory, 'assets', 'planes'), { recursive: true })
    writeFileSync(join(directory, 'index.html'), '<html>release</html>')
    writeFileSync(join(directory, 'assets', 'flight-engine-abc.js'), 'engine')
    writeFileSync(join(directory, 'assets', 'bosses', 'wind-v2.webp'), 'wind')
    writeFileSync(join(directory, 'assets', 'planes', 'classic.webp'), 'plane')
    writeFileSync(join(directory, 'sw.js'), 'template')
    mkdirSync(join(directory, '.vite'), { recursive: true })
    writeFileSync(join(directory, '.vite', 'manifest.json'), '{"x":1}')
    writeFileSync(join(directory, 'manifest.json'), '{"vite":true}')
    writeFileSync(join(directory, 'chunk.js.map'), 'map')

    const manifest = buildPrecacheManifest(directory)

    expect(manifest.urls).toEqual([
      '/',
      '/assets/bosses/wind-v2.webp',
      '/assets/flight-engine-abc.js',
      '/assets/planes/classic.webp',
      '/index.html',
    ])
    expect(manifest.urls).not.toContain('/.vite/manifest.json')
    expect(manifest.urls).not.toContain('/manifest.json')
    expect(manifest.urls).not.toContain('/chunk.js.map')
    expect(manifest.version).toMatch(/^paper-plane-run-[a-f0-9]{12}$/)

    writeFileSync(join(directory, 'assets', 'planes', 'classic.webp'), 'changed plane')
    expect(buildPrecacheManifest(directory).version).not.toBe(manifest.version)
  })

  test('leaves verified legacy art duplicates out of the offline precache', () => {
    const directory = mkdtempSync(join(tmpdir(), 'paper-plane-sw-'))
    directories.push(directory)
    mkdirSync(join(directory, 'assets', 'bosses'), { recursive: true })
    writeFileSync(join(directory, 'assets', 'paper-world-backdrop.png'), 'legacy backdrop')
    writeFileSync(join(directory, 'assets', 'bosses', 'wind-v2.png'), 'legacy boss png')
    writeFileSync(join(directory, 'assets', 'bosses', 'wind-v2.webp'), 'runtime boss webp')
    writeFileSync(join(directory, 'index.html'), '<html>release</html>')
    writeFileSync(join(directory, 'sw.js'), 'template')

    const manifest = buildPrecacheManifest(directory)

    expect(manifest.urls).toContain('/assets/bosses/wind-v2.webp')
    expect(manifest.urls).not.toContain('/assets/paper-world-backdrop.png')
    expect(manifest.urls).not.toContain('/assets/bosses/wind-v2.png')
  })
})
