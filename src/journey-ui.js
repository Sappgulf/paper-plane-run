import { PILOTS, chapterMeta, stepsForChapter } from './journey.js'
import { getPilotMasteryView } from './journey-mastery.js'
import { getJourneyArtwork } from './journey-art.js'

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char])
}

const COSMETIC_LABELS = Object.freeze({
  'milo-portrait-route-reader': 'Route Reader portrait',
  'milo-map-trail': 'Cartographer map trail',
  'milo-compass-border': 'Compass postcard border',
  'pip-portrait-close-call': 'Close Call portrait',
  'pip-ember-trail': 'Ember flight trail',
  'pip-foil-border': 'Redline foil border',
})

function cosmeticLabel(id) {
  return COSMETIC_LABELS[id] || String(id || '').replaceAll('-', ' ')
}

function routeLabel(routeId) {
  const destination = routeId?.split('-')[0]
  const names = {
    rooftops: 'Paper City',
    city: 'Paper City',
    harbor: 'Harbor',
    storm: 'Storm Front',
    aurora: 'Aurora',
    golden: 'Golden Fold',
    midnight: 'Midnight Desk',
    scrapyard: 'Stapler Alley',
    'desk-finale': 'Desk Showdown',
    sunset: 'Golden Fold',
  }
  const risk = routeId?.includes('-risky-') ? 'Risky route' : 'Scenic route'
  return `${names[destination] || 'Journey route'} · ${risk}`
}

export function renderJourneyMap(root, journey) {
  if (!root || !journey) return
  const pilot = PILOTS[journey.pilotId] || PILOTS.navigator
  const chapter = journey.chapter || 1
  const steps = stepsForChapter(chapter)
  const meta = chapterMeta(chapter)
  root.innerHTML = `
    <div class="journey-summary">
      <span>${pilot.icon} ${escapeHtml(pilot.name)}</span>
      <span>📖 Ch.${chapter} · ${escapeHtml(meta.title)}</span>
      <span>💌 ${journey.earnedStampIds.length}/${steps.length} stamps</span>
      <span>${chapter === 2 ? '📎 Stapler' : '🔺 Red Dart'}</span>
    </div>
    <ol class="journey-map-line" aria-label="Journey progress">
      ${steps.map((step, index) => {
        const state = index < journey.stepIndex ? 'complete' : index === journey.stepIndex ? 'current' : 'upcoming'
        return `<li class="journey-stop ${state}"${state === 'current' ? ' aria-current="step"' : ''}>
          <span class="journey-stop-icon">${index < journey.stepIndex ? '✓' : step.icon || '📍'}</span>
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
      ${card.objective ? `<small class="route-objective">Goal · ${escapeHtml(card.objective.label)}</small>` : ''}
      <span class="route-reward">${card.rewardMultiplier.toFixed(2)}× rewards · ${escapeHtml(card.stampId)}</span>
    </button>`).join('')
  root.onclick = (event) => {
    const button = event.target.closest?.('[data-route-id]')
    if (button) onSelect?.(button.dataset.routeId)
  }
}

export function renderPilotChoices(root, journey, lifetimeStamps, onSelect, masteryState = null) {
  if (!root) return
  root.innerHTML = Object.values(PILOTS).map((pilot) => {
    const unlocked = lifetimeStamps >= pilot.unlockedAt
    const mastery = getPilotMasteryView(masteryState, pilot.id)
    return `<button type="button" class="journey-pilot${journey.pilotId === pilot.id ? ' selected' : ''}" data-pilot-id="${pilot.id}" ${unlocked ? '' : 'disabled'}>
      <span class="pilot-icon">${pilot.icon}</span><strong>${escapeHtml(pilot.name)} · Level ${mastery?.level || 0}</strong><small>${escapeHtml(pilot.ability)}</small>
      <em>${unlocked ? escapeHtml(pilot.description) : `Collect ${pilot.unlockedAt} stamps to unlock`}</em>
      <span class="mastery-meter" role="progressbar" aria-label="${escapeHtml(pilot.name)} mastery" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${mastery?.level || 0}"><i style="width:${((mastery?.level || 0) / 3) * 100}%"></i></span>
      <small class="mastery-goal">${escapeHtml(mastery?.nextGoal || 'Begin a Journey')} · ${escapeHtml(mastery?.nextCosmetic ? cosmeticLabel(mastery.nextCosmetic) : 'all cosmetics unlocked')}</small>
    </button>`
  }).join('')
  root.onclick = (event) => {
    const button = event.target.closest?.('[data-pilot-id]')
    if (button && !button.disabled) onSelect?.(button.dataset.pilotId)
  }
}

export function renderPilotMastery(root, masteryState, pilotId) {
  if (!root) return
  const mastery = getPilotMasteryView(masteryState, pilotId)
  root.innerHTML = mastery ? `<div class="pilot-mastery-summary">
    <strong>Level ${mastery.level} · ${escapeHtml(mastery.title)}</strong>
    <span>${escapeHtml(mastery.nextGoal)}</span>
    ${mastery.nextCosmetic ? `<small>Next: ${escapeHtml(cosmeticLabel(mastery.nextCosmetic))}</small>` : '<small>All cosmetics unlocked</small>'}
  </div>` : ''
}

export function renderJourneyResultProgress(root, result) {
  if (!root) return
  const telemetryProgress = (result?.outcome?.nearMisses || 0) + (result?.outcome?.shortcutGatesCleared || 0)
  if (!result || (!result.outcome?.completed && telemetryProgress <= 0)) {
    root.innerHTML = ''
    root.classList?.add('hidden')
    return
  }
  const objective = result.objectiveResult
  const leveledUp = (result.masteryAfter?.level || 0) > (result.masteryBefore?.level || 0)
  root.innerHTML = `<div class="journey-result-progress${result.unlockedCosmetic ? ' unlocked' : ''}">
    ${result.outcome.completed ? '<strong>✓ Stamp earned</strong>' : '<strong>Flight progress saved</strong>'}
    <span>${objective?.completed ? '✓ Objective complete' : '○ Objective missed'} · ${escapeHtml(objective?.label || 'Reach the destination')} ${objective ? `${objective.value}/${objective.target}` : ''}</span>
    <span>${leveledUp ? `★ Mastery Level ${result.masteryAfter.level}` : `Mastery Level ${result.masteryAfter?.level || 0}`} · ${telemetryProgress ? `+${telemetryProgress} flight marks` : 'route logged'}</span>
    ${result.unlockedCosmetic ? `<small>Unlocked · ${escapeHtml(cosmeticLabel(result.unlockedCosmetic))}</small>` : ''}
  </div>`
  root.classList?.remove('hidden')
}

function bindPostcardActions(root, handlers) {
  root.onclick = (event) => {
    const action = event.target.closest?.('[data-postcard-action]')?.dataset.postcardAction
    if (action) handlers?.[action]?.()
  }
}

function postcardImage(card) {
  const art = getJourneyArtwork(card.artworkId)
  return `<img src="${escapeHtml(art.src.replace(/^\//, ''))}" alt="${escapeHtml(art.alt)}" loading="lazy" />`
}

export function renderPostcardAlbum(root, postcards, onOpen) {
  if (!root) return
  if (!postcards.length) {
    root.innerHTML = '<div class="journey-empty"><span>💌</span><strong>No postcards yet</strong><p>Complete a four-flight Journey chapter to make your first one.</p></div>'
    return
  }
  root.innerHTML = postcards.map((card) => {
    const art = getJourneyArtwork(card.artworkId)
    const pilot = PILOTS[card.pilotId] || PILOTS.navigator
    const date = card.completedAt ? new Date(card.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Legacy Journey'
    return `<button type="button" class="journey-postcard" data-postcard-id="${escapeHtml(card.id)}">
      <span class="postcard-art">${postcardImage(card)}</span>
      <strong>${escapeHtml(art.name)}</strong>
      <span>${pilot.icon} ${escapeHtml(pilot.name)} · ${escapeHtml(date)}</span>
      <small>${card.stampIds.length}/4 stamps ${card.perfect ? '· ✨ Perfect route' : ''} ${card.rivalBeaten ? '· 🏆 Red Dart' : ''}</small>
    </button>`
  }).join('')
  root.onclick = (event) => {
    const button = event.target.closest?.('[data-postcard-id]')
    const card = button && postcards.find((item) => item.id === button.dataset.postcardId)
    if (card) onOpen?.(card)
  }
}

export function renderPostcardReveal(root, card, handlers = {}) {
  if (!root || !card) return
  const art = getJourneyArtwork(card.artworkId)
  root.innerHTML = `<div class="postcard-surface reveal-card" role="document">
    <button type="button" class="overlay-close" data-postcard-action="continue" aria-label="Close postcard">×</button>
    <span class="postcard-kicker">Journey complete</span>
    ${postcardImage(card)}
    <h2>${escapeHtml(art.name)}</h2>
    <p>${card.totalDistance}m · ${card.totalStars}★ · ${card.stampIds?.length || 0}/4 stamps</p>
    <div class="btn-row wrap"><button type="button" class="cta-main cta-inline" data-postcard-action="details">View details</button><button type="button" class="btn-secondary" data-postcard-action="share">Share</button></div>
    <p class="share-status" data-postcard-status></p>
    <button type="button" class="linkish" data-postcard-action="continue">Continue</button>
  </div>`
  bindPostcardActions(root, handlers)
}

export function renderPostcardDetail(root, card, handlers = {}) {
  if (!root || !card) return
  const art = getJourneyArtwork(card.artworkId)
  const pilot = PILOTS[card.pilotId] || PILOTS.navigator
  root.innerHTML = `<div class="postcard-surface detail-card" role="document">
    <button type="button" class="overlay-close" data-postcard-action="close" aria-label="Close postcard details">×</button>
    ${postcardImage(card)}
    <h2>${escapeHtml(art.name)}</h2>
    <p>${pilot.icon} ${escapeHtml(pilot.name)} · Mastery Level ${card.masteryLevel || 0}</p>
    <p>${card.totalDistance}m · ${card.totalStars}★ · ${card.stampIds?.length || 0}/4 stamps</p>
    <p>${card.rivalBeaten ? '🏆 Red Dart beaten' : '🔺 Red Dart faced'}${card.perfect ? ' · ✨ Perfect route' : ''}</p>
    <ol class="postcard-route">${(card.routePath || []).map((route) => `<li>${escapeHtml(routeLabel(route))}</li>`).join('')}</ol>
    <div class="postcard-decorations">${(card.decorationIds || []).map((id) => `<span>${escapeHtml(cosmeticLabel(id))}</span>`).join('')}</div>
    <button type="button" class="cta-main cta-inline" data-postcard-action="share">Share postcard</button>
    <p class="share-status" data-postcard-status></p>
  </div>`
  bindPostcardActions(root, handlers)
}
