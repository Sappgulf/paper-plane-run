import { describe, expect, it, vi } from 'vitest'
import { createJourney, getRouteChoices } from '../src/journey.js'
import { createMasteryState, resolveMasteryOutcome } from '../src/journey-mastery.js'
import { renderJourneyMap, renderJourneyResultProgress, renderPilotChoices, renderRouteChoices } from '../src/journey-ui.js'

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

  it('shows pilot level, next goal, locked reward, and semantic progress', () => {
    const el = root()
    const mastery = resolveMasteryOutcome(createMasteryState(), {
      receiptId: 'milo:one', pilotId: 'navigator', completed: true, destinationId: 'city',
    })
    renderPilotChoices(el, createJourney(4, 1000), 0, vi.fn(), mastery)
    expect(el.innerHTML).toContain('Level 0')
    expect(el.innerHTML).toContain('Complete 2 Journey routes')
    expect(el.innerHTML).toContain('milo-portrait-route-reader')
    expect(el.innerHTML).toContain('role="progressbar"')
    expect(el.innerHTML).toContain('Collect 4 stamps to unlock')
  })

  it('renders Journey objective and mastery result progress', () => {
    const el = root()
    renderJourneyResultProgress(el, {
      outcome: { completed: true },
      objectiveResult: { completed: true, label: 'Clear the shortcut gates', value: 3, target: 3 },
      masteryBefore: { level: 0 },
      masteryAfter: { level: 1 },
      unlockedCosmetic: 'milo-portrait-route-reader',
    })
    expect(el.innerHTML).toContain('Stamp earned')
    expect(el.innerHTML).toContain('Objective complete')
    expect(el.innerHTML).toContain('Level 1')
    expect(el.innerHTML).toContain('milo-portrait-route-reader')
  })
})
