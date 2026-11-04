import * as THREE from 'three';
import { Entity } from '../entities/entity.js';
import { ConeDrone } from '../entities/enemies.js';
import { BlueSphere } from '../entities/breakables.js';

export const BIRD_PERCHES = [[-10.4,6.2,-6],[10.4,6.2,-6]];
// An off interval includes its opening leaf tell; active intervals stay exactly three seconds.
export class BirdWindLanes extends Entity {
  constructor(stage) {
    super(stage,0,0,0);this.alwaysActive=true;this.interactive=false;this.enabled=false;this.visible=false;this.time=0;this.boss=null;
    this.strips=[-5,5].map(x=>{
      const mesh=new THREE.Mesh(new THREE.PlaneGeometry(3,19),new THREE.MeshBasicMaterial({color:0xa2e987,transparent:true,opacity:.08,side:THREE.DoubleSide,depthWrite:false}));
      mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.035,-1.5);this.obj.add(mesh);return mesh;
    });
    this.obj.visible=false;
  }
  setPhase(phase,boss) {this.boss=boss;this.enabled=phase>=2;this.time=0;this.visible=this.enabled;this.obj.visible=this.enabled;}
  update(dt) {
    if(!this.enabled || !this.boss?.active || this.boss.evolving || this.boss.defeated || this.game.session?.busy || this.player.dead)return;
    this.time+=dt;const tell=this.boss.tele(.6),t=this.time%6,on=t>=tell && t<tell+3;
    for(const mesh of this.strips)mesh.material.opacity=on?.26:t<tell?.12+.1*Math.sin(t*30):.04;
    if(t<tell && Math.random()<dt*25){const x=Math.random()<.5?-5:5;this.fx.smokeCard?.(x,.3,-11+Math.random()*19,{vx:x<0?3:-3,size:.16,life:.5,colors:[0xc3ff8d],g:0,grow:1.5,alpha:.5});}
    const p=this.player;if(!on || !p.body.grounded || Math.abs(p.pos.y)>.2 || p.pos.z < -11 || p.pos.z >8)return;
    if(Math.abs(p.pos.x+5)<=1.5)p.pushX=(p.pushX||0)+3;
    else if(Math.abs(p.pos.x-5)<=1.5)p.pushX=(p.pushX||0)-3;
  }
  reset() {this.setPhase(1,this.boss);}
  onRespawn() {this.reset();}
}
export function buildBirdArena(k,stage) {
  const perches=BIRD_PERCHES.map(([x,y,z])=>{
    k.palm(x,0,-z,6);stage.world.addBox(x,0,z,.8,6,.8);
    return new THREE.Vector3(x,y,z);
  });
  const windLanes=stage.add(new BirdWindLanes(stage));return{perches,windLanes};
}
export class BirdEscort extends ConeDrone {
  constructor(boss,side) {
    super(boss.stage,boss.pos.x,boss.pos.y-.5,boss.pos.z,{range:0});this.boss= boss;this.side=side;this.countable=false;this.alwaysActive=true;this.angle=side<0?Math.PI:0;
  }
  behave(dt) {
    const b=this.boss;
    if(b.defeated || b.phase!==3){this.dead=true;this.obj.visible=false;return;}
    this.angle+=dt*1.3;this.pos.set(b.pos.x+Math.cos(this.angle)*2.5,b.pos.y-.5,b.pos.z+Math.sin(this.angle)*2.5);
    this.prop.rotation.y+=dt*30;this.facing=Math.atan2(this.player.pos.x-this.pos.x,this.player.pos.z-this.pos.z);this.shadow.position.y=-this.pos.y+.02;
  }
  onBite(p) {
    if(!this.alive)return;this.knock(p.pos);
    if(!this.boss.droneSphereGiven){
      this.boss.droneSphereGiven=true;const sphere=new BlueSphere(this.stage,this.pos.x,Math.max(0,this.pos.y-.5),this.pos.z);sphere.countable=false;sphere.birdDroneDrop=true;this.stage.add(sphere);
    }
  }
}
// Craters belong to the projectile lifetime, including phase changes and death clears.
export class BirdEggCraters {
  constructor(projectiles) {
    this.proj=projectiles;this.eggs=[];this.craters=[];
    const clear=projectiles.clear.bind(projectiles);projectiles.clear=()=>{clear();this.clear();};
  }
  watch(egg) {this.eggs.push(egg);return egg;}
  update(dt) {
    for(const egg of this.eggs)if(egg.life<=0 && egg.fuse<=0){
      const mesh=new THREE.Mesh(new THREE.CircleGeometry(1.3,24),new THREE.MeshBasicMaterial({color:0x2f1b19,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(egg.mesh.position.x,.04,egg.mesh.position.z);this.proj.stage.scene.add(mesh);this.craters.push({mesh,t:6});
    }
    this.eggs=this.eggs.filter(e=>e.life>0);
    const p=this.proj.game.player;
    for(const c of this.craters){c.t-=dt;c.mesh.material.opacity=Math.min(.8,c.t);if(!p.dead && p.pos.y<.3 && Math.hypot(p.pos.x-c.mesh.position.x,p.pos.z-c.mesh.position.z)<1.3)p.hurt('puff',c.mesh.position.x,c.mesh.position.z);}
    this.craters=this.craters.filter(c=>{if(c.t>0)return true;c.mesh.removeFromParent();c.mesh.geometry.dispose();c.mesh.material.dispose();return false;});
  }
  clear() {this.eggs=[];for(const c of this.craters){c.mesh.removeFromParent();c.mesh.geometry.dispose();c.mesh.material.dispose();}this.craters=[];}
}
