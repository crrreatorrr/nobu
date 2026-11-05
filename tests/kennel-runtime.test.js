import * as THREE from 'three';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { Game } from '../src/game/game.js';
import { Session } from '../src/game/session.js';
import { Assets } from '../src/art/assets.js';
import { input } from '../src/core/input.js';
import { save } from '../src/core/save.js';
import { LEVELS, isOpen, playOrder } from '../src/levels/registry.js';
import { resetWorld } from './helpers.js';

beforeEach(() => { resetWorld(); vi.spyOn(Assets, 'url').mockImplementation((id) => `/${id}.png`); vi.spyOn(Assets, 'tex').mockReturnValue(new THREE.Texture()); vi.spyOn(Assets, 'model').mockReturnValue(new THREE.Group()); vi.spyOn(Assets, 'animate').mockReturnValue(null); });
afterEach(() => vi.restoreAllMocks());
const rescued = (n) => { const keys = Object.values(LEVELS).flatMap((d) => Object.keys(d.dogs || {}).map((id) => `${d.id}:${id}`)); save.data.dogsFreed = Object.fromEntries(keys.slice(0, n).map((id) => [id, true])); save.data.open.kennel = true; };
it('adds an unlockable meta map node without adding a playable level or board', async () => {
  expect(isOpen('kennel', save.data)).toBe(false); rescued(1); expect(isOpen('kennel', save.data)).toBe(true);
  expect(playOrder()).toEqual([1, 2, 3, 4, 6]); expect(LEVELS.kennel.build).toBeUndefined(); expect(LEVELS.kennel.trial).toBe(false);
  const ui = { setScreen: vi.fn(), boneBoard: vi.fn(() => { throw Error('Kennel cannot have a board'); }) };
  const game = { mapSel: 'kennel', ui, exchangeOpen: false, _worldLine: vi.fn(() => { throw Error('No Kennel leaderboard'); }) };
  Game.prototype._drawMap.call(game);
  expect(ui.setScreen.mock.calls[0][0]).toContain('Your rescued pack is waiting'); expect(ui.boneBoard).not.toHaveBeenCalled(); expect(game._worldLine).not.toHaveBeenCalled();
  const openKennel = vi.fn(() => true); expect(await Game.prototype.startLevel.call({ openKennel }, 'kennel')).toBe(true); expect(openKennel).toHaveBeenCalledOnce();
});
it('map confirm enters Kennel directly and the real yard renders without a Session', () => {
  rescued(8);
  const screen = document.createElement('div'), game = { ui: { screen, setScreen(html) { screen.innerHTML = html; }, clearScreen() {}, trialTime() {}, hideHud() {}, bossHide() {}, fade() {} }, renderer: { capabilities: { maxTextures: 32 }, getPixelRatio: () => 1, render: vi.fn() }, camera: { cam: { aspect: 1 } }, titleScene: new THREE.Scene(), toMap: vi.fn(), mapSel: 'kennel', exchangeOpen: false, startLevel: vi.fn() };
  game.openKennel = () => Game.prototype.openKennel.call(game);
  vi.spyOn(input, 'pressed').mockReturnValue(false); vi.spyOn(input, 'confirmPressed').mockReturnValue(true);
  Game.prototype.updateMap.call(game); expect(game.state).toBe('kennel'); expect(game.session).toBeNull(); expect(game.startLevel).not.toHaveBeenCalled();
  Game.prototype.render.call(game); expect(game.renderer.render).toHaveBeenCalledWith(game.kennel.yard.scene, game.kennel.yard.camera);
  game.kennel.update(.01, { pressed: (key) => key === 'pause', confirmPressed: () => false }); expect(game.toMap).toHaveBeenCalledWith('kennel');
});
it('applies trial tint removal through actual actor setup before the trial plays', () => {
  const game = { player: { model: {}, attach() {}, spawnAt() {} }, mask: { attach() {}, setLevel() {}, snapTo() {} }, camera: { setMode() {}, cam: { updateProjectionMatrix() {} }, endCinematic() {}, snap() {} }, applyKennelTint: vi.fn() };
  const session = new Session(game, 1, { trial: true }); session.stage = { scene: new THREE.Scene() }; session.mask = 0;
  Session.prototype._attachActors.call(session, { spawn: new THREE.Vector3(), facing: 0, camera: { mode: 'behind' } });
  expect(game.applyKennelTint).toHaveBeenCalledWith(game.player.model, session); expect(session.trial).toBe(true);
});
