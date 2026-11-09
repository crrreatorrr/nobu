// Reusable procedural house props; all geometry joins Stage's existing decor batch.
import * as THREE from 'three';
const box=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,12),sphere=new THREE.SphereGeometry(1,8,6),ring=new THREE.TorusGeometry(1,.12,6,18),disc=new THREE.CircleGeometry(1,18);
export function houseProp(stage,kind,x,y,z,scale=1,yaw=0){
  const c=Math.cos(yaw),s=Math.sin(yaw);
  const part=(geo,color,px,py,pz,sx,sy,sz,rx=0)=>stage.decor(geo,color,new THREE.Vector3(x+(px*c+pz*s)*scale,y+py*scale,z+(pz*c-px*s)*scale),new THREE.Euler(rx,yaw,0),new THREE.Vector3(sx*scale,sy*scale,sz*scale));
  const timber=0x8a5a32,steel=0xb8bec4;
  switch(kind){
    case 'washer':
      part(box,0xe8e8e2,0,1.65,0,3.4,3.3,2.3);part(disc,0x254854,0,1.65,1.17,1.08,1.08,1);part(ring,steel,0,1.65,1.2,1.1,1.1,.6);part(box,0x8b8f94,0,2.95,1.18,2.8,.25,.08);break;
    case 'basket':
      part(cylinder,0xd0a66c,0,.85,0,1.15,1.7,1.15);part(ring,0xe9c68a,0,1.72,0,1.15,1.15,1.15,Math.PI/2);part(sphere,0xe0edf8,.1,1.7,0,.85,.35,.85);break;
    case 'shelf':
      part(box,timber,0,2.5,-.55,3.4,5,.15);
      for(const side of [-1,1])part(box,timber,side*1.63,2.5,0,.15,5,1.2);
      for(let i=0;i<4;i++)part(box,0xb0804b,0,.08+i*1.6,0,3.3,.16,1.2);
      for(let i=0;i<9;i++)part(box,[0xd84a3a,0x3a7ad8,0x3ab060,0xe8b02a][i%4],-1.3+i*.32,.72,0,.27,1.2,.6);break;
    case 'lamp':part(cylinder,0x444450,0,2.3,0,.07,4.6,.07);part(cylinder,0xeee2bd,0,4.8,0,.85,1.1,.85);part(cylinder,0x444450,0,.1,0,.6,.2,.6);break;
    case 'pot':part(cylinder,0xc66a40,0,.6,0,.7,1.2,.7);for(const side of [-1,0,1])part(sphere,0x4f945d,side*.4,1.5,0,.45,.8,.4);break;
    case 'books':for(let i=0;i<5;i++)part(box,[0x5c75a9,0xab694d,0x6f915c][i%3],0,.15+i*.3,0,1.8,.25,1.2);break;
    case 'chair':part(box,timber,0,2,0,2.6,.25,2.4);part(box,timber,0,3.4,-1.15,2.6,2.7,.22);for(const a of [-1,1])for(const b of [-1,1])part(box,timber,a*1.05,.95,b*.95,.22,1.9,.22);break;
    case 'sock':part(sphere,0xe7e8eb,0,.12,0,.4,.13,.18);part(sphere,0xe7e8eb,-.25,.18,0,.16,.23,.18);break;
    case 'block':part(box,0xe7b144,0,.15,0,.3,.3,.3);break;
    case 'crumb':part(sphere,0xc98e4c,0,.07,0,.12,.09,.1);break;
    case 'crate':part(box,0x926344,0,.8,0,1.6,1.6,1.6);part(box,0xc19359,0,.8,.82,.12,1.6,.07);break;
    case 'pipe':part(cylinder,0xb06a3a,0,2.2,0,.3,4.4,.3);for(const h of [.5,2.3,4.1])part(ring,0x815037,0,h,0,.34,.34,.34,Math.PI/2);break;
    case 'vat':part(cylinder,0xb06a3a,0,1.3,0,1.2,2.6,1.2);part(ring,0x815037,0,2.6,0,1.2,1.2,1.2,Math.PI/2);break;
    default:throw new RangeError(`Unknown house prop ${kind}`);
  }
}
