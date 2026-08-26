import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GameAudio } from './audio.js'
import { Haptic } from './haptics.js'
import { dailyKey, dailySeed, hashString, mulberry32 } from './rng.js'
import { todaysTwist } from './twists.js'
import { foldById, thisWeeksFold, weeklyKey, weeklySeed } from './game/weekly-fold.js'
import { decodeChallenge, describeChallenge, encodeChallenge } from './game/challenge-share.js'
import {
  getEquippedSkinId,
  getSkin,
  refreshUnlocks,
  addLifetimeStars,
} from './skins.js'
import {
  updateMissionsFromRun,
  updatePlayStreak,
  getPlayStreak,
  claimWeeklyStreakBonus,
} from './missions.js'
import {
  createGhostRecorder,
  loadGhost,
  saveGhostIfBest,
  ghostPoseAt,
  ghostDistanceAtTime,
} from './ghost.js'
import { ZONES, cyclicZoneAt, cyclicZoneProgress } from './zones.js'
import { resolveTier } from './game/endless-tiers.js'
import {
  clampAmplitudeToLane,
  getTierMotionScale,
  patternForFlyer,
  resolveHazardOffset,
  resolveHazardRoll,
} from './game/hazard-patterns.js'
import { confettiColors } from './game/confetti-palette.js'
import { GOLDEN_STAR_VALUE, STAR_BASE_METERS, resolveStarPickup } from './game/star-value.js'
import { resolvePowerPickup } from './game/power-pickup.js'
import { isInsideGauntletLane, resolveGauntletReward } from './game/gauntlet-reward.js'
import { THREAD_REWARD_METERS, isInsideThreadGap, isThreadGapWidth } from './game/thread-gap.js'
import { chooseStarLane, getStarX } from './game/star-placement.js'
import { normalizeLeaderboardName } from './game/leaderboard-contract.js'
import {
  getUpgradeEffects,
  addWallet,
  getWallet,
  listUpgrades,
  UPGRADES,
} from './upgrades.js'
import {
  submitLocalScore,
  submitRemoteScore,
  submitTimeAttackScore,
} from './leaderboard.js'
import { parseCompact } from './editor.js'
import { loadSettings, saveSettings, applyDocumentA11y, powerColors } from './settings.js'
import { seasonInfo } from './seasonal.js'
import { track } from './analytics.js'
import { DeskAR } from './ar.js'
import {
  addLifetimeDistance,
  addLifetimeFever,
  getRunCount,
  incrementRunCount,
  addLifetimePopped,
} from './achievements.js'
import {
  FIRST_FLIGHT_GRACE_SECONDS,
  isLaunchGraceActive,
  shouldGrantLaunchGrace,
} from './game/firstFlight.js'
import { nextPauseState } from './game/pause.js'
import { FLYER_DEFS } from './game/flyers.js'
import { createBossArtOverlay, getBossBadgeLayout } from './game/boss-art.js'
import {
  bossBannerEmoji,
  bossCrashReason,
  bossKindForIndex,
  createBossEncounter,
  describeBossPhase,
  getBossApproachSpeedScale,
  getBossClearReward,
  isInsideBossPassage,
  resolveBossGapY,
  shouldClearForBossApproach,
} from './game/boss-director.js'
import {
  getAdaptiveQuality,
  installNativePerformanceListener,
  normalizeNativePerformanceSignal,
} from './game/adaptive-quality.js'
import { createNotificationQueue } from './game/notification-queue.js'
import { createFrameHealthMonitor } from './game/frame-health.js'
import {
  SKIM_CEILING,
  advanceGroundSkim,
  createGroundSkimState,
  describeSkimHudValue,
  skimHudTier,
  skimScoreMultiplier,
} from './game/ground-skim.js'
import {
  getGroundLifeSpecies,
  groundLifeCount,
  groundLifeSlotX,
  groundLifeSlotZ,
  groundLifeTransform,
  resolveGroundLifeBudget,
  roadSegmentLength,
  wrapGroundLifeZ,
} from './game/ground-life.js'
import {
  PASSAGE_LANE_X,
  PASSAGE_LANES,
  choosePassageLane,
  createPacingWave,
  getCenterBuildingSafeRange,
  getFlyableBuildingHeight,
  getObstacleDamageRadius,
  isLethalObstacle,
  getSafeSpawnX,
  getSideBuildingSpread,
  getWaveSpacing,
  normalizeControlAxes,
} from './game/pacing.js'
import { safeSetItem } from './game/safe-storage.js'
import {
  buildRunConfiguration,
  createJourney,
  getRouteChoices,
  resolveJourneyFlight,
  selectJourneyRoute,
} from './journey.js'
import { applyJourneyRewardOnce, loadJourney, saveJourney } from './journey-storage.js'
import { savePostcardOnce } from './journey-postcards.js'
import { cosmeticLabel, renderJourneyResultProgress } from './journey-ui.js'
import { createRivalState, getRivalCallout, getRivalDelta, sampleRivalPosition } from './journey-rival.js'
import { buildEncounterTimeline, getEncounterEventsAtDistance, resolveJourneyObjective } from './journey-encounters.js'
import { getPilotEffect } from './journey-modifiers.js'
import { getPilotMasteryView, resolveMasteryOutcome } from './journey-mastery.js'
import { loadMastery, saveMastery } from './journey-mastery-storage.js'
import { routeRiskLabel, stampSpriteZone, zoneStampLabel } from './game/zone-stamps.js'
import { selectLayoutForStart, synchronizeRuntimeSettings } from './engine-runtime.js'
import { PLANE_COLLISION_RADIUS, createPaperPlane, getPaperFlightPose } from './plane-models.js'
import { buildRunSummary } from './game/run-summary.js'
import {
  advanceFeverState,
  createFeverState,
  describeComboHudValue,
  describeFeverHudValue,
  FEVER_SCORE_MUL,
  shouldTriggerFever,
} from './game/combo-fever.js'
import {
  advanceStarStreakState,
  createStarStreakState,
  registerStarPickup,
} from './game/star-streak.js'
import { applyStarLaneTelegraph, planStarSpawns, shouldTelegraphStarLane } from './game/star-spawn.js'
import { pickFlightFocus, shouldTelegraphHazard } from './game/flight-focus.js'
import {
  describeNearMissFloat,
  feverConfettiOffsets,
  feverEnterShake,
  nearMissConfettiBursts,
  nearMissHudTier,
  nearMissShakeAmount,
} from './game/near-miss-feedback.js'
import { consumeGuardianCharge, shouldGuardianSave } from './game/guardian-runtime.js'
import {
  SPAWN_INVULN_SECONDS,
  UNFOLD_SECONDS,
  applySoftBounds,
  groundEffectSpeedMul,
  integrateAimFlight,
  integrateRelativeFlight,
} from './game/paper-flight.js'
import {
  advanceShot,
  inkPopReward,
  resolveWeaponFire,
  shotHitsTarget,
} from './game/weapon-runtime.js'
import {
  getAltitudeRecovery,
  getBoostSafety,
  getCollisionRadius,
  getComboHold,
  getControlResponse,
  getCruiseSpeed,
  getFeverTuning,
  getGuardianState,
  getMagnetPull,
  getNearMissRadius,
  getPowerDuration,
  getSpawnRates,
  getStreakTuning,
  getTrailFeedback,
  getUpgradeRuntimeSnapshot,
  getWeaponState,
  SHIELD_BASE_DURATION,
} from './game/upgrade-runtime.js'
// createPool available for future mesh reuse; low-power path already cuts DPR/shadows

// Passing the complete module namespace through the injected plane-model API
// makes the bundler retain every Three.js export. Keep the public injection
// contract while exposing only the constructors the registry actually uses.
const PLANE_THREE = Object.freeze({
  BoxGeometry: THREE.BoxGeometry,
  BufferAttribute: THREE.BufferAttribute,
  BufferGeometry: THREE.BufferGeometry,
  ConeGeometry: THREE.ConeGeometry,
  DoubleSide: THREE.DoubleSide,
  Group: THREE.Group,
  Mesh: THREE.Mesh,
  MeshStandardMaterial: THREE.MeshStandardMaterial,
  Points: THREE.Points,
  PointsMaterial: THREE.PointsMaterial,
  Shape: THREE.Shape,
  ShapeGeometry: THREE.ShapeGeometry,
  SphereGeometry: THREE.SphereGeometry,
})
const BOSS_ART_THREE = Object.freeze({
  DoubleSide: THREE.DoubleSide,
  Mesh: THREE.Mesh,
  MeshBasicMaterial: THREE.MeshBasicMaterial,
  PlaneGeometry: THREE.PlaneGeometry,
  SRGBColorSpace: THREE.SRGBColorSpace,
})

let engineInstance = null
let engineBootFailure = null

export function bootFlightEngine() {
if (engineInstance) return engineInstance
if (engineBootFailure) throw engineBootFailure

try {

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id)
const canvas = $('c')
const menuEl = $('menu')
const gameoverEl = $('gameover')
const retryBtn = $('retry-btn')
const hudEl = $('hud')
const bannerStackEl = $('banner-stack')
const speedFxEl = $('speed-fx')
const windBanner = $('wind-banner')
const powerBanner = $('power-banner')
const zoneBanner = $('zone-banner')
const boostSafetyCue = $('boost-safety-cue')
const magnetPullTrail = $('magnet-pull-trail')

// Keep the wind/power/zone banner stack pinned just below the HUD's actual
// rendered height — the HUD can wrap to 2-3 rows depending on how many
// chips are active, so a fixed pixel offset would overlap it.
// The notification toast has the same collision for the same reason, so the
// one measurement feeds both: `--hud-bottom` on the root element is the HUD's
// real bottom edge, which the toast's in-flight rule offsets from.
if (hudEl && bannerStackEl && typeof ResizeObserver !== 'undefined') {
  const syncBannerTop = () => {
    const rect = hudEl.getBoundingClientRect()
    const hidden = hudEl.classList.contains('hidden')
    const top = hidden ? rect.top : rect.bottom + 10
    bannerStackEl.style.setProperty('--banner-top', `${Math.round(top)}px`)
    document.documentElement.style.setProperty(
      '--hud-bottom',
      `${Math.round(hidden ? 0 : rect.bottom)}px`,
    )
  }
  new ResizeObserver(syncBannerTop).observe(hudEl)
  window.addEventListener('resize', syncBannerTop)
  syncBannerTop()
}
const comboFloat = $('combo-float')
const feverFx = $('fever-fx')
const feverHud = $('fever-hud')
const feverVal = $('fever-val')
const powerHud = $('power-hud')
const powerLabel = $('power-label')
const powerFill = $('power-fill')
const comboHud = $('combo-hud')
const comboVal = $('combo-val')
const skimHud = $('skim-hud')
const skimVal = $('skim-val')
const streakHud = $('streak-hud')
const streakVal = $('streak-val')
const flightRouteEl = $('flight-route')
const flightRouteCurrentEl = $('flight-route-current')
const flightRouteNextEl = $('flight-route-next')
const flightRouteFillEl = $('flight-route-fill')
const flightRouteStampEl = $('flight-route-stamp')
const flightRouteRiskEl = $('flight-route-risk')
const flightFocusEl = $('flight-focus')
const flightFocusCueEl = $('flight-focus-cue')
const flightFeedbackEl = $('flight-feedback')
let flightFeedbackTimer = 0
const distanceEl = $('distance')
const bestEl = $('best')
const starsEl = $('stars')
const hudModeEl = $('hud-mode')
const hudZoneEl = $('hud-zone')
const nextZoneHud = $('next-zone-hud')
const hudNextZoneEl = $('hud-next-zone')
const ghostDeltaHud = $('ghost-delta-hud')
const ghostDeltaValEl = $('ghost-delta-val')
const guardianHud = $('guardian-hud')
const guardianHudVal = $('guardian-hud-val')
const journeyObjectiveHud = $('journey-objective-hud')
const journeyObjectiveVal = $('journey-objective-val')

// Off-screen edge indicators: arrows pointing at nearby hazards/pickups
// that have scrolled outside the camera frustum.
const EDGE_KIND_BY_TYPE = { bird: 'hazard', scissors: 'hazard', star: 'star', power: 'power' }
const edgeIndicatorEl = $('edge-indicators')
const EDGE_POOL_SIZE = 5
const edgePool = []
if (edgeIndicatorEl) {
  for (let i = 0; i < EDGE_POOL_SIZE; i++) {
    const el = document.createElement('div')
    el.className = 'edge-arrow'
    el.innerHTML =
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L22 20 L12 15.5 L2 20 Z"/></svg>'
    edgeIndicatorEl.appendChild(el)
    edgePool.push(el)
  }
}
// Hazard telegraphing: a one-shot warning ping when a fast/dangerous
// hazard (scissors, boss gate, dive-bombing flyer) is about to close in.
const warnFlashEl = $('warn-flash')
function checkHazardTelegraph() {
  for (const e of entities) {
    if (!shouldTelegraphHazard({
      type: e.type,
      z: e.mesh.position.z,
      dx: e.mesh.position.x - planeX,
      dive: Boolean(e.mesh.userData.dive),
      alreadyWarned: e.warned,
    })) continue
    e.warned = true
    audio.incoming()
    Haptic.tap()
    if (warnFlashEl) {
      warnFlashEl.classList.remove('warn-pulse')
      void warnFlashEl.offsetWidth
      warnFlashEl.classList.add('warn-pulse')
    }
  }
}
const _edgeNdc = new THREE.Vector3()
const _focusNdc = new THREE.Vector3()
function updateEdgeIndicators() {
  if (!edgeIndicatorEl) return
  const w = innerWidth
  const h = innerHeight
  const candidates = []
  for (const e of entities) {
    const kind = EDGE_KIND_BY_TYPE[e.type]
    if (!kind) continue
    const z = e.mesh.position.z
    if (z < 2 || z > 55) continue
    candidates.push({ e, kind, z })
  }
  candidates.sort((a, b) => a.z - b.z)
  let used = 0
  for (const { e, kind } of candidates) {
    if (used >= EDGE_POOL_SIZE) break
    _edgeNdc.copy(e.mesh.position).project(camera)
    if (_edgeNdc.z > 1) continue // behind camera
    const onScreen = Math.abs(_edgeNdc.x) < 0.94 && Math.abs(_edgeNdc.y) < 0.94
    if (onScreen) continue
    const el = edgePool[used++]
    const cx = (_edgeNdc.x * 0.5 + 0.5) * w
    const cy = (1 - (_edgeNdc.y * 0.5 + 0.5)) * h
    const angle = Math.atan2(cy - h / 2, cx - w / 2)
    const margin = 30
    const clampedX = THREE.MathUtils.clamp(cx, margin, w - margin)
    const clampedY = THREE.MathUtils.clamp(cy, margin, h - margin)
    el.style.transform = `translate(${clampedX}px, ${clampedY}px) rotate(${angle + Math.PI / 2}rad)`
    el.className = `edge-arrow visible kind-${kind}`
  }
  for (let i = used; i < EDGE_POOL_SIZE; i++) edgePool[i].classList.remove('visible')
}
function hideEdgeIndicators() {
  for (const el of edgePool) el.classList.remove('visible')
}

function hideFlightReadability() {
  flightRouteEl?.classList.add('hidden')
  flightFocusEl?.classList.add('hidden')
}

function showFlightFeedback(message, tone = 'route', duration = 1.05) {
  if (!flightFeedbackEl) return
  flightFeedbackEl.textContent = message
  flightFeedbackEl.dataset.tone = tone
  flightFeedbackEl.classList.remove('hidden', 'feedback-pop')
  void flightFeedbackEl.offsetWidth
  flightFeedbackEl.classList.add('feedback-pop')
  flightFeedbackTimer = Math.max(flightFeedbackTimer, duration)
}

function pulseFlightImpact(tone = 'route') {
  if (!warnFlashEl) return
  warnFlashEl.classList.remove('impact-pulse', 'impact-hazard', 'impact-star', 'impact-power', 'impact-route')
  warnFlashEl.classList.add(`impact-${tone}`)
  void warnFlashEl.offsetWidth
  warnFlashEl.classList.add('impact-pulse')
}

function updateFlightReadability(routeState = null) {
  const playing = state === 'playing'
  flightRouteEl?.classList.toggle('hidden', !playing || bossActive || distance < 28)
  flightFocusEl?.classList.toggle('hidden', !playing)
  if (!playing) return

  const zone = routeState?.zone || activeZoneAt(distance)
  flightRouteEl?.setAttribute('data-zone', zone.id)
  flightRouteEl?.setAttribute('data-route-risk', journeyRunConfig?.risk || 'open')
  if (flightRouteCurrentEl) flightRouteCurrentEl.textContent = zone.name
  if (flightRouteRiskEl) flightRouteRiskEl.textContent = routeRiskLabel(journeyRunConfig || {})
  if (flightRouteStampEl) {
    const spriteZone = stampSpriteZone(zone.id)
    flightRouteStampEl.dataset.zone = spriteZone
    flightRouteStampEl.dataset.earned = String(Boolean(journeyRunConfig?.stampId && journey?.earnedStampIds?.includes(journeyRunConfig.stampId)))
    flightRouteStampEl.setAttribute('aria-label', zoneStampLabel(zone.name))
  }
  if (flightRouteNextEl) {
    const next = routeState?.next
    const remain = Number.isFinite(routeState?.remain)
      ? routeState.remain
      : next && Number.isFinite(routeState?.nextAt)
        ? routeState.nextAt - distance
        : 0
    flightRouteNextEl.textContent = next
      ? `${next.name} · ${Math.max(0, Math.ceil(remain))}m`
      : runKind === 'journey' ? 'Destination' : 'Open air'
  }
  if (flightRouteFillEl) {
    const routeT = Number.isFinite(routeState?.t) ? routeState.t : 0
    flightRouteFillEl.style.width = `${THREE.MathUtils.clamp(routeT, 0, 1) * 100}%`
  }

  if (!flightFocusEl) return
  // The marker names what's ahead — a star line, a hazard, a power-up — so it
  // rides the *target*, never the plane. An always-on ring around your own
  // plane read as a rendering artifact and buried the plane silhouette under
  // HUD clutter; an empty corridor now simply shows nothing.
  const focus = pickFlightFocus(entities, {
    planeX,
    planeY,
    teachStars: shouldTelegraphStarLane(distance),
  })
  flightFocusEl.dataset.cue = focus.cue
  if (flightFocusCueEl) flightFocusCueEl.textContent = focus.label
  // A swift pop when the named thing changes keeps the marker from looking
  // like a permanent fixture — it should feel like it just found something.
  if (flightFocusEl.dataset.type !== focus.type) {
    flightFocusEl.dataset.type = focus.type || 'none'
    flightFocusEl.classList.remove('focus-pop')
    void flightFocusEl.offsetWidth
    flightFocusEl.classList.add('focus-pop')
  }
  if (!focus.target) {
    flightFocusEl.classList.add('hidden')
    return
  }
  _focusNdc.set(focus.target.x, focus.target.y, focus.target.z).project(camera)
  const focusOnScreen = _focusNdc.z <= 1 && Math.abs(_focusNdc.x) < 1.15 && Math.abs(_focusNdc.y) < 1.15
  if (!focusOnScreen) {
    flightFocusEl.classList.add('hidden')
    return
  }
  flightFocusEl.classList.remove('hidden')
  flightFocusEl.style.left = `${(_focusNdc.x * 0.5 + 0.5) * innerWidth}px`
  flightFocusEl.style.top = `${(1 - (_focusNdc.y * 0.5 + 0.5)) * innerHeight}px`
}
const finalScoreEl = $('final-score')
const finalDetailEl = $('final-detail')
const runSummaryEl = $('run-summary')
const journeyResultProgressEl = $('journey-result-progress')
const postcardRevealEl = $('postcard-reveal')
const postcardDetailEl = $('postcard-detail')
const newBestBadge = $('new-best-badge')
const streakBadge = $('streak-badge')
const fireBtn = $('fire-btn')
const timeAttackHud = $('timeattack-hud')
const timeAttackValEl = $('timeattack-val')

function animateCountUp(el, target, suffix, ms = 700) {
  const start = performance.now()
  const step = (now) => {
    const t = Math.min(1, (now - start) / ms)
    const eased = 1 - Math.pow(1 - t, 3)
    el.textContent = `${Math.round(target * eased)}${suffix}`
    if (t < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}
const challengeToast = $('challenge-toast')
const notifications = createNotificationQueue({
  show(message) {
    if (!challengeToast) return
    challengeToast.textContent = message
    challengeToast.classList.remove('hidden')
  },
  hide() {
    challengeToast?.classList.add('hidden')
  },
})
const challengeResult = $('challenge-result')
const shareStatus = $('share-status')
const muteBtn = $('mute-btn')
const stickZone = $('stick-zone')
const stickBase = $('stick-base')
const stickKnob = $('stick-knob')
const photoWrap = $('photo-wrap')
const photoImg = $('photo-img')
const photoCaption = $('photo-caption')
const hotseatHud = $('hotseat-hud')
const hotseatPlayerEl = $('hotseat-player')
const hotseatInter = $('hotseat-intermission')
const hotseatTitle = $('hotseat-title')
const hotseatScores = $('hotseat-scores')
const diffBlurb = $('diff-blurb')
const dailyHint = $('daily-hint')
const pilotNameInput = $('pilot-name')
let shellBridge = null

let audio = new GameAudio()
if (muteBtn) muteBtn.textContent = audio.muted ? '🔇' : '🔊'

// Settings / season / AR / analytics
let settings = loadSettings()
let nativePerformanceSignal = normalizeNativePerformanceSignal()
let renderQuality = getAdaptiveQuality({
  status: 'warming',
  devicePixelRatio,
  lowPower: settings.lowPower,
  nativeSignal: nativePerformanceSignal,
})
const frameHealth = createFrameHealthMonitor({
  onChange(snapshot) {
    document.documentElement.dataset.frameHealth = snapshot.status
    applyPerformanceSettings(snapshot.status)
  },
})
let activeUpgradeEffects = getUpgradeEffects()
function refreshUpgradeEffects() {
  activeUpgradeEffects = getUpgradeEffects()
  return activeUpgradeEffects
}
applyDocumentA11y(settings)
const deskAR = new DeskAR()
let season = seasonInfo(settings.forceSeason)
track('session_start', { season: season.id, dpr: devicePixelRatio })

// Distance milestones for funnel
const distanceMilestones = new Set()
let nextBossAt = 500
let nextGauntletAt = 250
let bossActive = false
let bossRecoveryUntil = 0
let activePassageLane = null
let planeWingL = null
let planeWingR = null
let tearSide = 0
let autoLevelHold = false

// ---------------------------------------------------------------------------
// Difficulty
// ---------------------------------------------------------------------------
const DIFFS = {
  easy: {
    id: 'easy', label: 'Easy', blurb: 'Slower · roomier · more pickups',
    speedBase: 22, speedRamp: 0.028, speedCap: 36, hazardScale: 0.65,
    buildingH: 0.75, birdCount: 0.7, powerChance: 0.28, starChance: 0.7,
    windForce: 0.7, sink: 1.6, scoreMul: 0.85, gap: 1.15,
  },
  normal: {
    id: 'normal', label: 'Normal', blurb: 'Balanced flight · classic chaos',
    speedBase: 28, speedRamp: 0.038, speedCap: 45, hazardScale: 1,
    buildingH: 1, birdCount: 1, powerChance: 0.18, starChance: 0.58,
    windForce: 1, sink: 2.4, scoreMul: 1, gap: 1,
  },
  hard: {
    id: 'hard', label: 'Hard', blurb: 'Faster · denser · meaner wind',
    speedBase: 34, speedRamp: 0.05, speedCap: 58, hazardScale: 1.35,
    buildingH: 1.25, birdCount: 1.4, powerChance: 0.12, starChance: 0.48,
    windForce: 1.35, sink: 3.1, scoreMul: 1.25, gap: 0.85,
  },
}
const DIFF_KEY = 'paper-plane-run-diff'
const BEST_PREFIX = 'paper-plane-run-best-'

function parseBestScore(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0
}

function loadBest(id) {
  if (id === 'normal') {
    const legacy = localStorage.getItem('paper-plane-run-best')
    if (legacy && !localStorage.getItem(BEST_PREFIX + id)) {
      safeSetItem(BEST_PREFIX + id, legacy)
    }
  }
  return parseBestScore(localStorage.getItem(BEST_PREFIX + id))
}
function saveBest(id, v) {
  safeSetItem(BEST_PREFIX + id, String(v))
}

let difficulty = DIFFS[localStorage.getItem(DIFF_KEY)] || DIFFS.normal
let bestDistance = loadBest(difficulty.id)
let bestTimeAttackStars = loadBest('timeattack-stars')
if (bestEl) bestEl.textContent = `${Math.floor(bestDistance)}m`
if (hudModeEl) hudModeEl.textContent = difficulty.label
if (diffBlurb) diffBlurb.textContent = difficulty.blurb
document.querySelectorAll('.diff-btn').forEach((b) => {
  b.classList.toggle('active', b.dataset.diff === difficulty.id)
})

function setDifficulty(id, { persist = true } = {}) {
  if (!DIFFS[id]) return
  difficulty = DIFFS[id]
  if (persist) safeSetItem(DIFF_KEY, id)
  bestDistance = loadBest(id)
  if (bestEl) bestEl.textContent = `${Math.floor(bestDistance)}m`
  if (hudModeEl) hudModeEl.textContent = difficulty.label
  if (diffBlurb) diffBlurb.textContent = difficulty.blurb
  document.querySelectorAll('.diff-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.diff === id),
  )
  updateDailyHint()
}

function updateDailyHint() {
  const twist = todaysTwist()
  const fold = thisWeeksFold()
  if (dailyHint) {
    dailyHint.textContent = `📅 Daily ${dailyKey()} · seed race on ${difficulty.label} · ${twist.icon} ${twist.name}: ${twist.desc}`
  }
  const weeklyHint = $('weekly-hint')
  if (weeklyHint) {
    weeklyHint.textContent = `📆 Weekly ${weeklyKey()} · ${fold.icon} ${fold.name}: ${fold.desc}`
  }
}
updateDailyHint()

// ---------------------------------------------------------------------------
// Run modes & challenge
// ---------------------------------------------------------------------------
/** @type {'classic'|'daily'|'weekly'|'tutorial'|'hotseat'|'layout'|'journey'|'timeattack'|'coop'} */
let runKind = 'classic'
let journey = loadJourney(localStorage).journey
let journeyRunConfig = null
let mastery = loadMastery(localStorage).mastery
let journeyTimeline = null
let journeyTelemetry = null
let journeyPreviousDistance = 0
let journeyVisibilityTimer = 0
let lastJourneyResult = null
/**
 * A Journey leg is pinned to its authored destination. Every other mode flies
 * the endless route, which cycles the zone table rather than parking on
 * Midnight Origami once past its threshold. `lap` distinguishes a genuine
 * second visit from no change at all, so the banner still fires on the fold.
 */
function activeRouteAt(runDistance = distance) {
  if (runKind === 'journey' && journeyRunConfig?.zone) {
    const pinned = ZONES.find((zone) => zone.id === journeyRunConfig.zone)
    if (pinned) return { zone: pinned, lap: 0 }
  }
  const visualDistance = runDistance + (activeFold?.zoneOffset || 0)
  const { zone, lap } = cyclicZoneAt(visualDistance)
  return { zone, lap }
}

function activeZoneAt(runDistance = distance) {
  return activeRouteAt(runDistance).zone
}
const TIME_ATTACK_SECONDS = 60
let timeAttackLeft = 0
let timeAttackLastTickSecond = -1
let challenge = null
let launchChallenge = null
let lastRun = { d: 0, s: 0, m: 'normal', daily: false, weekly: false, timeAttack: false, seed: null, kind: 'classic', foldId: '' }
let layoutPlay = null
let rng = Math.random
let activeRunSeed = null
let activeFold = null
let ghostRecorder = null
let ghostData = null
let ghostMesh = null
let journeyRivalState = null
let currentZoneId = 'city'
/** Lap of the endless zone cycle the banner last announced. */
let currentZoneLap = 0
/** The shipped baseline curve — what modes without escalation always fly. */
const ZERO_TIER = resolveTier(0)
/** Escalation state for the endless long tail. Recomputed only on tier change. */
let currentTier = ZERO_TIER
let combo = 0
let groundSkim = createGroundSkimState()
let maxCombo = 0
let comboTimer = 0
/** Combo Fever: a short score-multiplier burst triggered by a big near-miss streak */
let feverActive = false
let feverTimer = 0
let feverFloatTimeout = null
/** Consecutive star pickups within a short window — separate from the near-miss combo */
let starStreak = 0
let starStreakTimer = 0
let starStreakWindow = 0
let runStats = { stars: 0, powers: 0, winds: 0, maxCombo: 0, popped: 0, fevers: 0 }
let tutorialDone = localStorage.getItem('paper-plane-run-tutorial') === '1'
let hotseat = { players: 2, turn: 0, scores: [0, 0], active: false }
let lastPhotoDataUrl = null
let nearMissCooldown = new WeakMap()

// URL params
const devTestState = import.meta.env.DEV ? location.hash : ''
const devSeedLabel = import.meta.env.DEV
  ? new URLSearchParams(location.search).get('seed')?.trim().slice(0, 64) || null
  : null
const devSeed = devSeedLabel ? hashString(devSeedLabel) : null
const devUpgradeProof = import.meta.env.DEV
  ? new URLSearchParams(location.search).get('upgrade-proof')
  : null
const devCollisionProof = import.meta.env.DEV
  ? new URLSearchParams(location.search).get('collision')
  : null
const devBossProof = import.meta.env.DEV
  ? new URLSearchParams(location.search).get('boss-proof')
  : null
// Thread-gap proof's untagged control run (?nothread=1#test-thread-gap) — read
// up here because the boot deep-link cleanup wipes location.search later.
const devThreadControl = import.meta.env.DEV
  ? new URLSearchParams(location.search).has('nothread')
  : false
const devBossPass = import.meta.env.DEV
  ? new URLSearchParams(location.search).get('boss-pass') === '1'
  : false
function configureDevUpgradeProof(proof = devUpgradeProof) {
  if (!import.meta.env.DEV) return
  let levels = {}
  if (proof === 'max') {
    levels = Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, upgrade.max]))
  } else if (proof?.endsWith('-max')) {
    const upgradeId = proof.slice(0, -'-max'.length)
    const upgrade = UPGRADES.find(({ id }) => id === upgradeId)
    if (upgrade) levels = { [upgrade.id]: upgrade.max }
  }
  safeSetItem('paper-plane-run-upgrades', JSON.stringify(levels))
}
{
  const params = new URLSearchParams(location.search)
  const packed = decodeChallenge(params.get('c') || params.get('challenge') || '')
  if (packed) {
    launchChallenge = packed
    challenge = { d: packed.distance, s: packed.stars, m: packed.mode }
    if (DIFFS[packed.mode]) setDifficulty(packed.mode, { persist: false })
    notifications.show(describeChallenge(packed), { duration: 6500 })
  } else {
    const d = Number(params.get('d') || params.get('score'))
    const s = Number(params.get('s') || 0)
    const m = (params.get('m') || 'normal').toLowerCase()
    if (Number.isFinite(d) && d > 0 && DIFFS[m]) {
      challenge = { d: Math.floor(d), s: Math.max(0, s | 0), m }
      setDifficulty(m, { persist: false })
      notifications.show(`Challenge: beat ${challenge.d}m · ${challenge.s}★ on ${DIFFS[m].label}`, { duration: 6500 })
    }
  }
  const layoutCode = params.get('layout') || params.get('L')
  if (layoutCode) {
    const L = parseCompact(layoutCode)
    if (L) {
      layoutPlay = L
      notifications.show(`Custom route: ${L.name}`, { duration: 5000 })
    }
  }
  if (params.get('daily') === '1') runKind = 'daily'
  if (params.get('weekly') === '1') runKind = 'weekly'
  history.replaceState({}, '', location.pathname)
}

// "Mouse" mode's copy ("Move cursor…") and 🖱 icon read as confusing on a
// touch-only tablet like an iPad, where there's no cursor and the same
// mode is actually driven by dragging a finger. Relabel it for touch
// devices without touching the underlying 'mouse' setting value.
const isTouchPrimary = window.matchMedia?.('(pointer: coarse)').matches && navigator.maxTouchPoints > 0

// ---------------------------------------------------------------------------
// Three.js setup
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !settings.lowPower,
  preserveDrawingBuffer: true,
  alpha: true,
  powerPreference: settings.lowPower ? 'low-power' : 'high-performance',
})
// Mobile GPUs can drop the WebGL context under memory pressure or after a
// long background stint — without handling this, the canvas just freezes
// on a garbled last frame with no way back in. Pause and tell the player,
// then do a clean reload once the context comes back (re-uploading every
// texture/geometry by hand is fragile; a reload is the reliable recovery).
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault()
  simulationPaused = true
  keys.clear()
  notifications.show('⚠️ Graphics connection lost — reconnecting…', { persistent: true })
}, false)
canvas.addEventListener('webglcontextrestored', () => {
  location.reload()
}, false)

function applyPerformanceSettings(status = frameHealth.snapshot().status) {
  renderQuality = getAdaptiveQuality({
    status,
    devicePixelRatio,
    lowPower: settings.lowPower,
    nativeSignal: nativePerformanceSignal,
  })
  renderer.setPixelRatio(renderQuality.pixelRatio)
  renderer.setSize(innerWidth, innerHeight, false)
  renderer.shadowMap.enabled = renderQuality.shadows
  if (typeof sun !== 'undefined' && sun) sun.castShadow = renderQuality.shadows
  if (typeof dust !== 'undefined' && dust) dust.visible = renderQuality.secondaryEffects
  try {
    for (const entity of entities) {
      const outline = entity.mesh?.userData?.lethalOutline
      if (outline) outline.visible = Boolean(renderQuality.secondaryEffects && outline.visible)
    }
    // Scenery density follows the same signal — it is the cheapest thing to
    // drop when frames get expensive, and dropping it changes no hitboxes.
    refreshGroundLife()
  } catch {
    /* entities is declared later in boot; first quality pass runs before that */
  }
  document.documentElement.dataset.renderQuality = renderQuality.level
  if (deskAR.active || settings.arDesk) {
    renderer.setClearColor(0x000000, 0)
  } else {
    renderer.setClearColor(0xc8dff5, 1)
  }
}
renderer.setPixelRatio(renderQuality.pixelRatio)
renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.shadowMap.enabled = !settings.lowPower
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.98
renderer.setClearColor(0xc8dff5, 1)

installNativePerformanceListener({
  target: window,
  onSignal(signal) {
    nativePerformanceSignal = signal
    applyPerformanceSettings()
    if (signal.memoryPressure) {
      notifications.show('Performance mode enabled to keep your flight smooth', { duration: 3200 })
    }
  },
})

const scene = new THREE.Scene()
scene.fog = new THREE.Fog(0xc5daf0, 150, 380)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 400)

// Chase-camera framing. The camera rides CAM_HEIGHT above the plane, so the aim
// point has to sit slightly *below* it: aiming level with the plane at a
// far-forward z flattens the view angle and drops the plane off the bottom of
// the frame. These values hold the plane around 68% down the screen.
const CAM_HEIGHT = 3.05
const CAM_AIM_LIFT = -0.1
const CAM_AIM_Z = 13
// Lateral/depth smoothing stays loose so steering reads as momentum. The
// vertical axis settles far faster: a lagging camera rides above a sinking
// plane and pushes it off-screen exactly when the player needs to see it.
const CAM_FOLLOW_X = 0.62
const CAM_EASE_LATERAL = 0.0005
const CAM_EASE_VERTICAL = 1e-7

// A soft generic room environment so metallic/reflective materials (scissors
// blades, power crystals, upgrade halos) pick up real reflections instead of
// rendering flat/near-black — this scene never had any environment lighting,
// which is why metalness had to be kept very low everywhere as a workaround.
// Skipped in low-power mode: it's a one-time cost, not per-frame, but the
// PMREM render pass itself is non-trivial on weak/mobile GPUs.
if (!settings.lowPower) {
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()
}

// Every asset path in this file is authored as a root-absolute string
// ('/assets/...') for the hosted web build. Vite's base-path rewriting only
// touches its own module graph / recognized HTML attributes, never runtime
// string literals — so under the iOS app's file:// bundle (base: './'),
// these would otherwise try to resolve at the filesystem root and fail.
// Every texture/image loader funnels through this.
function resolveAssetUrl(url) {
  return url && url.startsWith('/') ? import.meta.env.BASE_URL + url.slice(1) : url
}

const loader = new THREE.TextureLoader()
const texCache = {}
function loadTex(rawUrl) {
  const url = resolveAssetUrl(rawUrl)
  if (!texCache[url]) {
    const t = loader.load(url)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    // The floor is seen at a very grazing angle; without anisotropic filtering
    // its painted detail collapses into mush a few meters out.
    t.anisotropy = renderer.capabilities.getMaxAnisotropy?.() ?? 4
    texCache[url] = t
  }
  return texCache[url]
}

// Imagine-crafted paper emblems as top + side badges around the open portal.
// Collision stays 100% procedural — badges never cover the flyable hole.
function addBossArtOverlay(group, kind, gapY = 10, halfWidth = 4, halfHeight = 3.7) {
  const layout = getBossBadgeLayout({ halfWidth, halfHeight, gapY })
  const loadTexture = (rawUrl, onLoad, onError) => loader.load(
    resolveAssetUrl(rawUrl),
    onLoad,
    undefined,
    onError,
  )
  const badges = []
  for (const key of ['top']) {
    const slot = layout[key]
    const overlay = createBossArtOverlay({
      THREE: BOSS_ART_THREE,
      kind,
      size: slot.size,
      loadTexture,
    })
    if (!overlay) continue
    overlay.position.set(slot.x, slot.y, slot.z)
    overlay.scale.x = slot.scaleX
    overlay.userData.badgeSlot = key
    group.add(overlay)
    badges.push(overlay)
  }
  group.userData.artBadges = badges
  // Keep a primary handle for older animation code paths.
  group.userData.artOverlay = badges[0] || null
}
const cutoutTexCache = {}
/**
 * Cuts a product photo's flat backdrop out into real alpha, via a
 * border-seeded flood fill (grow-by-neighbor-similarity) rather than a
 * single global color distance. A single threshold against one sampled
 * color leaves soft drop-shadows and paper-fold creases in the backdrop
 * behind — connected to the edge but far enough from the corner sample
 * to survive — which read as a visible box/smudge around the cutout.
 * Growing from the border and comparing each pixel only to its
 * already-classified neighbor follows shadow gradients smoothly while
 * still stopping at a real silhouette edge, so pale subject regions
 * (e.g. a cream-white paper wing) aren't eaten just for being close in
 * color to a cream backdrop — they're not *connected* to the border by
 * a smooth gradient.
 *
 * A pure neighbor-to-neighbor check is exploitable by JPEG compression's
 * soft anti-aliased edges though: each individual step is small, but a
 * long enough smooth ramp lets the fill "climb" all the way from the
 * backdrop into fully saturated subject colors and hollow the subject
 * out. So growth also requires staying within maxDistance of the
 * original sampled backdrop color — a shadow drifts gradually but never
 * far from the backdrop tone, while climbing into real subject color
 * blows that cap even if no single step looked suspicious.
 */
function loadCutoutTex(rawUrl, growThreshold = 20, maxDistance = 70) {
  const url = resolveAssetUrl(rawUrl)
  if (cutoutTexCache[url]) return cutoutTexCache[url]
  const canvas = document.createElement('canvas')
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const { width: w, height: h } = canvas
    const data = ctx.getImageData(0, 0, w, h)
    const px = data.data
    const n = w * h
    // Reference backdrop color, averaged over the full border rather than
    // just 4 corners, so a corner that happens to fall on a shadow/subject
    // doesn't skew the reference.
    let br = 0, bg0 = 0, bb0 = 0, borderCount = 0
    for (let x = 0; x < w; x++) {
      for (const y of [0, h - 1]) {
        const i = (y * w + x) * 4
        br += px[i]; bg0 += px[i + 1]; bb0 += px[i + 2]; borderCount++
      }
    }
    for (let y = 1; y < h - 1; y++) {
      for (const x of [0, w - 1]) {
        const i = (y * w + x) * 4
        br += px[i]; bg0 += px[i + 1]; bb0 += px[i + 2]; borderCount++
      }
    }
    br /= borderCount; bg0 /= borderCount; bb0 /= borderCount
    const bg = new Uint8Array(n)
    const visited = new Uint8Array(n)
    const queue = new Int32Array(n)
    let qTail = 0
    const pushSeed = (x, y) => {
      const id = y * w + x
      if (!visited[id]) {
        visited[id] = 1
        bg[id] = 1
        queue[qTail++] = id
      }
    }
    for (let x = 0; x < w; x++) { pushSeed(x, 0); pushSeed(x, h - 1) }
    for (let y = 0; y < h; y++) { pushSeed(0, y); pushSeed(w - 1, y) }
    for (let qHead = 0; qHead < qTail; qHead++) {
      const id = queue[qHead]
      const x = id % w, y = (id / w) | 0
      const i = id * 4
      const r0 = px[i], g0 = px[i + 1], b0 = px[i + 2]
      const neighbors = []
      if (x > 0) neighbors.push(id - 1)
      if (x < w - 1) neighbors.push(id + 1)
      if (y > 0) neighbors.push(id - w)
      if (y < h - 1) neighbors.push(id + w)
      for (const nb of neighbors) {
        if (visited[nb]) continue
        const j = nb * 4
        const nr = px[j], ng = px[j + 1], nb_ = px[j + 2]
        const stepDist = Math.hypot(nr - r0, ng - g0, nb_ - b0)
        const refDist = Math.hypot(nr - br, ng - bg0, nb_ - bb0)
        visited[nb] = 1
        if (stepDist < growThreshold && refDist < maxDistance) {
          bg[nb] = 1
          queue[qTail++] = nb
        }
      }
    }
    // Cheap box-blur pass on the alpha channel alone so the flood-fill's
    // jagged pixel boundary softens into a feathered edge instead of a
    // hard cutout line.
    const alpha = new Uint8ClampedArray(n)
    for (let id = 0; id < n; id++) alpha[id] = bg[id] ? 0 : 255
    const blurred = new Uint8ClampedArray(n)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0, count = 0
        for (let oy = -1; oy <= 1; oy++) {
          const ny = y + oy
          if (ny < 0 || ny >= h) continue
          for (let ox = -1; ox <= 1; ox++) {
            const nx = x + ox
            if (nx < 0 || nx >= w) continue
            sum += alpha[ny * w + nx]
            count++
          }
        }
        blurred[y * w + x] = sum / count
      }
    }
    for (let id = 0; id < n; id++) px[id * 4 + 3] = blurred[id]
    ctx.putImageData(data, 0, 0)
    tex.needsUpdate = true
  }
  img.src = url
  cutoutTexCache[url] = tex
  return tex
}
const paperTex = loadTex('/assets/paper.jpg')
const buildingTex = loadTex('/assets/buildings.jpg')
const skyTex = loadTex('/assets/sky-city.jpg')

// Dual sky spheres for crossfade between zones
const skyGeo = new THREE.SphereGeometry(300, 32, 16)
// fog:false — scene fog is tuned for depth-cueing buildings and ground, but
// blanketing the sky dome in it bleached the whole upper half of the frame
// into milk. The painted skies carry the zone mood; let them show it.
const skyMatA = new THREE.MeshBasicMaterial({
  map: skyTex, side: THREE.BackSide, depthWrite: false, transparent: true, opacity: 1, fog: false,
})
const skyMatB = new THREE.MeshBasicMaterial({
  map: skyTex, side: THREE.BackSide, depthWrite: false, transparent: true, opacity: 0, fog: false,
})
const skyA = new THREE.Mesh(skyGeo, skyMatA)
const skyB = new THREE.Mesh(new THREE.SphereGeometry(298, 32, 16), skyMatB)
skyA.name = 'sky'
skyB.name = 'skyB'
scene.add(skyA, skyB)
let skyFade = 1 // 1 = show A, 0 = show B
let skyFadeTarget = 1
let activeSkyIsA = true
let currentSkyUrl = '/assets/sky-city.jpg'

const groundMap = loadTex('/assets/ground-city.jpg')
// ~15m square tiles: dense enough that the painted detail stays crisp under
// the camera instead of smearing into a pastel blur, and the repeat keeps the
// texture's aspect ratio square so nothing stretches.
if (groundMap.repeat) groundMap.repeat.set(6, 46)
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(90, 700),
  // A warm mid tone — near-white tints pushed the fogged floor into a wash.
  new THREE.MeshStandardMaterial({ map: groundMap, color: 0xcbb79c, roughness: 0.95 }),
)
ground.rotation.x = -Math.PI / 2
ground.position.set(0, 0, 120)
ground.receiveShadow = true
scene.add(ground)
let currentGroundUrl = '/assets/ground-city.jpg'

// Contact shadow — the pale fuselage dissolves into bright paper streets at
// distance, so an altitude-scaled blob keeps it anchored to the world.
const planeShadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.85, 22),
  new THREE.MeshBasicMaterial({ color: 0x2b2015, transparent: true, opacity: 0.3, depthWrite: false }),
)
planeShadow.rotation.x = -Math.PI / 2
planeShadow.position.y = 0.06
planeShadow.renderOrder = 1
planeShadow.visible = false
scene.add(planeShadow)

// ---------------------------------------------------------------------------
// Ground life — flanking scenery that makes each zone feel inhabited.
// One InstancedMesh per species, so a whole field of traffic or reeds costs a
// single draw call. Placement and motion rules live in game/ground-life.js.
// ---------------------------------------------------------------------------
/**
 * Merge simple parts into one geometry so a multi-part silhouette — a car with
 * a cabin, a person with a head — can still be drawn by a single InstancedMesh.
 * Written out here rather than pulling in BufferGeometryUtils for one call.
 */
function mergeParts(parts) {
  const positions = []
  const normals = []
  const indices = []
  let offset = 0
  for (const { geometry, at = [0, 0, 0], scale = [1, 1, 1] } of parts) {
    const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry
    const position = nonIndexed.getAttribute('position')
    const normal = nonIndexed.getAttribute('normal')
    for (let i = 0; i < position.count; i++) {
      positions.push(
        position.getX(i) * scale[0] + at[0],
        position.getY(i) * scale[1] + at[1],
        position.getZ(i) * scale[2] + at[2],
      )
      normals.push(normal.getX(i), normal.getY(i), normal.getZ(i))
      indices.push(offset + i)
    }
    offset += position.count
    if (nonIndexed !== geometry) nonIndexed.dispose()
    geometry.dispose()
  }
  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  merged.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
  merged.setIndex(indices)
  return merged
}

const GROUND_LIFE_GEOMETRY = {
  box: () => new THREE.BoxGeometry(1.1, 0.55, 2.2),
  flag: () => new THREE.PlaneGeometry(1.3, 0.95),
  sail: () => new THREE.ConeGeometry(0.85, 1.8, 3),
  buoy: () => new THREE.SphereGeometry(0.42, 6, 5),
  fan: () => new THREE.PlaneGeometry(2.3, 0.32),
  reed: () => new THREE.PlaneGeometry(0.26, 1.7),
  shard: () => new THREE.ConeGeometry(0.48, 1.6, 4),
  lamp: () => new THREE.ConeGeometry(0.62, 0.85, 8),
  // Low, dense scatter — a folded paper wedge, cheap enough to run 40 of.
  tuft: () => new THREE.ConeGeometry(0.55, 0.5, 4),
  // Ground decal: a flat quad laid on the floor, the only class allowed to
  // cross under the flight path.
  decal: () => new THREE.PlaneGeometry(1, 2.6),
  // A road segment. Length is set per-field so segments tile without gaps.
  road: () => new THREE.PlaneGeometry(5.2, 1),
  // Chassis plus a smaller cabin set back and up — enough silhouette to read
  // as a car at this distance rather than as a floating brick.
  car: () => mergeParts([
    { geometry: new THREE.BoxGeometry(1.5, 0.5, 3.1), at: [0, 0, 0] },
    { geometry: new THREE.BoxGeometry(1.2, 0.52, 1.4), at: [0, 0.48, -0.15] },
  ]),
  // A folded paper figure: body wedge, head, and a hint of shoulders.
  person: () => mergeParts([
    { geometry: new THREE.ConeGeometry(0.34, 0.9, 4), at: [0, 0, 0] },
    { geometry: new THREE.SphereGeometry(0.2, 6, 5), at: [0, 0.62, 0] },
  ]),
  // Tall, thin marker on a wider foot. Reads as a mast, chimney or standard
  // at distance and gives each zone a vertical accent above the low scatter.
  mast: () => mergeParts([
    { geometry: new THREE.BoxGeometry(0.16, 2.6, 0.16), at: [0, 1.3, 0] },
    { geometry: new THREE.BoxGeometry(0.62, 0.18, 0.62), at: [0, 0.09, 0] },
  ]),
  // A span on two legs — a bridge, gantry or trestle depending on the zone.
  arch: () => mergeParts([
    { geometry: new THREE.BoxGeometry(3.4, 0.22, 0.5), at: [0, 1.5, 0] },
    { geometry: new THREE.BoxGeometry(0.26, 1.5, 0.4), at: [-1.5, 0.75, 0] },
    { geometry: new THREE.BoxGeometry(0.26, 1.5, 0.4), at: [1.5, 0.75, 0] },
  ]),
  // A stack of folded sheets — crates, bales, cargo, paper reams.
  stack: () => mergeParts([
    { geometry: new THREE.BoxGeometry(1.05, 0.3, 1.05), at: [0, 0.15, 0] },
    { geometry: new THREE.BoxGeometry(0.92, 0.28, 0.92), at: [0.05, 0.44, 0.04] },
    { geometry: new THREE.BoxGeometry(0.78, 0.26, 0.78), at: [-0.04, 0.71, -0.03] },
  ]),
}

const groundLifeDummy = new THREE.Object3D()
const groundLifeFields = []
let groundLifeZoneId = null

function disposeGroundLife() {
  for (const field of groundLifeFields.splice(0)) {
    scene.remove(field.mesh)
    field.mesh.geometry.dispose()
    field.mesh.material.dispose()
  }
  groundLifeZoneId = null
}

function buildGroundLife(zoneId) {
  disposeGroundLife()
  const budget = resolveGroundLifeBudget({
    level: renderQuality.level,
    secondaryEffects: renderQuality.secondaryEffects,
    reducedMotion: settings.reducedMotion,
    lowPower: settings.lowPower,
  })
  groundLifeZoneId = zoneId
  if (!budget.enabled) return

  for (const speciesDef of getGroundLifeSpecies(zoneId)) {
    const count = groundLifeCount(speciesDef, budget)
    if (count <= 0) continue
    const geometry = (GROUND_LIFE_GEOMETRY[speciesDef.shape] || GROUND_LIFE_GEOMETRY.box)()
    if (speciesDef.shape === 'road') {
      // Stretch each segment to exactly the tiling length so the two road
      // ribbons are continuous rather than a dashed line of quads.
      geometry.scale(1, roadSegmentLength(count), 1)
    }
    const glow = speciesDef.motion === 'pulse'
    const material = new THREE.MeshStandardMaterial({
      // White base: the per-instance tint below multiplies into this, so any
      // colour here would darken the whole field.
      color: 0xffffff,
      roughness: 0.92,
      side: THREE.DoubleSide,
      // Decals sit millimetres above the ground plane; bias them so they do
      // not z-fight with it at distance.
      // Roads are a surface, not a wash: fully opaque so they read against a
      // busy paper ground. The softer decal bands stay translucent texture.
      transparent: speciesDef.flat && speciesDef.shape !== 'road',
      opacity: speciesDef.flat && speciesDef.shape !== 'road' ? 0.55 : 1,
      depthWrite: !speciesDef.flat || speciesDef.shape === 'road',
      polygonOffset: speciesDef.flat,
      polygonOffsetFactor: speciesDef.flat ? -2 : 0,
      polygonOffsetUnits: speciesDef.flat ? -2 : 0,
      // Aurora crystals and desk lamps read as light sources, not paper.
      emissive: glow ? new THREE.Color(speciesDef.palette.accent) : new THREE.Color(0x000000),
      emissiveIntensity: glow ? 0.55 : 0,
    })
    const mesh = new THREE.InstancedMesh(geometry, material, count)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    mesh.frustumCulled = false
    mesh.castShadow = false
    mesh.receiveShadow = false
    // Scenery must never be mistaken for something the ink blast can pop or
    // the plane can hit — nothing here is registered as an entity.
    mesh.userData.decorative = true

    // Tint each instance somewhere between the species' primary and accent so
    // a field of forty reads as handmade paper rather than forty clones.
    const primary = new THREE.Color(speciesDef.palette.primary)
    const accent = new THREE.Color(speciesDef.palette.accent)
    const tint = new THREE.Color()

    const instances = []
    for (let i = 0; i < count; i++) {
      instances.push({
        x: groundLifeSlotX(i, rng(), speciesDef),
        z: groundLifeSlotZ(i, count, rng(), speciesDef),
        phase: rng() * Math.PI * 2,
        // Roads and traffic keep a uniform size; organic scatter varies.
        scale: speciesDef.align === 'road'
          ? speciesDef.scale
          : speciesDef.scale * (0.8 + rng() * 0.45),
      })
      // A road is one continuous surface — per-segment tint would stripe it.
      tint.copy(primary).lerp(accent, speciesDef.shape === 'road' ? 0 : rng() * 0.7)
      mesh.setColorAt(i, tint)
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    groundLifeFields.push({ speciesDef, mesh, instances, motionScale: budget.motionScale })
    scene.add(mesh)
  }
  updateGroundLife(0)
}

function scrollGroundLife(move) {
  for (const field of groundLifeFields) {
    // zSpeedMul is what makes traffic read as traffic: scrolling slower than
    // the ground looks like driving away, faster looks like oncoming.
    const step = move * (field.speciesDef.zSpeedMul ?? 1)
    for (const instance of field.instances) {
      instance.z = wrapGroundLifeZ(instance.z, step)
    }
  }
}

function updateGroundLife(time) {
  for (const { speciesDef, mesh, instances, motionScale } of groundLifeFields) {
    for (let i = 0; i < instances.length; i++) {
      const instance = instances[i]
      const motion = groundLifeTransform(speciesDef, instance.phase, time, motionScale)
      groundLifeDummy.position.set(
        instance.x + motion.offsetX,
        speciesDef.y + motion.offsetY,
        instance.z,
      )
      if (speciesDef.shape === 'road') {
        // Flat on the ground and running down the field, not fanned out.
        groundLifeDummy.rotation.set(-Math.PI / 2, 0, 0)
      } else if (speciesDef.flat) {
        // Rotate onto the ground plane; the motion rotation becomes yaw so
        // decals fan out instead of all pointing down the same axis.
        groundLifeDummy.rotation.set(-Math.PI / 2, motion.rotation + instance.phase, 0)
      } else {
        groundLifeDummy.rotation.set(0, 0, motion.rotation)
      }
      groundLifeDummy.scale.setScalar(instance.scale * motion.scale)
      groundLifeDummy.updateMatrix()
      mesh.setMatrixAt(i, groundLifeDummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  }
}

function refreshGroundLife() {
  if (groundLifeZoneId) buildGroundLife(groundLifeZoneId)
}

// Upgrade sparkle trail points stay in world space so the trail follows the
// plane's path instead of inheriting its current bank and position.
const trailPts = []
const TRAIL_N = 24

// Ambient wisp trail — wingtip streamers that make the plane readable in motion
const wispPts = []
const WISP_N = 14
let wispSide = 1
{
  const g = new THREE.BufferGeometry()
  const arr = new Float32Array(WISP_N * 3)
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
  const wisp = new THREE.Points(
    g,
    new THREE.PointsMaterial({
      color: 0xff8a5e, size: 0.17, transparent: true, opacity: 0.3, depthWrite: false,
    }),
  )
  wisp.name = 'ambientWisp'
  wisp.visible = false
  scene.add(wisp)
  for (let i = 0; i < WISP_N; i++) wispPts.push(new THREE.Vector3())
}

const hemi = new THREE.HemisphereLight(0xffe8d6, 0x7ba3c4, 0.92)
scene.add(hemi)
const sun = new THREE.DirectionalLight(0xfff0e0, 1.25)
sun.position.set(30, 50, 20)
sun.castShadow = true
sun.shadow.mapSize.set(1024, 1024)
sun.shadow.camera.left = -45
sun.shadow.camera.right = 45
sun.shadow.camera.top = 45
sun.shadow.camera.bottom = -45
scene.add(sun)

const dustCount = 120
const dustPos = new Float32Array(dustCount * 3)
for (let i = 0; i < dustCount; i++) {
  dustPos[i * 3] = (Math.random() - 0.5) * 45
  dustPos[i * 3 + 1] = Math.random() * 32 + 2
  dustPos[i * 3 + 2] = Math.random() * 220
}
const dustGeo = new THREE.BufferGeometry()
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
const dust = new THREE.Points(
  dustGeo,
  new THREE.PointsMaterial({ color: 0xffffff, size: 0.16, transparent: true, opacity: 0.5, depthWrite: false }),
)
scene.add(dust)
dust.visible = !settings.lowPower

// Wind streaks — gust forces used to be invisible (HUD banner only). A small
// pooled set of stretched motes streams across the field in the push
// direction so a gust reads as weather, not as an unexplained shove.
const WIND_STREAK_COUNT = 16
const windStreakGeo = new THREE.BoxGeometry(2.4, 0.05, 0.05)
const windStreakMat = new THREE.MeshBasicMaterial({
  color: 0xe8f6ff, transparent: true, opacity: 0.42, depthWrite: false,
})
const windStreaks = []
for (let i = 0; i < WIND_STREAK_COUNT; i++) {
  const s = new THREE.Mesh(windStreakGeo, windStreakMat)
  s.visible = false
  s.userData.jitter = Math.random()
  scene.add(s)
  windStreaks.push(s)
}
function resetWindStreak(s, dir) {
  // Spawn on the upwind side so streaks fly with the push, past the plane.
  s.position.set(
    -dir * (12 + Math.random() * 14),
    2.5 + Math.random() * 14,
    18 + Math.random() * 55,
  )
}
function updateWindStreaks(dt, pushX, worldSpeed) {
  const active = Math.abs(pushX) > 0.01 && !settings.reducedMotion && !settings.lowPower
  const dir = Math.sign(pushX)
  for (const s of windStreaks) {
    s.visible = active
    if (!active) continue
    s.position.x += dir * (9 + s.userData.jitter * 7) * dt
    s.position.z -= worldSpeed * 0.45 * dt
    if (Math.abs(s.position.x) > 30 || s.position.z < -12) resetWindStreak(s, dir)
  }
}

applyPerformanceSettings()

// Confetti — a persistent pooled ring buffer instead of allocating 10 fresh
// meshes + materials per burst (bursts fire constantly: near-miss chains,
// stars, boss clears). Colors come from per-event palettes so gold reads as
// currency, rainbow as fever, blue/violet as route progress.
const CONFETTI_POOL_SIZE = 96
const confettiGeo = new THREE.PlaneGeometry(0.15, 0.2)
const confetti = []
let confettiCursor = 0
for (let i = 0; i < CONFETTI_POOL_SIZE; i++) {
  const m = new THREE.Mesh(
    confettiGeo,
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true }),
  )
  m.visible = false
  m.userData.v = new THREE.Vector3()
  m.userData.life = 0
  scene.add(m)
  confetti.push(m)
}
/** Ink Blast: fires a forward projectile that pops small airborne hazards. */
function tryPaperPush() {
  if (state !== 'playing' || paperPushCooldown > 0) return false
  paperPushCooldown = 2.6
  const trimming = windActive > 0 || Math.abs(velX) > 10
  velX *= 0.38
  windForce *= 0.4
  windActive = Math.min(windActive, 0.12)
  speedBoost = Math.max(speedBoost, 14)
  invuln = Math.max(invuln, 0.28)
  fovPunch = Math.max(fovPunch, 5)
  audio.paperPush()
  if (settings.haptics) Haptic.tap()
  showFlightFeedback(trimming ? 'TRIM THE GUST' : 'PAPER PUSH', 'route', 0.7)
  fireBtn?.classList.add('firing')
  setTimeout(() => fireBtn?.classList.remove('firing'), 90)
  return true
}

function fireWeapon({ allowPush = false } = {}) {
  const fx = activeUpgradeEffects
  const result = resolveWeaponFire({
    weaponLevel: fx.weaponLevel,
    cooldownSeconds: fx.weaponCooldown,
    cooldownLeft: fireCooldown,
    playing: state === 'playing',
  })
  if (!result.fired) {
    if (allowPush) tryPaperPush()
    return
  }
  fireCooldown = result.cooldownLeft
  updateWeaponFeedback()
  const m = createShot()
  m.position.set(planeX, planeY, 4)
  scene.add(m)
  entities.push({
    mesh: m,
    type: 'shot',
    radius: result.shot.radius,
    ttl: result.shot.ttl,
    speed: result.shot.speed,
  })
  audio.shoot()
  if (settings.haptics) Haptic.nearMiss()
  fireBtn?.classList.add('firing')
  fireBtn?.classList.remove('weapon-ready')
  setTimeout(() => fireBtn?.classList.remove('firing'), 90)
}

/** Advance in-flight ink shots and pop any bird/scissors hazard they touch. */
function updateShots(dt) {
  const toRemove = new Set()
  for (const e of entities) {
    if (e.type !== 'shot' || toRemove.has(e)) continue
    const next = advanceShot({
      z: e.mesh.position.z,
      ttl: e.ttl,
      dt,
      speed: e.speed || 46,
    })
    e.mesh.position.z = next.z
    e.ttl = next.ttl
    if (next.expired) {
      toRemove.add(e)
      continue
    }
    for (const target of entities) {
      if (toRemove.has(target) || (target.type !== 'bird' && target.type !== 'scissors')) continue
      if (shotHitsTarget({
        shotX: e.mesh.position.x,
        shotY: e.mesh.position.y,
        shotZ: e.mesh.position.z,
        shotRadius: e.radius,
        targetX: target.mesh.position.x,
        targetY: target.mesh.position.y,
        targetZ: target.mesh.position.z,
        targetRadius: target.radius || 0.7,
      })) {
        toRemove.add(target)
        toRemove.add(e)
        stars += inkPopReward()
        starsEl.textContent = String(stars)
        runStats.popped++
        audio.popTarget()
        if (settings.haptics) Haptic.collect()
        spawnConfetti(target.mesh.position.x, target.mesh.position.y, target.mesh.position.z)
        break
      }
    }
  }
  if (!toRemove.size) return
  for (let i = entities.length - 1; i >= 0; i--) {
    if (toRemove.has(entities[i])) {
      scene.remove(entities[i].mesh)
      entities.splice(i, 1)
    }
  }
}

function spawnConfetti(x, y, z, palette = 'classic') {
  const colors = confettiColors(palette)
  for (let i = 0; i < 10; i++) {
    const m = confetti[confettiCursor]
    confettiCursor = (confettiCursor + 1) % CONFETTI_POOL_SIZE
    m.visible = true
    m.material.color.setHex(colors[i % colors.length])
    m.material.opacity = 1
    m.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI)
    m.position.set(x, y, z)
    m.userData.v.set((rng() - 0.5) * 6, rng() * 4 + 1, (rng() - 0.5) * 4)
    m.userData.life = 0.6 + rng() * 0.4
  }
}

// Materials
const planeBodyMat = new THREE.MeshStandardMaterial({
  map: paperTex, color: 0xfff6ec, roughness: 0.82, side: THREE.DoubleSide,
})
const planeAccentMat = new THREE.MeshStandardMaterial({
  color: 0xf0956a, roughness: 0.7, side: THREE.DoubleSide,
})
const planeTrailMat = new THREE.PointsMaterial({
  color: 0xfff0c0, size: 0.27, transparent: true, opacity: 0.75, depthWrite: false,
})
const buildingMats = [
  new THREE.MeshStandardMaterial({ map: buildingTex, color: 0xffc9b8, roughness: 0.9 }),
  new THREE.MeshStandardMaterial({ map: buildingTex, color: 0xb8e0d2, roughness: 0.9 }),
  new THREE.MeshStandardMaterial({ map: buildingTex, color: 0xffe6a8, roughness: 0.9 }),
  new THREE.MeshStandardMaterial({ map: buildingTex, color: 0xd4c4f0, roughness: 0.9 }),
]
const birdMat = new THREE.MeshStandardMaterial({
  map: paperTex, color: season.birdColor, roughness: 0.78, side: THREE.DoubleSide,
})
const birdAccentMat = new THREE.MeshStandardMaterial({
  map: paperTex, color: season.birdColor, roughness: 0.65, side: THREE.DoubleSide, emissive: 0x000000,
})
birdAccentMat.color.multiplyScalar(0.82) // subtle crease-shadow tone for the underside/accents
const birdEyeMat = new THREE.MeshStandardMaterial({ color: 0x3d2c29, roughness: 0.5 })
const dragonflyEyeMat = new THREE.MeshStandardMaterial({
  color: 0x2563eb, emissive: 0x1d4ed8, emissiveIntensity: 0.3, roughness: 0.3,
})
// Was near-white at 0.6 opacity, which nearly vanished against the light
// sky color — a deeper cyan tint at higher opacity keeps the "iridescent"
// look while staying readable as a silhouette from any angle.
const dragonflyWingMat = new THREE.MeshStandardMaterial({
  color: 0x8fd8e8, transparent: true, opacity: 0.85, side: THREE.DoubleSide, roughness: 0.25, metalness: 0.05,
})
// Kept low-metalness: the scene has no environment map, and Three's
// metalness workflow renders highly metallic surfaces near-black without
// one (no reflections to fill them in) — high metalness here previously
// made the blades look like dark wood beams instead of shiny silver.
const scissorsMat = new THREE.MeshStandardMaterial({ color: 0xd7dce2, metalness: 0.12, roughness: 0.4 })
const scissorsEdgeMat = new THREE.MeshStandardMaterial({ color: 0xf3f6f9, metalness: 0.15, roughness: 0.25 })

function applySeasonVisuals() {
  season = seasonInfo(settings.forceSeason)
  birdMat.color.setHex(season.birdColor)
  if (season.fogBoost != null && scene.fog) {
    // blend toward seasonal fog
    scene.fog.color.lerp(new THREE.Color(season.fogBoost), 0.35)
  }
  refreshUnlocks(season.id)
}
const cloudMat = new THREE.MeshStandardMaterial({ color: 0xfffaf5, roughness: 1, transparent: true, opacity: 0.9 })
const cloudShadeMat = new THREE.MeshStandardMaterial({
  color: 0xd8dde8, roughness: 1, transparent: true, opacity: 0.55,
})
const riverMat = new THREE.MeshStandardMaterial({
  color: 0x6fb0d8, roughness: 0.25, metalness: 0.15, transparent: true, opacity: 0.9,
})
const riverRippleMat = new THREE.MeshStandardMaterial({
  color: 0xdff3fb, roughness: 0.3, transparent: true, opacity: 0.55, depthWrite: false,
})
const parkMat = new THREE.MeshStandardMaterial({ color: 0x8fc98a, roughness: 0.95 })
const treeFoliageMat = new THREE.MeshStandardMaterial({ color: 0x6fae6a, roughness: 0.85 })
const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x9a7350, roughness: 0.8 })

function createRiverPatch() {
  const g = new THREE.Group()
  const width = 80
  const depth = 8 + rng() * 5
  const river = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), riverMat)
  river.rotation.x = -Math.PI / 2
  g.add(river)
  for (let i = 0; i < 3; i++) {
    const ripple = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.9, 0.4), riverRippleMat)
    ripple.rotation.x = -Math.PI / 2
    ripple.position.set(0, 0.01, (rng() - 0.5) * depth * 0.7)
    g.add(ripple)
  }
  g.position.y = 0.03
  return g
}

function createParkPatch() {
  const g = new THREE.Group()
  const w = 11 + rng() * 8
  const d = 11 + rng() * 8
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(w, d), parkMat)
  patch.rotation.x = -Math.PI / 2
  g.add(patch)
  const treeCount = 2 + Math.floor(rng() * 3)
  for (let i = 0; i < treeCount; i++) {
    const tree = new THREE.Group()
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.6, 6), treeTrunkMat)
    trunk.position.y = 0.3
    tree.add(trunk)
    const foliage = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 7), treeFoliageMat)
    foliage.position.y = 1.05
    foliage.castShadow = true
    tree.add(foliage)
    tree.position.set((rng() - 0.5) * (w * 0.7), 0, (rng() - 0.5) * (d * 0.7))
    g.add(tree)
  }
  g.position.y = 0.03
  return g
}

function createClothesline() {
  const g = new THREE.Group()
  const poleA = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.2, 6), treeTrunkMat)
  const poleB = poleA.clone()
  poleA.position.set(-2.4, 1.1, 0)
  poleB.position.set(2.4, 1.1, 0)
  const line = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.04, 0.04), planeAccentMat)
  line.position.y = 2.05
  g.add(poleA, poleB, line)
  for (let i = 0; i < 3; i++) {
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.85), parkMat)
    sheet.position.set(-1.5 + i * 1.5, 1.55, 0)
    g.add(sheet)
  }
  return g
}

function maybeSpawnGroundDecor(z) {
  const roll = rng()
  const waterBias = currentZoneId === 'harbor' ? 0.2 : 0
  if (roll < 0.09 + waterBias) {
    const river = createRiverPatch()
    river.position.z = z
    scene.add(river)
    entities.push({ mesh: river, type: 'decor' })
  } else if (roll < 0.26) {
    const park = createParkPatch()
    const side = rng() < 0.5 ? -1 : 1
    park.position.x = side * (13 + rng() * 15)
    park.position.z = z + (rng() - 0.5) * 8
    scene.add(park)
    entities.push({ mesh: park, type: 'decor' })
  } else if (roll < 0.34 && renderQuality.secondaryEffects) {
    const line = createClothesline()
    const side = rng() < 0.5 ? -1 : 1
    line.position.set(side * (12 + rng() * 8), 0, z)
    scene.add(line)
    entities.push({ mesh: line, type: 'decor' })
  }
}
const windowMat = new THREE.MeshStandardMaterial({
  color: 0x6a8fb0, emissive: 0x3a5a70, emissiveIntensity: 0.18, roughness: 0.5,
})
const ringMat = new THREE.MeshStandardMaterial({
  color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.5, side: THREE.DoubleSide,
})
const ghostMat = new THREE.MeshStandardMaterial({
  color: 0xa5b4fc, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false,
})
const rivalMat = new THREE.MeshStandardMaterial({
  color: 0xef4444, emissive: 0x7f1d1d, emissiveIntensity: 0.35, transparent: true, opacity: 0.82,
  side: THREE.DoubleSide, depthWrite: false,
})

function buildPowerMeta() {
  const c = powerColors(settings.colorblindPowers)
  return {
    shield: {
      label: '🛡 Shield',
      color: c.shield,
      banner: '🛡 Paper Shield!',
      duration: SHIELD_BASE_DURATION,
    },
    slow: { label: '⏱ Slow-mo', color: c.slow, banner: '⏱ Slow Motion!', duration: 6 },
    magnet: { label: '🧲 Magnet', color: c.magnet, banner: '🧲 Star Magnet!', duration: 9 },
    boost: { label: '🚀 Boost', color: c.boost, banner: '🚀 Speed Boost!', duration: 5 },
    tear: { label: '📄 Torn Wing', color: c.tear, banner: '📄 Torn wing — lopsided!', duration: 7 },
    clip: { label: '📎 Paperclip', color: c.clip, banner: '📎 Weighted — stable dive!', duration: 8 },
    sling: { label: '🪢 Rubber Band', color: c.sling, banner: '🪢 Slingshot ready — hold Space!', duration: 10 },
    phase: { label: '👻 Phase', color: c.phase, banner: '👻 Phasing through hazards!', duration: 4 },
  }
}
let POWER_META = buildPowerMeta()
let POWER_KINDS = Object.keys(POWER_META)
const TOY_KINDS = ['tear', 'clip', 'sling']

function rebuildPowerPalette() {
  POWER_META = buildPowerMeta()
  POWER_KINDS = Object.keys(POWER_META)
  // Cached power-up materials are keyed by kind and colored from the old
  // palette — drop them so the next spawn of each kind rebuilds with the
  // new (e.g. colorblind-safe) colors.
  powerMatCache = {}
}

let plane = null
let shieldBubble = null
let upgradeTrail = null
let activePlaneSkinId = 'classic'
let activePlaneSilhouette = 'classic'

function disposeFlightPlane(model, trail) {
  if (model) {
    model.traverse((child) => {
      child.geometry?.dispose?.()
      if (child.name === 'shieldBubble' && child.material !== planeBodyMat && child.material !== planeAccentMat) {
        child.material?.dispose?.()
      }
    })
    scene.remove(model)
  }
  if (trail) {
    scene.remove(trail)
    trail.geometry?.dispose?.()
  }
}

function installFlightPlane(skin) {
  const nextPlane = createPaperPlane({
    THREE: PLANE_THREE,
    silhouette: skin.silhouette,
    materials: { body: planeBodyMat, accent: planeAccentMat, trail: planeTrailMat },
    withShield: true,
  })
  const nextTrail = nextPlane.getObjectByName('upgradeTrail')
  nextPlane.remove(nextTrail)

  if (plane) {
    nextPlane.position.copy(plane.position)
    nextPlane.quaternion.copy(plane.quaternion)
    nextPlane.scale.copy(plane.scale)
    nextPlane.visible = plane.visible
  }
  disposeFlightPlane(plane, upgradeTrail)

  plane = nextPlane
  shieldBubble = plane.getObjectByName('shieldBubble')
  upgradeTrail = nextTrail
  activePlaneSilhouette = plane.userData.silhouette
  trailPts.length = 0
  for (let i = 0; i < TRAIL_N; i++) trailPts.push(new THREE.Vector3())
  scene.add(upgradeTrail)
  scene.add(plane)
  attachPlaneAccents()
}

let boostFlame = null
let magnetHalo = null

function attachPlaneAccents() {
  if (!plane) return
  boostFlame = plane.getObjectByName('boostFlame')
  if (!boostFlame) {
    boostFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.85, 8),
      new THREE.MeshBasicMaterial({ color: 0xff7a3c, transparent: true, opacity: 0.88 }),
    )
    boostFlame.name = 'boostFlame'
    boostFlame.rotation.x = Math.PI
    boostFlame.position.set(0, -0.04, -0.88)
    boostFlame.visible = false
    plane.add(boostFlame)
  }
  magnetHalo = plane.getObjectByName('magnetHalo')
  if (!magnetHalo) {
    magnetHalo = new THREE.Mesh(
      new THREE.TorusGeometry(1.12, 0.04, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.5 }),
    )
    magnetHalo.name = 'magnetHalo'
    magnetHalo.rotation.x = Math.PI / 2
    magnetHalo.visible = false
    plane.add(magnetHalo)
  }
  if (!plane.getObjectByName('guardianStitch')) {
    const stitch = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.22, 0.55),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.85 }),
    )
    stitch.name = 'guardianStitch'
    stitch.position.set(0, 0.12, -0.55)
    stitch.visible = false
    plane.add(stitch)
  }
}

function syncPlanePowerLook(dt = 0.016) {
  const boosting = activePower?.kind === 'boost'
  const fx = activeUpgradeEffects
  document.documentElement.dataset.boosting = boosting ? '1' : '0'
  const night = document.documentElement.dataset.night === '1'
  if (boosting) {
    planeBodyMat.emissive.setHex(0xff6a2c)
    planeBodyMat.emissiveIntensity = 0.48
    planeAccentMat.emissive.setHex(0x000000)
    planeAccentMat.emissiveIntensity = 0
  } else if (night) {
    planeBodyMat.emissive.setHex(0x4a6080)
    planeBodyMat.emissiveIntensity = 0.32
    planeAccentMat.emissive.setHex(0xffb089)
    planeAccentMat.emissiveIntensity = 0.22
  } else {
    // A whisper of warm lift keeps the white fuselage from dissolving into
    // the bright paper ground when the sun is high.
    planeBodyMat.emissive.setHex(0x584434)
    planeBodyMat.emissiveIntensity = 0.16
    planeAccentMat.emissive.setHex(0x000000)
    planeAccentMat.emissiveIntensity = 0
  }
  if (boostFlame) {
    boostFlame.visible = boosting
    if (boosting) boostFlame.scale.setScalar(0.88 + Math.sin(elapsed * 24) * 0.22)
  }
  if (magnetHalo) {
    magnetHalo.visible = (fx.magnetBonus || 0) > 0 && state === 'playing'
    if (magnetHalo.visible) magnetHalo.rotation.z += dt * 1.6
  }
  const stitch = plane.getObjectByName('guardianStitch')
  if (stitch) stitch.visible = guardianLeft > 0 && state === 'playing'
  const stretch = boosting ? 1.1 : 1
  plane.scale.setScalar((fx.planeScale || 1) * 1.12 * stretch)
  if (upgradeTrail) {
    const trailFeedback = getTrailFeedback(fx)
    upgradeTrail.visible = (trailFeedback.visible || boosting) && state === 'playing'
    if (boosting) {
      upgradeTrail.material.color.setHex(0xff8a4c)
      upgradeTrail.material.opacity = Math.max(trailFeedback.opacity, 0.72)
      upgradeTrail.material.size = Math.max(trailFeedback.size, 0.28)
    }
  }
}

function applySkin(skinId) {
  const skin = getSkin(skinId)
  if (!plane || activePlaneSilhouette !== skin.silhouette) installFlightPlane(skin)
  const map = loadTex(skin.map || '/assets/paper.jpg')
  planeBodyMat.map = map
  planeBodyMat.color.setHex(skin.body)
  planeBodyMat.needsUpdate = true
  planeAccentMat.color.setHex(skin.accent)
  planeAccentMat.needsUpdate = true
  activePlaneSkinId = skin.id
  activePlaneSilhouette = skin.silhouette
  return skin
}

function createPlanePreview({ canvas, skinId, reducedMotion = false }) {
  if (!canvas) throw new TypeError('Plane preview requires a canvas')
  const previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  previewRenderer.outputColorSpace = THREE.SRGBColorSpace
  previewRenderer.toneMapping = THREE.ACESFilmicToneMapping
  previewRenderer.toneMappingExposure = 1.05
  previewRenderer.setClearColor(0x000000, 0)
  previewRenderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))

  const previewScene = new THREE.Scene()
  const previewCamera = new THREE.PerspectiveCamera(36, 1, 0.1, 50)
  previewCamera.position.set(3.2, 2.5, 4.5)
  previewCamera.lookAt(0, 0, 0)
  previewScene.add(new THREE.HemisphereLight(0xfff7ed, 0x7c8ea6, 2.2))
  const key = new THREE.DirectionalLight(0xffe7cc, 3)
  key.position.set(-3, 5, 4)
  previewScene.add(key)

  let disposed = false
  let animationFrame = 0
  let skin = null
  let model = null
  let previewMaterials = null
  const disposeModel = () => {
    if (!model) return
    previewScene.remove(model)
    model.traverse((child) => child.geometry?.dispose?.())
    model.getObjectByName('upgradeTrail')?.material?.dispose?.()
    previewMaterials.body.dispose()
    previewMaterials.accent.dispose()
  }
  const installPreviewSkin = (nextSkinId) => {
    disposeModel()
    skin = getSkin(nextSkinId)
    previewMaterials = {
      body: new THREE.MeshStandardMaterial({
        map: loadTex(skin.map || '/assets/paper.jpg'),
        color: skin.body,
        roughness: 0.82,
        side: THREE.DoubleSide,
      }),
      accent: new THREE.MeshStandardMaterial({
        color: skin.accent,
        roughness: 0.7,
        side: THREE.DoubleSide,
      }),
    }
    model = createPaperPlane({
      THREE: PLANE_THREE,
      silhouette: skin.silhouette,
      materials: previewMaterials,
      withShield: false,
    })
    model.rotation.x = 0.1
    model.rotation.z = -0.04
    previewScene.add(model)
  }
  const resize = () => {
    const bounds = canvas.getBoundingClientRect()
    const width = Math.max(1, Math.round(bounds.width || 360))
    const height = Math.max(1, Math.round(bounds.height || 210))
    if (canvas.width !== Math.round(width * previewRenderer.getPixelRatio()) ||
        canvas.height !== Math.round(height * previewRenderer.getPixelRatio())) {
      previewRenderer.setSize(width, height, false)
      previewCamera.aspect = width / height
      previewCamera.updateProjectionMatrix()
    }
  }
  const renderPreview = (time = 0) => {
    if (disposed) return
    resize()
    model.rotation.y = -0.28 + (reducedMotion ? 0 : time * 0.00028)
    previewRenderer.render(previewScene, previewCamera)
    if (!reducedMotion) animationFrame = requestAnimationFrame(renderPreview)
  }
  installPreviewSkin(skinId)
  renderPreview()

  const previewSession = {
    canvas,
    get skinId() { return skin.id },
    get silhouette() { return skin.silhouette },
    updateSkin(nextSkinId) {
      if (disposed || nextSkinId === skin.id) return
      installPreviewSkin(nextSkinId)
      cancelAnimationFrame(animationFrame)
      renderPreview(performance.now())
    },
    dispose() {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(animationFrame)
      disposeModel()
      previewRenderer.dispose()
      previewRenderer.forceContextLoss()
    },
  }
  return previewSession
}

// Builders

/**
 * Boss portal design rules:
 * 1. The flyable hole is an OPEN rectangle matching the collision passage.
 * 2. Hazards live OUTSIDE that rectangle (left/right or above/below).
 * 3. A bright safe ring is scaled to the real opening (not a tiny fixed torus).
 * 4. Art is a small badge above the hole — never a full-face cover.
 */
const portalFrameMat = new THREE.MeshStandardMaterial({ color: 0xd9cbb8, roughness: 0.72, metalness: 0.05 })
const portalAccentMats = {
  scissors: new THREE.MeshStandardMaterial({ color: 0xe96957, emissive: 0x7f1d1d, emissiveIntensity: 0.25, roughness: 0.45 }),
  wind: new THREE.MeshStandardMaterial({ color: 0x58c7dc, emissive: 0x0e7490, emissiveIntensity: 0.3, roughness: 0.4 }),
  stapler: new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0x92400e, emissiveIntensity: 0.28, roughness: 0.42 }),
}

function createSafePortalRing(color, emissive, halfWidth = 4, halfHeight = 3.7) {
  const group = new THREE.Group()
  group.name = 'safeRing'
  const hoopMat = new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: 1.15,
    roughness: 0.32,
    side: THREE.DoubleSide,
    depthTest: false,
  })
  const glowMat = new THREE.MeshBasicMaterial({
    color: emissive,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
    depthTest: false,
  })
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(1, 0.085, 14, 56), hoopMat)
  hoop.scale.set(halfWidth, halfHeight, 1)
  hoop.renderOrder = 5
  const glow = new THREE.Mesh(new THREE.TorusGeometry(1, 0.16, 10, 40), glowMat)
  glow.scale.set(halfWidth, halfHeight, 1)
  glow.renderOrder = 4
  group.add(glow, hoop)
  group.userData.halfWidth = halfWidth
  group.userData.halfHeight = halfHeight
  return group
}

/** Shared open hoop — no picture-frame, no side towers. */
function createBossPortalBase(kind, passage) {
  const halfWidth = passage?.halfWidth ?? 4
  const halfHeight = passage?.halfHeight ?? 3.7
  const g = new THREE.Group()

  const colors = {
    scissors: { ring: 0xb8f3c8, emissive: 0x4ade80 },
    wind: { ring: 0xbfdbfe, emissive: 0x60a5fa },
    stapler: { ring: 0xfde68a, emissive: 0xfbbf24 },
  }[kind] || { ring: 0xb8f3c8, emissive: 0x4ade80 }

  const safeRing = createSafePortalRing(colors.ring, colors.emissive, halfWidth, halfHeight)
  safeRing.position.set(0, 10, -0.05)
  g.add(safeRing)

  addBossArtOverlay(g, kind, 10, halfWidth, halfHeight)
  g.userData.phase = 0
  g.userData.gapY = 10
  g.userData.kind = kind
  g.userData.safeRing = safeRing
  g.userData.halfWidth = halfWidth
  g.userData.halfHeight = halfHeight
  return g
}

function createBossGate(passage) {
  const g = createBossPortalBase('scissors', passage)
  const halfWidth = g.userData.halfWidth
  // Blades stay OUTSIDE the open portal — tall panels parked left/right.
  const bladeW = 1.1
  const bladeH = g.userData.halfHeight * 2 + 2.5
  const left = new THREE.Mesh(new THREE.BoxGeometry(bladeW, bladeH, 0.35), scissorsMat)
  const leftEdge = new THREE.Mesh(new THREE.BoxGeometry(0.12, bladeH, 0.05), scissorsEdgeMat)
  leftEdge.position.set(bladeW * 0.4, 0, 0.2)
  left.add(leftEdge)
  left.position.set(-halfWidth - bladeW * 0.7 - 0.4, 10, 0.1)
  const right = left.clone()
  right.position.x = halfWidth + bladeW * 0.7 + 0.4
  g.add(left, right)
  g.userData.left = left
  g.userData.right = right
  return g
}

const staplerJawMat = new THREE.MeshStandardMaterial({ color: 0xc4c9d4, metalness: 0.18, roughness: 0.38 })

/** Top/bottom jaws only — the center slot is always open and matches the ring. */
function createStaplerGate(passage) {
  const g = createBossPortalBase('stapler', passage)
  const halfWidth = g.userData.halfWidth
  const halfHeight = g.userData.halfHeight
  const jawH = 0.7
  const jawW = halfWidth * 1.15
  const topJaw = new THREE.Mesh(new THREE.BoxGeometry(jawW, jawH, 0.45), staplerJawMat)
  topJaw.position.set(0, 10 + halfHeight + jawH * 0.7 + 0.15, 0.15)
  const bottomJaw = new THREE.Mesh(new THREE.BoxGeometry(jawW, jawH, 0.45), staplerJawMat)
  bottomJaw.position.set(0, 10 - halfHeight - jawH * 0.7 - 0.15, 0.15)
  g.add(topJaw, bottomJaw)
  g.userData.topJaw = topJaw
  g.userData.bottomJaw = bottomJaw
  return g
}

const windFanMat = new THREE.MeshStandardMaterial({ color: 0x9ab4cc, roughness: 0.5, metalness: 0.15 })
const windDebrisMat = new THREE.MeshStandardMaterial({ color: 0xe8ddc8, roughness: 0.85 })

function createFan(radius) {
  const g = new THREE.Group()
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.16, radius * 0.16, 0.3, 10), windFanMat)
  hub.rotation.x = Math.PI / 2
  g.add(hub)
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.32, radius * 0.9, 0.06), windFanMat)
    blade.position.set(0, radius * 0.45, 0)
    const pivot = new THREE.Group()
    pivot.add(blade)
    pivot.rotation.z = (i / 4) * Math.PI * 2
    g.add(pivot)
  }
  return g
}

/** Wind tunnel: turbines parked outside the portal; debris never enters the hole. */
function createWindTunnelGate(passage) {
  const g = createBossPortalBase('wind', passage)
  const halfWidth = g.userData.halfWidth
  const halfHeight = g.userData.halfHeight
  const fanR = 2.2
  const fanL = createFan(fanR)
  fanL.position.set(-halfWidth - fanR - 0.8, 10, 0.2)
  const fanRgt = createFan(fanR)
  fanRgt.position.set(halfWidth + fanR + 0.8, 10, 0.2)
  g.add(fanL, fanRgt)

  const debris = []
  for (let i = 0; i < 8; i++) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), windDebrisMat)
    // Orbit only OUTSIDE the safe opening.
    d.userData.orbit = rng() * Math.PI * 2
    d.userData.radius = halfWidth + 1.6 + rng() * 1.8
    d.userData.speed = 1.6 + rng() * 1.4
    d.userData.yBias = (rng() - 0.5) * halfHeight * 0.6
    g.add(d)
    debris.push(d)
  }

  g.userData.fanL = fanL
  g.userData.fanR = fanRgt
  g.userData.debris = debris
  return g
}

function createBossMesh(kind, passage) {
  if (kind === 'wind') return createWindTunnelGate(passage)
  if (kind === 'stapler') return createStaplerGate(passage)
  return createBossGate(passage)
}

const roofPropMats = {
  tank: new THREE.MeshStandardMaterial({ color: 0xb0866a, roughness: 0.75 }),
  antenna: new THREE.MeshStandardMaterial({ color: 0x8a8f98, metalness: 0.4, roughness: 0.4 }),
  flagPole: new THREE.MeshStandardMaterial({ color: 0x8a8f98, metalness: 0.3, roughness: 0.5 }),
}
const flagCols = [0xef6f6c, 0x7ec8e3, 0xffd166, 0x9bd6a6]

function addRoofProp(mesh, w, h, d) {
  const minSpan = Math.min(w, d)
  if (minSpan < 1.6) return // too small a roof to read a prop clearly
  const roll = rng()
  const top = h / 2 + 0.16
  if (roll < 0.34) {
    // Rooftop water tank: barrel on short stilts
    const g = new THREE.Group()
    const legH = 0.22
    for (const [lx, lz] of [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, legH, 6), roofPropMats.antenna)
      leg.position.set(lx, legH / 2, lz)
      g.add(leg)
    }
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.6, 10), roofPropMats.tank)
    barrel.position.y = legH + 0.3
    barrel.castShadow = true
    g.add(barrel)
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.22, 10), roofPropMats.tank)
    cap.position.y = legH + 0.71
    g.add(cap)
    g.position.set((rng() - 0.5) * (w * 0.4), top, (rng() - 0.5) * (d * 0.4))
    mesh.add(g)
  } else if (roll < 0.68) {
    // Antenna mast with a small blinking-red tip
    const mastH = 1.1 + rng() * 1.3
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, mastH, 6), roofPropMats.antenna)
    mast.position.set((rng() - 0.5) * (w * 0.4), top + mastH / 2, (rng() - 0.5) * (d * 0.4))
    mast.castShadow = true
    mesh.add(mast)
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 0.6 }),
    )
    tip.position.set(mast.position.x, top + mastH, mast.position.z)
    mesh.add(tip)
  } else if (roll < 0.9) {
    // Small paper flag on a pole
    const poleH = 0.9 + rng() * 0.4
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, poleH, 6), roofPropMats.flagPole)
    pole.position.set((rng() - 0.5) * (w * 0.4), top + poleH / 2, (rng() - 0.5) * (d * 0.4))
    mesh.add(pole)
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.22),
      new THREE.MeshStandardMaterial({
        color: flagCols[(rng() * flagCols.length) | 0], side: THREE.DoubleSide, roughness: 0.8,
      }),
    )
    flag.position.set(pole.position.x + 0.19, top + poleH - 0.12, pole.position.z)
    flag.userData.flag = true
    mesh.add(flag)
  }
  // else: bare roof — keeps some visual rest between busier ones
}

function createBuilding(w, h, d, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.position.y = h / 2
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.06, 0.16, d * 1.06), planeAccentMat)
  roof.position.y = h / 2 + 0.08
  mesh.add(roof)
  addRoofProp(mesh, w, h, d)
  return mesh
}

// Lethal hazard read: a crisp inner ring plus a soft outer glow, so the
// danger claims space instead of a thin hairline that vanishes into the sky.
const lethalOutlineGeo = new THREE.TorusGeometry(1, 0.12, 6, 20)
const lethalGlowGeo = new THREE.TorusGeometry(1.16, 0.05, 6, 20)
const lethalOutlineMat = new THREE.MeshBasicMaterial({
  color: 0xff6b4a, transparent: true, opacity: 0.9, depthWrite: false,
})
const lethalGlowMat = new THREE.MeshBasicMaterial({
  color: 0xff6b4a, transparent: true, opacity: 0.35, depthWrite: false,
})
function attachLethalOutline(group, radius = 0.85) {
  if (!group || group.userData.lethalOutline) return group
  if (!renderQuality.secondaryEffects) return group
  const outline = new THREE.Mesh(lethalOutlineGeo, lethalOutlineMat)
  outline.name = 'lethalOutline'
  outline.rotation.y = Math.PI / 2
  outline.scale.setScalar(radius)
  outline.visible = false
  group.add(outline)
  const glow = new THREE.Mesh(lethalGlowGeo, lethalGlowMat)
  glow.name = 'lethalGlow'
  glow.rotation.y = Math.PI / 2
  glow.scale.setScalar(radius)
  glow.visible = false
  group.add(glow)
  group.userData.lethalOutline = outline
  group.userData.lethalGlow = glow
  return group
}

function createBillboardFlyer(texUrl, scale = 1.5, hasAlpha = false) {
  const g = new THREE.Group()
  const tex = hasAlpha ? loadTex(texUrl) : loadCutoutTex(texUrl)
  if (hasAlpha) tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: !hasAlpha,
    alphaTest: hasAlpha ? 0.03 : 0.12,
    alphaToCoverage: hasAlpha,
    side: THREE.DoubleSide,
    depthWrite: hasAlpha,
  })
  const card = new THREE.Mesh(new THREE.PlaneGeometry(scale, scale), mat)
  // Face the player (camera comes from -Z looking +Z)
  card.rotation.y = Math.PI
  g.add(card)
  g.userData.billboard = card
  attachLethalOutline(g, Math.max(0.7, (scale || 1.5) * 0.42))
  return g
}

function createBird() {
  return createFlyer('bird')
}

// Shared geometries for the default paper-crane bird — birds are the most
// frequently spawned hazard in the game, so building fresh Shape/Cone/Sphere
// geometry on every single spawn was pure GC churn. Geometry is stateless
// and safe to share across many mesh instances; only transforms differ.
// Wings are folded via a per-frame rotation.z "dihedral" hinge (see
// animateHazards) so they read from the side. But a perfectly flat
// ShapeGeometry rotated purely around that hinge axis has a degenerate
// case: dead-on from the front (the actual angle the player meets an
// oncoming hazard at) its whole surface projects to a 1D line no matter
// the hinge angle, since flat-shape area and hinge rotation share the
// same axis. Giving the wing real extruded thickness guarantees a
// minimum visible cross-section from every angle, including head-on.
function extrudeFlat(shape, depth = 0.06) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })
  geo.translate(0, 0, -depth / 2)
  return geo
}
const birdWingShape = new THREE.Shape()
birdWingShape.moveTo(0, 0)
birdWingShape.lineTo(0.62, -0.22)
birdWingShape.lineTo(0.18, 0.08)
birdWingShape.lineTo(0, 0)
const birdWingGeo = extrudeFlat(birdWingShape, 0.07)
const birdCreaseShape = new THREE.Shape()
birdCreaseShape.moveTo(0, 0)
birdCreaseShape.lineTo(0.34, -0.12)
birdCreaseShape.lineTo(0.18, 0.08)
birdCreaseShape.lineTo(0, 0)
const birdCreaseGeo = extrudeFlat(birdCreaseShape, 0.075)
const birdBodyGeo = new THREE.ConeGeometry(0.08, 0.5, 8)
const birdNeckGeo = new THREE.ConeGeometry(0.05, 0.32, 8)
const birdEyeGeo = new THREE.SphereGeometry(0.025, 8, 8)
const birdFeatherGeo = new THREE.ConeGeometry(0.045, 0.4, 6)

// Shared geometry for the dragonfly hazard (same reasoning as the bird above)
const dragonflyHeadGeo = new THREE.SphereGeometry(0.13, 10, 8)
const dragonflyEyeGeo = new THREE.SphereGeometry(0.08, 8, 8)
const dragonflyThoraxGeo =
  typeof THREE.CapsuleGeometry === 'function'
    ? new THREE.CapsuleGeometry(0.075, 0.16, 4, 10)
    : new THREE.CylinderGeometry(0.07, 0.075, 0.24, 10)
const dragonflyAbdomenGeo = new THREE.ConeGeometry(0.06, 0.75, 8)
const dragonflyBandGeo = new THREE.TorusGeometry(0.045, 0.012, 6, 10)
const dragonflyWingShape = new THREE.Shape()
dragonflyWingShape.moveTo(0, 0)
dragonflyWingShape.quadraticCurveTo(0.42, 0.16, 0.78, 0.03)
dragonflyWingShape.quadraticCurveTo(0.42, -0.09, 0, 0)
const dragonflyWingGeo = extrudeFlat(dragonflyWingShape, 0.05)

// Shared geometry/materials for the wasp hazard — small, fast, erratic
// (spawns with dive+weave motion). Same extruded-wing trick as the bird
// and dragonfly so it stays readable head-on.
const waspBodyGeo = new THREE.ConeGeometry(0.09, 0.42, 8)
const waspStingerGeo = new THREE.ConeGeometry(0.035, 0.16, 6)
const waspBandGeo = new THREE.TorusGeometry(0.075, 0.02, 6, 10)
const waspEyeGeo = new THREE.SphereGeometry(0.035, 8, 8)
const waspWingShape = new THREE.Shape()
waspWingShape.moveTo(0, 0)
waspWingShape.quadraticCurveTo(0.2, 0.14, 0.4, 0.03)
waspWingShape.quadraticCurveTo(0.2, -0.04, 0, 0)
const waspWingGeo = extrudeFlat(waspWingShape, 0.035)
const waspBodyMat = new THREE.MeshStandardMaterial({ color: 0x2b2320, roughness: 0.55 })
const waspBandMat = new THREE.MeshStandardMaterial({
  color: 0xfbbf24, emissive: 0x92400e, emissiveIntensity: 0.15, roughness: 0.45,
})
const waspWingMat = new THREE.MeshStandardMaterial({
  color: 0xe8eef5, transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.3,
})
const waspEyeMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, emissive: 0x7f1d1d, emissiveIntensity: 0.4, roughness: 0.4 })

function createFlyer(kindId) {
  const def = FLYER_DEFS.find((f) => f.id === kindId) || FLYER_DEFS[0]
  const g = new THREE.Group()
  g.userData.flyerId = def.id
  g.userData.phase = rng() * Math.PI * 2
  g.userData.floaty = !!def.floaty
  g.userData.weave = !!def.weave
  g.userData.dive = !!def.dive
  g.userData.spin = !!def.spin
  g.userData.barrel = !!def.barrel
  g.userData.pattern = patternForFlyer(def)

  if (def.tex) {
    const bill = createBillboardFlyer(def.tex, def.scale || 1.5, !!def.alpha)
    g.add(bill)
    g.userData.billboard = bill.userData.billboard
    return g
  }

  // Seasonal / geometric variants
  if (season.id === 'halloween' || def.id === 'bird' && season.id === 'halloween') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), birdMat)
    g.add(body)
    const left = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 3), birdMat)
    left.rotation.z = 0.8
    left.position.set(-0.35, 0.05, 0)
    const right = left.clone()
    right.rotation.z = -0.8
    right.position.x = 0.35
    g.add(left, right)
    g.userData.wingL = left
    g.userData.wingR = right
  } else if (def.id === 'dragonfly') {
    // Round head with big compound eyes — enlarged so the face reads as a
    // distinct silhouette element even head-on, when the body/wings foreshorten.
    const head = new THREE.Mesh(dragonflyHeadGeo, birdAccentMat)
    head.position.set(0, 0, 0.32)
    g.add(head)
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(dragonflyEyeGeo, dragonflyEyeMat)
      eye.position.set(sx * 0.11, 0.02, 0.36)
      g.add(eye)
    }
    // Short thorax + long tapering segmented abdomen
    const thorax = new THREE.Mesh(dragonflyThoraxGeo, birdMat)
    thorax.rotation.z = Math.PI / 2
    thorax.position.z = 0.14
    g.add(thorax)
    const abdomen = new THREE.Mesh(dragonflyAbdomenGeo, birdAccentMat)
    abdomen.rotation.z = -Math.PI / 2
    abdomen.position.z = -0.28
    g.add(abdomen)
    for (const bz of [-0.1, -0.3, -0.5]) {
      const band = new THREE.Mesh(dragonflyBandGeo, birdMat)
      band.rotation.y = Math.PI / 2
      band.position.z = bz
      g.add(band)
    }
    // Iridescent paper wings — bigger leaf-shaped panels in a deeper tinted
    // material so they stay visible against a light sky instead of nearly
    // disappearing like the old pale/translucent version.
    // Each side is a group of its two wings (fore + hind) so the shared
    // flap/dihedral animation in animateHazards — which only knows about
    // a single wingL/wingR target per bird — lifts both panels together.
    for (const sx of [-1, 1]) {
      const side = new THREE.Group()
      for (const sy of [-1, 1]) {
        const w = new THREE.Mesh(dragonflyWingGeo, dragonflyWingMat)
        w.scale.x = sx
        w.position.set(sx * 0.06, sy * 0.025, 0.14 + sy * 0.06)
        w.rotation.x = -Math.PI / 2
        side.add(w)
      }
      g.add(side)
      if (sx < 0) g.userData.wingL = side
      else g.userData.wingR = side
    }
  } else if (def.id === 'wasp') {
    const body = new THREE.Mesh(waspBodyGeo, waspBodyMat)
    body.rotation.x = Math.PI / 2
    g.add(body)
    const stinger = new THREE.Mesh(waspStingerGeo, waspBodyMat)
    stinger.rotation.x = Math.PI / 2
    stinger.position.z = -0.28
    g.add(stinger)
    for (const bz of [-0.02, -0.11, -0.2]) {
      const band = new THREE.Mesh(waspBandGeo, waspBandMat)
      band.rotation.y = Math.PI / 2
      band.position.z = bz
      g.add(band)
    }
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(waspEyeGeo, waspEyeMat)
      eye.position.set(sx * 0.07, 0.01, 0.19)
      g.add(eye)
    }
    // Small angular wings — same extruded-shape + shared dihedral flap
    // animation as the bird/dragonfly so they stay visible head-on.
    const left = new THREE.Mesh(waspWingGeo, waspWingMat)
    left.scale.x = -1
    left.position.set(0.05, 0.03, 0.05)
    left.rotation.x = -Math.PI / 2
    const right = new THREE.Mesh(waspWingGeo, waspWingMat)
    right.position.set(-0.05, 0.03, 0.05)
    right.rotation.x = -Math.PI / 2
    g.add(left, right)
    g.userData.wingL = left
    g.userData.wingR = right
  } else if (season.id === 'winter') {
    g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), birdMat))
  } else if (season.id === 'valentine') {
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), birdMat)
    a.position.set(-0.12, 0.05, 0)
    const b = a.clone()
    b.position.x = 0.12
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.35, 4), birdMat)
    tip.rotation.x = Math.PI
    tip.position.y = -0.15
    g.add(a, b, tip)
  } else {
    // Folded-paper crane: hinged triangular wings (same fold logic as the
    // player's plane) so the existing flap animation bends them at the root
    // instead of spinning a chunky box around its own middle. Geometry is
    // shared module-level (see birdWingGeo etc.) since birds are the most
    // frequently spawned hazard — only per-instance transforms differ.
    const left = new THREE.Mesh(birdWingGeo, birdMat)
    left.rotation.x = -Math.PI / 2
    left.scale.x = -1
    // Crease panels are children so they flap in lockstep with their wing.
    const leftCrease = new THREE.Mesh(birdCreaseGeo, birdAccentMat)
    leftCrease.position.z = 0.003
    left.add(leftCrease)
    const right = new THREE.Mesh(birdWingGeo, birdMat)
    right.rotation.x = -Math.PI / 2
    const rightCrease = new THREE.Mesh(birdCreaseGeo, birdAccentMat)
    rightCrease.position.z = 0.003
    right.add(rightCrease)
    g.add(left, right)

    const body = new THREE.Mesh(birdBodyGeo, birdMat)
    body.rotation.x = Math.PI / 2
    g.add(body)
    const neck = new THREE.Mesh(birdNeckGeo, birdAccentMat)
    neck.rotation.z = Math.PI * 0.62
    neck.position.set(0, 0.06, 0.28)
    g.add(neck)
    // Tiny painted eye for character
    const eye = new THREE.Mesh(birdEyeGeo, birdEyeMat)
    eye.position.set(0.035, 0.16, 0.42)
    const eye2 = eye.clone()
    eye2.position.x = -0.035
    g.add(eye, eye2)
    // Folded fan tail (three thin blades instead of one plain cone)
    for (const a of [-0.22, 0, 0.22]) {
      const feather = new THREE.Mesh(birdFeatherGeo, birdAccentMat)
      feather.rotation.z = -Math.PI / 2
      feather.rotation.x = a
      feather.position.set(0, 0.02, -0.32)
      g.add(feather)
    }

    g.userData.wingL = left
    g.userData.wingR = right
  }
  attachLethalOutline(g, 0.85)
  return g
}

function pickFlyerKind() {
  // Seasonal bias
  let pool = FLYER_DEFS
    .map((flyer) => ({ ...flyer }))
  if (season.id === 'halloween') {
    pool = pool.map((f) => (f.id === 'bird' ? { ...f, weight: 1.4 } : f))
  }
  if (season.id === 'spring') {
    pool = pool.map((f) => (f.id === 'butterfly' ? { ...f, weight: 1.6 } : f))
  }
  if (season.id === 'summer') {
    pool = pool.map((f) => (f.id === 'kite' || f.id === 'balloon' ? { ...f, weight: f.weight * 1.5 } : f))
  }
  const total = pool.reduce((s, f) => s + f.weight, 0)
  let r = rng() * total
  for (const f of pool) {
    r -= f.weight
    if (r <= 0) return f
  }
  return pool[0]
}

function createScissors() {
  const g = new THREE.Group()
  const bill = createBillboardFlyer('/assets/obstacles/obstacle-scissors.webp', 3.15, true)
  g.add(bill)
  g.userData.billboard = bill.userData.billboard
  return g
}

// Stars are by far the most frequently spawned entity in the game (every
// chunk rolls 1-2), so building fresh geometry + material per spawn was
// pure per-frame GC churn for an object that never changes shape or color.
const starCoreGeo = new THREE.PlaneGeometry(1.55, 1.55)
const starCoreMat = new THREE.MeshBasicMaterial({
  map: loadCutoutTex('/assets/pickup-orb.webp'), transparent: true, alphaTest: 0.18, side: THREE.DoubleSide, depthWrite: false,
})
const starGlowGeo = new THREE.SphereGeometry(0.72, 12, 12)
const starGlowMat = new THREE.MeshBasicMaterial({
  color: 0xfbbf24, transparent: true, opacity: 0.28, depthWrite: false,
})
// Golden variant — a rare tier-transition drop worth 5★. Bigger, hotter,
// and self-lit so it reads as an event, not another pickup.
const starCoreMatGold = new THREE.MeshBasicMaterial({
  map: loadCutoutTex('/assets/pickup-orb.webp'), transparent: true, alphaTest: 0.18,
  side: THREE.DoubleSide, depthWrite: false, color: 0xffd54a,
})
const starGlowMatGold = new THREE.MeshBasicMaterial({
  color: 0xfde68a, transparent: true, opacity: 0.5, depthWrite: false,
})
const starGlowGeoGold = new THREE.SphereGeometry(1.15, 14, 14)

function createStar({ golden = false } = {}) {
  const g = new THREE.Group()
  const core = new THREE.Mesh(starCoreGeo, golden ? starCoreMatGold : starCoreMat)
  core.rotation.y = Math.PI
  core.scale.setScalar(golden ? 1.35 : 1)
  g.add(core)
  // Soft glow shell for readability
  const glow = golden
    ? new THREE.Mesh(starGlowGeoGold, starGlowMatGold)
    : new THREE.Mesh(starGlowGeo, starGlowMat)
  g.add(glow)
  g.userData.core = core
  g.userData.billboard = core
  return g
}

// Shared geometry across every power-up kind — only material color varies.
// Power-ups spawn often enough over a run that per-spawn geometry/material
// construction was avoidable GC churn, same fix as stars/bird/scissors.
const powerGlowGeo = new THREE.SphereGeometry(0.95, 20, 16)
const powerCoreGeoBoost = new THREE.ConeGeometry(0.38, 0.95, 6)
const powerCoreGeoDefault = new THREE.IcosahedronGeometry(0.48, 0)
const powerRingGeo = new THREE.TorusGeometry(0.78, 0.06, 10, 32)
const powerIconGeoBoost = new THREE.PlaneGeometry(1.3, 1.3)
const powerIconGeoDefault = new THREE.PlaneGeometry(0.85, 0.85)
// Materials DO depend on kind (color), but that color is otherwise fixed
// per kind for the session — cache one material set per kind instead of
// rebuilding on every spawn. Cleared on colorblind-palette changes below.
let powerMatCache = {}

function createPowerUp(kind) {
  const meta = POWER_META[kind] || buildPowerMeta()[kind]
  const g = new THREE.Group()
  g.userData.kind = kind
  const col = meta.color
  const isBoostHero = kind === 'boost'

  let mats = powerMatCache[kind]
  if (!mats) {
    mats = {
      glowMat: new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.16, depthWrite: false }),
      coreMat: new THREE.MeshStandardMaterial({
        color: col, emissive: col, emissiveIntensity: 0.75, roughness: 0.22, metalness: 0.35,
      }),
      ringMat: new THREE.MeshStandardMaterial({
        color: 0xfffaf2, emissive: col, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.4,
      }),
      iconMat: null, // built lazily below since texture load can throw
    }
    powerMatCache[kind] = mats
  }

  // Outer soft glow shell
  const glow = new THREE.Mesh(powerGlowGeo, mats.glowMat)
  g.add(glow)

  // Crystal core
  const core = new THREE.Mesh(isBoostHero ? powerCoreGeoBoost : powerCoreGeoDefault, mats.coreMat)
  if (isBoostHero) {
    core.rotation.x = Math.PI
    core.position.y = 0.05
  }
  core.castShadow = true
  g.add(core)

  // Spinning halo ring
  const ring = new THREE.Mesh(powerRingGeo, mats.ringMat)
  ring.rotation.x = Math.PI / 2
  g.add(ring)

  // Icon sprite facing player. Paper-craft cutouts for boost / shield / magnet;
  // remaining kinds keep the flat icon sheet. Phase has no matching asset.
  const NO_ICON_KINDS = new Set(['phase'])
  const PAPER_ICON = {
    boost: '/assets/pickup-boost.webp',
    shield: '/assets/power-shield.webp',
    magnet: '/assets/power-magnet.webp',
    slow: '/assets/power-slow.webp',
    tear: '/assets/power-tear.webp',
    clip: '/assets/power-clip.webp',
    sling: '/assets/power-sling.webp',
  }
  const iconUrl = PAPER_ICON[kind] || `/assets/power-${kind}.webp`
  const paperIcon = Boolean(PAPER_ICON[kind])
  try {
    if (NO_ICON_KINDS.has(kind)) throw new Error('no icon asset')
    if (!mats.iconMat) {
      const tex = paperIcon ? loadCutoutTex(iconUrl) : loadTex(iconUrl)
      mats.iconMat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, alphaTest: paperIcon ? 0.16 : 0, depthWrite: false, side: THREE.DoubleSide,
      })
    }
    const icon = new THREE.Mesh(paperIcon ? powerIconGeoBoost : powerIconGeoDefault, mats.iconMat)
    icon.position.z = 0.55
    icon.rotation.y = Math.PI
    g.add(icon)
    g.userData.billboard = icon
  } catch {
    /* icons optional */
  }

  g.userData.ring = ring
  g.userData.core = core
  g.userData.glow = glow
  g.scale.setScalar(1.2)
  return g
}

// Ink Blast projectile — shared geometry/material like every other spawned
// entity here, since a run can fire dozens of these.
const shotGeo = new THREE.ConeGeometry(0.22, 0.6, 8)
const shotMat = new THREE.MeshStandardMaterial({
  color: 0x2b2540, emissive: 0x4c3d80, emissiveIntensity: 0.9, roughness: 0.35, metalness: 0.2,
})
function createShot() {
  const m = new THREE.Mesh(shotGeo, shotMat)
  m.rotation.x = Math.PI / 2
  return m
}

function createCloud() {
  const g = new THREE.Group()
  // Soft gray underside lumps first (slightly lower/behind) for a hint of
  // volume, then bright puffs on top — randomized per-cloud so the sky
  // doesn't read as one shape copy-pasted everywhere.
  const lowPower = settings.lowPower
  const lumpCount = lowPower ? 2 : 4 + ((rng() * 3) | 0)
  const segs = lowPower ? 6 : 10
  for (let i = 0; i < lumpCount; i++) {
    const t = i / Math.max(1, lumpCount - 1)
    const x = (t - 0.5) * 2.6 + (rng() - 0.5) * 0.3
    const s = 0.75 + rng() * 0.7
    if (!lowPower) {
      const shade = new THREE.Mesh(new THREE.SphereGeometry(s * 0.92, segs - 2, segs - 2), cloudShadeMat)
      shade.position.set(x, -s * 0.22, (rng() - 0.5) * 0.25 - 0.1)
      g.add(shade)
    }
    const puff = new THREE.Mesh(new THREE.SphereGeometry(s, segs, segs), cloudMat)
    puff.position.set(x, (rng() - 0.5) * 0.3, (rng() - 0.5) * 0.3)
    g.add(puff)
  }
  return g
}

function createRing() {
  // No rotation: default torus orientation faces its hole toward +Z, i.e.
  // toward the approaching player, so it reads as a hoop to fly through
  // instead of projecting edge-on as a solid bar.
  const m = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.14, 12, 32), ringMat)
  // Soft glow halo so the guide ring reads as an inviting target, not a thin hoop
  const glow = new THREE.Mesh(
    new THREE.TorusGeometry(1.4, 0.2, 8, 32),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide,
    }),
  )
  m.add(glow)
  return m
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
applySkin(getEquippedSkinId())

const keys = new Set()
const mouse = { nx: 0, ny: 0 }
const stick = { x: 0, y: 0, active: false, pointerId: null }
/** Co-op player 2 wind stick */
const windStick = { x: 0, y: 0, active: false, pointerId: null }
let slingHold = 0
let paperPushCooldown = 0
/** Temporary speed impulse from boost power / sling (decays) */
let speedBoost = 0
/** Post-hit invulnerability (shield break, etc.) */
let invuln = 0
/** Guardian Crease upgrade: free crash-saves remaining this run */
let guardianLeft = 0
/** Crumple/damage tint timer after a shield absorbs a hazard */
let damageFlash = 0
const _damageOrigColor = new THREE.Color()
const _damageTint = new THREE.Color(0x6b5648)
const _zoneFogColor = new THREE.Color()
/** Crash sequence timer before game-over UI settles */
let crashT = 0
let crashReason = ''
let baseFov = 60
let fovPunch = 0
/** Mouse screen position 0–1 (updated continuously for aim mode) */
const mouseScreen = { x: 0.5, y: 0.5, has: false }
/** Target world position for mouse-aim mode */
const mouseTarget = { x: 0, y: 8 }

let state = 'menu'
let simulationPaused = false
let manualPause = false
const pauseOverlay = $('pause-overlay')
const pauseBtn = $('pause-btn')
let distance = 0
let stars = 0
let speed = 28
let planeY = 8
let planeX = 0
let velY = 0
let velX = 0
/** One-frame upward pop for shield/guardian saves in aim mode. */
let rescueLift = 0
let pitch = 0
let roll = 0
let windTimer = 7
let windActive = 0
let windForce = 0
let windWarningTimer = 0
let pendingWindActive = 0
let pendingWindForce = 0
const WIND_WARNING_SECONDS = 0.45
let activeTwist = null
let nextSpawnZ = 40
let shake = 0
let hitStopTimer = 0
let spawnUnfold = 1
let fireCooldown = 0
let elapsed = 0
// Slow-mo is a real time-dilation power, not just a cruise-speed tweak: the
// world scroll and the hazard motion clock both run through this factor so
// hazards genuinely hang in the air while you line up.
const SLOWMO_WORLD_SCALE = 0.62
/** Hazard/pattern clock — advances slower than `elapsed` during slow-mo. */
let hazardClock = 0
let slowmoActive = false
/** Debug/test tag of the most recent skill-reward payout (thread/gauntlet). */
let lastRewardTag = null
let launchGraceSeconds = 0
let activePower = null
let bannerTimer = 0
let zoneBannerTimer = 0
/** @type {any[]} */
const entities = []
const clouds = []
const MIN_Y = 2.2
const MAX_Y = 16.5
const MAX_X = 13
const MAX_VEL = 38

// ---------------------------------------------------------------------------
// Zone weather particles — rain in the storm zone, drifting motes in aurora
// ---------------------------------------------------------------------------
function createWeatherFx(count, color, size, opacity) {
  const geo = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)
  const baseX = new Float32Array(count)
  const phase = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    baseX[i] = (Math.random() - 0.5) * 40
    positions[i * 3] = baseX[i]
    positions[i * 3 + 1] = Math.random() * 30
    positions[i * 3 + 2] = 4 + Math.random() * 50
    phase[i] = Math.random() * Math.PI * 2
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({
    color, size, transparent: true, opacity, depthWrite: false, sizeAttenuation: true,
  })
  const pts = new THREE.Points(geo, mat)
  pts.visible = false
  pts.frustumCulled = false
  pts.userData = { baseX, phase }
  scene.add(pts)
  return pts
}
const rainFx = createWeatherFx(320, 0xbcd6ea, 0.1, 0.55)
const petalFx = createWeatherFx(70, 0xc8d4ff, 0.32, 0.65)

function updateWeatherFx(dt) {
  const wantRain = currentZoneId === 'storm' && state === 'playing'
  const wantPetals = currentZoneId === 'aurora' && state === 'playing'
  rainFx.visible = wantRain
  petalFx.visible = wantPetals
  if (wantRain) {
    rainFx.position.copy(camera.position)
    const pos = rainFx.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) - dt * 26
      if (y < 0) y += 30
      pos.setY(i, y)
    }
    pos.needsUpdate = true
  }
  if (wantPetals) {
    petalFx.position.copy(camera.position)
    const pos = petalFx.geometry.attributes.position
    const { baseX, phase } = petalFx.userData
    for (let i = 0; i < pos.count; i++) {
      phase[i] += dt * 0.8
      let y = pos.getY(i) - dt * 2.4
      if (y < 0) y += 30
      pos.setY(i, y)
      pos.setX(i, baseX[i] + Math.sin(phase[i]) * 2.2)
    }
    pos.needsUpdate = true
  }
}

function clearEntities() {
  for (const e of entities) scene.remove(e.mesh)
  entities.length = 0
  for (const c of clouds) scene.remove(c)
  clouds.length = 0
  if (ghostMesh) {
    scene.remove(ghostMesh)
    ghostMesh = null
  }
  for (const s of windStreaks) s.visible = false
  for (const c of confetti) {
    c.visible = false
    c.userData.life = 0
  }
}

function pickHazardType(zone) {
  const bias = zone.hazardBias
  // A tier's named modifier leans the mix on top of the zone's own bias — a
  // Scissor Storm over the Harbor still reads as the Harbor, just bladier.
  const tierBias = endlessTier().hazardBias
  const foldBias = activeFold?.hazardBias
  const weightOf = (kind, base) =>
    base * bias[kind] * (tierBias?.[kind] ?? 1) * (foldBias?.[kind] ?? 1) * difficulty.hazardScale
  const weights = [
    ['building', weightOf('building', 0.28)],
    ['bird', weightOf('bird', 0.22)],
    ['scissors', weightOf('scissors', 0.16)],
  ]
  const total = weights.reduce((s, w) => s + w[1], 0)
  let r = rng() * Math.max(total, 0.01)
  for (const [t, w] of weights) {
    r -= w
    if (r <= 0) return t
  }
  return null
}

function spawnChunk(z) {
  if (runKind === 'tutorial') return
  if (runKind === 'layout' && layoutPlay) return

  const tier = endlessTier()
  // The shipped ramp saturates at 700m; tier headroom keeps flock sizes and
  // building heights growing past it instead of freezing for the rest of the run.
  const ramp = Math.min(1, distance / 700) + tier.hazardBonus
  const cfg = difficulty
  const zone = activeZoneAt(distance)
  const recovering = distance < bossRecoveryUntil
  const waveSpacing =
    getWaveSpacing({ difficultyId: difficulty.id, distance, recovery: recovering }) *
    cfg.gap * tier.spacingScale
  const wave = createPacingWave({
    index: Math.max(0, Math.round((z - 35) / Math.max(1, waveSpacing))),
    difficultyId: difficulty.id,
    afterBoss: recovering,
  })
  const safeLane = recovering ? null : wave.starLane
  if (safeLane !== null) activePassageLane = safeLane
  const laneSpread = getSideBuildingSpread({ gap: cfg.gap, random: rng })
  let leftInnerEdge = null
  let rightInnerEdge = null

  const safeAirX = (maxAbs, entityRadius) => getSafeSpawnX({
    random: rng,
    safeLane: safeLane ?? 0,
    maxAbs,
    damageRadius: getObstacleDamageRadius({
      entityRadius,
      planeRadius: PLANE_COLLISION_RADIUS,
    }),
  })
  const safePickupX = () => {
    if (safeLane === null) return (rng() - 0.5) * 11
    const center = PASSAGE_LANE_X[safeLane + 1]
    return center + (rng() - 0.5) * 1.6
  }

  if (!recovering) maybeSpawnGroundDecor(z)

  const early = distance < 90
  const sideBuildings = []
  for (const side of recovering ? [] : [-1, 1]) {
    if (rng() < (early ? 0.52 : 0.82)) {
      const w = 2.5 + rng() * 3.5
      const h = getFlyableBuildingHeight({
        requestedHeight: (5 + rng() * (8 + ramp * 8)) * cfg.buildingH,
        maxAltitude: MAX_Y,
      })
      const d = 2.5 + rng() * 3
      const mat = buildingMats[(rng() * buildingMats.length) | 0]
      const b = createBuilding(w, h, d, mat)
      const radius = Math.max(w, d) * 0.5
      b.position.x = side * laneSpread
      b.position.z = z + (rng() - 0.5) * 6
      scene.add(b)
      const buildingEntity = { mesh: b, type: 'building', radius, halfH: h, passageLane: safeLane }
      entities.push(buildingEntity)
      sideBuildings.push(buildingEntity)
      if (side === -1) leftInnerEdge = -laneSpread + radius
      else rightInnerEdge = laneSpread - radius
    }
  }
  // Thread-the-gap: when both towers rose and their inner faces leave a tight
  // slot, mark the pair so a clean pass through it pays (see collision loop).
  if (leftInnerEdge !== null && rightInnerEdge !== null && sideBuildings.length === 2) {
    const gapWidth = rightInnerEdge - leftInnerEdge
    if (isThreadGapWidth(gapWidth)) {
      // One shared corridor object per gap — the collision loop flips its
      // `paid` flag so a pass can never cash in twice (once per tower).
      const corridorTop = Math.min(sideBuildings[0].halfH, sideBuildings[1].halfH)
      const corridor = { minX: leftInnerEdge, maxX: rightInnerEdge, maxY: corridorTop, paid: false }
      for (const e of sideBuildings) e.thread = corridor
    }
  }

  const ht = recovering || early ? null : pickHazardType(zone)
  if (ht === 'building') {
    const w = 2 + rng() * 3
    const h = getFlyableBuildingHeight({
      requestedHeight: (6 + rng() * (6 + ramp * 6)) * cfg.buildingH,
      maxAltitude: MAX_Y,
    })
    const d = 2 + rng() * 2.5
    const radius = Math.max(w, d) * 0.5
    // Side buildings can occasionally spawn close enough in that a center
    // building would otherwise be free to close off the entire flyable
    // corridor — skip it this chunk rather than risk sealing the width shut.
    const safeRange = getCenterBuildingSafeRange({ leftInnerEdge, rightInnerEdge, radius, gap: cfg.gap })
    if (safeRange) {
      const b = createBuilding(w, h, d, buildingMats[(rng() * buildingMats.length) | 0])
      b.position.x = safeRange.minX + rng() * (safeRange.maxX - safeRange.minX)
      b.position.z = z
      scene.add(b)
      entities.push({ mesh: b, type: 'building', radius, halfH: h, passageLane: safeLane })
    }
  } else if (ht === 'bird') {
    // Late-game ramp + Hard's birdCount multiplier can otherwise stack into an
    // 8-bird pileup in one chunk — cap the swarm so density stays readable.
    const count = Math.min(5, Math.max(1, Math.round((1 + rng() * (2 + ramp * 3)) * cfg.birdCount)))
    for (let i = 0; i < count; i++) {
      const def = pickFlyerKind()
      const flyer = createFlyer(def.id)
      const anchorX = safeAirX(6 * cfg.gap, def.radius)
      const anchorY = 5 + rng() * 8.5
      flyer.position.set(anchorX, anchorY, z + i * 2.5)
      scene.add(flyer)
      // Motion is an offset from this anchor, resolved fresh each frame from
      // the clock. The lateral amplitude is clamped against the reserved lane
      // up front so the fairness guarantee covers the hazard's whole path,
      // not just the frame it spawned on.
      const pattern = flyer.userData.pattern
      const motionScale = getTierMotionScale(tier.tier)
      const amplitudeX = clampAmplitudeToLane({
        requestedAmplitude: (0.9 + rng() * 0.7) * motionScale,
        anchorX,
        safeLaneX: safeLane === null ? null : PASSAGE_LANE_X[safeLane + 1],
        damageRadius: getObstacleDamageRadius({
          entityRadius: def.radius,
          planeRadius: PLANE_COLLISION_RADIUS,
        }),
        pattern,
      })
      flyer.userData.anchorX = anchorX
      flyer.userData.anchorY = anchorY
      flyer.userData.amplitudeX = amplitudeX
      flyer.userData.amplitudeY = (0.7 + rng() * 0.6) * motionScale
      flyer.userData.motionSpeed = (6.5 + rng() * 3) * motionScale
      entities.push({
        mesh: flyer,
        type: 'bird',
        flyerId: def.id,
        label: def.label,
        radius: def.radius,
        passageLane: safeLane,
      })
    }
  } else if (ht === 'scissors') {
    const sc = createScissors()
    sc.position.set(safeAirX(4.5 * cfg.gap, 1.6), 4.4 + rng() * 10.2, z)
    scene.add(sc)
    entities.push({ mesh: sc, type: 'scissors', radius: 1.6, passageLane: safeLane })
    // Scissor squadron — a rarer second blade further down the lane, more
    // likely to appear the deeper into a run you get (altitude tiers lean in).
    if (rng() < 0.12 + ramp * 0.22 + tier.tier * 0.02) {
      const sc2 = createScissors()
      sc2.position.set(safeAirX(4.5 * cfg.gap, 1.6), 4.4 + rng() * 10.2, z + 6 + rng() * 4)
      scene.add(sc2)
      entities.push({ mesh: sc2, type: 'scissors', radius: 1.6, passageLane: safeLane })
    }
  }

  // Occasional mixed flyer even on non-bird chunks
  if (rng() < 0.18 + ramp * 0.1) {
    const def = pickFlyerKind()
    const flyer = createFlyer(def.id)
    flyer.position.set(safeAirX(5.5 * cfg.gap, def.radius), 4.4 + rng() * 10.2, z + 4 + rng() * 6)
    scene.add(flyer)
    entities.push({
      mesh: flyer,
      type: 'bird',
      flyerId: def.id,
      label: def.label,
      radius: def.radius,
      passageLane: safeLane,
    })
  }

  const ufx = activeUpgradeEffects
  const starPlan = applyStarLaneTelegraph(planStarSpawns({
    random: rng,
    starChance: cfg.starChance,
    powerChance: cfg.powerChance,
    ramp,
    starChanceMul: ufx.starChanceMul,
    powerChanceMul: ufx.powerChanceMul,
    twistStarMul: activeTwist?.starMul || 1,
    doubleStarBonus: ufx.doubleStarBonus,
  }), { distance, midY: 8 })
  // Airborne hazards sharing this chunk's depth band, widened by how far each
  // one's pattern can swing. A star must clear a hazard's whole path, not the
  // spot it happens to occupy at spawn, or it becomes bait.
  const chunkHazards = entities
    .filter((entity) => (
      (entity.type === 'bird' || entity.type === 'scissors') &&
      Math.abs(entity.mesh.position.z - z) < 14
    ))
    .map((entity) => ({
      x: entity.mesh.position.x,
      radius: (entity.radius || 0) + (entity.mesh.userData?.amplitudeX || 0),
    }))

  // Stars — often 1–2; Gold Rush raises cluster odds through planStarSpawns
  for (let s = 0; s < starPlan.starCount; s++) {
    const st = createStar()
    const telegraph = starPlan.telegraph && s === 0
    const y = telegraph ? starPlan.telegraphY + (rng() - 0.5) * 0.8 : 5.2 + rng() * 8.4
    // Mixing stars across lanes is what makes them a decision rather than a
    // freebie collected by sitting still on the reserved lane.
    const starLane = chooseStarLane({
      random: rng,
      safeLane,
      hazards: chunkHazards,
      telegraph,
      planeRadius: PLANE_COLLISION_RADIUS,
    })
    const x = starLane === null
      ? (rng() - 0.5) * 11
      : getStarX({ lane: starLane, random: rng, spread: telegraph ? 0.45 : 1.6 })
    if (telegraph) st.scale.setScalar(starPlan.telegraphScale)
    st.position.set(x, y, z + rng() * 8)
    scene.add(st)
    entities.push({ mesh: st, type: 'star', radius: telegraph ? 1.15 : 0.9, cluster: starPlan.cluster, telegraph })
  }
  if (starPlan.cluster && starPlan.starCount > 0 && ufx.doubleStarBonus > 0) {
    powerBanner.textContent = '💰 Gold Rush cluster!'
    powerBanner.classList.remove('hidden')
    bannerTimer = Math.max(bannerTimer, 1.4)
  }
  // Powers — boosted chance; boost is more common early in pool
  if (starPlan.powerSpawn) {
    const classic = POWER_KINDS.filter((k) => !TOY_KINDS.includes(k))
    let pool
    if (rng() < 0.28) pool = TOY_KINDS
    else if (rng() < 0.35) pool = ['boost'] // weight boost higher
    else pool = classic
    const kind = pool[(rng() * pool.length) | 0]
    const pu = createPowerUp(kind)
    // Prefer mid-lane height where player flies
    pu.position.set(safePickupX(), 5.4 + rng() * 8.2, z + 1 + rng() * 5)
    scene.add(pu)
    entities.push({ mesh: pu, type: 'power', radius: 1.35, kind })
  }
}

let bossCount = 0
function clearBossApproachHazards() {
  for (let index = entities.length - 1; index >= 0; index -= 1) {
    const entity = entities[index]
    if (!shouldClearForBossApproach({ type: entity.type, z: entity.mesh.position.z })) continue
    scene.remove(entity.mesh)
    entities.splice(index, 1)
  }
}

function spawnBoss(z = 70, forcedKind = null) {
  if (bossActive && entities.some((entity) => entity.type === 'boss' && !entity.cleared)) return
  clearBossApproachHazards()
  const encounterIndex = bossCount
  bossCount++
  const kind = forcedKind && ['scissors', 'wind', 'stapler'].includes(forcedKind)
    ? forcedKind
    : bossKindForIndex(encounterIndex)
  const director = createBossEncounter({
    kind,
    difficulty: difficulty.id,
    encounterSeed: encounterIndex,
    reducedMotion: settings.reducedMotion,
    colorblind: settings.colorblindPowers,
  })
  const openingSnap = director.snapshot()
  // Build the open portal to the *same* passage the collision test uses.
  const gate = createBossMesh(kind, openingSnap.passage)
  gate.position.set(0, 0, z)
  gate.userData.gapY = openingSnap.safeY
  if (gate.userData.safeRing) gate.userData.safeRing.position.y = openingSnap.safeY
  // Park side décor relative to the committed lane immediately.
  if (gate.userData.left) gate.userData.left.position.y = openingSnap.safeY
  if (gate.userData.right) gate.userData.right.position.y = openingSnap.safeY
  if (gate.userData.leftLip) gate.userData.leftLip.position.y = openingSnap.safeY
  if (gate.userData.rightLip) gate.userData.rightLip.position.y = openingSnap.safeY
  if (gate.userData.fanL) gate.userData.fanL.position.y = openingSnap.safeY
  if (gate.userData.fanR) gate.userData.fanR.position.y = openingSnap.safeY
  if (gate.userData.topJaw) {
    gate.userData.topJaw.position.y = openingSnap.safeY + openingSnap.passage.halfHeight + 0.85
  }
  if (gate.userData.bottomJaw) {
    gate.userData.bottomJaw.position.y = openingSnap.safeY - openingSnap.passage.halfHeight - 0.85
  }
  const badgeLayout = getBossBadgeLayout({
    halfWidth: openingSnap.passage.halfWidth,
    halfHeight: openingSnap.passage.halfHeight,
    gapY: openingSnap.safeY,
  })
  for (const badge of gate.userData.artBadges || []) {
    const slot = badgeLayout[badge.userData.badgeSlot]
    if (!slot) continue
    badge.position.set(slot.x, slot.y, slot.z)
    badge.scale.x = slot.scaleX
  }
  scene.add(gate)
  const opening = describeBossPhase(openingSnap)
  entities.push({
    mesh: gate,
    type: 'boss',
    kind,
    radius: 4,
    halfH: 20,
    isBoss: true,
    director,
    lastBossPhase: 'warning',
  })
  bossActive = true
  // Brief approach invuln so a late hazard can't snipe the commit.
  invuln = Math.max(invuln, 0.35)
  zoneBanner.textContent = `${bossBannerEmoji(kind)} BOSS · ${opening.headline}`
  zoneBanner.classList.remove('hidden')
  zoneBannerTimer = 3.6
  track('boss_start', { distance: Math.floor(distance), kind })
  audio.windGust()
  Haptic.power()
}

/** A lighter-weight "event" spawned at the midpoint between boss gates
 *  (every 250m, offset from the 500m boss cadence) — a deliberate cluster
 *  of hazards instead of the usual sparse random spawns, so the mid-run
 *  pacing has more texture than "quiet until the next boss". */
function spawnMiniGauntlet(z = 60) {
  const safeLane = PASSAGE_LANES[(Math.floor(rng() * PASSAGE_LANES.length))]
  const blockedLanes = PASSAGE_LANES.filter((lane) => lane !== safeLane)
  const placements = []
  activePassageLane = safeLane
  if (rng() < 0.5) {
    // Scissors zigzag: weave between the two blocked lanes while leaving a
    // full lateral lane open for the player to commit to.
    const lanes = [blockedLanes[0], blockedLanes[1], blockedLanes[0]]
    lanes.forEach((lane, i) => {
      const sc = createScissors()
      const x = PASSAGE_LANE_X[lane + 1] + (rng() - 0.5) * 1.2
      sc.position.set(x, 8 + rng() * 6, z + i * 9)
      scene.add(sc)
      entities.push({ mesh: sc, type: 'scissors', radius: 1.6, passageLane: safeLane })
      placements.push({ x, radius: 1.6, passageLane: safeLane })
    })
  } else {
    // Flyer formation: four hazards share the two blocked lanes at staggered
    // depths, preserving one readable lateral route instead of a full wall.
    const count = 4
    for (let i = 0; i < count; i++) {
      const def = pickFlyerKind()
      const flyer = createFlyer(def.id)
      const lane = blockedLanes[i % blockedLanes.length]
      const x = PASSAGE_LANE_X[lane + 1] + (rng() - 0.5) * 1.2
      flyer.position.set(x, 6 + rng() * 12, z + i * 3.5 + (rng() - 0.5) * 1.5)
      scene.add(flyer)
      entities.push({
        mesh: flyer, type: 'bird', flyerId: def.id, label: def.label, radius: def.radius, passageLane: safeLane,
      })
      placements.push({ x, radius: def.radius, passageLane: safeLane })
    }
  }
  const passage = choosePassageLane({ hazards: placements, preferredLane: safeLane })
  const laneLabel = safeLane < 0 ? 'LEFT' : safeLane > 0 ? 'RIGHT' : 'CENTER'
  // Lane-payoff marker: an invisible tripwire behind the last hazard. Passing
  // it while holding the advertised lane banks a gauntlet reward — the same
  // promise-for-payout contract boss gates already honor.
  const gauntletLaneX = PASSAGE_LANE_X[safeLane + 1]
  const marker = new THREE.Object3D()
  marker.position.set(gauntletLaneX, 9, z - 2)
  scene.add(marker)
  entities.push({ mesh: marker, type: 'gauntlet', gauntletLaneX, cleared: false })
  zoneBanner.textContent = passage.guaranteed
    ? `⚡ Hazard Gauntlet · ${laneLabel} lane open`
    : '⚡ Hazard Gauntlet · find the widest gap'
  zoneBanner.classList.remove('hidden')
  zoneBannerTimer = 2
  audio.windGust()
  Haptic.tap()
}

function journeyObjectiveText() {
  if (!journeyRunConfig?.objective || !journeyTelemetry) return ''
  const result = resolveJourneyObjective(journeyRunConfig.objective, journeyTelemetry)
  const labels = {
    'shortcut-gates': `Gates ${result.value}/${result.target}`,
    'near-miss': `Close calls ${result.value}/${result.target}`,
    shieldless: journeyTelemetry.shieldUsed ? 'Shield used · finish still counts' : 'Keep the shield folded',
    'star-trail': `Trail stars ${result.value}/${result.target}`,
    rival: journeyTelemetry.rivalBeaten ? 'Red Dart beaten' : 'Beat Red Dart',
    completion: 'Reach the destination',
  }
  return labels[result.kind] || result.label
}

function updateJourneyObjectiveHud() {
  const visible = runKind === 'journey' && !!journeyRunConfig && state === 'playing'
  journeyObjectiveHud?.classList.toggle('hidden', !visible)
  if (visible && journeyObjectiveVal) journeyObjectiveVal.textContent = journeyObjectiveText()
}

function dispatchJourneyEncounter(event) {
  if (!event || !journeyTelemetry || journeyTelemetry.completedEventIds.includes(event.id)) return
  const eventStart = entities.length
  const lane = event.lanes?.[event.params?.variant % Math.max(1, event.lanes.length)] ?? 0
  switch (event.type) {
  case 'formation':
  case 'rooftop-gap':
    spawnMiniGauntlet(64)
    for (const entity of entities.slice(eventStart)) {
      entity.journeyMotion = event.type === 'formation'
        ? { originX: entity.mesh.position.x, amplitude: 3.5, speed: event.params?.speed || 2.4, direction: event.params?.direction || 1 }
        : null
    }
    break
  case 'gust':
    windActive = 2.2
    windForce = (event.params?.direction || 1) * 22 * (event.params?.strength || 0.7)
    windBanner.classList.remove('hidden')
    audio.windGust()
    break
  case 'shortcut-gate': {
    spawnBoss(82, event.params?.kind || null)
    const gate = entities.at(-1)
    if (gate?.type === 'boss') {
      gate.journeyGate = true
      gate.journeyGateRequired = event.params?.required !== false
      gate.journeyGateBonus = !!event.params?.bonus
      gate.mesh.position.x = lane * 1.4
      journeyTelemetry.shortcutGatesTotal += gate.journeyGateRequired ? 1 : 0
    }
    showFlightFeedback('SHORTCUT FORK · fly the glowing ring', 'route', 1.4)
    pulseFlightImpact('route')
    audio.shortcutGate()
    break
  }
  case 'visibility-pocket':
    journeyVisibilityTimer = Math.max(journeyVisibilityTimer, Number(event.params?.duration) || 5)
    scene.fog.far = Math.max(68, 145 * (1 - (Number(event.params?.density) || 0.75) * 0.45))
    break
  case 'reveal':
    journeyVisibilityTimer = 0
    scene.fog.far = (settings.reducedMotion ? 260 : 320) * (activeTwist?.fogMul ?? 1)
    break
  case 'rival':
    notifications.show('🔺 Red Dart cuts across the aurora — hold your line!', {
      duration: settings.reducedMotion ? 1800 : 3000,
    })
    break
  case 'boss-gate':
    spawnBoss(78, event.params?.kind || (journeyRunConfig?.chapter === 2 ? 'stapler' : null))
    {
      const finaleGate = entities.at(-1)
      if (finaleGate?.type === 'boss') {
        finaleGate.journeyGate = true
        finaleGate.journeyGateRequired = event.params?.required !== false
        journeyTelemetry.shortcutGatesTotal += finaleGate.journeyGateRequired ? 1 : 0
      }
    }
    break
  default:
    spawnMiniGauntlet(64)
    break
  }
  journeyTelemetry.completedEventIds.push(event.id)
  for (const entity of entities.slice(eventStart)) entity.journeyEventId = event.id
  zoneBanner.textContent = event.type.replaceAll('-', ' ')
  zoneBanner.classList.remove('hidden')
  zoneBannerTimer = 1.6
  track('journey_encounter_started', { routeId: journeyRunConfig.routeId, eventId: event.id, type: event.type })
}

function spawnLayoutItems() {
  if (!layoutPlay) return
  for (const it of layoutPlay.items) {
    let mesh
    let ent
    if (it.t === 'building') {
      const h = 8 + (it.h || 0)
      mesh = createBuilding(3, h, 3, buildingMats[0])
      mesh.position.set(it.x, 0, it.z)
      ent = { mesh, type: 'building', radius: 1.8, halfH: h }
    } else if (it.t === 'bird') {
      mesh = createBird()
      mesh.position.set(it.x, it.y || 8, it.z)
      mesh.rotation.y = Math.PI
      ent = { mesh, type: 'bird', radius: 0.7 }
    } else if (it.t === 'scissors') {
      mesh = createScissors()
      mesh.position.set(it.x, it.y || 8, it.z)
      ent = { mesh, type: 'scissors', radius: 1.6 }
    } else if (it.t === 'star') {
      mesh = createStar()
      mesh.position.set(it.x, it.y || 8, it.z)
      ent = { mesh, type: 'star', radius: 0.75 }
    } else if (it.t === 'power') {
      const kind = POWER_KINDS[(rng() * POWER_KINDS.length) | 0]
      mesh = createPowerUp(kind)
      mesh.position.set(it.x, it.y || 8, it.z)
      ent = { mesh, type: 'power', radius: 1, kind }
    }
    if (mesh) {
      scene.add(mesh)
      entities.push(ent)
    }
  }
}

function spawnTutorial() {
  tutorialHintsShown = new Set()
  tutorialHintTimer = 0
  tutorialHintEl?.classList.add('hidden')
  const rings = [
    [0, 8, 25], [2, 10, 45], [-2, 7, 65], [0, 12, 90], [3, 9, 115], [-3, 11, 140], [0, 8, 170],
  ]
  for (const [x, y, z] of rings) {
    const ring = createRing()
    ring.position.set(x, y, z)
    scene.add(ring)
    entities.push({ mesh: ring, type: 'ring', radius: 1.5 })
  }
  // gentle side buildings
  for (let z = 30; z < 200; z += 40) {
    for (const side of [-1, 1]) {
      const b = createBuilding(3, 6, 3, buildingMats[0])
      b.position.set(side * 14, 0, z)
      scene.add(b)
      entities.push({ mesh: b, type: 'building', radius: 1.8, halfH: 6 })
    }
  }
  // A star and a boost power-up along the path so first-timers see what they do
  const star = createStar()
  star.position.set(2, 10, 55)
  scene.add(star)
  entities.push({ mesh: star, type: 'star', radius: 0.9 })
  const boost = createPowerUp('boost')
  boost.position.set(-3, 9, 128)
  scene.add(boost)
  entities.push({ mesh: boost, type: 'power', radius: 1.35, kind: 'boost' })
}

// One-time contextual tips shown as a first-time player progresses through the tutorial.
const TUTORIAL_HINTS = [
  { at: 0, text: 'Steer with your mouse, arrow keys, or drag — thread the glowing rings!' },
  { at: 40, text: 'Nice flying! Keep chasing the rings ahead.' },
  { at: 55, text: '⭐ Stars add to your score — fly through them.' },
  { at: 110, text: 'Fly close past a building without hitting it for a near-miss combo!' },
  { at: 125, text: 'Chain near-misses to ignite Combo Fever — a short score multiplier burst!' },
  { at: 128, text: '⚡ Power-ups give you a special boost — grab one!' },
  { at: 160, text: 'Almost there — line up the last ring!' },
]
let tutorialHintsShown = new Set()
const tutorialHintEl = $('tutorial-hint')
let tutorialHintTimer = 0
function checkTutorialHints(dt) {
  if (runKind !== 'tutorial' || !tutorialHintEl) return
  for (const hint of TUTORIAL_HINTS) {
    if (!tutorialHintsShown.has(hint.at) && distance >= hint.at) {
      tutorialHintsShown.add(hint.at)
      tutorialHintEl.textContent = hint.text
      tutorialHintEl.classList.remove('hidden')
      tutorialHintTimer = 3.6
      break
    }
  }
  if (tutorialHintTimer > 0) {
    tutorialHintTimer -= dt
    if (tutorialHintTimer <= 0) tutorialHintEl.classList.add('hidden')
  }
}

function clearPower() {
  activePower = null
  if (shieldBubble) shieldBubble.visible = false
  powerHud.classList.add('hidden')
  powerBanner.classList.add('hidden')
  boostSafetyCue?.classList.add('hidden')
  renderer.toneMappingExposure = activeZoneAt(distance).exposure
  // restore wings
  const wl = plane.userData.wingL
  const wr = plane.userData.wingR
  if (wl) {
    wl.visible = true
    wl.scale.set(1, 1, 1)
    wl.rotation.z = 0
  }
  if (wr) {
    wr.visible = true
    wr.scale.set(1, 1, 1)
    wr.rotation.z = 0
  }
  tearSide = 0
}

function activatePower(kind) {
  const meta = POWER_META[kind] || buildPowerMeta()[kind]
  if (!meta) return

  const fx = activeUpgradeEffects
  const duration = getPowerDuration({
    kind,
    baseDuration: meta.duration,
    shieldDurationMul: fx.shieldDurationMul,
  }).duration
  // Catching the same power again used to wipe its remaining timer through
  // clearPower() — a strictly worse outcome for a lucky grab. Same-kind now
  // tops the timer back to full; switching kinds still replaces (one power
  // slot keeps HUD + physics toys sane) but refunds meters for lost time.
  const pickup = resolvePowerPickup({ currentKind: activePower?.kind ?? null, nextKind: kind })
  if (pickup.mode === 'refresh' && activePower) {
    activePower.timeLeft = duration
    activePower.duration = Math.max(activePower.duration, duration)
    distance += pickup.refundMeters
    audio.powerUp(kind)
    if (settings.haptics) Haptic.collect()
    powerFill.style.width = '100%'
    powerBanner.textContent = `${meta.label} refreshed · +${pickup.refundMeters}m`
    powerBanner.classList.remove('hidden')
    bannerTimer = 1.6
    showFlightFeedback('POWER REFRESHED', 'power', 1.0)
    spawnConfetti(planeX, planeY, 0, 'fever')
    runStats.powers++
    track('power_refresh', { kind })
    return
  }

  // Always clear previous power visuals cleanly
  clearPower()
  // clearPower nulls activePower — restore wings/shield already handled

  activePower = { kind, timeLeft: duration, duration, slingCharged: false }
  if (pickup.mode === 'replace') {
    // Small consolation for the timer the swapped-out power had left.
    distance += pickup.refundMeters
    showFlightFeedback(`SWAP · +${pickup.refundMeters}m`, 'power', 0.9)
  }
  audio.powerUp(kind)
  if (settings.haptics) Haptic.power()
  powerLabel.textContent = meta.label
  powerFill.style.width = '100%'
  powerHud.classList.remove('hidden')
  powerBanner.textContent = meta.banner
  powerBanner.classList.remove('hidden')
  bannerTimer = 2.4
  showFlightFeedback(`POWER · ${meta.label}`, 'power', 1.2)
  pulseFlightImpact('power')
  runStats.powers++
  track('power_pickup', { kind })

  if ((kind === 'shield' || kind === 'phase') && shieldBubble) {
    shieldBubble.visible = true
    shieldBubble.material.color.setHex(meta.color)
  }

  if (kind === 'boost') {
    audio.boostRoar()
    // Strong, readable boost — additive impulse + sustained cruise.
    // Kept modest (not a flat multiplier stack) so the sudden speed jump
    // doesn't outrun the hazard density and cause an unavoidable crash.
    speedBoost = Math.max(speedBoost, 18)
    fovPunch = 12
    shake = Math.max(shake, 0.3)
    velY += 3
    const safety = getBoostSafety(fx)
    invuln = Math.max(invuln, safety.graceSeconds)
    if (boostSafetyCue) {
      boostSafetyCue.textContent = fx.boostGraceSeconds > 0
        ? `🚀 Turbo Fold · +${fx.boostGraceSeconds.toFixed(2)}s safety · ${safety.collisionScale.toFixed(2)}× hitbox`
        : `🚀 Boost safety · ${safety.collisionScale.toFixed(2)}× hitbox`
      boostSafetyCue.classList.remove('hidden')
    }
    spawnConfetti(planeX, planeY, 0)
  }

  if (kind === 'tear') {
    tearSide = rng() < 0.5 ? -1 : 1
    const wl = plane.userData.wingL
    const wr = plane.userData.wingR
    if (tearSide < 0 && wl) {
      wl.scale.set(0.25, 1, 0.5)
      wl.rotation.z = 0.6
    }
    if (tearSide > 0 && wr) {
      wr.scale.set(0.25, 1, 0.5)
      wr.rotation.z = -0.6
    }
  }

  if (kind === 'sling') slingHold = 0
  if (kind === 'magnet') {
    // tiny juice so magnet feels instant
    spawnConfetti(planeX, planeY, 1)
  }
}

function setSkyTexture(url, crossfade = true) {
  if (url === currentSkyUrl) return
  currentSkyUrl = url
  const tex = loadTex(url)
  if (!crossfade || settings.reducedMotion) {
    skyMatA.map = tex
    skyMatA.opacity = 1
    skyMatB.opacity = 0
    skyMatA.needsUpdate = true
    activeSkyIsA = true
    skyFade = 1
    skyFadeTarget = 1
    return
  }
  // Load next onto the hidden sphere, then fade
  if (activeSkyIsA) {
    skyMatB.map = tex
    skyMatB.needsUpdate = true
    skyFadeTarget = 0
  } else {
    skyMatA.map = tex
    skyMatA.needsUpdate = true
    skyFadeTarget = 1
  }
  activeSkyIsA = !activeSkyIsA
}

function setGroundTexture(url, tint = 0xf2e6d8) {
  if (url === currentGroundUrl && ground.material.color.getHex() === tint) {
    ground.material.color.setHex(tint)
    return
  }
  currentGroundUrl = url
  const tex = loadTex(url)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  // Keep the density set on the tiles so zone crossfades don't snap back to
  // the old coarse repeat and blur the painted detail.
  tex.repeat.set(6, 46)
  ground.material.map = tex
  ground.material.color.setHex(tint)
  ground.material.needsUpdate = true
}

function applyNightReadability(enabled) {
  const night = Boolean(enabled)
  document.documentElement.dataset.night = night ? '1' : '0'
  // Day base matches the tuned hemi/sun constants; night lifts them for
  // readable silhouettes against the darker zones.
  hemi.intensity = night ? 1.55 : 0.92
  sun.intensity = night ? 1.7 : 1.25
  sun.color.setHex(night ? 0xffe9b8 : 0xfff0e0)
  for (const mat of buildingMats) {
    mat.emissive.setHex(night ? 0x3a3358 : 0x000000)
    mat.emissiveIntensity = night ? 0.28 : 0
  }
  birdMat.emissive.setHex(night ? 0xff8a65 : 0x000000)
  birdMat.emissiveIntensity = night ? 0.35 : 0
  birdAccentMat.emissive.setHex(night ? 0xffcc80 : 0x000000)
  birdAccentMat.emissiveIntensity = night ? 0.22 : 0
  if (deskAR.active || settings.arDesk) {
    renderer.setClearColor(0x000000, 0)
  } else {
    renderer.setClearColor(night ? 0x6d6496 : 0xc8dff5, 1)
  }
}

function applyZone(z, announce) {
  scene.fog.color.setHex(z.fog)
  if (z.nightReadability) {
    scene.fog.near = 70
    scene.fog.far = 240
  } else {
    scene.fog.near = 150
    scene.fog.far = (settings.reducedMotion ? 260 : 320) * (activeTwist?.fogMul ?? 1)
  }
  hemi.color.setHex(z.hemiSky)
  hemi.groundColor.setHex(z.hemiGround)
  if (!activePower || activePower.kind !== 'slow') {
    renderer.toneMappingExposure = z.exposure
  }
  applyNightReadability(z.nightReadability)
  if (z.sky) setSkyTexture(z.sky, announce)
  if (z.ground) setGroundTexture(z.ground, z.groundTint ?? 0xf2e6d8)
  if (z.id !== groundLifeZoneId) buildGroundLife(z.id)
  audio.setMusicZone(z.id)
  hudZoneEl.textContent = z.name
  document.documentElement.dataset.zone = z.id
  if (announce && z.id !== currentZoneId) {
    invuln = Math.max(invuln, 0.55)
    zoneBanner.textContent = z.name
    zoneBanner.classList.remove('hidden')
    zoneBannerTimer = 1.8
    showFlightFeedback(z.name, 'route', 1.2)
    pulseFlightImpact('route')
    audio.zoneTransition()
  }
  currentZoneId = z.id
}

/**
 * Tiers are an endless-mode concept. Journey legs are authored and finite,
 * and the tutorial and route-editor playbacks are fixed layouts, so all three
 * stay pinned to the shipped baseline curve.
 */
function tiersApply() {
  return runKind !== 'tutorial' && runKind !== 'layout' && runKind !== 'journey'
}

function endlessTier() {
  return tiersApply() ? currentTier : ZERO_TIER
}

/** Recompute escalation only when the tier index actually changes, then announce it. */
function updateEndlessTier() {
  if (!tiersApply()) return
  const next = resolveTier(distance)
  if (next.tier === currentTier.tier) return
  const climbed = next.tier > currentTier.tier
  currentTier = next
  if (!climbed || !next.name) return
  // Same courtesy the zone banner gets: a brief grace so a tier change never
  // lands the player straight into a hazard they could not have read.
  invuln = Math.max(invuln, 0.55)
  zoneBanner.textContent = next.name
  zoneBanner.classList.remove('hidden')
  zoneBannerTimer = 1.8
  showFlightFeedback(next.name, 'route', 1.4)
  pulseFlightImpact('route')
  notifications.show(`${next.name} — ${next.modifier.blurb}`, { duration: 3600 })
  audio.setAltitudeTier(next.tier)
  audio.zoneTransition()
  // A tier climb now drops a short arc of golden stars (5★ each) along the
  // reserved lane — deep runs get a visible payday instead of only numbers.
  const laneX = PASSAGE_LANE_X[(activePassageLane ?? 0) + 1]
  for (let i = 0; i < 3; i++) {
    const g = createStar({ golden: true })
    g.position.set(
      THREE.MathUtils.clamp(laneX + (i - 1) * 1.1, -MAX_X, MAX_X),
      7.5 + ((i * 2.7) % 7.5),
      58 + i * 10,
    )
    scene.add(g)
    entities.push({
      mesh: g, type: 'star', radius: 1.2, golden: true, value: GOLDEN_STAR_VALUE, telegraph: true,
    })
  }
}

function updateSkyFade(dt) {
  if (Math.abs(skyFade - skyFadeTarget) < 0.01) {
    skyFade = skyFadeTarget
  } else {
    skyFade += (skyFadeTarget - skyFade) * Math.min(1, dt * 1.8)
  }
  skyMatA.opacity = skyFade
  skyMatB.opacity = 1 - skyFade
}

function updateWeaponFeedback(playing = state === 'playing', fx = activeUpgradeEffects) {
  if (!fireBtn) return
  const weapon = getWeaponState({
    weaponLevel: fx.weaponLevel,
    cooldownSeconds: fx.weaponCooldown,
    cooldownLeft: fireCooldown,
  })
  const touch = settings.controlMode === 'joystick' || 'ontouchstart' in window
  const showPush = playing && !weapon.unlocked && touch
  fireBtn.classList.toggle('hidden', !playing || (!weapon.unlocked && !showPush))
  fireBtn.dataset.ready = String(weapon.ready || (showPush && paperPushCooldown <= 0))
  fireBtn.dataset.cooldown = weapon.unlocked ? weapon.cooldownRemaining.toFixed(2) : paperPushCooldown.toFixed(2)
  fireBtn.classList.toggle('cooling', (weapon.unlocked && !weapon.ready) || (showPush && paperPushCooldown > 0))
  const wasReady = fireBtn.classList.contains('weapon-ready')
  fireBtn.classList.toggle('weapon-ready', weapon.unlocked && weapon.ready)
  if (weapon.unlocked && weapon.ready && !wasReady) {
    fireBtn.classList.remove('weapon-ready-pulse')
    void fireBtn.offsetWidth
    fireBtn.classList.add('weapon-ready-pulse')
  }
  if (weapon.unlocked) {
    fireBtn.textContent = weapon.ready ? '🖋 Ready' : `🖋 ${weapon.cooldownRemaining.toFixed(1)}s`
    fireBtn.setAttribute('aria-label', weapon.ready
      ? 'Ink Blast ready'
      : `Ink Blast recharging: ${weapon.cooldownRemaining.toFixed(1)} seconds`)
  } else {
    fireBtn.textContent = paperPushCooldown > 0 ? '💨 …' : '💨 Push'
    fireBtn.setAttribute('aria-label', 'Paper push burst')
  }
}

function updateMagnetPullFeedback(target, magnet) {
  if (!magnetPullTrail) return
  const active = Boolean(target && magnet.active)
  magnetPullTrail.dataset.active = String(active)
  magnetPullTrail.classList.toggle('hidden', !active)
  if (active) magnetPullTrail.textContent = `🧲 Pulling a star · ${Math.round(magnet.visualStrength * 100)}%`
}

function applyUpgradeVisuals(fx = activeUpgradeEffects) {
  plane.scale.setScalar(fx.planeScale * 1.12)
  const trail = upgradeTrail
  const trailFeedback = getTrailFeedback(fx)
  if (trail) {
    trail.visible = trailFeedback.visible && state === 'playing'
    trail.material.opacity = trailFeedback.opacity
    trail.material.size = trailFeedback.size
    trail.material.color.setHex(trailFeedback.color)
  }
  updateWeaponFeedback()
}

function resetGame() {
  const upgradeEffects = refreshUpgradeEffects()
  clearEntities()
  clearPower()
  hazardClock = 0
  slowmoActive = false
  lastRewardTag = null
  document.getElementById('slow-fx')?.classList.remove('slowmo-active')
  flightFeedbackTimer = 0
  flightFeedbackEl?.classList.add('hidden')
  updateMagnetPullFeedback(null, { active: false })
  distance = 0
  stars = 0
  speed = difficulty.speedBase
  // Dead-center spawn every run
  planeX = 0
  planeY = 8
  velY = 0
  velX = 0
  pitch = 0
  roll = 0
  windTimer = 7
  windActive = 0
  windForce = 0
  windWarningTimer = 0
  pendingWindActive = 0
  pendingWindForce = 0
  nextSpawnZ = 35
  shake = 0
  hitStopTimer = 0
  fireCooldown = 0
  elapsed = 0
  launchGraceSeconds = shouldGrantLaunchGrace({
    runKind,
    tutorialDone,
    completedRuns: getRunCount(),
  }) ? FIRST_FLIGHT_GRACE_SECONDS : 0
  combo = 0
  maxCombo = 0
  comboTimer = 0
  groundSkim = createGroundSkimState()
  skimHud?.classList.add('hidden')
  starStreak = 0
  starStreakTimer = 0
  starStreakWindow = 0
  streakHud?.classList.add('hidden')
  feverActive = false
  feverTimer = 0
  feverFx?.classList.remove('fever-active')
  feverHud?.classList.add('hidden')
  runStats = { stars: 0, powers: 0, winds: 0, maxCombo: 0, popped: 0, fevers: 0 }
  journeyTimeline = runKind === 'journey' && journeyRunConfig ? buildEncounterTimeline(journeyRunConfig) : null
  journeyTelemetry = journeyTimeline ? {
    nearMisses: 0,
    shortcutGatesCleared: 0,
    shortcutGatesTotal: 0,
    shieldUsed: false,
    collectedJourneyStars: 0,
    rivalBeaten: false,
    completedEventIds: [],
  } : null
  journeyPreviousDistance = 0
  journeyVisibilityTimer = 0
  lastJourneyResult = null
  nextBossAt = 500
  nextGauntletAt = 250
  currentTier = ZERO_TIER
  currentZoneLap = 0
  bossActive = false
  bossRecoveryUntil = 0
  activePassageLane = null
  bossCount = 0
  distanceMilestones.clear()
  speedBoost = 0
  rescueLift = 0
  invuln = SPAWN_INVULN_SECONDS
  const guardian = getGuardianState({ charges: upgradeEffects.guardianCharges })
  guardianLeft = guardian.remaining
  guardianHud?.classList.toggle('hidden', !guardian.visible)
  guardianHud?.setAttribute('data-hud-priority', guardian.visible ? 'primary' : 'secondary')
  if (guardianHudVal) guardianHudVal.textContent = String(guardian.remaining)
  timeAttackLeft = TIME_ATTACK_SECONDS
  timeAttackLastTickSecond = -1
  timeAttackHud?.classList.toggle('hidden', runKind !== 'timeattack')
  if (timeAttackValEl) timeAttackValEl.textContent = String(TIME_ATTACK_SECONDS)
  crashT = 0
  crashReason = ''
  fovPunch = 0
  slingHold = 0
  paperPushCooldown = 0
  mouseScreen.has = true
  mouseScreen.x = 0.5
  mouseScreen.y = 0.5
  mouseTarget.x = 0
  mouseTarget.y = 10
  mouse.nx = 0
  mouse.ny = 0
  camera.fov = baseFov
  camera.updateProjectionMatrix()
  plane.visible = true
  comboHud.classList.add('hidden')
  applySeasonVisuals()
  applySkin(getEquippedSkinId())
  applyUpgradeVisuals(upgradeEffects)
  spawnUnfold = 0
  plane.scale.setScalar(upgradeEffects.planeScale * 0.15 * 1.12)

  // RNG
  activeFold = null
  if (runKind === 'daily') {
    activeRunSeed = launchChallenge?.kind === 'daily' && launchChallenge.seed
      ? launchChallenge.seed
      : dailySeed(difficulty.id)
    rng = mulberry32(activeRunSeed)
    activeTwist = todaysTwist()
  } else if (runKind === 'weekly') {
    activeFold = (launchChallenge?.kind === 'weekly' && foldById(launchChallenge.foldId))
      || thisWeeksFold()
    activeRunSeed = launchChallenge?.kind === 'weekly' && launchChallenge.seed
      ? launchChallenge.seed
      : weeklySeed(difficulty.id)
    rng = mulberry32(activeRunSeed)
    activeTwist = activeFold
  } else if (runKind === 'journey' && journeyRunConfig) {
    activeRunSeed = journeyRunConfig.seed
    rng = mulberry32(activeRunSeed)
    activeTwist = {
      name: journeyRunConfig.modifierLabel,
      windMul: journeyRunConfig.modifier === 'crosswind' ? 0.45 : 1,
      fogMul: journeyRunConfig.modifier === 'low-visibility' ? 0.55 : 1,
      starMul: journeyRunConfig.modifier === 'star-trail' ? 1.6 : 1,
    }
    if (journeyRunConfig.finale) nextBossAt = 180
    if (journeyRunConfig.modifier === 'moving-formation') nextGauntletAt = 120
    if (journeyRunConfig.modifier === 'shortcut-gates') activeTwist.starMul = 1.35
    if (journeyRunConfig.risk === 'risky') activeTwist.windMul = (activeTwist.windMul || 1) * 1.2
  } else if (runKind === 'layout') {
    activeRunSeed = null
    rng = Math.random
    activeTwist = null
  } else {
    activeRunSeed = launchChallenge?.seed
      || (devSeed !== null && runKind === 'classic' ? devSeed : ((Math.random() * 0xffffffff) >>> 0) || 1)
    rng = mulberry32(activeRunSeed)
    activeTwist = null
  }
  audio.setAltitudeTier(0)
  scene.fog.far = (settings.reducedMotion ? 260 : 320) * (activeTwist?.fogMul ?? 1)

  plane.position.set(0, planeY, 0)
  plane.rotation.set(0, 0, 0)
  camera.position.set(0, planeY + CAM_HEIGHT, -8)
  camera.lookAt(0, planeY + CAM_AIM_LIFT, CAM_AIM_Z)
  ground.position.z = 120
  currentSkyUrl = ''
  currentGroundUrl = ''
  applyZone(activeZoneAt(0), false)

  ghostRecorder = createGhostRecorder()
  journeyRivalState = runKind === 'journey' && journeyRunConfig?.rival
    ? createRivalState({ seed: journeyRunConfig.seed, targetDistance: 500 })
    : null
  ghostData = runKind === 'tutorial' || journeyRivalState
    ? null
    : launchChallenge?.path?.length
      ? { path: launchChallenge.path, distance: launchChallenge.distance, stars: launchChallenge.stars }
      : loadGhost(ghostStorageKey())
  if (journeyRivalState || ghostData?.path?.length) {
    const material = journeyRivalState ? rivalMat : ghostMat
    ghostMesh = createPaperPlane({
      THREE: PLANE_THREE,
      silhouette: activePlaneSilhouette,
      materials: { body: material, accent: material },
      withShield: false,
    })
    ghostMesh.scale.setScalar(journeyRivalState ? 1.28 : 1.08)
    scene.add(ghostMesh)
  }

  if (runKind === 'tutorial') {
    spawnTutorial()
  } else if (runKind === 'layout' && layoutPlay) {
    spawnLayoutItems()
  } else {
    for (let i = 0; i < 14; i++) {
      spawnChunk(nextSpawnZ)
      nextSpawnZ += getWaveSpacing({ difficultyId: difficulty.id, distance }) * difficulty.gap
    }
  }

  const cloudCount = settings.lowPower || !renderQuality.secondaryEffects ? 4 : 8
  for (let i = 0; i < cloudCount; i++) {
    const cl = createCloud()
    cl.position.set((rng() - 0.5) * 55, 12 + rng() * 18, 20 + rng() * 180)
    cl.scale.setScalar(1.2 + rng() * 1.8)
    scene.add(cl)
    clouds.push(cl)
  }

  distanceEl.textContent = '0m'
  if (hudModeEl) {
    hudModeEl.textContent = runKind === 'journey'
      ? journeyRunConfig.modifierLabel
      : runKind === 'weekly' && activeFold
        ? activeFold.name
        : difficulty.label
  }
  starsEl.textContent = '0'
  windBanner.classList.add('hidden')
  powerBanner.classList.add('hidden')
  zoneBanner.classList.add('hidden')
  comboFloat.classList.add('hidden')
  photoWrap.classList.add('hidden')
  lastPhotoDataUrl = null
  updateJourneyObjectiveHud()
}

// Stick
const STICK_MAX = 48
let stickKnobAngle = 0
function setStickFromEvent(cx, cy) {
  const rect = stickBase.getBoundingClientRect()
  const ox = rect.left + rect.width / 2
  const oy = rect.top + rect.height / 2
  let dx = cx - ox
  let dy = cy - oy
  const len = Math.hypot(dx, dy) || 1
  const c = Math.min(len, STICK_MAX)
  // Point the knob's paper-dart glyph toward the drag direction (deadzone so
  // it doesn't jitter near center).
  if (len > 6) stickKnobAngle = Math.atan2(dx, -dy) * (180 / Math.PI)
  dx = (dx / len) * c
  dy = (dy / len) * c
  stick.x = dx / STICK_MAX
  stick.y = -dy / STICK_MAX
  stickKnob.style.transform =
    `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${stickKnobAngle}deg)`
}
function resetStick() {
  stick.x = stick.y = 0
  stick.active = false
  stick.pointerId = null
  stickKnob.style.transform = 'translate(-50%, -50%)'
  releaseFloatingBase(stickBase)
}
function wantsJoystick() {
  if (runKind === 'coop') return true
  return String(settings.controlMode || 'mouse') === 'joystick'
}

/** Force stick UI to match control mode — CSS + classes + aria */
function showStick(playing) {
  const windZone = $('wind-stick-zone')
  const root = $('game-root')
  const joy = wantsJoystick()
  const showFlyStick = !!(playing && joy)
  const showWindStick = !!(playing && runKind === 'coop')

  // Mode classes drive CSS display rules
  root?.classList.toggle('joystick-mode', joy)
  root?.classList.toggle('mouse-mode', !joy)
  root?.classList.toggle('coop-mode', runKind === 'coop' && playing)

  if (showFlyStick) {
    stickZone.classList.remove('hidden')
    stickZone.setAttribute('aria-hidden', 'false')
  } else {
    stickZone.classList.add('hidden')
    stickZone.setAttribute('aria-hidden', 'true')
    resetStick()
  }

  if (showWindStick && windZone) {
    windZone.classList.remove('hidden')
    windZone.setAttribute('aria-hidden', 'false')
  } else if (windZone) {
    windZone.classList.add('hidden')
    windZone.setAttribute('aria-hidden', 'true')
    windStick.x = windStick.y = 0
    windStick.active = false
    releaseFloatingBase(windBase())
  }

  const hudCtrl = $('hud-ctrl')
  if (hudCtrl) {
    hudCtrl.textContent = runKind === 'coop' ? 'Co-op' : joy ? 'Joystick' : isTouchPrimary ? 'Touch' : 'Mouse'
  }
  updateWeaponFeedback(playing)
}

function updateControlUI() {
  const mode = wantsJoystick() && runKind !== 'coop'
    ? (settings.controlMode === 'joystick' ? 'joystick' : 'mouse')
    : settings.controlMode === 'joystick'
      ? 'joystick'
      : 'mouse'
  const m = settings.controlMode === 'joystick' ? 'joystick' : 'mouse'
  document.querySelectorAll('.ctrl-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.ctrl === m)
  })
  const mouseBtn = document.querySelector('.ctrl-btn[data-ctrl="mouse"]')
  if (mouseBtn) mouseBtn.textContent = isTouchPrimary ? '👆 Touch Aim' : '🖱 Mouse'
  const blurb = $('ctrl-blurb')
  if (blurb) {
    if (m === 'joystick') {
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
  const invMenu = $('menu-invert-y')
  if (invMenu) invMenu.checked = !!settings.invertY
  const cm = $('set-control-mode')
  if (cm) cm.value = m
  // Keep root classes correct on menu too
  const root = $('game-root')
  root?.classList.toggle('joystick-mode', m === 'joystick')
  root?.classList.toggle('mouse-mode', m === 'mouse')
  // Always hide sticks on menu
  if (state !== 'playing') {
    stickZone.classList.add('hidden')
    $('wind-stick-zone')?.classList.add('hidden')
  }
}

updateControlUI()
// Ensure sticks never flash on boot
showStick(false)

let settingsSyncChain = Promise.resolve({ settings, arPermissionDenied: false })
function syncRuntimeSettings(nextSettings = loadSettings()) {
  const requestedSettings = { ...nextSettings }
  settingsSyncChain = settingsSyncChain
    .catch(() => ({ settings, arPermissionDenied: false }))
    .then(() => synchronizeRuntimeSettings(requestedSettings, {
      deskAR,
      persist: (partial) => saveSettings(partial),
      applyDocumentA11y: (applied) => {
        settings = applied
        applyDocumentA11y(applied)
      },
      applyPerformance: (applied) => {
        settings = applied
        applyPerformanceSettings()
      },
      rebuildPowerPalette: (applied) => {
        settings = applied
        rebuildPowerPalette()
      },
      applySeason: (applied) => {
        settings = applied
        season = seasonInfo(applied.forceSeason)
        applySeasonVisuals()
      },
      updateControls: (applied) => {
        settings = applied
        updateControlUI()
        if (state === 'playing') showStick(true)
      },
    }))
  return settingsSyncChain
}

/** Map pointer to normalized -1..1 with invert options */
function pointerAxesFromClient(clientX, clientY) {
  const axes = normalizeControlAxes({
    x: (clientX / innerWidth) * 2 - 1,
    y: -((clientY / innerHeight) * 2 - 1), // screen up → +1
    invertX: settings.invertX,
    invertY: settings.invertY,
  })
  return { nx: axes.x, ny: axes.y }
}

/** Raycast cursor onto the flight plane (z=0) so left/right match the screen */
const _aimRay = new THREE.Raycaster()
const _aimNdc = new THREE.Vector2()
const _aimHit = new THREE.Vector3()
const _camTarget = new THREE.Vector3()
const _flightPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0) // z = 0

/**
 * A finger covering its own touch point would hide the plane, so touch input
 * aims from a spot above the fingertip instead of dead-on — the same "thumb
 * offset" trick most mobile flight/shooter games use.
 */
const TOUCH_AIM_OFFSET_Y = 130

function mouseWorldTarget(clientX, clientY, isTouch = false) {
  if (isTouch) clientY = Math.max(20, clientY - TOUCH_AIM_OFFSET_Y)
  mouseScreen.x = clientX / innerWidth
  mouseScreen.y = clientY / innerHeight
  mouseScreen.has = true

  // Three.js NDC: x right, y up
  _aimNdc.x = (clientX / innerWidth) * 2 - 1
  _aimNdc.y = -((clientY / innerHeight) * 2 - 1)
  _aimRay.setFromCamera(_aimNdc, camera)

  const hit = _aimRay.ray.intersectPlane(_flightPlane, _aimHit)
  if (hit) {
    let tx = _aimHit.x
    // Vertical aim is mapped straight from the screen row rather than taken
    // from the ray hit. The camera's height tracks planeY 1:1, so a ray-derived
    // target is always a fixed offset *above or below the plane* — the plane
    // then chases that offset into MAX_Y or MIN_Y for every cursor position but
    // one exact row. Mapping the row onto the altitude band keeps the control
    // positional: screen top is the ceiling, screen bottom is the floor.
    let ty = THREE.MathUtils.mapLinear(_aimNdc.y, -1, 1, MIN_Y, MAX_Y)
    if (settings.invertX) tx = -tx
    if (settings.invertY) {
      // Invert around mid altitude band
      const mid = (MIN_Y + MAX_Y) * 0.5
      ty = mid - (ty - mid)
    }
    mouseTarget.x = THREE.MathUtils.clamp(tx, -MAX_X, MAX_X)
    mouseTarget.y = THREE.MathUtils.clamp(ty, MIN_Y, MAX_Y)
    mouse.nx = THREE.MathUtils.clamp(mouseTarget.x / MAX_X, -1, 1)
    mouse.ny = THREE.MathUtils.clamp(
      (mouseTarget.y - MIN_Y) / (MAX_Y - MIN_Y) * 2 - 1,
      -1,
      1,
    )
  } else {
    // Fallback orthographic-style mapping (should rarely hit)
    let nx = _aimNdc.x
    let ny = _aimNdc.y
    if (settings.invertX) nx = -nx
    if (settings.invertY) ny = -ny
    mouseTarget.x = THREE.MathUtils.clamp(nx * MAX_X * 0.9, -MAX_X, MAX_X)
    mouseTarget.y = THREE.MathUtils.clamp(
      THREE.MathUtils.mapLinear(ny, -1, 1, MIN_Y + 0.5, MAX_Y - 0.5),
      MIN_Y,
      MAX_Y,
    )
    mouse.nx = nx
    mouse.ny = ny
  }
}

function applyAxisInvert(x, y) {
  // invertX/Y only flip when user opts in — default is natural
  return normalizeControlAxes({ x, y, invertX: settings.invertX, invertY: settings.invertY })
}

/** Float a joystick base so it re-centers under wherever the finger first
 *  lands in its zone, clamped so it stays fully on-screen. */
function anchorFloatingBase(baseEl, zoneEl, cx, cy) {
  if (!baseEl || !zoneEl) return
  const r = baseEl.offsetWidth / 2
  const zr = zoneEl.getBoundingClientRect()
  const x = THREE.MathUtils.clamp(cx, zr.left + r, zr.right - r)
  const y = THREE.MathUtils.clamp(cy, zr.top + r, zr.bottom - r)
  baseEl.classList.add('floating')
  baseEl.style.left = `${x}px`
  baseEl.style.top = `${y}px`
}
function releaseFloatingBase(baseEl) {
  if (!baseEl) return
  baseEl.classList.remove('floating')
  baseEl.style.left = ''
  baseEl.style.top = ''
}

// Wind stick (co-op P2)
function windBase() { return $('wind-stick-base') }
function windKnob() { return $('wind-stick-knob') }
function setWindStick(cx, cy) {
  const base = windBase()
  const knob = windKnob()
  if (!base || !knob) return
  const rect = base.getBoundingClientRect()
  const ox = rect.left + rect.width / 2
  const oy = rect.top + rect.height / 2
  let dx = cx - ox
  let dy = cy - oy
  const len = Math.hypot(dx, dy) || 1
  const c = Math.min(len, STICK_MAX)
  dx = (dx / len) * c
  dy = (dy / len) * c
  windStick.x = dx / STICK_MAX
  windStick.y = -dy / STICK_MAX
  knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
}
function bindWindStick() {
  const zone = $('wind-stick-zone')
  const base = windBase()
  if (!zone || !base || zone.dataset.bound) return
  zone.dataset.bound = '1'
  zone.addEventListener('pointerdown', (e) => {
    if (windStick.active) return
    e.preventDefault()
    e.stopPropagation()
    windStick.active = true
    windStick.pointerId = e.pointerId
    zone.setPointerCapture(e.pointerId)
    anchorFloatingBase(base, zone, e.clientX, e.clientY)
    setWindStick(e.clientX, e.clientY)
  })
  zone.addEventListener('pointermove', (e) => {
    if (!windStick.active || e.pointerId !== windStick.pointerId) return
    setWindStick(e.clientX, e.clientY)
  })
  const end = (e) => {
    if (e.pointerId !== windStick.pointerId) return
    windStick.active = false
    windStick.x = windStick.y = 0
    windStick.pointerId = null
    const knob = windKnob()
    if (knob) knob.style.transform = 'translate(-50%, -50%)'
    releaseFloatingBase(base)
  }
  zone.addEventListener('pointerup', end)
  zone.addEventListener('pointercancel', end)
}
bindWindStick()
if (stickZone && stickBase) {
  stickZone.addEventListener('pointerdown', (e) => {
    if (stick.active) return
    e.preventDefault()
    e.stopPropagation()
    stick.active = true
    stick.pointerId = e.pointerId
    stickZone.setPointerCapture(e.pointerId)
    anchorFloatingBase(stickBase, stickZone, e.clientX, e.clientY)
    setStickFromEvent(e.clientX, e.clientY)
  })
  stickZone.addEventListener('pointermove', (e) => {
    if (!stick.active || e.pointerId !== stick.pointerId) return
    setStickFromEvent(e.clientX, e.clientY)
  })
  const endStick = (e) => {
    if (e.pointerId !== stick.pointerId) return
    resetStick()
    releaseFloatingBase(stickBase)
  }
  stickZone.addEventListener('pointerup', endStick)
  stickZone.addEventListener('pointercancel', endStick)
}

// Input
function ghostStorageKey() {
  if (runKind === 'daily') return `${difficulty.id}-daily`
  if (runKind === 'weekly') return `${difficulty.id}-weekly-${weeklyKey()}`
  return difficulty.id
}

function retryCurrentRun() {
  if (runKind === 'journey') journey = loadJourney(localStorage).journey
  if (runKind === 'journey' && !journey?.selectedRouteId) {
    openJourney()
    return
  }
  startGame(runKind, runKind === 'journey' ? { journeyConfig: buildRunConfiguration(journey) } : {})
}

function syncPauseUi() {
  const showPauseControl = state === 'playing'
  pauseBtn?.classList.toggle('hidden', !showPauseControl)
  pauseOverlay?.classList.toggle('hidden', !(manualPause && state === 'playing'))
  if (pauseBtn) pauseBtn.setAttribute('aria-pressed', String(manualPause && state === 'playing'))
  const muteLabel = $('pause-mute')
  if (muteLabel) muteLabel.textContent = audio.muted ? 'Unmute' : 'Mute'
  // Desk AR is a flight-only control; the install shortcut belongs to the menus.
  $('ar-btn')?.classList.toggle('hidden', !showPauseControl)
  const installEl = $('install-btn')
  if (installEl) {
    installEl.classList.toggle('hidden', showPauseControl || !installEl.hasAttribute('data-install-eligible'))
  }
}

function applyPauseState({ banner = true } = {}) {
  const transition = nextPauseState(simulationPaused, {
    hidden: document.visibilityState === 'hidden',
    manual: manualPause && state === 'playing',
  })
  simulationPaused = transition.paused
  if (simulationPaused) {
    keys.clear()
    audio.ctx?.suspend().catch(() => {})
  } else {
    timer?.reset?.()
    audio.ctx?.resume().catch(() => {})
    if (transition.resumed && state === 'playing') {
      invuln = Math.max(invuln, transition.graceSeconds || 0)
      if (banner) {
        powerBanner.textContent = '▶ Resumed'
        powerBanner.classList.remove('hidden')
        bannerTimer = 1.5
      }
      if (settings.haptics) Haptic.tap()
    }
  }
  syncPauseUi()
}

function setManualPause(on) {
  if (state !== 'playing' && on) return
  manualPause = Boolean(on)
  applyPauseState()
}

window.addEventListener('keydown', (e) => {
  keys.add(e.code)
  if (e.code === 'Escape') {
    if (state === 'playing') {
      e.preventDefault()
      setManualPause(!manualPause)
    }
    return
  }
  if (manualPause && state === 'playing') return
  if (e.code === 'Space') {
    e.preventDefault()
    // Don't restart mid-sling charge during play
    if (state === 'playing' && activePower?.kind === 'sling') return
    if (state === 'menu') startGame(runKind === 'layout' ? 'layout' : 'classic')
    else if (state === 'dead' && crashT <= 0) retryCurrentRun()
  }
  if (e.code === 'KeyM') {
    muteBtn.textContent = audio.toggleMute() ? '🔇' : '🔊'
    syncPauseUi()
  }
})
window.addEventListener('keyup', (e) => keys.delete(e.code))
// A key held down when focus leaves the window (alt-tab, clicking another
// app) never gets its keyup event, so it would otherwise stay "held"
// forever — endless Ink Blast fire, a slingshot stuck mid-charge, etc.
window.addEventListener('blur', () => keys.clear())
fireBtn?.addEventListener('pointerdown', (e) => {
  e.preventDefault()
  e.stopPropagation()
  fireWeapon({ allowPush: true })
})
window.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button') || e.target.closest('#stick-zone') || e.target.closest('#wind-stick-zone') || e.target.closest('.panel')) return
  mouseWorldTarget(e.clientX, e.clientY, e.pointerType === 'touch')
  // Start game from canvas click on menu/dead
  if (state === 'menu' || (state === 'dead' && crashT <= 0)) {
    if (!e.target.closest('button')) {
      /* panels handle their own; canvas play area starts */
    }
  }
})
window.addEventListener('pointermove', (e) => {
  if (stick.active) return
  // Always track cursor for mouse-aim (and invert-aware axes for reference)
  mouseWorldTarget(e.clientX, e.clientY, e.pointerType === 'touch')
})
// Touch: also track for absolute aim if someone uses finger without stick in mouse mode
window.addEventListener(
  'touchmove',
  (e) => {
    if (stick.active || settings.controlMode === 'joystick') return
    const t = e.touches[0]
    if (t) mouseWorldTarget(t.clientX, t.clientY, true)
  },
  { passive: true },
)
// ---------------------------------------------------------------------------
// Shell bridge and runtime-only controls
// ---------------------------------------------------------------------------
function hideAllPanels() {
  for (const id of ['menu', 'journey-panel', 'gameover', 'hangar-panel', 'hotseat-intermission']) {
    $(id)?.classList.add('hidden')
  }
}

function openJourney() {
  shellBridge?.openJourney?.()
}

function showMenu() {
  state = 'menu'
  launchChallenge = null
  manualPause = false
  // Quitting mid-gust/mid-bullet-time must not freeze weather artifacts
  // behind the menu — update() no longer drives these once state leaves play.
  for (const s of windStreaks) s.visible = false
  document.getElementById('slow-fx')?.classList.remove('slowmo-active')
  hideAllPanels()
  pauseOverlay?.classList.add('hidden')
  pauseBtn?.classList.add('hidden')
  if (shellBridge?.showMenu) shellBridge.showMenu()
  else menuEl?.classList.remove('hidden')
  hudEl?.classList.add('hidden')
  if (speedFxEl) speedFxEl.style.opacity = '0'
  hideEdgeIndicators()
  nextZoneHud?.classList.add('hidden')
  ghostDeltaHud?.classList.add('hidden')
  guardianHud?.classList.add('hidden')
  journeyObjectiveHud?.classList.add('hidden')
  tutorialHintEl?.classList.add('hidden')
  hideFlightReadability()
  flightFeedbackTimer = 0
  flightFeedbackEl?.classList.add('hidden')
  showStick(false)
  shellBridge?.refreshProgression?.()
  updateControlUI()
  applyPauseState({ banner: false })
}

function showPostcardReveal(card) {
  shellBridge?.showPostcardReveal?.(card)
}

function refreshMissionBadge() {
  shellBridge?.refreshProgression?.()
}

const bindClick = (id, fn) => {
  const element = $(id)
  if (element) element.onclick = fn
}

bindClick('retry-btn', () => retryCurrentRun())
bindClick('hangar-from-gameover', () => {
  hotseat.active = false
  gameoverEl?.classList.add('hidden')
  const focusId = $('hangar-from-gameover')?.dataset?.focusUpgrade || null
  shellBridge?.openHangar?.('upgrades', focusId ? { focusUpgradeId: focusId } : undefined)
})
bindClick('menu-btn', () => {
  if (state === 'dead' && crashT > 0) {
    crashT = 0
    finalizeDeath()
  }
  manualPause = false
  hotseat.active = false
  showMenu()
})
bindClick('pause-btn', () => setManualPause(!manualPause))
bindClick('pause-resume', () => setManualPause(false))
bindClick('pause-mute', () => {
  muteBtn.textContent = audio.toggleMute() ? '🔇' : '🔊'
  syncPauseUi()
})
bindClick('pause-menu', () => {
  manualPause = false
  applyPauseState({ banner: false })
  hotseat.active = false
  showMenu()
})
bindClick('share-btn', () => shareScore())
bindClick('photo-save', () => {
  if (!lastPhotoDataUrl) return
  const link = document.createElement('a')
  link.href = lastPhotoDataUrl
  link.download = `paper-plane-${Math.floor(lastRun.d)}m.png`
  link.click()
})
bindClick('photo-share', async () => {
  if (!lastPhotoDataUrl) return
  try {
    const blob = await (await fetch(lastPhotoDataUrl)).blob()
    const file = new File([blob], 'paper-plane.png', { type: 'image/png' })
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Paper Plane Run', text: shareText() })
    } else {
      await navigator.clipboard.writeText(shareText() + '\\n' + buildShareUrl())
      if (shareStatus) shareStatus.textContent = 'Link copied (photo save available)'
    }
  } catch {
    if (shareStatus) shareStatus.textContent = 'Share cancelled'
  }
})
bindClick('hotseat-go', () => {
  hotseatInter?.classList.add('hidden')
  startGame('hotseat', { continueHotseat: true })
})

$('ar-btn')?.addEventListener('click', async () => {
  await audio.unlock()
  const desired = !deskAR.active
  const result = await syncRuntimeSettings(saveSettings({ arDesk: desired }))
  shellBridge?.settingsApplied?.(result)
  const on = result.settings.arDesk
  notifications.show(result.arPermissionDenied
    ? 'Camera permission needed for Desk AR'
    : on ? '📷 Desk AR on — fly over your table!' : 'Desk AR off', { duration: 2500 })
})
function shareText() {
  const { d, s, m, daily, weekly, timeAttack, foldId } = lastRun
  if (timeAttack) {
    return `I grabbed ${s}★ in 60 seconds of Time Attack on ${DIFFS[m]?.label || m} in Paper Plane Run!`
  }
  if (weekly) {
    const fold = foldById(foldId)
    return `I flew ${d}m · ${s}★ on Weekly ${weeklyKey()}${fold ? ` · ${fold.name}` : ''} in Paper Plane Run — race my ghost!`
  }
  return `I flew ${d}m · ${s}★ on ${DIFFS[m]?.label || m}${daily ? ` · Daily ${dailyKey()}` : ''} in Paper Plane Run — race my ghost!`
}
function buildShareUrl() {
  const u = new URL(location.href)
  u.search = ''
  const code = encodeChallenge({
    kind: lastRun.kind || (lastRun.weekly ? 'weekly' : lastRun.daily ? 'daily' : lastRun.timeAttack ? 'timeattack' : 'classic'),
    mode: lastRun.m,
    seed: lastRun.seed,
    distance: lastRun.d,
    stars: lastRun.s,
    name: normalizeLeaderboardName(pilotNameInput?.value),
    foldId: lastRun.foldId,
    path: lastRun.path,
  })
  if (code) {
    u.searchParams.set('c', code)
    return u.toString()
  }
  u.searchParams.set('d', String(lastRun.d))
  u.searchParams.set('s', String(lastRun.s))
  u.searchParams.set('m', lastRun.m)
  if (lastRun.daily) u.searchParams.set('daily', '1')
  if (lastRun.weekly) u.searchParams.set('weekly', '1')
  if (lastRun.timeAttack) u.searchParams.set('ta', '1')
  return u.toString()
}
async function shareScore() {
  const text = shareText()
  const url = buildShareUrl()
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Paper Plane Run', text, url })
      shareStatus.textContent = 'Shared!'
      return
    }
  } catch (e) {
    if (e?.name === 'AbortError') return
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`)
    shareStatus.textContent = 'Link copied!'
  } catch {
    shareStatus.textContent = url
  }
}

async function startGame(kind = 'classic', opts = {}) {
  function resolveJourneyRunConfig(proposedConfig, fallbackJourney) {
    if (
      proposedConfig
      && proposedConfig.risk === 'risky'
      && proposedConfig.routeId
      && Number.isFinite(Number(proposedConfig.rewardMultiplier))
      && proposedConfig.zone
      && proposedConfig.pilotId
    ) {
      return proposedConfig
    }
    return buildRunConfiguration(fallbackJourney)
  }

  try {
    if (opts.engineAudio) audio = opts.engineAudio
    if (opts.shellBridge) shellBridge = opts.shellBridge
    const settingsResult = await syncRuntimeSettings(opts.settings || loadSettings())
    shellBridge?.settingsApplied?.(settingsResult)
    setDifficulty(localStorage.getItem(DIFF_KEY) || 'normal', { persist: false })
    // Finish deferred death rewards if restarting mid-crash
    if (state === 'dead' && crashT > 0) {
      crashT = 0
      finalizeDeath()
    }
    void audio.unlock()
    audio.uiClick()
    runKind = kind
    if (opts.challenge) launchChallenge = opts.challenge
    if (kind === 'journey') journey = loadJourney(localStorage).journey
    journeyRunConfig = kind === 'journey' ? resolveJourneyRunConfig(opts.journeyConfig, journey) : null
    if (kind === 'journey' && !journeyRunConfig) {
      openJourney()
      return
    }
    layoutPlay = selectLayoutForStart(layoutPlay, kind, opts)
    if (kind === 'hotseat' && !opts.continueHotseat) {
      hotseat.turn = 0
      hotseat.scores = [0, 0]
      hotseat.active = true
    }
    if (kind === 'coop') hotseat.active = false
    hideAllPanels()
    manualPause = false
    resetGame()
    state = 'playing'
    // Hydrate the route strip immediately so the shell never exposes an
    // empty risk/stamp label during the first lazy-engine frame.
    updateFlightReadability(runKind === 'journey' ? { zone: activeZoneAt(0), t: 1, next: null } : null)
    hudEl?.classList.remove('hidden')
    showStick(true)
    syncPauseUi()
    applyPauseState({ banner: false })
    if (hotseat.active) {
      hotseatHud?.classList.remove('hidden')
      if (hotseatPlayerEl) hotseatPlayerEl.textContent = String(hotseat.turn + 1)
    } else hotseatHud?.classList.add('hidden')
    const coopHud = $('coop-hud')
    if (coopHud) coopHud.classList.toggle('hidden', kind !== 'coop')
    audio.startFlight()
    if (kind === 'coop') {
      showFlightFeedback('P1 FLIES · P2 THROWS WIND', 'route', 2.4)
      notifications.show('Co-op: arrows / left stick fly · WASD wind', { duration: 3600 })
    }
    if (kind === 'hotseat') {
      showFlightFeedback(`HOT-SEAT · PLAYER ${hotseat.turn + 1}`, 'route', 2.2)
    }
    if (kind === 'daily') {
      showFlightFeedback('DAILY ROUTE · BEAT THE GHOST', 'route', 2)
    }
    if (kind === 'weekly') {
      const fold = activeFold || thisWeeksFold()
      showFlightFeedback(`${fold.icon} ${fold.name.toUpperCase()}`, 'route', 2.2)
    }
    if (launchChallenge?.path?.length) {
      notifications.show(describeChallenge(launchChallenge), { duration: 3600 })
    }
    if (launchGraceSeconds > 0) {
      powerBanner.textContent = '✈️ Get ready — launch protection active'
      powerBanner.classList.remove('hidden')
      bannerTimer = launchGraceSeconds
    }
    if (journeyRivalState) {
      notifications.show(getRivalCallout(journeyRivalState, 'start'), {
        duration: settings.reducedMotion ? 2200 : 3600,
      })
    }
    if (settings.haptics) Haptic.tap()
    track('game_start', { kind, mode: difficulty.id, season: season.id, routeId: journeyRunConfig?.routeId })
  } catch (err) {
    console.error('startGame failed', err)
    // Recover: ensure we're at least in a playable state
    try {
      hideAllPanels()
      state = 'playing'
      hudEl?.classList.remove('hidden')
      if (planeX === undefined || Number.isNaN(planeX)) {
        planeX = 0
        planeY = 8
      }
    } catch {
      /* ignore */
    }
  }
}

/** Composite the raw WebGL frame with a branded stat banner for sharing. */
function buildRecapCard() {
  const card = document.createElement('canvas')
  card.width = canvas.width
  card.height = canvas.height
  const ctx = card.getContext('2d')
  ctx.drawImage(canvas, 0, 0, card.width, card.height)

  const barH = Math.round(card.height * 0.16)
  const barY = card.height - barH
  const grad = ctx.createLinearGradient(0, barY, 0, card.height)
  grad.addColorStop(0, 'rgba(40,30,28,0)')
  grad.addColorStop(0.35, 'rgba(40,30,28,.72)')
  grad.addColorStop(1, 'rgba(40,30,28,.86)')
  ctx.fillStyle = grad
  ctx.fillRect(0, barY, card.width, barH)

  const pad = card.width * 0.035
  const big = Math.round(barH * 0.42)
  const small = Math.round(barH * 0.17)
  ctx.textBaseline = 'alphabetic'

  // Watermark gets its own line at the top of the bar so it never has to
  // share horizontal space (and possibly collide) with the stats line below.
  ctx.textAlign = 'right'
  ctx.font = `800 ${small}px system-ui, sans-serif`
  ctx.fillStyle = 'rgba(255,248,239,.75)'
  ctx.fillText('Paper Plane Run', card.width - pad, barY + small * 1.15)
  ctx.textAlign = 'left'

  ctx.fillStyle = '#fff8ef'
  ctx.font = `900 ${big}px system-ui, sans-serif`
  ctx.fillText(`${Math.floor(distance)}m`, pad, card.height - barH * 0.42)

  ctx.font = `700 ${small}px system-ui, sans-serif`
  ctx.fillStyle = '#f0c94a'
  const starsStr = `${stars}★`
  ctx.fillText(starsStr, pad, card.height - barH * 0.13)
  const starsW = ctx.measureText(starsStr).width
  ctx.fillStyle = 'rgba(255,248,239,.85)'
  ctx.fillText(
    ` · ${difficulty.label} · ${activeZoneAt(distance).name}`,
    pad + starsW,
    card.height - barH * 0.13,
  )
  return card.toDataURL('image/jpeg', 0.88)
}

function capturePhoto() {
  try {
    lastPhotoDataUrl = buildRecapCard()
    photoImg.src = lastPhotoDataUrl
    photoCaption.textContent = runKind === 'timeattack'
      ? `${stars}★ in 60s · ${difficulty.label}`
      : `${Math.floor(distance)}m · ${stars}★ · ${difficulty.label}`
    photoWrap.classList.remove('hidden')
  } catch {
    photoWrap.classList.add('hidden')
  }
}

function applyRescuePop() {
  velX *= 0.4
  speedBoost = Math.max(speedBoost, 6)
  mouseTarget.y = THREE.MathUtils.clamp(Math.max(mouseTarget.y, planeY) + 3.2, MIN_Y, MAX_Y)
  const joyMode = wantsJoystick()
  const aiming = !joyMode && runKind !== 'coop'
  if (aiming) rescueLift = 18
  else velY = Math.max(velY, 0) + 12
}

function die(reason) {
  if (state !== 'playing') return
  // Clean, non-crash endings: the tutorial finish line and a Time Attack
  // clock running out. Neither should be absorbed by shield/guardian, and
  // neither plays the tumble-crash animation.
  const isCleanEnd = reason === 'Tutorial complete!' || reason === "Time's up!" || reason === 'Journey route complete!'

  // Invulnerability (after shield break / boost start)
  if (invuln > 0 && !isCleanEnd) return

  // Shield absorbs one hazard (not ground / tutorial end / time-up)
  if (
    activePower?.kind === 'shield' &&
    reason !== 'Nosed into the paper ground' &&
    !isCleanEnd
  ) {
    if (journeyTelemetry) journeyTelemetry.shieldUsed = true
    audio.shieldHit()
    if (settings.haptics) Haptic.nearMiss()
    clearPower()
    shake = 0.55
    invuln = 1.35
    damageFlash = 1.1
    _damageOrigColor.copy(planeBodyMat.color)
    applyRescuePop()
    // flash shield pop
    spawnConfetti(planeX, planeY, 1, 'route')
    if (shieldBubble) shieldBubble.visible = false
    return
  }

  // Guardian Crease: a purchased free save, used when no shield is active
  if (shouldGuardianSave({ remaining: guardianLeft, isCleanEnd })) {
    const guardian = consumeGuardianCharge({
      charges: activeUpgradeEffects.guardianCharges,
      remaining: guardianLeft,
    })
    guardianLeft = guardian.remaining
    if (guardianHudVal) guardianHudVal.textContent = String(guardian.remaining)
    guardianHud?.classList.toggle('hidden', !guardian.visible)
    guardianHud?.setAttribute('data-hud-priority', guardian.visible ? 'primary' : 'secondary')
    guardianHud?.classList.remove('guardian-save-flash')
    void guardianHud?.offsetWidth
    guardianHud?.classList.add('guardian-save-flash')
    audio.shieldHit()
    if (settings.haptics) Haptic.power()
    shake = Math.max(shake, guardian.shake)
    invuln = guardian.invulnSeconds
    damageFlash = 1.1
    _damageOrigColor.copy(planeBodyMat.color)
    applyRescuePop()
    spawnConfetti(planeX, planeY, 1)
    spawnConfetti(planeX, planeY + 0.5, 0)
    powerBanner.textContent = guardian.banner
    powerBanner.classList.remove('hidden')
    bannerTimer = guardian.bannerSeconds
    document.getElementById('warn-flash')?.classList.remove('guardian-flash')
    void document.getElementById('warn-flash')?.offsetWidth
    document.getElementById('warn-flash')?.classList.add('guardian-flash')
    return
  }

  const isWin = isCleanEnd
  state = 'dead'
  crashT = isWin ? 0.35 : 1.05
  crashReason = reason
  shake = isWin ? 0.2 : 1.1
  hitStopTimer = isWin ? 0 : 0.09
  speedBoost = 0
  fovPunch = isWin ? 0 : -6
  showStick(false)
  clearPower()
  // Freeze the weather with the world: no streaks hanging mid-gust.
  for (const s of windStreaks) s.visible = false
  showFlightFeedback(isWin ? 'ROUTE COMPLETE' : 'PAPER CRASH', isWin ? 'route' : 'hazard', isWin ? 1.5 : 1.1)
  pulseFlightImpact(isWin ? 'route' : 'hazard')

  // Sync crash pose
  plane.position.set(planeX, planeY, 0)
  if (!isWin) {
    audio.crash()
    if (settings.haptics) Haptic.crash()
    spawnConfetti(planeX, planeY, 0, isWin ? 'route' : 'classic')
    spawnConfetti(planeX, planeY + 0.5, 1, isWin ? 'route' : 'classic')
    // paper burst velocity
    velX = (rng() - 0.5) * 20
    velY = 6 + rng() * 4
  } else {
    audio.missionComplete()
    if (settings.haptics) Haptic.collect()
    if (reason === 'Tutorial complete!') {
      safeSetItem('paper-plane-run-tutorial', '1')
      tutorialDone = true
    }
  }

  track('death', {
    reason,
    distance: Math.floor(distance),
    stars,
    mode: difficulty.id,
    kind: runKind,
    combo: maxCombo,
    boss: bossActive,
  })

  // Capture after a short beat so crash pose is visible (async)
  setTimeout(() => {
    if (state === 'dead') capturePhoto()
  }, isWin ? 50 : 180)

  // Defer full game-over UI until crash anim plays
  // finalizeDeath is called from update when crashT hits 0
}

function finalizeDeath() {
  if (state !== 'dead') return
  try {
    finalizeDeathUnsafe()
  } catch (err) {
    // A single localStorage write failure (Safari private browsing throws
    // on any setItem, or a full quota) used to leave the player stuck on a
    // frozen crash frame forever, since nothing else re-triggers this call.
    // Always surface *some* game-over screen even if stats/saves broke.
    console.error('finalizeDeath failed', err)
    $('gameover-title').textContent = 'Crashed!'
    finalScoreEl.textContent = `${Math.floor(distance)}m · ${stars}★`
    finalDetailEl.textContent = crashReason || ''
    hudEl.classList.add('hidden')
    gameoverEl.classList.remove('hidden')
  }
  crashT = -1
}

const HANGAR_ONBOARD_KEY = 'paper-plane-run-hangar-onboard'

function maybeShowHangarOnboarding(reason, summary) {
  if (localStorage.getItem(HANGAR_ONBOARD_KEY) === '1') return
  const tutorialJustDone = reason === 'Tutorial complete!'
  const wallet = summary?.walletAfterRun ?? getWallet()
  const canBuy = listUpgrades().some((upgrade) => upgrade.canAfford)
  // First clear tutorial, or first time the wallet can fund a core upgrade.
  if (!tutorialJustDone && !(canBuy && wallet >= 10)) return
  safeSetItem(HANGAR_ONBOARD_KEY, '1')
  const message = canBuy
    ? 'Tip: open Hangar and buy Fold Handling or Lift Crease — sharper flight!'
    : 'Tip: bank ★ in Classic, then spend them on upgrades in the Hangar.'
  notifications.show(message, { duration: settings.reducedMotion ? 2800 : 5200 })
  const hangarCta = $('hangar-from-gameover')
  if (hangarCta && hangarCta.classList.contains('hidden')) {
    hangarCta.classList.remove('hidden')
    hangarCta.textContent = canBuy ? (summary?.ctaLabel || 'Open Hangar') : 'Open Hangar'
    hangarCta.setAttribute('aria-hidden', 'false')
    if (summary?.focusUpgradeId) hangarCta.dataset.focusUpgrade = summary.focusUpgradeId
  }
  shellBridge?.refreshProgression?.()
}

function renderRunSummary(summary) {
  if (!runSummaryEl || !summary) return
  runSummaryEl.innerHTML = ''
  const items = [
    { label: 'Banked', value: `+${summary.bankedStars}★`, emphasis: summary.bankedStars > 0 },
    {
      label: summary.improvementMeters > 0 ? 'Personal best' : 'Best combo',
      value: summary.improvementMeters > 0 ? `+${summary.improvementMeters}m` : `${summary.maxCombo}x`,
    },
    { label: 'Next', value: summary.nextAction, next: true },
  ]
  for (const item of items) {
    const row = document.createElement('div')
    if (item.next) row.classList.add('run-summary-next')
    if (item.emphasis) row.classList.add('run-summary-banked')
    const key = document.createElement('span')
    const result = document.createElement('strong')
    key.textContent = item.label
    result.textContent = item.value
    row.append(key, result)
    runSummaryEl.appendChild(row)
  }
  runSummaryEl.classList.remove('hidden')

  const hangarCta = $('hangar-from-gameover')
  if (hangarCta) {
    const showHangar = summary.nextActionKind === 'spend' || summary.nextActionKind === 'hangar'
    hangarCta.classList.toggle('hidden', !showHangar)
    hangarCta.textContent = summary.ctaLabel || 'Open Hangar'
    hangarCta.setAttribute('aria-hidden', String(!showHangar))
    if (summary.focusUpgradeId) hangarCta.dataset.focusUpgrade = summary.focusUpgradeId
    else delete hangarCta.dataset.focusUpgrade
  }
}

function finalizeDeathUnsafe() {
  manualPause = false
  pauseOverlay?.classList.add('hidden')
  pauseBtn?.classList.add('hidden')
  if (speedFxEl) speedFxEl.style.opacity = '0'
  flightFeedbackTimer = 0
  flightFeedbackEl?.classList.add('hidden')
  hideEdgeIndicators()
  nextZoneHud?.classList.add('hidden')
  ghostDeltaHud?.classList.add('hidden')
  guardianHud?.classList.add('hidden')
  tutorialHintEl?.classList.add('hidden')
  const reason = crashReason
  const isWin = reason === 'Tutorial complete!' || reason === "Time's up!" || reason === 'Journey route complete!'
  // Time Attack scores on stars-in-60s, not distance, so it shouldn't
  // pollute the distance best/ghost/leaderboards the other modes share.
  const isDistanceRun = runKind !== 'tutorial' && runKind !== 'layout' && runKind !== 'timeattack' && runKind !== 'journey'
  const d = Math.floor(distance)
  lastRun = {
    d,
    s: stars,
    m: difficulty.id,
    daily: runKind === 'daily',
    weekly: runKind === 'weekly',
    timeAttack: runKind === 'timeattack',
    seed: activeRunSeed,
    kind: runKind,
    foldId: activeFold?.id || '',
    path: ghostRecorder?.toJSON?.() || [],
  }

  const previousBestDistance = bestDistance
  const wasNewBest = !isWin && d > bestDistance && d > 0 && isDistanceRun
  if (wasNewBest) {
    bestDistance = d
    saveBest(difficulty.id, d)
  }
  bestEl.textContent = `${Math.floor(bestDistance)}m`
  const wasNewTimeAttackBest = runKind === 'timeattack' && stars > bestTimeAttackStars
  if (wasNewTimeAttackBest) {
    bestTimeAttackStars = stars
    saveBest('timeattack-stars', stars)
  }
  newBestBadge?.classList.toggle('hidden', !wasNewBest && !wasNewTimeAttackBest)

  if (ghostRecorder && isDistanceRun && !isWin) {
    saveGhostIfBest(ghostStorageKey(), d, ghostRecorder.toJSON(), stars)
  }

  if (stars > 0) {
    addLifetimeStars(stars)
    addWallet(stars)
  }
  let journeyBonus = 0
  let completedJourneyRoute = false
  if (runKind === 'journey' && journeyRunConfig) {
    completedJourneyRoute = reason === 'Journey route complete!'
    journeyBonus = completedJourneyRoute
      ? Math.max(0, Math.round(stars * (journeyRunConfig.rewardMultiplier - 1)))
      : 0
    const rewardId = `${journeyRunConfig.attemptId}:bonus`
    if (journeyBonus > 0 && applyJourneyRewardOnce(localStorage, { id: rewardId })) {
      addLifetimeStars(journeyBonus)
      addWallet(journeyBonus)
    } else if (journeyBonus > 0) journeyBonus = 0
    const rivalBeaten = !!journeyRunConfig.rival && completedJourneyRoute
    const journeyOutcomeBase = Object.freeze({
      receiptId: journeyRunConfig.attemptId,
      pilotId: journeyRunConfig.pilotId,
      routeId: journeyRunConfig.routeId,
      destinationId: journeyRunConfig.zone,
      completed: completedJourneyRoute,
      risky: journeyRunConfig.risk === 'risky',
      distance: d,
      stars: stars + journeyBonus,
      nearMisses: journeyTelemetry?.nearMisses || 0,
      shortcutGatesCleared: journeyTelemetry?.shortcutGatesCleared || 0,
      shortcutGatesTotal: journeyTelemetry?.shortcutGatesTotal || 0,
      shieldUsed: !!journeyTelemetry?.shieldUsed,
      collectedJourneyStars: journeyTelemetry?.collectedJourneyStars || 0,
      rivalBeaten,
      completedEventIds: Object.freeze([...(journeyTelemetry?.completedEventIds || [])]),
    })
    const objectiveResult = resolveJourneyObjective(journeyRunConfig.objective, journeyOutcomeBase)
    const masteryBefore = getPilotMasteryView(mastery, journeyRunConfig.pilotId)
    mastery = resolveMasteryOutcome(mastery, journeyOutcomeBase)
    const masteryAfter = getPilotMasteryView(mastery, journeyRunConfig.pilotId)
    const journeyOutcome = Object.freeze({
      ...journeyOutcomeBase,
      objectiveResult,
      masteryLevel: masteryAfter?.level || 0,
      decorationIds: Object.freeze([...(masteryAfter?.cosmetics || [])]),
    })
    try { saveMastery(localStorage, mastery) } catch (error) { console.warn('Journey mastery save failed', error) }
    lastJourneyResult = Object.freeze({
      outcome: journeyOutcome,
      objectiveResult,
      masteryBefore,
      masteryAfter,
      unlockedCosmetic: masteryAfter?.cosmetics.find((id) => !masteryBefore?.cosmetics.includes(id)) || null,
    })
    journey = resolveJourneyFlight(journey, journeyOutcome)
    saveJourney(localStorage, journey)
    if (journey.postcard && savePostcardOnce(localStorage, journey.postcard)) {
      track('journey_postcard_completed', { journeyId: journey.id, rivalBeaten: journey.postcard.rivalBeaten })
    }
    track(completedJourneyRoute ? 'journey_flight_completed' : 'journey_flight_crashed', {
      journeyId: journey.id,
      routeId: journeyRunConfig.routeId,
      step: journeyRunConfig.stepIndex,
      distance: d,
    })
    if (journeyRunConfig.rival && completedJourneyRoute) {
      track('journey_rival_beaten', { journeyId: journey.id, routeId: journeyRunConfig.routeId })
    }
  }
  let weeklyBonus = 0
  if (runKind !== 'tutorial' && runKind !== 'layout') {
    addLifetimeDistance(d)
    addLifetimePopped(runStats.popped)
    incrementRunCount()
    updatePlayStreak()
    weeklyBonus = claimWeeklyStreakBonus()
    if (weeklyBonus > 0) {
      addLifetimeStars(weeklyBonus)
      addWallet(weeklyBonus)
    }
  }
  const walletAfterRun = getWallet()
  const affordableUpgrades = listUpgrades()
    .filter((upgrade) => upgrade.canAfford)
    .map((upgrade) => ({ id: upgrade.id, name: upgrade.name, cost: upgrade.cost }))
  const runSummary = buildRunSummary({
    stars,
    journeyBonus,
    weeklyBonus,
    distance: d,
    previousBest: previousBestDistance,
    maxCombo,
    reason,
    walletAfterRun,
    affordableUpgrades,
  })
  refreshUnlocks(season.id)
  updateMissionsFromRun({
    stars,
    distance: d,
    maxCombo,
    powers: runStats.powers,
    winds: runStats.winds,
    popped: runStats.popped,
    mode: difficulty.id,
    daily: runKind === 'daily',
  })
  refreshMissionBadge()

  const name = normalizeLeaderboardName(pilotNameInput.value)
  if (isDistanceRun) {
    submitLocalScore({
      name, distance: d, stars, mode: difficulty.id,
      daily: runKind === 'daily', dailyKey: dailyKey(),
      weekly: runKind === 'weekly', weeklyKey: weeklyKey(),
    })
    submitRemoteScore({
      name, distance: d, stars, mode: difficulty.id,
      daily: runKind === 'daily',
      weekly: runKind === 'weekly',
    })
  } else if (runKind === 'timeattack') {
    submitTimeAttackScore({ name, stars, distance: d, mode: difficulty.id })
  }

  if (hotseat.active && runKind === 'hotseat') {
    hotseat.scores[hotseat.turn] = d
    if (hotseat.turn < hotseat.players - 1) {
      hotseat.turn++
      gameoverEl.classList.add('hidden')
      hudEl.classList.add('hidden')
      hotseatTitle.textContent = `Player ${hotseat.turn + 1}'s turn`
      hotseatScores.textContent = hotseat.scores.map((s, i) => `P${i + 1}: ${s}m`).join(' · ')
      hotseatInter.classList.remove('hidden')
      crashT = -1
      return
    }
    const winner = hotseat.scores[0] >= hotseat.scores[1] ? 1 : 2
    $('gameover-title').textContent = `Player ${winner} wins!`
    finalScoreEl.textContent = `P1 ${hotseat.scores[0]}m · P2 ${hotseat.scores[1]}m`
    finalDetailEl.textContent = reason
    newBestBadge?.classList.add('hidden')
    hotseat.active = false
  } else {
    $('gameover-title').textContent = runKind === 'journey' && completedJourneyRoute
      ? (journey.status === 'complete' ? 'Journey complete!' : 'Route complete!')
      : isWin ? reason : 'Crashed!'
    if (runKind === 'timeattack') {
      animateCountUp(finalScoreEl, stars, `★ in ${TIME_ATTACK_SECONDS}s · ${Math.floor(distance)}m flown`)
      finalDetailEl.textContent = 'Nice reflexes!'
    } else {
      animateCountUp(finalScoreEl, d, `m · ${stars}★ · ${difficulty.label}${runKind === 'daily' ? ' · Daily' : ''}`)
      finalDetailEl.textContent = runKind === 'journey' && completedJourneyRoute
        ? `Stamp earned${journeyBonus ? ` · +${journeyBonus}★ route bonus` : ''}`
        : reason
    }
  }

  if (retryBtn) {
    retryBtn.textContent = runKind === 'journey'
      ? (completedJourneyRoute ? (journey.status === 'complete' ? 'View Journey' : 'Continue Journey') : 'Retry Route')
      : 'Fly Again'
  }
  renderRunSummary(runSummary)
  maybeShowHangarOnboarding(reason, runSummary)

  renderJourneyResultProgress(journeyResultProgressEl, runKind === 'journey' ? lastJourneyResult : null)
  if (lastJourneyResult?.unlockedCosmetic) {
    notifications.show(`Mastery unlocked · ${cosmeticLabel(lastJourneyResult.unlockedCosmetic)}`, {
      duration: settings.reducedMotion ? 1800 : 3200,
    })
    if (settings.haptics) Haptic.collect()
  }
  if (completedJourneyRoute && journey?.status === 'complete' && journey.postcard) {
    requestAnimationFrame(() => showPostcardReveal(journey.postcard))
  }

  if (challenge && challenge.m === difficulty.id) {
    challengeResult.classList.remove('hidden')
    const rival = launchChallenge?.name ? `${launchChallenge.name}'s ` : ''
    challengeResult.textContent =
      d > challenge.d
        ? `You beat ${rival}${challenge.d}m ghost! (${challenge.d}m → ${d}m)`
        : `${rival || 'Challenge '}ghost was ${challenge.d}m · ${challenge.s}★ — you got ${d}m · ${stars}★`
  } else challengeResult.classList.add('hidden')
  const shareBtn = $('share-btn')
  if (shareBtn) {
    shareBtn.textContent = lastRun.path?.length ? 'Share ghost' : 'Share Score'
  }

  if (streakBadge) {
    streakBadge.textContent = `🔥 ${getPlayStreak()}-day streak${weeklyBonus > 0 ? ` · +${weeklyBonus}★ bonus!` : ''}`
    streakBadge.classList.toggle('hidden', getPlayStreak() < 2)
  }

  hudEl.classList.add('hidden')
  gameoverEl.classList.remove('hidden')
  windBanner.classList.add('hidden')
  powerBanner.classList.add('hidden')
  shareStatus.textContent = ''
}

// ---------------------------------------------------------------------------
// World update
// ---------------------------------------------------------------------------
/**
 * Ground skim — flying the low lane is the risky one (buildings rise from the
 * ground), so holding it banks stars and lifts the score multiplier.
 */
function updateGroundSkim(dt) {
  const next = advanceGroundSkim(groundSkim, {
    low: planeY < SKIM_CEILING,
    dt,
    // Deliberately not gated on bossActive. Gates arrive every ~500m, and
    // voiding an earned chain for a scripted event the player did not cause
    // made long skims impossible to hold. The boss passage already constrains
    // where you can fly; altitude stays the player's own call.
    enabled: state === 'playing',
  })
  const wasActive = groundSkim.active
  groundSkim = next

  if (next.releaseDistance > 0) {
    // Climbing out under control converts the held chain into distance.
    distance += next.releaseDistance
    showFlightFeedback(next.banner, 'route', 1.2)
    pulseFlightImpact('route')
    audio.zoneTransition?.()
    if (settings.haptics) Haptic.collect()
  }

  if (next.bankedStars > 0) {
    stars += next.bankedStars
    runStats.stars = stars
    starsEl.textContent = String(stars)
    audio.starStreak(Math.min(1, next.tier / 5))
    if (settings.haptics) Haptic.collect()
    showFlightFeedback(next.banner, 'star', 1.1)
    pulseFlightImpact('star')
    if (!settings.reducedMotion) spawnConfetti(planeX, planeY - 0.3, 0)
  }

  if (!skimHud || !skimVal) return
  if (next.active && next.tier > 0) {
    skimVal.textContent = describeSkimHudValue(next)
    skimHud.className = `hud-card skim-hud ${skimHudTier(next.tier)}`.trim()
    skimHud.classList.remove('hidden')
  } else if (wasActive || !skimHud.classList.contains('hidden')) {
    skimHud.classList.add('hidden')
  }
}

function scrollWorld(move, lateralDrift = 0) {
  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i]
    e.mesh.position.z -= move
    if (e.mesh.position.z < -25) {
      scene.remove(e.mesh)
      entities.splice(i, 1)
    }
  }
  for (const cl of clouds) {
    cl.position.z -= move * 0.35
    if (cl.position.z < -30) {
      cl.position.z = 180 + rng() * 50
      cl.position.x = (rng() - 0.5) * 55
    }
  }
  ground.position.z -= move
  if (ground.position.z < -80) ground.position.z += 140
  scrollGroundLife(move)
  const pos = dust.geometry.attributes.position
  for (let i = 0; i < dustCount; i++) {
    pos.array[i * 3 + 2] -= move * 0.55
    // A blowing gust leans the ambient dust with it — cheap but convincing
    // weather cue that rides the same field instead of new geometry.
    if (lateralDrift) pos.array[i * 3] = THREE.MathUtils.clamp(pos.array[i * 3] + lateralDrift, -22.5, 22.5)
    if (pos.array[i * 3 + 2] < -10) {
      pos.array[i * 3 + 2] = 200
      pos.array[i * 3] = (Math.random() - 0.5) * 45
    }
  }
  pos.needsUpdate = true
  nextSpawnZ -= move
}

function animateHazards(dt) {
  for (const e of entities) {
    if (e.journeyMotion) {
      const motion = e.journeyMotion
      e.mesh.position.x = motion.originX + Math.sin(hazardClock * motion.speed) * motion.amplitude * motion.direction
    }
    if (e.type === 'bird') {
      const u = e.mesh.userData
      u.phase = (u.phase || 0) + dt * 8
      // Steep gull-wing baseline (not just a shallow tilt) so the wings
      // still show real frontal cross-section head-on, where the player
      // actually meets these hazards — a flat/shallow dihedral collapses
      // to a thin edge-on line from that angle and reads as a spike.
      const flap = Math.sin(u.phase) * 0.35
      if (u.wingL) u.wingL.rotation.z = 0.85 + flap
      if (u.wingR) u.wingR.rotation.z = -0.85 - flap
      // Motion is an absolute offset from the spawn anchor, recomputed from
      // the clock every frame rather than accumulated into the position.
      // Integrating `sin(phase) * dt` does not average out — it built up a
      // one-sided drift that could carry a hazard into the reserved passage
      // lane, and its size depended on how the frames happened to land.
      // A Journey encounter drives its own authored path; that wins.
      if (u.pattern && u.anchorX !== undefined && !e.journeyMotion) {
        const offset = resolveHazardOffset({
          pattern: u.pattern,
          hazardClock,
          phase: u.phase,
          speed: u.motionSpeed,
          amplitudeX: u.amplitudeX,
          amplitudeY: u.amplitudeY,
        })
        e.mesh.position.x = u.anchorX + offset.x
        e.mesh.position.y = u.anchorY + offset.y
        const roll = resolveHazardRoll({
          pattern: u.pattern, hazardClock, phase: u.phase, speed: u.motionSpeed,
        })
        if (u.pattern === 'tumble') e.mesh.rotation.z = roll
        else if (u.billboard && u.pattern === 'orbit') u.billboard.rotation.z = roll
      }
      // Face camera for billboards
      if (u.billboard) u.billboard.rotation.y = Math.PI
      if (e.mesh.userData.billboard && e.mesh.userData.billboard !== u.billboard) {
        e.mesh.userData.billboard.rotation.y = Math.PI
      }
    }
    if (e.type === 'power') {
      if (e.mesh.userData.billboard) e.mesh.userData.billboard.rotation.y = Math.PI
      if (e.mesh.userData.glow) {
        e.mesh.userData.glow.material.opacity = 0.12 + Math.sin(hazardClock * 5 + e.mesh.position.z) * 0.06
      }
      if (e.mesh.userData.core) e.mesh.userData.core.rotation.y += dt * 2.2
    }
    if (e.type === 'scissors') {
      e.mesh.rotation.z += dt * 1.2
      if (e.mesh.userData.billboard) e.mesh.userData.billboard.rotation.y = Math.PI
    }
    const outline = e.mesh.userData.lethalOutline
    if (outline && (e.type === 'bird' || e.type === 'scissors')) {
      // Start ringing earlier (z<36) so the approach reads as pressure; the
      // shared glow mesh mirrors the pulse without a second draw call.
      const near = e.mesh.position.z < 36
      const pulse = near ? 0.62 + Math.sin(hazardClock * 10) * 0.24 : 0
      outline.visible = near
      outline.material.opacity = pulse
      const glow = e.mesh.userData.lethalGlow
      if (glow) {
        glow.visible = near
        glow.material.opacity = pulse * 0.38
      }
    }
    if (e.type === 'boss') {
      const u = e.mesh.userData
      const encounter = e.director?.step(dt)
      u.phase += dt * 2.2
      // The director commits to one readable lane. Timing varies by
      // difficulty, while the existing collision opening stays unchanged.
      u.gapY = resolveBossGapY({
        playerY: planeY,
        safeY: encounter?.safeY ?? 10,
        bossZ: e.mesh.position.z,
      })
      u.encounter = encounter
      if (encounter?.phase && encounter.phase !== e.lastBossPhase) {
        e.lastBossPhase = encounter.phase
        const presentation = describeBossPhase(encounter)
        u.bossIntensity = presentation.intensity
        document.documentElement.dataset.bossPhase = encounter.phase
        zoneBanner.textContent = `${bossBannerEmoji(u.kind)} Fly the glowing hoop`
        zoneBanner.classList.remove('hidden')
        zoneBannerTimer = settings.reducedMotion ? 1.2 : 1.7
        hitStopTimer = Math.max(hitStopTimer, presentation.hitStopSeconds)
        audio.incoming()
        audio.bossWarning()
        pulseFlightImpact('hazard')
        if (settings.haptics) Haptic.tap()
      }
      const halfH = encounter?.passage?.halfHeight ?? u.halfHeight ?? 3.7
      if (u.kind === 'wind') {
        if (encounter?.motionAllowed !== false && u.fanL) u.fanL.rotation.z += dt * 7
        if (encounter?.motionAllowed !== false && u.fanR) u.fanR.rotation.z -= dt * 7
        if (u.fanL) u.fanL.position.y = u.gapY
        if (u.fanR) u.fanR.position.y = u.gapY
        if (u.debris) {
          for (const d of u.debris) {
            if (encounter?.motionAllowed !== false) d.userData.orbit += dt * d.userData.speed
            const r = d.userData.radius
            // Debris stays outside the portal radius.
            d.position.set(
              Math.cos(d.userData.orbit) * r,
              u.gapY + (d.userData.yBias || 0) + Math.sin(d.userData.orbit * 1.1) * 0.8,
              Math.sin(d.userData.orbit) * 0.5,
            )
            if (encounter?.motionAllowed !== false) d.rotation.z += dt * 2.4
          }
        }
      } else if (u.kind === 'stapler') {
        // Mild press animation that never closes the open slot.
        const press = encounter?.motionAllowed === false
          ? 0.15
          : 0.45 + Math.sin(u.phase * 2.1) * 0.28
        if (u.topJaw) u.topJaw.position.y = u.gapY + halfH + 0.85 + press
        if (u.bottomJaw) u.bottomJaw.position.y = u.gapY - halfH - 0.85 - press
      } else {
        // Scissors side blades: gentle bob only — never tilt into the portal.
        if (u.left) {
          const snap = encounter?.motionAllowed === false ? 0 : Math.sin(u.phase * 3.2) * 0.55
          u.left.position.y = u.gapY + snap
          u.left.rotation.z = encounter?.motionAllowed === false ? 0 : Math.sin(u.phase * 2.4) * 0.18
        }
        if (u.right) {
          const snap = encounter?.motionAllowed === false ? 0 : Math.sin(u.phase * 3.2 + 1.2) * 0.55
          u.right.position.y = u.gapY + snap
          u.right.rotation.z = encounter?.motionAllowed === false ? 0 : -Math.sin(u.phase * 2.4) * 0.18
        }
      }
      if (u.leftLip) u.leftLip.position.y = u.gapY
      if (u.rightLip) u.rightLip.position.y = u.gapY
      const halfW = encounter?.passage?.halfWidth ?? u.halfWidth ?? 4
      if (u.artBadges?.length) {
        const layout = getBossBadgeLayout({ halfWidth: halfW, halfHeight: halfH, gapY: u.gapY })
        for (const badge of u.artBadges) {
          const slot = layout[badge.userData.badgeSlot]
          if (!slot) continue
          badge.position.set(slot.x, slot.y, slot.z)
        }
      } else if (u.artOverlay) {
        u.artOverlay.position.y = u.gapY + halfH + 1.8
      }
      const safeRing = u.safeRing
      if (safeRing) {
        safeRing.position.y = u.gapY
        // Soft pulse on the portal fill / frame without rescaling collision size.
        const pulse = encounter?.motionAllowed === false ? 1 : 1 + Math.sin(hazardClock * 7) * 0.02
        safeRing.scale.set(pulse, pulse, 1)
      }
    }
    // Spin the billboard card in-plane (not around Y) so it keeps facing the camera
    if (e.type === 'star' && e.mesh.userData.billboard) e.mesh.userData.billboard.rotation.z += dt * 1.6
    if (e.type === 'power') {
      e.mesh.rotation.y += dt * 1.8
      e.mesh.userData.ring && (e.mesh.userData.ring.rotation.z += dt * 2)
    }
    if (e.type === 'ring') e.mesh.rotation.z += dt * 1.5
  }
  for (let i = confetti.length - 1; i >= 0; i--) {
    const c = confetti[i]
    if (!c.visible) continue
    c.userData.life -= dt
    c.position.addScaledVector(c.userData.v, dt)
    c.userData.v.y -= 8 * dt
    c.rotation.x += dt * 5
    if (c.userData.life <= 0) {
      c.visible = false
    }
  }
}

function registerNearMiss(kind = null) {
  if (journeyTelemetry) journeyTelemetry.nearMisses += 1
  combo++
  maxCombo = Math.max(maxCombo, combo)
  runStats.maxCombo = maxCombo
  comboTimer = getComboHold(activeUpgradeEffects).windowSeconds
  comboVal.textContent = describeComboHudValue({
    combo,
    feverActive,
    feverThresholdBonus: activeUpgradeEffects.feverThresholdBonus,
  })
  comboHud.classList.remove('hidden')
  comboHud.classList.remove('combo-pulse', 'combo-tier-warm', 'combo-tier-hot', 'combo-tier-legend')
  const tier = nearMissHudTier(combo)
  if (tier) comboHud.classList.add(tier)
  void comboHud.offsetWidth // restart the animation on rapid consecutive combos
  comboHud.classList.add('combo-pulse')
  comboFloat.textContent = describeNearMissFloat(combo)
  comboFloat.classList.remove('fever-float')
  comboFloat.classList.toggle('combo-float-hot', combo >= 6)
  comboFloat.classList.remove('hidden')
  setTimeout(() => comboFloat.classList.add('hidden'), combo >= 6 ? 700 : 500)
  if (combo === 3 || combo === 6 || combo === 10 || combo % 15 === 0) {
    showFlightFeedback(combo >= 6 ? `FEVER BUILDING · ${combo}x` : `NEAR MISS · ${combo}x`, combo >= 6 ? 'hot' : 'route', combo >= 6 ? 1.0 : 0.7)
  }
  audio.nearMiss(combo, kind)
  Haptic.nearMiss()
  const bursts = nearMissConfettiBursts(combo)
  for (let i = 0; i < bursts; i += 1) spawnConfetti(planeX, planeY + i * 0.25, 2 - i)
  distance += 5 * combo * 0.25
  // Small camera punch that grows with the streak — bigger chains feel bigger.
  if (!settings.reducedMotion) shake = Math.max(shake, nearMissShakeAmount(combo))
  if (shouldTriggerFever({
    combo,
    feverActive,
    feverThresholdBonus: activeUpgradeEffects.feverThresholdBonus,
  })) {
    triggerFever()
  }
}

/** A short score-multiplier burst for stringing together a big near-miss streak. */
function triggerFever() {
  const fever = createFeverState(activeUpgradeEffects)
  feverActive = fever.active
  feverTimer = fever.timer
  if (!settings.reducedMotion) shake = Math.max(shake, feverEnterShake())
  feverFx?.classList.add('fever-active')
  feverHud?.classList.remove('hidden')
  if (feverVal) feverVal.textContent = describeFeverHudValue(fever)
  comboFloat.textContent = '🔥 FEVER!'
  comboFloat.classList.add('fever-float')
  comboFloat.classList.remove('hidden')
  clearTimeout(feverFloatTimeout)
  feverFloatTimeout = setTimeout(() => comboFloat.classList.add('hidden'), 1000)
  audio.fever()
  Haptic.power()
  for (const offset of feverConfettiOffsets()) {
    spawnConfetti(planeX, planeY + offset.y, offset.z, 'fever')
  }
  runStats.fevers = (runStats.fevers || 0) + 1
  addLifetimeFever(1)
}

/** Consecutive star pickups within a short window — every 5th grants bonus stars. */
function registerStarStreak() {
  const pickup = registerStarPickup({
    count: starStreak,
    streakWindowBonus: activeUpgradeEffects.streakWindowBonus,
  })
  starStreak = pickup.count
  starStreakTimer = pickup.timer
  starStreakWindow = pickup.windowSeconds
  if (streakVal) streakVal.textContent = String(starStreak)
  const streakFill = $('streak-fill')
  if (streakFill) streakFill.style.width = '100%'
  if (pickup.visible && streakHud) {
    streakHud.classList.remove('hidden')
    streakHud.classList.remove('combo-pulse')
    void streakHud.offsetWidth
    streakHud.classList.add('combo-pulse')
  }
  if (pickup.milestone) {
    stars += pickup.bonusStars
    runStats.stars = stars
    starsEl.textContent = String(stars)
    audio.starStreak(pickup.count / 5)
    if (settings.haptics) Haptic.collect()
    spawnConfetti(planeX, planeY, 1, 'gold')
    powerBanner.textContent = pickup.banner
    powerBanner.classList.remove('hidden')
    bannerTimer = 2.0
    showFlightFeedback(pickup.banner, 'star', 1.2)
    pulseFlightImpact('star')
  }
}

function update(dt) {
  elapsed += dt
  const slowmo = activePower?.kind === 'slow'
  if (slowmo !== slowmoActive) {
    slowmoActive = slowmo
    document.getElementById('slow-fx')?.classList.toggle('slowmo-active', slowmo)
  }
  hazardClock += slowmo ? dt * SLOWMO_WORLD_SCALE : dt
  updateGroundLife(elapsed)
  if (flightFeedbackTimer > 0) {
    flightFeedbackTimer -= dt
    if (flightFeedbackTimer <= 0) flightFeedbackEl?.classList.add('hidden')
  }
  if (bannerTimer > 0) {
    bannerTimer -= dt
    if (bannerTimer <= 0) powerBanner.classList.add('hidden')
  }
  if (zoneBannerTimer > 0) {
    zoneBannerTimer -= dt
    if (zoneBannerTimer <= 0) zoneBanner.classList.add('hidden')
  }
  skyA.position.copy(camera.position)
  skyB.position.copy(camera.position)
  updateSkyFade(dt)

  if (state === 'menu') {
    hideFlightReadability()
    plane.position.set(0, 7 + Math.sin(elapsed * 1.2) * 0.45, 10)
    plane.rotation.y = Math.sin(elapsed * 0.55) * 0.45
    plane.rotation.z = Math.sin(elapsed * 0.9) * 0.18
    camera.position.set(Math.sin(elapsed * 0.22) * 7, 11, plane.position.z - 13)
    camera.lookAt(plane.position.x, plane.position.y, plane.position.z + 5)
    scrollWorld(8 * dt)
    animateHazards(dt)
    while (nextSpawnZ < 200) {
      spawnChunk(nextSpawnZ)
      nextSpawnZ += 18 + Math.random() * 10
    }
    return
  }

  if (state === 'dead') {
    hideFlightReadability()
    // Dramatic crash: tumble, drop, paper spin
    const isWin = crashReason === 'Tutorial complete!' || crashReason === "Time's up!" || crashReason === 'Journey route complete!'
    if (!isWin) {
      plane.rotation.z += dt * (4 + Math.abs(velX) * 0.1)
      plane.rotation.x += dt * 2.2
      plane.rotation.y += dt * 1.4
      plane.position.x += velX * dt
      plane.position.y = Math.max(0.3, plane.position.y + velY * dt)
      velY -= 28 * dt
      velX *= Math.pow(0.15, dt)
      // squash on ground
      if (plane.position.y <= 0.35) {
        plane.scale.y = THREE.MathUtils.lerp(plane.scale.y, 0.35, 1 - Math.pow(0.001, dt))
        plane.scale.x = THREE.MathUtils.lerp(plane.scale.x, 1.35, 1 - Math.pow(0.001, dt))
        velY = 0
      }
    } else {
      plane.position.y += Math.sin(elapsed * 4) * 0.01
      plane.rotation.y += dt * 0.8
    }
    camera.position.lerp(
      _camTarget.set(plane.position.x * 0.5, Math.max(3, plane.position.y + 4.5), -8),
      1 - Math.pow(0.002, dt),
    )
    camera.lookAt(plane.position)
    if (shake > 0) {
      shake = Math.max(0, shake - dt)
      camera.position.x += (Math.random() - 0.5) * shake * 0.8
      camera.position.y += (Math.random() - 0.5) * shake * 0.4
    }
    // FOV settle
    if (fovPunch !== 0) {
      fovPunch = THREE.MathUtils.lerp(fovPunch, 0, 1 - Math.pow(0.001, dt))
      camera.fov = baseFov + fovPunch
      camera.updateProjectionMatrix()
    }
    scrollWorld(Math.max(4, speed * 0.15) * dt)
    animateHazards(dt)
    if (crashT > 0) {
      crashT -= dt
      if (crashT <= 0) finalizeDeath()
    }
    return
  }

  // Playing
  // Brief unfold flourish right after launch — the plane pops in from a
  // crease instead of just appearing at full size.
  if (spawnUnfold < 1) {
    spawnUnfold = Math.min(1, spawnUnfold + dt / UNFOLD_SECONDS)
    const eased = 1 - Math.pow(1 - spawnUnfold, 3)
    plane.scale.setScalar(activeUpgradeEffects.planeScale * (0.15 + eased * 0.85) * 1.12)
  }
  if (runKind === 'timeattack' && timeAttackLeft > 0) {
    timeAttackLeft = Math.max(0, timeAttackLeft - dt)
    const secLeft = Math.ceil(timeAttackLeft)
    if (timeAttackValEl) timeAttackValEl.textContent = String(secLeft)
    timeAttackHud?.classList.toggle('combo-pulse', timeAttackLeft <= 10)
    // One tick per second crossed, only for the final urgent stretch.
    if (secLeft <= 10 && secLeft >= 1 && secLeft !== timeAttackLastTickSecond) {
      timeAttackLastTickSecond = secLeft
      audio.timeTick(secLeft)
      if (settings.haptics) Haptic.tap()
    }
    if (timeAttackLeft <= 0) {
      die("Time's up!")
      return
    }
  }
  if (runKind === 'journey' && journeyRunConfig) {
    const target = journeyRunConfig.finale ? 500 : 350
    if (distance >= target) {
      die('Journey route complete!')
      return
    }
  }
  if (invuln > 0) invuln -= dt
  if (journeyVisibilityTimer > 0) {
    journeyVisibilityTimer = Math.max(0, journeyVisibilityTimer - dt)
    if (journeyVisibilityTimer === 0) {
      scene.fog.far = (settings.reducedMotion ? 260 : 320) * (activeTwist?.fogMul ?? 1)
    }
  }
  if (fireCooldown > 0) fireCooldown = Math.max(0, fireCooldown - dt)
  if (paperPushCooldown > 0) paperPushCooldown = Math.max(0, paperPushCooldown - dt)
  updateWeaponFeedback()
  if (keys.has('KeyX')) fireWeapon({ allowPush: true })
  updateShots(dt)
  if (damageFlash > 0) {
    damageFlash = Math.max(0, damageFlash - dt)
    const t = damageFlash / 1.1
    planeBodyMat.color.copy(_damageOrigColor).lerp(_damageTint, t * 0.85)
    if (damageFlash <= 0) planeBodyMat.color.copy(_damageOrigColor)
  }

  // Default mouse target to plane if we haven't moved yet
  if (!mouseScreen.has) {
    mouseTarget.x = planeX
    mouseTarget.y = planeY
  }

  if (activePower) {
    activePower.timeLeft -= dt
    powerFill.style.width = `${(100 * Math.max(0, activePower.timeLeft)) / activePower.duration}%`
    if (activePower.kind === 'shield' && shieldBubble) {
      powerLabel.textContent = `🛡 Shield · ${Math.max(0, activePower.timeLeft).toFixed(1)}s`
      if (settings.reducedMotion) {
        shieldBubble.material.opacity = 0.19
        shieldBubble.visible = true
      } else {
        shieldBubble.material.opacity = 0.15 + Math.sin(elapsed * 6) * 0.08
        // flash when about to expire
        if (activePower.timeLeft < 1.2) {
          shieldBubble.visible = Math.sin(elapsed * 20) > 0
        }
      }
    }
    if (activePower.kind === 'phase' && shieldBubble) {
      if (settings.reducedMotion) {
        shieldBubble.material.opacity = 0.2
        shieldBubble.visible = true
      } else {
        // Faster, spookier flicker than the shield's slow pulse
        shieldBubble.material.opacity = 0.12 + Math.abs(Math.sin(elapsed * 11)) * 0.14
        if (activePower.timeLeft < 1) {
          shieldBubble.visible = Math.sin(elapsed * 24) > 0
        }
      }
    }
    if (activePower.kind === 'boost') {
      // Sustain a strong (but not overwhelming) boost for the full duration
      speedBoost = Math.max(speedBoost, 10 + activePower.timeLeft * 1.6)
      fovPunch = THREE.MathUtils.lerp(fovPunch, 9, 1 - Math.pow(0.001, dt))
      if (Math.random() < dt * 8) spawnConfetti(planeX, planeY - 0.2, -0.5)
    }
    syncPlanePowerLook(dt)
    if (activePower.timeLeft <= 0) {
      if (activePower.kind === 'boost') {
        speedBoost = Math.max(speedBoost * 0.5, 6)
        fovPunch = 2
      }
      clearPower()
    }
  }
  if (!activePower || activePower.kind !== 'boost') syncPlanePowerLook(dt)

  // Decay temporary boost (slower while boost power is active)
  if (speedBoost > 0) {
    const decay = activePower?.kind === 'boost' ? 2.5 : 16
    speedBoost = Math.max(0, speedBoost - dt * decay)
  }
  // FOV punch
  {
    const targetFov = activePower?.kind === 'boost' ? 8 : 0
    if (activePower?.kind !== 'boost') {
      fovPunch = THREE.MathUtils.lerp(fovPunch, targetFov, 1 - Math.pow(0.0008, dt))
    }
    camera.fov = baseFov + fovPunch
    camera.updateProjectionMatrix()
  }

  if (comboTimer > 0) {
    comboTimer -= dt
    const comboWindow = Math.max(0.01, getComboHold(activeUpgradeEffects).windowSeconds)
    const comboFill = $('combo-fill')
    if (comboFill) {
      comboFill.style.width = `${THREE.MathUtils.clamp(comboTimer / comboWindow, 0, 1) * 100}%`
    }
    if (comboTimer <= 0) {
      combo = 0
      comboHud.classList.add('hidden')
    }
  }
  if (starStreak > 0 || starStreakTimer > 0) {
    const prevCount = starStreak
    const nextStreak = advanceStarStreakState({ count: starStreak, timer: starStreakTimer }, dt)
    starStreak = nextStreak.count
    starStreakTimer = nextStreak.timer
    const streakFill = $('streak-fill')
    const streakWindow = Math.max(0.01, starStreakWindow || getStreakTuning(activeUpgradeEffects).windowSeconds)
    if (streakFill) {
      streakFill.style.width = nextStreak.visible
        ? `${THREE.MathUtils.clamp(starStreakTimer / streakWindow, 0, 1) * 100}%`
        : '0%'
    }
    if (prevCount >= 2 && !nextStreak.visible) {
      streakHud?.classList.add('hidden')
      powerBanner.textContent = '⭐ Star streak broken'
      powerBanner.classList.remove('hidden')
      bannerTimer = Math.max(bannerTimer, 1.1)
    } else if (!nextStreak.visible) {
      streakHud?.classList.add('hidden')
    }
  }
  if (feverActive) {
    const nextFever = advanceFeverState({
      active: feverActive,
      timer: feverTimer,
      threshold: getFeverTuning(activeUpgradeEffects).threshold,
      duration: getFeverTuning(activeUpgradeEffects).duration,
    }, dt)
    feverActive = nextFever.active
    feverTimer = nextFever.timer
    if (feverVal) feverVal.textContent = describeFeverHudValue(nextFever)
    if (!nextFever.active) {
      feverFx?.classList.remove('fever-active')
      feverHud?.classList.add('hidden')
    }
  }

  // Adaptive music: brighter/quicker as speed climbs and near-miss combo builds.
  // Fever pins the bed wide open — the score burst should sound like one too.
  const speedFactor = THREE.MathUtils.clamp(
    (speed - difficulty.speedBase) / Math.max(1, difficulty.speedCap - difficulty.speedBase), 0, 1,
  )
  const comboFactor = Math.min(1, combo / 6)
  audio.setIntensity(feverActive ? 1 : Math.min(1, speedFactor * 0.55 + comboFactor * 0.55))

  let inputX = 0
  let inputY = 0
  const joyMode = wantsJoystick()
  const mouseMode = !joyMode && runKind !== 'coop'

  // Co-op: P1 = arrows/stick only; P2 wind = WASD / IJKL / wind stick
  if (runKind === 'coop') {
    if (keys.has('ArrowLeft')) inputX -= 1
    if (keys.has('ArrowRight')) inputX += 1
    if (keys.has('ArrowUp')) inputY += 1
    if (keys.has('ArrowDown')) inputY -= 1
    if (stick.active || Math.abs(stick.x) + Math.abs(stick.y) > 0.02) {
      inputX = THREE.MathUtils.clamp(inputX + stick.x, -1, 1)
      inputY = THREE.MathUtils.clamp(inputY + stick.y, -1, 1)
    }
    const inv = applyAxisInvert(inputX, inputY)
    // The chase camera looks toward +Z (opposite Three's default -Z forward),
    // which mirrors its screen-right direction onto world -X. Relative input
    // modes (stick/keys) set world X directly, so without this flip
    // "right" would visibly steer left. Mouse-aim mode doesn't need this —
    // it raycasts through the camera's real basis, so it's self-correcting.
    inputX = -inv.x
    inputY = inv.y
  } else if (joyMode) {
    // Joystick / keyboard relative control
    if (keys.has('ArrowLeft') || keys.has('KeyA')) inputX -= 1
    if (keys.has('ArrowRight') || keys.has('KeyD')) inputX += 1
    if (keys.has('ArrowUp') || keys.has('KeyW')) inputY += 1
    if (keys.has('ArrowDown') || keys.has('KeyS')) inputY -= 1
    if (stick.active || Math.abs(stick.x) + Math.abs(stick.y) > 0.02) {
      inputX = THREE.MathUtils.clamp(inputX + stick.x, -1, 1)
      inputY = THREE.MathUtils.clamp(inputY + stick.y, -1, 1)
    }
    const inv = applyAxisInvert(inputX, inputY)
    // See the mirrored-camera note above — same correction applies here.
    inputX = -inv.x
    inputY = inv.y
  } else {
    // Mouse aim: plane flies toward cursor world target
    // Keyboard still nudges target for accessibility. mouseTarget is a
    // world position (not camera-relative), so it needs the same mirror
    // flip as the relative-input modes above.
    if (keys.has('ArrowLeft') || keys.has('KeyA')) mouseTarget.x += 18 * dt
    if (keys.has('ArrowRight') || keys.has('KeyD')) mouseTarget.x -= 18 * dt
    if (keys.has('ArrowUp') || keys.has('KeyW')) mouseTarget.y += 18 * dt
    if (keys.has('ArrowDown') || keys.has('KeyS')) mouseTarget.y -= 18 * dt
    mouseTarget.x = THREE.MathUtils.clamp(mouseTarget.x, -MAX_X, MAX_X)
    mouseTarget.y = THREE.MathUtils.clamp(mouseTarget.y, MIN_Y, MAX_Y)
  }

  // Auto-level assist
  if (settings.autoLevel || keys.has('ShiftLeft') || keys.has('ShiftRight')) {
    if (mouseMode) {
      // Ease target back toward center-ish altitude, keep x
      mouseTarget.y = THREE.MathUtils.lerp(mouseTarget.y, 8, 1 - Math.pow(0.05, dt))
      mouseTarget.x = THREE.MathUtils.lerp(mouseTarget.x, 0, 1 - Math.pow(0.15, dt))
    } else {
      inputX *= 0.55
      inputY *= 0.55
      velX *= Math.pow(0.02, dt)
      velY *= Math.pow(0.04, dt)
    }
  }

  // Co-op wind from P2
  let coopWindX = 0
  let coopWindY = 0
  if (runKind === 'coop') {
    if (keys.has('KeyA') || keys.has('KeyJ')) coopWindX -= 1
    if (keys.has('KeyD') || keys.has('KeyL')) coopWindX += 1
    if (keys.has('KeyW') || keys.has('KeyI')) coopWindY += 1
    if (keys.has('KeyS') || keys.has('KeyK')) coopWindY -= 1
    coopWindX = THREE.MathUtils.clamp(coopWindX + windStick.x, -1, 1)
    coopWindY = THREE.MathUtils.clamp(coopWindY + windStick.y, -1, 1)
    // Same mirrored-camera correction as the main stick — P2 pushing "right"
    // should blow P1 toward screen-right, i.e. world -X.
    velX += -coopWindX * 28 * dt
    velY += coopWindY * 22 * dt
    const windHud = $('coop-wind-val')
    if (windHud) windHud.textContent = `${coopWindX.toFixed(1)},${coopWindY.toFixed(1)}`
  }

  windTimer -= dt
  let windPushX = 0
  if (windWarningTimer > 0) {
    // A brief telegraph before the push actually starts — matches the boss
    // encounters' warning-before-commit pattern instead of shoving the
    // plane sideways the instant a gust triggers.
    windWarningTimer -= dt
    if (windWarningTimer <= 0) {
      windActive = pendingWindActive
      windForce = pendingWindForce
      windBanner.textContent = '💨 Wind gust!'
    }
  } else if (windActive > 0) {
    windActive -= dt
    windPushX = windForce * (activePower?.kind === 'slow' ? 0.5 : 1)
    if (windActive <= 0) windBanner.classList.add('hidden')
  } else if (windTimer <= 0 && runKind !== 'tutorial' && runKind !== 'coop' && activeTwist?.windMul !== 0) {
    // In co-op, P2 is the wind — skip random gusts (or rarer)
    // Calm Skies twist sets windMul to 0, which is handled by the guard above
    pendingWindActive = 1.6 + rng() * 1.4
    pendingWindForce = (rng() < 0.5 ? -1 : 1) * (14 + rng() * 12) * difficulty.windForce
    windTimer = ((6 + rng() * 8) / Math.sqrt(difficulty.hazardScale)) * (activeTwist?.windMul ?? 1)
    windWarningTimer = WIND_WARNING_SECONDS
    windBanner.textContent = '💨 Wind incoming…'
    windBanner.classList.remove('hidden')
    audio.windGust()
    if (settings.haptics) Haptic.wind()
    runStats.winds++
  } else if (runKind === 'coop' && windTimer <= 0) {
    windTimer = 12
    // rare ambient gust even in coop
    if (rng() < 0.25) {
      pendingWindActive = 1
      pendingWindForce = (rng() < 0.5 ? -1 : 1) * 8
      windWarningTimer = WIND_WARNING_SECONDS
      windBanner.textContent = '💨 Wind incoming…'
      windBanner.classList.remove('hidden')
    }
  }
  // Gust weather: streaks stream with the push while it blows.
  updateWindStreaks(dt, windPushX, speed)

  const ufx = activeUpgradeEffects
  const activeControlMode = mouseMode
    ? (isTouchPrimary ? 'touch' : 'pointer')
    : joyMode ? 'stick' : 'keyboard'
  const controlResponse = getControlResponse({
    mode: activeControlMode,
    dt,
    accelMul: ufx.accelMul,
    sensitivity: Number(settings.mouseSensitivity) || 1,
  })
  const altitudeRecovery = getAltitudeRecovery({ baseSink: difficulty.sink, sinkMul: ufx.sinkMul })

  // Physics toys modifiers
  let sinkModifier = activeTwist?.sinkMul ?? 1
  let controlAcceleration = controlResponse.acceleration
  let extraForceX = windPushX
  let extraForceY = 0
  if (rescueLift) {
    extraForceY += rescueLift / Math.max(dt, 0.001)
    rescueLift = 0
  }
  if (activePower?.kind === 'tear') {
    extraForceX += tearSide * 14
    controlAcceleration *= 0.85
  }
  if (activePower?.kind === 'clip') {
    sinkModifier *= 1.65
    velX *= Math.pow(0.03, dt) // more stable
    controlAcceleration *= 0.75
  }
  if (activePower?.kind === 'boost') {
    // Boost is a dart, not a sink: the sheet holds altitude while it punches.
    sinkModifier *= 0.7
  }
  // Rubber-band slingshot: hold Space to charge, release to launch
  if (activePower?.kind === 'sling') {
    if (keys.has('Space')) {
      slingHold = Math.min(1, slingHold + dt * 0.85)
      powerLabel.textContent = `🪢 Charge ${Math.floor(slingHold * 100)}%`
      powerFill.style.width = `${slingHold * 100}%`
    } else if (slingHold > 0.12) {
      const power = slingHold
      if (mouseMode) extraForceY += 18 * power / Math.max(dt, 0.001)
      else velY += 18 * power
      speedBoost = Math.max(speedBoost, 28 * power)
      fovPunch = 6 + 8 * power
      shake = 0.35
      invuln = Math.max(invuln, 0.35)
      audio.nearMiss(3)
      if (settings.haptics) Haptic.power()
      spawnConfetti(planeX, planeY, 0)
      slingHold = 0
      powerLabel.textContent = '🪢 Rubber Band'
    } else slingHold = 0
  }

  const sinkPerSecond = altitudeRecovery.sinkPerSecond * sinkModifier
  if (mouseMode) {
    const aimed = integrateAimFlight({
      x: planeX,
      y: planeY,
      targetX: mouseTarget.x,
      targetY: mouseTarget.y,
      dt,
      follow: controlResponse.follow,
      sinkPerSecond,
      extraForceX,
      extraForceY,
      maxVel: MAX_VEL,
    })
    planeX = aimed.x
    planeY = aimed.y
    velX = aimed.velX
    velY = aimed.velY
    mouseTarget.y = aimed.targetY
  } else {
    const flown = integrateRelativeFlight({
      x: planeX,
      y: planeY,
      velX,
      velY,
      inputX,
      inputY,
      dt,
      acceleration: controlAcceleration,
      sinkPerSecond,
      dragX: activePower?.kind === 'boost' ? 0.12 : 0.06,
      dragY: activePower?.kind === 'boost' ? 0.15 : 0.1,
      maxVel: MAX_VEL,
      extraForceX,
      extraForceY,
    })
    planeX = flown.x
    planeY = flown.y
    velX = flown.velX
    velY = flown.velY
  }

  const bounded = applySoftBounds({
    x: planeX,
    y: planeY,
    velX,
    velY,
    targetX: mouseTarget.x,
    targetY: mouseTarget.y,
    minX: -MAX_X,
    maxX: MAX_X,
    minY: MIN_Y,
    maxY: MAX_Y,
  })
  planeX = bounded.x
  planeY = bounded.y
  velX = bounded.velX
  velY = bounded.velY
  mouseTarget.x = bounded.targetX
  mouseTarget.y = bounded.targetY

  let speedMul = ufx.speedMul
  if (activePower?.kind === 'slow') speedMul *= 0.55
  if (activePower?.kind === 'boost') speedMul *= 1.22
  if (activeTwist?.speedMul) speedMul *= activeTwist.speedMul
  if (journeyRunConfig?.pilotId === 'daredevil' && comboTimer > 0) {
    speedMul *= 1 + getPilotEffect('daredevil', journeyTelemetry || {}).momentum
  }
  const cfg = difficulty
  const cruise = getCruiseSpeed({
    baseSpeed: cfg.speedBase,
    speedRamp: cfg.speedRamp,
    speedCap: cfg.speedCap,
    distance,
    speedMul,
  })
  // Tier speed rides on top of the difficulty cap, which cruise alone reaches
  // by ~450m. Applied after speedMul so slow/boost powers still scale the
  // whole cruise rather than only its pre-tier half.
  speed = (cruise.cruiseSpeed + speedBoost + endlessTier().speedBonus * speedMul)
    * groundEffectSpeedMul(groundSkim.tier)
  if (speedFxEl) {
    const over = speed - cfg.speedBase
    const range = Math.max(1, cfg.speedCap - cfg.speedBase + 24)
    // The streak art is deliberately faint; the old 0.55 ceiling stacked with
    // it into solid white beams across the play field.
    speedFxEl.style.opacity = String(THREE.MathUtils.clamp(over / range, 0, 0.3))
  }
  const approachingBoss = entities.find((entity) => entity.type === 'boss' && !entity.cleared)
  const bossZ = approachingBoss?.mesh.position.z
  if (approachingBoss && Number(bossZ) < 28 && Number(bossZ) > 0) {
    const assistY = resolveBossGapY({
      playerY: planeY,
      safeY: approachingBoss.director?.snapshot()?.safeY ?? 10,
      bossZ,
    })
    planeY += (assistY - planeY) * Math.min(1, dt * 2.4)
  }
  updateGroundSkim(dt)
  // Bullet-time: slow-mo dilates how fast the world streams past and how
  // hazards move (via hazardClock), while plane controls stay at full rate —
  // you think faster than the world for six seconds.
  const move = speed * dt * getBossApproachSpeedScale({ bossZ }) * (slowmo ? SLOWMO_WORLD_SCALE : 1)
  const scoreFactor =
    cfg.scoreMul * ufx.scoreMul *
    (activePower?.kind === 'boost' ? 1.25 : activePower?.kind === 'slow' ? 0.85 : 1) *
    (1 + combo * 0.02) *
    (1 + Math.min(0.35, speedBoost * 0.01)) *
    skimScoreMultiplier(groundSkim.tier) *
    endlessTier().scoreMultiplier *
    (feverActive ? FEVER_SCORE_MUL : 1)
  distance += move * scoreFactor

  if (journeyTimeline) {
    const encounterEvents = getEncounterEventsAtDistance(journeyTimeline, journeyPreviousDistance, distance)
    encounterEvents.forEach(dispatchJourneyEncounter)
    journeyPreviousDistance = distance
    updateJourneyObjectiveHud()
  }

  // Sparkle trail from upgrades
  const trail = upgradeTrail
  if (trail && ufx.trailLevel > 0) {
    trail.visible = true
    for (let i = TRAIL_N - 1; i > 0; i--) trailPts[i].copy(trailPts[i - 1])
    trailPts[0].set(planeX + (Math.random() - 0.5) * 0.3, planeY, -0.5 - Math.random())
    const pos = trail.geometry.attributes.position
    for (let i = 0; i < TRAIL_N; i++) {
      pos.setXYZ(i, trailPts[i].x, trailPts[i].y, trailPts[i].z)
    }
    pos.needsUpdate = true
  } else if (trail) trail.visible = false

  // Ambient wisp trail — wingtip streamers, skipped in low-power mode
  const wisp = scene.getObjectByName('ambientWisp')
  if (wisp && renderQuality.secondaryEffects && speed > cfg.speedBase * 1.15) {
    wisp.visible = true
    for (let i = WISP_N - 1; i > 0; i--) wispPts[i].copy(wispPts[i - 1])
    // Streamers peel off alternating wingtips so both sides read at speed.
    wispSide *= -1
    const span = (activeUpgradeEffects.planeScale || 1) * 1.12
    wispPts[0].set(planeX + wispSide * 0.95 * span, planeY - 0.05 - Math.random() * 0.15, -0.7 - Math.random() * 0.5)
    const wpos = wisp.geometry.attributes.position
    for (let i = 0; i < WISP_N; i++) wpos.setXYZ(i, wispPts[i].x, wispPts[i].y, wispPts[i].z)
    wpos.needsUpdate = true
    wisp.material.opacity = THREE.MathUtils.clamp((speed - cfg.speedBase * 1.15) / 30, 0, 0.42)
  } else if (wisp) wisp.visible = false

  // Funnel milestones — the big ones get a small in-world celebration so the
  // odometer crossing reads as an event, not just analytics.
  for (const m of [50, 100, 200, 500, 1000]) {
    if (distance >= m && !distanceMilestones.has(m)) {
      distanceMilestones.add(m)
      track(`distance_${m}`, { mode: difficulty.id, kind: runKind })
      if (m >= 500) {
        spawnConfetti(planeX, planeY + 0.4, 1, 'gold')
        showFlightFeedback(`${m}m!`, 'route', 0.9)
        pulseFlightImpact('route')
      }
    }
  }

  // Mini-gauntlets at the 250m midpoint between boss gates
  if (
    runKind !== 'tutorial' &&
    runKind !== 'layout' &&
    distance >= nextGauntletAt &&
    !bossActive
  ) {
    spawnMiniGauntlet(60)
    invuln = Math.max(invuln, 0.55)
    nextGauntletAt += 500
  }

  // Boss gates every 500m
  if (
    runKind !== 'tutorial' &&
    runKind !== 'layout' &&
    distance >= nextBossAt &&
    !bossActive
  ) {
    spawnBoss(75)
    nextBossAt += 500
  }

  plane.position.set(planeX, planeY, 0)
  // Visual bank from motion (clamped so mouse snaps don't spin the plane)
  const flightPose = getPaperFlightPose({
    horizontalVelocity: velX,
    verticalVelocity: velY,
    speed,
    elapsed,
    reducedMotion: settings.reducedMotion,
  })
  const aimOffX = mouseMode ? THREE.MathUtils.clamp(mouseTarget.x - planeX, -2, 2) * 0.12 : 0
  pitch = THREE.MathUtils.lerp(pitch, flightPose.pitch, 1 - Math.pow(0.0006, dt))
  roll = THREE.MathUtils.lerp(roll, flightPose.roll + aimOffX, 1 - Math.pow(0.0006, dt))
  if (activePower?.kind === 'boost') pitch = THREE.MathUtils.lerp(pitch, -0.1, 0.12)
  // Fever adds a light shimmy on top of normal banking — a readable "turbo" feel
  // without fighting the player's actual steering input.
  const feverWobble = feverActive ? Math.sin(elapsed * 16) * 0.05 : 0
  plane.rotation.x = THREE.MathUtils.clamp(pitch, -0.5, 0.45)
  const handleMul = 1 + Math.min(0.28, (activeUpgradeEffects.handlingLevel || 0) * 0.05)
  plane.rotation.z = THREE.MathUtils.clamp((roll + feverWobble) * handleMul, -0.9, 0.9)
  plane.rotation.y = flightPose.yaw
  if (activePower?.kind !== 'tear') {
    const wingL = plane.userData.wingL
    const wingR = plane.userData.wingR
    if (wingL) wingL.rotation.z = flightPose.wingFlex
    if (wingR) wingR.rotation.z = -flightPose.wingFlex
  }

  // Invuln blink
  if (invuln > 0) {
    plane.visible = Math.sin(elapsed * 28) > -0.2
  } else {
    plane.visible = true
  }

  // Ghost
  if (ghostRecorder) ghostRecorder.push(distance, planeX, planeY, elapsed)
  if (ghostMesh && journeyRivalState) {
    const pose = sampleRivalPosition(journeyRivalState, distance + 18)
    ghostMesh.position.set(pose.x, pose.y, 2.5)
    ghostMesh.rotation.z = Math.sin(distance * 0.027) * 0.3
    ghostMesh.visible = true
    const delta = getRivalDelta(journeyRivalState, distance)
    ghostDeltaHud?.classList.remove('hidden')
    ghostDeltaHud?.classList.toggle('ahead', delta <= 0)
    ghostDeltaHud?.classList.toggle('behind', delta > 0)
    if (ghostDeltaValEl) ghostDeltaValEl.textContent = `Red Dart · ${Math.max(0, delta)}m`
    const milestone = distance >= 440 ? 'final' : distance >= 250 ? 'halfway' : null
    const callout = milestone && getRivalCallout(journeyRivalState, milestone)
    if (callout) {
      notifications.show(callout, { duration: settings.reducedMotion ? 1800 : 3000 })
    }
  } else if (ghostMesh && ghostData) {
    const pose = ghostPoseAt(ghostData.path, distance)
    if (pose && !pose.done) {
      ghostMesh.position.set(pose.x, pose.y, 1.5)
      ghostMesh.visible = true
    } else if (ghostMesh) ghostMesh.visible = false
    if (ghostDeltaHud) {
      const ghostD = ghostDistanceAtTime(ghostData.path, elapsed)
      if (ghostD == null) {
        ghostDeltaHud.classList.add('hidden')
      } else {
        const delta = Math.round(distance - ghostD)
        ghostDeltaHud.classList.remove('hidden')
        ghostDeltaHud.classList.toggle('ahead', delta >= 0)
        ghostDeltaHud.classList.toggle('behind', delta < 0)
        ghostDeltaValEl.textContent = delta >= 0 ? `+${delta}m` : `${delta}m`
      }
    }
  } else if (ghostDeltaHud) ghostDeltaHud.classList.add('hidden')

  // Zone + soft progressive blend hint (banner only on change)
  const { zone: z, lap: zoneLap } = activeRouteAt(distance)
  // The lap check is what makes the fold back to Paper City announce itself —
  // by id alone a new lap's opening zone looks like no change at all.
  if (z.id !== currentZoneId || zoneLap !== currentZoneLap) {
    currentZoneLap = zoneLap
    applyZone(z, true)
  }
  const visualDistance = distance + (activeFold?.zoneOffset || 0)
  const zp = runKind === 'journey'
    ? { zone: z, t: 1, next: null, nextAt: null, remain: 0 }
    : cyclicZoneProgress(visualDistance)
  if (zp.next && zp.t > 0.92 && zp.t < 0.97) {
    // gentle pre-transition fog lean
    scene.fog.color.lerp(_zoneFogColor.set(zp.next.fog), dt * 0.4)
  }
  if (nextZoneHud) {
    const showHint = zp.next && zp.t > 0.7
    nextZoneHud.classList.toggle('hidden', !showHint)
    if (showHint) hudNextZoneEl.textContent = `${zp.next.name} · ${Math.max(0, Math.ceil(zp.remain))}m`
  }
  updateEndlessTier()
  updateEdgeIndicators()
  checkHazardTelegraph()
  updateWeatherFx(dt)
  checkTutorialHints(dt)

  // Camera: pull back slightly during boost
  const camZ = activePower?.kind === 'boost' || speedBoost > 10 ? -10 : -8
  const camY = planeY + CAM_HEIGHT + (activePower?.kind === 'boost' ? 0.4 : 0)
  const lateralEase = 1 - Math.pow(CAM_EASE_LATERAL, dt)
  const verticalEase = 1 - Math.pow(CAM_EASE_VERTICAL, dt)
  _camTarget.set(planeX * CAM_FOLLOW_X, camY, camZ)
  camera.position.x += (_camTarget.x - camera.position.x) * lateralEase
  camera.position.z += (_camTarget.z - camera.position.z) * lateralEase
  camera.position.y += (_camTarget.y - camera.position.y) * verticalEase
  camera.lookAt(planeX * 0.2, planeY + CAM_AIM_LIFT, CAM_AIM_Z)
  if (shake > 0) {
    shake = Math.max(0, shake - dt * 1.2)
    camera.position.x += (Math.random() - 0.5) * shake * 0.45
    camera.position.y += (Math.random() - 0.5) * shake * 0.25
  }
  // Contact shadow tracks the plane's lane; it tightens and fades with
  // altitude so height stays readable against the patterned ground.
  const shadowUp = THREE.MathUtils.clamp(planeY / MAX_Y, 0, 1)
  planeShadow.visible = state === 'playing'
  planeShadow.position.x = planeX
  planeShadow.position.z = 0
  const shadowScale = 1.15 - shadowUp * 0.6
  planeShadow.scale.setScalar(shadowScale)
  planeShadow.material.opacity = 0.34 - shadowUp * 0.2
  audio.setFlightWind(Math.min(1, speed / 70))

  scrollWorld(move, windPushX * dt * 0.5)
  animateHazards(slowmo ? dt * SLOWMO_WORLD_SCALE : dt)
  updateFlightReadability(zp)

  if (runKind !== 'tutorial' && runKind !== 'layout') {
    while (nextSpawnZ < 220) {
      spawnChunk(nextSpawnZ)
      nextSpawnZ += getWaveSpacing({
        difficultyId: difficulty.id,
        distance,
        recovery: distance < bossRecoveryUntil,
      }) * difficulty.gap
    }
  }

  const p = plane.position
  const magnet = getMagnetPull({
    activePowerKind: activePower?.kind,
    magnetBonus: ufx.magnetBonus,
    planeRadius: PLANE_COLLISION_RADIUS,
  })
  const boostSafety = getBoostSafety(ufx)
  // Phase power: pass through airborne hazards (birds/scissors/boss) but
  // buildings and the ground are checked separately and still solid — this
  // is a "dodge the sky" power, not a full no-clip.
  const canCollide =
    invuln <= 0 &&
    activePower?.kind !== 'phase' &&
    !isLaunchGraceActive(elapsed, launchGraceSeconds)
  let ringsLeft = 0
  // Near-miss window tightens (up to 15%) as the combo climbs, so long chains
  // require flying genuinely closer rather than staying free once started.
  const nmTighten = 1 - Math.min(combo, 10) * 0.015
  let magnetTarget = null
  let magnetTargetDistance = Infinity

  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i]
    const m = e.mesh

    if (e.type === 'ring') {
      ringsLeft++
      const dx = m.position.x - p.x
      const dy = m.position.y - p.y
      const dz = m.position.z - p.z
      if (dx * dx + dy * dy + dz * dz < 2.8 ** 2) {
        scene.remove(m)
        entities.splice(i, 1)
        stars++
        starsEl.textContent = String(stars)
        audio.collectStar()
        if (settings.haptics) Haptic.collect()
        showFlightFeedback('STAR +1', 'star', 0.62)
        spawnConfetti(m.position.x, m.position.y, m.position.z)
        ringsLeft--
      }
      continue
    }

    if (e.type === 'star') {
      // Soft pull always when close; stronger with magnet
      const dx0 = m.position.x - p.x
      const dy0 = m.position.y - p.y
      const dz0 = m.position.z - p.z
      const d2near = dx0 * dx0 + dy0 * dy0 + dz0 * dz0
      if (d2near < magnet.influenceRadius ** 2) {
        const pull = magnet.pullStrength
        m.position.x += (p.x - m.position.x) * Math.min(1, pull * dt * 0.14)
        m.position.y += (p.y - m.position.y) * Math.min(1, pull * dt * 0.14)
        m.position.z += (p.z - m.position.z) * Math.min(1, pull * dt * 0.09)
        if (magnet.active && d2near < magnetTargetDistance) {
          magnetTargetDistance = d2near
          magnetTarget = { x: m.position.x, y: m.position.y, z: m.position.z }
        }
      }
      const dx = m.position.x - p.x
      const dy = m.position.y - p.y
      const dz = m.position.z - p.z
      const catchR = getMagnetPull({
        activePowerKind: activePower?.kind,
        magnetBonus: ufx.magnetBonus,
        starRadius: e.radius,
        planeRadius: PLANE_COLLISION_RADIUS,
      }).catchRadius * (e.telegraph || shouldTelegraphStarLane(distance) ? 1.18 : 1)
      if (dx * dx + dy * dy + dz * dz < catchR ** 2) {
        // Star value rides the run's own risk systems: fever and ground-skim
        // tiers multiply the meter bonus, golden drops pay 5★.
        const pickup = resolveStarPickup({
          golden: Boolean(e.golden),
          feverActive,
          skimTier: groundSkim.tier,
          baseMeters: STAR_BASE_METERS * (activeTwist?.starMeterMul ?? 1),
        })
        stars += pickup.stars
        if (journeyTelemetry) journeyTelemetry.collectedJourneyStars += 1
        runStats.stars = stars
        starsEl.textContent = String(stars)
        distance += pickup.meters
        if (pickup.golden) {
          audio.starStreak(1)
          if (settings.haptics) Haptic.power()
          hitStopTimer = Math.max(hitStopTimer, 0.05)
          pulseFlightImpact('star')
        } else {
          audio.collectStar()
          if (settings.haptics) Haptic.collect()
        }
        showFlightFeedback(pickup.label, 'star', pickup.golden ? 1.15 : 0.72)
        spawnConfetti(m.position.x, m.position.y, m.position.z, pickup.golden ? 'gold' : 'classic')
        registerStarStreak()
        scene.remove(m)
        entities.splice(i, 1)
      }
      continue
    }

    if (e.type === 'power') {
      // Generous pickup magnet so boost/orbs aren't frustrating
      const dx0 = m.position.x - p.x
      const dy0 = m.position.y - p.y
      const dz0 = m.position.z - p.z
      const d2 = dx0 * dx0 + dy0 * dy0 + dz0 * dz0
      if (d2 < 14 * 14) {
        const pull = 10 + (e.kind === 'boost' ? 4 : 0)
        m.position.x += (p.x - m.position.x) * Math.min(1, pull * dt * 0.16)
        m.position.y += (p.y - m.position.y) * Math.min(1, pull * dt * 0.16)
        m.position.z += (p.z - m.position.z) * Math.min(1, pull * dt * 0.1)
      }
      const dx = m.position.x - p.x
      const dy = m.position.y - p.y
      const dz = m.position.z - p.z
      const catchR = (e.radius || 1.35) + PLANE_COLLISION_RADIUS * 1.25
      if (dx * dx + dy * dy + dz * dz < catchR ** 2) {
        activatePower(e.kind)
        spawnConfetti(m.position.x, m.position.y, m.position.z)
        scene.remove(m)
        entities.splice(i, 1)
      }
      continue
    }

    // Gauntlet tripwire — resolves even during invuln so a grace window
    // can't eat the payoff for a clean run through the promised lane.
    if (e.type === 'gauntlet') {
      if (!e.cleared && m.position.z < -1.2) {
        e.cleared = true
        const reward = resolveGauntletReward({
          inLane: isInsideGauntletLane({ playerX: p.x, laneX: e.gauntletLaneX }),
        })
        if (reward) {
          stars += reward.stars
          runStats.stars = stars
          starsEl.textContent = String(stars)
          distance += reward.bonusMeters
          lastRewardTag = 'gauntlet'
          hitStopTimer = Math.max(hitStopTimer, 0.06)
          audio.gateClear()
          if (settings.haptics) Haptic.collect()
          spawnConfetti(p.x, planeY, 1, 'gold')
          showFlightFeedback(reward.label, 'star', 1.3)
          pulseFlightImpact('star')
          powerBanner.textContent = `⚡ Gauntlet cleared · +${reward.stars}★`
          powerBanner.classList.remove('hidden')
          bannerTimer = Math.max(bannerTimer, 1.6)
          track('gauntlet_clear', { distance: Math.floor(distance) })
        }
      }
      continue
    }

    // Hazards ignored during invuln
    if (!canCollide) continue

    if (e.type === 'boss') {
      const dz = m.position.z - p.z
      // Only test when gate is in the plane's path slice
      if (dz < 3.5 && dz > -2.5) {
        const gapY = m.userData.gapY || 10
        const encounter = e.director?.snapshot()
        const inGap = isInsideBossPassage({
          playerX: p.x,
          playerY: p.y,
          bossX: m.position.x,
          gapY,
          passage: encounter?.passage,
        })
        // Only punish a clear miss near the gate plane — grazing the glowing
        // ring edges uses PASSAGE_EDGE_GRACE inside isInsideBossPassage.
        if (isLethalObstacle('boss') && !inGap && Math.abs(dz) < 1.05) {
          e.director?.collide()
          die(bossCrashReason(m.userData.kind))
          return
        }
        // Success once the plane has threaded past the gate while in the hole.
        if (dz < -0.55 && inGap) {
          // Successfully threaded — reward once
          if (!e.cleared) {
            e.cleared = true
            e.director?.pass()
            if (journeyTelemetry && e.journeyGateRequired) {
              journeyTelemetry.shortcutGatesCleared += 1
              if (e.journeyGateBonus) {
                stars += 2
                runStats.stars = stars
              }
              updateJourneyObjectiveHud()
            }
            const reward = getBossClearReward()
            bossActive = false
            bossRecoveryUntil = distance + reward.recoveryMeters
            hitStopTimer = reward.hitStopSeconds
            track('boss_clear', { distance: Math.floor(distance), kind: m.userData.kind })
            stars += reward.stars
            starsEl.textContent = String(stars)
            audio.missionComplete()
            if (settings.haptics) Haptic.collect()
            invuln = Math.max(invuln, reward.invulnSeconds)
            spawnConfetti(planeX, planeY, 2, 'route')
            showFlightFeedback(`GATE CLEARED · +${reward.stars}★`, 'route', 1.6)
            pulseFlightImpact('route')
            audio.gateClear()
            audio.hoopWhoosh()
            powerBanner.textContent = `${bossBannerEmoji(m.userData.kind)} Boss cleared · +${reward.stars}★`
            powerBanner.classList.remove('hidden')
            bannerTimer = Math.max(bannerTimer, 1.8)
          }
        }
        if (m.position.z < -20) {
          scene.remove(m)
          entities.splice(i, 1)
          bossActive = false
        }
      }
      continue
    }

    if (e.type === 'building') {
      const dx = Math.abs(m.position.x - p.x)
      const dz = Math.abs(m.position.z - p.z)
      // Buildings sit on ground: solid from y=0 to halfH
      const hitR = getCollisionRadius({
        entityRadius: e.radius,
        planeRadius: PLANE_COLLISION_RADIUS,
        planeWeight: 0.5,
        boostActive: activePower?.kind === 'boost',
        boostHitboxScale: boostSafety.collisionScale,
      }).effectiveRadius
      const grazeR = getNearMissRadius({
        entityRadius: e.radius,
        planeRadius: PLANE_COLLISION_RADIUS,
        nearMissBonus: ufx.nearMissBonus,
        tighten: nmTighten,
      })
      const hitsBuilding = dx < hitR && dz < hitR && p.y < e.halfH - 0.85 && p.y > -0.5
      if (hitsBuilding) {
        const push = Math.sign(p.x - m.position.x) || (p.x >= 0 ? 1 : -1)
        planeX = THREE.MathUtils.clamp(planeX + push * 0.55, -MAX_X, MAX_X)
        velX = push * 12
        mouseTarget.x = planeX
      }
      if (
        m.position.z > -2 &&
        m.position.z < 9 &&
        dx < grazeR &&
        dx > hitR * 0.9 &&
        dz < grazeR &&
        p.y < e.halfH + 2.5 &&
        p.y > e.halfH * 0.15
      ) {
        const last = nearMissCooldown.get(m) || 0
        if (elapsed - last > 1.0) {
          nearMissCooldown.set(m, elapsed)
          registerNearMiss()
        }
      }
      // Thread-the-gap: the first of a marked tight pair to pass behind the
      // plane resolves the corridor ONCE (both towers share one corridor
      // object whose `paid` flag guards the payout).
      if (e.thread && !e.thread.paid && m.position.z < -1.2) {
        e.thread.paid = true
        const threaded = isInsideThreadGap({
          playerX: p.x,
          playerY: p.y,
          minX: e.thread.minX,
          maxX: e.thread.maxX,
          maxY: e.thread.maxY,
        })
        if (threaded) {
          distance += THREAD_REWARD_METERS
          lastRewardTag = 'thread'
          audio.hoopWhoosh()
          spawnConfetti(p.x, planeY, 0.5, 'route')
          showFlightFeedback(`THREADED THE GAP · +${THREAD_REWARD_METERS}m`, 'route', 1.1)
          pulseFlightImpact('route')
          track('thread_gap', { distance: Math.floor(distance) })
        }
      }
      continue
    }

    if (e.type === 'bird' || e.type === 'scissors') {
      const dx = m.position.x - p.x
      const dy = m.position.y - p.y
      const dz = m.position.z - p.z
      const dist2 = dx * dx + dy * dy + dz * dz
      const boostHitboxScale = activePower?.kind === 'boost' ? boostSafety.collisionScale : 1
      const hit = getObstacleDamageRadius({
        entityRadius: e.radius || 0.7,
        planeRadius: PLANE_COLLISION_RADIUS,
        boostHitboxScale,
      })
      if (isLethalObstacle(e.type) && dist2 < hit ** 2) {
        const label =
          e.type === 'scissors'
            ? 'Snipped by scissors'
            : `Tangled with ${e.label || 'paper birds'}`
        die(label)
        return
      }
      const graze = getNearMissRadius({
        entityRadius: e.radius || 0.7,
        planeRadius: PLANE_COLLISION_RADIUS,
        nearMissBonus: ufx.nearMissBonus,
        tighten: nmTighten,
      })
      if (dist2 < graze ** 2 && m.position.z > -1 && m.position.z < 7) {
        const last = nearMissCooldown.get(m) || 0
        if (elapsed - last > 1.0) {
          nearMissCooldown.set(m, elapsed)
          registerNearMiss(e.type === 'scissors' ? 'scissors' : e.flyerId)
        }
      }
    }
  }

  updateMagnetPullFeedback(magnetTarget, magnet)

  if (runKind === 'tutorial' && ringsLeft === 0 && entities.every((e) => e.type === 'building' || e.type === 'ring')) {
    // only buildings left (or empty of rings)
    const stillRings = entities.some((e) => e.type === 'ring')
    if (!stillRings) {
      die('Tutorial complete!')
      return
    }
  }

  distanceEl.textContent = `${Math.floor(distance)}m`
  if (distance > bestDistance) bestEl.textContent = `${Math.floor(distance)}m`
}

// Boot — start render loop first so a UI error never blanks the game
const timer = new THREE.Timer()
document.addEventListener('visibilitychange', () => {
  // Flush background time on the next apply so resume doesn't eat a huge delta.
  applyPauseState()
})
function frame() {
  if (!simulationPaused) {
    try {
      timer.update()
      const rawDt = Math.min(timer.getDelta(), 0.05)
      frameHealth.sample(rawDt * 1000)
      if (hitStopTimer > 0) {
        // Freeze-frame punch: barely advance the sim for a couple of ticks
        // while still rendering, so crashes/boss clears read as an impact.
        hitStopTimer -= rawDt
        update(rawDt * 0.05)
      } else {
        update(rawDt)
      }
    } catch (err) {
      console.error('update error', err)
    }
  }
  try {
    renderer.render(scene, camera)
  } catch (err) {
    console.error('render error', err)
  }
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

try {
  resetGame()
  state = 'menu'
  syncPauseUi()
  applySeasonVisuals()
  if (!tutorialDone && dailyHint) {
    dailyHint.textContent = 'New here? Try Tutorial — then Daily Route!'
  }
  if (layoutPlay && dailyHint) {
    dailyHint.textContent = `Custom route loaded: ${layoutPlay.name}`
  }
  // Don't clobber a shared-challenge/custom-route toast that's already claimed
  // this same banner slot — whichever the visitor arrived for should win.
  if (season.id !== 'default' && challengeToast && challengeToast.classList.contains('hidden')) {
    notifications.show(`✦ ${season.name} event — free seasonal skins!`, { duration: 5000 })
  }
  void syncRuntimeSettings(settings).catch((error) => console.warn('Initial settings sync failed', error))
} catch (err) {
  console.error('boot error', err)
  state = 'menu'
  menuEl?.classList.remove('hidden')
  throw err
}

function upgradeRuntimeTextState() {
  const controlMode = wantsJoystick()
    ? 'stick'
    : isTouchPrimary ? 'touch' : 'pointer'
  const runtime = getUpgradeRuntimeSnapshot({
    effects: activeUpgradeEffects,
    controlMode,
    dt: 1 / 60,
    distance,
    difficulty,
    activePowerKind: activePower?.kind,
    fireCooldown,
    guardianLeft,
    planeRadius: PLANE_COLLISION_RADIUS,
    nearMissTighten: 1 - Math.min(combo, 10) * 0.015,
    sensitivity: Number(settings.mouseSensitivity) || 1,
    twistStarMul: activeTwist?.starMul ?? 1,
  })
  return {
    handling: runtime.handling,
    lift: runtime.lift,
    glide: runtime.glide,
    magnet: {
      ...runtime.magnet,
      trailActive: magnetPullTrail?.dataset.active === 'true',
    },
    shield: {
      ...runtime.shield,
      active: activePower?.kind === 'shield',
      timeLeft: activePower?.kind === 'shield' ? Math.max(0, activePower.timeLeft) : 0,
      powerKind: activePower?.kind || null,
      visualVisible: Boolean(shieldBubble?.visible),
      visualOpacity: Number(shieldBubble?.material.opacity ?? 0),
    },
    luck: {
      ...runtime.luck,
      twistStarMultiplier: activeTwist?.starMul ?? 1,
    },
    wingspan: runtime.wingspan,
    trail: runtime.trail,
    turbo: {
      ...runtime.turbo,
      active: activePower?.kind === 'boost',
    },
    guardian: runtime.guardian,
    weapon: runtime.weapon,
    fever: {
      ...runtime.fever,
      active: feverActive,
      timer: Number(feverTimer.toFixed(2)),
      scoreMul: FEVER_SCORE_MUL,
      comboHold: runtime.fever.comboHold,
      hud: describeFeverHudValue({ active: feverActive, timer: feverTimer }),
    },
    streak: {
      ...runtime.streak,
      count: starStreak,
      timer: Number(starStreakTimer.toFixed(2)),
      windowSeconds: runtime.streak.windowSeconds,
      visible: starStreak >= 2,
    },
  }
}

function bossTextState() {
  const entity = entities.find((candidate) => candidate.type === 'boss' && candidate.director)
  if (!entity) return null
  const boss = entity.director.snapshot()
  return {
    kind: boss.kind,
    phase: boss.phase,
    safeLane: boss.safeLane,
    warningSeconds: Number(boss.warningSeconds.toFixed(2)),
    pressure: Number(boss.pressure.toFixed(2)),
    completed: boss.completed,
    shapeCue: boss.shapeCue,
    passage: boss.passage,
  }
}

window.render_game_to_text = () => JSON.stringify({
  coordinateSystem: 'origin is plane center; x increases left on screen, y increases up; encounter z approaches zero',
  state,
  mode: runKind,
  seed: devSeedLabel,
  runSeed: activeRunSeed,
  weeklyFold: activeFold?.id || null,
  challenge: launchChallenge
    ? { name: launchChallenge.name, distance: launchChallenge.distance, kind: launchChallenge.kind }
    : null,
  distance: Math.floor(distance),
  stars,
  lastReward: lastRewardTag,
  player: { x: Number(planeX.toFixed(2)), y: Number(planeY.toFixed(2)) },
  power: activePower
    ? { kind: activePower.kind, timeLeft: Math.round(activePower.timeLeft * 10) / 10 }
    : null,
  banners: {
    zone: zoneBannerTimer > 0 ? zoneBanner.textContent : null,
    action: bannerTimer > 0 ? powerBanner.textContent : null,
  },
  plane: {
    skinId: activePlaneSkinId,
    silhouette: activePlaneSilhouette,
    collisionRadius: PLANE_COLLISION_RADIUS,
  },
  entities: {
    counts: entities.reduce((counts, entity) => {
      counts[entity.type] = (counts[entity.type] || 0) + 1
      return counts
    }, {}),
    visibleTypes: entities
      .filter((entity) => entity.mesh.position.z > -25 && entity.mesh.position.z < 220)
      .map((entity) => entity.type),
  },
  endless: {
    tier: endlessTier().tier,
    name: endlessTier().name,
    modifier: endlessTier().modifier?.id || null,
    speedBonus: endlessTier().speedBonus,
    spacingScale: endlessTier().spacingScale,
    scoreMultiplier: endlessTier().scoreMultiplier,
    capped: endlessTier().capped,
    zoneLap: currentZoneLap,
    speed: Math.round(speed * 10) / 10,
  },
  groundSkim: {
    active: groundSkim.active,
    tier: groundSkim.tier,
    seconds: Number(groundSkim.seconds.toFixed(2)),
    ceiling: SKIM_CEILING,
    scoreMultiplier: skimScoreMultiplier(groundSkim.tier),
  },
  groundLife: {
    zone: groundLifeZoneId,
    // Decorative only — asserted here so a regression that pushes scenery into
    // the flight corridor fails a test instead of confusing a player.
    draws: groundLifeFields.length,
    instances: groundLifeFields.reduce((total, field) => total + field.instances.length, 0),
    species: groundLifeFields.map(({ speciesDef, instances }) => ({
      id: speciesDef.id,
      motion: speciesDef.motion,
      count: instances.length,
      minAbsX: Number(Math.min(...instances.map((i) => Math.abs(i.x))).toFixed(2)),
    })),
  },
  fairness: {
    passageLane: activePassageLane,
    passageLaneX: activePassageLane === null ? null : PASSAGE_LANE_X[activePassageLane + 1],
    airDamageRadius: Number(getObstacleDamageRadius({ entityRadius: 1.6, planeRadius: PLANE_COLLISION_RADIUS }).toFixed(3)),
    visibleHazards: entities
      .filter((entity) => (entity.type === 'bird' || entity.type === 'scissors') && entity.mesh.position.z > -25 && entity.mesh.position.z < 220)
      .map((entity) => ({
        type: entity.type,
        x: Number(entity.mesh.position.x.toFixed(2)),
        y: Number(entity.mesh.position.y.toFixed(2)),
        z: Number(entity.mesh.position.z.toFixed(2)),
        radius: entity.radius,
        passageLane: entity.passageLane ?? null,
      })),
    // Star placement is a balance surface, not just decoration: if every star
    // sits on the reserved lane they cost nothing to collect. Exposed so the
    // lane mix is assertable.
    visibleStars: entities
      .filter((entity) => entity.type === 'star' && entity.mesh.position.z > -25 && entity.mesh.position.z < 220)
      .map((entity) => ({
        x: Number(entity.mesh.position.x.toFixed(2)),
        y: Number(entity.mesh.position.y.toFixed(2)),
        z: Number(entity.mesh.position.z.toFixed(2)),
        telegraph: Boolean(entity.telegraph),
        golden: Boolean(entity.golden),
      })),
  },
  upgrades: upgradeRuntimeTextState(),
  boss: bossTextState(),
  layout: runKind === 'layout' && layoutPlay ? {
    name: layoutPlay.name,
    itemTypes: layoutPlay.items.map((item) => item.t),
  } : null,
  settings: {
    lowPower: settings.lowPower,
    colorblindPowers: settings.colorblindPowers,
    reducedMotion: settings.reducedMotion,
    arDesk: settings.arDesk,
    arActive: deskAR.active,
    shadowsEnabled: renderer.shadowMap.enabled,
    dustVisible: dust.visible,
    shieldPowerColor: POWER_META.shield.color,
  },
  performance: {
    ...frameHealth.snapshot(),
    quality: renderQuality,
    renderer: {
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
    },
    nativeSignal: nativePerformanceSignal,
  },
  journey: journeyRunConfig ? {
    routeId: journeyRunConfig.routeId,
    destination: journeyRunConfig.zone,
    pilotId: journeyRunConfig.pilotId,
    objective: journeyRunConfig.objective,
    objectiveText: journeyObjectiveText(),
    triggeredEncounterIds: [...(journeyTelemetry?.completedEventIds || [])],
    visibleEncounterIds: entities.filter((entity) => entity.journeyEventId && entity.mesh.position.z > -25 && entity.mesh.position.z < 110).map((entity) => entity.journeyEventId),
    telemetry: journeyTelemetry ? { ...journeyTelemetry, completedEventIds: [...journeyTelemetry.completedEventIds] } : null,
  } : null,
  result: lastJourneyResult ? {
    completed: lastJourneyResult.outcome.completed,
    objectiveCompleted: lastJourneyResult.objectiveResult.completed,
    masteryLevel: lastJourneyResult.masteryAfter?.level || 0,
    unlockedCosmetic: lastJourneyResult.unlockedCosmetic,
  } : null,
})

if (import.meta.env.DEV) {
  window.advanceTime = (ms) => {
    const steps = Math.min(3600, Math.max(0, Math.ceil(Number(ms) / (1000 / 60))))
    for (let index = 0; index < steps; index += 1) update(1 / 60)
    return window.render_game_to_text()
  }
}

// Deterministic browser-test state. Vite replaces this guard at build time,
// so the production bundle cannot activate the shortcut through a URL.
if (import.meta.env.DEV && devTestState === '#test-gameover') {
  hideAllPanels()
  state = 'dead'
  hudEl?.classList.add('hidden')
  gameoverEl?.classList.remove('hidden')
  photoWrap?.classList.add('hidden')
  $('gameover-title').textContent = 'Crashed!'
  newBestBadge?.classList.add('hidden')
  finalScoreEl.textContent = '188m · 3★ · Normal'
  finalDetailEl.textContent = 'Hit a paper skyscraper'
  renderRunSummary(buildRunSummary({
    stars: 3,
    distance: 188,
    previousBest: 160,
    maxCombo: 2,
    reason: 'Hit a paper skyscraper',
    walletAfterRun: 3,
    affordableUpgrades: [],
  }))
}

if (import.meta.env.DEV && devTestState === '#test-obstacles') {
  hideAllPanels()
  runKind = 'classic'
  resetGame()
  clearEntities()
  state = 'playing'
  simulationPaused = true
  hudEl?.classList.add('hidden')
  plane.visible = false
  camera.position.set(0, 11, -11)
  camera.lookAt(0, 11, 18)
  const lineup = FLYER_DEFS.map((def, index) => [
    def.id,
    (index % 5 - 2) * 3,
    8 + Math.floor(index / 5) * 5,
  ])
  for (const [id, x, z] of lineup) {
    const def = FLYER_DEFS.find((flyer) => flyer.id === id)
    const flyer = createFlyer(id)
    flyer.position.set(x, 13 - Math.floor((z - 8) / 5) * 3, z)
    scene.add(flyer)
    entities.push({ mesh: flyer, type: 'bird', flyerId: id, label: def.label, radius: def.radius })
  }
  const scissors = createScissors()
  scissors.position.set(6, 7, 18)
  scene.add(scissors)
  entities.push({ mesh: scissors, type: 'scissors', radius: 1.6 })
}

if (import.meta.env.DEV && devTestState.startsWith('#test-upgrades-')) {
  const powerKind = devTestState.slice('#test-upgrades-'.length)
  if (powerKind === 'shield' || powerKind === 'boost' || powerKind === 'phase') {
    configureDevUpgradeProof()
    settings = saveSettings({ haptics: false })
    hideAllPanels()
    notifications.clear()
    runKind = 'classic'
    resetGame()
    clearEntities()
    state = 'playing'
    invuln = 999
    nextSpawnZ = 220
    hudEl?.classList.remove('hidden')
    showStick(true)
    applyUpgradeVisuals()
    activatePower(powerKind)
    const star = createStar()
    star.position.set(6, planeY, 5)
    scene.add(star)
    entities.push({ mesh: star, type: 'star', radius: 0.9 })
    // One deterministic step makes the pull feedback visible without letting
    // this proof fixture drift or consume a shield/boost timer in screenshots.
    update(1 / 60)
    simulationPaused = true
  }
}

if (import.meta.env.DEV && devTestState === '#test-upgrade-live-spawn') {
  configureDevUpgradeProof()
  settings = saveSettings({ haptics: false })
  hideAllPanels()
  journey = createJourney(4242, 1000)
  const starTrailRoute = getRouteChoices(journey).find((route) => route.modifier === 'star-trail')
  journey = selectJourneyRoute(journey, starTrailRoute.id)
  journeyRunConfig = buildRunConfiguration(journey)
  runKind = 'journey'
  resetGame()
  clearEntities()
  state = 'playing'
  spawnUnfold = 1
  invuln = 999
  nextSpawnZ = 1000
  windTimer = 999
  for (let index = 0; index < 32; index += 1) spawnChunk(40 + index * 4)
  simulationPaused = true
}

if (import.meta.env.DEV && devTestState === '#test-upgrade-live-collision') {
  configureDevUpgradeProof()
  settings = saveSettings({ haptics: false })
  hideAllPanels()
  runKind = 'classic'
  resetGame()
  clearEntities()
  state = 'playing'
  spawnUnfold = 1
  invuln = 0
  elapsed = 2
  launchGraceSeconds = 0
  nextSpawnZ = 1000
  windTimer = 999
  const scissors = createScissors()
  scissors.position.set(devCollisionProof === 'hit' ? 0 : 2.3, planeY, difficulty.speedBase / 60)
  scene.add(scissors)
  entities.push({ mesh: scissors, type: 'scissors', radius: 1.6 })
  simulationPaused = true
}

if (import.meta.env.DEV && devTestState === '#test-upgrade-live-fever') {
  configureDevUpgradeProof()
  settings = saveSettings({ haptics: false })
  hideAllPanels()
  runKind = 'classic'
  resetGame()
  clearEntities()
  state = 'playing'
  invuln = 999
  nextSpawnZ = 1000
  windTimer = 999
  hudEl?.classList.remove('hidden')
  for (let index = 0; index < 12; index += 1) registerNearMiss()
  simulationPaused = true
}

if (import.meta.env.DEV && devTestState === '#test-upgrade-live-streak') {
  configureDevUpgradeProof()
  settings = saveSettings({ haptics: false })
  hideAllPanels()
  runKind = 'classic'
  resetGame()
  clearEntities()
  state = 'playing'
  invuln = 999
  nextSpawnZ = 1000
  windTimer = 999
  hudEl?.classList.remove('hidden')
  for (let index = 0; index < 5; index += 1) registerStarStreak()
  simulationPaused = true
}

if (import.meta.env.DEV && devTestState === '#test-upgrade-live-cooldown') {
  configureDevUpgradeProof()
  settings = saveSettings({ haptics: false })
  hideAllPanels()
  runKind = 'classic'
  resetGame()
  clearEntities()
  state = 'playing'
  spawnUnfold = 1
  invuln = 999
  nextSpawnZ = 1000
  windTimer = 999
  hudEl?.classList.remove('hidden')
  applyUpgradeVisuals()
  simulationPaused = true
}

if (import.meta.env.DEV && devTestState === '#test-boss-encounter') {
  settings = saveSettings({ haptics: false })
  hideAllPanels()
  runKind = 'classic'
  resetGame()
  clearEntities()
  state = 'playing'
  spawnUnfold = 1
  invuln = 999
  nextSpawnZ = 1000
  windTimer = 999
  bossCount = devBossProof === 'wind' ? 1 : devBossProof === 'stapler' ? 2 : 0
  spawnBoss(60)
  if (devBossPass) {
    const boss = entities.find((entity) => entity.type === 'boss')
    const safeY = boss?.director?.snapshot().safeY ?? 10
    planeX = 0
    planeY = safeY
    plane.position.set(planeX, planeY, 0)
    mouseTarget.x = planeX
    mouseTarget.y = planeY
    if (boss) boss.mesh.position.z = 3
    invuln = 0
    elapsed = 2
    launchGraceSeconds = 0
  }
  hudEl?.classList.remove('hidden')
  simulationPaused = true
}

if (import.meta.env.DEV && devTestState === '#test-tier-climb') {
  settings = saveSettings({ haptics: false })
  hideAllPanels()
  runKind = 'classic'
  resetGame()
  clearEntities()
  state = 'playing'
  invuln = 999
  nextSpawnZ = 1e9 // fully park the spawn pump for this proof
  windTimer = 999
  distance = 985
  hudEl?.classList.remove('hidden')
}

if (import.meta.env.DEV && devTestState === '#test-gauntlet-payoff') {
  settings = saveSettings({ haptics: false })
  hideAllPanels()
  runKind = 'classic'
  resetGame()
  clearEntities()
  state = 'playing'
  invuln = 999
  nextSpawnZ = 1e9 // fully park the spawn pump for this proof
  windTimer = 999
  elapsed = 2
  launchGraceSeconds = 0
  spawnMiniGauntlet(45)
  // Commit to the advertised lane so the tripwire pays when it passes.
  const laneX = PASSAGE_LANE_X[activePassageLane + 1]
  planeX = laneX
  planeY = 9
  mouseTarget.x = laneX
  mouseTarget.y = 9
  plane.position.set(planeX, planeY, 0)
  hudEl?.classList.remove('hidden')
}

if (import.meta.env.DEV && devTestState === '#test-thread-gap') {
  // Control variant rides the real query string (?nothread=1#test-thread-gap)
  const control = devThreadControl
  settings = saveSettings({ haptics: false })
  hideAllPanels()
  runKind = 'classic'
  resetGame()
  clearEntities()
  state = 'playing'
  // No invuln here on purpose: the payoff lives inside the collideable
  // building branch, and with spawns parked this scene has zero lethal hazards.
  nextSpawnZ = 1e9 // fully park the spawn pump for this proof
  windTimer = 999
  elapsed = 2
  launchGraceSeconds = 0
  // Park the lane promise far from the corridor so a tier-climb golden drop
  // can never drift into the plane and inject seed-dependent pickups.
  activePassageLane = null
  // Twin towers with a 5-unit inner-face slot — the widest gap that still
  // counts as a thread. Control run (?nothread) skips the tag only, keeping
  // the RNG stream identical so totals differ by exactly the reward.
  const makeTower = (x) => {
    const b = createBuilding(3, 10, 3, buildingMats[0])
    b.position.set(x, 0, 30)
    scene.add(b)
    return b
  }
  makeTower(-4)
  makeTower(4)
  const corridor = control ? null : { minX: -2.5, maxX: 2.5, maxY: 10, paid: false }
  const towerEntity = (mesh) => ({
    mesh,
    type: 'building',
    radius: 1.5,
    halfH: 10,
    passageLane: null,
    ...(corridor ? { thread: corridor } : {}),
  })
  entities.push(towerEntity(scene.children.at(-2)))
  entities.push(towerEntity(scene.children.at(-1)))
  // y=9 keeps the whole flight above the skim ceiling so ground-skim banking
  // can't inject variable distance bonuses between the two variants.
  planeX = 0
  planeY = 9
  mouseTarget.x = 0
  mouseTarget.y = 9
  plane.position.set(planeX, planeY, 0)
  hudEl?.classList.remove('hidden')
}

if (import.meta.env.DEV && devTestState === '#test-power-refresh') {
  settings = saveSettings({ haptics: false })
  hideAllPanels()
  runKind = 'classic'
  resetGame()
  clearEntities()
  state = 'playing'
  invuln = 999
  nextSpawnZ = 1e9 // fully park the spawn pump for this proof
  windTimer = 999
  elapsed = 2
  launchGraceSeconds = 0
  hudEl?.classList.remove('hidden')
  activatePower('magnet')
  advanceTime(1500)
  // Drain ~1.5s off the timer, then catch the same kind again: the refresh
  // path must top the timer back to full instead of restarting through
  // clearPower(). render_game_to_text().power exposes the proof.
  activatePower('magnet')
  simulationPaused = true
}

if (import.meta.env.DEV && devTestState.startsWith('#test-journey-')) {
  const zoneId = devTestState.slice('#test-journey-'.length)
  const stepIndex = ['city', 'harbor', 'storm', 'aurora'].indexOf(zoneId)
  if (stepIndex >= 0) {
    settings = saveSettings({ haptics: false })
    journey = { ...createJourney(4242, 1000), stepIndex }
    journey = selectJourneyRoute(journey, getRouteChoices(journey)[0].id)
    journeyRunConfig = buildRunConfiguration(journey)
    runKind = 'journey'
    hideAllPanels()
    resetGame()
    invuln = 999
    state = 'playing'
    hudEl?.classList.remove('hidden')
    showStick(true)
  }
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

if (import.meta.env.DEV) {
  // Deterministic visual debugging: mirrors the live pose of the SAME
  // instance that owns window.advanceTime, so probes can never race or
  // double-boot the engine. Freeze holds the sim while a frame renders,
  // so captures can't race the invuln blink.
  window.__paperPose = () => ({
    planePos: plane?.position.toArray(),
    planeScale: plane?.scale.x,
    planeVisible: plane?.visible,
    camPos: camera.position.toArray(),
    shadowVisible: planeShadow.visible,
    shadowScale: planeShadow.scale.x,
    unfold: spawnUnfold,
    state,
    groundUrl: currentGroundUrl,
    groundMapLoaded: ground?.material?.map?.image ? true : false,
    groundMapWidth: ground?.material?.map?.image?.width ?? null,
    groundColor: ground?.material?.color?.getHex?.() ?? null,
    skyUrl: currentSkyUrl,
  })
  window.__paperFreeze = (frozen) => {
    simulationPaused = Boolean(frozen)
    return window.__paperPose()
  }
}

engineInstance = {
  startMode: startGame,
  returnToMenu: showMenu,
  renderGameToText: () => window.render_game_to_text(),
  advanceTime: (ms) => window.advanceTime?.(ms),
  syncSettings: syncRuntimeSettings,
  createPlanePreview,
}
return engineInstance
} catch (error) {
  engineBootFailure = error
  throw error
}
}
