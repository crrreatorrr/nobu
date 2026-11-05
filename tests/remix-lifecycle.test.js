import * as THREE from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../src/art/assets.js', () => ({ Assets: {
  has: () => false, model: () => null, animate: () => null, aspect: () => 1,
  tex: () => new THREE.Texture({ width: 16, height: 16 }),
  tiled: () => new THREE.Texture({ width: 16, height: 16 }), url: () => '',
} }));
vi.mock('../src/audio/audio.js', () => ({ audio: {
  play: vi.fn(), playMusic: vi.fn(), stopMusic: vi.fn(), setRate: vi.fn(),
} }));
vi.mock('../src/entities/fx.js', async original => {
  const module = await original();
  return { ...module, FX: class {
    constructor() { return new Proxy({ sparks: { spawn: vi.fn() } }, { get: (o, k) => o[k] ?? (o[k] = vi.fn()) }); }
  } };
});

import {Session} from '../src/game/session.js';
import {Game} from '../src/game/game.js';
import {Player} from '../src/player/player.js';
import {GameCamera} from '../src/camera/camera.js';
import {Track,turtle} from '../src/world/track.js';
import {makeKit} from '../src/levels/kit.js';
import {moveBody} from '../src/world/physics.js';
import {save} from '../src/core/save.js';
import {hub} from '../src/hub/hubBridge.js';
import {resetWorld} from './helpers.js';
const noop=()=>{};const sessions=[];
beforeEach(()=>{vi.useFakeTimers();resetWorld();save.data.beaten[5]=true;save.data.tickets=77;save.data.lives=5;
 const ctx=new Proxy({measureText:()=>({width:50}),createRadialGradient:()=>({addColorStop:noop}),createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]??noop});
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(ctx);
 vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('');
});
afterEach(()=>{for(const s of sessions.splice(0))s.dispose();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();});
function fixture(remix=true){
 const game={state:'play',ui:new Proxy({fade:vi.fn(async()=>{}),say:vi.fn(async()=>{})},{get:(o,k)=>o[k]??(o[k]=vi.fn())}),
 camera:new GameCamera(1.5),loadout:{effects:{},cosmeticSlots:()=>({})},mask:{attach:vi.fn(),setLevel:vi.fn(),snapTo:vi.fn(),update:vi.fn()},gameOver:vi.fn()};
 game.player=new Player(game);game.onPlayerDeath=Game.prototype.onPlayerDeath;
 const s=game.session=new Session(game,1,{remix});sessions.push(s);
 const stage=s._newStage(1),tr=new Track(turtle([5,0,8],[[40,32,1],[40,-51,-1]]),{mirror:remix});stage.setTrack(tr);
 const k=makeKit(game,stage,s.tickets,tr);k.floor(0,80);k.walls([[0,4,6,3],[80,4,6,3]]);
 s._attachActors({spawn:k.W(0,0,5),facing:tr.yaw(5),camera:{mode:'behind',track:tr},fov:58});s.projectiles.clear=vi.fn();
 return {game,s,stage,tr,k};
}
it.each(['before-card','after-card','during-fade'])('ignores a retired actual Player death retry at %s',async boundary=>{
 const {game,s}=fixture();game.player.die('fall');expect(s.dying).toBe(true);
 let finishFade;
 if(boundary==='after-card')await vi.advanceTimersByTimeAsync(1000);
 if(boundary==='during-fade'){
  game.ui.fade.mockImplementation(()=>new Promise(resolve=>{finishFade=resolve;}));
  await vi.advanceTimersByTimeAsync(2700);expect(finishFade).toBeTypeOf('function');
 }
 s.dispose();game.session={level:2};save.data.tickets=123;save.data.lives=7;game.player.pos.set(100,10,100);
 game.ui.deathCard.mockClear();game.ui.showHud.mockClear();game.ui.clearScreen.mockClear();
 finishFade?.();await vi.advanceTimersByTimeAsync(3000);s.respawn();
 expect(save.data.lives).toBe(7);expect(save.data.tickets).toBe(123);expect(game.player.pos.toArray()).toEqual([100,10,100]);
 expect(game.ui.deathCard).not.toHaveBeenCalled();expect(game.ui.showHud).not.toHaveBeenCalled();expect(game.ui.clearScreen).not.toHaveBeenCalled();expect(game.gameOver).not.toHaveBeenCalled();
});
it('ignores a stale death entry and a previous stage retry within a live Remix Session',async()=>{
 const {game,s,stage}=fixture();game.player.die('fall');s.stage={};await vi.advanceTimersByTimeAsync(3000);
 expect(save.data.lives).toBe(5);expect(game.ui.deathCard).not.toHaveBeenCalled();
 game.session={level:2};const deaths=s.deaths;s.dying=false;s.onPlayerDeath('fall');expect(s.deaths).toBe(deaths);
 s.stage=null;stage.dispose();
});
it('applies the same pending-retry ownership rule to the Gauntlet Session context',async()=>{
 const {game,s}=fixture(false);s.def={...s.def,gauntlet:true};game.player.die('fall');s.dispose();game.session={level:2};
 save.data.tickets=123;save.data.lives=7;game.player.pos.set(100,10,100);game.ui.deathCard.mockClear();
 await vi.advanceTimersByTimeAsync(3000);s.respawn();
 expect(save.data.tickets).toBe(123);expect(save.data.lives).toBe(7);expect(game.player.pos.toArray()).toEqual([100,10,100]);expect(game.ui.deathCard).not.toHaveBeenCalled();
});
it('retains the live actual Player death life cost, checkpoint wallet and assistance exclusion',async()=>{
 const {game,s}=fixture();s.deathsAtCp=20;game.player.die('fall');save.data.tickets=100;
 await vi.advanceTimersByTimeAsync(3000);
 expect(save.data.lives).toBe(4);expect(save.data.tickets).toBe(77);expect(s.mask).toBe(0);
 expect(game.player.pos.distanceTo(s.cp.pos)).toBeLessThan(.001);expect(game.ui.showHud).toHaveBeenCalled();
});
it('retains live Remix checkpoint economy and disables help after many actual retries',()=>{
 const {game,s}=fixture();save.data.tickets=100;s.levelTickets=10;s.fieldRaw=40;s.deathsAtCp=20;
 s.respawn();expect(save.data.tickets).toBe(77);expect(s.levelTickets).toBe(0);expect(s.mask).toBe(0);expect(game.player.pos.toArray()).toEqual(s.cp.pos.toArray());
});
it('preserves reflected real collision outcomes for an asymmetric curved corridor and off-center raised platform',()=>{
 const a=fixture(false),b=fixture(true);for(const f of[a,b])f.k.platform(2,1.5,25,2.8,4,.5);
 for(const u of[-3,0,2,5]){
  const bodies=[a,b].map(f=>({pos:f.k.W(u,8,25),vel:new THREE.Vector3(0,-8,0),hw:.3,hd:.3,h:1.3,grounded:false}));
  for(let i=0;i<100;i++){moveBody(a.stage.world,bodies[0],.02);moveBody(b.stage.world,bodies[1],.02);}
  expect(bodies[1].pos.x).toBeCloseTo(10-bodies[0].pos.x,4);expect(bodies[1].pos.y).toBeCloseTo(bodies[0].pos.y,4);expect(bodies[1].pos.z).toBeCloseTo(bodies[0].pos.z,4);
  expect(bodies[1].grounded).toBe(bodies[0].grounded);
 }
});

it.each([1,2])('pairs the actual main %i chase actor through authored curved route samples without tuning changes',async id=>{
 const {LEVELS}=await import('../src/levels/registry.js');
 const {Chaser}=await import('../src/entities/chaser.js');
 const pairs=[fixture(false),fixture(true)];
 for(const f of pairs){f.stage=f.s._newStage(id);f.stage.decor=noop;f.s.tickets=f.game.tickets;
  const rng=vi.spyOn(Math,'random').mockReturnValue(.37);const info=LEVELS[id].build(f.game,f.stage,f.s.tickets);rng.mockRestore();
  f.s._attachActors(info);f.tr=f.stage.track;f.chaser=f.stage.entities.find(e=>e instanceof Chaser);expect(f.chaser).toBeTruthy();
  const d=id===1?f.chaser.d0:30;f.chaser.begin(d,0);f.s.cp.pos.copy(f.tr.authorToWorld(d+13));
 }
 const [a,b]=pairs,axis=a.tr.mirrorAxisX;
 for(let i=0;i<180;i++){
  const d=(id===1?a.chaser.d0:30)+20+i*.14,u=Math.sin(i/17)*1.5;
  for(const f of pairs){f.game.player.body.s=d;f.game.player.body.u=f.tr.authorU(u);f.game.player.pos.copy(f.tr.authorToWorld(d,u));f.chaser.update(.02);}
  expect(b.chaser.pos.x).toBeCloseTo(2*axis-a.chaser.pos.x,3);expect(b.chaser.pos.z).toBeCloseTo(a.chaser.pos.z,3);expect(b.chaser.pos.y).toBeCloseTo(a.chaser.pos.y,3);
  expect(b.chaser.speed).toBeCloseTo(a.chaser.speed,8);expect(b.chaser.u).toBeCloseTo(-a.chaser.u,6);
 }
 expect(a.game.player.dead).toBe(false);expect(b.game.player.dead).toBe(false);
});
