import { getPaperPalette } from './paper-art.js'
import { ROAD_LANES_X } from './ground-life.js'

export const STREET_BLOCK_SIZE = 35
export const STREET_WIDTH = 6.6
const ROAD_INK = {city:'#687580',storm:'#5c536e',sunset:'#a07b5d',aurora:'#5c8fa3',midnight:'#35364d',dawn:'#b89882'}
/** Every shadow is a solid copy of its shape offset down-right; nothing is blurred. */
const SHADOW_OFFSET = 4
const PAVEMENT = '#ddd2ba', MARKING = '#fff1d6'

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

/** Deterministic 32-bit LCG so every paint of a tile scatters the same specks. */
function seededRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function seedFor(zoneId, crossStreet) {
  let seed = crossStreet ? 7919 : 104729
  for (const char of zoneId) seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0
  return seed
}

/** Low-alpha 1px fibre specks give the paper stock a grain without noise. */
function paintFibreGrain(ctx, width, height, seed, count, colours) {
  const random = seededRandom(seed)
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = .05 + random() * .1
    ctx.fillStyle = colours[Math.floor(random() * colours.length)]
    ctx.fillRect(Math.floor(random() * width), Math.floor(random() * height), 1, 1)
  }
  ctx.globalAlpha = 1
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

/** Each rect gets its own hard offset shadow, then its solid fill. */
function hardRects(ctx, rects, fill, shadow) {
  ctx.fillStyle = shadow
  for (const [x, y, w, h] of rects) ctx.fillRect(x + SHADOW_OFFSET, y + SHADOW_OFFSET, w, h)
  ctx.fillStyle = fill
  for (const [x, y, w, h] of rects) ctx.fillRect(x, y, w, h)
}

/** Scalloped cut-paper outline: ten crisp lobes, no smoothing. */
function scallopPath(ctx, cx, cy, radius) {
  ctx.beginPath()
  for (let i = 0; i <= 120; i++) {
    const angle = i / 120 * Math.PI * 2
    const r = radius * (.9 + .1 * Math.abs(Math.sin(5 * angle)))
    const x = cx + Math.cos(angle) * r, y = cy + Math.sin(angle) * r
    if (i) ctx.lineTo(x, y)
    else ctx.moveTo(x, y)
  }
  ctx.closePath()
}

function fillScallop(ctx, cx, cy, radius, fill) {
  ctx.fillStyle = shade(fill, .62)
  scallopPath(ctx, cx + SHADOW_OFFSET, cy + SHADOW_OFFSET, radius)
  ctx.fill()
  ctx.fillStyle = fill
  scallopPath(ctx, cx, cy, radius)
  ctx.fill()
  ctx.save()
  scallopPath(ctx, cx, cy, radius)
  ctx.clip()
  fold(ctx, cx - radius, Math.round(cy - radius * .3), radius * 2, false, tint(fill, .4), shade(fill, .72))
  ctx.restore()
}

function paintHarborPlanks(ctx, width, height) {
  const plank = '#6c614e', nail = '#655944'
  for (let y = 0; y < height; y += height / 16) {
    // Each seam casts a hard shadow down-right, then a fold rides the plank face.
    ctx.strokeStyle = shade(plank, .6); ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(0, y + SHADOW_OFFSET); ctx.lineTo(width, y + SHADOW_OFFSET); ctx.stroke()
    ctx.strokeStyle = plank
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke()
    fold(ctx, 0, y + 6, width, false, tint(plank, .3), shade(plank, .72))
    ctx.fillStyle = shade(nail, .6)
    ctx.fillRect(18 + SHADOW_OFFSET, y + 5 + SHADOW_OFFSET, 3, 3)
    ctx.fillRect(width - 21 + SHADOW_OFFSET, y + 5 + SHADOW_OFFSET, 3, 3)
    ctx.fillStyle = nail
    ctx.fillRect(18, y + 5, 3, 3)
    ctx.fillRect(width - 21, y + 5, 3, 3)
  }
}

/** A continuous street tile; all paint stops at junctions and shares paper stock. */
export function createStreetCanvas({zoneId = 'city',crossStreet = false,canvasFactory} = {}) {
  const width = crossStreet ? 1024 : 256, height = crossStreet ? 128 : 512
  const canvas = canvasFactory ? canvasFactory(width,height) : globalThis.document?.createElement('canvas')
  if (!canvas) return null
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d'), p = getPaperPalette(zoneId)
  if (!ctx) return canvas
  const ink = ROAD_INK[zoneId] || '#a88f6c'
  ctx.fillStyle = ink; ctx.fillRect(0,0,width,height)
  const grainCount = Math.round(width*height/180), seed = seedFor(zoneId, crossStreet)
  if (zoneId === 'harbor') {
    paintHarborPlanks(ctx,width,height)
    paintFibreGrain(ctx,width,height,seed,grainCount,['#4a4134','#8a7b60'])
    return canvas
  }
  const pavementShadow = shade(PAVEMENT,.6), asphaltShadow = shade(ink,.6)
  const foldLight = tint(PAVEMENT,.6), foldDark = shade(PAVEMENT,.7)
  if (crossStreet) {
    const cuts = []
    for (const lane of ROAD_LANES_X) for (const side of [-1,1]) {
      const x = (side*lane+32)/64*width
      cuts.push([x-STREET_WIDTH/128*width, STREET_WIDTH/64*width])
    }
    ctx.fillStyle = pavementShadow
    ctx.fillRect(0,SHADOW_OFFSET,width,18); ctx.fillRect(0,height-18+SHADOW_OFFSET,width,18)
    ctx.fillStyle = PAVEMENT
    ctx.fillRect(0,0,width,18); ctx.fillRect(0,height-18,width,18)
    // Cut the pavement back where the four longitudinal streets meet it.
    ctx.fillStyle = asphaltShadow
    for (const [x,w] of cuts) {
      ctx.fillRect(x+SHADOW_OFFSET,0,w,18); ctx.fillRect(x+SHADOW_OFFSET,height-18,w,18)
    }
    ctx.fillStyle = ink
    for (const [x,w] of cuts) ctx.fillRect(x,0,w,height)
    for (let x=12;x<width;x+=64) {
      if (cuts.some(([cx,cw]) => x >= cx - SHADOW_OFFSET && x <= cx + cw + 1)) continue
      for (const y0 of [3, height-15]) fold(ctx,x,y0,12,true,foldLight,foldDark)
    }
    const dashes = []
    for (let x=0;x<width;x+=48) {
      const worldX = (x+14)/width*64-32
      if (ROAD_LANES_X.some(lane=>Math.abs(Math.abs(worldX)-lane)<STREET_WIDTH/2+.5)) continue
      dashes.push([x,62,28,4])
    }
    hardRects(ctx,dashes,MARKING,asphaltShadow)
  } else {
    const curb = width*.13
    // The left kerb throws a hard shadow across the asphalt beside it.
    ctx.fillStyle = asphaltShadow; ctx.fillRect(SHADOW_OFFSET,0,curb,height)
    ctx.fillStyle = PAVEMENT
    ctx.fillRect(0,0,curb,height); ctx.fillRect(width-curb,0,curb,height)
    ctx.fillStyle = p.paper
    ctx.fillRect(curb-3,0,3,height); ctx.fillRect(width-curb,0,3,height)
    for (let y=0;y<height;y+=32) {
      fold(ctx,3,y,curb-6,false,foldLight,foldDark)
      fold(ctx,width-curb+3,y,curb-6,false,foldLight,foldDark)
    }
    const city = zoneId === 'city'
    const dashes = []
    for (let y=0;y<height;y+=40) {
      if (city && Math.abs(y+10-height/2)<height*.13) continue
      dashes.push([width/2-2,y,4,21])
    }
    hardRects(ctx,dashes,MARKING,asphaltShadow)
    if (city) {
      // The crossing aligns to the same 35-unit block as the world ground.
      const junction = STREET_WIDTH/STREET_BLOCK_SIZE*height
      ctx.fillStyle = ROAD_INK.city; ctx.fillRect(0,height/2-junction/2,width,junction)
      const walks = []
      for (const y of [height/2-junction/2-22,height/2+junction/2+6]) {
        for (let x=curb+8;x<width-curb-8;x+=22) walks.push([x,y,13,15])
      }
      hardRects(ctx,walks,MARKING,asphaltShadow)
    }
  }
  paintFibreGrain(ctx,width,height,seed,grainCount,[MARKING,shade(ink,.5)])
  return canvas
}

/** City floor is an aligned street grid with scalloped parks, lots and folded curbs. */
export function paintCityBlocks(ctx,width,height,groundArt = null) {
  ctx.fillStyle = '#e6ddc9'; ctx.fillRect(0,0,width,height)
  if (groundArt) {
    // The illustrated stock sits beneath the street network; existing 3D
    // buildings and collision geometry remain the foreground landmarks.
    ctx.globalAlpha = .72
    ctx.drawImage(groundArt, 0, 0, width, height)
    ctx.globalAlpha = 1
  }
  const road = STREET_WIDTH/STREET_BLOCK_SIZE*width, curb = width*.034
  const span = width*.32
  if (!groundArt) for (let row=0;row<2;row++) for (let col=0;col<2;col++) {
    const x = col*width*.5+width*.05, y = row*height*.5+height*.05
    const fill = (row+col)%2 ? '#cfbba2' : '#a6baa3'
    // Each lot lifts off the ground with a hard shadow and carries a fold.
    ctx.fillStyle = shade(fill,.62); ctx.fillRect(x+SHADOW_OFFSET,y+SHADOW_OFFSET,span,span)
    ctx.fillStyle = fill; ctx.fillRect(x,y,span,span)
    ctx.fillStyle = '#f6efdf'; ctx.fillRect(x+8,y+8,span-16,3)
    ctx.fillStyle = shade(fill,.7); ctx.fillRect(x+8,y+11,span-16,2)
    if ((row+col)%2) {
      for (let i=0;i<3;i++) {
        const c = ['#d79074','#ddb87d','#afbac3'][i]
        const bx = x+12+i*span*.27, by = y+span*.18, bw = span*.2, bh = span*.5
        ctx.fillStyle = shade(c,.62); ctx.fillRect(bx+SHADOW_OFFSET,by+SHADOW_OFFSET,bw,bh)
        ctx.fillStyle = c; ctx.fillRect(bx,by,bw,bh)
        ctx.fillStyle = tint(c,.45); ctx.fillRect(bx+3,by+4,bw-6,2)
        ctx.fillStyle = shade(c,.72); ctx.fillRect(bx+3,by+6,bw-6,2)
      }
    } else {
      for (const dx of [.2,.6]) fillScallop(ctx,x+span*dx,y+span*.5,span*.12,'#7c9b83')
      ctx.fillStyle = shade('#eddfba',.7); ctx.fillRect(x+span*.42+SHADOW_OFFSET,y+SHADOW_OFFSET,span*.05,span)
      ctx.fillStyle = '#eddfba'; ctx.fillRect(x+span*.42,y,span*.05,span)
    }
  }
  const vPave = [width/2-road/2-curb,0,road+curb*2,height]
  const hPave = [0,height/2-road/2-curb,width,road+curb*2]
  const vInk = [width/2-road/2,0,road,height]
  const hInk = [0,height/2-road/2,width,road]
  // Pavement shadows go down first, so every kerb sits on top of its own shadow.
  const pavementShadow = shade(PAVEMENT,.6)
  ctx.fillStyle = pavementShadow
  for (const [x,y,w,h] of [vPave,hPave]) ctx.fillRect(x+SHADOW_OFFSET,y+SHADOW_OFFSET,w,h)
  ctx.fillStyle = PAVEMENT
  for (const [x,y,w,h] of [vPave,hPave]) ctx.fillRect(x,y,w,h)
  const kerbLight = tint(PAVEMENT,.6), kerbDark = shade(PAVEMENT,.7)
  for (const edge of [vPave[0]+Math.round(curb*.3), vPave[0]+vPave[2]-Math.round(curb*.3)]) {
    fold(ctx,Math.round(edge),0,height,true,kerbLight,kerbDark)
  }
  for (const edge of [hPave[1]+Math.round(curb*.3), hPave[1]+hPave[3]-Math.round(curb*.3)]) {
    fold(ctx,0,Math.round(edge),width,false,kerbLight,kerbDark)
  }
  // Asphalt casts its own shadow onto the kerbs before it is laid down.
  ctx.fillStyle = shade(ROAD_INK.city,.6)
  ctx.fillRect(vInk[0]+SHADOW_OFFSET,0,road,height)
  ctx.fillRect(0,hInk[1]+SHADOW_OFFSET,width,road)
  ctx.fillStyle = ROAD_INK.city
  ctx.fillRect(...vInk)
  ctx.fillRect(...hInk)
  const laneDashes = []
  for (let index=0;index<width;index+=width/12) {
    if (Math.abs(index+width/40-width/2)<road/2+curb) continue
    laneDashes.push([width/2-1,index,2,width/28],[index,height/2-1,width/28,2])
  }
  hardRects(ctx,laneDashes,MARKING,shade(ROAD_INK.city,.6))
  const kerbMarks = []
  for (const side of [-1,1]) {
    const edge = width/2+side*(road/2+curb*.6)
    for (let x=width/2-road*.4;x<width/2+road*.4;x+=road/8) {
      kerbMarks.push([x,edge-4,road/14,8],[edge-4,x,8,road/14])
    }
  }
  hardRects(ctx,kerbMarks,MARKING,pavementShadow)
  paintFibreGrain(ctx,width,height,9001,Math.min(4000,Math.round(width*height/180)),[MARKING,shade(ROAD_INK.city,.5)])
}
