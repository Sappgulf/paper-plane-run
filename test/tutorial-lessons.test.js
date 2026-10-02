import { expect, test } from 'vitest'
import { TUTORIAL_LENGTH, TUTORIAL_LESSONS, tutorialLessonAt } from '../src/game/tutorial-lessons.js'

test('lessons introduce banking, altitude, updrafts and tuck before the finish', () => {
  const text = TUTORIAL_LESSONS.map((lesson) => lesson.text).join(' ')
  expect(text).toMatch(/Bank/)
  expect(text).toMatch(/always sinks/)
  expect(text).toMatch(/updrafts/)
  expect(text).toMatch(/Hold Space/)
  expect(text).toMatch(/Release before the ground/)
  expect(TUTORIAL_LESSONS.at(-1).at).toBeLessThan(TUTORIAL_LENGTH - 40)
  for (let index = 1; index < TUTORIAL_LESSONS.length; index++) {
    expect(TUTORIAL_LESSONS[index].at - TUTORIAL_LESSONS[index - 1].at).toBeGreaterThanOrEqual(60)
  }
})

test('lesson lookup handles the opening, exact boundaries and the finish', () => {
  expect(tutorialLessonAt(-1)).toBe(TUTORIAL_LESSONS[0])
  for (const lesson of TUTORIAL_LESSONS) expect(tutorialLessonAt(lesson.at)).toBe(lesson)
  expect(tutorialLessonAt(TUTORIAL_LENGTH)).toBe(TUTORIAL_LESSONS.at(-1))
})
