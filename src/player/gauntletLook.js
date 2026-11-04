// Procedural, presentation-only mastery rewards. No loadout ownership or movement changes.
import * as THREE from 'three';
import {gauntletCosmetics} from '../game/gauntletRewards.js';
const disposeGroup=g=>g?.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();});
export function clearGauntletLook(player){
 const look=player.gauntletLook;if(!look)return;
 for(const {mesh,original,replacement}of look.sheen){if(mesh.material===replacement)mesh.material=original;replacement.dispose();}
 for(const group of look.groups){group.removeFromParent();disposeGroup(group);}
 player.gauntletLook=null;
}
export function updateGauntletLook(player,data,session={},dt=0){
 const competitive=!!(session.trial||session.remix||session.bossRush||session.rush||session.medalRun||session.boardRun||session.ranked||session.medalMode);
 const rewards=gauntletCosmetics(data,{competitive}),key=rewards.join('|'),model=player.model;
 if(!model?.root)return;
 if(player.gauntletLook?.key!==key||player.gauntletLook?.model!==model){
  clearGauntletLook(player);
  const look=player.gauntletLook={key,model,groups:[],sheen:[],t:0,trails:[],blink:null};
  const group=(parent)=>{const g=new THREE.Group();parent.add(g);look.groups.push(g);return g;};
  if(rewards.includes('steel-sheen'))model.root.traverse(mesh=>{
   if(!mesh.isMesh||Array.isArray(mesh.material)||mesh.userData.nobuGear)return;
   const original=mesh.material;if(!original?.color)return;
   const replacement=new THREE.MeshPhongMaterial({color:original.color,map:original.map,side:original.side,transparent:original.transparent,opacity:original.opacity,shininess:70,specular:0xb8c2d0});
   mesh.material=replacement;look.sheen.push({mesh,original,replacement});
  });
  const socket=model.neckSocket||model.root;
  model.root.updateWorldMatrix(true,true);const scale=socket.getWorldScale(new THREE.Vector3()).x||1;
  if(rewards.includes('crate-collar')||rewards.includes('blink-collar')||rewards.includes('crate-bandana')){
   const neck=group(socket);neck.scale.setScalar(1/Math.abs(scale));
   for(const[color,y,id]of[[0x4ac46b,0,'crate-collar'],[0x3ad0ff,.035,'blink-collar']])if(rewards.includes(id)){
    const m=new THREE.Mesh(new THREE.TorusGeometry(.16,.018,6,16),new THREE.MeshPhongMaterial({color,emissive:id==='blink-collar'?0x164e5a:0x102810}));m.rotation.x=Math.PI/2;m.position.y=y;neck.add(m);if(id==='blink-collar')look.blink=m.material;
   }
   if(rewards.includes('crate-bandana')){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.13,0,.14,.13,0,.14,0,-.20,.18],3));geometry.computeVertexNormals();
    neck.add(new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color:0xb87d38,side:THREE.DoubleSide})));
   }
  }
  if(rewards.includes('rainbow-trail')||rewards.includes('laundry-trail')){
   const trail=group(player.root),colors=rewards.includes('rainbow-trail')?[0xff6060,0xffb347,0xffe978,0x6fe78b,0x70b9ff,0xbb8cff]:[0xffffff];
   for(let i=0;i<8;i++){
    const m=new THREE.Mesh(new THREE.SphereGeometry(.07,5,4),new THREE.MeshBasicMaterial({color:colors[i%colors.length],transparent:true,opacity:.7*(1-i/9),depthWrite:false}));
    trail.add(m);look.trails.push(m);
   }
  }
 }
 const look=player.gauntletLook;look.t+=dt;
 if(look.blink)look.blink.emissiveIntensity=.4+.6*Math.abs(Math.sin(look.t*Math.PI*2));
 const moving=Math.hypot(player.vel?.x||0,player.vel?.z||0)>.5;
 look.trails.forEach((m,i)=>{m.visible=moving;m.position.set(-Math.sin(player.facing)*(i+1)*.15,.3+Math.sin(look.t*9-i)*.08,-Math.cos(player.facing)*(i+1)*.15);});
}
