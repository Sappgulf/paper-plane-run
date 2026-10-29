export const isCleanFlightEnd = reason => ['Tutorial complete!', 'Journey route complete!', 'Custom route complete!'].includes(reason)

const count = (value) => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0

/** Copy follows the observed ending, without changing flight or reward rules. */
export function buildFlightDebrief({ reason = '', tucking = false, stats = {} } = {}) {
  let title = 'Find your next line'
  let advice = 'Bank toward the clear gap early, then ease the turn to keep more height.'
  if (reason === 'Tutorial complete!') {
    title = 'Practice complete'
    advice = 'Take your banks, updrafts and short Tucks into Classic. The open sky adds hazards to the same moves.'
  } else if (reason === 'Journey route complete!') {
    title = 'A clean arrival'
    advice = 'Your route is stamped. Choose the next stop in your journal and read its objective before launching.'
  } else if (reason === 'Custom route complete!') {
    title = 'A clean finish'
    advice = 'Your custom course is complete. Replay it, or return to the Hangar to change the route.'
  } else if (reason === 'Nosed into the paper ground') {
    title = tucking ? 'Give the flare some sky' : 'Height is your fuel'
    advice = tucking
      ? 'Release Tuck while you still have height. Start with short holds, then build a deeper flare.'
      : 'Ride the green UPDRAFT columns to regain height. Gentle banks preserve it; holding the nose up spends it.'
  } else if (/^Missed the (wind|stapler|scissors|punch) ring!$/.test(reason)) {
    title = 'Read the passage early'
    advice = tucking
      ? 'Release Tuck before the gate. A dive can drop you out of the outlined opening.'
      : 'Follow the outlined opening before the gate closes. Start your bank during its warning.'
  }
  // Each counter reads as one thing at 1, so "1 Gauntlet cleared", not "1 Gauntlets cleared".
  const highlights = [
    ['gauntlets', 'Gauntlet cleared', 'Gauntlets cleared'],
    ['threads', 'Gap threaded', 'Gaps threaded'],
    ['flares', 'Clean flare', 'Clean flares'],
    ['fevers', 'Fever burst', 'Fever bursts'],
    ['weaponPops', 'Ink pop', 'Ink pops'],
    ['powers', 'Power pickup', 'Power pickups'],
  ].map(([id, singular, plural]) => {
    const value = count(stats?.[id])
    return { id, label: value === 1 ? singular : plural, value }
  }).filter(({ value }) => value > 0).slice(0, 3)
  return { title, advice, highlights }
}
