import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

import { BOSS_ART } from '../src/game/boss-art.js'
import { JOURNEY_ART } from '../src/journey-art.js'
import { SKINS } from '../src/skins.js'

const PUBLIC_DIR = fileURLToPath(new URL('../public', import.meta.url))
const ASSET_DIR = join(PUBLIC_DIR, 'assets')

// A missing texture file does not throw: the mesh just renders blank or grey.
// Every root-absolute art path the game can request must therefore exist in
// public/, and this test is the only place that notices when one does not.
function expectShipped(urls) {
  for (const url of urls) {
    // `paper:` URLs are generated at runtime (see src/game/paper-art.js and boss-art.js).
    if (url.startsWith('paper:')) continue
    expect(existsSync(`${PUBLIC_DIR}${url}`), `${url} is referenced but not shipped`).toBe(true)
  }
}

const assetStrings = (object) =>
  Object.values(object).filter((value) => typeof value === 'string' && value.startsWith('/assets/'))

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  })
}

const GAME_SOURCE = [
  ...listFiles(fileURLToPath(new URL('../src', import.meta.url))),
  fileURLToPath(new URL('../index.html', import.meta.url)),
]
  .filter((path) => /\.(js|css|html)$/.test(path))
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n')

describe('shipped art', () => {
  test('every plane skin texture and portrait is shipped', () => {
    expectShipped(SKINS.flatMap(assetStrings))
  })

  test('every boss emblem is shipped', () => {
    expectShipped(Object.values(BOSS_ART).flatMap((boss) => [boss.texture, boss.preview]))
  })

  test('every journey postcard is shipped', () => {
    expectShipped(Object.values(JOURNEY_ART).map((art) => art.src))
  })

  test('the menu backdrops and stamp sheet stylesheets point at are shipped', () => {
    expectShipped([
      '/assets/paper-flight-hero.webp',
      '/assets/paper-world-backdrop.webp',
      '/assets/zone-stamp-sheet.webp',
    ])
  })

  test('every file in the release art folder is referenced by the game, so no dead art ships', () => {
    // Planes and bosses are loaded by id (`/assets/planes/<id>.webp`), so those
    // families are matched by their URLs rather than by basename.
    const planeUrls = new Set(SKINS.flatMap(assetStrings))
    const bossUrls = new Set(Object.values(BOSS_ART).flatMap((boss) => [boss.texture, boss.preview]))
    const unreferenced = listFiles(ASSET_DIR)
      .map((path) => `/assets/${relative(ASSET_DIR, path).split(sep).join('/')}`)
      .filter((url) => !planeUrls.has(url) && !bossUrls.has(url))
      .filter((url) => !GAME_SOURCE.includes(url.split('/').pop()))
    expect(unreferenced).toEqual([])
  })
})
