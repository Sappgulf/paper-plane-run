import { describe, expect, test } from 'vitest'
import { JOURNEY_CHAPTERS, getRouteChoices, createJourney, stepsForChapter } from '../src/journey.js'
import {
  arrivalStory,
  chapterStory,
  closingStory,
  routeStory,
  stepStory,
  storiedStepIds,
} from '../src/journey-story.js'

describe('journey story', () => {
  // The point of the module: no stop in either chapter may fall back to
  // generic copy, because a stop with nothing to say is the state this
  // replaced.
  test('every authored stop in both chapters has copy', () => {
    for (const chapter of [1, 2]) {
      const ids = stepsForChapter(chapter).map((step) => step.id)
      expect(storiedStepIds(chapter)).toEqual(ids)
      for (const id of ids) {
        const stop = stepStory(chapter, id)
        expect(stop?.headline).toBeTruthy()
        expect(stop?.brief.length).toBeGreaterThan(40)
        expect(arrivalStory(chapter, id).length).toBeGreaterThan(20)
        for (const risk of ['safe', 'risky']) {
          expect(routeStory({ chapter, stepId: id, risk }).line.length).toBeGreaterThan(20)
        }
      }
    }
  })

  test('the safe and risky lines for a stop are different routes', () => {
    for (const chapter of [1, 2]) {
      for (const id of storiedStepIds(chapter)) {
        const safe = routeStory({ chapter, stepId: id, risk: 'safe' }).line
        const risky = routeStory({ chapter, stepId: id, risk: 'risky' }).line
        expect(safe).not.toBe(risky)
      }
    }
  })

  test('the pilot changes the voice, not the route', () => {
    const milo = routeStory({ chapter: 1, stepId: 'harbor', risk: 'risky', pilotId: 'navigator' })
    const pip = routeStory({ chapter: 1, stepId: 'harbor', risk: 'risky', pilotId: 'daredevil' })
    expect(milo.line).toBe(pip.line)
    expect(milo.voice).not.toBe(pip.voice)
  })

  test('chapter framing matches the chapter it is asked for', () => {
    expect(chapterStory(1).title).toBe('Across the Paper Skies')
    expect(chapterStory(2).title).toBe('Desk After Dark')
    expect(chapterStory(1).premise).not.toBe(chapterStory(2).premise)
    for (const chapter of [1, 2]) {
      expect(chapterStory(chapter).premise.length).toBeGreaterThan(60)
      expect(JOURNEY_CHAPTERS[chapter]).toBeTruthy()
    }
  })

  test('the closing line turns on whether the rival was beaten', () => {
    for (const chapter of [1, 2]) {
      const won = closingStory(chapter, { rivalBeaten: true })
      const lost = closingStory(chapter, { rivalBeaten: false })
      expect(won).not.toBe(lost)
      expect(won.length).toBeGreaterThan(20)
      expect(lost.length).toBeGreaterThan(20)
    }
  })

  test('an unknown chapter or stop still renders something true', () => {
    expect(chapterStory(99).title).toBe(chapterStory(1).title)
    expect(stepStory(1, 'not-a-stop')).toBeNull()
    expect(arrivalStory(1, 'not-a-stop')).toBeTruthy()
    expect(routeStory({ chapter: 1, stepId: 'not-a-stop' }).line).toBeTruthy()
    expect(routeStory({ pilotId: 'nobody' }).voice).toBeTruthy()
  })

  // The route cards look their copy up by the stepId the route carries, so a
  // renamed stop has to break here rather than silently show a fallback.
  test('the ids routes carry are the ids the story is keyed by', () => {
    for (const chapter of [1, 2]) {
      const journey = createJourney(7, 0, chapter)
      const steps = stepsForChapter(chapter)
      for (let index = 0; index < steps.length; index += 1) {
        for (const route of getRouteChoices({ ...journey, stepIndex: index })) {
          expect(storiedStepIds(chapter)).toContain(route.stepId)
        }
      }
    }
  })
})
