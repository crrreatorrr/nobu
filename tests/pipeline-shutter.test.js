import * as THREE from 'three';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('../src/art/assets.js',()=>({Assets:{has:()=>false,model:()=>null,animate:()=>null,aspect:()=>1,tex:()=>new THREE.Texture({width:16,height:16}),tiled:()=>new THREE.Texture({width:16,height:16}),url:()=>''}}));
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn(),setRate:vi.fn(),musicTime:()=>null}}));
import {pipelineFixture} from './pipelineFixture.js';
import {advanceBeatClocks} from '../src/entities/boxes.js';
import {moveBody} from '../src/world/physics.js';
import {Session} from '../src/game/session.js';
import {PipelineShutter} from '../src/entities/pipelineShutter.js';
import {input} from '../src/core/input.js';
import {save} from '../src/core/save.js';
import {audio} from '../src/audio/audio.js';
import {resetWorld} from './helpers.js';
const fixtures=[],noop=()=>{};
const build=options=>{const f=pipelineFixture(options);fixtures.push(f);return f;};
beforeEach(()=>resetWorld());afterEach(()=>{for(const f of fixtures.splice(0))f.stage.dispose();vi.restoreAllMocks();});
function door(f,name='bid'){return f.stage.pipeline[name+'Shutter'];}
function land(f,support,offset=0,{enable=true,step=null,expectLanding=true}={}){
 const solid=support.solid;if(enable)solid.enabled=true;
 f.p.spawnAt(new THREE.Vector3((solid.min.x+solid.max.x)/2+offset,solid.max.y+.35,(solid.min.z+solid.max.z)/2));
 f.p.vel.set(0,-2.4,0);let called=false;
 const original=f.p.body.onLand;
 f.p.body.onLand=(...args)=>{called=true;return original(...args);};
 try{for(let i=0;i<30&&!called;i++){step?.(1/120);moveBody(f.stage.world,f.p.body,1/120);}}finally{f.p.body.onLand=original;}
 expect(called,'World must deliver the expected real Player landing').toBe(expectLanding);
 return{called,ground:f.p.body.ground,grounded:f.p.body.grounded,vy:f.p.vel.y};
}
function realCheckpointSession(f){
 // Preserve the exact session identity captured by the built shutters.
 const initial=f.session,real=new Session(f.game,5);Object.assign(initial,real);Object.setPrototypeOf(initial,Session.prototype);
 for(const key of Object.keys(initial))if(typeof initial[key]==='function'&&typeof Session.prototype[key]==='function')delete initial[key];
 initial.tickets=f.tickets;initial.stage=f.stage;initial.info=f.info;initial.projectiles={clear:noop};initial.dogsTotal=7;
 f.game.mask={setLevel:noop,snapTo:noop};f.game.ui.setHud=noop;return initial;
}
it.each([-.25,0,.25])('opens Bid only after real Blink and moving Slider landings at offset%s',offset=>{
 const f=build(),shutter=door(f);expect(shutter.open).toBe(false);expect(shutter.solids.every(s=>s.enabled)).toBe(true);
 for(const support of shutter.supports){land(f,support,offset);expect(shutter.contacts.has(support)).toBe(true);}
 expect(shutter.open).toBe(true);expect(shutter.solids.every(s=>!s.enabled)).toBe(true);
 const before=audio.play.mock.calls.length;land(f,shutter.supports[1],offset);expect(audio.play.mock.calls.length).toBeGreaterThanOrEqual(before);
 expect(audio.play.mock.calls.filter(([key])=>key==='chime')).toHaveLength(2);
});
it('retains the missing-moving-ref negative control from the original intended-route failure',()=>{
 const f=build(),shutter=door(f),slider=shutter.supports[1];slider.solid.ref=null;
 land(f,shutter.supports[0]);land(f,slider);expect(shutter.contacts.size).toBe(1);expect(shutter.open).toBe(false);
 slider.solid.ref=slider;land(f,slider);expect(shutter.open).toBe(true);
});
it.each([false,true])('records both Arrow and Fall contacts while preserving original launch/cut semantics (held%s)',held=>{
 const f=build(),shutter=door(f,'liquidation');vi.spyOn(input,'held').mockImplementation(key=>key==='jump'&&held);
 for(const support of shutter.supports){
  const result=land(f,support);
  if(support.kind==='arrowbox'){expect(result.vy).toBeCloseTo(support.power*(held?1.15:1));expect(result.grounded).toBe(false);expect(result.ground).toBeNull();expect(f.p.canDouble).toBe(true);expect(f.p.jumpCut).toBe(true);}
  expect(shutter.contacts.has(support)).toBe(true);
 }
 expect(shutter.open).toBe(true);expect(shutter.contacts.size).toBe(4);
});
it('rejects mere proximity, airborne callback calls and a different physical ground',()=>{
 const f=build(),shutter=door(f),support=shutter.supports[0];f.p.spawnAt(support.pos.clone());
 expect(shutter.contact(support)).toBe(false);support.onLand(f.p,-5);expect(shutter.contacts.size).toBe(0);
 f.p.body.grounded=true;f.p.body.ground={};f.p.pos.y=support.solid.max.y;support.onLand(f.p,-5);expect(shutter.contacts.size).toBe(0);
 f.p.body.ground=support.solid;support.solid.enabled=false;expect(shutter.contact(support)).toBe(false);expect(shutter.open).toBe(false);
});
it('preserves an existing support callback owner and its handled result',()=>{
 const f=build({shutters:false}),support=f.stage.timedBoxes.find(b=>b.d===250.5).entity;
 const prior={onLand:vi.fn(function(player){expect(this).toBe(prior);expect(player.body.ground).toBe(support.solid);return true;})};support.solid.ref=prior;
 const shutter=f.stage.add(new PipelineShutter(f.stage,f.k,251.8,[support],{top:4.9}));land(f,support);
 expect(prior.onLand).toBeTypeOf('function');expect(shutter.open).toBe(true);
 f.stage.dispose();expect(support.solid.ref).toBe(prior);expect(prior.onLand).toHaveBeenCalledTimes(1);
});
it('uses the actual Session checkpoint/respawn hooks: before-pit retry closes, after-pit retry retains opening',()=>{
 const f=build(),s=realCheckpointSession(f),shutter=door(f);
 s.checkpoint(f.k.W(0,0,235));for(const support of shutter.supports)land(f,support);expect(shutter.open).toBe(true);
 s.respawn();expect(shutter.open).toBe(false);expect(shutter.contacts.size).toBe(0);expect(shutter.solids.every(x=>x.enabled)).toBe(true);
 for(const support of shutter.supports)land(f,support);expect(shutter.contacts.size,'second attempt physical contacts').toBe(2);s.checkpoint(f.k.W(0,0,253));expect(shutter.checkpointContacts.size,JSON.stringify({d:f.track.project(s.cp.pos.x,s.cp.pos.z).s,door:shutter.d})).toBe(2);s.respawn();
 expect(shutter.open).toBe(true);expect(shutter.contacts.size).toBe(2);expect(shutter.solids.every(x=>!x.enabled)).toBe(true);expect(shutter.mesh.position.y).toBe(55);
});
it('builds deterministic closed trials and permits real contacts with God enabled',()=>{
 for(const god of[false,true]){save.data.godMode=god;const f=build({session:{trial:true}}),shutter=door(f);expect(shutter.open).toBe(false);expect(shutter.contacts.size).toBe(0);for(const support of shutter.supports)land(f,support);expect(shutter.open).toBe(true);expect(f.p.dead).toBe(false);}
});
it('matches configured collider/mesh heights and leaves the overhead route above the Bid shutter clear',()=>{
 const f=build(),shutter=door(f);expect(Math.max(...shutter.solids.map(s=>s.max.y))).toBeCloseTo(4.9);
 const panel=shutter.mesh.children[0];expect(panel.geometry.parameters.height).toBeCloseTo(24.9);expect(panel.position.y+12.45).toBeCloseTo(4.9);
 const b={pos:f.k.W(0,10,251),vel:f.k.fwdAt(251).multiplyScalar(8),hw:.3,hd:.3,h:1.3,grounded:false};for(let i=0;i<20;i++)moveBody(f.stage.world,b,1/60);
 expect(f.track.project(b.pos.x,b.pos.z).s).toBeGreaterThan(252);expect(b.wallHit).toBe(false);
});
it('retires observers, markers, colliders and owned resources once without touching borrowed support geometry',()=>{
 const f=build(),shutter=door(f),support=shutter.supports[0],marker=support.pipelineMarker,callback=support.onLand;
 const meshes=[];marker.traverse(o=>{if(o.geometry)meshes.push(o);});const geometries=[...new Set(meshes.map(o=>o.geometry))],materials=[...new Set(meshes.map(o=>o.material))];
 const disposed=[...geometries,...materials].map(o=>vi.spyOn(o,'dispose'));const panel=shutter.mesh.children[0],panelDispose=vi.spyOn(panel.geometry,'dispose');
 const borrowed=support.mesh.children.find(o=>o.geometry)?.geometry,borrowedDispose=vi.spyOn(borrowed,'dispose');
 f.stage.dispose();f.stage.dispose();expect(shutter.disposed).toBe(true);expect(shutter.solids.every(s=>!s.enabled)).toBe(true);expect(marker.parent).toBeNull();expect(support.pipelineMarker).toBeUndefined();expect(support.onLand).not.toBe(callback);
 for(const spy of disposed)expect(spy).toHaveBeenCalledTimes(1);expect(panelDispose).toHaveBeenCalledTimes(1);expect(borrowedDispose).not.toHaveBeenCalled();
 callback(f.p,-5);expect(shutter.contacts.size).toBe(0);
});
it('rejects abandoned session/stage callbacks and emits an actual nearby instruction with marked paw plates',()=>{
 const f=build(),shutter=door(f);const tutorial=vi.spyOn(f.game.ui,'tutorial');f.p.spawnAt(f.k.W(0,0,245));shutter.update(.016);expect(tutorial).toHaveBeenCalledWith('pipelineshutter');
 expect(shutter.markers.every(m=>m.name==='pipeline-paw-plate'&&m.children.length===6)).toBe(true);
 f.game.session={};const before=audio.play.mock.calls.length;for(const support of shutter.supports)land(f,support);shutter.update(.2);expect(shutter.contacts.size).toBe(0);expect(audio.play.mock.calls.length).toBe(before);
});

it('registers real contacts in several live Blink/Slider phase windows and rejects a live off window',()=>{
 for(const fraction of[0,.2,.5]){
  const f=build(),shutter=door(f),[blink,slider]=shutter.supports;blink.clock.t=blink.on*fraction;blink.update(0,true);
  land(f,blink,0,{enable:false,step:dt=>{f.stage.world.beginFrame();advanceBeatClocks(f.stage,dt);blink.update(dt,true);}});expect(shutter.contacts.has(blink)).toBe(true);
  slider.clock.t=fraction*Math.PI*2/slider.speed;slider.update();
  land(f,slider,0,{enable:false,step:dt=>{f.stage.world.beginFrame();slider.clock.advance(dt);slider.update();}});expect(shutter.open).toBe(true);
 }
 const f=build(),shutter=door(f),blink=shutter.supports[0];blink.clock.t=blink.on+.2;blink.update(0,true);
 land(f,blink,0,{enable:false,expectLanding:false,step:dt=>{f.stage.world.beginFrame();advanceBeatClocks(f.stage,dt);blink.update(dt,true);}});expect(shutter.contacts.size).toBe(0);expect(shutter.open).toBe(false);
});

it('preserves an earned opening through the real backtracking OrderBook checkpoint and death retry',async()=>{
 vi.useFakeTimers();
 try{
  const f=build(),s=realCheckpointSession(f),shutter=door(f);
  // These are the actual packs whose retained broken state prevents replaying
  // the bounce chain after this checkpoint; their World callbacks break them.
  const packs=[242.5,246.5].map(d=>f.stage.timedBoxes.find(b=>b.d===d).entity);
  for(const pack of packs)land(f,pack);expect(packs.every(p=>p.broken)).toBe(true);
  for(const support of shutter.supports)land(f,support);expect(shutter.open).toBe(true);
  const snack=f.stage.entities.find(e=>e.kind==='snacks'&&e.pos.y>9&&Math.abs(f.track.project(e.pos.x,e.pos.z).s-251.4)<.05);
  expect(snack).toBeTruthy();f.p.spawnAt(snack.pos.clone());snack.onTouch(f.p);
  expect(s.cp.pos.toArray()).toEqual(snack.pos.toArray());expect(Math.abs(f.track.project(s.cp.pos.x,s.cp.pos.z).s-251.4)).toBeLessThan(.02);expect(s.cp.pos.y).toBeCloseTo(10);expect(shutter.checkpointContacts.size).toBe(2);
  Object.assign(f.game.ui,{deathCard:noop,clearScreen:noop,showHud:noop});f.game.onPlayerDeath=type=>s.onPlayerDeath(type);
  const lives=save.data.lives;f.p.die('fall');expect(f.p.dead).toBe(true);await vi.advanceTimersByTimeAsync(2800);
  expect(f.p.dead).toBe(false);expect(save.data.lives).toBe(lives-1);expect(shutter.open).toBe(true);expect(shutter.contacts.size).toBe(2);expect(shutter.solids.every(x=>!x.enabled)).toBe(true);
  expect(shutter.lights.every(x=>x.material.color.getHex()===0x5aff8a)).toBe(true);expect(shutter.markers.every(x=>x.material.color.getHex()===0x5aff8a)).toBe(true);
  expect(packs.every(p=>p.broken&&!p.solid.enabled&&p.brokenSeq<=s.cp.seq)).toBe(true);
 }finally{vi.clearAllTimers();vi.useRealTimers();}
});
it('restores only the contact subset earned at a mid-progress checkpoint',()=>{
 const f=build(),s=realCheckpointSession(f),shutter=door(f),[blink,slider]=shutter.supports;
 land(f,blink);s.checkpoint(f.k.W(3.6,10,251.4));expect(shutter.checkpointContacts).toEqual(new Set([blink]));
 land(f,slider);expect(shutter.open).toBe(true);s.respawn();
 expect(shutter.open).toBe(false);expect(shutter.contacts).toEqual(new Set([blink]));expect(shutter.solids.every(x=>x.enabled)).toBe(true);
 expect(shutter.lights[0].material.color.getHex()).toBe(0x5aff8a);expect(shutter.lights[1].material.color.getHex()).toBe(0xff6a72);
 land(f,slider);expect(shutter.open).toBe(true);
});
