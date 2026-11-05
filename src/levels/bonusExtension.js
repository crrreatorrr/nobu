import { RIDE_EXTENSION_BREAKABLES, RIDE_SOFA_BREAKABLES } from './data/ride-breakables.js';
import * as THREE from 'three';
import { Entity } from '../entities/entity.js';
import { placeHiddenBone } from '../entities/hiddenBone.js';
import { BONUS_EXTENSION_TEXT } from '../story/script.js';

// Narrow H33 adapters: raised floors use Solids, never Track ground that masks the main route.
export function raisedFloor(k, a, b, { x = 0, y = 0, w = 3.2, depth = .4 } = {}) {
  const n = Math.ceil((b-a)/1.1), result = [];
  for (let i=0;i<n;i++) result.push(k.platform(x,y,a+(b-a)*(i+.5)/n,w,(b-a)/n+.16,depth));
  return result;
}
export class EchoCrystal extends Entity {
  constructor(stage, position, lights, time) {
    super(stage, ...position.toArray()); this.lights = lights; this.duration = time; this.remaining = 0; this.alwaysActive = true;
    this.setBox(.9,1.3,.9);
    this.mesh = new THREE.Mesh(new THREE.OctahedronGeometry(.48), new THREE.MeshBasicMaterial({color:0x8affdf,fog:false}));
    this.mesh.position.y = .65; this.obj.add(this.mesh);
    this.onRespawn();
  }
  onBite() { this.remaining=this.duration; this.lights.forEach(e=>{ e.visible=true;e.obj.visible=true; }); return true; }
  update(dt) {
    if(this.remaining<=0) return;
    this.remaining=Math.max(0,this.remaining-dt);
    if(!this.remaining) this.lights.forEach(e=>{e.visible=false;e.obj.visible=false;});
  }
  onRespawn() { this.remaining=0; this.lights.forEach(e=>{e.visible=false;e.obj.visible=false;}); }
}
// Light the next mushroom for exactly two seconds after this one launches Nobu.
export class MushroomRelay extends Entity {
  constructor(stage,source,target) {
    super(stage,...source.pos.toArray());this.interactive=false;this.alwaysActive=true;this.remaining=0;
    this.light=new THREE.PointLight(0x8affc8,0,10,2);this.light.position.y=1;target.obj.add(this.light);
    const launch=source.onLand.bind(source);
    source.onLand=p=>{this.remaining=2;this.light.intensity=3;return launch(p);};
  }
  update(dt) {this.remaining=Math.max(0,this.remaining-dt);this.light.intensity=this.remaining>0?3:0;}
  onRespawn() {this.remaining=0;this.light.intensity=0;}
}
export class SofaLoop extends Entity {
  constructor(stage,k) {
    super(stage,...k.W(-2.6,2.6,175).toArray()); this.k=k;
    this.interactive=false; this.alwaysActive=true; this.entryD=175; this.exitD=176; this.loop=true; this.used=false;
    this.round={onFoot:true,start:k.W(-2.6,2.6,175),back:k.W(-2.6,0,170),floorY:this.pos.y,facing:k.yawAt(175)};
  }
  onRespawn() { this.used=false; }
  onRoundLeave(kept,B) { B.R.back=this.k.W(kept?0:-2.6,0,kept?176:170); }
  update() {
    const p=this.player,s=p.body.s;
    if(this.session.busy||p.dead)return;
    if(this.session.bonusRound?.tray===this) {
      if(p.pos.y<this.k.track.heightAt(s)+1.4) this.session._leaveBonusRound(false);
      else if(s>=203 && p.pos.y>=this.k.track.heightAt(s)+2.2) this.session.finishBonusRound();
      return;
    }
    if(this.used||this.session.busy||this.session.trial||p.dead) return;
    if(s>=174.5&&s<=176.5&&Math.abs(p.body.u+2.6)<1.3&&p.pos.y>=this.k.track.heightAt(s)+2.3) this.session.enterBonusRound(this);
  }
}
const section=(k,a,b,kind,key)=> {
  const label=BONUS_EXTENSION_TEXT[kind][key];
  if(label) k.section(a,b,label,{detour:['sofa','hollow'].includes(key)});
};
export function buildRideExtension(k,game,stage) {
  const F=(a,b,o={})=>k.floor(a,b,{w:9.2,...o});
  section(k,130,180,'ride','split'); section(k,255,295,'ride','ramps');
  section(k,379,419,'ride','tile'); section(k,419,447,'ride','door'); section(k,175,205,'ride','sofa');
  F(130,180); raisedFloor(k,135,175,{x:0,y:1.2,w:.8,depth:1.2});
  for(const row of [...RIDE_EXTENSION_BREAKABLES,...RIDE_SOFA_BREAKABLES]) {
    const {kind,x,y,d}=row,entity=k[kind](x,y,d);
    if(RIDE_SOFA_BREAKABLES.includes(row))entity.detour=true;
  }
  k.dog(-3.2,0,154,'pug').dogId='ride:pug-a';
  k.cable(152,{w:4,x:-2.4});
  k.tix(-2.6,0,142,-2.6,0,158,5); k.tix(2.6,0,138,2.6,0,172,10);
  k.leg(2.4,0,144,{h:3});k.leg(3.4,0,156,{h:3});k.toys(2.4,0,150,1.6);
  F(255,263);F(263,267,{y:[0,1.6]});F(271,281);k.toys(-2.2,0,274,2.6);
  F(281,285,{y:[0,1.8]});F(290,295);
  k.pitySnacks(0,0,277);
  k.tixArc(0,1.6,267,0,271,1.6,3);k.tixArc(0,1.8,285,0,290,2,4);
  F(379,419,{style:'platform',slippery:true});
  k.cable(403);k.toys(0,0,413,2.4);
  F(419,429);F(429,434,{y:[0,2.2]});F(441,447);k.pitySnacks(0,0,423);
  k.platform(-3,4,438,3.6,.4,4);k.platform(3,4,438,3.6,.4,4);
  k.tix(0,0,421,0,0,428,4);k.tixArc(0,2.2,434,0,441,2.6,5);
  const sofaEntityStart=stage.entities.length,sofaTicketStart=game.tickets.list.length;
  // A permanent shallow stair-ramp supplies the helper's allowed non-launch fallback.
  for(let i=0;i<20;i++) k.platform(-2.6,(i+1)*2.6/20,171+(i+.5)*4/20,2.2,.36,.25);
  raisedFloor(k,175,205,{x:-2.6,y:2.6,w:3.2,depth:1.2});
  k.mushroom(-2.6,2.6,182,{power:9});k.mushroom(-2.6,2.6,190,{power:9});
  k.dog(-2.8,2.6,194,'dalmatian').dogId='ride:dalmatian-a';
  k.tix(-2.6,3,176,-2.6,3,202,6);
  placeHiddenBone(k,game,stage,-2.6,4.2,200);
  const loop=stage.add(new SofaLoop(stage,k)); (stage.detours??=[]).push(loop);
  for(const entity of stage.entities.slice(sofaEntityStart))entity.detour=true;
  for(const ticket of game.tickets.list.slice(sofaTicketStart))ticket.detour=true;
  return loop;
}
export function buildCaveExtension(k,game,stage,{ wideHollow = true } = {}) {
  const F=(a,b,o={})=>k.floor(a,b,{w:8.6,...o});
  section(k,135,180,'cave','river');section(k,227,270,'cave','mushrooms');
  section(k,319,359,'cave','crystals');section(k,267,285,'cave','hollow');
  k.water(135,175,{y:-1});F(134,137);
  k.mover(0,0,141,{axis:'z',range:3.5,speed:1.4,w:2.6,d:2.6});
  k.mover(-1.4,0,149,{axis:'z',range:3,speed:1.6,w:2.4,d:2.4});
  k.mover(1.4,0,155,{axis:'z',range:3,speed:1.6,w:2.4,d:2.4,phase:Math.PI});
  F(158,161,{w:4});k.dog(1.2,0,159.5,'corgi').dogId='cave:corgi-a';
  k.lily(-1,0,164);k.lily(1,0,167.5);
  k.mover(0,0,171,{axis:'z',range:2.5,speed:1.8,w:2.4,d:2.4});
  F(175,180);k.snacks(-2.4,0,177);k.tix(0,.5,139,0,.5,155,4);k.tix(0,.5,163,0,.5,173,3);
  F(227,235);k.mushroom(0,0,233,{power:15});
  k.platform(0,4.2,238,3,3);k.pack(.8,4.2,238.5);k.pitySnacks(0,4.2,238);
  const relays=[];
  for(const [x,y,d,power] of [[-1.6,-1,242,16],[1.6,-.6,248,16],[-1,-.2,254,15]]) {
    k.platform(x,y,d,1.8,1.8);relays.push(k.mushroom(x,y,d,{power}));
  }
  for(let i=0;i<relays.length-1;i++) stage.add(new MushroomRelay(stage,relays[i],relays[i+1]));
  F(257,267);F(267,270,{x:1.6,w:5.4});k.shellback(0,0,261,{range:1.4});
  k.platform(2.6,3.8,265,2.6,2.6);k.pack(2.6,3.8,265.5);k.cracked(-2.4,0,267,{w:3,d:3});
  k.tixArc(-1.6,1,242,1.6,248,3,3);k.tix(0,0,258,0,0,264,3);
  F(316,321);k.tut(318,'crystals');
  const stones=[[-1.2,0,324],[1.2,.4,328],[-.6,.8,332]].map(([x,y,d])=>k.platform(x,y,d,2.2,2.2));
  stage.add(new EchoCrystal(stage,k.W(0,0,321),stones,5));
  k.platform(.6,1.2,336,3,3);k.snacks(.6,1.2,336.5);k.pitySnacks(.6,1.2,336);
  const mid=k.platform(-1.4,1.6,340,2,2),last=k.platform(1.4,2,344,2,2);
  stage.add(new EchoCrystal(stage,k.W(.6,1.2,337),[mid],3));
  stage.add(new EchoCrystal(stage,k.W(-1.4,1.6,340.5),[last],3));k.pack(1.4,2,344.5);
  const drone=k.drone(0,2.4,348,{range:2.4,hover:1.2});
  const shard=new THREE.Mesh(new THREE.OctahedronGeometry(.25),new THREE.MeshBasicMaterial({color:0x8affdf,fog:false}));
  shard.position.y=1.2;drone.obj.add(shard);
  k.platform(0,2,350,2.2,2.2);k.platform(-1.2,1.4,354,2.2,2.2);F(356,359);
  k.tix(0,.6,324,0,1.2,336,4);k.tix(0,2.2,345,0,2.2,349,2);
  // The source places the exit beneath the return floor. Its launch clears the
  // main surface, and the Hidden can be bitten from the uncovered Hollow.
  const hollowEntityStart=stage.entities.length,hollowTicketStart=game.tickets.list.length;
  if (wideHollow) {
    // Owner-approved safety correction: catch falls from all three lunchbox steps.
    raisedFloor(k,267,270,{x:-2.4,y:-4.5,w:3.4,depth:2});
    raisedFloor(k,270,283,{x:0,y:-4.5,w:8.6,depth:2});
    raisedFloor(k,283,285,{x:-2.4,y:-4.5,w:3.4,depth:2});
  } else raisedFloor(k,267,285,{x:-2.4,y:-4.5,w:3.4,depth:2});
  k.dog(-2.6,-4.5,273,'dalmatian').dogId='cave:dalmatian-a';
  k.mystery(-2.2,-4.5,277,{slot:0});k.tixRing(-2.4,-4.5,279,1,6);
  k.mushroom(-2.4,-4.5,283,{power:17});placeHiddenBone(k,game,stage,-2.4,-4.5,284.5);
  // Keep the camera above the lip and overhead lunchboxes while Nobu is below.
  const camera=k.camZone(267,285,'track',{height:11,dist:8.4,ahead:2.5});
  const inRange=camera.contains.bind(camera);
  camera.contains=(s,y=game.player.pos.y)=>inRange(s,y)&&y<k.track.heightAt(s)-2;
  for(const entity of stage.entities.slice(hollowEntityStart))entity.detour=true;
  for(const ticket of game.tickets.list.slice(hollowTicketStart))ticket.detour=true;
}
