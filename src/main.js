import './style.css'

import { GameAudio } from './audio.js'
import { Haptic } from './haptics.js'
import { createEngineLoader } from './engine-contract.js'
import { EDITOR_PALETTE, emptyLayout, layoutToShareCode, parseCompact } from './editor.js'
import { getFunnelSummary, track } from './analytics.js'
import { claimAchievementTier, getAchievementProgress } from './achievements.js'
import { claimMission, getDailyMissions, unclaimedRewards } from './missions.js'
import {
  addLifetimeStars,
  claimPlane,
  equipSkin,
  getEquippedSkinId,
  getLifetimeStars,
  listSkins,
  purchasePlane,
  refreshUnlocks,
} from './skins.js'
import { addWallet, buyUpgrade, canPrestige, describeUpgradeEffect, doPrestige, getPrestigeBonusPercent, getPrestigeLevel, getWallet, listUpgrades } from './upgrades.js'
import { buildRunConfiguration, createJourney, getRouteChoices, selectJourneyPilot, selectJourneyRoute } from './journey.js'
import { clearJourney, loadJourney, saveJourney } from './journey-storage.js'
import { buildPostcardShareModel, loadPostcardAlbum } from './journey-postcards.js'
import { renderJourneyMap, renderPilotChoices, renderPostcardAlbum, renderPostcardDetail, renderPostcardReveal, renderRouteChoices } from './journey-ui.js'
import { loadMastery } from './journey-mastery-storage.js'
import { applyDocumentA11y, loadSettings, saveSettings } from './settings.js'
import { seasonInfo } from './seasonal.js'
import { dailyKey } from './rng.js'
import { todaysTwist } from './twists.js'
import { estimateRunsToAfford } from './game/economy.js'
import { fetchRemoteTop, getDailyTop, getLocalTop, getTimeAttackTop } from './leaderboard.js'
import { safeSetItem } from './game/safe-storage.js'

const engineLoader = createEngineLoader()
const engineStatus = document.getElementById('engine-status')
const engineStatusMessage = document.getElementById('engine-status-message')
const engineRetry = document.getElementById('engine-retry')
const menu = document.getElementById('menu')
const hud = document.getElementById('hud')
const shellAudio = new GameAudio()
const $ = (id) => document.getElementById(id)
const muteBtn = $('mute-btn')
const installBtn = $('install-btn')

let settings = loadSettings()
let season = seasonInfo(settings.forceSeason)
let journey = loadJourney(localStorage).journey
let mastery = loadMastery(localStorage).mastery
let journeyRunConfig = null
let postcardFocusReturn = null
let activePlanePreview = null
let planePreviewRequest = 0
const missionBadge = $('mission-badge')
const pilotNameInput = $('pilot-name')
let difficulty = { id: localStorage.getItem('paper-plane-run-diff') || 'normal' }

const DIFFICULTY_COPY = Object.freeze({
  easy: { label: 'Easy', blurb: 'Slower · roomier · more pickups' },
  normal: { label: 'Normal', blurb: 'Balanced flight · classic chaos' },
  hard: { label: 'Hard', blurb: 'Faster · denser · meaner wind' },
})

function resolveAssetUrl(url) {
  return url && url.startsWith('/') ? import.meta.env.BASE_URL + url.slice(1) : url
}

applyDocumentA11y(settings)

if (pilotNameInput) {
  pilotNameInput.value = localStorage.getItem('paper-plane-run-name') || ''
  pilotNameInput.addEventListener('change', () => {
    safeSetItem('paper-plane-run-name', pilotNameInput.value.slice(0, 16))
  })
}

if (muteBtn) {
  muteBtn.textContent = shellAudio.muted ? '🔇' : '🔊'
  muteBtn.addEventListener('click', async (event) => {
    event.stopPropagation()
    await shellAudio.unlock()
    muteBtn.textContent = shellAudio.toggleMute() ? '🔇' : '🔊'
  })
}

// Install and offline startup belong to the always-loaded shell. Deferring
// these listeners with Three.js can miss both beforeinstallprompt and load.
const isStandalone =
  window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
const isIos =
  (/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const installHint = $('install-hint')
const installHintBody = $('install-hint-body')
let deferredInstall = null

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferredInstall = event
  installBtn?.classList.remove('hidden')
})

if (isIos && !isStandalone) installBtn?.classList.remove('hidden')

installBtn?.addEventListener('click', async (event) => {
  event.stopPropagation()
  if (deferredInstall) {
    deferredInstall.prompt()
    await deferredInstall.userChoice
    deferredInstall = null
    installBtn.classList.add('hidden')
    return
  }
  if (installHintBody) {
    installHintBody.innerHTML = isIos
      ? 'Tap the <b>Share</b> icon in Safari\'s toolbar, then <b>Add to Home Screen</b>.'
      : 'Open your browser menu and choose <b>Install app</b> or <b>Add to Home Screen</b>.'
  }
  installHint?.classList.remove('hidden')
})
$('install-hint-close')?.addEventListener('click', () => installHint?.classList.add('hidden'))
installHint?.addEventListener('click', (event) => {
  if (event.target === installHint) installHint.classList.add('hidden')
})

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

function stopPlanePreview() {
  planePreviewRequest += 1
  activePlanePreview?.dispose?.()
  activePlanePreview = null
}

function hideAllPanels() {
  stopPlanePreview()
  for (const id of ['menu', 'journey-panel', 'gameover', 'hangar-panel', 'hotseat-intermission']) {
    $(id)?.classList.add('hidden')
  }
}

function showMenu() {
  hideAllPanels()
  menu?.classList.remove('hidden')
  hud?.classList.add('hidden')
}

function getJourneyStampCount() {
  const stamps = new Set(journey?.earnedStampIds || [])
  for (const postcard of loadPostcardAlbum(localStorage)) {
    for (const stamp of postcard.stampIds || []) stamps.add(stamp)
  }
  return stamps.size
}

function renderJourney() {
  if (!journey) {
    journey = createJourney(Date.now(), Date.now())
    saveJourney(localStorage, journey)
  }
  renderJourneyMap($('journey-map'), journey)
  renderPilotChoices($('journey-pilots'), journey, getJourneyStampCount(), (pilotId) => {
    journey = selectJourneyPilot(journey, pilotId, getJourneyStampCount())
    saveJourney(localStorage, journey)
    renderJourney()
  }, mastery)
  const routes = $('journey-route-choices')
  if (journey.status === 'complete') {
    routes.innerHTML = '<div class="journey-empty"><span>💌</span><strong>Journey complete!</strong><p>Your postcard is waiting in the Hangar.</p></div>'
    $('journey-choice-title').textContent = 'Postcard complete'
    return
  }
  $('journey-choice-title').textContent = journey.selectedRouteId ? 'Selected route' : 'Choose the next route'
  renderRouteChoices(routes, getRouteChoices(journey).map((route) => ({
    ...route,
    selected: route.id === journey.selectedRouteId,
    objective: buildRunConfiguration({ ...journey, selectedRouteId: route.id })?.objective,
  })), (routeId) => {
    journey = selectJourneyRoute(journey, routeId)
    saveJourney(localStorage, journey)
    journeyRunConfig = buildRunConfiguration(journey)
    track('journey_route_selected', { routeId, step: journey.stepIndex })
    void startMode('journey', { journeyConfig: journeyRunConfig })
  })
  track('journey_route_offered', {
    journeyId: journey.id,
    step: journey.stepIndex,
    routeIds: getRouteChoices(journey).map((route) => route.id),
  })
}

function openJourney() {
  hideAllPanels()
  renderJourney()
  $('journey-panel')?.classList.remove('hidden')
  track('journey_started', { journeyId: journey.id, step: journey.stepIndex })
}

function closePostcardOverlay(root) {
  root?.classList.add('hidden')
  postcardFocusReturn?.focus?.()
  postcardFocusReturn = null
}

async function sharePostcard(card, root) {
  const model = buildPostcardShareModel(card, location.origin + location.pathname)
  if (!model) return
  const status = root?.querySelector?.('[data-postcard-status]')
  try {
    if (navigator.share) await navigator.share(model)
    else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(`${model.text}\n${model.url}`)
    else if (status) status.textContent = `${model.text} · ${model.url}`
    if (status) status.textContent = navigator.share ? 'Postcard shared.' : 'Postcard summary copied.'
    track('journey_postcard_shared', { postcardId: card.id })
  } catch (error) {
    if (error?.name !== 'AbortError' && status) status.textContent = `Share unavailable. ${model.text}`
  }
}

function openPostcardDetail(card) {
  const root = $('postcard-detail')
  if (!card || !root) return
  postcardFocusReturn ||= document.activeElement
  $('postcard-reveal')?.classList.add('hidden')
  renderPostcardDetail(root, card, {
    close: () => closePostcardOverlay(root),
    share: () => sharePostcard(card, root),
  })
  root.classList.remove('hidden')
  root.querySelector('button')?.focus()
  track('journey_postcard_opened', { postcardId: card.id })
}

function showPostcardReveal(card) {
  const root = $('postcard-reveal')
  if (!card || !root) return
  postcardFocusReturn = document.activeElement
  renderPostcardReveal(root, card, {
    continue: () => {
      closePostcardOverlay(root)
      openJourney()
    },
    details: () => openPostcardDetail(card),
    share: () => sharePostcard(card, root),
  })
  root.classList.remove('hidden')
  root.querySelector('button')?.focus()
  track('journey_postcard_revealed', { postcardId: card.id })
}

function refreshHangarWallet() {
  const w = $('hangar-wallet')
  const l = $('hangar-lifetime')
  if (w) w.textContent = String(getWallet())
  if (l) l.textContent = String(getLifetimeStars())
  const w2 = $('wallet-stars')
  if (w2) w2.textContent = String(getWallet())
}

function showHangarTab(tab) {
  if (tab !== 'skins') stopPlanePreview()
  document.querySelectorAll('.hangar-tab').forEach((b) => {
    const selected = b.dataset.tab === tab
    b.classList.toggle('active', selected)
    b.setAttribute('aria-selected', String(selected))
    b.setAttribute('tabindex', selected ? '0' : '-1')
  })
  document.querySelectorAll('.hangar-page').forEach((p) => {
    const selected = p.id === `tab-${tab}`
    p.classList.toggle('hidden', !selected)
    p.hidden = !selected
  })
  const hangarBody = document.querySelector('.hangar-body')
  if (hangarBody) hangarBody.scrollTop = 0
  if (tab === 'upgrades') renderUpgrades()
  if (tab === 'skins') renderSkins()
  if (tab === 'missions') renderMissions()
  if (tab === 'achievements') renderAchievements()
  if (tab === 'board') renderBoard('local')
  if (tab === 'settings') renderSettings()
  if (tab === 'stats') renderStats()
  if (tab === 'postcards') renderPostcardAlbum($('postcard-album'), loadPostcardAlbum(localStorage), openPostcardDetail)
  if (tab === 'editor') setupEditor()
  refreshHangarWallet()
}

function refreshMissionBadge() {
  if (!missionBadge) return
  const n = unclaimedRewards()
  if (n > 0) {
    missionBadge.classList.remove('hidden')
    missionBadge.textContent = String(n)
  } else missionBadge.classList.add('hidden')
}

function renderMissions() {
  refreshHangarWallet()
  const list = $('missions-list')
  if (!list) return
  list.innerHTML = ''
  for (const m of getDailyMissions()) {
    const li = document.createElement('li')
    li.className = `mission-row${m.done ? ' done' : ''}`
    const top = document.createElement('div')
    top.className = 'mission-top'
    const left = document.createElement('span')
    left.textContent = `${m.done ? '✓ ' : ''}${m.label}`
    top.appendChild(left)
    const progress = document.createElement('span')
    progress.className = 'mission-count'
    progress.textContent = `${Math.min(m.progress, m.target)}/${m.target}`
    top.appendChild(progress)
    li.appendChild(top)
    const bar = document.createElement('div')
    bar.className = 'mission-bar'
    const fill = document.createElement('div')
    fill.className = 'mission-fill'
    fill.style.width = `${Math.min(100, (m.progress / m.target) * 100)}%`
    bar.appendChild(fill)
    li.appendChild(bar)
    if (m.done && !m.claimed) {
      const btn = document.createElement('button')
      btn.className = 'claim-btn'
      btn.textContent = 'Claim'
      btn.onclick = () => {
        const reward = claimMission(m.id)
        if (reward) {
          addLifetimeStars(reward)
          addWallet(reward)
          shellAudio.missionComplete()
          Haptic.collect()
          refreshUnlocks()
          renderMissions()
          refreshMissionBadge()
        }
      }
      li.appendChild(btn)
    } else if (m.claimed) {
      const sp = document.createElement('span')
      sp.className = 'mission-claimed'
      sp.textContent = 'Claimed ✓'
      li.appendChild(sp)
    }
    list.appendChild(li)
  }
}

function renderAchievements() {
  refreshHangarWallet()
  const box = $('achievements-list')
  if (!box) return
  box.innerHTML = ''
  for (const a of getAchievementProgress(getLifetimeStars())) {
    const card = document.createElement('div')
    card.className = 'achievement-card'
    const nextTier = a.tiers.find((t) => !t.claimed)
    const displayTier = nextTier || a.tiers[a.tiers.length - 1]
    const prevThreshold = a.tiers[a.tiers.indexOf(displayTier) - 1]?.threshold ?? 0
    const span = Math.max(1, displayTier.threshold - prevThreshold)
    const pct = nextTier
      ? Math.min(100, ((a.value - prevThreshold) / span) * 100)
      : 100
    card.innerHTML = `
      <div class="achievement-top">
        <span class="achievement-title">${a.icon} ${a.name}</span>
        <span class="achievement-count">${a.value}${a.unit} / ${displayTier.threshold}${a.unit}</span>
      </div>
      <div class="mission-bar"><div class="mission-fill" style="width:${pct}%"></div></div>
      <div class="achievement-tiers">
        ${a.tiers.map((t, i) => `<span class="tier-dot${t.claimed ? ' claimed' : t.done ? ' done' : ''}" title="${t.threshold}${a.unit} · ${t.reward}★">${i + 1}</span>`).join('')}
      </div>
    `
    const claimable = a.tiers.find((t) => t.claimable)
    if (claimable) {
      const btn = document.createElement('button')
      btn.className = 'claim-btn achievement-claim'
      btn.textContent = `Claim ${claimable.reward}★`
      btn.onclick = () => {
        const reward = claimAchievementTier(a.id, a.tiers.indexOf(claimable))
        if (reward) {
          addLifetimeStars(reward)
          addWallet(reward)
          shellAudio.missionComplete()
          Haptic.collect()
          refreshUnlocks()
          renderAchievements()
        }
      }
      card.appendChild(btn)
    }
    box.appendChild(card)
  }
}

function planeRequirementLabel(plane) {
  if (plane.requirement.type === 'season') return `Season ${plane.requirement.value}`
  if (plane.requirement.type === 'prestige') return `Prestige ${plane.requirement.value}`
  return `Lifetime ${plane.requirement.value}★`
}

function planePriceLabel(plane) {
  return plane.price ? `Wallet ${plane.price.value}★` : 'Free claim'
}

async function showPlanePreview(stage, canvas, planeDefinition) {
  stage.dataset.planeId = planeDefinition.id
  stage.dataset.silhouette = planeDefinition.silhouette
  stage.querySelector('[data-preview-name]').textContent = planeDefinition.name
  stage.querySelector('[data-preview-family]').textContent = planeDefinition.silhouette === 'stunt'
    ? 'Stunt Fold'
    : `${planeDefinition.silhouette[0].toUpperCase()}${planeDefinition.silhouette.slice(1)}${planeDefinition.silhouette === 'classic' ? ' Fold' : ''}`
  canvas.setAttribute('aria-label', `${planeDefinition.name} live 3D preview`)

  if (activePlanePreview?.canvas === canvas && activePlanePreview.updateSkin) {
    activePlanePreview.updateSkin(planeDefinition.id)
    stage.dataset.previewStatus = 'ready'
    stage.querySelector('[data-preview-message]').textContent = 'Live flight model'
    return
  }

  stopPlanePreview()
  const request = planePreviewRequest
  stage.dataset.previewStatus = 'loading'
  stage.querySelector('[data-preview-message]').textContent = 'Folding live preview…'

  try {
    const engine = await engineLoader.preload()
    if (request !== planePreviewRequest || !canvas.isConnected) return
    const preview = engine.createPlanePreview?.({
      canvas,
      skinId: planeDefinition.id,
      reducedMotion: settings.reducedMotion,
    })
    if (!preview) throw new Error('Flight engine did not provide a plane preview')
    if (request !== planePreviewRequest || !canvas.isConnected) {
      preview.dispose?.()
      return
    }
    activePlanePreview = preview
    stage.dataset.previewStatus = 'ready'
    stage.querySelector('[data-preview-message]').textContent = 'Live flight model'
  } catch (error) {
    if (request !== planePreviewRequest || !canvas.isConnected) return
    stage.dataset.previewStatus = 'unavailable'
    stage.querySelector('[data-preview-message]').textContent = 'Portrait shown · live preview unavailable'
    console.warn('Plane preview unavailable', error)
  }
}

function renderSkins(statusMessage = '') {
  refreshUnlocks(season.id)
  refreshHangarWallet()
  const grid = $('skins-grid')
  if (!grid) return
  const status = $('skins-status')
  if (status) status.textContent = statusMessage
  stopPlanePreview()
  grid.innerHTML = ''

  const planes = listSkins(season.id)
  const previewPlane = planes.find((planeDefinition) => planeDefinition.id === getEquippedSkinId()) || planes[0]
  const preview = document.createElement('section')
  preview.className = 'plane-preview'
  preview.setAttribute('data-plane-preview', '')
  preview.innerHTML = `
    <div class="plane-preview-copy">
      <span class="plane-preview-kicker">Plane Collection</span>
      <h3 data-preview-name></h3>
      <span data-preview-family></span>
    </div>
    <div class="plane-preview-stage">
      <canvas width="640" height="360"></canvas>
      <span class="plane-preview-message" data-preview-message role="status"></span>
    </div>
  `
  grid.appendChild(preview)
  const previewCanvas = preview.querySelector('canvas')
  void showPlanePreview(preview, previewCanvas, previewPlane)

  for (const s of planes) {
    const card = document.createElement('button')
    card.type = 'button'
    card.dataset.planeId = s.id
    card.className = `skin-card state-${s.state}${s.equipped ? ' equipped' : ''}${s.state === 'locked' ? ' locked' : ''}`
    card.setAttribute('aria-pressed', String(s.equipped))

    const image = document.createElement('img')
    image.src = resolveAssetUrl(s.portrait)
    image.alt = `${s.name} portrait`
    card.appendChild(image)

    const heading = document.createElement('div')
    heading.className = 'skin-card-heading'
    const name = document.createElement('div')
    name.className = 'name'
    name.textContent = s.name
    const stateLabel = document.createElement('span')
    stateLabel.className = `plane-state plane-state-${s.state}`
    stateLabel.textContent = s.state[0].toUpperCase() + s.state.slice(1)
    heading.append(name, stateLabel)
    card.appendChild(heading)

    const economy = document.createElement('div')
    economy.className = 'plane-economy'
    const requirement = document.createElement('span')
    requirement.className = 'plane-requirement'
    requirement.textContent = planeRequirementLabel(s)
    const price = document.createElement('span')
    price.className = 'plane-price'
    price.textContent = planePriceLabel(s)
    economy.append(requirement, price)
    card.appendChild(economy)

    const action = document.createElement('div')
    action.className = 'meta'
    action.textContent = s.equipped
      ? 'Ready to fly'
      : s.state === 'owned'
        ? 'Equip'
        : s.state === 'available'
          ? s.price
            ? `Purchase ${s.price.value}★`
            : 'Claim free'
          : 'Locked'
    card.appendChild(action)

    const previewThisPlane = () => void showPlanePreview(preview, previewCanvas, s)
    card.addEventListener('focus', previewThisPlane)
    card.addEventListener('pointerenter', previewThisPlane)
    card.onclick = () => {
      refreshUnlocks(season.id)
      if (s.state === 'owned') {
        equipSkin(s.id)
        shellAudio.uiClick()
        renderSkins(`${s.name} equipped.`)
        return
      }
      if (s.state === 'available') {
        const result = s.price ? purchasePlane(s.id) : claimPlane(s.id, season.id)
        if (!result.ok) {
          const message = result.reason === 'poor'
            ? `Need ${result.need} more wallet star${result.need === 1 ? '' : 's'}.`
            : 'Plane is not available right now.'
          renderSkins(message)
          return
        }
        equipSkin(s.id)
        shellAudio.uiClick()
        renderSkins(`${s.name} ${s.price ? 'purchased' : 'claimed'} and equipped.`)
      }
    }
    grid.appendChild(card)
  }
}

function renderPrestige() {
  const panel = $('prestige-panel')
  if (!panel) return
  const level = getPrestigeLevel()
  const ready = canPrestige()
  const bonusPercent = getPrestigeBonusPercent(level)
  const nextBonusPercent = getPrestigeBonusPercent(level + 1)
  const capped = nextBonusPercent === bonusPercent
  if (level === 0 && !ready) {
    panel.classList.add('hidden')
    return
  }
  panel.classList.remove('hidden')
  panel.innerHTML = ''
  const info = document.createElement('div')
  info.className = 'prestige-info'
  info.innerHTML = capped
    ? `<strong>✦ Golden Fold ${level} · MAX</strong><span>Maximum prestige reached · +${bonusPercent}% score & star luck</span>`
    : level > 0
    ? `<strong>✦ Golden Fold ${level}</strong><span>+${bonusPercent}% score & star luck, permanently</span>`
    : `<strong>✦ Golden Fold ready</strong><span>Reset every tree for a permanent bonus</span>`
  panel.appendChild(info)
  if (ready) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'prestige-btn'
    btn.textContent = level > 0 ? 'Prestige again' : 'Prestige'
    btn.onclick = () => {
      if (!confirm(`Reset all upgrade levels for a permanent +${nextBonusPercent - bonusPercent}% score & star luck bonus?`)) return
      const res = doPrestige()
      if (res.ok) {
        shellAudio.uiClick()
        if (settings.haptics) Haptic.collect()
        renderUpgrades()
      }
    }
    panel.appendChild(btn)
  }
}

function renderUpgrades() {
  refreshHangarWallet()
  renderPrestige()
  const grid = $('upgrades-grid')
  if (!grid) return
  grid.innerHTML = ''
  const wallet = getWallet()
  for (const u of listUpgrades()) {
    const effect = describeUpgradeEffect(u.id, u.level)
    const card = document.createElement('div')
    card.className = 'upgrade-card'
    const bars = '●'.repeat(u.level) + '○'.repeat(Math.max(0, u.max - u.level))
    const action = document.createElement(u.maxed ? 'span' : 'button')
    if (u.maxed) {
      action.className = 'u-max'
      action.textContent = 'MAX'
    } else {
      action.type = 'button'
      action.className = 'u-buy'
      action.textContent = `Upgrade ${u.cost}★`
      action.disabled = !u.canAfford
      action.onclick = () => {
        const res = buyUpgrade(u.id)
        if (res.ok) {
          shellAudio.uiClick()
          if (settings.haptics) Haptic.collect()
          renderUpgrades()
        }
      }
    }
    card.innerHTML = `
      <div>
        <div class="u-title">${u.icon} ${u.name}</div>
        <div class="u-blurb">${u.blurb}</div>
      </div>
    `
    card.appendChild(action)
    const effects = document.createElement('div')
    effects.className = 'u-effects'
    const current = document.createElement('div')
    current.className = 'u-effect-current'
    current.textContent = `Current: ${effect.current.label}`
    const next = document.createElement('div')
    next.className = 'u-effect-next'
    next.textContent = effect.next ? `Next: ${effect.next.label}` : 'Next: MAX — all ranks purchased'
    effects.append(current, next)
    card.appendChild(effects)
    if (!u.maxed && !u.canAfford) {
      const estimate = estimateRunsToAfford({ wallet, cost: u.cost })
      const progress = document.createElement('div')
      progress.className = 'u-progress'
      progress.textContent = `${estimate.missingStars}★ to go · about ${estimate.runs} normal ${estimate.runs === 1 ? 'run' : 'runs'}`
      card.appendChild(progress)
    }
    const barEl = document.createElement('div')
    barEl.className = 'u-bars'
    barEl.textContent = `${bars}  ${u.level}/${u.max}`
    card.appendChild(barEl)
    grid.appendChild(card)
  }
}


function renderSettings() {
  settings = loadSettings()
  const bind = (id, key, { number = false } = {}) => {
    const element = $(id)
    if (!element) return
    if (element.type === 'checkbox') {
      element.checked = Boolean(settings[key])
      element.onchange = () => {
        settings = saveSettings({ [key]: element.checked })
        applyDocumentA11y(settings)
        void syncSettingsWithEngine(settings)
      }
      return
    }
    element.value = number ? String(settings[key]) : settings[key]
    element.onchange = () => {
      settings = saveSettings({ [key]: number ? Number(element.value) : element.value })
      applyDocumentA11y(settings)
      void syncSettingsWithEngine(settings)
    }
  }
  bind('set-control-mode', 'controlMode')
  bind('set-invert-y', 'invertY')
  bind('set-invert-x', 'invertX')
  bind('set-mouse-sens', 'mouseSensitivity', { number: true })
  bind('set-reduced-motion', 'reducedMotion')
  bind('set-large-stick', 'largeStick')
  bind('set-auto-level', 'autoLevel')
  bind('set-colorblind', 'colorblindPowers')
  bind('set-low-power', 'lowPower')
  bind('set-haptics', 'haptics')
  bind('set-ar', 'arDesk')
  bind('set-season', 'forceSeason')
  const activeSeason = seasonInfo(settings.forceSeason)
  if ($('season-now')) $('season-now').textContent = `${activeSeason.name} (${activeSeason.id})`
}

function renderStats() {
  const f = getFunnelSummary()
  const box = $('stats-body')
  if (!box) return
  const reasons = Object.entries(f.reasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, v]) => `<li>${k}: <strong>${v}</strong></li>`)
    .join('')
  const counts = Object.entries(f.counts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<li>${k}: <strong>${v}</strong></li>`)
    .join('')
  box.innerHTML = `
    <p class="tagline">Anonymous events on this device (+ optional server). Session ${f.session.slice(0, 10)}…</p>
    <h3>Funnel</h3>
    <ul class="list-card">${counts || '<li>No events yet</li>'}</ul>
    <h3>Death reasons</h3>
    <ul class="list-card">${reasons || '<li>—</li>'}</ul>
  `
}

async function renderBoard(tab = 'local') {
  const list = $('board-list')
  list.innerHTML = ''
  document.querySelectorAll('[data-board]').forEach((t) =>
    t.classList.toggle('active', t.dataset.board === tab),
  )
  let rows = []
  if (tab === 'local') rows = getLocalTop(12)
  else if (tab === 'daily') rows = getDailyTop(dailyKey(), difficulty.id, 12)
  else if (tab === 'timeattack') rows = getTimeAttackTop(12)
  else {
    const remote = await fetchRemoteTop(difficulty.id, false)
    rows = remote?.scores || []
    if (!rows.length) {
      list.innerHTML = '<li>No global scores yet — be the first!</li>'
      return
    }
  }
  if (!rows.length) {
    list.innerHTML = '<li>No scores yet — go fly!</li>'
    return
  }
  const myName = (pilotNameInput?.value || 'Pilot').slice(0, 16)
  rows.forEach((r, i) => {
    const li = document.createElement('li')
    const rank = i + 1
    const isMe = (r.name || 'Pilot') === myName
    li.className = `board-row${rank <= 3 ? ` rank-${rank}` : ''}${isMe ? ' board-me' : ''}`
    const scoreHtml = tab === 'timeattack'
      ? `${r.stars || 0}★<small>${r.distance}m</small>`
      : `${r.distance}m<small>${r.stars || 0}★</small>`
    li.innerHTML = `
      <span class="board-rank">${rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}</span>
      <span class="board-name">${r.name || 'Pilot'}${isMe ? ' (you)' : ''}<small>${r.mode || ''}</small></span>
      <span class="board-score">${scoreHtml}</span>
    `
    list.appendChild(li)
  })
}

// Editor
let editorLayout = emptyLayout()
let editorTool = 'building'
const editorCanvas = $('editor-canvas')
const ectx = editorCanvas.getContext('2d')

function drawEditor() {
  const w = editorCanvas.width
  const h = editorCanvas.height
  ectx.fillStyle = '#e8f0f8'
  ectx.fillRect(0, 0, w, h)
  ectx.strokeStyle = '#c5d4e0'
  for (let i = 0; i < 10; i++) {
    const y = (i / 10) * h
    ectx.beginPath()
    ectx.moveTo(0, y)
    ectx.lineTo(w, y)
    ectx.stroke()
  }
  ectx.fillStyle = '#94a3b8'
  ectx.fillRect(w / 2 - 2, 0, 4, 12)
  ectx.font = '11px Nunito'
  ectx.fillText('→ flight', w / 2 - 18, 22)
  const colors = { building: '#f0956a', bird: '#4a3f3a', scissors: '#94a3b8', star: '#fbbf24', power: '#a78bfa' }
  for (const it of editorLayout.items) {
    const px = ((it.x + 14) / 28) * w
    const py = (it.z / 200) * h
    ectx.fillStyle = colors[it.t] || '#333'
    ectx.beginPath()
    ectx.arc(px, py, 6, 0, Math.PI * 2)
    ectx.fill()
  }
}

function setupEditor() {
  const pal = $('editor-palette')
  pal.innerHTML = ''
  for (const p of EDITOR_PALETTE) {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = p.label
    b.className = p.t === editorTool ? 'active' : ''
    b.onclick = () => {
      editorTool = p.t
      setupEditor()
    }
    pal.appendChild(b)
  }
  drawEditor()
}

editorCanvas?.addEventListener('pointerdown', (e) => {
  const rect = editorCanvas.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 28 - 14
  const z = ((e.clientY - rect.top) / rect.height) * 200
  const y = editorTool === 'building' ? 0 : 6 + Math.random() * 10
  editorLayout.items.push({ t: editorTool, x, y, z })
  drawEditor()
  $('editor-status').textContent = `${editorLayout.items.length} items`
})

$('editor-undo')?.addEventListener('click', () => {
  editorLayout.items.pop()
  drawEditor()
})
$('editor-clear')?.addEventListener('click', () => {
  editorLayout = emptyLayout()
  drawEditor()
})
$('editor-export')?.addEventListener('click', async () => {
  const code = layoutToShareCode(editorLayout)
  const url = `${location.origin}${location.pathname}?layout=${encodeURIComponent(code)}`
  try {
    await navigator.clipboard.writeText(url)
    $('editor-status').textContent = 'Share link copied!'
  } catch {
    $('editor-status').textContent = code.slice(0, 40) + '…'
  }
})
$('editor-load')?.addEventListener('click', () => {
  const raw = $('editor-import').value.trim()
  const L = parseCompact(raw.includes('layout=') ? new URL(raw, location.origin).searchParams.get('layout') : raw)
  if (L) {
    editorLayout = L
    drawEditor()
    $('editor-status').textContent = `Loaded ${L.name} (${L.items.length})`
  } else $('editor-status').textContent = 'Invalid code'
})
$('editor-play')?.addEventListener('click', () => {
  void startMode('layout', { layout: editorLayout })
})


function openHangar(tab = 'upgrades') {
  hideAllPanels()
  $('hangar-panel')?.classList.remove('hidden')
  showHangarTab(tab)
}

let pendingStart = null
let engineFailed = false

function applyEngineSettingsResult(result) {
  if (!result?.settings) return
  settings = result.settings
  season = seasonInfo(settings.forceSeason)
  applyDocumentA11y(settings)
  const arSetting = $('set-ar')
  if (arSetting) arSetting.checked = Boolean(settings.arDesk)
  syncShellControlUi()
  if ($('season-now')) $('season-now').textContent = `${season.name} (${season.id})`
  if (result.arPermissionDenied) alert('Camera permission needed for Desk AR')
}

async function syncSettingsWithEngine(nextSettings) {
  try {
    const result = await engineLoader.syncSettings(nextSettings)
    applyEngineSettingsResult(result)
    return result
  } catch (error) {
    engineFailed = true
    console.warn('Flight engine settings sync failed', error)
    showEngineStatus('Couldn’t apply flight settings. Check your connection and retry.', { retry: true })
    return undefined
  }
}

const shellBridge = Object.freeze({
  showMenu,
  openJourney,
  showPostcardReveal,
  refreshProgression,
  settingsApplied: applyEngineSettingsResult,
})

function showEngineStatus(message, { retry = false } = {}) {
  if (engineStatusMessage) engineStatusMessage.textContent = message
  engineRetry?.classList.toggle('hidden', !retry)
  engineStatus?.classList.remove('hidden')
}

function hideEngineStatus() {
  engineStatus?.classList.add('hidden')
  engineRetry?.classList.add('hidden')
}

function restoreActionableMenu() {
  showMenu()
}

async function startMode(kind, options = {}) {
  pendingStart = { kind, options }
  settings = loadSettings()
  void shellAudio.unlock()
  showEngineStatus('Preparing your plane...')
  try {
    const result = await engineLoader.start(kind, {
      ...options,
      settings,
      engineAudio: shellAudio,
      shellBridge,
    })
    engineFailed = false
    hideEngineStatus()
    return result
  } catch (error) {
    engineFailed = true
    console.warn('Flight engine unavailable', error)
    restoreActionableMenu()
    showEngineStatus('Couldn’t prepare your plane. Check your connection and retry.', { retry: true })
    return undefined
  }
}

const modeByButtonId = {
  'start-btn': 'classic',
  'daily-btn': 'daily',
  'timeattack-btn': 'timeattack',
  'tutorial-btn': 'tutorial',
  'hotseat-btn': 'hotseat',
  'coop-btn': 'coop',
}

document.addEventListener('click', (event) => {
  const button = event.target.closest?.('button')
  const kind = button && modeByButtonId[button.id]
  if (kind) {
    event.preventDefault()
    event.stopImmediatePropagation()
    void startMode(kind)
    return
  }
  if (button?.id === 'journey-btn') {
    event.preventDefault()
    event.stopImmediatePropagation()
    openJourney()
    return
  }
  if (button?.id === 'hangar-btn') {
    event.preventDefault()
    event.stopImmediatePropagation()
    openHangar()
    return
  }
  if (button?.matches('[data-back]')) {
    event.preventDefault()
    event.stopImmediatePropagation()
    showMenu()
    return
  }
  if (button?.matches('.hangar-tab')) {
    event.preventDefault()
    event.stopImmediatePropagation()
    showHangarTab(button.dataset.tab)
  }
}, true)

document.querySelector('.hangar-tabs')?.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  const tabs = [...document.querySelectorAll('.hangar-tab')]
  const current = tabs.indexOf(document.activeElement)
  if (current < 0) return
  event.preventDefault()
  const next = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? tabs.length - 1
      : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
  tabs[next].focus()
  showHangarTab(tabs[next].dataset.tab)
})

engineRetry?.addEventListener('click', () => {
  if (engineFailed) {
    if (pendingStart) {
      sessionStorage.setItem('paper-plane-engine-retry', JSON.stringify(pendingStart))
    }
    location.reload()
    return
  }
  if (pendingStart) void startMode(pendingStart.kind, pendingStart.options)
  else preloadEngine()
})

function preloadEngine() {
  engineLoader.preload().catch((error) => {
    engineFailed = true
    console.warn('Flight engine preload failed', error)
    restoreActionableMenu()
    showEngineStatus('Couldn’t prepare your plane. Check your connection and retry.', { retry: true })
  })
}

function setShellDifficulty(id, { persist = true } = {}) {
  const copy = DIFFICULTY_COPY[id]
  if (!copy) return
  difficulty = { id }
  if (persist) safeSetItem('paper-plane-run-diff', id)
  document.querySelectorAll('.diff-btn[data-diff]').forEach((item) => {
    item.classList.toggle('active', item.dataset.diff === id)
  })
  if ($('diff-blurb')) $('diff-blurb').textContent = copy.blurb
  const twist = todaysTwist()
  if ($('daily-hint')) {
    $('daily-hint').textContent = `📅 Daily ${dailyKey()} · seed race on ${copy.label} · ${twist.icon} ${twist.name}: ${twist.desc}`
  }
}

document.querySelectorAll('.diff-btn[data-diff]').forEach((button) => {
  button.addEventListener('click', () => {
    setShellDifficulty(button.dataset.diff)
    void shellAudio.unlock().then(() => shellAudio.uiClick())
  })
})
setShellDifficulty(difficulty.id, { persist: false })

const isTouchPrimary = window.matchMedia?.('(pointer: coarse)').matches && navigator.maxTouchPoints > 0

function syncShellControlUi() {
  const mode = settings.controlMode === 'joystick' ? 'joystick' : 'mouse'
  document.querySelectorAll('.ctrl-btn').forEach((item) => {
    item.classList.toggle('active', item.dataset.ctrl === mode)
  })
  const mouseButton = document.querySelector('.ctrl-btn[data-ctrl="mouse"]')
  if (mouseButton) mouseButton.textContent = isTouchPrimary ? '👆 Touch Aim' : '🖱 Mouse'
  const blurb = $('ctrl-blurb')
  if (blurb) {
    if (mode === 'joystick') {
      blurb.textContent = isTouchPrimary
        ? 'Drag the stick to fly · Touch Aim hides it'
        : 'Stick, arrows, or WASD · Mouse mode hides it'
    } else if (isTouchPrimary) {
      blurb.textContent = settings.invertY
        ? 'Drag anywhere — plane tracks your finger · Y inverted'
        : 'Drag anywhere — plane tracks your finger'
    } else {
      blurb.textContent = settings.invertY
        ? 'Move cursor — plane tracks it · Y inverted'
        : 'Move cursor — plane tracks left/right & up/down'
    }
  }
  const menuInvert = $('menu-invert-y')
  if (menuInvert) menuInvert.checked = Boolean(settings.invertY)
}

document.querySelectorAll('.ctrl-btn').forEach((button) => {
  button.addEventListener('click', () => {
    settings = saveSettings({ controlMode: button.dataset.ctrl })
    syncShellControlUi()
    void syncSettingsWithEngine(settings)
    void shellAudio.unlock().then(() => shellAudio.uiClick())
  })
})

const menuInvert = $('menu-invert-y')
if (menuInvert) {
  menuInvert.addEventListener('change', () => {
    settings = saveSettings({ invertY: menuInvert.checked })
    syncShellControlUi()
    void syncSettingsWithEngine(settings)
  })
}
syncShellControlUi()

// One-time nudge for touch players sitting in portrait — dismissible and
// available before the deferred engine has loaded.
;(() => {
  const hint = $('landscape-hint')
  if (!hint || !isTouchPrimary) return
  const seenKey = 'paper-plane-run-landscape-hint-seen'
  if (localStorage.getItem(seenKey)) return
  if (innerHeight > innerWidth) hint.classList.remove('hidden')
  hint.addEventListener('click', () => {
    hint.classList.add('hidden')
    safeSetItem(seenKey, '1')
  })
})()

$('journey-restart')?.addEventListener('click', () => {
  if (journey?.status === 'active' && journey.stepIndex > 0 && !confirm('Start a new Journey? Current map progress will be replaced.')) return
  clearJourney(localStorage)
  journey = createJourney(Date.now(), Date.now())
  saveJourney(localStorage, journey)
  track('journey_restarted', { journeyId: journey.id })
  renderJourney()
})

function refreshProgression() {
  journey = loadJourney(localStorage).journey
  mastery = loadMastery(localStorage).mastery
  refreshMissionBadge()
  refreshHangarWallet()
}

if (import.meta.env.DEV && location.hash === '#test-postcard') {
  showPostcardReveal({
    id: 'test-postcard',
    journeyId: 'test-journey',
    artworkId: 'aurora',
    pilotId: 'navigator',
    completedAt: Date.now(),
    routePath: ['rooftops-safe-star-trail', 'harbor-risky-shortcut-gates', 'storm-safe-low-visibility', 'aurora-risky-red-dart-finale'],
    stampIds: ['rooftops-steady', 'harbor-bold', 'storm-steady', 'aurora-bold'],
    objectiveResults: [{ label: 'Beat Red Dart', completed: true, value: 1, target: 1 }],
    masteryLevel: 3,
    decorationIds: ['milo-map-trail', 'milo-compass-border'],
    totalDistance: 1640,
    totalStars: 38,
    rivalBeaten: true,
    perfect: true,
  })
}

const retryRequest = sessionStorage.getItem('paper-plane-engine-retry')
if (retryRequest) {
  sessionStorage.removeItem('paper-plane-engine-retry')
  try {
    const request = JSON.parse(retryRequest)
    queueMicrotask(() => startMode(request.kind, request.options))
  } catch {
    queueMicrotask(preloadEngine)
  }
} else if (import.meta.env.DEV && location.hash.startsWith('#test-') && location.hash !== '#test-postcard') {
  queueMicrotask(preloadEngine)
} else if ('requestIdleCallback' in window) {
  window.requestIdleCallback(preloadEngine, { timeout: 1000 })
} else {
  window.setTimeout(preloadEngine, 250)
}
