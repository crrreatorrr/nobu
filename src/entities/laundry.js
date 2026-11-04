// Laundry-specific mechanics reuse the existing player/Enemy/payer contracts.
import * as THREE from 'three';
import { Entity } from './entity.js';
import { Mouse } from './enemies.js';
import { UpdraftFan } from './props.js';
import { toon } from '../player/nobuPrims.js';
import { audio } from '../audio/audio.js';
import { chaseDda } from './chaser.js';
const _point = new THREE.Vector3(), _direction = new THREE.Vector3();
const ironBody = new THREE.BoxGeometry(1.4,.65,2.4), ironSole = new THREE.BoxGeometry(1.42,.15,2.42);
export function ironMotion(t,d0,d1,period=5.6,out={}) {
  if (!(period>.8 && d1>d0)) throw new RangeError('Invalid Iron route');
  const travel=(period-.8)/2,phase=((t%period)+period)%period;
  let f,leg;
  if(phase<.4){f=0;leg=0;}
  else if(phase<.4+travel){f=.5-.5*Math.cos((phase-.4)/travel*Math.PI);leg=1;}
  else if(phase<.8+travel){f=1;leg=2;}
  else{f=.5+.5*Math.cos((phase-.8-travel)/travel*Math.PI);leg=3;}
  out.d=d0+(d1-d0)*f;out.leg=leg;out.dir=leg<2?1:-1;return out;
}
export class Iron extends Entity {
  constructor(stage,track,d0,d1,{x=0,y=0,period=5.6}={}) {
    super(stage,...(track.authorToWorld||track.toWorld).call(track,d0,x,y).toArray());
    Object.assign(this,{track,d0,d1,x,y,period,t:0,puffT:0,hazard:true,motion:{}});
    const body=new THREE.Mesh(ironBody,toon(0xd8dde6));body.position.y=.475;
    const sole=new THREE.Mesh(ironSole,new THREE.MeshStandardMaterial({color:0xff6a3a,emissive:0xff4a18,emissiveIntensity:.8}));sole.position.y=.075;
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.35,.09,6,14,Math.PI),toon(0x343844));handle.position.set(0,.8,0);handle.rotation.y=Math.PI/2;
    this.obj.add(body,sole,handle);this.setBox(1.4,.8,2.4);this.place();
  }
  place() {
    ironMotion(this.t,this.d0,this.d1,this.period,this.motion);
    (this.track.authorToWorld||this.track.toWorld).call(this.track,this.motion.d,this.x,this.y,this.pos);
    const yaw=this.track.yaw(this.motion.d),c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw));
    this.size.w=1.4*c+2.4*s;this.size.d=1.4*s+2.4*c;this.updateBox();
    this.obj.position.copy(this.pos);this.obj.rotation.y=yaw+(this.motion.dir<0?Math.PI:0);
  }
  update(dt) {
    const leg=this.motion.leg;this.t+=dt*chaseDda(this.session);this.place();
    if((leg===1&&this.motion.leg===2)||(leg===3&&this.motion.leg===0))audio.play('whoosh');
    this.puffT-=dt;
    if(dt>0&&this.puffT<=0&&this.distToPlayer()<22){
      this.puffT=.2;(this.track.authorToWorld||this.track.toWorld).call(this.track,this.motion.d+this.motion.dir*1.6,this.x,this.y+.2,_point);
      this.fx?.smokeCard?.(_point.x,_point.y,_point.z,{size:.24,life:.5,colors:[0xffffff],vy:1.8,g:0,alpha:.6});
    }
  }
  onTouch(p){p.hurt('flat',this.pos.x,this.pos.z);}
  onRespawn(){this.t=0;this.puffT=0;this.place();}
}
export class SteamFan extends UpdraftFan {
  constructor(stage,x,y,z,options={}){
    super(stage,x,y,z,options);this.steam=true;
    this.obj.children[0].material.color.setHex(0xc8a040);this.col.material.color.setHex(0xffffff);this.col.material.opacity=.08;
  }
}
export class DustBunny extends Mouse {
  constructor(stage,x,y,z,options={}){
    super(stage,x,y,z,options);this.half=!!options.half;this.spawned=[];this.fleeT=this.half?2:0;
    const mouseModel=this.glbWrap;this.useModel('model_dust_bunny',1.15);
    const fallback=!this.glbWrap||this.glbWrap===mouseModel;this.dustScale=fallback?1.3:1;
    if(fallback)this.model.traverse(part=>{if(part.isMesh&&part.material){const tint=mat=>{const copy=mat.clone();copy.color?.setHex(0x9c9ca4);return copy;};part.material=Array.isArray(part.material)?part.material.map(tint):tint(part.material);}});
    this.onReset();
    if(this.half){this.size.w*=.5;this.size.h*=.5;this.size.d*=.5;this.shadow.scale.multiplyScalar(.5);this.updateBox();}
  }
  onReset(){this.model.scale.setScalar((this.dustScale??1)*(this.half?.5:1));this.visible=true;this.fleeT=this.half?2:0;}
  behave(dt){
    if(this.fleeT>0){
      this.fleeT=Math.max(0,this.fleeT-dt);
      _direction.copy(this.pos).sub(this.player.pos).setY(0);if(_direction.lengthSq()<.01)_direction.set(this.opts.side||1,0,0);_direction.normalize();
      this.pos.addScaledVector(_direction,4*dt);this.facing=Math.atan2(_direction.x,_direction.z);
      const tr=this.stage.track;if(tr){const q=tr.project(this.pos.x,this.pos.z,-1,this._projection||={}),wall=tr.wallAt(q.s);if(wall)tr.toWorld(q.s,Math.max(-wall.left+.5,Math.min(wall.right-.5,q.u)),this.pos.y-tr.heightAt(q.s),this.pos);}
      this.followGround();this.glbMotion(dt,true,2.2);
      if(!this.fleeT){this.home.copy(this.pos);this.off=0;}
    }else super.behave(dt);
    if(this.distToPlayer()<14&&Math.random()<dt*6)this.fx?.puff?.(this.pos.x,this.pos.y+.25,this.pos.z,{count:1,color:0xd8d8d8,size:this.half?.06:.12,speed:.4,life:.4});
  }
  onBite(p){
    if(!this.alive)return;
    if(this.half){this.knock(p.pos);return;}
    this.knock(p.pos);this.dead=true;this.visible=false;this.obj.visible=false;
    for(const side of [-1,1])this.spawned.push(this.stage.add(new DustBunny(this.stage,this.pos.x+side*.35,this.pos.y,this.pos.z,{...this.opts,half:true,side})));
  }
  onRespawn(){
    const old=this.spawned;
    for(const child of old){child.dead=true;child.obj.removeFromParent();child.shadow.material?.dispose();}
    this.stage.entities=this.stage.entities.filter(e=>!old.includes(e));this.spawned=[];this.onReset();
  }
}
// Wrap once rather than broadening the shared Enemy update/reset implementation.
export function armAmbush(enemy,track,{at,drop=5}){
  const behave=enemy.behave.bind(enemy),respawn=enemy.onRespawn?.bind(enemy);
  const state=enemy.ambush={at,drop,mode:'armed',vy:0};
  const arm=()=>{state.mode='armed';state.vy=0;enemy.pos.copy(enemy.home);enemy.pos.y+=drop;enemy.visible=false;enemy.obj.visible=false;enemy.interactive=false;enemy.updateBox();enemy.obj.position.copy(enemy.pos);};
  enemy.behave=function(dt){
    if(state.mode==='active'){behave(dt);return;}
    if(state.mode==='armed'){
      if((enemy.player.body.s??0)<at)return;
      state.mode='fall';enemy.visible=true;enemy.obj.visible=true;audio.play('whoosh');
    }
    state.vy-=25*dt;enemy.pos.y+=state.vy*dt;
    if(enemy.pos.y<=enemy.home.y){enemy.pos.y=enemy.home.y;state.mode='active';enemy.interactive=true;enemy.fx?.dust?.(enemy.pos.x,enemy.pos.y,enemy.pos.z,{count:6,size:.2,color:0xd8d0c0});}
  };
  enemy.onRespawn=()=>{respawn?.();arm();};arm();return enemy;
}
const jarBody=new THREE.CylinderGeometry(.9,1,1.1,18),jarLid=new THREE.CylinderGeometry(1.02,1.02,.16,18);
export function cookieJar(tray){
  for(const part of tray.obj.children)if(part!==tray.label)part.visible=false;
  const body=new THREE.Mesh(jarBody,toon(0xd8a060)),lid=new THREE.Mesh(jarLid,toon(0x9a673b));body.position.y=.55;lid.position.y=1.18;
  tray.obj.add(body,lid);tray.skin='jar';return tray;
}

// This authored replay reward unlocks only when its own Dust Wall opens. The
// literal alcove permits walking around that wall; a visible cage makes the lock
// understandable from either approach without changing global Hidden Bone rules.
export function gateLaundryBone(bone,wall){
  const cage=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.25,1.9,1.25)),new THREE.LineBasicMaterial({color:0xb0b0c0,transparent:true,opacity:.8}));
  cage.position.y=.95;bone.obj.add(cage);
  const update=bone.update.bind(bone),collect=bone.collect.bind(bone);
  const sync=()=>{cage.visible=!wall.broken;bone.bone.material.color.setHex(wall.broken?0x74ffff:0x8a8a90);bone.bone.material.opacity=bone.owned?.22:wall.broken?1:.35;};
  bone.collect=()=>{if(!wall.broken){bone.game.ui.tutorial('dustwall');return;}collect();};
  bone.update=dt=>{update(dt);sync();};sync();bone.dustWall=wall;return bone;
}
