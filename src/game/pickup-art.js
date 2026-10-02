/** Original paper cuts, shared by world pickups and their readability checks. */
export const PICKUP_LABELS = Object.freeze({
  star: 'STAR · +1', golden: 'GOLD STAR · +5',
  boost: 'BOOST · SPEED', shield: 'SHIELD · PROTECT', magnet: 'MAGNET · STARS',
})

const COLORS = Object.freeze({ star: '#ffc84a', golden: '#f5ae25', boost: '#ff854f', shield: '#69b6e0', magnet: '#aa8bd6' })
const CUTS = Object.freeze({
  boost: [[50,10],[65,32],[65,59],[80,77],[62,73],[62,82],[38,82],[38,73],[20,77],[35,59],[35,32]],
  shield: [[50,13],[79,24],[76,57],[64,75],[50,85],[36,75],[24,57],[21,24]],
  magnet: [[22,19],[39,19],[39,52],[42,64],[50,69],[58,64],[61,52],[61,19],[78,19],[78,54],[73,73],[63,83],[50,88],[37,83],[27,73],[22,54]],
})

function polygon(ctx, points) {
  ctx.beginPath()
  points.forEach(([x,y], index) => index ? ctx.lineTo(x,y) : ctx.moveTo(x,y))
  ctx.closePath()
}

function starPoints() {
  return Array.from({length:10},(_,i) => {
    const angle = -Math.PI/2 + i*Math.PI/5
    const radius = i%2 ? 17 : 38
    return [50+Math.cos(angle)*radius,48+Math.sin(angle)*radius]
  })
}

export function createPickupCanvas({ kind = 'star', color, size = 192, canvasFactory } = {}) {
  const canvas = canvasFactory ? canvasFactory(size,size) : globalThis.document?.createElement('canvas')
  if (!canvas) return null
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.scale(size/100,size/100)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const ink = '#332b35', stock = '#fff4dd', accent = color || COLORS[kind] || COLORS.star
  const points = kind === 'star' || kind === 'golden' ? starPoints() : CUTS[kind]
  // Hard offset stock edge gives thickness without a blur or an opaque square.
  const cut = () => {
    if (points) polygon(ctx,points)
    else { ctx.beginPath(); ctx.arc(50,49,35,0,Math.PI*2) }
  }
  ctx.save(); ctx.translate(2,4); cut(); ctx.fillStyle = ink; ctx.fill(); ctx.restore()
  cut(); ctx.fillStyle = accent; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2.2; ctx.stroke()
  ctx.save(); cut(); ctx.clip()
  ctx.fillStyle = stock
  polygon(ctx,[[50,5],[50,49],[12,89],[0,0]]); ctx.fill()
  ctx.strokeStyle = 'rgba(51,43,53,.24)'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(50,8); ctx.lineTo(50,89); ctx.stroke()
  ctx.restore()
  ctx.strokeStyle = ink; ctx.lineWidth = 4
  if (kind === 'boost') {
    ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(50,39,7,0,Math.PI*2); ctx.fill()
    ctx.fillStyle = '#f5bb3d'; polygon(ctx,[[42,85],[50,96],[58,85]]); ctx.fill()
  } else if (kind === 'shield') {
    ctx.beginPath(); ctx.moveTo(36,48); ctx.lineTo(46,58); ctx.lineTo(65,37); ctx.stroke()
  } else if (kind === 'magnet') {
    ctx.fillStyle = ink; ctx.fillRect(22,30,17,3); ctx.fillRect(61,30,17,3)
  } else if (kind === 'golden') {
    ctx.fillStyle = ink; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('5',50,56)
  }
  return canvas
}

export function createPickupLabelCanvas({ label, canvasFactory } = {}) {
  const canvas = canvasFactory ? canvasFactory(512,128) : globalThis.document?.createElement('canvas')
  if (!canvas) return null
  canvas.width = 512; canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.fillStyle = '#fff4dd'; ctx.fillRect(10,18,492,92)
  ctx.strokeStyle = '#332b35'; ctx.lineWidth = 5; ctx.strokeRect(10,18,492,92)
  ctx.fillStyle = '#332b35'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(label,256,65,464)
  return canvas
}
