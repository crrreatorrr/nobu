import { expect, it } from 'vitest';
import { RUSH_ORDER, createRush, tickRush, hurtRush, defeatRushBoss, rushResult } from '../src/game/rush.js';

it('requires all five bosses in order and cannot advance twice on a defeated boss', () => {
  const r = createRush();
  expect(defeatRushBoss(r, 'queen')).toBe(false);
  for (const key of RUSH_ORDER) {
    expect(defeatRushBoss(r, key)).toBe(true);
    expect(defeatRushBoss(r, key)).toBe(false);
  }
  expect(r.complete).toBe(true);
  expect(r.index).toBe(5);
});
it('counts active fight and retry time while excluding pause, dialogue and intermissions', () => {
  const r = createRush();
  tickRush(r, 2, { active: true });
  tickRush(r, 3, { active: true }); // A death delay is still an active fight.
  tickRush(r, 10, { active: true, busy: true });
  tickRush(r, 10, { active: true, paused: true });
  tickRush(r, 10);
  tickRush(r, -1, { active: true });
  tickRush(r, NaN, { active: true });
  expect(r.elapsed).toBe(5);
  for (const key of RUSH_ORDER) defeatRushBoss(r, key);
  tickRush(r, 10, { active: true });
  expect(r.elapsed).toBe(5);
});
it('banks only the two Rush medals and minimizes an existing best without removing flags', () => {
  const r = createRush();
  expect(rushResult(r)).toBeNull();
  tickRush(r, 12.345, { active: true }); hurtRush(r);
  for (const key of RUSH_ORDER) defeatRushBoss(r, key);
  expect(rushResult(r, { clear: true, noHit: true, bestMs: 12000 })).toEqual({ clear: true, noHit: true, bestMs: 12000 });
  expect(rushResult(r)).toEqual({ clear: true, noHit: false, bestMs: 12345 });
});
it('makes God use sticky even during an intermission and after toggling it off', () => {
  const r = createRush();
  tickRush(r, 1, { busy: true, god: true });
  tickRush(r, 1, { active: true, god: false });
  for (const key of RUSH_ORDER) defeatRushBoss(r, key);
  expect(rushResult(r, { noHit: true, bestMs: 500 })).toBeNull();
});
