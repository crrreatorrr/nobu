import { beforeEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { save, SAVE_KEY } from '../src/core/save.js';
import { Session } from '../src/game/session.js';
import { LAYOUT, HUB_LAYOUT, trialVariant, canUploadTrial, TRIAL_TARGETS, trialMsInBounds } from '../src/config/trials.js';
import { enqueue, readQueue } from '../src/hub/scoreQueue.js';
import { hub } from '../src/hub/hubBridge.js';
import { resetWorld } from './helpers.js';
beforeEach(()=>{vi.restoreAllMocks();resetWorld();});
it('archives released L3 scores without giving new dogs or losing Golden, and queues eligible v2 separately',async()=>{
 expect(LAYOUT).toEqual({1:2,2:2,3:2});expect(HUB_LAYOUT).toEqual({1:2,2:2,3:2});
 expect(trialVariant(3)).toBe('3v2');expect(TRIAL_TARGETS['3v2']).toEqual([77,100,134,70]);
 expect(trialMsInBounds('3v2',20599)).toBe(false);expect(trialMsInBounds('3v2',20600)).toBe(true);
 localStorage.setItem(SAVE_KEY,JSON.stringify({v:2,bones:[false,false,true],bestDogs:[0,0,5],trials:{3:{ms:43000}}}));save.load();
 expect(save.data.trials[3]).toBeUndefined();expect(save.data.trialsClassic[3]).toMatchObject({ms:43000,layout:1});
 expect(save.data.boneBoard[3].golden).toBe(true);expect(Object.keys(save.data.dogsFreed).filter(k=>k.startsWith('3:'))).toHaveLength(5);
 vi.spyOn(hub,'playerId').mockReturnValue('known-player');const flush=vi.spyOn(hub,'flushScores').mockResolvedValue(undefined);
 const game={player:{pos:new THREE.Vector3()},ui:{trialTime(){},fade:()=>Promise.resolve()},trialDone:vi.fn()};
 const session=new Session(game,3,{trial:true});game.session=session;session.trialT=69.5;session._finishTrial();await Promise.resolve();
 expect(save.data.trials[3]).toMatchObject({ms:69500,layout:2,medal:'platinum'});
 save.write();save.load();expect(save.data.trialsClassic[3].ms).toBe(43000);expect(save.data.trials[3].ms).toBe(69500);
 expect(canUploadTrial('3v2')).toBe(true);expect(enqueue('known-player','3v2',69500)).toBe(false); // already queued by the real Session/bridge
 expect(readQueue().rows['known-player']['nobu_trial_time:3v2']).toMatchObject({ms:69500,meta:{level:'3v2',layout:2}});expect(flush).toHaveBeenCalledOnce();
});
