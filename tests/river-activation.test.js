import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { LEVELS, levelDef, playOrder, isOpen } from '../src/levels/registry.js';
import { nextMainLevel, unlockFollowingMain } from '../src/game/mainProgression.js';
import { chapterMapPaths, chapterMapMarkup } from '../src/game/chapterMapPaths.js';
import { Session } from '../src/game/session.js';
import { Game } from '../src/game/game.js';
import { save } from '../src/core/save.js';
import { hub } from '../src/hub/hubBridge.js';
import { resetWorld } from './helpers.js';

beforeEach(()=>resetWorld());
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});

it('opens the actual Rapids after Titan while retaining the campaign order and future Queen gate',()=>{
  const data={v:3,unlocked:3,beaten:{4:true},open:{1:true}};
  expect(unlockFollowingMain(data,LEVELS)).toEqual([6]);
  expect(isOpen(6,data)).toBe(true);
  expect(nextMainLevel(4,LEVELS)).toBe(6);
  expect(nextMainLevel(6,LEVELS)).toBeNull();
  expect(data.open[5]).toBeUndefined();
  expect(playOrder()).toEqual([1,2,3,4,6]);
  expect(levelDef(6)).toMatchObject({goal:true,bonus:false,theme:'river',tier:4.5,trial:true});
  expect(Object.values(levelDef(6).dogs)).toEqual(['Drain Mouth','Gutter Run','The Lock','Whirlpool Bend','Barge Yard','Rain Gutter','Pump House']);
  expect(levelDef(6).hidden).toEqual({section:'Pump House',move:'dust'});
});

it('ends the real main-goal session after its rain and banks its gate snapshot without opening unshipped L5',async()=>{
  vi.useFakeTimers();
  const order=[],noop=()=>{};
  vi.spyOn(hub,'bank').mockImplementation(async()=>{order.push('bank');});
  const game={player:{frozen:false,setRide:vi.fn()},ui:{banner:noop,fade:async()=>{order.push('fade');}},
    _pendingMainUnlocks:[],_unlockMainChapters:Game.prototype._unlockMainChapters,
    _showComplete:vi.fn(),bonusCleared:vi.fn()};
  game.goalLevelCleared=s=>Game.prototype.goalLevelCleared.call(game,s);
  const s=new Session(game,6);game.session=s;
  s.stats={broken:48,breakables:48,dogs:7,dogsTotal:7,deathsAtGate:0,
    snackRaw:100,snackPotential:100,hiddenFound:true,bestChain:0,perfectCandidate:true,
    freedIds:Object.keys(levelDef(6).dogs).map(id=>`6:${id}`)};
  vi.spyOn(s,'_recordLevelStats').mockImplementation(()=>{order.push('snapshot');});
  vi.spyOn(s,'_missedRain').mockImplementation(async()=>{order.push('rain');});
  const end=s.reachGoal();await vi.runAllTimersAsync();await end;
  expect(order).toEqual(['snapshot','rain','fade','bank']);
  expect(save.beatenOf(6)).toBe(true);
  expect(save.data.open[5]).toBeUndefined();
  expect(save.data.boneBoard[6]).toMatchObject({golden:true,goodBoy:true,hidden:true,snack:3});
  expect(save.data.perfect[6]).toBe(true);
  expect(Object.keys(save.data.dogsFreed)).toHaveLength(7);
  expect(game.player.setRide).toHaveBeenCalledWith(null);
  expect(game.bonusCleared).not.toHaveBeenCalled();
  expect(game._showComplete).toHaveBeenCalledWith(6,s.stats,expect.any(Array));
});

it('hides locked chapter paths and draws newly opened paths for0.8s without exposing unshipped nodes',()=>{
  const data={v:3,open:{1:true,3:true}};
  expect(chapterMapPaths(data,LEVELS)).toEqual([]);
  data.open[4]=true;data.open[6]=true;
  const paths=chapterMapPaths(data,LEVELS,[6]);
  expect(paths.map(p=>[p.id,p.animate])).toEqual([['3-4',false],['4-6',true]]);
  document.body.innerHTML=chapterMapMarkup(paths);
  expect(document.querySelectorAll('[data-chapter-path]')).toHaveLength(2);
  expect(document.querySelector('[data-chapter-path="4-6"]').getAttribute('mask')).toBe('url(#chapter-path-4-6)');
  expect(document.querySelector('animate').getAttribute('dur')).toBe('0.8s');
  expect(document.querySelector('[data-chapter-path="6-5"]')).toBeNull();
});

it('names both Green return destinations and the river Purple destination',()=>{
  const game={ui:{banner:vi.fn()}};
  Game.prototype.collectBone.call(game,'green');
  expect(game.ui.banner).toHaveBeenLastCalledWith('GREEN BONE!',expect.stringContaining('Pump & Dump Pipeline and Bark Jungle'),2.2);
  Game.prototype.collectBone.call(game,'purple');
  expect(game.ui.banner).toHaveBeenLastCalledWith('PURPLE BONE!',expect.stringContaining('The Cone Factory'),2.2);
});
