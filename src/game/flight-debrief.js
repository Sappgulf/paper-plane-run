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
  } else if (reason === 'Nosed into the paper ground') {
    title = tucking ? 'Give the flare some sky' : 'Height is your fuel'
    advice = tucking
      ? 'Release Tuck while you still have height. Start with short holds, then build a deeper flare.'
      : 'Ride the green UPDRAFT columns to regain height. Gentle banks preserve it; holding the nose up spends it.'
  } else if (/^Missed the (wind|stapler|scissors) ring!$/.test(reason)) {
    title = 'Read the passage early'
    advice = 'Follow the outlined opening before the gate closes. Start your bank during its warning.'
  }
  const highlights = [
    ['gauntlets', 'Gauntlets cleared'],
    ['threads', 'Gaps threaded'],
    ['flares', 'Clean flares'],
    ['fevers', 'Fever bursts'],
    ['powers', 'Power pickups'],
  ].map(([id, label]) => ({ id, label, value: count(stats?.[id]) }))
    .filter(({ value }) => value > 0).slice(0, 3)
  return { title, advice, highlights }
}
