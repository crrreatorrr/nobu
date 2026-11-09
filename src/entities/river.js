import * as THREE from 'three';
import { Entity } from './entity.js';
import { Hazard } from './ride.js';
import { logMesh } from './props.js';
import { Solid } from '../world/physics.js';
import { toon } from '../player/nobuPrims.js';
import { canvasTex,clamp } from '../core/util.js';
import { audio } from '../audio/audio.js';
import { raftHelp } from '../game/raft.js';
import { ownRiverRoot } from './riverResources.js';
const surfaceY=(track,d)=>track.heightAt(d)-.97;
const authoredWorld=(track,...args)=>(track.authorToWorld||track.toWorld).call(track,...args);
const addPush=(p,x,z)=>{p.pushX=(p.pushX||0)+x;p.pushZ=(p.pushZ||0)+z;};
function ringTexture(){return canvasTex(128,128,g=>{g.strokeStyle='#f0fff7';g.lineWidth=5;for(let i=0;i<48;i++){const a=i*.4,r=4+i*1.15;g.beginPath();g.arc(64,64,r,a,a+.24);g.stroke();}});}
export class Whirlpool extends Entity {
 constructor(stage,track,x,d,{r=3,pull=3.2,kill=.9}={}){
  const at=authoredWorld(track,d,x,-.97);super(stage,...at.toArray());Object.assign(this,{track,d,r,pull,kill});this.interactive=false;this.alwaysActive=true;this.entered=false;this.emit=0;
  const texture=ringTexture();this.foam=new THREE.Mesh(new THREE.CircleGeometry(r,40),new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide}));this.foam.rotation.x=-Math.PI/2;this.obj.add(this.foam);this.dispose=ownRiverRoot(stage,this.obj,[texture]);
 }
 update(dt){
  this.foam.rotation.z-=dt*.6*(this.track.mirror?-1:1);const p=this.player,dx=this.pos.x-p.pos.x,dz=this.pos.z-p.pos.z,dist=Math.hypot(dx,dz),near=dist<this.r+2;
  if(near&&!this.entered)audio.play('suck',.45);this.entered=near;
  const water=surfaceY(this.track,p.body.s??this.d);if(dist<this.r&&p.pos.y<water+2&&!p.dead&&!p.frozen){const force=this.pull*raftHelp(this.session).force*clamp(1.4-dist/this.r,.3,1.2);if(dist>.001)addPush(p,dx/dist*force,dz/dist*force);if(dist<this.kill&&p.body.grounded&&Math.abs(p.pos.y-water)<.3)p.hurt('whirl');}
  this.emit-=dt;if(near&&this.emit<=0){this.emit=.5;this.fx?.dust?.(this.pos.x,this.pos.y,this.pos.z,{count:1,size:.3,color:0x9a8aa8,speed:.5,life:.5});}
 }
}
export class Outflow extends Entity {
 constructor(stage,track,d,{side='left',push=3.5,period=3,phase=0,width=6,len=3}={}){
  if(track.mirror)side=side==='left'?'right':'left';
  const wall=track.wallAt(d),bank=side==='left'?-(wall?.left??4.6):(wall?.right??4.6),at=track.toWorld(d,bank,-.65);super(stage,...at.toArray());Object.assign(this,{track,d,side,push,period,phase,width,len,bank});this.interactive=false;this.alwaysActive=true;this.told=-Infinity;this.emit=0;
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.56,.56,.9,16,true),toon(0x6b7370));pipe.rotation.z=Math.PI/2;this.obj.rotation.y=track.yaw(d);this.obj.add(pipe);this.pipe=pipe;
  this.spray=new THREE.Mesh(new THREE.ConeGeometry(.45,1.2,16),new THREE.MeshBasicMaterial({color:0xd3ece1,transparent:true,opacity:.35,depthWrite:false}));this.spray.rotation.z=side==='left'?-Math.PI/2:Math.PI/2;this.spray.position.x=side==='left'?.7:-.7;this.obj.add(this.spray);this.dispose=ownRiverRoot(stage,this.obj);
 }
 stateAt(time){const t=time+this.phase,tau=((t%this.period)+this.period)%this.period;return{on:tau<this.period*.45-1e-9,tell:tau+1e-9>=this.period-.8,cycle:Math.floor(t/this.period),tau};}
 update(dt){
  const state=this.stateAt(this.stage.time||0),p=this.player,near=this.distToPlayer()<18;this.spray.visible=state.on||state.tell;this.spray.scale.setScalar(state.on?1:.3);this.pipe.material.emissive.setHex(state.tell?0x224c3c:0);
  if(state.tell&&this.told!==state.cycle){this.told=state.cycle;if(near)audio.play('gurgle',.5);}
  const s=p.body.s??0,u=p.body.u??0,inStrip=this.side==='left'?u>=this.bank&&u<=this.bank+this.width:u<=this.bank&&u>=this.bank-this.width;
  if(state.on&&Math.abs(s-this.d)<=this.len/2&&inStrip&&p.pos.y<surfaceY(this.track,s)+2.4&&!p.dead&&!p.frozen){const right=this.track.right(this.d,new THREE.Vector3()),sign=this.side==='left'?1:-1,force=this.push*raftHelp(this.session).force;addPush(p,right.x*sign*force,right.z*sign*force);}
  this.emit-=dt;if(near&&this.emit<=0&&(state.on||state.tell)){this.emit=state.on?.08:.25;this.fx?.dust?.(this.pos.x,this.pos.y,this.pos.z,{count:1,size:state.on?.3:.15,color:0xd9f2e7,speed:state.on?3:.4,life:.5});}
 }
}
export class Slick extends Entity {
 constructor(stage,track,d0,d1,{x=0,w=4}={}){
  x=track.authorU?track.authorU(x):x;
  const at=track.toWorld((d0+d1)/2,x,-.97);super(stage,...at.toArray());Object.assign(this,{track,d0,d1,x,w});this.interactive=false;this.alwaysActive=true;this.loop=0;
  const vertices=[],indices=[];for(let i=0,n=Math.ceil((d1-d0)/.5);i<=n;i++){const d=d0+(d1-d0)*i/n;for(const u of [x-w/2,x+w/2]){const q=track.toWorld(d,u,-.97);vertices.push(q.x-at.x,q.y-at.y,q.z-at.z);}if(i){const b=i*2;indices.push(b-2,b,b-1,b-1,b,b+1);}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();this.surface=new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:0x4a3a5a,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false}));this.obj.add(this.surface);this.dispose=ownRiverRoot(stage,this.obj);
 }
 update(dt){const p=this.player,s=p.body.s??0,u=p.body.u??0;this.surface.material.opacity=.68+Math.sin((this.stage.time||0)*1.2)*.07;if(p.ride?.meshKind==='raft'&&s>=this.d0&&s<=this.d1&&Math.abs(u-this.x)<=this.w/2&&p.pos.y<surfaceY(this.track,s)+.65){p.ride.slick=.25;p.ride.slickFresh=true;}
  this.loop-=dt;if(this.loop<=0&&this.distToPlayer()<8){this.loop=1.4;audio.play('sizzle',.2);}
 }
}
export class DriftLog extends Hazard {
 constructor(stage,track,d,{x=0,range=3,speed=1.4,w=2.6,phase=0}={}){
  const at=authoredWorld(track,d,x,-1);super(stage,...at.toArray(),'splash');Object.assign(this,{track,d,x,range,speed,w,phase});this.alwaysActive=true;this.t=0;
  logMesh(stage,at,track.yaw(d),w);const log=stage.scene.children.at(-1);log.position.set(0,.4,0);log.rotation.y=0;this.obj.add(log);this.obj.rotation.y=track.yaw(d);
  const yaw=track.yaw(d),c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw));this.half={x:(w*c+.8*s)/2,z:(w*s+.8*c)/2};this.setBox(this.half.x*2,.9,this.half.z*2,-.05);
  this.solid=stage.world.add(new Solid({x:at.x-this.half.x,y:at.y-.05,z:at.z-this.half.z},{x:at.x+this.half.x,y:at.y+.85,z:at.z+this.half.z},{kind:'moving',ref:this}));this.dispose=ownRiverRoot(stage,this.obj);
 }
 update(dt){this.t+=dt;authoredWorld(this.track,this.d,this.x+Math.sin(this.t*this.speed+this.phase)*this.range,-1,this.pos);this.obj.position.copy(this.pos);this.solid.setCenter(this.pos.x,this.pos.y-.05,this.pos.z,this.half.x*2,.9,this.half.z*2);this.solid.enabled=!this.player.ride;this.updateBox();}
 onTouch(p){if(p.ride)super.onTouch(p);}
 onSlide(p){if(p.ride)super.onSlide(p);}
 smash(){super.smash();this.solid.enabled=false;}
 onRespawn(){super.onRespawn();this.t=0;this.solid.enabled=!this.player.ride;this.update(0);this.solid.delta={x:0,y:0,z:0};}
}
export class FloatDisc extends Entity {
 constructor(stage,pack){super(stage,...pack.pos.toArray());this.pack=pack;this.interactive=false;const texture=canvasTex(64,64,g=>{g.fillStyle='#70a668';g.beginPath();g.arc(32,32,30,0,7);g.fill();g.strokeStyle='#acd69a';g.lineWidth=3;g.beginPath();g.moveTo(32,32);g.lineTo(62,32);g.stroke();});const disc=new THREE.Mesh(new THREE.CircleGeometry(.9,24),new THREE.MeshLambertMaterial({map:texture,transparent:true,side:THREE.DoubleSide}));disc.rotation.x=-Math.PI/2;disc.position.y=.01;this.obj.add(disc);this.dispose=ownRiverRoot(stage,this.obj,[texture]);}
 update(){this.visible=!this.pack.broken&&!this.pack.dead;this.obj.visible=this.visible;this.obj.position.y=this.pos.y+Math.sin((this.stage.time||0)*2)*.04;}
}
export class PityLily extends Entity {
 constructor(stage,track,span,fall){const d=(fall[0]+fall[1])/2,at=track.toWorld(d,0,span.cfg.y);super(stage,...at.toArray());Object.assign(this,{track,span,fall,d});this.alwaysActive=true;this.interactive=false;this.visible=false;
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,.16,32),toon(0x58a854));pad.position.y=-.08;this.obj.add(pad);this.solid=stage.world.add(new Solid({x:at.x-1.6,y:at.y-.16,z:at.z-1.6},{x:at.x+1.6,y:at.y,z:at.z+1.6},{ref:this}));this.solid.enabled=false;this.dispose=ownRiverRoot(stage,this.obj);
 }
 update(){const cp=this.session?.cp?.pos,cpd=cp?this.track.project(cp.x,cp.z).s:-Infinity,next=this.span.falls.find(([a])=>a>cpd);this.visible=raftHelp(this.session).lily&&next===this.fall;this.obj.visible=this.visible;this.solid.enabled=this.visible;}
 onRespawn(){this.update();}
}
