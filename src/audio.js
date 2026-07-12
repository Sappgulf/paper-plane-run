/**
 * Web Audio SFX + soft generative music bed.
 */
// Per-zone motifs for the generative bed — same gentle pentatonic engine,
// different mood so a zone transition is reinforced musically too.
const ZONE_SCALES = {
  city: [196, 220, 261.63, 293.66, 329.63, 392], // G major pentatonic — bright, default
  harbor: [220, 246.94, 293.66, 329.63, 392, 440], // A major pentatonic — airy, open
  storm: [220, 246.94, 261.63, 329.63, 349.23, 440], // A minor-ish — tense, overcast
  sunset: [207.65, 233.08, 277.18, 311.13, 349.23, 415.3], // Ab major pentatonic — warm, golden
  aurora: [220, 246.94, 277.18, 329.63, 369.99, 440], // wider spacing — shimmering, exotic
}

export class GameAudio {
  constructor() {
    this.ctx = null
    this.muted = localStorage.getItem('paper-plane-run-muted') === '1'
    this.master = null
    this.sfx = null
    this.music = null
    this.windGain = null
    this.started = false
    this.musicOn = localStorage.getItem('paper-plane-run-music') !== '0'
    this._musicNodes = []
    this._musicTimer = null
    /** 0 (calm) – 1 (intense): driven by combo/speed, brightens & quickens the music bed */
    this.intensity = 0
    /** Current zone's musical scale — swapped so each zone has its own motif */
    this.scale = ZONE_SCALES.city
  }

  /** Swap the generative bed's scale for the zone we just entered. Takes
   *  effect on the next note, no need to restart the music loop. */
  setMusicZone(zoneId) {
    this.scale = ZONE_SCALES[zoneId] || ZONE_SCALES.city
  }

  /** Live-adjust the generative music bed's tempo/brightness/volume. */
  setIntensity(level) {
    this.intensity = Math.max(0, Math.min(1, level))
    if (this.music && this.musicOn && !this.muted) {
      const t = this._now()
      this.music.gain.cancelScheduledValues(t)
      this.music.gain.linearRampToValueAtTime(0.12 + this.intensity * 0.07, t + 0.4)
    }
  }

  async unlock() {
    if (this.started) return
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    this.ctx = new Ctx()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.4
    this.master.connect(this.ctx.destination)

    this.sfx = this.ctx.createGain()
    this.sfx.gain.value = 0.9
    this.sfx.connect(this.master)

    this.music = this.ctx.createGain()
    this.music.gain.value = this.musicOn ? 0.12 : 0
    this.music.connect(this.master)

    // Soft wind bed
    this.windGain = this.ctx.createGain()
    this.windGain.gain.value = 0
    this.windGain.connect(this.sfx)
    const bufferSize = 2 * this.ctx.sampleRate
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const noise = this.ctx.createBufferSource()
    noise.buffer = noiseBuffer
    noise.loop = true
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 400
    filter.Q.value = 0.6
    noise.connect(filter)
    filter.connect(this.windGain)
    noise.start()

    this.started = true
    if (this.ctx.state === 'suspended') await this.ctx.resume()
  }

  setMuted(m) {
    this.muted = m
    localStorage.setItem('paper-plane-run-muted', m ? '1' : '0')
    if (this.master) this.master.gain.value = m ? 0 : 0.4
  }

  toggleMute() {
    this.setMuted(!this.muted)
    return this.muted
  }

  setMusic(on) {
    this.musicOn = on
    localStorage.setItem('paper-plane-run-music', on ? '1' : '0')
    if (this.music) {
      const t = this._now()
      this.music.gain.cancelScheduledValues(t)
      this.music.gain.linearRampToValueAtTime(on && !this.muted ? 0.12 : 0, t + 0.3)
    }
  }

  toggleMusic() {
    this.setMusic(!this.musicOn)
    if (this.musicOn) this.startMusic()
    else this.stopMusic()
    return this.musicOn
  }

  _now() {
    return this.ctx?.currentTime ?? 0
  }

  _tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null) {
    if (!this.ctx || this.muted) return
    const t = this._now()
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g)
    g.connect(this.sfx || this.master)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  uiClick() {
    this._tone(660, 0.08, 'triangle', 0.12)
    this._tone(990, 0.1, 'sine', 0.08)
  }

  startFlight() {
    this.intensity = 0
    this.scale = ZONE_SCALES.city
    this._tone(392, 0.12, 'triangle', 0.15)
    this._tone(523, 0.14, 'triangle', 0.12)
    this._tone(659, 0.2, 'sine', 0.1)
    this.setWind(0.04)
    this.startMusic()
  }

  collectStar() {
    this._tone(880, 0.08, 'sine', 0.14)
    this._tone(1175, 0.12, 'triangle', 0.12)
    this._tone(1568, 0.16, 'sine', 0.08)
  }

  nearMiss(combo = 1, kind = null) {
    const f = 500 + combo * 80
    // Per-flyer timbre flavor layered on top of the shared combo-pitch riser,
    // so a near-miss with a biplane reads differently from grazing a kite.
    switch (kind) {
      case 'butterfly':
        this._tone(f * 1.3, 0.1, 'sine', 0.07)
        this._tone(f * 1.9, 0.14, 'sine', 0.05)
        return
      case 'balloon':
        this._tone(f * 0.55, 0.14, 'sine', 0.1)
        this._tone(f * 0.8, 0.1, 'triangle', 0.06)
        return
      case 'kite':
        this._tone(f, 0.05, 'triangle', 0.09)
        this._tone(f * 1.4, 0.05, 'triangle', 0.07, f * 0.9)
        return
      case 'biplane':
        this._tone(f * 0.7, 0.09, 'sawtooth', 0.08)
        this._tone(f * 1.05, 0.08, 'square', 0.05)
        return
      case 'dragonfly':
        this._tone(f * 1.6, 0.05, 'sine', 0.08, f * 2.4)
        return
      case 'swarm':
        this._tone(f * 0.9, 0.06, 'sawtooth', 0.06)
        this._tone(f * 1.2, 0.06, 'triangle', 0.05)
        this._tone(f * 1.6, 0.06, 'sine', 0.04)
        return
      case 'scissors':
        this._tone(f * 1.1, 0.05, 'square', 0.09)
        this._tone(f * 2.1, 0.06, 'sine', 0.06)
        return
      default:
        this._tone(f, 0.07, 'triangle', 0.1)
        this._tone(f * 1.5, 0.1, 'sine', 0.08)
    }
  }

  powerUp(kind) {
    const base = { shield: 300, slow: 220, magnet: 480, boost: 550 }[kind] || 400
    this._tone(base, 0.1, 'square', 0.08)
    this._tone(base * 1.5, 0.18, 'triangle', 0.12)
    this._tone(base * 2, 0.22, 'sine', 0.1)
  }

  windGust() {
    if (!this.ctx || this.muted) return
    const t = this._now()
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(90, t)
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.8)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.1, t + 0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
    const f = this.ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 600
    osc.connect(f)
    f.connect(g)
    g.connect(this.sfx || this.master)
    osc.start(t)
    osc.stop(t + 1)
  }

  crash() {
    if (!this.ctx || this.muted) return
    this.setWind(0)
    this.stopMusic()
    const t = this._now()
    const len = this.ctx.sampleRate * 0.35
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const g = this.ctx.createGain()
    g.gain.value = 0.25
    const f = this.ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(1200, t)
    f.frequency.exponentialRampToValueAtTime(80, t + 0.3)
    src.connect(f)
    f.connect(g)
    g.connect(this.sfx || this.master)
    src.start(t)
    this._tone(120, 0.4, 'sawtooth', 0.12, 40)
  }

  starStreak(tier = 1) {
    if (!this.ctx || this.muted) return
    const t = this._now()
    const base = 660 + tier * 40
    ;[base, base * 1.26, base * 1.5].forEach((f, i) => {
      const osc = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = f
      const start = t + i * 0.055
      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(0.14, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.18)
      osc.connect(g)
      g.connect(this.sfx || this.master)
      osc.start(start)
      osc.stop(start + 0.2)
    })
  }

  /** Bigger ascending fanfare for hitting a Combo Fever streak. */
  fever() {
    if (!this.ctx || this.muted) return
    const t = this._now()
    const notes = [523, 659, 784, 1047, 1319] // C-E-G-C-E, bright major arpeggio
    notes.forEach((f, i) => {
      const osc = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = f
      const start = t + i * 0.06
      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(0.16, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.24)
      osc.connect(g)
      g.connect(this.sfx || this.master)
      osc.start(start)
      osc.stop(start + 0.26)
    })
  }

  incoming() {
    if (!this.ctx || this.muted) return
    const t = this._now()
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(340, t)
    osc.frequency.exponentialRampToValueAtTime(620, t + 0.14)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.1, t + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
    osc.connect(g)
    g.connect(this.sfx || this.master)
    osc.start(t)
    osc.stop(t + 0.2)
  }

  shieldHit() {
    this._tone(200, 0.15, 'triangle', 0.15, 80)
    this._tone(400, 0.1, 'sine', 0.1)
  }

  missionComplete() {
    this._tone(523, 0.1, 'triangle', 0.12)
    this._tone(659, 0.12, 'triangle', 0.12)
    this._tone(784, 0.2, 'sine', 0.14)
  }

  setWind(level) {
    if (!this.windGain) return
    const t = this._now()
    this.windGain.gain.cancelScheduledValues(t)
    this.windGain.gain.linearRampToValueAtTime(level, t + 0.3)
  }

  setFlightWind(level) {
    this.setWind(0.02 + level * 0.06)
  }

  /** Soft generative pentatonic bed */
  startMusic() {
    if (!this.ctx || !this.musicOn || this.muted) return
    this.stopMusic(false)
    let step = 0
    const tick = () => {
      if (!this.ctx || !this.musicOn || this.muted) return
      const it = this.intensity
      const scale = this.scale
      const t = this._now()
      const freq = scale[step % scale.length]
      step += (Math.random() < 0.3 + it * 0.3 ? 2 : 1)
      const osc = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.045 + it * 0.02, t + 0.05)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
      const f = this.ctx.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = 1200 + it * 900
      osc.connect(f)
      f.connect(g)
      g.connect(this.music)
      osc.start(t)
      osc.stop(t + 1.3)
      this._musicNodes.push(osc)
      // A brighter harmony note layers in as intensity climbs.
      if (it > 0.45 && Math.random() < it * 0.5) {
        const osc2 = this.ctx.createOscillator()
        const g2 = this.ctx.createGain()
        osc2.type = 'triangle'
        osc2.frequency.value = scale[(step + 2) % scale.length] * 2
        g2.gain.setValueAtTime(0.0001, t)
        g2.gain.exponentialRampToValueAtTime(0.02 + it * 0.02, t + 0.04)
        g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
        osc2.connect(g2)
        g2.connect(this.music)
        osc2.start(t)
        osc2.stop(t + 0.55)
        this._musicNodes.push(osc2)
      }
      const interval = (480 + Math.random() * 220) * (1 - it * 0.35)
      this._musicTimer = setTimeout(tick, interval)
    }
    tick()
  }

  stopMusic(fade = true) {
    if (this._musicTimer) {
      clearTimeout(this._musicTimer)
      this._musicTimer = null
    }
    this._musicNodes = []
    if (this.music && fade) {
      const t = this._now()
      this.music.gain.cancelScheduledValues(t)
      this.music.gain.linearRampToValueAtTime(0, t + 0.4)
      if (this.musicOn && !this.muted) {
        setTimeout(() => {
          if (this.music && this.musicOn) this.music.gain.value = 0.12
        }, 500)
      }
    }
  }
}
