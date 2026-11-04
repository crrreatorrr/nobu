import * as THREE from 'three';
import { describe,it,expect,vi,beforeEach } from 'vitest';
vi.mock('../src/art/assets.js',()=>({Assets:{model:()=>null,tex:()=>null,tiled:()=>null,has:()=>false}}));
vi.mock('../src/entities/fx.js',()=>({makeShadow:()=>new THREE.Group(),placeShadow(){},textTexture(){},textSprite(){}}));
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn()}}));
import { MechaBird } from '../src/bosses/mechaBird.js';
import { Projectiles } from '../src/bosses/common.js';
import { BirdWindLanes, BirdEggCraters,buildBirdArena } from '../src/bosses/birdArena.js';
import { World,moveBody } from '../src/world/physics.js';
import { audio } from '../src/audio/audio.js';
function fixture(phase=1){
  const p={pos:new THREE.Vector3(0,0,4),vel:new THREE.Vector3(),body:{grounded:true,hw:.36,hd:.36,h:1.3},facing:Math.PI,forward:new THREE.Vector3(0,0,-1),hurt:vi.fn(),trap:vi.fn(),bounce:vi.fn(),biteT:-1};
  const fx=new Proxy({sparks:{spawn(){}}},{get:(target,key)=>target[key] || (()=>{})}),g={player:p,session:{phase:'boss',busy:false,info:{},onEnemyDefeated(){},onBreak(){}},fx,camera:{shake:vi.fn()},ui:{bossHp(){}}};
  const stage={game:g,world:new World(),scene:new THREE.Scene(),entities:[],add(e){this.entities.push(e);this.scene.add(e.obj);return e;}};
  const proj=new Projectiles(g,stage);g.session.projectiles=proj;
  const b=new MechaBird(stage,0,0,-6);g.session.boss=b;b.phase=phase;b.active=true;b.animate=()=>{};
  return{p,g,stage,proj,b};
}
function step(f,dt=1/60){f.b.update(dt);f.proj.update(dt);for(const d of f.b.drones)d.update(dt);}
function until(f,predicate,limit=1800){for(let i=0;i<limit;i++){if(predicate())return i;step(f);}throw Error('State did not complete: '+f.b.state);}
beforeEach(()=>{vi.clearAllMocks();vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(()=>new Proxy({},{get:(_,key)=>String(key).startsWith('create')?()=>({addColorStop(){}}):()=>{},set:()=>true}));});
describe('Bird powers use actual boss states and projectiles',()=>{
  it.each([1,2,3])('perch stage%s rolls its exact coconut count after full individual tells',phase=>{
    const f=fixture(phase),calls=vi.spyOn(f.proj,'coconut');f.b.beginAttack('perch');f.b.pos.copy(f.b.perchPoint);
    const tell=f.b.tele(.5);step(f,tell-.02);expect(calls).not.toHaveBeenCalled();step(f,.021);expect(calls).toHaveBeenCalledTimes(1);
    until(f,()=>f.b.state!=='perch');expect(calls).toHaveBeenCalledTimes(phase+2);expect(calls.mock.calls.every(c=>c[2].speed===6*f.b.sp)).toBe(true);expect(audio.play).toHaveBeenCalledWith('peck');
  });
  it('locks the cage shadow before the .35s fall and lets the maximum trap finish before a chained aim tell',()=>{
    const f=fixture(3);f.b.startChain(['cage','aim']);const drop=f.b.cageDrop,tell=f.b.tele(.9);
    f.p.pos.x=3;step(f,tell-.02);expect(drop.mesh.position.x).toBe(3);
    step(f,.03);const locked=drop.mesh.position.x;f.p.pos.x=8;step(f,.01);expect(drop.mesh.position.x).toBe(locked);expect(drop.delay-tell).toBeCloseTo(.35);
    f.p.pos.set(locked,0,drop.mesh.position.z);until(f,()=>drop.landed);expect(f.p.trap).toHaveBeenCalledWith(1.2);expect(audio.play).toHaveBeenCalledWith('cageRattle');
    while(f.b.stateT<tell+.35+1.2-.02)step(f);expect(f.b.state).toBe('cage');until(f,()=>f.b.state==='aim');expect(f.b.stateT).toBe(0);
    expect(f.b.marker.visible).toBe(true);step(f,f.b.tele(.85)-.01);expect(f.b.state).toBe('aim');step(f,.02);expect(f.b.state).toBe('dive');
  });
  it('chains a complete laser directly into a fully warned volley',()=>{
    const f=fixture(3);f.b.startChain(['laser','volley']);const feather=vi.spyOn(f.proj,'feather');until(f,()=>f.b.state==='volley');
    expect(f.b.stateT).toBe(0);step(f,f.b.tele(.65/f.b.sp)-.01);expect(feather).not.toHaveBeenCalled();step(f,.02);expect(feather).toHaveBeenCalledTimes(7);
  });
  it('spawns two real ConeDrone escorts, fires once per dive, and awards at most one noncountable sphere',()=>{
    const f=fixture(3);f.b.beginAttack('escort');expect(f.b.drones).toHaveLength(2);
    f.b.pos.set(0,1.1,0);for(const d of f.b.drones)d.update(0);expect(f.b.drones.every(d=>Math.abs(d.pos.y-.6)<1e-9)).toBe(true);
    const feather=vi.spyOn(f.proj,'feather');f.b.beginAttack('aim');step(f,f.b.tele(.85)+.01);expect(feather).toHaveBeenCalledTimes(2);
    for(const d of f.b.drones)d.onBite(f.p);expect(f.stage.entities.filter(e=>e.birdDroneDrop)).toHaveLength(1);expect(f.stage.entities.find(e=>e.birdDroneDrop).countable).toBe(false);
    f.b.beginAttack('escort');for(const d of f.b.drones)d.onBite(f.p);expect(f.stage.entities.filter(e=>e.birdDroneDrop)).toHaveLength(1);
  });
  it.each([1,2,3])('ultimate stage%s uses its full sequence and guarantees a dive punish',phase=>{
    const f=fixture(phase),feather=vi.spyOn(f.proj,'feather'),rockets=vi.spyOn(f.proj,'missile'),beam=vi.spyOn(f.b.beam,'set');f.b.beginAttack('ultimate');
    until(f,()=>f.b.state==='aim');expect(feather).toHaveBeenCalledTimes((phase===3?4:3)*16);expect(rockets).toHaveBeenCalledTimes(phase===3?2:0);
    expect(beam.mock.calls.some(c=>c[2])).toBe(phase===2);until(f,()=>f.b.state==='stuck');expect(f.b.vulnerable).toBe(false);step(f);expect(f.b.vulnerable).toBe(true);
  });
  it('keeps all stage3 plan loops punishable and restarts stage1 with no hazards or escorts',()=>{
    const f=fixture(3);f.b.beginPhase();f.b.nextAction();const plan=[f.b.state,...f.b.plan];expect(plan.filter(s=>s==='aim').length).toBeGreaterThanOrEqual(2);
    expect(f.b.phaseCheckpoints).toBe(false);f.b.resetToPhase(1);expect(f.b.phase).toBe(1);expect(f.b.hp).toBe(6);expect(f.b.drones).toHaveLength(0);expect(f.b.marker.visible).toBe(false);expect(f.b.eggCraters.craters).toHaveLength(0);
  });
  it('consumes DDA through every newly active tell and the shared punish window',()=>{
    const f=fixture(2);f.b.dda={tele:1.15,window:.3};expect(f.b.tele(.9)).toBeCloseTo(.9*.88*1.15);expect(f.b.W).toBeCloseTo(2.7);
    f.b.beginAttack('cage');expect(f.b.cageDrop.delay).toBeCloseTo(.9*.88*1.15+.35);
  });
});

describe('Bird arena geometry and reset lifetimes',()=>{
  it('uses real trunk colliders, exact perches, and keeps the camera-side region clear',()=>{
    const f=fixture(),palm=vi.fn(),info=buildBirdArena({palm},f.stage);
    expect(info.perches.map(v=>v.toArray())).toEqual([[-10.4,6.2,-6],[10.4,6.2,-6]]);
    expect(palm.mock.calls).toEqual([[-10.4,0,6,6],[10.4,0,6,6]]);
    expect(f.stage.world.all).toHaveLength(2);
    for(const s of f.stage.world.all){expect(s.max.x-s.min.x).toBeCloseTo(.8);expect(s.max.y-s.min.y).toBe(6);expect(s.max.z-s.min.z).toBeCloseTo(.8);expect(s.max.z).toBeLessThan(6);}
    const body={pos:new THREE.Vector3(-8,0,-6),vel:new THREE.Vector3(-8,0,0),hw:.36,hd:.36,h:1.3,grounded:true};
    for(let i=0;i<30;i++)moveBody(f.stage.world,body,1/60);
    expect(body.pos.x).toBeGreaterThanOrEqual(-10+.36-1e-5);
  });
  it('warns before every inward wind pulse, preserves on/off durations and clears stage1',()=>{
    const f=fixture(2),wind=new BirdWindLanes(f.stage);wind.setPhase(2,f.b);f.p.pos.set(-5,0,0);
    wind.update(f.b.tele(.6)-.01);expect(f.p.pushX).toBeUndefined();wind.update(.02);expect(f.p.pushX).toBe(3);
    f.p.pushX=0;wind.update(3);expect(f.p.pushX).toBe(0);wind.update(3);expect(f.p.pushX).toBe(3);
    f.p.pushX=0;f.p.pos.x=5;wind.update(.01);expect(f.p.pushX).toBe(-3);
    f.b.dda={tele:1.15,window:.3};wind.setPhase(2,f.b);f.p.pushX=0;wind.update(f.b.tele(.6)-.01);expect(f.p.pushX).toBe(0);
    wind.setPhase(1,f.b);expect(wind.enabled).toBe(false);expect(wind.visible).toBe(false);wind.update(20);expect(f.p.pushX).toBe(0);
  });
  it('leaves enough real movement clearance to escape a locked cage even against wind',()=>{
    const f=fixture(2),wind=new BirdWindLanes(f.stage);wind.setPhase(2,f.b);wind.time=f.b.tele(.6)+.1;
    f.p.pos.set(-5,0,0);Object.assign(f.p.body,{pos:f.p.pos,vel:f.p.vel});
    for(let i=0;i<21;i++){f.p.pushX=0;wind.update(1/60);f.p.vel.set(-8+f.p.pushX,0,0);moveBody(f.stage.world,f.p.body,1/60);}
    expect(Math.abs(f.p.pos.x+5)).toBeGreaterThan(1.1+.36);
  });
  it('spawns an actual egg crater at explosion, hurts only low players, expires at6s and clears with projectiles',()=>{
    const f=fixture(3),craters=f.b.eggCraters;
    const egg=craters.watch(f.proj.eggBomb(new THREE.Vector3(0,.52,0),new THREE.Vector3(0,-1,0),{fuse:.01}));
    f.proj.update(.02);expect(egg.life).toBeLessThanOrEqual(0);craters.update(0);expect(craters.craters).toHaveLength(1);
    f.p.hurt.mockClear();f.p.pos.set(0,.31,0);craters.update(0);expect(f.p.hurt).not.toHaveBeenCalled();f.p.pos.y=0;craters.update(0);expect(f.p.hurt).toHaveBeenCalledWith('puff',expect.any(Number),expect.any(Number));
    craters.update(5.99);expect(craters.craters).toHaveLength(1);craters.update(.02);expect(craters.craters).toHaveLength(0);
    craters.watch({...egg,life:0,fuse:0});craters.update(0);expect(craters.craters).toHaveLength(1);f.proj.clear();expect(craters.craters).toHaveLength(0);expect(craters.eggs).toHaveLength(0);
  });
});
