/**
 * Desk runway mode: rear camera as page background, transparent clear color.
 */
export class DeskAR {
  constructor() {
    this.video = null
    this.stream = null
    this.active = false
    this.el = null
  }

  async start() {
    if (this.active) return true
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      this.video = document.createElement('video')
      this.video.setAttribute('playsinline', 'true')
      this.video.muted = true
      this.video.autoplay = true
      this.video.srcObject = this.stream
      await this.video.play()

      this.el = document.createElement('div')
      this.el.id = 'ar-layer'
      this.el.style.cssText =
        'position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;'
      this.video.style.cssText =
        'width:100%;height:100%;object-fit:cover;filter:saturate(0.85) brightness(1.05);'
      this.el.appendChild(this.video)
      document.getElementById('game-root')?.prepend(this.el)
      document.getElementById('game-root')?.classList.add('ar-active')
      this.active = true
      return true
    } catch (err) {
      console.warn('AR desk mode unavailable', err)
      this.stop()
      return false
    }
  }

  stop() {
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop()
    }
    this.stream = null
    if (this.video) {
      this.video.srcObject = null
      this.video = null
    }
    this.el?.remove()
    this.el = null
    document.getElementById('game-root')?.classList.remove('ar-active')
    this.active = false
  }

  async toggle() {
    if (this.active) {
      this.stop()
      return false
    }
    return this.start()
  }
}
