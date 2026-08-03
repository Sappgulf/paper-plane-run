import { describe, expect, test } from 'vitest'

import {
  FLIGHT_PRESENTATION_IDS,
  clearFlightPresentation,
} from '../src/game/flight-presentation.js'
import { getRecapCopy, isCleanEndReason } from '../src/game/recap-copy.js'

function fakeElement(classes = []) {
  const values = new Set(classes)
  return {
    classList: {
      add(...names) { names.forEach((name) => values.add(name)) },
      remove(...names) { names.forEach((name) => values.delete(name)) },
      contains(name) { return values.has(name) },
    },
    dataset: {},
    style: {},
  }
}

function fakeDocument() {
  const elements = new Map(FLIGHT_PRESENTATION_IDS.map((id) => [id, fakeElement()]))
  elements.set('speed-fx', fakeElement())
  elements.set('fever-fx', fakeElement(['fever-active']))
  elements.set('warn-flash', fakeElement([
    'warn-pulse', 'impact-pulse', 'impact-hazard', 'guardian-flash',
  ]))
  elements.get('fire-btn').classList.add('firing', 'weapon-ready', 'cooling', 'weapon-ready-pulse')
  elements.get('magnet-pull-trail').dataset.active = 'true'
  const arrows = [fakeElement(['visible']), fakeElement(['visible'])]
  return {
    elements,
    arrows,
    getElementById(id) { return elements.get(id) },
    querySelectorAll() { return arrows },
  }
}

describe('flight presentation cleanup', () => {
  test('hides transient flight UI and resets visual state', () => {
    const doc = fakeDocument()

    clearFlightPresentation(doc)

    for (const id of FLIGHT_PRESENTATION_IDS) {
      expect(doc.elements.get(id).classList.contains('hidden')).toBe(true)
    }
    expect(doc.elements.get('speed-fx').style.opacity).toBe('0')
    expect(doc.elements.get('magnet-pull-trail').dataset.active).toBe('false')
    expect(doc.elements.get('fever-fx').classList.contains('fever-active')).toBe(false)
    expect(doc.elements.get('fire-btn').classList.contains('weapon-ready')).toBe(false)
    expect(doc.elements.get('warn-flash').classList.contains('impact-pulse')).toBe(false)
    expect(doc.arrows.every((arrow) => !arrow.classList.contains('visible'))).toBe(true)
  })
})

describe('recap copy', () => {
  test('uses flight language for clean endings', () => {
    expect(isCleanEndReason('Journey route complete!')).toBe(true)
    expect(getRecapCopy('Journey route complete!')).toEqual({
      imageAlt: 'Flight recap',
      saveLabel: 'Save recap',
      shareLabel: 'Share recap',
    })
  })

  test('keeps crash language for hazard endings', () => {
    expect(isCleanEndReason('Clipped a paper tower')).toBe(false)
    expect(getRecapCopy('Clipped a paper tower')).toEqual({
      imageAlt: 'Crash photo',
      saveLabel: 'Save photo',
      shareLabel: 'Share photo',
    })
  })
})
