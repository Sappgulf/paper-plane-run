const CLEAN_END_REASONS = new Set([
  'Tutorial complete!',
  "Time's up!",
  'Journey route complete!',
])

export function isCleanEndReason(reason) {
  return CLEAN_END_REASONS.has(reason)
}

export function getRecapCopy(reason) {
  return isCleanEndReason(reason)
    ? Object.freeze({
      imageAlt: 'Flight recap',
      saveLabel: 'Save recap',
      shareLabel: 'Share recap',
    })
    : Object.freeze({
      imageAlt: 'Crash photo',
      saveLabel: 'Save photo',
      shareLabel: 'Share photo',
    })
}
