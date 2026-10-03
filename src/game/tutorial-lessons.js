/** Distance selects a lesson; each lesson gets its own readable stretch of sky. */
export const TUTORIAL_LENGTH = 600
export const TUTORIAL_LESSON_MIN_SECONDS = 3.5
export const TUTORIAL_LESSONS = Object.freeze([
  { at: 0, title: 'Find your line', text: 'Bank toward the rings. Start each turn early; your wings take a moment to roll.' },
  { at: 65, title: 'Height is fuel', text: 'Your plane always sinks. Gentle turns keep more height than hard banks.' },
  { at: 135, title: 'Ride the rising air', text: 'Green arrow columns marked UPDRAFT are updrafts: rising air. Fly through one to regain height.' },
  { at: 210, title: 'Tuck, then flare', text: 'Hold Space or the Tuck button for a short dive. Release to climb and bank bonus meters.' },
  { at: 280, title: 'Release while you have height', text: 'A longer tuck pays more. Release before the ground; watch for the RELEASE cue.' },
  { at: 350, title: 'Take it into the open sky', text: 'Collect stars for upgrades. In Classic, dodge the ink-edged hazards—even down near the ground.' },
])

export function tutorialLessonAt(distance) {
  return TUTORIAL_LESSONS.findLast((lesson) => distance >= lesson.at) || TUTORIAL_LESSONS[0]
}

/** Keep a lesson readable even when pickups advance the distance counter quickly. */
export function nextReadableTutorialLessonIndex({ distance, elapsed, currentIndex, shownAt }) {
  const reachedIndex = TUTORIAL_LESSONS.findLastIndex((lesson) => distance >= lesson.at)
  const nextIndex = currentIndex + 1
  if (nextIndex > reachedIndex) return currentIndex
  if (currentIndex < 0 || elapsed - shownAt >= TUTORIAL_LESSON_MIN_SECONDS) return nextIndex
  return currentIndex
}
