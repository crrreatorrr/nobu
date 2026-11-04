import * as THREE from 'three';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
vi.mock('../src/entities/fx.js', () => ({ makeShadow: () => new THREE.Group(), placeShadow() {}, textSprite() {}, textTexture() {}, FX: class {} }));
import { Session } from '../src/game/session.js';
import { Game } from '../src/game/game.js';
import { Breakable } from '../src/entities/entity.js';
import { ConedDog } from '../src/entities/dogs.js';
import { Assets } from '../src/art/assets.js';
import { audio } from '../src/audio/audio.js';
import { save } from '../src/core/save.js';
import { resetWorld } from './helpers.js';
beforeEach(()=>{resetWorld();vi.useFakeTimers();vi.spyOn(Assets,'tex').mockReturnValue(new THREE.Texture());vi.spyOn(audio,'play').mockImplementation(()=>{});});
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();});
function session() {
 const noop=()=>{};
 const game={ui:{setHud:noop,chain:vi.fn(),banner:vi.fn(),fade:async()=>{}},player:{pos:new THREE.Vector3(),body:{grounded:false,s:0},facing:0,spawnAt:noop,setRide:noop,update:noop},camera:{shake:vi.fn(),snap:noop,update:noop,basis:{}},mask:{setLevel:noop,snapTo:noop,update:noop},fx:{clear:noop,update:noop,ring:noop,puff:noop}};
 const s=new Session(game,1);game.session=s;
 const scene=new THREE.Scene();s.stage={entities:[],scene,track:{triggers:[],project:(_x,z)=>({s:z,u:0}),groundAt:()=>({y:0})},add(e){this.entities.push(e);scene.add(e.obj);return e;},update:noop,followSky:noop};
 s.tickets={restoreAfter:noop,clearFlying:noop,update:noop};s.projectiles={clear:noop,update:noop};s.setMask=noop;s._pushHud=noop;
 s.breakablesTotal=0;s.dogsTotal=0;s.checkpoint(new THREE.Vector3());return s;
}
it('uses actual Session break/enemy/update hooks and checkpoint/respawn sphere lifecycle without resetting the run seed',()=>{
 const s=session(),seed=s.runSeed;
 for(let i=0;i<7;i++)s.onBreak({});s.onEnemyDefeated({});expect(s.stage.entities).toHaveLength(1);expect(s.chain.n).toBe(8);
 s.update(5);expect(s.chain.n).toBe(8);s.game.player.body.grounded=true;s.update(1.1);expect(s.chain.n).toBe(0);expect(s.chain.best).toBe(8);
 s.checkpoint(new THREE.Vector3());for(let i=0;i<8;i++)s.onBreak({});expect(s.stage.entities).toHaveLength(2);
 s.respawn();expect(s.chain.n).toBe(0);expect(s.chain.sphereGiven).toBe(false);expect(s.stage.entities).toHaveLength(0);expect(s.runSeed).toBe(seed);
 for(let i=0;i<3;i++)s.onBreak({});s.onPlayerDeath('fall');expect(s.chain.n).toBe(0);expect(s.runSeed).toBe(seed);
});
it('ends chains at both tray transitions and removes only lost-round drops',async()=>{
 const s=session(),seed=s.runSeed;for(let i=0;i<3;i++)s.onBreak({});
 const tray={round:{start:new THREE.Vector3(0,12,0),back:new THREE.Vector3(),facing:0}};
 await s.enterBonusRound(tray);expect(s.chain.n).toBe(0);expect(s.chain.best).toBe(3);
 for(let i=0;i<8;i++)s.onBreak({});expect(s.stage.entities).toHaveLength(1);
 await s._leaveBonusRound(false);expect(s.chain.n).toBe(0);expect(s.chain.best).toBe(8);expect(s.stage.entities).toHaveLength(0);expect(s.runSeed).toBe(seed);
});
it('freezes chain/miss stats at the gate and persists bounded section misses without banking dogs early',async()=>{
 const s=session();s.stage.sections=[{d0:0,d1:20,name:'Start'},{d0:20,d1:40,name:'Lily Pond'}];
 const b=Object.assign(Object.create(Breakable.prototype),{countable:true,broken:false,pos:new THREE.Vector3(0,0,25)});
 const dog=Object.assign(Object.create(ConedDog.prototype),{freed:false,pos:new THREE.Vector3(0,0,10),dogId:'1:shiba-a'});
 s.stage.entities=[b,dog];s.breakablesTotal=1;s.dogsTotal=1;
 for(let i=0;i<6;i++)s.onBreak({});s._missedRain=async()=>{};s.startBoss=vi.fn();await s.reachBossGate();
 expect(s.chain.n).toBe(0);expect(s.stats).toMatchObject({bestChain:6,sectionMiss:{'Lily Pond':1},missedDogs:{Start:1}});
 save.load();expect(save.data.lastMiss[1]).toEqual({'Lily Pond':1});expect(save.data.dogsFreed).toEqual({});
});
it('banks records/badges through real clear without changing Tickets, excluding trial clears',()=>{
 const s=session();s.stats={...s.liveStats(),bestChain:15,tickets:0,freedIds:[]};
 Game.prototype.levelCleared.call({playCutscene(){}},s);expect(save.data.bestChain[1]).toBe(15);expect(save.data.chainBadges[1]).toBe(true);expect(s.stats.chainRecord).toBe(false);expect(save.data.tickets).toBe(0);
 s.stats.bestChain=16;Game.prototype.levelCleared.call({playCutscene(){}},s);expect(s.stats.chainRecord).toBe(true);
 const t=session();t.trial=true;t.stats={...t.liveStats(),bestChain:30,tickets:0,freedIds:[]};Game.prototype.levelCleared.call({playCutscene(){}},t);expect(save.data.bestChain[1]).toBe(16);
});
it('snapshots partial-state hooks after a real checkpoint and leaves newly spawned flop targets for the next action',()=>{
 const s=session(),hook=vi.fn(),mystery=vi.fn();s.stage.entities=[{onCheckpoint:hook},{kind:'mystery',onCheckpoint:mystery}];
 s.checkpoint(new THREE.Vector3());expect(hook).toHaveBeenCalledOnce();expect(mystery).not.toHaveBeenCalled();
 const late=vi.fn();s.stage.entities=[{pos:new THREE.Vector3(),interactive:true,onFlop(){s.stage.entities.push({pos:new THREE.Vector3(),interactive:true,onFlop:late});}}];
 s.onFlop(new THREE.Vector3());expect(late).not.toHaveBeenCalled();
});
