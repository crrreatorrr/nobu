// Authored L1 lifecycle around the shared, backwards-compatible Chaser motion.
import * as THREE from 'three';
import { Chaser } from '../entities/chaser.js';
import { toon } from '../player/nobuPrims.js';
import { audio } from '../audio/audio.js';
import { L1_COCONUT as C } from './data/l1-layout2.js';
class CoconutRig {
  constructor(){
    this.root=new THREE.Group();this.gait=0;
    // CoconutRoller's existing .45m primitive, at the specified five-times scale.
    this.ball=new THREE.Mesh(new THREE.SphereGeometry(.45,10,8),toon(0x6a4020));
    this.ball.scale.setScalar(5);this.ball.position.y=2.25;this.root.add(this.ball);
  }
  pose(mode,dt,speed=1){this.gait+=dt*8;if(mode==='run')this.ball.rotation.x+=dt*speed*8/2.25;}
  reset(){this.ball.scale.setScalar(5);this.ball.rotation.set(0,0,0);}
  finish(){this.ball.scale.setScalar(.05);}
}
export class L1CoconutChase extends Chaser {
  constructor(stage,track){
    super(stage,track,C.start,C.end,{model:'giant_coconut',rig:new CoconutRig(),speed:C.base,catchUp:1,catchUpSpeed:C.max,catchAt:C.catchAt});
    this.alwaysActive=true;this.warned=false;
    // A low stone lintel catches the giant coconut while Nobu runs underneath.
    const arch=new THREE.Group(),stone=toon(0x777b68),block=new THREE.BoxGeometry(1,1,1);
    for(const [x,y,w,h,d]of [[-4,1.9,1.2,3.8,1.6],[4,1.9,1.2,3.8,1.6],[0,4.4,9.2,1.2,1.6]]){
      const part=new THREE.Mesh(block,stone);part.position.set(x,y,0);part.scale.set(w,h,d);arch.add(part);
    }
    arch.position.copy(track.toWorld(C.end));arch.rotation.y=track.yaw(C.end);stage.scene.add(arch);this.endArch=arch;
  }
  warn(){
    if(this.warned)return;this.warned=true;
    const camera=this.game.camera;camera.chaseOwner=this;camera.setMode('trackFront',this.cameraOpts,1.2);
    this.game.ui.tutorial('chase');audio.play('roll');
    const p=this.track.toWorld(C.start,0,5);
    this.fx.puff(p.x,p.y,p.z,{count:12,color:0x6b8a35,size:.25,speed:1.2,life:1});
  }
  activate(s){
    this.warn();
    const cp=this.session?.cp?.pos;
    const checkpoint=cp?this.track.project(cp.x,cp.z).s:C.checkpoint;
    this.begin((checkpoint>=C.start&&checkpoint<C.end?checkpoint:C.checkpoint)-13,C.delay);
    this.alwaysActive=true;this.visible=true;this.obj.visible=true;
  }
  restoreCamera(){
    if(!this.forceRestore && (this.player.body.s??0)<C.cameraEnd)return;
    super.restoreCamera();
  }
  onRespawn(){
    const cp=this.session?.cp?.pos??this.player.pos,s=this.track.project(cp.x,cp.z).s;
    this.warned=false;this.forceRestore=s<C.cameraStart||s>=C.cameraEnd;
    super.onRespawn();
    if(s>=C.cameraStart&&s<C.cameraEnd)this.warn();
    this.forceRestore=false;this.alwaysActive=true;
  }
  update(dt){
    const s=this.player.body.s??0;
    if(s>=C.cameraStart&&s<C.cameraEnd)this.warn();
    const before=this.state;super.update(dt);
    if(before!=='done'&&this.state==='done')this.fx.burst(this.pos.x,this.pos.y+2.25,this.pos.z,{count:16,colors:[0x6a4020,0xe6cc98],speed:5});
    if(s>=C.cameraEnd)this.restoreCamera();
    // Keep warning and delayed camera restoration awake outside chase activation.
    this.alwaysActive=true;
  }
}
