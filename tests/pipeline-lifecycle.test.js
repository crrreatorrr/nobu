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

import {Player} from '../src/player/player.js';
import {GameCamera} from '../src/camera/camera.js';
import {input} from '../src/core/input.js';
import {Game} from '../src/game/game.js';
import {Session, ownsAsyncLifecycle} from '../src/game/session.js';
import {makeKit,makeTrack,turtle} from '../src/levels/kit.js';
import {hub} from '../src/hub/hubBridge.js';
import {save} from '../src/core/save.js';
import {audio} from '../src/audio/audio.js';
import {UI} from '../src/ui/ui.js';
import {readQueue} from '../src/hub/scoreQueue.js';
import {resetWorld} from './helpers.js';
import {DEATH_FLOW} from '../src/config/difficulty.js';
const noop=()=>{};const sessions=[];
beforeEach(()=>{resetWorld();vi.useFakeTimers();const ctx=new Proxy({measureText:()=>({width:50}),createRadialGradient:()=>({addColorStop:noop}),createLinearGradient:()=>({addColorStop:noop}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]??noop});vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(ctx);vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('');vi.spyOn(hub,'bank').mockResolvedValue();vi.spyOn(hub,'beginAttempt').mockResolvedValue({id:'pipeline-life',ok:false});vi.spyOn(hub,'startCarry').mockImplementation(()=>{});vi.spyOn(hub,'exit').mockImplementation(()=>{});});
afterEach(()=>{for(const s of sessions.splice(0))s.dispose();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();});

function fixture({trial=false,realUI=false,level=5}={}) {
 const screen=document.createElement('div');
 const game=Object.assign(Object.create(Game.prototype),{state:'play',_pendingMainUnlocks:[],flyingMasks:[],loadout:{effects:{},cosmeticSlots:()=>({})},
  _worldLine:()=>'',_showComplete:vi.fn(),_refreshTitleNobu:noop,applyKennelTint:noop,titleScene:new THREE.Scene(),
  mask:{attach:noop,setLevel:noop,snapTo:noop,update:noop},
  ui:new Proxy({screen,talking:false,setScreen(html){screen.innerHTML=html;},fade:vi.fn(async()=>{}),say:vi.fn(async()=>{}),showLoading:vi.fn(()=>17),hideLoading:vi.fn(async()=>{})},{get:(o,k)=>o[k]??(o[k]=vi.fn())})});
 game.player=new Player(game);game.camera=new GameCamera(1.5);
 if(realUI){game.ui=new UI(document.createElement('div'));game.ui.fade=vi.fn(async()=>{});}
 const s=game.session=new Session(game,level,{trial});sessions.push(s);
 // Minimal real curved Stage/Kit content isolates orchestration from WIP authored routes.
 const build=(g,stage,tickets)=>{const tr=makeTrack(stage,turtle([0,0,0],[[40,0,0]]));const k=makeKit(g,stage,tickets,tr);k.floor(-4,44,-6,6);k.pack(0,0,15);return{spawn:tr.toWorld(1),facing:tr.yaw(1),camera:{mode:'track',track:tr}};};
 s.def={...s.def,build};s._warmUp=vi.fn(async()=>{});
 const stage=s._newStage(s.def.theme);const info=build(game,stage,s.tickets);stage.finalize();s.tickets.finalize();s.info=info;s._attachActors(info);
 s.breakablesTotal=1;s.dogsTotal=0;s.levelTickets=9;s.attemptId='pipeline-life';s.attemptDurable=false;s.snack={raw:0,potential:0};
 return{game,s};
}
async function pauseQuit(game) {
 const pressed=vi.spyOn(input,'pressed').mockImplementation(k=>k==='pause');game.updatePlay(.016);expect(game.state).toBe('pause');
 pressed.mockReturnValue(false);vi.spyOn(input,'confirmPressed').mockReturnValue(true);game.pauseSel=game._pauseItems().findIndex(i=>i.id==='quit');game.updatePause();await Promise.resolve();await Promise.resolve();
 expect(game.state).toBe('map');expect(game.session).toBeNull();
}
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};}
async function flush(ms=100){await vi.advanceTimersByTimeAsync(ms);}
function assertRetired(game,s){expect(s.disposed).toBe(true);expect(game.session).not.toBe(s);expect(save.data.beaten[5]).not.toBe(true);expect(hub.bank).not.toHaveBeenCalled();}
function watchAfterExit(game){game.ui.banner.mockClear?.();audio.play.mockClear();audio.playMusic.mockClear();game.player.pos.set(91,12,93);game.player.frozen=true;const write=vi.spyOn(save,'write');write.effects=[...['banner','showHud','setHud','bossShow','bossHp','bossHide','setScreen','trialTime'].map(k=>{void game.ui[k];return vi.spyOn(game.ui,k).mockClear();}),...['snap','endCinematic','cinematic','shake','setMode'].map(k=>vi.spyOn(game.camera,k).mockClear())];return write;}
function assertNoLateEffect(game,write){expect(game.player.pos.toArray()).toEqual([91,12,93]);expect(game.player.frozen).toBe(true);expect(write).not.toHaveBeenCalled();expect(hub.bank).not.toHaveBeenCalled();expect(audio.play).not.toHaveBeenCalled();expect(audio.playMusic).not.toHaveBeenCalled();for(const effect of write.effects)expect(effect).not.toHaveBeenCalled();}

it.each(['hub','firstRAF','secondRAF','warmup','hideLoading'])('retires L5 field startup at %s through actual pause-quit',async boundary=>{
 const{game,s}=fixture();const hold=deferred();let launch;
 if(boundary==='hub')hub.beginAttempt.mockReturnValueOnce(hold.promise);
 if(boundary==='warmup')s._warmUp.mockReturnValueOnce(hold.promise);
 if(boundary==='hideLoading')game.ui.hideLoading.mockReturnValueOnce(hold.promise);
 launch=s.startLevel();
 if(boundary==='firstRAF')await Promise.resolve();
 if(boundary==='secondRAF')await flush(16);
 if(boundary==='warmup'||boundary==='hideLoading')await flush(100);
 await pauseQuit(game);const write=watchAfterExit(game);hold.resolve({id:'late',ok:false});await flush(2000);expect(await launch).toBe(false);
 assertRetired(game,s);assertNoLateEffect(game,write);
});
it('cancels only L5 owned loading/dialogue and preserves a newer intro',async()=>{
 const{game,s}=fixture({realUI:true});const launch=s.startLevel();await flush(1300);expect(game.ui.dialog).toBeTruthy();const old=game.ui.dialog;
 game.toMap(5);const newer=game.ui.say([['mask','New owner']]),dialog=game.ui.dialog;game.player.frozen=true;
 expect(await launch).toBe(false);expect(game.ui.dialog).toBe(dialog);expect(game.player.frozen).toBe(true);expect(game.ui.cancelSay(old)).toBe(false);
 game.ui.cancelSay(dialog);await newer;
 const token=game.ui.showLoading('NEW','NEW OWNER');s._goalLoadingToken=token-1;s.dispose();expect(game.ui.loadEl.classList.contains('show')).toBe(true);game.ui.cancelLoading(token);
});
it.each(['map','title','hub','newLaunch'])('retires L5 when leaving via %s',async exit=>{
 const{game,s}=fixture();
 if(exit==='map')game.toMap(5);
 if(exit==='title')game.toTitle();
 if(exit==='hub')game.exitToHub();
 if(exit==='newLaunch'){const hold=deferred();hub.beginAttempt.mockReturnValueOnce(hold.promise);const launch=game.startLevel(6);await Promise.resolve();await Promise.resolve();expect(game.session).not.toBe(s);game.toMap(6);hold.resolve({id:'cancel-next',ok:false});await launch;}
 expect(s.disposed).toBe(true);expect(game.session).not.toBe(s);
});
it.each(['innerWait','activeRain','finalFade'])('retires L5 gate at %s without constructing the Queen arena',async boundary=>{
 const{game,s}=fixture();const start=vi.spyOn(s,'startBoss');const hold=deferred();
 if(boundary==='finalFade'){for(const e of s.stage.entities)if(e.kind==='backpack')e.broken=true;game.ui.fade.mockReturnValueOnce(hold.promise);}
 const gate=s.reachBossGate();
 if(boundary==='activeRain'){await flush(350);expect(s.rain).toBeTruthy();s._updateRain(.21);expect(s.rain.list.length).toBeGreaterThan(0);}
 if(boundary==='finalFade')await flush(1850);
 // Use the real map retirement while a presentation fade is deliberately held.
 game.toMap(5);const write=watchAfterExit(game);hold.resolve();await flush(2500);await gate;
 expect(s.rain??null).toBeNull();expect(start).not.toHaveBeenCalled();assertRetired(game,s);assertNoLateEffect(game,write);
});
async function arenaTo(boundary){
 const f=fixture();const{game,s}=f,hold=deferred();
 if(boundary==='warmup')s._warmUp.mockReturnValueOnce(hold.promise);
 if(boundary==='hideLoading')game.ui.hideLoading.mockReturnValueOnce(hold.promise);
 const launch=s.startBoss();
 if(boundary==='firstRAF')await Promise.resolve();
 if(boundary==='secondRAF')await flush(16);
 if(['warmup','hideLoading','intro'].includes(boundary))await flush(100);
 return{...f,hold,launch};
}
it.each(['firstRAF','secondRAF','warmup','hideLoading','intro'])('retires actual Queen startup at %s and releases its animation promise',async boundary=>{
 const{game,s,hold,launch}=await arenaTo(boundary);game.toMap(5);const write=watchAfterExit(game);hold.resolve();await flush(2000);expect(await launch).toBe(false);
 expect(s.boss?.introResolve??null).toBeNull();assertRetired(game,s);assertNoLateEffect(game,write);
});
async function liveBoss(){const f=await arenaTo('intro');const{game,s,launch}=f;expect(s.boss.introResolve).toBeTypeOf('function');s.boss.introResolve();s.boss.introResolve=null;await launch;expect(s.busy).toBe(false);expect(s.boss.active).toBe(true);return{game,s,boss:s.boss};}
it.each(['delay','evolve','postEvolve','dialogue'])('retires Queen phase continuation at %s',async boundary=>{
 const{game,s,boss}=await liveBoss();const hold=deferred();if(boundary==='dialogue')game.ui.say.mockReturnValueOnce(hold.promise);
 const change=s.onBossPhase(boss,2);
 if(boundary!=='delay')await flush(600);
 if(boundary==='postEvolve'||boundary==='dialogue'){boss.evolving.resolve();boss.evolving=null;await Promise.resolve();}
 if(boundary==='dialogue')await flush(1300);
 game.toMap(5);const write=watchAfterExit(game);hold.resolve();await flush(2500);await change;
 assertRetired(game,s);assertNoLateEffect(game,write);expect(boss.active).toBe(false);
});
it('invalidates an old Queen evolve on real death before its checkpoint retry',async()=>{
 const{game,s,boss}=await liveBoss();const change=s.onBossPhase(boss,2);await flush(600);const resolve=boss.evolving.resolve;
 s.onPlayerDeath('fall');expect(boss.evolving).toBeNull();resolve();await change;expect(boss.active).toBe(false);
 game.toMap(5);const write=watchAfterExit(game);await flush(6000);assertNoLateEffect(game,write);
});
it.each(['victoryTimer','settleTimer','finalFade'])('retires defeated Queen at %s without stale settlement',async boundary=>{
 const{game,s,boss}=await liveBoss();const hold=deferred();boss.hp=1;boss.vulnerable=true;boss.hitCool=0;expect(boss.damage()).toBe(true);expect(boss.defeated).toBe(true);
 if(boundary==='settleTimer')await flush(2600);
 if(boundary==='finalFade'){game.ui.fade.mockReturnValueOnce(hold.promise);await flush(6200);}
 game.toMap(5);const write=watchAfterExit(game);hold.resolve();await flush(7000);assertRetired(game,s);assertNoLateEffect(game,write);
});
it.each(['deathTimer','deathCard','deathFade'])('retires L5 death at %s before life deduction or stale respawn',async boundary=>{
 const{game,s}=fixture(),lives=save.data.lives,hold=deferred();s.onPlayerDeath('fall');
 if(boundary==='deathCard')await flush(1000);
 if(boundary==='deathFade'){game.ui.fade.mockReturnValueOnce(hold.promise);await flush(2700);}
 game.toMap(5);const write=watchAfterExit(game);hold.resolve();await flush(6000);
 expect(save.data.lives).toBe(lives);assertRetired(game,s);assertNoLateEffect(game,write);
});
it('does not deliver a retired Smog chase RUN banner',async()=>{
 const{game,s}=fixture();s.chase={begin:vi.fn()};s._startChase(128,1.8,true);game.toMap(5);const write=watchAfterExit(game);await flush(1600);expect(game.ui.banner).not.toHaveBeenCalled();assertNoLateEffect(game,write);
});
it('rejects stale direct Queen/trial settlement and phase callbacks',async()=>{
 const{game,s,boss}=await liveBoss();s._recordLevelStats();game.toMap(5);const before=JSON.stringify(save.data);const write=watchAfterExit(game);
 game.levelCleared(s);game.trialDone(s,95,'gold',true);s._finishTrial();s.onBossDefeated(boss);await s.onBossPhase(boss,3);
 expect(JSON.stringify(save.data)).toBe(before);assertNoLateEffect(game,write);
});
it('finishes a live Queen gate/arena/defeat without awarding clear at the field gate',async()=>{
 const{game,s}=fixture();for(const e of s.stage.entities)if(e.kind==='backpack')e.broken=true;
 const gate=s.reachBossGate();await flush(1950);expect(s.boss).toBeTruthy();expect(save.data.beaten[5]).not.toBe(true);expect(s.boss.introResolve).toBeTypeOf('function');
 s.boss.introResolve();s.boss.introResolve=null;await gate;expect(s.boss.active).toBe(true);expect(s.phase).toBe('boss');expect(s.info.spheres).toHaveLength(4);
 s.boss.hp=1;s.boss.vulnerable=true;s.boss.hitCool=0;s.boss.damage();await flush(6200);expect(save.data.beaten[5]).toBe(true);expect(hub.bank).toHaveBeenCalledTimes(1);expect(game.state).toBe('cutscene');
 const done=game.cut.onDone;game.toMap(5);const write=watchAfterExit(game);done();expect(game._showComplete).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled();
});
it('queues a live L5 trial, then rejects its retired result fade',async()=>{
 const{game,s}=fixture({trial:true});s.trialT=95;s.freezeMs=0;s.trialRunning=true;const hold=deferred();game.ui.fade.mockReturnValueOnce(hold.promise);
 vi.spyOn(hub,'flushScores').mockResolvedValue();const submit=vi.spyOn(hub,'submitScore');const pid=vi.spyOn(hub,'playerId').mockReturnValue('pipeline-local');
 s.reachBossGate();expect(save.data.trials[5]).toBeTruthy();expect(s.phase).toBe('level');expect(s.boss).toBeUndefined();expect(hub.bank).toHaveBeenCalledTimes(1);
 // The live result queues before retirement; the delayed result callback stays cancelled.
 expect(submit).toHaveBeenCalled();expect(readQueue().rows['pipeline-local']['nobu_trial_time:5'].ms).toBe(95000);game.toMap(5);hub.bank.mockClear();const write=watchAfterExit(game);hold.resolve();await flush(1000);assertNoLateEffect(game,write);expect(game.state).toBe('map');pid.mockRestore();
});
it('keeps lifecycle scope additive and leaves legacy boss levels outside new ownership gates',()=>{
 const{game,s}=fixture();expect(ownsAsyncLifecycle(s)).toBe(true);expect(s.def.goal).not.toBe(true);expect(ownsAsyncLifecycle({remix:true})).toBe(true);
 const legacy=new Session(game,1);expect(ownsAsyncLifecycle(legacy)).toBe(false);expect(legacy._pipelineCurrent({},null,999)).toBe(true);
});

it('normalizes string level5 for stale direct completion and checkpoint retry',async()=>{
 const{game,s}=fixture({level:'5'});expect(ownsAsyncLifecycle(s)).toBe(true);s._recordLevelStats();s.onPlayerDeath('fall');game.toMap(5);
 const lives=save.data.lives,before=JSON.stringify(save.data),write=watchAfterExit(game);const attach=vi.spyOn(game.player,'spawnAt');
 game.levelCleared(s);s.respawn();await flush(6000);expect(attach).not.toHaveBeenCalled();expect(save.data.lives).toBe(lives);expect(JSON.stringify(save.data)).toBe(before);assertNoLateEffect(game,write);
});
it('continues a live Queen stage-checkpoint retry after cancelling an in-progress evolution',async()=>{
 const{game,s,boss}=await liveBoss();boss.phase=2;const change=s.onBossPhase(boss,2);await flush(600);expect(boss.evolving).toBeTruthy();
 const lives=save.data.lives;game.player.die('fall');await change;await flush(2700);
 expect(s.bossPhaseCp).toBe(2);expect(boss.phase).toBe(2);expect(boss.active).toBe(true);expect(s.busy).toBe(false);expect(game.player.dead).toBe(false);expect(game.camera.cine).toBeNull();expect(save.data.lives).toBe(lives);expect(s.bossDeaths[2]).toBe(1);
});

it('shows a standalone L5 trial result without changing the public queue',async()=>{
 const{game,s}=fixture({trial:true});s.trialT=95;s.freezeMs=0;const before=JSON.stringify(readQueue());vi.spyOn(hub,'playerId').mockReturnValue(null);
 await s.reachBossGate();await Promise.resolve();expect(game.state).toBe('complete');expect(game.completeMode).toBe('trial');expect(save.data.trials[5].ms).toBe(95000);expect(JSON.stringify(readQueue())).toBe(before);expect(s.boss).toBeUndefined();
});
it('cancels L5 post-result dialogue on title departure without starting its ending later',async()=>{
 const{game,s}=fixture();game.ui=new UI(document.createElement('div'));game.ui.fade=vi.fn(async()=>{});game.state='complete';game.completeMode='plain';game.completeT=10;game.completeMinT=1;game.completeNext={n:5,bonus:false};
 vi.spyOn(input,'anyPressed').mockReturnValue(true);const result=game.updateComplete(.1);expect(game.ui.dialog).toBeTruthy();game.toTitle();const play=vi.spyOn(game,'playCutscene'),credits=vi.spyOn(game,'toCredits');await result;expect(game.state).toBe('title');expect(play).not.toHaveBeenCalled();expect(credits).not.toHaveBeenCalled();expect(s.disposed).toBe(true);
});

it('settles an abandoned L5 intro waiter when a newer dialogue already owns actual UI',async()=>{
 const{game,s}=fixture({realUI:true});const launch=s.startLevel();await flush(1300);const old=game.ui.dialog;expect(old).toBeTruthy();
 const newer=game.ui.say([['mask','Already newer']]),current=game.ui.dialog;game.toMap(5);game.player.frozen=true;
 expect(await launch).toBe(false);expect(game.ui.dialog).toBe(current);expect(game.player.frozen).toBe(true);game.ui.cancelSay(current);await newer;
});

it('respawns after the shorter death flow and keeps the card up for its full time when nothing is pressed',async()=>{
 const{game,s}=fixture(),lives=save.data.lives;const spawn=vi.spyOn(game.player,'spawnAt');s.onPlayerDeath('fall');
 expect(DEATH_FLOW.waitFall+DEATH_FLOW.card+DEATH_FLOW.fade).toBeLessThanOrEqual(1800);
 expect(DEATH_FLOW.waitOther+DEATH_FLOW.card+DEATH_FLOW.fade).toBeLessThanOrEqual(2100);
 await flush(DEATH_FLOW.waitFall);expect(game.ui.deathCard).toHaveBeenCalledWith('fall');
 s.update(0.4);await flush(DEATH_FLOW.card-1);expect(spawn).not.toHaveBeenCalled();
 await flush(1);expect(spawn).toHaveBeenCalledOnce();expect(save.data.lives).toBe(lives-1);expect(s.dying).toBe(false);expect(s._deathCard).toBeNull();
});
it.each(['jump','bite','confirm'])('skips the death card on %s after 250 ms without carrying the press into the respawn',async key=>{
 const{game,s}=fixture(),lives=save.data.lives;const spawn=vi.spyOn(game.player,'spawnAt');s.onPlayerDeath('fall');
 await flush(DEATH_FLOW.waitFall);input._pressed=new Set([key]);
 s.update(0.1);await flush(0);expect(spawn).not.toHaveBeenCalled(); // 100 ms: too early to skip
 s.update(0.2);await flush(0);
 expect(spawn).toHaveBeenCalledOnce();expect(save.data.lives).toBe(lives-1);expect(input._pressed.size).toBe(0);expect(s.dying).toBe(false);
 expect(DEATH_FLOW.waitFall+DEATH_FLOW.cardSkipAfter+DEATH_FLOW.fade).toBeLessThanOrEqual(1200);
 await flush(6000);expect(spawn).toHaveBeenCalledOnce();
});
it('an abandoned session never respawns, even when the skip key is pressed on its death card',async()=>{
 const{game,s}=fixture(),lives=save.data.lives;const spawn=vi.spyOn(game.player,'spawnAt');s.onPlayerDeath('fall');
 await flush(DEATH_FLOW.waitFall+300);expect(s._deathCard).toBeTruthy();
 game.toMap(5);const write=watchAfterExit(game);expect(s._deathCard).toBeNull();
 input._pressed=new Set(['jump']);s.update(0.5);s._updateDeathCard(0.5);await flush(6000);input._pressed=new Set();
 expect(spawn).not.toHaveBeenCalled();expect(save.data.lives).toBe(lives);assertRetired(game,s);assertNoLateEffect(game,write);
});
