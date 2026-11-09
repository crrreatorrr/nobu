import * as THREE from 'three';
import { damp,dampAngle } from '../core/util.js';
import { audio } from '../audio/audio.js';
import { rideVacuumMesh } from '../entities/ride.js';
import { raftBasketMesh,disposeRaftMesh } from '../entities/raftMesh.js';
import { boostAt } from '../game/raft.js';

export function setPlayerRide(player,cfg){
 if(player.ride){player.root.remove(player.ride.mesh);player.ride=null;}
 if(!cfg)return;
 const kind=cfg.mesh==='raft'?'raft':'vacuum';player._rideMeshes??={};
 if(!player._rideMeshes[kind])player._rideMeshes[kind]=kind==='raft'?raftBasketMesh():(player._rideMesh||=rideVacuumMesh());
 const mesh=player._rideMeshes[kind];player.root.add(mesh);
 player.ride={speed:cfg.speed??10.5,lift:cfg.lift??.42,mesh,meshKind:kind,speedK:0,steer:cfg.steer,hop:cfg.hop,airJumps:cfg.airJumps,boost:cfg.boost??[],raftSpan:cfg.raftSpan};
 if(kind==='raft'){
  player.airDashT=0;player.glideOn=false;player.airJumps=cfg.airJumps??0;
  if(player.moonHold){player.moonHold=null;player.body.h=1.3;}
  if(player.mode==='slide'){player.mode='normal';player.body.h=1.3;player.zoomArmed=false;}
 }
}
export function releasePlayerRaft(player,mesh){
 if(!mesh||player._rideMeshes?.raft!==mesh)return;
 if(player.ride?.mesh===mesh){player.root.remove(mesh);player.ride=null;}
 delete player._rideMeshes.raft;disposeRaftMesh(mesh);
}
// Exact vacuum defaults live here alongside explicit raft opt-ins. Steering input
// remains camera-independent, as it was on the original ride.
export function stepRide(player,stage,steer,dt){
 const R=player.ride,raft=R.meshKind==='raft',grounded=player.body.grounded;
 const forward=stage.track.tangent(player.body.s??0,player._rideF||=new THREE.Vector3());
 R.speedK=Math.min(1,(R.speedK??0)+dt/1.4);
 const speed=R.speed*R.speedK*boostAt({boost:R.boost},player.body.s??0);R.sp=speed;
 const lateral=steer*(R.steer??6.8),slick=(R.slick??0)>0;
 player._approach(forward.x*speed-forward.z*lateral,forward.z*speed+forward.x*lateral,(slick?12:70)*dt);
 if(R.slickFresh)R.slickFresh=false;else R.slick=Math.max(0,(R.slick||0)-dt);
 player.targetFacing=Math.atan2(forward.x,forward.z)-steer*.35;player.facing=dampAngle(player.facing,player.targetFacing,10,dt);
 player.bank=damp(player.bank||0,steer*(raft?.6:.3),8,dt);
 if(raft)R.mesh.rotation.z=-player.bank;
 for(const brush of R.mesh.userData.brushes||[])brush.rotation.y+=dt*30;
 R.whirrT=(R.whirrT??0)-dt;
 if(grounded&&R.whirrT<=0){R.whirrT=raft?.7:.55;audio.play(raft?'paddle':'whirr');}
 if(grounded&&Math.random()<.18)player.game.fx?.dust(player.pos.x-forward.x*.75,player.pos.y,player.pos.z-forward.z*.75,{count:1,size:raft?.22:.18,color:raft?0xe8f4ee:player._dustColor(),speed:.8,life:.3,dirX:-forward.x*2,dirZ:-forward.z*2});
 return forward;
}
