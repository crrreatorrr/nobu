import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { save } from '../src/core/save.js';
import { Session } from '../src/game/session.js';
import { hub } from '../src/hub/hubBridge.js';
import { TRIAL_LEVELS, LOCAL_TRIAL_LEVELS, trialVariant, trialVariantInfo, canUploadTrial, trialMsInBounds } from '../src/config/trials.js';
import { enqueue, flushQueue, readQueue, SCORE_QUEUE_KEY } from '../src/hub/scoreQueue.js';
import { resetWorld } from './helpers.js';
const CASES=[[1,85000,25700],[2,81500,26000],[3,69500,20600],[4,89500,24000],[6,55500,30000],[5,84000,21000]];
beforeEach(()=>resetWorld());afterEach(()=>vi.restoreAllMocks());
function finish(level,ms){
 const game={player:{pos:new THREE.Vector3()},ui:{trialTime(){},fade:()=>Promise.resolve()},trialDone:vi.fn()};
 const session=new Session(game,level,{trial:true});game.session=session;session.trialT=ms/1000;session._finishTrial();return session;
}
it.each(CASES)('queues clean L%s with its exact current variant/floor and flushes only its owner',async(level,ms,floor)=>{
 const variant=trialVariant(level),layout=level<=3?2:1;
 expect(LOCAL_TRIAL_LEVELS).toContain(level);expect(TRIAL_LEVELS).toEqual([1,2,3,4,6,5]);
 expect(trialVariantInfo(variant)).toMatchObject({level,layout});expect(canUploadTrial(variant)).toBe(true);
 expect(trialMsInBounds(variant,floor-1)).toBe(false);expect(trialMsInBounds(variant,floor)).toBe(true);
 expect(enqueue('known-player',variant,floor-1)).toBe(false);
 vi.spyOn(hub,'playerId').mockReturnValue('known-player');vi.spyOn(hub,'bank').mockResolvedValue();
 const flush=vi.spyOn(hub,'flushScores').mockResolvedValue();
 finish(level,ms);await Promise.resolve();
 expect(save.data.trials[level]).toMatchObject({ms,layout,medal:'platinum',godUsed:false,bestEligibleMs:ms,pid:'known-player'});
 save.write();save.load();expect(save.data.trials[level].ms).toBe(ms);expect(flush).toHaveBeenCalledOnce();
 expect(readQueue().rows['known-player'][`nobu_trial_time:${variant}`]).toMatchObject({ms,meta:{level:layout===2?variant:level}});
 expect(enqueue('known-player',variant,ms)).toBe(false);
 const sdk={submitScore:vi.fn().mockResolvedValue({accepted:true})};
 await flushQueue(sdk,'other-player');expect(sdk.submitScore).not.toHaveBeenCalled();
 expect(await flushQueue(sdk,'known-player')).toMatchObject({sent:1,acked:1});
 expect(sdk.submitScore).toHaveBeenCalledWith('nobu_trial_time',ms,expect.objectContaining({level:layout===2?variant:level}));
 expect(readQueue().rows).toEqual({});
});
it.each(CASES)('keeps standalone and God L%s results local without retroactive attribution',async(level,ms)=>{
 const pid=vi.spyOn(hub,'playerId').mockReturnValue(null);vi.spyOn(hub,'bank').mockResolvedValue();
 const flush=vi.spyOn(hub,'flushScores').mockResolvedValue();
 finish(level,ms);await Promise.resolve();expect(save.data.trials[level]).toMatchObject({ms,pid:null});
 pid.mockReturnValue('later-player');
 await flushQueue({submitScore:vi.fn(()=>{throw Error('historical standalone write');})},'later-player');
 expect(readQueue().rows).toEqual({});
 // A slower clean run posts itself, never the faster standalone record.
 finish(level,ms+1000);await Promise.resolve();
 expect(readQueue().rows['later-player'][`nobu_trial_time:${trialVariant(level)}`].ms).toBe(ms+1000);
 localStorage.removeItem(SCORE_QUEUE_KEY);flush.mockClear();save.data.godMode=true;
 finish(level,ms-1000);await Promise.resolve();
 expect(readQueue().rows).toEqual({});expect(flush).not.toHaveBeenCalled();
});
it('rejects Classic and unsupported variants while preserving posted history',async()=>{
 localStorage.setItem(SCORE_QUEUE_KEY,JSON.stringify({v:2,rows:{player:{
  'nobu_trial_time:1':{ms:50000,meta:{level:1},at:1,tries:0},
  'nobu_trial_time:4v2':{ms:90000,meta:{level:'4v2'},at:1,tries:0},
 }},posted:{player:{1:50000}}}));
 for(const variant of ['1','2','3','4v2','5v2','6v2','ride','cave','7'])expect(enqueue('player',variant,90000)).toBe(false);
 const sdk={submitScore:vi.fn()};await flushQueue(sdk,'player');expect(sdk.submitScore).not.toHaveBeenCalled();
 expect(readQueue().posted.player).toEqual({1:50000});
});
