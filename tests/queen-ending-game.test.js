import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Game } from '../src/game/game.js';
import { LEVELS } from '../src/levels/registry.js';
import { save, SAVE_KEY } from '../src/core/save.js';
import { input } from '../src/core/input.js';
import { audio } from '../src/audio/audio.js';
import { Assets } from '../src/art/assets.js';
import { ENDING, QUEEN_ENDING, SECRET_ENDING, RESCUE, BETWEEN } from '../src/story/script.js';
import { hub } from '../src/hub/hubBridge.js';
import { resetWorld } from './helpers.js';

const prior5 = LEVELS[5];
beforeEach(() => {
  resetWorld();
  vi.spyOn(audio, 'play').mockImplementation(() => {});
  vi.spyOn(audio, 'playMusic').mockImplementation(() => {});
  vi.spyOn(Assets, 'url').mockReturnValue('placeholder');
  LEVELS[5] = { id: 5, shipped: true, bonus: false, dogs: {}, unlock: d => !!d.open[5] };
});
afterEach(() => {
  if (prior5) LEVELS[5] = prior5; else delete LEVELS[5];
  vi.restoreAllMocks();
});
function eligible() {
  Object.assign(save.data, { seenCh2: true, finished: true, secretSeen: false,
    colorBones: { red: true, blue: true, green: true, yellow: true, purple: true } });
  for (const def of Object.values(LEVELS).filter(d => d.shipped && !d.meta)) {
    save.data.beaten[def.id] = true;
    save.data.open[def.id] = true;
    save.data.boneBoard[def.id] = { golden: true, goodBoy: true, hidden: true, snack: 3 };
    for (const id of Object.keys(def.dogs || {})) save.data.dogsFreed[`${def.id}:${id}`] = true;
  }
}
function game() {
  return Object.assign(Object.create(Game.prototype), {
    ui: { ...Object.fromEntries(['trialTime', 'hideHud', 'bossHide', 'banner', 'fade', 'setScreen'].map(n => [n, vi.fn()])),
      say: vi.fn(async () => {}), screen: { style: {} } },
    _drawMap: vi.fn(), playCutscene: vi.fn(), toCredits: vi.fn(),
  });
}
it('keeps the secret ending inactive before Queen ships, before her defeat and below the threshold', () => {
  const g = game(), done = vi.fn();
  eligible(); LEVELS[5].shipped = false;
  expect(g._trySecretEnding(done)).toBe(false);
  LEVELS[5].shipped = true; delete save.data.beaten[5];
  expect(g._trySecretEnding(done)).toBe(false);
  resetWorld(); save.data.beaten[5] = true;
  expect(g._trySecretEnding(done)).toBe(false);
  expect(g.playCutscene).not.toHaveBeenCalled();
});
it('acknowledges the true ending on completion, persists it and does not replay it', () => {
  eligible(); const g = game(), done = vi.fn();
  expect(g._trySecretEnding(done)).toBe(true);
  expect(g.playCutscene.mock.calls[0][0]).toBe(SECRET_ENDING);
  expect(save.data.secretSeen).toBe(false);
  g.playCutscene.mock.calls[0][1]();
  expect(done).toHaveBeenCalledOnce();
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)).secretSeen).toBe(true);
  expect(g._trySecretEnding(done)).toBe(false);
});
it('checks eligibility again on entering the map after later completion progress', () => {
  eligible(); const g = game();
  g.toMap(1);
  expect(g._drawMap).not.toHaveBeenCalled();
  expect(g.playCutscene.mock.calls[0][0]).toBe(SECRET_ENDING);
  g.playCutscene.mock.calls[0][1]();
  expect(g._drawMap).toHaveBeenCalledOnce();
  g.toMap(1);
  expect(g.playCutscene).toHaveBeenCalledOnce();
});
it.each([false, true])('routes Queen completion to the appropriate ending (eligible=%s)', async complete => {
  if (complete) eligible(); else save.data.beaten[5] = true;
  const g = Object.assign(game(), { completeT: 3, completeNext: { n: 5, bonus: false } });
  vi.spyOn(input, 'anyPressed').mockReturnValue(true);
  await g.updateComplete(.01);
  expect(g.playCutscene.mock.calls[0][0]).toBe(complete ? SECRET_ENDING : QUEEN_ENDING);
  g.playCutscene.mock.calls[0][1]();
  expect(g.toCredits).toHaveBeenCalledOnce();
});
it('preserves the original Cone chapter ending', async () => {
  const g = Object.assign(game(), { completeT: 3, completeNext: { n: 3, bonus: false } });
  vi.spyOn(input, 'anyPressed').mockReturnValue(true);
  await g.updateComplete(.01);
  expect(g.playCutscene.mock.calls[0][0]).toBe(ENDING);
});
it('runs actual Queen clear through the real rescue cutscene before the tally and Moon tutorial', async () => {
  const g = game();
  delete g.playCutscene;
  g.ui.screen = document.createElement('div');
  g.ui.setScreen.mockImplementation(html => { g.ui.screen.innerHTML = html; });
  g.ui.clearScreen = vi.fn(() => { g.ui.screen.innerHTML = ''; });
  g._showComplete = vi.fn();
  vi.spyOn(hub, 'bank').mockResolvedValue(undefined);
  const session = { level: 5, def: LEVELS[5], levelTickets: 0,
    stats: { broken: 0, breakables: 0, dogs: 0, dogsTotal: 0, deathsAtGate: 0 } };
  expect(() => g.levelCleared(session)).not.toThrow();
  expect(save.beatenOf(5)).toBe(true);
  expect(g.cut.panels).toBe(RESCUE[5]);
  expect(g._showComplete).not.toHaveBeenCalled();
  while (g.cut) g._nextPanel();
  expect(g._showComplete).toHaveBeenCalledOnce();
  expect(BETWEEN[5][0][1]).toContain('Hold SLIDE without moving, then JUMP');
  expect(hub.bank).toHaveBeenCalledOnce();
});
