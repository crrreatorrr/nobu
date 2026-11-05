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
