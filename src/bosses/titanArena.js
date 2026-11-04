import * as THREE from 'three';
import { Entity } from '../entities/entity.js';
import { Cat, explode } from '../entities/breakables.js';
import { ConveyorZone } from './arena.js';
import { Glowworm } from '../entities/glowworm.js';
import { toon } from '../player/nobuPrims.js';
import { Assets } from '../art/assets.js';

export const TITAN_PILLARS = Object.freeze([[-8,-8],[8,-8],[-9.5,3],[9.5,3]].map(Object.freeze));
export const TITAN_TNT = Object.freeze([[-10,-2],[10,-2],[0,-10]].map(Object.freeze));

export class TitanBlock extends Entity {
  constructor(stage,x,z,w,h,d,{y=0,color=0x715039}={}) {
    super(stage,x,y,z); this.alwaysActive=true;this.interactive=false;
    this.dimensions={w,h,d};
    this.mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),toon(color));this.mesh.position.y=h/2;this.obj.add(this.mesh);
    this.solid=stage.world.addBox(x,y,z,w,h,d,{kind:'moving',ref:this});
  }
  place(x,z,y=this.pos.y) {this.pos.set(x,y,z);this.obj.position.copy(this.pos);const {w,h,d}=this.dimensions;this.solid.setCenter(x,y,z,w,h,d);}
}

export class TitanTNT extends Cat {
  constructor(stage,x,z) {
    super(stage,x,0,z);this.countable=false;this.titanTNT=true;this.alwaysActive=true;
    this.fuse=new THREE.Mesh(new THREE.SphereGeometry(.12,8,6),new THREE.MeshBasicMaterial({color:0xffe588,fog:false}));
    this.fuse.position.y=1.15;this.obj.add(this.fuse);
  }
  pounce() {
    if(this.dead)return;
    this.markBroken();this.hide();this.count.visible=false;this.cooldown=6;
    explode(this.stage,this.pos.x,.4,this.pos.z,2.3,{kind:'flat',source:this,color:0xffb070});
  }
  update(dt) {
    if(this.dead)return;
    super.update(dt);this.fuse.scale.setScalar(this.timer>=0?1+Math.sin(this.timer*25)*.4:1);
  }
  refresh() {this.restore();this.visible=true;this.cooldown=0;}
}

export class TitanRug extends ConveyorZone {
  constructor(stage) {
    super(stage,{x0:-4,x1:4,z0:-4,z1:4,y:0},{x:0,z:1},3);
    this.mesh=new THREE.Mesh(new THREE.PlaneGeometry(8,8).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({map:Assets.tex('rug')}));
    this.mesh.position.y=.012;this.obj.add(this.mesh);
    this.arrow=new THREE.Mesh(new THREE.ConeGeometry(.3,1,3).rotateX(Math.PI/2),new THREE.MeshBasicMaterial({color:0xfff5a0,fog:false,depthTest:false}));
    this.arrow.position.y=.04;this.obj.add(this.arrow);this.reset();
  }
  update(dt) {
    if(this.enabled){this.clock+=dt;const turn=Math.floor(this.clock/6);this.dir.x=Math.sin(turn*Math.PI/2);this.dir.z=Math.cos(turn*Math.PI/2);this.arrow.rotation.y=(turn+(this.clock%6>=5?1:0))*Math.PI/2;this.arrow.visible=true;this.arrow.material.color.setHex(this.clock%6>=5?0xffffff:0xfff5a0);}
    else this.arrow.visible=false;
    super.update(dt);
  }
  reset(){this.clock=0;this.enabled=false;this.dir.x=0;this.dir.z=1;}
}

export class TitanArena extends Entity {
  constructor(stage) {
    super(stage,0,0,0);this.alwaysActive=true;this.interactive=false;this.phase=1;
    this.walls=[[-13.5,0,1,28],[13.5,0,1,28],[0,-13.5,26,1],[0,13.5,26,1]].map(([x,z,w,d])=>stage.add(new TitanBlock(stage,x,z,w,4,d)));
    this.pillars=TITAN_PILLARS.map(([x,z])=>stage.add(new TitanBlock(stage,x,z,1.2,6,1.2)));
    this.conveyor=stage.add(new TitanRug(stage));this.socket=new THREE.Vector3(0,0,-12);
    this.tntSpots=TITAN_TNT.map(([x,z])=>({x,z,cat:stage.add(new TitanTNT(stage,x,z))}));
    // Arena Lumi uses the same character/light, with no path or nest mechanics.
    const track={toWorld:(s,u,y,out)=>out.set(u,y,s),tangent:(s,out)=>out.set(0,0,1),heightAt:()=>0};
    this.lumi=stage.add(new Glowworm(stage,track,[]));this.lumi.zoneRadius=4;this.lumi.sleep(true);
    this.legs=[];this.reset();
  }
  setPhase(phase){this.phase=phase;this.reset();}
  get stocked(){return this.tntSpots.every(s=>!s.cat.dead);}
  setWalls(radius) {
    this.wallR=radius;this.walls[0].place(-radius-.5,0);this.walls[1].place(radius+.5,0);this.walls[2].place(0,-radius-.5);this.walls[3].place(0,radius+.5);
    const p=this.player;if(p.dead||p.pos.y>=4)return;
    const hw=p.body.hw??.3,hd=p.body.hd??.3;
    p.pos.x=THREE.MathUtils.clamp(p.pos.x,-radius+hw+.002,radius-hw-.002);
    p.pos.z=THREE.MathUtils.clamp(p.pos.z,-radius+hd+.002,radius-hd-.002);
    // A closing wall can overlap a furniture leg. Choose a free inward face,
    // rather than letting the normal resolver eject Nobu back through the wall.
    for(let pass=0;pass<4;pass++)for(const e of [...this.pillars,...this.legs]){
      const s=e.solid;if(!s.enabled||p.pos.y>=s.max.y||p.pos.y+p.body.h<=s.min.y)continue;
      if(p.pos.x+hw<=s.min.x||p.pos.x-hw>=s.max.x||p.pos.z+hd<=s.min.z||p.pos.z-hd>=s.max.z)continue;
      const options=[{x:s.min.x-hw-.002,z:p.pos.z},{x:s.max.x+hw+.002,z:p.pos.z},{x:p.pos.x,z:s.min.z-hd-.002},{x:p.pos.x,z:s.max.z+hd+.002}]
        .filter(q=>Math.abs(q.x)+hw<radius&&Math.abs(q.z)+hd<radius)
        .sort((a,b)=>(a.x-p.pos.x)**2+(a.z-p.pos.z)**2-((b.x-p.pos.x)**2+(b.z-p.pos.z)**2));
      if(options.length){p.pos.x=options[0].x;p.pos.z=options[0].z;}
    }
  }
  darken(){if(!this.darkT){this.lightBefore={sun:this.stage.sun?.intensity,hemi:this.stage.hemi?.intensity};}this.darkT=8;if(this.stage.sun)this.stage.sun.intensity=.12;if(this.stage.hemi)this.stage.hemi.intensity=.3;this.lumi.wake();this.lumi.zoneRadius=4;}
  restoreLights(){if(this.lightBefore){if(this.stage.sun)this.stage.sun.intensity=this.lightBefore.sun;if(this.stage.hemi)this.stage.hemi.intensity=this.lightBefore.hemi;}this.lightBefore=null;this.darkT=0;this.lumi.sleep(true);}
  addLeg(x,z){const leg=this.stage.add(new TitanBlock(this.stage,x,z,1.2,6,1.2));leg.life=2;this.legs.push(leg);return leg;}
  update(dt){
    if(this.darkT>0){this.darkT=Math.max(0,this.darkT-dt);this.lumi.energy=1;if(!this.darkT)this.restoreLights();}
    for(const spot of this.tntSpots){const c=spot.cat;if(c.dead&&this.phase>=3){c.cooldown=Math.max(0,c.cooldown-dt);if(c.cooldown<=0)c.refresh();}}
    for(const leg of this.legs){leg.life-=dt;if(leg.life<=0){leg.solid.enabled=false;leg.place(leg.pos.x,leg.pos.z,leg.pos.y+dt*18);if(leg.pos.y>14){leg.dead=true;leg.visible=false;}}}
    this.legs=this.legs.filter(l=>!l.dead);
  }
  reset(){this.restoreLights();this.setWalls(13);this.conveyor.reset();this.conveyor.enabled=this.phase>=2;for(const leg of this.legs){leg.solid.enabled=false;leg.dead=true;leg.visible=false;leg.obj.visible=false;}this.legs=[];for(const {cat}of this.tntSpots){cat.refresh();cat.dead=this.phase<3;cat.visible=this.phase>=3;cat.obj.visible=cat.visible;cat.count.visible=false;}}
  onRespawn(){this.reset();}
}

export function buildTitanArena(stage){const arena=stage.add(new TitanArena(stage));stage.titanArena=arena;return {titanArena:arena,walls:arena.walls,pillars:arena.pillars,conveyor:arena.conveyor,socket:arena.socket,tntSpots:arena.tntSpots};}
