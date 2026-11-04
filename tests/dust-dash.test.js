import * as THREE from 'three';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { Player, DUST_DASH, TUNING } from '../src/player/player.js';
import { World } from '../src/world/physics.js';
import { DustWall } from '../src/entities/gatedObjects.js';
import { Shellback, LidKnight } from '../src/entities/enemies.js';
import { save } from '../src/core/save.js';
import { input } from '../src/core/input.js';
import { audio } from '../src/audio/audio.js';
import { resetWorld } from './helpers.js';
const basis = { right: { x: 1, z: 0 }, forward: { x: 0, z: 1 } };
function fixture({ trial = false } = {}) {
 const fx = Object.fromEntries(['dust','puff','burst','shock','ring','smokeCard'].map(k=>[k,vi.fn()]));
 const game = { loadout: { effects: {} }, fx, ui: { setConed() {},tutorial() {} }, camera: { cam: new THREE.PerspectiveCamera(58),shake() {} }, onPlayerDeath: vi.fn(), onFlop() {} };
 const p=Object.create(Player.prototype);Object.assign(p,{ game,pos:new THREE.Vector3(),vel:new THREE.Vector3(),root:new THREE.Group(),model:{},wings:{},halo:{},deathCone:{visible:false,position:new THREE.Vector3()},stars:{},_animate(){},_updateShadow(){},_paintGear(){} });
 p.body={pos:p.pos,vel:p.vel,h:1.3,hw:.3,hd:.3};p.reset();p.body.grounded=true;p.barkT=1;p.barkCool=0;p.stepT=0;
 const stage={game,world:new World(),entities:[],track:null,killYAt:()=>-20};p.body.ground=stage.world.addBox(0,-1,0,80,1,80);
 game.stage=stage;game.player=p;game.session={level:1,phase:'level',trial,nextSeq:()=>1,onBreak(){},rescueDog(){}};
 return {p,game,stage};
}
beforeEach(()=>{resetWorld();vi.spyOn(audio,'play').mockImplementation(()=>{});vi.spyOn(input,'pressed').mockReturnValue(false);vi.spyOn(input,'held').mockReturnValue(false);input.state.x=0;input.state.y=0;
 const gradient={addColorStop(){}};const ctx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>o[k]||(()=>{})});vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(ctx);
});
afterEach(()=>vi.restoreAllMocks());
it('requires beaten4 and an active ground slide, while the boss reward remains allowed in trials',()=>{
 const {p}=fixture();p._startSlide(0);expect(p._startDustDash()).toBe(false);save.data.beaten[4]=true;p.body.grounded=false;expect(p._startDustDash()).toBe(false);p.body.grounded=true;p.mode='normal';expect(p._startDustDash()).toBe(false);p._startSlide(0);p.game.session.trial=true;expect(p._startDustDash()).toBe(true);
 expect(DUST_DASH).toEqual({speed:20,time:.22,cooldown:.8,slideRemaining:.15});expect(TUNING.SLIDE_SPEED).toBe(12.5);
});
it('travels exactly4.4m at20m/s, holds vertical zero and restores .15 slide time without spending paid charges',()=>{
 save.data.beaten[4]=true;const {p,stage,game}=fixture();p.dashCharges=2;p._startSlide(0);expect(p._startDustDash()).toBe(true);expect(p.invulnT).toBe(.22);expect(game.camera.cam.fov).toBe(62);
 for(let i=0;i<22;i++){p.update(.01,stage,basis);if(p.dustDashing)expect(p.vel.z).toBeCloseTo(20);}
 expect(p.pos.z).toBeCloseTo(4.4,5);expect(p.pos.y).toBeCloseTo(0);expect(p.dustDashing).toBe(false);expect(p.slideT).toBeCloseTo(.35);expect(p.mode).toBe('slide');expect(p.dashCharges).toBe(2);expect(game.camera.cam.fov).toBe(58);expect(game.fx.smokeCard).toHaveBeenCalled();
});
it('caps the final partial frame distance, enforces once per slide and .8s cooldown from start',()=>{
 save.data.beaten[4]=true;const {p,stage}=fixture();p._startSlide(0);p._startDustDash();for(let i=0;i<14;i++)p.update(1/60,stage,basis);expect(p.pos.z).toBeCloseTo(4.4,5);expect(p._startDustDash()).toBe(false);
 p._startSlide(0);expect(p._startDustDash()).toBe(false);p.dustDashCool=.001;p.update(.01,stage,basis);expect(p._startDustDash()).toBe(true);
});
it('breaks a real blocking DustWall from physical approach before passing it, without forced overlap',()=>{
 save.data.beaten[4]=true;const {p,stage}=fixture();const wall=new DustWall(stage,0,0,2);stage.entities.push(wall);p._startSlide(0);p._startDustDash();for(let i=0;i<10;i++)p.update(.02,stage,basis);expect(wall.broken).toBe(true);expect(wall.solid.enabled).toBe(false);expect(p.pos.z).toBeGreaterThan(2.45);
});
it('dispatches dash-only boss hooks, flips Shellback capabilities, and leaves other bosses untouched',()=>{
 const {p}=fixture();const opted={onDash:vi.fn()},boss={maxHp:9,onSlide:vi.fn()},shell=Object.create(Shellback.prototype);shell.onFlop=vi.fn();
 p._dustContact(opted);expect(opted.onDash).toHaveBeenCalledWith(p);p._dustContact(boss);expect(boss.onSlide).not.toHaveBeenCalled();p._dustContact(shell);expect(shell.onFlop).toHaveBeenCalledWith(p);
 const steel={onSlide:vi.fn()};p._dustContact(steel);expect(steel.onSlide).toHaveBeenCalledWith(p);const barkRock={onBark:vi.fn()};expect(p._dustContact(barkRock)).toBe(false);expect(barkRock.onBark).not.toHaveBeenCalled();
});
it('cancels on respawn/death, restores its own FOV but respects a new camera owner, and preserves paid air dash',()=>{
 save.data.beaten[4]=true;const {p,stage,game}=fixture();p._startSlide(0);p._startDustDash();game.camera.cam.fov=70;p.reset();expect(game.camera.cam.fov).toBe(70);expect(p.dustDashing).toBe(false);
 p.body.grounded=false;p.mode='normal';game.loadout.effects={air_dash:{charges_per_jump:1,dash_time_s:.2,distance_m:3}};p.dashCharges=1;p._startAirDash();expect(p.airDashT).toBe(.2);expect(p.dashCharges).toBe(0);expect(p.vel.length()).toBe(15);
 p.reset();p.body.grounded=true;p._startSlide(0);p._startDustDash();p.frozen=true;p.update(.01,stage,basis);expect(p.dustDashing).toBe(false);p.frozen=false;
 p.reset();p.body.grounded=true;p._startSlide(0);p._startDustDash();p.die('fall');expect(p.dustDashing).toBe(false);expect(p.dead).toBe(true);
});
it('lets only explicitly opted-in bosses receive the existing Mega Bark cone/range callback',()=>{
 const {p,stage}=fixture();const opted={pos:new THREE.Vector3(0,0,3.5),maxHp:9,acceptsBark:true,onBark:vi.fn()},normal={...opted,acceptsBark:false,onBark:vi.fn()},far={...opted,pos:new THREE.Vector3(0,0,6.6),onBark:vi.fn()};stage.entities.push(opted,normal,far);p.facing=0;p._bark();expect(opted.onBark).toHaveBeenCalledWith(p);expect(normal.onBark).not.toHaveBeenCalled();expect(far.onBark).not.toHaveBeenCalled();
});

it('uses the actual slide-then-bite input sequence while a single slide tap and paid air dash keep their behavior',()=>{
 save.data.beaten[4]=true;const {p,stage,game}=fixture();input.state.y=1;input.pressed.mockImplementation(action=>action==='slide');p.update(.01,stage,basis);expect(p.mode).toBe('slide');expect(p.dustDashing).toBe(false);expect(p.vel.z).toBeCloseTo(12.5);
 input.pressed.mockImplementation(action=>action==='bite');p.update(.01,stage,basis);expect(p.dustDashing).toBe(true);expect(p.vel.z).toBeCloseTo(20);
 p.reset();p.body.grounded=false;p.pos.y=3;game.loadout.effects={air_dash:{charges_per_jump:1,dash_time_s:.2,distance_m:3}};p.dashCharges=1;input.pressed.mockImplementation(action=>action==='dash');p.update(.01,stage,basis);expect(p.airDashT).toBeCloseTo(.19);expect(p.dashCharges).toBe(0);expect(p.dustDashing).toBe(false);expect(Math.hypot(p.vel.x,p.vel.z)).toBeCloseTo(15);
});
it('uses the real LidKnight shield knock and Shellback flop/flip handlers for Dust contacts',()=>{
 const {p,stage}=fixture();const knight=Object.create(LidKnight.prototype);Object.assign(knight,{stage,game:stage.game,pos:new THREE.Vector3(),dead:false,state:'alive',shield:new THREE.Group(),shieldKick:0,knock:vi.fn()});p._dustContact(knight);expect(knight.knock).toHaveBeenCalledWith(p.pos);
 const shell=Object.create(Shellback.prototype);Object.assign(shell,{stage,game:stage.game,pos:new THREE.Vector3(),dead:false,state:'alive',mode:'walk',flipT:0,squash:vi.fn()});p._dustContact(shell);expect(shell.mode).toBe('flipped');p._dustContact(shell);expect(shell.squash).toHaveBeenCalled();
});

it('preserves the paid Spell Bark boss exclusion even for an opted-in Titan',()=>{
 const {p,stage,game}=fixture();const titan={pos:new THREE.Vector3(0,0,3.5),maxHp:9,acceptsBark:true,onBark:vi.fn()};stage.entities.push(titan);
 game.loadout.effects.spell_bark={range_m:9,cone_dot:.4,cooldown_s:.7,y_tol_m:2.5,rings:4,ring_step_m:2.2,color:0xa66bff,skip_bosses:true};
 p.facing=0;p._bark();expect(titan.onBark).not.toHaveBeenCalled();
});
