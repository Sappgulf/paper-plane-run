import './style.css'

import { GameAudio } from './audio.js'
import { Haptic } from './haptics.js'
import { createEngineLoader } from './engine-contract.js'
import { EDITOR_PALETTE, emptyLayout, layoutToShareCode, parseCompact } from './editor.js'
import { getFunnelSummary, track } from './analytics.js'
import {
  claimAchievementTier,
  getAchievementProgress,
  getLifetimeDistance,
  getLifetimeFever,
  getLifetimePopped,
  getRunCount,
} from './achievements.js'
import { claimMission, getDailyMissions, getPlayStreak, unclaimedRewards } from './missions.js'
import { createNotificationQueue } from './game/notification-queue.js'
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
import {
  addWallet,
  buyUpgrade,
  describeUpgradeEffect,
  getAllUpgradeLevels,
  getWallet,
  listUpgrades,
  UPGRADES,
} from './upgrades.js'
import {
  buildRunConfiguration,
  createJourney,
  getRouteChoices,
  selectJourneyPilot,
  selectJourneyRoute,
} from './journey.js'
import {
  clearJourney,
  isChapterUnlocked,
  loadJourney,
  saveJourney,
  unlockJourneyChapter,
} from './journey-storage.js'
import { buildPostcardShareModel, loadPostcardAlbum } from './journey-postcards.js'
import { renderJourneyBrief, renderJourneyMap, renderPilotChoices, renderPostcardAlbum, renderPostcardDetail, renderPostcardReveal, renderRouteChoices } from './journey-ui.js'
import { routeStory } from './journey-story.js'
import { loadMastery } from './journey-mastery-storage.js'
import { applyDocumentA11y, loadSettings, saveSettings } from './settings.js'
import { seasonInfo } from './seasonal.js'
import { dailyKey } from './rng.js'
import { todaysTwist } from './twists.js'
import { thisWeeksFold, weeklyKey } from './game/weekly-fold.js'
import { decodeChallenge } from './game/challenge-share.js'
import { estimateRunsToAfford } from './game/economy.js'
import {
  describeEarlyPathBanner,
  nextRecommendedUpgrade,
  treeForUpgrade,
  filterUpgradesByTree,
  UPGRADE_TREES,
} from './game/upgrade-path.js'
import {
  hangarGroupForTab,
  isHangarTabInGroup,
  resolveHangarTabForGroup,
} from './game/hangar-nav.js'
import {
  fetchRemoteTop,
  getDailyTop,
  getLocalTop,
  getWeeklyTop,
  normalizeLeaderboardInteger,
  normalizeLeaderboardName,
} from './leaderboard.js'
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
let planePreviewEpoch = 0
let previewInteractionLockPlaneId = null
let previewFocusedPlaneId = null
let previewPointerMovedAt = -Infinity
let previewPointerReady = false
let planePreviewSelection = 0
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

const flightEngineWarningState = {
  signature: '',
  at: 0,
}

const settingsToastQueue = createNotificationQueue({
  show: (message) => {
    const toast = $('challenge-toast')
    if (!toast || !message) return
    toast.textContent = message
    toast.classList.remove('hidden')
  },
  hide: () => {
    $('challenge-toast')?.classList.add('hidden')
  },
})

function showSettingsToast(message, { durationMs = 2600, dedupeMs = 1500 } = {}) {
  settingsToastQueue.show(message, { duration: durationMs, dedupeMs })
}

function reportFlightEngineWarning(message, error) {
  const now = performance.now ? performance.now() : Date.now()
  const signature = `${error?.name || ''}|${error?.cause?.name || ''}|${error?.message || ''}`
  if (signature === flightEngineWarningState.signature && now - flightEngineWarningState.at < 1500) return
  flightEngineWarningState.signature = signature
  flightEngineWarningState.at = now
  console.warn(message, error)
}

applyDocumentA11y(settings)

if (pilotNameInput) {
  pilotNameInput.value = localStorage.getItem('paper-plane-run-name') || ''
  pilotNameInput.addEventListener('change', () => {
    pilotNameInput.value = normalizeLeaderboardName(pilotNameInput.value)
    safeSetItem('paper-plane-run-name', pilotNameInput.value)
  })
}

if (muteBtn) {
  muteBtn.textContent = shellAudio.muted ? '🔇' : '🔊'
  muteBtn.setAttribute('aria-pressed', String(shellAudio.muted))
  muteBtn.setAttribute('aria-label', shellAudio.muted ? 'Unmute' : 'Mute')
  muteBtn.addEventListener('click', async (event) => {
    event.stopPropagation()
    try { await shellAudio.unlock() } catch {}
    const muted = shellAudio.toggleMute()
    muteBtn.textContent = muted ? '🔇' : '🔊'
    muteBtn.setAttribute('aria-pressed', String(muted))
    muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute')
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
let installHintFocusReturn = null

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferredInstall = event
  installBtn?.setAttribute('data-install-eligible', '1')
  installBtn?.classList.remove('hidden')
})

if (isIos && !isStandalone) {
  installBtn?.setAttribute('data-install-eligible', '1')
  installBtn?.classList.remove('hidden')
}

installBtn?.addEventListener('click', async (event) => {
  event.stopPropagation()
  if (deferredInstall) {
    try {
      deferredInstall.prompt()
      await deferredInstall.userChoice
    } catch {}
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
  installHintFocusReturn = document.activeElement
  $('install-hint-close')?.focus()
})

function closeInstallHint() {
  installHint?.classList.add('hidden')
  installHintFocusReturn?.focus?.()
  installHintFocusReturn = null
}
$('install-hint-close')?.addEventListener('click', closeInstallHint)
installHint?.addEventListener('click', (event) => {
  if (event.target === installHint) closeInstallHint()
})

function swScriptUrl() {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}sw.js`.replace(/\/{2,}/g, '/').replace(':/', '://')
}

let pendingSwWorker = null
const disableServiceWorker = localStorage.getItem('paper-plane-run-disable-sw') === '1'

function showSwUpdateBanner(worker) {
  const banner = $('sw-update-banner')
  const btn = $('sw-update-btn')
  if (!banner || !btn || !worker) return
  pendingSwWorker = worker
  // Never interrupt an active flight — only surface on menu/hangar shells.
  if (!$('hud')?.classList.contains('hidden')) return
  banner.classList.remove('hidden')
  btn.onclick = () => {
    btn.disabled = true
    btn.textContent = 'Updating…'
    worker.postMessage({ type: 'SKIP_WAITING' })
    setTimeout(() => { btn.disabled = false; btn.textContent = 'Retry update' }, 8000)
  }
}

// The offline shell belongs to the deployed build. In dev it would claim the
// page and reload it once while the module graph is still loading.
if (!import.meta.env.DEV && !disableServiceWorker && 'serviceWorker' in navigator) {
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
  window.addEventListener('load', () => {
    const scriptUrl = swScriptUrl()
    navigator.serviceWorker
      .register(scriptUrl)
      .then((registration) => {
        if (registration.waiting) showSwUpdateBanner(registration.waiting)
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              showSwUpdateBanner(registration.waiting || installing)
            }
          })
        })
        // Check for updates when returning to the menu tab
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update().catch(() => {})
        })
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('Service worker registration failed', err)
      })
  })
}

function stopPlanePreview() {
  planePreviewRequest += 1
  activePlanePreview?.dispose?.()
  activePlanePreview = null
}

const PANEL_IDS = ['menu', 'journey-panel', 'gameover', 'hangar-panel', 'hotseat-intermission']

function hideAllPanels() {
  stopPlanePreview()
  for (const id of PANEL_IDS) {
    $(id)?.classList.add('hidden')
  }
}

function showMenu() {
  hideAllPanels()
  menu?.classList.remove('hidden')
  hud?.classList.add('hidden')
  refreshHangarWallet()
  if (pendingSwWorker) showSwUpdateBanner(pendingSwWorker)
}

function getJourneyStampCount() {
  const stamps = new Set(journey?.earnedStampIds || [])
  for (const postcard of loadPostcardAlbum(localStorage)) {
    for (const stamp of postcard.stampIds || []) stamps.add(stamp)
  }
  return stamps.size
}

function startJourneyChapter(chapter = 1) {
  const chapterId = chapter === 2 ? 2 : 1
  if (chapterId === 2 && !isChapterUnlocked(localStorage, 2)) {
    // Completing any Chapter 1 postcard unlocks Ch2; also allow if player has stamps.
    if (getJourneyStampCount() < 4) return false
    unlockJourneyChapter(localStorage, 2)
  }
  journey = createJourney(Date.now(), Date.now(), chapterId)
  saveJourney(localStorage, journey)
  track('journey_chapter_started', { chapter: chapterId, journeyId: journey.id })
  return true
}

function renderJourney() {
  if (!journey) {
    startJourneyChapter(1)
  }
  renderJourneyMap($('journey-map'), journey)
  renderJourneyBrief($('journey-brief'), journey)
  renderPilotChoices($('journey-pilots'), journey, getJourneyStampCount(), (pilotId) => {
    journey = selectJourneyPilot(journey, pilotId, getJourneyStampCount())
    saveJourney(localStorage, journey)
    renderJourney()
  }, mastery)
  const routes = $('journey-route-choices')
  if (journey.status === 'complete') {
    const chapter = journey.chapter || 1
    const ch2Ready = chapter === 1 || isChapterUnlocked(localStorage, 2) || getJourneyStampCount() >= 4
    if (chapter === 1) unlockJourneyChapter(localStorage, 2)
    routes.innerHTML = `
      <div class="journey-empty">
        <span>💌</span>
        <strong>Chapter ${chapter} complete!</strong>
        <p>Your postcard is waiting in the Hangar.</p>
        <div class="btn-row wrap" style="margin-top:10px;justify-content:center">
          <button type="button" class="cta-main cta-inline" data-journey-action="postcards">View postcard album</button>
          ${ch2Ready && chapter === 1
            ? '<button type="button" class="cta-main cta-inline" data-journey-action="chapter-2">Begin Chapter 2</button>'
            : ''}
          <button type="button" class="btn-secondary" data-journey-action="replay">Replay this chapter</button>
        </div>
      </div>`
    $('journey-choice-title').textContent = 'Postcard complete'
    routes.onclick = (event) => {
      const action = event.target.closest?.('[data-journey-action]')?.dataset.journeyAction
      if (action === 'postcards') {
        track('journey_postcard_album_opened', { journeyId: journey.id, source: 'journey_complete' })
        openHangar('postcards')
      } else if (action === 'chapter-2') {
        startJourneyChapter(2)
        renderJourney()
      } else if (action === 'replay') {
        startJourneyChapter(chapter)
        renderJourney()
      }
    }
    return
  }
  $('journey-choice-title').textContent = journey.selectedRouteId
    ? 'Selected route'
    : `Chapter ${journey.chapter || 1} · choose the next route`
  renderRouteChoices(routes, getRouteChoices(journey).map((route) => ({
    ...route,
    selected: route.id === journey.selectedRouteId,
    story: routeStory({
      chapter: journey.chapter || 1,
      stepId: route.stepId,
      risk: route.risk,
      pilotId: journey.pilotId,
    }),
    objective: buildRunConfiguration({ ...journey, selectedRouteId: route.id })?.objective,
  })), (routeId) => {
    journey = selectJourneyRoute(journey, routeId)
    saveJourney(localStorage, journey)
    journeyRunConfig = buildRunConfiguration(journey)
    track('journey_route_selected', { routeId, step: journey.stepIndex, chapter: journey.chapter || 1 })
    void startMode('journey', { journeyConfig: journeyRunConfig })
  })
  track('journey_route_offered', {
    journeyId: journey.id,
    chapter: journey.chapter || 1,
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

// Escape closes the shell overlays that otherwise only dismiss via pointer,
// matching the click-outside/close-button paths (and their focus restore).
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return
  if (installHint && !installHint.classList.contains('hidden')) {
    event.preventDefault()
    closeInstallHint()
    return
  }
  const detail = $('postcard-detail')
  if (detail && !detail.classList.contains('hidden')) {
    event.preventDefault()
    closePostcardOverlay(detail)
  }
})

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
  shellAudio.missionComplete()
  track('journey_postcard_revealed', { postcardId: card.id })
}

function refreshHangarWallet() {
  const wallet = getWallet()
  const w = $('hangar-wallet')
  const l = $('hangar-lifetime')
  if (w) w.textContent = String(wallet)
  if (l) l.textContent = String(getLifetimeStars())
  const w2 = $('wallet-stars')
  if (w2) w2.textContent = String(wallet)
  const hangarBtn = $('hangar-btn')
  if (hangarBtn) {
    const canBuyUpgrade = listUpgrades().some((upgrade) => upgrade.canAfford)
    const canBuyPlane = listSkins(season.id).some((plane) => plane.state === 'available' && plane.canAfford)
    hangarBtn.classList.toggle('hangar-can-spend', canBuyUpgrade || canBuyPlane)
  }
}

let hangarGroup = 'progress'
let hangarTab = 'upgrades'

function syncHangarGroupUi(group = hangarGroup) {
  hangarGroup = group === 'meta' ? 'meta' : 'progress'
  document.querySelectorAll('.hangar-group-btn').forEach((button) => {
    const active = button.dataset.hangarGroup === hangarGroup
    button.classList.toggle('active', active)
    button.setAttribute('aria-pressed', String(active))
  })
  document.querySelectorAll('.hangar-tab').forEach((button) => {
    const inGroup = isHangarTabInGroup(button.dataset.tab, hangarGroup)
    button.classList.toggle('hangar-tab-filtered-out', !inGroup)
    button.hidden = !inGroup
    if (!inGroup) {
      button.setAttribute('tabindex', '-1')
      button.setAttribute('aria-selected', 'false')
      button.classList.remove('active')
    }
  })
}

function showHangarTab(tab) {
  const nextTab = tab || 'upgrades'
  hangarTab = nextTab
  hangarGroup = hangarGroupForTab(nextTab)
  if (nextTab !== 'skins') stopPlanePreview()
  syncHangarGroupUi(hangarGroup)
  document.querySelectorAll('.hangar-tab').forEach((b) => {
    const selected = b.dataset.tab === nextTab
    b.classList.toggle('active', selected)
    b.setAttribute('aria-selected', String(selected))
    b.setAttribute('tabindex', selected ? '0' : '-1')
  })
  document.querySelectorAll('.hangar-page').forEach((p) => {
    const selected = p.id === `tab-${nextTab}`
    p.classList.toggle('hidden', !selected)
    p.hidden = !selected
  })
  const hangarBody = document.querySelector('.hangar-body')
  if (hangarBody) hangarBody.scrollTop = 0
  if (nextTab === 'upgrades') renderUpgrades()
  if (nextTab === 'skins') renderSkins()
  if (nextTab === 'missions') renderMissions()
  if (nextTab === 'achievements') renderAchievements()
  if (nextTab === 'board') renderBoard('local')
  if (nextTab === 'settings') renderSettings()
  if (nextTab === 'stats') renderStats()
  if (nextTab === 'postcards') renderPostcardAlbum($('postcard-album'), loadPostcardAlbum(localStorage), openPostcardDetail)
  if (nextTab === 'editor') setupEditor()
  refreshHangarWallet()
}

function setHangarGroup(group) {
  const nextTab = resolveHangarTabForGroup(group, hangarTab)
  showHangarTab(nextTab)
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
  return `Lifetime ${plane.requirement.value}★`
}

function planePriceLabel(plane) {
  return plane.price ? `Wallet ${plane.price.value}★` : 'Free claim'
}

async function showPlanePreview(
  stage,
  canvas,
  planeDefinition,
  previewEpoch = planePreviewEpoch,
  selection = planePreviewSelection,
) {
  if (previewEpoch !== planePreviewEpoch) return
  if (selection !== planePreviewSelection) return
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
    if (previewEpoch !== planePreviewEpoch) return
    if (selection !== planePreviewSelection) return
    const preview = engine.createPlanePreview?.({
      canvas,
      skinId: planeDefinition.id,
      reducedMotion: settings.reducedMotion,
    })
    if (!preview) throw new Error('Flight engine did not provide a plane preview')
    if (request !== planePreviewRequest || !canvas.isConnected || selection !== planePreviewSelection) {
      preview.dispose?.()
      return
    }
    activePlanePreview = preview
    stage.dataset.previewStatus = 'ready'
    stage.querySelector('[data-preview-message]').textContent = 'Live flight model'
  } catch (error) {
    if (request !== planePreviewRequest || !canvas.isConnected || selection !== planePreviewSelection) return
    stage.dataset.previewStatus = 'unavailable'
    stage.querySelector('[data-preview-message]').textContent = 'Portrait shown · live preview unavailable'
    console.warn('Plane preview unavailable', error)
  }
}

function skinSortRank(plane) {
  if (plane.equipped) return 0
  if (plane.state === 'available' && plane.canAfford) return 1
  if (plane.state === 'owned') return 2
  if (plane.state === 'available') return 3
  return 4
}

function renderSkins(statusMessage = '', forcedPlaneId = null) {
  refreshUnlocks(season.id)
  refreshHangarWallet()
  const grid = $('skins-grid')
  if (!grid) return
  const status = $('skins-status')
  stopPlanePreview()
  grid.innerHTML = ''

  const planes = [...listSkins(season.id)].sort((a, b) => {
    const rank = skinSortRank(a) - skinSortRank(b)
    if (rank !== 0) return rank
    const costA = a.price?.value ?? 0
    const costB = b.price?.value ?? 0
    return costA - costB
  })
  const buyable = planes.filter((plane) => plane.state === 'available' && plane.canAfford).length
  if (status) {
    if (statusMessage) status.textContent = statusMessage
    else if (buyable > 0) {
      status.textContent = buyable === 1
        ? '1 plane is ready to buy — highlighted below.'
        : `${buyable} planes are ready to buy — highlighted below.`
    } else status.textContent = ''
  }
  if (forcedPlaneId) {
    previewInteractionLockPlaneId = forcedPlaneId
    previewFocusedPlaneId = null
  }
  const equippedPlaneId = forcedPlaneId || getEquippedSkinId()
  const previewPlane = planes.find((planeDefinition) => planeDefinition.id === equippedPlaneId) || planes[0]
  const previewEpoch = ++planePreviewEpoch
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
  preview.dataset.planeId = previewPlane.id
  preview.dataset.silhouette = previewPlane.silhouette
  const previewName = preview.querySelector('[data-preview-name]')
  const previewFamily = preview.querySelector('[data-preview-family]')
  const previewMessage = preview.querySelector('[data-preview-message]')
  if (previewName) previewName.textContent = previewPlane.name
  if (previewFamily) previewFamily.textContent = previewPlane.silhouette === 'stunt'
    ? 'Stunt Fold'
    : `${previewPlane.silhouette[0].toUpperCase()}${previewPlane.silhouette.slice(1)}${previewPlane.silhouette === 'classic' ? ' Fold' : ''}`
  if (previewMessage) previewMessage.textContent = 'Updating preview…'
  const previewGeneration = planePreviewRequest
  const previewSelection = ++planePreviewSelection
  preview.dataset.previewEpoch = String(previewEpoch)
  requestAnimationFrame(() => {
    if (previewEpoch !== planePreviewEpoch) return
    if (previewGeneration !== planePreviewRequest || !previewCanvas.isConnected) return
    void showPlanePreview(preview, previewCanvas, previewPlane, previewEpoch, previewSelection)
  })

  previewPointerReady = false
  grid.onpointermove = () => {
    previewPointerReady = true
    previewPointerMovedAt = performance.now?.() ?? Date.now()
  }

  for (const s of planes) {
    const card = document.createElement('button')
    card.type = 'button'
    card.dataset.planeId = s.id
    card.className = `skin-card state-${s.state}${s.equipped ? ' equipped' : ''}${s.state === 'locked' ? ' locked' : ''}`
    if (s.state === 'available' && s.canAfford) card.classList.add('affordable')
    else if (s.state === 'available' && !s.canAfford) card.classList.add('locked-funds')
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

    if (s.state === 'available' && s.price && !s.canAfford) {
      const estimate = estimateRunsToAfford({ wallet: getWallet(), cost: s.price.value })
      const progress = document.createElement('div')
      progress.className = 'plane-progress'
      progress.textContent = `${estimate.missingStars}★ to go · ~${estimate.runs} run${estimate.runs === 1 ? '' : 's'}`
      card.appendChild(progress)
    }

    const action = document.createElement('div')
    action.className = 'meta'
    action.textContent = s.equipped
      ? 'Ready to fly'
      : s.state === 'owned'
        ? 'Equip'
        : s.state === 'available'
          ? s.price
            ? s.canAfford
              ? `Purchase ${s.price.value}★`
              : `Need ${s.price.value}★`
            : 'Claim free'
          : 'Locked'
    card.appendChild(action)

    const previewThisPlane = (event) => {
      const now = performance.now?.() ?? Date.now()
      if (event?.type === 'focus') {
        previewInteractionLockPlaneId = s.id
        previewFocusedPlaneId = s.id
      } else if (event?.type === 'pointerenter') {
        const pointerMoved = previewPointerReady && now - previewPointerMovedAt < 500
        const blockedByFocusedIntent = (previewFocusedPlaneId || previewInteractionLockPlaneId)
          && s.id !== (previewFocusedPlaneId || previewInteractionLockPlaneId)
        if (blockedByFocusedIntent && !pointerMoved) return
        if (pointerMoved) {
          previewFocusedPlaneId = null
          previewInteractionLockPlaneId = null
        }
      }
      const selection = ++planePreviewSelection
      void showPlanePreview(preview, previewCanvas, s, previewEpoch, selection)
    }
    card.addEventListener('focus', previewThisPlane)
    card.addEventListener('pointerenter', previewThisPlane)
    card.addEventListener('blur', () => {
      if (previewFocusedPlaneId === s.id) previewFocusedPlaneId = null
    })
    card.onclick = () => {
      refreshUnlocks(season.id)
      if (previewInteractionLockPlaneId && previewInteractionLockPlaneId !== s.id) {
        previewInteractionLockPlaneId = null
      }
      if (s.state === 'owned') {
        previewInteractionLockPlaneId = s.id
        equipSkin(s.id)
        shellAudio.uiClick()
        renderSkins(`${s.name} equipped.`, s.id)
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
        previewInteractionLockPlaneId = s.id
        shellAudio.uiClick()
        renderSkins(`${s.name} ${s.price ? 'purchased' : 'claimed'} and equipped.`, s.id)
      }
    }
    grid.appendChild(card)
  }
}

let hangarFocusUpgradeId = null
let hangarUpgradeTree = null
let hangarUpgradeSearch = ''

function renderUpgrades() {
  refreshHangarWallet()
  const grid = $('upgrades-grid')
  if (!grid) return
  grid.innerHTML = ''
  const wallet = getWallet()
  const recommendation = nextRecommendedUpgrade(getAllUpgradeLevels(), UPGRADES)
  const pathBanner = describeEarlyPathBanner(recommendation, UPGRADES)
  const pathEl = document.createElement('div')
  pathEl.className = pathBanner.visible ? 'upgrade-path-banner' : 'upgrade-path-banner path-complete'
  pathEl.innerHTML = `<strong>${pathBanner.title}</strong><span>${pathBanner.body}</span>`
  if (pathBanner.visible && pathBanner.upgradeId) {
    const rec = listUpgrades().find((item) => item.id === pathBanner.upgradeId)
    if (rec && !rec.maxed) {
      const recBtn = document.createElement('button')
      recBtn.type = 'button'
      recBtn.className = 'u-buy path-buy'
      recBtn.textContent = rec.canAfford ? `Buy ${rec.name} · ${rec.cost}★` : `${rec.cost}★ needed`
      recBtn.disabled = !rec.canAfford
      recBtn.onclick = () => {
        const res = buyUpgrade(rec.id)
        if (res.ok) {
          shellAudio.uiClick()
          if (settings.haptics) Haptic.collect()
          hangarFocusUpgradeId = rec.id
          renderUpgrades()
        }
      }
      pathEl.appendChild(recBtn)
    }
  }
  grid.appendChild(pathEl)
  const treeNav = document.createElement('div')
  treeNav.className = 'upgrade-tree-row'
  treeNav.setAttribute('role', 'tablist')
  treeNav.setAttribute('aria-label', 'Upgrade groups')
  const allChip = document.createElement('button')
  allChip.type = 'button'
  allChip.className = `upgrade-tree-chip${hangarUpgradeTree ? '' : ' active'}`
  allChip.textContent = 'All'
  allChip.onclick = () => { hangarUpgradeTree = null; renderUpgrades() }
  treeNav.appendChild(allChip)
  for (const tree of UPGRADE_TREES) {
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.className = `upgrade-tree-chip${hangarUpgradeTree === tree.id ? ' active' : ''}`
    chip.textContent = tree.label
    chip.onclick = () => { hangarUpgradeTree = tree.id; renderUpgrades() }
    treeNav.appendChild(chip)
  }
  const searchRow = document.createElement('div')
  searchRow.style.cssText = 'display:flex;gap:8px;margin:6px 0 4px'
  const searchInput = document.createElement('input')
  searchInput.type = 'search'
  searchInput.placeholder = 'Search upgrades…'
  searchInput.value = hangarUpgradeSearch || ''
  searchInput.setAttribute('aria-label', 'Search upgrades')
  searchInput.style.cssText = 'flex:1;padding:8px 12px;border-radius:999px;border:1.5px solid rgba(61,44,41,.12);font:700 13px inherit;background:#fff;outline:none'
  searchInput.oninput = () => { hangarUpgradeSearch = searchInput.value; renderUpgrades() }
  searchRow.appendChild(searchInput)
  if (hangarUpgradeSearch) {
    const clearBtn = document.createElement('button')
    clearBtn.type = 'button'
    clearBtn.textContent = '✕'
    clearBtn.setAttribute('aria-label', 'Clear search')
    clearBtn.style.cssText = 'padding:8px 12px;border-radius:999px;border:1.5px solid rgba(61,44,41,.1);background:#fff;font:800 13px inherit;cursor:pointer'
    clearBtn.onclick = () => { hangarUpgradeSearch = ''; renderUpgrades() }
    searchRow.appendChild(clearBtn)
  }
  grid.appendChild(searchRow)
  const synergyBanner = (() => {
    const gold = getAllUpgradeLevels()
    const goldReady = gold.wingspan >= 3 && gold.trail >= 3
    const feverReady = gold.fever >= 3 && gold.streak >= 3
    const text = goldReady && feverReady ? '✨ Double synergy active: Gold trail + Fever/Streak bonus' : goldReady ? '✨ Gold synergy active (Wide Wings + Paper Trail maxed)' : feverReady ? '🔥 Fever synergy active (Fever Focus + Steady Hands maxed)' : null
    if (!text) return null
    const el = document.createElement('div')
    el.className = 'upgrade-path-banner'
    el.style.background = 'linear-gradient(135deg, rgba(255,243,199,.96), rgba(255,250,242,.96))'
    el.style.borderColor = 'rgba(245,158,11,.42)'
    el.innerHTML = `<strong>${text}</strong><span>Keep both trees maxed for the bonus to stay.</span>`
    return el
  })()
  if (synergyBanner) grid.appendChild(synergyBanner)
  const upgrades = filterUpgradesByTree([...listUpgrades()], hangarUpgradeTree).filter((u) => {
    if (!hangarUpgradeSearch) return true
    const q = hangarUpgradeSearch.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.blurb.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)
  }).sort((a, b) => {
    const recA = pathBanner.upgradeId === a.id ? 0 : 1
    const recB = pathBanner.upgradeId === b.id ? 0 : 1
    if (recA !== recB) return recA - recB
    if (a.canAfford !== b.canAfford) return a.canAfford ? -1 : 1
    if (a.maxed !== b.maxed) return a.maxed ? 1 : -1
    const costA = a.cost ?? Number.POSITIVE_INFINITY
    const costB = b.cost ?? Number.POSITIVE_INFINITY
    if (costA !== costB) return costA - costB
    return 0
  })
  const affordableCount = upgrades.filter((u) => u.canAfford).length
  const intro = $('upgrades-intro')
  if (intro) {
    const allFresh = upgrades.every((u) => u.level === 0)
    if (affordableCount > 0) {
      intro.textContent = affordableCount === 1
        ? 'You can buy 1 upgrade right now — affordable cards are highlighted.'
        : `You can buy ${affordableCount} upgrades right now — affordable cards are highlighted.`
    } else if (wallet >= 10 && allFresh) {
      intro.textContent = 'Tip: Fold Handling or Lift Crease first — sharper control makes longer runs.'
    } else if (upgrades.every((u) => u.maxed)) {
      intro.textContent = 'Every fold maxed. The rest of the ladder is cosmetic now.'
    } else {
      intro.textContent = 'Spend flight stars. Each rank sharpens the plane.'
    }
  }
  const wingspan = upgrades.find((u) => u.id === 'wingspan')
  const trail = upgrades.find((u) => u.id === 'trail')
  const synergyGold = !!(wingspan?.maxed && trail?.maxed)
  for (const u of upgrades) {
    const effect = describeUpgradeEffect(u.id, u.level)
    const card = document.createElement('div')
    card.className = 'upgrade-card'
    card.dataset.upgradeId = u.id
    if (u.maxed) card.classList.add('maxed')
    else if (u.canAfford) card.classList.add('affordable')
    else card.classList.add('locked-funds')
    if (hangarFocusUpgradeId && hangarFocusUpgradeId === u.id) card.classList.add('upgrade-focus')
    if (pathBanner.visible && pathBanner.upgradeId === u.id) card.classList.add('upgrade-recommended')
    const tree = treeForUpgrade(u.id)
    if (tree) card.dataset.tree = tree.id
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
          hangarFocusUpgradeId = null
          renderUpgrades()
        }
      }
    }
    const blurb = synergyGold && (u.id === 'trail' || u.id === 'wingspan')
      ? `${u.blurb} · Gold synergy trail active`
      : u.blurb
    card.innerHTML = `
      <div>
        <div class="u-title">${u.icon} ${u.name}</div>
        <div class="u-blurb">${blurb}</div>
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
    barEl.setAttribute('aria-label', `${u.level} of ${u.max}`)
    for (let rank = 0; rank < u.max; rank += 1) {
      const pip = document.createElement('i')
      if (rank < u.level) pip.className = 'on'
      barEl.appendChild(pip)
    }
    const rankLabel = document.createElement('span')
    rankLabel.textContent = `${u.level}/${u.max}`
    barEl.appendChild(rankLabel)
    card.appendChild(barEl)
    grid.appendChild(card)
  }
  if (hangarFocusUpgradeId) {
    const focused = grid.querySelector(`[data-upgrade-id="${hangarFocusUpgradeId}"]`)
    focused?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
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
  bind('set-season', 'forceSeason')
  // Music lives in GameAudio's own pref (audio.js), not settings.js — mirror
  // how boot reads it and persist through the same toggle as the mute button.
  const musicToggle = $('set-music')
  if (musicToggle) {
    musicToggle.checked = shellAudio.musicOn
    musicToggle.onchange = () => {
      musicToggle.checked = shellAudio.toggleMusic()
    }
  }
  const activeSeason = seasonInfo(settings.forceSeason)
  if ($('season-now')) $('season-now').textContent = `${activeSeason.name} (${activeSeason.id})`
}

function renderStats() {
  const box = $('stats-body')
  if (!box) return

  const lifetimeDist = getLifetimeDistance()
  const lifetimeStars = getLifetimeStars()
  const totalRuns = getRunCount()
  const totalPopped = getLifetimePopped()
  const totalFever = getLifetimeFever()
  const streak = getPlayStreak()
  const postcards = loadPostcardAlbum(localStorage).length
  const skins = listSkins()
  const ownedSkins = skins.filter((s) => s.owned).length
  const localTop = getLocalTop(1)
  const bestRecord = localTop.length ? `${localTop[0].score}m` : '0m'

  const formattedDist = lifetimeDist >= 1000
    ? `${(lifetimeDist / 1000).toFixed(1)} km`
    : `${lifetimeDist} m`

  const f = getFunnelSummary()
  const reasons = Object.entries(f.reasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, v]) => `<li>${k}: <strong>${v}</strong></li>`)
    .join('')
  const counts = Object.entries(f.counts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<li>${k}: <strong>${v}</strong></li>`)
    .join('')

  const wallet = getWallet()
  const nextMilestones = []
  const affordableUpgrades = listUpgrades().filter((u) => !u.maxed).sort((a, b) => (a.cost ?? Infinity) - (b.cost ?? Infinity)).slice(0, 2)
  for (const u of affordableUpgrades) {
    const est = estimateRunsToAfford({ wallet, cost: u.cost })
    nextMilestones.push({ icon: u.icon, label: u.name, detail: `${u.cost}★ · ~${est.runs} run${est.runs === 1 ? '' : 's'}`, progress: Math.min(100, (wallet / u.cost) * 100) })
  }
  const nextPlane = listSkins().filter((s) => s.state === 'available' && s.price).sort((a, b) => (a.price.value ?? Infinity) - (b.price.value ?? Infinity))[0]
  if (nextPlane) {
    const est = estimateRunsToAfford({ wallet, cost: nextPlane.price.value })
    nextMilestones.push({ icon: '🎨', label: nextPlane.name, detail: `${nextPlane.price.value}★ · ~${est.runs} run${est.runs === 1 ? '' : 's'}`, progress: Math.min(100, (wallet / nextPlane.price.value) * 100) })
  }
  while (nextMilestones.length < 3) {
    nextMilestones.push({ icon: '✅', label: 'All in reach', detail: 'Keep flying for endgame cosmetics', progress: 100 })
    if (nextMilestones.length >= 3) break
  }
  const milestonesHtml = nextMilestones.slice(0, 3).map((m) => `
    <div class="milestone-card">
      <span class="milestone-icon">${m.icon}</span>
      <div class="milestone-copy">
        <strong>${m.label}</strong>
        <span>${m.detail}</span>
        <div class="mission-bar" style="margin-top:4px;height:5px"><div class="mission-fill" style="width:${m.progress}%"></div></div>
      </div>
    </div>`).join('')

  box.innerHTML = `
    <p class="page-intro">Pilot Dossier · Lifetime flight records &amp; accomplishments.</p>
    <h3 style="text-align:left;font-size:13px;margin:10px 0 6px;color:var(--ink)">Next on the runway</h3>
    <div class="milestones-row">${milestonesHtml}</div>
    <p class="tagline" style="text-align:left;margin:2px 0 10px">Wallet ${wallet}★ · ~${estimateRunsToAfford({ wallet, cost: 10 }).runs || 1} run to your cheapest fold · Lifetime ${lifetimeStars}★ gates your hangar</p>
    <div class="pilot-logbook-grid">
      <div class="logbook-card">
        <span class="logbook-icon">🌍</span>
        <strong class="logbook-num">${formattedDist}</strong>
        <span class="logbook-label">Lifetime Airtime</span>
      </div>
      <div class="logbook-card">
        <span class="logbook-icon">⭐</span>
        <strong class="logbook-num">${lifetimeStars.toLocaleString()}★</strong>
        <span class="logbook-label">Lifetime Stars</span>
      </div>
      <div class="logbook-card">
        <span class="logbook-icon">🏆</span>
        <strong class="logbook-num">${bestRecord}</strong>
        <span class="logbook-label">Best Record</span>
      </div>
      <div class="logbook-card">
        <span class="logbook-icon">🛫</span>
        <strong class="logbook-num">${totalRuns.toLocaleString()}</strong>
        <span class="logbook-label">Total Flights</span>
      </div>
      <div class="logbook-card">
        <span class="logbook-icon">🔥</span>
        <strong class="logbook-num">${totalFever.toLocaleString()}</strong>
        <span class="logbook-label">Fever Bursts</span>
      </div>
      <div class="logbook-card">
        <span class="logbook-icon">🎯</span>
        <strong class="logbook-num">${totalPopped.toLocaleString()}</strong>
        <span class="logbook-label">Targets Popped</span>
      </div>
      <div class="logbook-card">
        <span class="logbook-icon">🎨</span>
        <strong class="logbook-num">${ownedSkins}/${skins.length}</strong>
        <span class="logbook-label">Planes Owned</span>
      </div>
      <div class="logbook-card">
        <span class="logbook-icon">💌</span>
        <strong class="logbook-num">${postcards}</strong>
        <span class="logbook-label">Postcards</span>
      </div>
      <div class="logbook-card">
        <span class="logbook-icon">📅</span>
        <strong class="logbook-num">${streak} ${streak === 1 ? 'day' : 'days'}</strong>
        <span class="logbook-label">Daily Streak</span>
      </div>
    </div>
    <details class="stats-diagnostics">
      <summary>Technical Diagnostics</summary>
      <div class="stats-diagnostics-body">
        <p class="tagline">Session ${f.session.slice(0, 10)}…</p>
        <h4 style="margin: 8px 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-soft);">Event Funnel</h4>
        <ul class="list-card">${counts || '<li>No events yet</li>'}</ul>
        <h4 style="margin: 8px 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-soft);">Hazard Incidents</h4>
        <ul class="list-card">${reasons || '<li>—</li>'}</ul>
      </div>
    </details>
  `
}

// Generation token: a slow remote fetch (Global/Weekly) must never overwrite
// a leaderboard rendered after it started, so every render captures a token
// and bails before touching the DOM if a newer render has run since.
let boardRenderToken = 0

async function renderBoard(tab = 'local') {
  const list = $('board-list')
  const token = ++boardRenderToken
  list.innerHTML = ''
  document.querySelectorAll('[data-board]').forEach((t) =>
    t.classList.toggle('active', t.dataset.board === tab),
  )
  let rows = []
  if (tab === 'local') rows = getLocalTop(12)
  else if (tab === 'daily') rows = getDailyTop(dailyKey(), difficulty.id, 12)
  else if (tab === 'weekly') {
    rows = getWeeklyTop(weeklyKey(), difficulty.id, 12)
    if (!rows.length) {
      const remote = await fetchRemoteTop(difficulty.id, { weekly: true })
      rows = remote?.scores || []
    }
  }
  else {
    const remote = await fetchRemoteTop(difficulty.id, false)
    rows = remote?.scores || []
  }
  if (token !== boardRenderToken) return
  if (!rows.length) {
    if (tab === 'weekly') {
      const fold = thisWeeksFold()
      list.innerHTML = `<li>No scores for ${weeklyKey()} · ${fold.name} yet — go fly!</li>`
    } else if (tab === 'remote') {
      list.innerHTML = '<li>No global scores yet — be the first!</li>'
    } else {
      list.innerHTML = '<li>No scores yet — go fly!</li>'
    }
    return
  }
  const myName = normalizeLeaderboardName(pilotNameInput?.value)
  rows.forEach((r, i) => {
    const li = document.createElement('li')
    const rank = i + 1
    const safeName = normalizeLeaderboardName(r.name)
    const isMe = safeName === myName
    li.className = `board-row${rank <= 3 ? ` rank-${rank}` : ''}${isMe ? ' board-me' : ''}`
    const rankElement = document.createElement('span')
    rankElement.className = 'board-rank'
    rankElement.textContent = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : String(rank)

    const nameElement = document.createElement('span')
    nameElement.className = 'board-name'
    nameElement.append(document.createTextNode(`${safeName}${isMe ? ' (you)' : ''}`))
    const modeElement = document.createElement('small')
    modeElement.textContent = String(r.mode || '')
    nameElement.append(modeElement)

    const scoreElement = document.createElement('span')
    scoreElement.className = 'board-score'
    const stars = normalizeLeaderboardInteger(r.stars)
    const distance = normalizeLeaderboardInteger(r.distance)
    scoreElement.append(document.createTextNode(`${distance}m`))
    const starsElement = document.createElement('small')
    starsElement.textContent = `${stars}★`
    scoreElement.append(starsElement)

    li.append(rankElement, nameElement, scoreElement)
    list.appendChild(li)
  })
}

// Editor
let editorLayout = emptyLayout()
let editorTool = 'building'
const editorCanvas = $('editor-canvas')
const ectx = editorCanvas?.getContext?.('2d')

function drawEditorStar(ctx, cx, cy, r, color) {
  ctx.save()
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 - Math.PI / 2
    const x = cx + Math.cos(a) * r
    const y = cy + Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
    const a2 = a + Math.PI / 5
    ctx.lineTo(cx + Math.cos(a2) * (r * 0.45), cy + Math.sin(a2) * (r * 0.45))
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawEditor() {
  if (!editorCanvas || !ectx) return
  const w = editorCanvas.width
  const h = editorCanvas.height
  ectx.fillStyle = '#f8fafc'
  ectx.fillRect(0, 0, w, h)

  // Minor grid lines
  ectx.strokeStyle = 'rgba(203, 213, 225, 0.45)'
  ectx.lineWidth = 1
  for (let x = 0; x < w; x += 18) {
    ectx.beginPath()
    ectx.moveTo(x, 0)
    ectx.lineTo(x, h)
    ectx.stroke()
  }
  for (let y = 0; y < h; y += 20) {
    ectx.beginPath()
    ectx.moveTo(0, y)
    ectx.lineTo(w, y)
    ectx.stroke()
  }

  // Major flight axis
  ectx.strokeStyle = 'rgba(148, 163, 184, 0.55)'
  ectx.lineWidth = 1.5
  ectx.setLineDash([4, 4])
  ectx.beginPath()
  ectx.moveTo(w / 2, 0)
  ectx.lineTo(w / 2, h)
  ectx.stroke()
  ectx.setLineDash([])

  // Distance markers along the edge
  ectx.fillStyle = '#64748b'
  ectx.font = '9px Nunito, sans-serif'
  ectx.textAlign = 'left'
  for (let d = 0; d <= 200; d += 50) {
    const y = (d / 200) * (h - 20) + 12
    ectx.fillText(`${d}m`, 4, y)
  }

  ectx.fillStyle = '#475569'
  ectx.textAlign = 'center'
  ectx.font = 'bold 10px Nunito, sans-serif'
  ectx.fillText('▲ START (0m)', w / 2, 12)
  ectx.fillText('FINISH (200m) ▼', w / 2, h - 3)

  const colors = { building: '#ea580c', bird: '#0284c7', scissors: '#dc2626', star: '#f59e0b', power: '#8b5cf6' }
  for (const it of editorLayout.items) {
    const px = ((it.x + 14) / 28) * w
    const py = (it.z / 200) * (h - 20) + 10

    ectx.save()
    ectx.shadowColor = 'rgba(0,0,0,0.18)'
    ectx.shadowBlur = 4
    ectx.shadowOffsetY = 2

    const col = colors[it.t] || '#333'
    if (it.t === 'star') {
      drawEditorStar(ectx, px, py, 7, col)
    } else if (it.t === 'power') {
      ectx.fillStyle = col
      ectx.beginPath()
      ectx.moveTo(px, py - 6)
      ectx.lineTo(px + 6, py)
      ectx.lineTo(px, py + 6)
      ectx.lineTo(px - 6, py)
      ectx.closePath()
      ectx.fill()
    } else if (it.t === 'building') {
      ectx.fillStyle = col
      ectx.fillRect(px - 6, py - 6, 12, 12)
      ectx.fillStyle = 'rgba(255,255,255,0.7)'
      ectx.fillRect(px - 3, py - 3, 6, 6)
    } else if (it.t === 'scissors') {
      ectx.fillStyle = col
      ectx.beginPath()
      ectx.arc(px - 3, py + 3, 3, 0, Math.PI * 2)
      ectx.arc(px + 3, py + 3, 3, 0, Math.PI * 2)
      ectx.fill()
      ectx.strokeStyle = col
      ectx.lineWidth = 2
      ectx.beginPath()
      ectx.moveTo(px - 3, py + 3)
      ectx.lineTo(px + 4, py - 5)
      ectx.moveTo(px + 3, py + 3)
      ectx.lineTo(px - 4, py - 5)
      ectx.stroke()
    } else {
      ectx.fillStyle = col
      ectx.beginPath()
      ectx.arc(px, py, 5.5, 0, Math.PI * 2)
      ectx.fill()
    }
    ectx.restore()
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


function openHangar(tab = 'upgrades', options = {}) {
  hangarFocusUpgradeId = options?.focusUpgradeId || null
  hideAllPanels()
  $('hangar-panel')?.classList.remove('hidden')
  showHangarTab(tab || 'upgrades')
}

let pendingStart = null
let engineFailed = false

function applyEngineSettingsResult(result) {
  if (!result?.settings) return
  settings = result.settings
  season = seasonInfo(settings.forceSeason)
  applyDocumentA11y(settings)
  syncShellControlUi()
  if ($('season-now')) $('season-now').textContent = `${season.name} (${season.id})`
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
  openHangar,
  showPostcardReveal,
  refreshProgression,
  settingsApplied: applyEngineSettingsResult,
})

function showEngineStatus(message, { retry = false } = {}) {
  if (engineStatusMessage) {
    engineStatusMessage.textContent = message
    engineStatusMessage.setAttribute('aria-live', 'assertive')
  }
  engineRetry?.classList.toggle('hidden', !retry)
  engineStatus?.classList.remove('hidden')
  engineStatus?.setAttribute('aria-live', 'assertive')
}

function hideEngineStatus() {
  engineStatus?.classList.add('hidden')
  engineRetry?.classList.add('hidden')
}

function restoreActionableMenu() {
  showMenu()
}

async function startMode(kind, options = {}) {
  // Snapshot which panel the user is on when the start is requested — if the
  // engine fails we should only yank them back to the menu if they never
  // navigated elsewhere during the await (e.g. opened the Hangar).
  const panelAtStart = PANEL_IDS.find((id) => !$(id)?.classList.contains('hidden'))
  pendingStart = { kind, options }
  settings = loadSettings()
  void shellAudio.unlock().catch(()=>{})
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
    reportFlightEngineWarning('Flight engine unavailable', error)
    if (!panelAtStart || panelAtStart === 'menu') restoreActionableMenu()
    showEngineStatus('Couldn’t prepare your plane. Check your connection and retry.', { retry: true })
    return undefined
  }
}

const modeByButtonId = {
  'start-btn': 'classic',
  'daily-btn': 'daily',
  'weekly-btn': 'weekly',
  'tutorial-btn': 'tutorial',
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
  // Hangar section tabs also carry data-hangar-group for filtering — match the
  // tab role first so Progress/Meta filter buttons do not swallow tab clicks.
  if (button?.matches('.hangar-tab')) {
    event.preventDefault()
    event.stopImmediatePropagation()
    showHangarTab(button.dataset.tab)
    return
  }
  if (button?.matches('[data-board]')) {
    event.preventDefault()
    event.stopImmediatePropagation()
    void renderBoard(button.dataset.board)
    return
  }
  if (button?.matches('[data-hangar-group]')) {
    event.preventDefault()
    event.stopImmediatePropagation()
    setHangarGroup(button.dataset.hangarGroup)
  }
}, true)

document.querySelector('.hangar-tabs')?.addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  const tabs = [...document.querySelectorAll('.hangar-tab')].filter((tab) => !tab.hidden)
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
      try { sessionStorage.setItem('paper-plane-engine-retry', JSON.stringify(pendingStart)) } catch {}
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
    reportFlightEngineWarning('Flight engine preload failed', error)
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
  const fold = thisWeeksFold()
  if ($('daily-hint')) {
    $('daily-hint').textContent = `📅 Daily ${dailyKey()} · seed race on ${copy.label} · ${twist.icon} ${twist.name}: ${twist.desc}`
  }
  if ($('weekly-hint')) {
    $('weekly-hint').textContent = `📆 Weekly ${weeklyKey()} · ${fold.icon} ${fold.name}: ${fold.desc}`
  }
  const weeklyBtn = $('weekly-btn')
  if (weeklyBtn) weeklyBtn.title = `${fold.name} — ${fold.desc}`
}

document.querySelectorAll('.diff-btn[data-diff]').forEach((button) => {
  button.addEventListener('click', () => {
    setShellDifficulty(button.dataset.diff)
    void shellAudio.unlock().catch(()=>{}).then(() => shellAudio.uiClick())
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
    void shellAudio.unlock().catch(()=>{}).then(() => shellAudio.uiClick())
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

// PWA shortcuts / shared links: /?mode=classic|daily|journey|...
function consumeLaunchMode() {
  try {
    const params = new URLSearchParams(location.search)
    const challenge = decodeChallenge(params.get('c') || params.get('challenge') || '')
    if (challenge) {
      params.delete('c')
      params.delete('challenge')
      const next = `${location.pathname}${params.toString() ? `?${params}` : ''}${location.hash}`
      history.replaceState(null, '', next)
      queueMicrotask(() => startMode(challenge.kind, { challenge }))
      return true
    }
    const mode = (params.get('mode') || '').toLowerCase()
    if (!mode) return false
    params.delete('mode')
    const next = `${location.pathname}${params.toString() ? `?${params}` : ''}${location.hash}`
    history.replaceState(null, '', next)
    if (mode === 'journey') {
      queueMicrotask(() => openJourney())
      return true
    }
    if (modeByButtonId['start-btn'] === mode || ['classic', 'daily', 'weekly', 'tutorial'].includes(mode)) {
      const kind = mode === 'classic' ? 'classic' : mode
      queueMicrotask(() => startMode(kind))
      return true
    }
  } catch {
    /* ignore bad query */
  }
  return false
}

// The menu is already visible in the markup at boot, so `showMenu()` — which
// is what normally syncs the wallet — never runs on a cold load. Without this
// the Hangar pill kept the literal "0" from index.html, so a returning player
// with stars banked and upgrades in reach was told they had nothing to spend
// and never saw the affordability highlight.
refreshProgression()

const retryRequest = sessionStorage.getItem('paper-plane-engine-retry')
if (retryRequest) {
  sessionStorage.removeItem('paper-plane-engine-retry')
  try {
    const request = JSON.parse(retryRequest)
    queueMicrotask(() => startMode(request.kind, request.options))
  } catch {
    queueMicrotask(preloadEngine)
  }
} else if (consumeLaunchMode()) {
  /* mode deep-link handled */
} else if (import.meta.env.DEV && location.hash.startsWith('#test-') && location.hash !== '#test-postcard') {
  queueMicrotask(preloadEngine)
} else if ('requestIdleCallback' in window) {
  window.requestIdleCallback(preloadEngine, { timeout: 1000 })
} else {
  window.setTimeout(preloadEngine, 250)
}

document.documentElement.dataset.shell = 'ready'
