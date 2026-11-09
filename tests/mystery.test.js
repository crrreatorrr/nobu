import { test, expect } from 'vitest';
import { rollMystery, MYSTERY_TABLE, hash32, mulberry32 } from '../src/game/rng.js';

test('Mystery seed and slot vectors remain stable across repeated calls', () => {
  expect(hash32(12345, 1, 0)).toBe(42192483);
  expect([0, 1, 2].map((slot) => rollMystery(0, 1, slot))).toEqual(['oneUp', 'sphere', 'tickets']);
  const expected = rollMystery(99, 3, 2);
  for (let i = 0; i < 100; i++) expect(rollMystery(99, 3, 2)).toBe(expected);
  const a = mulberry32(123), b = mulberry32(123);
  for (let i = 0; i < 100; i++) expect(a()).toBe(b());
});

test('100,000 independent run seeds follow the authored table within 1.5 percentage points', () => {
  const counts = Object.fromEntries(MYSTERY_TABLE.map(({ id }) => [id, 0]));
  for (let seed = 0; seed < 100000; seed++) counts[rollMystery(seed, 1, 0)]++;
  for (const { id, w } of MYSTERY_TABLE) expect(Math.abs(counts[id] / 100000 - w / 100)).toBeLessThan(.015);
});
