import { afterEach, expect, test, vi } from 'vitest';
import { HINTS, PAD_PROMPTS, padPrompt } from '../src/core/prompts.js';
import { input } from '../src/core/input.js';
import { BETWEEN, GAUNTLET_TEXT, KENNEL_TEXT, LEVEL_INTRO, REMIX_TEXT, RUSH_TEXT, TUTORIALS } from '../src/story/script.js';

// Every on-screen prompt that names a key. A pad player must not see any of these keys.
const KEYBOARD = /\b(SPACE|Space|ENTER|ESC|Esc|SHIFT|Shift|CTRL|Ctrl|L or E|J or|any key)\b|class="key">[JKLSE]</;

function prompts() {
  const out = [...Object.values(HINTS), 'Steer ◀ ▶ · SPACE hops'];
  for (const t of Object.values(TUTORIALS)) if (t?.text) out.push(t.text);
  for (const lines of [...Object.values(LEVEL_INTRO), ...Object.values(BETWEEN)]) for (const [, text] of lines) out.push(text);
  for (const k of ['mapControls', 'continue', 'play', 'choose', 'controls']) out.push(KENNEL_TEXT[k]);
  out.push(RUSH_TEXT.controls, RUSH_TEXT.continue, REMIX_TEXT.controls, GAUNTLET_TEXT.enter, GAUNTLET_TEXT.continue, 'PRESS ANY KEY');
  return out;
}

afterEach(() => { input.lastDevice = 'keyboard'; vi.unstubAllGlobals(); });

test('every keyboard prompt has a pad version with no keyboard keys left', () => {
  const left = prompts().map((t) => [t, padPrompt(t)]).filter(([, p]) => KEYBOARD.test(p));
  expect(left).toEqual([]);
});

test('every pad rewrite matches text the game really shows', () => {
  const all = prompts().join('\n');
  for (const [from] of PAD_PROMPTS) expect(all.includes(from), from).toBe(true);
});

test('pad prompts name the default layout', () => {
  expect(padPrompt(HINTS.map)).toBe('◀ ▶ choose · A play · LB wardrobe · LT exchange · B title');
  expect(padPrompt(KENNEL_TEXT.controls)).toContain('Y / VIEW Sniffer');
  expect(padPrompt(TUTORIALS.bite.text)).toContain('<span class="key">X</span>');
  expect(padPrompt(TUTORIALS.slide.text)).toContain('<span class="key">B</span>');
  expect(padPrompt(BETWEEN[1][1][1])).toContain('B, then A');
  expect(padPrompt('Nobody pressed anything here.')).toBe('Nobody pressed anything here.');
});

test('input.prompt shows keyboard text until the pad is used, then pad text', () => {
  vi.stubGlobal('navigator', { getGamepads: () => [] });
  input.poll();
  expect(input.prompt(HINTS.pause)).toBe(HINTS.pause);
  input.lastDevice = 'pad';
  expect(input.prompt(HINTS.pause)).toBe('◀ ▶ adjust · B / START resume');
  expect(input.prompt('kb', 'pad')).toBe('pad');
});
