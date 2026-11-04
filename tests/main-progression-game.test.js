import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Game } from '../src/game/game.js';
import { LEVELS } from '../src/levels/registry.js';
import { CHAPTER2 } from '../src/story/script.js';
import { save, SAVE_KEY } from '../src/core/save.js';
import { resetWorld } from './helpers.js';
import { audio } from '../src/audio/audio.js';
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
