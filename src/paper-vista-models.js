import * as THREE from 'three'

/** Merge paper parts and bake face shading: one draw per instanced landmark family. */
export function createVistaGeometry(kind) {
  const parts = []
  const box = (size, at, tone = 1) => parts.push({ geometry: new THREE.BoxGeometry(...size), at, tone })
  const cone = (radius, height, at, tone = 1, sides = 4) => parts.push({ geometry: new THREE.ConeGeometry(radius,height,sides), at, tone })
  const triangle = (points, tone = 1) => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3))
    geometry.computeVertexNormals(); parts.push({ geometry, at:[0,0,0], tone })
  }
  if (kind === 'lighthouse') {
    parts.push({ geometry:new THREE.CylinderGeometry(.25,.4,1.7,6), at:[0,.85,0], tone:1 })
    box([.75,.24,.75],[0,1.7,0],.75)
    cone(.55,.4,[0,2.02,0],.65,6)
    box([.12,.34,.03],[0,1.55,-.4],.35)
  } else if (kind === 'sailboat') {
    box([1.4,.14,.5],[0,.07,0],.55)
    box([.045,1.6,.045],[0,.85,0],.65)
    triangle([[0,1.65,0],[-.65,.4,0],[0,.4,0]])
    triangle([[.06,1.5,.03],[.6,.4,.03],[.06,.4,.03]],.84)
  } else if (kind === 'crystal') {
    cone(.4,1.8,[0,.9,0],1,5)
    cone(.3,1.1,[-.35,.55,.1],.8,5)
    cone(.25,.8,[.35,.4,.1],.65,5)
  } else if (kind === 'tree') {
    box([.14,.7,.14],[0,.35,0],.5)
    cone(.6,1.2,[0,.95,0],.76)
    cone(.46,1,[0,1.5,0],.9)
  } else if (kind === 'book') {
    for (let level = 0; level < 4; level++) {
      box([1+.08*(level%2),.22,1.4],[0,.15+level*.26,0],level%2 ? .65 : .85)
      box([1.05,.035,1.45],[0,.28+level*.26,0],.5)
      box([.9,.025,.01],[0,.15+level*.26,-.705],1)
    }
  } else {
    box([1,.7,1],[0,.35,0],.92)
    triangle([[-.6,.7,-.6],[.6,.7,-.6],[0,1.12,-.6]],.68)
    triangle([[-.6,.7,.6],[0,1.12,.6],[.6,.7,.6]],.68)
    triangle([[-.6,.7,-.6],[0,1.12,-.6],[0,1.12,.6]],.7)
    triangle([[-.6,.7,-.6],[0,1.12,.6],[-.6,.7,.6]],.7)
    triangle([[.6,.7,-.6],[.6,.7,.6],[0,1.12,.6]],.83)
    triangle([[.6,.7,-.6],[0,1.12,.6],[0,1.12,-.6]],.83)
    for (const x of [-.28,.28]) box([.18,.22,.025],[x,.43,-.515],.3)
    box([.17,.35,.025],[0,.175,-.515],.52)
    if (kind === 'windmill') {
      box([.1,1.4,.1],[0,1.15,-.65],.55)
      for (const rotation of [Math.PI/4,-Math.PI/4]) {
        const geometry = new THREE.BoxGeometry(1.6,.1,.05); geometry.rotateZ(rotation)
        parts.push({ geometry,at:[0,1.55,-.72],tone:1 })
      }
    }
  }
  const vertices = [], colors = []
  for (const { geometry, at, tone } of parts) {
    const raw = geometry.index ? geometry.toNonIndexed() : geometry
    const position = raw.getAttribute('position'), normal = raw.getAttribute('normal')
    for (let i = 0; i < position.count; i++) {
      vertices.push(position.getX(i)+at[0],position.getY(i)+at[1],position.getZ(i)+at[2])
      const shade = tone*(.83+Math.max(-.12,normal?.getY(i)*.15+normal?.getX(i)*.07 || 0))
      colors.push(shade,shade,shade)
    }
    if (raw !== geometry) raw.dispose()
    geometry.dispose()
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3))
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.computeBoundingBox()
  const size = geometry.boundingBox.getSize(new THREE.Vector3()), center = geometry.boundingBox.getCenter(new THREE.Vector3())
  geometry.translate(-center.x,-geometry.boundingBox.min.y,-center.z)
  geometry.scale(1/size.x,1/size.y,1/size.z)
  geometry.computeVertexNormals()
  return geometry
}
