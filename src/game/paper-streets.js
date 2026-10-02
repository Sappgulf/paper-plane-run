import { getPaperPalette } from './paper-art.js'
import { ROAD_LANES_X } from './ground-life.js'

export const STREET_BLOCK_SIZE = 35
export const STREET_WIDTH = 6.6
const ROAD_INK = {city:'#687580',storm:'#5c536e',sunset:'#a07b5d',aurora:'#5c8fa3',midnight:'#35364d'}

/** A continuous street tile; all paint stops at junctions and shares paper stock. */
export function createStreetCanvas({zoneId = 'city',crossStreet = false,canvasFactory} = {}) {
  const width = crossStreet ? 1024 : 256, height = crossStreet ? 128 : 512
  const canvas = canvasFactory ? canvasFactory(width,height) : globalThis.document?.createElement('canvas')
  if (!canvas) return null
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d'), p = getPaperPalette(zoneId)
  if (!ctx) return canvas
  ctx.fillStyle = ROAD_INK[zoneId] || '#a88f6c'; ctx.fillRect(0,0,width,height)
  if (zoneId === 'harbor') {
    ctx.strokeStyle = '#6c614e'; ctx.lineWidth = 2
    for (let y=0;y<height;y+=height/16) {
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(width,y); ctx.stroke()
      ctx.fillStyle = '#655944'; ctx.fillRect(18,y+5,3,3); ctx.fillRect(width-21,y+5,3,3)
    }
    return canvas
  }
  const pavement = '#ddd2ba', marking = '#fff1d6'
  ctx.fillStyle = pavement
  if (crossStreet) {
    ctx.fillRect(0,0,width,18); ctx.fillRect(0,height-18,width,18)
    // Cut the pavement back where the four longitudinal streets meet it.
    for (const lane of ROAD_LANES_X) for (const side of [-1,1]) {
      const x = (side*lane+32)/64*width
      ctx.fillStyle = ROAD_INK[zoneId]; ctx.fillRect(x-STREET_WIDTH/128*width,0,STREET_WIDTH/64*width,height)
    }
    ctx.fillStyle = marking
    for (let x=0;x<width;x+=48) {
      const worldX = (x+14)/width*64-32
      if (ROAD_LANES_X.some(lane=>Math.abs(Math.abs(worldX)-lane)<STREET_WIDTH/2+.5)) continue
      ctx.fillRect(x,62,28,4)
    }
  } else {
    const curb = width*.13
    ctx.fillRect(0,0,curb,height); ctx.fillRect(width-curb,0,curb,height)
    ctx.fillStyle = p.paper
    ctx.fillRect(curb-3,0,3,height); ctx.fillRect(width-curb,0,3,height)
    ctx.fillStyle = marking
    for (let y=0;y<height;y+=40) {
      if (zoneId === 'city' && Math.abs(y+10-height/2)<height*.13) continue
      ctx.fillRect(width/2-2,y,4,21)
    }
    if (zoneId === 'city') {
      // The crossing aligns to the same 35-unit block as the world ground.
      const junction = STREET_WIDTH/STREET_BLOCK_SIZE*height
      ctx.fillStyle = ROAD_INK.city; ctx.fillRect(0,height/2-junction/2,width,junction)
      ctx.fillStyle = marking
      for (const y of [height/2-junction/2-22,height/2+junction/2+6]) {
        for (let x=curb+8;x<width-curb-8;x+=22) ctx.fillRect(x,y,13,15)
      }
    }
  }
  ctx.strokeStyle = 'rgba(51,43,53,.16)'; ctx.lineWidth = 1
  for (let y=0;y<height;y+=32) {
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(crossStreet ? width : width*.13,y); ctx.stroke()
    if (!crossStreet) {ctx.beginPath();ctx.moveTo(width*.87,y);ctx.lineTo(width,y);ctx.stroke()}
  }
  return canvas
}

/** City floor is an aligned street grid with parks, lots and folded curbs. */
export function paintCityBlocks(ctx,width,height) {
  ctx.fillStyle = '#e6ddc9'; ctx.fillRect(0,0,width,height)
  const road = STREET_WIDTH/STREET_BLOCK_SIZE*width, curb = width*.034
  for (let row=0;row<2;row++) for (let col=0;col<2;col++) {
    const x = col*width*.5+width*.05, y = row*height*.5+height*.05
    const span = width*.32
    ctx.fillStyle = (row+col)%2 ? '#cfbba2' : '#a6baa3'; ctx.fillRect(x,y,span,span)
    ctx.fillStyle = '#f6efdf'; ctx.fillRect(x+8,y+8,span-16,3)
    if ((row+col)%2) {
      for (let i=0;i<3;i++) {ctx.fillStyle=['#d79074','#ddb87d','#afbac3'][i];ctx.fillRect(x+12+i*span*.27,y+span*.18,span*.2,span*.5)}
    } else {
      ctx.fillStyle = '#7c9b83'
      for (const dx of [.2,.6]) {ctx.beginPath();ctx.arc(x+span*dx,y+span*.5,span*.12,0,Math.PI*2);ctx.fill()}
      ctx.fillStyle = '#eddfba'; ctx.fillRect(x+span*.42,y,span*.05,span)
    }
  }
  ctx.fillStyle = '#ddd2ba'
  ctx.fillRect(width/2-road/2-curb,0,road+curb*2,height)
  ctx.fillRect(0,height/2-road/2-curb,width,road+curb*2)
  ctx.fillStyle = ROAD_INK.city
  ctx.fillRect(width/2-road/2,0,road,height)
  ctx.fillRect(0,height/2-road/2,width,road)
  ctx.fillStyle = '#fff1d6'
  for (let index=0;index<width;index+=width/12) {
    if (Math.abs(index+width/40-width/2)<road/2+curb) continue
    ctx.fillRect(width/2-1,index,2,width/28)
    ctx.fillRect(index,height/2-1,width/28,2)
  }
  for (const side of [-1,1]) {
    const edge = width/2+side*(road/2+curb*.6)
    for (let x=width/2-road*.4;x<width/2+road*.4;x+=road/8) {
      ctx.fillRect(x,edge-4,road/14,8)
      ctx.fillRect(edge-4,x,8,road/14)
    }
  }
}
