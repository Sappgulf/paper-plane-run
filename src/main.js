import './style.css'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GameAudio } from './audio.js'
import { Haptic } from './haptics.js'
import { dailyKey, dailySeed, mulberry32 } from './rng.js'
import { todaysTwist } from './twists.js'
import {
  SKINS,
  getEquippedSkinId,
  getSkin,
  listSkins,
  refreshUnlocks,
  equipSkin,
  addLifetimeStars,
  getLifetimeStars,
} from './skins.js'
import {
  getDailyMissions,
  updateMissionsFromRun,
  claimMission,
  unclaimedRewards,
} from './missions.js'
import {
  createGhostRecorder,
  loadGhost,
  saveGhostIfBest,
  ghostPoseAt,
  ghostDistanceAtTime,
} from './ghost.js'
import { zoneAt, nextZone, zoneProgress } from './zones.js'
import {
  getUpgradeEffects,
  listUpgrades,
  buyUpgrade,
  getWallet,
  addWallet,
} from './upgrades.js'
import {
  submitLocalScore,
  getLocalTop,
  getDailyTop,
  fetchRemoteTop,
  submitRemoteScore,
} from './leaderboard.js'
import {
  emptyLayout,
  layoutToShareCode,
  parseCompact,
  EDITOR_PALETTE,
} from './editor.js'
import { loadSettings, saveSettings, applyDocumentA11y, powerColors } from './settings.js'
import { seasonInfo } from './seasonal.js'
import { track, getFunnelSummary, recentEvents } from './analytics.js'
import { DeskAR } from './ar.js'
import {
  addLifetimeDistance,
  getRunCount,
  incrementRunCount,
  getAchievementProgress,
  claimAchievementTier,
} from './achievements.js'
import {
  FIRST_FLIGHT_GRACE_SECONDS,
  isLaunchGraceActive,
  shouldGrantLaunchGrace,
} from './game/firstFlight.js'
// createPool available for future mesh reuse; low-power path already cuts DPR/shadows

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id)
const canvas = $('c')
const menuEl = $('menu')
const gameoverEl = $('gameover')
const hudEl = $('hud')
const bannerStackEl = $('banner-stack')
const speedFxEl = $('speed-fx')
const windBanner = $('wind-banner')
const powerBanner = $('power-banner')
const zoneBanner = $('zone-banner')

// Keep the wind/power/zone banner stack pinned just below the HUD's actual
// rendered height — the HUD can wrap to 2-3 rows depending on how many
// chips are active, so a fixed pixel offset would overlap it.
if (hudEl && bannerStackEl && typeof ResizeObserver !== 'undefined') {
  const syncBannerTop = () => {
    const rect = hudEl.getBoundingClientRect()
    const top = hudEl.classList.contains('hidden') ? rect.top : rect.bottom + 10
    bannerStackEl.style.setProperty('--banner-top', `${Math.round(top)}px`)
  }
  new ResizeObserver(syncBannerTop).observe(hudEl)
  window.addEventListener('resize', syncBannerTop)
  syncBannerTop()
}
const comboFloat = $('combo-float')
const feverFx = $('fever-fx')
const feverHud = $('fever-hud')
const powerHud = $('power-hud')
const powerLabel = $('power-label')
const powerFill = $('power-fill')
const comboHud = $('combo-hud')
const comboVal = $('combo-val')
const streakHud = $('streak-hud')
const streakVal = $('streak-val')
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
const TELEGRAPH_Z = 34
const warnFlashEl = $('warn-flash')
function isTelegraphHazard(e) {
  return e.type === 'scissors' || e.type === 'boss' || (e.type === 'bird' && e.mesh.userData.dive)
}
function checkHazardTelegraph() {
  for (const e of entities) {
    if (e.warned || !isTelegraphHazard(e)) continue
    const z = e.mesh.position.z
    if (z <= TELEGRAPH_Z && z > 4) {
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
}
const _edgeNdc = new THREE.Vector3()
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
const finalScoreEl = $('final-score')
const finalDetailEl = $('final-detail')
const newBestBadge = $('new-best-badge')

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
const challengeResult = $('challenge-result')
const shareStatus = $('share-status')
const muteBtn = $('mute-btn')
const installBtn = $('install-btn')
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
const missionBadge = $('mission-badge') // optional (hangar may omit badge)

const audio = new GameAudio()
if (muteBtn) muteBtn.textContent = audio.muted ? '🔇' : '🔊'
if (pilotNameInput) {
  pilotNameInput.value = localStorage.getItem('paper-plane-run-name') || ''
  pilotNameInput.addEventListener('change', () => {
    localStorage.setItem('paper-plane-run-name', pilotNameInput.value.slice(0, 16))
  })
}

// Settings / season / AR / analytics
let settings = loadSettings()
applyDocumentA11y(settings)
const deskAR = new DeskAR()
let season = seasonInfo(settings.forceSeason)
track('session_start', { season: season.id, dpr: devicePixelRatio })

// Distance milestones for funnel
const distanceMilestones = new Set()
let nextBossAt = 500
let nextGauntletAt = 250
let bossActive = false
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

function loadBest(id) {
  if (id === 'normal') {
    const legacy = localStorage.getItem('paper-plane-run-best')
    if (legacy && !localStorage.getItem(BEST_PREFIX + id)) {
      localStorage.setItem(BEST_PREFIX + id, legacy)
    }
  }
  return Number(localStorage.getItem(BEST_PREFIX + id) || 0)
}
function saveBest(id, v) {
  localStorage.setItem(BEST_PREFIX + id, String(v))
}

let difficulty = DIFFS[localStorage.getItem(DIFF_KEY)] || DIFFS.normal
let bestDistance = loadBest(difficulty.id)
if (bestEl) bestEl.textContent = `${Math.floor(bestDistance)}m`
if (hudModeEl) hudModeEl.textContent = difficulty.label
if (diffBlurb) diffBlurb.textContent = difficulty.blurb
document.querySelectorAll('.diff-btn').forEach((b) => {
  b.classList.toggle('active', b.dataset.diff === difficulty.id)
  b.addEventListener('click', (e) => {
    e.stopPropagation()
    setDifficulty(b.dataset.diff)
    audio.unlock().then(() => audio.uiClick())
  })
})

function setDifficulty(id, { persist = true } = {}) {
  if (!DIFFS[id]) return
  difficulty = DIFFS[id]
  if (persist) localStorage.setItem(DIFF_KEY, id)
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
  if (dailyHint) {
    dailyHint.textContent = `📅 Daily ${dailyKey()} · seed race on ${difficulty.label} · ${twist.icon} ${twist.name}: ${twist.desc}`
  }
}
updateDailyHint()

// ---------------------------------------------------------------------------
// Run modes & challenge
// ---------------------------------------------------------------------------
/** @type {'classic'|'daily'|'tutorial'|'hotseat'|'layout'} */
let runKind = 'classic'
let challenge = null
let lastRun = { d: 0, s: 0, m: 'normal', daily: false }
let layoutPlay = null
let rng = Math.random
let ghostRecorder = null
let ghostData = null
let ghostMesh = null
let currentZoneId = 'city'
let combo = 0
let maxCombo = 0
let comboTimer = 0
/** Combo Fever: a short score-multiplier burst triggered by a big near-miss streak */
const FEVER_COMBO_THRESHOLD = 8
const FEVER_DURATION = 4
const FEVER_SCORE_MUL = 1.5
let feverActive = false
let feverTimer = 0
let feverFloatTimeout = null
/** Consecutive star pickups within a short window — separate from the near-miss combo */
let starStreak = 0
let starStreakTimer = 0
let runStats = { stars: 0, powers: 0, winds: 0, maxCombo: 0 }
let tutorialDone = localStorage.getItem('paper-plane-run-tutorial') === '1'
let hotseat = { players: 2, turn: 0, scores: [0, 0], active: false }
let lastPhotoDataUrl = null
let nearMissCooldown = new WeakMap()

// URL params
{
  const params = new URLSearchParams(location.search)
  const d = Number(params.get('d') || params.get('score'))
  const s = Number(params.get('s') || 0)
  const m = (params.get('m') || 'normal').toLowerCase()
  if (Number.isFinite(d) && d > 0 && DIFFS[m]) {
    challenge = { d: Math.floor(d), s: Math.max(0, s | 0), m }
    setDifficulty(m, { persist: false })
    challengeToast.textContent = `Challenge: beat ${challenge.d}m · ${challenge.s}★ on ${DIFFS[m].label}`
    challengeToast.classList.remove('hidden')
    setTimeout(() => challengeToast.classList.add('hidden'), 6500)
  }
  const layoutCode = params.get('layout') || params.get('L')
  if (layoutCode) {
    const L = parseCompact(layoutCode)
    if (L) {
      layoutPlay = L
      challengeToast.textContent = `Custom route: ${L.name}`
      challengeToast.classList.remove('hidden')
      setTimeout(() => challengeToast.classList.add('hidden'), 5000)
    }
  }
  if (params.get('daily') === '1') runKind = 'daily'
  history.replaceState({}, '', location.pathname)
}

// PWA
const isStandalone =
  window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
// iPadOS 13+ Safari masquerades as desktop Mac Safari in its user-agent
// string (no "iPad" substring), specifically so desktop sites don't serve
// it a stripped-down mobile layout. That means a plain UA sniff misses
// every modern iPad. The standard workaround: real Macs report
// maxTouchPoints === 0, but an iPad reporting the "MacIntel" platform
// still reports real touch points — that combination is iPad-only.
const isIos =
  (/iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
// "Mouse" mode's copy ("Move cursor…") and 🖱 icon read as confusing on a
// touch-only tablet like an iPad, where there's no cursor and the same
// mode is actually driven by dragging a finger. Relabel it for touch
// devices without touching the underlying 'mouse' setting value.
const isTouchPrimary = window.matchMedia?.('(pointer: coarse)').matches && navigator.maxTouchPoints > 0
const installHintEl = $('install-hint')
const installHintBody = $('install-hint-body')
let deferredInstall = null

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredInstall = e
  installBtn.classList.remove('hidden')
})

// iOS Safari never fires beforeinstallprompt, so it never gets a way to
// install at all unless we proactively surface the button ourselves.
if (isIos && !isStandalone) installBtn.classList.remove('hidden')

installBtn.addEventListener('click', async (e) => {
  e.stopPropagation()
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
  installHintEl?.classList.remove('hidden')
})
$('install-hint-close')?.addEventListener('click', () => installHintEl?.classList.add('hidden'))
installHintEl?.addEventListener('click', (e) => {
  if (e.target === installHintEl) installHintEl.classList.add('hidden')
})
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

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
function applyPerformanceSettings() {
  const cap = settings.lowPower ? 1.25 : 2
  renderer.setPixelRatio(Math.min(devicePixelRatio, cap))
  renderer.shadowMap.enabled = !settings.lowPower
  if (typeof sun !== 'undefined' && sun) sun.castShadow = !settings.lowPower
  if (typeof dust !== 'undefined' && dust) dust.visible = !settings.lowPower
  if (deskAR.active || settings.arDesk) {
    renderer.setClearColor(0x000000, 0)
  } else {
    renderer.setClearColor(0xc8dff5, 1)
  }
}
renderer.setPixelRatio(Math.min(devicePixelRatio, settings.lowPower ? 1.25 : 2))
renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.shadowMap.enabled = !settings.lowPower
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
renderer.setClearColor(0xc8dff5, 1)

const scene = new THREE.Scene()
scene.fog = new THREE.Fog(0xc8dff5, 50, 240)
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 400)

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

const loader = new THREE.TextureLoader()
const texCache = {}
function loadTex(url) {
  if (!texCache[url]) {
    const t = loader.load(url)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    texCache[url] = t
  }
  return texCache[url]
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
function loadCutoutTex(url, growThreshold = 20, maxDistance = 70) {
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
const skyMatA = new THREE.MeshBasicMaterial({
  map: skyTex, side: THREE.BackSide, depthWrite: false, transparent: true, opacity: 1,
})
const skyMatB = new THREE.MeshBasicMaterial({
  map: skyTex, side: THREE.BackSide, depthWrite: false, transparent: true, opacity: 0,
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
if (groundMap.repeat) groundMap.repeat.set(4, 30)
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(90, 700),
  new THREE.MeshStandardMaterial({ map: groundMap, color: 0xf2e6d8, roughness: 0.95 }),
)
ground.rotation.x = -Math.PI / 2
ground.position.set(0, 0, 120)
ground.receiveShadow = true
scene.add(ground)
let currentGroundUrl = '/assets/ground-city.jpg'

// Upgrade sparkle trail
const trailPts = []
const TRAIL_N = 24
{
  const g = new THREE.BufferGeometry()
  const arr = new Float32Array(TRAIL_N * 3)
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
  const trail = new THREE.Points(
    g,
    new THREE.PointsMaterial({
      color: 0xfff0c0, size: 0.22, transparent: true, opacity: 0.7, depthWrite: false,
    }),
  )
  trail.name = 'upgradeTrail'
  trail.visible = false
  scene.add(trail)
  for (let i = 0; i < TRAIL_N; i++) trailPts.push(new THREE.Vector3())
}

// Ambient wisp trail — always present at speed, independent of upgrades
const wispPts = []
const WISP_N = 14
{
  const g = new THREE.BufferGeometry()
  const arr = new Float32Array(WISP_N * 3)
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
  const wisp = new THREE.Points(
    g,
    new THREE.PointsMaterial({
      color: 0xffffff, size: 0.1, transparent: true, opacity: 0.22, depthWrite: false,
    }),
  )
  wisp.name = 'ambientWisp'
  wisp.visible = false
  scene.add(wisp)
  for (let i = 0; i < WISP_N; i++) wispPts.push(new THREE.Vector3())
}

const hemi = new THREE.HemisphereLight(0xffe8d6, 0x8fb8d8, 1.15)
scene.add(hemi)
const sun = new THREE.DirectionalLight(0xfff0e0, 1.35)
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
applyPerformanceSettings()

// Confetti pool for near-miss
const confetti = []
const confettiGeo = new THREE.PlaneGeometry(0.15, 0.2)
function spawnConfetti(x, y, z) {
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(
      confettiGeo,
      new THREE.MeshBasicMaterial({
        color: [0xfbbf24, 0xf0956a, 0x60a5fa, 0xa78bfa, 0x34d399][i % 5],
        side: THREE.DoubleSide,
      }),
    )
    m.position.set(x, y, z)
    m.userData.v = new THREE.Vector3((rng() - 0.5) * 6, rng() * 4 + 1, (rng() - 0.5) * 4)
    m.userData.life = 0.6 + rng() * 0.4
    scene.add(m)
    confetti.push(m)
  }
}

// Materials
const planeBodyMat = new THREE.MeshStandardMaterial({
  map: paperTex, color: 0xfff6ec, roughness: 0.82, side: THREE.DoubleSide,
})
const planeAccentMat = new THREE.MeshStandardMaterial({
  color: 0xf0956a, roughness: 0.7, side: THREE.DoubleSide,
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
const scissorsHandleMat = new THREE.MeshStandardMaterial({ color: 0xe0524a, roughness: 0.45, metalness: 0.1 })
const scissorsPivotMat = new THREE.MeshStandardMaterial({ color: 0x8a8f98, metalness: 0.2, roughness: 0.4 })

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

function maybeSpawnGroundDecor(z) {
  const roll = rng()
  if (roll < 0.09) {
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

function buildPowerMeta() {
  const c = powerColors(settings.colorblindPowers)
  return {
    shield: { label: '🛡 Shield', color: c.shield, banner: '🛡 Paper Shield!', duration: 8 },
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

function applySkin(skinId) {
  const skin = getSkin(skinId)
  const map = loadTex(skin.map || '/assets/paper.jpg')
  planeBodyMat.map = map
  planeBodyMat.color.setHex(skin.body)
  planeBodyMat.needsUpdate = true
  planeAccentMat.color.setHex(skin.accent)
  planeAccentMat.needsUpdate = true
}

// Builders
function createPaperPlane(matBody = planeBodyMat, matAccent = planeAccentMat, withShield = true) {
  const g = new THREE.Group()
  // Split wings for tear-off physics toy
  const leftShape = new THREE.Shape()
  leftShape.moveTo(0, 0)
  leftShape.lineTo(-1.4, -0.15)
  leftShape.lineTo(0, 0.35)
  leftShape.lineTo(0, 0)
  const rightShape = new THREE.Shape()
  rightShape.moveTo(0, 0)
  rightShape.lineTo(1.4, -0.15)
  rightShape.lineTo(0, 0.35)
  rightShape.lineTo(0, 0)
  // Mountain-fold crease panel near the wing root, in the accent color —
  // same trick used on the redesigned bird — so the hero plane doesn't look
  // flatter than the hazards it dodges.
  const creaseShapeL = new THREE.Shape()
  creaseShapeL.moveTo(0, 0)
  creaseShapeL.lineTo(-0.55, -0.07)
  creaseShapeL.lineTo(0, 0.14)
  creaseShapeL.lineTo(0, 0)
  const creaseShapeR = new THREE.Shape()
  creaseShapeR.moveTo(0, 0)
  creaseShapeR.lineTo(0.55, -0.07)
  creaseShapeR.lineTo(0, 0.14)
  creaseShapeR.lineTo(0, 0)

  const wingL = new THREE.Mesh(new THREE.ShapeGeometry(leftShape), matBody)
  wingL.rotation.x = -Math.PI / 2
  wingL.castShadow = true
  wingL.name = 'wingL'
  const creaseL = new THREE.Mesh(new THREE.ShapeGeometry(creaseShapeL), matAccent)
  creaseL.position.z = 0.004
  wingL.add(creaseL)
  const wingR = new THREE.Mesh(new THREE.ShapeGeometry(rightShape), matBody)
  wingR.rotation.x = -Math.PI / 2
  wingR.castShadow = true
  wingR.name = 'wingR'
  const creaseR = new THREE.Mesh(new THREE.ShapeGeometry(creaseShapeR), matAccent)
  creaseR.position.z = 0.004
  wingR.add(creaseR)
  g.add(wingL, wingR)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 1.6), matAccent)
  body.position.set(0, 0.04, -0.1)
  g.add(body)
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 4), matAccent)
  nose.rotation.x = -Math.PI / 2
  nose.position.set(0, 0.02, 0.85)
  g.add(nose)
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.28), matBody)
  tail.position.set(0, 0.16, -0.7)
  g.add(tail)
  if (withShield) {
    const shield = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 16, 12),
      new THREE.MeshStandardMaterial({
        color: 0x60a5fa, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide,
      }),
    )
    shield.visible = false
    shield.name = 'shieldBubble'
    g.add(shield)
  }
  g.userData.wingL = wingL
  g.userData.wingR = wingR
  g.scale.setScalar(1.2)
  return g
}

/** A boss gate's "safe lane" marker ring — smoother torus than the old
 *  low-poly one, with a soft glow halo behind it so the safe gap reads as
 *  an inviting portal rather than a thin flat hoop.
 *
 *  IMPORTANT: this ring must face the camera (hole toward +Z, i.e. no
 *  rotation) so it reads as a hoop to fly through. A torus viewed edge-on
 *  projects as a solid bar spanning its full diameter, not a ring — that's
 *  the "wood plank" look this hazard used to have when it was rotated 90°. */
// Geometry shared across both boss variants (scissors=red, wind=blue) — only
// the material color differs, so no need to rebuild the torus mesh data
// each of the 3 rings per boss gate.
const dangerRingGeo = new THREE.TorusGeometry(1.8, 0.13, 12, 32)
const dangerRingGlowGeo = new THREE.TorusGeometry(1.8, 0.19, 8, 32)

function createDangerRing(color, emissive) {
  const ring = new THREE.Mesh(
    dangerRingGeo,
    new THREE.MeshStandardMaterial({
      color, emissive, emissiveIntensity: 0.55, roughness: 0.3, side: THREE.DoubleSide,
    }),
  )
  const glow = new THREE.Mesh(
    dangerRingGlowGeo,
    new THREE.MeshBasicMaterial({
      color: emissive, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide,
    }),
  )
  ring.add(glow)
  ring.name = 'safeRing'
  return ring
}

// Giant closing-gate blade for the boss fight. Was a BoxGeometry(0.4, 0.15, 8)
// — width, thin-height, LENGTH along Z (pointing straight at the camera) —
// the same "length axis pointed at the player" mistake fixed on the regular
// flying scissors and the bird/dragonfly wings: it foreshortened to a nearly
// invisible thin diagonal line instead of reading as a dramatic giant blade.
// Length now runs along Y (vertical, in the screen plane) so it's always
// visible edge-to-edge, with a bright edge glint for a bit of shine.
const bossBladeGeo = new THREE.BoxGeometry(0.5, 9, 0.2)
const bossBladeEdgeGeo = new THREE.PlaneGeometry(0.06, 9)

function createBossBlade() {
  const blade = new THREE.Mesh(bossBladeGeo, scissorsMat)
  const edge = new THREE.Mesh(bossBladeEdgeGeo, scissorsEdgeMat)
  edge.position.set(0.22, 0, 0.11)
  blade.add(edge)
  return blade
}

function createBossGate() {
  const g = new THREE.Group()
  // Two giant scissor blades forming a closing gate with a moving gap
  const left = createBossBlade()
  left.position.set(-3.5, 10, 0)
  left.rotation.z = 0.35
  const right = createBossBlade()
  right.position.set(3.5, 10, 0)
  right.rotation.z = -0.35
  // Frame towers
  for (const sx of [-8, 8]) {
    const tower = createBuilding(2.5, 18, 2.5, buildingMats[0])
    tower.position.x = sx
    g.add(tower)
  }
  // Danger rings / guides
  for (let i = 0; i < 3; i++) {
    const ring = createDangerRing(0xfb7185, 0xe11d48)
    ring.position.set(0, 6 + i * 4, 0)
    g.add(ring)
  }
  g.add(left, right)
  g.userData.left = left
  g.userData.right = right
  g.userData.phase = 0
  g.userData.gapY = 10
  g.userData.kind = 'scissors'
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

/** A "wind tunnel" boss gauntlet: two spinning turbines with a drifting safe lane
 *  and loose paper debris swirling in the danger zone, instead of closing blades. */
function createWindTunnelGate() {
  const g = new THREE.Group()
  for (const sx of [-8, 8]) {
    const tower = createBuilding(2.5, 18, 2.5, buildingMats[0])
    tower.position.x = sx
    g.add(tower)
  }
  const fanL = createFan(3.2)
  fanL.position.set(-3.4, 10, 0)
  const fanR = createFan(3.2)
  fanR.position.set(3.4, 10, 0)
  g.add(fanL, fanR)

  const debris = []
  for (let i = 0; i < 10; i++) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), windDebrisMat)
    d.userData.orbit = rng() * Math.PI * 2
    d.userData.radius = 2.4 + rng() * 2.6
    d.userData.speed = 2 + rng() * 2
    g.add(d)
    debris.push(d)
  }

  for (let i = 0; i < 3; i++) {
    const ring = createDangerRing(0x7eb8e8, 0x2563eb)
    ring.position.set(0, 6 + i * 4, 0)
    g.add(ring)
  }
  g.userData.fanL = fanL
  g.userData.fanR = fanR
  g.userData.debris = debris
  g.userData.phase = 0
  g.userData.gapY = 10
  g.userData.kind = 'wind'
  return g
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

const FLYER_DEFS = [
  { id: 'bird', label: 'paper bird', radius: 0.7, weight: 1 },
  { id: 'butterfly', label: 'paper butterfly', radius: 0.65, weight: 0.7, tex: '/assets/flyer-butterfly.jpg', scale: 1.5 },
  { id: 'balloon', label: 'runaway balloon', radius: 0.85, weight: 0.55, tex: '/assets/flyer-balloon.jpg', scale: 1.6, floaty: true },
  { id: 'kite', label: 'loose kite', radius: 0.75, weight: 0.5, tex: '/assets/flyer-kite.jpg', scale: 1.55, weave: true },
  { id: 'biplane', label: 'toy biplane', radius: 0.9, weight: 0.45, tex: '/assets/flyer-biplane.jpg', scale: 1.7, dive: true },
  { id: 'dragonfly', label: 'paper dragonfly', radius: 0.55, weight: 0.5 },
  { id: 'swarm', label: 'flock of paper cranes', radius: 0.95, weight: 0.35, tex: '/assets/birds.jpg', scale: 1.9 },
  { id: 'wasp', label: 'paper wasp', radius: 0.45, weight: 0.4, dive: true, weave: true },
]

function createBillboardFlyer(texUrl, scale = 1.5) {
  const g = new THREE.Group()
  const tex = loadCutoutTex(texUrl)
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const card = new THREE.Mesh(new THREE.PlaneGeometry(scale, scale), mat)
  // Face the player (camera comes from -Z looking +Z)
  card.rotation.y = Math.PI
  g.add(card)
  g.userData.billboard = card
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

  if (def.tex) {
    const bill = createBillboardFlyer(def.tex, def.scale || 1.5)
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
  return g
}

function pickFlyerKind() {
  // Seasonal bias
  let pool = FLYER_DEFS.map((f) => ({ ...f }))
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

/** A tapered, double-pointed blade (instead of a plain box) with a bright
 *  cutting-edge glint strip, built once and reused for every scissors hazard.
 *  Symmetric front-to-back so it still reads as a spinning blade when
 *  animated with a simple absolute rotation.z, like the box it replaces. */
// Shared blade geometry: ExtrudeGeometry (with bevels) is by far the most
// expensive geometry type built in this file, and scissors hazards spawn
// often (regular hazard rolls, gauntlets, boss gates) — build it once.
//
// The blade's length runs along local Y (screen-plane) with only a thin
// extrusion depth in Z (toward the camera) — deliberately NOT rotated to
// point its length down Z. The whole hazard spins around its own Z axis
// (see animateHazards), so a blade whose length already lies in the XY
// plane sweeps through a full pinwheel rotation always facing the
// camera. Pointing the blade's length at the camera (the old orientation,
// spun around Y) meant it swept edge-on twice per rotation and briefly
// vanished into a thin line — "you can hardly tell what they are."
const scissorBladeShape = new THREE.Shape()
scissorBladeShape.moveTo(0, -1.1)
scissorBladeShape.quadraticCurveTo(0.1, -0.32, 0.1, 0)
scissorBladeShape.quadraticCurveTo(0.1, 0.32, 0, 1.1)
scissorBladeShape.quadraticCurveTo(-0.06, 0.32, -0.06, 0)
scissorBladeShape.quadraticCurveTo(-0.06, -0.32, 0, -1.1)
const scissorBladeGeo = new THREE.ExtrudeGeometry(scissorBladeShape, {
  depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2,
})
const scissorEdgeGeo = new THREE.PlaneGeometry(0.05, 2.15)

function createScissorBlade() {
  const blade = new THREE.Mesh(scissorBladeGeo, scissorsMat)
  // Bright edge glint along the cutting side, flush against the blade's
  // camera-facing side.
  const edge = new THREE.Mesh(scissorEdgeGeo, scissorsEdgeMat)
  edge.position.set(0.1, 0, 0.028)
  blade.add(edge)
  return blade
}

function createScissors() {
  const g = new THREE.Group()
  const b1 = createScissorBlade()
  b1.position.set(0.12, 0, 0)
  const b2 = createScissorBlade()
  b2.position.set(-0.12, 0, 0)
  g.add(b1, b2)
  // Pivot bolt — a small disc facing the camera
  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 12), scissorsPivotMat)
  pivot.rotation.x = Math.PI / 2
  g.add(pivot)
  // Finger-loop handles, ring hole facing the camera so they read as
  // circles (never edge-on) — same fix as the boss-gate danger rings.
  const h1 = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.065, 10, 20), scissorsHandleMat)
  h1.position.set(0.32, -1.35, 0)
  const h2 = h1.clone()
  h2.position.x = -0.32
  g.add(h1, h2)
  g.userData.blade1 = b1
  g.userData.blade2 = b2
  g.scale.setScalar(1.45)
  return g
}

// Stars are by far the most frequently spawned entity in the game (every
// chunk rolls 1-2), so building fresh geometry + material per spawn was
// pure per-frame GC churn for an object that never changes shape or color.
const starCoreGeo = new THREE.PlaneGeometry(1.1, 1.1)
const starCoreMat = new THREE.MeshBasicMaterial({
  map: loadCutoutTex('/assets/pickup-orb.jpg'), transparent: true, alphaTest: 0.12, side: THREE.DoubleSide, depthWrite: false,
})
const starGlowGeo = new THREE.SphereGeometry(0.62, 12, 12)
const starGlowMat = new THREE.MeshBasicMaterial({
  color: 0xfbbf24, transparent: true, opacity: 0.18, depthWrite: false,
})

function createStar() {
  const g = new THREE.Group()
  const core = new THREE.Mesh(starCoreGeo, starCoreMat)
  core.rotation.y = Math.PI
  g.add(core)
  // Soft glow shell for readability
  const glow = new THREE.Mesh(starGlowGeo, starGlowMat)
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

  // Icon sprite facing player — boost gets the hero origami-rocket art,
  // everything else uses its clean flat icon. A few kinds (like phase)
  // don't have a matching power-${kind}.png yet; skip the icon plane for
  // those rather than firing a doomed texture load — the crystal color,
  // glow, and HUD emoji label already make the kind readable.
  const NO_ICON_KINDS = new Set(['phase'])
  const iconUrl = isBoostHero ? '/assets/pickup-boost.jpg' : `/assets/power-${kind}.png`
  try {
    if (NO_ICON_KINDS.has(kind)) throw new Error('no icon asset')
    if (!mats.iconMat) {
      const tex = isBoostHero ? loadCutoutTex(iconUrl) : loadTex(iconUrl)
      mats.iconMat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, alphaTest: isBoostHero ? 0.12 : 0, depthWrite: false, side: THREE.DoubleSide,
      })
    }
    const icon = new THREE.Mesh(isBoostHero ? powerIconGeoBoost : powerIconGeoDefault, mats.iconMat)
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
const plane = createPaperPlane()
const shieldBubble = plane.getObjectByName('shieldBubble')
scene.add(plane)
applySkin(getEquippedSkinId())

const keys = new Set()
const mouse = { nx: 0, ny: 0 }
const stick = { x: 0, y: 0, active: false, pointerId: null }
/** Co-op player 2 wind stick */
const windStick = { x: 0, y: 0, active: false, pointerId: null }
let slingHold = 0
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
let distance = 0
let stars = 0
let speed = 28
let planeY = 8
let planeX = 0
let velY = 0
let velX = 0
let pitch = 0
let roll = 0
let windTimer = 7
let windActive = 0
let windForce = 0
let activeTwist = null
let nextSpawnZ = 40
let shake = 0
let elapsed = 0
let launchGraceSeconds = 0
let activePower = null
let bannerTimer = 0
let zoneBannerTimer = 0
/** @type {any[]} */
const entities = []
const clouds = []
const PLANE_RADIUS = 0.7
const MIN_Y = 1.4
const MAX_Y = 26
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
  for (const c of confetti) scene.remove(c)
  confetti.length = 0
}

function pickHazardType(zone) {
  const bias = zone.hazardBias
  const weights = [
    ['building', 0.28 * bias.building * difficulty.hazardScale],
    ['bird', 0.22 * bias.bird * difficulty.hazardScale],
    ['scissors', 0.16 * bias.scissors * difficulty.hazardScale],
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

  const ramp = Math.min(1, distance / 700)
  const cfg = difficulty
  const zone = zoneAt(distance)
  const laneSpread = 11 * cfg.gap + rng() * 10 * cfg.gap

  maybeSpawnGroundDecor(z)

  for (const side of [-1, 1]) {
    if (rng() < 0.82) {
      const w = 2.5 + rng() * 3.5
      const h = (5 + rng() * (10 + ramp * 14)) * cfg.buildingH
      const d = 2.5 + rng() * 3
      const mat = buildingMats[(rng() * buildingMats.length) | 0]
      const b = createBuilding(w, h, d, mat)
      b.position.x = side * laneSpread
      b.position.z = z + (rng() - 0.5) * 6
      scene.add(b)
      entities.push({ mesh: b, type: 'building', radius: Math.max(w, d) * 0.5, halfH: h })
    }
  }

  const ht = pickHazardType(zone)
  if (ht === 'building') {
    const w = 2 + rng() * 3
    const h = (7 + rng() * (10 + ramp * 16)) * cfg.buildingH
    const d = 2 + rng() * 2.5
    const b = createBuilding(w, h, d, buildingMats[(rng() * buildingMats.length) | 0])
    b.position.set((rng() - 0.5) * 9 * cfg.gap, 0, z)
    scene.add(b)
    entities.push({ mesh: b, type: 'building', radius: Math.max(w, d) * 0.5, halfH: h })
  } else if (ht === 'bird') {
    const count = Math.max(1, Math.round((1 + rng() * (2 + ramp * 3)) * cfg.birdCount))
    for (let i = 0; i < count; i++) {
      const def = pickFlyerKind()
      const flyer = createFlyer(def.id)
      flyer.position.set((rng() - 0.5) * 12 * cfg.gap, 3.5 + rng() * 18, z + i * 2.5)
      scene.add(flyer)
      entities.push({
        mesh: flyer,
        type: 'bird',
        flyerId: def.id,
        label: def.label,
        radius: def.radius,
      })
    }
  } else if (ht === 'scissors') {
    const sc = createScissors()
    sc.position.set((rng() - 0.5) * 9 * cfg.gap, 4 + rng() * 16, z)
    scene.add(sc)
    entities.push({ mesh: sc, type: 'scissors', radius: 1.6 })
    // Scissor squadron — a rarer second blade further down the lane, more
    // likely to appear the deeper into a run you get.
    if (rng() < 0.12 + ramp * 0.22) {
      const sc2 = createScissors()
      sc2.position.set((rng() - 0.5) * 9 * cfg.gap, 4 + rng() * 16, z + 6 + rng() * 4)
      scene.add(sc2)
      entities.push({ mesh: sc2, type: 'scissors', radius: 1.6 })
    }
  }

  // Occasional mixed flyer even on non-bird chunks
  if (rng() < 0.18 + ramp * 0.1) {
    const def = pickFlyerKind()
    const flyer = createFlyer(def.id)
    flyer.position.set((rng() - 0.5) * 11 * cfg.gap, 4 + rng() * 16, z + 4 + rng() * 6)
    scene.add(flyer)
    entities.push({
      mesh: flyer,
      type: 'bird',
      flyerId: def.id,
      label: def.label,
      radius: def.radius,
    })
  }

  const ufx = getUpgradeEffects()
  const twistStarMul = activeTwist?.starMul || 1
  // Stars — often 1–2
  const starRolls = rng() < 0.25 * ufx.starChanceMul * twistStarMul ? 2 : 1
  for (let s = 0; s < starRolls; s++) {
    if (rng() < cfg.starChance * ufx.starChanceMul * twistStarMul) {
      const st = createStar()
      st.position.set((rng() - 0.5) * 11, 3 + rng() * 17, z + rng() * 8)
      scene.add(st)
      entities.push({ mesh: st, type: 'star', radius: 0.9 })
    }
  }
  // Powers — boosted chance; boost is more common early in pool
  if (rng() < (cfg.powerChance + 0.08 + ramp * 0.05) * ufx.powerChanceMul) {
    const classic = POWER_KINDS.filter((k) => !TOY_KINDS.includes(k))
    let pool
    if (rng() < 0.28) pool = TOY_KINDS
    else if (rng() < 0.35) pool = ['boost'] // weight boost higher
    else pool = classic
    const kind = pool[(rng() * pool.length) | 0]
    const pu = createPowerUp(kind)
    // Prefer mid-lane height where player flies
    pu.position.set((rng() - 0.5) * 8, 5 + rng() * 12, z + 1 + rng() * 5)
    scene.add(pu)
    entities.push({ mesh: pu, type: 'power', radius: 1.35, kind })
  }
}

let bossCount = 0
function spawnBoss(z = 70) {
  const useWind = bossCount % 2 === 1
  bossCount++
  const gate = useWind ? createWindTunnelGate() : createBossGate()
  gate.position.set(0, 0, z)
  scene.add(gate)
  entities.push({
    mesh: gate,
    type: 'boss',
    kind: useWind ? 'wind' : 'scissors',
    radius: 4,
    halfH: 20,
    isBoss: true,
  })
  bossActive = true
  zoneBanner.textContent = useWind
    ? '🌬️ BOSS · Wind Tunnel Gauntlet!'
    : '✂️ BOSS · Giant Scissors Gate!'
  zoneBanner.classList.remove('hidden')
  zoneBannerTimer = 3
  track('boss_start', { distance: Math.floor(distance), kind: useWind ? 'wind' : 'scissors' })
  audio.windGust()
  Haptic.power()
}

/** A lighter-weight "event" spawned at the midpoint between boss gates
 *  (every 250m, offset from the 500m boss cadence) — a deliberate cluster
 *  of hazards instead of the usual sparse random spawns, so the mid-run
 *  pacing has more texture than "quiet until the next boss". */
function spawnMiniGauntlet(z = 60) {
  if (rng() < 0.5) {
    // Scissors zigzag: weave between alternating sides
    const sides = [-1, 1, -1]
    sides.forEach((side, i) => {
      const sc = createScissors()
      sc.position.set(side * 5, 8 + rng() * 6, z + i * 9)
      scene.add(sc)
      entities.push({ mesh: sc, type: 'scissors', radius: 1.6 })
    })
  } else {
    // Flyer wall: a row of flyers spanning most of the lane at one z,
    // forcing an altitude or lane pick rather than a lucky dodge.
    const count = 4
    for (let i = 0; i < count; i++) {
      const def = pickFlyerKind()
      const flyer = createFlyer(def.id)
      const t = i / (count - 1)
      flyer.position.set((t - 0.5) * 20, 6 + rng() * 12, z + (rng() - 0.5) * 4)
      scene.add(flyer)
      entities.push({
        mesh: flyer, type: 'bird', flyerId: def.id, label: def.label, radius: def.radius,
      })
    }
  }
  zoneBanner.textContent = '⚡ Hazard Gauntlet!'
  zoneBanner.classList.remove('hidden')
  zoneBannerTimer = 2
  audio.windGust()
  Haptic.tap()
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
  renderer.toneMappingExposure = zoneAt(distance).exposure
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

  // Always clear previous power visuals cleanly
  clearPower()
  // clearPower nulls activePower — restore wings/shield already handled

  const fx = getUpgradeEffects()
  let duration = meta.duration
  if (kind === 'shield') duration *= fx.shieldDurationMul
  if (kind === 'boost') duration = 5.0
  activePower = { kind, timeLeft: duration, duration, slingCharged: false }
  audio.powerUp(kind)
  if (settings.haptics) Haptic.power()
  powerLabel.textContent = meta.label
  powerFill.style.width = '100%'
  powerHud.classList.remove('hidden')
  powerBanner.textContent = meta.banner
  powerBanner.classList.remove('hidden')
  bannerTimer = 2.4
  runStats.powers++
  track('power_pickup', { kind })

  if ((kind === 'shield' || kind === 'phase') && shieldBubble) {
    shieldBubble.visible = true
    shieldBubble.material.color.setHex(meta.color)
  }

  if (kind === 'boost') {
    // Strong, readable boost — additive impulse + sustained cruise.
    // Kept modest (not a flat multiplier stack) so the sudden speed jump
    // doesn't outrun the hazard density and cause an unavoidable crash.
    speedBoost = Math.max(speedBoost, 18)
    fovPunch = 12
    shake = Math.max(shake, 0.3)
    velY += 3
    // Grace window scales with the Turbo Fold upgrade so invested players
    // get an even safer boost.
    invuln = Math.max(invuln, 0.9 + fx.boostSafety * 0.15)
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
  tex.repeat.set(4, 30)
  ground.material.map = tex
  ground.material.color.setHex(tint)
  ground.material.needsUpdate = true
}

function applyZone(z, announce) {
  scene.fog.color.setHex(z.fog)
  hemi.color.setHex(z.hemiSky)
  hemi.groundColor.setHex(z.hemiGround)
  if (!activePower || activePower.kind !== 'slow') {
    renderer.toneMappingExposure = z.exposure
  }
  if (z.sky) setSkyTexture(z.sky, announce)
  if (z.ground) setGroundTexture(z.ground, z.groundTint ?? 0xf2e6d8)
  audio.setMusicZone(z.id)
  hudZoneEl.textContent = z.name
  if (announce && z.id !== currentZoneId) {
    zoneBanner.textContent = `✦ ${z.name}`
    zoneBanner.classList.remove('hidden')
    zoneBannerTimer = 2.5
  }
  currentZoneId = z.id
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

function applyUpgradeVisuals() {
  const fx = getUpgradeEffects()
  plane.scale.setScalar(fx.planeScale)
  const trail = scene.getObjectByName('upgradeTrail')
  if (trail) {
    trail.visible = fx.trailLevel > 0 && state === 'playing'
    trail.material.opacity = 0.35 + fx.trailLevel * 0.2
    trail.material.size = 0.16 + fx.trailLevel * 0.08
  }
}

function resetGame() {
  clearEntities()
  clearPower()
  distance = 0
  stars = 0
  speed = difficulty.speedBase
  // Dead-center spawn every run
  planeX = 0
  planeY = 10
  velY = 0
  velX = 0
  pitch = 0
  roll = 0
  windTimer = 7
  windActive = 0
  windForce = 0
  nextSpawnZ = 35
  shake = 0
  elapsed = 0
  launchGraceSeconds = shouldGrantLaunchGrace({
    runKind,
    tutorialDone,
    completedRuns: getRunCount(),
  }) ? FIRST_FLIGHT_GRACE_SECONDS : 0
  combo = 0
  maxCombo = 0
  comboTimer = 0
  starStreak = 0
  starStreakTimer = 0
  streakHud?.classList.add('hidden')
  feverActive = false
  feverTimer = 0
  feverFx?.classList.remove('fever-active')
  feverHud?.classList.add('hidden')
  runStats = { stars: 0, powers: 0, winds: 0, maxCombo: 0 }
  nextBossAt = 500
  nextGauntletAt = 250
  bossActive = false
  distanceMilestones.clear()
  speedBoost = 0
  invuln = 0.4 // brief spawn grace
  guardianLeft = getUpgradeEffects().guardianCharges
  guardianHud?.classList.toggle('hidden', guardianLeft <= 0)
  if (guardianHudVal) guardianHudVal.textContent = String(guardianLeft)
  crashT = 0
  crashReason = ''
  fovPunch = 0
  slingHold = 0
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
  plane.scale.setScalar(getUpgradeEffects().planeScale)
  comboHud.classList.add('hidden')
  applySeasonVisuals()
  applySkin(getEquippedSkinId())
  applyUpgradeVisuals()

  // RNG
  if (runKind === 'daily') {
    rng = mulberry32(dailySeed(difficulty.id))
    activeTwist = todaysTwist()
  } else if (runKind === 'layout') {
    rng = Math.random
    activeTwist = null
  } else {
    rng = Math.random
    activeTwist = null
  }

  plane.position.set(0, planeY, 0)
  plane.rotation.set(0, 0, 0)
  camera.position.set(0, planeY + 3.2, -11)
  camera.lookAt(0, planeY, 14)
  ground.position.z = 120
  currentSkyUrl = ''
  currentGroundUrl = ''
  applyZone(zoneAt(0), false)

  ghostRecorder = createGhostRecorder()
  ghostData = runKind === 'tutorial' ? null : loadGhost(difficulty.id + (runKind === 'daily' ? '-daily' : ''))
  if (ghostData?.path?.length) {
    ghostMesh = createPaperPlane(ghostMat, ghostMat, false)
    ghostMesh.scale.setScalar(1.05)
    scene.add(ghostMesh)
  }

  if (runKind === 'tutorial') {
    spawnTutorial()
  } else if (runKind === 'layout' && layoutPlay) {
    spawnLayoutItems()
  } else {
    for (let i = 0; i < 14; i++) {
      spawnChunk(nextSpawnZ)
      nextSpawnZ += (16 + rng() * 10) * difficulty.gap
    }
  }

  for (let i = 0; i < 10; i++) {
    const cl = createCloud()
    cl.position.set((rng() - 0.5) * 55, 12 + rng() * 18, 20 + rng() * 180)
    cl.scale.setScalar(1.2 + rng() * 1.8)
    scene.add(cl)
    clouds.push(cl)
  }

  distanceEl.textContent = '0m'
  starsEl.textContent = '0'
  windBanner.classList.add('hidden')
  powerBanner.classList.add('hidden')
  zoneBanner.classList.add('hidden')
  comboFloat.classList.add('hidden')
  photoWrap.classList.add('hidden')
  lastPhotoDataUrl = null
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
        ? 'On-screen stick + arrows · stick hidden in Touch Aim mode'
        : 'On-screen stick + arrows / WASD · stick hidden in Mouse mode'
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

function setControlMode(mode) {
  if (mode !== 'mouse' && mode !== 'joystick') return
  settings = saveSettings({ controlMode: mode })
  updateControlUI()
  showStick(state === 'playing')
}

document.querySelectorAll('.ctrl-btn').forEach((b) => {
  b.addEventListener('click', (e) => {
    e.stopPropagation()
    setControlMode(b.dataset.ctrl)
    audio.unlock().then(() => audio.uiClick())
  })
})
$('menu-invert-y')?.addEventListener('change', (e) => {
  settings = saveSettings({ invertY: e.target.checked })
  const sy = $('set-invert-y')
  if (sy) sy.checked = e.target.checked
  updateControlUI()
})
updateControlUI()
// Ensure sticks never flash on boot
showStick(false)

/** Map pointer to normalized -1..1 with invert options */
function pointerAxesFromClient(clientX, clientY) {
  let nx = (clientX / innerWidth) * 2 - 1
  let ny = -((clientY / innerHeight) * 2 - 1) // screen up → +1
  if (settings.invertX) nx = -nx
  if (settings.invertY) ny = -ny
  return { nx, ny }
}

/** Raycast cursor onto the flight plane (z=0) so left/right match the screen */
const _aimRay = new THREE.Raycaster()
const _aimNdc = new THREE.Vector2()
const _aimHit = new THREE.Vector3()
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
    let ty = _aimHit.y
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
  return {
    x: settings.invertX ? -x : x,
    y: settings.invertY ? -y : y,
  }
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
window.addEventListener('keydown', (e) => {
  keys.add(e.code)
  if (e.code === 'Space') {
    e.preventDefault()
    // Don't restart mid-sling charge during play
    if (state === 'playing' && activePower?.kind === 'sling') return
    if (state === 'menu') startGame(runKind === 'layout' ? 'layout' : 'classic')
    else if (state === 'dead' && crashT <= 0) startGame(runKind === 'layout' ? 'layout' : runKind)
  }
  if (e.code === 'KeyM') {
    muteBtn.textContent = audio.toggleMute() ? '🔇' : '🔊'
  }
})
window.addEventListener('keyup', (e) => keys.delete(e.code))
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
muteBtn.addEventListener('click', async (e) => {
  e.stopPropagation()
  await audio.unlock()
  muteBtn.textContent = audio.toggleMute() ? '🔇' : '🔊'
})

// ---------------------------------------------------------------------------
// UI panels
// ---------------------------------------------------------------------------
function hideAllPanels() {
  for (const id of ['menu', 'gameover', 'hangar-panel', 'hotseat-intermission']) {
    $(id)?.classList.add('hidden')
  }
}

function showMenu() {
  state = 'menu'
  hideAllPanels()
  menuEl?.classList.remove('hidden')
  hudEl?.classList.add('hidden')
  if (speedFxEl) speedFxEl.style.opacity = '0'
  hideEdgeIndicators()
  nextZoneHud?.classList.add('hidden')
  ghostDeltaHud?.classList.add('hidden')
  guardianHud?.classList.add('hidden')
  tutorialHintEl?.classList.add('hidden')
  showStick(false)
  try {
    refreshMissionBadge()
  } catch {
    /* optional badge */
  }
  updateControlUI()
}

function openHangar(tab = 'upgrades') {
  hideAllPanels()
  const hangar = $('hangar-panel')
  hangar?.classList.remove('hidden')
  showHangarTab(tab)
  refreshHangarWallet()
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
  document.querySelectorAll('.hangar-tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === tab)
  })
  document.querySelectorAll('.hangar-page').forEach((p) => {
    p.classList.toggle('hidden', p.id !== `tab-${tab}`)
  })
  if (tab === 'upgrades') renderUpgrades()
  if (tab === 'skins') renderSkins()
  if (tab === 'missions') renderMissions()
  if (tab === 'achievements') renderAchievements()
  if (tab === 'board') renderBoard('local')
  if (tab === 'settings') renderSettings()
  if (tab === 'stats') renderStats()
  if (tab === 'editor') setupEditor()
  refreshHangarWallet()
}

document.querySelectorAll('.hangar-tab').forEach((b) => {
  b.addEventListener('click', (e) => {
    e.stopPropagation()
    showHangarTab(b.dataset.tab)
    audio.unlock().then(() => audio.uiClick())
  })
})

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
          audio.missionComplete()
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
          audio.missionComplete()
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

function renderSkins() {
  refreshUnlocks(season.id)
  refreshHangarWallet()
  const grid = $('skins-grid')
  if (!grid) return
  grid.innerHTML = ''
  for (const s of listSkins(season.id)) {
    const card = document.createElement('button')
    card.type = 'button'
    card.className = `skin-card${s.equipped ? ' equipped' : ''}${s.unlocked || s.canUnlock ? '' : ' locked'}`
    const meta = s.equipped
      ? 'Equipped'
      : s.seasonalFree
        ? '✦ Seasonal free'
        : s.unlocked || s.canUnlock
          ? s.cost && s.cost < 900
            ? `${s.cost}★ unlock`
            : 'Unlocked'
          : s.seasonal
            ? `Season: ${s.seasonal}`
            : `Need ${s.cost}★`
    card.innerHTML = `<img src="${s.map}" alt=""/><div class="name">${s.name}</div><div class="meta">${meta}</div>`
    card.onclick = () => {
      refreshUnlocks(season.id)
      if (s.unlocked || s.canUnlock) {
        equipSkin(s.id)
        applySkin(s.id)
        audio.uiClick()
        renderSkins()
      }
    }
    grid.appendChild(card)
  }
}

function renderUpgrades() {
  refreshHangarWallet()
  const grid = $('upgrades-grid')
  if (!grid) return
  grid.innerHTML = ''
  for (const u of listUpgrades()) {
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
          audio.uiClick()
          if (settings.haptics) Haptic.collect()
          applyUpgradeVisuals()
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
    const barEl = document.createElement('div')
    barEl.className = 'u-bars'
    barEl.textContent = `${bars}  ${u.level}/${u.max}`
    card.appendChild(barEl)
    grid.appendChild(card)
  }
}

function renderSettings() {
  const s = settings
  const bind = (id, key, { number = false } = {}) => {
    const el = $(id)
    if (!el) return
    if (el.type === 'checkbox') {
      el.checked = !!s[key]
      el.onchange = () => {
        settings = saveSettings({ [key]: el.checked })
        applyDocumentA11y(settings)
        applyPerformanceSettings()
        rebuildPowerPalette()
        updateControlUI()
        if (key === 'arDesk') {
          if (el.checked) deskAR.start().then((ok) => {
            if (!ok) {
              el.checked = false
              settings = saveSettings({ arDesk: false })
              alert('Camera permission needed for Desk AR')
            } else applyPerformanceSettings()
          })
          else {
            deskAR.stop()
            applyPerformanceSettings()
          }
        }
        if (key === 'forceSeason' || key === 'colorblindPowers') applySeasonVisuals()
        if (key === 'invertY' || key === 'invertX') updateControlUI()
      }
    } else {
      el.value = number ? String(s[key]) : s[key]
      el.onchange = () => {
        const val = number ? Number(el.value) : el.value
        settings = saveSettings({ [key]: val })
        applySeasonVisuals()
        applyDocumentA11y(settings)
        updateControlUI()
        if (key === 'controlMode' && state === 'playing') showStick(true)
      }
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
  const seasonLabel = $('season-now')
  if (seasonLabel) seasonLabel.textContent = `${season.name} (${season.id})`
  // sync control mode select with saved
  const cm = $('set-control-mode')
  if (cm) cm.value = s.controlMode === 'joystick' ? 'joystick' : 'mouse'
  const ms = $('set-mouse-sens')
  if (ms) {
    const v = Number(s.mouseSensitivity) || 1
    if (v < 0.85) ms.value = '0.7'
    else if (v > 1.15) ms.value = '1.35'
    else ms.value = '1'
  }
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
    li.innerHTML = `
      <span class="board-rank">${rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}</span>
      <span class="board-name">${r.name || 'Pilot'}${isMe ? ' (you)' : ''}<small>${r.mode || ''}</small></span>
      <span class="board-score">${r.distance}m<small>${r.stars || 0}★</small></span>
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
  layoutPlay = editorLayout
  startGame('layout')
})

// Menu buttons
const bindClick = (id, fn) => {
  const el = $(id)
  if (el) el.onclick = fn
}
bindClick('start-btn', () => startGame('classic'))
bindClick('daily-btn', () => startGame('daily'))
bindClick('tutorial-btn', () => startGame('tutorial'))
bindClick('hotseat-btn', () => {
  hotseat = { players: 2, turn: 0, scores: [0, 0], active: true }
  startGame('hotseat')
})
$('hangar-btn')?.addEventListener('click', () => openHangar('upgrades'))
$('coop-btn')?.addEventListener('click', () => startGame('coop'))
$('ar-btn')?.addEventListener('click', async () => {
  await audio.unlock()
  const on = await deskAR.toggle()
  settings = saveSettings({ arDesk: on })
  applyPerformanceSettings()
  challengeToast.textContent = on ? '📷 Desk AR on — fly over your table!' : 'Desk AR off'
  challengeToast.classList.remove('hidden')
  setTimeout(() => challengeToast.classList.add('hidden'), 2500)
})
document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', showMenu))
document.querySelectorAll('[data-board]').forEach((t) =>
  t.addEventListener('click', () => renderBoard(t.dataset.board)),
)

bindClick('retry-btn', () => startGame(runKind))
bindClick('menu-btn', () => {
  if (state === 'dead' && crashT > 0) {
    crashT = 0
    finalizeDeath()
  }
  hotseat.active = false
  showMenu()
})
bindClick('share-btn', () => shareScore())
bindClick('photo-save', () => {
  if (!lastPhotoDataUrl) return
  const a = document.createElement('a')
  a.href = lastPhotoDataUrl
  a.download = `paper-plane-${Math.floor(lastRun.d)}m.png`
  a.click()
})
bindClick('photo-share', async () => {
  if (!lastPhotoDataUrl) return
  try {
    const blob = await (await fetch(lastPhotoDataUrl)).blob()
    const file = new File([blob], 'paper-plane.png', { type: 'image/png' })
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Paper Plane Run', text: shareText() })
    } else {
      await navigator.clipboard.writeText(shareText() + '\n' + buildShareUrl())
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

function shareText() {
  const { d, s, m, daily } = lastRun
  return `I flew ${d}m · ${s}★ on ${DIFFS[m]?.label || m}${daily ? ' (Daily)' : ''} in Paper Plane Run!`
}
function buildShareUrl() {
  const u = new URL(location.href)
  u.search = ''
  u.searchParams.set('d', String(lastRun.d))
  u.searchParams.set('s', String(lastRun.s))
  u.searchParams.set('m', lastRun.m)
  if (lastRun.daily) u.searchParams.set('daily', '1')
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
  try {
    // Finish deferred death rewards if restarting mid-crash
    if (state === 'dead' && crashT > 0) {
      crashT = 0
      finalizeDeath()
    }
    await audio.unlock()
    audio.uiClick()
    runKind = kind
    if (kind === 'layout' && !layoutPlay) {
      if (editorLayout.items.length) layoutPlay = editorLayout
    }
    if (kind === 'hotseat' && !opts.continueHotseat) {
      hotseat.turn = 0
      hotseat.scores = [0, 0]
      hotseat.active = true
    }
    if (kind === 'coop') hotseat.active = false
    // Don't block play on AR permission failures
    if (settings.arDesk && !deskAR.active) {
      try {
        await deskAR.start()
        applyPerformanceSettings()
      } catch (e) {
        console.warn('AR start failed', e)
      }
    }
    hideAllPanels()
    resetGame()
    state = 'playing'
    hudEl?.classList.remove('hidden')
    showStick(true)
    if (hotseat.active) {
      hotseatHud?.classList.remove('hidden')
      if (hotseatPlayerEl) hotseatPlayerEl.textContent = String(hotseat.turn + 1)
    } else hotseatHud?.classList.add('hidden')
    const coopHud = $('coop-hud')
    if (coopHud) coopHud.classList.toggle('hidden', kind !== 'coop')
    audio.startFlight()
    if (launchGraceSeconds > 0) {
      powerBanner.textContent = '✈️ Get ready — launch protection active'
      powerBanner.classList.remove('hidden')
      bannerTimer = launchGraceSeconds
    }
    if (settings.haptics) Haptic.tap()
    track('game_start', { kind, mode: difficulty.id, season: season.id })
  } catch (err) {
    console.error('startGame failed', err)
    // Recover: ensure we're at least in a playable state
    try {
      hideAllPanels()
      state = 'playing'
      hudEl?.classList.remove('hidden')
      if (planeX === undefined || Number.isNaN(planeX)) {
        planeX = 0
        planeY = 10
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
    ` · ${difficulty.label} · ${zoneAt(distance).name}`,
    pad + starsW,
    card.height - barH * 0.13,
  )
  return card.toDataURL('image/jpeg', 0.88)
}

function capturePhoto() {
  try {
    lastPhotoDataUrl = buildRecapCard()
    photoImg.src = lastPhotoDataUrl
    photoCaption.textContent = `${Math.floor(distance)}m · ${stars}★ · ${difficulty.label}`
    photoWrap.classList.remove('hidden')
  } catch {
    photoWrap.classList.add('hidden')
  }
}

function die(reason) {
  if (state !== 'playing') return

  // Invulnerability (after shield break / boost start)
  if (invuln > 0 && reason !== 'Tutorial complete!') return

  // Shield absorbs one hazard (not ground / tutorial end)
  if (
    activePower?.kind === 'shield' &&
    reason !== 'Nosed into the paper ground' &&
    reason !== 'Tutorial complete!'
  ) {
    audio.shieldHit()
    if (settings.haptics) Haptic.nearMiss()
    clearPower()
    shake = 0.55
    invuln = 1.35
    damageFlash = 1.1
    _damageOrigColor.copy(planeBodyMat.color)
    velY = Math.max(velY, 0) + 12
    velX *= 0.4
    speedBoost = Math.max(speedBoost, 6)
    // flash shield pop
    spawnConfetti(planeX, planeY, 1)
    if (shieldBubble) shieldBubble.visible = false
    return
  }

  // Guardian Crease: a purchased free save, used when no shield is active
  if (guardianLeft > 0 && reason !== 'Tutorial complete!') {
    guardianLeft--
    if (guardianHudVal) guardianHudVal.textContent = String(guardianLeft)
    guardianHud?.classList.toggle('hidden', guardianLeft <= 0)
    audio.shieldHit()
    if (settings.haptics) Haptic.nearMiss()
    shake = 0.6
    invuln = 1.4
    damageFlash = 1.1
    _damageOrigColor.copy(planeBodyMat.color)
    velY = Math.max(velY, 0) + 12
    velX *= 0.4
    speedBoost = Math.max(speedBoost, 6)
    spawnConfetti(planeX, planeY, 1)
    powerBanner.textContent = '🛟 Guardian Crease saved you!'
    powerBanner.classList.remove('hidden')
    bannerTimer = 2.2
    return
  }

  const isWin = reason === 'Tutorial complete!'
  state = 'dead'
  crashT = isWin ? 0.35 : 1.05
  crashReason = reason
  shake = isWin ? 0.2 : 1.1
  speedBoost = 0
  fovPunch = isWin ? 0 : -6
  showStick(false)
  clearPower()

  // Sync crash pose
  plane.position.set(planeX, planeY, 0)
  if (!isWin) {
    audio.crash()
    if (settings.haptics) Haptic.crash()
    spawnConfetti(planeX, planeY, 0)
    spawnConfetti(planeX, planeY + 0.5, 1)
    // paper burst velocity
    velX = (rng() - 0.5) * 20
    velY = 6 + rng() * 4
  } else {
    audio.missionComplete()
    if (settings.haptics) Haptic.collect()
    localStorage.setItem('paper-plane-run-tutorial', '1')
    tutorialDone = true
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
  if (speedFxEl) speedFxEl.style.opacity = '0'
  hideEdgeIndicators()
  nextZoneHud?.classList.add('hidden')
  ghostDeltaHud?.classList.add('hidden')
  guardianHud?.classList.add('hidden')
  tutorialHintEl?.classList.add('hidden')
  const reason = crashReason
  const isWin = reason === 'Tutorial complete!'
  const d = Math.floor(distance)
  lastRun = {
    d, s: stars, m: difficulty.id, daily: runKind === 'daily',
  }

  const wasNewBest =
    !isWin && d > bestDistance && d > 0 && runKind !== 'tutorial' && runKind !== 'layout'
  if (wasNewBest) {
    bestDistance = d
    saveBest(difficulty.id, d)
  }
  bestEl.textContent = `${Math.floor(bestDistance)}m`
  newBestBadge?.classList.toggle('hidden', !wasNewBest)

  if (ghostRecorder && runKind !== 'tutorial' && !isWin) {
    const key = difficulty.id + (runKind === 'daily' ? '-daily' : '')
    saveGhostIfBest(key, d, ghostRecorder.toJSON(), stars)
  }

  if (stars > 0) {
    addLifetimeStars(stars)
    addWallet(stars)
  }
  if (runKind !== 'tutorial' && runKind !== 'layout') {
    addLifetimeDistance(d)
    incrementRunCount()
  }
  refreshUnlocks(season.id)
  updateMissionsFromRun({
    stars,
    distance: d,
    maxCombo,
    powers: runStats.powers,
    winds: runStats.winds,
    mode: difficulty.id,
    daily: runKind === 'daily',
  })
  refreshMissionBadge()

  const name = (pilotNameInput.value || 'Pilot').slice(0, 16)
  if (runKind !== 'tutorial') {
    submitLocalScore({
      name, distance: d, stars, mode: difficulty.id,
      daily: runKind === 'daily', dailyKey: dailyKey(),
    })
    submitRemoteScore({
      name, distance: d, stars, mode: difficulty.id, daily: runKind === 'daily',
    })
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
    $('gameover-title').textContent = isWin ? 'Tutorial complete!' : 'Crashed!'
    animateCountUp(finalScoreEl, d, `m · ${stars}★ · ${difficulty.label}${runKind === 'daily' ? ' · Daily' : ''}`)
    finalDetailEl.textContent = reason
  }

  if (challenge && challenge.m === difficulty.id) {
    challengeResult.classList.remove('hidden')
    challengeResult.textContent =
      d > challenge.d
        ? `You beat the challenge! (${challenge.d}m → ${d}m)`
        : `Challenge was ${challenge.d}m · ${challenge.s}★ — you got ${d}m · ${stars}★`
  } else challengeResult.classList.add('hidden')

  hudEl.classList.add('hidden')
  gameoverEl.classList.remove('hidden')
  windBanner.classList.add('hidden')
  powerBanner.classList.add('hidden')
  shareStatus.textContent = ''
  crashT = -1
}

// ---------------------------------------------------------------------------
// World update
// ---------------------------------------------------------------------------
function scrollWorld(move) {
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
  const pos = dust.geometry.attributes.position
  for (let i = 0; i < dustCount; i++) {
    pos.array[i * 3 + 2] -= move * 0.55
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
      // Motion patterns by flyer type
      if (u.floaty) {
        e.mesh.position.y += Math.sin(u.phase * 0.5) * dt * 1.8
      }
      if (u.weave) {
        e.mesh.position.x += Math.sin(u.phase * 0.7) * dt * 3.5
      }
      if (u.dive && e.mesh.position.z < 40) {
        e.mesh.position.y += Math.sin(u.phase) * dt * 2.2
        e.mesh.position.x += Math.cos(u.phase * 0.4) * dt * 1.5
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
        e.mesh.userData.glow.material.opacity = 0.12 + Math.sin(elapsed * 5 + e.mesh.position.z) * 0.06
      }
      if (e.mesh.userData.core) e.mesh.userData.core.rotation.y += dt * 2.2
    }
    if (e.type === 'scissors') {
      // Spin around Z (the camera-facing axis), not Y — the blades' length
      // now lies in the screen plane, so a Z-spin sweeps them through a
      // full pinwheel rotation always facing the player instead of
      // tumbling edge-on twice per revolution.
      e.mesh.rotation.z += dt * 1.2
      const u = e.mesh.userData
      if (u.blade1) {
        const open = 0.12 + Math.sin(elapsed * 7) * 0.12
        u.blade1.rotation.z = open
        u.blade2.rotation.z = -open
      }
    }
    if (e.type === 'boss') {
      const u = e.mesh.userData
      u.phase += dt * 2.2
      // Safe gap oscillates
      u.gapY = 8 + Math.sin(u.phase) * 5
      if (u.kind === 'wind') {
        if (u.fanL) u.fanL.rotation.z += dt * 9
        if (u.fanR) u.fanR.rotation.z -= dt * 9
        u.fanL && (u.fanL.position.y = u.gapY + 3)
        u.fanR && (u.fanR.position.y = u.gapY + 3)
        if (u.debris) {
          for (const d of u.debris) {
            d.userData.orbit += dt * d.userData.speed
            const r = d.userData.radius
            d.position.set(Math.cos(d.userData.orbit) * r, u.gapY + 3 + Math.sin(d.userData.orbit * 1.3) * r * 0.6, Math.sin(d.userData.orbit) * 0.6)
            d.rotation.z += dt * 3
          }
        }
      } else {
        if (u.left) {
          u.left.position.y = u.gapY + 3
          u.left.rotation.z = 0.25 + Math.sin(u.phase * 1.3) * 0.2
        }
        if (u.right) {
          u.right.position.y = u.gapY + 3
          u.right.rotation.z = -0.25 - Math.sin(u.phase * 1.3) * 0.2
        }
      }
      // Highlight safe rings near gap
      e.mesh.traverse((ch) => {
        if (ch.name === 'safeRing') {
          ch.position.y = u.gapY
          ch.material.opacity = 0.7 + Math.sin(elapsed * 8) * 0.2
          ch.material.transparent = true
        }
      })
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
    c.userData.life -= dt
    c.position.addScaledVector(c.userData.v, dt)
    c.userData.v.y -= 8 * dt
    c.rotation.x += dt * 5
    if (c.userData.life <= 0) {
      scene.remove(c)
      confetti.splice(i, 1)
    }
  }
}

function registerNearMiss(kind = null) {
  combo++
  maxCombo = Math.max(maxCombo, combo)
  runStats.maxCombo = maxCombo
  comboTimer = 1.6
  comboVal.textContent = `${combo}x`
  comboHud.classList.remove('hidden')
  comboHud.classList.remove('combo-pulse')
  void comboHud.offsetWidth // restart the animation on rapid consecutive combos
  comboHud.classList.add('combo-pulse')
  comboFloat.textContent = combo >= 3 ? `${combo}x NEAR MISS!` : 'Near miss!'
  comboFloat.classList.remove('fever-float')
  comboFloat.classList.remove('hidden')
  setTimeout(() => comboFloat.classList.add('hidden'), 500)
  audio.nearMiss(combo, kind)
  Haptic.nearMiss()
  spawnConfetti(planeX, planeY, 2)
  distance += 5 * combo * 0.25
  if (combo >= FEVER_COMBO_THRESHOLD) triggerFever()
}

/** A short score-multiplier burst for stringing together a big near-miss streak. */
function triggerFever() {
  feverActive = true
  feverTimer = FEVER_DURATION
  feverFx?.classList.add('fever-active')
  feverHud?.classList.remove('hidden')
  comboFloat.textContent = 'FEVER!'
  comboFloat.classList.add('fever-float')
  comboFloat.classList.remove('hidden')
  clearTimeout(feverFloatTimeout)
  feverFloatTimeout = setTimeout(() => comboFloat.classList.add('hidden'), 900)
  audio.fever()
  Haptic.power()
  // A bigger celebratory burst than a regular near-miss's single spawnConfetti call
  spawnConfetti(planeX, planeY, 0)
  spawnConfetti(planeX, planeY + 0.6, 1)
  spawnConfetti(planeX, planeY - 0.6, -1)
}

/** Consecutive star pickups within a short window — every 5th grants bonus stars. */
function registerStarStreak() {
  starStreak++
  starStreakTimer = 2.2
  if (streakVal) streakVal.textContent = String(starStreak)
  if (starStreak >= 2 && streakHud) {
    streakHud.classList.remove('hidden')
    streakHud.classList.remove('combo-pulse')
    void streakHud.offsetWidth
    streakHud.classList.add('combo-pulse')
  }
  if (starStreak % 5 === 0) {
    const tier = starStreak / 5
    const bonus = 1 + tier
    stars += bonus
    runStats.stars = stars
    starsEl.textContent = String(stars)
    audio.starStreak(tier)
    if (settings.haptics) Haptic.collect()
    spawnConfetti(planeX, planeY, 1)
    powerBanner.textContent = `⭐ Star Streak x${starStreak}! +${bonus}`
    powerBanner.classList.remove('hidden')
    bannerTimer = 2.0
  }
}

function update(dt) {
  elapsed += dt
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
    // Dramatic crash: tumble, drop, paper spin
    const isWin = crashReason === 'Tutorial complete!'
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
      new THREE.Vector3(plane.position.x * 0.5, Math.max(3, plane.position.y + 4.5), -8),
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
  if (invuln > 0) invuln -= dt
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
      shieldBubble.material.opacity = 0.15 + Math.sin(elapsed * 6) * 0.08
      // flash when about to expire
      if (activePower.timeLeft < 1.2) {
        shieldBubble.visible = Math.sin(elapsed * 20) > 0
      }
    }
    if (activePower.kind === 'phase' && shieldBubble) {
      // Faster, spookier flicker than the shield's slow pulse
      shieldBubble.material.opacity = 0.12 + Math.abs(Math.sin(elapsed * 11)) * 0.14
      if (activePower.timeLeft < 1) {
        shieldBubble.visible = Math.sin(elapsed * 24) > 0
      }
    }
    if (activePower.kind === 'boost') {
      // Sustain a strong (but not overwhelming) boost for the full duration
      speedBoost = Math.max(speedBoost, 10 + activePower.timeLeft * 1.6)
      fovPunch = THREE.MathUtils.lerp(fovPunch, 9, 1 - Math.pow(0.001, dt))
      // Boost trail confetti occasionally
      if (Math.random() < dt * 8) spawnConfetti(planeX, planeY - 0.2, -0.5)
    }
    if (activePower.timeLeft <= 0) {
      if (activePower.kind === 'boost') {
        speedBoost = Math.max(speedBoost * 0.5, 6)
        fovPunch = 2
      }
      clearPower()
    }
  }

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
    if (comboTimer <= 0) {
      combo = 0
      comboHud.classList.add('hidden')
    }
  }
  if (starStreakTimer > 0) {
    starStreakTimer -= dt
    if (starStreakTimer <= 0) {
      starStreak = 0
      streakHud?.classList.add('hidden')
    }
  }
  if (feverActive) {
    feverTimer -= dt
    if (feverTimer <= 0) {
      feverActive = false
      feverFx?.classList.remove('fever-active')
      feverHud?.classList.add('hidden')
    }
  }

  // Adaptive music: brighter/quicker as speed climbs and near-miss combo builds.
  const speedFactor = THREE.MathUtils.clamp(
    (speed - difficulty.speedBase) / Math.max(1, difficulty.speedCap - difficulty.speedBase), 0, 1,
  )
  const comboFactor = Math.min(1, combo / 6)
  audio.setIntensity(speedFactor * 0.55 + comboFactor * 0.55)

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
  if (windActive > 0) {
    windActive -= dt
    velX += windForce * dt * (activePower?.kind === 'slow' ? 0.5 : 1)
    if (windActive <= 0) windBanner.classList.add('hidden')
  } else if (windTimer <= 0 && runKind !== 'tutorial' && runKind !== 'coop' && activeTwist?.windMul !== 0) {
    // In co-op, P2 is the wind — skip random gusts (or rarer)
    // Calm Skies twist sets windMul to 0, which is handled by the guard above
    windActive = 1.6 + rng() * 1.4
    windForce = (rng() < 0.5 ? -1 : 1) * (14 + rng() * 12) * difficulty.windForce
    windTimer = ((6 + rng() * 8) / Math.sqrt(difficulty.hazardScale)) * (activeTwist?.windMul ?? 1)
    windBanner.classList.remove('hidden')
    audio.windGust()
    if (settings.haptics) Haptic.wind()
    runStats.winds++
  } else if (runKind === 'coop' && windTimer <= 0) {
    windTimer = 12
    // rare ambient gust even in coop
    if (rng() < 0.25) {
      windActive = 1
      windForce = (rng() < 0.5 ? -1 : 1) * 8
      windBanner.classList.remove('hidden')
    }
  }

  const ufx = getUpgradeEffects()

  // Physics toys modifiers
  let sinkMul = ufx.sinkMul
  let accelMul = ufx.accelMul
  if (activePower?.kind === 'tear') {
    velX += tearSide * 14 * dt
    accelMul *= 0.85
  }
  if (activePower?.kind === 'clip') {
    sinkMul *= 1.65
    velX *= Math.pow(0.03, dt) // more stable
    accelMul *= 0.75
  }
  // Rubber-band slingshot: hold Space to charge, release to launch
  if (activePower?.kind === 'sling') {
    if (keys.has('Space')) {
      slingHold = Math.min(1, slingHold + dt * 0.85)
      powerLabel.textContent = `🪢 Charge ${Math.floor(slingHold * 100)}%`
      powerFill.style.width = `${slingHold * 100}%`
    } else if (slingHold > 0.12) {
      const power = slingHold
      velY += 18 * power
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

  if (mouseMode) {
    // Dead-accurate aim: plane sits on cursor ray hit with near-instant follow
    const sens = THREE.MathUtils.clamp(Number(settings.mouseSensitivity) || 1, 0.5, 2.2)
    // follow rate: locked-on ≈ 1.0 each frame
    const follow = Math.min(1, dt * (22 * sens))
    const prevX = planeX
    const prevY = planeY
    planeX = THREE.MathUtils.lerp(planeX, mouseTarget.x, follow)
    planeY = THREE.MathUtils.lerp(planeY, mouseTarget.y, follow)
    // If very close, snap for pixel-perfect feel
    if (Math.hypot(mouseTarget.x - planeX, mouseTarget.y - planeY) < 0.08 * sens) {
      planeX = mouseTarget.x
      planeY = mouseTarget.y
    }
    const invDt = 1 / Math.max(dt, 0.001)
    velX = THREE.MathUtils.clamp((planeX - prevX) * invDt, -MAX_VEL, MAX_VEL)
    velY = THREE.MathUtils.clamp((planeY - prevY) * invDt, -MAX_VEL, MAX_VEL)
  } else {
    velX += inputX * 42 * accelMul * dt
    velY += inputY * 42 * accelMul * dt
    velY -= difficulty.sink * sinkMul * dt
    const dragX = activePower?.kind === 'boost' ? 0.12 : 0.06
    const dragY = activePower?.kind === 'boost' ? 0.15 : 0.1
    velX *= Math.pow(dragX, dt)
    velY *= Math.pow(dragY, dt)
    velX = THREE.MathUtils.clamp(velX, -MAX_VEL, MAX_VEL)
    velY = THREE.MathUtils.clamp(velY, -MAX_VEL, MAX_VEL)
    planeX += velX * dt
    planeY += velY * dt
  }

  // Soft walls — bounce instead of hard clamp stick
  if (planeX < -MAX_X) {
    planeX = -MAX_X
    velX = Math.abs(velX) * 0.35
    mouseTarget.x = Math.max(mouseTarget.x, -MAX_X)
  } else if (planeX > MAX_X) {
    planeX = MAX_X
    velX = -Math.abs(velX) * 0.35
    mouseTarget.x = Math.min(mouseTarget.x, MAX_X)
  }
  if (planeY < MIN_Y) {
    planeY = MIN_Y
    // soft floor — only crash if diving hard
    if (velY < -14 && !isLaunchGraceActive(elapsed, launchGraceSeconds)) {
      die('Nosed into the paper ground')
      return
    }
    velY = Math.max(0, -velY * 0.25)
    mouseTarget.y = Math.max(mouseTarget.y, MIN_Y)
  } else if (planeY > MAX_Y) {
    planeY = MAX_Y
    velY = -Math.abs(velY) * 0.3
    mouseTarget.y = Math.min(mouseTarget.y, MAX_Y)
  }

  let speedMul = ufx.speedMul
  if (activePower?.kind === 'slow') speedMul *= 0.55
  if (activePower?.kind === 'boost') speedMul *= 1.22
  if (activeTwist?.speedMul) speedMul *= activeTwist.speedMul
  const cfg = difficulty
  const cruise =
    (cfg.speedBase + Math.min(cfg.speedCap - cfg.speedBase, distance * cfg.speedRamp)) * speedMul
  speed = cruise + speedBoost
  if (speedFxEl) {
    const over = speed - cfg.speedBase
    const range = Math.max(1, cfg.speedCap - cfg.speedBase + 24)
    speedFxEl.style.opacity = String(THREE.MathUtils.clamp(over / range, 0, 0.55))
  }
  const move = speed * dt
  const scoreFactor =
    cfg.scoreMul * ufx.scoreMul *
    (activePower?.kind === 'boost' ? 1.25 : activePower?.kind === 'slow' ? 0.85 : 1) *
    (1 + combo * 0.02) *
    (1 + Math.min(0.35, speedBoost * 0.01)) *
    (feverActive ? FEVER_SCORE_MUL : 1)
  distance += move * scoreFactor

  // Sparkle trail from upgrades
  const trail = scene.getObjectByName('upgradeTrail')
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

  // Ambient wisp trail — subtle always-on speed cue, skipped in low-power mode
  const wisp = scene.getObjectByName('ambientWisp')
  if (wisp && !settings.lowPower && speed > cfg.speedBase * 1.15) {
    wisp.visible = true
    for (let i = WISP_N - 1; i > 0; i--) wispPts[i].copy(wispPts[i - 1])
    wispPts[0].set(planeX + (Math.random() - 0.5) * 0.5, planeY - 0.15 + (Math.random() - 0.5) * 0.2, -0.8 - Math.random() * 0.6)
    const wpos = wisp.geometry.attributes.position
    for (let i = 0; i < WISP_N; i++) wpos.setXYZ(i, wispPts[i].x, wispPts[i].y, wispPts[i].z)
    wpos.needsUpdate = true
    wisp.material.opacity = THREE.MathUtils.clamp((speed - cfg.speedBase * 1.15) / 30, 0, 0.3)
  } else if (wisp) wisp.visible = false

  // Funnel milestones
  for (const m of [50, 100, 200, 500, 1000]) {
    if (distance >= m && !distanceMilestones.has(m)) {
      distanceMilestones.add(m)
      track(`distance_${m}`, { mode: difficulty.id, kind: runKind })
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
  const bx = THREE.MathUtils.clamp(velX, -24, 24)
  const by = THREE.MathUtils.clamp(velY, -24, 24)
  const aimOffX = mouseMode ? THREE.MathUtils.clamp(mouseTarget.x - planeX, -2, 2) * 0.12 : 0
  pitch = THREE.MathUtils.lerp(pitch, -by * 0.022, 1 - Math.pow(0.0006, dt))
  roll = THREE.MathUtils.lerp(roll, bx * 0.028 + aimOffX, 1 - Math.pow(0.0006, dt))
  if (activePower?.kind === 'boost') pitch = THREE.MathUtils.lerp(pitch, -0.1, 0.12)
  plane.rotation.x = THREE.MathUtils.clamp(pitch, -0.5, 0.45)
  plane.rotation.z = THREE.MathUtils.clamp(roll, -0.75, 0.75)
  plane.rotation.y = THREE.MathUtils.clamp(bx * 0.012, -0.28, 0.28)

  // Invuln blink
  if (invuln > 0) {
    plane.visible = Math.sin(elapsed * 28) > -0.2
  } else {
    plane.visible = true
  }

  // Ghost
  if (ghostRecorder) ghostRecorder.push(distance, planeX, planeY, elapsed)
  if (ghostMesh && ghostData) {
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
  const z = zoneAt(distance)
  if (z.id !== currentZoneId) applyZone(z, true)
  const zp = zoneProgress(distance)
  if (zp.next && zp.t > 0.92 && zp.t < 0.97) {
    // gentle pre-transition fog lean
    scene.fog.color.lerp(new THREE.Color(zp.next.fog), dt * 0.4)
  }
  if (nextZoneHud) {
    const showHint = zp.next && zp.t > 0.7
    nextZoneHud.classList.toggle('hidden', !showHint)
    if (showHint) hudNextZoneEl.textContent = `${zp.next.name} · ${Math.max(0, Math.ceil(zp.next.from - distance))}m`
  }
  updateEdgeIndicators()
  checkHazardTelegraph()
  updateWeatherFx(dt)
  checkTutorialHints(dt)

  // Camera: pull back slightly during boost
  const camZ = activePower?.kind === 'boost' || speedBoost > 10 ? -13 : -11
  const camY = planeY + 3.1 + (activePower?.kind === 'boost' ? 0.4 : 0)
  camera.position.lerp(new THREE.Vector3(planeX * 0.45, camY, camZ), 1 - Math.pow(0.0005, dt))
  camera.lookAt(planeX * 0.2, planeY + 0.3, 16)
  if (shake > 0) {
    shake = Math.max(0, shake - dt * 1.2)
    camera.position.x += (Math.random() - 0.5) * shake * 0.45
    camera.position.y += (Math.random() - 0.5) * shake * 0.25
  }
  audio.setFlightWind(Math.min(1, speed / 70))

  scrollWorld(move)
  animateHazards(dt)

  if (runKind !== 'tutorial' && runKind !== 'layout') {
    while (nextSpawnZ < 220) {
      spawnChunk(nextSpawnZ)
      nextSpawnZ += (15 + rng() * 12) * difficulty.gap
    }
  }

  const p = plane.position
  const magnetOn = activePower?.kind === 'magnet' || ufx.magnetBonus > 0
  const magnetPull = (activePower?.kind === 'magnet' ? 1.2 : 0) + ufx.magnetBonus
  // Forgiving hitbox while boosting — the world scrolls faster, so shrink
  // the effective hit radius to compensate for the reduced reaction time.
  // Turbo Fold levels make this even safer.
  const hitScale = activePower?.kind === 'boost' ? Math.max(0.6, 0.78 - ufx.boostSafety * 0.06) : 1
  // Phase power: pass through airborne hazards (birds/scissors/boss) but
  // buildings and the ground are checked separately and still solid — this
  // is a "dodge the sky" power, not a full no-clip.
  const canCollide =
    invuln <= 0 &&
    activePower?.kind !== 'phase' &&
    !isLaunchGraceActive(elapsed, launchGraceSeconds)
  let ringsLeft = 0

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
      if (d2near < 12 * 12) {
        const pull = (magnetOn ? 14 + magnetPull * 12 : 5)
        m.position.x += (p.x - m.position.x) * Math.min(1, pull * dt * 0.14)
        m.position.y += (p.y - m.position.y) * Math.min(1, pull * dt * 0.14)
        m.position.z += (p.z - m.position.z) * Math.min(1, pull * dt * 0.09)
      }
      const dx = m.position.x - p.x
      const dy = m.position.y - p.y
      const dz = m.position.z - p.z
      const catchR = e.radius + PLANE_RADIUS + magnetPull + 0.35
      if (dx * dx + dy * dy + dz * dz < catchR ** 2) {
        stars++
        runStats.stars = stars
        starsEl.textContent = String(stars)
        distance += 18
        audio.collectStar()
        if (settings.haptics) Haptic.collect()
        spawnConfetti(m.position.x, m.position.y, m.position.z)
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
      const catchR = (e.radius || 1.35) + PLANE_RADIUS * 1.25
      if (dx * dx + dy * dy + dz * dz < catchR ** 2) {
        activatePower(e.kind)
        spawnConfetti(m.position.x, m.position.y, m.position.z)
        scene.remove(m)
        entities.splice(i, 1)
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
        const inGap = Math.abs(p.y - gapY) < 2.5 && Math.abs(p.x) < 2.6
        if (!inGap && Math.abs(dz) < 1.8) {
          die(m.userData.kind === 'wind' ? 'Blown into the wind turbines!' : 'Snipped by the boss scissors!')
          return
        }
        if (dz < -1.2 && inGap) {
          // Successfully threaded — reward once
          if (!e.cleared) {
            e.cleared = true
            bossActive = false
            track('boss_clear', { distance: Math.floor(distance) })
            stars += 5
            starsEl.textContent = String(stars)
            audio.missionComplete()
            if (settings.haptics) Haptic.collect()
            invuln = Math.max(invuln, 0.4)
            spawnConfetti(planeX, planeY, 2)
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
      const hitR = (e.radius + PLANE_RADIUS * 0.5) * hitScale
      const grazeR = e.radius + PLANE_RADIUS * (1.4 + ufx.nearMissBonus)
      const hitsBuilding = dx < hitR && dz < hitR && p.y < e.halfH + 0.25 && p.y > -0.5
      if (hitsBuilding) {
        die('Hit a paper skyscraper')
        return
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
      continue
    }

    if (e.type === 'bird' || e.type === 'scissors') {
      const dx = m.position.x - p.x
      const dy = m.position.y - p.y
      const dz = m.position.z - p.z
      const dist2 = dx * dx + dy * dy + dz * dz
      const hit = ((e.radius || 0.7) + PLANE_RADIUS * 0.85) * hitScale
      if (dist2 < hit ** 2) {
        const label =
          e.type === 'scissors'
            ? 'Snipped by scissors'
            : `Tangled with ${e.label || 'paper birds'}`
        die(label)
        return
      }
      if (dist2 < (hit * 1.9) ** 2 && m.position.z > -1 && m.position.z < 7) {
        const last = nearMissCooldown.get(m) || 0
        if (elapsed - last > 1.0) {
          nearMissCooldown.set(m, elapsed)
          registerNearMiss(e.type === 'scissors' ? 'scissors' : e.flyerId)
        }
      }
    }
  }

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
const clock = new THREE.Clock()
function frame() {
  try {
    update(Math.min(clock.getDelta(), 0.05))
  } catch (err) {
    console.error('update error', err)
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
  showMenu()
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
    challengeToast.textContent = `✦ ${season.name} event — free seasonal skins!`
    challengeToast.classList.remove('hidden')
    setTimeout(() => challengeToast.classList.add('hidden'), 5000)
  }
  if (settings.arDesk) {
    deskAR.start().then((ok) => {
      if (ok) applyPerformanceSettings()
    })
  }
  if (settings.reducedMotion) {
    scene.fog.far = 200
  }
  refreshMissionBadge()
} catch (err) {
  console.error('boot error', err)
  state = 'menu'
  menuEl?.classList.remove('hidden')
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
