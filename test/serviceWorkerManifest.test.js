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
  test('includes hashed bundles and all shipped gameplay art in a content-addressed release', () => {
    const directory = mkdtempSync(join(tmpdir(), 'paper-plane-sw-'))
    directories.push(directory)
    mkdirSync(join(directory, 'assets', 'bosses'), { recursive: true })
    mkdirSync(join(directory, 'assets', 'planes'), { recursive: true })
    writeFileSync(join(directory, 'index.html'), '<html>release</html>')
    writeFileSync(join(directory, 'assets', 'flight-engine-abc.js'), 'engine')
    writeFileSync(join(directory, 'assets', 'bosses', 'wind.webp'), 'wind')
    writeFileSync(join(directory, 'assets', 'planes', 'classic.webp'), 'plane')
    writeFileSync(join(directory, 'sw.js'), 'template')
    mkdirSync(join(directory, '.vite'), { recursive: true })
    writeFileSync(join(directory, '.vite', 'manifest.json'), '{"x":1}')
    writeFileSync(join(directory, 'manifest.json'), '{"vite":true}')
    writeFileSync(join(directory, 'chunk.js.map'), 'map')

    const manifest = buildPrecacheManifest(directory)

    expect(manifest.urls).toEqual([
      '/',
      '/assets/bosses/wind.webp',
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

  test('blocks install on the shell only and defers the rest of the release art', () => {
    const directory = mkdtempSync(join(tmpdir(), 'paper-plane-sw-'))
    directories.push(directory)
    mkdirSync(join(directory, 'assets', 'bosses'), { recursive: true })
    mkdirSync(join(directory, 'assets', 'planes'), { recursive: true })
    writeFileSync(join(directory, 'index.html'), '<html>release</html>')
    writeFileSync(join(directory, 'icon-192.png'), 'icon')
    writeFileSync(join(directory, 'sw.js'), 'template')
    writeFileSync(join(directory, 'assets', 'flight-engine-abc.js'), 'engine')
    writeFileSync(join(directory, 'assets', 'index-abc.css'), 'css')
    writeFileSync(join(directory, 'assets', 'sky-city.jpg'), 'first zone')
    writeFileSync(join(directory, 'assets', 'planes', 'classic.webp'), 'first plane')
    writeFileSync(join(directory, 'assets', 'sky-aurora.jpg'), 'late zone')
    writeFileSync(join(directory, 'assets', 'bosses', 'wind.webp'), 'late boss')

    const { urls, shell, warm } = buildPrecacheManifest(directory)

    // Code and first-flight art install eagerly; later zones/bosses do not.
    expect(shell).toContain('/')
    expect(shell).toContain('/index.html')
    expect(shell).toContain('/icon-192.png')
    expect(shell).toContain('/assets/flight-engine-abc.js')
    expect(shell).toContain('/assets/index-abc.css')
    expect(shell).toContain('/assets/sky-city.jpg')
    expect(shell).toContain('/assets/planes/classic.webp')
    expect(warm).toEqual(['/assets/bosses/wind.webp', '/assets/sky-aurora.jpg'])

    // The split stays a partition of the full release — nothing lost, nothing double-fetched.
    expect([...shell, ...warm].sort()).toEqual([...urls].sort())
    expect(shell.filter((url) => warm.includes(url))).toEqual([])
  })
})
