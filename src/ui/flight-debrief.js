export function renderFlightDebrief(root, debrief) {
  if (!root) return
  root.replaceChildren()
  root.classList.toggle('hidden', !debrief)
  if (!debrief) return
  const label = document.createElement('span')
  label.className = 'chip-label'
  label.textContent = 'For your next flight'
  const title = document.createElement('h3')
  title.textContent = debrief.title
  const advice = document.createElement('p')
  advice.textContent = debrief.advice
  root.append(label, title, advice)
  if (debrief.highlights.length) {
    const highlights = document.createElement('ul')
    highlights.className = 'debrief-highlights'
    highlights.setAttribute('aria-label', 'Flight highlights')
    for (const item of debrief.highlights) {
      const entry = document.createElement('li')
      const value = document.createElement('b')
      value.textContent = item.value
      entry.append(value, ` ${item.label}`)
      highlights.append(entry)
    }
    root.append(highlights)
  }
}
