import { expect, it } from 'vitest';
import { nextMainLevel, isFinalStoryLevel, unlockFollowingMain } from '../src/game/mainProgression.js';
const registry = (...ids) => Object.fromEntries(ids.map(id => [id, { id, shipped: true, bonus: false }]));
it('keeps the original ending until the next chapter ships and never jumps missing chapters', () => {
 const old = registry(1,2,3); expect(nextMainLevel(2,old)).toBe(3); expect(nextMainLevel(3,old)).toBeNull(); expect(isFinalStoryLevel(3,old)).toBe(true);
 const partial=registry(1,2,3,4); expect(nextMainLevel(3,partial)).toBe(4); expect(nextMainLevel(4,partial)).toBeNull(); expect(isFinalStoryLevel(3,partial)).toBe(false); expect(isFinalStoryLevel(4,partial)).toBe(false);
 expect(nextMainLevel(3,registry(1,2,3,6))).toBeNull();
});
it('follows 1,2,3,4,6,5 and ends only after the Queen in the expanded campaign', () => {
 const all=registry(1,2,3,4,6,5);
 expect([1,2,3,4,6,5].map(id=>nextMainLevel(id,all))).toEqual([2,3,4,6,5,null]);
 expect([3,4,6,5].map(id=>isFinalStoryLevel(id,all))).toEqual([false,false,false,true]);
});
it('opens new shipped chapters from retained clears once, preserving earned nodes and legacy progress', () => {
 const data={unlocked:3,beaten:{3:true,4:true,6:true},open:{1:true,kennel:true}};
 expect(unlockFollowingMain(data,registry(1,2,3,4))).toEqual([4]);
 expect(unlockFollowingMain(data,registry(1,2,3,4))).toEqual([]);
 expect(unlockFollowingMain(data,registry(1,2,3,4,6,5))).toEqual([6,5]);
 expect(data.unlocked).toBe(3); expect(data.open.kennel).toBe(true);
});
