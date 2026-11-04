import * as THREE from 'three';
import { releasePlayerRaft } from '../player/rideMotion.js';
import { Entity } from './entity.js';
import { audio } from '../audio/audio.js';
import { onCatStageDispose } from '../bosses/catResources.js';
import { raftBasketMesh,disposeRaftMesh } from './raftMesh.js';
import { raftSpanAt,raftFallAt,raftMountAllowed,raftHelp,RAFT_CAMERA,FOOT_CAMERA } from '../game/raft.js';

export class RaftController extends Entity {
 constructor(stage,track){super(stage,0,0,0);this.track=track;this.interactive=false;this.alwaysActive=true;this.current=null;this.boats=[];this.blend=null;this.disposed=false;onCatStageDispose(stage,()=>this.dispose());}
 addSpan(span){
  const make=(d,u)=>{const root=raftBasketMesh();root.position.copy(this.track.toWorld(d,u,span.cfg.y));root.rotation.y=this.track.yaw(d);this.stage.scene.add(root);return root;};
  const boats={span,moored:make(span.d0+1.2,0),beached:make(span.d1-1.2,(span.cfg.w/2)-1)};boats.beached.visible=false;this.boats.push(boats);
 }
 cameraTo(riding){
  const camera=this.game.camera;if(!camera)return;const to=riding?RAFT_CAMERA:FOOT_CAMERA;
  this.blend={t:0,from:{height:camera.opts?.height??to.height,dist:camera.opts?.dist??to.dist,ahead:camera.opts?.ahead??to.ahead,fov:camera.cam?.fov??to.fov},to};
 }
 mount(span,speedK=.5){
  const p=this.player;if(this.current===span&&p.ride?.raftSpan===span)return;
  p.setRide({...span.cfg,mesh:'raft',raftSpan:span});if(!p.ride)return;
  p.ride.raftSpan=span;p.ride.speedK=speedK;p.ride.speed=span.cfg.speed*raftHelp(this.session).speed;
  if(p.ride.meshKind==='raft')this.mountedMesh=p.ride.mesh;
  this.current=span;this.cameraTo(true);audio.play('splash');this.syncBoats();
 }
 dismount({hop=true}={}){
  if(!this.current)return;this.current=null;this.player.setRide(null);if(hop)this.player.vel.y=7.5;
  this.cameraTo(false);audio.play('splash');this.syncBoats();
 }
 syncBoats(){for(const b of this.boats){b.moored.visible=this.current!==b.span;b.beached.visible=this.current!==b.span&&(this.player.body.s??0)>=b.span.d1;}}
 restoreAtCheckpoint(pos){
  this.pendingRestore=false;this.fallHold=null;this.lastFall=null;
  const at=this.track.project(pos.x,pos.z),span=raftSpanAt(this.stage.raftSpans,at.s),water=span?this.track.heightAt(at.s)+span.cfg.y+.02:0;
  this.current=null;this.player.setRide(null);
  if(span&&!raftFallAt(span,at.s)&&Math.abs(pos.y-water)<=.65)this.mount(span,.35);else this.cameraTo(false);
  this.syncBoats();
 }
 onRespawn(){this.pendingRestore=true;}
 update(dt){
  const p=this.player,s=this.session;if(this.disposed||!p||s?.phase!=='level'||s.busy||s.dying||p.dead||p.frozen)return;
  if(this.pendingRestore){this.pendingRestore=false;this.restoreAtCheckpoint(s.cp?.pos??p.pos);}
  const distance=p.body.s??this.track.project(p.pos.x,p.pos.z).s,span=raftSpanAt(this.stage.raftSpans,distance);
  if(this.current){
   const water=this.track.heightAt(distance)+this.current.cfg.y+.02;
   if(span!==this.current)this.dismount();
   else if(p.body.grounded&&p.pos.y>water+.6)this.dismount({hop:false}); // optional aqueduct/raised landing
   else if(p.ride){p.ride.speed=this.current.cfg.speed*raftHelp(s).speed;}
  }
  if(!this.current&&raftMountAllowed(p,span,distance,span?this.track.heightAt(distance)+span.cfg.y+.02:0))this.mount(span);
  if(this.blend){const b=this.blend;b.t=Math.min(.6,b.t+dt);const k=b.t/.6,opts={track:this.track};for(const key of ['height','dist','ahead'])opts[key]=THREE.MathUtils.lerp(b.from[key],b.to[key],k);
   this.game.camera?.setMode('track',opts);const cam=this.game.camera?.cam;if(cam){cam.fov=THREE.MathUtils.lerp(b.from.fov,b.to.fov,k);cam.updateProjectionMatrix();}if(k===1)this.blend=null;
  }
  const fall=this.current&&raftFallAt(this.current,distance);
  const camera=this.game.camera;
  if(fall&&this.lastFall!==fall)this.fallHold={remaining:.3,y:camera?.trackY??p.pos.y};
  this.lastFall=fall;
  if(this.fallHold&&camera){const opts={...camera.opts,track:this.track};if(this.fallHold.remaining>0){opts.holdY=this.fallHold.y;this.fallHold.remaining-=dt;}else{delete opts.holdY;this.fallHold=null;}camera.setMode('track',opts);}
  this.syncBoats();
 }
 dispose(){if(this.disposed)return;this.disposed=true;for(const b of this.boats){disposeRaftMesh(b.moored);disposeRaftMesh(b.beached);}this.boats.length=0;releasePlayerRaft(this.player,this.mountedMesh);}
}
