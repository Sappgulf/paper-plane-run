import { describe, expect, it, vi } from 'vitest'
import { createJourney, getRouteChoices } from '../src/journey.js'
import { renderJourneyMap, renderRouteChoices } from '../src/journey-ui.js'

function root() {
  return { innerHTML: '', onclick: null }
}

describe('Journey UI', () => {
  it('renders four journey stops and current progress', () => {
    const el = root()
    renderJourneyMap(el, createJourney(4, 1000))
    expect(el.innerHTML.match(/class="journey-stop /g)).toHaveLength(4)
    expect(el.innerHTML).toContain('aria-current="step"')
  })

  it('renders safe and risky route buttons and dispatches selection', () => {
    const el = root()
    const select = vi.fn()
    const cards = getRouteChoices(createJourney(9, 1000))
    renderRouteChoices(el, cards, select)
    expect(el.innerHTML).toContain('Safe')
    expect(el.innerHTML).toContain('Risky')
    el.onclick({ target: { closest: () => ({ dataset: { routeId: cards[1].id } }) } })
    expect(select).toHaveBeenCalledWith(cards[1].id)
  })
})
