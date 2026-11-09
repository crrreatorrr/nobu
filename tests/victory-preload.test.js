import { expect, test } from 'vitest';
import { victoryImages, preloadVictory } from '../src/game/victoryPreload.js';

test('lists each rescue, results and finale picture once', () => {
  const one = victoryImages(1);
  expect(one).toEqual(expect.arrayContaining(['story_rescue_1', 'nobu_complete', 'level_map']));
  expect(new Set(one).size).toBe(one.length);
  expect(victoryImages(3)).toContain('story_ending');
  expect(victoryImages(5)).toContain('story_ending');
  expect(victoryImages(2)).not.toContain('story_ending');
});

test('requests and decodes every picture once, and survives a failed decode', async () => {
  const made = [];
  const imgs = preloadVictory(3, { url: (id) => `/a/${id}`, make: () => { const i = { decode: () => Promise.reject(new Error('x')) }; made.push(i); return i; } });
  expect(imgs).toHaveLength(victoryImages(3).length);
  expect(made.map((i) => i.src)).toEqual(victoryImages(3).map((id) => `/a/${id}`));
  await Promise.resolve();
});
