import { beforeEach, expect, it } from 'vitest';
import { save, LOCAL_KEY, PROGRESS_KEY } from '../src/core/save.js';
import { save as otherTab } from '../src/core/save.js?rush-second-tab';
beforeEach(() => { localStorage.clear(); save.load(); otherTab.load(); });
const disk = (key) => JSON.parse(localStorage.getItem(key));

it.each([3, 123])('refreshes another tab’s durable wallet %i while keeping the current run lives', spent => {
  save.data.tickets = 77; save.data.lives = 8; save.write(); otherTab.load();
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
  expect(disk(LOCAL_KEY).tickets).toBe(spent);
  expect(disk(PROGRESS_KEY).rush).toEqual({ clear: true, noHit: true, bestMs: 10000 });
});
it('keeps legacy write semantics unchanged when progressOnly is absent', () => {
  save.data.tickets = 77; save.write(); otherTab.load();
  otherTab.data.tickets = 3; otherTab.write();
  save.write();
  expect(disk(LOCAL_KEY).tickets).toBe(77);
});
it('still merges monotone progress when progressOnly is requested', () => {
  otherTab.data.tickets = 9; otherTab.data.beaten[4] = true; otherTab.write();
  save.write({ progressOnly: true });
  expect(save.data.beaten[4]).toBe(true); expect(save.data.tickets).toBe(9);
});
