import { JOURNEY_STEPS, PILOTS } from './journey.js'

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char])
}

export function renderJourneyMap(root, journey) {
  if (!root || !journey) return
  const pilot = PILOTS[journey.pilotId] || PILOTS.navigator
  root.innerHTML = `
    <div class="journey-summary">
      <span>${pilot.icon} ${escapeHtml(pilot.name)}</span>
      <span>💌 ${journey.earnedStampIds.length}/${JOURNEY_STEPS.length} stamps</span>
      <span>🔺 Red Dart</span>
    </div>
    <ol class="journey-map-line" aria-label="Journey progress">
      ${JOURNEY_STEPS.map((step, index) => {
        const state = index < journey.stepIndex ? 'complete' : index === journey.stepIndex ? 'current' : 'upcoming'
        return `<li class="journey-stop ${state}"${state === 'current' ? ' aria-current="step"' : ''}>
          <span class="journey-stop-icon">${index < journey.stepIndex ? '✓' : index === JOURNEY_STEPS.length - 1 ? '🔺' : ['🏙️', '⚓', '⛈️'][index]}</span>
          <span>${escapeHtml(step.label)}</span>
        </li>`
      }).join('')}
    </ol>`
}

export function renderRouteChoices(root, cards, onSelect) {
  if (!root) return
  root.innerHTML = cards.map((card) => `
    <button type="button" class="journey-route-card ${card.risk}${card.selected ? ' selected' : ''}" data-route-id="${escapeHtml(card.id)}" aria-pressed="${card.selected ? 'true' : 'false'}">
      <span class="route-risk">${card.risk === 'risky' ? '⚠ Risky' : '✓ Safe'}</span>
      <span class="route-icon">${card.icon}</span>
      <strong>${escapeHtml(card.label)}</strong>
      <span>${escapeHtml(card.modifierLabel)}</span>
      <small>${escapeHtml(card.description)}</small>
      <span class="route-reward">${card.rewardMultiplier.toFixed(2)}× rewards · ${escapeHtml(card.stampId)}</span>
    </button>`).join('')
  root.onclick = (event) => {
    const button = event.target.closest?.('[data-route-id]')
    if (button) onSelect?.(button.dataset.routeId)
  }
}

export function renderPilotChoices(root, journey, lifetimeStamps, onSelect) {
  if (!root) return
  root.innerHTML = Object.values(PILOTS).map((pilot) => {
    const unlocked = lifetimeStamps >= pilot.unlockedAt
    return `<button type="button" class="journey-pilot${journey.pilotId === pilot.id ? ' selected' : ''}" data-pilot-id="${pilot.id}" ${unlocked ? '' : 'disabled'}>
      <span>${pilot.icon}</span><strong>${escapeHtml(pilot.name)}</strong><small>${escapeHtml(pilot.ability)}</small>
      <em>${unlocked ? escapeHtml(pilot.description) : `Collect ${pilot.unlockedAt} stamps to unlock`}</em>
    </button>`
  }).join('')
  root.onclick = (event) => {
    const button = event.target.closest?.('[data-pilot-id]')
    if (button && !button.disabled) onSelect?.(button.dataset.pilotId)
  }
}

export function renderPostcardAlbum(root, postcards) {
  if (!root) return
  if (!postcards.length) {
    root.innerHTML = '<div class="journey-empty"><span>💌</span><strong>No postcards yet</strong><p>Complete a four-flight Journey to make your first one.</p></div>'
    return
  }
  root.innerHTML = postcards.map((card) => `<article class="journey-postcard">
    <div class="postcard-art">✈️ ${card.perfect ? '✨' : ''}</div>
    <h3>Paper Skies Journey</h3>
    <p>${card.totalDistance}m · ${card.totalStars}★ · ${card.stampIds.length}/4 stamps</p>
    <p>${card.rivalBeaten ? '🏆 Beat the Red Dart' : '🔺 Faced the Red Dart'}</p>
  </article>`).join('')
}
