import * as THREE from 'three';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { LEVELS, levelDef, playOrder } from '../src/levels/registry.js';
import { Game } from '../src/game/game.js';
import { Session } from '../src/game/session.js';
import { basePointsMax, goodBoyPercent, totalDogs } from '../src/game/progress.js';
import { chapterMapPaths } from '../src/game/chapterMapPaths.js';
import { save, SAVE_KEY } from '../src/core/save.js';
import { hub } from '../src/hub/hubBridge.js';
import { enqueue, readQueue } from '../src/hub/scoreQueue.js';
import { canUploadTrial, trialMsInBounds } from '../src/config/trials.js';
import { resetWorld } from './helpers.js';

beforeEach(()=>resetWorld());
afterEach(()=>vi.restoreAllMocks());

it('reconciles an older retained Rapids clear into the final chapter exactly once',()=>{
  localStorage.setItem(SAVE_KEY,JSON.stringify({v:3,unlocked:3,beaten:{6:true},open:{1:true,4:true,6:true}}));
  save.load();
  const game={_pendingMainUnlocks:[]};
  Game.prototype._unlockMainChapters.call(game);
  expect(save.data.open[5]).toBe(true);expect(game._pendingMainUnlocks).toEqual([5]);
  Game.prototype._unlockMainChapters.call(game);
  expect(game._pendingMainUnlocks).toEqual([5]);
  expect(playOrder()).toEqual([1,2,3,4,6,5]);
  expect(levelDef(5)).toMatchObject({bossKey:'queen',theme:5,tier:5,trial:true,mapPos:{x:84,y:13}});
  expect(levelDef(5).goal).toBeUndefined();
  expect(chapterMapPaths(save.data,LEVELS,[5]).find(path=>path.id==='6-5')).toMatchObject({animate:true});
});

it('finishes the six-stage census at54 dogs and95 base points, normalized to100',()=>{
  expect(totalDogs(LEVELS)).toBe(54);expect(basePointsMax(LEVELS)).toBe(95);
  expect(Object.keys(LEVELS[5].dogs)).toEqual(['shiba-a','pug-a','corgi-a','dalmatian-a','shiba-b','corgi-b','pug-b']);
  const data={beaten:{},boneBoard:{},dogsFreed:{},colorBones:{red:true,blue:true,green:true,purple:true,yellow:true}};
  for(const def of Object.values(LEVELS).filter(def=>def.dogs&&!def.gauntlet&&!def.meta)){
    data.beaten[def.id]=true;data.boneBoard[def.id]={golden:true,goodBoy:true,hidden:true,snack:3};
    for(const id of Object.keys(def.dogs))data.dogsFreed[`${def.id}:${id}`]=true;
  }
  expect(goodBoyPercent(data,LEVELS)).toEqual({base:100,mastery:0,total:100});
});

it('stores a real Pipeline local trial while leaving public queues, economy and story rewards untouched',async()=>{
  const bank=vi.spyOn(hub,'bank').mockResolvedValue();
  vi.spyOn(hub,'playerId').mockReturnValue('pipeline-player');
  const flush=vi.spyOn(hub,'flushScores').mockResolvedValue();
  const stage={entities:[]};
  const game={stage,player:{pos:new THREE.Vector3()},ui:{trialTime(){},fade:()=>Promise.resolve()},trialDone:vi.fn()};
  const session=game.session=new Session(game,5,{trial:true});session.stage=stage;session.trialT=84;
  const wallet=save.data.tickets;
  session._finishTrial();await Promise.resolve();
  save.write();save.load();
  expect(save.data.trials[5]).toMatchObject({ms:84000,layout:1,medal:'platinum'});
  expect(game.trialDone).toHaveBeenCalledOnce();
  expect(save.data.tickets).toBe(wallet);expect(save.beatenOf(5)).toBe(false);
  expect(save.data.boneBoard[5]).toBeUndefined();expect(bank).toHaveBeenCalledWith(undefined,0,undefined);
  expect(canUploadTrial('5')).toBe(false);expect(enqueue('pipeline-player','5',84000)).toBe(false);
  expect(readQueue().rows).toEqual({});expect(flush).not.toHaveBeenCalled();
  expect(trialMsInBounds('5',21000)).toBe(true);expect(trialMsInBounds('5',20999)).toBe(false);
});
