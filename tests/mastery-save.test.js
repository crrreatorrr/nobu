import { beforeEach, expect, it } from 'vitest';
import { save, SAVE_KEY, sanitizeTrials } from '../src/core/save.js';
import { resetWorld } from './helpers.js';
const rec = (ms, godUsed, more = {}) => ({ best: ms / 1000, ms, godUsed, pid: godUsed ? null : 'clean-player', layout: 1, ...more });
const load = (trial) => { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 3, trials: { 1: trial } })); save.load(); };
beforeEach(() => resetWorld());
it('upgrades unknown historical time and persists explicit god-used ineligibility after reload', () => {
  load({ best: 49, ms: 49000, pid: null }); expect(save.data.trials[1]).toMatchObject({ medal: 'platinum', godUsed: false, bestEligibleMs: 49000 });
  load(rec(45000, true, { pid: 'incorrect-legacy-pid' })); expect(save.data.trials[1]).toMatchObject({ medal: 'gold', godUsed: true, bestEligibleMs: null, pid: null });
  save.write(); save.load(); expect(save.data.trials[1].medal).toBe('gold');
});
it('merges slower clean eligibility with faster god best across actual disk writes in either order', () => {
  for (const reverse of [false, true]) {
    resetWorld(); save.data.trials[1] = reverse ? rec(49000, false, { at: 2 }) : rec(45000, true, { at: 1 }); save.write({ merge: false });
    const disk = JSON.parse(localStorage.getItem(SAVE_KEY)); disk.trials[1] = reverse ? rec(45000, true, { at: 1 }) : rec(49000, false, { at: 2 });
    localStorage.setItem(SAVE_KEY, JSON.stringify(disk)); save.write(); save.load();
    expect(save.data.trials[1]).toMatchObject({ ms: 45000, godUsed: true, pid: null, at: 1, bestEligibleMs: 49000, medal: 'platinum' });
  }
});
it('preserves the clean equal-time pid and matching metadata atomically', () => {
  save.data.trials[1] = rec(49000, true, { deaths: 9, freezeMs: 0 }); save.write({ merge: false });
  const disk = JSON.parse(localStorage.getItem(SAVE_KEY)); disk.trials[1] = rec(49000, false, { deaths: 0, freezeMs: 3000 });
  localStorage.setItem(SAVE_KEY, JSON.stringify(disk)); save.write();
  expect(save.data.trials[1]).toMatchObject({ ms: 49000, godUsed: false, pid: 'clean-player', deaths: 0, freezeMs: 3000 });
});
it('preserves Classic eligibility metadata in layout1 normalization and New Game', () => {
  save.data.trialsClassic = sanitizeTrials({ 1: rec(45000, true, { bestEligibleMs: 49000 }) }, 1); save.write(); save.reset(); save.load();
  expect(save.data.trialsClassic[1]).toMatchObject({ ms: 45000, godUsed: true, bestEligibleMs: 49000, medal: 'platinum', layout: 1 });
});

it('retains an older slow local record above the hub ceiling without inventing a tag', () => {
  load(rec(1801000, false)); expect(save.data.trials[1]).toMatchObject({ ms: 1801000, medal: null, godUsed: false });
  save.write(); save.load(); expect(save.data.trials[1].ms).toBe(1801000);
});

it('preserves known god evidence when an older tab strips fields from the identical run, in both merge orders', () => {
  const known = rec(45000, true, { at: 123456, deaths: 2, freezeMs: 1000 });
  const stripped = { ...known }; delete stripped.godUsed; delete stripped.bestEligibleMs;
  for (const reverse of [false, true]) {
    resetWorld(); save.data.trials[1] = reverse ? { ...stripped } : { ...known }; save.write({ merge: false });
    const disk = JSON.parse(localStorage.getItem(SAVE_KEY)); disk.trials[1] = reverse ? { ...known } : { ...stripped };
    localStorage.setItem(SAVE_KEY, JSON.stringify(disk)); save.write(); save.load();
    expect(save.data.trials[1]).toMatchObject({ ms: 45000, godUsed: true, bestEligibleMs: null, medal: 'gold', pid: null });
  }
});
it('keeps a separate slower clean tag while rejecting an inferred same-practice-time tag, and accepts a distinct clean equal-time run', () => {
  save.data.trials[1] = rec(45000, true, { at: 123456, deaths: 0, freezeMs: 1000, bestEligibleMs: 49000 }); save.write({ merge: false });
  const disk = JSON.parse(localStorage.getItem(SAVE_KEY)); disk.trials[1] = { ms: 45000, best: 45, layout: 1, at: 123456, deaths: 0, freezeMs: 1000, pid: null };
  localStorage.setItem(SAVE_KEY, JSON.stringify(disk)); save.write(); expect(save.data.trials[1]).toMatchObject({ godUsed: true, bestEligibleMs: 49000, medal: 'platinum' });
  const next = JSON.parse(localStorage.getItem(SAVE_KEY)); next.trials[1] = rec(45000, false, { at: 223456, pid: null, deaths: 0, freezeMs: 1000 });
  localStorage.setItem(SAVE_KEY, JSON.stringify(next)); save.write();
  expect(save.data.trials[1]).toMatchObject({ ms: 45000, godUsed: false, bestEligibleMs: 45000, at: 223456, medal: 'platinum' });
});
