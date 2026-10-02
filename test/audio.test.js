import { beforeEach, describe, expect, test, vi } from 'vitest'
import { GameAudio } from '../src/audio.js'

describe('GameAudio synthesizer', () => {
  let audio

  beforeEach(() => {
    localStorage.clear()
    audio = new GameAudio()
  })

  test('initializes with default settings', () => {
    expect(audio.muted).toBe(false)
    expect(audio.musicOn).toBe(true)
    expect(audio.intensity).toBe(0)
    expect(audio.altitudeTier).toBe(0)
  })

  test('toggles mute and persists state', () => {
    const muted = audio.toggleMute()
    expect(muted).toBe(true)
    expect(localStorage.getItem('paper-plane-run-muted')).toBe('1')

    const unmuted = audio.toggleMute()
    expect(unmuted).toBe(false)
    expect(localStorage.getItem('paper-plane-run-muted')).toBe('0')
  })

  test('toggles music and persists state', () => {
    const musicState = audio.toggleMusic()
    expect(musicState).toBe(false)
    expect(localStorage.getItem('paper-plane-run-music')).toBe('0')
  })

  test('sets music zone scale cleanly', () => {
    audio.setMusicZone('sunset')
    expect(audio.scale).toEqual([207.65, 233.08, 277.18, 311.13, 349.23, 415.3])

    audio.setMusicZone('unknown-zone')
    expect(audio.scale).toEqual([196, 220, 261.63, 293.66, 329.63, 392])
  })

  test('sets altitude tier bounded between 0 and 8', () => {
    audio.setAltitudeTier(4)
    expect(audio.altitudeTier).toBe(4)

    audio.setAltitudeTier(-2)
    expect(audio.altitudeTier).toBe(0)

    audio.setAltitudeTier(99)
    expect(audio.altitudeTier).toBe(8)
  })

  test('audio cues execute safely without audio context', () => {
    expect(() => {
      audio.paperRustle()
      audio.uiClick()
      audio.collectStar()
      audio.goldenStar()
      audio.threadGap()
      audio.gauntletClear()
      audio.flare(0.8)
      audio.newRecord()
      audio.fever()
      audio.crash()
      audio.windGust()
      audio.bossWarning()
      audio.zoneTransition()
      audio.setPaused(true)
      audio.setPaused(false)
    }).not.toThrow()
  })
  test('paper rustles respect mute and release their transient audio nodes', () => {
    const parameter = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() })
    const source = { connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() }
    const filter = { frequency: parameter(), Q: {}, connect: vi.fn(), disconnect: vi.fn() }
    const gain = { gain: parameter(), connect: vi.fn(), disconnect: vi.fn() }
    audio.ctx = { currentTime: 3, createBufferSource: vi.fn(() => source), createBiquadFilter: () => filter, createGain: () => gain }
    audio.paperNoise = {}
    audio.muted = true
    audio.paperRustle()
    expect(audio.ctx.createBufferSource).not.toHaveBeenCalled()
    audio.muted = false
    audio.paperRustle()
    expect(source.stop).toHaveBeenCalledOnce()
    expect(source.stop.mock.calls[0][0]).toBeCloseTo(3.1, 8)
    source.onended()
    for (const node of [source, filter, gain]) expect(node.disconnect).toHaveBeenCalledOnce()
  })

})
