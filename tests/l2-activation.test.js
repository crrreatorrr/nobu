import { beforeEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { save, SAVE_KEY } from '../src/core/save.js';
import { Session } from '../src/game/session.js';
import { LAYOUT, HUB_LAYOUT, trialVariant, canUploadTrial, TRIAL_TARGETS, trialMsInBounds } from '../src/config/trials.js';
import { LEVELS } from '../src/levels/registry.js';
import { totalDogs } from '../src/game/progress.js';
import { enqueue, readQueue } from '../src/hub/scoreQueue.js';
import { hub } from '../src/hub/hubBridge.js';
import { resetWorld } from './helpers.js';
beforeEach(()=>{vi.restoreAllMocks();resetWorld();});
it('activates L2 alone with seven stable dogs, fifty-four shipped dogs and the exact trial targets',()=>{
 expect(LAYOUT).toEqual({1:2,2:2,3:2});expect(HUB_LAYOUT).toEqual({1:2,2:2,3:2});
 expect(Object.keys(LEVELS[2].dogs)).toEqual(['corgi-a','pug-a','shiba-a','corgi-b','shiba-b','dalmatian-a','pug-b']);
 expect(totalDogs(LEVELS)).toBe(54);expect(trialVariant(2)).toBe('2v2');expect(TRIAL_TARGETS['2v2']).toEqual([90,114,156,82]);
 expect(trialMsInBounds('2v2',25999)).toBe(false);expect(trialMsInBounds('2v2',26000)).toBe(true);expect(LEVELS[2].hidden).toEqual({section:'Cat Flap Alley',move:'glide'});
});
it('archives Classic L2 scores, keeps earned Golden/old dogs, records clean local v2 and queues eligible v2 separately',async()=>{
 localStorage.setItem(SAVE_KEY,JSON.stringify({v:2,bones:[false,true,false],bestDogs:[0,3,0],trials:{2:{ms:47000}}}));save.load();
 expect(save.data.trials[2]).toBeUndefined();expect(save.data.trialsClassic[2]).toMatchObject({ms:47000,layout:1});expect(save.data.boneBoard[2].golden).toBe(true);
 expect(Object.keys(save.data.dogsFreed).filter(k=>k.startsWith('2:'))).toEqual(['2:corgi-a','2:pug-a','2:shiba-a']);
 vi.spyOn(hub,'playerId').mockReturnValue('known-player');vi.spyOn(hub,'bank').mockResolvedValue(undefined);const flush=vi.spyOn(hub,'flushScores').mockResolvedValue(undefined);
 const game={player:{pos:new THREE.Vector3()},ui:{trialTime(){},fade:()=>Promise.resolve()},trialDone:vi.fn()},session=new Session(game,2,{trial:true});game.session=session;session.trialT=81.5;session._finishTrial();await Promise.resolve();
 expect(save.data.trials[2]).toMatchObject({ms:81500,layout:2,medal:'platinum'});save.write();save.load();expect(save.data.trialsClassic[2].ms).toBe(47000);expect(save.data.trials[2].ms).toBe(81500);
 expect(canUploadTrial('2v2')).toBe(true);expect(enqueue('known-player','2v2',81500)).toBe(false); // already queued by the real Session/bridge
 expect(readQueue().rows['known-player']['nobu_trial_time:2v2']).toMatchObject({ms:81500,meta:{level:'2v2',layout:2}});expect(flush).toHaveBeenCalledOnce();
 expect(save.data.boneBoard[2].golden).toBe(true);expect(Object.keys(save.data.dogsFreed).filter(k=>k.startsWith('2:'))).toHaveLength(3);
});
