import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { compareDirectories } from '../scripts/ios-build-files.mjs'

const temporaryDirectories = []

function makeDirectory() {
  const directory = mkdtempSync(join(tmpdir(), 'paper-plane-ios-parity-'))
  temporaryDirectories.push(directory)
  return directory
}

function write(root, file, contents) {
  const directory = join(root, file.split('/').slice(0, -1).join('/'))
  mkdirSync(directory, { recursive: true })
  writeFileSync(join(root, file), contents)
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true }))
})

describe('iOS web bundle parity', () => {
  it('accepts identical nested bundles', () => {
    const expected = makeDirectory()
    const actual = makeDirectory()
    write(expected, 'index.html', '<main>Fly</main>')
    write(expected, 'assets/game.js', 'start()')
    write(actual, 'index.html', '<main>Fly</main>')
    write(actual, 'assets/game.js', 'start()')

    expect(compareDirectories(expected, actual)).toEqual({ missing: [], extra: [], changed: [] })
  })

  it('reports missing, extra, and changed files', () => {
    const expected = makeDirectory()
    const actual = makeDirectory()
    write(expected, 'missing.png', 'expected')
    write(expected, 'changed.js', 'new game')
    write(actual, 'extra.png', 'stale')
    write(actual, 'changed.js', 'old game')

    expect(compareDirectories(expected, actual)).toEqual({
      missing: ['missing.png'],
      extra: ['extra.png'],
      changed: ['changed.js'],
    })
  })
})
