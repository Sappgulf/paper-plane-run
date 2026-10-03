import { expect, test } from 'vitest'
import {
  TUTORIAL_LENGTH,
  TUTORIAL_LESSON_MIN_SECONDS,
  TUTORIAL_LESSONS,
  nextReadableTutorialLessonIndex,
  tutorialLessonAt,
} from '../src/game/tutorial-lessons.js'

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

test('lesson text stays readable and catches up one step at a time', () => {
  expect(nextReadableTutorialLessonIndex({ distance: 0, elapsed: 0, currentIndex: -1, shownAt: 0 })).toBe(0)
  expect(nextReadableTutorialLessonIndex({ distance: 210, elapsed: TUTORIAL_LESSON_MIN_SECONDS - 0.01, currentIndex: 0, shownAt: 0 })).toBe(0)
  expect(nextReadableTutorialLessonIndex({ distance: 210, elapsed: TUTORIAL_LESSON_MIN_SECONDS, currentIndex: 0, shownAt: 0 })).toBe(1)
  expect(nextReadableTutorialLessonIndex({ distance: 420, elapsed: 20, currentIndex: 1, shownAt: 5 })).toBe(2)
  expect(nextReadableTutorialLessonIndex({ distance: 420, elapsed: 20, currentIndex: 5, shownAt: 18 })).toBe(5)
})
