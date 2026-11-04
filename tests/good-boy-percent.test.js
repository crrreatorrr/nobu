import { it, expect } from 'vitest';
import { LEVEL_DOGS } from '../src/levels/metadata.js';
import { basePointsMax, goodBoyPercent, masteryPoints, kennelUnlocks, secretEndingUnlocked } from '../src/game/progress.js';
const counts = { 1: 9, 2: 7, 3: 9, 4: 7, 6: 7, 5: 7, ride: 4, cave: 4 };
const bosses = { 1: 'bird', 2: 'cat', 3: 'cone', 4: 'titan', 5: 'queen' };
const all = Object.entries(counts).map(([id, count]) => ({ id, shipped: true, bonus: ['ride', 'cave'].includes(id), trial: !['ride', 'cave'].includes(id), bossKey: bosses[id], dogs: Object.fromEntries(Array.from({ length: count }, (_, i) => [`shiba-${i}`, 'path'])) }));
const today = Object.entries(LEVEL_DOGS).map(([id, dogs]) => ({ id, shipped: true, bonus: ['ride', 'cave'].includes(id), dogs }));
function filled(reg) {
  const s = { beaten: {}, boneBoard: {}, colorBones: { red: true, blue: true, green: true, yellow: true, purple: true }, dogsFreed: {}, trials: {}, bossMedals: {}, remix: {}, perfect: {}, gauntlets: {}, rush: { clear: true, noHit: true } };
  for (const e of reg) {
    s.beaten[e.id] = true; s.boneBoard[e.id] = { golden: true, goodBoy: true, hidden: true, snack: 3 };
    for (const id of Object.keys(e.dogs || {})) s.dogsFreed[`${e.id}:${id}`] = true;
    s.trials[e.id] = { medal: 'platinum' }; s.remix[e.id] = { golden: true }; s.perfect[e.id] = true;
    if (e.bossKey) s.bossMedals[e.bossKey] = { noHit: true, speed: true };
    if (/^g/.test(e.id)) s.gauntlets[e.id] = { clear: true, allBoxes: true, flawless: true };
  }
  return s;
}
it('uses 95 base points at 54 dogs and reaches 100 without mastery', () => {
  expect(basePointsMax(all)).toBe(95);
  const s = filled(all); s.trials = {}; s.remix = {}; s.perfect = {}; s.bossMedals = {}; s.rush = {};
  expect(goodBoyPercent(s, all)).toEqual({ base: 100, mastery: 0, total: 100 });
  delete s.colorBones.red;
  expect(goodBoyPercent(s, all).base).toBe(98);
});
it('ships66 base points with extended L1/L3, Laundry and bonuses and hides impossible milestones', () => {
  expect(basePointsMax(today)).toBe(66);
  expect(goodBoyPercent(filled(today), today).base).toBe(100);
  expect(kennelUnlocks(filled(today), 36)).toEqual(['jukebox', 'buddy', 'fur', 'gallery', 'golden']);
  expect(goodBoyPercent({}, today)).toEqual({ base: 0, mastery: 0, total: 0 });
});
it('reaches 200 including the nine gauntlet medals inside mastery', () => {
  const reg = [...all, ...['g1', 'g2', 'g3', 'rush'].map((id) => ({ id, shipped: true }))];
  expect(masteryPoints(filled(reg), reg)).toBe(100);
  expect(goodBoyPercent(filled(reg), reg).total).toBe(200);
});
it('matches the worked 26/95 plus gold trial example', () => {
  const s = { beaten: { 1: true, 2: true, 3: true }, boneBoard: { 1: { golden: true, goodBoy: true, snack: 2 }, 2: { golden: true }, ride: { golden: true } }, colorBones: { red: true }, dogsFreed: Object.fromEntries(all.flatMap((e) => Object.keys(e.dogs).map((id) => [`${e.id}:${id}`, true])).slice(0, 17)), trials: { 1: { medal: 'gold' } } };
  expect(goodBoyPercent(s, all)).toEqual({ base: 27, mastery: 2, total: 29 });
});
it('counts L6 as a main story clear and requires L5 for the secret ending', () => {
  expect(goodBoyPercent({ beaten: { 6: true } }, all).base).toBe(4);
  const s = filled(all); expect(secretEndingUnlocked(s, all)).toBe(true);
  delete s.beaten[5]; expect(secretEndingUnlocked(s, all)).toBe(false);
});
it('ignores unshipped and foreign dog records', () => {
  const s = filled(today); s.dogsFreed['5:shiba-a'] = true;
  expect(goodBoyPercent(s, [...today, ...all.filter((e) => !today.some((t) => t.id === e.id)).map((e) => ({ ...e, shipped: false }))]).base).toBe(100);
});
it('uses exactly the 80 total threshold for the ending', () => {
 const reg = [...all, { id: 'g1', shipped: true }];
 const s = filled(all);
 s.trials = {}; s.remix = {}; s.perfect = {}; s.bossMedals = {}; s.rush = {};
 // 95 - two story clears (8) - one main board (6) - two bonus boards (6) = 75.
 delete s.beaten[1]; delete s.beaten[2];
 delete s.boneBoard[1]; delete s.boneBoard.ride; delete s.boneBoard.cave;
 s.gauntlets = { g1: { clear: true } }; // floor(75 / 95 * 100) + 1 = 79.
 expect(goodBoyPercent(s, reg).total).toBe(79);
 expect(secretEndingUnlocked(s, reg)).toBe(false);
 s.gauntlets = {}; s.boneBoard.ride = { golden: true }; // floor(76 / 95 * 100) = 80.
 expect(goodBoyPercent(s, reg).total).toBe(80);
 expect(secretEndingUnlocked(s, reg)).toBe(true);
});
