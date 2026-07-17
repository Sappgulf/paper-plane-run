import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const markup = readFileSync('index.html', 'utf8')
const shell = readFileSync('src/main.js', 'utf8')
const engine = readFileSync('src/flight-engine.js', 'utf8')

describe('shell accessibility contracts', () => {
  test('names every utility icon button', () => {
    expect(markup).toMatch(/id="install-btn"[^>]*aria-label="Install Paper Plane Run"/)
    expect(markup).toMatch(/id="ar-btn"[^>]*aria-label="Desk AR camera"/)
  })

  test('exposes Hangar tabs and selected panels as a real tab interface', () => {
    expect(markup.match(/role="tab"/g)).toHaveLength(9)
    expect(markup).toContain('aria-selected="true"')
    expect(markup).toContain('role="tabpanel"')
    expect(markup).toContain('data-hangar-group="progress"')
    expect(markup).toContain('data-hangar-group="meta"')
    expect(markup).toContain('id="hangar-group-progress"')
    expect(shell).toContain("setAttribute('aria-selected'")
    expect(shell).toContain("setAttribute('tabindex'")
    expect(shell).toContain('setHangarGroup')
  })

  test('game-over offers a spend-in-hangar path when stars are banked', () => {
    expect(markup).toContain('id="hangar-from-gameover"')
    expect(engine).toContain("shellBridge?.openHangar?.('upgrades')")
    expect(engine).toContain('nextActionKind')
  })

  test('keeps compact control guidance consistent before and after engine preload', () => {
    expect(shell).toContain('Drag the stick to fly · Touch Aim hides it')
    expect(engine).toContain('Drag the stick to fly · Touch Aim hides it')
    expect(engine).not.toContain('On-screen stick + arrows · stick hidden in Touch Aim mode')
  })
})
