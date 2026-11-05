import * as THREE from 'three';
import {simJump} from '../src/levels/gauntletMath.js';
import {moveBody} from '../src/world/physics.js';

// Real collision oracle. Integrator supplies vertical samples, never teleport landings.
export function pipelineJump(f,from,to,options={}){
 const start=f.k.W(...from),end=f.k.W(...to),trace=simJump({...options,dy:end.y-start.y});
 if(!trace)return{passed:false,reason:'no-arc'};
 const dx=end.x-start.x,dz=end.z-start.z,speed=Math.hypot(dx,dz)/trace.air;
 if(speed>(options.speed??8)+.001)return{passed:false,reason:'speed',speed};
 let landing=null;
 const body=options.realPlayer?f.p.body:{pos:start.clone(),vel:new THREE.Vector3(),hw:.3,hd:.3,h:1.3};
 body.pos.copy(start);body.vel.set(0,0,0);body.grounded=false;body.ground=null;body.onHead=()=>{head=true;};
 if(options.realPlayer)body.onLand=(solid,impact,was)=>{landing=solid;f.p._onLand(solid,impact,was);};
 let head=false;const dt=1/60;
 for(let i=1;i<trace.samples.length;i++){
  options.step?.(dt,i);
  const q=trace.samples[i];body.vel.set(dx/trace.air,q.vy,dz/trace.air);moveBody(f.stage.world,body,dt);
  if(head)return{passed:false,reason:'head-collision',body,head,speed};
  if((body.grounded||landing)&&q.vy<0){const pr=f.track.project(body.pos.x,body.pos.z),goal=f.track.project(end.x,end.z);return{passed:Math.abs(pr.s-goal.s)<1.5&&Math.abs(pr.u-goal.u)<1.5&&Math.abs(body.pos.y-end.y)<.4,body,head,speed,landing};}
 }
 for(let i=0;i<12;i++){body.vel.set(0,-2.4,0);moveBody(f.stage.world,body,dt);if(body.grounded)return{passed:body.pos.distanceTo(end)<1.8,body,head,speed};}
 return{passed:false,reason:'miss',body,head,speed};
}
