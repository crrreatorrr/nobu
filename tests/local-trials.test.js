import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { save } from '../src/core/save.js';
import { Session } from '../src/game/session.js';
import { hub } from '../src/hub/hubBridge.js';
import { TRIAL_LEVELS, LOCAL_TRIAL_LEVELS, trialVariantInfo, canUploadTrial, trialMsInBounds } from '../src/config/trials.js';
import { enqueue, flushQueue, readQueue, SCORE_QUEUE_KEY } from '../src/hub/scoreQueue.js';
import { resetWorld } from './helpers.js';
beforeEach(()=>{resetWorld();});afterEach(()=>vi.restoreAllMocks());
it('keeps a real L4 trial result and Platinum locally without queuing or flushing even with a known player',async()=>{
 expect(LOCAL_TRIAL_LEVELS).toContain(4);expect(TRIAL_LEVELS).not.toContain(4);
 expect(trialVariantInfo('4')).toMatchObject({level:4,layout:1});expect(trialVariantInfo('4v2')).toBeNull();expect(canUploadTrial('4')).toBe(false);
 expect(trialMsInBounds('4',23999)).toBe(false);expect(trialMsInBounds('4',24000)).toBe(true);
 vi.spyOn(hub,'playerId').mockReturnValue('known-player');vi.spyOn(hub,'bank').mockResolvedValue(undefined);
 const flush=vi.spyOn(hub,'flushScores').mockResolvedValue(undefined);
 const game={player:{pos:new THREE.Vector3()},ui:{trialTime(){},fade:()=>Promise.resolve()},trialDone:vi.fn()};
 const session=new Session(game,4,{trial:true});game.session=session;session.trialT=89.5;session._finishTrial();await Promise.resolve();
 expect(save.data.trials[4]).toMatchObject({ms:89500,layout:1,medal:'platinum',godUsed:false,bestEligibleMs:89500});
 save.write();save.load();expect(save.data.trials[4].ms).toBe(89500);expect(flush).not.toHaveBeenCalled();
 expect(readQueue().rows).toEqual({});expect(enqueue('known-player','4',89500)).toBe(false);
});
it('also refuses to send an unsupported L4 row retained by an older or future writer',async()=>{
 localStorage.setItem(SCORE_QUEUE_KEY,JSON.stringify({v:2,rows:{player:{'nobu_trial_time:4':{ms:90000,meta:{level:4},at:1,tries:0}}},posted:{}}));
 const sdk={submitScore:vi.fn()};await flushQueue(sdk,'player');expect(sdk.submitScore).not.toHaveBeenCalled();
});
