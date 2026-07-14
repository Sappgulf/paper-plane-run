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

    const manifest = buildPrecacheManifest(directory)

    expect(manifest.urls).toEqual([
      '/',
      '/assets/bosses/wind.webp',
      '/assets/flight-engine-abc.js',
      '/assets/planes/classic.webp',
      '/index.html',
    ])
    expect(manifest.version).toMatch(/^paper-plane-run-[a-f0-9]{12}$/)

    writeFileSync(join(directory, 'assets', 'planes', 'classic.webp'), 'changed plane')
    expect(buildPrecacheManifest(directory).version).not.toBe(manifest.version)
  })
})
