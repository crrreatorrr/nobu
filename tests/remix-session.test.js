import * as THREE from 'three';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { Session } from '../src/game/session.js';
import { Game } from '../src/game/game.js';
import { Breakable } from '../src/entities/entity.js';
import { ConedDog } from '../src/entities/dogs.js';
import { save, SAVE_KEY } from '../src/core/save.js';
import { hub } from '../src/hub/hubBridge.js';
import { resetWorld } from './helpers.js';
beforeEach(()=>{resetWorld();save.data.beaten[5]=true;vi.spyOn(hub,'bank').mockResolvedValue();vi.spyOn(hub,'reportCone').mockResolvedValue();});
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
function fixture({broken=true,god=false,level=1}={}){
 const game={ui:{fade:async()=>{},banner:vi.fn(),bossHp(){},bossHide(){},say:vi.fn()},
 player:{pos:new THREE.Vector3(),frozen:false,setRide:vi.fn(),victory:vi.fn()},camera:{cinematic(){}},
 levelCleared:vi.fn(),goalLevelCleared:vi.fn(),remixCleared:vi.fn()};
 const s=new Session(game,level,{remix:true});game.session=s;s.godUsed=god;
 const b=Object.assign(Object.create(Breakable.prototype),{countable:true,broken});
 const dog=Object.assign(Object.create(ConedDog.prototype),{freed:true,dogId:'1:shiba-a'});
 s.stage={entities:[b,dog],sections:[],dispose:vi.fn()};game.stage=s.stage;s.breakablesTotal=s.dogsTotal=1;s.freedIds.add('1:shiba-a');
 s._missedRain=async()=>{};s.startBoss=vi.fn();s.projectiles={clear(){}};
 s.boss={};
 s.attemptId='remix-attempt';s.attemptDurable=true;s.levelTickets=11;
 return s;
}
it('enforces Queen unlock and mutually exclusive modes at the actual Session boundary',()=>{
 save.data.beaten[5]=false;expect(()=>new Session({},1,{remix:true})).toThrow('unavailable');
 expect(()=>new Session({},1,{remix:true,trial:true})).toThrow('mutually exclusive');
 expect(()=>new Session({},'ride',{remix:true})).toThrow('unavailable');
});
it('retains the boss gate and captures Golden without awarding a quit',async()=>{
 const s=fixture(),before=structuredClone(save.data);await s.reachBossGate();await Promise.resolve();
 expect(s.startBoss).toHaveBeenCalledOnce();expect(s.remixGate.golden).toBe(true);
 expect(s._finishRemix()).toBe(false);expect(save.data).toEqual(before);expect(hub.bank).not.toHaveBeenCalled();
 s.dispose();s._remixClearReached=true;expect(s._finishRemix()).toBe(false);
});
it('awards only its own bone after retained boss defeat, banks once, and ignores later boss deaths',async()=>{
 vi.useFakeTimers();const s=fixture();await s.reachBossGate();await Promise.resolve();
 const before=structuredClone(save.data);s.deaths=20;s.phase='boss';s.def={...s.def,bossKey:'cone'};
 s.onBossDefeated(s.boss);await vi.runAllTimersAsync();
 expect(save.data).toEqual({...before,remix:{1:{golden:true}}});
 expect(hub.bank).toHaveBeenCalledExactlyOnceWith('remix-attempt',11,true);expect(hub.reportCone).not.toHaveBeenCalled();
 expect(s.game.remixCleared).toHaveBeenCalledExactlyOnceWith(s,{id:1,fresh:true,golden:true});
 expect(s.game.levelCleared).not.toHaveBeenCalled();expect(s.game.ui.say).not.toHaveBeenCalled();
 expect(s._finishRemix()).toBe(false);
});
it.each([{broken:false},{god:true}])('keeps a partial or sticky-God clear out of mastery: %j',async options=>{
 vi.useFakeTimers();const s=fixture(options);await s.reachBossGate();s.phase='boss';s.onBossDefeated(s.boss);await vi.runAllTimersAsync();
 expect(save.data.remix[1]).toBeUndefined();expect(hub.bank).toHaveBeenCalledOnce();expect(s.game.remixCleared.mock.calls[0][1].golden).toBe(false);
});
it('does not let a delayed boss callback award or change UI after quitting',async()=>{
 vi.useFakeTimers();const s=fixture();await s.reachBossGate();s.onBossDefeated(s.boss);s.dispose();s.game.session=null;
 await vi.runAllTimersAsync();expect(hub.bank).not.toHaveBeenCalled();expect(s.game.remixCleared).not.toHaveBeenCalled();expect(save.data.remix[1]).toBeUndefined();
});
it('routes the main L6 goal to remix completion and suppresses colored/warp progress',async()=>{
 vi.useFakeTimers();const s=fixture();s.level=6;s.def={...s.def,id:6,bonus:false};
 const before=structuredClone(save.data);expect(s.secretWarp('ride')).toBe(false);
 expect(Game.prototype.collectBone.call(s.game,'red')).toBe(false);expect(save.data).toEqual(before);
 const done=s.reachGoal();await vi.runAllTimersAsync();await done;
 expect(save.data.remix[6].golden).toBe(true);expect(save.data.beaten[6]).toBeUndefined();expect(save.data.open[5]).not.toBe(true);
 expect(s.game.goalLevelCleared).not.toHaveBeenCalled();expect(hub.bank).toHaveBeenCalledOnce();
});
it('unions another tab\'s Remix bones on actual completion and reload without erasing either',async()=>{
 const s=fixture();await s.reachBossGate();s._remixClearReached=true;
 localStorage.setItem(SAVE_KEY,JSON.stringify({...save.data,remix:{2:{golden:true}}}));
 expect(s._finishRemix()).toBe(true);save.load();
 expect(save.data.remix).toMatchObject({1:{golden:true},2:{golden:true}});
});

it.each([1,5])('retains boss identity, epoch and stage ownership through Remix%i defeat and settlement',async level=>{
 vi.useFakeTimers();const s=fixture({level});await s.reachBossGate();s.phase='boss';
 s.onBossDefeated({});expect(s._remixClearReached).toBeUndefined();
 s.onBossDefeated(s.boss);expect(s._remixClearReached.stage).toBe(s.stage);
 const oldStage=s.stage;s.stage=s.game.stage={...oldStage};expect(s._finishRemix()).toBe(false);
 s.stage=s.game.stage=oldStage;s._lifecycleEpoch=(s._lifecycleEpoch||0)+1;
 expect(s._finishRemix()).toBe(false);await vi.runAllTimersAsync();
 expect(hub.bank).not.toHaveBeenCalled();expect(s.game.remixCleared).not.toHaveBeenCalled();
});
it('settles a retained live Queen Remix without original ending, medals or story progress',async()=>{
 vi.useFakeTimers();const s=fixture({level:5}),before=structuredClone(save.data);await s.reachBossGate();
 s.phase='boss';s.onBossDefeated(s.boss);await vi.runAllTimersAsync();
 expect(save.data).toEqual({...before,remix:{5:{golden:true}}});
 expect(hub.bank).toHaveBeenCalledOnce();expect(s.game.remixCleared).toHaveBeenCalledOnce();
 expect(s.game.levelCleared).not.toHaveBeenCalled();expect(s.game.ui.say).not.toHaveBeenCalled();
});
