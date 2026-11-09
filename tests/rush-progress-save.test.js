import { beforeEach, expect, it } from 'vitest';
import { save, SAVE_KEY } from '../src/core/save.js';
import { save as otherTab } from '../src/core/save.js?rush-second-tab';
beforeEach(() => { localStorage.clear(); save.reset(); otherTab.load(); });

it.each([3, 123])('refreshes another tab’s durable wallet %i while keeping the current run lives', spent => {
  save.data.tickets = 77; save.data.lives = 8; save.write({ merge: false }); otherTab.load();
  otherTab.data.tickets = spent;
  otherTab.data.beaten[6] = true;
  otherTab.data.dogsFreed['1:shiba-a'] = true;
  otherTab.data.rush = { clear: true, noHit: true, bestMs: 10000 };
  otherTab.write();
  expect(save.data.tickets).toBe(77);
  save.data.rush = { clear: true, noHit: false, bestMs: 20000 };
  save.write({ progressOnly: true });
  expect(save.data.tickets).toBe(spent); expect(save.data.lives).toBe(8);
  expect(save.data.beaten[6]).toBe(true); expect(save.data.dogsFreed['1:shiba-a']).toBe(true);
  const disk = JSON.parse(localStorage.getItem(SAVE_KEY));
  expect(disk.tickets).toBe(spent);
  expect(disk.rush).toEqual({ clear: true, noHit: true, bestMs: 10000 });
});
it('keeps legacy write semantics unchanged when progressOnly is absent', () => {
  save.data.tickets = 77; save.write({ merge: false }); otherTab.load();
  otherTab.data.tickets = 3; otherTab.write();
  save.write();
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)).tickets).toBe(77);
});
it('still merges monotone progress when progressOnly is requested with merge:false', () => {
  otherTab.data.tickets = 9; otherTab.data.beaten[4] = true; otherTab.write();
  save.write({ progressOnly: true, merge: false });
  expect(save.data.beaten[4]).toBe(true); expect(save.data.tickets).toBe(9);
});
