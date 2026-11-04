import { beforeEach, describe, expect, it } from 'vitest';
import { CORRUPT_KEY, SAVE_KEY, save } from '../src/core/save.js';
import { resetWorld } from './helpers.js';

beforeEach(() => {
  resetWorld();
});

const disk = () => JSON.parse(localStorage.getItem(SAVE_KEY));

describe('save: trial scores', () => {
  it('migrates a float-seconds best to integer ms', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 2, trials: { 1: { best: 51.23456, medal: 'gold' }, 3: { best: 70, medal: 'silver' } } }));
    save.load();
    expect(save.data.trials[1]).toMatchObject({ best: 51.23456, ms: 51235, medal: 'gold', pid: null });
    expect(save.data.trials[3]).toMatchObject({ ms: 70000, medal: 'bronze' });
  });

  it('sanitizes bad nested values on load', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: 2,
      trials: { 1: { best: 'fast' }, 2: { ms: 900 }, 3: null, 4: { best: 50 }, ride: { best: 40 } },
      bestDogs: 'lots',
      bonus: [1, 2],
      beaten: [true],
    }));
    save.load();
    expect(save.data.trials).toEqual({});
    expect(save.data.bestDogs).toEqual([0, 0, 0]);
    expect(save.data.bonus).toEqual({});
    expect(save.data.beaten).toEqual([true, false, false]);
  });

  it('copies an unreadable save aside before starting fresh', () => {
    localStorage.setItem(SAVE_KEY, '{"trials": {1: oops');
    save.load();
    expect(localStorage.getItem(CORRUPT_KEY)).toBe('{"trials": {1: oops');
    expect(save.data.trials).toEqual({});
    expect(save.data.unlocked).toBe(1);
  });

  it('a second tab cannot overwrite a faster time or a bigger best', () => {
    save.data.trials = { 1: { best: 50, ms: 50000, medal: 'gold', pid: null } };
    save.data.bestDogs = [3, 0, 0];
    save.data.bonus = { ride: { beaten: true, best: 20 } };
    save.write();

    // Another tab writes a faster level 1, a level 2 and better dog / bonus bests.
    const other = disk();
    other.trials[1] = { best: 44, ms: 44000, medal: 'gold', pid: 'p' };
    other.trials[2] = { best: 60, ms: 60000, medal: 'silver', pid: 'p' };
    other.bestDogs = [1, 5, 0];
    other.bonus = { ride: { beaten: true, best: 35 }, cave: { found: true } };
    localStorage.setItem(SAVE_KEY, JSON.stringify(other));

    // This tab still holds the older state and writes.
    save.data.lives = 2;
    save.write();
    const now = disk();
    expect(now.trials[1].ms).toBe(44000);
    expect(now.trials[2].ms).toBe(60000);
    expect(now.bestDogs).toEqual([3, 5, 0]);
    expect(now.bonus.ride.best).toBe(35);
    expect(now.bonus.cave.found).toBe(true);
    expect(now.lives).toBe(2);
    // The merged values are live in this tab too.
    expect(save.data.trials[1].ms).toBe(44000);
  });

  it('reset() starts a new game but keeps trial bests', () => {
    save.data.trials = { 2: { best: 58, ms: 58000, medal: 'silver', pid: 'p' } };
    save.data.unlocked = 3;
    save.data.bestDogs = [4, 4, 4];
    save.write();
    save.reset();
    expect(save.data.unlocked).toBe(1);
    expect(save.data.bestDogs).toEqual([0, 0, 0]);
    expect(save.data.trials[2].ms).toBe(58000);
    expect(disk().trials[2].ms).toBe(58000);
    expect(disk().bestDogs).toEqual([0, 0, 0]);
  });

  it('totalTrialMs() sums the three bests once all exist', () => {
    save.data.trials = { 1: { ms: 50000 }, 2: { ms: 60000 } };
    expect(save.totalTrialMs()).toBe(null);
    save.data.trials[3] = { ms: 40500 };
    expect(save.totalTrialMs()).toBe(150500);
  });
});
