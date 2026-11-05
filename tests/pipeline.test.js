import * as THREE from 'three';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
vi.mock('../src/art/assets.js',()=>({Assets:{has:()=>false,model:()=>null,animate:()=>null,aspect:()=>1,tex:()=>new THREE.Texture({width:16,height:16}),tiled:()=>new THREE.Texture({width:16,height:16}),url:()=>''}}));
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn(),musicTime:()=>null}}));
import {pipelineFixture} from './pipelineFixture.js';
import {PumpStone} from '../src/entities/pumpStone.js';
import {Breakable} from '../src/entities/entity.js';
import {ConedDog} from '../src/entities/dogs.js';
import {measureTicketBudget} from '../src/game/measureTicketBudget.js';
import {checkTicketBudget} from '../src/game/ticketBudget.js';
import {L5_DOGS,L5_STEP} from '../src/levels/data/pipeline.js';
import {moveBody,rideGround} from '../src/world/physics.js';
import {input} from '../src/core/input.js';
import {resetWorld} from './helpers.js';
import {PIPELINE_BUDGET} from '../src/levels/data/pipelineBudget.js';
const fixtures=[];
const build=o=>{const f=pipelineFixture(o);fixtures.push(f);return f;};
beforeEach(()=>resetWorld());afterEach(()=>{for(const f of fixtures.splice(0))f.stage.dispose();vi.restoreAllMocks();});
it('builds the exact literal countable census with seven stable dogs and two Mysteries',()=>{
 const{stage,track}=build();
 expect(stage.entities.filter(e=>e instanceof ConedDog).map(e=>e.dogId)).toEqual(L5_DOGS.map(r=>r[0]));
 expect(stage.entities.filter(e=>e instanceof Breakable&&e.countable)).toHaveLength(44);
 expect([...stage.mysterySlots]).toEqual([0,1]);expect(stage.detours.map(d=>[d.loop,d.skipSpan])).toEqual([[true,null],[true,null]]);
 expect(track.length).toBeGreaterThanOrEqual(472);expect(stage.entities.filter(e=>e instanceof PumpStone)).toHaveLength(11);
 expect(stage.pipeline.k.boxPatterns).toBe(stage.timedPatterns);expect(stage.marketClock.step).toBe(L5_STEP);
});
it('measures every authored payer against the existing fixed cap',()=>{
 const{stage,tickets}=build(),budget=measureTicketBudget(stage,tickets,7);
 expect(budget.field).toBe(122);expect(budget.mystery).toBe(2);expect(budget.packs).toBe(98);expect(budget.zipped).toBe(16);expect(budget.jackpots).toBe(30);
 expect(budget).toEqual(PIPELINE_BUDGET);expect(checkTicketBudget(5,budget).wholeMax).toBe(97);
});
it('keeps the late-move paths free of countables and closes sky detours in trials',()=>{
 const{stage}=build({session:{trial:true}});expect(stage.detours||[]).toHaveLength(0);expect(stage.entities.filter(e=>e.kind==='moonledge'||e.kind==='hiddenbone')).toHaveLength(0);
 expect(stage.entities.filter(e=>e instanceof ConedDog)).toHaveLength(5);
 expect(stage.entities.filter(e=>e instanceof PumpStone)).toHaveLength(10);
});
it('pumps once per real landing, carries its rider on both rises and resets after the original timer',()=>{
 const{p,stage,k,tick}=build(),stone=k.pumpStone(0,.4,12,{float:2.4});
 vi.spyOn(input,'held').mockReturnValue(false);vi.spyOn(input,'pressed').mockReturnValue(false);
 p.spawnAt(k.W(0,2.5,12),0);for(let i=0;i<120&&!p.body.grounded;i++)tick(1/120,[stone]);
 expect(p.body.ground).toBe(stone.solid);expect(stone.pumps).toBe(1);
 for(let i=0;i<40;i++)tick(1/120,[stone]);
 expect(stone.pumps).toBe(1);expect(p.pos.y).toBeCloseTo(1.4,2);expect(stone.solid.delta.x).toBe(0);expect(stone.solid.delta.z).toBe(0);
 p.vel.y=12.6;p.body.grounded=false;
 for(let i=0;i<100;i++)tick(1/120,[stone]);
 expect(stone.pumps).toBe(2);expect(p.body.ground).toBe(stone.solid);expect(p.pos.y).toBeCloseTo(2.4,2);
 for(let i=0;i<300&&stone.state!=='dumped';i++)tick(1/120,[stone]);expect(stone.solid.enabled).toBe(false);
 stone.update(4);expect(stone.pumps).toBe(0);expect(stone.pos.y).toBe(.4);expect(stone.solid.enabled).toBe(true);expect(stone.alwaysActive).toBe(false);
});
it('supports resize-free actual World carries and over-pump dump, checkpoint restore and detached recovery',()=>{
 const{stage,k,p}=build(),stone=k.pumpStone(0,.4,12,{maxPump:1,float:1.2});
 stone.onLand();for(let i=0;i<30;i++){stage.world.beginFrame();stone.update(1/120);}
 const body={pos:stone.pos.clone(),grounded:true,ground:stone.solid,vel:new THREE.Vector3(),h:1.3,hw:.3,hd:.3};
 stage.world.beginFrame();stone.update(1/120);rideGround(body);moveBody(stage.world,body,1/120);expect(body.pos.x).toBe(stone.pos.x);
 stone.supported=false;stone.onLand(p);expect(stone.state).toBe('dumped');expect(stone.alwaysActive).toBe(true);stone.onRespawn();expect(stone.state).toBe('idle');expect(stone.solid.enabled).toBe(true);
});
it.each([.1,.4,.7,.9])('finalizes finite geometry for decor roll%s and restores field atmosphere on disposal',roll=>{
 const rng=vi.spyOn(Math,'random').mockReturnValue(roll);const{stage,game}=build({decor:true});rng.mockRestore();stage.finalize();
 stage.scene.traverse(o=>{expect(o.position.toArray().every(Number.isFinite)).toBe(true);if(o.geometry)for(const a of Object.values(o.geometry.attributes))expect(Array.from(a.array).every(Number.isFinite)).toBe(true);});
 game.player.body.s=300;stage.entities.find(e=>e.constructor.name==='PipelineAtmosphere').update();expect(stage.scene.fog.far).toBe(60);
 stage.dispose();expect(stage.scene.fog.far).toBe(stage.theme.fogFar);
});
it.each([.1,.4,.7,.9])('keeps the actual side-camera body sightline clear with decor roll%s',async roll=>{
 const {GameCamera}=await import('../src/camera/camera.js');
 const rng=vi.spyOn(Math,'random').mockReturnValue(roll),f=build({decor:true});rng.mockRestore();f.stage.finalize();
 const camera=new GameCamera(1100/800);f.game.camera=camera;
 const zone=f.stage.entities.find(e=>e.constructor.name==='CamZone'&&e.d0===390);
 for(const d of[391,400,428.49,435,444]){
  f.p.spawnAt(f.k.W(0,d===400?0:d===444?3:0,d),f.track.yaw(d));zone.update(0);camera.snap(f.p);f.stage.update(0,f.p);f.stage.scene.updateMatrixWorld(true);
  const target=f.p.pos.clone().add(new THREE.Vector3(0,.9,0)),delta=target.clone().sub(camera.cam.position),ray=new THREE.Raycaster(camera.cam.position,delta.clone().normalize(),0,delta.length()-.04);
  ray.camera=camera.cam;
  const blockers=ray.intersectObjects(f.stage.scene.children,true).filter(hit=>{for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;return true;});
  expect(blockers.map(h=>({name:h.object.name,type:h.object.type,distance:h.distance})),`body sightline D${d}`).toEqual([]);
 }
});
