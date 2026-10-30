import { getPaperPalette } from './paper-art.js'
import { paintCityBlocks } from './paper-streets.js'

function polygon(ctx, points, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y))
  ctx.closePath()
  ctx.fill()
}

/** Darkens a hex colour toward black. Shadows reuse the shape's own hue. */
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16)
  const channel = shift => Math.round(((n >> shift) & 255) * amount)
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`
}

/** Mixes a hex colour toward white for the light edge of a fold. */
function tint(hex, amount) {
  const n = parseInt(hex.slice(1), 16)
  const channel = shift => {
    const value = (n >> shift) & 255
    return Math.round(value + (255 - value) * amount)
  }
  return `rgb(${channel(16)},${channel(8)},${channel(0)})`
}

/** A paper fold is a hard light edge with a hard dark edge beside it. */
function fold(ctx, x, y, len, vertical, light, dark) {
  ctx.fillStyle = light
  if (vertical) ctx.fillRect(x, y, 1, len)
  else ctx.fillRect(x, y, len, 1)
  ctx.fillStyle = dark
  if (vertical) ctx.fillRect(x + 1, y, 1, len)
  else ctx.fillRect(x, y + 1, len, 1)
}

/** Original paper-world plates, drawn once per zone and cached by the renderer. */
export function createWorldCanvas({ kind = 'ground', zoneId = 'city', size = 512, canvasFactory } = {}) {
  const canvas = canvasFactory?.() || (typeof document !== 'undefined' ? document.createElement('canvas') : null)
  if (!canvas) return null
  canvas.width = size
  canvas.height = kind === 'sky' ? size / 2 : size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const p = getPaperPalette(zoneId)
  const w = canvas.width, h = canvas.height
  let seed = [...zoneId].reduce((sum, letter) => sum * 31 + letter.charCodeAt(0), 17) >>> 0
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  ctx.fillStyle = kind === 'sky' ? p.far : kind === 'wall' ? p.paper : p.ground
  ctx.fillRect(0, 0, w, h)

  if (kind === 'sky') {
    const night = zoneId === 'aurora' || zoneId === 'midnight'
    if (night) {
      for (let i = 0; i < 95; i++) {
        ctx.fillStyle = i % 3 ? '#f4ecd8' : p.paper
        ctx.fillRect(random() * w, random() * h * .66, 1 + random(), 1 + random())
      }
      if (zoneId === 'aurora') {
        for (let band = 0; band < 3; band++) {
          const y = h * (.22 + band * .11)
          polygon(ctx, [[0,y],[w*.22,y-20],[w*.52,y+8],[w*.78,y-16],[w,y-5],[w,y+5],[w*.78,y+2],[w*.52,y+25],[w*.22,y-7],[0,y+14]], [p.near,p.mid,'#91cfca'][band])
        }
      }
    }
    ctx.fillStyle = night ? '#f3e9c6' : zoneId === 'sunset' ? '#fff0c2' : zoneId === 'dawn' ? '#ffe0cd' : '#f9f3e6'
    ctx.beginPath(); ctx.arc(w * .72, h * .3, h * .095, 0, Math.PI * 2); ctx.fill()
    // First Light's sun is still climbing: a rose halo, no rays yet.
    if (zoneId === 'dawn') {
      ctx.strokeStyle = p.mid; ctx.globalAlpha = .5; ctx.lineWidth = 6
      ctx.beginPath(); ctx.arc(w * .72, h * .3, h * .125, 0, Math.PI * 2); ctx.stroke()
      ctx.globalAlpha = 1
    }
    for (let layer = 0; layer < 3; layer++) {
      const y = h * (.64 + layer * .09)
      const points = [[0,h],[0,y]]
      for (let x = 0; x <= w + 32; x += 32) points.push([x, y - random() * h * (.09 + layer * .025)])
      points.push([w,h])
      polygon(ctx, points, [p.mid,p.near,p.groundAlt][layer])
    }
  } else if (kind === 'wall') {
    for (let row = 0; row < 5; row++) for (let col = 0; col < 4; col++) {
      const x = (col + .28) * w / 4, y = (row + .28) * h / 5
      ctx.fillStyle = p.groundAlt; ctx.fillRect(x-3,y-3,w*.14+6,h*.1+6)
      ctx.fillStyle = zoneId === 'midnight' || zoneId === 'aurora' ? '#f5dfa1' : zoneId === 'dawn' ? '#f7bfa4' : '#637c87'
      ctx.fillRect(x,y,w*.14,h*.1)
      ctx.fillStyle = p.paper; ctx.fillRect(x+w*.064,y,2,h*.1)
      ctx.fillRect(x,y+h*.048,w*.14,2)
    }
    // One hard fold across the wall plane, riding the seam between window rows.
    fold(ctx, 0, Math.round(h*.4), w, false, tint(p.paper,.6), shade(p.paper,.72))
    ctx.strokeStyle = p.groundAlt; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(0,h*.98); ctx.lineTo(w,h*.98); ctx.stroke()
    // Dark ink base under the light skirt so the plinth reads at the wall's foot.
    ctx.fillStyle = shade(p.paper,.4)
    ctx.fillRect(0, Math.round(h*.98)+1, w, 2)
  } else if (zoneId === 'dawn') {
    // Dew meadows: wide mowing bands catching the first light, with dew
    // glints scattered along the band seams.
    for (let row = 0; row < 6; row++) {
      const y = row * h / 6
      polygon(ctx, [[0,y],[w*.3,y+14],[w*.65,y-8],[w,y+6],[w,y+22],[w*.65,y+9],[w*.3,y+30],[0,y+16]], row % 2 ? p.groundAlt : '#f2e2cc')
    }
    for (let i = 0; i < 26; i++) {
      const x = random() * w, y = random() * h
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = .5
      ctx.fillRect(x, y, 2, 2)
      ctx.globalAlpha = 1
    }
  } else if (zoneId === 'city') {
    paintCityBlocks(ctx,w,h)
  } else if (zoneId === 'harbor') {
    ctx.fillStyle = '#80b7c2'; ctx.fillRect(0,0,w,h)
    for (let row = 0; row < 9; row++) {
      const y = row * h / 9
      polygon(ctx, [[0,y+3],[w*.25,y-3],[w*.5,y+4],[w*.75,y-2],[w,y+3],[w,y+10],[w*.75,y+5],[w*.5,y+12],[w*.25,y+4],[0,y+9]], row%2 ? '#b5d5d8' : '#99c5cd')
    }
    // Broken paper ripples give the water scale without introducing objects
    // that might be mistaken for physical obstacles.
    ctx.strokeStyle = '#d8e8e5'; ctx.globalAlpha = .38; ctx.lineWidth = 3
    for (let i = 0; i < 24; i++) {
      const x = random() * w, y = random() * h, length = 12 + random() * 28
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x + length,y); ctx.stroke()
    }
    ctx.globalAlpha = 1
  } else if (zoneId === 'sunset') {
    for (let row = 0; row < 7; row++) {
      const y = row*h/7
      polygon(ctx, [[0,y],[w*.3,y+15],[w*.65,y-8],[w,y+8],[w,y+28],[w*.65,y+12],[w*.3,y+35],[0,y+20]], row%2 ? '#e1b58a' : '#e8c59e')
    }
    // Low-contrast folded fields break up the long stripes of Golden Fold.
    for (let i = 0; i < 14; i++) {
      const x = random() * w, y = random() * h, span = 32 + random() * 54
      polygon(ctx, [[x,y],[x+span,y-9],[x+span*1.3,y+span*.25],[x+span*.35,y+span*.42]], i%2 ? '#e5b18a' : '#f0cba2')
      ctx.strokeStyle = '#f9ddba'; ctx.globalAlpha = .42; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+span,y-9); ctx.stroke(); ctx.globalAlpha = 1
    }
  } else if (zoneId === 'aurora' || zoneId === 'midnight') {
    // Folded ribbons make the night routes read as a landscape rather than
    // a scattering of unrelated rectangular patches.
    for (let row = 0; row < 5; row++) {
      const y = row * h / 5
      polygon(ctx, [[0,y],[w*.24,y+12],[w*.49,y-10],[w*.74,y+8],[w,y],[w,y+32],[w*.74,y+40],[w*.49,y+22],[w*.24,y+44],[0,y+32]], row%2 ? p.groundAlt : p.mid)
      ctx.strokeStyle = p.paper; ctx.globalAlpha = .17; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w*.24,y+12); ctx.lineTo(w*.49,y-10); ctx.lineTo(w*.74,y+8); ctx.lineTo(w,y); ctx.stroke()
      ctx.globalAlpha = 1
    }
    for (let i = 0; i < 18; i++) {
      const x = random()*w, y = random()*h, span = 10+random()*18
      polygon(ctx, [[x,y-span],[x+span,y],[x,y+span],[x-span,y]], i%2 ? p.near : p.groundAlt)
    }
  } else {
    const count = zoneId === 'midnight' ? 14 : 24
    for (let i = 0; i < count; i++) {
      const x = random()*w, y = random()*h, span = 35+random()*65
      polygon(ctx, [[x,y],[x+span,y+5],[x+span*.7,y+span*.65],[x-10,y+span*.5]], i%2 ? p.groundAlt : p.mid)
      ctx.strokeStyle = p.paper; ctx.globalAlpha = .15; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+span*.7,y+span*.65); ctx.stroke(); ctx.globalAlpha = 1
    }
  }
  // Sparse fibres and a stock crease keep the authored plates tactile.
  ctx.globalAlpha = .045
  for (let i = 0; i < w*h*.015; i++) {
    ctx.fillStyle = i%2 ? '#ffffff' : '#263b40'
    ctx.fillRect(random()*w,random()*h,1,2)
  }
  ctx.globalAlpha = 1
  return canvas
}
