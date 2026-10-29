import * as THREE from 'three'

/** Physical workshop silhouette around the portal; every panel stays outside its opening. */
export function createBossWorkshop({ kind = 'scissors', halfWidth = 4.8, halfHeight = 4.4 } = {}) {
 const group = new THREE.Group()
 group.name = 'bossWorkshop'
 const colors = {scissors:0xb95442,wind:0x3b8199,stapler:0xc79538,punch:0x9d5b80}
 const stock = new THREE.MeshStandardMaterial({color:colors[kind] || colors.scissors,roughness:.92})
 const paper = new THREE.MeshStandardMaterial({color:0xffe7b7,roughness:1})
 const ink = new THREE.MeshStandardMaterial({color:0x29373e,roughness:.9})
 const box = new THREE.BoxGeometry(1,1,1)
 const bolt = new THREE.CylinderGeometry(.16,.16,.13,8); bolt.rotateX(Math.PI/2)
 const addBox=(x,y,w,h,material,z=.55)=>{
  const mesh=new THREE.Mesh(box,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,.45);group.add(mesh);return mesh
 }
 for(const side of [-1,1]) {
  const x=side*(halfWidth+1.8)
  addBox(x,0,.72,halfHeight*2+3.5,ink,.85)
  addBox(x,0,.48,halfHeight*2+3.3,stock,.48)
  for(const edge of [-1,1]) {
   const pin=new THREE.Mesh(bolt,paper);pin.position.set(x,edge*(halfHeight+1.25),.1);group.add(pin)
  }
  for(let row=0;row<3;row++) {
   const mark=addBox(x,-1+row*.7,.3,.22,paper,.15);mark.rotation.z=side*.4
  }
 }
 for(const edge of [-1,1]) {
  addBox(0,edge*(halfHeight+1.5),halfWidth*2+4.3,.7,ink,.85)
  addBox(0,edge*(halfHeight+1.5),halfWidth*2+4.05,.44,stock,.5)
 }
 return group
}
