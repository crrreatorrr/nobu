import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Game } from '../src/game/game.js';
import { LEVELS } from '../src/levels/registry.js';
import { CHAPTER2 } from '../src/story/script.js';
import { save, SAVE_KEY } from '../src/core/save.js';
import { resetWorld } from './helpers.js';
import { audio } from '../src/audio/audio.js';
import { input } from '../src/core/input.js';
const prior4=LEVELS[4];
beforeEach(()=>{resetWorld();vi.spyOn(audio,'playMusic').mockImplementation(()=>{});});
afterEach(()=>{if(prior4)LEVELS[4]=prior4;else delete LEVELS[4];vi.restoreAllMocks();});
it('gives an older completed save the newly shipped chapter and plays its story once before the map',()=>{
 LEVELS[4]={id:4,shipped:true,bonus:false,unlock:d=>!!d.open[4]};
 Object.assign(save.data,{finished:true,unlocked:3,beaten:{3:true},seenCh2:false});
 const game=Object.assign(Object.create(Game.prototype),{
  ui:Object.fromEntries(['trialTime','hideHud','bossHide','banner','fade'].map(name=>[name,vi.fn()])),
  _drawMap:vi.fn(),playCutscene:vi.fn(),
 });
 game.toMap(3);expect(save.data.open[4]).toBe(true);expect(game._drawMap).not.toHaveBeenCalled();
 expect(game.playCutscene.mock.calls[0][0]).toBe(CHAPTER2);
 game.playCutscene.mock.calls[0][1]();expect(save.data.seenCh2).toBe(true);expect(game.mapSel).toBe(4);
 expect(game.ui.banner).toHaveBeenCalledWith('CHAPTER 2','LAUNDRY DAY IS OPEN',2.5);
 game.toMap(4);expect(game.playCutscene).toHaveBeenCalledOnce();expect(save.data.unlocked).toBe(3);
});
it('retains the chapter acknowledgement across old-tab merges and clears it for New Game',()=>{
 save.data.seenCh2=true;save.write({merge:false});save.data.seenCh2=false;save.write();save.load();expect(save.data.seenCh2).toBe(true);
 save.reset();expect(save.data.seenCh2).toBe(false);
 const disk=JSON.parse(localStorage.getItem(SAVE_KEY));disk.seenCh2='false';localStorage.setItem(SAVE_KEY,JSON.stringify(disk));save.load();expect(save.data.seenCh2).toBe(false);
});
it.each([[4,[1,2,3,4]],[6,[1,2,3,4,5,6]],[5,[1,2,3,4,5]]])('Continue puts the map cursor on level %i when it was the last one played',(last,open)=>{
 for(const id of open)save.data.open[id]=true;
 Object.assign(save.data,{seenIntro:true,lastLevel:last,unlocked:3});
 const game=Object.assign(Object.create(Game.prototype),{
  titleIdle:0,titleMenu:true,titleSel:0,
  titleAnim:{update:()=>({})},titleNobu:{apply:vi.fn()},titleMask:{position:{},rotation:{}},
  toMap:vi.fn(),_drawTitleMenu:vi.fn(),
 });
 game.titleSel=game._titleItems().findIndex(i=>i.id==='continue');
 expect(game.titleSel).toBeGreaterThanOrEqual(0);
 vi.spyOn(audio,'play').mockImplementation(()=>{});
 input._pressed=new Set(['confirm']);
 try{game.updateTitle(0.016);}finally{input._pressed=new Set();}
 expect(game.toMap).toHaveBeenCalledWith(last);
});
it('Continue falls back to an open level when the last one played is not open',()=>{
 Object.assign(save.data,{lastLevel:6,unlocked:2});
 const game=Object.assign(Object.create(Game.prototype),{
  ui:Object.fromEntries(['trialTime','hideHud','bossHide','banner','fade'].map(name=>[name,vi.fn()])),
  _drawMap:vi.fn(),playCutscene:vi.fn(),
 });
 game.toMap(save.data.lastLevel??1);expect(game.mapSel).toBe(2);
});
