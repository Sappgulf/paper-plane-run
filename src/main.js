import './style.css'
import * as THREE from 'three'
import { GameAudio } from './audio.js'
import { Haptic } from './haptics.js'
import { dailyKey, dailySeed, mulberry32 } from './rng.js'
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
} from './ghost.js'
import { zoneAt, nextZone } from './zones.js'
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
// createPool available for future mesh reuse; low-power path already cuts DPR/shadows

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id)
const canvas = $('c')
const menuEl = $('menu')
const gameoverEl = $('gameover')
const hudEl = $('hud')
const windBanner = $('wind-banner')
const powerBanner = $('power-banner')
const zoneBanner = $('zone-banner')
const comboFloat = $('combo-float')
const powerHud = $('power-hud')
const powerLabel = $('power-label')
const powerFill = $('power-fill')
const comboHud = $('combo-hud')
const comboVal = $('combo-val')
const distanceEl = $('distance')
const bestEl = $('best')
const starsEl = $('stars')
const hudModeEl = $('hud-mode')
const hudZoneEl = $('hud-zone')
const finalScoreEl = $('final-score')
const finalDetailEl = $('final-detail')
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
const missionBadge = $('mission-badge')

const audio = new GameAudio()
muteBtn.textContent = audio.muted ? '🔇' : '🔊'
pilotNameInput.value = localStorage.getItem('paper-plane-run-name') || ''
pilotNameInput.addEventListener('change', () => {
  localStorage.setItem('paper-plane-run-name', pilotNameInput.value.slice(0, 16))
})

// Settings / season / AR / analytics
let settings = loadSettings()
applyDocumentA11y(settings)
const deskAR = new DeskAR()
let season = seasonInfo(settings.forceSeason)
track('session_start', { season: season.id, dpr: devicePixelRatio })

// Distance milestones for funnel
const distanceMilestones = new Set()
let nextBossAt = 500
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
bestEl.textContent = `${Math.floor(bestDistance)}m`
hudModeEl.textContent = difficulty.label
diffBlurb.textContent = difficulty.blurb
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
  bestEl.textContent = `${Math.floor(bestDistance)}m`
  hudModeEl.textContent = difficulty.label
  diffBlurb.textContent = difficulty.blurb
  document.querySelectorAll('.diff-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.diff === id),
  )
  updateDailyHint()
}

function updateDailyHint() {
  dailyHint.textContent = `📅 Daily ${dailyKey()} · seed race on ${difficulty.label}`
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
let deferredInstall = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredInstall = e
  installBtn.classList.remove('hidden')
})
installBtn.addEventListener('click', async (e) => {
  e.stopPropagation()
  if (!deferredInstall) {
    alert('Install: browser menu → Install / Add to Home Screen')
    return
  }
  deferredInstall.prompt()
  await deferredInstall.userChoice
  deferredInstall = null
  installBtn.classList.add('hidden')
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
const paperTex = loadTex('/assets/paper.jpg')
const buildingTex = loadTex('/assets/buildings.jpg')
const skyTex = loadTex('/assets/sky.jpg')

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(300, 32, 16),
  new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false }),
)
sky.name = 'sky'
scene.add(sky)

const groundMap = paperTex.clone()
groundMap.wrapS = groundMap.wrapT = THREE.RepeatWrapping
groundMap.repeat.set(4, 30)
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(90, 700),
  new THREE.MeshStandardMaterial({ map: groundMap, color: 0xf2e6d8, roughness: 0.95 }),
)
ground.rotation.x = -Math.PI / 2
ground.position.set(0, 0, 120)
ground.receiveShadow = true
scene.add(ground)

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
  color: season.birdColor, roughness: 0.75, side: THREE.DoubleSide,
})
const scissorsMat = new THREE.MeshStandardMaterial({ color: 0xc0c8d0, metalness: 0.55, roughness: 0.35 })
const scissorsHandleMat = new THREE.MeshStandardMaterial({ color: 0xe06b4a, roughness: 0.55 })
const starMat = new THREE.MeshStandardMaterial({
  color: season.starColor, emissive: season.starEmissive, emissiveIntensity: 0.4, roughness: 0.4,
})

function applySeasonVisuals() {
  season = seasonInfo(settings.forceSeason)
  birdMat.color.setHex(season.birdColor)
  starMat.color.setHex(season.starColor)
  starMat.emissive.setHex(season.starEmissive)
  if (season.fogBoost != null && scene.fog) {
    // blend toward seasonal fog
    scene.fog.color.lerp(new THREE.Color(season.fogBoost), 0.35)
  }
  refreshUnlocks(season.id)
}
const cloudMat = new THREE.MeshStandardMaterial({ color: 0xfffaf5, roughness: 1, transparent: true, opacity: 0.9 })
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
  }
}
let POWER_META = buildPowerMeta()
let POWER_KINDS = Object.keys(POWER_META)
const TOY_KINDS = ['tear', 'clip', 'sling']

function rebuildPowerPalette() {
  POWER_META = buildPowerMeta()
  POWER_KINDS = Object.keys(POWER_META)
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
  const wingL = new THREE.Mesh(new THREE.ShapeGeometry(leftShape), matBody)
  wingL.rotation.x = -Math.PI / 2
  wingL.castShadow = true
  wingL.name = 'wingL'
  const wingR = new THREE.Mesh(new THREE.ShapeGeometry(rightShape), matBody)
  wingR.rotation.x = -Math.PI / 2
  wingR.castShadow = true
  wingR.name = 'wingR'
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

function createBossGate() {
  const g = new THREE.Group()
  // Two giant scissor blades forming a closing gate with a moving gap
  const bladeGeo = new THREE.BoxGeometry(0.4, 0.15, 8)
  const left = new THREE.Mesh(bladeGeo, scissorsMat)
  left.position.set(-3.5, 10, 0)
  left.rotation.z = 0.35
  const right = new THREE.Mesh(bladeGeo, scissorsMat)
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
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.8, 0.1, 8, 20),
      new THREE.MeshStandardMaterial({
        color: 0xfb7185, emissive: 0xe11d48, emissiveIntensity: 0.4, side: THREE.DoubleSide,
      }),
    )
    ring.rotation.y = Math.PI / 2
    ring.position.set(0, 6 + i * 4, 0)
    ring.name = 'safeRing'
    g.add(ring)
  }
  g.add(left, right)
  g.userData.left = left
  g.userData.right = right
  g.userData.phase = 0
  g.userData.gapY = 10
  return g
}

function createBuilding(w, h, d, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.position.y = h / 2
  const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.06, 0.16, d * 1.06), planeAccentMat)
  roof.position.y = h / 2 + 0.08
  mesh.add(roof)
  return mesh
}

function createBird() {
  const g = new THREE.Group()
  // Seasonal silhouette: halloween bats use inverted V wings
  if (season.id === 'halloween') {
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
  } else if (season.id === 'winter') {
    // snowflake-ish
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), birdMat)
    g.add(core)
  } else if (season.id === 'valentine') {
    // simple heart proxy: two spheres + cone
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), birdMat)
    a.position.set(-0.12, 0.05, 0)
    const b = a.clone()
    b.position.x = 0.12
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.35, 4), birdMat)
    tip.rotation.x = Math.PI
    tip.position.y = -0.15
    g.add(a, b, tip)
  } else {
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 4), birdMat)
    body.rotation.x = Math.PI / 2
    g.add(body)
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.22), birdMat)
    left.position.set(-0.3, 0.05, 0)
    g.add(left)
    const right = left.clone()
    right.position.x = 0.3
    g.add(right)
    g.userData.wingL = left
    g.userData.wingR = right
  }
  g.userData.phase = rng() * Math.PI * 2
  return g
}

function createScissors() {
  const g = new THREE.Group()
  const bladeGeo = new THREE.BoxGeometry(0.18, 0.06, 2.2)
  const b1 = new THREE.Mesh(bladeGeo, scissorsMat)
  b1.position.set(0.12, 0, 0)
  const b2 = new THREE.Mesh(bladeGeo, scissorsMat)
  b2.position.set(-0.12, 0, 0)
  g.add(b1, b2)
  const h1 = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 8, 16), scissorsHandleMat)
  h1.position.set(0.35, 0, -1.35)
  h1.rotation.y = Math.PI / 2
  const h2 = h1.clone()
  h2.position.x = -0.35
  g.add(h1, h2)
  g.userData.blade1 = b1
  g.userData.blade2 = b2
  g.scale.setScalar(1.45)
  return g
}

function createStar() {
  return new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), starMat)
}

function createPowerUp(kind) {
  const meta = POWER_META[kind]
  const g = new THREE.Group()
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.55, 0),
    new THREE.MeshStandardMaterial({
      color: meta.color, emissive: meta.color, emissiveIntensity: 0.45, roughness: 0.35,
    }),
  )
  g.add(core)
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.06, 8, 24),
    new THREE.MeshStandardMaterial({ color: meta.color, emissive: meta.color, emissiveIntensity: 0.3 }),
  )
  ring.rotation.x = Math.PI / 2
  g.add(ring)
  g.userData.kind = kind
  g.userData.ring = ring
  return g
}

function createCloud() {
  const g = new THREE.Group()
  for (const [x, y, z, s] of [[0, 0, 0, 1.4], [1.1, 0.15, 0.2, 1], [-1, 0.1, -0.15, 1.1]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 10), cloudMat)
    m.position.set(x, y, z)
    g.add(m)
  }
  return g
}

function createRing() {
  const m = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.12, 8, 24), ringMat)
  m.rotation.y = Math.PI / 2
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
let nextSpawnZ = 40
let shake = 0
let elapsed = 0
let activePower = null
let bannerTimer = 0
let zoneBannerTimer = 0
/** @type {any[]} */
const entities = []
const clouds = []
const PLANE_RADIUS = 0.7
const MIN_Y = 1.2
const MAX_Y = 28
const MAX_X = 14

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
      const bird = createBird()
      bird.position.set((rng() - 0.5) * 12 * cfg.gap, 3.5 + rng() * 18, z + i * 2.5)
      bird.rotation.y = Math.PI
      scene.add(bird)
      entities.push({ mesh: bird, type: 'bird', radius: 0.7 })
    }
  } else if (ht === 'scissors') {
    const sc = createScissors()
    sc.position.set((rng() - 0.5) * 9 * cfg.gap, 4 + rng() * 16, z)
    scene.add(sc)
    entities.push({ mesh: sc, type: 'scissors', radius: 1.6 })
  }

  if (rng() < cfg.starChance) {
    const st = createStar()
    st.position.set((rng() - 0.5) * 11, 3 + rng() * 17, z + rng() * 5)
    scene.add(st)
    entities.push({ mesh: st, type: 'star', radius: 0.75 })
  }
  if (rng() < cfg.powerChance + ramp * 0.04) {
    // Mix classic powers + paper physics toys
    const pool = rng() < 0.35 ? TOY_KINDS : POWER_KINDS.filter((k) => !TOY_KINDS.includes(k))
    const kind = pool[(rng() * pool.length) | 0]
    const pu = createPowerUp(kind)
    pu.position.set((rng() - 0.5) * 10, 5 + rng() * 14, z + 2)
    scene.add(pu)
    entities.push({ mesh: pu, type: 'power', radius: 1, kind })
  }
}

function spawnBoss(z = 70) {
  const gate = createBossGate()
  gate.position.set(0, 0, z)
  scene.add(gate)
  entities.push({
    mesh: gate,
    type: 'boss',
    radius: 4,
    halfH: 20,
    isBoss: true,
  })
  bossActive = true
  zoneBanner.textContent = '✂️ BOSS · Giant Scissors Gate!'
  zoneBanner.classList.remove('hidden')
  zoneBannerTimer = 3
  track('boss_start', { distance: Math.floor(distance) })
  audio.windGust()
  Haptic.power()
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
  activePower = { kind, timeLeft: meta.duration, duration: meta.duration, slingCharged: false }
  audio.powerUp(kind)
  Haptic.power()
  powerLabel.textContent = meta.label
  powerFill.style.width = '100%'
  powerHud.classList.remove('hidden')
  powerBanner.textContent = meta.banner
  powerBanner.classList.remove('hidden')
  bannerTimer = 2
  runStats.powers++
  track('power_pickup', { kind })
  if (kind === 'shield' && shieldBubble) {
    shieldBubble.visible = true
    shieldBubble.material.color.setHex(meta.color)
  } else if (shieldBubble) shieldBubble.visible = false

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
}

function applyZone(z, announce) {
  scene.fog.color.setHex(z.fog)
  hemi.color.setHex(z.hemiSky)
  hemi.groundColor.setHex(z.hemiGround)
  if (!activePower || activePower.kind !== 'slow') {
    renderer.toneMappingExposure = z.exposure
  }
  hudZoneEl.textContent = z.name
  if (announce && z.id !== currentZoneId) {
    zoneBanner.textContent = `✦ ${z.name}`
    zoneBanner.classList.remove('hidden')
    zoneBannerTimer = 2.5
  }
  currentZoneId = z.id
}

function resetGame() {
  clearEntities()
  clearPower()
  distance = 0
  stars = 0
  speed = difficulty.speedBase
  planeY = 8
  planeX = 0
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
  combo = 0
  maxCombo = 0
  comboTimer = 0
  runStats = { stars: 0, powers: 0, winds: 0, maxCombo: 0 }
  nextBossAt = 500
  bossActive = false
  distanceMilestones.clear()
  comboHud.classList.add('hidden')
  applySeasonVisuals()
  applySkin(getEquippedSkinId())

  // RNG
  if (runKind === 'daily') {
    rng = mulberry32(dailySeed(difficulty.id))
  } else if (runKind === 'layout') {
    rng = Math.random
  } else {
    rng = Math.random
  }

  plane.position.set(0, planeY, 0)
  plane.rotation.set(0, 0, 0)
  camera.position.set(0, planeY + 4, -10)
  camera.lookAt(0, planeY, 12)
  ground.position.z = 120
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
function setStickFromEvent(cx, cy) {
  const rect = stickBase.getBoundingClientRect()
  const ox = rect.left + rect.width / 2
  const oy = rect.top + rect.height / 2
  let dx = cx - ox
  let dy = cy - oy
  const len = Math.hypot(dx, dy) || 1
  const c = Math.min(len, STICK_MAX)
  dx = (dx / len) * c
  dy = (dy / len) * c
  stick.x = dx / STICK_MAX
  stick.y = -dy / STICK_MAX
  stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
}
function resetStick() {
  stick.x = stick.y = 0
  stick.active = false
  stick.pointerId = null
  stickKnob.style.transform = 'translate(-50%, -50%)'
}
function showStick(v) {
  const windZone = $('wind-stick-zone')
  const root = $('game-root')
  if (v) {
    stickZone.classList.remove('hidden')
    if (runKind === 'coop' && windZone) {
      windZone.classList.remove('hidden')
      root?.classList.add('coop-mode')
    } else {
      windZone?.classList.add('hidden')
      root?.classList.remove('coop-mode')
    }
  } else {
    stickZone.classList.add('hidden')
    windZone?.classList.add('hidden')
    root?.classList.remove('coop-mode')
    resetStick()
    windStick.x = windStick.y = 0
    windStick.active = false
  }
}

// Wind stick (co-op P2)
const windBase = () => $('wind-stick-base')
const windKnob = () => $('wind-stick-knob')
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
  const base = windBase()
  if (!base || base.dataset.bound) return
  base.dataset.bound = '1'
  base.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    e.stopPropagation()
    windStick.active = true
    windStick.pointerId = e.pointerId
    base.setPointerCapture(e.pointerId)
    setWindStick(e.clientX, e.clientY)
  })
  base.addEventListener('pointermove', (e) => {
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
  }
  base.addEventListener('pointerup', end)
  base.addEventListener('pointercancel', end)
}
bindWindStick()
stickBase.addEventListener('pointerdown', (e) => {
  e.preventDefault()
  e.stopPropagation()
  stick.active = true
  stick.pointerId = e.pointerId
  stickBase.setPointerCapture(e.pointerId)
  setStickFromEvent(e.clientX, e.clientY)
})
stickBase.addEventListener('pointermove', (e) => {
  if (!stick.active || e.pointerId !== stick.pointerId) return
  setStickFromEvent(e.clientX, e.clientY)
})
const endStick = (e) => {
  if (e.pointerId === stick.pointerId) resetStick()
}
stickBase.addEventListener('pointerup', endStick)
stickBase.addEventListener('pointercancel', endStick)

// Input
window.addEventListener('keydown', (e) => {
  keys.add(e.code)
  if (e.code === 'Space') {
    e.preventDefault()
    if (state === 'menu' || state === 'dead') startGame(runKind === 'layout' ? 'layout' : 'classic')
  }
  if (e.code === 'KeyM') {
    muteBtn.textContent = audio.toggleMute() ? '🔇' : '🔊'
  }
})
window.addEventListener('keyup', (e) => keys.delete(e.code))
window.addEventListener('pointermove', (e) => {
  if (stick.active) return
  mouse.nx = (e.clientX / innerWidth) * 2 - 1
  mouse.ny = -((e.clientY / innerHeight) * 2 - 1)
})
muteBtn.addEventListener('click', async (e) => {
  e.stopPropagation()
  await audio.unlock()
  muteBtn.textContent = audio.toggleMute() ? '🔇' : '🔊'
})

// ---------------------------------------------------------------------------
// UI panels
// ---------------------------------------------------------------------------
function hideAllPanels() {
  for (const id of [
    'menu', 'gameover', 'missions-panel', 'skins-panel', 'board-panel',
    'editor-panel', 'hotseat-intermission', 'settings-panel', 'stats-panel',
  ]) {
    $(id)?.classList.add('hidden')
  }
}

function showMenu() {
  state = 'menu'
  hideAllPanels()
  menuEl.classList.remove('hidden')
  hudEl.classList.add('hidden')
  showStick(false)
  refreshMissionBadge()
}

function refreshMissionBadge() {
  const n = unclaimedRewards()
  if (n > 0) {
    missionBadge.classList.remove('hidden')
    missionBadge.textContent = String(n)
  } else missionBadge.classList.add('hidden')
}

function renderMissions() {
  const list = $('missions-list')
  list.innerHTML = ''
  for (const m of getDailyMissions()) {
    const li = document.createElement('li')
    li.className = m.done ? 'done' : ''
    const left = document.createElement('span')
    left.textContent = `${m.done ? '✓ ' : ''}${m.label} (${Math.min(m.progress, m.target)}/${m.target})`
    li.appendChild(left)
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
      sp.textContent = 'Claimed'
      li.appendChild(sp)
    }
    list.appendChild(li)
  }
}

function renderSkins() {
  refreshUnlocks(season.id)
  $('lifetime-stars').textContent = String(getLifetimeStars())
  const grid = $('skins-grid')
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

function renderSettings() {
  const s = settings
  const bind = (id, key) => {
    const el = $(id)
    if (!el) return
    if (el.type === 'checkbox') {
      el.checked = !!s[key]
      el.onchange = () => {
        settings = saveSettings({ [key]: el.checked })
        applyDocumentA11y(settings)
        applyPerformanceSettings()
        rebuildPowerPalette()
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
      }
    } else {
      el.value = s[key]
      el.onchange = () => {
        settings = saveSettings({ [key]: el.value })
        applySeasonVisuals()
        applyDocumentA11y(settings)
      }
    }
  }
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
  for (const r of rows) {
    const li = document.createElement('li')
    li.innerHTML = `<span>${r.name || 'Pilot'} · ${r.mode || ''}</span><span>${r.distance}m · ${r.stars || 0}★</span>`
    list.appendChild(li)
  }
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
$('start-btn').onclick = () => startGame('classic')
$('daily-btn').onclick = () => startGame('daily')
$('tutorial-btn').onclick = () => startGame('tutorial')
$('hotseat-btn').onclick = () => {
  hotseat = { players: 2, turn: 0, scores: [0, 0], active: true }
  startGame('hotseat')
}
$('missions-btn').onclick = () => {
  hideAllPanels()
  renderMissions()
  $('missions-panel').classList.remove('hidden')
}
$('skins-btn').onclick = () => {
  hideAllPanels()
  renderSkins()
  $('skins-panel').classList.remove('hidden')
}
$('board-btn').onclick = () => {
  hideAllPanels()
  renderBoard('local')
  $('board-panel').classList.remove('hidden')
}
$('editor-btn').onclick = () => {
  hideAllPanels()
  setupEditor()
  $('editor-panel').classList.remove('hidden')
}
$('coop-btn')?.addEventListener('click', () => startGame('coop'))
$('settings-btn')?.addEventListener('click', () => {
  hideAllPanels()
  renderSettings()
  $('settings-panel')?.classList.remove('hidden')
})
$('stats-btn')?.addEventListener('click', () => {
  hideAllPanels()
  renderStats()
  $('stats-panel')?.classList.remove('hidden')
})
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

$('retry-btn').onclick = () => startGame(runKind)
$('menu-btn').onclick = () => {
  hotseat.active = false
  showMenu()
}
$('share-btn').onclick = () => shareScore()
$('photo-save').onclick = () => {
  if (!lastPhotoDataUrl) return
  const a = document.createElement('a')
  a.href = lastPhotoDataUrl
  a.download = `paper-plane-${Math.floor(lastRun.d)}m.png`
  a.click()
}
$('photo-share').onclick = async () => {
  if (!lastPhotoDataUrl) return
  try {
    const blob = await (await fetch(lastPhotoDataUrl)).blob()
    const file = new File([blob], 'paper-plane.png', { type: 'image/png' })
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Paper Plane Run', text: shareText() })
    } else {
      await navigator.clipboard.writeText(shareText() + '\n' + buildShareUrl())
      shareStatus.textContent = 'Link copied (photo save available)'
    }
  } catch {
    shareStatus.textContent = 'Share cancelled'
  }
}
$('hotseat-go').onclick = () => {
  hotseatInter.classList.add('hidden')
  startGame('hotseat', { continueHotseat: true })
}

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
  if (settings.arDesk && !deskAR.active) {
    await deskAR.start()
    applyPerformanceSettings()
  }
  hideAllPanels()
  resetGame()
  state = 'playing'
  hudEl.classList.remove('hidden')
  showStick(true)
  if (hotseat.active) {
    hotseatHud.classList.remove('hidden')
    hotseatPlayerEl.textContent = String(hotseat.turn + 1)
  } else hotseatHud.classList.add('hidden')
  const coopHud = $('coop-hud')
  if (coopHud) coopHud.classList.toggle('hidden', kind !== 'coop')
  audio.startFlight()
  if (settings.haptics) Haptic.tap()
  track('game_start', { kind, mode: difficulty.id, season: season.id })
}

function capturePhoto() {
  try {
    lastPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.85)
    photoImg.src = lastPhotoDataUrl
    photoCaption.textContent = `${Math.floor(distance)}m · ${stars}★ · ${difficulty.label}`
    photoWrap.classList.remove('hidden')
  } catch {
    photoWrap.classList.add('hidden')
  }
}

function die(reason) {
  if (state !== 'playing') return
  if (activePower?.kind === 'shield' && reason !== 'Nosed into the paper ground' && reason !== 'Tutorial complete!') {
    audio.shieldHit()
    Haptic.nearMiss()
    clearPower()
    shake = 0.4
    velY += 8
    return
  }

  // Tutorial complete is soft win
  const isWin = reason === 'Tutorial complete!'
  state = 'dead'
  shake = 0.85
  if (!isWin) {
    audio.crash()
    if (settings.haptics) Haptic.crash()
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
  showStick(false)
  clearPower()
  capturePhoto()

  const d = Math.floor(distance)
  lastRun = {
    d, s: stars, m: difficulty.id, daily: runKind === 'daily',
  }

  if (!isWin && d > bestDistance && runKind !== 'tutorial' && runKind !== 'layout') {
    bestDistance = d
    saveBest(difficulty.id, d)
  }
  bestEl.textContent = `${Math.floor(bestDistance)}m`

  // Ghost save
  if (ghostRecorder && runKind !== 'tutorial' && !isWin) {
    const key = difficulty.id + (runKind === 'daily' ? '-daily' : '')
    saveGhostIfBest(key, d, ghostRecorder.toJSON(), stars)
  }

  // Lifetime stars + missions
  if (stars > 0) addLifetimeStars(stars)
  refreshUnlocks()
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

  // Leaderboards
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

  // Hotseat
  if (hotseat.active && runKind === 'hotseat') {
    hotseat.scores[hotseat.turn] = d
    if (hotseat.turn < hotseat.players - 1) {
      hotseat.turn++
      gameoverEl.classList.add('hidden')
      hudEl.classList.add('hidden')
      hotseatTitle.textContent = `Player ${hotseat.turn + 1}'s turn`
      hotseatScores.textContent = hotseat.scores.map((s, i) => `P${i + 1}: ${s}m`).join(' · ')
      hotseatInter.classList.remove('hidden')
      return
    }
    // final
    const winner = hotseat.scores[0] >= hotseat.scores[1] ? 1 : 2
    $('gameover-title').textContent = `Player ${winner} wins!`
    finalScoreEl.textContent = `P1 ${hotseat.scores[0]}m · P2 ${hotseat.scores[1]}m`
    finalDetailEl.textContent = reason
    hotseat.active = false
  } else {
    $('gameover-title').textContent = isWin ? 'Tutorial complete!' : 'Crashed!'
    finalScoreEl.textContent = `${d}m · ${stars}★ · ${difficulty.label}${runKind === 'daily' ? ' · Daily' : ''}`
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
      u.phase += dt * 8
      const flap = Math.sin(u.phase) * 0.45
      if (u.wingL) u.wingL.rotation.z = 0.35 + flap
      if (u.wingR) u.wingR.rotation.z = -0.35 - flap
    }
    if (e.type === 'scissors') {
      e.mesh.rotation.y += dt * 1.2
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
      // Blades sweep; safe gap oscillates
      u.gapY = 8 + Math.sin(u.phase) * 5
      if (u.left) {
        u.left.position.y = u.gapY + 3
        u.left.rotation.z = 0.25 + Math.sin(u.phase * 1.3) * 0.2
      }
      if (u.right) {
        u.right.position.y = u.gapY + 3
        u.right.rotation.z = -0.25 - Math.sin(u.phase * 1.3) * 0.2
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
    if (e.type === 'star') e.mesh.rotation.y += dt * 2.5
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

function registerNearMiss() {
  combo++
  maxCombo = Math.max(maxCombo, combo)
  runStats.maxCombo = maxCombo
  comboTimer = 1.6
  comboVal.textContent = `${combo}x`
  comboHud.classList.remove('hidden')
  comboFloat.textContent = combo >= 3 ? `${combo}x NEAR MISS!` : 'Near miss!'
  comboFloat.classList.remove('hidden')
  setTimeout(() => comboFloat.classList.add('hidden'), 500)
  audio.nearMiss(combo)
  Haptic.nearMiss()
  spawnConfetti(planeX, planeY, 2)
  distance += 5 * combo * 0.25
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
  sky.position.copy(camera.position)

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
    plane.rotation.z += dt * 3
    plane.position.y = Math.max(0.4, plane.position.y - dt * 7)
    camera.position.lerp(new THREE.Vector3(plane.position.x * 0.6, plane.position.y + 5, -9), 1 - Math.pow(0.002, dt))
    camera.lookAt(plane.position)
    if (shake > 0) {
      shake = Math.max(0, shake - dt)
      camera.position.x += (Math.random() - 0.5) * shake
    }
    scrollWorld(speed * 0.2 * dt)
    animateHazards(dt)
    return
  }

  // Playing
  if (activePower) {
    activePower.timeLeft -= dt
    powerFill.style.width = `${(100 * activePower.timeLeft) / activePower.duration}%`
    if (activePower.kind === 'shield' && shieldBubble) {
      shieldBubble.material.opacity = 0.15 + Math.sin(elapsed * 6) * 0.08
    }
    if (activePower.timeLeft <= 0) clearPower()
  }

  if (comboTimer > 0) {
    comboTimer -= dt
    if (comboTimer <= 0) {
      combo = 0
      comboHud.classList.add('hidden')
    }
  }

  let inputX = 0
  let inputY = 0
  // Co-op: P1 = arrows/stick only; P2 wind = WASD / IJKL / wind stick
  // Solo: all inputs available
  if (runKind === 'coop') {
    if (keys.has('ArrowLeft')) inputX -= 1
    if (keys.has('ArrowRight')) inputX += 1
    if (keys.has('ArrowUp')) inputY += 1
    if (keys.has('ArrowDown')) inputY -= 1
    if (stick.active || Math.abs(stick.x) + Math.abs(stick.y) > 0.02) {
      inputX = THREE.MathUtils.clamp(inputX + stick.x, -1, 1)
      inputY = THREE.MathUtils.clamp(inputY + stick.y, -1, 1)
    }
  } else {
    if (keys.has('ArrowLeft') || keys.has('KeyA')) inputX -= 1
    if (keys.has('ArrowRight') || keys.has('KeyD')) inputX += 1
    if (keys.has('ArrowUp') || keys.has('KeyW')) inputY += 1
    if (keys.has('ArrowDown') || keys.has('KeyS')) inputY -= 1
    if (stick.active || Math.abs(stick.x) + Math.abs(stick.y) > 0.02) {
      inputX = THREE.MathUtils.clamp(inputX + stick.x, -1, 1)
      inputY = THREE.MathUtils.clamp(inputY + stick.y, -1, 1)
    } else {
      inputX = THREE.MathUtils.clamp(inputX + mouse.nx * 1.1, -1, 1)
      inputY = THREE.MathUtils.clamp(inputY + mouse.ny * 1.1, -1, 1)
    }
  }

  // Auto-level assist
  if (settings.autoLevel || keys.has('ShiftLeft') || keys.has('ShiftRight')) {
    inputX *= 0.55
    inputY *= 0.55
    velX *= Math.pow(0.02, dt)
    velY *= Math.pow(0.04, dt)
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
    velX += coopWindX * 28 * dt
    velY += coopWindY * 22 * dt
    const windHud = $('coop-wind-val')
    if (windHud) windHud.textContent = `${coopWindX.toFixed(1)},${coopWindY.toFixed(1)}`
  }

  windTimer -= dt
  if (windActive > 0) {
    windActive -= dt
    velX += windForce * dt * (activePower?.kind === 'slow' ? 0.5 : 1)
    if (windActive <= 0) windBanner.classList.add('hidden')
  } else if (windTimer <= 0 && runKind !== 'tutorial' && runKind !== 'coop') {
    // In co-op, P2 is the wind — skip random gusts (or rarer)
    windActive = 1.6 + rng() * 1.4
    windForce = (rng() < 0.5 ? -1 : 1) * (14 + rng() * 12) * difficulty.windForce
    windTimer = (6 + rng() * 8) / Math.sqrt(difficulty.hazardScale)
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

  // Physics toys modifiers
  let sinkMul = 1
  let accelMul = 1
  if (activePower?.kind === 'tear') {
    velX += tearSide * 14 * dt
    accelMul = 0.85
  }
  if (activePower?.kind === 'clip') {
    sinkMul = 1.65
    velX *= Math.pow(0.03, dt) // more stable
    accelMul = 0.75
  }
  // Rubber-band slingshot: hold Space to charge, release to boost
  if (activePower?.kind === 'sling') {
    if (keys.has('Space')) {
      slingHold = Math.min(1, slingHold + dt * 0.7)
      powerLabel.textContent = `🪢 Charge ${Math.floor(slingHold * 100)}%`
    } else if (slingHold > 0.15) {
      velY += 25 * slingHold
      speed += 20 * slingHold
      shake = 0.3
      audio.nearMiss(3)
      if (settings.haptics) Haptic.power()
      slingHold = 0
      powerLabel.textContent = '🪢 Rubber Band'
    } else slingHold = 0
  }

  velX += inputX * 40 * accelMul * dt
  velY += inputY * 40 * accelMul * dt
  velY -= difficulty.sink * sinkMul * dt
  velX *= Math.pow(0.06, dt)
  velY *= Math.pow(0.1, dt)
  planeX = THREE.MathUtils.clamp(planeX + velX * dt, -MAX_X, MAX_X)
  planeY = THREE.MathUtils.clamp(planeY + velY * dt, MIN_Y, MAX_Y)

  let speedMul = 1
  if (activePower?.kind === 'slow') speedMul = 0.55
  if (activePower?.kind === 'boost') speedMul = 1.55
  const cfg = difficulty
  speed = (cfg.speedBase + Math.min(cfg.speedCap - cfg.speedBase, distance * cfg.speedRamp)) * speedMul
  const move = speed * dt
  const scoreFactor =
    cfg.scoreMul * (activePower?.kind === 'boost' ? 1.1 : activePower?.kind === 'slow' ? 0.85 : 1) *
    (1 + combo * 0.02)
  distance += move * scoreFactor

  // Funnel milestones
  for (const m of [50, 100, 200, 500, 1000]) {
    if (distance >= m && !distanceMilestones.has(m)) {
      distanceMilestones.add(m)
      track(`distance_${m}`, { mode: difficulty.id, kind: runKind })
    }
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
  pitch = THREE.MathUtils.lerp(pitch, -velY * 0.045, 1 - Math.pow(0.001, dt))
  roll = THREE.MathUtils.lerp(roll, -velX * 0.055, 1 - Math.pow(0.001, dt))
  plane.rotation.x = THREE.MathUtils.clamp(pitch, -0.55, 0.55)
  plane.rotation.z = THREE.MathUtils.clamp(roll, -0.75, 0.75)

  // Ghost
  if (ghostRecorder) ghostRecorder.push(distance, planeX, planeY)
  if (ghostMesh && ghostData) {
    const pose = ghostPoseAt(ghostData.path, distance)
    if (pose && !pose.done) {
      ghostMesh.position.set(pose.x, pose.y, 1.5)
      ghostMesh.visible = true
    } else if (ghostMesh) ghostMesh.visible = false
  }

  // Zone
  const z = zoneAt(distance)
  if (z.id !== currentZoneId) applyZone(z, true)

  camera.position.lerp(new THREE.Vector3(planeX * 0.5, planeY + 3.1, -11), 1 - Math.pow(0.0006, dt))
  camera.lookAt(planeX * 0.25, planeY + 0.4, 16)
  if (shake > 0) {
    shake = Math.max(0, shake - dt)
    camera.position.x += (Math.random() - 0.5) * shake * 0.5
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
  const magnetOn = activePower?.kind === 'magnet'
  let ringsLeft = 0

  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i]
    const m = e.mesh

    if (e.type === 'ring') {
      ringsLeft++
      const dx = m.position.x - p.x
      const dy = m.position.y - p.y
      const dz = m.position.z - p.z
      if (dx * dx + dy * dy + dz * dz < 2.5 ** 2) {
        scene.remove(m)
        entities.splice(i, 1)
        stars++
        starsEl.textContent = String(stars)
        audio.collectStar()
        Haptic.collect()
        ringsLeft--
      }
      continue
    }

    if (e.type === 'star') {
      if (magnetOn) {
        m.position.x += (p.x - m.position.x) * Math.min(1, 18 * dt * 0.15)
        m.position.y += (p.y - m.position.y) * Math.min(1, 18 * dt * 0.15)
        m.position.z += (p.z - m.position.z) * Math.min(1, 18 * dt * 0.08)
      }
      const dx = m.position.x - p.x
      const dy = m.position.y - p.y
      const dz = m.position.z - p.z
      const catchR = e.radius + PLANE_RADIUS + (magnetOn ? 1.2 : 0)
      if (dx * dx + dy * dy + dz * dz < catchR ** 2) {
        stars++
        runStats.stars = stars
        starsEl.textContent = String(stars)
        distance += 18
        audio.collectStar()
        Haptic.collect()
        scene.remove(m)
        entities.splice(i, 1)
      }
      continue
    }

    if (e.type === 'power') {
      const dx = m.position.x - p.x
      const dy = m.position.y - p.y
      const dz = m.position.z - p.z
      if (dx * dx + dy * dy + dz * dz < (e.radius + PLANE_RADIUS) ** 2) {
        activatePower(e.kind)
        scene.remove(m)
        entities.splice(i, 1)
      }
      continue
    }

    if (e.type === 'boss') {
      const dz = Math.abs(m.position.z - p.z)
      if (dz < 2.2) {
        const gapY = m.userData.gapY || 10
        // Must fly through gap (within ~2.2m of gap center, |x| small)
        const inGap = Math.abs(p.y - gapY) < 2.2 && Math.abs(p.x) < 2.4
        if (!inGap) {
          die('Snipped by the boss scissors!')
          return
        }
        // passed through
        if (m.position.z < -1) {
          bossActive = false
          track('boss_clear', { distance: Math.floor(distance) })
          stars += 5
          starsEl.textContent = String(stars)
          audio.missionComplete()
          scene.remove(m)
          entities.splice(i, 1)
        }
      }
      continue
    }

    if (e.type === 'building') {
      const dx = Math.abs(m.position.x - p.x)
      const dz = Math.abs(m.position.z - p.z)
      const hitR = e.radius + PLANE_RADIUS * 0.55
      const grazeR = e.radius + PLANE_RADIUS * 1.35
      if (dx < hitR && dz < hitR && p.y < e.halfH + 0.35) {
        die('Hit a paper skyscraper')
        return
      }
      // Near miss
      if (
        m.position.z > -2 &&
        m.position.z < 8 &&
        dx < grazeR &&
        dx > hitR * 0.85 &&
        dz < grazeR &&
        p.y < e.halfH + 2
      ) {
        const last = nearMissCooldown.get(m) || 0
        if (elapsed - last > 0.8) {
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
      const hit = e.radius + PLANE_RADIUS
      if (dist2 < hit ** 2) {
        die(e.type === 'bird' ? 'Tangled with paper birds' : 'Snipped by scissors')
        return
      }
      if (dist2 < (hit * 1.8) ** 2 && m.position.z > -1 && m.position.z < 6) {
        const last = nearMissCooldown.get(m) || 0
        if (elapsed - last > 0.8) {
          nearMissCooldown.set(m, elapsed)
          registerNearMiss()
        }
      }
    }
  }

  if (runKind === 'tutorial' && ringsLeft === 0 && entities.every((e) => e.type === 'building')) {
    die('Tutorial complete!')
    return
  }

  if (planeY <= MIN_Y + 0.04 && velY < -2) {
    die('Nosed into the paper ground')
    return
  }

  distanceEl.textContent = `${Math.floor(distance)}m`
  if (distance > bestDistance) bestEl.textContent = `${Math.floor(distance)}m`
}

// Boot
const clock = new THREE.Clock()
function frame() {
  update(Math.min(clock.getDelta(), 0.05))
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}

resetGame()
state = 'menu'
showMenu()
applySeasonVisuals()
if (!tutorialDone) {
  dailyHint.textContent = 'New here? Try Tutorial — then Daily Route!'
}
if (layoutPlay) {
  dailyHint.textContent = `Custom route loaded: ${layoutPlay.name}`
}
// Season banner on boot
if (season.id !== 'default') {
  challengeToast.textContent = `✦ ${season.name} event — free seasonal skins!`
  challengeToast.classList.remove('hidden')
  setTimeout(() => challengeToast.classList.add('hidden'), 5000)
}
// Restore AR if preferred
if (settings.arDesk) {
  deskAR.start().then((ok) => {
    if (ok) applyPerformanceSettings()
  })
}

// Reduced motion: soften camera sway in menu via CSS class already set
if (settings.reducedMotion) {
  scene.fog.far = 200
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

requestAnimationFrame(frame)
refreshMissionBadge()
