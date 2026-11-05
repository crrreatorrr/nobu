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
import {Session} from '../src/game/session.js';
import {makeKit,makeTrack,turtle} from '../src/levels/kit.js';
import {hub} from '../src/hub/hubBridge.js';
import {save} from '../src/core/save.js';
import {audio} from '../src/audio/audio.js';
import {UI} from '../src/ui/ui.js';
import {checkDogMetadata} from '../src/game/kennelChecks.js';
import {resetWorld} from './helpers.js';
const noop=()=>{};const sessions=[];
beforeEach(()=>{resetWorld();vi.useFakeTimers();const ctx=new Proxy({measureText:()=>({width:50}),createRadialGradient:()=>({addColorStop:noop}),createLinearGradient:()=>({addColorStop:noop}),getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]??noop});vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(ctx);vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('');vi.spyOn(hub,'bank').mockResolvedValue();});
afterEach(()=>{for(const s of sessions.splice(0))s.dispose();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();});
function fixture(level=6,options={}){
 const screen=document.createElement('div');
 const game=Object.assign(Object.create(Game.prototype),{state:'play',_pendingMainUnlocks:[],flyingMasks:[],_worldLine:()=>'',_showComplete:vi.fn(),
 player:{pos:new THREE.Vector3(),vel:new THREE.Vector3(),body:{s:0,u:0},abilities:{},frozen:false,setRide:vi.fn()},camera:{cam:new THREE.PerspectiveCamera(),shake:noop},
 ui:new Proxy({screen,setScreen(html){screen.innerHTML=html;},fade:vi.fn(async()=>{}),trialTime:vi.fn(),trialDone:vi.fn()},{get:(o,k)=>o[k]??(o[k]=vi.fn())})});
 const s=game.session=new Session(game,level,options);sessions.push(s);return{game,s};
}

function goalFixture(){
 const f=fixture();const {game,s}=f;game.loadout={effects:{},cosmeticSlots:()=>({})};game.player=new Player(game);game.camera=new GameCamera(1.5);game.ui.talking=false;
 game._showComplete=Game.prototype._showComplete;
 const stage=s._newStage('river'),tr=makeTrack(stage,turtle([0,0,0],[[40,0,0]])),k=makeKit(game,stage,s.tickets,tr);
 for(const d of[15,17])k.pack(0,0,d).broken=true;
 s.breakablesTotal=2;s.dogsTotal=0;s.snack={raw:10,potential:10};s.levelTickets=9;s.attemptId='retired-l6';s.attemptDurable=true;
 return f;
}
it.each(['wait900','rain','finalFade'])('rejects a retired main goal at %s after actual pause-quit',async boundary=>{
 const {game,s}=goalFixture();let release;
 if(boundary==='finalFade')game.ui.fade.mockImplementationOnce(()=>new Promise(r=>release=r));
 const done=s.reachGoal();
 if(boundary==='rain')await vi.advanceTimersByTimeAsync(900);
 if(boundary==='finalFade'){await vi.advanceTimersByTimeAsync(2750);expect(release).toBeTypeOf('function');}
 const pressed=vi.spyOn(input,'pressed').mockImplementation(k=>k==='pause');game.updatePlay(.016);expect(game.state).toBe('pause');
 pressed.mockReturnValue(false);vi.spyOn(input,'confirmPressed').mockReturnValue(true);game.pauseSel=game._pauseItems().findIndex(i=>i.id==='quit');game.updatePause();await Promise.resolve();await Promise.resolve();
 expect(game.state).toBe('map');expect(game.session).toBeNull();expect(save.data.beaten[6]).not.toBe(true);expect(hub.bank).not.toHaveBeenCalled();
 release?.();await vi.runAllTimersAsync();await done;
 expect(save.data.beaten[6]).not.toBe(true);expect(hub.bank).not.toHaveBeenCalled();expect(game.state).toBe('map');
});
it('rejects direct Game settlement from a stale main-goal Session',()=>{
 const {game,s}=goalFixture();s._recordLevelStats();game.session=null;game.state='map';
 game.goalLevelCleared(s);expect(save.data.beaten[6]).not.toBe(true);expect(hub.bank).not.toHaveBeenCalled();expect(game.state).toBe('map');
});

it('does not show a retired Perfect banner or sound after the inner rain delay',async()=>{
 const {game,s}=goalFixture();const done=s.reachGoal();await vi.advanceTimersByTimeAsync(900);
 game.toMap(6);game.ui.banner.mockClear();audio.play.mockClear();await vi.runAllTimersAsync();await done;
 expect(game.ui.banner).not.toHaveBeenCalledWith('PERFECT!',expect.anything(),expect.anything());
 expect(audio.play).not.toHaveBeenCalledWith('oneUp');
 expect(save.data.beaten[6]).not.toBe(true);expect(game.state).toBe('map');
});

it('resolves and removes active main-goal rain when the real map transition retires it',async()=>{
 const {game,s}=goalFixture();for(const e of s.stage.entities)if(e.kind==='backpack')e.broken=false;
 const done=s.reachGoal();await vi.advanceTimersByTimeAsync(1250);
 expect(s.rain).not.toBeNull();s._updateRain(.21);
 const drops=s.rain.list.map(d=>d.m);expect(drops.length).toBeGreaterThan(0);
 game.toMap(6);game.ui.banner.mockClear();audio.play.mockClear();
 expect(s.disposed).toBe(true);expect(s.rain).toBeNull();expect(drops.every(m=>m.parent===null)).toBe(true);
 await vi.runAllTimersAsync();await done;
 expect(game.ui.banner).not.toHaveBeenCalled();expect(audio.play).not.toHaveBeenCalled();
 expect(hub.bank).not.toHaveBeenCalled();expect(save.data.beaten[6]).not.toBe(true);expect(game.state).toBe('map');
});

it('rejects deferred main-goal startup after actual pause-quit while Hub begin is pending',async()=>{
 const {game,s}=goalFixture();game.mask={attach:vi.fn(),setLevel:vi.fn(),snapTo:vi.fn(),update:vi.fn()};s._warmUp=async()=>{};
 let release;vi.spyOn(hub,'beginAttempt').mockImplementation(()=>new Promise(r=>release=r));vi.spyOn(hub,'startCarry').mockImplementation(()=>{});
 const launch=s.startLevel().catch(error=>error);expect(s.loading).toBe(true);expect(release).toBeTypeOf('function');
 const pressed=vi.spyOn(input,'pressed').mockImplementation(k=>k==='pause');game.updatePlay(.016);expect(game.state).toBe('pause');
 pressed.mockReturnValue(false);vi.spyOn(input,'confirmPressed').mockReturnValue(true);game.pauseSel=game._pauseItems().findIndex(i=>i.id==='quit');game.updatePause();await Promise.resolve();await Promise.resolve();
 expect(game.state).toBe('map');expect(game.session).toBeNull();expect(s.disposed).toBe(true);game.ui.showHud.mockClear();game.ui.banner.mockClear();game.player.pos.set(100,10,100);
 release({id:'retired-loading',ok:false});await vi.runAllTimersAsync();const error=await launch;
 expect(error).toBe(false);expect(game.ui.showHud).not.toHaveBeenCalled();expect(game.ui.banner).not.toHaveBeenCalled();expect(hub.startCarry).not.toHaveBeenCalled();expect(game.player.pos.toArray()).toEqual([100,10,100]);
});

it('rejects retired loading presentation after actual pause-quit during warm-up',async()=>{
 const {game,s}=goalFixture();game.mask={attach:vi.fn(),setLevel:vi.fn(),snapTo:vi.fn(),update:vi.fn()};let release;
 s._warmUp=()=>new Promise(r=>release=r);vi.spyOn(hub,'beginAttempt').mockResolvedValue({id:'loading-warm-up',ok:false});vi.spyOn(hub,'startCarry').mockImplementation(()=>{});
 const launch=s.startLevel();await vi.advanceTimersByTimeAsync(100);expect(release).toBeTypeOf('function');expect(s.loading).toBe(true);
 const pressed=vi.spyOn(input,'pressed').mockImplementation(k=>k==='pause');game.updatePlay(.016);expect(game.state).toBe('pause');
 pressed.mockReturnValue(false);vi.spyOn(input,'confirmPressed').mockReturnValue(true);game.pauseSel=game._pauseItems().findIndex(i=>i.id==='quit');game.updatePause();await Promise.resolve();await Promise.resolve();
 expect(game.state).toBe('map');expect(game.session).toBeNull();expect(s.disposed).toBe(true);game.ui.showHud.mockClear();game.ui.banner.mockClear();
 release();await vi.runAllTimersAsync();await launch;
 expect(game.ui.showHud).not.toHaveBeenCalled();expect(game.ui.banner).not.toHaveBeenCalled();expect(game.state).toBe('map');
});

it('retires its actual intro dialogue without cancelling a newer one or unfreezing the shared Player',async()=>{
 const {game,s}=goalFixture();game.mask={attach:vi.fn(),setLevel:vi.fn(),snapTo:vi.fn(),update:vi.fn()};
 game.ui=new UI(document.createElement('div'));game.ui.fade=async()=>{};s._warmUp=async()=>{};
 vi.spyOn(hub,'beginAttempt').mockResolvedValue({id:'intro-cancel',ok:false});vi.spyOn(hub,'startCarry').mockImplementation(()=>{});
 const launch=s.startLevel();await vi.advanceTimersByTimeAsync(1200);
 expect(game.ui.dialog).toBeTruthy();const owned=game.ui.dialog;
 game.toMap(6);expect(game.ui.dialog).toBeNull();
 const newer=game.ui.say([['mask','New dialogue']]),current=game.ui.dialog;
 game.player.frozen=true;expect(await launch).toBe(false);
 expect(game.ui.dialog).toBe(current);expect(game.player.frozen).toBe(true);
 expect(game.ui.cancelSay(owned)).toBe(false);game.ui.cancelSay(current);await newer;
});

it('keeps actual map nodes in the scroll surface, details separate and auto-centers the canonical selected node',()=>{
 const {game}=fixture();save.data.open[6]=true;game.mapSel=6;
 const centered=[];vi.stubGlobal('HTMLElement',HTMLElement);Object.defineProperty(HTMLElement.prototype,'scrollIntoView',{configurable:true,value:function(opts){centered.push({node:this,opts});}});
 try{game._drawMap();const screen=game.ui.screen,selected=screen.querySelector('.map-node.sel');
 expect(selected.closest('.map-scroll')).toBeTruthy();expect(selected.closest('.map-island')).toBeTruthy();expect(selected.style.left).toBe('93%');expect(selected.style.top).toBe('33%');
 expect(screen.querySelector('.map-details .map-panel')).toBeTruthy();expect(screen.querySelector('.map-scroll .map-panel')).toBeNull();
 expect(centered.at(-1)).toEqual({node:selected,opts:{block:'center',inline:'center',behavior:'auto'}});
 game.mapSel='kennel';save.data.open.kennel=true;game._drawMap();expect(screen.querySelector('.map-node.sel').style.left).toBe('12%');
 }finally{delete HTMLElement.prototype.scrollIntoView;vi.unstubAllGlobals();}
});
it('trial census omissions stay limited to declared detour section names and retain main/mismatch/duplicate errors',()=>{
 const {game,s}=goalFixture();const tr=s.stage.track,k=makeKit(game,s.stage,s.tickets,tr);s.stage.entities=[];
 const dog=k.dog(0,0,5,'shiba',{id:'shiba-a'});tr.sections=[{d0:0,d1:10,name:'Drain'}];
 s.def={...s.def,dogs:{'shiba-a':'Drain','pug-b':'Rain'},sections:[{name:'Rain',detour:true}]};s.trial=true;
 expect(checkDogMetadata(s)).toEqual([]);
 dog.pos.copy(tr.toWorld(20));expect(checkDogMetadata(s).some(e=>e.problem==='dog section mismatch')).toBe(true);
 dog.pos.copy(tr.toWorld(5));s.stage.entities.push(dog);expect(checkDogMetadata(s).some(e=>e.problem==='dog id mismatch')).toBe(true);
 s.stage.entities=[];expect(checkDogMetadata(s)).toEqual([{level:6,id:'shiba-a',problem:'missing authored dog'}]);
 s.stage.entities=[dog];s.trial=false;expect(checkDogMetadata(s)).toEqual([{level:6,id:'pug-b',problem:'missing authored dog'}]);
});
