import * as THREE from 'three';
import {vi} from 'vitest';
import {Player} from '../src/player/player.js';
import {Stage} from '../src/world/stage.js';
import {TicketSystem} from '../src/entities/tickets.js';
import {buildLevel5} from '../src/levels/level5.js';
import {advanceBeatClocks} from '../src/entities/boxes.js';
const noop=()=>{},gradient={addColorStop:noop};
const ctx=new Proxy({measureText:()=>({width:100}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]??noop});
export function pipelineFixture(options={}){
 HTMLCanvasElement.prototype.getContext=()=>ctx;HTMLCanvasElement.prototype.toDataURL=()=>'';
 const game={loadout:{effects:{},cosmeticSlots:()=>({})},fx:new Proxy({},{get:()=>noop}),ui:{setConed:noop,banner:noop,tutorial:noop,fade:async()=>{}},camera:{opts:{height:4.3,dist:8.6,ahead:5.5},cam:new THREE.PerspectiveCamera(60),shake:noop,setMode(_,opts){this.opts=opts;},snap:noop},onPlayerDeath:vi.fn(),onFlop:noop,maskPickup:noop};
 const p=Object.create(Player.prototype);Object.assign(p,{game,pos:new THREE.Vector3(),vel:new THREE.Vector3(),root:new THREE.Group(),model:{},wings:new THREE.Group(),halo:new THREE.Group(),stars:new THREE.Group(),deathCone:new THREE.Group(),_animate:noop,_updateShadow:noop,_paintGear:noop});
 p.body={pos:p.pos,vel:p.vel,h:1.3,hw:.3,hd:.3,onLand:(...a)=>p._onLand(...a)};game.player=p;
 const session={level:5,def:{tier:5},phase:'level',deaths:0,deathsAtCp:0,runSeed:42,mask:0,nextSeq:()=>1,onBreak:noop,onEnemyDefeated:noop,rescueDog:noop,checkpoint:noop,onPlayerHurt:noop,reachBossGate:vi.fn(),collectHiddenBone:vi.fn(()=>true),...options.session};
 game.session=session;p.reset();const stage=new Stage(game,3);stage.theme={...stage.theme,music:'level5'};game.stage=stage;
 const tickets=new TicketSystem(game,stage);game.tickets=tickets;const info=buildLevel5(game,stage,tickets,{decor:false,...options});session.stage=stage;session.cp={pos:info.spawn};
 p.spawnAt(info.spawn,info.facing);
 const tick=(dt=1/120,actors=stage.entities)=>{stage.time+=dt;stage.world.beginFrame();advanceBeatClocks(stage,dt);for(const e of actors)if(!e.dead)e.update?.(dt);p.update(dt,stage,{right:{x:1,z:0},forward:{x:0,z:-1}});};
 return{game,p,stage,track:stage.track,k:stage.pipeline.k,tick,session,tickets,info};
}
