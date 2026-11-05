import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { save } from '../src/core/save.js';
import { Session } from '../src/game/session.js';
import { hub } from '../src/hub/hubBridge.js';
import { TRIAL_LEVELS, LOCAL_TRIAL_LEVELS, trialVariantInfo, canUploadTrial, trialMsInBounds } from '../src/config/trials.js';
import { enqueue, flushQueue, readQueue, SCORE_QUEUE_KEY } from '../src/hub/scoreQueue.js';
import { resetWorld } from './helpers.js';
beforeEach(()=>{resetWorld();});afterEach(()=>vi.restoreAllMocks());
it.each([[4,89500,24000],[6,55500,30000]])('keeps a real L%s trial result and Platinum locally without queuing or flushing even with a known player',async(level,ms,floor)=>{
 expect(LOCAL_TRIAL_LEVELS).toContain(level);expect(TRIAL_LEVELS).not.toContain(level);
 expect(trialVariantInfo(String(level))).toMatchObject({level,layout:1});expect(trialVariantInfo(`${level}v2`)).toBeNull();expect(canUploadTrial(String(level))).toBe(false);
 expect(trialMsInBounds(String(level),floor-1)).toBe(false);expect(trialMsInBounds(String(level),floor)).toBe(true);
 vi.spyOn(hub,'playerId').mockReturnValue('known-player');vi.spyOn(hub,'bank').mockResolvedValue(undefined);
 const flush=vi.spyOn(hub,'flushScores').mockResolvedValue(undefined);
 const game={player:{pos:new THREE.Vector3()},ui:{trialTime(){},fade:()=>Promise.resolve()},trialDone:vi.fn()};
 const session=new Session(game,level,{trial:true});game.session=session;session.trialT=ms/1000;session._finishTrial();await Promise.resolve();
 expect(save.data.trials[level]).toMatchObject({ms,layout:1,medal:'platinum',godUsed:false,bestEligibleMs:ms});
 save.write();save.load();expect(save.data.trials[level].ms).toBe(ms);expect(flush).not.toHaveBeenCalled();
 expect(readQueue().rows).toEqual({});expect(enqueue('known-player',String(level),ms)).toBe(false);
});
it('also refuses to send an unsupported L4 row retained by an older or future writer',async()=>{
 localStorage.setItem(SCORE_QUEUE_KEY,JSON.stringify({v:2,rows:{player:{'nobu_trial_time:4':{ms:90000,meta:{level:4},at:1,tries:0}}},posted:{}}));
 const sdk={submitScore:vi.fn()};await flushQueue(sdk,'player');expect(sdk.submitScore).not.toHaveBeenCalled();
});
