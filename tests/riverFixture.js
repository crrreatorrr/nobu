import * as THREE from 'three';
import {vi} from 'vitest';
import {Player} from '../src/player/player.js';
import {World} from '../src/world/physics.js';
import {Track,turtle} from '../src/world/track.js';
import {makeKit} from '../src/levels/kit.js';
import {installRiverKit} from '../src/levels/riverKit.js';
import {L6_TRACK} from '../src/levels/data/rapids.js';
const gradient={addColorStop(){}};const ctx=new Proxy({measureText:()=>({width:100}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]??(()=>{})});
export function riverFixture({moves=L6_TRACK}={}){
 HTMLCanvasElement.prototype.getContext=()=>ctx;
 const track=new Track(turtle([0,0,10],moves)),world=new World();world.track=track;
 const game={loadout:{effects:{},cosmeticSlots:()=>({})},fx:new Proxy({},{get:()=>()=>{}}),ui:{setConed(){},banner(){},tutorial(){}},camera:{opts:{height:4.3,dist:8.6,ahead:5.5},cam:new THREE.PerspectiveCamera(60),shake(){},setMode(_,opts){this.opts=opts;}},onPlayerDeath:vi.fn(),onFlop(){},maskPickup(){}};
 const p=Object.create(Player.prototype);Object.assign(p,{game,pos:new THREE.Vector3(),vel:new THREE.Vector3(),root:new THREE.Group(),model:{},wings:new THREE.Group(),halo:new THREE.Group(),stars:new THREE.Group(),deathCone:new THREE.Group(),_animate(){},_updateShadow(){},_paintGear(){}});
 p.body={pos:p.pos,vel:p.vel,h:1.3,hw:.3,hd:.3,onLand:(...a)=>p._onLand(...a)};game.player=p;
 const stage={game,track,world,entities:[],scene:new THREE.Scene(),time:0,add(e){this.entities.push(e);if(e.obj)this.scene.add(e.obj);return e;},killYAt(_pos,b){const water=track.waterAt(b.s??0);return water==null?track.heightAt(b.s??0)-12:water-.5;},dispose(){this.scene.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared)o.geometry.dispose();});}};game.stage=stage;
 const session={level:6,phase:'level',deaths:0,deathsAtCp:0,runSeed:42,mask:0,nextSeq:()=>1,onBreak(){},onEnemyDefeated(){},rescueDog(){},checkpoint(){},onPlayerHurt(){}};game.session=session;game.tickets={spawnFlying(){}};p.reset();
 const k=installRiverKit(makeKit(game,stage,{add(){}},track),game,stage);
 const tick=(dt=1/120)=>{stage.time+=dt;world.beginFrame();for(const e of stage.entities)if(!e.dead)e.update?.(dt);p.update(dt,stage,{right:{x:1,z:0},forward:{x:0,z:-1}});};
 return{game,p,stage,track,k,tick,session};
}
